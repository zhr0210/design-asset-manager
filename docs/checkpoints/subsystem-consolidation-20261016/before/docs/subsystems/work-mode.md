# 工作集、macOS原生悬浮窗与预览

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Host持有Library、工作集内容/成员/修订、保存、文件任务与撤权。设备布局与库内内容分开。macOS B的Swift/AppKit子进程负责NSPanel/NSCollectionView、输入、窗口frame与动画；React保留主工作台及按需独立大预览。

## 正式入口与运行链

默认start:desktop/start:browser连接普通Host，work controller默认createElectronWorkWindow；只有--dam-work-window-candidate=b（start:work-b）在macOS选createNativeShelfWorkWindow。B通过正式工作模式工作集打开/恢复，私有父子管道仅传受限快照/意图。A是独立研究比较候选，不是B的产品路径。

## 失败、取消与兼容保护

按owner/frame/token/成员/库代际核对，旧会话不复活；未保存/unknown flush保留内容和窗口。motionId/gestureId关联终态，迟到动画不覆盖新操作；物理子进程未退出不能释放槽/文件。布局迁移先保留旧记录，不改工作集内容。

## 技术与平台边界

当前原生B仅macOS，Windows普通窗仍Electron/React。AppKit不等于SwiftUI；B的NSVisualEffectView不证明目标Liquid Glass已实现。原生输入、动画/帧率、多屏/Spaces、接收应用必须实际验收，Browser结果不能替代。菜单范围/性能门槛等未确认项保留在交互规格。

## 源码与详细机制

- [src/main/work-mode/README.md](../../src/main/work-mode/README.md)
- [src/main/work-mode/work-window-controller.ts](../../src/main/work-mode/work-window-controller.ts)
- [src/main/work-mode/native-shelf-work-window.ts](../../src/main/work-mode/native-shelf-work-window.ts)
- [src/main/work-mode/electron-work-window.ts](../../src/main/work-mode/electron-work-window.ts)
- [src/main/work-mode/shelf-draft-store.ts](../../src/main/work-mode/shelf-draft-store.ts)
- [native/shelf-candidates/README.md](../../native/shelf-candidates/README.md)
- [src/main/index.ts](../../src/main/index.ts)

- [native/shelf-candidates/NativeWorkShelf.swift](../../native/shelf-candidates/NativeWorkShelf.swift)
- [native/shelf-candidates/WorkShelfInteraction.swift](../../native/shelf-candidates/WorkShelfInteraction.swift)
- [native/shelf-candidates/WorkShelfColorPicker.swift](../../native/shelf-candidates/WorkShelfColorPicker.swift)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-desktop-viewport-policy`
- `npm run test-app-navigation-workflow`
- `npm run test-electron-main-lifecycle-policy`
- `npm run test-work-frame-provenance`
- `npm run test-file-selection-bulk-ui`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
