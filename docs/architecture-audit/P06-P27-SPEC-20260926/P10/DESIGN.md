# P10 独立标签纵向切片设计与验收门槛

## 当前事实与目标时序
现行`VisualAiPanel→visual-ai IPC→controller→完整四字段parser→Host综合Evidence`已接线；不能因为源码存在而宣称下述新链路运行通过。
目标：用户指定tags动作→Main审阅scope/schema/服务外发→P05 enqueue唯一Job→P03解析冻结Profile→P08驻留/计算许可→P06受控输入→P09已ready后端→invokeOnce→完整响应/标签validator→P04/P05单事务Evidence+current+Job+Outbox→原Inspector/搜索/AI文件夹重读。
实际运行时序/trace：NOT_RUN。未来报告必须给临时库commit receipt、eventId、界面读取revision，而非仅按钮状态或mock。

## 最小范围与接口
增加明确capability=tags的版本化请求，clientRequestId和scope由窄Preload/Main审查；使用已就绪后端和静态保守并发，不等待P13高级路由，但许可/授权门槛必需。最初保留每批1–8素材兼容上限；更多批量由分页创建，不自行取消上限。无模型waiting，不自动下载安装或云fallback。
标签Recipe独立版本：完整JSON对象、labels数组；trim/规范化由P04冻结规则，数量/语言门槛明确区分结构与质量，空标签可依配方有效。已确认关系与拒绝范围由P04投影，不当AI成功时清空confirmed。中文质量需基准，结构通过不等于内容可信。

## 唯一切换点
每库能力writeMode在Host内部经审阅切换。Legacy combined动作沿原四字段成功规则；新tags动作只委托新Journal writer。禁止一个UI动作先新后旧兜底或双发比较；切换前停止prepare、撤销receipt、drain旧controller，切换后旧入口可适配或明确不支持，不能再直写同义新状态。
新summary逐能力带evidenceRef/selectionRevision；旧bundle API不将独立标签与不同来源caption拼成一条同模型Evidence。confirmed点击仍经Host事务，标签立刻用于AI文件夹不需要人工确认，也不创建文件复制。

## 状态/故障与验收设计
P05决定job状态；P04决定effective结果。保存前取消或scope/content变更拒绝；重复click同requestId查receipt；不同payload冲突；通知失败保留成功，Outbox重投只重读。
本轮可执行规格使用纯门控模型验证waiting、拒绝截断/无效、取消、重复效果和建议/确认分离。未来T02/T04/T05/T06/T07/T08/T09需要新Host临时SQLite、合成Provider、正式Electron三者均真实执行并有日志；真实模型L5另按授权，不拿现有2B/8B历史当新链通过。
Proposed局部决定：先只标签纵向验证再扩展三能力；理由是一次证明权限/资源/提交/展示整链，而不是并行搬所有旧业务。实施前P04/P05/P06/P09需审核与实现，当前均未满足生产前置。
