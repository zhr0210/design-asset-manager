# 决定背景、语料说明与替代保护

按需查阅，不作为每任务全量上下文。任务类型只用于阅读关注面；相关已确认决定仍按适用范围核对。

## 工程自主权与旧政策范围

当前用户明确目标与AGENTS/CONTRIBUTING/开发规范决定工程自主权；历史逐接口审批、synthetic-only批次、旧暂停记录不覆盖已明确授权。资料、兼容和原件保护仍按适用契约，索引不授予新资格。

## Two Independent Axes

### Decision lifecycle

- **Core**: a cross-domain product or safety invariant. Read for every change
  that can affect it.
- **Supporting**: an accepted domain decision. Read when working in that
  domain.
- **Spec-candidate**: valuable interaction, state-machine, protocol,
  performance, or test detail that now live behind a shorter
  canonical ADR and its linked capability specification. Still-valid clauses apply when that capability is in scope,
  subject to explicit supersession; an unimplemented future specification is
  not an authorization or a prerequisite for unrelated core work.
- **Historical**: superseded decision evidence. Keep for reasoning and
  traceability; do not implement as current behavior.

### Delivery state

- **Implemented**: focused code and executable evidence exist.
- **Partial**: a real slice exists, but material accepted behavior is absent.
- **Target-only**: the ADR explicitly records future architecture.
- **Blocked**: delivery depends on an identified external decision,
  environment, credential, artifact, or approval.
- **Unknown**: inspect before claiming a state.

Decision lifecycle and delivery state must never be collapsed into one status.
For example, ADR 0292 is Core and largely Target-only; ADR 0323 is Historical
even though it remains useful evidence for why source replacement was rejected.

## Product Spine

The [product foundation](../../product/PRODUCT-FOUNDATION.md) owns current scope.
ADR 0483 makes AI+ the built-in core; ADR 0484 scopes optional extensions and
explicitly defers cloud development access/MCP/community infrastructure. These
new ADRs identify the exact clauses they replace; unrelated safety invariants
remain. The complete ecosystem is not a mandatory first-release checklist. ADR 0485 adds
core Work Mode (saved multi-asset sets/multiple floating windows) and optional
recording producers with host-owned durable video/frame/source records.

These decisions define the product before domain detail:

1. **Asset Workspace is primary** — ADR 0009/0483. Embedded web collection is
   retired. AI+ understanding, retrieval and reuse define the main workflow;
   advanced tools are optional plugins under ADR 0484.
2. **Search-first organization** — ADR 0033 and ADR 0413. Unsorted is a valid
   indefinite state; classification completeness is never an admission or
   retrieval gate.
3. **One intake path** — ADR 0105–0106. Capture Producers create Candidate
   work through Capture Gateway before Promotion.
4. **Originals are never silently harmed** — ADR 0013, 0066, 0111, 0280–0284,
   0292–0297, 0340, 0348, 0351, 0405–0406, and 0482.
5. **Copy is the ordinary default** — ADR 0292. Copy Into Library is visible,
   recommended, and preselected; Reference in Place is explicit and advanced.
   Neither mode changes the selected external source.
6. **AI is local-first** — ADR 0002 and 0141. External analysis is available
   only for the currently disclosed action or batch after explicit grant;
   saved provider configuration is not upload consent.
7. **AI is progressive and non-blocking** — ADR 0016, 0140–0145, and
   0168–0169. Missing or unconfirmed enrichment does not block Promotion.
8. **Discovery must remain useful without vectors** — ADR 0181. Lexical and
   structured retrieval remain complete; semantic and visual channels add
   compatible evidence.
9. **Search results explain why they matched** — ADR 0181–0184. Model spaces
   are isolated, image queries are explicit, and ordinary query history is
   ephemeral by default.
10. **AI belongs in the work context** — Asset Workspace search, Inspector,
    and contextual AI actions are the primary product interaction. AI Console
    is diagnostics and model/runtime management, not a chatbot-first home.
11. **User-authored state outranks generated evidence** — ADR 0140, 0193,
    0406, and 0418–0419. Model or trust changes do not silently rewrite,
    remove, or de-rank prior committed user-owned values.
12. **Public contracts change deliberately** — shared IPC, database schema,
    worker HTTP contracts, library ownership, and source mutation require
    focused approval, synchronized callers, docs, and tests.

## Domain Routes

按[规格主题](../../product/specs/README.md)定位详细契约，按[子系统目录](../../subsystems/README.md)核对当前实现。这里不再维护过时的交付摘要。

| 决策范围 | 主题 | 当前系统 |
| --- | --- | --- |
| 0001–0008 | 平台与执行边界 | [platform-release](../../platform/BUILD-AND-RELEASE.md) |
| 0009–0039 | 工作台与导航 | [asset-workspace](../../subsystems/gui-shell.md#asset-workspace) |
| 0040–0076 | 筛选、审查与回收站 | [library-lifecycle](../../subsystems/library-lifecycle.md#library) |
| 0077–0104 | 批量操作与冲突 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0105–0118 | Candidate与入库 | [storage-intake](../../subsystems/library-lifecycle.md#intake) |
| 0119–0150 | 预览、颜色与分析证据 | [ai-analysis](../../subsystems/ai-system.md#requests) |
| 0151–0167 | 模型与扩展生命周期 | [model-library](../../subsystems/ai-system.md#models) |
| 0168–0180 | 渐进分析与资源 | [ai-analysis](../../subsystems/ai-system.md#requests) |
| 0181–0184 | 解释检索与临时查询 | [asset-discovery](../../subsystems/asset-discovery.md) |
| 0185–0222 | 备份、模型信任与安装 | [model-library](../../subsystems/ai-system.md#models) |
| 0223–0255 | 模型存储与清理恢复 | [model-library](../../subsystems/ai-system.md#models) |
| 0256–0274 | 存储清理结果与可访问导航 | [model-library](../../subsystems/ai-system.md#models) |
| 0275–0291 | 资料库身份与存储角色 | [library-lifecycle](../../subsystems/library-lifecycle.md#library) |
| 0292–0300 | 添加素材与来源保护 | [storage-intake](../../subsystems/library-lifecycle.md#intake) |
| 0301–0334 | 引用源操作与恢复 | [storage-intake](../../subsystems/library-lifecycle.md#intake) |
| 0335–0350 | Copy与复合原件 | [storage-intake](../../subsystems/library-lifecycle.md#intake) |
| 0351–0370 | 归属转换与元数据写回 | [storage-intake](../../subsystems/library-lifecycle.md#intake) |
| 0371–0382 | 元数据便携与合并 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0383–0412 | 导出、交付与性能 | [media-handoff](../../subsystems/local-host.md#handoff) |
| 0413–0414 | 搜索优先组织 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0415–0439 | 自定义字段与迁移 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0440–0457 | 文本字段、检索与编辑 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0458–0464 | 数字字段、显示与精度 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0465–0471 | 手工编辑撤销与内存 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0472–0481 | 布尔与缺失字段初始化 | [organization](../../subsystems/library-lifecycle.md#organization) |
| 0482–0493 | 现行核心、双端与原生取舍 | [local-host](../../subsystems/local-host.md#clients) |

## Conflict and Drift Queue

| Topic | Decision |
| --- | --- |
| Local vs external AI | Local capability is the default. External use requires a visible task- or batch-scoped grant; no silent fallback. |
| Unsorted vs Promotion blocking | Missing a more specific Collection target is not blocking. Only an explicit target conflict may block. |
| AI suggestion review | Pending, low-confidence, unavailable, or rejected AI enrichment is non-blocking by itself. |
| Capture Inbox placement | ADR 0026 replaces ADR 0012 and the right-side placement clause in ADR 0020. The right side remains Inspector space. |
| Recent Captures | Recency is an informational dynamic view with Match Count, not an unresolved Review Signal queue. |
| Direct-to-library fast path | A fast path still uses Capture Gateway and Candidate Identity; one reviewed action may immediately promote after activation. |
| Duplicate signals | Duplicate evidence is advisory by default. Only a proven active identity/core conflict may affect default batch eligibility. |
| Cross-format source change | ADR 0348 is authoritative. Compatible Export never becomes the current Original through an application source-replacement flow. |
| Runtime bootstrap consent | ADR 0483 resolves ADR 0170/0188: one explicit reviewed setup may cover its disclosed dependencies. Display or unmetered network alone never authorizes installation. |
| Copy vs Reference latency | The ordinary Copy path must become progressively visible/searchable and must not be slower because it is safer. This is an implementation requirement, not permission to bypass Candidate identity. |
| AI Console role | Keep as diagnostics/model management. Do not expand it as the primary AI product surface. |
| Adopted library terminology | ADR 0275's In-Place Reference Library and ADR 0292's Reference in Place are different flows; UI naming needs a later terminology decision before either ships. |

## Current Code Reality

Current wiring, validation limits and source entry points belong in
[implementation status](../../agents/implementation-status.md) and nearby module
READMEs. This router does not maintain another full capability snapshot.
For work that depends on delivery, inspect Main/Preload/Renderer callers and
focused evidence; accepted architecture, a runtime Probe and synthetic external
responses are not real model-quality or user-library validation.

The product priority under ADR 0483 is:

```text
Safe local intake and reliable manual operations
  → progressive measured colors / AI tags / description / prompt results
  → explicit result storage and retrieval
  → explained matches, saved Work Sets and persistent visual reference while creating
  → correction and safe cross-application reuse
```

Current lexical, semantic and image-query paths must be checked through their actual consumers; source wiring is not quality, scale or platform acceptance. Confirm each lane separately.
Advanced layer tools, a full third-party marketplace, cloud development/MCP,
cross-library federation, Custom Field long tails and export scheduling are
future scope, not prerequisites for this core loop. Their applicable security and
ownership requirements still apply before executing those capabilities.

## Retirement Rule

No ADR is deleted merely for length, age, title similarity, or missing
implementation. Before marking one Historical:

1. Name the canonical replacement.
2. Map every still-valid invariant and exception to replacement text or a
   focused specification.
3. Validate all inbound ADR references.
4. Update the nearest code/module docs and focused tests where behavior exists.
5. Preserve a recoverable checkpoint, such as a source snapshot plus staged/working patches; do not force a commit of unrelated work.
6. Keep a scoped replacement map and reviewable diff. Commit only when requested or otherwise authorized for that task.

Fixed durations, retry counts, memory limits, pagination, focus behavior,
format matrices, and button-level interaction usually belong in versioned
capability, interaction, performance, or test specifications. Moving them does
not authorize weakening their safety or privacy guarantees.

- [0486 — Shared approved Gallery presentation](../0486-approved-gallery-presentation-is-shared-with-the-formal-workspace.md): one visual contract, separate data adapters and dual acceptance.

- [0487 — Library-owned asset notebooks](../0487-asset-notebooks-use-versioned-library-owned-storage.md): independent annotations, explicit v5 upgrade and conflict-safe saves.

- [0488 — Library folders and palettes](../0488-library-folders-and-palettes-store-references.md): reference-only membership, explicit v6 upgrade and normalized palette storage.

- [0489 — Work sets and native window authority](../0489-work-sets-separate-saved-references-from-native-window-authority.md): per-set saves, device layouts and independent sandboxed windows.

- [0490 — Dedicated OCR results and corrections](../0490-dedicated-ocr-preserves-empty-results-and-user-corrections.md): explicit v8 storage, valid-empty precedence and user correction protection.
