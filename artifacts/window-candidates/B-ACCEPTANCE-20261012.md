# B 原生工作集继续验收：2026-10-12

当前候选：**dam-5f8522c6e415e0b9**，macOS27.0（26A428）arm64。普通入口 `npm run start:work-b` → 打开 `library-b-v2` → 工作模式 → B 二版原生验收 → 在桌面展开。唯一Host及本轮profile继续持有业务权威。仍为PARTIAL，不替换普通默认版本，不发布。

本轮只使用生成PNG、同一隔离库/profile。旧library-b及私人素材不读不改，AI服务与云分享未执行。最终保留九项成员、原备注、#4A9DAB/#342342两色、新测试笔记v3-drawing-test（1个矩形）。原已存在笔记页未删除。

## 正式路径与结果

| 路径 | 结果与范围 | 证据 |
| --- | --- | --- |
| 整窗拖入 | 用户确认f7c645版正常拖入；已观察整窗测试卡片入库。最新鼠标命中调整后的物理拖入没有再假记通过 | b-v2-window-drop-repair.json、当前checkpoint |
| 原件副本 | 当前正式菜单单选1项生成，640×480，哈希与sourceGeneration完全一致 | b-v3-current-original.ax.txt、b-v3-current-delivery-readback.json |
| 预览/兼容PNG | 当前正式菜单生成640×480 PNG，实际解码及receipt hash符合 | b-v3-current-preview.ax.txt、b-v3-current-compatible.ax.txt、同readback |
| 图像处理失败/纠正 | 宽度0→1–4096明确错误，输入保留；改160×120→完成且真实文件160×120，旧错误无残留 | b-v3-current-image-invalid.ax.txt、b-v3-current-image-success.ax.txt、同readback |
| ZIP全部 | 清空选择后菜单显示9份→生成1个ZIP；9条目CRC正确，每条名称/长度/SHA与归档索引匹配，同名条目分开编号 | b-v3-current-zip.ax.txt、同readback |
| 取消完成 | 生成后取消→Host确认文字，拖出入口消失；当前素材保留。进行中竞态由内部回归覆盖，未冒称大型任务中取消GUI已测 | b-v3-current-cancel.ax.txt、b-v3-native-regression.log |
| 真正点击/Shift | 缩略图中央实际点击→单选及collection焦点；Shift实际点击第二图加入，再Shift只移出该图 | b-v3-shift-add.ax.txt、b-v3-shift-remove.ax.txt |
| 空格/专注 | 真正图上点击后Space打开独立/work-window，640×480、实测配色、大布局；缩放/fit可执行，关闭保留选择 | b-v3-drawing-restored.ax.txt/jpeg |
| 文本删除/备注 | 备注获得实际文本焦点后Backspace删除字符，不改9成员；修改自动保存、正式Quit重开一致，最终恢复原备注 | b-v3-note-edit-saved.ax.txt、b-v3-final-reopen.ax.txt、b-v3-clean-normal-reopen.ax.txt |
| 未完成输入关闭 | HEX#未确认时收起→关闭被拒绝，展开仍有#。随后清除此轮测试输入。提示较泛，未写成完善错误UX | b-v3-incomplete-color-close-blocked.ax.txt、b-v3-incomplete-color-retained.ax.txt |
| 笔记/矩形 | 添加独立页→命名v3-drawing-test→矩形真实画布拖动→切图返回1标注恢复；正常退出进程消失后重新打开仍有该页及标注 | b-v3-drawing-restored.ax.txt/jpeg、b-v3-drawing-normal-reopen.ax.txt/jpeg |
| 移出引用 | Backspace移出生成最后一项→8项自动保存；主资料库选择器仍提供该素材→重新加入并保存→原生9项；未重复导入 | b-v3-delete-reference.ax.txt、b-v3-reference-restored-main.ax.txt |
| 来源保全 | 6份指定来源PNG哈希均与生成时基线一致 | b-v3-source-integrity.json |
| AI/OCR | NOT_RUN：正式面板明确要求启用图像服务、OCR环境未选择。未以接线/按钮代替真实执行 | b-v3-ai-ocr-unconfigured.ax.txt |

## 测试中修复的三个问题

1. 取消浮层没有等待回调，永久停在“正在取消”，旧receipt拖出按钮仍可见。新增本地operation资格，取消等待Host完成并清理旧结果；迟到handoff回调不能恢复结果或提前允许新生成。
2. 图像参数错误落到全局“重试保存”，纠正成功后错误仍留。浮层自行呈现交付回复，独立内容保存冲突不会被交付成功清除。
3. NSImageView消耗真实mouseDown，卡片点击没有取得网格焦点，Space进入备注。卡片统一命中其图片/文字的鼠标手势，保留无障碍语义及窗口级素材接收；修复后真实坐标点击、Shift和Space已验。

工具无障碍点击文本曾未切焦点，误入本轮测试HEX；已清除此轮文字，改真实画面点击确认焦点后重测。旧失败和中间构建证据保留，最终受影响路径在5f8522版重验。

## 内部保护与构建

- 当前生产Swift实际AppKit注册树/回调及hit test测试通过：全窗接收、纯文本编辑、freeze、取消竞态、交付错误与保存冲突独立。
- real temp SQLite controller测试通过：另一窗口真实提交新revision→本地草稿保留、drain拒绝；旧resolution拒绝；用户核对当前revision后保存。成员撤权、首次promise字节、不可覆盖、外部Copy、ZIP、原件保留及等待OS退出继续通过。
- autosave故障注入通过：较早完成不覆盖新输入，未知提交不自动重发。该故障为内部模拟，不称正式窗口故障路径已完成。
- typecheck、正式build及diff check通过；当前实际helper200项布局/清退冒烟通过。非帧时序或正式200项用户路径资格。

## 仍未关闭

- 新版本菜单副本/ZIP向Finder、Preview、DAM的物理交接及文件承诺来源矩阵：本轮验证了正式生成与正确文件，没有把直接读取生成物算作OS文件交接。此前多选拖出只保留用户报告，接收字节未留存；工具此前跨窗口定位不稳定，当前尚无可复查的新接收结果。
- 视频参考帧原生入口尚缺；JPEG/WebP全部参数、真实长任务取消、失效源/容量/撤权完整GUI矩阵未完成。
- 名称/色板新编辑全部GUI矩阵未重复；已有名称/两色重开观察保留；IME/文字标注完整取消矩阵未完成。
- AI/OCR执行条件未配置；跨屏、右吸附/拖离、全屏/Spaces本轮未完成。
- 1/20/200多窗口P95、连续帧及资源测量未完成，不能宣称达到Dropover流畅水平。Windows另行实现和验收。

本轮不把局部通过改成B全功能完成，下一动作是补可复查物理接收及上述条件。
