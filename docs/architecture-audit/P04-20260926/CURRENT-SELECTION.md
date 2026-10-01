# 当前结果选择器

Proposed，选择器及以下状态机未实现/未运行。原则：由Host签发的请求代次控制更新资格，用户意图决定最终选用；完成时间不参与新结果之间的竞争。

## 三个不同版本

- `libraryGeneration/claimEpoch`：当前会话/执行所有权，不跨关库变成永久许可。
- `assetLifecycleRevision/contentKey`：写入防线与结果适用性；不可用路径、标题或相同尺寸代替内容身份。
- `requestGeneration`：每库/素材/内容/能力的单调请求序号；创建新分析意图（包括force rerun）递增，网络截断重试不递增；新attempt增加claimEpoch并撤销旧claim。安全整数边界达到上限必须拒绝继续，不回绕。

P04最小状态在库内由Host维护，不能只用控制器内存计数：analysis_capability_state保存lastIssuedGeneration、activeAttemptId/claimEpoch、activeLeaseGeneration、cancelled、lastRequestOutcome（pending/succeeded/failed/cancelled及脱敏reason code）、autoEvidenceRef、selectionRevision。它只做提交防护，不拥有队列/后台启动或恢复策略。正式DDL版本未分配。P05须复用这一代次及claim语义，不能另建第二个争用的计数器。

## 转换表

| 事件 | 权威变化 | 旧结果 |
| --- | --- | --- |
| issue(capability,content) | 持锁事务分配g+1与claim，返回Host私有ticket；旧claim立即失效 | 保留autoEvidenceRef和Overlay |
| retry同一逻辑请求 | 同g，替换attempt/claim；仍受同一授权与预算约束 | 保留 |
| valid result (g=lastIssued,claim当前) | 追加一次Evidence；eligible才更新auto pointer | 历史追加保留，人工不动 |
| result g<lastIssued 或claim过期 | 拒绝STALE_RESULT，不追加，不改pointer | 保留；新一代失败也不复活旧在途请求 |
| fail / timeout / cancel | 记录相应请求终态，cancel使claim不可提交；不把空Evidence写入 | 保留已提交有效结果 |
| manual pin eligible evidence | CAS overlayRevision，记录显式evidenceRef | 新AI成功可存历史并更新auto pointer，但effective继续固定 |
| unpin | 显式解除固定，选择当前content下现存auto候选；无候选则无AI结果 | 不自动重推理 |
| content changed | 撤销旧在途claim；旧content证据与覆盖归档可查 | 不把旧AI作为新内容有效结果；人工资产级描述/确认标签保留，内容级修订提示不匹配 |
| close / reopen | 关库撤权；重开新generation。持久状态可读但旧ticket无效 | 已提交状态保留；是否重排由P05与有效授权决定 |

“失败保留上次”指上次已提交且内容仍适用的结果，不是允许较旧在途任务在新请求失败后写入。重试attempt只允许当前claim提交，即便旧attempt先返回也不双成功。

## 纯选择函数的判定顺序

```text
resolveEffective(content, state, evidenceCandidates, overlays, legacySeed):
  验证所有ref在同库/素材/能力；候选结构有效且内容适用
  pinned = overlay固定引用（可指向新Evidence或稳定legacy ref）
  auto = state.autoEvidenceRef，或者未建立新state时的legacy seed
  model = pinned若有效，否则auto（无效pin返回needs-review，不暗换模型结果）
  caption = 人工描述存在 ? 人工text（含空串） : model caption / 兼容保留文字
  tags = model标签减去有效拒绝；confirmed关系独立合并展示、去重但保留来源
  ocr = 有效人工整段修订 ? 修订text（含空串） : 专用model OCR
        若无专用OCR且无当前专用空结果/修订，才用兼容视觉OCR
  prompt = model creative prompt；不解释为原始提示词
  返回 value + evidenceRef/overlayRef + status + provenance，不只返回字符串
```

当前pin若内容不匹配，不默默转为其他结果；返回固定项需复核，旧项可看历史。与pin无关的其他能力正常可用。对未人工固定的能力，eligible新结果更新auto即可；held结果不夺取auto。

当前状态与最近请求状态分开：例如“描述仍可用，最近重跑失败”；OCR `succeeded-empty`与`missing/failed`分开；不能用`if(text)`决定是否有结果。搜索和AI文件夹使用同一effective projection版本；不能分别排序各自选出不同current。

## 兼容基线与边界

旧记录没有请求次序，首次兼容读取只能按旧代码既有规则(created_at,id)取seed，明确selectionBasis=legacy-completion-order-unknown-request-order；这不是新算法的代次来源。进入新写模式后，把seed引用初始化在state中（显式迁移/首次已授权写事务，普通read不写），新失败继续保留seed；state存在时不动态重扫旧时间重新夺权。

专用OCR已有当前state，用其evidence_id作为seed，含空结果；不能从OCR历史created_at重排。Visual历史最多20条是旧API列表限制，新引擎选择历史pin时按来源ID单条授权读取，不受该窗口截断；不扩大旧API承诺。

当前Visual证据以lifecycle revision+preview匹配；旧OCR只要求当前preview且素材active。兼容读保持这些历史规则。新统一contentKey先采取保守策略（版本/preview变化须重核或重新分析），P06定义内容稳定身份前不宣称自动跨版本继承新证据。Trash/restore旧OCR兼容不得被统一过滤误删。
