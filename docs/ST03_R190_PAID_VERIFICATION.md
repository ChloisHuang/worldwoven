# ST03 R190 原生产付费链观察

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
