# Smart Filter Results Hide Empty Groups

Smart Filter result pages should render only Smart Filter Result Groups that
currently contain matches. Empty asset or candidate groups should not occupy
the main results surface, because the primary task is scanning actionable
matches.

When a hidden group has zero matches, the filter details surface should still
explain that there are currently no matching design assets or no matching asset
candidates. This keeps the main grid focused while preserving enough feedback
to understand the full filter scope.

Under ADR 0447, hiding an empty owner-type result group does not remove its zero
subtotal from Duplicate Text filter details or imply that the comparison was
restricted to the visible type.
