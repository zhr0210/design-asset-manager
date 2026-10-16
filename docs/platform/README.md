# 平台契约、工具与证据

先按[构建与发行指南](BUILD-AND-RELEASE.md)选择正式交付路径；这是工程流程，不是软件运行子系统。运行中的系统适配见[Host系统集成](../subsystems/local-host.md)，本目录保留平台机制、工具方法、目标协议与日期证据。文件名/目录存在不代表已运行或已发布。Windows、macOS、WSL和Browser资格不能替代；旧受限通道的说明只适用于对应保留模块。

| 主题 | 职责/来源性质 |
| --- | --- |
| [AI Client Runtime Adapter](AI_CLIENT_RUNTIME_ADAPTER.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows / macOS AI Platform Branch Reuse Assessment](AI_PLATFORM_BRANCH_REUSE_ASSESSMENT.md) | 平台契约/工具或来源，按适用范围读取 |
| [AI UI “规划中”状态审计](AI_UI_PLANNED_STATUS_AUDIT.md) | 平台契约/工具或来源，按适用范围读取 |
| [AI Worker Truthfulness Audit](AI_WORKER_MOCK_GAP_AUDIT.md) | 平台契约/工具或来源，按适用范围读取 |
| [Asset Library Path Governance](ASSET_LIBRARY_PATH_GOVERNANCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [CI Path / Artifact Hygiene](CI_HYGIENE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows / macOS CI Matrix](CI_MATRIX.md) | 平台契约/工具或来源，按适用范围读取 |
| [Database Path Design Preflight](DATABASE_PATH_DESIGN.md) | 平台契约/工具或来源，按适用范围读取 |
| [Database Path Migration Plan](DATABASE_PATH_MIGRATION_PLAN.md) | 平台契约/工具或来源，按适用范围读取 |
| [Download Path Governance](DOWNLOAD_PATH_GOVERNANCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Electron Packaging Configuration Audit](ELECTRON_PACKAGING_AUDIT.md) | 平台契约/工具或来源，按适用范围读取 |
| [External HTTP Manual Health Check](EXTERNAL_HTTP_MANUAL_HEALTH_CHECK.md) | 平台契约/工具或来源，按适用范围读取 |
| [llama-runtime Governance](LLAMA_RUNTIME_GOVERNANCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Media Path Governance](MEDIA_PATH_GOVERNANCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Native Dependency Packaging Verification](NATIVE_DEPENDENCY_PACKAGING.md) | 平台契约/工具或来源，按适用范围读取 |
| [OCR Dependency Governance](OCR_DEPENDENCY_GOVERNANCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Package Smoke Tool](PACKAGE_SMOKE_TOOL.md) | 平台契约/工具或来源，按适用范围读取 |
| [Path Field Inventory](PATH_FIELD_INVENTORY.md) | 平台契约/工具或来源，按适用范围读取 |
| [Path Governance Risk Register](PATH_GOVERNANCE_RISK_REGISTER.md) | 平台契约/工具或来源，按适用范围读取 |
| [Path Migration Design](PATH_MIGRATION_DESIGN.md) | 平台契约/工具或来源，按适用范围读取 |
| [Platform Shared Architecture Roadmap](PLATFORM_SHARED_ARCHITECTURE_ROADMAP.md) | 平台契约/工具或来源，按适用范围读取 |
| [Python Worker Launch Pilot](PYTHON_WORKER_LAUNCH_PILOT.md) | 平台契约/工具或来源，按适用范围读取 |
| [Release Flow Governance](RELEASE_FLOW_GOVERNANCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Remote Windows Validation Guide](REMOTE_WINDOWS_CODEX_PLAN.md) | 平台契约/工具或来源，按适用范围读取 |
| [Runtime Package Downloader Skeleton](RUNTIME_PACKAGE_DOWNLOADER.md) | 平台契约/工具或来源，按适用范围读取 |
| [Runtime Package Executor](RUNTIME_PACKAGE_EXECUTOR.md) | 平台契约/工具或来源，按适用范围读取 |
| [Runtime Package Install Planner](RUNTIME_PACKAGE_INSTALLER.md) | 平台契约/工具或来源，按适用范围读取 |
| [Runtime Package Source](RUNTIME_PACKAGE_SOURCE.md) | 平台契约/工具或来源，按适用范围读取 |
| [Runtime Package Verifier / Extractor Planner](RUNTIME_PACKAGE_VERIFIER_EXTRACTOR.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows backup authority：主体、对象与生命周期设计](WINDOWS-BACKUP-AUTHORITY-DESIGN-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows backup target protocol — release / source-loader boundary](WINDOWS-BACKUP-TARGET-PROTOCOL.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows 备份：source / snapshot / executable 威胁边界](WINDOWS-BACKUP-THREAT-BOUNDARY.md) | 平台契约/工具或来源，按适用范围读取 |
| [WC01 合成 quiescence / claim-sent 兼容 tracer](WINDOWS-CONTROL-CLAIM-TRACER-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [WC01 Windows Control Store 兼容设计收敛](WINDOWS-CONTROL-COMPATIBILITY-DESIGN-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [WC01 Windows owned 合成 effect / outbox tracer（2026-10-05）](WINDOWS-CONTROL-EFFECT-TRACER-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [WC01 合成 H facade / catalog-reference 兼容 tracer](WINDOWS-CONTROL-FACADE-TRACER-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [WC01 合成双进程 Control Store 协议 tracer](WINDOWS-CONTROL-PROTOCOL-TRACER-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [WC01 Windows owned H进程重启 / retention tracer](WINDOWS-CONTROL-RESTART-TRACER-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [B2 Control Store 迁移清单与最小兼容协议草案](WINDOWS-CONTROL-STORE-MIGRATION-DESIGN-20261005.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows AI Real Evidence Handoff](WINDOWS_AI_REAL_EVIDENCE_HANDOFF.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows AI Real Evidence Result](WINDOWS_AI_REAL_EVIDENCE_RESULT.md) | 平台契约/工具或来源，按适用范围读取 |
| [Windows 新目录恢复（2026-10-01）](WINDOWS_REHOST_20261001.md) | 平台契约/工具或来源，按适用范围读取 |
