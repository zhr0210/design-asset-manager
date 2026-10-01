# P16 受控查询与中文FTS（Proposed）

## 当前差异及契约
旧Host search仅标题/文件名/确认标签部分匹配，Renderer词法包含OCR/描述/prompt/AI建议且带解释。拟建立QueryPort.query(QuerySpec)->QueryPage，先把现有纯workflow语义完整移到Host，不以现有Host简化过滤当语义基准。
QuerySpec={queryText,filters,tagScope,includeTrash:false,sort,limit,cursor?}；QueryPage={items,nextCursor,projectionRevision,indexGeneration,matchEvidence,degradedReason?}。明确confirmed/AI pending/用户OCR覆盖，保留既有字段排序和命中说明；相同分数增assetId稳定tie-breaker是待审排序变化，不隐瞒兼容影响。

## 游标与变化
keyset cursor携带query/filter/sort规范化digest、libraryId、当前session、indexGeneration、projectionRevision、last(sortKey,assetId)。Host签发不透明cursor，禁止用户修改偏移跨库。投影revision变更返回refresh-required，客户端保留选择ID并刷新；不长期占写事务snapshot。页内再过滤Trash/授权，空页不是无权限素材泄漏；全选跨页需明确范围快照，不能等同当前已加载页。

## 中文与FTS选择
官方FTS5默认unicode61与trigram有不同分词语义；trigram的短于三Unicode字符MATCH不会命中，因此不能独自承担“红/蓝/海报”等短中文查询。[S21](https://www.sqlite.org/fts5.html)（2026-09-26滚动文档）。实际Electron SQLite FTS5编译支持未运行验证。
对照候选：既有NFKC/lower子串为兼容基准；unicode61对无空格中文可能不同；trigram用于≥3字符候选加精确复核，短词受控fallback；外部分词需版本/词典/映射/许可/打包测试。当前不选定tokenizer，不安装扩展。应用构建字面FTS表达式，quote双写，用户AND/引号/星号按普通文本处理；SQL参数绑定不自动解决MATCH语法语义。
索引内容从P04 effective投影产生，P05 Outbox同版本刷新；未知/损坏索引退兼容词法，不能丢素材。FTS是可重建投影，不承担唯一用户正文。重建按snapshot高水位追赶事件，切代际后游标失效。

## 验证与ADR
本轮测试字面引号构造、同值排序keyset、跨库/过滤/revision过期拒绝；未验证SQLite tokenization/性能。未来T02/T08/T15/T17/T23对中文无空格/单字/别名/OCR空/拒绝标签/标点、插入删除分页、全重建对照；1k/10k/100k合成元数据只作规模实验，真实素材体验另测。
Proposed：先统一语义与Host边界再选FTS，避免为了索引速度丢当前可检索字段。Renderer逐页缓存/选择ID迁移，复用原UI组件，不重画页面。
