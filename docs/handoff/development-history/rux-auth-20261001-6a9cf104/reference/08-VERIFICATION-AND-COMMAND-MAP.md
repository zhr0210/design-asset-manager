# 验证入口、故障注入与变更后重跑规则

本章给编码AI具体选择方法，不是要求每次改一个按钮都运行全仓库。所列命令来自本项目既有调用约定/已阅源码或历史入口，实施时必须先确认文件仍存在、内容仍适用、测试使用隔离数据；路径失效不是产品失败，不能伪造同名PASS。不得为运行这些测试重新编译生产better-sqlite3。

## 1. 现有检查候选

| 改动 | 优先入口 | 必须额外证明 |
|---|---|---|
| 导航/首页/库失败与App范围 | `scripts/library-startup-navigation.e2e.test.mjs`；`scripts/app-navigation-workflow.test.ts` | 按内容分离直接IPC和按钮测试，最终再做CU；旧测试不作为CU |
| Provider准入 | `node scripts/run-ts-test.mjs scripts/pi-provider-admission.test.ts` | Main/Worker政策一致，普通设置不能提升资格 |
| 认证交互与身份 | `node scripts/run-ts-test.mjs scripts/pi-auth-prompts.test.ts` | 现有prompt测试不能替代新增stage、页面离开和拒绝回调案例 |
| 凭据存储/失败补偿 | `node scripts/run-ts-test.mjs scripts/pi-credentials.test.ts` | 旧账号、revision、刷新和真实保险库分别测试 |
| Worker/取消/UNKNOWN | `node scripts/run-ts-test.mjs scripts/pi-oauth.test.ts` | close前不释放；先前promise失败不能解除持有资源 |
| 实际固定原生SDK | `pi-runtime/runtime/darwin-arm64/node scripts/pi-native-sdk.test.mjs` | 使用实际SDK而非只mock Provider；原生路径与兼容路径分别计数 |
| 视觉/标签保存 | `node scripts/run-electron-node-test.mjs scripts/pi-visual.integration.test.ts` | 用户caption/OCR修订/标签保护、回执重复零再推理 |
| 原标签行为 | `node scripts/run-electron-node-test.mjs scripts/tag-execution.integration.test.ts`；batch/recovery同类入口 | 只有受影响才扩展batch/recovery，不重复累计CASE |
| 后台OCR/库权限 | `node scripts/run-electron-node-test.mjs scripts/background-ocr.integration.test.ts` | 账号与库范围拆分不能复活旧grant或改变qualification |
| OCR进程与维护 | `scripts/ocr-process-lifecycle.test.ts`；`scripts/ocr-controller-lifecycle.test.ts` | 用仓库对应runner，证明owned process退出与资源保持 |
| 类型/构建 | `npm run typecheck`；`npm run build` | 构建成功只属构建关；新构建与CU截图buildId一致 |
| Context索引 | `npm run context:check` | 仅当索引/路由治理变化时执行；未触及则不机械跑 |

上述不是授权启动真实模型/API；不运行带真实数据授权含义的脚本，不运行`npm run dev`当隔离测试，不运行会重编ABI的全局CI准备脚本。

## 2. 本批必须新增或补充的行为（名称由仓库风格决定）

| ID | 行为 | 最小环境 | 断言 |
|---|---|---|---|
| C01 | canonical导航与别名 | 路由纯契约 | AI/设置/卡片都解析同一目的地，无循环 |
| C02 | scope与返回上下文 | 临时Host＋状态测试 | 旧scope/删除素材不能复活；草稿和筛选保留 |
| C03 | 拒绝回调 | 实际自有listener＋假认证网络 | 正确state拒绝结束，token/JWKS为0；wrong state不终止合法attempt |
| C04 | callback和cancel竞态 | actual listener/操作状态机 | 一个最终结案；没有重复token交换/凭据写入 |
| C05 | code/keys/identity/Vault失败 | 每阶段注入 | 失败stage准确、无原文秘密、旧账号保持 |
| C06 | 页面卸载/再挂载 | 实际React＋Main操作 | 只解绑订阅；同一active operation可恢复，显式取消仍有效 |
| C07 | 账号状态重启恢复 | 临时Vault/设置 | identity-only、plan-allowed、expired区分，token不返回UI |
| C08 | secret输出审计 | 唯一合成secret标记 | stdout/stderr/IPC安全投影/诊断包不含标记；不读取真实秘密 |
| C09 | 服务更新事件 | 两个旧入口/一个新editor | 没有第二数据源；更新不会被旧订阅覆盖 |
| C10 | 删除后的引用闭包 | AST+脚本/包声明+构建 | 无dangling import，保留必要resources/goldens/tombstones |
| C11 | 旧控制台副作用 | 监视生产适配器调用的集成测试 | 正常AI页不会轮询disabled通道；卸载清理timer/listener |
| C12 | 锚点/构建STALE | 临时目录 | 源变更后读时标stale，原历史记录不被改写 |

预期失败与成功都要验证：例如“拒绝某种不支持OAuth”通过，只证明拒绝有效，不证明OAuth可用。

## 3. 重跑选择与证据失效

- 只改导航：路由契约、受影响组件、正常启动集成与对应CU；不自动重跑模型质量。
- 改Main账户状态/IPC：账号契约、credential/Worker、返回上下文和关闭回归；再跑对应CU。
- 改Worker/auth/认证网络：真实SDK假网络、listener/安全错误/Vault、重封印、Host保存及关闭；再跑CU认证和单独真实认证。
- 删除/移动源码：引用图、受影响测试、typecheck/build；涉及生产UI路径则CU重跑；无功能影响的reference归档只验证引用/golden可读取。
- 修改最终代码后，相关截图、测试和账号结果若不再匹配build/source，标STALE，不复用旧总PASS。

## 4. 不允许的“修测试”

不能跳过失败项、去掉失败断言、把缺功能改成optional pass、提高超时掩盖挂起、把API返回200当JSON有效、把假令牌写入当真账号、把无测试发现的exit0当测试通过。测试夹具本身错误可修正，但保留失败、变更理由和修复后的真实生产断言；评审不得只看汇总数。

## 5. 执行日志与CU隔离

代码测试日志记录命令、runner版本、启动/结束、退出码、case数量、timeout、source/build绑定。CU单独记录屏幕动作与工具；同一run的测试夹具可准备，但不能使用执行中写数据库/IPC/route跳转来构造CU成功。只有计数与方法相同的用例才能汇总，不将反复重跑相加。
