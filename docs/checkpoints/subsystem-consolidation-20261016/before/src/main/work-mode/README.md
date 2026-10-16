# 工作集与原生呈现

跨层职责与用户入口见[所属子系统](../../../docs/subsystems/work-mode.md)。本文只解释局部当前机制；历史资格不在此累积，具体参数以当前源码/聚焦检查为准。

## 入口与拥有者

work-window-controller.ts、native-shelf-work-window.ts、electron-work-window.ts分别拥有窗口协调、AppKit桥和默认Electron适配。shelf-autosave/shelf-draft-store保存Host确认/恢复状态；work-media/work-file-handoff管理视频和独立交付。

## 状态、提交与失败

Host持有Library、成员、修订、文件与提交。B的私有管道传受限快照/意图与gestureId/motionId，等待有效完成/取消/失败后保存实际布局；旧完成不能覆盖新操作，未确认物理退出不释放资源。布局区分presentation与edge-slide，旧值转换前保留原文。

## 平台与保留接口

默认仍Electron，带--dam-work-window-candidate=b才在Mac选AppKit。NSPanel/NSCollectionView负责整个悬浮窗，React保留主工作台与按需独立预览。当前B背景是NSVisualEffectView，Liquid Glass与220×240等批准目标须分别验收。视频Mac AVFoundation/Windows Media Foundation方法与测量分开。

## 详细契约、来源与验证

[逐段技术契约](../../../docs/subsystems/contracts/work-mode.md)保留命名接口/版本下的全部适用机制与保护。[迁移前完整技术/演进原文](../../../docs/history/documentation-rebuild-20261015/modules/src--main--work-mode--README.md)保存全部细节、数字和当时上下文；其旧“当前/未验/禁用/下一步”只对应原日期，不能替代本页与实际源码。修改局部参数时精确查该来源及对应源码/测试，保留仍适用保护，不从摘要推导放宽。

实际命令见package.json、.codeindex/tests-map.json和子系统验证入口。用户功能按[真实验收](../../../docs/agents/ui-ux-acceptance.md)执行；UI/真实推理/原生/库资格分列，当前版本只见CURRENT-STATE，不把内部接线或本次重写当新PASS。
