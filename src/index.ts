
import './style.css'

import $ from 'jquery';
import { Subscription, interval } from 'rxjs';
import { TwistyPlayer } from 'cubing/twisty';
import { experimentalSolve3x3x3IgnoringCenters } from 'cubing/search';
import * as THREE from 'three';
import { inject } from '@vercel/analytics';

import {
  now,
  connectGanCube,
  GanCubeConnection,
  GanCubeEvent,
  GanCubeMove,
  MacAddressProvider,
  makeTimeFromTimestamp,
  cubeTimestampCalcSkew,
  cubeTimestampLinearFit
} from 'gan-web-bluetooth';

import { faceletsToPattern, patternToFacelets } from './utils';
import { CubeToKeyboardMapper, KeyboardEventOptions } from './keyboardMapper';

// 初始化 Vercel Analytics
inject();

const SOLVED_STATE = "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";

var twistyPlayer = new TwistyPlayer({
  puzzle: '3x3x3',
  visualization: 'PG3D',
  alg: '',
  experimentalSetupAnchor: 'start',
  background: 'none',
  controlPanel: 'none',
  hintFacelets: 'none',
  experimentalDragInput: 'none',
  cameraLatitude: 0,
  cameraLongitude: 0,
  cameraLatitudeLimit: 0,
  tempoScale: 5
});

$('#cube').append(twistyPlayer);

var conn: GanCubeConnection | null;
var lastMoves: GanCubeMove[] = [];
var solutionMoves: GanCubeMove[] = [];

var twistyScene: THREE.Scene;
var twistyVantage: any;

const HOME_ORIENTATION = new THREE.Quaternion().setFromEuler(new THREE.Euler(15 * Math.PI / 180, -20 * Math.PI / 180, 0));
var cubeQuaternion: THREE.Quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(30 * Math.PI / 180, -30 * Math.PI / 180, 0));

async function amimateCubeOrientation() {
  if (!twistyScene || !twistyVantage) {
    var vantageList = await twistyPlayer.experimentalCurrentVantages();
    twistyVantage = [...vantageList][0];
    twistyScene = await twistyVantage.scene.scene();
  }
  twistyScene.quaternion.slerp(cubeQuaternion, 0.25);
  twistyVantage.render();
  requestAnimationFrame(amimateCubeOrientation);
}
requestAnimationFrame(amimateCubeOrientation);

var basis: THREE.Quaternion | null;

async function handleGyroEvent(event: GanCubeEvent) {
  if (event.type == "GYRO") {
    let { x: qx, y: qy, z: qz, w: qw } = event.quaternion;
    let quat = new THREE.Quaternion(qx, qz, -qy, qw).normalize();
    if (!basis) {
      basis = quat.clone().conjugate();
    }
    cubeQuaternion.copy(quat.premultiply(basis).premultiply(HOME_ORIENTATION));
    $('#quaternion').val(`x: ${qx.toFixed(3)}, y: ${qy.toFixed(3)}, z: ${qz.toFixed(3)}, w: ${qw.toFixed(3)}`);
    if (event.velocity) {
      let { x: vx, y: vy, z: vz } = event.velocity;
      $('#velocity').val(`x: ${vx}, y: ${vy}, z: ${vz}`);
    }
  }
}

async function handleMoveEvent(event: GanCubeEvent) {
  if (event.type == "MOVE") {
    if (timerState == "READY") {
      setTimerState("RUNNING");
    }
    twistyPlayer.experimentalAddMove(event.move, { cancel: false });
    lastMoves.push(event);
    if (timerState == "RUNNING") {
      solutionMoves.push(event);
    }
    if (lastMoves.length > 256) {
      lastMoves = lastMoves.slice(-256);
    }
    if (lastMoves.length > 10) {
      var skew = cubeTimestampCalcSkew(lastMoves);
      $('#skew').val(skew + '%');
    }

    // 游戏控制：将魔方转动转换为游戏控制
    if (keyboardMapper && event.move) {
      const keyOptions = keyboardMapper.mapMoveToKeyboard(event.move);
      const targetIframe = keyOptions ? getGameIframe(currentGame) : null;
      if (keyOptions && targetIframe) {
        sendKeyToIframe(targetIframe, keyOptions);
      }
    }
  }
}

var cubeStateInitialized = false;

async function handleFaceletsEvent(event: GanCubeEvent) {
  if (event.type == "FACELETS" && !cubeStateInitialized) {
    if (event.facelets != SOLVED_STATE) {
      var kpattern = faceletsToPattern(event.facelets);
      var solution = await experimentalSolve3x3x3IgnoringCenters(kpattern);
      var scramble = solution.invert();
      twistyPlayer.alg = scramble;
    } else {
      twistyPlayer.alg = '';
    }
    cubeStateInitialized = true;
    console.log("Initial cube state is applied successfully", event.facelets);
  }
}

function handleCubeEvent(event: GanCubeEvent) {
  if (event.type != "GYRO")
    console.log("GanCubeEvent", event);
  if (event.type == "GYRO") {
    handleGyroEvent(event);
  } else if (event.type == "MOVE") {
    handleMoveEvent(event);
  } else if (event.type == "FACELETS") {
    handleFaceletsEvent(event);
  } else if (event.type == "HARDWARE") {
    $('#hardwareName').text(event.hardwareName || '-');
  } else if (event.type == "BATTERY") {
    $('#batteryLevel').text(event.batteryLevel + '%');
  } else if (event.type == "DISCONNECT") {
    twistyPlayer.alg = '';
    $('#hardwareName').text('-');
    $('#batteryLevel').text('-');
    $('#connect').html('连接魔方');
  }
}

const customMacAddressProvider: MacAddressProvider = async (device, isFallbackCall): Promise<string | null> => {
  if (isFallbackCall) {
    return prompt('Unable do determine cube MAC address!\nPlease enter MAC address manually:');
  } else {
    return typeof device.watchAdvertisements == 'function' ? null :
      prompt('Seems like your browser does not support Web Bluetooth watchAdvertisements() API. Enable following flag in Chrome:\n\nchrome://flags/#enable-experimental-web-platform-features\n\nor enter cube MAC address manually:');
  }
};

$('#reset-state').on('click', async () => {
  await conn?.sendCubeCommand({ type: "REQUEST_RESET" });
  twistyPlayer.alg = '';
});

$('#reset-gyro').on('click', async () => {
  basis = null;
});

$('#connect').on('click', async () => {
  if (conn) {
    conn.disconnect();
    conn = null;
  } else {
    conn = await connectGanCube(customMacAddressProvider);
    conn.events$.subscribe(handleCubeEvent);
    await conn.sendCubeCommand({ type: "REQUEST_HARDWARE" });
    await conn.sendCubeCommand({ type: "REQUEST_FACELETS" });
    await conn.sendCubeCommand({ type: "REQUEST_BATTERY" });
    $('#connect').html('断开连接');
  }
});

var timerState: "IDLE" | "READY" | "RUNNING" | "STOPPED" = "IDLE";

function setTimerState(state: typeof timerState) {
  timerState = state;
  switch (state) {
    case "IDLE":
      stopLocalTimer();
      $('#timer').hide();
      break;
    case 'READY':
      setTimerValue(0);
      $('#timer').show();
      $('#timer').css('color', '#0f0');
      break;
    case 'RUNNING':
      solutionMoves = [];
      startLocalTimer();
      $('#timer').css('color', '#999');
      break;
    case 'STOPPED':
      stopLocalTimer();
      $('#timer').css('color', '#fff');
      var fittedMoves = cubeTimestampLinearFit(solutionMoves);
      var lastMove = fittedMoves.slice(-1).pop();
      setTimerValue(lastMove ? lastMove.cubeTimestamp! : 0);
      break;
  }
}

twistyPlayer.experimentalModel.currentPattern.addFreshListener(async (kpattern) => {
  var facelets = patternToFacelets(kpattern);
  if (facelets == SOLVED_STATE) {
    if (timerState == "RUNNING") {
      setTimerState("STOPPED");
    }
    twistyPlayer.alg = '';
  }
});

function setTimerValue(timestamp: number) {
  let t = makeTimeFromTimestamp(timestamp);
  $('#timer').html(`${t.minutes}:${t.seconds.toString(10).padStart(2, '0')}.${t.milliseconds.toString(10).padStart(3, '0')}`);
}

var localTimer: Subscription | null = null;
function startLocalTimer() {
  var startTime = now();
  localTimer = interval(30).subscribe(() => {
    setTimerValue(now() - startTime);
  });
}

function stopLocalTimer() {
  localTimer?.unsubscribe();
  localTimer = null;
}

function activateTimer() {
  if (timerState == "IDLE" && conn) {
    setTimerState("READY");
  } else {
    setTimerState("IDLE");
  }
}

$(document).on('keydown', (event) => {
  if (event.which == 32) {
    event.preventDefault();
    activateTimer();
  }
});

$("#cube").on('touchstart', () => {
  activateTimer();
});

// ========== 游戏切换和魔方控制 ==========

let keyboardMapper: CubeToKeyboardMapper | null = null;
let currentGame: '2048' | 'tetris' | 'placeholder' = '2048';
let game2048Iframe: HTMLIFrameElement | null = null;
let gameTetrisIframe: HTMLIFrameElement | null = null;

function getGameIframe(gameId: typeof currentGame): HTMLIFrameElement | null {
  switch (gameId) {
    case '2048':
      return game2048Iframe;
    case 'tetris':
      return gameTetrisIframe;
    default:
      return null;
  }
}

// 初始化键盘映射器
keyboardMapper = new CubeToKeyboardMapper();

// 向 iframe 发送键盘事件
function sendKeyToIframe(iframe: HTMLIFrameElement, keyOptions: KeyboardEventOptions) {
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    // 创建键盘事件
    const keydownEvent = new KeyboardEvent('keydown', {
      key: keyOptions.key,
      code: keyOptions.code,
      keyCode: keyOptions.keyCode,
      which: keyOptions.which,
      bubbles: true,
      cancelable: true
    });

    const keyupEvent = new KeyboardEvent('keyup', {
      key: keyOptions.key,
      code: keyOptions.code,
      keyCode: keyOptions.keyCode,
      which: keyOptions.which,
      bubbles: true,
      cancelable: true
    });

    // 触发事件
    iframeDoc.dispatchEvent(keydownEvent);
    setTimeout(() => {
      iframeDoc.dispatchEvent(keyupEvent);
    }, 50);
  } catch (error) {
    // 跨域限制，使用 postMessage
    iframe.contentWindow?.postMessage({ type: 'keydown', ...keyOptions }, '*');
  }
}

// 游戏切换功能
$('.game-tab').on('click', function() {
  const gameId = $(this).data('game') as typeof currentGame | undefined;
  if (!gameId) return;

  // 更新标签状态
  $('.game-tab').removeClass('active');
  $(this).addClass('active');

  // 切换游戏内容
  $('.game-content').removeClass('active');
  $(`#game-${gameId}`).addClass('active');

  currentGame = gameId;

  // 获取 iframe 引用
  if (gameId === '2048') {
    game2048Iframe = document.getElementById('game-2048-iframe') as HTMLIFrameElement;
  } else if (gameId === 'tetris') {
    gameTetrisIframe = document.getElementById('game-tetris-iframe') as HTMLIFrameElement;
  }
});

// 初始化时获取 2048 iframe 引用并设置自适应高度
$(document).ready(() => {
  game2048Iframe = document.getElementById('game-2048-iframe') as HTMLIFrameElement;
  gameTetrisIframe = document.getElementById('game-tetris-iframe') as HTMLIFrameElement;
  
  // 设置 iframe 自适应高度
  if (game2048Iframe) {
    game2048Iframe.onload = function() {
      try {
        const iframeDoc = game2048Iframe!.contentDocument || game2048Iframe!.contentWindow?.document;
        if (iframeDoc) {
          const height = iframeDoc.body.scrollHeight || iframeDoc.documentElement.scrollHeight;
          if (height > 0) {
            game2048Iframe!.style.height = height + 'px';
          }
        }
      } catch (error) {
        // 跨域限制，使用默认高度
        console.log('无法访问 iframe 内容，使用默认高度');
      }
    };
  }

  if (gameTetrisIframe) {
    gameTetrisIframe.onload = function() {
      try {
        const iframeDoc = gameTetrisIframe!.contentDocument || gameTetrisIframe!.contentWindow?.document;
        if (iframeDoc) {
          // 改为依赖 CSS aspect-ratio，不强制写死高度
          gameTetrisIframe!.style.height = '';
        }
      } catch (error) {
        console.log('无法访问俄罗斯方块 iframe 内容，使用默认高度');
      }
    };
  }
});
