# P17 EmbeddingSpace与索引代际（Proposed）

## 空间契约
SpaceId=canonical digest(model+revision/weights/projector/tokenizer+dimension+normalization+inputTransform+modality-pair+distanceMetric+outputSemanticsVersion)。若远端身份opaque，只能声明不可精确复现空间并限定服务版本策略，不假造hash。同维不是同空间。向量入库验证finite/维度/范数/输出格式；norm=0或超范围拒绝，不把截断向量padding为合法。
Embedding Job沿P05/P06/P08/P15有界输入、版本与资源，结果绑定asset content/artifact/space；图文跨模态只用明确共享空间，不能把任意文本encoder与视觉encoder拼接。

## 索引与重建
IndexGeneration={id,spaceId,engineVersion,buildWatermark,covered/eligible,dirtyCount,status}：building→catching-up→verified→active→retired。回填按固定内容引用和高水位分页，更新/删除用P05事件及tombstone；覆盖率分母注明eligible内容快照，不用总素材数隐藏缺口。切换前核对目标watermark、抽样/全量元数据、过滤与资源峰值，原子更换active指针。失败保留旧代际，不删仍被query持有的索引。
查询指定space/indexGeneration；text encoder缺失或新模型不ready返回lexical-only理由。权限过滤在候选暴露前执行，ANN内部预过滤不足时有界扩展再核对，不返回未授权ID或给出泄漏数量。

## 选型实验（未执行）
| 候选类别 | 优点/成本假设 | 必须测量后才能采用 |
| --- | --- | --- |
| 精确线性扫描参考 | 简单可比较，时间/内存随规模增长 | 1k/10k/100k实际维度与P95、内存/取消 |
| SQLite嵌入式向量扩展候选 | 库内过滤/事务整合潜力 | Electron ABI/平台包、扩展安全、更新删除、许可 |
| 进程内ANN候选 | 有潜在召回/延迟优势，需侧文件一致性 | Recall@K、tombstone、重建峰值、过滤与跨平台持久格式 |

最终engine=null，性能/许可/打包实验NOT_RUN。不会因为热门引入远端向量服务。Immich官方描述CLIP搜索及换模型后重处理，仅借鉴机制，不继承其排行榜或内存数字。[S15](https://docs.immich.app/features/searching/)（访问2026-09-26，滚动文档）。S21机制沿P16。

## 可执行验证与实施门槛
参考模型验证空间/维度/非数/零向量、删除revision与active切换条件。它不是实际Embedding或ANN实验。未来T07/T08/T16/T23/T24必须验证同维不同模型、索引中断/回填恢复、重复事件、内容变更、权限、覆盖与中文质量；没有模型运行授权的新组合保持unverified。
拟改QueryPort/Embedding能力adapter/Host索引metadata，不让Worker写权威SQLite。Proposed ADR：模型空间和物理索引代际独立，正确性门槛先于选型速度。
