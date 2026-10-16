# 应用Host与系统集成

本系统拥有可信进程、会话/命名通信、应用配置与关闭/退出、原生系统能力和跨应用文件交接。界面只表达意图；Library拥有持久业务内容，AI拥有执行编排，搜索拥有查询/索引。构建签名与发行流程见[开发交付指南](../platform/BUILD-AND-RELEASE.md)，不属于本运行系统。

## 按问题定位

| 问题 | 章节 | 协作方 |
| --- | --- | --- |
| 双端启动、角色与退出 | [进程与客户端](#clients) | [GUI](gui-shell.md) |
| 设置持久化、路径迁移、恢复协作 | [配置维护](#configuration) | [GUI设置](gui-shell.md#settings-ui)、[Library](library-lifecycle.md) |
| 视频helper、媒体读取、拖出/ZIP/接收 | [系统交接](#handoff) | [Library媒体](library-lifecycle.md#media)、GUI原生窗口 |

## 职责与状态权威

每个明确profile一个Host，应用配置/凭据/恢复归profile，业务内容归持锁Library。权限/角色/代际与真实资源生命周期不会因文档合并下放到Renderer或原生子进程。

## 正式入口与运行链

<a id="clients"></a>
### 进程、双客户端与生命周期

**职责与状态权威。** 同一明确profile的Electron Local Host拥有文件、SQLite、账号和执行。Desktop通过Preload/IPC，Browser通过本机HTTP/SSE进入同一命名业务处理器；两端共享React，关闭界面和退出Host不是同一动作。

页面/窗口组成、Client安装、连接校准与外壳参与退出的跨层链见[GUI系统说明](gui-shell.md)；本专题继续拥有Host生命周期/权限与传输边界，不把视觉规范搬进来。

**正式入口与运行链。** 普通start:desktop打开桌面，start:browser启动/连接同Host并打开一次性入口；既有会话校验后注册客户端和草稿参与者。业务从WorkspaceClient到Main注册，再到各领域拥有者。切库/退出由transition冻结、收集草稿、排空再撤权，页面不能单独判全局无未保存内容。

**失败、取消与兼容保护。** Origin/Host/CSRF、角色、文档身份和撤权均保留；unknown提交不自动重发。断连先拒绝写入，权威重读和UI校准后恢复。失败/未知flush保留草稿与窗口；通知失败不撤销已提交结果。浏览器不是任意路径/SQL/命令入口。

**技术与平台边界。** Electron负责平台生命周期/系统对话框。Browser UI结果不证明macOS/Windows窗口、钥匙串、安装器或拖放；profile仅是归属，不授予Agent读取秘密配置。

<a id="configuration"></a>
### 应用配置、路径与恢复协作

**职责与状态权威。** 全窗口/settings承载全局配置、AI与模型、维护和恢复；主页素材导航不在设置上方继续显示。profile设置/草稿归App，当前库内容归Library。旧DAM库通过独立只读工作区找回，不强行转换为Managed。

**正式入口与运行链。** 普通设置入口→分类页/表单→命名Client→可信Main→修订检查/原子保存→双端回读。路径迁移先plan/审查再执行，配置与实际库身份分别核对。收到的恢复草稿需显式采用/丢弃，不自动覆盖用户当前输入。

**失败、取消与兼容保护。** 分类转场保留未保存输入；旧响应/旧文档writer不覆盖新状态。未知提交显示固定指导并权威回读，不建议盲重发。选择器取消无副作用；退出/切库核对所有参与者，后台计数/空态不能掩盖真正错误。

**技术与平台边界。** 系统选择器、权限、路径根/链接和迁移适配按OS验证；Browser不能得到任意本机路径/命令。诊断输出非敏感摘要，不读完整配置、保险库、环境或内存转储。

设置的具体分类/外观/导航状态归[GUI](gui-shell.md#settings-ui)及[统一交互](../design/INTERACTIONS.md#workspace-应用页面导航)。移动数据/改路径不是单纯GUI布局任务，仍须Host计划/审查和Library身份验证。

<a id="handoff"></a>
### 平台媒体与文件交付

正式Copy/工作集→视频controller→平台解码helper与共享准入→保存请求/实际时间及完整PNG→限定媒体GET/HEAD/range；交付动作→验证当前成员/来源→生成独立副本或ZIP→系统拖放/默认应用→核对接收。

不以首帧冒充整段分析；范围请求在权限之后，非法/多range拒绝。交付不移动/覆盖第三方源，不以open-requested或拖动结束证明接收成功。取消保留已完成项，未确认helper退出保持占用；清理按显式归属和真实接收检查。

macOS AVFoundation与Windows Media Foundation是不同helper/资源绑定；只按已支持codec/旋转/大小/时长/分辨率接受。记录requested/actual时间，不为Mac写Windows方法标签；文件承诺来源数量未知时保持未确认。

媒体身份、参考帧与存储角色见[Library媒体记录](library-lifecycle.md#media)；窗口拖动/呈现见[GUI](gui-shell.md#reference-windows)。系统open请求、拖动结束与接收应用已取得文件各自证明。

## 失败、取消与兼容保护

失效会话、错误角色/代际、断连/unknown提交、未确认flush与helper退出各拒绝其依赖操作；不得通过统一入口减少原来的权限、幂等、事务或进程收尾保证。分支具体约束在上述拥有者章节。

## 技术与平台边界

Electron/本机HTTP与Preload进入相同命名业务处理器，平台系统接口按实际OS验证；macOS原生和Windows资格不互代，Browser也不是任意SQL/文件/终端入口。

## 源码与详细机制

- [src/main/index.ts](../../src/main/index.ts)
- [src/main/local-host/README.md](../../src/main/local-host/README.md)
- [src/main/local-host/local-dam-server.ts](../../src/main/local-host/local-dam-server.ts)
- [src/main/local-host/workspace-transitions.ts](../../src/main/local-host/workspace-transitions.ts)
- [src/shared/client/workspace-client.ts](../../src/shared/client/workspace-client.ts)
- [src/preload/index.ts](../../src/preload/index.ts)
- [src/renderer/App.tsx](../../src/renderer/App.tsx)
- `npm run test-desktop-viewport-policy`
- `npm run test-app-navigation-workflow`
- `npm run test-electron-main-lifecycle-policy`
- `npm run test-work-frame-provenance`
- `npm run test-file-selection-bulk-ui`
- [src/renderer/routes/Settings.tsx](../../src/renderer/routes/Settings.tsx)
- [src/main/services/settings.service.ts](../../src/main/services/settings.service.ts)
- [src/main/ipc/settings.ipc.ts](../../src/main/ipc/settings.ipc.ts)
- [src/main/path-migration/path-migration-executor.ts](../../src/main/path-migration/path-migration-executor.ts)
- [src/main/local-host/workspace-drafts.ts](../../src/main/local-host/workspace-drafts.ts)
- [src/main/legacy-readonly-workspace/README.md](../../src/main/legacy-readonly-workspace/README.md)
- `npm run test-ai-backend-restoration`
- `npm run test-settings-compatibility`
- `npm run test-settings-migration`
- `npm run test-path-governance-docs`
- `node scripts/run-ts-test.mjs scripts/settings-service-defaults.test.ts`
- [src/main/work-mode/work-media-controller.ts](../../src/main/work-mode/work-media-controller.ts)
- [src/main/work-mode/work-media-storage.ts](../../src/main/work-mode/work-media-storage.ts)
- [src/main/work-mode/work-file-handoff.ts](../../src/main/work-mode/work-file-handoff.ts)
- [src/main/work-mode/macos-video-runtime.ts](../../src/main/work-mode/macos-video-runtime.ts)
- [src/main/work-mode/windows-video-runtime.ts](../../src/main/work-mode/windows-video-runtime.ts)
- [src/main/work-mode/media-response.ts](../../src/main/work-mode/media-response.ts)

## 验证与维护

按受影响通信/配置/退出/交付场景选择上述测试；实际命令以package.json为准，执行与结果分开。运行状态归CURRENT-STATE，权限/系统动作须实际端证明；[开发规范](../code-standards.md)规定审查保证，[真实验收](../agents/ui-ux-acceptance.md)规定产品证据。
