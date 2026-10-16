# 模型与扩展生命周期：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

插件接入与公共契约从[扩展目标与边界](../CAPABILITY-SCOPE.md#插件sdk与mcp接入)进入，模型制品的当前机制另查[model-library](../../subsystems/ai-system.md#models)；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0154 · Extension API V1 Exposes Scoped Contribution Surfaces](#adr-0154)

<a id="adr-0154"></a>

## 0154 · Extension API V1 Exposes Scoped Contribution Surfaces

决定来源：[0154-extension-api-v1-exposes-scoped-contribution-surfaces.md](../../adr/0154-extension-api-v1-exposes-scoped-contribution-surfaces.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0154-p001"></a>

Scope: Target architecture, refined by [ADR 0484](../../adr/0484-extension-contracts-and-deferred-agent-development-access.md)
and the AI+ core boundary in [ADR 0483](../../adr/0483-ai-plus-core-product-and-extension-boundaries.md).
The full ecosystem below is not a prerequisite for core product work; selected public
capabilities must satisfy their applicable contracts before third-party execution.
No SDK, catalog or sandbox is delivered merely by this decision.

<a id="0154-p002"></a>

The reference design describes seven candidate contribution surfaces: Format Preview Worker, Capture or Import Producer, Metadata Import Adapter, Analysis Result Provider, Command Contribution, Inspector Panel Contribution, and Namespaced Extension Storage. Each surface has a separate manifest capability and permission set classified and consented under ADR 0155. ADR 0484 replaces the assumption that all seven already constitute a frozen v1. A small validated initial subset participates in the independent version negotiation and published compatibility policy defined by ADR 0159. Installation or catalog presence does not grant every surface, and Extension Host issues operation-scoped capability handles only after package compatibility, activation, user grants, and current context checks pass.

<a id="0154-p003"></a>

Format Preview Worker follows Preview Broker contracts and runs inside the third-party execution boundary defined by ADR 0156. It receives read-only access to one managed staged artifact and write-only access to bounded derived staging, never the user's source path or general filesystem. It returns format evidence, structure, overview, render-manifest/tile output, metadata, fidelity limits, and structured failures under worker resource limits. Declaring a format does not establish support until the pack's macOS/Windows fixtures, confinement evidence, and installed capability probe pass.

<a id="0154-p004"></a>

Capture or Import Producer submits a versioned Capture Envelope through the main-process Capture Gateway under ADR 0106. It may declare source/domain matches, metadata intent and one approved fetch or streamed-upload artifact route, but cannot write Candidate Records, Design Assets, collections, tags, SQLite, or managed files directly. Browser-facing producers declare domain access and isolated content-script or declarative extraction scope; cookies, authentication headers and site credentials never enter the envelope. Independent tools remain External Capture Producers under ADR 0115 rather than inheriting an installed plugin's authority.

<a id="0154-p005"></a>

Metadata Import Adapter follows ADR 0382 and is distinct from a Capture or Import Producer because it proposes typed metadata for already existing Design Assets rather than acquiring an Original Asset/Candidate Artifact. It receives one expiring read-only staged handle for the user-selected import source and write-only bounded output staging, then returns only a public versioned Metadata Import Draft candidate plus transformation/unsupported-field evidence. It cannot receive the external path, query or write library state, create assets/shared objects, accept matches, resolve conflicts, retain the source handle, execute package content or bypass the host-owned import pipeline.

<a id="0154-p006"></a>

Under ADR 0418, an adapter draft may include bounded Custom Field Definition
Proposals but never core field-write authority. Extension Host and trusted import
review own validation, mapping and confirmation; installed, enabled or permitted
status cannot create, rename, retype or delete a definition automatically.

<a id="0154-p007"></a>

Analysis Result Provider receives only an expiring Scoped Asset Handle to declared metadata fields and Broker-produced Analysis Visual Source units/views needed for the approved recipe. It can propose tags, scoped OCR, descriptions, embeddings, ADR 0419 Custom Field Value Suggestions for exact opted-in definitions, and structured evidence under ADR 0137 through ADR 0144, but cannot receive arbitrary original paths, silently upload without network/provider grants, confirm suggestions, overwrite User-Authored Analysis Values or Custom Field Values, mix embedding spaces, or mark analysis complete beyond its recorded coverage. Provider and plugin identity remain in result provenance.

<a id="0154-p008"></a>

An Analysis Result Provider cannot propose or mutate Custom Field Definitions
under ADR 0418. ADR 0419 value proposals are a separately declared result
capability, remain definition-scoped and acquire no authority from ordinary
metadata-read permission.

<a id="0154-p009"></a>

ADR 0461 Text Writing Assistance is not one of the seven Extension API v1
contribution surfaces. Analysis Result Provider, Command Contribution,
Inspector Panel Contribution, metadata-read and network permissions cannot read
or transform an active Text Edit Draft through that decision. A future
extension-provided writing lane requires a separately reviewed public
capability and operation-scoped content grant rather than private IPC or a
display-string shortcut.

<a id="0154-p010"></a>

Command Contribution registers documented commands for explicit application contexts such as selected Candidate, Design Asset, collection, Asset Preview or Inspector. Each invocation receives a bounded selection snapshot and only the handles declared for that command; it cannot retain them indefinitely or infer batch scope. Destructive, file-ownership, promotion, network and external-process actions require dedicated capabilities and product review; an ordinary command grant does not authorize them. Under ADR 0484, host-reviewed derived-result/export proposals may be considered for an initial subset, replacing blanket export exclusion. This grants no callable export operation today: the trusted host must own validation, approval, destination and writes, with no arbitrary filesystem or Original replacement authority.

<a id="0154-p011"></a>

Inspector Panel Contribution uses documented Extension UI Slots through the Isolated Extension UI in ADR 0156. It may render plugin-owned status, controls and results and invoke its registered commands through the app-owned bridge, but cannot import renderer stores, replace Workspace Navigation, cover trusted confirmation UI, inject into the main DOM, access Electron/Node, navigate arbitrarily, contact the network directly, or imitate application permission dialogs. Accessibility, theme, sizing, localization, message safety, crash containment and unload behavior form part of UI conformance.

<a id="0154-p012"></a>

Namespaced Extension Storage provides quota-bound structured key/value or document storage owned by plugin and library identity. It is accessed only through Extension Host, participates in plugin backup/export and uninstall disclosure, and cannot issue SQL, open database files, enumerate other plugins, or derive local paths. Schema migrations are package-versioned, transactional and rollback-aware. Uninstall distinguishes removable cache, retained user-authored plugin data and explicit delete-data intent.

<a id="0154-p013"></a>

V1 read permissions are field- and operation-scoped: asset metadata uses allowlisted projections, visual content uses opaque preview/unit handles, and binary transfer uses bounded staged or approved transport rather than base64 or filesystem paths. Network access is off by default and limited to separately approved declared hosts and purposes. Permission revocation invalidates dependent handles, while a broadened update cannot activate until the user approves its exact permission diff under ADR 0155. ADR 0160 allows dependency only through public capability requirements and host-mediated bindings, never direct plugin imports, calls, storage, or process discovery. Rate, concurrency, byte, time and result-size limits apply per plugin. The official SDK exposes these public contracts; forks may change their own build, but official extensions do not use private IPC or internal modules as a compatibility shortcut.
