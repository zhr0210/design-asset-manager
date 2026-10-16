# 应用、双客户端与生命周期

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

同一明确profile的Electron Local Host拥有文件、SQLite、账号和执行。Desktop通过Preload/IPC，Browser通过本机HTTP/SSE进入同一命名业务处理器；两端共享React，关闭界面和退出Host不是同一动作。

页面/窗口组成、Client安装、连接校准与外壳参与退出的跨层链见[GUI系统说明](gui-shell.md)；本专题继续拥有Host生命周期/权限与传输边界，不把视觉规范搬进来。

## 正式入口与运行链

普通start:desktop打开桌面，start:browser启动/连接同Host并打开一次性入口；既有会话校验后注册客户端和草稿参与者。业务从WorkspaceClient到Main注册，再到各领域拥有者。切库/退出由transition冻结、收集草稿、排空再撤权，页面不能单独判全局无未保存内容。

## 失败、取消与兼容保护

Origin/Host/CSRF、角色、文档身份和撤权均保留；unknown提交不自动重发。断连先拒绝写入，权威重读和UI校准后恢复。失败/未知flush保留草稿与窗口；通知失败不撤销已提交结果。浏览器不是任意路径/SQL/命令入口。

## 技术与平台边界

Electron负责平台生命周期/系统对话框。Browser UI结果不证明macOS/Windows窗口、钥匙串、安装器或拖放；profile仅是归属，不授予Agent读取秘密配置。

## 源码与详细机制

- [src/main/index.ts](../../src/main/index.ts)
- [src/main/local-host/README.md](../../src/main/local-host/README.md)
- [src/main/local-host/local-dam-server.ts](../../src/main/local-host/local-dam-server.ts)
- [src/main/local-host/workspace-transitions.ts](../../src/main/local-host/workspace-transitions.ts)
- [src/shared/client/workspace-client.ts](../../src/shared/client/workspace-client.ts)
- [src/preload/index.ts](../../src/preload/index.ts)
- [src/renderer/App.tsx](../../src/renderer/App.tsx)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-desktop-viewport-policy`
- `npm run test-app-navigation-workflow`
- `npm run test-electron-main-lifecycle-policy`
- `npm run test-work-frame-provenance`
- `npm run test-file-selection-bulk-ui`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
