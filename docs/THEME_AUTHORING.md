# Theme Authoring Guide

这份指南用于制作新的 Codex Dream Skin 主题。目标不是只做一张好看的图，而是做一套能长期使用、信息可读、适合分享的 Codex 主题。

## 主题文件

每套主题使用 `preset-*` 目录：

```text
dream-skin/preset-<slug>/
├── theme.json
├── background.jpg
├── preview.png
└── README.md
```

`background.jpg` 是真实注入 Codex 的纯背景图。`preview.png` 用于 GitHub README 和自媒体展示。

## 背景图原则

- 推荐尺寸：`2560 x 1440`，16:9。
- 只放纯背景，不放 Codex 窗口、按钮、输入框、文字、logo、水印。
- 左侧 `x=0%..52%` 应低信息、低对比，用于承载 Codex 原生界面。
- 右侧 `x=62%..88%` 可以放主题主视觉。
- 画面下方中间区域不要太亮或太复杂，因为输入框可能覆盖这里。
- 避免强烈噪点、过密纹理、强烈霓虹、高亮白块。

## 字体颜色和背景逻辑

主题必须先保证阅读体验。

深色背景建议：

```json
{
  "appearance": "dark",
  "colors": {
    "background": "#151412",
    "panel": "#201f1c",
    "text": "#f4f0e8",
    "muted": "#aaa197",
    "line": "rgba(214, 106, 76, .24)"
  }
}
```

浅色背景建议：

```json
{
  "appearance": "light",
  "colors": {
    "background": "#f5f2ea",
    "panel": "#ffffff",
    "text": "#202124",
    "muted": "#6f6b63",
    "line": "rgba(32, 33, 36, .16)"
  }
}
```

检查重点：

- 深背景用浅文字。
- 浅背景用深文字。
- 重点文字和背景要有明显明度差。
- `muted` 不能淡到读不清。
- `accent` 可以有个性，但不要大面积刺眼。
- 不要让高亮背景落在 Codex 标题、消息文字、输入框位置。

## 生成背景提示词模板

```text
Create one standalone 2560x1440, 16:9 adaptive Codex desktop wallpaper.
Generate only the pure background scene that will sit beneath a real application interface.

Keep x=0% to x=52% calm, low-detail, low-local-contrast, and readable beneath translucent UI.
Place the primary visual focus between x=62% and x=88%.
Avoid strong highlights, dense texture, readable text, logos, watermarks, UI panels, app windows, buttons, icons, input boxes, code editors, terminals, and screenshots.
Return only the opaque edge-to-edge wallpaper.
```

## 发布前检查

```bash
node /path/to/Codex-Dream-Skin/macos/scripts/injector.mjs \
  --check-payload \
  --theme-dir /path/to/codex-skins/dream-skin/preset-<slug>
```

还要人工检查：

- `theme.json` 的 `id` 与目录名一致。
- 背景图没有版权风险、肖像风险或商标风险。
- 在 Codex 里真实切换后，标题、对话内容、输入框都能看清。
- GitHub README 里的预览图和安装命令是最新的。
