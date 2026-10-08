# Forget Defaults To Keeping Handles While Uninstall Requires A Choice

When **Forget Library Registration** finds eligible Device Trash Restore Handles or Managed Residue Trash Restore Handles, its confirmation selects and recommends **Keep Local Restore Handles** by default. Continuing with that choice retains the handles only as dormant device-local recovery state; it does not keep the Library Registration active, copy source files, or add anything to portable library state. **Clear Local Restore Handles** remains available as an explicit privacy choice after a path-free affected count and the loss of one-click source or residue restoration are disclosed.

ADR 0308 keeps Transfer Destination Replacement Receipts separate because they recover displaced external files rather than a deleted Referenced Asset source. Forget Library Registration retains those receipts as active Local File Recovery by default, so they remain usable without reconnecting the library; the user may clear them only through an explicit recovery-record action that discloses the loss of application-assisted restoration.

ADR 0465 Protected Custom Field Draft Recovery Journal records, including ADR
0455 Text records, likewise default to Keep after a path-free affected count.
They remain encrypted and inactive until the same verified Local Library
Instance is active; Clear is an explicit privacy choice and cannot alter
committed library metadata.

ADR 0458 Batch Text Undo Journals likewise default to Keep Batch Text Recovery
and become inactive Dormant Batch Text Recovery after Forget. An unfinished
operation must first reach its item boundary, and its journal cannot be cleared
until explicit Cancel Remaining makes the operation terminal. Terminal clearing
discloses eligible Undo and removes only local detail/journal evidence; it never
changes committed Text or deletes the library.

**Uninstall Preparation** has no preselected answer. It cannot remove app-managed local state until the user explicitly chooses to keep or clear supported Device Trash Restore Handles, Managed Residue Trash Restore Handles and Local File Recovery records for a later reinstall. This deliberate choice avoids treating either recoverability or local-state minimization as universal during uninstall. Clearing affects only the selected device-local handles or records: it does not remove Portable Referenced Source Deletion State or Managed Conversion Residue Cleanup State and never restores, empties, moves, or deletes operating-system trash contents.

Batch Text Recovery adds a separate uninstall gate rather than changing those
unpreselected handle/receipt choices. It reports active/Paused and
terminal-Undo counts and recommends Cancel Uninstall And Review Batch Text
Recovery. Explicit Proceed And Lose Batch Text Recovery safely pauses every
reachable operation at an item boundary before clearing the journals; it does
not infer Cancel Remaining or create a terminal result. Inability to settle a
current write blocks the product-controlled uninstall until normal
reconciliation proves a safe boundary. The loss warning explains that Batch
Text Undo cannot be exported or restored after removal and that the library
operation remains Paused for later aggregate inspection or cancellation.

These defaults apply only to product-controlled flows. External bundle deletion, third-party uninstallers or cleaners, device erasure, and out-of-band application-data removal cannot be reliably intercepted and receive no retention guarantee. The current project has no handle store, dormant registry, Uninstall Preparation surface, Asset Trash, or platform restore adapters. This ADR records target architecture only and accesses or changes no runtime/user file, public IPC, database schema, or AI Worker API.
