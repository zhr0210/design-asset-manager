# 素材工作台、详情与共享展示

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

共享React负责导航、选择、焦点、编辑草稿与可恢复交互；Host拥有素材/标签/分析提交。asset.store不成为第二份持久数据库或全库检索权威。原型保留视觉研究身份，不将其localStorage当生产持久化。

跨页面外壳/会话、桥安装、迟到事件和连接恢复从[GUI系统说明](gui-shell.md)进入；本专题负责素材列表/详情/专注协作，视觉仍归DESIGN，输入行为归对应交互规格。

## 正式入口与运行链

普通主入口→Library/Canvas→受控预览与有界Host列表/查询→Inspector或独立专注。选择与滚动独立于后台行刷新；详情人工编辑通过Client→Host保存再回读。单素材原生卡片是有更窄scope的独立窗口，不等于工作集B窗。

## 失败、取消与兼容保护

等待/失败保留旧可用结果和输入，旧异步应答不能覆盖新选择；切库/退出检查草稿。空库、加载失败、缺权限不是同一种空态。文本输入保持键盘语义，布局/动效/焦点按交互规格，不在模块README复制设计token。

## 技术与平台边界

Desktop与Browser共享页面；macOS工作集AppKit不由本模块渲染。1024/1440共享UI与系统窗口分别验证，正式可见入口不以直接route或注入Store代替。

## 源码与详细机制

- [src/renderer/routes/Library.tsx](../../src/renderer/routes/Library.tsx)
- [src/renderer/components/library/canvas/LibraryCanvas.tsx](../../src/renderer/components/library/canvas/LibraryCanvas.tsx)
- [src/renderer/components/library/canvas/LibraryFocus.tsx](../../src/renderer/components/library/canvas/LibraryFocus.tsx)
- [src/renderer/stores/asset.store.ts](../../src/renderer/stores/asset.store.ts)
- [src/renderer/README.md](../../src/renderer/README.md)
- [src/main/asset-card/README.md](../../src/main/asset-card/README.md)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-asset-card`
- `npm run test-asset-description-draft`
- `npm run test-app-navigation-workflow`
- `npm run test-native-open-dialog`
- `npm run test-asset-store-loading`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
