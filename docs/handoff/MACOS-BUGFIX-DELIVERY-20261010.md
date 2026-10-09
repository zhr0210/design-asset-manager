# Mac bug 修复交付（2026-10-10）

用户最新要求：窗口交互复刻先不急完成，先修 bug、收敛交付。本轮结束新增交互；完整 Dropover 清单、命令栏草稿及其余本地功能延期，云上传/分享明确不需要。没有把所有 T23/父 #24、WC01、A–F、Eagle或商业发行关闭。

## 当前入口与身份

目录 `/Users/meigong/Documents/design-asset-manager-macos`，分支 `codex/macos-migration`，产品代码 `327e523`。正式普通构建 `dam-6d6fa6a0230cf98d`，SHA `6d6fa6a0230cf98d874606417e3c85bf993e07f7bf043ebc0567c63fb120cc39`，790 输入，UTC 2026-10-09 16:33:21.505。此前 `6d206…` 候选在在途编辑回归前生成，已明确作废、没有授最终资格。GitHub main 最近只读复核仍 `6b86ef05e558229e2bd87998101ca5678bc228cc`。未推送、发布、签名安装。

准确启动：

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

在普通“资料库管理”打开 `/Users/meigong/Documents/DAM-T23-macos-library`，工作模式恢复 `T23 Mac 联合参考`。Browser-first 命令仍 `npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile`；已有 Host 会复用单实例。新浏览器会话应从桌面设置→高级维护→准备浏览器入口，以显示的本机 `/launch` 建立独立会话，不能复制旧会话凭据。

本次正常退出 Host 63557→普通重开64987，同构建，loopback origin `http://127.0.0.1:62497`。Codex IAB旧64379页已经正规 `/launch` 更新至当前Host，共享工作集/四参考/原备注显示成立。页面入口保留给用户；地址端口随下次Host启动可能改变，以正式入口为准。

## 修复的实际问题

- Mac 普通启动应用归属父 Codex，真实图片点击/拖出接线不足：此前独立 LaunchServices/首击接线已修；新增全成员显式准备、单一在途/cache、逐项状态、选择与批量拖出，仍校验 actor/角色/成员/来源/真实字节。图片不导出私有预览URL；Source/Preview/处理/帧副本明确分列。
- 第二成员使用首成员拖动图标、Finder正常`.DS_Store`误拒、停止触发链未留诊断：必要修复及证据保留。未知根内容/链接拒绝、预算、原件保护保持。
- 默认打开每次重新复制：原生 open-existing 只打开已验证现有receipt，纳入活跃任务/取消，复查 ZIP 所有成员及来源/摘要。重复打开未新增目录。请求/记录/窗口变化未知都阻自动重复；open-requested不冒称接收成功。
- 源码治理/资源边界：固定生产 archiver、ZIP 64项/96MiB输入输出、保留64份/1GiB包含记录、旧16KiB/ZIP128KiB记录；实际Node流finish/close后才释放。部分本次owned文件按真实inode回滚，未知材料保持；不取消别的actor。
- 关闭/停靠/退场可能吞掉活跃工作：检查文件/视频/paste活动，等待实际结束；失败/脏草稿拒绝关闭后退场标识恢复。正常Close与Workspaceclose保持保护。
- 剪贴板新增：Main只读image/getSize/toPNG，在共享许可/held Library内走真实clipboard来源的Copy，严格身份、容量、16MP/96MiB及幂等。已入库但附着冲突返回真实partial effect和已证明资产的窄恢复入口，不放开任意资产/路径。
- 真实React回归发现粘贴在途新编辑会被覆盖：已修成保留新备注/名称/色板/引用移除与顺序，只追加本次新成员，显示新编辑未保存。未知结果保留同nonce，不自动重发；非输入区⌘V，输入区保留原粘贴。

相关真实临时 SQLite/Host/Copy/Sharp/ZIP/独立CRC、Node流取消、200容量、严格角色及nonce、晚scope/来源变更、partial副作用、关闭失败恢复、实际React red→green、typecheck、源码治理及正式build通过。受控 OS/reader证明接口和保护，不代替下面的普通操作。

## 普通路径与保存重开

1. 准备公开 coffee 原件副本→普通“用默认应用打开副本”两次→Preview实际打开同UUID公开文件。前后保留目录均12个，未重复制备；文件466706字节、SHA `cc02f8ca188b167c775a7101b5d767d1e71792cf762c33d6fa15a4599b5a8de7`保持。
2. 在这个明确公开Preview文档，通过编辑菜单全选/拷贝→实体浮窗“粘贴剪贴板图片”→真实入库并自动加入工作集，3参考变4参考。新PNG600×400，解码RGBA像素SHA与公开coffee相同 `2c9022e5a85bd6baa1679a11f91fa94fd1d69ba879414f5da7c55066ea3b28fc`；PNG存储重新编码，不能冒称文件字节完全相同。
3. 新资产 `clipboard-asset:f49b98d319b9a37b23db8123fdd5d0bf9095ef6934f883768e60e6cd72407239`，source.kind=clipboard，capture_method仍真实copy-into-library。原185资产所选人工/分析列及185原件SHA逐个完全不变。合法新增1资产/Original、工作成员+1，未新增推理/分析/向量任务。
4. 正规退出检查0暂存/0原生未保存/0登录任务→正常结束唯一Host→普通重开、正规开库、恢复工作窗。新图片、原顺序、名称、原备注均保存；前后全部所选持久值一致，没有重复粘贴、unknown重发或额外分析。
5. 当前186资产、53尝试/51证据、21OCR、4工作成员、63后台成功/64历史；检索185向量/1任务保持，新增Clipboard暂未生成向量，共享页准确185/186。原背景策略暂停，未自动扩展AI任务。

持久签名：主库所选 `2fe82a0c30dbccdcfb060285ccdbb68f5e87609188684a5bd8c595196aa023f8`，向量 `2fa5f129fc1333a635311e9d0b1dac14af5cc98635e836057d597548da2df38b`，包含新PNG的原件集合 `21a39d939c5175cf670985ea879cc50cd6cabc3d9f9a7352b32ccb6a3fc5c461`。全部在重开前后相同；原185原件子集不变。冻结原迁移库未写。

## 桌面接收位置澄清

用户说两张图出现、但不清楚位置，随后授权检查。Finder指定receiver窗口确为0项；仅对桌面/下载做三个公开测试精确文件名的元数据查找，找到桌面上的 astronaut/coffee 原件副本。大小791555/466706及SHA分别与此前实际准备文件相同；这关闭用户报告与空目录的观察差异。

实际目标是桌面，不能登记“指定Finder空目录收到”。文件mtime对应aa5制备阶段，结合用户实际操作回执记录该候选的批量桌面接收，不将旧候选转作6d6的全部物理拖出资格。两张桌面副本保留，不清理、不移动；沒有全盘寻找私人素材。

此前bd59左右72×160边缘标签、普通Host重开恢复停靠并展开420×640、三公开原件ZIP/独立CRC/字节已成立；aa5 300×200图像处理和Preview接收已成立。它们按原构建身份保留，不扩大到最终所有窗口交互。

## 延期与边界

完整Dropover交互、命令栏草稿、通用暂存/文字链接/承诺文件、监视/系统入口/PDF等按最新用户要求延期；云上传/分享剔除。真实断网、Windows原Chrome压力、Eagle、签名安装/商业发行继续排除；无外屏缺口保持。历史4B单次未确认退出和Pi旧颜色失败仍缺原始触发/挑战资料，保留因果未明；此前新真实执行资格与当前修复分别记录。

只用指定公开材料及副本；未读/导出Cookie、账号令牌、保险库、完整认证回调、秘密配置或进程环境。原私人Photoshop接收误落文档停止后未保存/截屏/进一步操作。其他AGENTS/验收流程WIP未入本任务提交。

证据在 [最终检查点](../checkpoints/macos-bugfix-delivery-20261010/README.md)。本轮到此收敛交付，后续按用户新指令从准确检查点接续；不自动继续全功能复刻或关闭父级。
