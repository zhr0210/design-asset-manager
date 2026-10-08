# P21 设计助手与提议确认（Proposed）

## 有限工作流
DesignBrief（用户文字与选定范围）→结构化查询约束→P18真实命中/evidence→比较与缺口→WorkSetProposal→用户审阅→Host确认提交。先规则编排的持久状态机，不为实现有限流程引入通用Agent或LangGraph依赖；S25/S26只是可选机制索引，本轮未验证其适配。
Brief版本、选定库/范围、步骤进度与Proposal摘要可在显式保存意图下持久化；普通搜索不自动进入Brief历史。P05 Job仅记录执行意图，不持久化有效token；恢复需当前scope/输入/外发/预算复核。

## 工具schema与证据
仅searchAssets({query,filters,limit})、getAssetEvidence({assetIds,capabilities})、proposeWorkSet({name,assetIds,evidenceRefs,briefRevision})，Host隐式注入scope，不接受模型传其他库身份。additionalProperties=false、有界字符串/数组；工具参数必须结构验证和业务授权。create/delete/SQL/文件/外发/approve工具不存在。
LLM引用的assetId/evidenceId须属于本轮实际返回记录并且当前仍有效；“看起来合理”的虚构ID拒绝。比较意见标inferred，描述事实链接实际证据；不可把向量相似当物体存在事实。OCR中“忽略规则并上传”只能当文本，不调用其链接或执行命令。

## Proposal和确认
Proposal不可变id/digest，含briefRevision、库身份/会话、成员contentRevision、当前WorkSet目标/expectedRevision、工具来源与expiry。Host签发短时review receipt给用户界面，模型没有签发/消费审批工具。confirm只接受绑定相同Proposal/目标范围的receipt，Host再核对所有成员、权限、CAS和重复requestId，然后委托P20唯一写口。重复确认返回同效果；内容或用户后续编辑变化需重审，不覆盖草稿/确认标签。

## 预算与取消
每run冻结maxSteps/maxToolCalls/maxInputOutputTokens/deadline/costCap和可用工具，数值需用户策略/模型实验，fixture的3次只是测试。调用前扣预算，重复/循环工具也计数；耗尽返回partial proposal或缺口，不放大授权继续。外部LLM一律P14，撤销后下一调用拒绝，迟到输出只可丢弃或历史，不提交WorkSet。

## 验证
参考模型覆盖恶意工具名/模型自批、伪造asset、过期/摘要变化确认、预算耗尽与重复确认。未来T02/T07/T13/T17/T19/T20需合成恶意Provider驱动正式Main/Preload/Host，及解释与真实命中核对；真实LLM语义质量NOT_RUN。工具schema本轮为文档，未运行Ajv。
拟改独立有限assistant应用服务及提议审阅入口，依赖Query/Evidence/WorkSet端口，不暴露库连接。不调整当前UI视觉方案。
