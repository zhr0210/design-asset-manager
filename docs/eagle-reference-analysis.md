# Eagle 4 Reference Analysis

This document records a read-only analysis of the locally installed Eagle 4 application package and Eagle's official product, support, Plugin API, and Web API documentation. It is a reference for Design Asset Manager, not a request to copy Eagle source code or preserve Eagle's implementation choices.

## Scope And Evidence Boundary

The analysis inspected only the signed application bundle under `/Applications/Eagle.app` and public Eagle documentation. It did not open or read an Eagle user library, user database, private assets, account data, or API token.

Evidence is labeled as follows:

- **Verified**: directly visible in the installed application package or official documentation.
- **Inferred**: a likely architectural conclusion supported by multiple verified signals, but not confirmed by Eagle source documentation.
- **Recommended**: a Design Asset Manager decision proposed from the comparison.

## Executive Conclusion

Eagle demonstrates that Electron and web UI technology do not impose the interaction ceiling seen in the current Design Asset Manager browser-first shell. The installed Eagle 4 package is an Electron application whose main workspace is rendered with older AngularJS/jQuery-era web technology. Its commercial quality comes from product and process boundaries: the library workspace owns the primary UI, web capture is an external producer, media work is delegated to specialized modules and workers, and plugins plus a local Web API extend the product without turning arbitrary webpages into the application shell.

The most important lesson is therefore not to replace React. It is to keep React as the single owner of the Asset Workspace and make every capture source submit candidates through a bounded ingestion contract.

## Installed Package Findings

### Desktop Runtime

- **Verified**: the inspected application identifies itself as Eagle 4.0.0 and is a signed, notarized arm64 macOS application.
- **Verified**: the bundle contains Electron Framework plus separate Renderer, GPU, Plugin, and general Helper applications.
- **Verified**: the main executable links to Electron Framework and the application bundle uses `app.asar` with unpacked runtime files.
- **Verified**: the shipped package metadata declares Electron 22.3.7, an `entry.js` main entry, and an Electron Packager build flow.
- **Inferred**: Eagle relies on Chromium rendering for most product UI while keeping process isolation for rendering, GPU work, and plugin execution.

This directly disproves the idea that Electron itself prevents commercial-grade interaction. Native child views can create composition limits, but Eagle avoids making a live third-party webpage the permanent owner of the central product surface.

### Renderer And UI Composition

- **Verified**: the application archive contains AngularJS modules, Angular directives, jQuery, HTML templates, SCSS/CSS themes, and a compiled application bundle.
- **Verified**: inspector, filter, folder selector, tag selector, duplicate review, library panel, plugin center, preview window, and collection window are represented as separate UI modules.
- **Verified**: the capture classification flow has a dedicated `collect-window` implementation with its own item model, folder/tag/library APIs, layouts, localization, and styles.
- **Inferred**: Eagle's interface behaves as a stable desktop workspace because selection, inspector state, list layout, filtering, and collection actions belong to one application renderer hierarchy, not because of a modern component framework.

React remains the stronger choice for Design Asset Manager because it offers clearer state ownership, composable views, and mature motion tooling. The comparison shows that React should own more of the UI, not that it should be removed.

### Media And Background Work

- **Verified**: the package contains format-specific thumbnail modules for common image, design, document, font, video, HDR, and 3D formats.
- **Verified**: bitmap, HEIC, TIFF, Hamming-distance, PDF, and model-viewer workers are present, including WebAssembly where useful.
- **Verified**: unpacked native/runtime dependencies include media playback and platform integration components; the Plugin API also exposes FFmpeg as an extra module.
- **Inferred**: expensive decode, thumbnail, duplicate, preview, and media operations are separated from ordinary grid interaction so the workspace can stay responsive.

The transferable rule is to give the renderer lightweight projections and progress state while keeping file ownership, decoding, indexing, and long-running analysis outside React render cycles.

### Plugin Boundary

- **Verified**: Eagle documents four plugin types: Window Plugin, Background Service Plugin, Format Extension Plugin, and Inspector Extension Plugin.
- **Verified**: plugins are built with HTML, CSS, and JavaScript and can access item, folder, smart-folder, tag, tag-group, library, window, notification, clipboard, drag, shell, and related APIs.
- **Verified**: the application bundle includes templates for window, service, preview/format, and inspector plugins and runs a distinct Plugin Helper process.
- **Inferred**: the plugin model is capability-shaped around product extension points rather than unrestricted modification of the main workspace DOM.

Design Asset Manager should eventually expose narrow extension surfaces around import/capture producers, metadata analyzers, preview providers, exporters, and inspector sections. A general-purpose plugin host should follow a stable library core, not precede it.

### Local Web API Boundary

- **Verified**: Eagle Web API V2 is a REST interface for external tools, browser extensions, scripts, automation, and third-party applications.
- **Verified**: the local API server starts with Eagle, uses `/api/v2/`, provides paginated item/folder/tag/library operations, and supports full-text and AI semantic search.
- **Verified**: Plugin API is for code running inside Eagle; Web API is for independent external producers and tools.
- **Recommended**: Design Asset Manager should use the same separation of concerns but require explicit origin controls and a scoped local token even for localhost integrations. Eagle's exact trust policy should not be copied automatically.

## Product Architecture Findings

### Workspace Is The Product

Eagle's official support structure describes a durable desktop composition: sidebar, toolbar, image list, filters, and right-side inspector. The product centers on browsing and organizing a local library, with grid/list layouts, search, saved filters, duplicate review, metadata, previews, batch actions, and export.

This validates ADR 0009: Asset Workspace should be the default surface. It also validates ADRs 0020 through 0025: dense grid browsing, desktop selection semantics, contextual preview, and a persistent right-side Asset Inspector are coherent parts of one workspace.

### Capture Is A Producer, Not A Workspace Host

Eagle's browser extension supports drag capture, context-menu capture, batch capture, region/element/full-page screenshots, high-resolution source discovery, folder assignment, and tag assignment. Newer extension behavior can download through the browser and complete batch collection inside the extension UI before submitting to Eagle.

The architectural implication is stronger than merely moving a browser button. Web capture should produce a normalized candidate envelope containing source context, original or downloaded artifact reference, capture method, suggested title, dimensions, and optional folder/tag intent. The Asset Workspace should decide how that candidate is reviewed, analyzed, deduplicated, and promoted.

This validates ADR 0010's staged migration: retain the existing Embedded Browser only as a compatibility producer, then add browser extension and local API producers without changing Capture Inbox semantics.

### Organization Is Metadata, Not Physical Duplication

Eagle exposes libraries, folders, smart folders, tags, tag groups, saved filters, ratings, annotations, notes, links, color, format, size, and time as distinct organization and query dimensions. The public API models items, folders, smart folders, tags, tag groups, and libraries separately.

This supports the existing Design Asset Manager distinction between Design Asset identity, Collection Membership, Tags, Smart Filters, and Review Signals. A Smart Filter should remain a query view and must not own or move files.

## Comparison With The Current Project

| Area | Eagle evidence | Current Design Asset Manager | Required direction |
| --- | --- | --- | --- |
| Primary UI | Library workspace owns sidebar, list, toolbar, inspector | Browser route and native `WebContentsView` still shape the shell | Make React Asset Workspace the default route and owner |
| Capture | External extension and focused collect window | Injected controls inside a live embedded webpage | Normalize capture intent through a capture boundary |
| Candidate review | Capture can carry folder/tag intent before library commit | Downloads can flow directly toward saved assets | Implement Capture Inbox as a real state boundary |
| Media work | Format modules, workers, native helpers, WebAssembly | Main process services plus Python AI worker exist but are not unified as an ingestion pipeline | Project progress and results into the workspace through jobs |
| Inspector | Stable right-side extension point | Asset inspector exists but is still attached to the current library implementation | Make inspector persistent, typed, and workspace-owned |
| Extensibility | Plugin Helper, typed plugin roles, local Web API | Broad preload IPC surface, no stable producer/plugin contract | Add scoped producer API first; plugin host later |
| Search | Saved filters, rich dimensions, full-text and AI search | Search and tag services exist, but workspace query model is fragmented | Build one query projection for grid, filters, and Smart Filters |

## Repository Integrity Finding And Repair

- **Verified at analysis time**: the working-tree `package.json` contained Eagle's package identity, dependencies, entry point, and build scripts.
- **Verified**: `package-lock.json`, TypeScript source, Electron Vite structure, and Git `HEAD` still describe Design Asset Manager.
- **Verified at analysis time**: multiple Eagle application files were present as untracked files at the repository root.
- **Impact at analysis time**: dependency installation, type checking, build, packaging, and local app replacement could not be treated as trustworthy while the manifest and source tree described different applications.

After explicit user approval, the Eagle package manifest and 15 identified Eagle root files were moved to a recoverable system-temporary quarantine. Design Asset Manager's tracked `package.json` and generated main entry were restored from the project baseline, then reconciled with the current Motion dependency and focused interaction test scripts. Dependency inspection, focused interaction tests, TypeScript checking, and the production build passed after repair.

## Recommended Target Architecture

```text
Capture Producers
  Embedded Browser Adapter | Browser Extension | Clipboard | File Import | Local API
                              |
                              v
Capture Gateway -> Candidate Ingest -> Capture Inbox
                         |             |
                         v             v
                 Media/AI Job Queue   Candidate Review
                         |             |
                         +-------> Candidate Promotion
                                          |
                                          v
Library Core -> Search Projection -> React Asset Workspace
     |                                   |      |
     +-> File Ownership                  Grid   Inspector
     +-> Collections / Tags              Preview / Batch Actions
     +-> Duplicate Evidence
```

The Capture Gateway is the important new boundary. Producers should not write library UI state or final asset records directly. They should submit candidate intent; Candidate Ingest should own original acquisition, identity, provenance, lightweight analysis scheduling, duplicate evidence, and the transition into Capture Inbox.

## Recommended Delivery Order

1. Restore repository integrity and separate Eagle reference artifacts from production source.
2. Make the React Asset Workspace and persistent Asset Inspector the default application surface using existing asset data.
3. Introduce a producer-neutral capture contract and route the existing Embedded Browser download path into it.
4. Implement the smallest Capture Inbox vertical slice: captured, analyzing, ready, failed, promote, and reject.
5. Move thumbnail, palette, duplicate, and tag work behind observable background jobs.
6. Add a scoped localhost Capture API, then build the browser extension against that API.
7. Add plugin extension points only after item, collection, tag, query, and inspector contracts are stable.

## Choices Not To Copy

- Do not migrate from React to AngularJS or jQuery.
- Do not copy Eagle source code, visual assets, or internal implementation details.
- Do not downgrade Electron to Eagle's shipped version.
- Do not make an embedded third-party webpage the primary application renderer.
- Do not expose a broad unauthenticated local mutation API merely because another local app does.
- Do not implement a general plugin runtime before the library and capture contracts are stable.

## Official References

- https://cn.eagle.cool/
- https://cn.eagle.cool/support/desktop
- https://cn.eagle.cool/extensions
- https://cn.eagle.cool/support/faq/file-management
- https://developer.eagle.cool/plugin-api
- https://developer.eagle.cool/web-api
