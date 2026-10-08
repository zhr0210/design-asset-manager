# Local-First AI Runtime Governance

Status: Accepted. The legacy filename is retained for repository-link
continuity; this title and decision text are authoritative.

AI capabilities use a compatible local runtime and model by default. If the
required local capability is unavailable, the application reports that state
and may offer an explicit local setup or external option; it never silently
falls back to external HTTP inference. Saving a provider, endpoint, model name,
or credential is configuration, not consent to upload an asset.

Every external asset-analysis action requires a visible, scoped External
Analysis Grant for the current action or reviewed batch. The grant identifies
the provider, purpose, assets, Analysis Units, and Input Views, and does not
extend to future assets or another capability. ADR 0141 therefore keeps
automatic analysis local-only. ADR 0461 applies the same no-implicit-disclosure
principle to writing assistance through a separate External Writing Assistance
Request; neither provider configuration nor an External Analysis Grant
authorizes transmission of a Text Edit Draft.

Model selection, model download, service start, and managed-runtime changes
remain explicit. ADR 0483 removes ADR 0188's automatic-install exception: a
reviewed first-use setup may authorize its fully disclosed runtime/model plan in
one action, but an unmetered network or displayed page grants nothing. ADR 0152
Model Library installation remains user-triggered. These rules trade silent
convenience for predictable privacy while allowing local and explicitly
authorized external Adapters to share capability and evidence contracts.
