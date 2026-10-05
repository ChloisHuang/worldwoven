# 成年宫廷自荐核心接入契约

`source/game/consort-petition-ledger.js` 的 `createConsortPetitionLedger` 只保存第四妃嫔席的自荐、决定、明确答复及最终名位/房床归属。与 `formal-careers` v9 分账；不新增正式职位、日班、工资、缺勤或亲密资格。第一份可测源码为 `a90b951`。

主场景已按本接口接入现场自荐、原皇帝/沈序职责仲裁、同号册书拟写/用印/授读、真实第四寝房和玩家御膳。B+A 状态卡复用职业图标的名位上下文；未把名位当普通日薪职业。完整真实链使用生产 Three/Mesa 与模拟DOM验证，不等同浏览器/iOS验收。

## 依赖

- `saved`：专用名位存档（建议 world 根下 `consortPetitions`），首次缺省；不能用已有 `formalCareers` 数据冒充
- `worldSeed`：已有外貌/世界 seed；`actorId` 默认 `player`
- `saveState(next)`：同步保存一份完整 detached ledger；false/throw/Promise 都视失败，本模块内存不变。适配器必须把这份 ledger 与实体 controller checkpoint 写进同一份原子 world 存档，不可先异步写后返回 Promise
- `getClock()`：模拟 `{day,hour}`；读档不得倒退到最近持久事件之前
- `getPlayer()`：`{id:'player',ageYears,appearanceScore?,traits?}`。外貌分为现有 shapePreferenceScore 0–100，traits 仅现存值；不新增虚构属性
- `getEmperor()`：`{id:'cn-emperor',ageYears,traits?,relations?,opinions?,needs?}`。读原皇帝 brain 中现有数据；`relations.player` / `opinions.player` 缺失即中性，不创建好感
- `getCareers()`：只读 `formalCareers.state()`，核验原 `skills.ritual/art`、`tenure`、`lastDuty` 和 `loadError`
- `getCourt()`：`{emperorId:'cn-emperor',empressId:null,consorts:[{actorId,roomId,bedId}]}`。原三妃必须仍在原房床；不得复制、覆盖原 NPC 或把玩家列为另一名皇帝/皇后。册封后的玩家条目可以从同 ledger 投影，不能独立再存一份冲突归属
- `getVacancy()`：`{slotId:'cn-consort-4',roomId,bedId,roomExists,bedExists,accessible,roomOwnerId,bedOwnerId}`。三个事实标志只能来自已验证实体与通路；未分配时双 owner 为 null，最终册封后的投影可以为 `player`。原三妃房床和龙榻不合格。新寝房候选稳定 ID 为 `consort-reserve-1 / china-consort-bed-reserve-1`；本核心不证明几何或可达性
- `verifyReceipt(receipt,expected)`：同步只读查询真实 controller 已完成的同号事件，仅严格 true 通过；不能将传入的 `completed:true`、普通90秒聊天或菜单点击直接透传为 true

以上物理/名册读取器缺失时关闭相应资格；不会创建替代世界、纸张、食物、NPC、工资或传送玩家。已有历史保持，坏档只闭锁不覆盖。

## 现场阶段

1. `availability()` 只读返回当天 `applicationId` 和可用房床；打开菜单不占位、不耗次数。到沈序实际自荐接点完成现场提交后 `submit(submissionReceipt)`，保存该日唯一申请和固定抽签值。同模拟日再申被拒；撤回仍计当天一次
2. 皇帝原控制器实际召见完成后 `reviewAudience(applicationId,audienceReceipt)`。保11:30朝仪/原诏令优先；推荐完成二者后再有界召见。回执不能用普通聊天预约替代。单次持久审核综合实际礼仪/艺术、有限外貌权重、已有性格/关系和皇帝当时疲惫/饥饿；有概率拒绝和可回看原因。已存决定重复回执不重算
3. 获准仍无名位、房床权或御膳权。玩家独立 `respond(id,'accept'|'decline')`。接受前必须自行完成原职位班次、结清待薪并离任，core 仅返回 `finish-current-duty / settle-current-wages / leave-formal-career`，不调用 resign，也不改变旧申请/工资/历史。拒绝/撤回不授名位
4. 仅接受后 `charterRequest()` 返回需由原场景制作和传递的 `{applicationId,documentId,playerId,emperorId,residence}`；它不产生实体册书。原沈序确实交出同一实体后 `receiveCharter(id,handoffReceipt)`，存为 `charter-held`
5. 同一实体册书在皇帝/沈序真实见证下完整宣读后 `completeInvestiture(id,readingReceipt)`。同次存档写入 `appointment` 内的有限第四席、actor、roomId、bedId 与实体回执，完成前仍没有名位。失败保存可同号重试；重复成功回执不再授予

所有提交/审核/接受/授册/宣读及恢复后的可用资格均重核双方18+。更改房床占用、原工作未结算、皇帝/名册冲突都会阻塞；未成年人不会通过缓存结果得到权利。`withdraw(id)` 允许退出尚未完成的申请；已生效名位只能经下述自愿辞位出口结束。没有皇后申请、皇帝继位或亲密按钮；册封绝不表达亲密同意。

## 四种真实回执

每个回执有稳定、全局唯一 `id`，以及 `kind, applicationId, playerId, emperorId, heraldId:'cn-palace-herald', targetId, completed:true, participants:[...], at:{day,hour}`。`at` 为真实完成时刻，不得晚于当前模拟时间或早于上一阶段；提交仍须在该模拟日完成。保存失败后允许时钟继续走，以原稳定回执重试，同号已成功重放无需再次存档。取消、离场、尚在路上或只开始计时不得出完成回执。

- `kind:'submission'`：玩家及沈序真实在场；participants 至少二者
- `kind:'audience'`：玩家、`cn-emperor`、沈序同场并完成召见；participants 至少三者
- `kind:'charter-handoff'`：玩家与沈序实际交同一册书；新增 `documentId:'consort-charter:'+applicationId`
- `kind:'charter-reading'`：同实体完整授读完成，玩家/皇帝/沈序参与，documentId 必须与 handoff 相同

`targetId` 由实际 controller 核验，不在纯账本硬编码位置。原皇帝公共听候点为 `[-15.1,.215,-13.35]`，沈序需从原诏令控制器安全借用，不能另建演员。

## 身份、住所和待遇投影

- `state()` / `petition()` / `history()` 为 detached 副本；原阶段和拒绝结果可回看
- `residenceFor()` 只在有效成年名位及实际房床/名册资格仍通过时返回 `{slotId,roomId,bedId}`。适配器据此设置新寝房家具 `privateOwnerId:'player'`；所有空房家具仍遵守 assignmentRequired，pending 无使用权
- `royalMealEligibility()` 仅返回有效名位资格及 appointmentId、appointmentReceiptId；后者是原实体宣读事件的不透明ID，不能用格式推断替代真实匹配。不能据此直接减饥饿或发食物。后续必须由原120份库存、Jia、真实餐单、落座与完整食用回执接入。普通御膳厨役没有食权
- 银钱供俸未接：六官4320文公库和普通 `creditWage` 均未改，不承诺现金或银行奖励
- `acceptanceAvailability()` 返回接受/授册当前真实阻塞；状态卡在获准后直接显示未结班、待薪或未离任原因，拒绝仍可独立选择
- `statusCard()` 提供名位、实际住所、阶段、唯一当前主操作及可回看结果，供原 B+A 卡消费；不包含远程任命、换衣、开工、亲密或妊娠动作

## 已验证范围

`node --test tests/consort-petition-ledger.mjs tests/consort-runtime-bridge.mjs` 共21项（15核心＋6桥接）纯逻辑通过：成年逐阶段/恢复、有限原房床保护、真实回执闭锁、固定审核与每日限制、玩家拒绝、旧职阻塞、每次存档失败回滚、同号重放、时钟前进后的原事件重试和坏档闭锁。该测试用可信事件夹具验证账本契约，不是实际现场/浏览器/iOS/住房/御膳验收。初次跨日申请测试失败为夹具误用旧 applicationId，改用当天 availability ID 后通过；未改产品放宽条件。

## Runtime bridge（`eaaf186`，仍由主集成接 main）

`createConsortRuntimeBridge` 在 `source/game/consort-runtime-bridge.js`。参数为 `saved` 根对象、`quarters: RESERVED_CONSORT_QUARTERS`、`getScene:()=>({country,lot,furniture,npcs,palace})`、`getPlayerProfile`、`getAppearanceScore`、可选现有 `getPlayerTraits`、`getCareers`、`getClock`、`getService`、`captureWorld`、`writeWorld`、`canReleaseTitle` 和 `worldSeed`。读取器回调在constructor期间可以尚无scene/service；先实例化bridge，再构造实体service，传 `getLedger:()=>bridge.ledger`、`saveState:next=>bridge.commitService(next)`。

- 名位根键 `consortPetitions`；实体service根键与中国continuity controller键均为 `chinaConsortCourt`
- `commitLedger(next)` 供核心saveState使用；`commitService(next)` 接完整可恢复service checkpoint。两者先capture真实世界，再覆盖最新service snapshot，并把名位＋service＋continuity写入同一world JSON。若旧无参 `worldSnapshotWriter` 临时替换root的dailyNeeds/worldContinuity，写入前恢复原引用；失败不污染saved或房床。新的capture也可直接填入传入candidate根对象
- `writeWorld(next)` 必须同步原子写完整JSON；成功后才更新原saved根对象和房床投影。false/throw/Promise均失败。模拟时间保存为原 `{version:1,seconds}`，不会把state误存为snapshot
- `projectOwnership()` 在进入中国并造出真实room/bed/NPC后、`restoreWorldContinuity`尝试挂床前调用；实体初始空owner才可据有效名位投影玩家，不覆盖别人
- `titleStatus()` 返回 `{active,titleId,appointmentId,appointmentReceiptId,residence,reasons}`，跨国保留有效名位；只轻读成年人身份、小appointment和三原住民，不复制全脑/全历史。既有技能、外貌、皇帝完整脑数据只在首次真实审核读取
- `royalMealEligibility()` 与 `residenceFor()` 仍须中国实际实体资格。跨国不能提交新自荐或凭名位远程领膳；状态卡不会把离开中国表示成注销身份

### 自愿辞去与普通职业边界

已册封者再申请普通正式工作应由主集成读取 `bridge.titleStatus().active` 阻塞，不修改旧职业账。唯一退出方式是玩家明确确认 `bridge.resignTitle(appointmentId,{confirmed:true})`；不可调用纯账方法绕过bridge现场守门。`releaseTitleAvailability()` 先调用注入的 `canReleaseTitle({appointment,scene})`，只接受严格true或 `{ok:true}`；躺新床、占皇家餐席、有未完御膳单或册书仪式进行时返回 `{ok:false,reasons:[...]}`，必须先实际结束，不能清lease强退。缺少守门回调默认不允许辞位。

成功只将该份申请记为 `resigned` 并记录自愿辞位时刻、清玩家当前appointment和第四房床投影；原授读/申请历史、NPC、工资、财物均保留，辞位当模拟日不得重申。存档失败不撤名位或释放房床，重试幂等。此出口没有册废皇后、撤他人名位或亲密含义。UI使用明确二次确认且可取消。
