# 换主机与源码接续

2026-10-11。本页说明准备流程，不维护第二份产品状态。[当前状态](handoff/CURRENT-STATE.md)给出准确可用范围/身份，[任务主台账](tasks/TASK-REGISTRY.md)给出剩余条件；旧Windows候选/ZIP/端口不能授予新主机资格。

## 取得正确源码

新目标以GitHub最新main为源码基准；克隆新目录并核对实际HEAD、平台和源码闭包。已有目录先检查本地修改，保留WIP，禁止全量reset/clean/stash。必要修改使用明确任务分支。

```sh
git clone --branch main https://github.com/zhr0210/design-asset-manager.git DAM
cd DAM
node scripts/handoff-preflight.mjs
```

本机尚未推送的`codex/macos-migration`交付不能假定包含在远端main；接续该成果应取得明确commit/已审核差异，并核对相应运行证据，不能照旧分支或旧ZIP覆盖新main。当前统一目录及Eagle隔离见[BRANCHES](handoff/BRANCHES.md)。

## 按目标平台准备

- 先核对OS、Apple Silicon/Intel、进程架构、内存/磁盘和编译工具，避免Rosetta与原生混用。
- 按锁文件执行`npm ci`；原生SQLite测试使用仓库Electron入口，不为shell Node重编全部原生依赖。
- Pi先运行`node scripts/prepare-pi-runtime.mjs`计划模式，核对目标/来源/许可/成本后，在获准范围执行`--approved`，生成真实seal/Main绑定；不手改摘要求通过。
- 按实际消费者准备独立Python环境、OCR/视觉/检索及运行包。不要复制Windows node_modules、venv、DLL、CUDA环境、账号profile或保险库。
- 模型只用已指定ModelScope境内来源，不转Hugging Face/hf-mirror/国际回退，不执行模型仓库任意代码。下载不等于真实资格。

必要命令与依赖规则见[CONTRIBUTING](../CONTRIBUTING.md)，实际脚本以package.json为准。旧平台依赖和PASS不跨平台继承；安装缺权限/登录/新增费用时仅阻塞相应步骤。

## 普通启动与验证

按当前源码完成适用类型/治理/必要构建，再从`npm run start:browser`及`npm run start:desktop`普通入口进入；profile归属和唯一Host规则见当前状态。IAB新会话/Host重启需经应用提供的正规/launch授权，不读取或复制秘密。

使用已指定公开素材和可恢复副本，从可发现入口完成真实执行、结果、保存重开和相关失败/取消保护。Browser不替代原生窗口/文件/凭据/安装；无工具保留未验。两Host不能写同一活动库，模型/API/库操作的范围不能由旧文档扩大。

账号由用户在正规入口登录，应用内部消费；Agent不读Cookie/token/密码/回调/保险库/完整秘密配置。环境准备不自动授权外发、购买、发布、推送或升级唯一原件库。

## 历史追溯

[原换主机说明](history/task-consolidation-20261011/REHOST-before-consolidation.md)保留2026-10-01/08平台状态、旧分支和原交接因果；只按需读取，不作为当前执行队列。原始字节和导航移动见[整理清单](tasks/CONSOLIDATION-20261011.md)。
