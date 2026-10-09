# Mac T23 失败项续收敛（2026-10-09）

当前源码检查点 `7ee0a0d`，分支 `codex/macos-migration`；GitHub main 再核对仍为 `6b86ef05e558229e2bd87998101ca5678bc228cc`。未推送。当前普通 Host 已启动最终构建 **dam-58700bb81142e924**，782 产品输入，source SHA `58700bb81142e9240eea006b540800a2e2e3e74181e4157a19cebe275efab2da`，UTC 2026-10-09T10:23:28.565Z。

本轮范围是 Mac T23 失败收敛。用户明确排除真实断网、Windows 原页压力、Eagle、签名安装／商业发行；不自动展开 8B、视频 A–F 或其他历史 NOT_RUN。WC01、T23／父 #24 与其他父级继续分别保留状态。

普通命令仍为：

```sh
cd /Users/meigong/Documents/design-asset-manager-macos
npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
npm run start:browser -- --profile=/Users/meigong/Documents/DAM-public-macos-profile
```

Browser 默认打开系统浏览器。**桌面设置 → 高级维护 → 连接其他浏览器 → 准备浏览器入口** 可为 IAB 准备正规一次入口，60 秒有效；只复制界面显示的无秘密 `/launch` 地址，页面自行建立会话。不能复制已授权 Chrome 的最终页面、Cookie 或其他凭据。重启 Host 后须重新从这个入口授权。
打开已有库只选择 `/Users/meigong/Documents/DAM-T23-macos-library`。平衡／10% 已恢复；后台暂停、63 成功效果不重发。

版本沿用 [迁移记录](MACOS-MIGRATION-20261009.md)／[T23 原检查点](MACOS-T23-20261009.md)：M4／arm64／24 GiB 统一内存；Electron 30.5.1、SQLite 12.10 Electron ABI、Sharp 0.34.5；固定 Pi 0.99.1／Node 24.21.0 和 seal `ff5c59ec9be9cc130f8da974c838c8af998f552adb48514c7da85c63c5848156`；独立 Python 3.12.11、RapidOCR 1.4.4、SigLIP2 768维。Qwen2B／4B 的 Q4_K_M＋Q8 projector 与检索权重均沿用固定 ModelScope 来源和完整性证明，没有新模型下载、国际回退或账号导出。

## 新的真实操作与版本边界

| 候选／操作 | 实际结果 |
| --- | --- |
| b8bff：Pi gpt-6-luna／low，预先限定三次挑战 | 3/3 通过原严格 RGB-v1：红／绿、蓝／绿、蓝／红；UTC 07:46:15.440、07:50:02.169、07:52:44.679。提示词、随机输入、单次调用和判定未改；新增实际预期／返回颜色、输入 SHA 的持久观察。原 05:50 失败未复现，根因未知，原回执保留 |
| 5f799：新正规桌面入口 → IAB 独立连接 | 实际通过；没有 Chrome 会话复制。IAB 打开指定库、中文“宇航员”与英文“coffee cup on a table”真实 SigLIP 检索，185/185 覆盖、前列主体符合查询。2B CPU 正式加载及停用实际退出 0.1 秒、驻留归零；Pi 最新蓝／红观察跨 Host 重开可见 |
| b8bff 原生窗口 | 真实打开库、工作模式找回三图／原备注、在桌面展开、隐藏和“恢复工作窗口”返回，内容保持；单屏像素目检成立。置顶只见按钮状态，跨应用层级、拖出接收、多屏／断屏未验，不把这些自动改 PASS |
| b8bff：4B CPU 资源拒绝 | 当前余量约 9–10 GiB 时三次预算拒绝 `AI_MEMORY_WAIT`（两次10%、一次临时5%）；没有假资格，随后恢复平衡10%。不是模型已执行失败，不关闭其他应用求通过 |
| 476278：余量提高后4B CPU | 正式真实挑战通过；加载3.9秒、峰值3.44 GiB。公开 coffee 独立短描述成功保存：1 次调用、349 输入／39 输出 tokens，峰值3.52 GiB；人工备注、旧描述和旧 unknown 保持 |
| 476278：分析后立即“释放空闲模型与准备缓存” | **发现真实缺陷**：准备信号与后续合并信号不同，保护仍在，按钮没有立即卸载；之后超时／空闲卸载实际退出0.2秒。此结果不能记为即时释放 PASS |
| 58700 最终普通产物 | 已普通启动；后续原生控制时 macOS 锁定。最终4B分析→立即释放和保存重开待手动解锁后完成，不能借476278的成功覆盖此待验 |

咖啡图确为红棕外壁／白色内壁、银勺、杯碟和木桌。476278 的描述符合主体；这仍只是一张公开内容的质量观察。185 条只有3种内容，不是185独立质量样本。

## 代码与检查

- 每次 launch 保存自己的 physical-close waiter；实际 close 即确认退出，异步清理独立登记、整个 Host drain 仍等待其完成。旧清理不能确认替代进程；未确认退出继续 unknown 和驻留保护。
- Managed `prepare` 返回自己的释放句柄，由视觉、独立标签、基础描述消费者在 finally 明确解除；信号合并不再让准备保护滞留。释放句柄只解除准备保护，不能释放仍存活的模型许可。
- Desktop 可信主窗口才能签发另一浏览器入口，Host 退出／切换拒绝；Browser 无该命令。保持原 Origin、Host、CSRF、注册命令、单次 grant、角色和撤权；未使用免认证白名单。
- Pi 新增 generated-only 非敏感颜色观察，严格判准不变，不反复抽签替代失败定位。

真实安装环境进程回归先红后绿：延迟清理不能阻塞原物理 close，另一实际进程未响应 TERM 时仍 unknown／驻留；恢复真实 TERM 后才归零。准备保护返回句柄也有红／绿证据。测试仅读指定安装模型和官方 native 包，临时独立 SQLite，不写活动 profile 数据库。故障注入是内部证据，普通 UI 另列。

修改后的检查：基础分析19、独立标签30、Pi视觉集成7、基础控制3、实际负模型／物理退出3均通过；类型、正式构建、HTTP单次入口／到期／Origin／CSRF、Main原生角色拒绝、启动13、Client／AI契约及源码治理适用项通过。启动测试缺旧 fixture 依赖已补；标签 fixture 的 macOS物理free误依赖与305字节空闲缓存断言改为明确受控资源和显式释放，未删除／skip／降断言。Pi集成123.7秒是fixture生命周期，不是实际模型性能。完整远端CI未重跑，不宣称两平台全部门通过。

## 数据与接续

476278 描述保存后：185资产、52尝试／50证据、21 OCR、1工作集3成员、63后台成功／64历史；所选非秘密主库 SHA `03579c20854ee1792d6aa93b1d8f7ea59a52b485c8ba937bc6d6817e67765547`。只比前一51／49多明确执行的一次描述，没有自动重发。
185 canonical 向量／1任务 SHA `2fa5f129fc1333a635311e9d0b1dac14af5cc98635e836057d597548da2df38b`，原件 SHA `f633315b50ff203111b25f88297e79c6257996d2e08c92a1dbd64475055a402d` 均不变。人工备注、三成员顺序与工作备注保持。原迁移库没有本轮写入。

当前锁屏接续点：普通58700 Host PID62145／端口52975（仅追溯，不能当永久入口）。原生控制工具明确报告 macOS locked；已向用户请求手动解锁。解锁后从桌面正规入口为IAB授权，打开T23库，复验4B描述成功后**立即**释放、确认实际 close／驻留零，再整 Host 退出重开核对备注／新证据／185向量／63后台无重发；不得盲目重发旧unknown。

精选 [证据检查点](../checkpoints/macos-t23-failures-20261009/README.md)，完整本地 `.scratch/t23-failures-20261009/evidence/`。其他作者的 AGENTS.md／ui-ux-acceptance.md WIP 保持，不纳入提交。
