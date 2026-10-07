# 测试入口与触发范围

先选本次改动涉及的模块，再选实际受影响的用例。`npm test` / `npm run test:list` **只列清单，不执行、不表示通过**。`npm run test:check` 检查清单有没有遗漏、重复和丢失文件，不构建世界。

唯一活动目录是 [suites.json](suites.json)：532 个入口逐一归类（531 个 tests 根目录脚本和 worker），每个脚本只列一次。按用途分块，不移动脚本，避免破坏相对 import、fixture 和源码提取。`tests/fixtures/` 是被测试引用的支持文件，不是独立入口。嵌套 `door-geometry/` 保留自己的 manifest 和下面的定向入口。

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
- `release/required`：缓存构建、Worker 接口，只有构建/资源/缓存或 Worker 改动时才选择。`npm run test:release` 明确运行两项；保留 `test:cache` / `test:worker` 单独入口。正常发布只做版本/公开访问/关键入口检查，不由此启动整个游戏回归。
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
- 保留 `r11/r12/r14/hotfix` 名称的断言：名称旧不代表覆盖重复，没有充分依据不批量删。此批不声称所有 532 项已验证或无重叠。
- 清理两处已确认过时的测试假设：外观评分从固定“恰好3个调用”改为检查所有实际调用都显式选择相同版本；菜单 Escape 的生产键盘 handler 提取跟随现有 paused guard，并保留两次 Escape 行为断言。产品代码未改。
- `development/` 是实验/预览工具，`scripts/build.mjs`、`serve.mjs`、`guard-process-tree.py` 是构建、服务和资源管理，不纳入日常自动回归。

新增有实际回归价值的脚本，只在 manifest 对应模块登记。手部共享测试归 characters；若仅某一职业手持物交接，则加入该职业定向接线测试并用 `--only`，不因此扩大全量门槛。`npm run test:check` 会指出未登记的新根目录脚本。
