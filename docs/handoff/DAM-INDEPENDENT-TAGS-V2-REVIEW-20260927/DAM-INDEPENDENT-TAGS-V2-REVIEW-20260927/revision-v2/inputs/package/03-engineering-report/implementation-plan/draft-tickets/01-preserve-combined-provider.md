# 01 — 保持现有综合分析行为，抽取可替换推理入口

**Status:** draft-awaiting-breakdown-approval；未发布。

## Parent

第一轮独立标签分析实施规格，当前待审。

## What to build

用户继续执行综合分析和反推，结果/错误/重试表现保持兼容；内部形成可注入单次Provider的测试边界。

## Acceptance criteria

- [ ] 旧综合与反推完整响应仍保存一次，截断最多重试一次且共用时限。
- [ ] prepare零外发，取消/失效owner零晚提交，旧异常不泄露原始响应。
- [ ] 临时库与合成Provider回归证明人工描述/OCR/confirmed关系保持。
- [ ] 不改公共契约/schema或恢复旧Worker；通过现有行为测试与类型检查。

## Blocked by

None — 可开始（仍需实施模式授权）

## Testing

旧控制器/Host集成及transport协议回归；不增加依赖于私有函数结构的测试。

用户故事：22, 23, 25, 26, 28。实施只限本票完整行为；上游结果未验收不能凭文件存在跳过依赖。
