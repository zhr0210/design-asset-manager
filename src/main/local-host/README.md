# Local DAM Host and clients

Desktop and Browser use the same `src/shared/client` product API and the formal
React Renderer. Electron remains the sole file, SQLite, process and inference
authority. `index.ts` registers each command once; Electron IPC and the loopback
HTTP adapter enter the same handler and existing Library authority queue.

## Launch and lifecycle

Build with `npm run build`. `npm run start:desktop` opens the desktop workspace;
`npm run start:browser` starts or connects the same local profile and opens a
one-use browser entry. Browser-only startup does not require the main window.
Closing a surface detaches that client. The visible **退出整个 DAM** command
checks all participants and drafts before ending the Host.

Ordinary launch accepts an explicit absolute `--profile` directory. Settings,
credentials, App state and recovery belong to that Host profile. Browser session
cookie names include the loopback port because cookie scope itself ignores ports;
different profile Hosts do not overwrite one another's grants. Reopening the same
Host entry reuses a still-valid browser session while retaining distinct document
IDs and the existing one-use grant, Origin, Host, CSRF, role and revocation checks.
Agent diagnostics never need to read the Cookie or credential bytes.

Windows installer configuration adds **DAM 浏览器版** to Start alongside the
existing desktop entry. The macOS DMG configuration includes a small
**DAM 浏览器版.app** launcher beside the main app and Applications drag target.
Both launch the same executable with `--dam-browser`; early repeated launches
wait for Host readiness and recheck shutdown admission before opening a view.
Initialization failure shows fixed local guidance, approves exit, and returns
before presenting a partially initialized workspace. The existing
`ShutdownCoordinator` cleans up this startup's resources through `app.quit()`.
An actual Browser presentation failure shows fixed recovery guidance and retains
the running Host, queued Desktop launches and subsequent launch retries. The
launch owner still rejects the failed presentation; admission rejection does
not show a presentation-failure prompt. A missing local server explicitly rejects
Browser opening. The visible Browser command uses this same launch owner and
retains its trusted-sender check and success/rejection result.
The companion executable must retain LF line endings and Git mode 100755.
These are package configuration and isolated shell/launch tests, not evidence of
an installed shortcut, macOS execution, companion signing or notarization.

`scripts/launch-local-dam.mjs --client=browser --synthetic --fixtures` creates a
fresh controlled profile and sources for acceptance. The optional fixture
server provides only registered local responses; it exits with that Host.
It does not install or run a real model, log into an account, or grant access
to adjacent loopback services. Omit `--fixtures` to prohibit those test actions.
The receipt and screenshots are local evidence under `.scratch`, not releases.

## Boundaries

- `local-dam-server.ts`: binds `127.0.0.1` on an OS-assigned port; a one-use launch
  exchanges for an HttpOnly/SameSite session. Every document gets its own client
  identity. Origin, Host, CSRF and registered-command checks precede invocation.
  Native-card and work-window commands retain their narrower sender roles.
  BrowserTransport assigns a per-document `X-DAM-Invocation` sequence to each
  fetch. Admission records it before effects: a socket-level retry receives fixed
  unknown-result guidance and never executes again, even while the first attempt
  is pending or failed. The bounded 1024-number window accepts reordered arrivals
  but rejects older numbers permanently for that document. No result, body or
  credential is cached; normal revocation and channel admission still precede it.
  This is duplicate admission, not a write retry queue. Direct callers omitting
  this optional transport header retain the existing command contract.
- `file-selection.ts`: page-based selection belongs to one owner and Library
  generation. Directory browsing, links, confirmation and directory creation
  are checked in Main. A synthetic profile rejects lexical escapes and links
  before resolving a selected target, then rechecks the real path against its root.
- `command-receipts.ts`: issued review receipts belong to an owner, purpose and
  generation and expire. `clientReceipt` in Connected Library is an idempotency
  key, not a permission token.
- `workspace-drafts.ts`: bounded, profile-local drafts are separate from saved
  asset content. Recovery retains its original baseline and requires an explicit
  user action. Credentials and image bytes do not belong in drafts or events.
  Each document registers a writer through `workspace:ready`. All put/remove,
  recovery and discard mutations carry a sequence assigned at the user action.
  The Host rejects older sequences and prior document writers, including queued
  requests after reload, deletion or ownership transfer. Existing v1 recovery
  records remain readable; new writes require order. Failed persistence cannot
  advance the accepted sequence or claim that a draft was received.
  After an explicit received-draft discard succeeds, this document also clears
  its suspended editor copy and older pending responses. Cancel/failure retain
  input; a later edit and another owner's local input remain independent.
- `workspace-transitions.ts`: freezes, collects and drains all participating
  surfaces. An uncertain/disconnected participant cannot acknowledge a flush.
  Review expiry is suspended throughout confirmation; a changed or failed review
  gets a new idle timeout, so an expiry cannot thaw a still-running operation.
- `synthetic-profile.ts` and `synthetic-fixtures.ts`: enforce the test boundary
  in Main, independently of browser controls. Fixture execution requires exact
  registration and endpoint matching; arbitrary local or external services fail.

The browser blocks writes while disconnected or reconciling, rereads snapshots
and awaits mounted UI reconcilers. It never automatically retries an uncertain
commit. Read commands are explicitly listed in `workspace-read-commands.ts`;
unknown names are blocked. Notification failures do not reverse a completed
commit. Media references remain scoped to current Library authority.
Configuration, Notebook and visual AI action surfaces retain the fixed transport guidance
for an unknown commit instead of reporting a failed write or suggesting a blind
retry. Input remains available; authoritative reads confirm the saved result.
Connection guidance is rendered outside the frozen business surface, so a normal
Host quit still exposes its recovery instructions without enabling stale actions.

## Evidence

Focused tests cover the shared Client, real temporary SQLite/HTTP/Copy path,
origin and session rejection, selection ownership, receipts, settings conflicts,
draft bounds and lifetime, reconnect barriers, and per-client native-card drafts.
Use the repository Electron Node launcher for SQLite tests. Browser CU and actual
native system effects follow [the acceptance workflow](../../../docs/agents/ui-ux-acceptance.md)
and are reported separately. Source registration and synthetic inference are
not proof of real model execution or native window behavior.

`local-dam-browser-unknown-commit.test.ts` passes actual Browser transport calls
through loopback HTTP and production Settings IPC into a synthetic disk file.
It withholds replies after successful commits and verifies one durable effect,
unknown-outcome guidance, authoritative rereads, no reconnect replay, and closed
write admission during failed calibration. Its controlled event signal and
response fault injection are isolated integration evidence, not real SSE faults
or Computer Use. Actual component tests separately cover lost save receipts in
Backend/Pi/Task settings, preferences and Notebook without discarding input.
`local-dam-ai-unknown-commit-view.test.mjs` checks actual visual execution,
cancellation and Inspector tag confirmation with synthetic responses, including
safe generic feedback for ordinary errors; it never runs a model or provider.

`scripts/local-dam-launch.test.ts` executes the actual Main launch, readiness and
quit registration sections with injected adapters. It covers fixed failure
feedback, cleanup after early or partial initialization failure, admission,
queued Desktop presentation and Browser retry without starting a Host or native
window. Native startup-failure and Browser-open-failure dialog CU remains
`BLOCKED_UX_ACCEPTANCE`: browser controls cannot verify Electron system dialogs,
and native desktop control is unavailable in this session. These adapter tests
do not establish native dialog appearance, focus or dismissal behavior.
