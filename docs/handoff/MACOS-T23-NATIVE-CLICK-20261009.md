# Mac实体浮窗点击／图片拖出修复（2026-10-09）

更新：用户回执公开 coffee 可实际拖入，其他成员未准备；物理点击未单独回答。8ff 已从正式入口正常退出、普通重开、开库、恢复三参考及备注，所选资料/向量/原件签名相同。后续授权全面 REA 分析 Dropover 并整合进 DAM，见 [新任务与重开证据](DROPOVER-INTEGRATION-20261009.md)。下文“待回执/待重开”保留原时点，不代表这些补验仍未执行；全部父级仍未关闭。

用户明确报告真实桌面T23窗口点击图片切到Codex、无法拖入Photoshop。此前只证明AX点击本窗专注预览，不能覆盖实际鼠标失败。本轮继续该失败，不扩大离线／Windows／Eagle／签名发行，多屏仍无设备。

当前代码2a45c3f／codex/macos-migration；普通构建 **dam-8ff82743005c5fbd**／784输入，SHA 8ff82743005c5fbd65ee0a78974213e6aed4eae1ad88ef4d16e7072931d92d00，UTC13:30:11.614。未推送。入口仍npm run start:desktop -- --profile=/Users/meigong/Documents/DAM-public-macos-profile；目标库DAM-T23-macos-library。

## 证据、修复与限度

- 旧普通Host81359责任PID45326，为ChatGPT／Codex父程序，而非自身。仅读该已知自有Host的数字责任归属与对应可执行文件名，没有环境、请求、内存内容或账号读取。诊断SPI只在本次工程取证使用，不加入产品。
- 普通Mac启动改系统LaunchServices，确切Electron.app路径、绝对源码入口、原profile／browser参数、new及wait；唯一Host仍由原单实例锁决定，不复制资料／凭据。Windows及隔离fixtures保持原直接启动／环境生命周期。启动脚本与描述器加入构建身份，原first-party源码计数口径不变。
- Mac浮窗显式show先激活自己的应用再聚焦该窗，acceptFirstMouse接受首击；角色、隔离session、sandbox、导航阻断和原件保护保持。官方Electron30.5.1 API依据见 [app](https://github.com/electron/electron/blob/v30.5.1/docs/api/app.md)、[BrowserWindow](https://github.com/electron/electron/blob/v30.5.1/docs/api/browser-window.md)。这是对启动／激活链的必要修复，最终物理点击仍须复测，不把责任归属关联当唯一已证因果。
- 旧native图片未提供onDragStart，只有交付按钮支持原生文件拖出，内层img可产生默认预览URL拖动。现由已准备、同窗口的交付receipt接到图片拖动；未准备时仅显示准备入口，不自动复制／导出；选项变更清除旧receipt。禁默认img URL拖动，拖动结束不误开专注预览。图片单击仍为本窗预览，不调用Codex。
- 普通LaunchServices初次启动出现初始化等待，早先读取旧host-startup被识别为旧已退出PID，未当新资格。新c5b临时候选PID89436已实际归属自身；最终8ff普通Host91848亦责任归属91848。已正规开库、三参考／备注找回、咖啡图交付新副本成功，真实窗口处于准备好的咖啡图可见位置。单独责任归属验证不是鼠标点击／OS接收PASS。

真实／受控检查：启动描述器、实际native adapter首击／show顺序、实际WorkSetWindow React图片点击／拖动／准备绑定／选项失效、共享视图14、Main启动13、生产图片Copy／原生交付角色与图标、typecheck／build通过。图片回归先发现确认单提示locator过于严格，随后捕获receipt未传入的真实接线问题并修复；保留旧失败日志，未删／skip／降低判准。测试用受控bridge／OS端口不能当物理接收完成。

## 当前状态与接续

最新8ff普通实例、独立App责任归属、准备副本都已成立。用户的实际鼠标点击／拖入结果待回执：已请求在当前实体窗口点击coffee，再将准备后的图片拖到Photoshop公开咖啡图文档，其他私人文档不操作。若仍失败，继续按其反馈定位；不重复要求在失败旧候选照原样操作。

185素材、53尝试／51证据、21OCR、185向量／1任务、63后台成功／64历史保持；所选主库e3dc6c7a…、向量2fa5f129…、原件f633315b…一致。没有新分析／未知重发。8ff最终保存重开需在鼠标／接收核对后继续，不能用此前58700重开覆盖。

历史4B／Pi唯一原因仍按[取证边界](MACOS-T23-NATIVE-FORENSICS-20261009.md)保留；新发生的实体点击失败与旧历史根因是不同事件。T23／父#24及其他父级不自动关闭。证据见[检查点](../checkpoints/macos-t23-native-click-20261009/README.md)。其他AGENTS／验收流程WIP保持。
