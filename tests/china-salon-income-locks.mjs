import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaSalonReceptionAccount} from '../source/game/china-salon-reception-account.js';
import {SALON_RECEPTION_ROLE as ROLE} from '../source/game/china-salon-reception-role.js';
import {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {createChinaOfficialSalonPayments} from '../source/game/china-official-salon-payments.js';
const copy=structuredClone,artistId='cn-tavern-reciter',customerId=CHINA_OFFICIAL_IDS[5],policy={version:1,performerShareBps:5000,rounding:'floor'};
// Exact proof/service shape from tests/china-salon-reception-account.mjs.
const proof=(n=1)=>({kind:'salon-reception-work',version:1,sessionId:`cn-salon-1-${n}`,actorId:ROLE.incumbentId,roleId:ROLE.id,slotId:ROLE.slotId,holderRevision:0,contractVersion:1,amount:8,customerId:'player',artistId,activity:'poetry',fee:20,roomId:'tavern-guest-lan',steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:2},completed:true});
const service=p=>({id:p.sessionId,actorId:p.artistId,customerId:p.customerId,activity:p.activity,fee:p.fee,roomId:p.roomId,incomePolicy:policy,completed:true,receptionWork:p});
function playerFixture(input={},payer='player'){
 const saved=copy({chinaServiceWorld:{till:0},copperLedger:{version:1,cash:1000,bank:900,accountOpened:true,nextTransaction:1,transactions:[]},...input});
 let durable=copy(saved),economy,property,account,activeProof=null,hook=null,writes=0,failure=null,lastIncome=null;
 const storage={setItem(key,text){const callback=hook;hook=null;callback?.();if(failure==='false')return false;if(failure==='object')return {ok:false,code:'storage-rejected'};if(failure==='throw')throw Error('quota');if(failure==='promise')return Promise.resolve();if(failure==='reject')return Promise.reject(Error('unsupported'));durable=JSON.parse(text);writes++;return true;}};
 const store=patch=>{const result=storage.setItem('worlds-days-v1',JSON.stringify({...saved,...patch}));if(result===false||result?.ok===false||result?.then)return result;Object.assign(saved,copy(patch));return true;};
 const ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>tx.action==='settle'?(lastIncome=economy.prepareIncome(tx,activeProof)):property?.prepareCurrencyCommit(tx)});
 const official=createChinaOfficialEconomy({saved:saved.chinaOfficialEconomy,getDay:()=>20,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),saveState:(next,tx,patch={})=>store({...patch,chinaOfficialEconomy:next})});
 economy=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,copperLedger:ledger,officialEconomy:official,getReceptionAccount:()=>account,saveState:(next,record,patch)=>store({...patch,chinaSalonEconomy:next})});
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>({day:0}),getTill:()=>saved.chinaServiceWorld.till+economy.summary().businessProceeds,getReceptionAccount:()=>account,saveState:next=>store({chinaTavernProperty:next})});
 account=createChinaSalonReceptionAccount({saved:saved.chinaSalonReceptionAccount,getSalonIncome:()=>economy.snapshot(),getProperty:()=>property,saveState:(next,record,patch)=>store({...patch,chinaSalonReceptionAccount:next})});
 const officialPrepare=economy.prepareOfficialIncome;economy.prepareOfficialIncome=(...args)=>(lastIncome=officialPrepare(...args));
 const port=createChinaOfficialSalonPayments({officialEconomy:official,artistEconomy:economy});
 const scenarioProof=n=>payer==='player'?proof(n):{...proof(n),sessionId:'cn-salon-npc-'+n,customerId};
 return {ledger,official,economy,property,account,port,payer,proof:scenarioProof,
  get durable(){return copy(durable);},get writes(){return writes;},get lastIncome(){return lastIncome;},fail:mode=>failure=mode,hook:callback=>hook=callback,
  pay(day){return official.completeDuty({actorId:customerId,day,receiptId:`cn-official-duty:${customerId}:${day}`,evidence:{kind:'office-work',completed:true,actorId:customerId,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}});},
  reserve(n){const p=scenarioProof(n);return payer==='player'?ledger.reserve(p.fee,p.sessionId):port.reserve(service(p));},
  settle(n,withWork=true){const p=scenarioProof(n);activeProof=service(p);if(!withWork)delete activeProof.receptionWork;return payer==='player'?ledger.settle(p.sessionId):port.settle(activeProof,{elapsed:2.2});}
 };
}
const view=f=>({artist:f.economy.account(artistId).bank,reception:f.account.account().bank,property:f.property.state().balance,artistMeals:f.economy.snapshot().mealTransfers.length,receptionMeals:f.account.snapshot().mealTransfers.length});
for(const target of ['artist','reception']){
 const f=playerFixture();assert(f.reserve(1).ok);assert(f.settle(1).ok);assert(f.reserve(2).ok);const before=view(f);let nested;
 f.hook(()=>{const e=target==='artist'?f.economy:f.account;nested=e.prepareMealPayment({actorId:target==='artist'?artistId:ROLE.incumbentId,orderId:'cn-tavern-order-1',amount:6});assert.equal(nested.ok,false,'source income save must lock '+target+' meal preparation');});
 assert(f.settle(2).ok);const live=view(f),loaded=playerFixture(f.durable);assert.deepEqual(view(loaded),live);assert.equal(live.artist,before.artist+10);assert.equal(live.reception,before.reception+8);assert.equal(live.property,before.property+2);assert.equal(live.artistMeals,0);assert.equal(live.receptionMeals,0);assert.equal(loaded.account.loadError,null);
 console.log('PASS player income save locks '+target+' and preserves all four legs identically across reload');
}
// Real payroll + official service port reused from tests/china-official-salon-income.mjs.
function officialFixture(input={}){
 let saved=copy(input),hook=null,writes=0;
 const store=patch=>{const next={...saved,...copy(patch)},callback=hook;hook=null;callback?.();saved=next;writes++;return true;};
 const official=createChinaOfficialEconomy({saved:saved.chinaOfficialEconomy,getDay:()=>20,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),saveState:(next,tx,patch={})=>store({...patch,chinaOfficialEconomy:next})});
 const artist=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,officialEconomy:official,saveState:(next,tx,patch={})=>store({...patch,chinaSalonEconomy:next})});
 const pay=day=>official.completeDuty({actorId:customerId,day,receiptId:`cn-official-duty:${customerId}:${day}`,evidence:{kind:'office-work',completed:true,actorId:customerId,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}});
 const port=createChinaOfficialSalonPayments({officialEconomy:official,artistEconomy:artist});
 return {official,artist,pay,port,get saved(){return copy(saved);},get writes(){return writes;},hook:callback=>hook=callback};
}
{
 const f=officialFixture();for(let day=0;day<2;day++)assert(f.pay(day).ok);
 const session=n=>({id:`cn-salon-npc-${n}`,customerId,actorId:artistId,activity:'poetry',fee:20,incomePolicy:policy});
 assert(f.port.reserve(session(1)).ok);assert(f.port.settle(session(1),{elapsed:2.2}).ok);assert(f.port.reserve(session(2)).ok);
 let nested;f.hook(()=>{nested=f.artist.prepareMealPayment({actorId:artistId,orderId:'cn-tavern-order-1',amount:6});assert.equal(nested.ok,false,'official income save must lock artist meal preparation');});
 assert(f.port.settle(session(2),{elapsed:2.2}).ok);assert.equal(f.official.salonHold(session(2).id).status,'settled');assert.equal(f.artist.account(artistId).bank,20);const loaded=officialFixture(f.saved);assert.equal(loaded.artist.account(artistId).bank,20);assert.equal(loaded.artist.snapshot().mealTransfers.length,0);assert.equal(loaded.artist.loadError,null);
 console.log('PASS official income save locks artist until source and income adoption, without partial settled-source failure');
}
const full=f=>({artist:f.economy.snapshot(),reception:f.account.snapshot(),property:f.property.snapshot(),payer:f.payer==='official'?f.official.snapshot():f.ledger.snapshot(),durable:f.durable});
const fund=f=>{if(f.payer==='official')for(let d=0;d<3;d++)assert(f.pay(d).ok);assert(f.reserve(1).ok);assert(f.settle(1).ok);assert(f.reserve(2).ok);};
for(const payer of ['player','official']){
 for(const mode of ['false','object','throw','promise','reject']){
  const f=playerFixture({},payer);fund(f);const before=full(f);f.fail(mode);assert.equal(f.settle(2).ok,false);assert.deepEqual(full(f),before,'every failed save keeps all four journals and source reservation unchanged');f.fail(null);assert(f.settle(2).ok);const restored=playerFixture(f.durable,payer);assert.deepEqual(view(restored),view(f));assert.equal(f.economy.account(artistId).bank,20);assert.equal(f.account.account().bank,16);assert.equal(f.property.state().balance,124);
 }
 const f=playerFixture({},payer);fund(f);f.fail('false');assert.equal(f.settle(2).ok,false);f.fail(null);
 const income=f.lastIncome,settlementReceipt=income.patch.chinaSalonEconomy.receipts.at(-1),args={proof:f.proof(2),settlementReceipt},wage=f.account.prepareWage(args),expense=f.property.prepareReceptionWage(args),artistMeal=f.economy.prepareMealPayment({actorId:artistId,orderId:'cn-tavern-order-11',amount:6}),receptionMeal=f.account.prepareMealPayment({actorId:ROLE.incumbentId,orderId:'cn-tavern-order-12',amount:6}),business=f.property.prepareCurrencyCommit({action:'wage',currency:'copper',roleId:'cn-tavern-helper',amount:1,day:0,requestId:'preprepared-business-wage'});
 assert([income,wage,expense,artistMeal,receptionMeal,business].every(p=>p.ok&&p.valid()));
 const old=view(f);f.hook(()=>{
  for(const p of [income,wage,expense,artistMeal,receptionMeal,business]){assert.equal(p.valid(),false);const result=p.committed();assert(result===false||result?.ok===false,'preprepared candidate cannot adopt under another source lock');}
  assert.equal(artistMeal.commit().ok,false);assert.equal(receptionMeal.commit().ok,false);assert.equal(f.property.refreshDay().ok,false);assert.equal(f.account.prepareWage(args).ok,false);assert.equal(f.property.prepareCurrencyCommit({action:'wage',currency:'copper',roleId:'cn-tavern-helper',amount:1,day:0,requestId:'reentrant-business-wage'}).ok,false);assert.equal(f.economy.prepareIncome({},service(f.proof(3))).ok,false);assert.deepEqual(view(f),old);
 });assert(f.settle(2).ok);assert.deepEqual(view(playerFixture(f.durable,payer)),view(f));assert.equal(f.economy.account(artistId).bank,20);assert.equal(f.account.account().bank,16);
 for(const target of ['artist','reception']){
  const g=playerFixture({},payer);fund(g);g.fail('false');assert.equal(g.settle(2).ok,false);g.fail(null);const pending=g.lastIncome,receipt=pending.patch.chinaSalonEconomy.receipts.at(-1),salary=g.account.prepareWage({proof:g.proof(2),settlementReceipt:receipt}),cost=g.property.prepareReceptionWage({proof:g.proof(2),settlementReceipt:receipt});
  const account=target==='artist'?g.economy:g.account,id=target==='artist'?artistId:ROLE.incumbentId;
  g.hook(()=>{assert.equal(g.settle(2).ok,false);assert.equal(pending.committed(),false);assert.equal(salary.committed(),false);assert.equal(cost.committed(),false,'detached expense cannot independently adopt before its source save');});
  assert(account.prepareMealPayment({actorId:id,orderId:'cn-tavern-order-15',amount:6}).commit({chinaServiceWorld:{till:0,meal:'reserved'}}).ok);assert.equal(g.economy.account(artistId).bank,target==='artist'?4:10);assert.equal(g.account.account().bank,target==='reception'?2:8);assert(g.settle(2).ok);const restored=playerFixture(g.durable,payer);assert.deepEqual(view(restored),view(g));assert.equal(g.economy.account(artistId).bank,target==='artist'?14:20);assert.equal(g.account.account().bank,target==='reception'?10:16);assert.equal(g.property.state().balance,124);
 }
 console.log('PASS '+payer+' all four-leg false/object/throw/Promise/reject failure releases, prepared hooks blocked, inverse meal→income/wage/expense cannot overwrite, and retry/reload preserve every receipt');
}
