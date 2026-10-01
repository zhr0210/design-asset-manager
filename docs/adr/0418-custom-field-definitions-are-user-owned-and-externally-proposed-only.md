# Custom Field Definitions Are User-Owned And Externally Proposed Only

Plugins, imported schemas and AI can discover useful structure, but allowing them to mutate a library's field schema silently would create persistent clutter, collisions and extension lock-in. Every core **Custom Field Definition** is therefore user-owned library content.

Users may create and modify definitions through trusted core application surfaces. A plugin, Metadata Import Adapter, Field Mapping Import or other importer may emit a bounded **Custom Field Definition Proposal** containing its requested name, ADR 0417 type, applicable validation/options and provenance. The host validates proposed field names and Select-option labels under the same portable comparison policy as user-authored schema and validates every proposed Number constraint under ADR 0435, then presents explicit Create New, Map To Existing or Exclude choices with collisions and conversion consequences. A plugin cannot supply or bypass those host rules. Only trusted application confirmation creates or maps a definition.

An accepted proposal becomes an ordinary library-owned definition rather than plugin-owned state. Disabling, uninstalling, revoking or losing the proposing plugin leaves the definition and conforming values intact and portable. A later plugin version cannot silently rename, retype, delete, reorder or change options through prior consent, a stored mapping or Namespaced Extension Storage.

AI and Analysis Result Providers cannot create, rename, retype, delete or otherwise mutate Custom Field Definitions. Whether they may propose values for an already existing definition is a separate decision. Capture/Import Producers and commands likewise cannot write definitions directly; every proposal crosses the same host review and current-library write boundary.

ADR 0420 owns ordinary user archive/permanent-delete lifecycle, ADR 0422 owns user rename and active-name uniqueness, ADR 0423 owns user-reviewed type migration, ADR 0433 owns field/option name comparison and collision handling, ADR 0435 owns Number-domain validation, and ADR 0438 owns user-confirmed validation-rule changes. Reorder, proposal batching, mapping-preset persistence and imported value conflict resolution remain explicit dependent policies rather than authority inherited from proposal provenance.

ADR 0474 allows a Definition Proposal to propose one optional type-valid Static
Custom Field Default, but only the same trusted Create New review can accept
it. ADR 0473 specializes True/False for Boolean. Proposal provenance grants no
later default-change, dynamic-execution or backfill authority.
