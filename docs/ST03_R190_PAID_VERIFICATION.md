# ST03 R190 原生产付费链观察

当前结论（2026-10-07 23:40 UTC）：一条原记录官→顾流萤80文曲词链已完成真实自然选择/本人接受/原楼梯引路/资金预留/结清/释放，invited与reserved精确恢复、settled后恢复不重复收入均通过。仅一条生产逻辑证据，四日工资前提仍为staged fixture，四艺者全覆盖及浏览器/iOS不据此关闭。

原ST03母项边界保持四艺者实际服务、本人回应、原身体/房间/真实资金与一次结清；本批只验证一条可负担原链，不能关闭四人覆盖或浏览器/iOS体验。

基线ad5609a。R189到R190的雅集/艺者/六官生活、工资、房间、world-continuity、daily-needs模块和natural harness/bounded DOM逐文件相同（hash见development/heavy-probes/salon-r190-evidence.json）。main新增柜员集成；原雅集装配/controller列表/演员恢复不变，玩家意图恢复只新增柜员分支。本检查仍用当前main含柜员更新，不回退业务代码或重测工资。

复用2e26245已有财务fixture及空session恢复：四日归档controller收入，六官各96、24回执、总576；直接courtCompleted与移动/寻路替身明确属于staged前提，绝非自然四天。原day4 13:00、seed42；不重置需求/人物/邀请/关系/概率。110报价不可负担，仅40/80/45可能入选。原隔离checkpoint复制后核对hash，不覆盖自然观察或原证据。

独立run-salon-bounded.sh使用同一共享锁、768MiB old-space、1152MiB整树、180秒限额。每段最多300×.15=45模拟秒，首个原session立即保存停止。无选择时初始观察窗240秒对应两次原120秒paid-salon冷却及原10–27秒工作/阅读周期；无选择只记未观测，不改seed/概率或延伸为无界长测。活动会话必须另外先验证原ID/参与者/room claim/ledger恢复，无退款或重选后才续。每批提交后等远端确认。

2026-10-07 18:25 UTC首段：嵌入式加载比对31原NPC身份/位置、时钟、工资账本、艺者/六官RNG和controller状态通过，0跳过/迁移。原checkpoint前进45模拟秒至day4约13:31.5，300帧；未出现paid-salon选择或服务session，六官各96保持，艺者回执0，雅集失败0。真实终态已落盘。guard PASS/exit0，80.107秒、712.480MiB；CPU/阶段日志保留。没有执行第二段、旧5000帧脚本、额外结算或工资更改。结果是有界未观测，不是服务通过/失败。

18:32 UTC第二45秒段：原82.5模拟秒时礼部官自然选择沈砚舟40文游记服务，沿原岗位身体出发；90秒终态仍travel、session=null，没有强邀约或扣款。六官各96、艺者回执0、salon失败0。加载身份/位置/RNG/钱款核对仍通过。75.428秒/717.137MiB、guard PASS/exit0；原choice/目标/路线与真实checkpoint已保存。当前90/240秒，仅证明自然选择及出发，未到前台、未收到本人回应或付费。

18:37 UTC第三段至135秒：原礼部官继续同一82.5秒选择/40文沈砚舟目标，路线index0→9，真实身体从官署[22.5,3.915,32.4447872]经公共楼梯到[20.5,.215,14.5]；初始记录官让行等待已解除，终态waiting/blocked=false、stalled0/retries0。未生成session/扣款，六官各96、艺者回执0，salon失败0。78.973秒/712.105MiB、guard PASS/exit0。原加载身份/位置/RNG及工资核对通过；没有替换目标或直接请求。当前135/240秒，未验到前台或服务。

18:44 UTC第四段至180秒：同一礼部官/82.5秒原选择/沈砚舟40文沿原路线index9→20，经云来双公共楼梯到[23.3145120453,7.815,8.1854879547]，距离原前台不足1米。无阻塞/重试，六官各96、艺者回执0、官方及salon失败0，尚未session。86.604秒/712.918MiB、guard PASS/exit0。

停止边界说明：240秒仅限制尚未观察到选择的窗口。已选择原链按同一actor/target/startedAt跟进到会话或取消终态，不重选也不机械截断健康路程。135秒时剩余路标分段3D约45.04米，实际绕障更长，原速度本人walkSpeed×.78；原无全程硬超时，但非让行停滞每4秒重规划、第三次记失败，到前台对可等待艺者仅等12秒。runner已按此更新，原controller失败或原选择结束即保档停。

## 18:49 UTC 原链未成行终态，停止本轮

第五段只推进7帧/1.05秒，原礼部官181.05秒到达原前台[24.15,7.815,7.65]；原事件依次为life-paid-salon:arrived及life-paid-salon:interrupted，同步结束原82.5秒沈砚舟40文选择。立即保档停止，没有选第二条链、延长观察或直接request/settle。guard PASS/exit0，69.729秒/686.867MiB。

可证实的足够阻止条件：精确终态chinaServiceWorld中兰房/竹房均dirty=true、guestId=null。main的roomAvailable要求!guestId&&!dirty；npcOfferStatus在没有可用房时直接返回offer-changed/non-waitable，原life据此可当步结束。沈砚舟同刻在练稿（已6.45/9.699秒），该忙碌本可等待最多12秒，但没有可用房会先阻断。未捕获当次调用的独立reason-code日志，故不声称脏房是唯一条件；不把“interrupted”写成艺者明确拒绝、概率拒绝或支付故障。

无扣款完整证据：六官均保持96，官方仍24笔原duty交易/总576，无salon hold；雅集serial0、session=null、history空；艺者revision0、全部余额0、grossRevenue/performerPaid/businessProceeds0，receipts及mealTransfers空。原actor位置/选择、双房状态、原事件和账本摘要收录salon-r190-evidence.json；完整checkpoint路径在同文件。本轮确立自然选择、原身体完整到前台、房况变化下原系统未成行且零收费；没有完成付费服务，活动会话恢复和结清仍未验证。ST03四艺者、浏览器/iOS范围继续开放。

## 18:56 UTC 只读核查原清扫排班

终态原服务助理cn-tavern-assistant仍持有cn-tavern-steward（revision0），没有玩家接替；身体已在二层兰房[19.7,4.015,15.5]，原phases为clean-room-lan=0.5/5控制器秒。没有原助理休闲任务或个人餐厕占用。0.5/5明确表示正在清扫，绝非清扫完成或保证之后何时完成。

原职责顺序为持有中的送餐/归还及待处理餐具→脏桌→脏且无住客的客房，客房按现有顺序处理。两原餐单分别97.05/126.6秒done；135秒两桌仍脏，180秒两桌已清洁、助理上楼，181.05秒已开始兰房。兰房在90–135秒检查点间变dirty，竹房在135–180秒之间变dirty，均来自原访客实际入住后离房；未记录逐次dirty事件，不推算成精确退房时刻。

这些事实解释当时房间尚未可接待，未建立清洁系统故障证据，不据此改逻辑。双房dirty是足够阻止条件，但没有独立记录当次调用的唯一reason-code，不能推定是唯一取消原因。礼部官原链已正常未成行且未付款，本轮诊断至此结束。ST03付费完成和活动会话恢复单独保持开放；没有继续抽样、场景测试、清洁状态篡改或业务修改。

## 22:43 UTC 用户要求继续：原清扫完成节点

恢复同一181.05秒终态，未复活取消订单。checkout a00db01、工作区干净，无其他场景进程且共享锁空闲；按原测试说明不重跑工资或已验前置。加载时原清扫0.5秒计时、人物/账本/RNG精确匹配，51帧/7.65模拟秒后兰房由dirty=true变false，清扫计时退出；竹房仍dirty。48.821秒/688.164MiB，guard PASS/exit0。

该时刻助理仍在兰房[19.7,4.015,15.5]，room ledger正确报告physicallyOccupied=true，六官全部无当前可买候选。各96余额/session空保持；不能把清扫完成当可购买或付款。保存真实checkpoint为qa/st03-r190/cleaning-20261007T224234Z-2.checkpoint.json。下一独立节点为原助理走出后观察可用房/真实报价，尚未运行。仅诊断harness支持清扫节点，业务未改。

23:01 UTC原清扫离房→报价可用已证实：沿188.7秒checkpoint续45秒至233.7秒，帧32（193.5秒）助理离开兰房后原npcChoices恢复40/45文候选；后续随艺者实际练习/休息出现80文候选，未改概率。原助理继续完成竹房并离房，段末双房dirty=false、guestId=null、无身体占用。六官各96、session为空，尚未新的自然购买选择。57.598秒/691.285MiB、guard PASS/exit0；checkpoint和报价变化留存。旧240秒窗口不再作为用户要求继续的任务终点；每进程45秒限额保持，按真实状态接续，不重抽种子或复活旧订单。

## 23:08 UTC 原六官idle计时缺陷已复现并最小修正，待生产续验

233.7秒checkpoint显示工部约7.95秒后再决策、礼部paid-salon冷却至301.05秒，其他人沿原读书/听席/赏荷完成后再选。为减少反复装配，单守卫进程最多900个原.15步=135秒，每300步保档，150秒墙钟先落盘，外部180秒/1152MiB上限不变；没有跳钟或改变更新顺序。900步到368.7秒，75.318秒/744.855MiB，guard PASS。

观察暴露真实阻碍：六官原活动完成后，局部elapsed达到12秒但绝对brain时钟可能还差约1e-12秒；choose判未到期再idle/defer12秒，循环使多数choice计数不再增加。用原368.69999999998976、deadline372.449999999991、elapsed8.250000000000009值加入已有salon-life测试，原实现27×.15步后仍不决策（FAIL）。只将原idle离开条件同时要求brain.decisionDue，保原局部停歇/急需、原概率/RNG/工资不变；同一复现及原salon-life完整定向用例PASS，直接依赖official-life PASS，两项各.202秒/59.922及56.543MiB。

此修复适用于同一控制器六原官员，不扩改四国共享brain或艺者；实际生产同checkpoint续验、活跃服务恢复、付费终态和发布仍待。财务fixture继续是旧controller生成的24回执/576，不冒称重新跑四自然日；记录当前life源码hash例外及其最小计时差异，未改账务验证。

23:12 UTC生产续验idle修复通过：从原368.7秒真实checkpoint续900×.15步到503.7秒，六官choice计数逐一4→6、4→6、4→6、3→5、3→5、5→7，全部离开重复idle，按原RNG自然选听席/休息/工作/赏荷。并非强选付费；仍无paid-salon或session，各96资金不变，官方/雅集失败空。81.164秒/719.879MiB，guard PASS/exit0；每300帧落盘。原计时修复已有小复现和真实六官恢复证据；付费服务与活跃恢复继续未完。

23:17 UTC首个真实有偿服务会话出现：原记录官宋承简在life552秒自然选择顾流萤80文曲词，按原路线到前台并等待实际艺者歇场，612.15秒建立cn-salon-npc-1。723帧即停，stage=invited/payment=unpaid/roomId=null，原接待8文合同凭据建立但尚未收款或获收入；六官各96、艺者账本空、双房无claim。74.613秒/735.207MiB，guard PASS/exit0。原司农另一次自然选择也未阻断或人为取消；本次只追踪已经建立的原记录官会话。checkpoint：qa/st03-r190/segment-20261007T231633Z-2.checkpoint.json。下一阶段先零步验证同session/演员/报价/接待凭据/钱款/房间恢复，尚不推进结算。

23:21 UTC原invited会话零步恢复PASS：cn-salon-npc-1保持记录官/顾流萤/80文/原服务内容/接待合同凭据，完整salon snapshot及双方RNG、账务逐项相同；原customer仍被同session借用，房间仍无claim，31NPC及玩家原位置恢复、0迁移/跳过。无退款、换人、重选、扣款或模拟步。46.820秒/677.430MiB、guard PASS/exit0。恢复后checkpoint为qa/st03-r190/active-restore-20261007T232044Z-2.checkpoint.json；下一推进本人回应与原预留扣款，仍未结算。

23:25 UTC探针追踪修正：原invited续37帧，接待2秒登记完成，进入reserve工作阶段（不是资金reserved），原session/演员/80文仍未付款。探针误取同场第一位paid-salon意图（司农），对方自然撤销导致误停original-choice-ended；产品目标记录官会话未结束。改探针按session.customerId固定追踪，未改业务。真实新checkpoint保留，从其接续而非重跑起点；同场另一意图不复活。49.061秒/675.410MiB，guard PASS。该记录只认证原健康活动会话连续性，不声称付款或结算。

23:28 UTC真实回应/房权/资金reserved：顾流萤原身体走到前台，于life624.15秒当次willing=true，原兰房为cn-salon-npc-1保留；接待原登记2秒+留房2秒完成后，627.15秒原支付接口一次预留80文，记录官银行96→16、cash0，sourceSplit明确bank80。原hold状态reserved，兰房claim owner同session/status reserved；艺者收入/回执仍0（预留不算完成收入）。stage=escort/leg0，立即保档未继续。63帧，51.157秒/676.406MiB，guard PASS/exit0。下一先核验此真实资金/房权的恢复，再沿同body/原公共楼梯实际escort及一次结清；未直接settle或增发钱。

23:31 UTC原reserved/兰房恢复PASS：零步加载保同cn-salon-npc-1、记录官/顾流萤/80文/escort leg0；银行16和bank80 reserved hold完全相同，没有退款/重扣，兰房claim重新建立为同session owner/reserved，艺者账本仍0。完整salon snapshot、原clock、所有演员位置/RNG保持，0跳过/迁移。46.634秒/688.035MiB，guard PASS/exit0。恢复checkpoint qa/st03-r190/active-restore-20261007T233103Z-2.checkpoint.json；下一直接原escort到一次settled，不重复预留。

23:36 UTC原物理引路→服务→一次结清PASS：原cn-salon-npc-1从reserved leg0经三段原楼梯/房门路线，双方分别635.7秒到三层梯厅、646.35秒到二层梯厅、655.95秒到兰房原站位，656.1秒both-entered→非露骨fade，661.35秒原settle80后visiting。银行仍16，无第二次扣款；顾流萤一次income回执银行40，接待原2+2+2秒工作完成后一次工资回执8；官方同ID只有一笔reserve和一笔settle，hold=settled。兰房仍occupied属于该会话，原6秒收尾/释放待验。228帧/34.2模拟秒，97.884秒/706.500MiB，guard PASS/exit0。未直接请求结算或造任何凭据。下一从该真实settled checkpoint恢复，等原释放并比对资金/收入不重复。

## 23:40 UTC 单链终态：settled恢复→原收尾→释放，不重复收入

精确恢复原settled checkpoint后，40帧/6模拟秒完成原visiting收尾。cn-salon-npc-1仅一条complete，session=null，兰房claim=null，记录官borrowedSalon=false；官方/艺者/接待三个完整账本和settled输入逐字段相同。记录官余额16、顾流萤40、接待8，一笔reserve、一笔settle、一笔艺术家收入与一笔接待收入保持，没有再扣或重发。51.975秒/676.992MiB，guard PASS/exit0。

这验证了原身体选择→走到前台→本人答复→原房权/银行80预留→保存恢复→真实公共楼梯引路→双方到房→非露骨原服务→一次结清→结清后恢复→原6秒结束和所有权释放。银行24×4收入来源仍是明确staged控制器fixture，不变成四天自然日程证据；旧礼部官无房取消的失败尝试完整保留，未删掉、复活或重抽seed。

释放瞬间身体仍在兰房、艺者returning=true，原physical occupancy正确仍为true；没有声称已返回三层原岗、房间可以再售或完成之后的吃饭链。其他三艺者包括当前不可负担110文、完整私人同意/人物故事范围、浏览器/iOS验收仍按ST03母项开放。本条按目标终态停止，不扩展无关场景。最终checkpoint qa/st03-r190/service-20261007T233942Z-2.checkpoint.json。
