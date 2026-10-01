# 产物边界

生产构建入口：Main index、三个Preload、Renderer index.html；固定Pi Worker作为打包资源。package build.files 仅 out 与 package.json；extraResources 保留 ai-service、完整Pi封印运行文件/许可。没有裁剪依赖或许可证。

测试目录 scripts/test-support 只承载两份 renderer 内存适配器，所有 sole testcase 保留。Main当前内存适配器可能通过barrel被静态图视为可达，不据此任意删除。批准原型、golden、预览脚本仍可追溯，不进入正式renderer路由。静态图分别列计算导入与资源限制，不能凭 unreachable 认定无用。

交接仅新增/改动/删除的增量、必要before、hash清单、报告与脱敏证据；不附node_modules、模型、运行SQLite、保险库、个人profile、原始Git索引、全部历史ZIP或安装包。不声称增量包能单独替代已存在WIP源码。Remote需先核对baseline/before再逐块合并。
