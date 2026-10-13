# main合并完整性与相关功能验证

对象：本地main的56ee968，运行构建dam-8816c1fa125661e6；来源B提交63dc760。当前审查只修复权限基线登记和反例测试，不修改产品实现、设计规范、CSS、用户原件或AI/OCR设置。

## 结果

1462个已跟踪源码、原生实现、测试和构建配置文件与B提交逐字相同，无缺文件或额外源码改动；B是main祖先，旧普通目录WIP提交9d63405不是main祖先。此次为快速前进合并，没有人工冲突拼接。见[Git清单](git-integrity.json)及[测试与路径摘要](summary.json)。

发现并修复一项合入B时已有的检查遗漏：work-member-tools运行时导入measurePreviewColors未登记进asset-authority-baseline，导致active-authority-composition-changed。已审查它通过现有Host读取当前成员受控预览，控制器验证窗口actor/token、当前scope与成员；临时库测试拒绝伪actor、非成员、撤权后调用及任意读取。权限基线仅允许该模块导入该文件中的唯一measurePreviewColors绑定，不开放其他库导入。新增反例继续拒绝创建Host/Session及额外绑定，权限检查通过。

29项针对性检查最终通过：类型、真实临时SQLite工作集、自动保存/冲突/撤权、拖入取消、原件副本/ZIP、运动终态与保存顺序、布局转换、焦点/退出顶层及受控AppKit拖放/中断/颜色控件。最初两个SQLite测试误用系统Node，其ABI与Electron不同；改用项目Electron Node入口后通过，未替换运行依赖。颜色测试首次少传NativeWorkShelf依赖，按完整生产源文件编译后通过。原始失败与重验日志保留在logs，不掩盖失败。

## 正式应用路径

指定profile-b/library-b-v2：紧凑展开→原生备注输入→实际SQLite保存→原生关窗→正常整Host退出审查→确认主进程/子进程退出→主入口重新打开库→工作集桌面展开→备注恢复。随后从同一UI恢复测试前备注。颜色浮层可打开、重复禁用、取消不新增；Space打开独立大预览，切图与关闭返回正常。主页面保留11条素材，工作集9成员/4色；11个原件SHA全部相同，数据库integrity_check为ok。

这些路径由CUA可见控件点击/键入，不以直接IPC、Store或写库代替。SQLite只用于读回核对；故障注入与受控AppKit/Chromium组件测试单列内部证据。

## 仍需保留的边界

未发现本次Git合并导致的产品异常，不等于全部产品无bug。普通start:desktop仍使用原Electron工作窗，原生B通过start:work-b启用；原生代码已在main，不是默认入口自动切换。普通桌面窗口全UI矩阵、AI/OCR/全部provider、物理取色拖动、多屏/Spaces/高帧率及Dropover覆盖层视觉不在本轮关闭资格。

Apple新颜色、生成CSS、明显Liquid Glass和220×240紧凑布局仍待应用，design:check差异继续登记DESIGN-APPLY；不把待实施设计误判为合并丢失。Eagle分支已删除，main既有Eagle功能清理仍是后续任务。没有push或发布。
