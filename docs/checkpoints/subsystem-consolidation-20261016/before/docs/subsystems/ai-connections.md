# AI连接、账号与Pi协议

本页描述当前源码的跨层职责与运行路径；不是运行验收或目标全量交付声明。返回[子系统目录](README.md)，具体用户契约见[产品/目标规格](../product/README.md)与[交互目录](../design/README.md)。

## 职责与状态权威

Main持有连接、账号生命周期与安全凭据接口；Pi独立Node Worker适配允许协议，不拥有Library提交、任意工具或素材读取权。模型目录/安装与连接配置、执行许可、外发范围彼此独立。

## 正式入口与运行链

设置的连接/账号操作→可信Main→正规登录/安全存储→冻结某次能力的provider/model/effort→已封印Pi资源一动作一进程→有界私有stdio响应→调用者验证并由Host保存。Agent诊断只看非敏感结果。

## 失败、取消与兼容保护

登录回调到达不等于凭据提交；撤销/目标变更/退出按对应身份收敛。配置漂移不能沿用旧review，已有连接不代表任意资料可外发。失败分类/未知提交保留，不静默切换额外计费服务。

## 技术与平台边界

Pi资源按平台Node、锁、完整文件清单和Main摘要绑定；依赖改变须生成器重新seal并验证产物，不能手改摘要求通过。DAM使用Pi Worker的模式与Magpie自建provider/gateway、适配Pi客户端的模式不同。

## 源码与详细机制

- [src/main/ai-gateway/README.md](../../src/main/ai-gateway/README.md)
- [src/main/ai-gateway/PROVIDER-MATRIX.md](../../src/main/ai-gateway/PROVIDER-MATRIX.md)
- [src/main/ai-gateway/ai-connection-service.ts](../../src/main/ai-gateway/ai-connection-service.ts)
- [src/main/ai-gateway/pi-runtime-host.ts](../../src/main/ai-gateway/pi-runtime-host.ts)
- [pi-runtime/README.md](../../pi-runtime/README.md)
- [src/main/ipc/ai-connection.ipc.ts](../../src/main/ipc/ai-connection.ipc.ts)

- [pi-runtime/worker.mjs](../../pi-runtime/worker.mjs)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-prompt-reverse-workflow`
- `npm run test-openai-compatible-provider`
- `npm run test-llama-openai-backend`
- `npm run test-python-unittest`
- `npm run test-ai-runtime-status-workflow`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
