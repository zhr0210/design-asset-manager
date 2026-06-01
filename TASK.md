# 当前任务

## 目标

Phase 2C-2：在 Settings 页面新增只读 Doctor 环境体检面板，让用户可以手动运行环境体检并查看结果。

## 边界

- 只做 UI 展示与手动检测入口。
- 不自动修复环境。
- 不自动启动 AI Worker。
- 不安装 Python、CUDA、Homebrew、Xcode Command Line Tools 或 Visual Studio Build Tools。
- 不下载模型或 runtime package。
- 不写 runtime-registry。
- 不做 Bootstrap。
- 不修改数据库 schema、migration 或真实数据库。
- 不修改素材入库、下载队列、OCR、llama-runtime、真实 AI Worker 启动逻辑。
- `TASK.md` 是任务账本，可单独提交，不和代码 checkpoint 混在一起。

## 当前状态

- Phase 1A + 1B 已完成。
- Phase 2A 已完成。
- Phase 2B 已完成。
- Phase 2C-1 已完成并通过 Validation Gate。
- 代码 checkpoint 已完成：`855470c chore: add platform foundation and doctor diagnostics`。
- Phase 2C-2 已开始，正在实现 Settings DoctorPanel 接入。

## 计划

1. 新增 `src/renderer/components/settings/DoctorPanel.tsx`。
2. 在 `src/renderer/routes/Settings.tsx` 右侧栏接入 DoctorPanel。
3. 新增 `scripts/doctor-panel-contract.test.ts`。
4. 在 `package.json` 增加 `test-doctor-panel`。
5. 运行 Phase 2C-2 验证命令。

## 验证计划

```bash
npm.cmd run test-platform
npm.cmd run test-doctor
npm.cmd run test-doctor-service
npm.cmd run test-doctor-ipc
npm.cmd run test-doctor-panel
npm.cmd run doctor
npm.cmd run typecheck
npm.cmd run build
```

Doctor 输出 `overallStatus = WARNING` 且原因仅为 AI Worker 未运行或默认端口不可达时可接受。
