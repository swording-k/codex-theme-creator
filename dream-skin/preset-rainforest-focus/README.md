# 雨林专注 / Rainforest Focus

适配 `Fei-Away/Codex-Dream-Skin` 的雨中森林写代码氛围主题。

## 文件

- `theme.json`: Dream Skin 主题元数据。
- `background.jpg`: 可导入/可播种的 2560 x 1440 纯背景图。
- `preview.png`: GitHub 和自媒体预览图，不应作为 Dream Skin 背景导入。

## 设计

- 左侧 `x=0%..52%` 是低对比雨林、雾气和溪流，适合承载 Codex 文本。
- 右侧 `x=62%..88%` 放置木桌、暖灯、雨滴玻璃和植物细节。
- 外观走浅色文字逻辑：背景偏亮，`theme.json` 使用深色文字，避免浅背景上看不清。
- 不包含界面、文字、logo、水印或窗口截图。

## 使用

```bash
./scripts/install-local-theme.sh preset-rainforest-focus
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh --id preset-rainforest-focus
```
