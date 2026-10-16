# B 原生验收续测（2026-10-15）

Mac解锁后，实际从当前工作树 `npm run start:work-b -- --profile=/Users/meigong/.codex/worktrees/3bfa/design-asset-manager-macos/.scratch/b-work-window-second-implementation-20261015/profile` → 打开相邻 `public-library` → 工作模式 → 打开/恢复窗口。未调用IPC/注入Store/写库来冒充用户操作。所有素材为既有9份公开生成Original的可恢复库副本；没有迁移原公开库或操作其他资料库。当前结论 **PARTIAL_UX_ACCEPTANCE**，不再是锁屏阻塞，也未关闭完整复刻父目标。

## 最终运行身份与发现后修复

最终构建 `dam-0548c3cde14ab4a3`；原生SHA256 `556bc597e53237af0cf9d47c3aaf258b6e54862832b7c3b82d9cbadd932f553d`。对应[构建](build-final.txt)、[类型检查](typecheck-final.txt)、[五组AppKit](native-final.txt)、[真实图像/PDF/拼接检查](image-final.txt)。旧PID42714通过正常退出确认结束，后续候选均通过普通退出/启动替换，未强杀Host。最终候选正常重开后通过下列保存结果、可用智能区域、导出、Finder/指定应用和共享取消；[原生轨迹](manifest.json)按buildId标识。

1. 胶囊AX名称存在但画面空白：材质子视图覆盖手动插入根层的CATextLayer。文字改由前景NSView承载，[修复前](capsule-before.jpg)、[修复后](capsule-after.jpg)、[长名片段A](capsule-long-a.jpg)、[片段B](capsule-long-b.jpg)为实际画面；最终[紧凑态](final-compact.jpg)仍显示名称。保留原生vibrancy，不冒称NSGlassEffectView。
2. 系统分享按Escape连带收起，并把取消当作保存失败：真实回调顺序为AppKit先取消，再向底窗转发按键。补入[失败测试](share-forward-red.txt)，用同事件及350ms取消转发保护；系统反馈与独立保存冲突分开，不显示“重试保存”。最终[取消后树](final-sharing-cancel.txt)保留展开态，无重试按钮，没有实际发送。
3. 智能文字区域没有可操作辅助功能入口：补稳定持有、启用的原生AX区域，和鼠标共用同一选中逻辑、保留撤销；[原失败](redaction-access-red.txt)。最终正式入口识别区域→选择→撤销→再选择→保存PNG实际完成，[导出](final-smart-export.txt)、[像素](final-smart-pixels.json)。未把辅助功能成功推断为手动指针画布通过。
4. 拼接方向与缩放文案分开：垂直/水平只表达方向，原尺寸居中/等比另选；成功提示改为“图像拼接”，避免把默认原尺寸结果称为等比。

## 实际路径与产物

| 范围 | 当前取得的真实证据 | 尚未覆盖 |
| --- | --- | --- |
| S01 | UI取消升级后v7/历史字段保留；UI明确同意后v16，旧库备份可回读；[迁移](migration-result.json) | 非公开唯一库不作破坏实验 |
| S02 | 正式编辑在同一展开窗增至1/3/5/7，实际400×207/310/310/435；移除/清空实际回207；[尺寸](quantity-result.json)及对应截图 | 中心/左右锚点全物理矩阵、主动拖移/屏间不作新PASS |
| S03 | 紧凑背景顶部双击实际停靠，[边缘抓手](double-click-docked.jpg)恢复 | 多屏、精确等距及触控板 |
| S04 | 原生胶囊实际显示短/长名，两个时刻滚动位置不同，收起/重启可用 | 高帧率曲线和辅助显示 |
| S05 | 菜单切换固定/当前Space，设#6040FF标记/常显；[实际标记](window-indicator.jpg)、[设备布局](saved-set-results.json) | 物理Space切换、多显示器置顶矩阵 |
| S06 | Quick Look实际公开副本；最终文件信息23332字节；Finder选中交付路径；打开方式动态列表→Preview实际收到[公开图](open-with-preview-final.jpg)；DAM大预览显示保存OCR/独立配色/Notebook入口 | 桌面图片没有更改；文件信息是AppKit面板，非Finder Get Info |
| S07 | 系统共享显示实际可用服务，取消保持展开/副本，最终复验 | 未发送或上传；AirDrop最终接收无声明 |
| S08 | 菜单改名PUBLIC-renamed-copy、复制到copied、移动到moved、系统Trash实际确认；原件不变 | 未通过Finder实际放回Trash副本；碰撞/取消内部证据单列 |
| S09 | 复制2项交付文件；剪贴板接入实际产生1张800×800 Copy素材（现有image读取）；所选1项ZIP CRC有效且条目SHA与原件一致 | 不宣称一次导入2个file-URL；未知用户剪贴板未读取/导出 |
| S10–11 | 600×300边界等比生成300×300 PNG；转换800×800 JPEG；压缩如实提示未减少；清理后无EXIF/ICC，PNG仍有DPI块 | 不宣称清除了所有可能的元数据；高级格式/全部失败矩阵仅内部检查 |
| S12 | 800×800+600×1200默认拼接为800×2000；PDF2页MediaBox顺序正确，WPS实际显示1/2，[接收图](pdf-two-pages-receiver.jpg) | 最终改文案后未重复新一轮全部组合生成，算法未改；全部排布组合内部证据 |
| S13 | 正式设置选择既有隔离RapidOCR，真实识字/空图/最大输入资格；原生菜单识别PUBLIC9，实际TXT导出内容正确；重启后OCR仍可用于智能区域 | 专项库未新增空白素材用户路径；人工修订优先及取消受控检查单列 |
| S14 | 最终原生AX智能区域选中/撤销/独立PNG实际导出；800×800，21156个变化像素全黑，中心不变 | 指针点击/拖选画布未得有效输入结果，手动绘制/移动/缩放仍待物理复验，不能称已修复 |
| S15 | 从原9选1复制新集，增至7；剪贴板增至8，选2转入PUBLIC-moved-2后源6；清空源0；新建PUBLIC-empty-new0；[最终正常重开](final-reopen-catalog.txt)保留9/0/2/0 | 两窗并发冲突/未知结果/失败保护受控内部检查 |

[生成产物清单](generated-artifact-results.json)记录实际文件SHA、解码尺寸、元数据、ZIP CRC/条目、PDF页尺寸；[原件保持](preservation-result.json)。最终智能PNG字节SHA为 `51359dcf8b11e585b6e0938f6ff7ff7277c1852134bf7948ad59a684c4804e06`，原件仍为 `bec97fd9b0935d4c12bbf741297e632caa475b9cb50a4bb40755cffced0f9bb8`。保存重开后原9集合与新集合记录保持，不以正常结束推断未执行的失败分支通过。

## 版本与限制

迁移/1、3、5、7/首个QL和单页PDF来自d063候选；胶囊/双击/文件管理/300px缩放来自fc4候选；JPEG/真实OCR来自c0ab候选；两页PDF/ZIP/压缩/元数据/拼接/引用操作来自中间可访问区域候选；最终0548对受本轮修复影响的可用区域/导出/系统取消和重开复验。直接code-review自审已检查图层顺序、AppKit取消回调顺序、独立保存冲突、虚拟区域对象持有/启用和Host注释字段边界，没有独立审查声明。这里保留版本边界，不把所有早先截图改记为最终构建重新测试。

原生CUA的坐标画布操作未产生有效遮挡，弹层截图还会裁在父窗范围；目前无法仅凭这些工具结果区分坐标映射与实际指针路由。手动画布、物理多屏/Spaces/触控板、高帧率动效和系统Trash放回仍是明确缺口。无需再因旧锁屏请求用户解锁，不把源码/AppKit测试/静态原版证据替代这些资格。没有新权限、云服务费用、外部消息、推送或发布。
