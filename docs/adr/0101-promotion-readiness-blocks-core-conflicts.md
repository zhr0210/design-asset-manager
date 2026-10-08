# Promotion Readiness Blocks Core Conflicts

Promotion Readiness should distinguish Promotion Blocking Conflict from
Non-Blocking Conflict. A conflict between explicit target-collection intents,
or a conflict affecting file ownership, candidate identity, title, caption, or
another core promotion field, should block Quick Promote and be excluded from
default Batch Promotion with visible reasons. Absence of a more specific target
is not a conflict and resolves to ADR 0033 Unsorted Collection under ADR 0413.
Lower-risk conflicts such as supplemental tags, color suggestions, or broad
classification may use Post-Promotion Conflict Carryover so the candidate can
become a Design Asset while conflict attention remains available for later
resolution. ADR 0128 specializes this boundary for Color Profile Conflict: it
blocks Quick Promote and default Batch Promotion, but a user may explicitly
review and carry the unresolved conflict through Candidate Promotion without
the system choosing a source profile. ADR 0129 applies the same reviewed-
promotion boundary to a Recoverable Invalid Color Profile while keeping Color
Evidence Safety Failure non-overridable.

ADR 0142 further clarifies that AI enrichment completion and unconfirmed AI
suggestions are Non-Blocking by default. A user may explicitly choose a scoped
Await Analysis action, but that choice does not redefine global Promotion
Readiness or weaken core, safety, integrity, color-safety, or preview gates.
