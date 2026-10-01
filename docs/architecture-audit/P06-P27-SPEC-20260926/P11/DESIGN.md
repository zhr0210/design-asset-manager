# P11 基础分析计划与Promotion订阅（Proposed）

## 计划与接线
BasicPlanV1={tags,caption,ocr}，purpose=basic；prompt只能由P12手动计划产生。用户先前U01确认目标“默认基础分析”不等于当前代码默认已启用或任何真实库已有后台授权。首次启用按范围/本地云/后台恢复策略披露；不绕过schema审批或触发下载。
拟在现有Promotion权威提交事务加入最小asset-promoted Outbox事件（非在完成回调后随手发消息），由P05同库消费者幂等生成三类Job。幂等键含promotion identity、asset content、policyVersion、capability；事件重投不重复enqueue。入库成功后可立即浏览，AI等待/失败不能撤销Promotion或阻塞词法管理。

## 各能力独立
标签复用P10；caption适用P04人工描述优先；专用OCR仍用1600/PNG及块结构validator，有效空单独succeeded-empty，edited_text空也有效。合并tags/caption的条件包含相同scope/input/model/profile/recipe兼容、deadline、授权与重试策略；完整响应后分别验证。OCR默认独立调用，不因视觉模型附带ocrText而替代专用结果。
资源不足分别waiting；模型切换不解除人工pin。用户单项取消只撤销相应Job订阅；其他已成功/运行能力继续。批次完成有失败显示completed-with-failures，有pending显示partial-running；聚合通知按批次/原因而非每张刷消息。

## 回填和恢复
历史回填使用稳定assetId高水位+扫描runId+policyVersion，分页size为配置有界值；保存游标与本页入队同事务。并发新导入由Promotion事件负责，不靠offset分页漏/重复补偿；重复发现仍用幂等键。内容在扫描与执行间变化时supersede，Trash跳过。未完成分页只保存引用，不预先解码全库。
重开只考虑未完成能力，succeeded与succeeded-empty不再执行；远端unknown按P05核对，paused按恢复策略。恢复不继承旧scope/token，即使libraryGeneration相同。版本化质量门槛不回写历史为“已通过”。

## 验证/取舍
可执行规格验证计划去重、成功保留、空OCR覆盖、人工修订、三能力失败组合。未来需T02/T04/T05/T06/T07/T08合成Promotion重复/提交后崩溃、正式Electron进度、每能力SQLite结果，以及回填分页边界。当前没有生产Outbox订阅和新集成日志，NOT_RUN。
Proposed决定：Promotion事件驱动而非在入库流程调用模型；代价是延迟投影/等待提示，收益是AI不阻塞基础收录。持久schema登记归P02，不新增第二资料库写连接。
