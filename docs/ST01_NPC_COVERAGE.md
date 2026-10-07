# ST01 当前四国 NPC 社交接入覆盖

## 母项与完成边界

对应 [PROJECT_CHECKLIST.md 的 ST01](PROJECT_CHECKLIST.md)：多因素关注、吸引与好感，以及玩家↔NPC、NPC↔NPC 的真实关系互动。本文只记录**当前场景真实人物、控制权和公共自主配对接点**，不把此批接线等同于完整 ST01 故事、私人关系或视觉验收完成。

当前源码固定人物共 **72**：日本 18、中国 31、法国 7、埃及 16；另有日本最多同时 2 位动态来客。原自主配对执行器覆盖其中 29 位身份，其余固定 43 位没有原自主配对执行器。全局通用候选来源为当前 `npcs`，包括已有配对人物和后加入的日本来客，不能按职业白名单把其余人物排除。

此表是源码接点与本批实施/验收契约，不是逐人实机完成证据。原 owner 的只读 `canBorrowForSocial` / `canTalkAtPost` 已加入本批，主循环与全局执行器门控随本批合入；“已接全局候选”不表示该角色当前获准离岗，也不宣称尚未验收的门控已经通过。未具备可靠离岗判断的职业接点必须保守阻断出行。

## 原地短聊与离岗移步必须分开

1. 原 `socialStatus.canPause` 只是原地停下招呼/短答的信号，**不是离岗、约见移步或让出身体控制权的许可**。NPC↔NPC 原地短聊另由实际 owner 的只读 `canTalkAtPost` 和全局安全条件共同判断，不能仅凭旧 `canPause` 放行。
2. **原地短聊不移步、不搬到约见点。** 两位真实人物原本就须相距不超过 3 米、相互可见、各自在原有位置静止；没有进行中的交易、持物/交接、工资/工作计时或其他排他任务。不得把停岗短聊同时算作完成工作或有薪工时，也不能为凑齐距离把其中一人拉离原岗位。
3. **通用移步**必须由实际原 owner 的只读 `canBorrowForSocial` 确认真实释放、放班或有效替班覆盖。不能由全局系统制造替班，不能把“没有排队订单”“正在 idle 动画”“原地可聊天”当成证明。尚未放班的岗位只可能走原地短聊路径，不能用原地许可降级绕过移步限制。
4. 两条通用路径均还要通过 alive、相应意愿/年龄条件、真实公共空间、无睡眠/坐卧/沐浴占用、无急需、无玩家会面、无既有配对/其他租用，以及实际接触条件；移步还须可达性检查。对方接受后才原子取得双人身体租用；取消、职责恢复或离场须归还控制权。
5. **本批通用执行器只做公共互动。** 私室、客房睡眠、床位、坐席和沐浴等占用不能凭关系分数覆盖。它不发起私人移步或私人淡出。既有专用执行器保留自身原协议与私密资格检查，不因为全局接入而扩大权限。
6. 角色当前/原任/退休者可能因现有岗位转任而变化。表中是真实场景的稳定身份与默认 owner；运行时按实际 `owns()`、角色绑定与借调判断，不能硬编码默认身份来绕过原任务。NPC 去酒楼用餐、去雅集或看诊的明确借用期间，由实际服务 owner 继续掌管。
7. 当前四国绑定银行出纳没有已实现的真实替班机制，`canBorrowForSocial` 为 false，故不能离柜参与通用移步；`canTalkAtPost` 可对**实际绑定、静止、柜台对话框关闭**的出纳成立，再叠加 3 米、互相可见、无交易/持物/工作计时等全局条件，支持 NPC↔NPC 原地短聊。他们不是永久不适用，也不需要创造“将来替班”来接入社交。

表中“已接”同时包括这两条独立门控路径；“不能离岗”不表示不能原地短聊，原地条件不满足时两条路径都保持阻断。

“原配对：有”指已经具备实际 NPC↔NPC 自主邀请、赴约与完成执行链，**不是任意两个人都可随时配对**；“无”不表示不适用。各行的公共/私密列均服从上述全局条件。

## 逐人覆盖

| 国家 | actorId | 实际身体/任务 owner | 原配对 | 通用接入 | 真实离岗 / 忙碌边界（原地另审） | 公共与私密边界 |
|---|---|---|---|---|---|---|
| 日本 | jp-ramen | japanService → staffLife / 厨房与送餐 duty | 有 | 已接；原地/移步分审 | 原岗位实际交班且替班覆盖成立才可借离；制作、持餐盘、送餐/收洗、新单和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-sushi | japanService → staffLife / 厨房与送餐 duty | 有 | 已接；原地/移步分审 | 原岗位实际交班且替班覆盖成立才可借离；制作、持餐盘、送餐/收洗、新单和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-welcome | japanService → staffLife / receptionDuty | 有 | 已接；原地/移步分审 | 登记/退牌岗位须真实交接或覆盖后借离；客簿、浴牌、会面和新单优先，空队列不等于放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-market-tea | japanService → staffLife / receptionDuty | 有 | 已接；原地/移步分审 | 登记/退牌岗位须真实交接或覆盖后借离；客簿、浴牌、会面和新单优先，空队列不等于放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-incense | japanService → staffLife / mixingDuty | 有 | 已接；原地/移步分审 | 配料岗须真实交班/覆盖；配料 claim、持物、新配料单阻断。原药房近处短聊边界不自动授权离岗移步。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-herb-workshop | japanService → staffLife / mixingDuty | 有 | 已接；原地/移步分审 | 配料岗须真实交班/覆盖；配料 claim、持物、新配料单阻断。原药房近处短聊边界不自动授权离岗移步。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-onsen | japanService → staffLife / 男汤 deliveryDuty | 有 | 已接；原地/移步分审 | 男汤原轮值实际覆盖后才可借离；送浴包、交接、锅炉/浴务任务、急需和沐浴过渡阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-steam | japanService → staffLife / 男汤 deliveryDuty | 有 | 已接；原地/移步分审 | 男汤原轮值实际覆盖后才可借离；送浴包、交接、锅炉/浴务任务、急需和沐浴过渡阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-women-onsen | japanService → staffLife / 女汤 deliveryDuty | 有 | 已接；原地/移步分审 | 女汤原轮值实际覆盖后才可借离；送浴包、交接、被褥/浴务任务、急需和沐浴过渡阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-rest | japanService → staffLife / 女汤 deliveryDuty | 有 | 已接；原地/移步分审 | 女汤原轮值实际覆盖后才可借离；送浴包、交接、被褥/浴务任务、急需和沐浴过渡阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-omamori | japanService → staffLife / COURTYARD 原轮休 | 有 | 已接；原地/移步分审 | 原庭园/御守岗位真实轮休和覆盖成立才可借离；不能把本地工作 idle 当成永久离岗许可。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-garden-onsen | japanService → staffLife / COURTYARD 原轮休 | 有 | 已接；原地/移步分审 | 原庭园/御守岗位真实轮休和覆盖成立才可借离；不能把本地工作 idle 当成永久离岗许可。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-tea | japanService → staffLife / HALL 原轮休 | 有 | 已接；原地/移步分审 | 暖桌/望景廊原轮休须真实覆盖；暖桌坐垫占用先按原流程释放，睡眠或急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-balcony | japanService → staffLife / HALL 原轮休 | 有 | 已接；原地/移步分审 | 暖桌/望景廊原轮休须真实覆盖；暖桌坐垫占用先按原流程释放，睡眠或急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-performance-reception | japanPerformance | 无 | 已接；原地/移步分审 | 原接待 owner 明确许可才可借离；接待单、奉茶、交接及返回过程阻断，无演出单本身不是离岗证据。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-salon-mai | japanPerformance | 无 | 已接；原地/移步分审 | 确实空闲且已离开表演/陪席任务的艺者可借；接单、演出、奉茶、返回路径与坐席占用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-salon-ichiro | japanPerformance | 无 | 已接；原地/移步分审 | 确实空闲且已离开表演/陪席任务的艺者可借；接单、演出、奉茶、返回路径与坐席占用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 日本 | jp-exchange-teller | chinaMoneyHouse → createBankCounterService | 无 | 已接；原地/移步分审 | 无真实替班，不能离柜；绑定人物静止且柜台关闭时可审原地短聊，仍须 3 米/可见/无交易等条件。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-consort-yue | chinaPalace → palace life / 原妃嫔配对 | 有 | 已接；原地/移步分审 | 原 owner 确认在公共处空闲才可借；已有配对、茶席、御膳、如厕、私室/睡眠及急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-consort-heng | chinaPalace → palace life / 原妃嫔配对 | 有 | 已接；原地/移步分审 | 原 owner 确认在公共处空闲才可借；已有配对、茶席、御膳、如厕、私室/睡眠及急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-consort-ling | chinaPalace → palace life / 原妃嫔配对 | 有 | 已接；原地/移步分审 | 原 owner 确认在公共处空闲才可借；已有配对、茶席、御膳、如厕、私室/睡眠及急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-emperor | chinaPalace / 朝议与阅批 duty | 无 | 已接；原地/移步分审 | 仅公共处真实空闲且无 duty/召集可借；朝议、阅批、御膳、私室、坐卧和睡眠阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-minister-works | chinaAudience → officialLife；用餐/雅集可显式借给原服务 owner | 有 | 已接；原地/移步分审 | 原官员 life 真正 idle、无公务和召集才可借；班位/朝会、巡检、档案、公务审核、原配对及服务借用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-minister-granary | chinaAudience → officialLife；用餐/雅集可显式借给原服务 owner | 有 | 已接；原地/移步分审 | 原官员 life 真正 idle、无公务和召集才可借；班位/朝会、巡检、档案、公务审核、原配对及服务借用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-official-rites | chinaAudience → officialLife；用餐/雅集可显式借给原服务 owner | 有 | 已接；原地/移步分审 | 原官员 life 真正 idle、无公务和召集才可借；班位/朝会、巡检、档案、公务审核、原配对及服务借用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-official-personnel | chinaAudience → officialLife；用餐/雅集可显式借给原服务 owner | 有 | 已接；原地/移步分审 | 原官员 life 真正 idle、无公务和召集才可借；班位/朝会、巡检、档案、公务审核、原配对及服务借用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-official-justice | chinaAudience → officialLife；用餐/雅集可显式借给原服务 owner | 有 | 已接；原地/移步分审 | 原官员 life 真正 idle、无公务和召集才可借；班位/朝会、巡检、档案、公务审核、原配对及服务借用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-official-records | chinaAudience → officialLife；用餐/雅集可显式借给原服务 owner | 有 | 已接；原地/移步分审 | 原官员 life 真正 idle、无公务和召集才可借；班位/朝会、巡检、档案、公务审核、原配对及服务借用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-palace-herald | chinaEdict / heraldLife；敕令允许时 chinaConsortCourt 借用 | 无 | 已接；原地/移步分审 | 原传令岗明确释放才可借；原令、盖印/交接、传召、借调及个人急需任务阻断；空令队列不自动放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-calligraphy | chinaEdict / scribeLife；未持有时 main fallback | 无 | 已接；原地/移步分审 | 原拟稿岗位明确释放才可借；拟稿、原令交接、赴岗/返岗与个人急需任务阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-garden | chinaEdict / garden personalLife；未持有时 main fallback | 无 | 已接；原地/移步分审 | 原庭务岗位明确释放才可借；领令、回执、清扫、赴岗/返岗与个人急需任务阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tea | chinaTeaService / chinaTeaPersonal；hostHeld 时 chinaPalace；其余 main fallback | 无 | 已接；原地/移步分审 | 茶案原角色 owner 明确释放才可借；御茶单、温杯/奉茶/交接、hostHeld 与个人急需任务阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-rest | chinaArchiveService / chinaArchivePersonal；其余 main fallback | 无 | 已接；原地/移步分审 | 原藏书岗位 owner 明确释放才可借；六册巡检、持书/归位、赴岗/返岗与个人急需任务阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-cooking | chinaRoyalKitchen / 原厨役 personal life | 无 | 已接；原地/移步分审 | 原岗位实际交班或有效覆盖后可借；原膳单、备料、蒸制、持膳/交接及急需阻断；无单不等于离岗。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-archery | chinaArchery / 原 guard personal needs | 无 | 已接；原地/移步分审 | 原岗真实释放/轮值覆盖后可借；执勤、练射、持弓、换班、巡查和急需阻断；暂时未射箭不算休班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-range-warden | chinaArchery / 原 guard personal needs | 无 | 已接；原地/移步分审 | 原岗真实释放/轮值覆盖后可借；执勤、练射、持弓、换班、巡查和急需阻断；暂时未射箭不算休班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-host | chinaTavern → staffScene / host life | 无 | 已接；原地/移步分审 | 原掌柜岗实际交班/覆盖后可借；点单、收款、住宿登记、会面、交接和急需阻断；暂无客单不算离岗。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-cook | chinaTavern → staffScene / kitchen life | 无 | 已接；原地/移步分审 | 原厨师岗真实交班/覆盖后可借；备餐、持餐、灶台任务、交接和急需阻断；空餐单不算离岗。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-assistant | chinaTavern → staffScene / kitchen life | 无 | 已接；原地/移步分审 | 原传菜岗真实交班/覆盖后可借；传菜、持盘、收桌/清洗、交接和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-diner-west | chinaTavern → staffScene；clinic/salon 模式移交 chinaClinic/chinaSalon | 无 | 已接；原地/移步分审 | 稳定来客只有真实公共 idle 才可借；排餐、用餐、住店、离店、看诊/雅集借用及如厕阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-diner-east | chinaTavern → staffScene；clinic/salon 模式移交 chinaClinic/chinaSalon | 无 | 已接；原地/移步分审 | 稳定来客只有真实公共 idle 才可借；排餐、用餐、住店、离店、看诊/雅集借用及如厕阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-reception | chinaSalon / receptionLife / receptionWork | 无 | 已接；原地/移步分审 | 原接待 owner 明确释放才可借；引见、核价、留房牌、核销原单及个人急需任务阻断；空单不自动放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-reciter | chinaSalon → artistLife / needs / employment | 无 | 已接；原地/移步分审 | 真实歇场且无服务承诺的艺者可借；演出/陪席、返回、就业交接、个人急需及原坐席占用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-storyteller | chinaSalon → artistLife / needs / employment | 无 | 已接；原地/移步分审 | 真实歇场且无服务承诺的艺者可借；演出/陪席、返回、就业交接、个人急需及原坐席占用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-songwriter | chinaSalon → artistLife / needs / employment | 无 | 已接；原地/移步分审 | 真实歇场且无服务承诺的艺者可借；演出/陪席、返回、就业交接、个人急需及原坐席占用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-tavern-chess-poet | chinaSalon → artistLife / needs / employment | 无 | 已接；原地/移步分审 | 真实歇场且无服务承诺的艺者可借；演出/陪席、返回、就业交接、个人急需及原坐席占用阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-clinic-physician | chinaClinic / physicianLife / NPC duty | 无 | 已接；原地/移步分审 | 原医师岗实际交班或有效代诊覆盖后可借；接诊、问诊、开单、原单交接、会面和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-pharmacy-assistant | chinaClinic / NPC duty / needsLife | 无 | 已接；原地/移步分审 | 原药铺岗实际交班/覆盖后可借；配药、持包、问询单交接、临时代办和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 中国 | cn-money-house-teller | chinaTellerService / chinaTellerPersonal；chinaMoneyHouse 只读绑定、bodyManaged | 无 | 已接；原地/移步分审 | 无真实替班，不能离柜；绑定静止且闭柜台可审原地短聊，审计/持册/交易/急需阻断；闲时身体仍由 tellerService 写入。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-bakery | franceTea → workplace conversations / pastry duty | 有 | 已接；原地/移步分审 | 原糕点岗位真实交班/覆盖后可借；制作、持盘、原餐单、交接和急需阻断；无单不自动放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-salon | franceTea → workplace conversations / tea duty | 有 | 已接；原地/移步分审 | 原茶侍岗位真实交班/覆盖后可借；传单、奉茶、持盘、收洗、交接和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-cafe | franceTea → resident / workplace conversations | 有 | 已接；原地/移步分审 | 原常客只有公共空闲且未占餐席、无原餐单/原配对或急需时可借；真实起身后再进入候选。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-gardener | franceGardener / maintenance / labor | 无 | 已接；原地/移步分审 | 原 owner 确认真正休闲且无劳动承诺才可借；持工具、浇水/修篱、雇佣/借具/交接和会面阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-exchange-teller | chinaMoneyHouse → createBankCounterService | 无 | 已接；原地/移步分审 | 无真实替班，不能离柜；绑定静止且柜台关闭时可审原地短聊，原地许可与空交易队列都不能代替放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-atelier | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 当前确实无工作/服务 owner 占用的静态人物可公共移步；原地活动被占、私室、坐卧、睡眠和急需仍阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 法国 | france-bedroom | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 当前确实无工作/服务 owner 占用的静态人物可公共移步；原地活动被占、私室、坐卧、睡眠和急需仍阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-royal-kitchen | egyptMeal → workplace conversations / kitchen duty | 有 | 已接；原地/移步分审 | 原厨房岗真实交班/覆盖后可借；备餐、持餐、原单、交接和急需阻断；无客单不自动放班。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-royal-dining | egyptMeal → workplace conversations / tableService duty | 有 | 已接；原地/移步分审 | 原餐侍岗真实交班/覆盖后可借；送餐、持盘、收洗、原单、交接和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-papyrus | egyptMeal → resident / workplace conversations | 有 | 已接；原地/移步分审 | 原常客在公共处真实空闲且无餐单/原配对时可借；用餐、离席/返位、占席和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-private-bath | egyptDailyToilet 临时 yielding/returning；其余 main fallback | 无 | 已接；原地/移步分审 | 净室让道/返岗任务必须结束；在浴室、如厕、沐浴或私密范围内不能发起公共移步，公共空闲另审。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-exchange-teller | chinaMoneyHouse → createBankCounterService | 无 | 已接；原地/移步分审 | 无真实替班，不能离柜；绑定静止且柜台关闭时可审原地短聊，原地许可或暂时无交易不是离岗许可。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-sphinx | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-glyphs | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-scales | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-guardian | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-burial | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-stars | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-anubis-judgment | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-horus-eye | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-cleopatra-suite | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-pharaoh-throne | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |
| 埃及 | egypt-royal-reception | main.updateNPCs fallback（无独立职业任务 controller） | 无 | 已接；原地/移步分审 | 没有独立岗位任务 owner 的静态人物可在真实公共空闲时参与；现有动作占用、私室、坐卧、睡眠和急需阻断。 | 仅公共；私室、睡眠、坐卧/沐浴占用阻断 |

## 动态与有限来客

| 国家 | actorId / 身份来源 | 实际 owner | 原配对 | 通用接入 | 数量与真实边界 |
|---|---|---|---|---|---|
| 日本 | `jp-visitor-${worldSeed}-${number}`；`worldSeed` 为无符号 32 位种子，`number` 为持久化正整数 `nextVisit` | japanService → guest tasks | 无 | 已接原地/移步分审；读取当前 `npcs`，不依赖初始化时固定数组 | 同时最多 2 位，历次编号持续增长且不复用；登记、换衣、清洗、送浴包等待、泡汤、用餐、结账/离场均是实际流程，原地短聊须处于无任务的真实静止公共间隙；只有原 owner 明确给出公共可借间隙才可移步。 |
| 中国 | `cn-tavern-diner-west` | chinaTavern；显式借给 chinaClinic / chinaSalon 时由该服务管理 | 无 | 已接，已计入上方 31 位 | 固定两位中的一位；反复来访不新增身份，餐单/看诊单序号不是新 NPC。 |
| 中国 | `cn-tavern-diner-east` | chinaTavern；显式借给 chinaClinic / chinaSalon 时由该服务管理 | 无 | 已接，已计入上方 31 位 | 固定两位中的另一位；同样循环 dining / lodging / leaving / idle / clinic / salon，不能在流程途中抢走。 |

日本生产 `createJapanBathhouseOperations` 设置 `capacity:2`，同时检查 `guests.size >= 2`；`createVisitor` 才向当前 `npcs` 添加真实来客，移除时同步退出。中国没有动态 `createCharacter` 来客生成路径；`GUESTS` 明确只有上述两个固定 ID。日本 `jp-player-service-*` / `jp-player-dining-*` 是玩家业务单身份，不是额外 NPC。

## 原执行器范围与不能混同的接点

- 日本：14 位原员工已有轮休社交接点，但原配对是**已有替班覆盖的真实休息返回者与 `jp-incense`** 在药房近处短聊；不是 14 人任意离岗。原香药员在岗位附近可短答的窄边界不能被用来授权跨区域约见。
- 中国：3 位妃嫔已有彼此自主配对；皇帝、`cn-tea` 不因此自动计入这条配对执行器。6 位现有官员已有官署 life 配对，仍须无公务、无召集、无服务借用。
- 法国：`france-bakery`、`france-salon`、`france-cafe` 共用原茶点 workplace conversations。它的既有近岗行为不等于两位在岗服务人员可以通用离岗。
- 埃及：`egypt-royal-kitchen`、`egypt-royal-dining`、`egypt-papyrus` 共用原餐饮 workplace conversations；同样保持原岗位约束。
- 艺者真实歇场且无原服务承诺可以作为公共移步候选；接待人员仍须原接待 owner 明确给出离岗边界，不能因为同属艺术服务而套用艺者规则。
- `cn-money-house-teller` 的 `chinaMoneyHouse` 为 `bodyManaged:true`；闲时身体仍由 `chinaTellerService.update` 写入。其审计 `owns()` 为假不能推导无人管理，更不能自动放行。
- `egypt-private-bath` 只有净室让道/返位期间由 `egyptDailyToilet` 暂管，其他时候回到主循环；在浴室私密范围内仍不能发起公共移步。

## 源码依据与排除项

- [main.js](../source/game/main.js)：实际四国 builder 导入、`configureNPCs`、`configureNpcPublicInteractions`、`configureChinaMoneyHouse`、日本 `createVisitor`、`updateNPCs` owner 优先顺序与 fallback。
- 日本固定列表：[japan-bathhouse.js](../source/game/japan-bathhouse.js) 的 stations、[japan-performance-cast.js](../source/game/japan-performance-cast.js)、[japan-exchange-counter.js](../source/game/japan-exchange-counter.js)。员工集合/来客编号：[japan-service-orders.js](../source/game/japan-service-orders.js)；实际容量/owner：[japan-bathhouse-operations.js](../source/game/japan-bathhouse-operations.js)；原配对边界：[japan-staff-life.js](../source/game/japan-staff-life.js)。
- 中国固定列表：[china-palace.js](../source/game/china-palace.js) 的 stations 汇合 [china-tavern.js](../source/game/china-tavern.js)、[china-palace-life.js](../source/game/china-palace-life.js)、[china-palace-residents.js](../source/game/china-palace-residents.js)、[china-palace-audience.js](../source/game/china-palace-audience.js)、[china-clinic.js](../source/game/china-clinic.js)、[china-money-house.js](../source/game/china-money-house.js) 与传令角色。稳定来客集合与临时借用见 [china-tavern-service-scene.js](../source/game/china-tavern-service-scene.js)。
- 法国固定列表：[regions-west.js](../source/game/regions-west.js) 的当前 `buildFrance`；茶点三人 owner 见 [france-tea-service.js](../source/game/france-tea-service.js)。
- 埃及固定列表：[egypt-temple.js](../source/game/egypt-temple.js)；餐饮三人 owner 见 [egypt-meal-service.js](../source/game/egypt-meal-service.js)。
- 不统计 [regions-east.js](../source/game/regions-east.js) 中未被 main 选用的旧 `buildJapan`，也不统计 `regions-west.js` 中旧 `buildEgypt`。当前中国由 `regions-east.buildChina` 转到 `buildChinaPalace`。
- `jp-library` 明确 `npc:false`，不产生人物；探索目标、家具/床位/柜台 ID、玩家岗位单与各职业的未来规划均不属于本表 NPC。

本文同时记录全局原地短聊与移步的独立准入边界，不把 API 声明当成已经完成的生产验证。

本次仅完成源码清点与文档写入；未运行新测试、未重跑旧测试、未作逐人运行时或视觉通过声明。

## 合流后的实际验证（补充上述清点范围）

主程序已接入两条路径：原owner许可离岗才走公共双人点；否则只有真实空闲、原地、互见且相距不超过3米的双方可短聊，新交易/职责或离开原点立即取消。当前岗位holder实时读取，不按默认姓名永久锁死；死亡、替换对象和actorId变化会取消原会面，不转移奖惩。所有公共会面冻结原双方actorId。

- 全72固定出生点与日本生产生成器的2个真实访客均通过实际场景、原碰撞/门规划→真实公共端点检查。初查11.172秒/898.961MiB；3个误用玩家.34半径的NPC起点改回原NPC.25后，定向复查9.161秒/911.902MiB通过，无几何改动。这个证据是路线规划，不冒充逐人完整动画或手机表现。
- 生产main原法国画师↔已实际休息园丁：自主1.2秒招呼、当次邀请、约22秒真实双人移步、9.448秒实际交谈、同eventID双方关系/意见各+.07。其他原职员继续活动，原园丁和画师owner分别恢复。第二次已接受邀请用实际返回世界按钮取消，完成数仍1、关系不增，所有资源归还。最终改动版本34.653秒/691.94MiB；模拟DOM/renderer，不称浏览器/iOS实图验收。
- `npc-social-ownership.mjs`验证双hold而第三人继续、原任务/计时恢复、园丁及钱庄身体owner、真实日本在岗只能原地聊、法国仅active交班放行一岗且召回撤销，以及实际main银行原岗不求离岗路线/远目标不借走/新交易撤回。
- `npc-public-interactions.mjs`验证固定世界机会而非每人滚概率、真实招呼证据、单目标才求路、原profile评分、缺席身份保留、忙碌/死亡/替换/改ID取消、失败保存等待同事件重试和重载未完成中止。通用层借用原生理值，不逐帧另跑全员需求；无会面时仅到18秒机会登记名单，活动中仅核实当前二人。
- 既有Japan `japan-idle-work.mjs`在returning/preparing断言的失败已用553ee327源重现，非本批hold回归；相关通过的原控制器检查与未改长经济/几何证据复用。
