# Asset Restore Does Not Overwrite or Auto-Merge

Asset Restore should not overwrite existing Design Assets or automatically
merge with them. When restoring to a missing Asset Collection, it should fall
back to Unsorted Collection as already decided. When filename, content, target,
or linked-state conflicts are detected, the app should open a Restore Conflict
Sheet and default to Restore as Copy, preserving Promotion Link and source
history. If the same content already exists in the active library, the app may
explain that the asset appears to be restored already, but it should not
silently delete or merge the Asset Trash record.

ADR 0296 specializes one physical-source case before this generic Design Asset
conflict default applies. A Referenced Source Restore Conflict does not default
to Restore as Copy: an exact current-generation file already at the original
path can reconnect the same Referenced Asset, while different content requires
an alternate restore destination or an explicit replacement decision. Neither
path overwrites or automatically merges Design Assets.
