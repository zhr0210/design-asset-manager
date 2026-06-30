# Current Task

## Long-Term Goal

Complete the cross-platform maintainability and delivery closure for Design
Asset Manager.

Windows and macOS should share product workflows, contracts, main-process
orchestration, UI state, and tests by default. Branch only for real OS,
runtime, native dependency, packaging, path, or process differences.

## Goal Closure Boundary

This goal is now in closure mode. Do not start new matcher, registry,
metadata, host-default, or platform-boundary cleanup slices just because more
small architecture improvements are possible.

Only continue work that directly advances one of the remaining gated slices in
`Next Implementation Slice`. If a remaining slice requires credentials,
platform environments, explicit IPC contract approval, real icon assets, or
human release approval, record it as blocked by that external input instead of
opening adjacent cleanup work. If all remaining gated slices are either
complete or externally blocked, stop and report the goal as complete or
blocked with the exact unresolved human actions.

## Accepted Baseline

- Real AI Evidence Closure Phase 2 is complete on
  `codex/windows-ai-real-evidence`.
- Windows CUDA, WD Tagger ONNX, CLIP ONNX, and Llama GGUF/mmproj routes have
  real execution evidence.
- macOS WD Tagger ONNX and CLIP ONNX routes have real execution evidence.
- OCR has an explicit generated-image probe on both platforms, but it remains
  evidence-insufficient until dependencies and local model artifacts are
  separately approved and installed.
- Platform AI Branch Status contracts, dedicated macOS/Windows IPC channels,
  shared workflow status, and executable Platform AI Action Plan routing are
  stable.
- Product AI execution fails closed instead of returning simulated model
  output.
- The current branch is pushed to GitHub but is not contained in `main`.

## Platform AI Metadata Matcher Result

- Platform AI runtime metadata now reuses the shared platform adapter matcher
  for platform-name equality instead of keeping a local `platform === ...`
  comparison in shared constants.
- Existing macOS/windows branch platform mapping, Worker probe connection
  marker rules, lane status projection, Platform AI Branch Status IPC
  contracts, renderer behavior, databases, model caches, and user assets are
  unchanged.
- Focused AI Runtime status-workflow tests now require the shared matcher and
  reject restoring direct `platform === expectedPlatform` comparisons. The
  boundary ledger no longer lists Platform AI metadata constants as an
  unresolved platform boundary.
- Electron/Playwright UI validation is intentionally skipped because this
  changes shared metadata predicate internals only and does not alter the
  rendered UI surface.

## Shared Platform Adapter Matcher Result

- Moved the platform adapter matcher into shared workflow code and kept the
  existing main-process import path as a compatibility re-export.
- Electron app lifecycle policy resolution now uses the shared matcher for
  exact platform and default fallback selection instead of local
  `policy.platform === ...` comparisons.
- Existing Windows AppUserModelId behavior, macOS keep-alive behavior,
  default quit behavior, main-process imports, IPC contracts, renderer
  behavior, databases, model caches, and user assets are unchanged.
- Focused lifecycle and AI Python environment tests now prove both the shared
  implementation and the main-process re-export. The AI Runtime
  status-workflow boundary ledger no longer lists the Electron lifecycle
  workflow as an unresolved platform boundary.
- Electron/Playwright UI validation is intentionally skipped because this
  changes shared policy selection internals only and does not alter the
  rendered UI surface.

## Doctor Command Adapter Matcher Result

- Doctor command resolution now reuses the shared main-process platform
  adapter matcher for npm and Python launcher adapter selection.
- Existing Windows `npm.cmd` and `py/python/python3` probe order,
  non-Windows `npm` and `python3/python` probe order, timeout budgeting,
  Doctor check behavior, IPC contracts, renderer behavior, databases, model
  caches, and user assets are unchanged.
- Focused Doctor command resolver tests now require the shared matcher and
  reject restoring direct `candidate.platform === platform` comparisons.
  The AI Runtime status-workflow boundary ledger no longer lists the Doctor
  resolver as an unresolved platform boundary.
- Electron/Playwright UI validation is intentionally skipped because this
  changes internal main-process Doctor command selection only and has no
  renderer surface.

## Llama Runtime Planner Rule Matcher Result

- Llama runtime install planning now reuses the shared main-process platform
  adapter matcher when applying default accelerator and runtime package
  selection rules.
- Platform differences remain in the existing rule tables; architecture and
  accelerator matching remain local to the planner because they are runtime
  package dimensions rather than OS branch orchestration.
- Existing Windows Vulkan fallback, macOS/Linux CPU fallback, CUDA runtime
  package selection, GGUF/mmproj model candidate projection, mirror handling,
  install roots, downloads, IPC contracts, renderer behavior, databases,
  model caches, and user assets are unchanged.
- Focused Llama installer tests now require the shared matcher and reject
  restoring direct `rule.platform === input.platform` planner comparisons.
  The AI Runtime status-workflow boundary ledger no longer lists the planner
  as an unresolved platform boundary.
- Electron/Playwright UI validation is intentionally skipped because this
  changes internal main-process install-plan rule matching only and has no
  renderer surface.

## AI Python Runtime Host Context Result

- Added one AI Python Runtime host-context helper for current platform and
  environment reads.
- The Electron AI Python runtime adapter now consumes that helper when
  creating `AiPythonEnvironment`, instead of passing `process.platform` and
  `process.env` directly into the environment resolver.
- Existing Python executable selection, managed runtime directory
  compatibility, environment override precedence, Windows PATH/install-root
  search, macOS Homebrew fallback, IPC/preload/renderer callers, runtime
  startup policy, model downloads, databases, and user assets are unchanged.
- Added focused host-context coverage and wired it into runtime-safety CI and
  the test map so the host boundary remains explicit on both platform
  runners.
- Focused host-context and AI Python environment tests, complete
  `ci:test-runtime-safety`, typecheck, production build, docs sync, agent
  context check, forbidden-path advisory check, and diff check pass.
  Electron/Playwright UI validation is intentionally skipped because this
  changes internal main-process host-context plumbing only and has no renderer
  surface.

## Llama Governance Platform Registry Result

- Converted Llama Runtime Governance platform normalization from inline
  Windows/macOS/Linux control flow to one explicit supported-platform
  registry.
- Unknown platforms still normalize to `unknown` and keep the external
  OpenAI-compatible adapter as the only governance adapter. Windows and macOS
  adapter selection, external-inference preference, read-only audit policy,
  and disabled auto-download/install/start behavior are unchanged.
- Strengthened the focused Llama governance test to cover the supported
  platform registry, unknown-platform fallback, and a guard against restoring
  inline `platform === ... || ...` normalization.
- Focused Llama governance and AI Runtime status-workflow tests, typecheck,
  production build, docs sync, agent context check, forbidden-path advisory
  check, and diff check pass. Electron/Playwright UI validation is
  intentionally skipped because this changes internal main-process governance
  data only and has no renderer surface.

## Electron Main Host Context Result

- Added one Electron main-process host-context helper for current platform
  reads.
- Main startup and `window-all-closed` lifecycle handling now resolve the
  shared Electron app lifecycle policy from that host context instead of
  reading `process.platform` directly in `src/main/index.ts`.
- Existing Windows AppUserModelId behavior, macOS keep-alive behavior, default
  quit behavior, BrowserWindow creation, IPC registration, runtime startup,
  databases, model caches, user assets, and public contracts are unchanged.
- Strengthened the focused lifecycle test to cover the host-context helper,
  require main to consume it, and guard against restoring direct
  `process.platform` reads in the entrypoint. The platform-boundary ledger now
  records the new helper as the legitimate Electron main host boundary.
- Focused Electron lifecycle and AI Runtime status-workflow tests, governance
  subset, typecheck, production build, docs sync, agent context check,
  forbidden-path advisory check, and diff check pass. Electron/Playwright UI
  validation is intentionally skipped because this changes internal
  main-process lifecycle policy plumbing only and has no renderer surface.

## Platform Detector Flag Registry Result

- Expanded the main-process platform detector from a profile-only registry to
  one data-backed platform/profile flag registry.
- `detectPlatform` now derives `isWindows`, `isMacOS`, and
  `isAppleSilicon` from platform/profile records instead of hard-coded
  platform and architecture comparisons in the return object.
- Existing `PlatformDetection` shape, normalized platform and architecture
  values, Windows/macOS/Linux profile ids, unknown-platform fallback, path
  adapters, runtime registry callers, Doctor callers, settings defaults,
  runtime package executor callers, IPC contracts, renderer behavior,
  databases, model caches, and user assets are unchanged.
- Strengthened the focused platform test to cover unknown-architecture
  Windows/macOS behavior and guard against restoring direct boolean flag
  comparisons.
- Focused platform validation, governance subset, typecheck, production
  build, docs sync, agent context check, forbidden-path advisory check, and
  diff check pass. Electron/Playwright UI validation is intentionally skipped
  because this changes internal main-process platform detection data only and
  has no renderer surface.

## Worker Probe Boolean Label Projection Result

- Added one shared AI Runtime boolean probe label projection table for Worker
  probe display fields.
- Worker probe header display now derives `isMacOSLabel` and
  `isAppleSiliconLabel` through the shared projection helper instead of local
  ternary expressions in the header projector.
- Existing Worker probe response shape, `isMacOS` and `isAppleSilicon`
  evidence fields, branch connection rules, status labels, renderer callers,
  IPC contracts, runtime startup, databases, model caches, and user assets are
  unchanged.
- Strengthened the focused AI Runtime status-workflow test to cover Windows
  false-label projection and guard against restoring direct boolean ternaries
  in the shared workflow. The AI Runtime panel contract test still confirms
  renderer components consume projected display fields.
- Focused AI Runtime status-workflow and panel contract tests, complete
  `ci:test-runtime-safety`, typecheck, production build, docs sync, agent
  context check, forbidden-path advisory check, and diff check pass.
  Electron/Playwright UI validation is intentionally skipped because this
  changes shared display projection internals only and does not alter the
  rendered UI surface.

## Package Smoke Artifact Plan Builder Result

- Converted Package Smoke artifact-plan selection from inline
  `hostDefaults.platform === 'win32'` control flow to one platform-keyed
  artifact-plan builder registry.
- Existing Windows installer/unpacked candidate paths, macOS DMG/app
  candidate paths, fallback `other` behavior, sandbox executable metadata,
  host defaults, CLI flags, report shape, Package Smoke execution, signing
  checks, DMG mount checks, Windows Sandbox behavior, user assets, runtime
  behavior, and public contracts are unchanged.
- Strengthened the Package Smoke focused test to require the builder registry
  and reject restoring the direct Windows platform branch.
- Focused Package Smoke and Node host-platform defaults tests, typecheck,
  production build, docs sync, agent context check, forbidden-path advisory
  check, and diff check pass. Electron/Playwright UI validation is
  intentionally skipped because this changes internal delivery script data
  flow only and has no renderer surface.

## Llama macOS Hardware Profile Projection Result

- Moved Apple Silicon detection, unified-memory VRAM estimation, macOS GPU
  display naming, and Metal/CPU accelerator recommendation into one pure
  Llama macOS hardware-profile projector.
- The Llama installer now consumes that projector inside the existing macOS
  hardware-detection adapter. Existing sysctl/system_profiler reads, Windows
  hardware detection, generic fallback detection, install planning, downloads,
  server startup, model caches, databases, public IPC contracts, and renderer
  behavior are unchanged.
- Added focused projector coverage for Apple Silicon, Intel Mac display
  summaries, and minimum unified-memory VRAM estimation, plus source guards
  against restoring the Apple Silicon rules inline in the installer.
- Focused Llama macOS hardware-profile, Llama governance, and Llama
  host-context tests, complete runtime-safety CI, typecheck, production build,
  docs sync, agent context check, forbidden-path advisory check, and diff
  check pass. Electron/Playwright UI validation is intentionally skipped
  because this changes internal main-process hardware-profile projection only
  and has no renderer surface.

## Worker Probe Connection Predicate Result

- Replaced mixed Worker probe connection accessors
  (`connectionPlatforms` plus `connectionFlag`) with one branch-keyed
  `isConnected` predicate per Platform AI branch.
- macOS still treats `isMacOS` as the connection evidence, and Windows still
  accepts `win32`/`windows` platform markers. Worker probe response shapes,
  branch selection, runtime-lane evidence, accelerator tiles, renderer
  components, IPC contracts, databases, model caches, and user assets are
  unchanged.
- Strengthened the focused AI Runtime status-workflow test so a `darwin`
  probe with `isMacOS=false` remains disconnected and source guards reject
  restoring `connectionFlag` or `connectionPlatforms`.
- Focused AI Runtime status-workflow, AI Runtime panel, and AI Console macOS
  branch tests, complete runtime-safety CI, typecheck, production build,
  docs sync, agent context check, forbidden-path advisory check, and diff
  check pass. Electron/Playwright UI validation is intentionally skipped
  because this changes shared projection internals only and does not alter
  the rendered UI surface.

## Release Branding Icon Target Metadata Result

- Release readiness summaries and release environment manifests now read
  platform branding icon filenames from the shared release platform target
  metadata instead of re-querying branding preflight platform requirements.
- Branding preflight still owns approval-file and branding-check definitions;
  release platform targets own Windows/macOS artifact, runner, signing,
  secret-name, and icon-file metadata. Release evidence shapes, workflow
  dispatch policy, signing gates, package smoke requirements, public scripts,
  renderer behavior, databases, model caches, and user assets are unchanged.
- Strengthened focused release readiness and environment-manifest tests so
  these modules consume `getReleasePlatformTarget` for icon filenames and do
  not restore `brandingPreflight.platforms.find(...)` platform lookups.
- Focused release readiness, release environment manifest, release platform
  targets, release branding preflight, release external-gate status, and
  signed-candidate dispatch-status tests, typecheck, production build, docs
  sync, agent context check, forbidden-path advisory check, and diff check
  pass. Electron/Playwright UI validation is intentionally skipped because
  this changes internal release-governance metadata projection only and has
  no renderer surface.

## Release Signed-Candidate Evidence Check Derivation Result

- Release external-gate status now derives signed-candidate evidence checks
  from shared release candidate common and distribution gate metadata instead
  of maintaining a second Windows/macOS evidence-check table.
- `installerSmoke` remains excluded from signed-candidate evidence and stays
  owned by the distribution install-smoke gate. Prior exported check ordering,
  release evidence shapes, workflow dispatch policy, signing gates, publish
  gates, public scripts, renderer behavior, databases, model caches, and user
  assets are unchanged.
- Strengthened the focused release external-gate status test so the module
  consumes `listReleaseCandidateCommonGates` and
  `listReleaseCandidateDistributionGates`, while rejecting restoration of the
  old platform-specific evidence-check table.
- Focused release external-gate status, release candidate governance, release
  flow governance, release readiness summary, release external-gate status
  writer, and release evidence-bundle status tests, typecheck, production
  build, docs sync, agent context check, forbidden-path advisory check, and
  diff check pass. Electron/Playwright UI validation is intentionally skipped
  because this changes internal release-governance metadata derivation only
  and has no renderer surface.

## OCR Dependency Governance Metadata Result

- OCR dependency governance now projects provider runtime profile and blocking
  issue policy from one provider-keyed metadata table instead of branching on
  the mock provider inside the plan factory.
- OCR dependency risk evidence now comes from one read-only risk registry and
  is copied per plan result, preserving redacted evidence while preventing
  caller mutation from leaking into later projections.
- Existing EasyOCR/RapidOCR/PaddleOCR local runtime profile behavior, mock-only
  behavior, `autoInstall: false`, deferred installer policy, Doctor check
  intent, IPC behavior, runtime startup, databases, model caches, and user
  assets are unchanged.
- Focused OCR dependency governance test, typecheck, production build, docs
  sync, agent context check, forbidden-path advisory check, and diff check
  pass. Electron/Playwright UI validation is intentionally skipped because
  this changes internal read-only OCR governance projection only and has no
  renderer surface.

## Product Text-Box Provider Normalization Result

- Product text-box provider normalization now lives in one shared workflow
  consumed by main-process settings loading/saving and the AI Console route,
  replacing duplicated renderer/main `mock` to `none` fallback rules.
- The settings service keeps its existing `normalizeProductTextBoxProvider`
  export as a compatibility re-export while using the shared implementation.
- Existing persisted settings shape, selectable AI Console OCR providers,
  legacy `mock` fallback behavior, IPC contracts, databases, model caches,
  and user assets are unchanged.
- Focused settings-defaults, real-worker guard, node host-platform defaults,
  typecheck, production build, docs sync, agent context check,
  forbidden-path advisory check, and diff check pass. Electron/Playwright UI
  validation is intentionally skipped because this changes shared
  normalization ownership only and does not alter the rendered provider
  controls.

## OCR Selected-Provider Availability Projection Result

- OCR dependency selected-provider availability now lives in one shared
  workflow that projects `selectedProviderAvailable` from existing provider
  evidence, replacing the dependency service's local provider if/else chain.
- The dependency service still owns Python environment probing, provider
  evidence construction, cached OCR environment writes, install commands, and
  failure defaults. The shared workflow only interprets the already-collected
  provider availability fields.
- Existing OCR IPC contracts, payload shape, EasyOCR/RapidOCR/PaddleOCR/mock
  availability semantics, installer behavior, runtime startup, databases,
  model caches, and user assets are unchanged.
- Focused OCR dependency governance test, typecheck, production build, docs
  sync, agent context check, forbidden-path advisory check, and diff check
  pass. Electron/Playwright UI validation is intentionally skipped because
  this changes internal OCR dependency payload projection ownership only and
  has no renderer surface.

## Text-Box Provider Execution Plan Projection Result

- Color Palette text-box detection now consumes a shared execution plan that
  maps product provider selection to execution provider type, unavailable
  skip reason, and mock-provider marker instead of maintaining local
  provider if/else chains.
- Main-process text-detection provider types now reuse the shared execution
  provider union so factory strings and product workflow projection stay
  aligned.
- Existing text-color analysis settings, OCR dependency checks, manual text
  box input behavior, provider execution, skip/failure statuses, IPC
  contracts, databases, model caches, and user assets are unchanged.
- Focused text-box provider workflow, settings-defaults, OCR dependency
  governance tests, typecheck, production build, docs sync, agent context
  check, forbidden-path advisory check, and diff check pass.
  Electron/Playwright UI validation is intentionally skipped because this
  changes internal text-color provider execution planning only and has no
  renderer surface.

## Visual Analysis Skip Reason Copy Metadata Result

- Visual Analysis Snapshot text-color skipped-state copy now comes from one
  shared skip-reason message table instead of a local switch.
- Existing persisted palette parsing, renderer snapshot shape, skipped and
  failed panel states, foreground/background swatch projection, IPC contracts,
  databases, model caches, and user assets are unchanged.
- Focused Visual Analysis Snapshot test, typecheck, production build, docs
  sync, agent context check, forbidden-path advisory check, and diff check
  pass. Electron/Playwright UI validation is intentionally skipped because
  this changes shared copy projection internals only and does not alter the
  rendered UI surface.

## Text-Box Provider Execution Descriptor Result

- Text-box provider execution planning now uses one descriptor table for
  execution provider type, availability reader, unavailable skip reason, and
  mock-provider marker instead of separate maps plus provider comparisons.
- Existing product provider normalization, Color Palette execution behavior,
  OCR dependency evidence use, text-detection provider strings, skipped
  statuses, IPC contracts, databases, model caches, and user assets are
  unchanged.
- Focused text-box provider workflow test, typecheck, production build,
  docs sync, agent context check, forbidden-path advisory check, and diff
  check pass. Electron/Playwright UI validation is intentionally skipped
  because this changes shared text-box provider execution-plan metadata only
  and does not alter the rendered UI surface.

## Python Runtime Compatibility Status Metadata Result

- Python MPS/CUDA compatibility display now reads incompatible-state label
  and tone from one shared status metadata table instead of branching on
  `planned` inside the shared projector.
- Existing macOS/Windows runtime labels, compatible and unchecked display
  behavior, platform runtime request selection, IPC contracts, databases,
  model caches, and user assets are unchanged.
- Focused AI Runtime status workflow test, typecheck, production build,
  docs sync, agent context check, forbidden-path advisory check, and diff
  check pass. Electron/Playwright UI validation is intentionally skipped
  because this changes shared compatibility display metadata only and does
  not alter the rendered UI surface.

## Platform AI Branch Action Button Display Metadata Result

- Platform AI branch workflow cards now receive action-button visibility and
  icon intent from shared display projection instead of branching on workflow
  status and action-plan kind inside the AI Console renderer.
- Existing action-plan kinds, command routing, disabled planned-capability
  behavior, runtime-lane display, IPC contracts, databases, model caches, and
  user assets are unchanged.
- Focused Platform AI branch display and AI Console macOS branch contract
  tests, typecheck, production build, docs sync, agent context check,
  forbidden-path advisory check, and diff check pass. Playwright UI
  validation is intentionally skipped because the repository does not yet
  provide an isolated temporary-userData Electron smoke harness; launching
  the desktop app directly could touch real local app data.

## AI Console GPU Health Display Metadata Result

- AI Console GPU risk status, service-health label, and bar tone now come
  from shared overview display metadata instead of renderer-local or
  projector-local ternary expressions.
- Existing GPU telemetry inputs, risk thresholds, overview card layout, IPC
  contracts, databases, model caches, and user assets are unchanged.
- Focused AI Console overview workflow and macOS branch contract tests,
  typecheck, production build, docs sync, agent context check, forbidden-path
  advisory check, and diff check pass. Playwright UI validation is
  intentionally skipped because the repository does not yet provide an
  isolated temporary-userData Electron smoke harness; launching the desktop
  app directly could touch real local app data.

## AI Console Isolated UI Smoke Harness Result

- Added a reusable Electron/Playwright AI Console smoke harness that launches
  the app with a temporary `userData` profile, opens the AI Console, captures
  the Platform AI Branch Status panel screenshot under `dist-temp`, checks
  viewport overflow, and removes the temporary profile on exit.
- The harness does not start model services, install dependencies, download
  model artifacts, or call runtime probe IPC; it only verifies the shared UI
  surface can render safely in an isolated desktop profile.
- Focused smoke-harness contract test, typecheck, production build, isolated
  Electron/Playwright AI Console smoke screenshot, docs sync, agent context
  check, forbidden-path advisory check, and diff check pass.

## Platform AI Branch Platform Helper Result

- Moved Platform AI Branch Status branch-to-OS current-platform mapping into
  shared Platform AI runtime metadata constants.
- Main-process branch-status projection now consumes
  `isPlatformAiBranchCurrentPlatform`; workflow topology, runtime-lane
  evidence/missing projection, dedicated IPC channel names, preload methods,
  renderer behavior, runtime startup, model downloads, model caches,
  databases, and user assets are unchanged.
- Focused projector/status-workflow tests guard that the shared helper owns
  the macOS/windows platform mapping and that the projector does not restore
  local branch-platform maps.
- Focused projector/display/status-workflow and AI Runtime IPC tests,
  typecheck, production build, runtime-safety subset, complete governance,
  docs sync, agent-context check, forbidden-path advisory check, and diff
  check pass. Electron/Playwright UI validation is intentionally skipped
  because this slice changes shared/main-process projection ownership only and
  has no renderer surface.

## Llama Runtime Host Context Result

- Added one Llama runtime host-context helper for current platform,
  architecture, CPU-thread count, CPU model, and memory reads.
- Llama installer hardware detection and process adapter selection now consume
  the shared host context instead of reading Node process/os globals through
  installer flow. macOS, Windows, and generic hardware probes remain concrete
  adapters, and user-triggered download/install/start behavior is unchanged.
- Added focused host-context and governance tests, wired the host-context test
  into runtime-safety CI and the test map, and updated the platform-boundary
  ledger to record the new helper as the legitimate Llama host boundary.
- Focused Llama host-context/governance/installer and AI Runtime status
  workflow tests, typecheck, production build, runtime-safety subset, complete
  governance, docs sync, agent-context check, forbidden-path advisory check,
  and diff check pass. Electron/Playwright UI validation is intentionally
  skipped because this slice changes internal main-process host-context
  plumbing only and has no renderer surface.

## Llama Planner Host Defaults Result

- Extended the Llama runtime host-context helper to planner defaults so
  hardware-profile creation, default accelerator selection, and runtime
  package pattern defaults no longer read Node process/os globals directly.
- Existing explicit target-platform planning remains unchanged: callers can
  still pass platform, architecture, CPU, and memory values, and Windows
  without NVIDIA evidence still defaults to Vulkan while macOS/Linux default
  to CPU.
- Strengthened Llama planner and host-context tests so planner source must
  consume `createLlamaRuntimeHostContext` and must not restore direct
  `process.platform`, `process.arch`, `os.cpus`, or `os.totalmem` reads.
- Focused Llama host-context/installer/governance and AI Runtime status
  workflow tests, typecheck, production build, runtime-safety subset, complete
  governance, docs sync, agent-context check, forbidden-path advisory check,
  and diff check pass. Electron/Playwright UI validation is intentionally
  skipped because this slice changes internal main-process planning defaults
  only and has no renderer surface.

## AI Runtime IPC Host Context Result

- Added one AI Runtime host-context helper for current platform, architecture,
  and home directory reads.
- AI Runtime IPC bootstrap and Platform AI Branch Status projection now
  consume the shared host context instead of reading Node process/os globals
  directly in `ai-runtime.ipc.ts`.
- Existing AI Runtime IPC channel names, request/response contracts,
  bootstrap provider registration, branch-status response shape, runtime
  startup policy, model evidence collection, renderer/preload callers,
  databases, model caches, and user assets are unchanged.
- Added focused host-context and IPC contract tests, wired the host-context
  test into runtime-safety CI and the test map, and updated the platform
  boundary ledger to record the helper as the legitimate AI Runtime IPC host
  boundary.
- Focused AI Runtime host-context/IPC/status-workflow tests, typecheck,
  production build, runtime-safety subset, complete governance, docs sync,
  agent-context check, forbidden-path advisory check, and diff check pass.
  Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal main-process host-context plumbing only and has no
  renderer surface.

## Desktop Viewport Policy Result

- Added one shared Desktop Viewport Policy for Electron BrowserWindow default
  and minimum outer sizes plus renderer AppShell minimum content sizes.
- Main-process window creation and renderer desktop shell layout now consume
  the same policy instead of carrying separate hard-coded width and height
  constants.
- The policy keeps platform differences out of the UI state surface: Windows
  and macOS use the same desktop shell dimensions, with only a small outer
  window frame allowance encoded once for Electron.
- Added a focused contract test that verifies policy relationships, main and
  renderer imports, npm script wiring, and prevents the prior `1024`/`700` and
  `DESKTOP_MIN_WIDTH`/Tailwind `min-w` drift from returning.
- Existing IPC channels, AI runtime contracts, renderer routes, model caches,
  runtime databases, user assets, and public response shapes are unchanged.
- Focused policy test, `ci:test-governance`, typecheck, production build,
  docs sync, agent-context check, forbidden-path advisory check, and diff
  check pass.
- Isolated Playwright UI validation served the built renderer only and opened
  AI Console at `1120x720`: document/body horizontal overflow were absent,
  Platform AI Branch Status was visible, and the screenshot was saved outside
  the repository.

## App Navigation Workflow Result

- Added one shared App Navigation workflow for route ids, absolute paths,
  nested route segments, sidebar labels, topbar titles, browser-shell routing,
  topbar visibility, default route, fallback title, and download-badge
  visibility.
- App route registration, AppShell browser/topbar decisions, Sidebar
  navigation labels/badges, and Topbar titles now consume the same shared
  navigation metadata. Renderer-owned icon mapping remains local to avoid
  moving lucide UI dependencies into shared code.
- Windows and macOS keep one shared renderer navigation surface; no
  platform-specific route, IPC, AI runtime, packaging, database, model cache,
  or user asset behavior changed.
- Focused navigation and desktop-shell tests, typecheck, production build,
  governance subset, docs sync, agent-context check, forbidden-path advisory
  check, and diff check pass.
- Isolated Playwright UI validation served the built renderer only and opened
  `#/dashboard`, `#/ai-console`, and `#/browser` at `1120x720`: document/body
  horizontal overflow were absent on all three routes, dashboard and AI
  Console showed the shared Topbar/Sidebar, and browser route used the
  no-Topbar/no-Sidebar browser shell. Screenshots were saved outside the
  repository.

## Electron App Lifecycle Policy Result

- Moved Electron app lifecycle policy into shared workflow metadata for
  platform, Windows AppUserModelId, macOS quit-on-close behavior, and default
  quit behavior.
- Main process startup now consumes `resolveElectronAppLifecyclePolicy` from
  shared code instead of keeping local Windows/macOS policy tables in
  `src/main/index.ts`.
- Existing startup behavior is preserved: Windows sets the existing
  AppUserModelId and quits when all windows close; macOS keeps the app active
  after all windows close; other platforms quit by default.
- No IPC channel, renderer route, runtime behavior, database, model cache,
  packaging output, user asset, or public response shape changed.
- Focused lifecycle, app-navigation, and desktop-viewport tests, typecheck,
  production build, governance subset, docs sync, agent-context check,
  forbidden-path advisory check, and diff check pass.
- The first GitHub governance run failed on both platforms because the
  AI Runtime platform-boundary ledger did not yet include the new shared
  Electron lifecycle policy file. The ledger now records that legitimate
  non-runtime platform boundary while the dedicated lifecycle test keeps the
  policy Electron-free. The focused status-workflow test and complete
  `ci:governance` suite pass after the ledger update.
- UI screenshot validation is intentionally skipped because this slice changes
  main-process startup policy selection only and has no renderer surface.

## AI Console Dependency Install Display Result

- Moved AI Console runtime dependency install toast copy, log copy, duration
  formatting, package-failure summaries, and managed-runtime labels into the
  shared AI Console overview workflow projection.
- The renderer still calls the existing explicit `macosAiInstallDeps` preload
  method; no Windows install action, IPC channel, runtime download, model
  download, database access, user asset access, or public response shape
  changed.
- Added the existing AI Console overview workflow and macOS dependency
  installer contract tests to npm scripts, cross-platform runtime-safety CI,
  and the test map so the shared renderer projection runs on both platform
  runners.
- Focused overview/install/display tests, runtime-safety subset, typecheck,
  production build, docs sync, agent-context check, forbidden-path advisory
  check, and diff check pass.
- Isolated Playwright validation served the built renderer only with a minimal
  preload mock at `1120x720`: Platform AI Branch Status, macOS route overview,
  and the dependency install button were visible with no document/body
  horizontal overflow. The test did not click the install button or start any
  dependency installation.

## Doctor Command Resolver Result

- Moved Doctor npm command selection, Python launcher priority, and Python
  command timeout budgeting into one shared main-process command resolver.
- Node and Python checks now execute the resolved commands while keeping their
  existing check ids, labels, detail keys, warning behavior, packaged-Electron
  npm skip behavior, pip routing through the detected launcher, and public
  Doctor report shape unchanged.
- Added a focused command-resolver test and wired it into npm scripts,
  `ci:test-governance`, and the test map.
- No IPC channel, renderer UI, runtime startup, dependency installation,
  model download, database access, user asset access, or public response shape
  changed.
- Focused Doctor command, Doctor aggregate/service, governance subset,
  typecheck, production build, Doctor CI, docs sync, agent-context check,
  forbidden-path advisory check, and diff check pass. Doctor CI retains the
  expected stopped-worker warnings.
- The first GitHub governance run failed on both platforms because the
  AI Runtime platform-boundary ledger did not yet include the new shared Doctor
  command resolver. The ledger now records that legitimate main-process
  platform adapter while the focused Doctor command-resolver test keeps command
  selection centralized.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes main-process Doctor command resolution only and has no
  renderer surface.

## Text Color QA Host Defaults Result

- Exposed the shared Node CLI host defaults as a read-only JSON CLI so
  non-Node helper scripts can consume the same host command registry.
- `run-text-color-tests.py` now resolves its npm command through
  `node-host-platform-defaults.mjs` instead of keeping a Python-side
  Windows/macOS ternary.
- Existing text-color QA checks, typecheck/build execution, output shape, and
  exit-code behavior are preserved.
- The script's stale static guards now check the current AI Console
  text-box-provider normalizer and shared Visual Analysis Snapshot projector
  instead of old Settings/ColorPalettePanel-local strings.
- Added focused source and CLI assertions to `test-node-host-platform-defaults`
  so Package Smoke, local platform verification, Python unittest, and
  text-color QA helpers stay on the shared host defaults.
- No renderer, Electron main process, IPC, AI runtime, model download,
  package smoke action, release action, database access, or user asset access
  changed.
- Focused host-default tests, the text-color QA helper, Visual Analysis
  Snapshot test, governance subset, typecheck/build, docs sync, agent-context
  check, forbidden-path advisory check, and diff check pass. Electron/
  Playwright UI validation is intentionally skipped because this slice changes
  internal script host defaults and static QA guards only.

## AI Python Environment Module Result

- Deepened the former pass-through AI Python Runtime Module into one shared
  AI Python Environment Interface with a pure implementation and Electron IO
  Adapter.
- Managed-runtime preference, environment overrides, torch import validation,
  old-venv fallback, Windows PATH/install-root search, macOS Homebrew fallback,
  and platform executable layout now have one locality.
- AI Worker, runtime bootstrap, GPU/Memory Guard, model operations, EasyOCR,
  PaddleOCR, RapidOCR, OCR Healthcheck, and OCR dependency workflows now use
  the same resolver. Duplicate RapidOCR and Healthcheck implementations were
  removed.
- The existing managed directory name remains unchanged for compatibility;
  callers and new exports use platform-neutral terminology. The old macOS
  export names remain aliases for internal compatibility.
- Focused in-memory behavior tests cover macOS managed/current/old runtimes,
  Homebrew and environment precedence, Windows managed layout, WindowsApps
  filtering and install-root fallback, plus Linux default behavior.
- Existing IPC channels, response shapes, explicit installation actions,
  renderer behavior, model caches, and user assets are unchanged. The new
  focused test runs in cross-platform Runtime Safety CI.
- Focused tests, typecheck, production build, complete governance, 142 Python
  tests, docs sync, agent context, forbidden-path advisory, and diff checks
  pass. Doctor retains the expected stopped-worker warnings.
- This slice has no renderer change, so UI screenshot validation is skipped;
  Windows and macOS GitHub CI are the host acceptance gate after push.

## Runtime Package Product Flow Result

- Added the three approved shared IPC channels, a path-free discriminated
  response contract, main-process native manifest selection, allowlist
  projection, preload methods, and one shared Windows/macOS renderer flow.
- The Chinese UI supports local selection, preview, explicit confirmation,
  polling, progress, success, structured failure, and rollback states. It
  does not expose paths, hashes, internal messages, raw executor data,
  progress events, cancellation, remote/model packages, scripts, or automatic
  runtime start.
- Focused handler, leakage, workflow, panel, preflight, governance, session,
  and AI Runtime IPC tests pass. Typecheck, production build, 142 Python
  tests, docs sync, agent context, forbidden-path advisory check, diff check,
  and the complete `ci:governance` suite pass. Doctor CI retains the expected
  warnings for the intentionally stopped AI Worker.
- Renderer interaction was verified in isolated Chrome with a preload mock at
  1280x720 and 1008x725: selection, confirmation, polling, completion, 100%
  progress, and horizontal-overflow checks all passed. Screenshots and the
  temporary harness remain outside the repository.
- A renderer-only dev command unexpectedly launched Electron. Native database
  initialization failed before any contents were read or modified; the
  process was stopped immediately. Subsequent UI checks used isolated Chrome
  only.

## Shared Doctor Python Probe Result

- The Windows governance job reproduced the same failure on its first run and
  failed-job rerun: all runtime-safety tests passed, then the Python Doctor
  check exhausted its five-second outer timeout before reaching a usable
  launcher.
- Replaced the single Windows-only `py` metadata entry with ordered launcher
  adapters. Windows now prefers `py` before `python`/`python3`; macOS and other
  hosts prefer `python3` before `python`.
- Launcher fallbacks run sequentially with per-command timeouts derived from a
  bounded fraction of the existing outer check budget. The worst-case version
  probes plus pip probe remain below that outer budget.
- Pip is checked through the detected launcher rather than always invoking
  `python`; unneeded candidates remain visible as skipped while the existing
  `python`, `python3`, `pyLauncher`, and `pip` detail keys are preserved.
- Focused tests cover Windows preferred/fallback launchers, non-Windows
  preference, missing-Python behavior, selected-interpreter pip routing, and
  worst-case timeout allocation.
- Existing Doctor check id, warning/error aggregation, shared response shape,
  IPC/preload/renderer callers, settings, runtime startup, install/download
  behavior, and user data access are unchanged.
- Focused Doctor/service tests, local Doctor CI, typecheck, production build,
  142 Python tests, docs sync, agent context, forbidden-path advisory check,
  diff check, and the complete `ci:governance` suite pass. Local Doctor retains
  the expected warnings for the intentionally stopped AI Worker.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes a main-process command probe only and has no renderer surface.
  The Windows and macOS GitHub jobs are the required dual-platform acceptance
  gate after the fix is pushed.

## Python MPS/CUDA IPC Orchestration Result

- Added separate discriminated descriptor registries for the existing Python
  MPS/CUDA compatibility-status and execution-probe channel bindings.
- Status descriptors preserve the exact AI Client status method and response
  type for each platform lane. Execution descriptors additionally bind each
  probe method to its exact `python_mps` or `python_cuda` evidence lane.
- Both descriptor groups now register through shared handler factories while
  preserving success/failure wrapping, channel-specific logging, and execution
  evidence recording.
- Strengthened the IPC contract test to require the descriptor/factory flow,
  reject copied direct handlers, and guard against cross-wiring MPS/CUDA
  methods or evidence lanes.
- Added the existing Python execution evidence behavior test to package
  scripts, the cross-platform runtime-safety CI suite, and the test map.
- Existing IPC channel names, shared response types, AI Client probe methods,
  preload/renderer callers, evidence freshness rules, and runtime behavior are
  unchanged.
- Focused IPC/evidence tests, typecheck, production build, 142 Python tests,
  docs sync, agent context, forbidden-path advisory check, diff check, and the
  complete `ci:governance` suite pass. Doctor CI still reports the expected AI
  Worker not-reachable warning because the worker is not started for this
  slice.
- Electron/Playwright UI validation and a dedicated Windows host run are
  intentionally skipped because this slice changes internal main-process IPC
  registration only, has no renderer surface, and is covered by the same
  cross-platform runtime-safety CI entry on both platform runners.

## Raw Platform Capability IPC Registration Result

- Added one descriptor registry for the existing macOS and Windows raw
  capability channel/probe-method pairs.
- A discriminated descriptor union binds each channel to its platform-specific
  capability response type, preventing cross-platform probe/response pairing.
- Both capability channels now register through one handler factory for
  success wrapping, channel-specific error logging, and failure wrapping.
- Existing channel names, AI Client methods, capability response types,
  timeout/offline behavior, preload methods, and the semantic separation from
  Platform AI Branch Status are preserved.
- Strengthened the IPC contract test to require descriptor-driven capability
  registration and reject copied direct handlers for either platform.
- Updated the AI Platform Branch Reuse Assessment to record the shared
  registration flow while retaining distinct capability adapters.
- No capability probe implementation, runtime action, public IPC contract,
  preload, renderer, UI, model download, local service start, settings
  mutation, or user asset access changed.
- Focused IPC/macOS runtime/AI Console/panel tests, typecheck, production
  build, 142 Python tests, docs sync, agent context, forbidden-path advisory
  check, diff check, and the complete `ci:governance` suite pass. Doctor CI
  still reports the expected AI Worker not-reachable warning because the
  worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice has no renderer change and the repository has no isolated Electron UI
  harness that avoids the existing user database.

## Platform AI Branch Status IPC Orchestration Result

- Added one descriptor registry for the approved macOS and Windows Platform AI
  Branch Status IPC channel/platformBranch pairs.
- Both dedicated channels now register through one handler factory for model
  readiness collection, runtime snapshots, Python execution evidence,
  projection, success wrapping, logging, and failure wrapping.
- Existing channel names, preload methods, response shape, per-channel
  `platformBranch`, evidence/missing semantics, and read-only behavior are
  preserved.
- Strengthened the IPC contract test to require descriptor-driven registration,
  exactly one projector orchestration body, and no copied direct registration
  for the two branch-status channels.
- Updated ADR-0006 to record that dedicated public channels share internal
  main-process orchestration.
- No runtime action, public IPC contract, preload, renderer, UI, hardware
  probe, model download, local service start, settings mutation, or user asset
  access changed.
- Focused IPC/display/AI Console/panel tests, typecheck, production build, 142
  Python tests, docs sync, agent context, forbidden-path advisory check, diff
  check, and the complete `ci:governance` suite pass. Doctor CI still reports
  the expected AI Worker not-reachable warning because the worker is not
  started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice has no renderer change and the repository has no isolated Electron UI
  harness that avoids the existing user database.

## Llama Target Platform Planning Result

- `createHardwareProfile` now resolves its target platform and architecture
  before selecting the default Llama accelerator.
- `recommendAccelerator` accepts an optional target platform while preserving
  its existing two-argument callers and host-default behavior.
- Explicit Windows plans without NVIDIA evidence select Vulkan; explicit
  macOS and Linux plans select CPU regardless of the host executing the
  planner. CUDA 12/13 selection and explicit accelerator overrides are
  unchanged.
- Focused tests cover cross-host Windows/macOS/Linux recommendations, profile
  creation, existing runtime package selection, local models, governance, and
  server probe behavior, with a source guard against reading `process.platform`
  inside the target-platform rule lookup.
- Added `test-llama-runtime-installer` to `ci:test-runtime-safety` and the test
  map so both GitHub platform runners execute the target-platform contract.
- Updated Llama Runtime Governance with the deterministic planning rule.
- No IPC, preload, renderer, shared response type, hardware command execution,
  model download, local service start, settings mutation, or user asset access
  changed.
- Focused Llama tests, typecheck, production build, 142 Python tests, docs
  sync, agent context, forbidden-path advisory check, diff check, and the
  complete `ci:governance` suite pass. Doctor CI still reports the expected AI
  Worker not-reachable warning because the worker is not started for this
  slice.
- Electron/Playwright UI validation is intentionally skipped because this is
  a pure main-process planning change with no renderer surface.

## Node CLI Host Defaults Result

- Added `node-host-platform-defaults.mjs`, one shared Node CLI registry for npm
  command names, PATH executable extensions, and isolated Python unittest
  launcher candidates on Windows, macOS, and other hosts.
- Package Smoke host defaults now compose the shared CLI defaults with only
  Package Smoke-specific artifact check ids and Authenticode availability.
- Local platform verification and the Python unittest runner consume the same
  host registry instead of branching directly on `process.platform`.
- Resolve/list helpers deeply clone executable extension lists, Python
  candidate arrays, and candidate arguments; focused tests prove callers
  cannot mutate shared state and guard all three consumers against restoring
  direct host comparisons.
- Existing CLI flags, npm/Python candidate ordering, Package Smoke output,
  execution ordering, test isolation, and exit behavior are preserved.
- Added `test-node-host-platform-defaults` to `ci:governance` and the test map,
  and updated CI Matrix and Package Smoke documentation.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, Package Smoke host action, signing, notarization, workflow
  execution, or publishing behavior changed.
- Focused host-default/Package Smoke/platform-script/Python-isolation tests,
  the real 142-test Python unittest runner, typecheck, production build, docs
  sync, agent context, forbidden-path advisory check, diff check, and the
  complete `ci:governance` suite pass. Doctor CI still reports the expected AI
  Worker not-reachable warning because the worker is not started for this
  slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal CLI host data only and has no renderer surface.

## Release Script Artifact Definitions Result

- Deepened `release-script-targets.mjs` with one script-side platform target
  registry for primary/allowed artifact extensions and branding icon file,
  format, and evidence check id.
- Checksum, update-metadata, and branding-evidence scripts now consume the
  registry instead of re-encoding Windows/macOS artifact-selection ternaries.
- The registry remains private and exposes clone-on-read resolve/list helpers;
  focused tests prove returned extension lists cannot mutate shared state.
- Existing CLI flags, evidence file names, report shapes, validation behavior,
  exit codes, and workflow behavior are preserved. Trust verification commands
  remain explicit platform adapters.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, Package Smoke execution, signing, notarization, workflow
  execution, or publishing behavior changed.
- Updated Release Flow Governance with the deeper script target module.
- Focused target/checksum/update-metadata/branding tests, typecheck, production
  build, 142 Python tests, docs sync, agent context, forbidden-path advisory
  check, diff check, and the complete `ci:governance` suite pass. Doctor CI
  still reports the expected AI Worker not-reachable warning because the
  worker is not started for this slice.
- Electron/Playwright UI validation and Windows host validation are
  intentionally skipped because this slice changes internal, platform-neutral
  release script data only and has no renderer or host-action surface.

## Package Smoke Host Defaults Result

- Added `package-smoke-host-defaults.mjs`, a shared host-default registry for
  Package Smoke platform choices.
- `package-smoke.mjs` now consumes that registry for host npm command name,
  unpacked artifact check id, PATH executable extensions, and Authenticode
  availability instead of inlining direct platform ternaries for those
  defaults.
- Existing Package Smoke report shape, artifact checks, build command,
  launch behavior, sandbox generation, DMG install smoke, and exit-code
  behavior are preserved. Windows Sandbox execution, DMG mounting, and
  Authenticode probing remain explicit platform actions in the smoke script.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, signing, notarization, workflow execution, or publishing
  behavior changed.
- Updated the Package Smoke tool doc with the host-default registry boundary.
- Focused Package Smoke, signed-release workflow, install-smoke preflight, and
  release readiness writer tests, typecheck, production build, docs sync,
  agent context, forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release/package smoke script defaults only and has no
  renderer surface.

## Release External Gate Evidence Checks Result

- Converted `release-external-gate-status.ts` signed-candidate evidence
  satisfaction from direct `summary.platform === 'macos'` control flow to a
  shared platform data registry.
- Added `listReleaseSignedCandidateEvidenceChecks` with clone-on-read behavior
  so tests and future status projectors can reuse the required check list
  without mutating shared state.
- Existing Windows/macOS external gate statuses, missing evidence, aggregate
  counts, overall status, next external actions, safety flags, and path-free
  output shape are preserved.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, Package Smoke execution, signing, notarization, workflow
  execution, or publishing behavior changed.
- Updated the release governance doc with the data-backed signed-candidate
  evidence check boundary.
- Focused release external gate plan/status/status-writer and readiness
  summary tests, typecheck, production build, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete `ci:governance`
  suite pass. Doctor CI still reports the expected AI Worker not-reachable
  warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release governance data only and has no renderer
  surface.

## Release Candidate Distribution Gates Result

- Converted `release-flow-governance.ts` distribution gate selection from
  direct `input.platform === 'windows'` control flow to a shared platform data
  registry.
- Added `listReleaseCandidateDistributionGates` and
  `listReleaseCandidateCommonGates` clone-on-read helpers so tests and future
  governance projectors can reuse gate definitions without mutating shared
  state.
- Existing Windows candidate, Windows distribution, macOS publish-ready,
  blocker order, stage transitions, publish approval behavior, gate labels, and
  output shapes are preserved.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, Package Smoke execution, signing, notarization, workflow
  execution, or publishing behavior changed.
- Updated the release governance doc with the data-backed distribution gate
  boundary.
- Focused release candidate governance/readiness summary/readiness writer/
  external gate status tests, typecheck, production build, docs sync, agent
  context, forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release governance data only and has no renderer
  surface.

## Release Install Smoke Preflight Result

- Converted `release-install-smoke-preflight.ts` from direct
  `platform === 'windows'` control flow to a shared platform data registry.
- Added `listReleaseInstallSmokePreflights` and clone-on-read behavior so
  release environment/readiness consumers can reuse definitions without
  mutating shared state.
- Existing Windows Sandbox and macOS DMG install smoke ids, commands,
  execution hosts, path/secret policies, and downstream release environment
  manifest output are preserved.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, Package Smoke execution, Windows Sandbox execution, DMG
  mounting, signing, notarization, workflow execution, or publishing behavior
  changed.
- Updated the release governance doc with the data-backed install smoke
  preflight boundary.
- Focused release install smoke preflight/environment manifest/readiness
  writer/external gate plan tests, typecheck, production build, docs sync,
  agent context, forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release governance data only and has no renderer
  surface.

## Electron Builder Runner Options Result

- Added `electron-builder-runner-options.mjs`, a shared helper for the direct
  Electron Builder runner's platform choices, build modes, signing modes,
  builder flags, signing environment scrub list, and platform signing
  requirements.
- `run-electron-builder.mjs` now consumes the helper instead of inlining
  Windows/macOS builder flags and signing environment requirements.
- Existing `pack:win`, `pack:mac`, `dist:win`, `dist:mac`, dry-run output,
  protected passthrough options, publishing-disabled behavior, signing
  approval gate, and macOS identity behavior are preserved.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, signing, notarization, workflow execution, or publishing
  behavior changed.
- Added focused Electron Builder runner option coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated Electron packaging audit and CI matrix docs with the shared runner
  option boundary.
- Focused Electron Builder runner option/runner/package-script/signed-release
  workflow tests, typecheck, production build, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete `ci:governance`
  suite pass. The first `ci:governance` attempt failed because an existing
  signed-release workflow test still expected the old inline signing env
  constant; the assertion was updated to the shared helper and the same command
  then passed. Doctor CI still reports the expected AI Worker not-reachable
  warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal packaging CLI governance only and has no renderer
  surface.

## Release Trust Evidence Check Result

- Added `release-trust-evidence-checks.mjs`, a shared trust-evidence check id
  and readiness-binding registry for direct release workflow scripts.
- The trust verifier and readiness writer now consume the same trust check ids
  and platform readiness bindings. Windows Authenticode and macOS Developer ID,
  Hardened Runtime, notarization, staple, Gatekeeper, and DMG integrity remain
  explicit platform data, but the mapping is no longer duplicated in multiple
  scripts.
- Existing CLI flags, default output file names, output shapes, and workflow
  semantics are preserved.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, signing, notarization, workflow execution, or publishing
  behavior changed.
- Added focused release trust evidence check coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the shared trust evidence
  check boundary.
- Focused release trust evidence check/trust verifier/readiness writer tests,
  typecheck, production build, docs sync, agent context, forbidden-path
  advisory check, diff check, and the complete `ci:governance` suite pass. The
  first sandboxed `ci:governance` attempt failed because the Llama server probe
  could not listen on `127.0.0.1`; the same command passed after loopback
  permission was granted. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release CLI governance only and has no renderer
  surface.

## Release Script Target Result

- Added `release-script-targets.mjs`, a shared target parser and evidence
  file-name helper for plain Node release scripts executed directly by
  workflows.
- Checksum, update metadata, trust evidence, and branding evidence scripts now
  consume the shared script helper instead of each hard-coding Windows/macOS
  and x64/arm64 target choices.
- Existing CLI flags, default output file names, output shapes, and workflow
  semantics are preserved. Real platform differences such as Windows ICO vs
  macOS ICNS validation remain inside the branding verifier.
- No runtime behavior, IPC, preload, renderer caller, UI, model download, user
  asset, candidate binary read, release secret read, GitHub settings
  read/mutation, signing, notarization, workflow execution, or publishing
  behavior changed.
- Added focused release script target coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the shared script target
  boundary.
- Focused release script target/checksum/update metadata/trust evidence/
  branding evidence tests, typecheck, production build, 142 Python tests, docs
  sync, agent context, forbidden-path advisory check, diff check, and the
  complete `ci:governance` suite pass. Full governance required loopback
  permission for the Llama server probe. Doctor CI still reports the expected
  AI Worker not-reachable warning because the worker is not started for this
  slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release CLI scripts only and has no renderer surface.

## Release Target Selection Result

- Added `release-target-selection.ts`, an internal release evidence writer
  helper for shared platform/architecture parsing, evidence file-name
  formatting, and evidence-bundle requirement parsing.
- The readiness summary writer, external gate status writer, signed-candidate
  dispatch status writer, and evidence bundle status writer now consume the
  shared helper instead of each hard-coding Windows/macOS and x64/arm64 target
  choices.
- Default evidence-bundle requirements are derived from the release platform
  target registry and still resolve to `windows:x64,macos:arm64`.
- Existing CLI flags, default output file names, output shapes, and workflow
  semantics are preserved. No runtime behavior, IPC, preload, renderer caller,
  UI, model download, user asset, candidate binary read, release secret read,
  GitHub settings read/mutation, signing, notarization, workflow execution, or
  publishing behavior changed.
- Added focused release target selection coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the shared target
  selection boundary.
- Focused release target selection/platform target/readiness writer/external
  gate writer/evidence bundle/dispatch tests, typecheck, production build,
  142 Python tests, docs sync, agent context, forbidden-path advisory check,
  diff check, and the complete `ci:governance` suite pass. Full governance
  required loopback permission for the Llama server probe. Doctor CI still
  reports the expected AI Worker not-reachable warning because the worker is
  not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release CLI helpers only and has no renderer surface.

## Release Platform Target Registry Result

- Added a shared release platform target registry in
  `release-flow-governance.ts`.
- The packaging matrix, signed-candidate preflight, release environment
  manifest, release branding preflight, and dispatch status now derive
  platform-specific runner labels, workflow job names, signing environment
  names, secret-name lists, supported architectures, artifact name patterns,
  and branding icon metadata from the same target definitions.
- Existing output shapes and workflow semantics are preserved. No runtime
  behavior, IPC, preload, renderer caller, UI, model download, user asset,
  candidate binary read, release secret read, GitHub settings read/mutation,
  signing, notarization, workflow execution, or publishing behavior changed.
- Added focused release platform target coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the shared target
  registry boundary.
- Focused release platform target/preflight/manifest/branding/dispatch tests,
  typecheck, production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes internal release governance projections only and has no
  renderer surface.

## Release Signed Candidate Dispatch Status Result

- Added `release-signed-candidate-dispatch-status.ts`, a shared path-free
  pre-dispatch verifier for signed candidate workflow readiness.
- Added `write-release-signed-candidate-dispatch-status.mjs`, which combines
  the target platform/architecture, ref gate, `signing_approved` intent,
  sanitized signing-environment status, and generated branding evidence into
  `release-signed-candidate-dispatch-status-<platform>-<arch>.json`.
- The verifier is display-only. It reads generated JSON evidence only and
  never reads secret values, signing assets, branding asset bytes, candidate
  binaries, GitHub settings, user assets, model artifacts, runtime databases,
  or local paths into output; it also does not mutate GitHub settings, execute
  workflows, sign, notarize, publish, or expose IPC/UI.
- Added focused dispatch status/writer coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the pre-dispatch
  readiness step.
- Focused dispatch/preflight/signing-environment/branding/release-flow tests,
  typecheck, production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Release Signing Environment Evidence Template Result

- Added `build/release-signing-environment.example.json`, a safe fill-in
  template for sanitized signing environment evidence.
- The template lists the required Windows/macOS GitHub Environment names and
  required signing secret names, but contains no secret values, credentials,
  signing assets, local paths, or GitHub settings.
- The template defaults `reviewersConfigured: false`, so it cannot pass as
  ready signing-environment evidence without an explicit human update after
  real environment review is configured.
- Added focused template coverage that checks the template matches the shared
  release environment manifest, remains below `ready`, stays path-free, and
  stays wired into `ci:governance`.
- Updated release governance and CI matrix docs with the template usage and
  safety default.
- Focused signing-environment template/status/environment tests, typecheck,
  production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence templates and CLI governance only and has no
  renderer surface.

## Release Signing Environment Status Result

- Added `release-signing-environment-status.ts`, a shared path-free verifier
  for sanitized GitHub signing environment evidence.
- Added `write-release-signing-environment-status.mjs`, which consumes
  `release-signing-environment-evidence.json` and writes
  `release-signing-environment-status.json` before a real signed candidate
  run.
- The verifier checks GitHub Environment presence, reviewer approval, and
  required signing secret names for Windows and macOS. It reads names only and
  never reads secret values, signing assets, GitHub settings, local paths,
  candidate binaries, user assets, model artifacts, or runtime databases; it
  also does not mutate GitHub settings, execute workflows, sign, notarize,
  publish, or expose IPC/UI.
- Added focused signing-environment status/writer coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the pre-dispatch signing
  environment verification step.
- Focused signing-environment, environment manifest, signed-candidate
  preflight, external-gate, evidence-bundle, and release-flow tests,
  typecheck, production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Release Evidence Bundle Status Result

- Added `release-evidence-bundle-status.ts`, a shared path-free verifier for
  collected `release-external-gate-status-*.json` evidence.
- Added `write-release-evidence-bundle-status.mjs`, which verifies an explicit
  Windows/macOS platform and architecture set against `distribution_ready` or
  `publish_ready` and writes `release-evidence-bundle-status.json`.
- The verifier reads generated JSON evidence only. It does not read candidate
  binaries, release secrets, signing assets, branding asset bytes, GitHub
  settings, user assets, model artifacts, runtime databases, or local paths
  into output; it also does not execute workflows, sign, notarize, mutate
  GitHub settings, publish, or expose IPC/UI.
- Added focused bundle verifier/writer coverage and wired it into
  `.codeindex/tests-map.json` and `ci:governance`.
- Updated release governance and CI matrix docs with the post-run bundle
  verification step.
- Focused bundle, external-gate, readiness, and release-flow tests, typecheck,
  production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. Full governance required loopback permission
  for the Llama server probe. Doctor CI still reports the expected AI Worker
  not-reachable warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Aggregate Release Gate Status Result

- Added a shared aggregate `summary` to Release External Gate Status with
  `overallStatus`, gate counts, and structured `nextExternalActions`.
- The aggregate summary is derived from the existing per-platform readiness
  evidence and keeps platform differences inside each gate entry.
- The status remains display-only and path-free: no workflow execution, GitHub
  mutation, release publishing, secret reads, signing asset reads, branding
  asset byte reads, runtime behavior, IPC, preload, renderer caller, UI,
  model download, or user asset behavior changed.
- Focused external gate status/writer tests, typecheck, production build,
  142 Python tests, docs sync, agent context, forbidden-path advisory check,
  diff check, and the complete `ci:governance` suite pass. The first sandboxed
  `ci:governance` attempt failed because the Llama server probe could not
  listen on `127.0.0.1`; the same command passed after loopback permission was
  granted. Doctor CI still reports the expected AI Worker not-reachable
  warning because the worker is not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence artifacts and CLI governance only and has no
  renderer surface.

## Structured Publish Approval Result

- Added `release-publish-approval.ts`, a shared path-free validator for
  optional `release-publish-approval.json` records.
- A valid publish approval must match platform and architecture, use schema
  version 1, include a safe approval id, ISO approval timestamp,
  `distributionStage: distribution_ready`, and `publishApproved: true`.
- `write-release-readiness-summary.mjs` now supports
  `--publish-approval=<path>` and can use that structured approval evidence to
  mark a distribution-ready candidate as `publish_ready`.
- The existing `--publish-approved=true` compatibility flag is preserved.
- Added `test-release-publish-approval` and strengthened
  `test-release-readiness-writer` with structured approval success and
  mismatch coverage.
- Wired the publish approval test into `.codeindex/tests-map.json` and
  `ci:governance`.
- Updated `docs/platform/RELEASE_FLOW_GOVERNANCE.md` and
  `docs/platform/CI_MATRIX.md` to document structured publish approval as
  evidence only.
- No runtime behavior, IPC, preload, renderer caller, UI surface, model
  download, user asset, signing, notarization, GitHub Environment mutation, or
  release publishing behavior changed.
- Focused publish approval/readiness writer/external gate tests, typecheck,
  production build, 142 Python tests, docs sync, agent context,
  forbidden-path advisory check, diff check, and the complete
  `ci:governance` suite pass. The first sandboxed `ci:governance` attempt
  failed because the Llama server probe could not listen on `127.0.0.1`; the
  same command passed after loopback permission was granted. Doctor CI still
  reports the expected AI Worker not-reachable warning because the worker is
  not started for this slice.
- Electron/Playwright UI validation is intentionally skipped because this
  slice changes release evidence and CLI governance only and has no renderer
  surface.

## Signed Candidate Architecture Result

- The shared builder runner defaults to unsigned mode, scrubs signing and
  notarization variables, rejects protected option overrides, and always uses
  `--publish never`.
- Signed mode requires `DAM_RELEASE_SIGNING_APPROVED=true` and all
  platform-specific credential variables before electron-builder starts.
- Release Update Metadata binds version, product, channel, platform,
  architecture, artifact, blockmap, sizes, and SHA-256 values without paths.
- Release Trust Evidence verifies Authenticode on Windows and Developer ID,
  Hardened Runtime, nested signatures, notarization/staple, Gatekeeper, and
  DMG integrity on macOS without exposing certificate values or paths.
- Release Branding Evidence verifies platform icon structure and binds both
  icons to one path-free approval record. Missing assets, missing approval, or
  SHA-256 mismatch blocks signed candidates from being distributable.
- Release Branding Evidence focused tests, signed-workflow governance tests,
  typecheck, production build, docs sync, agent context check, and diff check
  passed locally. A full `ci:governance` rerun reached the Llama server probe,
  where sandboxed loopback listening was denied; two required sandbox
  escalation requests timed out before approval.
- Windows fast-forwarded to `6c03cb1` and passed the branding evidence,
  release-flow governance, signed-workflow, typecheck, and diff checks with a
  clean worktree.
- The manual signed-candidate workflow is gated by explicit dispatch input and
  platform GitHub Environment approval. It has read-only repository
  permissions and no publishing step.
- Signing secrets are scoped only to the signed build step, and signed jobs
  accept only `main` or `v*` tag refs.
- macOS Hardened Runtime entitlements were reduced to the Electron JIT memory
  minimum; broader protection-disabling entitlements were removed.
- A real unsigned macOS arm64 pack succeeded even with invalid fixture signing
  variables present, proving the default runner scrubs them before packaging.
- A current unsigned macOS arm64 DMG passed read-only mount, disposable app
  copy, isolated launch, detach, and temporary-root cleanup. Package Smoke no
  longer prints captured startup logs or local paths.
- Full governance, typecheck, production build, release-focused tests, plist
  validation, 142 Python tests, docs sync, and diff checks passed.
- No real signing or notarization credentials were read or used.

## Next Implementation Slice

Three gated slices remain:

1. Run one real signed Windows candidate and one real signed/notarized macOS
   candidate after credentials and platform environments are provisioned.
2. Expose Runtime Package Executor to the renderer only after the exact public
   IPC channel names and response contract are explicitly approved.
3. Add human-approved Windows `.ico`, macOS `.icns`, and their shared approval
   record; default Electron icons remain below `distribution_ready`.

Publishing remains a separate per-release approval after distribution gates
and Release Update Metadata pass.

Do not treat unrelated platform matcher/registry/metadata refactors as next
implementation slices. They are out of scope unless they are strictly required
to complete one of the three gated items above.

## Goal Closure Audit Result

No executable code-level gated slice remains under the current closure
boundary.

- Blocked: real signed Windows candidate and signed/notarized macOS candidate.
  Existing signed-candidate preflight, release environment manifest, readiness
  summary, trust evidence, branding evidence, and manual workflow governance
  are already implemented. The remaining gate requires provisioned Windows and
  macOS signing environments, required signing/notarization credentials, human
  environment approval, and real platform candidate execution.
- Blocked: renderer exposure for Runtime Package Executor. The executor,
  session boundary, product workflow, panel contract, IPC handlers, governance
  tests, and pending IPC contract preflight are already implemented. Public
  preload/renderer exposure remains blocked until the exact IPC channel names
  and response contract receive explicit approval.
- Blocked: release branding assets. Branding preflight, verifier, approval
  template, evidence writer integration, release readiness binding, and signed
  workflow checks are already implemented. The remaining gate requires
  human-approved `build/icon.ico`, `build/icon.icns`, and a matching
  `build/release-branding.json` approval record with approved SHA-256 values.
- Blocked: publishing. Publishing remains a separate per-release approval
  after signed distribution gates, install-smoke gates, release update
  metadata, and explicit publish approval pass.

No new matcher, registry, metadata, host-default, or platform-boundary cleanup
slice should be opened for this goal. Future work should resume only when one
of the external inputs above is supplied or explicitly approved.

## Signed Candidate Preflight Result

- Added a shared signed-candidate preflight shape for Windows and macOS that
  records required environment names, approval input, ref gate, required
  evidence files, Package Smoke, and disabled publishing without reading
  secret values.
- Added a focused workflow contract test that checks both platforms remain
  behind GitHub Environment approval, `signing_approved`, `main` or `v*` refs,
  release evidence artifacts, Package Smoke, read-only repository permissions,
  and no publish command.
- Focused release preflight tests, signed-workflow tests, release-flow tests,
  typecheck, production build, 142 Python tests, docs sync, agent context,
  diff checks, and the complete `ci:governance` suite pass.

## Release Branding Preflight Result

- Added a shared release-branding preflight shape that records the required
  approval file, Windows `.ico`, macOS `.icns`, approval fields, evidence
  checks, and default Electron icon block without reading real icon assets.
- The existing branding evidence verifier remains responsible for real
  container validation and approved SHA-256 matching.
- Focused branding preflight/evidence tests, typecheck, production build,
  142 Python tests, agent context, docs sync, diff check, and the complete
  `ci:governance` suite pass.
- Hardened the real AI runtime process runner test to wait for stdout evidence
  instead of relying on a fixed short sleep observed as flaky during full
  governance.

## Runtime Package IPC Preflight Result

- Added a pending-approval Runtime Package IPC contract preflight that records
  the three proposed channel names, polling-only v1 shape, no progress event or
  cancellation, main-owned native dialog behavior, renderer field allowlists,
  and excluded path/digest/message/progress/rollback fields.
- This remains main-process local only. It does not register IPC, add a shared
  public contract, expose preload APIs, or add renderer callers.
- Focused Runtime Package IPC preflight/projector/no-IPC governance tests,
  typecheck, production build, 142 Python tests, docs sync, diff check, and the
  complete `ci:governance` suite pass. The full governance run required
  unsandboxed local loopback for the llama server probe; Doctor CI still reports
  the expected warning that the AI Worker port is not reachable because the
  worker was not started for this slice.

## Release Readiness Summary Result

- Added a shared release readiness summary that combines the existing
  release-promotion state machine with signed-candidate and branding preflight
  shapes.
- The summary emits one path-free shape for Windows and macOS with stage,
  candidate/distribution/publish booleans, signing environment, approval gate,
  required evidence, required secret names, branding approval file, platform
  icon file name, and structured blockers split by candidate/distribution/
  publish phase.
- The summary does not read secret values, icon bytes, candidate artifacts, or
  local paths. It is a readiness projection only and does not sign, notarize,
  publish, or validate real branding assets.
- Focused readiness/flow/signed-preflight/branding-preflight tests, typecheck,
  production build, 142 Python tests, agent context, docs sync, diff check, and
  the complete `ci:governance` suite pass. The full governance run required
  unsandboxed local loopback for the llama server probe; Doctor CI still reports
  the expected warning that the AI Worker port is not reachable because the
  worker was not started for this slice.

## Release Readiness Evidence Writer Result

- Added a path-free `write-release-readiness-summary.mjs` artifact writer that
  reads generated checksum, update metadata, trust, branding, and Package Smoke
  evidence and writes `release-readiness-summary-<platform>-<arch>.json`.
- Added `--output=<path>` to Package Smoke so signed-candidate workflows can
  retain Package Smoke evidence without shell redirection.
- Signed Windows and macOS candidate workflows now upload Package Smoke and
  release-readiness summary JSON next to the checksum, update metadata, trust,
  and branding evidence.
- Static Package Smoke satisfies only the common Package Smoke gate. Windows
  Sandbox installer checks or macOS DMG install checks are still required for
  the distribution gate to pass.
- The writer does not read secret values, icon bytes, candidate binaries
  directly, model artifacts, user assets, or local paths; it consumes generated
  path-free evidence files.
- Focused release readiness writer, signed-candidate preflight, signed
  workflow, release-flow, Package Smoke tests, typecheck, production build,
  142 Python tests, agent context, docs sync, diff check, and the complete
  `ci:governance` suite pass. The full governance run required unsandboxed
  local loopback for the llama server probe; Doctor CI still reports the
  expected warning that the AI Worker port is not reachable because the worker
  was not started for this slice.

## Release Readiness Stage Coverage Result

- Strengthened the writer contract test with isolated Windows and macOS
  fixtures.
- Static Package Smoke now has focused coverage proving it can satisfy only
  the candidate Package Smoke gate; Windows Sandbox or macOS DMG install smoke
  remains required before `distribution_ready`.
- Windows Authenticode and macOS Developer ID, Hardened Runtime, nested
  signature, notarization, staple, and Gatekeeper evidence are covered through
  generated path-free trust fixtures.
- Explicit publish approval remains the only transition from
  `distribution_ready` to `publish_ready`.
- This slice adds no signing, notarization, public IPC, UI surface, release
  publishing, real icon assets, model downloads, or user-asset access.
- Focused release readiness writer/summary/preflight/workflow tests,
  typecheck, production build, 142 Python tests, agent context, docs sync,
  diff check, and the complete `ci:governance` suite pass. Manual
  `check-forbidden-paths` remains blocked by pre-existing untracked
  `docs/agents` files outside this slice.

## Signed Candidate Workflow Ordering Result

- Strengthened the signed-candidate workflow contract test so both Windows and
  macOS jobs must run governance, signed packaging, checksum, update metadata,
  trust evidence, branding evidence, static Package Smoke, release readiness
  writing, and artifact upload in that order.
- The workflow test now proves Release Readiness Summary consumes the static
  Package Smoke JSON before upload and that the signed-candidate workflow does
  not pass `publish-approved=true`.
- Static Package Smoke remains a candidate evidence gate only; Windows Sandbox
  installer smoke, macOS DMG install smoke, and explicit publish approval stay
  separate gates.
- This slice adds no signing, notarization, public IPC, UI surface, release
  publishing, model downloads, or user-asset access.
- Focused signed workflow/preflight/readiness writer tests, typecheck,
  production build, 142 Python tests, agent context, docs sync, diff check,
  and the complete `ci:governance` suite pass. Manual
  `check-forbidden-paths` remains blocked by pre-existing untracked
  `docs/agents` files outside this slice.

## Release Branding Approval Template Result

- Added `build/release-branding.example.json` as the shared Windows/macOS
  human approval template for release icon digests.
- The template intentionally contains invalid placeholder SHA-256 values so it
  cannot be used as a real `build/release-branding.json` approval record.
- Added a focused test that generates valid ICO/ICNS containers, runs the real
  branding verifier with the example template, and proves the template blocks
  at `branding_approval`/`approved_digest` while still keeping output path-free.
- This slice adds no real icon assets, signing, notarization, public IPC, UI
  surface, release publishing, model downloads, or user-asset access.
- Focused release branding template/preflight/evidence tests, typecheck,
  production build, 142 Python tests, agent context, docs sync, diff check,
  and the complete `ci:governance` suite pass. Manual
  `check-forbidden-paths` remains blocked by pre-existing untracked
  `docs/agents` files outside this slice.

## Release Environment Manifest Result

- Added a shared release environment manifest that maps Windows and macOS
  signed-candidate requirements to GitHub Environment names, workflow jobs,
  runners, supported architectures, approval gates, required secret names,
  required evidence artifacts, branding files, and platform install-smoke
  gates.
- The manifest is a read-only configuration contract: it does not read secret
  values, signing assets, branding bytes, local paths, or GitHub settings, and
  it does not sign, notarize, publish, or modify repository environments.
- Focused manifest/preflight/readiness/workflow tests, typecheck, production
  build, 142 Python tests, agent context, docs sync, diff check, and the
  complete `ci:governance` suite pass. The full governance run required
  unsandboxed local loopback for the Llama server probe; Doctor CI still
  reports the expected warning that the AI Worker port is not reachable because
  the worker was not started for this slice.

## Release Install Smoke Preflight Result

- Added a shared release install-smoke preflight that names the Windows
  Sandbox installer-smoke and macOS DMG install-smoke gates, their
  `package-smoke` evidence source, required check IDs, execution host, and
  disposable isolated-install behavior.
- Release Environment Manifest now consumes this shared preflight instead of
  hardcoding platform install-smoke branches, while still keeping the platform
  differences limited to the smoke lane and check IDs.
- Focused install-smoke/environment/readiness-writer/Package Smoke tests,
  typecheck, production build, 142 Python tests, agent context, docs sync,
  diff check, and the complete `ci:governance` suite pass. The full
  governance run required unsandboxed local loopback for the Llama server
  probe; Doctor CI still reports the expected warning that the AI Worker port
  is not reachable because the worker was not started for this slice.

## Runtime Package Executor Result

- Added a shared execution interface and structured, path-free progress/result
  vocabulary.
- Added filesystem and in-memory adapters.
- Filesystem execution is limited to explicitly confirmed local/bundled ZIP
  packages and blocks model packages, remote sources, package scripts, and
  automatic runtime start.
- Relative bundled sources resolve from an injected or Electron resource root;
  local and bundled source/access pairs are validated before file access.
- SHA-256 verification, safe extraction, atomic promotion, Runtime Registry
  commit, and rollback are implemented behind one module interface.
- Filesystem executions are serialized inside the main process so concurrent
  package requests cannot overwrite each other's Runtime Registry snapshot.
- Generated ZIP tests cover success, duplicate install, checksum mismatch,
  traversal, Windows drive paths, case collisions, symbolic links, entry
  and expanded-size limits, source-root escape, managed-parent symlinks,
  platform mismatch, and registry rollback.
- Typecheck, production build, runtime-safety tests, 142 Python tests, and
  unsigned macOS packaging passed. The complete `ci:governance` suite also
  passed after restoring the local `better-sqlite3` Node ABI changed by the
  packaging step.
- The packaged app contains `extract-zip` and its runtime dependencies. An
  isolated temporary-home startup remained running without module errors.
- An earlier non-isolated startup smoke unintentionally reached the existing
  default runtime SQLite initialization path before termination. No database
  content or user asset was inspected, and no cleanup or rollback was
  attempted. Future package smoke must use isolated roots only.
- A main-process session boundary now adapts a user-selected local manifest
  into opaque selection tokens and path-free execution snapshots, but it is not
  exposed to renderer IPC until the channel contract is explicitly approved.

## Later Slices

1. Validate the Runtime Package Executor on macOS and Windows with generated
   fixtures, focused tests, and Electron/Playwright UI evidence.
2. Add an explicitly approved remote-package adapter without weakening the
   local/bundled transaction rules.
3. Deepen Release Flow around signed Windows artifacts, signed/notarized macOS
   artifacts, Package Smoke, gated publishing, and update metadata.

## Release Candidate Governance Result

- Added one shared promotion invariant for Windows and macOS with structured
  missing gates and four truthful stages.
- Added a path-free SHA-256 artifact manifest writer for NSIS/DMG candidates.
- The manual packaging workflow now runs release-focused tests and retains
  unsigned candidate artifacts for 14 days after architecture-aware static
  Package Smoke, without signing or publishing.
- Unsigned artifacts can reach only `candidate_ready`. Distribution and
  publishing remain blocked until platform trust evidence, update metadata,
  and explicit publish approval exist.
- The inspected local macOS app is ad hoc signed, has no Team ID, and is not a
  distribution artifact. Local Gatekeeper output was inconclusive because
  system security assessment is disabled.
- A real unsigned macOS arm64 DMG and blockmap were built locally. The
  architecture-scoped checksum manifest and static Package Smoke passed;
  read-only DMG installation and isolated launch also passed. Strict bundle
  signature verification failed as expected for the unsigned candidate, so
  its truthful ceiling is `candidate_ready`.
- The complete `ci:governance` suite passed with the release invariant,
  checksum, Package Smoke, and workflow contract tests included.
- Windows full-governance validation exposed and fixed a CRLF-sensitive
  Settings Migration preload contract test. The test now normalizes line
  endings and fails explicitly when its structural boundaries are absent.
- Windows also exposed a native ABI ordering gap: `npm ci` rebuilt
  `better-sqlite3` for Electron before Node-driven governance tests.
  `ci:governance` now begins with `ci:prepare-native-deps`; packaging still
  rebuilds Electron native dependencies when producing the artifact.
- Windows NSIS packaging then exposed a second divergent path: the npm dist
  script attempted a redundant Electron download through an invalid inherited
  proxy while Package Smoke already knew how to use the installed Electron
  distribution. All packaging entry points now share one runner that derives
  the installed Electron version, uses its local dist, disables signing and
  publishing, and removes inherited proxy variables.
- Windows x64 NSIS packaging, artifact checksum generation, static Package
  Smoke, and disposable Windows Sandbox installation all passed. Signing is
  intentionally absent, so the candidate remains below distribution-ready.

## Package Smoke Artifact Plan Result

- Moved Package Smoke installer and unpacked artifact path selection, fallback
  binary candidates, and Sandbox staging names into
  `package-smoke-host-defaults.mjs`.
- `package-smoke.mjs` now consumes one shared artifact plan for active
  installer, unpacked binary candidates, and Sandbox file generation.
- Windows Sandbox execution and macOS DMG mount/copy/launch checks remain
  explicit platform actions inside the smoke script because they are real
  OS-specific behavior.
- Existing CLI flags, path-free report shape, static artifact checks,
  launch-smoke behavior, Sandbox generation, DMG install smoke,
  Authenticode probe behavior, and exit-code behavior are preserved.
- No IPC, preload, renderer UI, model download, user asset, runtime database,
  model cache, signing, notarization, publishing, or GitHub settings behavior
  changed in this slice.

## AI Python Environment Platform Adapter Result

- Moved AI Python Environment path API selection, managed venv executable
  layout, and Windows base-Python search roots into one internal platform
  adapter seam.
- Preserved the existing managed runtime directory name, environment-variable
  priority, WindowsApps bypass, Windows user/Profile and Program Files search,
  macOS Homebrew preference, fallback venv behavior, and default `python`
  fallback.
- `AiPythonEnvironment` callers still use the same host/io interface; no IPC,
  renderer UI, AI Worker HTTP API, model download, user asset, runtime
  database, model cache, signing, notarization, publishing, or GitHub settings
  behavior changed in this slice.
- Focused AI Python Environment and OCR dependency governance tests passed.
  UI screenshot validation is not applicable because this slice changes
  main-process path resolution only.

## AI Runtime Bootstrap Platform Adapter Result

- Moved AI Runtime Bootstrap Python Worker auto-start support and runtime
  app-data root path parts into one internal platform adapter.
- Preserved macOS and Windows Python Worker auto-start, Linux/default disabled
  runtime selection, macOS `Library/Application Support` runtime data roots,
  Windows `AppData/Local` runtime data roots, Platform AI branch provider
  registration, profile selection, and runtime metadata projection.
- `bootstrapAiRuntimeManager` callers still provide the same host/dependency
  interface. No IPC channel, preload bridge, renderer UI, AI Worker HTTP API,
  model download, user asset, runtime database, model cache, signing,
  notarization, publishing, or GitHub settings behavior changed in this slice.
- Focused AI Runtime Bootstrap, AI Runtime IPC contract, and AI Runtime Status
  workflow tests passed. UI screenshot validation is not applicable because
  this slice changes main-process bootstrap policy only.

## AI Python Environment Base Discovery Adapter Result

- Moved AI Python Environment base interpreter discovery into the same
  internal platform adapter that owns path API selection, managed venv
  executable layout, and platform-specific Python search roots.
- Preserved environment-variable priority, WindowsApps bypass, Windows
  user/Profile and Program Files search, macOS Homebrew preference, managed
  runtime fallback behavior, and default `python` fallback.
- `AiPythonEnvironment` callers still use the same host/io interface. No IPC
  channel, preload bridge, renderer UI, AI Worker HTTP API, model download,
  user asset, runtime database, model cache, signing, notarization,
  publishing, or GitHub settings behavior changed in this slice.
- Focused AI Python Environment, OCR dependency governance, and macOS AI deps
  installer contract tests passed. UI screenshot validation is not applicable
  because this slice changes main-process Python executable resolution only.

## Doctor Platform-Name Command Resolver Result

- Moved Doctor npm command and Python launcher resolver inputs from
  `isWindows` booleans to shared platform-name descriptors.
- Node and Python Doctor checks now pass `context.platformInfo.platform` to
  the resolver. Windows remains the only platform that selects `npm.cmd` and
  the `py` launcher; macOS, Linux, and unknown platforms keep the existing
  default `npm`, `python3`, then `python` order.
- Python launcher detail projection no longer needs a caller-provided Windows
  boolean; it derives the `pyLauncher` skipped reason from the selected
  adapter's candidates while preserving existing detail keys and pip routing.
- AI Runtime platform-boundary ledger now confirms Node and Python Doctor
  checks are no longer platform-boundary files; the only remaining Doctor
  command platform boundary is the shared resolver.
- Existing Doctor check ids, report shape, timeout budgeting, packaged
  Electron npm skip behavior, IPC/preload/renderer callers, runtime startup,
  install/download behavior, databases, model caches, and user assets are
  unchanged.
- Focused Doctor command-resolver, Doctor aggregate/service, AI Runtime Status
  workflow ledger, typecheck, production build, Doctor CI, governance subset,
  docs sync, agent-context check, forbidden-path advisory check, diff check,
  and complete `ci:governance` passed. UI screenshot validation is not
  applicable because this slice changes main-process command selection only
  and has no renderer surface.

## Runtime Profile Hardware Rule Descriptor Result

- Moved Runtime Profile hardware-hint matching from an inline Windows/NVIDIA
  lambda to descriptor fields consumed by one shared matcher.
- Preserved the existing recommendation behavior: Windows with an NVIDIA hint
  selects `windows-nvidia-cuda`; Windows without that hint selects
  `windows-cpu`; macOS arm64 and x64 keep their existing profile mappings;
  user-selected external inference and Doctor blocking fallback are unchanged.
- Existing Runtime Registry shape, Doctor report shape, IPC/preload/renderer
  callers, runtime startup, installation/download behavior, databases, model
  caches, and user assets are unchanged.
- Focused Runtime Profile, Bootstrap Package Plan, Bootstrap Manager, AI
  Runtime Status workflow, typecheck, production build, runtime-safety,
  governance subset, docs sync, agent-context check, forbidden-path advisory
  check, diff check, and complete `ci:governance` passed. UI screenshot
  validation is not applicable because this slice changes main-process
  recommendation metadata only and has no renderer surface.

## Llama Runtime Planner Rule Matcher Result

- Moved Llama runtime planner platform, architecture, and accelerator rule
  matching into one shared matcher used by default accelerator selection,
  runtime package pattern selection, and CUDA runtime package pattern
  selection.
- Preserved existing planner behavior: Windows without NVIDIA still defaults
  to Vulkan, macOS/Linux without NVIDIA still default to CPU, CUDA 12/13
  selection remains version-based, and Windows CUDA, macOS arm64, and Linux
  x64 runtime package selection are unchanged.
- Existing Llama install plan shape, public IPC/preload/renderer callers,
  runtime startup, downloads, model choices, databases, model caches, and user
  assets are unchanged.
- Focused Llama runtime installer/governance/local-model tests, AI Runtime
  Status workflow, typecheck, production build, runtime-safety, governance
  subset, docs sync, agent-context check, forbidden-path advisory check, diff
  check, and complete `ci:governance` passed. UI screenshot validation is not
  applicable because this slice changes main-process planner metadata matching
  only and has no renderer surface.

## Worker Probe Connection Marker Metadata Result

- Moved Worker probe branch connection markers into shared Platform AI runtime
  metadata.
- AI Runtime status projection now asks the shared helper whether a Worker
  probe belongs to the macOS or Windows branch instead of keeping concrete
  `win32`/`windows` marker strings inside the workflow implementation.
- Existing macOS `isMacOS` connection evidence, Windows `win32`/`windows`
  probe compatibility, accelerator tile projection, IPC/preload/renderer
  callers, runtime startup, downloads, databases, model caches, and user
  assets are unchanged.
- Focused AI Runtime status workflow tests, complete runtime-safety subset,
  typecheck, production build, docs sync, agent-context check, forbidden-path
  advisory check, and diff check passed. UI screenshot validation is
  intentionally skipped because this changes shared projection metadata only
  and does not alter the rendered surface.

## AI Console Smoke Host Defaults Result

- Moved AI Console UI smoke Electron executable candidate paths into the
  shared Node host platform defaults helper.
- The smoke harness now resolves Windows, macOS, and fallback Electron
  executable candidates through the same script-level host defaults seam used
  by other cross-platform verification helpers instead of keeping its own
  platform path table.
- Existing temporary user-data isolation, AI Console route selection,
  Platform AI Branch Status screenshot, overflow check, redacted output,
  IPC/runtime behavior, model downloads, databases, model caches, and user
  assets are unchanged.
- Focused Node host defaults, AI Console smoke contract, verify-platform
  scripts, Package Smoke source tests, complete runtime-safety subset,
  typecheck, production build, docs sync, agent-context check, forbidden-path
  advisory check, and diff check passed. Isolated Electron/Playwright AI
  Console smoke also passed: Platform AI Branch Status screenshot rendered
  with no document/body horizontal overflow.

## Release External Gate Platform Plan Result

- Moved Release External Gate platform-plan lookup behind the external gate
  plan module's exported helper.
- Release External Gate Status now consumes `getReleaseExternalGatePlatformPlan`
  instead of hand-rolling a platform `.find` over the plan's platform list.
  The helper clones supported arches, distribution smoke check ids, gates, and
  nested evidence/secret-name arrays so caller mutations cannot leak back into
  the plan.
- Existing release-readiness input shape, external gate status shape, gate
  ordering, signed-candidate evidence checks, display-only policy, GitHub
  settings behavior, signing/branding asset privacy, IPC/preload/renderer
  callers, runtime startup, downloads, databases, model caches, and user
  assets are unchanged.
- The existing AI Console smoke output directory is now included in the
  bounded `dist-temp` hygiene policy so running isolated UI smoke before
  local governance checks does not create a false hygiene failure.
- Focused Release External Gate plan and status tests, AI Runtime status
  workflow boundary ledger, typecheck, production build, docs sync,
  agent-context check, forbidden-path advisory check, diff check, `ci:hygiene`,
  and complete `ci:governance` passed. UI screenshot validation is not
  applicable because this changes release-governance projection and CI hygiene
  metadata only and has no renderer surface.

## Release Signing Environment Platform Status Result

- Moved Release Signing Environment platform-status lookup behind the signing
  environment status module's exported helper.
- Release Signed Candidate Dispatch Status now consumes
  `getReleaseSigningEnvironmentPlatformStatus` instead of hand-rolling a
  platform `.find` over the environment status list. The helper clones
  required secret names, present secret names, and missing entries so caller
  mutation cannot leak back into the status result.
- Existing dispatch input shape, dispatch status shape, ref gate, signing
  approval gate, branding evidence gate, environment readiness semantics,
  display-only policy, GitHub settings behavior, signing/branding asset
  privacy, IPC/preload/renderer callers, runtime startup, downloads,
  databases, model caches, and user assets are unchanged.
- Focused Release Signing Environment Status, Release Signed Candidate
  Dispatch Status, Release Platform Targets, and AI Runtime status workflow
  boundary-ledger tests passed. Complete `ci:governance`, typecheck,
  production build, docs sync, agent-context check, forbidden-path advisory
  check, and diff check pass. UI screenshot validation is not applicable
  because this changes release-governance projection only and has no renderer
  surface.

## Release Readiness Summary Target Assertion Result

- Moved Release Readiness Summary target matching for source, platform, arch,
  and single-platform summary shape into the release readiness summary module.
- The Release External Gate Status writer now calls
  `assertReleaseReadinessSummaryTarget` instead of hand-rolling platform and
  architecture checks over the parsed readiness summary. The helper returns a
  cloned platform summary so caller mutation cannot leak back into the
  readiness summary result.
- Existing release readiness JSON shape, external gate status JSON shape,
  target selection, evidence file naming, workflow order, display-only policy,
  GitHub settings behavior, signing/branding asset privacy, IPC/preload/
  renderer callers, runtime startup, downloads, databases, model caches, and
  user assets are unchanged.
- Focused Release Readiness Summary, Release External Gate Status Writer,
  Release External Gate Status, and Release Readiness Writer tests passed.
  AI Runtime status workflow boundary-ledger test, complete `ci:governance`,
  typecheck, production build, docs sync, agent-context check, forbidden-path
  advisory check, and diff check pass. UI screenshot validation is not
  applicable because this changes release-governance writer validation only
  and has no renderer surface.

## Release Target Match Helper Result

- Added shared Release Target key and match helpers for full target,
  platform-only, and arch-only comparisons.
- Release Publish Approval now uses platform-only and arch-only target
  matching instead of hand-rolling platform and architecture comparisons over
  approval JSON. Release Signed Candidate Dispatch Status now uses the full
  target matcher for branding evidence validation.
- The AI Runtime status workflow boundary ledger now confirms
  `release-publish-approval.ts` and
  `release-signed-candidate-dispatch-status.ts` no longer contain detected
  platform-boundary comparisons.
- Existing release target parsing, evidence file names, publish approval
  statuses, signed-candidate dispatch statuses, branding evidence semantics,
  JSON shapes, workflow order, IPC/preload/renderer callers, runtime startup,
  downloads, databases, model caches, and user assets are unchanged.
- Focused Release Target Selection, Release Publish Approval, Release Signed
  Candidate Dispatch Status, and AI Runtime status workflow boundary-ledger
  tests passed. Complete `ci:governance`, typecheck, production build, docs
  sync, agent-context check, forbidden-path advisory check, and diff check
  pass. UI screenshot validation is not applicable because this changes
  release-governance target matching only and has no renderer surface.

## Release Platform Target Registry Result

- Split release platform target metadata into explicit Windows and macOS target
  records, then exposed them through one platform-keyed registry.
- `getReleasePlatformTarget` now uses the registry instead of scanning
  `RELEASE_PLATFORM_TARGETS` with a platform comparison. Both target listing
  and single-target lookup now return cloned array fields, so caller mutation
  cannot leak back into the shared registry.
- The AI Runtime status workflow boundary ledger now confirms
  `release-flow-governance.ts` no longer contains detected platform-boundary
  comparisons.
- Existing release platform target values, release matrix generation,
  signed-candidate environment/job metadata, branding metadata, distribution
  gate metadata, JSON shapes, workflow order, IPC/preload/renderer callers,
  runtime startup, downloads, databases, model caches, and user assets are
  unchanged.
- Focused Release Platform Targets, Release Flow Governance, and AI Runtime
  status workflow boundary-ledger tests passed. Complete `ci:governance`,
  typecheck, production build, docs sync, agent-context check, forbidden-path
  advisory check, and diff check pass. UI screenshot validation is not
  applicable because this changes release-governance target metadata lookup
  only and has no renderer surface.

## Release External Gate Plan Target Lookup Result

- Release External Gate Plan platform lookup now reuses the shared Release
  Target platform matcher instead of hand-rolling a platform comparison inside
  the plan lookup helper.
- The AI Runtime status workflow boundary ledger now confirms
  `release-external-gate-plan.ts` no longer contains detected platform-boundary
  comparisons.
- Existing external gate plan JSON shape, gate ordering, display-only policy,
  environment manifest projection, release readiness/status consumers,
  workflow order, IPC/preload/renderer callers, runtime startup, downloads,
  databases, model caches, and user assets are unchanged.
- Focused Release External Gate Plan, Release External Gate Status, and AI
  Runtime status workflow boundary-ledger tests passed. Complete
  `ci:governance`, typecheck, production build, docs sync, agent-context
  check, forbidden-path advisory check, and diff check pass. UI screenshot
  validation is not applicable because this changes release-governance target
  lookup only and has no renderer surface.

## Release Signing Environment Target Lookup Result

- Release Signing Environment platform lookup now reuses the shared Release
  Target platform matcher instead of hand-rolling a platform comparison inside
  the status lookup helper.
- The AI Runtime status workflow boundary ledger now confirms
  `release-signing-environment-status.ts` no longer contains detected
  platform-boundary comparisons.
- Existing signing environment JSON shape, display-only policy, secret-name
  evidence policy, GitHub settings behavior, workflow order, IPC/preload/
  renderer callers, runtime startup, downloads, databases, model caches, and
  user assets are unchanged.
- Focused Release Signing Environment Status and AI Runtime status workflow
  boundary-ledger tests passed. Complete governance, typecheck, production
  build, docs sync, agent-context check, forbidden-path advisory check, and
  diff check pass. UI screenshot validation is not applicable because this
  changes release-governance target lookup only and has no renderer surface.

## Runtime Profile Target Matcher Result

- Added one shared Runtime Profile target matcher for profile support checks
  and resolver rule checks.
- Runtime Profile Registry and Runtime Profile Resolver now consume that
  matcher instead of separately comparing platform and architecture fields.
- The AI Runtime status workflow boundary ledger now confirms
  `runtime-profile-registry.ts` and `runtime-profile-resolver.ts` no longer
  contain detected platform-boundary comparisons.
- Existing runtime profile ids, recommendation ordering, NVIDIA hint behavior,
  external-inference fallback behavior, Doctor blocking semantics, IPC/preload/
  renderer callers, runtime startup, downloads, databases, model caches, and
  user assets are unchanged.
- Focused Runtime Profile and AI Runtime status workflow boundary-ledger tests
  passed. Complete governance, typecheck, production build, docs sync,
  agent-context check, forbidden-path advisory check, and diff check pass. UI
  screenshot validation is not applicable because this changes internal
  runtime profile matching only and has no renderer surface.

## AI Runtime Bootstrap Profile Matcher Result

- AI Runtime Bootstrap branch-runtime profile selection now reuses the shared
  Runtime Profile target matcher instead of hand-rolling current platform and
  architecture comparisons inside the bootstrap flow.
- Existing provider ids, macOS and Windows branch metadata, profile ids,
  Python Worker auto-start policy, runtime cache path layout, IPC/preload/
  renderer callers, runtime startup behavior, downloads, databases, model
  caches, and user assets are unchanged.
- Focused AI Runtime Bootstrap, AI Runtime IPC contract, and Runtime Profile
  tests passed. Complete runtime-safety/governance, typecheck, production
  build, docs sync, agent-context check, forbidden-path advisory check, and
  diff check pass. UI screenshot validation is not applicable because this
  changes internal runtime bootstrap matching only and has no renderer surface.

## Main Platform Adapter Matcher Result

- Added one shared main-process platform adapter matcher for optional
  platform-specific adapter records with a fallback adapter.
- AI Python Environment and AI Runtime Bootstrap platform adapter selection
  now consume that matcher instead of each hand-rolling
  `!candidate.platform || candidate.platform === ...` comparisons.
- The AI Runtime status workflow boundary ledger now confirms
  `ai-python-environment.ts` and `ai-runtime-bootstrap.ts` no longer contain
  detected platform-boundary comparisons. Their platform-specific adapter data
  remains explicit and unchanged.
- Existing managed AI Python paths, Windows Python discovery, macOS Homebrew
  Python fallback, Python Worker auto-start policy, runtime cache path layout,
  IPC/preload/renderer callers, runtime startup behavior, downloads,
  databases, model caches, and user assets are unchanged.
- Focused AI Python Environment, AI Runtime Bootstrap, AI Runtime IPC contract,
  macOS dependency installer contract, and AI Runtime status workflow
  boundary-ledger tests passed. Complete runtime-safety/governance, typecheck,
  production build, docs sync, agent-context check, forbidden-path advisory
  check, and diff check pass. UI screenshot validation is not applicable
  because this changes internal main-process adapter matching only and has no
  renderer surface.

## Llama Runtime Installer Adapter Matcher Result

- Llama Runtime Installer server-process adapter selection and hardware
  detection adapter selection now reuse the shared main-process platform
  adapter matcher.
- The Windows llama-server executable, taskkill force-stop command,
  PowerShell zip extractor, macOS/Linux unzip path, macOS hardware detection,
  Windows nvidia-smi detection, generic fallback detection, install/start
  lifecycle, IPC/preload/renderer callers, downloads, databases, model caches,
  and user assets are unchanged.
- The AI Runtime status workflow boundary ledger now confirms
  `llama-runtime-install.service.ts` no longer contains detected
  platform-boundary comparisons. Platform-specific installer adapter data
  remains explicit and unchanged.
- Focused Llama Runtime Governance, Llama Runtime Installer, and AI Runtime
  status workflow boundary-ledger tests passed. Complete runtime-safety/
  governance, typecheck, production build, docs sync, agent-context check,
  forbidden-path advisory check, and diff check pass. UI screenshot validation
  is not applicable because this changes internal installer adapter matching
  only and has no renderer surface.

## Llama Runtime Governance Adapter Matcher Result

- Llama Runtime Governance platform-adapter filtering now reuses the shared
  main-process platform adapter matcher instead of hand-rolling
  `adapter.platform === normalized`.
- External inference remains the default governance adapter for every
  platform, while macOS and Windows llama adapters remain explicit
  platform-specific records.
- The AI Runtime status workflow boundary ledger now confirms
  `llama-runtime-governance.ts` no longer contains detected platform-boundary
  comparisons.
- Existing read-only governance policy, `autoDownload: false`,
  `autoInstall: false`, `autoStart: false`, manual health-check policy,
  adapter ids, IPC/preload/renderer callers, runtime startup behavior,
  downloads, databases, model caches, and user assets are unchanged.
- Focused Llama Runtime Governance and AI Runtime status workflow
  boundary-ledger tests passed. Complete runtime-safety/governance, typecheck,
  production build, docs sync, agent-context check, forbidden-path advisory
  check, and diff check pass. UI screenshot validation is not applicable
  because this changes internal governance adapter matching only and has no
  renderer surface.

## Safety Boundaries

- Do not inspect user assets, runtime databases, model caches, or model
  weights.
- Do not download models, packages, or dependencies without explicit approval.
- Do not use or print signing, notarization, publishing, or authentication
  secrets.
- Preserve ADR-0002 user-triggered external/runtime behavior.
- Preserve ADR-0003 dry-run, backup, rollback, and explicit confirmation for
  path migration.
- Do not stage or revert unrelated working-tree files.

## Validation

For the current documentation slice:

```bash
python3 scripts/check-agent-context.py
python3 scripts/check-forbidden-paths.py
python3 scripts/check-docs-sync.py --mode phase-summary
git diff --check
```

Before completing an executable Runtime Package slice:

```bash
npm run typecheck
npm run build
npm run test-runtime-package-source
npm run test-runtime-package-downloader
npm run test-runtime-package-verifier-extractor
npm run test-runtime-package-installer
npm run ci:test-runtime-safety
npm run test-runtime-package-session
npm run test-runtime-package-ipc-contract-preflight
npm run test-runtime-package-ipc-governance
python3 -m unittest discover ai-service/tests
```

Record skipped platform or UI validation with the reason and remaining risk.
