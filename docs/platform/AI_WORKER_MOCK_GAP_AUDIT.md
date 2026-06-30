# AI Worker Truthfulness Audit

## Product Policy

Product AI operations must fail closed when a real backend cannot load or
execute. Simulated, randomized, templated, filename-derived, or canned model
output is not a usable AI result.

The product Python Worker starts with
`DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`. Explicit development and test
harnesses may opt into mock inference, but that flag cannot override strict
product mode.

## Closed Product Gaps

- Product mock-tag IPC and its implementation were removed.
- Mock AI Runtime providers are not registered in product IPC.
- External HTTP health uses the real fetch-backed client and remains
  user-triggered.
- Stale prompt and analysis Worker queue operations are not exposed as product
  actions.
- Mock OCR providers are not selectable or persistable in product settings.
- Platform status does not promote Runtime Probe evidence to Real Model Path.
- Model-wrapper mock fallbacks raise in strict product mode.

## Retained Development Code

RAM++, Florence-2, CLIP Design Classifier, WD Tagger, translation, and Visual
Router modules retain explicit mock implementations for isolated tests and
development harnesses. Their presence in source is not product capability
evidence.

Tests must prove:

- strict mode blocks each mock path;
- default product launch enables strict mode;
- evidence projectors ignore mock state;
- test-only opt-in does not leak into packaged execution.

## Remaining Evidence Gaps

| Route | Current classification | Required evidence |
| --- | --- | --- |
| OCR Text Box | Dependency or local artifact missing | Approved local dependency/artifact setup plus finite generated-image inference with at least one Text Box |
| Optional RAM++ / Florence-2 routes | Evidence depends on installed local model state | Registered artifact, successful load, and route-specific inference |
| External HTTP fallback | Configured or manually checked | Explicit successful health/model check |

Missing evidence means evidence-insufficient, not failure and not planned
completion.

## Non-AI Fallbacks

Deterministic metadata routing and Color Palette fallback algorithms are not
model inference. They may remain available if their product labels identify
them as algorithmic results and do not claim Real Model Path evidence.

## Regression Gate

```bash
npm run ci:test-runtime-safety
python3 -m unittest discover ai-service/tests
```

Any future AI route must add interface-level tests proving that product mode
cannot return mock output.
