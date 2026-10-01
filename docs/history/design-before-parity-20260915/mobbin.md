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

这是项目当前视觉规范，基于用户提供的[Mobbin分析原文](docs/design/references/DESIGN-mobbin.source.md)
调整。原文是参考资料，其中禁止阴影/渐变、营销蓝、商用Saans字体等不作为本项目指令。
用户本轮要求的Apple视觉、毛玻璃、液态玻璃意向和色彩渐变在本规范中有明确位置。
产品范围仍由[产品基准](docs/product/PRODUCT-FOUNDATION.md)及AGENTS管理。

采用[Google DESIGN.md格式](https://github.com/google-labs-code/design.md)：YAML给出颜色、字体、
圆角、间距和组件值，正文解释使用方式。root DESIGN.md只负责导航，不维护第二套token。
原型启动器直接读取本文件生成token变量；正式CSS仍保留现有值，迁移另行以界面验证推进。

视觉意图：安静的展览底色、清楚的素材细节、轻盈的控制层。资料库适合查找比较，
工作模式减少遮挡。玻璃用于需要悬浮关系的控件，素材区域使用稳定的实色衬底。

## Colors

使用明暗两套语义色；正文/次要文字均按最终底色验证对比，不把disabled低对比文本
用于状态解释。选中导航、筛选标签、快捷按钮与素材选择统一使用中性灰色，不使用蓝色选中块。
绿色、琥珀色、红色同时配文字和图标表示结果。
这取代Mobbin参考中“蓝色仅用于商业信号”和“没有语义状态色”的营销站规则。

渐变由gradient-lilac、gradient-blue、gradient-peach组成，用于窗口外的氛围背景、
工作模式桌面示意和少量工具高光。保持静态、低饱和；主内容不加渐变遮罩或滤镜。
素材自身颜色、原始比例不因主题改变。配色占比必须对应算法测量或明确标注的演示值。

## Typography

系统字体优先，无需下载Saans或其他字体。28px页标题、18px分区标题、13px正文、
12px标签/辅助文字适合桌面密度；重要错误不使用更小字。中文正文保持1.6行高。
不套用营销页80px标题、大量居中宣传文字或80–120px段落空白。

## Layout

采用4/8px节奏，资料库使用70px窄图标导航、以内容为主的网格、底部搜索/筛选、按需检查器。
  文件夹卡片露出2–3份内容，前盖半透明模糊；名称和计数位于下方。默认1440×900，
最低桌面1024×768；桌面单击素材从右侧展开占位详情栏，网格按原序重新排布。
选中卡片保留视口锚点与大小，其他卡片使用约360ms位移/模糊过渡；最右侧无空间时
只做避免侧栏覆盖所需的水平让位，保留纵向位置。显式调整布局滑条会重新计算卡片尺寸。
小于桌面支持宽度时详情可覆盖，不能把窄屏展示当作绝对锚点保证。小于桌面宽度的原型
允许顺序预览，不能把手机预览当作桌面适配验收。

工作模式有轻量控制条和可拖动、可调整大小的参考窗口；每个窗口可以显示多份素材。
工作集成员增删是参考排列，不出现库删除、分类维护或标签管理。原型中的多个面板
是布局模拟，不能称为操作系统置顶窗口。单击看侧栏详情、显式复选多选、空格或双击打开专注模式。专注模式为左侧完整素材、
右侧信息、底部横向画廊；左右键/点击缩略图按打开时筛选或工作集顺序切换，
图片直接硬切，不使用透明度、模糊或渐变切换；输入/视频按键不被抢走。
支持 +/− 与滚轮缩放、0适应、1原始尺寸、拖动画布，绘图时按住空格临时移动。
图片下方为“原图”和多个独立笔记页的小矩形，末尾是“添加笔记”。页内可画笔/矩形/椭圆、
添加文字与便签；点击图片上的便签标记显示内容。笔记独立存储、不烧录到原图，支持显式保存。

## Elevation & Depth

参考[Apple Liquid Glass介绍](https://developer.apple.com/videos/play/wwdc2025/219/)中控制/导航
独立于内容的层级。CSS实现使用82%浅色或90%深色材料、背景模糊20px、饱和度1.12、
不绘制装饰描边。底部搜索与操作区使用40%浅色/48%深色玻璃，标签27%/32%，
弹出菜单48%/58%，不叠加大面积渐变底托；只有一层克制底色和模糊，保持内容可见与文字可读。
实色材料手动切换功能移除，旧保存偏好不再强制实色；系统无障碍/不支持模糊的回退仍可自动生效。
标签文字约80%不透明，依样例底色使用深浅文字；素材边框和选中外圈移除，键盘焦点仍可辨识。
工作窗口阴影为0 18px 48px rgba(25,30,50,.16)；普通素材卡片用细边
与柔和衬底，不给每张卡片套一层玻璃。对比不稳定时提高不透明度。

液态感来自胶囊选中块、边缘高光、轻微按压和连贯过渡；不声称CSS等于原生光学折射。
一般过渡160–220ms，位移不超过6px；模式切换不强制等待近一秒的全屏模糊。
这替代旧原型的大范围模糊/停留规则。减少动态效果时取消位移/光扫，切换即时完成。
系统要求减少透明度、增强对比度，或不支持backdrop-filter时，自动回退实色。

## Shapes

胶囊用于分段导航/按钮；输入10px、内容16–20px、浮动窗口24px。嵌套圆角考虑边距，
不机械让所有东西变成胶囊。素材内部不强加圆角或裁切；需要圆角的是外部容器。
操作目标至少36×36px，触控布局44×44px。焦点环2px，与控件间留2px间隔。

## Components

- 导航：使用窄图标栏，顺序为全部、文件夹、工作模式、回收站；图标有悬停/键盘提示。
  普通/AI文件夹与色板以磨砂文件夹卡片集中在文件夹页，工作集集中在工作模式页。
  该决定替代上一版宽侧栏树状主导航，保留AI分类不复制原件及建议/确认分离的规则。
- 搜索：固定在内容底部的玻璃控制层。上方标签筛选和已选标签，下方搜索、随机打乱、
  未标签、未分类及菜单；右侧独立竖向滑条调整网格大小。选中标签点击即撤销，用约420ms
  粒子消散作反馈，减少动态效果时直接移除。全部、素材文件夹子页、回收站共用操作面。
  文件夹根页搜索名称，色板页搜索颜色；不适用的素材快捷项禁用并说明。
- 素材：不裁设计边缘；多选控件与打开操作分离。已有标签在图片下沿以半透明玻璃胶囊
  展示，可点击加入/取消筛选；选中为灰色。离线、未分析、失败分别标注。
- 检查器：素材预览→配色与占比→简要格式信息→分析结果/来源→上下文动作；
  去掉重复素材标题。侧栏与专注模式复用信息、配色和既有上下文动作。色块左键复制HEX，右键菜单提供复制、收藏至选定/新建色板文件夹、
  添加到选定工作窗口；键盘Context Menu/Shift+F10也可打开。
  AI演示结果不伪装推理证据。
- 工作集：命名保存、添加已有素材、移除参考、窗口恢复。未保存状态与保存失败可见。
  聚焦窗口素材按空格快速预览，关闭恢复焦点；输入区和视频控件保留自己的空格语义。
  窗口色板位于工作备注之前，独立增删收藏色；移除工作色不删除全局色板或改变素材。
- 工具条/工作窗口：统一玻璃层。窗口内大块素材展示面保持实色和原比例。
- 精简外框：左侧导航不显示分隔描边；隐藏内容滚动条但保留滚动/键盘访问。布局滑条约104px，
  细轨道和9px滑块，无常驻图标/数字，操作时显示数值。
- 原型预览：上下开发说明条默认隐藏，可由左下设置中的“显示预览说明条”恢复；
  说明归入设置不代表模拟数据已变成正式接线。
- 反馈：失败靠近发生位置，有可执行恢复动作；空库、无匹配、离线和加载失败区分。
- 键盘：可达的按钮名称、焦点可见；Escape关闭顶层并恢复焦点；输入框不被全局快捷键抢夺。

## Do's and Don'ts

保留Mobbin的内容优先、中性层级、清楚的圆角和紧凑组件；加入克制的Apple式玻璃控制层。
使用本文件token而非分散复制颜色值。通过明暗、实色回退和拥挤内容检查可读性。

不复制商用字体或竞品图标；不把用户素材变为灰度装饰；不铺满玻璃、动态渐变和巨大阴影。
不以截图完成度冒充模型、数据库、原生拖拽或跨平台能力完成。
