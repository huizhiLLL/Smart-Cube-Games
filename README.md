# Smart Cube Games

通过 GAN 智能魔方操控网页小游戏的交互式项目。

## 简介

本项目基于 [gan-cube-sample](https://github.com/afedotov/gan-cube-sample) 进行修改，核心使用了 [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) 库来实现与 GAN 智能魔方的蓝牙连接和交互。

## 功能特性

- 🔌 通过 Web Bluetooth API 连接 GAN 智能魔方
- 🎮 使用魔方转动控制网页游戏
- 📊 实时显示魔方状态和电量信息
- 🎯 支持多款网页小游戏（2048、俄罗斯方块）

## 使用方法

1. 确保你的浏览器支持并启用 Web Bluetooth API（推荐使用 Chrome/Edge 浏览器）
2. 连接你的 GAN 智能魔方
3. 转动魔方即可开始游戏

> **注意**：
> 1. 浏览器中启用 Web Bluetooth API 的方法：
>   - Chrome: `chrome://flags/#enable-experimental-web-platform-features`
>   - Edge: `edge://flags/#enable-experimental-web-platform-features`
> 2. 测试发现若为移动端，可能需要预先获取魔方蓝牙的MAC地址进行连接。
> 
> 获取MAC地址的方法如下：
> - Chrome: `chrome://bluetooth-internals/#devices`
> - Edge: `edge://bluetooth-internals/#devices`

## 已知问题
- 当**从俄罗斯方块切回2048**时，会出现**交互无反应**的情况，需要**刷新网页重新连接魔方**。
## 游戏来源

本项目中的小游戏均来源于开源项目，并根据需求进行了适当修改，以支持通过 GAN 智能魔方进行操控。

## 相关链接

- [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) - GAN 智能魔方蓝牙通信库
- [gan-cube-sample](https://github.com/afedotov/gan-cube-sample) - GAN 智能魔方蓝牙通信示例
- [2048](https://github.com/gabrielecirulli/2048) - 2048 原仓库
- [vue-tetris](https://github.com/Binaryify/vue-tetris) - 俄罗斯方块原仓库

