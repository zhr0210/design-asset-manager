# Carryover Resolution Updates Candidate Trace Lightly

Carryover Resolution should preserve Trace Consistency without turning
Candidate History into Design Asset version history. When a carried-over
conflict is resolved on a Design Asset, the app should write a lightweight
Carryover Resolution Link and Candidate Trace Update back to the original
Candidate History. That update should record resolution status, time, field
category, and Design Asset reference, but should not copy full metadata,
content snapshots, or current asset values; the current metadata remains owned
by the Design Asset, while the candidate side keeps only trace evidence.

That rule includes ADR 0416 Custom Field Values: after Promotion they remain
current only on the Design Asset, and Candidate Trace Update records at most the
affected field category/definition identity and resolution link, not the value.
