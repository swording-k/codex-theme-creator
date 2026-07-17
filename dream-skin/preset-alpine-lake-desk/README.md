# 雪湖工作台 / Alpine Lake Desk

适配 `Fei-Away/Codex-Dream-Skin` 的湖泊雪山写代码氛围主题。

## 文件

- `theme.json`: Dream Skin 主题元数据。
- `background.jpg`: 可导入/可播种的 2560 x 1440 纯背景图。
- `preview.png`: GitHub 和自媒体预览图，不应作为 Dream Skin 背景导入。

## 设计

- 左侧 `x=0%..52%` 是低对比湖面、雾气和远山，避免雪山高光影响阅读。
- 右侧 `x=62%..88%` 放置木质工作台、暖灯、窗框和近景雪山。
- 整体保留“在安静房间里面对湖泊雪山写代码”的深度工作氛围。
- 背景整体偏亮，`theme.json` 使用深色文字与浅色面板，避免白字压在雪景上。
- 不包含界面、文字、logo、水印或窗口截图。

## 使用

```bash
./scripts/install-local-theme.sh preset-alpine-lake-desk
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh --id preset-alpine-lake-desk
```
