# Design Asset Manager

**面向设计师、剪辑师及其他视觉创作者的本地优先 AI 素材工作台。**
DAM 围绕“收录 → 理解 → 找回并解释 → 检查比较 → 安全复用”组织产品，
让素材管理与设计时的持续参考连接起来，而不只是收藏文件或管理模型。

## 产品方向

素材工作区负责导入、浏览、查找、组织与恢复；内置 AI 为素材生成可保存、可修正、可检索的分析。
工作模式通过多素材工作集与原生参考窗口，把选定内容带到实际创作现场。
模型失效时基础管理仍可用；这是一项可靠性要求，不是把 AI 降为可有可无的附加项。

桌面版与正式本机浏览器版共享 React 产品界面和同一个本地 Host，不维护两套资料库后端。
桌面目标平台是 Windows 与 macOS；未来手机端侧重收集管理，AI 主要采用云端推理。
这不是局域网服务，也不是重新引入已移除的网站采集和内置浏览器。

**以上是产品范围，不是完整交付声明。** 当前能做什么、在哪个版本/平台验证过，统一看
[当前状态](docs/handoff/CURRENT-STATE.md)。不在本页重复易过期的模型资格、PASS 数量或进程 ID。

## 开发与启动

开发依赖、原生模块和运行资源准备见 [CONTRIBUTING](CONTRIBUTING.md) 与
[换主机指南](docs/REHOST.md)。命令从仓库根目录执行；首次准备前先确认目标平台和锁文件。

```sh
npm ci
npm run typecheck
npm run build
npm run start:desktop
# 或使用正式本机浏览器入口：
npm run start:browser
```

`npm ci` 可能执行项目依赖安装脚本。两个启动命令连接相应 profile 的真实本地业务，
不是假界面；运行前核实当前资料和配置归属。构建成功不等于模型、账号、安装包或全产品已验收。
研究用原型及合成夹具仍可用于开发，但它们不能替代真实功能验收。

## 项目文档

| 想了解什么 | 去哪里 |
| --- | --- |
| 产品定位、完整能力、优先级与非目标 | [产品基准](docs/product/PRODUCT-FOUNDATION.md) |
| 技术栈、模块责任、正式调用链与演进方向 | [ARCHITECTURE](ARCHITECTURE.md) |
| 环境、命令、测试、开发和贡献流程 | [CONTRIBUTING](CONTRIBUTING.md) |
| AI 编码自主权、隐私和完成规则 | [AGENTS](AGENTS.md) |
| 视觉、交互、设计 token 与批准参考 | [DESIGN](DESIGN.md) |
| 当前工作与恢复点 | [TASK](TASK.md) |
| 实际能力、证据与未完成项 | [CURRENT-STATE](docs/handoff/CURRENT-STATE.md) |
| 术语或历史设计取舍 | [CONTEXT](CONTEXT.md)、[ADR 索引](docs/adr/README.md) |

## 技术概览

Electron 承载可信 Host；React、TypeScript 与 Web UI 构成共享产品界面；
SQLite 保存资料库与应用状态；Pi 适配模型协议与认证，专用 OCR/Python/本地 Runtime 按能力执行。
完整责任与依赖方向在 ARCHITECTURE；精确版本以锁文件和平台构建证据为准。

## 数据与真实验收

素材原件、预览与派生结果分开；AI 建议不会自动变成用户确认内容。
模型或账号配置不产生静默素材外发，已批准的数据与服务范围可连续用于真实测试。
Agent 不读取 Cookie、令牌、保险库或无关私人资料；应用可在内部正常使用已登录账号。
交付必须给出普通入口上的真实结果，不能以占位页面、模拟保存或内部测试代替。

历史报告保留供追溯；日期较早的未完成声明和验证结果不覆盖当前代码，也不会自动启动旧任务。


原型与隔离预览入口见[开发指南](CONTRIBUTING.md#8-原有开发入口与局部规则)。
[历史README记录](docs/history/root-readme-changelog.md)与[网页功能退休范围](docs/product/WEB-COLLECTION-RETIREMENT-20260913.md)保留追溯；
[插件讨论](docs/product/PLUGIN-PLATFORM-DISCUSSION-20260913.md)和[2026-09-07开发审查](docs/product/DEVELOPMENT-REVIEW-20260907.md)不构成新的任务队列。
