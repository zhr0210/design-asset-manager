# Global Search Uses a Search Palette

Current-Library Global Search and ADR 0277 Cross-Library Search share one Search
Palette: a transient, keyboard-first overlay above the current workspace. The
global shortcut defaults to the visible all-Registered-Libraries Search Scope;
the user can switch to the current-library scope without clearing the query.
Opening or changing scope does not replace the main workspace, change the
current route, activate another library, or compete with the contextual search
fields inside Workspace Toolbar.

Every cross-library result visibly identifies its Registered Library and
current online or offline/basic-only availability before selection. Selecting
or inspecting a result remains read-only; an action requiring the original or
metadata mutation follows ADR 0277's safe target-library activation boundary.

Contextual Search remains embedded in the active workspace toolbar and scoped
to that workspace. This keeps global search fast and command-palette-like
while preserving local search as a stable part of each workspace's everyday
controls.
