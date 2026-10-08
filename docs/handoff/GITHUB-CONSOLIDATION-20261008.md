# GitHub 源码整合与 macOS 移交（2026-10-08）

用户明确授权以当前工作区完整源码为准统一 main，弃用此前分支/版本。
仓库：[zhr0210/design-asset-manager](https://github.com/zhr0210/design-asset-manager)。
main 是后续源码权威；此记录不宣布所有产品能力完成。

## 获取与启动

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

选择全新目标目录；Mac准备只适用于本机实际 darwin-arm64/darwin-x64。
基础素材和词法路径不等待本地模型。GGUF、Metal/统一内存、视频工具仍有明确
Mac接线缺口，不将 Windows产物/历史资格继承到Mac。账号由用户本人正规登录，
模型使用指定中国境内 ModelScope 来源。详见[Mac交接](MACOS-CONTINUATION-20261008.md)。

## 整合边界与验证

- 原 Windows HEAD：156a9841e0262465d422283851095bca47979532。原暂存 SHA256：7c42daf64191e49fa59efbd12f2219a0628417c0317c9a5aa25755c78c877f85。
- 来源是安全移机清单中的3112个文件，读取当前工作区最新字节，不是只推旧HEAD
  或F单独补丁。必要移机构建/说明修复在隔离 worktree 完成。
- 不上传账号/profile/库/模型/venv/node_modules、生成平台二进制或原始开发档案。
  被替代源码、第三方旧扩展及根目录旧编译输出不纳入新提交树。
- 新目录实际 npm ci、typecheck、Windows备份/视频原生编译和完整 build 已执行。
  编译器/SDK/headers可显式选择，实际输入/产物仍核验哈希并重新封印；不改安全门。
- context ownership覆盖全部候选一方源码；README保留当前边界，详细过期接入说明
  另存[历史](CAPTURE-INTAKE-NOTES-20261008.md)，不删除产品记忆或提高路由预算。
- CI在Windows/macOS分别安装/构建/治理，无真实AI或用户资料。最终结果以对应
  PR和[Actions](https://github.com/zhr0210/design-asset-manager/actions)为准，不能把
  旧PR的绿色检查用于新源码。
- 新隔离产物不是此前 dam-8ddc7686f890b3e3 的同一构建；历史真实验收继续保留
  原候选身份。本轮没有界面操作、Mac执行、推理或资料库迁移。

## 被替代分支与恢复

新整合合入且 main 提交树回读一致后，再关闭旧PR#1并删除下列旧远端分支；不 force push、不改写
main历史。Windows本地旧工作副本/暂存不清理，旧公开源码恢复副本保留在本轮
本地 .scratch/github-consolidation-20261008，恢复 SHA 如下：

| 旧分支 | 原提交 |
| --- | --- |
| codex/full-project-20261001 | 107106cea9d4566b0fbf68dc2317825219dfb9de |
| codex/windows-ai-real-evidence | b79a468feda79773f2a9520b8ab7b5ced6c6e83c |
| feature/macos-adjustments | 6bf4b306d7131677edcfe54fc139b6129af0e1db |
| finalize-platform-ai-runtime | 8692ee4d3d0b763804c1f0a292610d1afa94dba7 |
| main | 1609dd091061dfa53b3b045a51ab03cb8a300c1b |

## 保持未完成

[WC/T23/A–F清单](MACOS-REMAINING-ACCEPTANCE-20261008.md)仍是未完成依据。
WC01/商业首版、T23/父#24、Mac原生专项、D视频Mac支持/原生交接、E Eagle Mac
开发测试、F完整规模交互/发布信任链均不因Git合并而关闭。只将代码统一与移机
交接作为本轮终点，不自动开始下一功能任务。

## 本轮准确检查结果

新Windows隔离构建：dam-c46463e9f7f3a8ce / 786输入，源码摘要
c46463e9f7f3a8ce57d0cac3cedac0a22d8683c192c62bcdda920cb2bcaf3728。npm ci、typecheck、两项原生编译、完整build、774/774 ownership
与268条路由测试通过；不读取秘密、不准备账号或模型、无本轮真实UI/推理/Mac验收。

**全量治理未通过。** 聚合执行全部160个叶子命令，不以首个失败阻止收集其他
结果。聚合器本身未找到npm本地bin的一项已用正式npm入口复跑通过；其余待解决
项保留在[精确检查回执](GITHUB-CONSOLIDATION-CHECKS-20261008.json)。
Windows旧Model Library存储tracer返回RECOVERY_BLOCKED；旧签名目录治理与已移动/
退役UI接线断言有失败；Python单测缺numpy/FastAPI/Pillow环境，python3命令在
此Windows候选不可用。Mac Actions仍须用新提交单独检查，旧PR绿灯不能继承。
没有删除失败用例、永久skip、放宽存储保护或填入假verified来让CI变绿。

本次按用户授权合入**待继续开发的当前源码基线**，不是完整功能或发行合格版。
后续先区分平台/依赖缺失、过期断言与产品缺口，逐项修复和重验；禁止将这些
失败自动当作全部业务功能不可用，也禁止把局部构建成功当作CI全绿。
