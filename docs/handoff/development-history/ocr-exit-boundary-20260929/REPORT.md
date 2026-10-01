# OCR 子进程退出与关闭边界交付报告

日期：2026-09-29。运行：ocr-exit-boundary-20260929。
授权：用户“继续下一轮”，对应 B01 评估包建议的 OCR 退出/资源/drain 批次；独立复核沿用会话授权。未恢复 B01 或旧阶段队列。

## 结果与范围

原实现取消/超时在 SIGKILL 后立即 reject。新增合成 Python 反例实际观察到：Promise 已取消，所持子进程 PID 仍存活。现在正常结果、失败和取消均等待 close；无法确认时以 UNKNOWN 失败并继续占用资源，不能由任务终态伪造资源释放。Main 关库及退出等待 OCR 收敛后才关闭 Host/app storage。

仅改变 3 份生产 TS（进程 Adapter、controller、Main 装配），新增 3 份测试，同步模块 README 与 TASK。不改公共 IPC 形状、数据库 schema、B01 enabled 含义或 dispatchAvailable:false。

## 实现及边界

| 层 | 本轮行为 | 边界 |
| --- | --- | --- |
| Process Adapter | 正常 close + 有效协议才成功；SIGTERM 250ms → 未 exit 才同句柄 SIGKILL；总 close 期限2250ms；未知资源token到迟到close才释放 | 不按名称/任意PID杀进程；不承诺进程树沙箱或全设备内存/GPU配额 |
| 传输 | stdout/stderr 各1MiB累计上限；异常流与输出保留错误；UNKNOWN销毁本地流但不假称child退出 | stdout输出不代表完成；不记录stderr/原始错误；推理60s默认/120s上限保持 |
| Controller | preparing涵盖configure/prepare/run校验；运行/未知资源阻止维护；任务failed和resource busy分离；drain最多5s | 内部token不经IPC序列化；无法收敛时调用者得到失败，资源仍保留；迟到释放不恢复旧review |
| Main | authority/quit开头暂停OCR，Host.close前await drain；shutdown非idle禁止authority finally恢复OCR | 失败不宣称关库/退出完成；用户可在真实资源收敛后重试 |
| 权威写入 | 保留epoch/scope/session/source/revision及commit AbortSignal检查 | 取消、关库后的迟到输出不写库，已保存OCR与用户修订保留 |

`exit` 已出现但流仍开着时，不再signal已退出句柄；保守等待close。UNKNOWN事件注入的资源token验证不是在真实操作系统制造不可终止进程的证明。

## 实际验证

所有命令串行、有240s上限，日志和退出码在 `logs/`。不要将历史失败与最终通过次数相加为功能数。

| 检查 | 最终结果 | 证据 |
| --- | --- | --- |
| 进程生命周期 | 17/17 | process-final；10个真实stdlib/输入拒绝场景，7个事件注入场景，含双UNKNOWN独立释放 |
| 控制器/关闭 | 12/12 | controller-final；合成Host/Runtime，其中1项执行实际Main authority completion回调 |
| B01 Host/controller | 19/19 | background-regression；真实临时库维护、升级与历史能力回归 |
| OCR原契约/进程 | 断言脚本通过 | ocr-contract；不宣称独立TAP发现数 |
| OCR临时Host存储 | 断言脚本通过 | ocr-storage；保护修订、session/source/Trash与重开 |
| Active Library Host | 断言脚本通过 | host-regression |
| 退出协调器 | 断言脚本通过 | shutdown-regression |
| 正式Electron OCR链 | 1/1 | formal-ocr-poll；编译Main/Preload/Renderer/Runtime/Host，生成PNG和stdlib执行器，保存→修订→识别中关库→重开→识别中quit |
| 正式Electron B01 | 1/1 | background-formal；入库计划、控制、card范围、重开、无自动请求 |
| TypeScript / 构建 | 通过 | typecheck-final / build |

正式OCR执行器仅模拟协议、结果与延迟终止，未加载RapidOCR、权重或真实素材。PID验证与生产信号行为只在本机macOS执行，不能推广为Windows验收。

## 失败、修复和复核发现

1. `process-red`：旧实现取消返回时自有PID仍存活（真实产品反例）；close等待修复后同测试变绿。
2. 独立复核指出quit与authority完成并发时的resume窗口；Main增加shutdown状态守卫，实际回调测试覆盖，未改公共契约。
3. `formal-ocr` / `formal-ocr-diagnostic`：测试在异步等待未真正等到job完成时读取空evidence；第二份日志证明job仍running。改为逐次await正式IPC状态、明确completed断言后 `formal-ocr-poll` 通过。未删失败、放宽断言或跳过场景。这是测试等待修复，不记为产品存储缺陷。
4. UNKNOWN使用集合保存多个持有句柄；新增双资源反例确保其中一个close不能解除另一个资源占用。

## 工作区和交接

before来自本轮开始时真实WIP，而非HEAD。补丁仅8文件，交付after与最小before用于审查；不要向已有WIP盲套。134份相关源码快照不是完整项目。最终摘要与保护记录见 FINAL-SOURCES / AGGREGATE-SOURCES / WORKTREE-PROTECTION。独立签收见 REVIEW-FINAL。

未暂存、提交、推送、安装依赖、启动模型、读写真实资料库或模型缓存。只创建本批证据、编译输出和临时合成测试夹具。已执行测试命令均退出；进程场景检查其自有PID回收，其他后台进程未盘点，状态UNKNOWN。没有部署无人值守运行器。

## 未验收及后续

真实OCR质量/模型、Windows、打包签名、全设备资源Governor、自动派发、独立caption、真实库迁移均NOT_RUN/未实现。B01 OBS-01全局计数规模基准未纳入本批，不据此声称已有卡顿。

完成后STOP，nextBatchAuthorized=false。下一轮需用户指定/批准新范围，本批不会自动启用后台分析。
