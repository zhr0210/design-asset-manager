# Preview Retry Is Cause-Aware

Partially superseded by ADR 0123. Preview work remains independent from Candidate Artifact acquisition and may use cause-aware scheduling, but Preview Unavailable is not an acceptable steady state for a declared supported format. Deterministic failure is a backend capability defect that blocks Candidate Promotion until the automatic preview path is repaired; Manual Preview Retry is diagnostic rather than the normal resolution.
