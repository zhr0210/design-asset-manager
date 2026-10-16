# 共享Renderer与输入生命周期：局部接口约束

这些条款来自src/renderer/README.md迁移前Rules段；全部原字句在[基线](../../checkpoints/documentation-rebuild-20261015/README.md)可追溯。现行入口从[asset-workspace](../asset-workspace.md)核对。条款限定具体拥有者/接口，不要求所有任务通读，也不冻结内部实现手段。

## 当前拥有者的局部保证

<a id="rule-001"></a>

- Keep route files thin; move repeated UI into components.

<a id="rule-002"></a>

- Keep stores focused on state and IPC calls.

<a id="rule-009"></a>

- Renderer AI route overview should use shared branch-aware display projection; macOS dependency actions and MPS diagnostics must not render for Windows or an unknown branch.

<a id="rule-011"></a>

- Renderer AI runtime panels should consume shared status display projection for macOS capability matrix labels and badge classes instead of defining local status maps.

<a id="rule-014"></a>

- Renderer shared AI capability matrices should use platform-neutral component names; platform-specific route details belong in shared projection or probe evidence.

<a id="rule-015"></a>

- Renderer AI runtime cards should consume shared runtime/health badge, icon-semantic, health-result, and summary projections instead of filtering or labeling runtime states locally.

<a id="rule-016"></a>

- Renderer macOS probe summaries should consume shared connection and route-tile projection so missing probe evidence renders as `尚未探测` instead of a capability conclusion.

<a id="rule-017"></a>

- Renderer tag panels should consume the shared Asset Tagging Workflow plan instead of owning category-to-model pipeline defaults.

<a id="rule-018"></a>

- Renderer visual-analysis panels should consume shared snapshots instead of branching on stored palette payload versions, image/theme payload fields, OCR/text-box/readability fields, or text-color status codes.

<a id="rule-019"></a>

- Renderer shell route paths, menu entries, Asset Workspace home route and topbar visibility should consume shared App Navigation workflow metadata instead of local route/title maps.

<a id="rule-020"></a>

- Renderer UI motion should use Motion for React for product interaction animation. Remotion and React Bits may guide timing and interaction patterns, but should not be added as runtime dependencies for shell feedback.

<a id="rule-022"></a>

- Bounded precise numeric App Settings should pair one exact numeric input with a synchronized slider, sharing value, unit, minimum, maximum and step; invalid typed values stay visible with an inline error and cannot be applied rather than being silently clamped.

## 保留模块/特定Seam的约束

以下名称对应保留接口、诊断/投影、隔离签名目录或旧运行lane。约束在修改该Seam时适用，**不代表其生产通道已注册、页面仍挂载，也不限制其他正式managed入口**。历史文件名以实际消费者为准。

<a id="rule-005"></a>

- AI Console and the Asset Inspector treat registry or directory presence as unverified local evidence. They do not describe it as installed or ready; AI Console does not offer legacy model download, install or delete actions while the verified Model Artifact Installer is absent.

<a id="rule-006"></a>

- Model Library product state belongs to the Renderer-internal
  `ModelLibraryWorkspaceModule`. The page may review/confirm only the two
  Main-owned storage-location intents; AI Console receives only counts,
  cached attention state and a shared-navigation link to Model Library, never
  configuration authority or an automatic storage probe. The page renders
  every configured Root condition distinctly; only `available` uses a success
  treatment.

<a id="rule-007"></a>

- Renderer should display Platform AI Branch Status projection from main process, not recompute Runtime Probe or Model Readiness meaning.

<a id="rule-008"></a>

- Renderer should use shared Platform AI Branch Status candidate selection for macOS/Windows channel responses instead of inspecting workflow statuses locally.

<a id="rule-010"></a>

- Renderer cooperative model rows should consume the shared Worker readiness snapshot and combined row projection instead of redeclaring Worker payload fields or composing artifact state locally.

<a id="rule-012"></a>

- Renderer AI runtime consumers should use the local Platform AI Runtime request adapter to select existing macOS/Windows capability, Python status, and execution-probe preload methods.

<a id="rule-013"></a>

- Keep Platform AI Runtime request selection table-driven in the local adapter; the adapter may point to concrete macOS/Windows preload methods, but route and panel code should not branch on those methods directly.

<a id="rule-023"></a>

- Renderer AI Console runtime dependency install handlers should consume shared overview workflow copy for toast/log/result summaries while keeping the existing platform-specific preload method call explicit.

<a id="rule-024"></a>

- Renderer AI Console text-box provider state should consume shared product provider normalization instead of mapping legacy `mock` locally.

## 已被当前入口替代的来源规则

以下仅作来源，不要求恢复旧执行器/轮询或旧preload别名；当前Client、DESIGN和交互规格拥有相应现行契约。

<a id="rule-003"></a>

- Preserve existing preload API usage.

<a id="rule-004"></a>

- AI Console status aggregation belongs to the Renderer-internal `AiConsoleStatusModule`: the production Adapter maps the existing Electron bridge, while `AiConsolePage` owns React state application, loading, manual feedback, GPU history, and the five-second polling cadence. Tests use the in-memory Adapter; this boundary does not expand public IPC.

<a id="rule-021"></a>

- Renderer UI polish follows `docs/design/WORKSPACE-UI-SYSTEM.md` and its production CSS tokens: Apple-inspired glass navigation, sharp asset content, stable sidebar, managed Quick Look, focused task sheets and accessible keyboard return. `DESIGN.md` retains domain and permission constraints; its legacy visual palette is superseded by this system.
