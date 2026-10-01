# Used Custom Fields Change Type Only Through New-Identity Migration

Changing a used Custom Field Type in place could reinterpret stored metadata and silently alter filters or import mappings. Only an **Empty Custom Field Definition**—with no current Candidate/Design Asset values, unresolved AI suggestions or ADR 0421 Custom Field Dependency References—may change type in place while preserving its identity. Even that change must disclose incompatible type-specific configuration rather than silently carrying it into a different contract.

Every used field changes type through a reviewed **Custom Field Type Migration**. The user creates a target Custom Field Definition with a new stable identity and desired type, then reviews a **Custom Field Type Migration Preview** that separates deterministically convertible values from values that cannot be converted and identifies Saved Search, User Smart Filter and Import Mapping Preset dependencies requiring explicit remapping.

After confirmation, only values proven convertible under ADR 0424 lossless/explicitly selected rule-governed conversion or ADR 0425 manual mapping become current values on the target field. Values that cannot be converted remain preserved on the source field; the application never clears them, substitutes a default, stringifies an unsupported value or treats failed conversion as an empty value. Per-item commit/undo behavior remains a dependent decision rather than implicit coercion.

Migration never moves ADR 0421 dependencies automatically: each affected criterion or mapping remains bound to the source identity until the user explicitly removes or compatibly remaps it. Under ADR 0426, the terminal result recommends but never automatically performs ADR 0420 archive; explicit result confirmation is required, and archive preserves the source's original values and unresolved suggestions. Migration never permanently deletes the source field or makes its retained dependencies appear executable. Plugins, importers and AI cannot initiate or confirm this schema transition under ADR 0418.

ADR 0475 requires even an otherwise Empty in-place type change to replace the
source Static Custom Field Default with one valid in the target type, disable
it or cancel. A used-field target definition likewise receives only an
explicitly configured valid target default; migration never converts or copies
the source default by assumption.
