import assert from 'node:assert/strict';
import {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS,CHINA_OFFICIAL_TAVERN_ID as TAVERN} from '../source/game/china-official-economy.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {SALON_ARTISTS} from '../source/game/china-tavern-salon-artists.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
const copy=structuredClone,[ID,OTHER]=CHINA_OFFICIAL_IDS,artist=SALON_ARTISTS[0],policy={version:1,performerShareBps:5000,rounding:'floor'};
const duty=(day,actorId=ID)=>({actorId,day,receiptId:`cn-official-duty:${actorId}:${day}`,evidence:{kind:'office-work',completed:true,actorId,day,elapsed:8,duration:8,audienceDay:day,audienceCompleted:true}});
const salon=(orderId='cn-salon-npc-1',amount=80)=>({actorId:ID,orderId,amount,artistId:artist.id,activity:artist.activity,incomePolicy:policy});
const completed=o=>({...o,evidence:{kind:'salon-service',completed:true,orderId:o.orderId,customerId:o.actorId,artistId:o.artistId,activity:o.activity,elapsed:2.2,duration:2.2}});
const meal={actorId:ID,orderId:'cn-tavern-order-3',amount:6};
function earnGuard(economy,day=5,hours=1.5,actorId=ID){const coverage=[{actorId,roleId:GUARD.id,slotId:GUARD.slotId,holderRevision:day}];let t=(day*1440+360-600)/RATE,end=t+hours*60/RATE;economy.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;economy.observe({seconds:t,dt,coverage});}assert(economy.checkpoint({day,hour:18}));}
function setup(saved,{fund=true,guestFirst=false,cash=0}={}){
 let game=copy(saved||{}),appointed=true,mode=null,onSave=null,writes=0;
 const save=patch=>{writes++;onSave?.();if(mode==='false')return false;if(mode==='throw')throw Error('quota');if(mode==='promise')return Promise.resolve(true);if(mode==='reject')return Promise.reject(Error('unsupported'));Object.assign(game,copy(patch));return true;};
 const official=createChinaOfficialEconomy({saved:game.chinaOfficialEconomy,isAppointed:id=>appointed&&CHINA_OFFICIAL_IDS.includes(id),getDay:()=>100,saveState:(s,r,p={})=>save({...p,chinaOfficialEconomy:s})});
 const guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:game.chinaGuardAccounts,saveState:(s,r,p={})=>save({...p,chinaGuardAccounts:s})});
 if(!saved&&fund){for(let day=1;day<=4;day++)assert(official.completeDuty(duty(day)).ok);assert(official.completeDuty(duty(1,OTHER)).ok);assert(official.prepareSalonReserve(salon()).commit().ok);for(let number=1;number<=2;number++)assert(official.prepareMealPayment({...meal,orderId:'cn-tavern-order-'+number}).commit().ok);earnGuard(guard);if(cash)assert(official.withdraw({actorId:ID,amount:cash,receiptId:'real-prior-withdrawal'}).ok);}
 const provider=official.mealFundsProvider(),providers=[{id:'china-official-economy',economy:provider},{id:'china-guard-accounts',economy:guard}];
 const aggregate=createNPCGuestAccounts(guestFirst?providers.slice().reverse():providers,{saved:game.chinaGuestMealAccounts,saveState:(s,p)=>save({...p,chinaGuestMealAccounts:s})});
 return {official,guard,provider,aggregate,get game(){return copy(game);},get writes(){return writes;},appoint:value=>appointed=value,fail:value=>mode=value,onSave:value=>onSave=value};
}
const state=f=>({official:f.official.snapshot(),guard:f.guard.snapshot(),journal:f.aggregate.snapshot(),game:f.game});
for(const cash of [0,3]){
 const f=setup(null,{cash});assert.equal(f.official.account(ID).cash+f.official.account(ID).bank,4);assert.equal(f.guard.account(ID).bank,3);assert.deepEqual(f.aggregate.account(ID),{cash,bank:7-cash});assert.equal(f.official.salonHold(salon().orderId).amount,80);assert.equal(f.official.salonHold(salon().orderId).status,'reserved');
 const before=state(f),candidate=f.aggregate.prepareMealPayment(meal);assert(candidate.ok);assert.equal(candidate.balanceAfter,1);assert.deepEqual(state(f),before);
 for(const mode of ['false','throw','promise','reject']){f.fail(mode);assert.equal(candidate.commit({chinaServiceWorld:{test:'paid'}}).ok,false);assert.deepEqual(state(f),before);}
 f.fail(null);const writes=f.writes;assert(candidate.commit({chinaServiceWorld:{test:'paid'}}).ok);assert.equal(f.writes,writes+1);assert.equal(f.aggregate.account(ID).cash+f.aggregate.account(ID).bank,1);assert.equal(f.official.account(ID).cash+f.official.account(ID).bank,0);assert.equal(f.guard.account(ID).bank,1);assert.equal(f.official.account(OTHER).bank,24);assert.equal(f.official.salonHold(salon().orderId).amount,80);assert.equal(f.official.salonHold(salon().orderId).status,'reserved');
 assert.deepEqual(f.aggregate.snapshot().transfers[0].portions.map(p=>p.sourceSplit),[{cash,bank:4-cash},{cash:0,bank:2}]);assert(candidate.commit().replayed);
 const reloaded=setup(f.game);assert.equal(reloaded.aggregate.loadError,null);reloaded.appoint(false);assert.equal(reloaded.official.prepareMealRefund({...meal,amount:4}).code,'actor-not-appointed','old public appointment behavior unchanged');
 assert.equal(reloaded.official.completeDuty(duty(10)).code,'actor-not-appointed');assert.equal(reloaded.official.withdraw({actorId:ID,amount:1,receiptId:'cannot-withdraw'}).code,'actor-not-appointed');
 const newer=copy(reloaded.official.salonHold(salon().orderId));earnGuard(reloaded.guard,6);const oldTotal=reloaded.aggregate.account(ID).cash+reloaded.aggregate.account(ID).bank;assert(reloaded.aggregate.prepareMealRefund(meal).commit().ok);assert.equal(reloaded.aggregate.account(ID).cash+reloaded.aggregate.account(ID).bank,oldTotal+6);assert.deepEqual(reloaded.official.account(ID),{cash,bank:4-cash});assert.equal(reloaded.guard.account(ID).bank,6);assert.deepEqual(reloaded.official.salonHold(salon().orderId),newer);assert(reloaded.aggregate.prepareMealRefund(meal).commit().replayed);assert.equal(reloaded.aggregate.prepareMealPayment(meal).ok,false);
 assert.equal(reloaded.provider.prepareMealRefund({...meal,actorId:OTHER,amount:4}).ok,false);assert.equal(reloaded.provider.prepareMealRefund({...meal,actorId:'cn-unrelated-successor',amount:4}).ok,false);
}
console.log('PASS original96 pay → reserve80 escrow → two6 meals leaves4 + actual guard3 pays6 with one save; real historical cash split, failed/async save rejection, reload, lost-appointment original-source refund and no heir/other money');

// Preprepared native paths and another meal port must not enter a locked ledger.
for(const zeroPortion of [false,true]){
 const f=setup(null,{fund:false,guestFirst:zeroPortion});for(let day=1;day<=5;day++)assert(f.official.completeDuty(duty(day)).ok);assert(f.official.prepareSalonReserve(salon()).commit().ok);earnGuard(f.guard,6,zeroPortion?3:1.5);
 const reserve=f.official.prepareSalonReserve(salon('cn-salon-npc-2',20)),settle=f.official.prepareSalonSettle(completed(salon())),refund=f.official.prepareSalonRefund(salon()),nativeMeal=f.official.prepareMealPayment({...meal,orderId:'cn-tavern-order-10'}),detached=f.provider.prepareMealPayment({...meal,orderId:'cn-tavern-order-11'});
 assert([reserve,settle,refund,nativeMeal,detached].every(p=>p.ok&&p.valid()));const before=f.official.snapshot(),candidate=f.aggregate.prepareMealPayment(meal);
 f.onSave(()=>{for(const p of [reserve,settle,refund,nativeMeal,detached]){assert.equal(p.valid(),false);assert.equal(p.commit().ok,false);assert.equal(p.committed().ok,false);}assert.equal(f.official.completeDuty(duty(20)).ok,false);assert.equal(f.official.withdraw({actorId:ID,amount:1,receiptId:'reentrant-withdraw'}).ok,false);assert.equal(f.official.prepareSalonRefund(salon()).ok,false);assert.equal(f.provider.prepareMealPayment({...meal,orderId:'cn-tavern-order-12'}).ok,false);assert.deepEqual(f.official.snapshot(),before);});
 assert(candidate.ok&&candidate.commit().ok);f.onSave(null);assert.equal(setup(f.game).aggregate.loadError,null);assert(f.official.prepareSalonRefund(salon()).commit().ok,'guard released after every adoption');
}
const stale=setup(),pending=stale.aggregate.prepareMealPayment(meal);assert(stale.official.completeDuty(duty(9)).ok);const fresh=state(stale);assert.equal(pending.commit().ok,false);assert.deepEqual(state(stale),fresh);
const failed=setup(),fp=failed.aggregate.prepareMealPayment(meal);failed.fail('throw');assert.equal(fp.commit().ok,false);failed.fail(null);assert(failed.official.completeDuty(duty(9)).ok,'locks released on throw');
const noFunds=setup();assert.equal(noFunds.aggregate.prepareMealPayment({...meal,amount:8}).ok,false,'escrow/business/government totals cannot fund a meal');
const none=setup(null,{fund:false});assert.equal(none.provider.hasIncome(ID),false);assert.equal(none.aggregate.account(ID),null);assert.equal(none.provider.prepareMealPayment(meal).ok,false);
console.log('PASS participating and zero-portion official locks block prepared/native salary, withdrawal, meal and salon reentry; stale/throw safe, no use of80 hold or government/business totals');

// Independent legacy v1 journal, never regenerated under the current rules.
function legacy(){const state={version:1,initialTreasury:{amount:100,sourceId:'old-finite-budget'},dailyWage:24,treasury:100,accounts:Object.fromEntries(CHINA_OFFICIAL_IDS.map(id=>[id,{bank:0,cash:0}])),destinations:{[TAVERN]:0},nextTransaction:1,transactions:[]};
 const balances=()=>({treasury:state.treasury,accounts:copy(state.accounts),destinations:copy(state.destinations)});
 const add=(request,from,to,change)=>{const before=balances();change();state.transactions.push({id:'official-'+state.nextTransaction++,...request,from,to,before,after:balances()});};
 add({action:'duty',...duty(1),amount:24},'official-treasury',ID+':bank',()=>{state.treasury-=24;state.accounts[ID].bank+=24;});
 add({action:'withdraw',actorId:ID,amount:24,receiptId:'old-withdraw'},ID+':bank',ID+':cash',()=>{state.accounts[ID].bank-=24;state.accounts[ID].cash+=24;});
 add({action:'meal-payment',actorId:ID,amount:6,receiptId:'official-meal-payment:'+meal.orderId,orderId:meal.orderId},ID+':cash',TAVERN,()=>{state.accounts[ID].cash-=6;state.destinations[TAVERN]+=6;});return state;
}
const original=legacy(),old=setup({chinaOfficialEconomy:original},{fund:false});assert.equal(old.official.loadError,null);assert.deepEqual(old.provider.mealTransfer(meal.orderId,'meal-payment').sourceSplit,{cash:6,bank:0});assert.equal(Object.hasOwn(old.official.history()[2],'sourceSplit'),false);old.appoint(false);for(let n=4;n<=6;n++)assert(old.provider.prepareMealPayment({...meal,orderId:'cn-tavern-order-'+n}).commit().ok);assert.equal(old.official.account(ID).cash,0);assert(old.provider.hasIncome(ID));const saved=old.game,again=setup(saved);again.appoint(false);assert(again.aggregate.prepareMealRefund(meal).commit().ok);assert.deepEqual(again.official.account(ID),{cash:6,bank:0});assert(again.aggregate.prepareMealRefund(meal).commit().replayed);assert.deepEqual(again.official.history().slice(0,3),original.transactions);assert.deepEqual(original,legacy());assert.equal(again.provider.prepareMealPayment(meal).ok,false);
const wrong=setup(saved);wrong.appoint(false);assert.equal(wrong.provider.prepareMealRefund({...meal,actorId:OTHER}).ok,false);assert.equal(wrong.official.account(ID).cash,0);
console.log('PASS independently replayed v1 cash-only original payment: no source rewrite, zero balance ownership, loss of appointment, exact cash refund once and no successor payment');

const corruptBase=setup();assert(corruptBase.aggregate.prepareMealPayment(meal).commit().ok);
for(const change of [s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].sourceSplit.cash=4;},s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].actorId=OTHER;},s=>{s.chinaGuestMealAccounts.transfers[0].portions[0].identity.namespace='chinaGuardAccounts';},s=>{s.chinaOfficialEconomy.accounts[ID].bank++;},s=>{delete s.chinaGuestMealAccounts;}]){const bad=corruptBase.game;change(bad);const f=setup(bad);assert(f.aggregate.loadError||!f.aggregate.account(ID));assert.equal(f.aggregate.prepareMealRefund(meal).ok,false);assert.deepEqual(f.game,bad);if(f.official.loadError){assert.equal(f.official.snapshot(),null);assert.deepEqual(f.provider.snapshot(),bad.chinaOfficialEconomy);}}
const alias=setup(),duplicate=createNPCGuestAccounts([{id:'one',economy:alias.provider},{id:'two',economy:alias.official.mealFundsProvider()}]);assert(duplicate.loadError);
const exposed=setup(),ec=exposed.aggregate.prepareMealPayment(meal);ec.snapshot.transfers[0].amount=999;assert(ec.commit().ok);assert.equal(exposed.aggregate.snapshot().transfers[0].amount,6);
console.log('PASS normalized official order discovery, corrupt/missing source proof and aliases fail closed; native bad-state API unchanged and adapter retains rejected evidence; exposed snapshot mutation isolated');

const repeat=setup(null,{fund:false});assert(repeat.official.completeDuty(duty(1)).ok);const direct=repeat.provider.prepareMealPayment(meal);assert.equal(direct.committed().code,'meal-lock-required','unpersisted external adoption requires the coordinator lock');assert(direct.commit().ok);assert(direct.committed().replayed,'accepted external adoption remains read-only idempotent after release');assert.equal(repeat.official.account(ID).bank,18);
console.log('PASS dormant direct commit and external adoption remain idempotent without exposing unlocked first adoption');
