# P14 EgressGrant与成本ADR（Proposed）

## 云Provider与授权
CloudProvider.invokeOnce(frozenTarget,inputHandle,grantHandle,reservationId,signal)返回bounded response/usage/requestId声明；无DB/任意网络目标能力。授权三项独立：Host LibraryScope、P08 ResourcePermit、EgressGrant，任一缺失等待而非发送。密钥仅Host安全存储引用，配置读写/GET models不能产生图片上传授权。
Grant绑定libraryId、hostSession、asset/content或已审阅selection、capabilities、purpose、inputClass、metadata allowlist、providerId、endpointOrigin+configRevision、model/profile范围、expiry/revocationRevision、requestsLimit/costCap/currency与后台/重试许可。持久Policy可以允许重开后的同范围自动续行，但必须重新签发当前短时grant，不能恢复旧token。
local-only（可证托管本地）/user-local-unknown/remote分开；loopback并非最终计算位置证明。unknown服务须披露潜在转发，不能按local标签跳过授权。

## 网络和密钥
远端TLS；明确受审loopback服务可HTTP，目标白名单与素材下载不同。每次连接解析DNS、校验实际peer/代理路由策略，重定向默认拒绝；允许重定向的未来adapter逐跳重审，禁止跨origin转发Authorization。URL拒user-info和模型生成目标，hash/query策略版本化；用户自配内网服务用明确例外，不能全局关闭SSRF。
日志仅trace/错误码/延迟/usage可信状态；不记录Header/Key/原始响应/素材文字/私有地址。401/403等待配置修正，429/5xx只有已批准有界重试策略才进入retry_wait；不改变P03当前默认无HTTP重试行为。

## 成本状态机
每physical仅一次reserve(requestCount,estimatedCost?,currency,rateVersion)→sent→settled(actualUsage)或outcome_unknown。同reservationId相同意图重投返回既有预留，变化冲突。多Job共享physical不多次计费；重试是新physical，必须新计数/预留。币种/费率未知仅显示unknown，仍限制请求数；估计不当账单事实。
调用前在Host协调域原子扣request额度/估计预算，DB reserve与网络send不能原子，P05 dispatch-intent之后崩溃视可能发送。超时/取消unknown不refund，只有未发证明或供应商核对后更新。实际usage高于预估记debt并停新增，不隐藏超额；整数最小货币单位/有理数费率避免浮点账差。账本不能仅存在App日志里作为库授权事实，跨库总预算由设备预算ledger与库physical引用协调，不虚称双DB原子；先单库限定预算，跨库总额执行前需原子设备预留服务。

## 测试与未覆盖
本轮纯规格验证grant范围/期限/目的地/撤销及预留重复、未知不归零、请求上限。合成HTTP服务器故障注入计划：429/5xx/断连/redirect/超限body/迟到reply，当前未启动服务，NOT_RUN。实际厂商、价格、TLS/DNS代理边界与费用均未验证，不能承诺自动省钱或API exactly-once。
资料S11/S14/S18按包索引作为后续Provider验证导航；本阶段无新联网。拟改EgressGateway、Host grantregistry、physical成本引用及脱敏投影，不改用户真实服务配置。
