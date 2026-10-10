# 下一位工程师：只定位任务01候选

本轮完成受限SPEC收敛，业务代码、真实资料库、模型与原报告均未更改。先读[READINESS-REVIEW](READINESS-REVIEW.md)，再读[ACTIVE-CONTRACT-ADDENDUM](ACTIVE-CONTRACT-ADDENDUM.md)、[FIRST-ROUND-PLAN.v2](FIRST-ROUND-PLAN.v2.json)、[TEST-GATE-MATRIX](TEST-GATE-MATRIX.md)。旧冲突条款按[SUPERSEDES](SUPERSEDES.json)限定范围解释，历史原文在inputs内。

## 唯一下一实施候选

任务01：保持综合分析与反推行为，抽取可替换单次Provider入口。仍需用户明确IMPLEMENT；本文件不发出自动执行、发布、提交或模型启动指令，不把评审建议当签收。

范围：现有visual-ai controller→transport/parser→Host行为，使用原生产意图接口与合成Provider/时钟；保留完整响应、1024/JPEG85、1536→3072最多一次截断重试和共同deadline、人工描述/OCR/confirmed保护、sender/owner取消边界。无schema/公共契约变更，无旧Worker复活，无新UI。

已核对候选验证入口：`node scripts/run-ts-test.mjs scripts/visual-ai-transport.test.ts`、`npm run test-visual-ai-download-integration`、`node scripts/run-electron-node-test.mjs scripts/asset-ocr-storage.test.ts`、`npm run typecheck`。本轮未运行；获准01时以真实源码/环境重新核对，再最小测试先红后绿与审查。不把参考模型PASS代替生产回归。

任务02A方案与03两个开写门槛是后续票放行条件，不是01须先建设的通用平台。公平、FTS分页、Eagle及自动Embedding替代登记在DEFERRED-REGISTER，不抢做。

7父任务/依赖不变；01/07草案副本字节保持原样，02–06仅必要验收修订。全部仍待审/未实施，GitHub未发布，根TASK未更新。完成此轮后停止。
