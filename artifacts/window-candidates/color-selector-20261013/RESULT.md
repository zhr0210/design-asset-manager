# B 色板颜色选择器：2026-10-13

B展开工作窗的右侧HEX输入已替换成“添加”按钮。点击打开参考图布局的AppKit原生浮层：饱和度/明度颜色区域、色相条、只读HEX、取消/添加按钮。用户已明确选择不透明颜色，因此不包含透明度滑条，继续保存六位HEX；主工作台和独立大预览的React布局保持。

普通入口：在B工作副本执行 `npm run start:work-b` → 正式打开指定library-b-v2 → 工作模式 → 恢复/打开工作集 → 展开小窗 → 色板右侧“添加”。取消或关闭浮层不提交；确认才加入色板并通过既有Host自动保存。重复颜色禁用确认并提示已存在。

## 当前版本

- Main：`dam-8816c1fa125661e6`，UTC构建时间2026-10-13T07:36:47.764Z。
- Native SHA256：`4d272f9435b6d0683ec3f26476167d8d788e69fb8d9b1e9bce9da0e5574406d5`。
- Native sourceDigest：`5178583e9bf96c715ab69ae35c0cc8a1a179eb1b97f586a1c361a6acc8b234a0`。
- Main完整SHA及源文件清单：runtime-identity.json、source-identity.json。
- 范围：macOS27.0/arm64，B副本、profile-b/library-b-v2的指定生成素材。没有改默认产品、发布或运行AI/OCR。

改动前保存before-source.tar.gz；本轮源文件检查点为task-source-checkpoint.tar.gz。保留现有其他WIP，不提交或覆盖。

## 实现与保护

WorkShelfColorPicker是独立原生控件模块；颜色区域使用NSView/系统渐变，色相条基于NSSlider，按钮及文本使用AppKit控件。选择中的颜色只存在于浮层局部草稿；确认复用原生colors编辑请求、Host成员/代际/修订检查及300ms自动保存，没有新增数据库格式或通用IPC。

取消、外部关闭、冻结、隐藏、收起及退出都会结束未提交选择。popoverWillClose立即撤销确认资格，重复/迟到确认不能恢复旧草稿；确认闭包也校验当前浮层身份。打开选择器时明确接管窗口输入焦点。旧HEX field/editor移除，备注文字及素材拖入保护保持。

## 验收

| 验证 | 结果 | 证据 |
| --- | --- | --- |
| 必要构建、类型检查、原生200项运行与正常退出 | PASS，最终产物 | build.log、runtime-smoke.log、runtime-identity.json |
| 实际原生控件 | PASS：RGB/HSV/HEX、不透明、预览不提交、确认一次、取消/关闭后的迟到拒绝、重复拒绝、展开态入口；受控AppKit事件经NSPanel.sendEvent分发覆盖颜色区域mouseDown/mouseDragged | picker-test.log、scripts/work-shelf-color-picker.test.swift |
| 拖入及窗口交互回归 | PASS：备注文件拖入不污染文字、显示后代注册树、取消/错误反馈、运动中断、展开/素材source拒绝停靠 | drop-test.log、interaction-test.log |
| 生产Host真实临时库 | PASS：颜色/备注自动保存重开、冲突草稿保护、成员撤权与原件保留；OS端受控 | host-content-test.log |
| 正式原生入口 | PASS：可见添加入口→原生浮层→可访问颜色区域/色相控件→HEX更新→确认→色板新增；取消保持数据库；重复颜色禁用 | 会话内CUA原生控件操作和截图 |
| 实际保存及整个Host重开 | PASS：最终候选新增#423921保存为revision22，整Host退出/重开后界面找回；原#4A9DAB/#342342、测试#223842、备注及9成员保持 | before-confirm.json、confirmed-save.json、final-save.json；重开CUA树 |

第一次受控颜色断言的预期值错误，已改为独立的白/黑/红向量及真实事件分发再执行，未降低保存/取消标准。最终原生控件操作使用公开辅助功能的Increment及色相值设置，不调用业务IPC或修改Store/数据库。

## 真实指针资格仍保留未验

正式CUA对浮层内的坐标点击/拖动没有取得颜色区域mouseDown/mouseDragged的有效运行证据：曾不改变选色，也曾关闭浮层并选到背后素材。可访问控件操作正常；受控AppKit窗口事件分发也正常。不能据此断言已经完成真实物理鼠标拖选验收，也不能仅因内部测试通过排除工具路由之外的真实输入问题。

因此本轮为“功能实现、正式辅助功能用户路径、保存重开已验；物理鼠标/触控板取色BLOCKED_UX_ACCEPTANCE”。不让用户承担复测。当前第一恢复动作是在能绑定浮层实际窗口并稳定发送指针输入的环境中，补颜色区域及色相条的点击/连续拖动，再检查确认/取消结果；不扩大到其他未定架构改造。

原生全窗的模糊覆盖、按钮视觉退出、整体流畅性和多屏资格属于前一任务的未完成范围，没有借本次色板结果关闭。
