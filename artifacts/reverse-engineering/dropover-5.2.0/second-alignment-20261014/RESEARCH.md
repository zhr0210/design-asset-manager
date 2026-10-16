# Dropover第二轮对标：数量尺寸、双击停靠、胶囊与系统菜单

2026-10-14。用户已确认共同理解达成，选择“补齐调研与规格准备，暂不实施”。本轮只操作新建公开测试悬浮窗、观察原版和准备文档，没有修改DAM产品源码或清理实际库。本地目标见[规格准备](../../../../docs/product/B-WORK-WINDOW-SECOND-ALIGNMENT-SPEC-20261014.md)。

## 当前结论

- 原版数量尺寸已实测1/2/3/5/6/7，宽400pt、高207/310/435pt；两个档位边界与已有静态策略吻合。
- 展开中7减5不立即缩窗，重新展开才回310。DAM即时调档是用户明确选择的差异。
- 右侧紧凑背景双击停靠/抓手恢复已运行；静态恢复距任意边缘≤26pt、排除可见控件、最近可用左右边、零速度0.3秒停靠链。后续已补证中部偏左及靠左停靠/恢复，精确等距/多屏/触控板仍未验。
- 胶囊完整圆角、多图层背景/高光/阴影、长文字双图层/渐隐/2秒停顿/循环公式已恢复并与连续画面、实际CALayer配对。它不是独立NSGlassEffectView，整窗底板才是真正系统玻璃。
- 实际菜单按数量/类型变化，单张和多张清单均观察；Quick Look已打开并关闭，AirDrop选择器/取消与NSSharingService实际调用已配对。其他菜单不能仅凭存在称执行通过。

## 身份与方法

安装Dropover 5.2.0（bundle me.damir.dropover-mac），Universal二进制SHA256 `b0120976ab702cbd3eaca13e4e596bb5d4d6db8eeae776fb78e234b9d78b5294`，临时arm64副本与framework身份见[evidence-index.json](evidence-index.json)。本轮观测PID18449/窗口43143，只是采样身份，不是永久进程号。

CUA正式“窗口→新的悬浮窗”创建空窗；用户将它置前后，工具绑定到“空窗口”。独立Finder窗口定位已指定public-fixtures，选择/复制公开PNG，通过正式⌘V接入。公开长名称只编辑新测试窗。未在旧用户窗导入/删除素材；只处理9张已指定生成PNG，内容哈希仍与公开库Originals匹配，见[文件回执](public-files-receipt.json)。

Frida在主线程只读采样目标窗口class/number/frame/key/visible与其视图/图层；限于目标的事件/系统API记录只保留类型、数量、方法和调用栈，不读取凭据、环境、完整内存或其他文件内容。临时REA CLI MCP沿用既有Ghidra/JDK的进程局部路径，分析原版arm64副本，不改全局安装/权限；原始dossier和错误留scratch，选取pseudocode、Evidence ID及限制持久化于本目录。静态代码恢复、真实执行和DAM决策分别记录。

## 数量尺寸与空状态

| 图片数 | AppKit实际frame（pt） | 结果 |
| --- | --- | --- |
| 1 | [1820,994,400,207] | 第一档，横图1200×600 |
| 2 | [1820,1002,400,207] | 第一档，横/竖混合 |
| 3 | [1820,899,400,310] | 第二档，横/竖/方混合 |
| 5 | [1820,899,400,310] | 第二档，已有滚动条 |
| 6 | [1820,774,400,435] | 第三档，已有滚动条 |
| 7 | [1820,774,400,435] | 第三档，已有滚动条 |

截图名为one/two/three/five/six/seven-expanded，实际frame来自同窗原生对象，2x截图像素不是pt尺寸。网格两列；原版紧凑198×207pt，本轮DAM只改展开尺寸，保持220×240pt紧凑契约。默认宽400、高≤2:207、3–5:310、≥6:435的静态来源仍见[前轮3.1](../ui-refinement-20261014/REPORT.md)。数量边界已运行补证；小屏、非图像混合和更大数量容量尚未实测，不外推全部情况。

展开态右键所选2项→“从架子上取下”，7减5后frame仍400×435；收起再展开才400×310。展开态⌘V当次未增加，收起稳定后相同公开文件接入成功；不能推定所有展开态添加均不支持。选择Shift逐项增减，不是范围选择。

6减2仍由正式引用移出；两张重新展开207。移出最后两张后，空展开窗保留“没有文件/0 KB”，只有系统动作占位；收起后空紧凑窗显示“放置你的内容项”，名称胶囊隐藏，见empty-expanded.txt/png。用户原件没有被删除。DAM即时数量调档与空态规则在规格中明确，不将原版未即时缩小当实现bug。

## 双击停靠：运行与静态链

右侧背景截图点[375,270]双击，实际frame到[2208,1002,198,207]，保持y/尺寸，露出抓手；点击抓手恢复。连续frame序列、终态和图片见double-click-frame-sequence.json、double-click-docked-native.json/png。AppKit窗口运动走CAAnimation/NSAnimationContext链，不用截图宽度倒推窗口尺寸。

本轮REA `0x100006250`（ev_76f2dfdb1c2de83cf7a2d64a41674289d973e5da1cfd7f06955742b0f2fd9120）在mouseUp检查clickCount=2后走资格helper`0x100006d08`（ev_86b7b45c594fb65b9f1168e36d9e7038d738dd932e098fb939d5908c0a8304fa）：当前双击边缘偏好为dock，紧凑/未覆盖接管，点击距最近窗口边缘≤26pt，再排除可见可交互子控件。中间图片双击属于另一didRecognizeDoubleClick路径，不当成同一停靠入口。

执行`0x100009b90→0x100009704`，后者用`0x1000095d0`获取可用左右侧并拒绝expanded panel；`0x100009478`分别检查两侧候选，`0x100007c24`比较窗口minX/maxX与屏幕对应边缘的绝对距离，选择最近侧。执行传入零速度给`0x100007cd8`，因此走默认0.3秒；公共AppKit动画组EaseOut及84%屏外目标沿用前轮已恢复的停靠链。证据见[dock-and-sharing-static-evidence.json](dock-and-sharing-static-evidence.json)。部分Swift CGRect伪代码寄存器错位，不照抄错误变量名；数值结论结合汇编/运行frame/前轮函数原始证据判断。

新一轮工具drag已到目标窗口，location变化但deltaX/deltaY全为0；从中部背景和顶部NavigationBar尝试都没有实际移位，见input-observer.ndjson/input-hit-observer.ndjson。该差异不能证明原版不支持拖动，也未完整证明不移动的底层原因。用户真实移动请求已发出，左侧/中部的运行对照保留待补；不会通过后台setFrame冒充正式拖窗实测。

## 胶囊：原生材质与文字循环

自定义名称入口给测试窗设置PUBLIC长名称。短标题控件68×28pt/视口53pt，长标题101×28pt/视口86pt；Chevron6×12pt固定。对象是DropoverCore.DisclosureIndicatorControl→DisclosureIndicatorTextContainerView→AnimatingTextView；整窗另有真正NSGlassEffectView，详见long-title-native.json。

Control.layout（ev_a21f95044b4481a6ab2ecd5f5172097a319df40a36670e724e1e874979e04fe6）按高度×0.5建完整圆角路径，背景/选择/阴影/边缘及顶部内高光分别成层。常规填充浅色黑0.07、深色白0.1；边缘浅色黑/深色白0.03；顶部内高光浅色白0.1/深色白0.07；深色阴影radius4、offset[0,-2]、opacity0.1。allowsVibrancy返回false。不是独立玻璃视图或只有普通填充色块，而是原生自定义图层与整窗玻璃合成。

AnimatingTextView使用两份CATextLayer、独立viewport、CAGradientLayer mask；mask locations=[0,.15,.85,1]，两端透明中段不透明。初始化spacing=12，短名称不溢出时清mask/动画、还原transform；溢出建立UUID，排程前及执行前检查同一标识，使旧任务失效。2秒停顿由DispatchTimeInterval.seconds常量明确恢复。MarqueeAnimation为CABasicAnimation，transform.translation.x、additive=true、EaseInEaseOut，时长`max(10,移动距离/20)`，完成后接续循环。

39个实际图层样本：当前长名称两个文本层宽390，第二份x402，contentLayer宽804，MarqueeAnimation duration20.1秒；presentation x在8秒内从-27.85到-254.97。独立指定单窗连续截图约15.6秒显示向左移动、第二份衔接及停顿，见[capsule-scroll-sequence.png](capsule-scroll-sequence.png)。这些内容截图忽略framing，不作为玻璃外框资格。最初2.1秒快照不足以证明循环，已由后续连续画面和CALayer数据补足。

全部方法/参数Evidence见[capsule-static-evidence.json](capsule-static-evidence.json)。减少动态效果、辅助显示和短名称临界像素没有原版完整运行矩阵；DAM使用稳定可读替代是既有产品保护，不能称原版分支已被恢复。

## 实际菜单与系统调用

多张紧凑菜单和展开所选菜单见compact-menu.txt、expanded-selection-menu.txt。紧凑针对全部、展开所选菜单显示复制2张/移至新架子/移出；原版显示范围不等于DAM可省略明确“全部/所选”文案。完整菜单包含：

| 组 | 实际观察项目 |
| --- | --- |
| 查看 | 本机打开方式列表、Finder显示、Quick Look、信息 |
| 系统分享 | AirDrop、邮件、信息；单张备忘录与更多中的照片/无边记/手记/提醒事项/快捷指令，多张服务集合有所不同 |
| 剪贴板/文件 | 添加、复制文件、复制路径；复制/移动到下载或选择文件夹；改名、ZIP、废纸篓 |
| 图像 | 调整大小、转换、压缩、元数据清理、OCR、PDF；多张拼接；单张img_redact_solo及设置桌面图片 |
| 窗口 | 清空、停靠、名字、指示器色/常显、固定、当前Space、偏好 |
| 云端 | Dropover链接、iCloud链接；包内还存在其他云候选，排除于DAM本轮 |

“编辑文本”对应单张img_redact_solo，旧framework证据说明是图像标注/遮挡工具；不按错误翻译推导成纯文本编辑。菜单按数量/类型/系统服务变化，不能把某一机器的固定应用列表照抄。

Quick Look已从实际菜单打开系统窗口，显示指定公开PNG并关闭返回。AirDrop已从单张菜单点击，实际系统选择器提示Wi‑Fi关闭，点击取消；没有打开Wi‑Fi、选择收件人、发送或修改权限。目标方法hook捕获`NSSharingService.performWithItems:`、itemCount=1，ActionsController→SharingServiceAction→系统方法栈，见[system-api-events.json](system-api-events.json)。REA当前`0x100223b78`（ev_d419e0e5b2433a8c7cfee38c53602d3e894c9b5f462b6148ad59d870c1467dba）同样构造URL集合后调用performWithItems，静态与运行链配对。

Apple官方[NSSharingService](https://developer.apple.com/documentation/appkit/nssharingservice)说明其承接系统分享服务；[NSWorkspace](https://developer.apple.com/documentation/appkit/nsworkspace)提供应用启动和文件相关系统服务；[NSOpenPanel](https://developer.apple.com/documentation/appkit/nsopenpanel)提供原生文件选择。官方Markdown已读取，见scratch缓存；这只支持拟采用公共接口，不能代替原版每个项目的实际调用观察。

移位/改名/废纸篓/图像处理完整原版执行未在本轮操作，避免修改生成源文件或触发其他服务。前轮报告7.5恢复Move/Copy可能部分成功和取消限制，只是已有静态背景；DAM仍采用Host交付副本、独立产物、准确部分结果、撤权和迟到回调保护，不降低到原版未保证的事务语义。选择器取消/无应用/系统失败仍须在实现后正式验收。

## DAM规格准备与当前限制

已确认：彻底退役工作集颜色/文字备注及历史数据；按数量即时调尺寸且取消手动缩放；紧凑背景/边缘双击；原生胶囊与名称滚动；优先完整本机菜单、系统动作处理独立交付副本；窗口标记/固定/Space全组纳入，Quick Look新增而DAM大预览保留。迁移/version/Host/失败接缝已根据当前源码整理为[本地规格](../../../../docs/product/B-WORK-WINDOW-SECOND-ALIGNMENT-SPEC-20261014.md)，不是实施或资格。

当前工作集schema仍有note/colors_json，Managed上限15；后续须显式、可恢复的版本迁移，清除全部消费者，保留素材笔记/独立色板/原件及其他内容。原生展开旧高度校验和恢复路径需一起适配207/310/435，不能只改窗口常量。数量选择以成员总数，不以所选数量；空状态和支持非图像渲染分别验证。

剩余设备缺口：精确等距、小屏/多屏/Spaces、触控板及辅助显示；中部偏左与靠左的限定双击对照已由后续continued证据补足；系统菜单完整实际产物/失败/取消矩阵；DAM新产物尚未实现。静态机制已恢复的项目不重复当未知，设备缺口也不借旧候选PASS关闭。

## 收尾与失败记录

早期UI一直绑定旧窗，用户置前新空窗后解除；没有向旧窗导入素材。REA direct会话缺进程局部Ghidra路径；临时CLI解决静态分析，但实时UI操作要求安装路径与analysis target一致，arm64副本/Universal支持差异导致该REA UI路由未成功，不当作UI证据。CUA操作和Frida只读记录是本轮运行证据。

display连续捕获因外来前景预检全部跳过，底板已关闭；没有放宽过滤。改用限定公开单窗内容采集并明确framing限制。main 0x100008024响应超过传输预算，保留Evidence已导出，未重复分析；此大型条目未用于结论。

原版安装包未写入，系统设置/网络未改，Quick Look/AirDrop已关闭，最后复核App仍运行，但窗口43143已不在窗口清单，原因未确立；不把其消失归因为用户操作，也不恢复已失效的移动请求。所有临时分析会话收尾、hook卸载及产物身份见evidence-index.json。只有文档和公开证据差异，没有新DAM构建、库升级、外部发布或关闭Issue。

## 继续实测：重新建窗、系统调用、复制与中部/左侧双击

用户追问继续测试后，新建公开测试窗44398，正式导入7份可恢复公开副本中的第1张。Finder菜单实际调用NSWorkspace.activateFileViewerSelectingURLs:并定位同一任务副本；菜单构建取得NSSharingService.sharingServicesForItems:及NSWorkspace.URLsForApplicationsToOpenURL:，证明当前服务/应用列表由系统按输入取得。复制目录入口走DropoverFileOperations→NSOpenPanel.runModal，取消返回窗；第二次选择任务copy-output后实际生成23238字节PNG，SHA256与输入一致。原版成功后可见目标曾hidden再missing，未据此推断所有动作必然关窗。证据见continued/system-api-events.json、copy-result.json。

新窗进入调整大小配置：尺寸模式、最大宽高、显示去向、创建副本、保存目录均实际可见，见continued/resize-config.txt。取消捕获阶段返回SCStream -3812。随后旧PID18449退出且系统诊断摘要为过度递归造成栈耗尽；当时存在窗口函数hook，因此不能归因为原版固有bug，也不能用该过程证明取消安全。未读取完整崩溃报告/线程内存，仅异常/进程时间元数据；停止窗口函数插桩。

在新PID64347不挂窗口函数hook，重新从菜单进入同一缩放配置再取消，SCStream仍在窗口切换后返回-3812，但原生一次性主线程只读inventory与重绑AX确认配置窗已关闭，原窗44504和图片仍在且key=1/visible=1，进程仍运行。未执行缩放输出，公开源副本SHA保持。工具捕获异常与实际取消结果分开记。

稳定测试窗名为PUBLIC-继续测试，用户实际拖至中部，原生frame[1009,943,198,207]，中心略偏屏幕左侧。Agent在右侧背景截图点[375,270]双击，终态[-167,943,198,207]停靠左边；右侧点击区域并不决定方向。左侧抓手点击恢复到[12,943,198,207]，再次双击右背景仍停靠[-167,943,198,207]，再恢复。与前一右侧位置样本配合，左右和中部偏左的最近边策略已运行补证；精确等距分支/多屏/触控板仍未验，不冒称整个设备矩阵完成。

上述frame仅一次性主线程getter采样，无运动方法Interceptor；调用栈的旧进程证据与新进程物理输入分开，停止高频窗口hook以避免诊断重入。截图和回执见continued/。系统设置/网络未改，未发送消息、上传或清理实际Library；新测试窗保留以便后续操作。本轮仍调研和规格准备，不实施DAM。

边缘资格运行反例：在已恢复x12的紧凑窗空白[198,290]截图点（距各边大于26pt）双击，frame仍[12,943,198,207]、无停靠抓手，见continued/outside-edge-no-dock.json。该限定背景点与边缘双击形成实际输入对照，不外推所有子控件命中。

## 菜单关键动作执行补证（2026-10-15）

已完成[关键菜单实测](menu-key-20261015/RESULT.md)：真实改名/重名警告取消、移动、ZIP、PNG→JPEG、600×300缩放副本、单页PDF渲染、PNG压缩类型说明/取消、可恢复Trash及恢复。产物与原件SHA分列，窗口关闭/截图错误不作成功依据；没有NSWindow方法hook。九份指定公开原件SHA保持；移位/改名/Trash仅针对测试副本。缩放临时默认参数已成功恢复并重开读回，ZIP默认名保持。原版目的目录历史增加任务目录，不清理用户历史。

此前“本地动作完整执行尚未运行”的总述保留原采样时间，本节补足上述限定关键单项；OCR、拼接、标注、元数据清理、压缩实际输出、多项部分失败及更多类型仍未运行。不会将关键菜单通过写成全部菜单或未来DAM资格通过。
