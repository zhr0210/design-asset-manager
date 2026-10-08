# WC01 Windows 备份源与恢复续批

2026-10-04；用户批准续接上一批建议。本批仍在 WC01，使用自有合成目录、临时真实 SQLite 与独立候选；当前验证与终态签收进行中。

## 实际源码差异与调整

生产 `tag-intent-backup.ts` 仍只接受已资格验证的 Darwin/APFS/native 组合。Windows 的成功 tracer 不替代该组合；本批保持生产模块原始字节，不改变公共 IPC、schema 或 journal 语义。

当前 journal 只有 settled/pending/ambiguous，没有备份摘要或源提交标记。不能把 `finished=true` 当独立提交证明。恢复检查因此只核对 captured operation 与完整文件内容，并明确返回 sourceCommit=unproven、restoreAllowed=false。

当前 helper 原为每次 PowerShell Add-Type 编译；编译开始早于 Run，没有完整资源硬限。现用已安装 Framework64 csc 在显式测试准备阶段编译，运行阶段源码/产物漂移或未准备即拒绝；不在已获得 backup permit 后启动编译器。

## before / after

| 项目 | before | after 与限制 |
| --- | --- | --- |
| helper | 固定 256 MiB reserve，未证明峰值 | launcher 在现有父 Job 下建立受限 Job，然后 suspended 创建 target；确认继承 Job 后才 resume。每进程 128 MiB、合计 private commit 256 MiB；target 真正退出后用 retained process handle 读 kernel 完整峰值。OOM 实际到达硬限且零备份写入。launcher CLR 启动前段及 receipt 后终态 RSS 仍未完整证明；不是全链生产资格 |
| source | 只有 connection serialize hash/schema 重验 | source 文件逐组件 no-reparse 打开、单 link、保留拒绝 delete 的同句柄；读取 VolumeSerial/FileIndex/size/creation/write/full SHA；所有64位值用 decimal string 严格检查类型/uint64。NTFS及空间从 retained handle 查询；connection main/file、DELETE、页数/page_size/data_version/schema、完整 image 在准备与 DDL 前核对 |
| space | 私有 integration 未测完整 policy | 复用现有 backup/journal/growth/64 MiB reserve policy，native source PINNED 后检查 beforeBackup，HELD 后再次读取同卷 available 并检查 beforeDdl；UNKNOWN/不足拒绝，未删除备份制造通过 |
| restart | 只拒绝重复 operation，内容 retrieval 不读状态 | immutable binding 绑定 operation/library/lineage/controlStore/generation、source/connection/image；backing/verified/finished 各绑定完整 binding SHA 与 image SHA。重启以 retained no-reparse/read-only handles 核对 bounded status/content，拒绝篡改/reparse，不写恢复状态 |
| recovery | Main 声明容易被误解 | interrupted / cancelled / commit-claimed 分类；canonical 文本、精确键/类型、重复键/超界均拒绝；即使全部文件一致，仍不证明源事务提交、不授予 restore 或写权限 |
| production | Windows 在备份/status/DDL 前拒绝 | 继续明确拒绝；普通支持的素材与手工写入不因 tracer 变更而被收回 |

源 pin 在已有 connection serialize 后建立；PINNED 时核对原 image、当前 connection image 与完整源文件 bytes，随后一直保有源句柄到 finish/close。它尚未证明 SQLite VFS 的底层句柄就是被 pin 的 file identity，不能宣称全生产 TOCTOU 闭合。未知文件系统、同步盘与网络盘也未获得资格。

## 文件、验证与身份

实际文件清单、before/after SHA、仅本批 raw patch 在本机 `.scratch/windows-backup-recovery-20261004/file-scope.json`、`before/`、`after/`、`incremental-review.diff`。新建私有 source/recovery 模块与测试，native fixture/harness/helper、两条 integration 及最近 README/协议/当前投影同步；原 index/WIP/root generated 保留。

适用测试、Computer Use、两轴独立复核、candidate/build/runtime 与最终 STOP 锚点由本批终态签收补入本节；未完成前不借旧 PASS。

## 尚缺与下一批建议

1. 完整 launcher 从启动到退出的 RSS/commit/resource 资格，以及正式可分发 helper artifact 身份与安全启动。
2. 实际 SQLite VFS 源句柄身份与 retained source file 的绑定；在 serialize 前进入该完整保护链路。
3. 在真实事务内绑定 operation/snapshot 的提交事实，并定义有可信外部 expected binding 的恢复检查；公共语义如需改变，须明确方案与范围。不得自动 restore/delete/downgrade。
4. 完成正式 Adapter/composition、原正向升级/fault-cut 真触达、本候选业务 CU 后才讨论生产门开启；真实库/模型/账号/安装包/macOS 保持 NOT_RUN。

Router BUDGET_UNSATISFIABLE、原 admission 的旧 codec 前提断言、原生产升级被平台门拒绝及历史底部菜单裁切分别保留队列，不扩成本批修复。
