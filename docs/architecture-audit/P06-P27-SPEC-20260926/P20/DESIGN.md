# P20 组织、笔记、工作集应用服务（Proposed）

## 责任与状态树
Host（唯一连接/lease/session）
├─ TagService：标签身份、别名、层级、confirmed关系
├─ OrganizationService：普通文件夹/色板、成员引用与色值
├─ NotebookService：素材/preview绑定的已提交笔记revision
└─ WorkSetService：库内内容/成员revision
   └─ WindowCoordinator：设备布局、native window、成员token与未保存草稿

按变化与权威提取，不按行数机械拆文件。原IPC/返回信封可用兼容门面，内部仍由Host同步事务执行；Renderer只持草稿，不直接写库。P04AI覆盖/OCR修订不搬进Notebook或WorkSet表。

## 身份规则
标签merge/remove若未来支持需显式影响计划：保留目标tagId、别名冲突、父链循环、confirmed关系去重与来源、旧IDredirect/历史引用策略同事务。当前仅确认已读setParent有循环检查，不宣称完整merge已接线。普通tag移除不删除Asset；新NFKC策略不得批量折叠历史身份。
文件夹kind区分assets/palette，不能跨类嵌套；保留当前20层/2000文件夹约束，调整另审。Notebook保存require sessionToken+sourceRef+expectedRevision，冲突留草稿，不能last-write-wins。

## 工作集与窗口
库内WorkSet保存name/note/member IDs/colors/columns；deviceId布局不冒充跨设备内容。保留200工作集、每集200成员、8窗口及现有columns1–4上限。窗口打开/布局保存不自动保存未提交成员编辑；关闭/隐藏窗口不移成员。
成员进入Trash显示unavailable引用，不能自动重新激活；添加新不可用成员拒绝，原不可用引用可保留。每次preview/笔记调用检查当前set revision、member、窗口token、Host session；移成员或关库撤权立即生效，不能仅初次open检查。
跨窗event带scope/revision，旧异步回调忽略；dirty草稿在切库按现有用户决定处理，不将未提交草稿伪装已保存。

## 验证与交接
本轮参考模型验证父链循环、CAS冲突、成员权限和删除工作集不删除资产。已有生产功能回归本轮NOT_RUN；未来T02/T06/T19/T21用临时库+正式native windows验证成员撤销、恶意sender、关闭/恢复、布局与内容保存分离。来源S00相关工作模式章节，真实限制以源码为准。
Proposed决定：应用服务深接口+Host单事务，窗口不是资料库整理权威。无UI重绘、无限制提升或真实库迁移。
