---
version: alpha
name: DAM — Gallery & Glass
description: 内容优先的视觉素材工作台。以用户提供的Mobbin分析为结构基础，结合Apple风格的浮动玻璃控制层与克制渐变；面向桌面创作，不套用营销站版式。
colors:
  primary: "#151619"
  on-primary: "#ffffff"
  canvas: "#f5f5f7"
  surface: "#ffffff"
  surface-soft: "#eceef2"
  ink: "#202126"
  muted: "#60636f"
  border: "#d9dce3"
  accent: "#55585f"
  on-accent: "#ffffff"
  accent-soft: "rgba(85,88,95,0.13)"
  positive: "#267447"
  warning: "#8a5400"
  danger: "#b32937"
  glass: "rgba(255,255,255,0.82)"
  glass-edge: "rgba(255,255,255,0.95)"
  glass-control: "rgba(248,249,251,0.40)"
  glass-popup: "rgba(247,248,250,0.48)"
  glass-capsule: "rgba(247,248,250,0.27)"
  dark-glass-control: "rgba(36,39,45,0.48)"
  dark-glass-popup: "rgba(38,41,47,0.58)"
  dark-glass-capsule: "rgba(38,41,47,0.32)"
  gradient-lilac: "#ddd8f5"
  gradient-blue: "#d2e5f2"
  gradient-peach: "#f6e7de"
  dark-canvas: "#17191f"
  dark-surface: "#23262e"
  dark-surface-soft: "#303440"
  dark-ink: "#f3f4f8"
  dark-muted: "#b9bdc9"
  dark-border: "#494e5b"
  dark-accent: "#c9cbd1"
  dark-on-accent: "#24262d"
  dark-accent-soft: "rgba(214,218,226,0.14)"
  dark-glass: "rgba(35,38,46,0.9)"
  dark-glass-edge: "rgba(255,255,255,0.16)"
  dark-positive: "#8bd9a7"
  dark-warning: "#f1ca85"
  dark-danger: "#ffa2ac"
typography:
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    fontSize: 28px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: -0.02em
  heading:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 10px
  md: 16px
  card: 20px
  window: 24px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 36px
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: 36px
  input:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: 40px
  asset-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
  toolbar:
    backgroundColor: "{colors.glass-control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
  work-window:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.window}"
  inspector:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
---

## Overview

Gallery & Glass，面向视觉创作者的本地 AI+ 素材工作台。
本文件是 [DESIGN.md](DESIGN.md) 的 token 与材料配套，不维护第二套布局规格。
2026-09-15 从最后批准的 UI 原型反向校准；原型和正式素材界面共同使用
`src/renderer/components/gallery/tokens.css` 与 `gallery.css`。
使用 `node scripts/sync-gallery-tokens.mjs` 从本文件生成 CSS，`--check` 检查漂移。

## Colors

内容画布使用 canvas/ink/muted；交互选择为 accent/ accent-soft 的中性灰，
不使用蓝色导航选中。positive/warning/danger 配合文字与图标表达操作结果。
作品颜色保持原样，不添加全画面渐变或滤镜。渐变 token 仅供工作参考背景与少量工具氛围。

## Typography

系统字体优先；13px/1.6 正文，素材标题与上下文 12px，辅助文字 11px，图片标签 10px。
通用 token 的 title 28px、heading 18px 不强制应用到每张卡片；组件实际字号见 DESIGN.md。
不下载字体，不使用营销页的大标题与段落留白。

## Layout

四图标导航与底部操作层；文件夹含普通/AI 分类与色板，工作集归工作模式。
默认期望卡片宽度 330px，范围 150–430、步进 10。侧栏展开保留列数，向小缩放填满剩余宽度，
尽量保持纵向锚点；不再要求旧尺寸与绝对原位置。网格位移/缩放 200ms，没有模糊。
专注模式硬切，左图右信息、下方笔记页与横向画廊。完整尺寸与键盘语义统一在 DESIGN.md。

## Elevation & Depth

| 材料 | 浅色不透明度 | 深色不透明度 | 模糊/饱和度 |
| --- | --- | --- | --- |
| 搜索与操作 | 40% | 48% | 20px / 1.04 |
| 菜单与筛选 | 48% | 58% | 24px / 1.02 |
| 图片与筛选标签 | 27% | 32% | 14px / 1.02 |

不透明度越低越通透。以上组件只用一层底色，无装饰描边、内高光线、叠加渐变底托。
通用 glass 82%/90% 用于参考窗口等较厚容器，不覆盖控制层材料。glass-edge 是兼容 token，
不能据此给图片、胶囊、搜索、菜单、导航重新添加描边。
图片标签文字不透明度约 80%；真实暗图需要浅字，浅图使用深字。选择为中性灰。
工作窗口阴影 0 18px 48px rgba(25,30,50,.16)，控件阴影遵循共享组件。
系统减少透明度、增强对比或不支持模糊时自动回退；手动实色开关已删除。
CSS 模糊不等同原生 Liquid Glass 光学折射。[Apple 材料参考](https://developer.apple.com/design/human-interface-guidelines/materials)。

## Shapes

图片容器 21px、搜索 24px、菜单 22px、专注窗口 24px；笔记页 9px。
胶囊用于标签和控制按钮，图片本身 contain 且无边框。键盘焦点可辨，不以取消装饰边线取消焦点。

## Components

底部搜索、标签消散、磨砂文件夹、网格重排、专注画布来自共享 gallery 组件。
数据、权限、保存和操作回调由调用方提供。正式表面不引入 fixtures、原型 localStorage、模拟推理。
能力暂不可用时显示原位置的受限状态，不将已确认界面删减为另一套设计。

## Do's and Don'ts

- 按 DESIGN.md 的逐状态对照和正式数据测试分别验收；截图、构建或 mock 不能替代另一条证据。
- 配色占比来自记录或可解释测量，不把 50/30/20 演示比例用于真实素材。
- 图片和玻璃无装饰描边；暗色主题与减少动效单独检查。
- 不恢复旧宽导航、全屏模糊、网格模糊、专注渐变、实色开关、上下演示说明条。
- [Google DESIGN.md](https://github.com/google-labs-code/design.md)提供 token 加说明的格式；
  [mymind](https://mymind.com/)与用户参考图只提供设计方向，不覆盖最后批准的原型。
- 历史规则见 [修改前版本](docs/history/design-before-parity-20260915/mobbin.md)，不再参与当前视觉决策。
