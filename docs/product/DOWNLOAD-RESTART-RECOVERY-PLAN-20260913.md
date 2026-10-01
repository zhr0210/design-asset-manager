# 跨重启下载恢复方案

日期：2026-09-13。状态：**已批准，代码接线与合成验收完成**。
本次批准范围为代码、契约和合成验证；不授权Agent读取或迁移真实用户库、历史下载
或模型数据，不替换已安装应用。既有同会话续传与受检入库恢复保留。

## 问题与证据

当前重启会丢失内存任务、URI/名称绑定和续传前缀。Capture已保留部分身份与SHA，
但受管暂存的名称不等于用户指定文件名，记录中也没有完整下载来源意图。

App下载历史不能成为新的写入 authority：`download:save`使用可更新的
DownloadService.saveTask，历史字段可以改写；其记录不绑定当前Library或文件哈希。
不能仅凭历史中的`managed-<id>`恢复网络或重新写入库。

另外，当前精确schema校验、打开流程、视觉AI存储和OCR投影只识别v1/v2。
增加表后必须同步这些直接调用方，不能只提高user_version。

## 选定方案

在**持锁Active Library Control Database**中保存可信下载意图和不可变块引用；
App DB继续只负责历史展示。保留原memory模式，并显式增加library持久化模式。
不引入第二个任务数据库，不扫描任意下载文件，不把历史记录提升为已验证文件。

### 库版本与兼容

- 新建库仍为v1；v1/v2已有流程继续可用。
- 首次确认持久下载时，在当前库事务中升级至v3；先展示“旧版本应用无法打开v3”。
  取消确认不建表、不分配文件、不发请求。
- v3包含既有v2空/已有AI证据结构和两张下载日志表、索引及不可变意图触发器。
  创建空AI表不启用AI、不调用服务、不赋予素材外发权限。
- 同步精确schema、打开/重开、AI enable/read/write及OCR投影；只接受已知v1/v2/v3。
  原有热SQLite日志、异常sidecar或损坏库拒绝规则保留，不能借下载恢复自动修库。

### 文件与检查点

- 意图先提交，记录task id、Library identity、创建generation、规范URI和文件名。
  URI/名称/Library绑定不可原地改写；变更目的地应新建任务并重新确认。
- 数据按不超过1MiB的不可变块写入Library自有恢复目录。块名从task、传输轮次、
  offset和SHA生成，不接收Renderer路径。先完整写入并fsync，再事务发布块引用。
- 日志检查revision、轮次和连续offset；过期写入回滚，不能推进已提交字节数。
  未记入日志的文件不算进度，不能被猜测拼接或自动清理。
- 强ETag及identity编码才可恢复Range；版本变化则开启新轮次，旧块不参与新结果。
  缺少强验证信息时重新确认完整下载，不假装可以续传。
- 旧轮次/已完成块仍有日志引用，只清理已退役且哈希、身份匹配的文件；未知或
  不匹配文件保持现场。已有素材和外部源文件不参与该清理。
- 保留32MB单任务、三个活动任务限制；自有恢复目录预算256MiB，空间不足明确拒绝
  新持久写入，不静默丢弃承诺可恢复的任务。未提交尾部最多1MiB需重新接收。

### 重启与用户流程

1. 用户打开对应库后，按该库日志列出未完成任务；不遍历其他库或实际历史下载目录。
2. 网络未完成的任务：选择“恢复下载”，展示来源、文件名、已验证检查点和目标库；
   确认后使用新generation和当前revision继续。重启本身不发网络请求。
3. 下载已完整、Capture未完成的任务：选择“检查并恢复入库”，复用本地受检恢复，
   来源/名称来自可信意图日志，完全不依赖可改写的App历史。
4. 已完成任务仅保留历史引用；展示素材入口前核对生命周期，不复活Trash或缺失素材。
5. 关闭/切库先停止接收与收敛已开始的检查点，再释放Library lease。失败保留最后已
   提交检查点；需要SQLite自身恢复的库继续显示库级问题。

### 下载兼容接口（本次请求批准的扩展）

保留现有channel名、receipt执行和`ok/value/error` envelope：

```ts
// 旧请求仍为memory模式，不触发schema升级。
type PrepareDownload =
  | { url: string; fileName?: string; persistence?: 'memory' | 'library' }
  | { resumeTaskId: string }
```

- `prepare`可返回持久化模式、是否升级及待恢复检查点摘要；`run(receipt)`执行已审阅意图。
- `jobs`补充可选持久化/恢复来源信息；维持已有状态值，旧字段不改名。
- 当前会话的retry/cancel保持行为；跨重启网络恢复必须经过新review receipt。
  不把旧generation、旧receipt或单纯历史id视为新授权。
- Main IPC组合需要等待异步日志读取/准备，Preload调用形式仍是Promise。

## 实施范围与验收

| 范围 | 直接变化与验收 |
| --- | --- |
| Library schema/打开 | library-materialization、library-open-control-store及新增日志schema；合成v1/v2升级取消、回滚、数据/AI/Trash保留、v3重开、未知schema拒绝 |
| 任务与块存储 | managed-download及新增journal/owned-chunk模块；独占lease、提交顺序、revision冲突、哈希/链接/越界拒绝、配额与已知块释放 |
| HTTP与Capture | 复用resumable-image-transfer和owned-download-recovery；同ETag拼接、新版本隔离、跨重启本地恢复、来源元数据不丢失、不重复入库 |
| IPC/Preload/Renderer | managed-download.contract、download.ipc、Preload、download store/queue；旧请求回归、新确认、取消、不自动联网、切库后失效 |
| AI直接调用方 | visual-ai-storage与ActiveLibrary OCR投影兼容v3，既有AI结果、用户编辑和授权规则保留 |
| 退出与重启 | active-library-runtime/关闭协调器；只终止测试自建进程，验证检查点前后退出、正常重启与可正常打开控制库的中断恢复 |

不能用连接重开测试代替真实进程重启；不能用合成验证宣称真实库迁移、Windows、
打包版本或热SQLite日志修复通过。相关正式接线完成后再运行必要回归。

## 审批前的隔离验证

使用临时SQLite和生成的少量文本字节；无网络、无真实库、无生产代码接线。
通过8组协议检查：DDL回滚保留哨兵数据/版本、意图不可改写、未发布块不算进度、
已提交前缀重开可用、过期CAS原子回滚、换库/损坏拒绝、轮次隔离、入库中断保留来源。

这只证明日志方案的局部性质。当时完整v1/v2库迁移、Host lease/IPC、配额清理、真实
进程重启和Electron界面尚未验证；审批时应用只有同会话恢复；本轮正式验证结果见TASK。

- [验证脚本](/var/folders/f4/shnswpzd58bg4kx8hv46y2zw0000gn/T/dam-persistent-download-proposal-20260913-31g1gfjh/verify_journal.py)
- [验证结果](/var/folders/f4/shnswpzd58bg4kx8hv46y2zw0000gn/T/dam-persistent-download-proposal-20260913-31g1gfjh/verification.json)

## 正式实现入口

批准后已接线；[实际DDL](../../src/main/managed-download/download-journal.schema.ts)、
[日志与检查点](../../src/main/managed-download/download-journal.ts)、
[验证](../../scripts/persistent-download.test.ts)。块名在任务/轮次/offset/SHA绑定后
追加唯一后缀，避免未发布文件阻塞同一尾部重传；未发布文件仍保留并占配额。
当前结果见TASK；前文“已完成的隔离验证”保留为审批时证据，不代表本轮最终验证。
