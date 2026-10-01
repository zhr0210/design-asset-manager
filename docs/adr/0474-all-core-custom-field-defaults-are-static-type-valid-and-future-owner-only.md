# All Core Custom Field Defaults Are Static, Type-Valid, And Future-Owner-Only

Every ADR 0417 core Custom Field Definition may carry one optional **Static
Custom Field Default**. It is disabled by default and, when enabled, stores one
portable value in the field's exact authoritative type rather than an editor
literal or formatted display. Missing is not a default value: disabling the
setting is the only default behavior that leaves an eligible future owner
Missing.

The stored snapshot must satisfy the same current type and validation contract
as a new value. Text uses its exact NFC content and grapheme/pattern rules;
Number uses an exact finite Decimal128-equivalent value within current
constraints; Date uses a fixed valid calendar date; DateTime stores one exact
Known-Instant or Unzoned value with its declared precision; Boolean uses True or
False; Single Select uses one active stable option identity; Multi Select uses
a type-valid set of active stable option identities; URL uses one complete
currently valid URL value. Localized input, display precision, labels and option
names are never schema authority.

ADR 0473's future-owner and precedence contract applies to every type. A
default is evaluated once inside creation of an eligible new Candidate or
non-Promotion Design Asset, after explicit creation/import intent and
transferred Candidate state have taken priority. Candidate Promotion never
reapplies it. Creating, enabling, disabling or changing a default never fills,
clears, converts or revalidates an existing owner; current-owner initialization
follows ADR 0476's separate reviewed frozen batch. Creation/import review binds
and shows the exact definition/default revision and provenance, and drift
invalidates the plan.

A Static Custom Field Default cannot contain `Today`, `Now`, current time zone,
filename, path, source metadata, current user, device state, sequence, random
value, AI result, plugin callback, expression or another field reference.
Those are time/context-dependent automation with separate trigger, permission,
determinism, provenance, retry and failure requirements, not defaults. Plugins
and imported schemas may only propose a type-valid static default through ADR
0418 trusted Definition Proposal review; AI and Analysis Result Providers have
no default/schema mutation authority.

The default is library-owned portable definition state, included in Full
Library Backup and suspended while the definition is archived. ADR 0473 remains
the Boolean specialization. ADR 0475 requires a user-caused future invalidation
to resolve the default during zero-write preflight, while an unexpectedly
discovered ineligible default is preserved but suspended without blocking owner
creation or being silently coerced.
