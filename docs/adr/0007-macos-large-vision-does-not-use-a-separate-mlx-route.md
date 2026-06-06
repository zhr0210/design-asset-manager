# macOS Large Vision Does Not Use a Separate MLX Route

## Decision

Design Asset Manager will not maintain a separate MLX product route for macOS large-vision inference.

Qwen3-VL on macOS uses the shared OpenAI-compatible service boundary through llama.cpp Metal with GGUF/mmproj. Ollama and configured external HTTP services remain fallback routes.

MLX may still be used inside a future provider implementation, but it must not appear as a product capability, runtime lane, dependency requirement, or workflow completion signal until that provider has an executable model lifecycle and real inference evidence.

## Rationale

- The existing GGUF/mmproj route already matches the shared Windows/macOS service contract.
- A separate MLX route would duplicate model installation, startup, health, evidence, and UI state machinery.
- Dependency import evidence cannot prove that a model route is executable.
- Removing the speculative route reduces cross-platform maintenance while preserving room for a future evidence-backed provider.

## Consequences

- macOS large vision exposes llama.cpp Metal, Ollama fallback, and external HTTP fallback.
- MLX is removed from runtime profiles, dependency installation, capability probes, route tiles, and completion tests.
- ADR-0005 remains valid for platform-specific runtime branches except for its earlier inclusion of MLX as a planned macOS product route.
