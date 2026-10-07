// Isolated QA only: original production UI, synthetic in-memory service records.
// This module never imports main/entry and never reads or writes browser storage.
import {createChinaTavernMealUI} from '../game/china-tavern-meal-ui.js';
import {createFranceMealUI} from '../game/france-meal-ui.js';
import {createEgyptMealUI} from '../game/egypt-meal-ui.js';
import {createJapanPlayerServiceUI} from '../game/japan-player-service-ui.js';
import {JAPAN_SERVICE_POINTS as P,JAPAN_BATH_BLENDS,JAPAN_DINING_MENU} from '../game/japan-service-orders.js';
import {createChinaTavernLodgingUI} from '../game/china-tavern-lodging-ui.js';
import {createChinaTavernPropertyUI} from '../game/china-tavern-property-ui.js';
import {createChinaTavernSalonUI} from '../game/china-tavern-salon-ui.js';
import {SALON_ARTISTS,SALON_ACTIVITIES} from '../game/china-tavern-salon-artists.js';
import {createJapanPerformanceUI} from '../game/japan-performance-ui.js';
import {PERFORMANCE_CAST,PERFORMANCE_ACTIVITIES,PERFORMANCE_DRINKS} from '../game/japan-performance-cast.js';
import {createChinaConsortPetitionUI} from '../game/china-consort-petition-ui.js';
import {createChinaTavernLabor} from '../game/china-tavern-labor.js';
import {createChinaTavernEmployment} from '../game/china-tavern-employment.js';
import {createFranceGardenerLabor} from '../game/france-gardener-labor.js';
import {createFranceGardenerEmployment} from '../game/france-gardener-employment.js';
import {FRANCE_GARDENER as G} from '../game/france-gardener-place.js';
import {createFormalCareers} from '../game/formal-careers.js';
import {createObjectActionMenu} from '../game/object-action-menu.js';
import {syncUiViewport} from '../game/viewport-layout.js';
import {createCurrencyLedger} from '../game/currency-ledger.js';
const player=p=>({ageYears:26,walking:false,root:{position:{x:p[0],y:p[1],z:p[2]},rotation:{y:0}}});
const wrap=(ui,open)=>({ui,open:open||(()=>ui.open()),dispose:()=>ui.dispose()});
const clickText=(doc,text)=>Array.from(doc.querySelectorAll('button')).find(b=>b.textContent===text)?.click();
function meal(country,stage,{document:doc,log}){
 let ui;const active=stage!=='choose'&&stage!=='poor',ready=stage==='ready',cash=stage==='poor'?0:30;
 if(country==='china'){
  const seats=[[-1,18.1],[1,18.1],[-1,23.9],[1,23.9]].map(([side,x],i)=>({id:'qa-cn-seat-'+i,kind:'seat',center:[x,.215,16.2+side*1.32],position:[x+1.09,.215,16.2+side*1.32],anchor:[x,.215,16.2+side*1.32]}));
  let mounted=active?seats[0]:null,order=active?{id:'qa-cn-order',seatId:seats[0].id,stage:ready?'ready':'eating',payment:'settled',price:6}:null;
  const menu=[{id:'yunlai-mushroom-rice',name:'云来菌菇饭',price:6,host:'cn-tavern-host'},{id:'qa-noodles',name:'清汤面',price:8,host:'cn-tavern-host'}];
  const service={seats,menu,dish:menu[0],walletCash:()=>cash,view:()=>({order,label:ready?'餐点已送到':'正在享用'}),state:()=>({order}),requestMeal:id=>{log('模拟点餐 '+id);return true;},cancel:()=>{order=null;return true;},eat:()=>{log('模拟开吃');return true;}};
  ui=createChinaTavernMealUI({service,getPlayer:()=>player(seats[0].position),getMounted:()=>mounted,getReception:()=>({id:'cn-tavern-host',position:seats[0].position}),onIntent:i=>log(i.action),onMountSeat:s=>mounted=s,onStand:()=>mounted=null,onOpen:()=>{},canShow:()=>false,document:doc});
 }else{
  let state={cash,seated:active,canOrder:cash>=5,name:'尼罗陶锅蔬食',price:5,label:ready?'餐点已送达':'正在享用',order:active?{id:'qa-meal',customer:'player',dishId:'qa-meal',price:5,stage:ready?'ready':country==='france'?'drinking':'eating',payment:ready?'reserved':'settled'}:null,menu:[{id:'tea-cake',name:'下午茶与小蛋糕',price:0,detail:'茶与小蛋糕'},{id:'qa-meal',name:'宫苑蔬菜正餐',price:5,detail:'后厨现制，送到原茶位'}]};
  const service={view:()=>state,request:()=>{log('模拟点餐');return true;},eat:()=>true,drink:()=>true,cancel:()=>{state.order=null;return true;}};
  ui=(country==='france'?createFranceMealUI:createEgyptMealUI)({service,onStand:()=>{state.seated=false;log('模拟起身');},document:doc});
 }
 return wrap(ui);
}
function japan(stage,{document:doc,log}){
 const dining=stage.startsWith('dining'),empty=stage==='bath-choose'||stage==='dining-choose';
 const seat={id:'qa-jp-seat',kind:'seat',diningKind:'ramen',position:[4.1,0,5.7],center:[4.1,0,5.7],anchor:[4.1,0,5.7]},rest={id:'qa-jp-rest',kind:'seat',position:[0,3.8,7.55],center:[0,3.8,7.55],anchor:[0,3.8,7.55]},pool={id:'qa-jp-pool',kind:'bath',position:[0,3.8,-4]};
 let visit=empty?null:{id:'qa-jp-visit',number:7,stage:dining?'meal-ready':stage,orderKind:dining?'dining':'bath',dishId:'ramen',price:8,side:'men',blendId:JAPAN_BATH_BLENDS[0].id,tokenId:'qa-token',poolId:pool.id,restSeatId:dining?seat.id:rest.id,mealPoint:[0,4.8,7.55],diningPoint:(dining?seat:rest).anchor,blendReceived:stage==='bathing',mealRequested:['meal-ready','eating'].includes(stage)};
 let mounted=dining&&!empty?seat:['meal-ready','eating','resting','bathing'].includes(stage)?rest:null;
 const progress={blend:{code:'ready',text:'浴包已备妥'},meal:{code:'ready',text:'餐点已送来'}};
 const service={menu:JAPAN_DINING_MENU,blends:JAPAN_BATH_BLENDS,state:()=>({visit,cash:30,currency:'japan',progress,soakSeconds:8,soakReady:false,payment:'reserved'}),cancel(){visit=null;log('模拟取消服务');},stopActivity(){},register:()=>({ok:true}),change:()=>({ok:true}),wash:()=>({ok:true}),collectBlend:()=>({ok:true}),orderMeal:()=>({ok:true}),eat:()=>({ok:true}),returnToken:()=>({ok:true}),orderDining:()=>({ok:true})};
 const ui=createJapanPlayerServiceUI({service,furniture:{items:[seat,rest,pool]},getPlayer:()=>player(empty?(dining?P.ramenCounter:P.playerReception):(mounted?.position||P.menReceive)),getMounted:()=>mounted,onIntent:i=>log(i.action),onFurniture:i=>{mounted=i;log('模拟家具 '+i.id);},onStand:()=>{mounted=null;},document:doc});
 return wrap(ui,()=>ui.open(dining?'dining':'bath'));
}
function lodging(stage,{document:doc,log}){
 let s={revision:1,cash:30,booking:stage==='choose'?null:{id:'qa-stay',stage:stage==='waiting'?'waiting':'active',roomId:'lan',price:12,endsAt:2040},hostAvailable:true,atCounter:true,rooms:[{id:'lan',name:'兰房',price:12,available:true},{id:'zhu',name:'竹房',price:12,available:false,dirty:true}]};
 const service={view:()=>s,atCounter:()=>true,confirm(id){s={...s,revision:s.revision+1,booking:{id:'qa-stay',stage:'waiting',roomId:id,price:12}};return {ok:true};},cancel(){s={...s,revision:s.revision+1,booking:null};return {ok:true};},checkout(){s={...s,revision:s.revision+1,booking:null};return {ok:true};}};
 return wrap(createChinaTavernLodgingUI({service,getPlayer:()=>player([22.35,.215,6.7]),onIntent:i=>log(i.action),onRoom:id=>log('模拟前往 '+id),canShow:()=>false,document:doc}));
}
function property(stage,{document:doc,log}){
 const owned=['owner','listing','ledger'].includes(stage);let s={revision:1,ownerId:owned?'player':'cn-tavern-host',ownerName:owned?'你':'许安',bank:900,balance:80,revenue:64,paidWages:12,salonRevenue:30,performerPaid:15,events:[],npcNames:{'cn-tavern-host':'许安',buyer1:'文晏',buyer2:'沈叙',buyer3:'陆昭'},npcFunds:{buyer1:1000,buyer2:1000,buyer3:1000},market:{ownership:1,day:1,price:360,application:stage==='accepted'?{status:'accepted',amount:360}:null,offers:owned?[1,2,3].map((n)=>({id:'offer'+n,buyerId:'buyer'+n,amount:360-n*10,status:'open'})):[]}};
 const ok=()=>{s.revision++;return {ok:true};};const api={state:()=>s,refreshDay:()=>({ok:true}),applyPurchase(amount){s.market.application={status:'accepted',amount};return {...ok(),application:s.market.application};},confirmPurchase(){s.ownerId='player';s.ownerName='你';return ok();},invest(n){s.balance+=n;s.bank-=n;return ok();},draw(n){s.balance-=n;s.bank+=n;return ok();},setPrice(n){s.market.price=n;return ok();},replyOffer(id,accept){s.market.offers.find(o=>o.id===id).status=accept?'accepted':'rejected';return ok();}};
 const ui=createChinaTavernPropertyUI({property:api,notify:log,document:doc});return wrap(ui,()=>{ui.open();if(stage==='listing')clickText(doc,'挂牌改价');if(stage==='ledger')clickText(doc,'账簿');});
}
function salon(stage,{document:doc,log}){
 let session=stage==='choose'?null:{id:'qa-salon',actorId:SALON_ARTISTS[0].id,activity:'poetry',fee:6,stage,payment:stage==='accepted'?'unpaid':stage==='visiting'?'settled':'reserved'};
 const candidates=()=>SALON_ARTISTS.map(a=>({...a,ageYears:a.age,available:!session,activities:[{id:a.activity,...SALON_ACTIVITIES[a.activity],fee:6}],status:'歇场待客'}));
 const service={view:()=>({session,cash:30,candidates:candidates(),rooms:[{id:'lan',name:'兰房',claim:null},{id:'zhu',name:'竹房',claim:null}],label:session?'本次茶叙':'选择艺者'}),atReception:()=>true,active:()=>!!session,recoverPayments(){},displayState:()=>({active:!!session,fade:false}),request(id,activity,fee){session={id:'qa-invite',actorId:id,activity,fee,stage:'invited',payment:'unpaid'};log('模拟邀请');return true;},startEscort(){session.stage='escort';session.payment='reserved';return true;},cancel(){session=null;return true;}};
 return wrap(createChinaTavernSalonUI({service,getPlayer:()=>player([24.15,7.815,7.65]),document:doc}));
}
function performance(stage,{document:doc,log}){
 const artist=PERFORMANCE_CAST[1],activity=artist.activities[0];let order=stage==='choose'?null:{id:'qa-performance',artistId:artist.id,activity,drink:PERFORMANCE_DRINKS[0].id,fee:10,actFee:6,drinkFee:4,status:stage,paid:stage==='performing',actComplete:stage==='performing',drinkComplete:false,currency:'japan'};
 const service={view:()=>({order,cash:30,currency:'japan',candidates:PERFORMANCE_CAST.slice(1).map(a=>({...a,available:!order,activities:a.activities.map(id=>PERFORMANCE_ACTIVITIES[id])})),drinks:PERFORMANCE_DRINKS}),atReception:()=>true,active:()=>!!order,recoverPayments(){},seat:()=>({id:'qa-seat'}),request(id,act,drink){log('模拟邀请 '+id);order={id:'qa-invite',artistId:id,activity:act,drink,fee:10,status:'invited'};},confirm:()=>true,cancel(){order=null;return true;}};
 return wrap(createJapanPerformanceUI({service,getPlayer:()=>player([4.3,7.6,-4.6]),onFurniture:i=>log('模拟入座'),onStand:()=>{},document:doc}));
}
function court(stage,{document:doc,log}){
 let card={stage,blockers:[],physical:{heraldPresent:true},titleId:stage==='appointed'?'consort':null,residence:stage==='appointed'?'south':null};const target={id:'qa-court',position:[1,.2,1],radius:1.1};
 const service={statusCard:()=>card,interactionTarget:()=>target,respond(choice){card={...card,stage:choice==='accept'?'accepted':'declined'};return {ok:true};},withdraw(){card.stage='withdrawn';return {ok:true};}};
 return wrap(createChinaConsortPetitionUI({service,getPlayer:()=>player(target.position),getDetails:()=>({seat:{occupied:3,capacity:4},residenceTarget:target,meal:{remaining:4,capacity:6,target}}),getLedger:()=>({history:()=>[]}),onIntent:i=>{log('模拟 '+i.action);return true;},document:doc}));
}
function labor(country,stage,{document:doc,log}){
 const clock={day:1,hour:8,seconds:0},careers=createFormalCareers({worldSeed:26,getClock:()=>clock,saveState:()=>{}}),ledger=createCurrencyLedger({saveState:()=>{}});let ui;
 if(country==='china'){
  const employment=createChinaTavernEmployment({saveState:()=>{},getJob:()=>ui?.view().job,meetHost:()=>ui.meetRegistrationHost()});
  ui=createChinaTavernLabor({getPlayer:()=>player([22.35,.215,6.7]),host:{walking:false,root:{position:{x:24.1,y:.215,z:6.4}},station:{npcPosition:[24.1,.215,6.4]}},employment,careers,copperLedger:ledger,getClock:()=>clock,saveState:()=>{},document:doc,onIntent:i=>log(i.action),openRegistration:log});
 }else{
  const employment=createFranceGardenerEmployment({saveState:()=>{},getJob:()=>ui?.view().job,meetHost:()=>ui.meetHost()}),gardener={loanState:()=>({owner:null,borrowed:false}),hostReady:()=>true,requestMeeting:()=>true,releaseMeeting(){},reserveTools:()=>true,releaseTools(){},takeCan:()=>true,returnCan(){}};
  ui=createFranceGardenerLabor({gardener,employment,careers,copperLedger:ledger,getClock:()=>clock,getPlayer:()=>player(G.registration),saveState:()=>{},document:doc,onIntent:i=>log(i.action),openRegistration:log});
 }
 return wrap(ui,()=>{ui.open();if(stage==='formal')Array.from(doc.querySelectorAll('button')).find(b=>b.textContent.startsWith('长期职位'))?.click();});
}
const cases=[];const add=(group,prefix,states,fn)=>{for(const [stage,label]of states)cases.push({id:prefix+'-'+stage,label,group,mount:args=>fn(stage,args)});};
for(const [country,label]of [['china','中国食单'],['france','法国食单'],['egypt','埃及食单']])add(label,country+'-meal',[['choose','选餐/确认'],['poor','不足额提示'],['ready','餐点已到/取消'],['eating','在餐/收餐']],(stage,args)=>meal(country,stage,args));
add('日本食与汤','japan-service',[['dining-choose','一楼点餐'],['dining-ready','一楼已送餐'],['bath-choose','登记/选浴包'],['changing','更衣'],['washing','清洗'],['waiting-bath','领取浴包'],['bathing','泡汤/离池'],['resting','休息廊点面'],['meal-ready','配餐/用餐'],['checkout','归还浴牌']],japan);
add('住宿','lodging',[['choose','订房'],['waiting','留房/全退'],['active','入住/退房']],lodging);
add('产权','property',[['visitor','申请购买'],['accepted','确认付款'],['owner','买方报价/拒绝/出售'],['listing','挂牌改价/撤牌'],['ledger','账簿滚动']],property);
add('中国雅集','salon',[['choose','艺者/活动'],['accepted','同意/预留'],['escort','进行中/退款'],['visiting','已结算/告辞']],salon);
add('日本演艺','performance',[['choose','艺者/饮品'],['accepted','同意/预留'],['performing','部分完成/退款']],performance);
add('宫廷面板','court',[['none','自荐'],['awaiting-choice','接受/婉拒'],['appointed','住所/御膳/请辞']],court);
for(const country of ['china','france'])add(country==='china'?'中临工':'法园艺',country+'-labor',[['temporary','临时帮工'],['formal','长期职位']],(stage,args)=>labor(country,stage,args));
cases.push({id:'object-menu-counter',group:'共享物件菜单',label:'柜台多项/关闭/滚动',mount:({document:doc,log})=>{
 const button=doc.createElement('button'),root=doc.createElement('div');button.className='touch-action';root.id='labels';doc.body.append(button,root);
 const frame=()=>syncUiViewport(doc),actions=['查看食单','查看住宿','查看岗位','查看产权','交谈'].map((action,i)=>({id:'qa-action-'+i,provider:'qa-counter',targetName:'原柜台',action,position:[0,0,0]}));
 const ui=createObjectActionMenu({button,root,document:doc,onSelect:a=>log(a.action),resolveAnchor:()=>({id:'qa-counter',kind:'hand'}),projectAnchor:()=>({visible:true,x:300,y:160}),validate:()=>true,layout:{frame,rects:()=>[]}});
 return wrap(ui,()=>{ui.update(actions);ui.project();ui.activateTarget('qa-counter');});
}});
export const serviceCases=cases;
