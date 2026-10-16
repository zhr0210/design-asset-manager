# 2026-10-09 macOS 迁移接线

退出确认绑定每次 launch 的物理 close，独立于异步文件清理；旧 launch 的清理不能确认替代进程退出。未确认退出继续保持驻留许可和 unknown，整个 Host drain 仍等待已登记的清理完成。安装环境真实测试 `scripts/macos-real-vision-close-race.test.ts` 使用指定公开 profile 的只读模型/官方二进制、独立临时数据库；延迟清理和 TERM 交付是明确故障注入，不代替普通 UI 验收。

Managed prepare 返回属于该消费者的释放句柄；视觉、独立标签与基础描述在 finally 解除准备保护。后续传输／资源信号合并不负责识别这个所有者，不能把保护滞留到120秒超时；释放准备保护不释放尚未退出的模型驻留。

正式 Main 复用原 Managed GGUF/消费者与 Governor，按目标选择固定 llama.cpp b11429 Mac arm64/x64 包，完整 SHA/有界 tar 检查后把受支持的 dylib 别名转换为普通文件。Apple Silicon Metal 方案只计同一 RAM 池；驱动/设备/采样未知不批准新 GPU 方案。Mac 自有子进程使用 source-bound libproc helper 读取创建身份、physical footprint 与 lifetime peak，仍仅以实际 close 释放许可。

Python 绑定保留 venv 入口，不解析成丢失环境的系统解释器；从 pyvenv/version 选择实际 site-packages。Mac 正式选择器选择可信环境根后由 Main 拼接 bin/python3，避免通用文件选择器丢失符号链接入口。Worker 的 POSIX 峰值使用真实 getrusage，Darwin bytes/Linux KiB 分别转换。

本轮 M4/24GiB：官方固定运行包内部实际执行、2B Q4_K_M/Q8_0 Metal 公共图推理与物理释放通过；正式 Browser 库存安装已完成，最终 UI 加载/分析/重开因 macOS 锁定尚未验收。精确版本/证据见 [Mac迁移](../../../../docs/history/handoff-snapshots/macos-20261009-20261010/MACOS-MIGRATION-20261009.md)。以下保留 Windows/旧分支证据，32项旧 Runtime 通道仍禁用。

---

# 正式托管视觉运行时（2026-10-06）

`managed-vision-runtime.ts` 是当前 Main 的自有视觉进程入口，接线为“本地模型与 OCR → Main 命名动作 → 模型/可信 Python 依赖指纹 → 共享驻留准入 → 隔离 stdio worker → 必要视觉验证 → 连接配置 → 正式基础分析”。它与既有 Pi/外部服务共用能力消费者，不启动研究 HTTP 服务或执行模型仓库代码。

当前支持 Qwen3-VL-2B/4B-Instruct、Windows x64 已安装 Transformers/Python 3.11、CPU float32、有限图像/context/tokens。正式 Hugging Face 安装、只读引用与受管复制共用[模型管理](../../model-library-workspace/README.md)库存。上游 HTTPS 固定版本不冒充 DAM 发布签名。模型、解释器、依赖与 bundled runner 的漂移会撤销旧资格；重新加载进行真实双色识别复核，目录存在或健康检查不等于 ready。

加载前按组合申请 16/25 GiB RAM 驻留许可（包含加载峰值余量），计算前申请 1 GiB 增量；实际 RSS/峰值/时间绑定执行实例。安静/正常/加速控制后续线程和空闲卸载时限，高预留/压力在当前工作单元后收敛。只有自有 ChildProcess 的实际 close 释放驻留；迟到 close/UNKNOWN 不能凭 Promise 结束清零。停用保留模型配置与分析证据，停止新准入并等待实际退出。

完整预算预检覆盖新增驻留、现有许可、视觉准备和计算增量，加载前及指纹校验后均检查。加载本身不占推理槽，实际双色验证仍必须获得执行许可，允许已准入 OCR 与加载合理共存。后台 readiness 动态拒绝加载、验证、正在计算、退出、冷却及预算不足，防止资源等待反复生成任务尝试。

`python-environment-binding.ts` 核对已安装依赖；`ai-service/tools/managed_vision_worker.py` 由构建复制进实际 Main 资源。它通过私有 stdio 接受受控预览，不开放端口，不执行自定义模型代码。实际组合、测量边界与用户验收见 [A 记录](../../../../docs/handoff/AI-CORE-20261006.md)。更多模型/GPU/平台及 DAM 签名发行未由此交付；Hugging Face 上游安装与 B 的生命周期由模型管理负责。

## 保留的 Platform AI Branch evidence

`platform-ai-branch-evidence.internal.ts` deepens the retained Main implementation
of Platform AI Branch Status. Its Interface is `record(evidence)` and
`readStatus(platformBranch, sources)`. It owns latest records, freshness, ordered
source collection and the existing readiness mapper/status projector calls.
The two retained Runtime IPC adapters share its process-local instance.

## Wiring and permissions

**These retained branch/probe adapters are separate from the managed production entry above.** Formal
Main registers `main-ipc-composition.ts` → `disabled-app.ipc.ts`; all 32 retained
Runtime/branch/probe/Llama channels remain `LIBRARY_FEATURE_DISABLED`. The old
`ai-runtime.ipc.ts` and `llama-runtime.ipc.ts` registrars are not called. Existing
Asset OCR, Visual AI, account and Acceptance entry points are independent.
The new Module itself imports no Runtime owner, bootstrap, settings, SQLite,
model files or network transport. It does not authorize a probe, load or install.

## Preserved behavior

- Latest Python evidence is keyed by lane; ONNX by **requested** family. Readiness
  still interprets the returned family. OCR and Llama each have one latest record.
- Records retain their original object references. Resolved failed probes replace
  earlier evidence; thrown probes do not record. No history, cloning or eviction.
- Five-minute TTL includes the exact boundary. Invalid dates are ignored; future
  dates and clock rollback retain the old behavior. Runtime/configuration changes
  do not add invalidation. Llama server startup's internal probe does not record.
- Worker Promise rejection alone degrades to null. Its synchronous throw and
  other source/mapper/projector errors propagate to the unchanged IPC envelopes.
  Both await checkpoints, source order and per-kind clock observations remain.
- Mapper/projector policy is unchanged: Runtime Probe, Model Readiness and Real
  Model Path remain separate. Artifact paths and ready-to-load alone prove no
  inference. No public contract, Worker HTTP or production registration changes.

## Verification

`test-platform-ai-branch-evidence` exercises the fixed Interface with synthetic
records and source summaries. `test-platform-ai-branch-evidence-ipc` bundles both
complete retained IPC adapters with synthetic side-effect owners, never importing
their real bootstrap/DB/model/endpoint dependencies. `test-platform-ai-branch-disabled`
uses the actual production composition and temporary App storage to check all 32
Runtime channels remain unavailable. Readiness/projector and OCR/Llama transport
tests remain independent; three duplicate store tests were replaced.

These checks do not prove a production model path or restore the old entry points.
Native navigation/visible-state evidence and remaining older test limitations
are recorded separately in `TASK.md`.

2026-10-09 停止取证：首次触发者在abort监听器重入前冻结；有界诊断只保留停止类别、安全码、自有PID、关联尝试及信号请求／物理close观察。超时与迟到close分列，不能把信号请求当退出。旧记录缺这些字段时保留未知，不推断或回填历史原因。
