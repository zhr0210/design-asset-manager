# 后台 OCR 单能力闭环交付报告

日期：2026-09-29；runId：background-ocr-20260929。
本轮由用户“继续下一轮”批准，依据 OCR-EXIT 评估包的新候选范围实施；旧批次不重开。

## 结论与实际范围

已接通后台 OCR 的独立会话许可、原子领取、共享资源准入、当前 Runtime 执行、Host 幂等保存和保守中断恢复。正式 Main/Preload/Renderer 路径在生成素材和 stdlib 合成执行器上通过。

**生产资源资格仍为 null，正式产品保持等待，不自动启动未经资格验证的模型。** 合成资格不证明真实模型内存峰值、OCR质量或Windows可用。本轮交付的是有资格门槛的单能力代码闭环，不是完整资源Governor、所有能力自动化或真实用户库上线。

## 当前调用链

```text
AI Console：后台 OCR 独立授权/撤销/等待原因
└─ Main-only background-ocr IPC（card与不可信sender拒绝）
   └─ BackgroundOcrController
      ├─ 单次会话review → Host显式v12→v13备份升级与grant
      ├─ 单并发tick → 资格/遥测检查 → 有界候选
      └─ OcrController.runBackground（与手动OCR共享门槛）
         ├─ VisualAdmission：真实软件资源预留 → 受控预览
         ├─ Host：原子claim → 解码后重新准入 → 原子sent
         ├─ 当前OcrRuntime → owned child → close/UNKNOWN证据
         └─ Host事务：OCR结果 + 成功回执
            └─ 正式素材读取/人工修订/关闭重开
```

## 状态、权限与兼容性

- B01 `enabled` 仍只收集启用后新素材计划；不回填旧素材，不将该开关升级为模型权限。其一般执行投影 `dispatchAvailable:false` 保持。
- `background_ocr_permission` 只保存最近选择/修订/Runtime指纹；真正grant是当前Host session绑定的内存状态与撤权epoch。不是完整授权历史，也不是永久capability。
- `background_ocr_attempts` 每意图一行当前尝试；成功后保留幂等回执，不循环重跑。effect摘要覆盖意图、attempt代次、素材/源/预览、Runtime、配方、输入及规范化输出。
- claimed未发送，可在新会话重新授权后恢复；sent/unknown不跨会话自动重领。当前unknown迟到close可以安全结案，若权限已失效则保留unknown。缺少孤儿进程退出证据时保持阻塞，不伪造恢复。
- deferred只来自claimed，表示发送前资源暂变；在同Runtime/当前许可下重新准入，可递增attempt代次。sent/unknown不能降为deferred。观察到Runtime失配即撤权，A→B→A不能恢复旧许可。
- 成功OCR和回执在同一Host事务；准确重投返回旧回执，不覆盖后来人工修订；不匹配摘要拒绝。Worker不写资料库。
- v13只从v12显式确认升级，采用既有备份、空间上限、独占lease及原子迁移。新库仍v1；普通读取/打开不升级；冻结v12 reader拒绝v13。未知新版本保护保持。

## 资源与关闭

手动/后台在解码前共享OCR准备、运行、维护及UNKNOWN门槛，并通过VisualAdmission预留软件记账资源。手动review保留到执行/失效/五分钟过期；UNKNOWN保留到实际close的释放token。Host材料预算包含源副本、解码像素、codec、冻结预览、传输与响应膨胀；这是保守软件估算，不是实测模型峰值或OS隔离。

后台完整包络必须覆盖材料与Runtime/model峰值。生产未提供资格，不用硬编码verified=true绕过。仅已隔离的synthetic E2E模式加显式标志使用合成包络；正式生产空包络也有零spawn验收。

claim前及异步预处理后/sent前重新核对资源、Runtime和已预留额度。无许可不调度；一轮一个工作；完成后5秒，无候选/等待/失败30秒回退。近期记录与候选使用专用索引；EXPLAIN验证仅证明查询形态，不是大库实测延迟。B01 OBS-01继续保留。

关闭先撤grant，再等待OCR与后台预检/授权确认收敛；不能收敛则有界拒绝关闭。后台终态协调排在Host生命周期操作之后，避免撤权持久化期间丢失已知取消结果。未记录或清理用户自行启动的进程。

## 验证结果

所有主Agent命令串行、每命令240秒上限；以下是最终适用结果，不把重复阶段相加。

| 检查 | 结果 | 原始日志 |
| --- | --- | --- |
| 后台OCR真实临时Host矩阵 | 35/35 | host-final |
| 其中owned Host SIGKILL切点 | 4项，计入35 | 领取前/后、发送后、提交后 |
| 新React界面竞态 | 3/3 | ui-final |
| 正式Electron后台OCR | 2/2 | formal-final：生产null零spawn；合成资格一次执行/保存/修订/重开 |
| 原OCR进程生命周期 | 17/17 | process-regression：stdlib与注入混合，不是17次模型推理 |
| 原OCR控制器 | 12/12 | controller-regression |
| B01临时Host/控制器 | 19/19 | b01-regression |
| 标签执行/决定/恢复 | 30/13/22 | tag-execution / tag-decision / tag-recovery-regression |
| 共享资源准入 | 10/10 | admission-corrected |
| OCR存储 / Active Library Host / shutdown | 3组断言脚本通过，非独立TAP计数 | 对应regression日志 |
| 正式手动OCR / 正式B01 | 各1/1 | manual-formal-regression / b01-formal-regression |
| TypeScript / 构建 | 通过 | typecheck-final / build-final |

35项包含：不授权零领取、原子空OCR/回执、重复投递不改修订、权限/意图/source/preview/CAS冲突、v13故障回滚与提交不确定、恢复设置失败隔离、旧reader拒绝、手动竞争、UNKNOWN保留、fresh runtime/资源复核、两个tick只执行一次、实际IPC拒绝越权、专用查询索引、v13标签/综合分析/OCR/笔记/组织/工作集/下载记录兼容和重开。

界面截图已人工目视检查：复用项目共享面板和tokens，授权、撤销、等待、成功记录可读。图片位于screenshots/。正式测试均使用临时profile、生成PNG、stdlib协议执行器，未运行RapidOCR权重或验证OCR质量。

## 失败与修复记录

- host-first：测试夹具误用不存在的资产name属性；改用Promotion返回身份，断言不放宽。
- typecheck-a：新增grant可空类型收窄遗漏；显式空值分支修正。
- formal-first / formal-diagnostic：测试在创建完成前取得空资料库身份；界面实际上已授权。改为首素材完成后读取真实scope。另将首次调度安排在维护锁释放后，避免授权期间无谓30秒等待。
- final-host：延迟预处理夹具试图修改冻结Host对象；改为明确的委托适配器，仍调用真实Host读取。
- admission-regression：调用了不存在的测试文件名；改为仓库实际 visual-admission.integration.test.ts，通过10项。保留失败命令，不计为产品失败。
- 独立源码审查发现并修复：失败confirm丢取消句柄、Runtime变更可恢复旧grant、发送前资格缺少再检查。新增实际反例断言覆盖最终行为；文档与deferred状态同步。未伪称重跑过所有修复前中间源码。

打包时第一次补丁重建发现新建fixture manifest没有末尾换行；修复补丁的no-newline标记后36文件逐字节重建一致，源码未改变。初始失败补丁与记录保留于history，仅供追溯，不用于应用。

37份主命令记录（含6份失败）全部保留在EVIDENCE-MAP/logs。独立复核范围与结果单列REVIEW-FINAL；不要把评审者引用主日志当成其独立重跑。

## 工作区、交接与限制

36文件增量：22份既有文件修改、14份新增文件；before来自本次起始WIP而非HEAD。148份相关源码快照不是完整工程。仅本票补丁可以审查，不能盲套到其他WIP。最终摘要、补丁重建、原索引/未提交保护见各JSON。

无真实资料库/模型缓存/权重操作，无下载安装、Git暂存/提交/推送或发布。只创建临时合成夹具、构建输出和交接证据。已执行的命令退出；owned crash测试等待子进程退出；其他后台进程未盘点（UNKNOWN），没有部署无人值守编码服务。

NOT_RUN：真实OCR模型质量与资源包络、Windows、签名安装、真实库迁移、全设备RAM/VRAM自适应。未实现独立caption或其他能力自动调度。旧sent/unknown跨会话人工确认机制仍未交付，继续阻塞。B01计数大库性能仍待独立范围。

本批交付结束后COMPLETED/STOP，nextBatchAuthorized=false；不自动进入真实模型、caption或下一轮功能。
