# B原生工作窗的实现分工

视觉规范见[DESIGN](../../../DESIGN.md)，用户状态与手势契约见[悬浮工作窗交互规格](../../../docs/design/WORK-WINDOW-INTERACTIONS.md)。呈现边界按[ADR0493](../../../docs/adr/0493-dropover-style-interaction-allows-platform-native-implementation.md)：AppKit负责整个悬浮窗，React保留主工作台与独立大预览；这是设计与实现边界，不是完成资格。

B由Electron Main工作窗口控制器、原生适配器与Swift AppKit子进程组成。NativeWorkShelf持有NSPanel和内容控件，WorkShelfInteraction集中处理手势、边缘候选、过渡与实际frame接管；WorkShelfPresentation独立拥有前景淡化、不可交互的临时快照和可取消延迟，业务选择与草稿不归动画回调管理。标题/背景使用统一的AppKit输入路径，素材拖出、控件和文本输入独立；不用全局按键轮询或无来源重复移动作为兜底。

唯一Host持有Library、工作集、成员、修订、文件与提交权威。私有桥传受限展示快照/意图及gestureId、motionId等关联信息，返回完成/取消/失败；configureDock等待实际有效终态，迟到回执不得覆盖新操作。会话、成员、撤权与实际进程退出检查保留，未确认退出不释放窗口/文件资源。

布局契约区分presentation与edge-slide停靠。展开态可附带expansion（center/left/right与220×240 compactBounds）：仅保存位置关系，不授予文件或执行能力；严格校验数值、模式和尺寸，与实际展开geometry一并持久化，并在原生bounds恢复。紧凑/停靠不得携带旧展开关系。旧布局转换前保留原文；旧紧凑胶囊转换为比例停靠，旧展开停靠恢复可见展开态，不改变工作集内容。运动记录含版本、关联标识、原生事件时间、请求/实际位置、判定及终态；有界缓冲、异步写入，拖动采样可合并，开始/松手/拒绝/中断/完成必须保留。诊断失败不得阻塞交互。

背景材质与停靠覆盖层是独立实现；Liquid Glass、按钮样式及220×240布局的设计目标不能由现有NSVisualEffectView或旧构建资格推定已实现。实际身份、指针输入、模糊及设备缺口见[CURRENT-STATE](../../../docs/handoff/CURRENT-STATE.md)和[原生候选说明](../../../native/shelf-candidates/README.md)。


## 数量窗口与本机复用的技术边界

Work Set 的有效内容为 name/assetIds/columns，Native 栅格固定两列。`work-set-retirement.schema.ts` 只在既有 Host 备份维护事务中执行 v16 退役；同事务保存修订/引用，`fork` 可原子复制或移动引用到新集合。设备布局独立保存 indicatorColor/alwaysShowIndicator/currentSpaceOnly/pinned。历史恢复文件先只读投影；已明确升级的库才备份并清理对应字段，Notebook 与其他库记录不动。

`WorkShelfCapsule` 使用公共 AppKit vibrancy 和 Core Animation，不宣称胶囊本身是 NSGlassEffectView。`WorkShelfSystemActions` 消费当前范围/修订与 Host 准备的副本；动态 NSWorkspace 打开方式、Quick Look、NSSharingServicePicker、系统文件选择器属于原生表面。文件信息目前为 AppKit 信息面板，不宣称 Finder Get Info 自动化。没有任意 Renderer 路径、SQL 或系统脚本入口。

`work-file-handoff` 的副本移动/改名保留实际位置及物理身份，更新记录在移除旧副本之前；重名不覆盖，未知确认保留完成副本。Trash 与记录清理分开，已回收副本不可再次交付。新 PDF/拼接/OCR文本仍沿用保留预算、来源/成员重验和任务取消；`work-image-document` 生成真实 RGB PDF 页和有界拼接，默认原尺寸纵向居中，等比/横向为显式配置。

`WorkShelfOCR` 复用既有本机 RapidOCR 与资源准入，原版 Vision 仅作为对标证据；不新增云服务。`WorkShelfRedaction` 提供手动遮挡与消费真实 OCR 多边形的智能选区，独立 PNG 通过 Host 原图尺寸生成，不写回素材原件或 Notebook。代码/受控测试资格与正式设备通过仍分别记录。

以下是视频适配及其他工作窗口的既有实现与历史说明，不自动成为B的新验收结果。

# 2026-10-09 Mac 视频 Adapter

Main 在 macOS 接 `createMacVideoRuntime`，复用原 WorkVideoRuntime/Host/持久化契约。离线构建 Swift AVFoundation helper 与 C libproc 内存helper，按source/二进制SHA与目标架构验证；开发输出与ASAR unpack资源均绑定构建。只支持既定未旋转 H.264 MP4/96MiB/一小时/3840×2160范围。

参考帧的 `method` 保存实际运行器身份，`transform` 只描述共享存储执行的完整尺寸 Sharp PNG 转换，不能为 Mac 写入 Media Foundation 标签。Mac AVFoundation 允许请求后最多一秒的解码容差，始终分列请求/实际时间。旧错误标签保留历史；新帧使用 `decoded-video-frame/sharp/png/full-resolution/v1`。便携存储回归为 `npm run test-work-frame-provenance`；实际影片和用户操作见 [A–F Mac 验收](../../../docs/history/task-consolidation-20261011/handoff/AF-MACOS-20261010.md)。

解码通过同一Governor串行准入，512MiB许可、384MiB自有进程峰值监测；它是有界监测/终止保护，不能冒称Windows Job Object硬内存上限。取消/超时只操作持有的ChildProcess，实际close归还许可；退出未确认保持隔离与占用。参考帧保留请求/实际100ns时间与PNG，不覆盖原件。内部生成H.264的实际解码、时间/PNG、预取消、close记账和真实物理内存查询通过；2026-10-09旧批Blender来源HTTP403及当时未验保留历史；2026-10-10后续官方实片/Preview限定证据见上方Mac验收记录，完整原生专项状态见[主台账](../../../docs/tasks/TASK-REGISTRY.md#native)。

见 [迁移记录](../../../docs/history/handoff-snapshots/macos-20261009-20261010/MACOS-MIGRATION-20261009.md)。以下保留Windows及历史证据。

---

# Native Work Sets

`work-window-controller.ts` owns one window per saved set and at most eight live windows. It verifies owned
sender/frame/token, scopes previews/notebooks to current members and serializes each window's operations.
`electron-work-window.ts` gives each window a separate memory session, sandbox preload, protocol handler,
blocked external networking and native drag/resize/pin behavior. `work-window-bounds.ts` keeps bounds visible.

Saved set content lives in the held Active Library v16 schema (legacy v7–v15 stays read-only until explicit backed-up retirement), not this controller or browser storage.
Device placement is keyed by an app-scoped opaque identity. Explicit native Save commits content plus layout
atomically; passive geometry writes are separately reported. Hide retains drafts, Close releases a slot and
sets open=false, and library/shutdown drain retires capabilities while retaining saved restore records.

`WorkSetWindow` shares `WorkReferencePanel` and `FocusView` with the approved prototype. It can save in-scope
image notebooks but cannot organize the library, enumerate unrelated files or invoke arbitrary application IPC.
Main-window locate/add events pass identities to the existing workbench; they do not acquire new permissions.

Both authenticated Workspace clients can list and control existing native windows by current Library scope
and saved work-set id through `work-windows:list` and `work-windows:control`. The Shared Client exposes
`workSets.windows(scope)` and `workSets.control(input)`; the control kinds are pin (with a boolean), hide,
recover and close. This separate interface returns open/visible/pinned/unsaved status without native tokens,
draft contents or geometry. Only the actual native port reports visibility and writes window placement.

Workspace close freezes and flushes participants before checking the window's serialized state. A dirty
work-set or notebook keeps its window and draft, shows the native surface, and returns `review-required`;
there is no Workspace discard flag. A clean close saves the real layout with open=false before destroying
the window. Failed/unknown flushes retain windows, and input is released after the check. State changes
publish the shared work-sets event so both clients can reread. Restricted `work-window:*` token APIs remain
native-sender-only. These paths are tested with real temporary SQLite and HTTP plus a fake OS port; that
evidence proves transport, persistence and draft safety, not physical pinning or cross-display effects.

See ADR 0489 and `docs/product/WORK-SETS-20260920.md`. The existing Asset Card module remains a compatibility
entry. The D additions below do not certify physical native or cross-display effects.

## D: media references and independent file copies (2026-10-08)

Ordinary Copy import accepts H.264, unrotated MP4 up to 96 MiB, one hour and 3840×2160 on Windows.
`windows-video-runtime.ts` verifies the packaged, source-bound MIT helper and uses Windows Media Foundation.
It queues decoding through the shared Governor (512 MiB reservation); the helper sets a 384 MiB process
commit limit before decoding. Cancellation/close retains the reservation until actual process close.
The helper is emitted under `out/main/windows-video/` during the normal build; rebuild its source with
`npm run build:windows-video`. Unsupported platforms/codecs do not silently substitute a decoder.

First confirmed video import backs up and upgrades the held Library to v15. Windows backup initial images
are bounded at 4 MiB, with existing journal, file-identity, memory and commit evidence checks preserved.
Canceling import does not upgrade. The migration extends the verified schema without rewriting old assets,
manual content or analysis records. Video is excluded from whole-image AI consumers; its first-frame preview
is not presented as whole-video analysis.

`work-media-storage.ts` owns references per current set/member/source generation. Requested and actual
100 ns ticks, order, notes, public source URL, selected frame and playback position persist in SQLite;
full-size PNGs remain separate from Originals and required first-frame previews. Removed relationships do
not delete the video or delivered copies. Drafts, session/revision checks, idempotent capture, rollback and
member revocation use the existing Host. URLs are recorded without fetching and reject credentials/query/hash.

`WorkMediaPanel` and `WorkFileHandoffPanel` expose the same actions in the Browser and native work windows.
`work-file-handoff.ts` prepares byte-identical Original/Preview copies, full-size compatible PNG or a selected
reference frame. Copies and provenance survive close/restart in the app profile, bounded at 64 copies/1 GiB.
Cleanup is explicit, after receiver-read review, through the system Trash. Each read rechecks library/member
authority and file content. Native drag additionally checks the private window actor/token; a default-app
open is only `open-requested`, never receiver success. External-source Original delivery is refused rather
than moving or overwriting third-party originals; this first path covers managed Copy assets.

`media-response.ts` supports authorized GET/HEAD and single byte ranges for both loopback and native media.
Ranges run only after the Host's normal membership/file verification. Invalid/multiple ranges receive 416;
range responses do not add filesystem access or cache media. This fixes real Chrome MP4 seeking.

Browser acceptance uses Blender's Big Buck Bunny (CC BY 3.0), actual decoding/downloads and full app reopen.
`scripts/work-media.test.ts` covers the real codec/Host persistence, cancellation, format/authority rejection
and handoff lifecycle. `scripts/work-media-http.test.ts` covers range transport and authorization.
Real read-only preservation/download oracles are scoped to the designated public source and D copy.
Native receiver import, physical drag/pin/hide/multiscreen remain deferred; D's parent is not complete.
See `docs/handoff/WORK-MODE-D-20261008.md` for candidate-specific evidence and limitations.

macOS native windows use `vibrancy: under-window` and `visualEffectState: active` to soften the desktop behind
them even when unfocused. CSS backdrop filtering alone cannot blur other application windows. The macOS Renderer removes its full-panel tint, CSS backdrop blur, 6px inset and second rounded surface;
foreground colors track system appearance. Images stay unfiltered. Non-macOS uses a legible solid fallback,
not an unverified imitation of native desktop blur. See DESIGN.md for the window interaction contract.

2026-10-09 Mac原生续验：交付记录的assetId决定拖动图标，不能使用工作集第一成员。Finder .DS_Store仅作为有界普通文件元数据识别，不读内容、不接受链接；其他未知根内容、角色／成员／来源、64目录与1 GiB预算保持。正式接收与物理拖动按[本轮记录](../../../docs/history/handoff-snapshots/macos-20261009-20261010/MACOS-T23-NATIVE-FORENSICS-20261009.md)分别记证据。
