# 设置、路径、诊断与旧库找回

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

全窗口/settings承载全局配置、AI与模型、维护和恢复；主页素材导航不在设置上方继续显示。profile设置/草稿归App，当前库内容归Library。旧DAM库通过独立只读工作区找回，不强行转换为Managed。

## 正式入口与运行链

普通设置入口→分类页/表单→命名Client→可信Main→修订检查/原子保存→双端回读。路径迁移先plan/审查再执行，配置与实际库身份分别核对。收到的恢复草稿需显式采用/丢弃，不自动覆盖用户当前输入。

## 失败、取消与兼容保护

分类转场保留未保存输入；旧响应/旧文档writer不覆盖新状态。未知提交显示固定指导并权威回读，不建议盲重发。选择器取消无副作用；退出/切库核对所有参与者，后台计数/空态不能掩盖真正错误。

## 技术与平台边界

系统选择器、权限、路径根/链接和迁移适配按OS验证；Browser不能得到任意本机路径/命令。诊断输出非敏感摘要，不读完整配置、保险库、环境或内存转储。

## 源码与详细机制

- [src/renderer/routes/Settings.tsx](../../src/renderer/routes/Settings.tsx)
- [src/main/services/settings.service.ts](../../src/main/services/settings.service.ts)
- [src/main/ipc/settings.ipc.ts](../../src/main/ipc/settings.ipc.ts)
- [src/main/path-migration/path-migration-executor.ts](../../src/main/path-migration/path-migration-executor.ts)
- [src/main/local-host/workspace-drafts.ts](../../src/main/local-host/workspace-drafts.ts)
- [src/main/legacy-readonly-workspace/README.md](../../src/main/legacy-readonly-workspace/README.md)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-ai-backend-restoration`
- `npm run test-settings-compatibility`
- `npm run test-settings-migration`
- `npm run test-path-governance-docs`
- `node scripts/run-ts-test.mjs scripts/settings-service-defaults.test.ts`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
