# 资料库、持锁与维护

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Active Library Host组合inspection、库身份/代际、独占lease、私有SQLite与存储角色；Main为当前选中库的唯一写入权威。App设置与旧只读库不是这个数据库的别名。

## 正式入口与运行链

可见资料库控件发出命名open/create/close等意图；受检并持锁的session才能建立写入能力。Asset/Tag/Trash、Copy、笔记/工作集与schema维护复用同一Host。单独planner和*.tracer文件是局部验证Seam，不代表正式组合尚未存在。

## 失败、取消与兼容保护

lease丢失、库代际改变、未知维护终态、热journal/sidecar、身份/角色不符必须拒绝相应写入。切库排空真实拥有者；维护先备份/持锁/事务，再确认物理settlement，UNKNOWN不释放。旧assets:delete在活动库不能复用为绕开Trash的删除入口。

## 技术与平台边界

mac-volume与Windows local-volume adapter分别提供本地资格；Windows备份原生资源/SQLite/VFS绑定与macOS路径分别核对。历史小库上限不覆盖当前源码；inspection容量也不等于schema备份容量。

## 源码与详细机制

- [src/main/active-library-runtime.ts](../../src/main/active-library-runtime.ts)
- [src/main/library-lifecycle/active-library-host.ts](../../src/main/library-lifecycle/active-library-host.ts)
- [src/main/library-lifecycle/active-library-session.ts](../../src/main/library-lifecycle/active-library-session.ts)
- [src/main/ipc/active-library.ipc.ts](../../src/main/ipc/active-library.ipc.ts)
- [src/main/library-lifecycle/production-active-library-dependencies.ts](../../src/main/library-lifecycle/production-active-library-dependencies.ts)
- [src/main/library-lifecycle/README.md](../../src/main/library-lifecycle/README.md)
- [src/main/library-lifecycle/LIBRARY-START.md](../../src/main/library-lifecycle/LIBRARY-START.md)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-active-library-session`
- `npm run test-active-library-tags`
- `npm run test-active-library-capture-composition`
- `npm run test-asset-trash-lifecycle`
- `npm run test-asset-trash-sqlite-persistence`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
