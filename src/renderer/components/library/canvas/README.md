# Formal Library Canvas

Presentation lifetime now crosses the private Asset Workspace Session Interface
(`refresh`, `revoke`, fixed `receive` events). AppShell owns the stable instance;
Library observes its Host projection/error and clears local panels for the exact
revocation reason. Current inspection failure clears view/assets but retains
notebook/OCR drafts; confirmed authority change clears them, and confirmation
cancellation leaves the session intact. Successful non-ready inspection does not
introduce an Asset Store reset. Controls keep cancelled-open inspect-only and
the two inspections after a completed authority change. This private Session
does not grant write authority. Dual-client transports and recoverable Host
drafts are described in the Renderer and Local Host README; clearing a detached
view does not discard its retained Host draft. See TASK.md for actual acceptance.

Library clears the previous scope's work editor before consuming current recovery
navigation, including recovery from a different route. Confirmed recovery discard
also clears the owning document's suspended copy after Host success; old queued
or failed writes cannot restore it. Later input and other owners remain protected.
Tag metadata editing separates the displayed form baseline from raw persisted CAS
values, compares peer saves, and adopts a reviewed baseline without losing input.
Organization dialogs retain their reviewed snapshot revision through rereads;
peer changes require explicit comparison and adoption without resetting names,
locations, selected targets or color input. Removed targets cannot become an
implicit create. Failed saves retain input and the same reviewed baseline.
OCR correction receipts clear only the text actually submitted; later input stays
in the editor and is checkpointed against that successful save.
An older OCR read cannot undo a successful correction or explicit baseline adoption.
Ordinary reads publish in request order; superseded adoption keeps the text and asks
for another comparison. Input typed during adoption is retained when it finishes.
Notebook conflict
reads use the current local pages after waiting, fence older reads and changed
baselines, and checkpoint the visible conflict copies with their reviewed baseline.

`WorkSetReferenceView` reuses the formal `WorkReferencePanel` for Browser work
references. Its discard and editor target changes use page confirmation controls;
cancel/Escape preserve input. Native-window commands have scoped status feedback,
while actual OS effects require separate native acceptance.

`routes/Library.tsx` binds actual Active Library authority, Asset/Tag stores, discovery and trusted
operations to the approved shared Gallery presentation. `LibraryCanvas` is the host adapter for the
four destinations, real folder membership, state handling and menu callbacks. It reuses `gallery/`
geometry/materials, BottomDock, FolderCard and AnchoredGrid rather than a second visual design.

`LibraryDetails` presents preview → measured preview colors/ratios → format → understanding → prompt/OCR →
work actions/tools. Source metadata, tag management and caption editing are always expanded immediately below the palette; AI execution tools retain their own action disclosure.
`LibraryFocus` adapts real assets to the shared FocusView/FocusCanvas. `LibraryMedia` accepts only
Main-issued dam-preview URLs; no file/remote/data URI fallback. A 1:1 view means preview pixels.

Notebook saves now use the held Active Library v5 database with per-asset optimistic revisions,
preview-reference checks and binding-session revocation. First save explicitly confirms the schema upgrade;
reads never upgrade. Drafts survive focus/route changes, save failures and conflict reconciliation; changing
libraries clears the session only after unsaved-content disclosure. Saved notes survive restart and Trash.
No notebook data is written into Originals or prototype localStorage. See ADR 0487 and
`docs/product/ASSET-NOTEBOOKS-20260917.md` for the contract and limits.
Ordinary and palette folders now use the v6 organization schema through `useLibraryOrganization`.
`OrganizationModal` sends atomic validated commands, discloses first-write upgrades and retains failed input.
Membership is reference-only; remove/delete-folder never deletes an asset. Measured preview colors can be
collected from inspector/focus context menus. Built-in AI summaries and tag folders derive from current evidence through `ai-folders.workflow`; custom rules remain pending; multi-workset native windows now use the v7 controller and sandbox preload;
the existing native single-card implementation is available via Work Mode → Desktop Reference.
See `docs/product/LIBRARY-ORGANIZATION-20260919.md` and ADR 0488.


All and folder subpages share search and tag actions. Trash keeps the same visual controls but its
existing projection has no searchable titles/tags, so those controls are disabled with explanation.
Initial loading, empty library, no match, initial failure and failed refresh remain distinct. Source
identity/generation and existing epoch checks remain authority boundaries, not design tokens.

Verification: `test-library-canvas-state`, `test-asset-library-keyboard`, `test-library-canvas-electron`,
`check-gallery-parity.mjs`, `check-focus-notes-prototype.mjs`; visual tracers do not replace real IPC tests.
Current evidence, limitations and screenshots: `docs/design/GALLERY-PARITY-20260915.md`.

Work sets are composed by `useWorkSets` and `WorkSetModal`. Saved reference cards open native windows, and
work-window locate/add events are buffered across routing through `work-set-navigation.store`.
`docs/product/WORK-SETS-20260920.md` records exact persistence, ownership and platform limits.

AI result/search integration: `docs/product/AI-DISCOVERY-20260920.md`. Optional `visualAi` comes from
Main, through existing listAssets/Preload mapping; suggestions never enter `asset.tags` until confirmed.
The existing AppShell AI event subscription refreshes assets even when the inspector is closed.
Search includes pending suggestions, stored prompts and AI captions separately from edited descriptions.
No renderer evidence fetch per card or new schema is used. AI folders reuse FolderCard/AnchoredGrid;
newest revision/preview-matched evidence replaces prior derived membership while confirmed tags survive.


Dedicated OCR uses `DedicatedOcrPanel` with actual `asset-ocr:*` IPC. It separates recognized source text from
user corrections and visual-model fallback text, confirms local batch scope/v8 first save, supports cancellation,
and copies/edits/restores text. `ocr-drafts.ts` retains unsaved edits in memory across inspector/routing changes;
library transitions and window close reuse the unsaved-content guard. Inference is on demand, never a list-read side effect.

C search uses the Host's bounded snapshots and separately refreshes visible rows. Source filters distinguish titles, confirmed tags/aliases, suggestions, current descriptions, OCR and reverse prompts; colour percentage is a deterministic preview measurement and a hard condition for semantic/image results. Switching lookup modes keeps source/colour conditions. Explicit requery changes membership; background refresh, failed requests and cancellation preserve accepted pagination, selection and scroll. See `src/main/asset-search/README.md` and the dated C handoff for the actual Browser scope.

The palette renders no persistent HEX/percentage/help legend; swatch titles retain values and interactions.
The embedded metadata editor has no nested height cap or overflow clipping. Tag suggestions use a themed
portal outside the inspector scroll container, with viewport-aware positioning and pointer/focus handling.

Startup navigation (2026-10-01): the four-destination shell keeps its global menu and AI
Console button available before a Library opens or after an open failure. Missing-library
views disclose their requirement instead of repeating an unchanging overlay; search and
asset actions remain unavailable. Recovery keeps the original Host state and never rewrites
user storage. The Main authority barrier restores connection/generated-plan admission only
when shutdown is idle, even if opening failed; each service retains its UNKNOWN/resource
resume guard. Formal regression: library-startup-navigation.e2e.test.mjs.
