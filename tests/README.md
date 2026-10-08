# 测试入口与触发范围

先选本次改动涉及的模块，再选实际受影响的用例。`npm test` / `npm run test:list` **只列清单，不执行、不表示通过**。`npm run test:check` 检查清单有没有遗漏、重复和丢失文件，不构建世界。

唯一活动目录是 [suites.json](suites.json)：535 个入口逐一归类（534 个 tests 根目录脚本和 worker），每个脚本只列一次。按用途分块，不移动脚本，避免破坏相对 import、fixture 和源码提取。`tests/fixtures/` 是被测试引用的支持文件，不是独立入口。嵌套 `door-geometry/` 保留自己的 manifest 和下面的定向入口。

## 常用命令

```sh
npm run test:characters                    # 只执行角色模块的核心项
npm run test:food-lodging:list              # 列出此模块所有活动项，含定向集成
node tests/run.cjs --module food-lodging --tier integration --match guest
node tests/run.cjs --only china-tavern-property-locks,china-tavern-property-ui
node tests/run.cjs --module navigation --tier integration --match yunlai --list
node tests/run.cjs --module ui --all        # 明确执行完整 UI 模块，可能较慢
```

- `required`：该模块共享实现改动时的最小核心组，每组3项；**不是每次小修必跑，也不是模块已全覆盖**。局部改动可直接 `--only`。
- `integration`：按对象/岗位/国家选择的组件、几何或真实 main 接线检查，不能由核心项代替。不是每个文件都慢；涉及 `-main`、实场景、寻路或 skinned mesh 的项通常较重。
- `release/required`：缓存构建、Worker 接口，只有构建/资源/缓存或 Worker 改动时才选择。`npm run test:release` 明确运行两项；保留 `test:cache` / `test:worker` 单独入口。缓存测试读取当前 `dist/client`，先按发布流程完成 `npm run build`（保留既有完整缓存图，不删除它来绕过缺失资源检查）。正常发布只做版本/公开访问/关键入口检查，不由此启动整个游戏回归。
- `diagnostics/targeted`：CPU profile、性能诊断、runner 自检，只有相关问题才手动选；不作所有发布门槛。
- `diagnostics/archive`：旧源码锁定的一次性调查，默认和 `--all` 都排除，runner 禁止执行。保留文件作为参考，不宣称还能对当前版本运行。

`--list` 不运行；`--only` 接受逗号分隔完整文件名或省略扩展名，支持跨模块；`--match` 是文件名的区分大小写子串。先 list 确认范围。`--tier integration` 必须加 `--match` / `--only` 或明确 `--all`，避免误起长测。`--all` 不带模块会显式运行所有活动项，通常不需要，绝非默认门槛。`TEST_ONLY` 兼容保留；旧 `TEST_FROM` 会报错，避免一次补跑整个旧数组尾部。

串行运行，首个失败停止，SIGINT/SIGTERM 转发给当前子进程。结果和实时 stderr 保留在忽略的 `qa/release-progress.json`、`qa/release-<文件名>-*` 与 `qa/gates/`；未到达的项不算通过。模拟 DOM/renderer、CPU 输出均不代替浏览器或手机体验。

## 改动 → 需要查找的模块

| 模块 / npm 命令 | 触发源与检查目的 | 必要时联查 |
| --- | --- | --- |
| `test:characters` | `characters`、`complete-adult`、appearance、衣发/骨架/姿态；身份、几何和恢复 | 走坐卧接触查 navigation；手部新测试放本组，按具体动作选，不自动跑全部角色 |
| `test:navigation` | navigation、routing、doors、collider、floor、camera、房屋家具布局；净空、到位、出入恢复 | 涉及实际业务锚点时选 food-lodging / economy 对应 main |
| `test:ui` | object/contextual menu、HUD、safe-area、岗位/餐饮面板；按钮派发、取消、陈旧回调 | 数据提交联查对应业务；纯颜色/装饰正常视角审图即可 |
| `test:food-lodging` | 实餐、厨房、付费餐款、住宿/床位/租约、酒楼产权；唯一扣款、原单、恢复 | 共享款源查 economy；改实际位置查 navigation |
| `test:economy-careers` | currency、账款、工资、职业槽、就业/零工；幂等、失败保存、身份/任次 | 收入后需求查 world-life，支付用餐查 food-lodging |
| `test:world-life` | simulation-clock、日需/健康、社交/交谈、宫廷事务、世界连续性；时间和个人生活状态 | 人物实际外出查 navigation 和对应国家 main |
| `test:release` | scripts/build、资源引用、缓存、worker；仅相应构建发布变动 | 不因提交号变化补跑产品测试 |
| diagnostics | 实际性能异常、runner 修改；只选相关 profile 或 runner-observability | CPU profile 不证明设备 FPS |

清单中的每个文件继承所在模块的上述触发条件，再按文件名收窄：`china/japan/egypt/france` 为实际国家，后续名为具体系统/岗位/物件；`-main` 是生产控制器接线，`-ui` 为面板，`-restore/-reload/-storage/-locks` 为恢复或持久化边界。多个国家的共享实现变化按实际接点差异补选，不能把单国样本称作四国完成。跨模块用 `--only` 明确列出实际依赖项，不按文件名自动启动所有关联测试。

### 保留的门几何专用入口

```sh
npm run test:door-geometry -- --list --region france
npm run test:door-geometry -- --check
npm run test:door-geometry -- --tiny
```

实际门/国家定向运行见 [door-geometry/README.md](door-geometry/README.md)。其 adapter、kernel、fixture 与来源 hash 成套保留，不能当重复脚本逐个删除。`door-geometry/france-inset-world-six.cjs` 与下述旧 France 调查同属源锁定历史；不加入当前发布门槛。

## 清理边界（2026-10-07）

- 删除 `france-inset-subset-ready.json` 和 `france-inset-subset-results.json`：R16.1 候选的旧执行结果/环境记录，不是输入 fixture，仓库无其他文件引用。完整历史可从本改动父提交 `17363a7e628d09b678d4a11842f83c7dae61c9c3` 恢复；未删除唯一历史证据。
- 旧 France source guard 仍被 `france-inset-routes-seven`、`render-france-inset-five`、嵌套 world-six 使用，成套原位归档；renderer 还依赖外部绝对安装路径，不能当便携回归。`runtime-stutter-profile` 对比硬编码旧提交，同样只作历史调查。
- 保留 `r11/r12/r14/hotfix` 名称的断言：名称旧不代表覆盖重复，没有充分依据不批量删。此批不声称所有 535 项已验证或无重叠。
- 清理两处已确认过时的测试假设：外观评分从固定“恰好3个调用”改为检查所有实际调用都显式选择相同版本；菜单 Escape 的生产键盘 handler 提取跟随现有 paused guard，并保留两次 Escape 行为断言。产品代码未改。
- 缓存旧入口检查同步为 HTML → hashed entry → main；分别遍历游戏动态/live/preview 与两个 QA 页的实际引用闭包，逐 URL 比对所有 JS，并补全临时构建输入 package/baseline。定向缓存检查通过322资产、315模块、CSS单独更新和旧资源缺失拒绝，未放宽成数量相同即通过。
- `development/` 是实验/预览工具，`scripts/build.mjs`、`serve.mjs`、`guard-process-tree.py` 是构建、服务和资源管理，不纳入日常自动回归。

新增有实际回归价值的脚本，只在 manifest 对应模块登记。手部共享测试归 characters；若仅某一职业手持物交接，则加入该职业定向接线测试并用 `--only`，不因此扩大全量门槛。`npm run test:check` 会指出未登记的新根目录脚本。

### 官品俸例定向集成

`china-official-grade-main.cjs` 默认仅跑轻量 `prepare`：真实main启动拒绝薪政写入，再由实际普通save保留启用意图。冷重载/中国原场景单独执行 `OFFICIAL_GRADE_PHASE=restore node --experimental-vm-modules tests/china-official-grade-main.cjs`，读取前一步生成的忽略目录 checkpoint；两步均用共享锁和既有进程树guard串行运行。restore输入明确预设较晚模拟日，验证存档兼容，不代表自然离线/多日游玩；不重跑朝会或用餐长链。`china-official-grade-life.mjs` 用真实六人原控制器逐一归档8秒验证新旧合同结薪，路径为轻量替身，不能当世界路线证据。

`china-court-report-main.cjs` 只冷启一次中国生产main，原核验结果及6/4秒完成凭据为明确staged输入；验证真实全档保存链拒绝/成功时top和continuity一致、31身份与资金不变。它不代替 `china-court-report-receipt.mjs` 的真实相位计时、中断及恢复验证，也不重新走朝会/检查路线。

### 云来经营定向main续点

`china-tavern-management-main.cjs` 默认只从唯一已付合成checkpoint冷载核验，保原人物/工序/钱货来源；DOM/renderer模拟。开发证据的01–09分段见PROJECT_CHECKLIST和相应Git提交，不因发布重走招聘。需要针对真实改动续段时用`TAVERN_MAIN_FROM`指定同号中断存档、`TAVERN_MAIN_STOP_AFTER`限制阶段；只有明确从已聘用档测试工时/结薪时才分别使用`TAVERN_MAIN_STAGE_WORK=1`和`TAVERN_MAIN_STAGE_CLOSE=1`预置日期，不代表自然跨日。`TAVERN_MAIN_REJECT_HANDOFF=1` / `TAVERN_MAIN_REJECT_WAGE=1`只拒对应同笔保存。所有main段仍须共享锁及既有资源守卫，`TAVERN_MAIN_FRESH=1`不作为常规回归入口。

### TR03旅行定向入口

`travel-journey-main.cjs`只构造原世界球，测试实际main按钮/hash、原护照、登机/飞行/入境及拒写；输出`qa/travel-main/departure-checkpoint.json`。`travel-arrival-main.cjs`默认从唯一已验fixture冷恢复；`TRAVEL_MAIN_FROM`可选同号续点，`TRAVEL_MAIN_TARGETS`只用于明确要核的国家接点，分别覆盖按钮/hash，不默认重跑四国。`TRAVEL_MAIN_REFUSE_ARRIVAL=1`只用于已入境待抵达档的最后保存拒写；`TRAVEL_MAIN_CANCEL_AT_END=1`核原当前国出境前取消拒写/成功。该脚本逐个成功地区保存`arrival-checkpoint.json`，与departure输出独立；最终唯一fixture保4已抵达+1已取消及7章，普通日期/钱包不改变。所有场景仍按共享串行锁、180秒/1152MiB/Node768守卫；模拟DOM/renderer不是browser/iOS画面接受。

### CR04同案筹谋定向入口

`palace-usurpation-ledger.mjs`检查独立政治回应、三种可组合准备、原帝任次/实际凭据、拒写冷恢复、失败冷却与唯一授位；`palace-usurpation-ui.mjs`为模拟DOM，核定性显示、旧按钮与取消保案；`china-usurpation-context.mjs`只核真实支持/成年身份/已完工序来源及不抢房的住所投影。这些测试不能替代生产main的实际多人到场、御膳消费、登位后帝务或浏览器视觉。当前新链尚未启用，统一使用现有串行共享锁与资源守卫。
