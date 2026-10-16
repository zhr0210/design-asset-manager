# 工作集与原生呈现

跨层职责与用户入口见[所属子系统](../../../docs/subsystems/gui-shell.md#reference-windows)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

work-window-controller.ts、native-shelf-work-window.ts、electron-work-window.ts分别拥有窗口协调、AppKit桥和默认Electron适配。shelf-autosave/shelf-draft-store保存Host确认/恢复状态；work-media/work-file-handoff管理视频和独立交付。

B由Electron Main工作窗口控制器、原生适配器与Swift AppKit子进程组成。NativeWorkShelf持有NSPanel和内容控件，WorkShelfInteraction集中处理手势、边缘候选、过渡与实际frame接管；WorkShelfPresentation独立拥有前景淡化、不可交互的临时快照和可取消延迟，业务选择与草稿不归动画回调管理。标题/背景使用统一的AppKit输入路径，素材拖出、控件和文本输入独立；不用全局按键轮询或无来源重复移动作为兜底。

唯一Host持有Library、工作集、成员、修订、文件与提交权威。私有桥传受限展示快照/意图及gestureId、motionId等关联信息，返回完成/取消/失败；configureDock等待实际有效终态，迟到回执不得覆盖新操作。会话、成员、撤权与实际进程退出检查保留，未确认退出不释放窗口/文件资源。

布局契约区分presentation与edge-slide停靠。展开态可附带expansion（center/left/right与220×240 compactBounds）：仅保存位置关系，不授予文件或执行能力；严格校验数值、模式和尺寸，与实际展开geometry一并持久化，并在原生bounds恢复。紧凑/停靠不得携带旧展开关系。旧布局转换前保留原文；旧紧凑胶囊转换为比例停靠，旧展开停靠恢复可见展开态，不改变工作集内容。运动记录含版本、关联标识、原生事件时间、请求/实际位置、判定及终态；有界缓冲、异步写入，拖动采样可合并，开始/松手/拒绝/中断/完成必须保留。诊断失败不得阻塞交互。

背景材质与停靠覆盖层是独立实现；Liquid Glass、按钮样式及220×240布局的设计目标不能由现有NSVisualEffectView或旧构建资格推定已实现。实际身份、指针输入、模糊及设备缺口见[CURRENT-STATE](../../../docs/handoff/CURRENT-STATE.md)和[原生候选说明](../../../native/shelf-candidates/README.md)。

## 状态、提交与失败

Host持有Library、成员、修订、文件与提交。B的私有管道传受限快照/意图与gestureId/motionId，等待有效完成/取消/失败后保存实际布局；旧完成不能覆盖新操作，未确认物理退出不释放资源。布局区分presentation与edge-slide，旧值转换前保留原文。

## 数量窗口与本机复用的技术边界

Work Set 的有效内容为 name/assetIds/columns，Native 栅格固定两列。`work-set-retirement.schema.ts` 只在既有 Host 备份维护事务中执行 v16 退役；同事务保存修订/引用，`fork` 可原子复制或移动引用到新集合。设备布局独立保存 indicatorColor/alwaysShowIndicator/currentSpaceOnly/pinned。历史恢复文件先只读投影；已明确升级的库才备份并清理对应字段，Notebook 与其他库记录不动。

`WorkShelfCapsule` 使用公共 AppKit vibrancy 和 Core Animation，不宣称胶囊本身是 NSGlassEffectView。`WorkShelfSystemActions` 消费当前范围/修订与 Host 准备的副本；动态 NSWorkspace 打开方式、Quick Look、NSSharingServicePicker、系统文件选择器属于原生表面。文件信息目前为 AppKit 信息面板，不宣称 Finder Get Info 自动化。没有任意 Renderer 路径、SQL 或系统脚本入口。

`work-file-handoff` 的副本移动/改名保留实际位置及物理身份，更新记录在移除旧副本之前；重名不覆盖，未知确认保留完成副本。Trash 与记录清理分开，已回收副本不可再次交付。新 PDF/拼接/OCR文本仍沿用保留预算、来源/成员重验和任务取消；`work-image-document` 生成真实 RGB PDF 页和有界拼接，默认原尺寸纵向居中，等比/横向为显式配置。

`WorkShelfOCR` 复用既有本机 RapidOCR 与资源准入，原版 Vision 仅作为对标证据；不新增云服务。`WorkShelfRedaction` 提供手动遮挡与消费真实 OCR 多边形的智能选区，独立 PNG 通过 Host 原图尺寸生成，不写回素材原件或 Notebook。代码/受控测试资格与正式设备通过仍分别记录。

## 平台与保留接口

默认仍Electron，带--dam-work-window-candidate=b才在Mac选AppKit。NSPanel/NSCollectionView负责整个悬浮窗，React保留主工作台与按需独立预览。B在macOS 26使用NSGlassEffectView，旧系统使用NSVisualEffectView回退；紧凑220×240，展开按数量档位。实际视觉和物理输入资格仍须按当前候选分别验收。视频Mac AVFoundation/Windows Media Foundation方法与测量分开。

## 详细契约、来源与验证

[逐段技术契约](../../../docs/subsystems/gui-shell.md#reference-windows)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../docs/history/documentation-rebuild-20261015/modules/src--main--work-mode--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
