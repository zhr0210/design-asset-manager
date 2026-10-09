# 当前状态（2026-10-10）

Mac 开发环境、迁移必需路径及本轮 bug 收敛已完成。最后确认与文件整理见 [收口台账](MACOS-DELIVERY-CLOSURE-20261010.md)；未验证项统一在 [待测清单](DEFERRED-ACCEPTANCE.md)。窗口交互扩展延期，云上传/分享取消。

## 启动与身份

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
# Browser-first 可用同一 profile，复用唯一 Host：
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

“资料库管理”打开 `/Users/meigong/Documents/DAM-T23-macos-library`，工作模式恢复 `T23 Mac 联合参考`。Codex IAB 新会话/Host 重启后，经桌面设置→高级维护→准备浏览器入口的本机 `/launch` 正规连接；端口动态，不能复用旧会话凭据。

| 身份 | 当前记录 |
| --- | --- |
| 源码目录/分支 | `/Users/meigong/Documents/design-asset-manager-macos` / `codex/macos-migration` |
| main 克隆基准 | `6b86ef05e558229e2bd87998101ca5678bc228cc`；同步远端前重新核对 |
| 产品实现检查点 | `327e523`；之后产品测试及文档提交分别记录在 Git |
| 已验普通构建 | `dam-6d6fa6a0230cf98d`，790 输入；完整 SHA/构建时间见 [bug 交付](MACOS-BUGFIX-DELIVERY-20261010.md) |
| 平台 | M4 / arm64 / macOS 27.0 / 24 GiB 统一内存 |
| Node / Electron | Node 25.8.0、npm 11.11.0、Electron 30.5.1 |
| 本机原生依赖 | better-sqlite3 12.10.0（Electron ABI）、Sharp 0.34.5 |
| Pi | 0.99.1 / 固定 Node 24.21.0；真实 seal/Main 绑定保留 |
| Python 消费入口 | `.scratch/macos-migration-20261009/python`，3.12.11；正式应用已消费，不得当临时目录删除 |
| Python 依赖 | Torch 2.14.1、Transformers 4.57.6、NumPy 2.2.6、ONNXRuntime 1.23.2、RapidOCR 1.4.4；[精确锁定记录](../checkpoints/macos-migration-20261009/python-lock.txt) |
| 本地模型 | ModelScope 来源 Qwen3-VL 2B/4B Q4_K_M + Q8 投影、SigLIP2、RapidOCR；固定 b11429 Mac GGUF 运行包。8B 本机未验 |

## 已完成的实际用户结果

- 普通入口安装/验证/运行适用模型，独立标签/描述/OCR及基础分析、中文/英文/混合语义与以图检索，有真实执行和保存重开证据。
- 4B CPU 实际描述后立即释放，实际退出/驻留零；Pi 固定三次严格 RGB-v1 观察通过并跨重开回读。历史单次失败原因仍未能回溯。
- 最终候选：同公开副本打开两次由 Preview 接收，保留目录 12→12；公开 Preview 拷贝→原生粘贴图片→真实入库并附着；新图像素同源、旧人工/分析及原件保持。
- 正常退出唯一 Host、同产物重开，工作集四参考/顺序/名称/备注及所选持久签名一致，无重复粘贴或自动重发。
- 先前批次两张批量拖出图实际接收在桌面，已核对字节；指定 Finder 文件夹仍空。停靠/ZIP/处理图证据按原构建保留。

当前公开库 186 资产、53 尝试/51 证据、21 OCR、1 工作集/4 引用、63 后台成功/64 历史；185 向量/1 索引任务。新 Clipboard 资产未索引，覆盖准确为 185/186；后台暂停，平衡/10%。原迁移公开库冻结。非敏感签名见 [最终重开证据](../checkpoints/macos-bugfix-delivery-20261010/clipboard-real-reopen-result.json)。

## 收口与接续

本轮适用任务标记完成；T23 全量/父 #24、WC01、A–F、Eagle与商业发行保留未覆盖条件，未修改远端 issue、未推送/发布。真实断网、Windows 原页压力、Eagle、签名安装/商业发行、无外屏及其他未验项集中留待以后。

只按新用户要求从待测清单接续。需要原始版本/来源/失败链时查 [Mac 历史索引](../history/handoff-snapshots/macos-20261009-20261010/README.md)，不默认加载整批历史。源码、模型、凭据、实际资料库、运行环境和其他 WIP 保留。
