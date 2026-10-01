# sRGB Readiness Does Not Wait For A Degraded P3 Derivative

A validated sRGB overview baseline plus On-Demand Render Manifest satisfies the display-preview portion of System Preview Ready when P3 Preview Variant rendering alone fails or remains pending. The candidate stays eligible for Candidate Promotion, Quick Promote, and Batch Promotion rather than being trapped in Capture Inbox. On every display, including verified P3 displays, runtime selection uses valid sRGB output until P3 rendering becomes available.

The missing P3 result is recorded as Wide-Gamut Rendering Degraded with cause, attempt state, Color Derivation Generation, and visible Inspector explanation. Cause-aware background retry may repair transient failure, while a deterministic P3 failure for an otherwise supported source/profile/recipe is a backend capability defect that requires regression evidence and a code fix. It does not become user error or a reason to recapture or rewrite the original.

Wide-Gamut Rendering Degraded never authorizes relabeling sRGB bytes as P3 or claiming that wide-gamut presentation is active. If no validated sRGB or applicable Unmanaged Structural Preview baseline plus required render path can satisfy System Preview Ready, the outcome remains blocking Preview Generation Failure under ADR 0123.
