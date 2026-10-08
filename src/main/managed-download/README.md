# Managed image download

下载页与网页采集触发器使用 `prepare → review → run`。Main持有五分钟单次
receipt，绑定明确的HTTP(S)地址与当前Library identity/generation。确认后才
GET，无Cookie、凭据或重定向；支持直连PNG/JPEG/WebP，最多32MB、三个活动任务。
成功仅在完整字节校验、Capture Promotion及元数据写入后报告。导入由held
Active Library connection执行，App DB只保存历史。

## 默认内存模式的同会话续传

`resumable-image-transfer.ts` 只负责一个固定URL的有界字节传输，不拥有数据库
或Library权限。取消/网络中断后，只有identity编码与强ETag的连续前缀才保留。
用户在同一Library generation中明确重试时发送Range和If-Range，检查206的
ETag、Content-Range起点/总长、Content-Length和编码后才拼接。合法子分段可以
继续请求，每次操作最多16次响应；超出后保留可验证前缀，等待用户再次重试。

服务器返回200时替换旧前缀；416、错误范围、版本或编码不一致时最多回退一次
完整下载。弱/缺失ETag和编码不明确的部分数据不用于续传。响应超限、超出声明
范围、空内容或未接收完整的数据不能送入Capture。每次操作仍有120秒超时。

memory请求不改变schema，重试沿用同一task identity并记录实际retry_count。
运行中的任务不能重复重试，终态不能再取消，importing期间等待事务链完成。
暂停前缀总量最多64MiB，超限释放较早的前缀；活动任务各自仍受32MB上限约束。
前缀仅存在内存，切库/关库/退出释放，不承诺跨重启续传。它不是已入库素材。

协议依据：[RFC 9110 If-Range](https://www.rfc-editor.org/rfc/rfc9110.html#name-if-range)
及 [Combining Parts](https://www.rfc-editor.org/rfc/rfc9110.html#name-combining-parts)。
对缺失响应ETag或未知范围总长采取重新下载，是本实现的保守兼容策略。

## Capture 与界面

确定性Capture身份防止重复Promotion。已受理后的异常保持recovery-required，
普通传输重试不会重新下载来掩盖部分事务。用户选择“检查并恢复入库”并确认后，
同一retry接口转入Main内部recoverDownloadedImage；只使用当前会话任务的已知
身份、文件名、来源与Library generation，不发HTTP、不接受Renderer文件路径。

`owned-download-recovery.ts`核对持久Capture各身份、SHA、尺寸、库归属及目标冲突。
使用匹配的库内暂存；暂存缺失时，仅可从已核验的已发布原件重建。未发布原件
从核验后的冻结字节发布；已存在原件仅复核，不覆盖。显式恢复模式补齐Activation、
Preview、Promotion或元数据收尾；普通Copy Plan replay仍只返回快照。

恢复预览使用确定性身份，只复用匹配字节，失败重试不无限产生新恢复预览。
已完成的素材保持幂等及用户描述/标签/名称编辑；回收站、其他库、缺失或冲突
记录/文件继续拒绝。不匹配现场保留，不做未知孤立文件清理。无法清理的已确认
暂存也保留，不能把已提交素材报告为失败。

`download:prepare/enqueue/jobs/retry/cancel` 保持 `{ok,value|error}` envelope。
enqueue只接受review receipt；list/save/clear保留历史CRUD语义。重启历史仍
不能证明文件或素材存在，历史URL不作为缩略图发起自动请求。成功后通知只刷新匹配的当前库。
Renderer忽略陈旧状态轮询与旧下载review响应；取消review后晚到响应不重新
打开确认。读取失败保留既有结果并给出错误，不伪装成空列表或成功。

## 显式持久化与重启恢复

下载页可选择在当前库保留恢复检查点。`prepare({url,fileName?,persistence:'library'})`
只准备确认；首次`run(receipt)`在一个事务内创建可信意图并将v1/v2升级为v3；已确认图片副本保存的v4库保持v4。
确认明确提示旧版本无法打开v3；默认请求仍为memory，新库仍为v1。
v3保留v2 AI表和已有证据，不启用AI，也不赋予外发授权。

`download-journal.ts`仅由Host在独占lease内串行调用；意图URI、文件名、库和
创建generation不可改写。网络小块合并为不超过1MiB的检查点，取消最多丢弃1MiB未提交尾部。独占创建、
fsync文件与目录后，再用
revision/epoch/offset CAS发布引用。块名含任务/轮次/offset/SHA绑定及唯一后缀，
日志提交失败的文件保留，不阻塞重新接收同一尾部。未知文件不被猜测拼入或清理。
恢复目录最多256MiB，未知普通文件也计入配额；空间不足明确拒绝写入，不驱逐
已承诺的恢复任务。旧轮次/已完成块仅按日志引用与受检哈希、文件身份释放。

重新打开同一库后，`jobs`发现未完成意图但不联网。`prepare({resumeTaskId})`
重新核验连续块和哈希，创建绑定当前控制会话及revision的单次确认；`run`再次
核对revision。网络恢复仍执行相同ETag/Range校验，版本变动开启新epoch。
完整下载的摘要在Capture前提交；跨重启本地恢复使用日志中的URI/名称和受检字节，
已有Capture通过受检恢复补齐，没有Capture才开始首次入库。回收站不复活。
持久任务使用新review，旧memory任务的retry与确认流程保持。

关闭/切库/退出先使review失效并停止接收，等待已开始的检查点/入库链收敛，再释放
Library lease。允许正常打开的库可恢复最后已提交检查点；热SQLite日志、未知schema
和损坏库仍按原规则拒绝，不自动修库。App下载历史始终不是恢复授权。

## 验证

- `test-persistent-download`：真实v1/v2 schema事务回滚，两个独立进程间发现、
  新确认、精确Range续传/版本切换、本地首次/部分Capture恢复；覆盖不可变意图、
  CAS、未发布尾部、损坏/链接、配额、退役块清理、过期review及Trash拒绝。
- `test-managed-download-resume`：loopback实际HTTP与确定性内存响应，覆盖连续
  字节拼接、合法子分段、版本变化、弱ETag、错误范围/编码、长度/大小、取消、
  单次任务、切库以及64MiB保留预算；没有联系测试中的fixture.invalid地址。
- `test-visual-ai-download-integration`：临时库与生成图片，新增真实Capture
  Activation故障后保持recovery-required；显式恢复不再请求HTTP，成功只新增一次素材。
- `test-owned-download-recovery`：发布前、Activation、Preview、Promotion和元数据
  收尾故障，覆盖重试幂等、预览复用、编辑保留、哈希/链接/缺失/冲突、库与Trash边界。
- `test-download-store-integrity`：历史只读及状态/review乱序、失败与取消。
- `test-persistent-download-electron-e2e`：真实Main/Renderer重启，发现1MiB检查点，
  取消确认不联网，确认后只发一次匹配Range请求并入库；正常关闭收敛通过。
- `test-active-library-electron-e2e`：正式Preload/Renderer取消、精确Range续传、
  真实Capture入库、v3升级/AI保留、真实应用重启、恢复确认取消/执行、HTTP次数及来源SHA后置条件。实际结果见TASK。

以上不代表真实站点、登录资源、任意历史Capture、热日志/损坏库修复、断电持久性或Windows/打包验证。

## 显式放弃和空间释放

`prepare({abandonTaskId})`显示登记字节数和影响；`run(receipt)`核对revision后
退役未完成下载并只释放受检匹配的登记块。准备/取消确认不删，已放弃任务不能续传。
已有未完成Capture的任务拒绝放弃，须先恢复入库。完成素材、原件和未知文件不删。
无法核验/释放的引用继续保留并报告，用户可以重新确认“检查并释放保留数据”。

日志兼容v3/v4；v4副本意图不会开启网络。`test-download-space-management`与
`test-intake-recovery-electron-e2e`验证释放范围、取消、CAS、冲突保留/重试和重开。
见[完整边界](../../../docs/product/INTAKE-RECOVERY-SPACE-MANAGEMENT-20260913.md)。
