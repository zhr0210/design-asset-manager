# B v7：自行复现、后端实时分析与吸附实际验收（2026-10-13）

最终候选 **dam-f55e18f0df3e70b9**，macOS27 arm64；入口 `npm run start:work-b` → 隔离library-b-v2 → 工作模式 → B二版原生验收 → 在桌面展开。原生SHA `ec61ec93db26cac259d2c627cdbcc5bf5430fa9f3f1faf67e3fe076dcc6754f5`，实际Host68776/native68941及嵌入哈希已核对。只有本轮生成素材，9成员、原备注/两色/矩形笔记保持；大图直角、左侧笔记下方缩略条、小预览圆角及柔影未回退。

用户明确要求后续全部由Agent测试，**本轮未请求用户复测**。当前吸附修复通过Agent正式CUA路径，不再以模拟坐标或发IPC代替用户行为。B父目标仍PARTIAL，吸附子目标在本次单屏场景取得实际PASS。

## 1. 为什么之前没有吸附

### 已观察

用户v6失败运动记录 `b-v7-user-failed-drag-baseline.json`：实际frame移动至负x并回到0，但没有dockIntent。失败发生在原生资格/意图阶段，而不是ZIP、数据库或云模块。

AppKit契约已确认performDrag立即返回且不保证mouseUp；此前同步返回假设错误。之后依赖pressedMouseButtons的Timer补丁仍不能统一AppKit默认标题移动与自定义Root入口。本轮工具实际事件记录 `pressed:0`，同时mouseDragged和mouseUp确实送达；仅以全局按键采样判断结束会提前结束工具路径。该pressed0是本轮工具观察，不冒称用户物理鼠标也一样。

### 修复选择

- 背景/标题统一用Root原生mouseDown/mouseDragged/mouseUp，heading hitTest透明，root mouseDownCanMoveWindow=false，不再让这些区域绕到WindowServer默认拖动；控件、卡片图片拖出及文本编辑入口分别保留。
- 每个输入事件使用它携带的CGEvent屏幕坐标，避免窗口移动后旧window-local坐标积累偏移。没有CGEvent时保留合法event坐标转换。
- 松手即complete跟踪并按实际frame判定，没有cooldown门槛。移出边界也算进入吸附区，修复abs距离拒绝越界拖动。先前24pt边内阈值保留。
- 新输入仍即时中断旧frame动画，UUID/motionId拒绝迟到覆盖；物理主路径不依赖全局按键Timer，原生WindowServer通知的兼容路径仍限定本窗活跃操作。
- 拖离胶囊曾被Host旧normalBounds拉回：实际拖到x298却收到x32恢复命令（`b-v7-drag-away-before.json`）。当前私有原生意图携带校验后的本次恢复frame，Host依旧拥有最终确认/保存，通用Renderer IPC不获此restore权限。还保留当前胶囊的上边缘，避免恢复大窗口突然纵向跳动。

这些是基于失败现场、API契约及正式修复后路径的解释。没有用function名称推断真实执行，也没有删除成员、会话、修订或关库校验取得成功。

## 2. 最终构建自行真实验收

| 正式手势 | 结果 | 证据 |
| --- | --- | --- |
| 先拖到x54（边内阈值外） | 保持普通窗口，不误吸附；backend outside-magnet | final motion开头 |
| 紧凑标题拖到左边并松手 | 72×160胶囊出现，x0 | b-v7-final-left-dock.jpeg/ax.txt |
| 点击胶囊弹出，再拖回左边 | restored x32→实际重新dock；无额外sleep/人为等待 | b-v7-final-left-redock.jpeg、final analysis motionId3→4 |
| 紧凑标题拖至右边 | 右胶囊、箭头向左，x2168 | b-v7-final-right-dock.jpeg |
| 右胶囊恢复→展开→再拖右边 | 保留640×520展开normalBounds后停靠 | b-v7-final-expanded-right-dock.jpeg |
| 点击恢复展开态 | 640×520、9成员、原备注/两色呈现 | b-v7-final-expanded-restored.ax.txt/jpeg |
| 展开停靠条拖离右侧 | 恢复到本次实际x1368/y346，640×520，没有回旧停靠位置 | b-v7-final-expanded-drag-away.jpeg、final analysis motionId11 |
| 展开窗口再拖左边 | 左胶囊出现；点击恢复x32/y346、640×520 | b-v7-final-expanded-left-dock.jpeg、b-v7-final-left-expanded-restore.jpeg |
| 点击成员→Space开关预览 | 已有真实笔记、640×480及现行左侧布局正常；Space关闭 | b-v7-final-focus-protected.ax.txt/jpeg |

操作全部经正式界面点击/拖动/键入；SQLite只读回核，不写库、不注入Store/IPC。工具断连期间重连后读当前AX继续，没有把重复启动转交旧进程称为新构建。当前最后窗口位于x32/y346，恢复展开；不是留在屏外或隐藏。

## 3. 后端实时记录与阶段分析

当前实时文件：`profile-b/native-shelf-ui/79af7c90-3bd5-4cda-829b-a98e84e37411/motion-trace.json`。每次操作记录begin/dragged/finished/eligible、dock或undock意图、Host bounds命令及完成geometry/motionId。最多80条滚动保存，只含窗口坐标、屏幕横边界和状态；不记录图片字节、路径输入、剪贴板、账号/凭据，不读取全进程环境或内存。

保留完整末次记录 `b-v7-final-motion.json`，逐项关联分析 `b-v7-final-analysis.json`。当前80条包含12次吸附/恢复的完整意图→命令→终态链，所有终态坐标/尺寸等于Host命令。一次右侧展开拖离：x1368/y346与私有restore完全一致，最终主库layout和9成员也读回一致。

本次链路测量：Host intent→command为0–1ms；dock command→stable geometry为332–366ms；restore为218–233ms，与配置0.3/0.2s方向相符。它们是此批实际记录，**不是P95/连续帧/Dropover级流畅度资格**。自动工具在两个独立输入之间有观察开销，“连续”仅指不添加人为等待；动画途中输入的即时取消另由真实AppKit内部回归覆盖。

## 4. 内部回归及边界

`b-v7-native.log`实际AppKit方法边界：root事件移动实际frame，无global-button/timer依赖，越界两侧dock判定，旧完成不覆盖新frame；隐藏sender测试不代替上述CUA。`b-v7-dock.log`真实临时库：Renderer额外restore拒绝，ownedNative合法restore接受，失败反馈/草稿/权限/保存保护。`b-v7-controller.log`已有Copy、成员撤权、冲突/未知提交及延迟OS关闭保护保持。当前build/typecheck/diff check及200项actual helper冒烟通过。

本轮不声称多屏、跨Spaces系统拖动、MissionControl、帧率/P95已全面通过。Root应用自己处理窗口移动，WindowServer跨Space拖动原生特性不可由当前单屏结果自动转记。完整B的其他接收/视频/AI/OCR条件仍在台账。
