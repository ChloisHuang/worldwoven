# 妃嫔自荐现场控制器

`createChinaConsortPetitionService` 在 `china-consort-petition-service.js`，依赖独立账本，保留原沈序（34岁）、原皇帝（36岁）、原传令案和原印块。已由 main 接入共同交互、原角色控制链及完整世界存档。

- 构造参数：`{npcs,lot,palace,audience,edict,doors,planPath,moveActor,poseContext,getPlayer,getClock,getLedger,getBusy,canSee,saved,saveState,notify}`。`getLedger` 为闭包；账本先构造，`verifyReceipt` 闭包指向本服务。`canSee(fromPosition,toPosition)` 是两点可见/隔墙检查，不能直接传不同签名的 intent 检查。
- `saveState(next)` 收到完整同步 checkpoint；统一持久键及 continuity key 为 `chinaConsortCourt`。`snapshot()` 和 `checkpoint()` 等价；恢复顺序为 palace → audience → edict → chinaConsortCourt，原诏令先清瞬时借用，再由本控制器重建唯一租约。`restore(checkpoint)` 绑定已恢复的原 NPC，不修改任何人的坐标。接入现有 world atomic bridge。
- `update(dt,t,{conversationActorId,performing})` 在原 `chinaEdict.update` 后、`chinaPalace.update` 前调用。`owns(n)` / `socialStatus(n)` 接统一 NPC 控制链；原宫廷 life 仍是皇帝唯一动画和移动控制器。`playerPose()` 接玩家 service pose。
- `interactionTarget()` 返回 `{id,name,position,roomId,radius}`。初始接待位置 `[-18.85,.215,-9.3]`，听候位置 `[-15.1,.145,-14.6]`。所有玩家到场必须沿现有交互导航，不改坐标。沈序在接待处附近玩家出现后于安全时段走来；也可调用 `reception()` 请求其走来，`ready` 只表示真实已到。
- `submit()` 须玩家和原沈序均在原后宫会客处；`requestAudience()` 须玩家在公共听候处；`respond('accept'|'decline')` 只记录明确选择，可由状态面板调用；`requestInvestiture()` 须玩家返回公共听候处。返回 `{ok,code,message?}`；失败不产生成功回执。`cancel()` 释放人但保留申请和同号文书。
- `statusCard()` 返回账本原 card 加 `physical:{phase,waitingReason,waitingText,heraldPresent,atTarget,label,target,documentId}`。将真实不能借人、原诏令未完、朝会尚未结束、离场、超时等显示给玩家。
- `verifyReceipt(receipt,{kind,applicationId,documentId})` 只认服务内部实际已完成事件注册表。提交、会面、实体递交、宣读分别生成稳定回执；纸面身份恒为 `consort-charter:${applicationId}`。完成动作先入 checkpoint，再由账本同次原子保存；失败重试同号事件，不重做批准或授册。

接待要求本模拟日朝会已终态、所有朝后事务结束、无未结原诏令、沈序实际可借；不另造21:00或23:00夜间禁令。原工作未完显示等待，不伪造已完成。借用只涉及沈序；Wen 和 Bo 不被借用。皇帝后台听候职责不能覆盖正式朝会；新朝会可在其现有路径安全交接处接管。离场/跨日/300秒会面超时释放；借用心跳失联8秒由原诏令控制器回收。

宣读前仍须玩家、原皇帝、原沈序真实到场。批准不等接受、授册不等亲密同意、名位不增工资、不改普通职业账本。正式岗位未离任或工资未结算由账本阻塞接受和授册。

验证：新增低成本控制器检查使用真实 service + 原 edict + 独立 ledger，路线/碰撞为轻量替身，覆盖独占借用、远程提交拒绝、下午门槛、两个中间状态恢复、存储失败同号重试、终态不重放。原诏令和朝会职责定向回归通过；账本14项通过；构建通过。实际宫廷几何、门、楼梯及正常视角由集成主任务的一条最终链统一验证，本批未重复跑完整场景。

增量复核：朝会新增轻量 `courtStatus()`，自荐门槛及原沈序职责仲裁均使用它，避免逐帧复制官员生活/报告历史；状态卡一次只求一个 window。正常台词只宣读名位与寝居。中途离场的未授册原纸由沈序真实带回原传令案并放下，再次请求取回同号已用印纸，不重新拟造；写字/用印中断保留阶段进度。轻测同时断言重型 audience.state 零调用和取消后的同号文书复用。

导航到场入口使用 `requestSubmission()`：它要求玩家已实际走到接待点，保存本次明确呈交意图，再等原沈序实走到场；`{ok:true,pending:true,code:'awaiting-herald'}` 只表示正在等人，未创建申请、不耗今日次数。`physical.pendingSubmission` 和 `phase:'awaiting-herald'` 可显示等待。离场、主动取消、跨日或当天条件失效清除此意图。checkpoint 保存 pending，可恢复继续实际走来；只靠近、打开面板或查看状态从不创建申请。

主场景复核修正：已提交后沈序沿原公共门走向听候位，释放玩家出门路径；既有 submitted 存档按真实接待位置和已到场 task 恢复相同行为。原 edict 恢复时清除旧瞬时 lease，再由在其后恢复的自荐控制器重建独占借用，避免旧内部时间使借用首帧过期。

## 单条生产主链证据（2026-10-05）

`tests/china-consort-main.cjs` 是按 `CONSORT_RESUME` 指定完整生产 checkpoint 续行的定向工具，不加入全量每日测试。`CONSORT_TEST_SEED=4` 只用于明确标注的隔离测试夹具；`CONSORT_PHOTO_ONLY=1` 从既有完整档出图和核验不重授、不重扣，不推进业务。

- 真实前段沿用既存 seed42、14:19 原世界全档，从正在拟写的原清扫令实走至18:54办结归岗；未改朝会/诏令成功字段、NPC位置、钟点或速度
- 新功能链使用上述真实完成世界的隔离 seed4夹具，保证可观察获准分支；这是测试世界，不能表述为原seed42玩家外貌与生活决定完全不变。审核仍由固定roll、多因素和实际会面生成，没有写入批准或名位
- 玩家一次明确UI点击并走到接待点，原沈序到场后19:50实际收荐。静站接待堵路和恢复租约顺序问题已复现并修复；原接待→听候共享路径13点、7.4698米，修后9.3模拟秒。真实三方召见20:18获准
- UI明确接受后，原沈序归案、拟写、原印块用印、携同号纸回来。21:44 handoff 全档生产重载，31个原角色坐标与同号文书阶段逐一保持；21:50真实递交和宣读才获得一次名位
- 12.8秒实际入第四床并安全起身，35.1秒共享导航坐原东侧餐席。原Jia21.1秒完成同份御膳；玩家前6秒无回执，满12.1秒才完成原第6号单。该单只有一个备料扣库凭据，日需登记第6号回执；原31角色ID及三位原妃房权不变
- 最终授册/重载/寝居/御膳段2118个100ms模拟步，推进及重载137.7墙钟秒，峰值1009MiB（冷启动另约40秒）。场景为生产main、原导航/门/碰撞和模拟DOM；不是浏览器或iOS验收
- 复用每段真实完整存档继续；原朝会不重播，已获准不重审，文书不重造。实际遇到的时限阻断、旧借用时间失效及QA早停误判保留日志，未计为成功
