# Formal Library Canvas

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
