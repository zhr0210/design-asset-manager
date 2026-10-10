# 实施者导航（当前源码定位，非规格固定路径）

当前仍只有v1–v8存储，视觉目的为analyze/reverse，正式视觉IPC没有独立标签/拒绝入口；新schema/IPC不得伪称已存在。

| 关注点 | 当前入口 |
| --- | --- |
| 产品UI | src/renderer/components/asset/VisualAiPanel.tsx；共享展示规范DESIGN.md（实施UI前读取） |
| 窄桥/权限 | src/main/ipc/visual-ai.ipc.ts；src/shared/contracts/visual-ai.contract.ts |
| 推理与旧策略 | src/main/visual-ai/visual-ai-controller.ts；openai-vision.transport.ts；vision-response.ts |
| 唯一写权与schema | src/main/library-lifecycle/active-library-host.ts；library-open-control-store.internal.ts |
| 结果/人工保护 | src/main/visual-ai/visual-ai-storage.ts；src/main/ocr/ocr-storage.ts |
| 检索/分类 | src/shared/workflows/asset-discovery.workflow.ts及库查询投影 |

已核对的候选命令：

- `npm run test-visual-ai-download-integration`：当前临时库/合成Provider集成。
- `npm run test-active-library-host`：Host/lease/关闭回归。
- `npm run test-asset-discovery-workflow`：词法与AI建议检索。
- `node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts`：传输策略回归。
- `node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`：OCR/人工状态保护。
- `npm run typecheck`：类型边界；不能替代行为测试。

本轮命令均未执行。新增独立标签生产测试入口须实现时登记，不预写不存在的npm命令。Electron ABI沿仓库启动器，不重编依赖。

已完整读取ADR0141/0483/0486；没有重读所有历史ADR。SOURCE-HASHES记录当前定位摘要，不代表逐行全库审计。未读取模型/用户库/凭据。
