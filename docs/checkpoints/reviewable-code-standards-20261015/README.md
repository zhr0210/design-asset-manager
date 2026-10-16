# 开发规范可审查化：2026-10-15

用户确认按工程保证、适用场景、审查动作、证据入口改写；补齐已有失败、回归扩大、并发/时序和交付证据。原Host/原件/人工内容/事务/真实验收/模型限制/工程自主权与文档职责须保全。

baseline.json及before保存四文件本轮前字节，不把既有WIP算本任务。criteria.json在改写和派发前保存独立判据；具体轨迹、三层评分、候选身份及局限在本目录记录。

本轮只是文档，不修改源码、依赖或产品资格，不进行真实UI/模型/安装/发布验收；原文中链接的测试是证据入口，不声明本轮已经运行。原十个稳定锚点保留，DESIGN仍是视觉唯一权威，CONTRIBUTING仍拥有维护和行为验收方法。

## 保全与适配

[逐组保全映射](preservation-map.json)核对原十节的保证、扩展动作和未照搬内容；before/docs/code-standards.md留原字节，changes.diff仅相对本轮基线，不含他人WIP。只补当前项目可执行的检查与来源，不编造新事故或已跑测试。Magpie固定版本/MIT原文已有研究快照，规范尾部保留来源，快照不改写。

新增：已有失败/单跑与全套差异的归因和本地责任记录；共享契约/样式/断点/Runtime/打包改动扩大回归表；取消/超时/锁队列/迟到事件的可控反证；候选/本地提交/管道退出/实际安装发布证据。所有项目命令仍按package.json，按风险选范围；不是每次强制跑全产品。

## 行为验收结果

四个全新低思考上下文只收到dispatch.json中的短任务、工作区和只读边界，没有文件路径、查阅顺序或答案提示。主Agent核对实际工具返回与最终应用，四项在本次计划范围通过，详见[evaluation.json](evaluation.json)、[会话身份](probe-sessions.json)及各trace.json（无隐藏推理）：

- [共享Client与断点](standards_shared.response.md)：补全部受影响消费者/夹具、相关UI与正式路径，不仅本页。
- [主分支/全套失败](standards_baseline.response.md)：拒绝旧失败豁免、要求归因与相关资格保留；无关问题本地记录。
- [Worker取消/超时](standards_async.response.md)：可控延迟/乱序、UNKNOWN、旧launch、物理退出、权限和测试收尾。
- [安装交付](standards_delivery.response.md)：候选/实际平台/安装分列，主Agent对照发行源码核验清单依据；具体内部候选与分发目标仍须明确。

阅读效率并非全部理想：部分批量输出截断、一个猜测不存在专题路径；必要条款实际可见或后续定向补齐，缺具体diff/Worker/产物的场景不伪造执行事实。无需修改本候选或挑成功重跑；所有尝试保留。本次未进行真实故障修改/安装演练，不保证所有未来任务稳定。

[candidate-integrity.json](candidate-integrity.json)确认2632份候选文本与本地正文无漂移；TASK/检查点排除，可收尾更新。结构/链接、上下文/ADR索引和显式四文件同步检查见[checks.json](checks.json)。本轮目标完成，未提交、推送或发布。
