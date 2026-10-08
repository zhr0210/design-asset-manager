# Dedicated OCR Preserves Empty Results And User Corrections

Status: Accepted (2026-09-20). Implements the user-approved dedicated OCR integration; actual delivery evidence remains separate.

Dedicated OCR observations are stored independently from combined visual-model output. A successful empty
recognition remains evidence and takes precedence over speculative visual-model OCR in the ordinary OCR
projection; failures never replace an existing result. This prevents a later caption/prompt run from restoring
hallucinated text or erasing OCR. Absence of dedicated evidence retains the explicitly labeled visual-model
fallback for compatibility. Existing visual evidence is not rewritten.

The Main-owned Active Library connection stores immutable recognition evidence and a revisioned current
selection/user correction in explicit schema v8. Reads never upgrade; the disclosed OCR execution confirmation
authorizes the first successful save to upgrade atomically. User corrections survive subsequent recognition
of the same preview; original recognized text remains available. Revision, preview, session and cancellation
checks guard commits. Earlier library formats remain readable; earlier applications may not open v8.

We choose a separate capability table instead of forcing OCR to invent caption/prompt fields in VisualAiOutput.
It costs a schema migration and a separate projection but preserves valid-empty and correction semantics.
This does not freeze a universal plugin/analysis schema, revive legacy global-DB workers, automatically install
runtimes or prove recognition quality. See [the OCR implementation and evidence](../product/RAPIDOCR-EVALUATION-20260920.md).

Committed evidence remains readable after Trash/restore when the preview is unchanged. The recorded asset
revision is provenance; strict current lifecycle revision matching still guards every new commit, so a job
started before Trash cannot write after restore. This mirrors preview-bound notebook retention.
