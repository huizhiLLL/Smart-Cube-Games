// 魔方转动到键盘事件的映射系统

export type MoveDirection = 'R' | "R'" | 'U' | "U'" | 'F' | "F'" | 'L' | "L'" | 'D' | "D'" | 'B' | "B'";

export interface KeyboardEventOptions {
  key: string;
  code: string;
  keyCode: number;
  which: number;
  bubbles?: boolean;
  cancelable?: boolean;
}

/**
 * 将魔方转动映射为键盘事件
 * R/R' -> 左右箭头
 * U/U' -> 上下箭头
 */
export class CubeToKeyboardMapper {
  private moveToKeyMap: Map<string, KeyboardEventOptions> = new Map();

  constructor() {
    // R 转动 -> 右箭头
    this.moveToKeyMap.set("U'", {
      key: 'ArrowRight',
      code: 'ArrowRight',
      keyCode: 39,
      which: 39,
      bubbles: true,
      cancelable: true
    });

    // R' 转动 -> 左箭头
    this.moveToKeyMap.set("U", {
      key: 'ArrowLeft',
      code: 'ArrowLeft',
      keyCode: 37,
      which: 37,
      bubbles: true,
      cancelable: true
    });

    // U 转动 -> 上箭头
    this.moveToKeyMap.set('R', {
      key: 'ArrowUp',
      code: 'ArrowUp',
      keyCode: 38,
      which: 38,
      bubbles: true,
      cancelable: true
    });

    // U' 转动 -> 下箭头
    this.moveToKeyMap.set("R'", {
      key: 'ArrowDown',
      code: 'ArrowDown',
      keyCode: 40,
      which: 40,
      bubbles: true,
      cancelable: true
    });
  }

  /**
   * 将魔方转动字符串转换为键盘事件
   * @param move 魔方转动符号，如 "R", "R'", "U", "U'"
   * @returns 键盘事件选项，如果无法映射则返回 null
   */
  mapMoveToKeyboard(move: string): KeyboardEventOptions | null {
    // 标准化转动符号（去除空格，处理 R2, U2 等情况）
    const normalizedMove = move.trim();
    
    // 处理 R2, U2 等情况（视为两次转动）
    if (normalizedMove.endsWith('2')) {
      const baseMove = normalizedMove.slice(0, -1);
      return this.moveToKeyMap.get(baseMove) || null;
    }

    return this.moveToKeyMap.get(normalizedMove) || null;
  }

  /**
   * 触发键盘事件
   * @param target 目标元素
   * @param move 魔方转动符号
   */
  triggerKeyboardEvent(target: Element | Document, move: string): boolean {
    const keyOptions = this.mapMoveToKeyboard(move);
    if (!keyOptions) {
      return false;
    }

    // 创建 keydown 事件
    const keydownEvent = new KeyboardEvent('keydown', {
      key: keyOptions.key,
      code: keyOptions.code,
      keyCode: keyOptions.keyCode,
      which: keyOptions.which,
      bubbles: keyOptions.bubbles ?? true,
      cancelable: keyOptions.cancelable ?? true
    });

    // 创建 keyup 事件
    const keyupEvent = new KeyboardEvent('keyup', {
      key: keyOptions.key,
      code: keyOptions.code,
      keyCode: keyOptions.keyCode,
      which: keyOptions.which,
      bubbles: keyOptions.bubbles ?? true,
      cancelable: keyOptions.cancelable ?? true
    });

    // 触发事件
    target.dispatchEvent(keydownEvent);
    // 短暂延迟后触发 keyup
    setTimeout(() => {
      target.dispatchEvent(keyupEvent);
    }, 50);

    return true;
  }

  /**
   * 获取所有支持的转动映射
   */
  getSupportedMoves(): string[] {
    return Array.from(this.moveToKeyMap.keys());
  }
}

