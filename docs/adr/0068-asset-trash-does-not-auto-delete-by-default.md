# Asset Trash Does Not Auto-Delete by Default

Asset Trash should not permanently delete confirmed Design Assets by default
because library assets have already been accepted by the user and carry higher
loss risk than unpromoted candidates. Asset Trash Retention Policy may allow
user-enabled automatic cleanup, but Permanent Asset Delete must require
confirmation and batch permanent deletion must show affected count and
irreversibility. Asset Restore should restore the Original Asset relationship
and availability under its ownership-specific recovery policy, plus tags,
Collection Memberships, Asset Source, and Promotion Link state; if an original
Asset Collection no longer exists, the asset should restore to Unsorted
Collection with user-visible feedback. The application is permitted to operate
the platform's trash/recycle-bin restoration capability for an explicit Restore
Referenced Source File action. ADR 0295 restricts automatic restoration to an
exact app-created Referenced Source Trash Receipt without enumerating unrelated
system-trash content; ADR 0296 resolves an occupied original destination without
automatic overwrite, rename, or duplicate Design Asset creation.
