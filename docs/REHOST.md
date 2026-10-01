# 换主机继续开发：从这里开始

当前完整分支：`codex/full-project-20261001`，仓库：`https://github.com/zhr0210/design-asset-manager`。首次上传之外已补齐可公开的阶段报告、审查、合成测试日志、目标参考包文本、最新RUX回退源码与设计参考；这里不自动继承任何旧队列授权。

## 1. 取得源码（macOS / Windows Git终端）

```sh
git clone --branch codex/full-project-20261001 --single-branch https://github.com/zhr0210/design-asset-manager.git DAM-remote-dev
cd DAM-remote-dev
node scripts/handoff-preflight.mjs
```

选择全新的目标目录，已有修改不要reset/clean。先读 `AGENTS.md`、`DESIGN.md`、`TASK.md`，再读本文与 `docs/handoff/CURRENT-STATE.md`。旧日志和批次仅供追溯；真实工作区与当前调用链优先。

preflight仅检查公开源码/依赖文件是否存在，报告主机OS/arch/Node；不读取账号、SQLite或素材，不联网安装或执行模型。依赖未准备时输出ENVIRONMENT_INCOMPLETE正常，不表示产品已可运行。退出1表示必需源码缺失。

## 2. 恢复前端/Electron环境

目标主机用户批准安装开发依赖后执行：

```sh
npm ci
npm run typecheck
npm run build
npm run context:check
```

锁文件固定本批Electron30.5.1、better-sqlite3 12.10.0、TypeScript5.9.3。源主机开发宿主Node25.8.0/npm11.11.0及Python入口3.9.6是本次记录，不是所有主机或AI依赖的兼容保证。依赖安装脚本会执行electron-builder install-app-deps；原生依赖要在目标平台重建，不复制Mac的node_modules到Windows。编译/安装工具缺失按具体报错处理，不为了shell Node ABI重编整个项目的Electron测试依赖。

SQLite相关隔离测试使用 `node scripts/run-electron-node-test.mjs <test.ts>`；普通纯TS测试用 `node scripts/run-ts-test.mjs <test.ts>`。例如先跑现有导航和临时Host，再扩到受影响模块。不要把全部测试一口气运行或把旧Runtime红灯隐去。

## 3. 恢复Pi执行依赖

Worker独立固定Node24.21.0与Pi0.99.1，和Electron ABI分开。仓库含Worker/策略/认证协议/锁/封印及准备脚本；没有平台二进制和node_modules。

```sh
npm run pi:prepare
```

默认只取官方校验和并列计划，不安装；因此是联网计划，不是离线preflight。目标主机用户明确批准依赖下载后才运行：

```sh
node scripts/prepare-pi-runtime.mjs --target=darwin-arm64 --approved
# macOS Intel: --target=darwin-x64
# Windows x64: --target=win32-x64
# Windows ARM64: --target=win32-arm64
npm run build
```

准备脚本验证官方Node摘要、安装独立锁定Pi依赖、保留许可证并重新封印。平台改变会修改release.json和Main绑定摘要，这是目标机新的构建证据，不能手填SHA绕过。重新检查资源副本和actualSDK/假网络用例；源机macOS arm64结果不等于Windows通过。其他目标不在当前准备矩阵，不猜测可用。

## 4. Python / 本地模型

基础素材/词法流程不应等待模型。`ai-service/requirements-common.txt`、`requirements-cpu.txt`、`requirements-cuda.txt`保留源声明，未完全固定全部Python依赖；按目标OS/硬件选择环境，不能把源机入口版本当成完整推理环境。获得批准后在该主机独立venv安装，不复制源机venv、模型缓存或Runtime SQLite。

模型权重不是Git源码；下载、安装AI依赖、启动服务、读取真实库和向外部模型发素材仍需具体批准。新后端/本地模型质量应重新用生成图验收，不把历史测试当当前真实推理通过。隔离Python测试入口是 `npm run test-python-unittest`，已有临时缓存/离线环境保护，仍要检查实际测试是否因缺依赖未执行。

## 5. 打开应用与账号

构建之后，普通启动命令为 `npm run dev`；这不是隔离测试，会使用该主机应用配置。首次验收应创建空白受控profile，勿打开已有素材库。例如在目标机先创建新的空白测试目录，再执行：

```sh
node node_modules/electron/cli.js . --user-data-dir=<new-empty-test-profile>
```

占位路径必须替换为新目录。此为正式Main/Preload/Renderer和正常系统密钥保护。`scripts/start-cu-profile.mjs`另为macOS专用生成夹具/synthetic保险库：只做合成测试，禁止在其中保存真实账号；不要把它当Windows启动器或真实账号profile。

账号在目标主机由用户本人通过同机厂商浏览器重新登录。不要传递密码/token/cookie/回调URL，也不要复制源机凭据保险库；原生加密绑定OS/用户环境。只认证与状态验证，不自动付费推理或上传素材。保留当前Provider限制，不借换机新增Provider。

## 6. 当前下一步

1. 核对源码/构建身份与上述环境。只运行受控合成契约，识别当前失败。
2. 用原生Computer Use从普通首页做U01–U32。不得用hash/IPC/Store/DOM selector替代。源机曾因同名Electron实例无法独立选择而BLOCKED；换机不自动变PASS。
3. 修复/确认核心交互，再由用户辅助A01–A03真实账号；未知根因保持UNKNOWN。
4. 一个旧Runtime全src平台分支源码策略回归仍红灯；用当前实现和平台Adapter边界评估，不删除断言隐藏问题。

所有下一步仍以目标主机用户最新请求为授权。交接不是自动继续DP02、下载模型、迁移真实库或发布安装包。

## 7. 历史与视觉来源

`docs/handoff/development-history/`：全部开发批次的顶层安全报告与有限复核，RUX含合成红绿日志、参考规范、删除与逐块回退来源。`docs/handoff/PUBLICATION-MAP.json`区分原件/公开副本hash；脱敏后的报告字节不冒称原始hash。

`docs/history/agent-collaboration/`：旧协作记录，明确历史属性，不是当前任务提示。`docs/design/artifacts/`补充已识别合成设计参考；`motion-study.mp4`是原始SVG生成50KB样片，不是用户录屏或外部视频。截图是历史原型/合成正式路径参考，不是本次CU或当前像素验收通过。未公开实图推理证据、用户素材、未确认媒体或运行数据。
