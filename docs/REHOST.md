# 最新统一入口：GitHub main（2026-10-08）

请从下列 main 克隆，勿使用下文旧分支命令。旧分支已被当前工作区整合候选
替代；合入身份和 CI 结果见[整合记录](handoff/GITHUB-CONSOLIDATION-20261008.md)。

```sh
git clone --branch main --single-branch https://github.com/zhr0210/design-asset-manager.git DAM
cd DAM
node scripts/handoff-preflight.mjs
npm ci
npm run typecheck
node scripts/prepare-pi-runtime.mjs
node scripts/prepare-pi-runtime.mjs --approved
npm run build
npm run start:browser -- "--profile=/实际绝对路径/DAM-public-macos-profile"
# 同一 profile 的唯一 Host 正常退出后，才换入口：
npm run start:desktop -- "--profile=/实际绝对路径/DAM-public-macos-profile"
```

Mac按实际架构重新准备依赖、Pi seal与构建；账号由用户在正规入口重新登录。
模型只用用户指定的中国境内 ModelScope 来源，不使用 Hugging Face 或国际回退。
不得复制 Windows node_modules、venv、DLL、账号profile或保险库。
[Mac代码缺口/交接](handoff/MACOS-CONTINUATION-20261008.md)与
[剩余验收](handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)继续有效。

---
下列说明保存历史来源；旧分支克隆、旧版本号和 ZIP 不是当前 main 验收。

# 换主机继续开发：从这里开始

2026-10-08最新入口：[macOS接续交接](handoff/MACOS-CONTINUATION-20261008.md)
及[WC/T23/A–F剩余验收](handoff/MACOS-REMAINING-ACCEPTANCE-20261008.md)。
当前候选为dam-8ddc7686f890b3e3，来源HEAD156a9841e026，包含未提交的已采用实现。
本轮源码ZIP逐文件核验，不含账号、资料库或平台运行环境；不要只clone
下文旧分支作为当前候选。Mac GGUF/设备/视频接线缺口及原生/Eagle验收仍未完成。

## 以下为历史2026-10-01/旧Windows接续说明

当前本机为 `codex/windows-workspace-1001`，HEAD `b5cc954f90d248694aedc2d6ca1aa5188fa0aa11`，仍有保留 WIP。Windows WC01 候选与离线锚点见[CURRENT-STATE](handoff/CURRENT-STATE.md)。没有核实或推送远端，不能假定本机候选已公开。

以下克隆示例是 historicalAsOf=2026-10-01 的公开完整快照，不是当前 Windows 候选。历史报告不自动继承任何旧队列授权。

## 1. 取得历史公开源码（macOS / Windows Git终端）

```sh
git clone --branch codex/full-project-20261001 --single-branch https://github.com/zhr0210/design-asset-manager.git DAM-remote-dev
cd DAM-remote-dev
node scripts/handoff-preflight.mjs
```

选择全新的目标目录，已有修改不要reset/clean。先读 `AGENTS.md`、`DESIGN.md`、`TASK.md`，再读本文与 `docs/handoff/CURRENT-STATE.md`。旧日志和批次仅供追溯；真实工作区与当前调用链优先。

preflight仅检查公开源码/依赖文件是否存在，报告主机OS/arch/Node；不读取账号、SQLite或素材，不联网安装或执行模型。依赖未准备时输出ENVIRONMENT_INCOMPLETE正常，不表示产品已可运行。退出1表示必需源码缺失。

## 2. 恢复前端/Electron环境

在当前获批目标需要准备开发依赖时执行；核对安装脚本、平台与资源成本，工程许可见[CONTRIBUTING](../CONTRIBUTING.md)：

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

默认只取官方校验和并列计划，不安装；因此是联网计划，不是离线preflight。当前任务明确需要并覆盖该依赖来源/成本时运行；`--approved`是脚本执行开关，不能替代范围核对：

```sh
node scripts/prepare-pi-runtime.mjs --target=darwin-arm64 --approved
# macOS Intel: --target=darwin-x64
# Windows x64: --target=win32-x64
# Windows ARM64: --target=win32-arm64
npm run build
```

准备脚本验证官方Node摘要、安装独立锁定Pi依赖、保留许可证并重新封印。平台改变会修改release.json和Main绑定摘要，这是目标机新的构建证据，不能手填SHA绕过。重新检查资源副本和actualSDK/假网络用例；源机macOS arm64结果不等于Windows通过。其他目标不在当前准备矩阵，不猜测可用。

## 4. Python / 本地模型

基础素材/词法流程不应等待模型。`ai-service/requirements-common.txt`、`requirements-cpu.txt`、`requirements-cuda.txt`保留源声明，未完全固定全部Python依赖；按目标OS/硬件选择环境，不能把源机入口版本当成完整推理环境。在当前目标需要时在该主机独立venv安装，不复制源机venv、模型缓存或Runtime SQLite。

模型权重不是Git源码；必要模型/依赖准备及已指定真实资料、模型、服务验证属于当前实施，复用明确范围，不逐次申请开启真实。新数据、外发目的地、费用或不可逆操作超出范围时再解决具体边界。新后端/模型质量用已指定材料验证，生成图用于受控探测，不把历史结果当当前通过。隔离Python测试入口是 `npm run test-python-unittest`，已有临时缓存/离线环境保护，仍要检查实际测试是否因缺依赖未执行。

## 5. 打开应用与账号

构建之后，普通入口为 `npm run start:desktop` / `npm run start:browser`；`npm run dev`是开发入口，均会接触相应真实配置。先确认profile及已指定库/服务；已有许可直接复用，不要求每轮空白profile。新profile可用如下底层入口，但仅一个参数不能证明所有legacy设置路径隔离：

```sh
node node_modules/electron/cli.js . --user-data-dir=<new-empty-test-profile>
```

占位路径必须替换为新目录。此为正式Main/Preload/Renderer和正常系统密钥保护。`scripts/start-cu-profile.mjs`另为macOS专用生成夹具/synthetic保险库：只做合成测试，禁止在其中保存真实账号；不要把它当Windows启动器或真实账号profile。

账号在目标主机由用户本人通过同机厂商浏览器重新登录。不要传递密码/token/cookie/回调URL，也不要复制源机凭据保险库；原生加密绑定OS/用户环境。认证本身不授权素材上传；当前已指定资料/服务验证可继续，新增Provider或费用范围另核。

## 6. 当前下一步

1. 核对源码/构建身份与上述环境，先做相关检查，随后直接验证已指定的真实用户路径；不机械重跑所有旧阶段。
2. 在当前授权范围内，按 [UI/UX 验收流程](agents/ui-ux-acceptance.md) 从普通首页复核
   相关用户路径；U01–U32 是历史用例索引。默认先用 Codex 内置浏览器，不能完成的
   路径转桌面，原生系统行为由桌面补齐。网页可见控件的定位后真实点击/键入可计为 CU，
   直接改状态或调用业务接口另列接线测试。源机实例选择阻塞仍保留为历史结果，
   新主机按实际入口、结果和证据逐项判定。
3. 修复/确认核心交互，再由用户辅助A01–A03真实账号；未知根因保持UNKNOWN。
4. 一个旧Runtime全src平台分支源码策略回归仍红灯；用当前实现和平台Adapter边界评估，不删除断言隐藏问题。

所有下一步仍以目标主机用户最新请求为授权。交接不是自动继续DP02、下载模型、迁移真实库或发布安装包。

## 7. 历史与视觉来源

`docs/handoff/development-history/`：全部开发批次的顶层安全报告与有限复核，RUX含合成红绿日志、参考规范、删除与逐块回退来源。`docs/handoff/PUBLICATION-MAP.json`区分原件/公开副本hash；脱敏后的报告字节不冒称原始hash。

`docs/history/agent-collaboration/`：旧协作记录，明确历史属性，不是当前任务提示。`docs/design/artifacts/`补充已识别合成设计参考；`motion-study.mp4`是原始SVG生成50KB样片，不是用户录屏或外部视频。截图是历史原型/合成正式路径参考，不是本次CU或当前像素验收通过。未公开实图推理证据、用户素材、未确认媒体或运行数据。
