# 财神清阅 / Caishen Readable

适配 `Fei-Away/Codex-Dream-Skin` 的明亮财神工作台主题。目标是保留招财氛围，同时让 Codex 侧边栏、对话正文和输入框保持清楚可读。

## 文件

- `theme.json`: Dream Skin 主题元数据。
- `background.png`: 可导入/可播种的 1915 x 821 纯背景图。
- `preview.png`: GitHub 和自媒体预览图，不应作为 Dream Skin 背景导入。
- `PROMPT.md`: 主题来源与复刻提示。

## 来源

- Public source pack: https://codex-theme-gallery.howardhua.chatgpt.site/themes/caishen-readable?utm_source=swording-codex-theme-creator&utm_medium=preset-readme&utm_campaign=caishen-readable
- GitHub release ZIP: https://github.com/ChannelerH/codex-skin-packs/releases/download/v0.1.0/caishen-readable.zip

## 设计

- 左侧 `x=0%..56%` 保持浅暖留白，适合放 Codex 导航和正文。
- 右侧 `x=65%..96%` 放置财神、元宝和笔记本等主要视觉元素。
- 采用浅色外观和暖色高对比文字，避免红金主题压住界面文字。
- 背景不包含真实 Codex 截图、聊天内容、任务名、按钮、logo 或水印。

## 使用

```bash
./scripts/install-local-theme.sh preset-caishen-readable
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh --id preset-caishen-readable
```
