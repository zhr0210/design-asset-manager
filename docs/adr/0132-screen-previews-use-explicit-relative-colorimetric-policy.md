# Screen Previews Use Explicit Relative Colorimetric Policy

Ordinary color-managed screen previews use an explicit Preview Rendering Policy of ICC media-relative colorimetric intent with Black Point Compensation enabled. The same selected policy applies when rendering tagged P3 and sRGB overview, quick-preview, or tile variants so destination choice and lazy rendering do not silently change reproduction style. This is application rendering policy, not Authoritative Color Evidence and not a claim about the original creator's intent.

The application must not switch rendering intent from image content, format, filename, category, pixel appearance, or the ICC profile header alone. A user may explicitly select perceptual intent when gamut compression and pictorial tonal continuity are preferred. ICC-absolute colorimetric is restricted to an explicit future soft-proof workflow, and saturation intent requires an explicit graphics-oriented choice; neither becomes an automatic ordinary-preview fallback.

Each Color Derivation Generation records the selected rendering intent and Black Point Compensation state alongside its source and destination profile references. Changing either setting invalidates the affected color-dependent derived media and creates a new atomic generation. If the requested intent or transform cannot be validated, the backend exposes the failure and retains the last valid generation or clearly labeled Unmanaged Structural Preview when available; it does not silently substitute another intent or activate partial output.

Rendering Intent Override scope and persistence are governed by ADR 0133; the product policy is not replaced by a mutable library-wide user default.
