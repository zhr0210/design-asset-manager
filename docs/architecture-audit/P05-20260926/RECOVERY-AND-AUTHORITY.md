# 关库、恢复与远端不确定结果

## 关闭与恢复序列

未来协调器应在Host仍可写时先停止新的enqueue/claim/send，撤销prepare和模型输入/外发许可，再以专用内部受控事务撤销所有本会话claim并标记暂停/unknown。普通UI写入口不能通过此内部通道绕过quiescing。

随后取消/收敛本会话执行，等待已开始的短提交和Journal操作完成，再进入既有Host.close：quiescing→drain inFlight→release lease→close DB。该顺序沿用当前Host实际释放方式，不擅改锁协议。已进入同步提交的操作与关闭在Host事件循环/事务边界线性化：提交先完成则成功保留；撤销先完成则迟到提交拒绝。关闭代码不从被drain的操作内部await自身。

无需等待不受控远端无限结束才能关闭资料库；DB内记录可能在途的physical，撤销结果准入，detach网络观察并释放已确认可释放的本地资源。资源未核对记unknown，不能因此强杀用户模型服务。DB无法写入中断标记时不声称已暂停成功，保存恢复需核对状态并允许关闭失败/恢复要求；下次按旧会话claim全部失效处理，不清表。

正常重开取得实际独占lease、按P02检查schema与恢复sidecar，再建立新hostSessionId；libraryGeneration可能与上次相同。分页扫描未终结Job，先核对已提交receipt/Evidence/Outbox，再处理旧attempt；不根据上次UI的running/validating字样推定完成。

恢复前依次核对：同库身份与content适用、当前素材非Trash、Recipe/Profile能否按digest解析、服务配置/模型身份/输入类别是否仍匹配、用户pin/修订、恢复policy、资源/预算/InputGrant/EgressGrant。意图只携带策略/配置引用与非授权审计快照；不持久化可复用会话token。

建议恢复默认ask-on-reopen（待审，未更改产品设置）；用户明确启用的auto-when-open也必须符合当下scope和有效授权。配置存在/模型列表可见/相同URL/localhost均不能免除授权。闭库不推理，读取恢复列表不发网络。

## 崩溃切点的恢复依据

| 切点 | 数据事实 / 下一步 |
| --- | --- |
| enqueue事务前/中 | 要么无request，要么完整request/jobs；重投同clientRequestId核对，不重复代次 |
| claim提交前 | ready或waiting，无外部调用；重新评估条件 |
| claim提交后、dispatch-intent前 | 有旧attempt但无允许发送记录；在确认实际代码遵守先记再发协议后可安全新claim |
| dispatch-intent后、网络发送前后 | 存储与网络间没有原子边界，统一视可能发送；不能用缺provider ID证明未发 |
| 响应收到、提交前 | 原始响应未持久保留时不能只凭validating恢复结果；本地可依授权新attempt，远端先核对结果/费用 |
| 同事务Evidence/Job/Outbox提交中 | SQLite提供全或无的目标边界；实际断电/原生依赖验证未运行，按可读已提交事实恢复 |
| commit后、通知前 | Job已成功，重发Outbox，不再推理 |
| 索引已更新、checkpoint未提交 | 重投同事件，幂等识别已应用，不能重复副作用 |

当前readonly opener拒绝热sidecar，故实际崩溃导致无法按现有规则打开库时，应停在library-recovery-required。P05任务恢复只发生在P02证明数据库可安全读取以后，不能通过删除-journal/-wal/-shm绕过数据库恢复。这是实施前实测必须解决的边界，不保证任意崩溃都能自动续跑。

## 远端未知与取消

每PhysicalInvocation在发送前持久dispatch-intent，关联冻结provider/endpoint配置摘要、调用幂等能力声明、request/cost reservation引用；实际密钥/授权token不保存。预算协议由P14进一步实现，本轮不给金额/供应商承诺。一个physical服务多个Job仅预留/结算一次。

网络超时、断连、进程崩溃或取消后，若不能证明服务未接收，则physical进入outcome_unknown；仍有效Job进入remote_outcome_unknown，已取消Job保持cancelled，未知执行/费用通过physical关联继续显示。取消不等于免费或服务已停止。

Provider明确支持状态/结果查询时，需当前scope与允许该查询的授权，绑定原服务版本/requestId核对；查询不重发素材。Provider不支持或身份未知时停止自动重复收费调用，等待用户已有明确风险策略或本次选择。服务端idempotency key只有文档与限定测试证明支持后使用，不能仅发送一个header就承诺去重。

远端后来可取回完整有效结果时，必须先建立新的受控恢复attempt/claim，再将可验证的原physical结果交给Host完整验证；旧worker回调不因此复活。源内容/Job代次已替换则只记录非敏感远端结局，不写当前结果。取回结果的attempt仍引用同一原physical，不新增推理或费用预留。

Provider已确认未执行：可在原Job未终结、策略/预算/截止时间有效时retry_wait。结果已执行但无法取回：保留unknown/失败事实，任何再次执行必须计入新请求/成本，不能伪装成无成本恢复。

本地服务若最终计算位置unknown也采用上述保守判断，不能只看127.0.0.1。真实Provider费用/取消行为均未验证。

若paused/queued任务关联尚未解决的unknown physical，恢复时该不确定性仍是强制等待条件；不能通过pause→resume绕开核对。ready也必须携带执行或结果核对模式并在发送前检查，未知调用未解决时禁止execute模式。
