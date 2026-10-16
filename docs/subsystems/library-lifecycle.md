# 资料库与素材管理

本系统拥有持锁资料库、原件/派生角色、Copy入库、人工内容、组织关系、工作集数据以及维护恢复；不把页面Store、模型目录或窗口进程变成持久化权威。

## 按问题定位

| 问题 | 章节 | 跨系统边界 |
| --- | --- | --- |
| 开库/建库/锁/schema/维护 | [库会话](#library) | Host发起全局切库与退出 |
| 选择/拖入/剪贴板、Copy与Promotion | [素材入库](#intake) | GUI选范围，Host检查来源与文件 |
| 文件夹/标签/笔记/工作集内容与修订 | [人工内容与组织](#organization) | GUI展示，AI仅提议结果 |
| 视频引用/帧/交付副本身份 | [媒体记录](#media) | Host执行平台解码/文件交接 |
| 旧库只读找回 | [旧库](#legacy) | GUI三步确认；不能冒充Managed迁移 |

## 职责与状态权威

Main持有受检session、独占lease与事务；Original、Preview、Variant、人工内容和分析证据各有身份。设备布局和工作集内容分别保存；下列完整链保留同一Host边界，不因合并取消独立能力状态。

## 正式入口与运行链

<a id="library"></a>
### 库身份、持锁与维护

**职责与状态权威。** Active Library Host组合inspection、库身份/代际、独占lease、私有SQLite与存储角色；Main为当前选中库的唯一写入权威。App设置与旧只读库不是这个数据库的别名。

**正式入口与运行链。** 可见资料库控件发出命名open/create/close等意图；受检并持锁的session才能建立写入能力。Asset/Tag/Trash、Copy、笔记/工作集与schema维护复用同一Host。单独planner和*.tracer文件是局部验证Seam，不代表正式组合尚未存在。

**失败、取消与兼容保护。** lease丢失、库代际改变、未知维护终态、热journal/sidecar、身份/角色不符必须拒绝相应写入。切库排空真实拥有者；维护先备份/持锁/事务，再确认物理settlement，UNKNOWN不释放。旧assets:delete在活动库不能复用为绕开Trash的删除入口。

**技术与平台边界。** mac-volume与Windows local-volume adapter分别提供本地资格；Windows备份原生资源/SQLite/VFS绑定与macOS路径分别核对。历史小库上限不覆盖当前源码；inspection容量也不等于schema备份容量。

<a id="intake"></a>
### Copy入库、原件与派生

**职责与状态权威。** Host持有入库身份、存储角色与事务；Capture Gateway拥有Candidate、请求幂等与Promotion Link。Original、必要Preview、图像Variant/派生缓存分别拥有身份，Copy默认不移动外部源。

**正式入口与运行链。** 正式文件选择/拖入/剪贴板或图片工具→受控prepare→精确review receipt确认→分项Copy/校验/必要预览→事务Promotion→Host回读/事件→素材工作台。prepare只读，不建立候选或写出文件；Renderer不选择任意目标路径或分配Asset身份。

**失败、取消与兼容保护。** 签名/格式、长度、SHA、symlink/containment、no-replace发布和来源代际在适用边界复查。幂等重放返回已知提交；取消未开始项，已提交项保留。旧下载表只兼容既有schema，不恢复素材下载执行器；源失败与恢复资格不能用预览替代。

**技术与平台边界。** 图片使用受控Sharp/libvips适配。平台文件身份/句柄/原子发布独立验证，格式和视频由实际消费者决定；递归目录/额外格式不能从一个Copy成功推定支持。

<a id="organization"></a>
### 人工内容、组织与工作集数据

**职责与状态权威。** 普通文件夹/色板/笔记/工作集保存在持锁Library，引用既有Asset，不移动原件。人工标签、编辑描述/OCR与AI证据分开；确认建议是人工决定，不是简单拷贝AI历史。

**正式入口与运行链。** 工作台/详情/笔记/工作集控件→共享命名Client→当前库session→修订/成员检查→事务写入→回读与跨端通知。笔记有页/标注内容，工作集内容与设备窗口布局分开。schema首次升级走Host维护与备份，旧数据保留。

**失败、取消与兼容保护。** 人工编辑优先，确认/拒绝与执行结果各有身份。冲突保留输入并显式恢复，A→B→A不能复活旧review；删除集合/成员不删除原素材。没有当前标签结果时不得用历史合并标签冒充，空内容与未执行分开。

**技术与平台边界。** 产品Client两端共享，原生卡片/工作窗只可编辑当前获授成员。未来Custom Field长尾、批量迁移/undo等目标独立规范，不从现有标签/笔记推出已交付。

<a id="media"></a>
### 媒体记录与存储角色

Host拥有视频引用、时间/帧/来源记录及独立交付副本；原件、首帧预览、参考帧和兼容导出分开。移除工作集关系不删除视频或交付副本。

解码/媒体权限读取、跨应用交付和清理终态按[Host系统交接](local-host.md#handoff)，不是GUI拖动结束就删除副本。

<a id="legacy"></a>
### 旧库找回与恢复范围

旧DAM库通过独立只读工作区找回，不强行转换为Managed。App profile拥有恢复草稿，Library拥有明确提交的业务内容；收到恢复草稿须明确采用/丢弃，不能自动覆盖当前输入。路径偏好不切换或迁移活动库；Host配置/迁移见[配置维护](local-host.md#configuration)。旧库三步选择、预览/空/失败用户行为见[统一交互](../design/INTERACTIONS.md#legacy)，实现见[旧库README](../../src/main/legacy-readonly-workspace/README.md)。

## 失败、取消与兼容保护

各阶段分别执行来源/格式/身份/修订与提交检查；未知终态不冒充空值或释放许可，人工修改优先，重跑/迁移失败保留旧有效数据。原件、旧只读库与恢复副本分别验证，不以GUI表现或通知替代事务/回读。具体例外见上述章节。

## 技术与平台边界

存储身份/SQLite/备份/文件发布依实际平台与完整候选核对，不能互拷ABI或用一格式/样本推定全部支持。受管默认Copy，未来长尾能力不自动入队列。

## 源码与详细机制

- [src/main/active-library-runtime.ts](../../src/main/active-library-runtime.ts)
- [src/main/library-lifecycle/active-library-host.ts](../../src/main/library-lifecycle/active-library-host.ts)
- [src/main/library-lifecycle/active-library-session.ts](../../src/main/library-lifecycle/active-library-session.ts)
- [src/main/ipc/active-library.ipc.ts](../../src/main/ipc/active-library.ipc.ts)
- [src/main/library-lifecycle/production-active-library-dependencies.ts](../../src/main/library-lifecycle/production-active-library-dependencies.ts)
- [src/main/library-lifecycle/README.md](../../src/main/library-lifecycle/README.md)
- [src/main/library-lifecycle/LIBRARY-START.md](../../src/main/library-lifecycle/LIBRARY-START.md)
- `npm run test-active-library-session`
- `npm run test-active-library-tags`
- `npm run test-active-library-capture-composition`
- `npm run test-asset-trash-lifecycle`
- `npm run test-asset-trash-sqlite-persistence`
- [src/main/capture-intake/README.md](../../src/main/capture-intake/README.md)
- [src/main/capture-intake/add-assets.workflow.ts](../../src/main/capture-intake/add-assets.workflow.ts)
- [src/main/capture-intake/capture-gateway.ts](../../src/main/capture-intake/capture-gateway.ts)
- [src/main/library-lifecycle/owned-image-intake.ts](../../src/main/library-lifecycle/owned-image-intake.ts)
- [src/main/library-lifecycle/owned-image-recovery.ts](../../src/main/library-lifecycle/owned-image-recovery.ts)
- [src/main/image-tools/README.md](../../src/main/image-tools/README.md)
- `npm run test-asset-authority-baseline`
- `npm run test-intake-recovery`
- `npm run test-capture-intake-workflow`
- [src/main/library-lifecycle/library-organization.ts](../../src/main/library-lifecycle/library-organization.ts)
- [src/main/library-lifecycle/asset-notebook.ts](../../src/main/library-lifecycle/asset-notebook.ts)
- [src/main/library-lifecycle/work-sets.ts](../../src/main/library-lifecycle/work-sets.ts)
- [src/main/library-lifecycle/active-library-tag-metadata.ts](../../src/main/library-lifecycle/active-library-tag-metadata.ts)
- [src/main/independent-tags/README.md](../../src/main/independent-tags/README.md)
- [src/shared/client/workspace-client.ts](../../src/shared/client/workspace-client.ts)
- `npm run test-asset-card`
- `npm run test-asset-description-draft`
- `npm run test-app-navigation-workflow`
- `npm run test-native-open-dialog`
- `npm run test-asset-store-loading`

媒体源码：[work-media-storage](../../src/main/work-mode/work-media-storage.ts)，[媒体控制器](../../src/main/work-mode/work-media-controller.ts)。

## 验证与维护

按当前阶段/影响选测试，应用普通入口、保存重开/错误/取消、原件与人工数据保护分别证明；命令入口package.json。运行身份/缺口归CURRENT-STATE，证据归任务报告；架构与局部接口有变化同步所属README。
