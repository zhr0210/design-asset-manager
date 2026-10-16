结论：**共享 React 展示组件可行；将所有窗口（含 macOS B）完全 React 化，是一次呈现架构取舍变更，收益与代价必须分开评估。**

当前代码事实：

- 主工作台、设置、单素材卡片、默认工作集窗口均已使用 React。独立窗口通过 `main.tsx:10–18` 分流，保留专用桥。
- 默认工作集窗口使用独立 Electron session、受限 preload、sandbox 和专属媒体协议，见 `src/main/work-mode/electron-work-window.ts`。
- B 候选采用 AppKit；独立大预览按需复用 Electron/React，见 `native-shelf-work-window.ts` 的 `ensureDetail`。
- `ADR0493:26` 明确约定整个悬浮窗紧凑态、展开态、菜单、输入和系统拖放由 AppKit 负责；全 React 方案会替代这一现行决定。最新用户意向可以重开取舍，无须把历史决定当绝对禁止。

主要收益：

- 减少 React/AppKit 两套内容控件、状态呈现和交互逻辑的重复维护。
- 更容易同步卡片、色板、工具反馈、空态、主题与可访问性规则。
- 默认 Electron 路径已有基础，不需从零实现 React 工作窗。

不能由“共用组件”直接获得的效果：

- 同一套 React 组件不等于同一个 Renderer、同一套权限或共享 Store。窗口隔离和 Host 权威应保留。
- 性能、资源占用和原生体验不会自动改善；当前 B 用 NSPanel、NSCollectionView、NSTextView、NSMenu、NSFilePromiseProvider 和 NSVisualEffectView。React 替代会重新实现这些行为，或继续保留原生适配。
- 当前原生运动机制包含实际屏幕 frame 读取、手势与运动序号、动画中断、完成 ACK、旧回执淘汰；React 的 CSS 动画不能替代操作系统窗口移动协议。具体在 `native/shelf-candidates/WorkShelfInteraction.swift:58–143` 与 `native-shelf-work-window.ts`。
- 系统文件承诺拖出、输入法 marked text、首次点击、菜单 responder、冻结/退出确认需要单独验收，不能以 DOM 行为近似覆盖。

建议方案：

1. 先统一 **React 内容组件与展示模型**，保持主窗口、卡片、工作窗不同容器和受限桥。
2. 保留 `WorkWindowPort` 作为窗口适配边界，Host 继续拥有库身份、成员、修订、提交和文件交付。
3. 若目标确实包括替换 B，建立一个 Electron/React 工作窗候选，与 B 比较拖动/吸附/中断、跨屏、输入法、拖入拖出、材质、最多八窗资源、草稿退出保护。
4. 根据实际比较决定是否退休 AppKit；现阶段不能断言纯 React 更流畅、更轻或已行为等价。

本次仅静态阅读指定工作区，未修改文件、联网或运行应用、模型、服务。
