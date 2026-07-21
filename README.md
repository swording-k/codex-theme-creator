# Codex Theme Creator

让 Codex Desktop 用上你自己的主题。

你只要说出想要的感觉，或者给 Codex 一张参考图；它会按本项目的主题格式完成创作。之后在 **Codex Theme Creator App** 里预览、微调、切换、导出或分享。

> 非官方开源项目，和 OpenAI 没有隶属关系。

## 普通用户：三步开始

### 1. 下载 App

下载 [macOS Beta（Apple 芯片）](https://github.com/swording-k/codex-theme-creator/releases/download/v0.1.1/Codex-Theme-Creator-0.1.1-arm64.dmg)，将 `Codex Theme Creator.app` 拖进“应用程序”后打开。

第一次启动会**自动安装创作 Skill**。不需要再复制终端命令，也不需要理解 GitHub 仓库。

如果 Mac 第一次提示无法确认来源：在“应用程序”里按住 Control 点击 App，选择“打开”一次即可，之后正常双击打开。

当前版本需要：

- Apple 芯片 Mac（M1/M2/M3/M4）
- 已安装 Codex Desktop
- 建议先在 Codex 设置中使用深色外观

### 2. 让 Codex 创作主题

打开 App，点“让 Codex 创作新主题”或“复制创作提示词”，然后把提示词发给 Codex，并在最后加上你的想法，例如：

```text
我想要一套 GT 赛车主题：雨后赛道、深色、红色强调色，文字必须清楚。
```

也可以直接附上一张参考图。主题完成后会自动出现在 App 的主题库。

### 3. 管理和分享

在 App 里选择主题，可以预览、调整强调色/背景模糊/背景压暗并应用到 Codex。

- **导出主题**：生成一个 `.ctheme` 文件，发给朋友。
- **导入主题**：选择别人分享给你的 `.ctheme` 文件。
- **菜单栏图标**：快速打开管理器、恢复默认外观或切换已保存主题。

主题保存在你自己的电脑：

```text
~/Library/Application Support/CodexDreamSkinStudio/themes/
```

## 给 Codex 或其他智能体的说明

本仓库提供一个名为 `codex-theme-creator` 的 Skill。它的职责不是只生成背景图，而是生成一个完整、可校验的主题包：背景资产、颜色、界面风格配置和主题元数据。

如果你从源码使用，告诉你的 Codex：

```text
请阅读并使用 https://github.com/swording-k/codex-theme-creator 。
按仓库里的 Codex Theme Creator Skill 为我创作完整 Codex Desktop 主题；完成后必须写入本机主题库并验证界面文字可读。
```

开发者从源码启动：

```bash
git clone https://github.com/swording-k/codex-theme-creator.git
cd codex-theme-creator
./scripts/install-theme-creator.sh
./scripts/start-theme-app.sh
```

## 平台状态

| 平台 | 状态 |
| --- | --- |
| macOS Apple 芯片 | 可用 Beta：创建、管理、导入导出、菜单栏切换 |
| Windows | 正在适配真实 Codex 运行时；暂不提供空壳安装包 |

## 它如何工作

主题以一个本地主题包存在：`theme.json + 背景图`。App 管理这些包；macOS 本地运行时把经过限制的主题样式应用到 Codex 的渲染界面。它不修改 Codex 应用本体、`app.asar` 或签名。

Codex Desktop 更新后，界面结构可能变化。我们会继续适配；遇到不兼容时，请先在 App 中点击“恢复 Codex 默认”。

## 截图

| GT 赛车 | 星空观测站 | 铁律训练场 |
| --- | --- | --- |
| ![GT 赛车主题](media/showcase/01-porsche-gt3rs.jpg) | ![雪山主题](media/showcase/02-alpine-lake-desk.jpg) | ![雨林主题](media/showcase/03-rainforest-focus.jpg) |

## 致谢

macOS 主题运行时借鉴了 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 的本地注入思路。
