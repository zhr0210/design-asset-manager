# P02｜版本、结构与启用动作矩阵

依据当前源码，不是实际打开某个资料库的结果。表名来自声明与初始化调用链；精确列/约束/索引仍以源码和后续真实SQLite签名验证为准。

## 1. 版本增量

| 版本 | 本版新增表 | 新增显式索引/触发器 | 启用动作与事务边界 |
| --- | --- | --- | --- |
| v1 | library_control_identity、library_operation_journal；assets、tags、asset_tags、tag_aliases、tag_relations、tag_groups、tag_group_items、tag_suggestions；capture_requests、asset_candidates、promotion_links、asset_lifecycle、asset_trash_plans | 表内PK/UNIQUE/FK/CHECK；不能把旧全局CREATE_INDEXES列表自动算作本初始化已执行 | 用户确认新建库；控制与数据初始化设v1；无旧AI任务表 |
| v2 | visual_ai_evidence | visual_ai_evidence_asset | visual-ai.run确认后先启用schema，再做推理；模型后来失败不必回退v2 |
| v3 | managed_download_intents、managed_download_chunks | managed_download_intents_library；managed_download_intent_identity_immutable | 显式库内持久下载；DDL+第一条意图在同一事务 |
| v4 | image_variant_intents | image_variant_intent_immutable | 图片副本保存，先写并核验staging，再在事务登记意图/DDL；文件与DB不全局原子 |
| v5 | asset_notebooks | 表内PK/FK/CHECK | allowUpgrade确认后首次保存；DDL与笔记写入同事务 |
| v6 | library_organization_state、library_folders、library_folder_assets、library_palette_colors | library_folder_names（UNIQUE）、library_folder_asset_lookup | allowUpgrade确认后组织命令；初始化singleton revision=0，DDL与命令同事务 |
| v7 | work_sets、work_set_members、work_window_layouts | 表内PK/UNIQUE/FK/CHECK | allowUpgrade确认后工作集保存；被动窗口布局写不能独自启用schema |
| v8 | asset_ocr_evidence、asset_ocr_state | asset_ocr_evidence_asset | 已确认且有效OCR结果提交时升级；DDL/证据/当前状态同事务；失败/读取不升级 |

累积表数（不含SQLite系统表）：v1=15、v2=16、v3=18、v4=19、v5=20、v6=24、v7=27、v8=29。此计数是源码声明清点，不是本轮sqlite_schema运行结果。

v1在assets基础结构上还增加last_tag_updated_at、ai_caption、ai_caption_is_user_edited、ai_caption_updated_at列。只数表不够验证兼容。Managed控制DB使用application_id=0x44414d49、journal_mode=DELETE、synchronous=FULL；打开还要求foreign_keys和精确schema检查。

## 2. 能力与已知版本

“具备”只指精确已知schema包含该能力，不表示有授权、已配置Runtime、模型质量ready或所有业务路径已回归。

| 当前版本 | 基础 | 视觉证据 | 持久下载 | 副本意图 | 笔记 | 文件夹/色板 | 工作集 | 专用OCR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| v1 | 具备 | 需v2 | 需v3 | 需v4 | 需v5 | 需v6 | 需v7 | 需v8 |
| v2 | 具备 | 具备 | 需v3 | 需v4 | 需v5 | 需v6 | 需v7 | 需v8 |
| v3 | 具备 | 具备 | 具备 | 需v4 | 需v5 | 需v6 | 需v7 | 需v8 |
| v4 | 具备 | 具备 | 具备 | 具备 | 需v5 | 需v6 | 需v7 | 需v8 |
| v5 | 具备 | 具备 | 具备 | 具备 | 具备 | 需v6 | 需v7 | 需v8 |
| v6 | 具备 | 具备 | 具备 | 具备 | 具备 | 具备 | 需v7 | 需v8 |
| v7 | 具备 | 具备 | 具备 | 具备 | 具备 | 具备 | 具备 | 需v8 |
| v8 | 具备 | 具备 | 具备 | 具备* | 具备 | 具备 | 具备 | 具备 |

* F02：`readVariantIntent`白名单仍为[4,5,6,7]。v8表已具备，但读路径会提前返回；恢复列表却允许v8，所以不能把矩阵里的“具备”写成“所有v8恢复行为已通过”。

未知更高版本（夹具用99）、0/非法版本、已知版本但缺表/错列/错约束/错触发器：不通过当前精确打开/写入门槛，不执行补表/降级自修复。`version >= required`只能在“完整匹配受支持的已知profile”后作派生，不是单独的兼容判断。

## 3. 累积迁移链与较高版本保留

```text
新库确认创建 → v1
v1 → v2（视觉证据）
    → v3（持久下载）
    → v4（副本意图）
    → v5（笔记）
    → v6（普通组织/色板）
    → v7（工作集/布局）
    → v8（专用OCR）

例：v3请求笔记 → 仅补v4、v5，不补到v8
例：v8请求视觉证据 → 保持v8，无DDL、无新备份
例：v1请求OCR → 实际会包含v2–v8所有结构，但不启动其他能力
```

当前enable函数分别保留“自己的版本及更高的已知版本”，不把未知高版本静默当兼容。v3–v8启用函数嵌套调用前置函数；新协调器必须保留整个缺失链与首次领域写入的外层事务语义，不把每一级独立commit后再调用旧业务保存。

确切历史应用最低可读/可写版本号没有足够材料。登记只记录schema profile要求；minimumAppReaderVersion/minimumAppWriterVersion保留null，不能编造应用版本号。回退二进制必须在该二进制上验证目标profile。

## 4. 其他数据域不能共享这个版本号

| 数据域 | 现状 | P02规则 |
| --- | --- | --- |
| Managed Library | 明确v1–v8及精确结构 | 本登记的唯一迁移对象 |
| Eagle index | 独立schema version1，7张connected_library_*表 | 独立registry；原件仍属Eagle；不运行Managed步骤 |
| App state | download_tasks，Main增加app_device_identity，OCR增加local_ocr_runtime | 没有同一个Managed版本序列；不设为v8 |
| Legacy | 显式只读，当前opener限定darwin并拒绝sidecars | 永远不走迁移；不能改变journal_mode来“帮助打开” |
| Model Workspace/lock DB | 各自存储与格式 | 不纳入库业务schema编号，不借迁移读取模型缓存 |

## 5. 结构验收来源

`inspectLibraryControlStore`：read-only事务、query_only、application_id、版本、DELETE模式、quick_check、控制身份、精确已声明对象、settled journal。

`assertLibraryDataSchema`：创建内存expected数据库并按目标版本启用相同DDL，然后对比sqlite_schema、table_xinfo、index_list/index_info、foreign_key_list签名。本轮只读源码，没有执行这个函数。它对内存expected的建表不等于写目标用户库。

由于当前精确签名不允许任意额外表，P02不得在v8内直接加schema_migrations、Job或Outbox表。此类结构若未来确有需要，应另行批准schema演进；本次不预占新版本。
