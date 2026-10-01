# P26 全应用负载协调与故障联测（Proposed）

## 时序与预算图
用户交互/收录/下载/AI/索引
→ WorkloadAdmission（有界候选、优先级、公平份额）
→ P08原子预算（CPU线程 / RAM / 物理GPU / IO / 临时磁盘）
→ 各领域自身阶段与恢复Journal
→ Host短事务/文件发布安全点
→ 释放已证实可释放的计算预算；模型驻留另核对

| 负载 | 分阶段预算 | 权威/恢复不变 |
| --- | --- | --- |
| 下载 | 网络slots/有界byte缓冲；完成后另申请解码/磁盘 | download transfer epoch、immutable intent与Capture身份 |
| Capture/预览 | metadata探测/解码/编码/发布各阶段peak | Copy、Original ownership、Promotion journal |
| Sharp图片工具 | EXIF/rotate/raw/crop/resize中间峰值 | Variant另存新Asset，来源原件不改 |
| OCR/VLM | 预处理+驻留+compute分别持permit | P05每能力Job、P04人工保护 |
| 索引/查询 | 索引回填CPU/IO/内存；交互查询保留槽 | generation与Outbox checkpoint |
| 工作窗口 | 有界preview缓存/绘制与保存短事务 | member token、revision、设备布局 |

下载slots不能当解码slots；模型任务完成不归还驻留；UI读取资源与后台预算分开，pressure先阻止新增后台大工作。可用CPU与RAM未知保持保守等待。分阶段许可转换应先确保下一阶段预算再发布，避免持一半资源等另一半；不可中断临界段必须有预留completion budget。

## 退出一致性矩阵
入口先同步关闭admission gate并撤销新输入/外发/receipt（一个协调屏障）→标记/取消可取消工作→等待已开始短commit/文件发布收敛→保存必要状态/Outbox→关闭读句柄/窗口权限→按现有Host drain/release/close完成。P05的中断记录必须在Host仍可写时完成，禁止在quiescing普通run之后补写。
下载receiving暂停保留最后已提交块；importing不被普通abort中断；AI未提交fence拒绝，已提交保留；Index publication未ack留重投；WorkSet草稿沿既有提示，已提交layout不误报丢失。关闭失败返回recovery-required，不伪造全部成功，远端未知无需等其无限结束但授权已撤销。

## 混合场景故障报告
本轮纯规格模型验证混合预算、closing拒新任务、drain前不能close、重复效果不重复Capture；实际全应用并发报告NOT_RUN。未来T02/T07/T08/T09/T10/T11/T18/T19/T23组合：下载+Sharp+OCR+VLM+重建+浏览；依次注入pressure、满盘、模型崩溃、睡眠、取消/切库。每项核原件hash不变、Capture唯一、Overlay保持、ledger守恒、Outbox水位与正式UI恢复。
性能观察表本轮无实测值。需同机无后台/轻载/混合三个基线，比较event-loop/交互P95/RSS/swap/吞吐/取消和关闭延迟；不能保证任意外部软件始终流畅。
Proposed决定：Resource协调复用小准入接口，领域恢复保留；先逐负载阶段接入，不能用“统一队列”重写所有Journal。无默认新并发阈值，参数由P25实测评审。
