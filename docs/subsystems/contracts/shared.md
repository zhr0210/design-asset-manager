# Shared契约、Client与纯投影：局部接口约束

这些条款来自src/shared/README.md迁移前Rules段；全部原字句在[基线](../../checkpoints/documentation-rebuild-20261015/README.md)可追溯。现行入口从[local-host](../local-host.md)核对。条款限定具体拥有者/接口，不要求所有任务通读，也不冻结内部实现手段。

## 当前拥有者的局部保证

<a id="rule-001"></a>

- Keep shared types runtime-free.

<a id="rule-002"></a>

- Do not change exported contract names without updating every caller.

<a id="rule-007"></a>

- The macOS route overview dependency button should show install only when runtime dependency evidence is missing; once dependencies are available, it becomes a detect/refresh action and must not call the install IPC.

<a id="rule-010"></a>

- Explicit model-load probes may promote only the workflow/runtime lane they actually verified. Probe responses must be path-free, time-bounded evidence and must not imply that adjacent OCR or embedding routes passed.

<a id="rule-011"></a>

- OCR real evidence uses one shared generated-image response shape. Promotion requires a finite result with at least one detected text box; dependency or artifact gaps remain missing requirements.

<a id="rule-012"></a>

- Runtime readiness must not suppress model dependency/artifact missing requirements; only a real model path may hide gaps from unused alternative lanes.

<a id="rule-013"></a>

- Missing requirements and display-only next actions prioritize the workflow's primary runtime lane before alternative-lane gaps.

<a id="rule-015"></a>

- MPS/CUDA fixed-tensor execution is runtime evidence only. It may prove `runtime_probe_ready`, but cannot promote any workflow to `real_model_path`.

<a id="rule-016"></a>

- Runtime execution probes prove only that a runtime/device can execute fixed synthetic work; they must remain separate from real-model load or inference evidence.

<a id="rule-019"></a>

- Filesystem presence, a legacy downloaded flag or Worker `ready_to_load` state projects only unverified local evidence. Only explicit `loaded_real` or equivalent bounded runtime evidence may promote the current execution state; neither proves a verified install transaction.

<a id="rule-020"></a>

- Prompt Reverse projection must call filesystem presence local evidence, never readiness. It may offer an explicit attempt that can produce runtime evidence, but the pre-run state remains unverified.

<a id="rule-022"></a>

- Model artifact evidence may project to multiple platform runtime-lane IDs for the same shared workflow; branch projectors consume only their own lanes so macOS MPS/Metal and Windows CUDA remain platform details rather than separate product workflows.

<a id="rule-023"></a>

- AI task polling should use shared terminal/success/failure classification for `synced`, `completed`, and `failed` instead of hard-coded renderer checks.

<a id="rule-024"></a>

- AI Client IPC channels, request payloads, Worker-shaped responses, queue stats, and task-sync events must use `contracts/ai-client.contract.ts` across main, preload, and service boundaries.

<a id="rule-025"></a>

- AI queue display summaries and row labels should use shared projection so overview and runtime panels show the same queue vocabulary.

<a id="rule-029"></a>

- macOS/Windows AI capability matrix title, description, status labels, and badge classes should use shared AI Runtime Status projection rather than component-local platform copy or status maps.

<a id="rule-030"></a>

- Shared AI capability matrix renderer inputs should use the platform-neutral Worker probe-with-runtime-versions shape, not macOS/Windows concrete probe result unions or renderer-local cross-platform probe types.

<a id="rule-031"></a>

- AI runtime capability status, capability rows, Worker capability probes, Worker lane probes, and Worker probe result envelopes should live in platform-neutral runtime types; macOS/Windows runtime type files may add platform-specific lane IDs, metadata, and device details only.

<a id="rule-032"></a>

- AI Runtime panel runtime/health badges, icon semantics, health-result copy, and summary counts should use shared AI Runtime Status projection rather than renderer-local status maps or filters.

<a id="rule-033"></a>

- AI Runtime panel platform-specific branch titles, Worker probe titles, CUDA/MPS compatibility copy, fixed-tensor execution copy, and default probe failure messages should use shared AI Runtime Status projection rather than renderer-local platform ternaries.

<a id="rule-037"></a>

- Worker probe connection headers should use the platform-neutral Worker probe envelope and branch-keyed connection marker metadata; shared workflow code should not compare concrete OS marker strings directly. Platform-specific probe displays may add MPS/CUDA/ONNX route tiles. A missing probe is evidence-insufficient (`尚未探测`), not fallback, planned, or failure.

<a id="rule-043"></a>

- Asset Tagging Workflow pipeline defaults, category/model options, scan-state display, model selection toggles, task submission projection, confirmed tag chips, suggestion review items, pending suggestion projection, and tag type/color options belong in shared workflow planners, not renderer panels.

<a id="rule-044"></a>

- Asset tag chip source, status, confidence, visibility, and pending opacity display should use shared projection rather than local chip-level status checks.

<a id="rule-045"></a>

- Tag Manager list filtering, sorting, category labels, parent labels, alias display, and usage-count tone should use shared projection rather than route-local table rules.

<a id="rule-046"></a>

- Tag Manager AI compute banner status, detail copy, and indicator tone should use shared projection rather than route-local Worker/GPU checks.

<a id="rule-047"></a>

- Tag picker search, grouping, suggestion labels, usage badges, and merge-option labels should use shared projection rather than tag-component-local matching rules.

<a id="rule-048"></a>

- Library tag sidebar groups, shortcut filter states, and active query chip labels should use shared projection rather than library-component-local query parsing.

<a id="rule-049"></a>

- Asset card/detail/original-viewer/caption metadata labels, tag preview overflow, file-size labels, image spec labels, zoom labels, caption source labels, and dashboard recent-asset summaries should use shared projection rather than renderer-local formatting.

<a id="rule-050"></a>

- Asset Workspace lexical matching, hard source constraint, stable ordering, lexical-only capability state, bounded Search Match Explanation, and mixed pending-tag disclosure should use `asset-discovery.workflow.ts`; renderer routes must not reimplement rank or expose an internal numeric score.

<a id="rule-051"></a>

- Visual Analysis Snapshot mappers should hide palette payload version drift, image/theme display summaries, OCR/text-box/readability summaries, text-color panel state rules, swatch role/copy/tooltip formatting, and panel metadata labels from renderer panels.

<a id="rule-052"></a>

- Visual Analysis Snapshot text-color skip reason copy should stay table-driven inside the shared workflow so renderer panels and persisted payload variants do not branch on skip codes.

<a id="rule-053"></a>

- Persisted Visual Analysis palette inputs may retain unknown extension fields for backward compatibility, but snapshot workflow code must narrow them from `unknown` and expose typed renderer-ready output instead of propagating `any`.

<a id="rule-054"></a>

- Doctor and Path Governance panels should use shared display projection for status labels, badge classes, check labels, platform labels, report dates, details fallback, managed-path summary, and path masking rather than renderer-local dictionaries.

<a id="rule-055"></a>

- Settings Migration panels and plans should use shared display projection for status badge styling/labels, plan/report status resolution, plan summary key-value labels, backup list formatting, and list empty labels rather than component-local status maps or size formatters.

<a id="rule-057"></a>

- OCR dependency selected-provider availability should use `ocr-dependency.workflow.ts`; main-process environment checks should build provider evidence and let shared projection decide `selectedProviderAvailable`.

<a id="rule-058"></a>

- Text-box provider execution planning should use descriptor metadata in `text-box-provider.workflow.ts` so product provider, execution provider, unavailable skip reason, availability reader, and mock marker policy stay shared.

<a id="rule-059"></a>

- Electron BrowserWindow defaults and the renderer desktop shell minimum viewport should use `DESKTOP_VIEWPORT_POLICY` rather than main/renderer-local hard-coded window sizes.

<a id="rule-060"></a>

- App route path, menu placement, Asset Workspace home route and topbar-visibility policy should use `app-navigation.workflow.ts` rather than renderer-local route tables.

<a id="rule-061"></a>

- Electron app lifecycle policy should use `electron-app-lifecycle.workflow.ts` so Windows AppUserModelId and macOS quit-on-close behavior stay in one shared policy.

## 保留模块/特定Seam的约束

以下名称对应保留接口、诊断/投影、隔离签名目录或旧运行lane。约束在修改该Seam时适用，**不代表其生产通道已注册、页面仍挂载，也不限制其他正式managed入口**。历史文件名以实际消费者为准。

<a id="rule-003"></a>

- Model Library Workspace IPC is limited to the exact `summarize` and
  `configure-storage` intent channels. Requests contain no path, default path,
  locator, bookmark, full Storage Identity or caller-supplied verified flags.

<a id="rule-004"></a>

- Platform AI Branch Status contracts must keep one response shape for Windows and macOS; platform differences belong in runtime-lane evidence.

<a id="rule-005"></a>

- Platform AI Branch Status panel copy, Chinese workflow titles/summaries, status tones, primary-lane flags, evidence summaries, missing summaries, and display-only action labels belong in shared workflow projection; renderer panels should not reinterpret business status or localize it independently.

<a id="rule-006"></a>

- Platform AI route overview titles, descriptions, priorities, dependency action labels/actions/icons, diagnostic tile labels, runtime-lane captions, macOS-only diagnostic visibility, and Windows runtime-lane summaries belong in shared workflow projection.

<a id="rule-008"></a>

- Platform AI Branch Status channel-response selection belongs in shared workflow code and may only rank `workflow/status/evidence/missing/runtimeLanes`; display-only `title/summary/nextAction` must not affect selection.

<a id="rule-009"></a>

- Platform AI Action Plan projection maps status and missing requirements to existing model, runtime, backend, or manual-refresh UI operations. Renderer code executes the projected command but must not infer the destination from labels or evidence text.

<a id="rule-014"></a>

- `aiRuntime:probeOcrRealEvidence` is an additive, user-triggered operation shared by Windows and macOS; it does not alter the Platform AI Branch Status response shape.

<a id="rule-017"></a>

- Model Artifact Readiness vocabulary describes dependency/artifact/load evidence only; it must not expose local model paths or private cache locations.

<a id="rule-018"></a>

- Model Artifact Readiness display projection owns active prompt-model readiness, model-row source/status/action labels, cooperative model readiness details, download progress, and GGUF/mmproj artifact tile labels; renderer model lists should not branch on artifact or Worker readiness states locally.

<a id="rule-021"></a>

- Worker cooperative-model readiness input uses one shared snapshot contract across main-process evidence mapping and renderer row projection; model rows should consume the combined shared row display rather than composing readiness, download, and action state independently.

<a id="rule-027"></a>

- AI runtime compatibility, incompatible-status metadata, and Llama runtime display states should use shared projection so Settings and AI Console share the same status vocabulary.

<a id="rule-028"></a>

- Llama service health is runtime evidence only. `real_model_path` requires a fresh successful text plus generated-image inference probe through GGUF/mmproj.

<a id="rule-034"></a>

- Platform AI default branch fallback should use `DEFAULT_PLATFORM_AI_BRANCH` from shared AI Runtime Status projection so renderer entry points and shared projectors do not hand-write default branch policy.

<a id="rule-035"></a>

- Platform AI runtime metadata constants should use shared capability, current-platform, fallback-status, and lane-status helpers; concrete macOS/Windows constant files should keep lane topology and platform runtime labels only.

<a id="rule-036"></a>

- Platform AI branch-to-OS mapping belongs in shared runtime metadata helpers; main-process projectors should consume the helper rather than owning branch/platform maps.

<a id="rule-038"></a>

- Platform AI branch runtime metadata selection should use branch-keyed descriptors for metadata keys and markers; renderer/shared workflow callers should not hand-roll macOS/Windows branch lookup order.

<a id="rule-039"></a>

- Platform AI branch status workflow cards should use shared display metadata for action button visibility and icon intent; renderer panels should not branch on workflow status or action-plan kind to decide card controls.

<a id="rule-040"></a>

- AI Console overview status cards should use shared display projection for GPU risk, service-health labels, and model readiness vocabulary.

<a id="rule-041"></a>

- AI Console runtime dependency install toast/log copy and result summaries should use shared display projection; renderer handlers may call existing platform-specific preload methods but should not format package failures, durations, or managed-runtime labels locally.

<a id="rule-042"></a>

- Prompt Reverse panel state labels and action suggestions should use shared projection so GGUF/Llama and native routes share one renderer-ready vocabulary.

<a id="rule-056"></a>

- Product text-box provider normalization should use `text-box-provider.workflow.ts` so main-process settings loading/saving and AI Console state treat legacy `mock` as `none` through one shared rule.

## 已被当前入口替代的来源规则

以下仅作来源，不要求恢复旧执行器/轮询或旧preload别名；当前Client、DESIGN和交互规格拥有相应现行契约。

<a id="rule-026"></a>

- Download queue status labels, row metadata, file-size labels, progress labels, progress tones, search-result action labels, active counts, and shell/menu download indicators should use shared projection rather than route-local status checks.
