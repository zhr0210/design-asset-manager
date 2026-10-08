# User-Initiated Long-Running Operation Notifications Are Aggregate And Background-Only

A user-initiated long-running Asset Export, AI operation, model/runtime or
plugin download/installation, or ADR 0403 Long-Running Recovery Staging Release
may emit a system notification only for Completed, Partial/Failed or durable
Needs Attention outcomes, and only when no main window is foreground at that
transition. Foreground outcomes remain in Application
Status Center, the owning workspace and ordinary in-app feedback. Routine
progress, resource waiting, automatic retry, concurrency/profile changes,
preview generation and automatic indexing never produce operation system
notifications.

One opaque operation emits at most one terminal notification. Closely related
terminal outcomes within 30 seconds coalesce rather than producing a burst.
Content is limited to operation kind, aggregate counts/status and a generic next
action; it contains no asset, filename, collection, thumbnail, source, path,
OCR, tag, description, prompt, model path, credential or private error text.
Export, AI and download/installation delivery are independent device settings.
Preview and automatic-index notification classes do not exist by default.
The three long-running-operation preferences default On as desired delivery,
but initial operating-system permission remains Not Requested. Under ADR 0202,
only an explicit notification enable action or first confirmation of an
eligible operation may show the one contextual primer. Continue may invoke the
system request; Not Now, denial or system disablement never creates an
automatic repeat prompt. App Settings instead shows truthful delivery status
and a user-invoked Open System Notification Settings action when supported.

Every emitted operation notification binds a path-free, replay-safe
**Notification Navigation Intent** to current evidence rather than embedding a
route or private identifier in the operating-system payload. Activating one
operation opens its current result or Needs Attention surface; activating a
coalesced notification opens Activity filtered to the still-current related
operations. If detail has expired, Activity truthfully reports Detail Cleared
without reconstructing or rerunning work. If an owning library is closed or
unavailable, the app shows a safe aggregate and requires an explicit Library
Switch choice; notification activation never opens, registers or switches a
library automatically. Dismissing a notification does not resolve attention,
cancel work, delete evidence or change notification settings.

ADR 0402 startup reconciliation, a read-only recovery recheck and Defer Startup
Recovery Review do not emit a new operation notification or repeat an earlier
one. Their durable aggregate state remains in Application Status Center and the
main interface until evidence or an owning recovery decision resolves it.

A Long-Running Recovery Staging Release uses the existing notification setting
for every owning operation category represented by its selected items. It emits
at most one aggregate terminal notification only when all represented settings
are enabled; any disabled category makes the mixed batch silent rather than
omitting items, exposing disabled-category counts or emitting multiple notices.
The notification names only the recovery-staging operation and aggregate result,
and its Navigation Intent opens the current lightweight batch result. It never
contains a task, asset, filename, path or staging location.
Accepting Cancel Remaining Recovery Staging Releases suppresses the batch's
terminal system notification even when some earlier items were Released; the
in-app result remains authoritative and no cancellation notification is sent.

Notification delivery remains subordinate to operating-system permission and
never replaces durable task evidence or Application Status Center. This shared
operation rule does not remove the separately governed ADR 0199–0201 material
AI trust-attention notification classes. ADR 0175 further specializes eligible
AI operations, privacy, coalescing and deduplicated delivery. ADR 0203 keeps all
these notifications at ordinary operating-system priority with no custom or
forced sound, vibration, attention-stealing UI or Focus/Do Not Disturb bypass;
normal user-configured operating-system sound/banner behavior remains
authoritative.

The current application has no shared system-notification service or complete
Application Status Center. This ADR records target behavior only and sends no
notification, requests no permission, opens no task, reads no user operation or
private data, and changes no public IPC, database schema or AI Worker API.
