# Same-Format Rewrite Is A Distinct Protected Flow

Status: Partially superseded by ADR 0348. The same-format rewrite boundary
remains accepted. Every former requirement for cross-format current-source
replacement in this ADR and ADRs 0323 through 0328 is Historical.

**Rewrite Referenced Source** keeps the current physical path, verified real format and format-valid extension. It may change dimensions, color space/profile, bit depth, compression, quality or other capability-supported content properties only when the same-format encoder preserves every structure promised by Referenced Source Rewrite Review. A format whose PSD/TIFF layers, pages, AI/PSB structure, RAW sensor content or other material units cannot be retained is not eligible for source rewrite; changing the filename extension, relabeling bytes or flattening them under the original professional format never substitutes for capability support.

Cross-format output is only a **Compatible Export**: a separate user-owned file
that does not change, relink, rewrite, or delete the current source
relationship. The application provides no Change Referenced Source Format or
Use Exported File as Current Source flow. ADR 0348 is authoritative for this
source-separated boundary, including Compound Originals.

The same-format flow remains a single-file source operation. ADR 0347 supplies
the separate complete-group contract for a Referenced Compound Original. The
current application implements neither flow. This ADR records target
architecture only and changes no runtime/user file, public IPC, database
schema, or AI Worker API.
