# Batch Text Recovery Is Durable While Undo Evidence Remains Device-Local

A Batch Text Edit may commit some owners before interruption, so neither an
ephemeral renderer task nor a value-history table can safely own its recovery.
Execution therefore creates a library-bound **Batch Text Edit Operation
Record** containing the frozen action and parameters, exact member identities
and base revisions, initiating-device execution identity, per-item operational
state and commit-effect markers. It contains no previous Text value. Each item
atomically commits its new Custom Field Value revision and corresponding effect
marker; the record is the authority for active/paused reconciliation, not a
portable edit history. Active parameters and member detail are excluded from
Full Library Backup, Offline Library Catalog, export, merge/sync, plugins, logs,
telemetry and ordinary long-term activity history. A restored backup contains
the committed current values but never resumes the old batch.

Undo-capable execution separately uses an operating-system-protected,
device-local **Batch Text Undo Journal**. Before a Changed item may commit, the
trusted main process durably stages its exact previous value-or-Missing state,
proposed result, owner/field identity, base/result revisions and operation
effect identity. Only then may that item write. A journal write, protection or
storage failure leaves that item uncommitted, stops admission of later items
and preserves Undo for items already proven committed; execution never silently
falls back to plaintext or continues with partial protection. The journal and
device-local item detail are not Custom Field Values, cache, backup, sync,
search, export, plugin data, logs, telemetry, notifications or crash-report
content.

After an unexpected termination, startup reconciliation compares operation
markers, journal stages and current revisions. It discards only entries proven
never committed, classifies proven commits and leaves all not-yet-started work
Paused. It never auto-resumes writes. The owning surface offers Resume, Cancel
Remaining and Undo Completed when their required evidence is available. Resume
revalidates the exact library instance, plan, owner, field, rules and revisions
before admitting the next item. Library Switch and Safe Stop And Quit
checkpoint at the same item boundary.

Opening the same Local Library Instance on a device that lacks the exact
protected journal does not transfer, export, synchronize, re-encrypt or recreate
that journal. The other device may inspect path-free aggregate state and Cancel
Remaining at an item boundary, but it cannot Resume the old plan, Undo Completed
or Clear Batch Text Edit Result And End Undo as though it possessed the missing
evidence. To continue editing there, the user first makes the old operation
terminal and creates a new Batch Text Edit Plan from current values; the new
operation never joins or extends the old Undo chain.

Cross-device Cancel Remaining writes a non-user-facing, value-free **Batch Text
Terminal Marker** containing only opaque operation and initiating-device
execution identities, terminal class/time, Undo deadline and journal
acknowledgement state. It authorizes no write, Resume or Undo and is excluded
from Batch Result History, search, export, Full Library Backup, merge/sync,
plugins, logs and telemetry. When the initiating device next reconciles the
same Local Library Instance, it applies the original terminal time: an
unexpired journal retains only its remaining window, while an expired or
cleared journal is removed before it can offer Undo. The marker is deleted
after that device acknowledges journal disposition or the exact library
instance is authoritatively retired; visible result expiry alone cannot remove
an outstanding marker and accidentally revive late Undo.

ADR 0279 Forget Library Registration first reaches the ordinary safe item
boundary and shows path-free active/Paused and terminal-Undo counts. **Keep
Batch Text Recovery** is selected and recommended by default: the protected
journal remains as **Dormant Batch Text Recovery** bound to the exact library
lineage/instance and cannot Resume or Undo anything until that same instance is
registered, activated and reconciled again. Forget still removes the
registration and never transfers recovery into library state. A non-terminal
journal cannot be cleared during Forget; the user must return to the operation
and explicitly Cancel Remaining first. Once terminal, Clear Batch Text Edit
Result And End Undo may remove its local detail and journal after disclosing
the eligible Undo count, without changing committed values or deleting the
library.

ADR 0299 Uninstall Preparation separately reports all active/Paused and
terminal-Undo Batch Text journals, including dormant recovery. **Cancel
Uninstall And Review Batch Text Recovery** is recommended. If the user instead
explicitly chooses **Proceed And Lose Batch Text Recovery**, every reachable
non-terminal operation first reaches its safe item boundary and persists
Paused; inability to settle the current write blocks the product-controlled
uninstall until normal reconciliation can establish that boundary. Proceeding
does not imply Cancel Remaining and creates no terminal result or marker. The
confirmation discloses that all represented Batch Text Undo and local detail
will be irrecoverable and clears them without export, transfer, backup or
plaintext fallback. The library operation remains Paused so a later
journal-less device may inspect and Cancel Remaining under the cross-device
rule. This Batch Text gate does not preselect the independent Keep/Clear choices
for trash handles and Local File Recovery.

External application deletion, third-party cleaners, device erasure and
out-of-band application-data removal cannot be intercepted or promised the
same terminalization. They authorize no library write: current committed Text
remains authoritative, the library operation remains Paused, and a later device
without the lost journal may only inspect aggregate state and Cancel Remaining
under the cross-device rule above.

Becoming terminal, including through Cancel Remaining, compacts the library
record into a lightweight **Batch Text Edit Result** with aggregate counts and
reason classes and classifies it as an ADR 0086 Reviewed Batch Action. The
result and its device-local item detail and Undo eligibility share the ADR 0087
user-configurable retention period, defaulting to 30 days. That clock begins
only when the operation is terminal; an active or Paused operation and evidence
needed to reconcile it cannot expire. Expiry removes exact values, item
identities, operation parameters and executable Undo evidence and may retain
only value-free Pruned Batch Detail. Confirmed **Clear Batch Text Edit Result
And End Undo** is unavailable while work is non-terminal or the corresponding
journal is absent from the current device. It must disclose the current
eligible Undo count before removing the result detail and journal.

Undo rechecks each successful item's current owner, field, rules, value revision
and exact committed effect. A current item restores its previous
value-or-Missing state in one atomic owner commit; later-edited, unavailable or
otherwise drifted items are excluded or conflict under ADR 0097 without
overwriting. The Undo operation may therefore finish partially and reports its
own truthful operation-scoped result. It never manufactures per-owner ADR 0465
Custom Field Edit Undo Steps or a global transaction over the whole batch.

Before confirmation, trusted preflight estimates protected journal demand for
the Changed scope against the device volume's Storage Safety Reserve. Unknown
or insufficient safe capacity blocks Undo-capable execution by default and
offers reducing scope or resolving storage. A separately confirmed high-risk
**Execute Batch Text Edit Without Undo** path may proceed from that blocked
state only after disclosing the Changed count and irreversible loss of previous
Text recovery. It is never selected, remembered or entered automatically.
No-Undo execution still uses the durable operation record, per-owner atomic
commits, safe-boundary pause and startup reconciliation, but exposes no Undo
Completed action. An already-started Undo-capable batch never downgrades to
No-Undo after a journal failure.

ADR 0477's cross-device Missing-initialization recovery does not change this
boundary. That operation can avoid a device-local prior-value journal only
because every writable previous state is proven Missing; Batch Text retains
arbitrary old values and therefore still requires the initiating device's exact
protected journal for Resume and Undo.
