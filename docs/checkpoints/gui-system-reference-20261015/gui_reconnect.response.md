不能仅因“网络恢复 / SSE 重连”就直接放开保存；可以在**权威状态校准完成、当前输入与保存基准核对完毕后**恢复手动保存。

该工作区当前已有这道保护：

- `src/renderer/browser-transport.ts:55`：恢复后先禁写，读取库、设置、旧库、账号快照，等待全部 `onReconcile`；全部成功且校准序号仍有效，才设置 `connected=true`。失败继续禁写。
- `src/renderer/components/layout/AppShell.tsx:60`：校准重新读取会话及设置，并检查素材/标签加载状态。
- `src/renderer/routes/Settings.tsx:43`：保留已编辑输入；后台变更只重基未编辑字段。冲突需用户明确采用基准，保存携带 `expected`。
- `src/renderer/routes/Settings.tsx:109`：保存按钮自身仅判断 dirty/saving/conflict，未直接判断连接资格；断连写入由 Transport 拦截。这里可能存在“按钮看似可点、点击才报错”的体验缺口，需要后续验证。
- 当前保存条只负责**路径偏好**，不能扩称所有 AI 设置的统一保存。

建议排查顺序：

1. **先确认连接类型与现象**：Browser→本机 Host 断连，还是外部 AI/互联网不可达；记录断在点击保存前、请求途中，还是回执返回后。三者不能共用“重新连接即能保存”的判断。
2. **核对恢复屏障**：检查 SSE 恢复是否完整经过四类快照、AppShell 校准、当前序号校验；重点排查校准失败、旧校准迟到、重复断连时是否错误开放写入。
3. **核对设置草稿与基准**：覆盖断连期间另一端改设置、输入未改/已改、同值保存、冲突采用；确认输入保留、旧响应不覆盖、新基准采用不等于已保存。
4. **核对未知提交**：Host 已提交但回执丢失时，应权威回读并提示核对，不能自动重试或重放。恢复后已保存值与输入相同，应反映实际状态，避免引导重复保存。
5. **再评估 UI 修正**：保存资格应消费“校准完成”的业务状态；区分“连接中断”“正在校准”“存在冲突”“结果待核对”。保留 Transport 和 Host 的最终校验。
6. **后续获准执行时分层验证**：聚焦现有 `local-dam-browser-reconnect.test.ts`、`local-dam-browser-unknown-commit.test.ts`、`local-dam-settings-order.test.ts`、`local-dam-settings-conflict.test.ts`；再从正常入口做真实断连恢复验收，验证提示、键盘提交、草稿、双端冲突与无重复写。

依据入口是 `docs/subsystems/gui-shell.md` 的“Browser断连、校准与未知提交”及“设置基准、草稿与旧响应”，并与以上源码一致。本轮仅在指定工作区只读检查，未修改、联网、运行测试或启动应用/服务。
