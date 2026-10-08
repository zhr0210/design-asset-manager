# P01｜来源、版本与适用限制

访问/核对日期：2026-09-24。包内参考是目标依据，本轮已重新查阅下列与P01有关的公开官方资料；没有读取私有素材或外发仓库内容。外部资料只作设计机制参考，不证明DAM已经实现。

| ID | 来源 | 本轮采用的事实/机制 | 版本与限制 |
| --- | --- | --- | --- |
| S00 | 包内交接稿；仓库`docs/handoff/PROJECT-ARCHITECTURE-HANDOFF-20260924.md` | 当前系统/接口家族导航，结合P00与源码复核 | 9月24日工作区，不等于单独HEAD可重现 |
| U01 | P00保存的包内`inputs/sources/USER-REQUIREMENTS-20260924.md` | 保留技术主线、渐进边界、用户审核 | 目标授权不等于实施权限 |
| S18 | [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) | IPC sender校验、窄桥接与隔离职责 | rolling latest，不据此假设当前默认行为 |
| S18-PIN | [Electron v30.5.1 Security](https://raw.githubusercontent.com/electron/electron/v30.5.1/docs/tutorial/security.md) | 锁定版本文档同样要求检查消息sender | 与package-lock版本对应；没有运行Electron或升级 |
| S24 | [JSON Schema 2020-12](https://json-schema.org/draft/2020-12) | 评估版本化数据契约与Core/Validation分层 | 包建议候选，不是现有Ajv6支持声明 |
| S24-A | [Ajv JSON Schema版本支持](https://ajv.js.org/json-schema.html) | 2020-12有独立支持入口，不能与旧方言混在同一实例 | rolling文档；不证明本项目锁定版本已执行验证 |
| S24-B | [Ajv v6.12.6官方README](https://raw.githubusercontent.com/ajv-validator/ajv/v6.12.6/README.md) | Ajv6系列支持Draft-07；校验选项需明确 | 本仓库锁6.15.0，引用用于系列能力说明，不声称对锁包做安全审计 |
| S24-C | [Python jsonschema验证接口](https://python-jsonschema.readthedocs.io/en/stable/validate/) | Draft7Validator可消费Draft-07 schema | 本轮页面显示4.26.0；仅候选，不自动选为项目依赖/证明旧Python兼容 |
| S30 | [OpenTelemetry Traces](https://opentelemetry.io/docs/concepts/signals/traces/) | 将trace相关性和span/阶段概念与业务身份分开 | 只借鉴语义，无SDK/Collector/远程上报 |

本轮设计推断：对这个单操作小契约，Draft-07能表达所需约束，迁移成本比立即引入2020-12较低；这是一项待评审取舍，不是规范要求或已测性能结论。

源码事实：`package.json`/`package-lock.json`锁Ajv开发依赖；`.codeindex/module-map.schema.json`使用Draft-07；`scripts/agent-context-router.mjs`使用Ajv；`ai-service/requirements-common.txt`只有Pydantic宽范围，未声明jsonschema；现行confirmTag调用链见CONTRACT-SPEC。
