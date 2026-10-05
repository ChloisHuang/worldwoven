# 受册玩家御膳接入

基线 R16.112；已由册封链合版接入主场景，真实原膳单、落座食用与完成回执已定向验证。没有新增三维场景、人物、餐位、货币或补库。

## 构造与资格

- `createDailyNeeds({..., getRoyalMealEligibility:()=>consortLedger.royalMealEligibility()})`。新请求和未完餐须通过实时 resolver；真实已消费且写入原库存/订单图的历史餐，由同号源图证明补投一次，不因后来辞名位丢失实际食用。原四位皇家 NPC 回执兼容。
- `createChinaRoyalKitchenService({..., getPlayerMealEligibility:()=>consortLedger.royalMealEligibility(), getPlayerSeat:()=>seated})`。保留原 `getMounted` 的工作忙碌判断。厨房会自行核当前 `player.ageYears >= 18`、册封凭记、当前厨役班次，以及原订单和餐席。
- 可选 `getSeatOccupant:(seatId)=>actorId|null`；厨房总会同时检查原 `getMountedActor(npc)`，默认不需额外占用账。不能以岗位任期/申请/接受册封代替 ledger 的终态 resolver。
- `createChinaRoyalPlayerMeal({kitchen:chinaRoyalKitchen, furniture, getPlayer:()=>player, getMounted:()=>seated, onMountSeat:startFurniture, canChooseSeat:item=>furniture.canSit(navOptions,furnitureSafetyBoxes(),item), canSee:nearbyInteractionClear, notify:toast})`。

## 意图、菜单与共享移动

- provider 为 `china-royal-player-meal`，`intent(kind,seatId)`、`resolveIntent(selected)`、`executeIntent(selected)`。
- `request` 以原餐席的 authored `position` 为 approach，抵达后调用既有 `startFurniture`，确认真实 `seated.id` 与 `anchor` 后才提交订单。共享 `requestStationIntent` 持有路线和取消，不增加扫描、路线或坐标设置。
- 未坐时 `executionRadius=.016` 与现 `startFurniture` 第一守卫一致；主循环有 pending 时 `arrivalTolerance=.008`。`.14/.16` 是普通游走/NPC容差，不用于这条 pending 玩家路线。已坐时为 `.35` 并 `keepSeat:true`。
- 主入口 resolver 和 continuity intent resolver 都须识别该 provider；恢复参数为 `provider.intent(ref.kind,ref.seatId)`。`continuityIntent` 须保留 `seatId`。
- `menuDefinition()` 是紧凑 B+A 菜单的数据：`title/subtitle/status/detail/note/items/primary/secondary/progress`。初始 `items` 是两原餐席，每项有 `name/disabled/intent`；选择项走共享 `requestStationIntent`。送达时 `primary` 是享用意图，`secondary` 是取消意图；等餐/食用中只保一项当前动作。没有新常驻 badge 或浮层。
- `availability(seatId?)` 返回 `{ok,code,reason}`；拒绝包括年龄、未受册、未交班、有限储备不足、原席忙碌/通路阻挡、原席缺失。UI展示短 reason，不能以按钮禁用代替交易时复验。

## 更新、吃饭姿态与起身

- 原 `chinaRoyalKitchen.update(dt,t,state)` 之后执行 `chinaRoyalPlayerMeal.update()`。厨房真实累积 `eating` 时长；12秒时玩家控制器请求唯一 consumed 回执。交谈时暂停实吃计时。
- 在 `characterPoseContext` 的 player service pose 优先链中加入 `chinaRoyalPlayerMeal.playerPose()`，返回 `{seatedMeal:true,heldProp:null}`，配现 `chair-sit` 使用。不要改成站姿 `eat`。
- 原 `chinaRoyalKitchen.syncPlayer()` 继续同步那一份餐盘。厨房配送只使用原 Jia，玩家厨役仍负责原皇家 NPC 的原订单；玩家不能同时自点自制。
- `statusLabel(seated.id)` 接现 player-state。`view()`/`state()` 供菜单与调试读取。
- 在 `standFromSeat` 真正改变位置前检查 `chinaRoyalPlayerMeal.leaveSeat(seated.id)===false` 则中止离席。未备料取消释放订单，不扣份；已备料取消只将原份记耗损，无饱腹/返还虚构食物。

## 持久化与原订单回执

- `continuityControllers` 加入 `chinaRoyalPlayerMeal`；其 snapshot 只有 `{version:1,orderId}`，不复制餐单或营养。所有订单、库存、餐盘ID、已食凭记和部分食用时间仍由原厨房快照持久化。
- 玩家位置/真实 mounted 已按现流程恢复后再 restore controller。`restore(snapshot)` 核对原订单ID与当前资格；不凭 elapsed 快照直接赠饱。
- 场景 suspend 用 `dispose({suspend:true})`，保原厨房 continuity 的同份餐与进度，离线不推进。若离区规则要求取消，先 `cancel(reason)` 且失败时不能继续承诺取消成功；不要另创删除订单/返库存路径。
- 非 suspend `dispose()` 尝试注销未完成餐，失败返回 false。真实离席、失去餐席或资格时厨房 update 同样重试取消；保存失败期间不能继续制作或食用。
- `kitchen.mealReceipts()` 暴露原 source=`china-royal-kitchen` 的真实已食回执；玩家额外含同份 `eligibility`（appointmentId及不透明appointmentReceiptId，须与当前终态资格相等）与 `eatingSeconds>=12`。`mealReceipts()` 保留历史，辞名位不删除已发生食用；厨房只将当前仍允许重放的回执自动提交给同一个 daily-needs，needs 保存失败可用同回执修复一次，不要另调用营养补偿或造另一个收据。

## 定向验证

`node --test tests/china-royal-player-meal.mjs tests/china-royal-kitchen.mjs` 13项通过，含拒绝、真实单份、半餐重载、重复点击/已食回放、失败保存、占席/离席/未成年人、厨役不能自点自制及耗尽存档。

`node --experimental-vm-modules --test tests/china-royal-meal-needs.mjs tests/daily-needs.mjs tests/daily-needs-meals.mjs` 通过。构建227资源通过。另行抽查的旧 `daily-needs-world-food` 两个日本付费案例在 adf58ab 原日需模块同样失败，旧fixture仅有铜文，新餐需要日本券；不算本批回归也未宣称通过。

还未运行主场景或浏览器/iOS。统一整合验真实徒步到原席、册封到用餐、同一餐盘与坐姿即可，不重复建立重型3D矩阵。
