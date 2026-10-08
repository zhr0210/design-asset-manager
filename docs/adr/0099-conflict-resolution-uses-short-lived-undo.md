# Conflict Resolution Uses Short-Lived Undo

Conflict Resolution Choice should offer short-lived Conflict Resolution Undo so
users can recover from accidental choices without turning metadata conflict
handling into long-term version history. The undo window should rely on a
minimal Resolution Snapshot and should not store content snapshots or full
metadata dumps. After Resolution Finalization, changing the result should use
Conflict Reopen or ordinary metadata editing rather than undoing the old
resolution.

ADRs 0465 and 0467 manual Custom Field editing use a separate
current-library-session Undo Stack whose single-field and compound steps never
extend Conflict Resolution Undo or store a resolved conflict's choice as
ordinary manual edit history.
