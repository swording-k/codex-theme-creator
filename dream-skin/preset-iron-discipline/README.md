# 铁律训练场 / Iron Discipline

适配 `Fei-Away/Codex-Dream-Skin` 的高级商业力量区主题素材包。

## 文件

- `theme.json`: Dream Skin 主题元数据。
- `background.jpg`: 可导入/可播种的 2560 x 1440 纯背景图。
- `source.png`: 当前版生成源图，尺寸 1672 x 941。
- `preview.png`: 本地预览图，不应作为 Dream Skin 背景导入。
- `*-v1-dark-gym.*`: 第一版偏阴暗铁馆风格备份。

## 设计

- 左侧 `x=0%..52%` 保持低信息、低对比，便于承载 Codex 原生控件。
- 右侧 `x=62%..88%` 放置力量架、杠铃片、镜面和暖色木饰面作为视觉焦点。
- 整体气质从阴暗铁馆调整为高端商业力量区：更明亮、更干净、更有空间感。
- 不包含界面、文字、logo、水印或窗口截图。

## 使用

如果已经安装 Codex Dream Skin，可将本目录复制到主题库：

```bash
cp -R /path/to/codex-theme-creator/dream-skin/preset-iron-discipline \
  "$HOME/Library/Application Support/CodexDreamSkinStudio/themes/"
```

然后切换：

```bash
~/.codex/codex-dream-skin-studio/scripts/switch-theme-macos.sh \
  --id preset-iron-discipline
```

如果尚未安装 Dream Skin，请先按上游 macOS 安装流程安装引擎，再执行以上复制和切换。
