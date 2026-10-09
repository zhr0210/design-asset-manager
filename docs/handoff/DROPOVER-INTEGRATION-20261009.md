# Dropover 功能整合至 DAM（2026-10-09）

用户明确要求使用 REA 全面分析本机 Dropover.app，并把功能整合进 DAM 工作浮窗，保留现有架构。本任务仍在实施，尚未完整复刻；不推送或发布。此前排除真实断网、Windows 原页压力、Eagle、签名安装与商业发行的范围保持；无外屏登记设备缺口。

2026-10-10 更新：用户明确不需要云上传与分享，本轮剔除云服务连接、云链接策略、上传任务/历史等能力。系统本地分享入口与其他本地功能仍单列；不自动发送邮件/消息或注册服务。用户另报告两张图已出现，但指定公开接收目录核查仍为空，实际路径待用户澄清；保持“用户回执成功、具体接收与字节验收未确认”，不能直接登记完整批量 PASS。

## 目标与证据

本机 `/Applications/Dropover.app` 为 5.2.0(653)，最低 macOS 13，arm64/x86_64 universal。主二进制 SHA `b0120976ab702cbd3eaca13e4e596bb5d4d6db8eeae776fb78e234b9d78b5294`。REA 6.1.0 已连接；包图有 228 节点、395 occurrence、353 edges，原生 frameworks、Share、Widget 和 Control 扩展已核对。主程序采用原生 Swift/AppKit。

REA Evidence：

- artifact: `ev_1a5de2103c51bd511ae2b23d011a89d6eb858431a1f969cd8c2c5336f5be61c4`
- Apple graph: `ev_4ca5fd0182d91edb3487c02359f91bcd41c956cb3fd4aeb542037356656303bd`
- Mach-O: `ev_ce2bfcdae414f31b463d0a615c74220e8f005129f610ac4715fa312236ab5fbf`
- Info.plist: `ev_0a668c37336eac587ea3428e17c846f4f31027dda6c4acd338a82fa5028e9511`
- Nib graph: `ev_ad585f2ca64cb9028c02026d4d39c201b8d545b4a47f1876fe11afec70dd5f7d`

完整只读包证据在 `.scratch/dropover-integration-20261009/rea-package-evidence.json`。包结构覆盖不等于完整反编译或运行覆盖。资源审计归纳为 26 组、95 项；38 张 en/zh-Hans 表共 2471 键，含 Core 重复。清单记录资源键、SHA 和归纳，未把专有代码、文案或图标复制进产品。见 [功能清单](DROPOVER-FEATURE-CATALOG-20261009.json)。

原生 UI 已只读检查激活、交互、通用、高级偏好，包括焦点、停靠、缩回、吸附、Spaces 和复制策略。未改变 Dropover 设置。经窗口菜单新建空暂存窗，Raise 后粘贴明确公开验收文字，实际生成 txt 项；截图只含该公开暂存窗。用户云配置、监视目录和脚本未读取。[官网](https://dropoverapp.com/) 当前介绍 5.3.0，不能代替本机 5.2.0 证据。

## 实施与验收队列

四层分别为：原生核心、本地文件动作、系统入口、云与外部自动化。每项须最终普通构建、可发现入口、适用真实执行、正确结果、保存重开及失败保护，不能由资源或接口存在关闭。

先收敛有界多成员准备、逐项 ready/error、多选、单项及批量拖出。保留唯一 Host、actor/成员/来源/file-hash、64 副本与 1 GiB 预算、独立 Copy、显式清理和草稿保护。再逐组接入本地动作、内容接入、窗口行为、菜单/自动化与服务消费者。

当前 Main 批量接口已接线，Renderer 正在实施，尚无最终构建或真实批量接收资格。Ghidra 12.1.4（Apache-2.0）及 OpenJDK 21 正通过现有官方 Homebrew core 准备，为必要 native 深分析；不更改 REA MCP 配置，后续以显式路径 CLI 使用。未安装收费 Hopper/IDA。

真实材料只用指定公开资料及副本。系统权限、用户正规登录或额外费用实际需要时再由用户处理；不读取/导出目标应用凭据，不将云模块存在当上传成功。跨屏需要实际设备，签名扩展安装与商业发行仍按范围分列。

## 8ff 前置验收收尾

用户回执“只有咖啡图可以拖入”，公开咖啡副本物理拖入记为用户实测成功。其他成员未准备，正式 UI 的准备提示与源码一致，不能据此判定全成员 startDrag 失败。回执没有单独回答点击是否切 Codex，物理点击专项仍未明。

接收窗口只读元数据显示公开副本图层落在用户现有照片文档；立即停止该文档读取和操作，没有截图、保存或将私人文件路径写入证据。后续接收只用公开测试文档。

构建 `dam-8ff82743005c5fbd` 的 Host 91848 从正规“退出整个 DAM”检查 0 草稿、0 原生未保存、0 账号任务后退出。普通 `npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile` 重开 Host 5272/64287，同构建；从正式开库、工作模式恢复窗口找回三公开参考、原顺序、名称、备注与 pin。

主库 `e3dc6c7a…`、185 向量 `2fa5f129…`、185 原件 `f633315b…` 重开前后相同；53 尝试、51 证据、21 OCR、63 后台成功/64 历史保持，无新推理或未知重发。见原生点击检查点新增 `final-8ff-reopened.jpg` 与非秘密列签名。

新整合候选不得继承 8ff 资格。完整 Dropover 功能、T23/父 #24、其他父级均未自动关闭。
