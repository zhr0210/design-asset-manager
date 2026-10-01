# B01 后台基础分析意图与准入基础层

用户批准进入“后台基础分析与资源调度”新轮。现有实际能力只有手动tags/combined/OCR；旧Worker/GPU IPC禁用，没有自动执行所有权、资源执行包络及独立caption写入路径。本轮完整范围是**可落库/可见/可暂停恢复/可解释等待的基础层**，不把未知资格的手动路径改成自动调用。默认能力tags/caption/ocr来自最新已确认需求，Embedding显式另启用、reverse手动；不重开旧C01–C07队列。

## 精确schema12提案（仅生成临时库验证）

已核实当前最高11。新增3表：background_analysis_policy(单行enabled/revision)，background_analysis_capabilities(固定tags/caption/ocr及enabled)，background_analysis_intents(随机opaque id、asset id、capture source_generation、preview_generation_identity、capability、固定recipeVersion、用户decision、revision、createdAt)。意图不含模型/provider/路径/图像/credential，不是job或结果。

Intent唯一键为asset+真实Capture source_generation+preview_generation_identity+capability+recipe，禁止更新身份。新增一个AFTER INSERT ON asset_lifecycle触发器：仅registered/active且policy enabled时，从已有promotion_links/candidate/capture_request取source tuple，对启用capabilities各插一行。真实Promotion事务先创建asset/candidate/link再插lifecycle，因此原子记录3条未来意图；重复回放不重复。等待能力/模型不阻塞Promotion，触发器只作固定至多3行元数据SQL。磁盘/事务真实失败仍回滚本次Promotion，不伪装成功。

触发器不在启用配置时遍历历史库、不在open/rename/选择/模型变动/Trash restore时建立新意图。现Managed Copy没有真实源内容替换入口，本轮只检测tuple变化并投影superseded，不假造更新事件。lifecycle.revision不是内容generation，Trash/restore不得因此新建任务；暂停/取消decision保持。

新库仍1。第一次明确保存配置review披露备份/停止在途视觉任务/启用12/旧版拒开；调用既有受核验备份/空间/4MiB增长上限，在Host持实际lease的维护lane完成历史DDL+v12+配置。若原profile<10，需要先种子现有current，统一旧tags writer；不丢已有成功结果。旧11 reader拒12，新12保留tags/combined/决定/恢复/OCR存储/笔记/组织/工作集/下载。已知版本/精确schema签名直接消费者全部同步。

开启主开关前默认disabled，三cap toggle默认true。主开关/单cap关闭只投影policy-paused，不覆盖用户逐项pause/cancel。resume只能解除user-paused，不把cancel复活。配置及逐项决定使用session+policy/intent revision CAS；card不可修改全库策略或读其他asset/global aggregate。

## 资源与自动执行资格

Main采样器仅使用已有Electron powerMonitor与os：单调时钟、free/total memory、onBattery、thermal、system idle、主窗可见性。无对应API/不支持/过期一律unknown；不伪造GPU VRAM或低电量模式。纯政策输入为资格包络+遥测，不分配材料或启动进程；总RAM安全余量max(512MiB,10%)是本政策保守门槛，不是模型实际峰值。要求现成host-owned且校准有效的执行包络，GPU另需GPU证据；unknown不能放行。实际生产绑定当前明确not-integrated，因此三cap保持等待自动执行适配器，并同时显示资源未知/交互/电源等原因。正向policy测试只证明决策函数，不称实际推理路径。

该层不宣称统一了OCR/Visual的物理资源，也不声称整机预算、自适应idle加速或后台scheduler已完成。本轮无worker/HTTP/preview物化执行入口；UI明确“当前只管理计划，尚未自动执行，手动入口仍可用”。后续连接执行器前需独立caption契约、OCR实际exit drain、Runtime ownership和执行包络/遥测资格，另批真实模型。

## 生命周期和正式UI

配置首次升级持VisualAdmission独立barrier，先停/drain tags/combined/batch。OCR现有abort并不证明实际exit，不能借用为全资源drain；新增仅当OCR未准备/运行时可取得的维护准入锁，阻止新configure/prepare/run并撤销旧review，已有OCR忙时拒绝本次升级。无OCR执行/进程改造，维护锁释放不恢复旧receipt。

后台controller prepare/confirm配置owner/session/TTL有界；逐项修改带AbortController，card撤权/库切换取消未线性化写入。没有后台服务/定时推理。UI可见时每5秒读小快照，隐藏停读；查询不会升级。AI Console放主配置和3cap计数，VisualAiPanel共享同一组件的单asset模式（Main/card），逐项等待/pause/resume/cancel及原因。复用DESIGN tokens/现有组件样式，不重做界面。

## 验证和结束条件

先生成Host红灯：配置持久化/新入库3行/无历史补建；再实现。升级故障回滚/ack不确定/设置恢复隔离、种子/旧11拒12、新12旧能力矩阵；Replay/Trash restore/source变化/用户选择/权限/CAS/session和source hash。政策测试fresh/stale/unknown/memory/power/foreground/外部或未拥有runtime，不读取真实runtime或启动模型。

正式Electron生成2图：先入旧图再启用配置，不补旧图；新图出现三等待项，暂停/策略开关/重开保持，卡片限制，0HTTP/模型调用。现实遥测含unknown不变为就绪。每个适用测试记录发现数量/退出码/rawhash，独立只读核对最终源码。产出B01成果/明确缺口/终态包，停止本轮，不自动扩为实际推理或全部资源平台。
