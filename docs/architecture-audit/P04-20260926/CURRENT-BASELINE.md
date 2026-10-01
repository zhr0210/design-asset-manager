# 源码现状与边界

读取日期2026-09-26。下表是源码事实与推导风险，非本轮运行复现。完整文件指纹见 `evidence/SOURCE-INVENTORY.json`。

| ID | 当前事实 / 可核对入口 | 对P04的影响 |
| --- | --- | --- |
| F01 | `visual-ai-controller.ts:execute`在一次四字段输出完整通过后，构建一条VisualAiEvidence；createdAt在返回后生成。`visual-ai-storage.ts:26`一次事务追加证据、更新未锁定描述、插入全部建议标签 | 目前caption/tags/prompt为综合成功，不是每能力独立成功；OCR另有独立路径 |
| F02 | `active-library-asset-queries.ts:17`按created_at DESC、id DESC取同asset revision/preview的一条综合证据；storage:16列表同规则最多20条。没有每能力requestGeneration | 两个同素材并发批次中，先发后到结果可成为最新；这是源码允许的次序，未运行复现，未声称用户数据已经受损 |
| F03 | storage:34 INSERT OR IGNORE仅按证据ID去重；新完成会生成UUID；失败路径不主动删除旧证据 | 已有失败保留优点可保留；同一逻辑请求重试/重复投递的幂等尚不能仅靠随机证据ID证明 |
| F04 | storage:36仅ai_caption_is_user_edited=0时写AI描述，且空caption不更新列。Host:updateAssetCaption置人工标志并支持expectedCaption；resetAssetCaptionEdited只解锁，保留文字 | 人工空值与“解除锁定”不能混同；新选择器须区分保留文字、采纳某条AI描述、强制重跑 |
| F05 | `confirmVisualAiTag`新增manual/confirmed关系；查询排除rejected时键为assetId+evidenceId+原标签字符串。确认查tag用toLocaleLowerCase，pending比较用NFKC+toLowerCase | 保留确认语义；拒绝范围目前不是跨代次的规范化来源范围，规范化算法也不统一。改变历史标签身份需兼容映射，不批量合并旧tag |
| F06 | `visual-ai.ipc.ts`正式提供confirm-tag，没有reject-tag；VisualAiPanel也只提供逐项确认。`disabled-app.ipc.ts`拒绝旧asset-tag:reject-ai | 查询支持读取rejected记录不证明正式拒绝交互已经交付；不得为补功能恢复旧全局写口 |
| F07 | `ocr-storage.ts:commitOcr/correctOcr`检查会话、OCR revision、当前素材revision/sourceRef与取消；结果追加，当前state更新；有效blocks=[]成立 | OCR已有独立结构与冲突保护，应复用验证语义；新证据层不把空结果改成失败 |
| F08 | OCR重跑同sourceRef时更新evidence_id/revision，保留edited_text；异sourceRef且已有修订则拒绝。修订仅是整段text，没有区域修订ID或独立baseEvidenceId历史 | 当前能保护修订正文，但不能据此宣称支持跨分块的区域修订迁移；历史原始修订基准若已丢失只能标unknown |
| F09 | OCR读取按sourceRef匹配，不要求旧evidence.asset_revision等于新lifecycle revision；源码测试覆盖Trash/restore相同preview后旧OCR可读，但旧运行提交被拒 | 生命周期写入防线与历史内容适用性是不同概念，不直接把lifecycle revision伪称内容hash；保持兼容差异 |
| F10 | `active-library-asset-queries.ts:76`使用ocr?.text ?? visualAi?.ocrText，专用空文字阻止视觉OCR回退；aiCaption与visualAi.caption并列。`asset-discovery.workflow.ts:204`可独立检索不同的AI描述 | 新投影保留人工为主要描述，AI建议仍可有清楚来源的独立命中；“优先”不必抹去所有AI历史 |
| F11 | 当前visual-ai-v1字面量跨提示更新；视觉证据有model/backendId/inputSha但无精确recipe/profile版本或请求代次。v8 OCR有三个模型hash/引擎版本/观测尺寸/归一化四边形 | 历史兼容只投影真实存在信息，不以当前P03配方回填历史digest |

正式链路：Main组合根注册visual-ai与asset-ocr → 控制器 → ActiveLibraryHost `run`持库连接 → 各领域事务。Renderer/Provider/Python不取得库写入权。Eagle/Legacy不纳入本轮Managed证据迁移。

模块README有部分版本范围仍写v2–v7，实际storage与查询接受v8；以已核对源码为准。原AssetCaptionPanel含旧重生成逻辑，但Inspector在activeLibraryMode传入aiActionsEnabled=false；不将旧分支误报为当前正式重跑会解除人工锁。

锁文件读到Ajv6.15.0、better-sqlite3 12.10.0、Electron30.5.1、TypeScript5.9.3、Sharp0.34.5；这只是锁版本，未执行原生模块，也未验证平台兼容。复用P01的draft-07文档格式，不安装schema依赖。

P02的v8副本intent reader遗漏、Eagle初始化检查顺序问题仍是前序未修发现；本轮不扩展修复或复现。
