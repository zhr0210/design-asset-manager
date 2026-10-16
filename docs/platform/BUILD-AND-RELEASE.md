# 构建、打包、签名与发行

本页是开发/交付指南或产品范围说明，不是软件运行子系统；产品目标、当前实现与运行验收分别维护。软件结构见[五个子系统](../subsystems/README.md)。

## 职责与状态权威

构建规则拥有Worker/本地import/原生资源的产物闭包，平台adapter拥有OS行为，发布门管理签名候选/证据，不授予库操作或新资料/费用权限。package.json是实际命令入口。

## 正式入口与运行链

锁定依赖→平台原生构建/校验→electron-vite主/预加载/共享UI→资源复制/身份生成→本地候选→对应平台打包→独立安装/签名/更新/发布证据。Pi与Swift/C++资源由自己的生成/seal清单进入产品，不从开发目录侥幸读取。

## 失败、取消与兼容保护

声明版本、锁版本、实际依赖与受测产物分清；缺资源/签名/信任输入明确拒绝。不能手工改摘要伪造闭包或把本地tag当发布成功。CI/交叉编译只证明各自检查，安装、系统权限/凭据、真实模型必须独立证据。

## 技术与平台边界

Windows NSIS/原生DLL/Media Foundation与macOS DMG/helper/AppKit/签名公证分别验证；Linux/WSL不替代Windows。四份既有CI复用，不为对齐Magpie文件名造Docker/Makefile或公开预览托管。

## 源码与详细机制

- [src/main/platform/path-resolver.ts](../../src/main/platform/path-resolver.ts)
- [src/main/packaging/release-flow-governance.ts](../../src/main/packaging/release-flow-governance.ts)
- [scripts/run-electron-builder.mjs](../../scripts/run-electron-builder.mjs)
- [package.json](../../package.json)
- [.github/workflows/cross-platform-governance.yml](../../.github/workflows/cross-platform-governance.yml)
- [.github/workflows/macos-package-artifact.yml](../../.github/workflows/macos-package-artifact.yml)
- [.github/workflows/release-packaging-dry-run.yml](../../.github/workflows/release-packaging-dry-run.yml)
- [.github/workflows/release-signed-candidate.yml](../../.github/workflows/release-signed-candidate.yml)

## 验证与维护

以下是相关聚焦检查入口，按改动风险选择，不自动执行整组：

- `npm run test-release-flow-governance`
- `npm run test-release-candidate-governance`
- `npm run test-release-checksums`
- `npm run test-package-smoke`
- `npm run test-release-update-metadata`

完整配置见[tests-map](../../.codeindex/tests-map.json)，实际命令以package.json/对应脚本为准。正式用户结果、保存重开、真实推理和原生专项按[真实验收](../agents/ui-ux-acceptance.md)；实际版本/缺口仅见[CURRENT-STATE](../handoff/CURRENT-STATE.md)，剩余责任见[主台账](../tasks/TASK-REGISTRY.md)。

改变这里的职责、接口、状态、运行路径、兼容或失败语义时同任务更新正文并描述前后行为；局部内部机制归源码旁README，运行证据归本任务报告，不在本页按日期追加PASS。
