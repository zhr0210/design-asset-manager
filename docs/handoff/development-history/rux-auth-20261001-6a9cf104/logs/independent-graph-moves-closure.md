# Independent graph / moves final limited closure — 2026-10-01

Decision: FIVE_SOURCE_DELETIONS_PASS, TWO_TEST_SUPPORT_MOVES_PASS, STATIC_GRAPH_METHOD_ACCEPTED_WITH_LIMITS. No product tests run by this reviewer; evidence below is read-only source inspection plus existing producer log metadata. This is a source cleanup signature, not full regression acceptance or application usability proof. CU and real account remain independent NOT_RUN_BY_REVIEWER/PENDING gates. Runtime platform branch source-contract regression remains RED; do not report all regression green.

## Static graph

The generator uses TypeScript AST import/export/literal dynamic require/import and literal new URL, relative/@renderer resolution, CSS @import and HTML script src, with separate source hashes, computed imports, unresolved imports, external dependencies, package scripts and extraResources. Root set matches Main, three configured Preload entries and Renderer index.html. index.html points to main.tsx. Graph records 613 src file hashes, 322 root-reachable paths, 2591 edges; these counts are snapshot evidence, not installed package test results.

The scope explicitly excludes nonliteral runtime paths, CSS url assets, Main-selected compiled child-window/resource paths, bundler tree shaking and side effects, dependencies/Runtime inventory and private data. Its “complete with limits” means complete for this enumerated static scan, not all possible runtime references. The two unresolved .js imports are in src/main/services/tests/test_text_color_extractor.ts; no production root-reachable deletion candidate is justified by those gaps. Production computed native import in native-deps.check only calls better-sqlite3/sharp. Prototype launcher/golden consumers remain protected and require manual reference consideration despite AST reachability.

Source-hash freshness at read: all recorded src hashes match current source.

## Five deletes / two moves

Five source absence and before digest checks: True. Every ledger.deleted path is absent and its run/before bytes equal the ledger beforeSha256. No source/test/build executable reference to those five names remains. Safety tombstones, SQL ownership, stored model/credential/library data and current controllers are retained.

Both ledger.moved original src paths are absent; before copies match beforeSha256. New files in scripts/test-support preserve implementation byte content except the relative **type-only** source-module import. Test imports now select ./test-support. The graph shows no moved fixture root reachability; fixture imports to renderer module contracts are typeOnly=true. Ordinary build/packaging does not directly include scripts support (files is compiled out/package.json, resources are ai-service/pi-runtime). Retained sole executable tests are ai-console-status-module.test.ts and model-library-workspace-renderer.test.ts. Their producer logs show exitCode 0 / timeout false. No testcase was removed during the move.

Model fixtures, the current ModelLibraryWorkspace implementation and the status module retained test behavior. This relocation does not claim the retired console to be a production path. Packaging Runtime inventory/integrity and licenses were not cropped.

## Protected visual reference

D16–D27 count: 12; all current bytes equal initial independent audit: True. Two prototype families, approved work-mode golden source, preview scripts/CSS and dynamic fixture consumers remain. No golden replacement, semantic data deletion or real asset access occurred.

## Coverage and red result

Doctor Settings mounting assertion now checks that disabled Doctor is absent and the current diagnostic/help link exists while all retained Doctor safety/host contract assertions remain. Readiness default console mount checks now target AiWorkspace + ModelLibraryPage and retain forbidden installer/download mutation assertions; mapper checks remain. Producer doctor/readiness logs are exitCode 0 / timeout false. Runtime-current metadata is exitCode 1 / timeout false and legacy platform branch failure is retained. Its assertion was not weakened to make the run green.

COVERAGE-MIGRATION is a mapping summary, not a pass signal. Ledger moved records provide the two exact caller mappings. Final handoff must state the two adapter passes, the Doctor/readiness migrations, runtime red result, integration UI scope, Computer Use and real-account limits separately. This review signs safe source reduction only and does not close the red regression by source argument.

## Read source/artifact SHA256

- `.ai-run/rux-auth-20261001-6a9cf104/build-production-graph.mjs`: `0948188ac99a644b919131efe949167fcd84582b5c71a857665a8850bbfb35c0`
- `.ai-run/rux-auth-20261001-6a9cf104/PRODUCTION-GRAPH-AFTER.json`: `fb5e405a40746c934f20cd45b2706f988d81c0febaa42f84ef4f59a2647dd7b6`
- `.ai-run/rux-auth-20261001-6a9cf104/DELETION-LEDGER.json`: `6d1bcbc41477da63c71a2f7664c55707ec3f5b5b86f053098790e280cf3954b8`
- `.ai-run/rux-auth-20261001-6a9cf104/COVERAGE-MIGRATION.json`: `1296d6767a78b4b0f0bf11fcb02b76107c24422bb171f765e521b393904e4470`
- `scripts/test-support/in-memory-ai-console-status.adapter.ts`: `1feef5b97d26980ef0d71f752b403f1b343419107031f8cba9eae8769409d65d`
- `scripts/test-support/in-memory-model-library-workspace.adapter.ts`: `298615de8048e1e1258b18b4ad7f689aabc9529ff24b9bfa0eef9cabdb5d812c`
- `scripts/ai-console-status-module.test.ts`: `807e65643f11197c800604d47903324c31f9af453e8af8db754ce41f56ce0165`
- `scripts/model-library-workspace-renderer.test.ts`: `667cdd71e29991927dbd65f1249bfc617fd17fe3263a68b209a88705f8ff7cab`
- `scripts/doctor-panel-contract.test.ts`: `902538f8ca8355faaf4d29953eb7fbc178e19189e773d3fbe3d3162f009eb870`
- `scripts/model-artifact-readiness-display.test.ts`: `94e52897ffe7ed4705e7373e05ddf39e363e8242309f9c571736fa88c87707cf`
- `scripts/ai-runtime-status-workflow.test.ts`: `8ec18647fc1da7473b39fc298e1804239b59222ea27732ec26228a1c51e810c4`
- `src/shared/build-identity.generated.ts`: `2a3609e5336b87fa86ff466446d0bd1ce8f244e04469e7698f1d8d9a051f3ba2`

## Final graph snapshot append — previous snapshot retained above

This append supersedes only the earlier graph counts and the two unresolved literal .js descriptions. Earlier review source/artifact hashes remain the immutable provenance of that review, not current final graph hashes. No product test was run for this append.

The updated generator resolves a missing relative .js import to .ts/.tsx after checking existing candidates, matching the selected NodeNext source-analysis need. The two text-color-extractor test imports now resolve to their actual .ts source files; this is source graph resolution, not proof of installed compiled artifact presence. Pi Runtime top-level 9 mjs/json files are now selected, with pi-runtime/worker.mjs added as a sixth production root. No node_modules or runtime dependency tree/cache/weight/private data was scanned. Its static edges include provider-policy, auth-protocol, controlled ChatGPT auth and auth-interaction modules; external SDK and computed imports remain separately identified.

Updated selected scan counts: 984 files / 325 reachable / 2597 edges / 25 computed imports / 0 unresolved literal edges. src sourceHashes remains 613 and all match current bytes. Zero unresolved literals must not be read as zero unknown runtime dependencies. CSS URL/compiled resources/Main-selected native windows, computed imports, tree shaking and external runtime package integrity remain the same limits. Pi top-level file digests below are an independent supplement because graph sourceHashes intentionally covers only src.

Decision remains STATIC_GRAPH_METHOD_ACCEPTED_WITH_LIMITS, FIVE_SOURCE_DELETIONS_PASS and TWO_TEST_SUPPORT_MOVES_PASS. No source change to deleted/replaced business behavior was inferred from graph count changes. Runtime regression red, CU and real-account limits remain unchanged. The newly reported 10 auth unit tests are producer evidence, not rerun by this reviewer and not real subscription proof.

Final graph SHA256: `fb5e405a40746c934f20cd45b2706f988d81c0febaa42f84ef4f59a2647dd7b6`.
Final generator SHA256: `0948188ac99a644b919131efe949167fcd84582b5c71a857665a8850bbfb35c0`.

Additional Pi top-level source/artifact hashes:

- `pi-runtime/auth-interaction.mjs`: `b7e88217ec26b771e385eff79abce8c8aba975ced6f57387a6996bec1907d774`
- `pi-runtime/auth-protocol.json`: `36d83e6560a527a3df50583efb496de80cac533a5f491444d55ac71fc77570fa`
- `pi-runtime/openai-chatgpt-auth.mjs`: `b9e206d542a8a28aec683451213c7e547a21359f889f392de8ec993544d54df7`
- `pi-runtime/package-lock.json`: `a50057bd230358a0100db41cb790d6f530ad58da794e04233c0b79fb6cd164e0`
- `pi-runtime/package.json`: `b2b20d94ae0b0f45ecdb31bce12270e3a81fff40729cd130fc92cb7eeab78fa3`
- `pi-runtime/provider-policy.json`: `460065ad6609408cb17b324d52653aa8118dccf441128c5419b48a078ca5b50e`
- `pi-runtime/release.json`: `a93f68a80369ad3cd6ce1f583d8a7cf0110b14545f6c2244c42a4dba4b27287f`
- `pi-runtime/runtime-artifact.json`: `93ce915983628dde3b3b374937d9240771f2ad70da1c028d2ba8da9e3c5da05f`
- `pi-runtime/worker.mjs`: `ddbcf958c314ab53deb91c0e189a32b04f8d684fdeb66ab9b79a1cff71ca113d`
