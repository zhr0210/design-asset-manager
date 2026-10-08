# P19 来源、缓存与安全GC（Proposed）

## Artifact契约
ArtifactRef={id,kind,ownerDomain,libraryId,parentRefs,contentDigest,transformVersion,dimensions,coordinateSpace,formatVersion,retentionClass}；Original/requiredPreview/variantAsset/preparedInput/featureCache/indexGeneration分别表达，不合并成同一物理仓库。Variant是新素材，临时OCR tile不是；不能复制父资产Evidence当新素材已分析。
CacheKey=授权域+内容digest+变换+能力/recipe+模型/projector/tokenizer+cache格式；向量额外spaceId，KV额外实际token前缀/模板/Runtime格式。路径只是定位，不是内容身份；query缓存绑定规范化查询+filter+projectionRevision，不默认长期保存查询史。

## 并发复用与关闭
getOrPrepare(key,grant,permit)采用同scope单flight，每消费者独立持有/取消。一个取消不删另一个仍用材料；最后一个取消可撤销未发布计算。生成写staging→校验→稳定发布→引用事务，崩溃孤儿只能进入受控恢复清单。命中仍检查当前session/content/授权，关库立即撤权，敏感KV/视觉缓存清理失败说明待清；外部服务无法证明清理不能显示已清空。

## 引用/GC协议
引用集合包括Evidence必需输入、当前/旧被持有索引、active model安装、未完成Job/恢复Journal、窗口/读取lease。不要把“读者瞬时引用计数=0”当作可删持久Evidence的输入。先mark候选（known owned rebuildable、保留期到期、无强引用）→GC journal→在写锁下重新核对身份/引用/路径→移隔离或删除→记录结果；期间新holder需互斥注册或取消候选。unknown文件/links拒处理，不递归扫用户根。
LRU只用于明确可重建非必需cache；requiredPreview/Original/仍有证据引用材料不随容量压力删除。永久Asset删除与安装清理沿各领域审批，不借GC扩大权限。GC失败不反转已提交结果，不删日志掩盖未完成操作。

## 去重候选
exact hash相同返回same-bytes候选，感知hash/embedding近似返回similarity candidate；用户组织/来源/笔记/confirmed tags仍不同身份。proposeDuplicateComparison只读，合并需要独立预览影响/恢复计划，P19不提供自动合并或原件删除工具。

## 验证/接手
参考模型测试跨域/模型/变换键不同、路径不参与身份、GC强引用保护、近似不删。未来T02/T07/T10/T18需真实临时目录cache stampede、文件身份替换、取消/GC竞态、关库敏感缓存、重开/删除恢复。S03只借包中缓存机制导航，不把MLX默认缓存宣称满足DAM权限。
局部Proposed决定：统一语义与引用登记，保留不同物理仓库/所有权；拟改Artifact metadata/GC协调入口，不把现有service cleanup直接接到素材库。
