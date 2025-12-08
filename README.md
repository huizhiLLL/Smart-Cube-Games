# Smart Cube Games

通过 GAN 智能魔方操控网页游戏的交互式项目。

## 简介

本项目基于 [gan-cube-sample](https://github.com/afedotov/gan-cube-sample) 进行修改，核心使用了 [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) 库来实现与 GAN 智能魔方的蓝牙连接和交互。

## 功能特性

- 🔌 通过 Web Bluetooth API 连接 GAN 智能魔方
- 🎮 使用魔方转动控制网页游戏
- 📊 实时显示魔方状态和电量信息
- 🎯 支持多款网页游戏（如 2048）

## 技术栈

- **gan-web-bluetooth**: 与 GAN 智能魔方通信的核心库
- TypeScript + Vite
- RxJS: 处理魔方事件流

## 使用方法

1. 确保你的设备支持 Web Bluetooth API（Chrome/Edge 浏览器）
2. 连接 GAN 智能魔方
3. 转动魔方即可控制游戏

## 相关链接

- [gan-web-bluetooth 库](https://github.com/afedotov/gan-web-bluetooth)
- [gan-cube-sample 示例项目](https://github.com/afedotov/gan-cube-sample)

