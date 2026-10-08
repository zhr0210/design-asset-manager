# Critical Memory Pressure May Reclaim Complete Manual Undo Entries As A Last Resort

The ADR 0469 device setting is a normal retention maximum, not authority to
endanger application or operating-system responsiveness. **Critical-Pressure
Manual Undo Reclamation** is therefore a trusted-host last resort. Ordinary or
warning memory pressure first stops affected background admission and requests
safe release of unpinned idle models, rebuildable preview/cache state and other
disposable application memory. It does not reduce the manual stack while those
measures are sufficient.

Reclamation below the configured Undo budget is permitted only when fresh,
platform-qualified operating-system evidence says memory pressure is Critical
and the preceding safe releases have not cleared that state. Unsupported,
stale, Unknown or merely estimated pressure is never upgraded to Critical.
Renderer state, a plugin, an ordinary allocation estimate or a user-facing
performance profile cannot invoke this authority. The coordinator must not
interrupt an authoritative metadata transaction, discard a current draft or
its protected recovery, delete an original/result, or corrupt a worker merely
to reclaim Undo memory.

When the last resort is necessary, the trusted host evicts the oldest complete
manual history entries in bounded batches and refreshes pressure evidence after
each batch. It stops immediately when pressure is no longer Critical or the
stack is empty. Evicting an entry removes that entry's complete Undo and Redo
evidence together; an ADR 0467 compound entry is never split, and ADR 0468
Unavailable status never pins it. There is no hidden minimum beneath which the
configured 20-step/8-MiB lower settings become a safety guarantee, no disk
spill, and no conversion of protected draft recovery into Undo.

No blocking confirmation is required during a proven critical-pressure event
because waiting would weaken the safety action. The active application surface
instead reports a content-free session aggregate: how many complete manual
opportunities expired for system memory safety, the retained entry count and
estimated retained bytes. It sends no operating-system notification and stores
no values, paths or per-entry detail in activity, portable history, logs,
telemetry or plugins. Expired evidence cannot be reconstructed after pressure
clears or after the user raises the configured budget.
