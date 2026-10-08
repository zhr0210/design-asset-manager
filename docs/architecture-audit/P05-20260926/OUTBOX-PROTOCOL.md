# Outbox消费协议

Proposed。Outbox是提交后的可重投通知记录，不是素材权威，也不能重新启动推理。Evidence、Job成功与事件在同一库事务中产生。

## 事件最小形状

`schemaVersion/eventId/eventSeq/libraryId/assetId/contentKey/jobId/requestGeneration/effectRevision/eventKind/capability/evidenceRef/createdAt`。eventKind初始为analysis-result-committed、analysis-state-changed、analysis-quality-held、analysis-projection-invalidated；后者用于用户覆盖等变更，可不带jobId/requestGeneration/evidenceRef；正文/标签/OCR/图片/密钥/路径/attemptToken不放事件。消费者凭当前Host授权读取库内effective projection。

effectRevision是素材投影的单调版本（由同一Host事务维护，涵盖各能力和Overlay）；不得拿不同能力的requestGeneration互相比大小。eventSeq在库事务内生成单调安全整数；不依赖客户端时间或多个并行任务完成顺序。效果重复提交返回同一事件/回执，不再新增。事件可能重复投递，系统不承诺exactly-once delivery。

## 消费者顺序与幂等

每个consumerId + consumerVersion + indexGeneration维护独立checkpoint。首个实现按eventSeq串行分页消费，避免并行max(seq)跨越未完成事件。查询 `seq > checkpoint ORDER BY seq LIMIT bound`，过滤不相关事件也明确no-op消费；有序处理可见提交事件，不要求seq整数连续无间隙。

库内投影：同事务读取当前effective、幂等upsert或删除旧content投影、递增/核对projection revision并写checkpoint；失败两者均回滚。晚到重复事件不能把新projection回退为旧Evidence。用户Overlay改变也由其权威事务发布相同投影失效事件，否则拒绝/修订会漏更新。

库外可重建索引：先生成/发布可识别的index generation并记录处理eventId/revision，确认持久后再Host ack；发布后ack前崩溃允许重投，消费者需识别已应用。若发布期间content/Overlay再变更，不能覆盖较新投影，重读最新effective；索引无法核验则标stale并重建。单库DB与外部索引文件不宣称跨系统原子。

消费checkpoint不能只凭收到事件就推进。失败项留在队列并停止该consumer的后续水位推进，其他consumer可继续；持久记录脱敏错误/重试次数，达到已配置上限暂停待修复，不无限忙循环。不静默删掉或跳过未知schema事件；升级consumer或受控全量重建到已验证watermark后才继续。

## Renderer不是持久投影消费者

Main发轻量scope/revision失效提示；Renderer确认当前库/窗口成员权限后重新读取。发送成功不是UI已收到，窗口不存在也不阻塞Job成功或索引消费。Renderer可以合并重复提示，丢事件通过重开/聚焦/状态刷新读取最新快照修复；不要求为每个临时窗口保存永久ack。

Main通知consumer的checkpoint只表示曾尝试发出提示，不能作为前端确认显示的证据。关闭库后不继续拿旧连接重投；重开新会话才开始消费，并重新绑定scope。

## 保留与重建

本阶段不规定自动删除Outbox/attempt历史。未来清理必须确认所有必需持久消费者已消费、可重建状态可证明且幂等回执的保留策略仍有效。删除request/effect幂等记录会让旧请求ID重复执行，不能仅按日志年龄清除；需要保留tombstone或明确版本化重投窗口。

新消费者/索引版本不复用旧checkpoint。可建立一致读快照和高水位B，重建投影后从>B事件追赶；构建/切换时复核内容/Overlay版本，不把B误作模型进度。P16/P18具体检索实现另行细化，P05只定义协议与失败条件。
