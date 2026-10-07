// T05 isolated browser fixtures: actual product UI constructors and styles.
// Business state is disposable, in-memory QA data, never a production save.
// Static module/CSS/ticket-image requests are expected; no API calls or WebGL.
// Based on wallet-ui, travel-passport, career-handbook, study-choices,
// player-conversation-runtime and china-money-house-banking test fixtures.
import {createCurrencyLedger, GAME_CURRENCIES} from '../game/currency-ledger.js';
import {createCurrencyWallet} from '../game/wallet.js';
import {createTravelPassport} from '../game/travel-passport.js';
import {createCareerHandbook} from '../game/career-handbook.js';
import {createFormalCareers, FORMAL_CAREER_ROLES} from '../game/formal-careers.js';
import {createStudyMenu} from '../game/study-menu.js';
import {createPlayerConversationUI} from '../game/player-conversation-ui.js';
import {createBankCounterService} from '../game/china-money-house-service.js';
import {CHINA_MONEY_HOUSE} from '../game/china-money-house.js';
import {JAPAN_EXCHANGE_COUNTER} from '../game/japan-exchange-counter.js';
import {FRANCE_EXCHANGE_COUNTER} from '../game/france-exchange-counter.js';
import {EGYPT_EXCHANGE_COUNTER} from '../game/egypt-exchange-counter.js';

const COUNTRIES={china:'中国',japan:'日本',france:'法国',egypt:'埃及'};
const COUNTERS={china:CHINA_MONEY_HOUSE,japan:JAPAN_EXCHANGE_COUNTER,france:FRANCE_EXCHANGE_COUNTER,egypt:EGYPT_EXCHANGE_COUNTER};
const clone=value=>structuredClone(value);
const position=([x=0,y=0,z=0]=[])=>({x,y,z,toArray(){return [this.x,this.y,this.z];}});
const report=(log,type,value)=>log?.(`${type}${value===undefined?'':` · ${typeof value==='string'?value:JSON.stringify(value)}`}`);
const mounted=(ui,{open=()=>ui.open(),cleanup=()=>{},...extra}={})=>({ui,open,...extra,dispose(){ui.dispose();cleanup();}});
const define=(id,label,group,mount)=>({id,label,group,mount});

function memoryLedger(log,mode='funded'){
  let active=false,lastSave=null;
  const ledger=createCurrencyLedger({
    ...(mode==='invalid'?{saved:{version:2,balances:{}}}:{}),
    saveState:next=>{lastSave=clone(next);if(active)report(log,'模拟账本已记账',ledger.history().length+1);return true;},
    onTransaction:tx=>{if(active)report(log,'模拟交易',{action:tx.action,currency:tx.currency,amount:tx.amount,quote:tx.quote});},
  });
  if(mode==='funded'||mode==='bank-only')for(const currency of Object.keys(GAME_CURRENCIES)){
    ledger.creditWageToBank({currency,amount:240,receiptId:`qa-seed-wage:${currency}`,roleId:'qa-worker',slotId:'qa-seat',day:1});
    if(mode==='funded')ledger.withdraw(currency==='copper'?123:48,`qa-seed-cash:${currency}`,currency);
  }
  if(mode==='funded')ledger.reserve(3,'qa-pending-meal','copper');
  active=true;
  return {ledger,snapshot:()=>clone(lastSave)};
}

function walletCase(mode){return ({document:doc,log})=>{
  const mount=doc.createElement('div');doc.body.append(mount);
  const {ledger,snapshot}=memoryLedger(log,mode);
  const ui=createCurrencyWallet({mount,ledger,document:doc,getCurrency:()=> 'copper',onOpen:()=>report(log,'钱包打开'),onClose:()=>report(log,'钱包关闭')});
  return mounted(ui,{cleanup:()=>mount.remove(),snapshot});
};}

function bankCase(country,mode='funded'){return ({document:doc,log})=>{
  const counter=COUNTERS[country],player={root:{position:position(counter.points.counter)}};
  const teller={station:{id:counter.stationId,position:counter.points.counter},root:{position:position(counter.points.teller),rotation:{y:0},userData:{}},animate(){}};
  const {ledger,snapshot}=memoryLedger(log,mode);
  const ui=createBankCounterService({npcs:[teller],lot:{moneyHouse:{}},counter,getPlayer:()=>player,
    poseContext:()=>({}),copperLedger:ledger,bodyManaged:true,canSee:()=>true,document:doc,
    notify:text=>report(log,'模拟柜台提示',text),onOpen:()=>report(log,'钱庄打开',country),onClose:()=>report(log,'钱庄关闭',country)});
  return mounted(ui,{snapshot});
};}

function passportCase(mode='filled'){return ({document:doc,log})=>{
  const trigger=doc.createElement('button');trigger.type='button';trigger.className='ww-passport-hud';trigger.textContent='旅行护照';doc.body.append(trigger);
  const progress={nickname:'测试旅居者',visited:mode==='empty'?[]:['japan','china','egypt','france'],stamps:mode==='empty'?{}:{
    japan:['jp-welcome','jp-onsen','jp-flowers','jp-tea'],china:['cn-tea','cn-calligraphy','cn-rest'],
    egypt:mode==='continuation'?Array.from({length:18},(_,i)=>`qa-old-activity-${i}`):['egypt-papyrus','egypt-bread','egypt-garden'],
    france:['france-bakery','france-atelier','france-cafe'],
  }};
  const ui=createTravelPassport({trigger,document:doc,getProgress:()=>clone(progress),getClock:()=>({day:12,hour:13.25}),
    // A 3D portrait is deliberately unavailable in this no-WebGL fixture.
    // The product's own pending-photo state is retained, not fabricated art.
    getPortrait:()=>null,onOpen:()=>report(log,'护照打开','点封面与书页角可顺序访问四国页'),onClose:()=>report(log,'护照关闭')});
  return mounted(ui,{cleanup:()=>trigger.remove(),snapshot:()=>clone(progress)});
};}

function careerCore(log,{limited=false,capped=false,invalid=false}={}){
  const clock={day:4,hour:8.25,seconds:0};
  const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();
  for(const skill of Object.keys(initial.skills)){
    initial.skills[skill]=capped?(['ritual','writing'].includes(skill)?50:100):3;
    initial.skillXP[skill]=capped?0:12;
    initial.daily[skill]=limited?4:0;
  }
  initial.daily.day=limited?clock.day:null;
  initial.lowerWork['cn-pharmacy-labor']=1;
  let saved=clone(initial);
  const core=createFormalCareers({worldSeed:785,saved:invalid?{version:10}:initial,getClock:()=>clock,
    saveState:next=>{saved=clone(next);report(log,'模拟职业记录',next.revision);return true;},creditWageToBank:()=>({ok:true})});
  return {core,clock,snapshot:()=>clone(saved)};
}

const ACTIONS={
  view:'查看任职登记', 'formal-view':'查看任职登记', apply:'提交职位申请','formal-apply':'提交职位申请',
  review:'当面呈上履历并接受考核','formal-review':'当面确认职责并接受审核',
  'receive-document':'领取任命文书',appointment:'宣读任命文书并受职',
  accept:'到岗报到',attend:'前往朝班报到','end-shift':'交回本班并核薪',archive:'归档朝班文书',settle:'领取本班工资',
  resign:'办理离职','formal-resign':'办理离职',cancel:'取消未开始的安排',
  'current-work':'核对同号原单并继续当前工作', 'choose-plan':'问询完成，选择照护单',
  'salon-discuss':'回应诗中远行题意', 'salon-recite':'继续诵读当前篇章',
};

// These are small physical-service API fixtures, not alternate UI markup.
// They provide only the current job and current intent; no 3D actors run here.
function careerServices(core,clock,{workingRole=null,special=null}={}){
  const services=new Map();
  for(const role of FORMAL_CAREER_ROLES){
    const receiptId=`${role.workSource||role.id}-qa-1`;
    const live={job:role.id===workingRole&&role.workSource?{formalRoleId:role.id,receiptId,stage:'working',shiftKind:'continuous',coveredSeconds:420,completedTasks:2,completedOrders:1,requiredOrders:2}:null,
      supply:{remaining:117,wasted:1},shift:role.id===workingRole,quote:20,income:60,progressSeconds:4};
    if(role.id===workingRole&&role.id==='cn-salon-poet')live.order={id:'qa-salon-order',customerName:'模拟来客 · 林舟',request:'river',fee:20,stage:special==='reciting'?'reciting':'discussion'};
    if(role.id===workingRole&&role.id==='cn-clinic-physician')live.patient={number:3,recipientName:'模拟来客 · 顾谨',symptoms:['虚构游戏不适：云纹疲乏','已核对原单与本人'],mismatch:false,selectedPlanId:null,acting:false,plans:[{id:'cloud',name:'云纹照护单'},{id:'leaf',name:'叶纹照护单'}]};
    const intent=kind=>{
      kind=kind|| (live.job?role.id==='cn-clinic-physician'?'choose-plan':role.id==='cn-salon-poet'?special==='reciting'?'salon-recite':'salon-discuss':'current-work':role.id==='cn-court-clerk'?'attend':'accept');
      if(kind==='cancel'&&!live.job)return null;
      return {id:`qa:${role.id}:${kind}`,provider:'qa-memory',roleId:role.id,kind,intentKey:`qa:${role.id}:${kind}`,action:ACTIONS[kind]||(kind.startsWith('plan:')?'书写所选照护单':kind==='garden-trim'?'修剪当前黄杨篱':kind==='garden-water'?'浇护当前玫瑰畦':kind),position:[0,0,0],executionRadius:.9,...(kind==='choose-plan'?{work:{kind:'choose'}}:{})};
    };
    services.set(role.id,{state:()=>clone(live),atRegistration:()=>true,intent,reviewerName:()=> '陆衡',holderName:()=> '沈砚',identityKey:()=> 'qa-stable-holder',
      formal:{role,beginAvailability:()=>({ok:true,unchanged:!!live.job})},
      taskChoices:()=>role.id==='fr-garden-assistant'&&live.job?[{kind:'garden-water',action:'浇护当前玫瑰畦',detail:'原壶 · 西侧第一畦'},{kind:'garden-trim',action:'修剪当前黄杨篱',detail:'原剪 · 连廊边新梢'}]:[],
      workChoices:()=>role.id==='cn-salon-poet'?[special==='reciting'?'salon-recite':'salon-discuss']:[],
      run(request){if(request.kind.startsWith('plan:')&&live.patient){live.patient.selectedPlanId=request.kind.slice(5);live.patient.acting=true;live.patient.plans=[];}
        else if(request.kind==='end-shift'){live.job=null;live.shift=false;}
        else if(live.job){live.job.completedTasks++;live.job.coveredSeconds+=30;}
        return clone(live);},
    });
  }
  return services;
}

function careerCase(country,{roleId=null,held=false,working=false,special=null,pending=false}={}){return ({document:doc,log})=>{
  const {core,clock,snapshot}=careerCore(log),role=FORMAL_CAREER_ROLES.find(r=>r.id===roleId);
  if(held&&roleId==='cn-court-clerk'){
    const application=core.apply(roleId,{ageYears:22});
    for(const step of ['interview','receive-document','appointment'])core.reviewApplication(roleId,{ageYears:22,applicationId:application.applicationId,step});
  }
  const services=careerServices(core,clock,{workingRole:working?roleId:null,special});
  let view=null;
  if(held){
    // Display-only current-work snapshots intentionally bypass world/admission
    // simulation. The live UI still owns layout, buttons and dismissal.
    view=core.state();view.tenure=view.tenure||{roleId,slotId:role.slotId,sinceDay:3,sinceHour:8};
    if(working&&role.paymentKind!=='commission')view.lastDuty={roleId,slotId:role.slotId,day:clock.day,arrivalHour:8,stage:roleId==='cn-court-clerk'?'archive':'working',started:true,reason:null,wage:null,
      workReceiptId:`${role.workSource||role.id}-qa-1`,shiftKind:'continuous',coveredSeconds:420,completedTasks:2,customerReviews:[]};
  }
  const careers=view?{...core,state:()=>clone(view),workState:()=>clone(view),currentRole:()=>clone(role),
    beginDutyAvailability:()=>({ok:true,unchanged:working}),isHired:id=>id===roleId,
    applicationResult:()=>null,applicationHistory:()=>[],promotionSummary:()=>roleId==='cn-court-clerk'?core.promotionSummary():null,
  }:core;
  if(pending)core.apply(roleId,{ageYears:22});
  const player={ageYears:22,root:{position:position()}},getService=id=>services.get(id);
  let ui;
  const openInitial=()=>ui.open(roleId&&!held?{scope:'catalogue',roleId}:false);
  ui=createCareerHandbook({careers,copperLedger:{state:()=>({cash:120})},getClock:()=>clock,getCountry:()=>country,getPlayer:()=>player,getService,document:doc,
    onOpen:()=>report(log,'职业手册打开',held?'模拟在职状态':country),
    onIntent:request=>{
      report(log,'模拟现场动作',{roleId:request.roleId,kind:request.kind});
      if(request.registration){ui.open(request.registration);return;}
      if(view){services.get(request.roleId)?.run(request);view.revision++;return;}
      const id=request.roleId;
      if(['apply','formal-apply'].includes(request.kind))core.apply(id,{ageYears:22});
      else if(['review','formal-review','receive-document','appointment'].includes(request.kind))core.reviewApplication(id,{ageYears:22,applicationId:core.applicationResult(id)?.id,step:request.kind==='receive-document'?'receive-document':request.kind==='appointment'?'appointment':'interview'});
      else if(['resign','formal-resign'].includes(request.kind))core.resign();
      else if(['view','formal-view'].includes(request.kind)){ui.open({scope:'role',roleId:id});return;}
      else {services.get(id)?.run(request);return;}
      ui.open({scope:'role',roleId:id});
    }});
  ui.update('lot');
  return mounted(ui,{open:openInitial,snapshot:()=>view?clone(view):snapshot()});
};}

const STUDY_STATIONS={china:{id:'cn-rest',name:'雅集楼三层 · 藏书观景'},japan:{id:'jp-library',name:'霞汤屋 · 藏书处'},france:{id:'france-salon',name:'宫苑 · 藏书沙龙'},egypt:{id:'egypt-papyrus',name:'沙河神殿 · 纸莎草书案'}};
function studyCase(country,{mode='normal',station=null}={}){return ({document:doc,log})=>{
  const {core,clock,snapshot}=careerCore(log,{limited:mode==='limited',capped:mode==='capped',invalid:mode==='invalid'});
  const target=station||STUDY_STATIONS[country];
  const ui=createStudyMenu({careers:core,getClock:()=>clock,getCountry:()=>country,document:doc,
    onChoose:(place,lesson)=>report(log,'已选择模拟学习',{station:place.id,lesson}),onClose:()=>report(log,'学习面板关闭')});
  return mounted(ui,{open:()=>ui.open(target),snapshot});
};}

function conversationCase(country,pending=false){return ({document:doc,log})=>{
  let state=null,awaiting=pending;
  const actor={id:'qa-conversation-adult',name:country==='japan'?'澄江':country==='france'?'玛农':country==='egypt'?'达娜':'沈叙'};
  const social={
    begin:()=>{state={id:actor.id,name:actor.name,stage:'choosing',reply:pending?'刚才的交谈还未补记，可以重试。':'上次聊起近况，我还记得你说的话。你今天想谈些什么？'};return clone(state);},
    state:()=>state?clone(state):null,pending:()=>awaiting,
    choose:topic=>{state={...state,stage:'talking',topic};report(log,'已选择模拟话题',{country,topic});return true;},
    end:reason=>{state=null;report(log,'模拟交谈结束',reason||'retry');},
    retry:()=>{awaiting=false;report(log,'模拟补记完成');return {ok:true};},
  };
  const ui=createPlayerConversationUI({getSocial:()=>social,getCountry:()=>country,document:doc,onClose:()=>report(log,'话题面板关闭')});
  return mounted(ui,{open:()=>ui.open(actor),snapshot:()=>({state:state?clone(state):null,pending:awaiting})});
};}

export const globalCases=[
  define('wallet-four-currencies','钱包 · 四国真实票面，展开、选票与收拢','钱包',walletCase('funded')),
  define('wallet-bank-only','钱包 · 仅银行有余额，随身现金为空','钱包',walletCase('bank-only')),
  define('wallet-empty','钱包 · 无现金、无往来账','钱包',walletCase('empty')),
  define('wallet-unverified','钱包 · 账本无法核对提示','钱包',walletCase('invalid')),
  ...Object.keys(COUNTRIES).map(country=>define(`bank-${country}`,`${COUNTRIES[country]}钱庄 · 分配、兑换、币种选择与往来账`,'钱庄',bankCase(country))),
  define('bank-unopened','钱庄 · 免费立账、零余额与禁用分配','钱庄',bankCase('china','empty')),
  define('bank-unverified','钱庄 · 无法核对旧账','钱庄',bankCase('china','invalid')),
  define('passport-four-countries','护照 · 封面、资料、四国签证页（翻页查看）','护照',passportCase()),
  define('passport-empty','护照 · 空白旅程与未到访签证页','护照',passportCase('empty')),
  define('passport-continuation','护照 · 同国活动续页（埃及18条）','护照',passportCase('continuation')),
  ...Object.keys(COUNTRIES).map(country=>define(`career-catalogue-${country}`,`${COUNTRIES[country]}职业手册 · 所有登记点，点击进入岗位`,'职业',careerCase(country))),
  define('career-tavern-register','职业登记 · 酒楼两岗位与申请结果','职业',careerCase('china',{roleId:'cn-tavern-steward'})),
  define('career-clinic-register','职业登记 · 医馆两岗位与照护资格','职业',careerCase('china',{roleId:'cn-clinic-physician'})),
  define('career-royal-register','职业登记 · 御膳厨役原单资历门槛','职业',careerCase('china',{roleId:'cn-royal-kitchen-cook'})),
  define('career-court-pending','职业登记 · 礼务录事待面谈、领文与宣读','职业',careerCase('china',{roleId:'cn-court-clerk',pending:true})),
  ...[
    ['china','cn-tavern-steward','酒楼助理'],['japan','jp-reception-apprentice','汤馆接待'],
    ['france','fr-tea-server','宫苑侍茶'],['egypt','eg-kitchen-cook','尼罗厨房'],
    ['china','cn-pharmacy-apprentice','药铺助手'],['china','cn-royal-kitchen-cook','御膳厨役'],
  ].map(([country,roleId,label])=>define(`career-working-${roleId}`,`在职手册 · ${label}，唯一当前动作与交班`,'职业',careerCase(country,{roleId,held:true,working:true}))),
  define('career-court-employed','在职手册 · 官署归档、官品与实任履历','职业',careerCase('china',{roleId:'cn-court-clerk',held:true,working:true})),
  define('career-employed-idle','在职手册 · 未开班，仅报到动作','职业',careerCase('japan',{roleId:'jp-table-service',held:true})),
  define('career-garden-choices','在职手册 · 园艺当前维护选择','职业',careerCase('france',{roleId:'fr-garden-assistant',held:true,working:true})),
  define('career-clinic-plans','在职手册 · 医师问询与照护单选择','职业',careerCase('china',{roleId:'cn-clinic-physician',held:true,working:true})),
  define('career-salon-discussion','在职手册 · 诗词艺者题意回应','职业',careerCase('china',{roleId:'cn-salon-poet',held:true,working:true})),
  define('career-salon-reciting','在职手册 · 诗词艺者诵读进度','职业',careerCase('china',{roleId:'cn-salon-poet',held:true,working:true,special:'reciting'})),
  ...Object.keys(COUNTRIES).map(country=>define(`study-${country}`,`${COUNTRIES[country]}学习 · 本地书目、技能与开始按钮`,'学习',studyCase(country))),
  define('study-practice','学习 · 单项习字研习','学习',studyCase('china',{station:{id:'cn-calligraphy',name:'翰墨书房'}})),
  define('study-daily-limit','学习 · 今日奖励次数已用完','学习',studyCase('china',{mode:'limited'})),
  define('study-capped','学习 · 技能达到上限','学习',studyCase('china',{mode:'capped'})),
  define('study-unverified','学习 · 记录无法核对，开始按钮禁用','学习',studyCase('china',{mode:'invalid'})),
  ...Object.keys(COUNTRIES).map(country=>define(`conversation-${country}`,`${COUNTRIES[country]}人物交谈 · 三种本地话题与取消`,'交谈',conversationCase(country))),
  define('conversation-pending','人物交谈 · 待补记与重试','交谈',conversationCase('china',true)),
];
