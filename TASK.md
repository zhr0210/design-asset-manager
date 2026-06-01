# 当前任务

## 目标

Phase 3A：建立 Bootstrap 首次启动系统的最小状态机骨架，为后续 Runtime Profile、Runtime Registry、Package Installer 做准备。

## 边界

- 只新增 Bootstrap 类型、纯状态机和内存状态服务。
- 不做真实安装。
- 不做下载。
- 不自动修复环境。
- 不自动启动 AI Worker。
- 不接 Settings UI。
- 不接 Renderer。
- 不注册 Bootstrap IPC。
- 不写 runtime-registry、settings.json 或数据库。
- 不修改数据库 schema、migration、素材入库、下载队列、OCR、llama-runtime 或真实 AI Worker 启动逻辑。

## 当前状态

- Phase 1A + 1B 已完成。
- Phase 2A 已完成。
- Phase 2B 已完成。
- Phase 2C-1 已完成并通过 Validation Gate。
- Phase 2C-2 已完成并提交：`01e8ba5 feat: add doctor panel to settings`。
- TASK 账本提交已完成：`fea9a8a docs: update task ledger for doctor panel`。
- Phase 3A 已开始，正在实现 Bootstrap 状态机最小骨架。

## 计划

1. 新增 shared/main Bootstrap 类型。
2. 新增 `bootstrap-state-machine.ts` 纯函数状态机。
3. 新增 `bootstrap-state.service.ts` 内存状态服务。
4. 新增 `scripts/bootstrap-state-machine.test.ts`。
5. 在 `package.json` 增加 `test-bootstrap`。
6. 导出 shared bootstrap types。
7. 运行 Phase 3A 验证命令。

## 验证计划

```bash
npm.cmd run test-platform
npm.cmd run test-doctor
npm.cmd run test-doctor-service
npm.cmd run test-doctor-ipc
npm.cmd run test-doctor-panel
npm.cmd run test-bootstrap
npm.cmd run doctor
npm.cmd run typecheck
npm.cmd run build
```

Doctor 输出 `overallStatus = WARNING` 且原因仅为 AI Worker 未运行或默认端口不可达时可接受。
