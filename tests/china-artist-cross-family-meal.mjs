// Genuine source-wallet settlement and native attendance/payroll feed the original
// meal scene. Completion/coverage are proof fixtures; direct routes and no-op props
// isolate payer/lease ownership, not natural demand, live job changes or visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {findActorStandPoint} from '../source/game/actor-navigation.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {createChinaOfficialSalonPayments} from '../source/game/china-official-salon-payments.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts,NPC_GUEST_MEAL_PROVIDER} from '../source/game/npc-guest-accounts.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
import {TAVERN_MEAL as M} from '../source/game/china-tavern-kitchen.js';
import {TAVERN_DINING_Z} from '../source/game/china-tavern-layout.js';
const copy=structuredClone,ID='cn-tavern-reciter',CUSTOMER=CHINA_OFFICIAL_IDS[5],ARTIST='china-salon-economy',AGGREGATE=NPC_GUEST_MEAL_PROVIDER,policy={version:1,performerShareBps:5000,rounding:'floor'};
const context=vm.createContext({console}),cache=new Map();
const pos=(x=0,y=.215,z=0)=>({x,y,z,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}});
const nav=new vm.SyntheticModule(['followActorRoute','findActorStandPoint'],function(){this.setExport('findActorStandPoint',findActorStandPoint);this.setExport('followActorRoute',(n,dt)=>{const p=n.route[0];if(!p)return {};const d=Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z),step=Math.min(d,dt*3);if(d<.07){n.root.position.set(p.x,p.y,p.z);n.route.shift();return {};}n.root.position.x+=(p.x-n.root.position.x)/d*step;n.root.position.z+=(p.z-n.root.position.z)/d*step;n.root.position.y=p.y;n.walking=true;return {};});},{context});
const props=new vm.SyntheticModule(['createTavernMealProps','createTavernDirtProps'],function(){this.setExport('createTavernMealProps',()=>({update(){},clear(){},state:()=>({}),dispose(){}}));this.setExport('createTavernDirtProps',()=>({update(){},dispose(){}}));},{context});
const kits=new vm.SyntheticModule(['createPalaceMealKit'],function(){this.setExport('createPalaceMealKit',()=>({show(){},sync(){},dispose(){}}));},{context});
function module(file){if(cache.has(file))return cache.get(file);const value=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,value);return value;}
const mod=module('source/game/china-tavern-service-scene.js');await mod.link(s=>s.includes('actor-navigation')?nav:s.includes('meal-props')?props:s.includes('china-palace-costume')?kits:module('source/game/'+s.replace('./','')));await mod.evaluate();
const duty=day=>({actorId:CUSTOMER,day,receiptId:`cn-official-duty:${CUSTOMER}:${day}`,evidence:{kind:'office-work',completed:true,actorId:CUSTOMER,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}});
function earn(guard,day=21){const coverage=[{actorId:ID,roleId:GUARD.id,slotId:GUARD.slotId,holderRevision:day}];let t=(day*1440+360-600)/RATE,end=t+90/RATE;guard.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;guard.observe({seconds:t,dt,coverage});}assert(guard.checkpoint({day,hour:18}));}
function setup(input,{legacy=false,split=true,brokenWorld=false,noResolver=false,dropArtist=false,borrowArtist=true}={}){
 const game=copy(input||{});let fail=false,writes=0;
 const save=patch=>{if(fail)return false;Object.assign(game,copy(patch));writes++;return true;};
 const official=createChinaOfficialEconomy({saved:game.chinaOfficialEconomy,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),getDay:()=>20,saveState:(next,record,patch={})=>save({...patch,chinaOfficialEconomy:next})});
 const artist=createChinaSalonEconomy({saved:game.chinaSalonEconomy,officialEconomy:official,saveState:(next,record,patch={})=>save({...patch,chinaSalonEconomy:next})});
 const guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:game.chinaGuardAccounts,saveState:(next,record,patch={})=>save({...patch,chinaGuardAccounts:next})});
 if(!input){
  for(let day=0;day<2;day++)assert(official.completeDuty(duty(day)).ok);
  const payments=createChinaOfficialSalonPayments({officialEconomy:official,artistEconomy:artist}),session={id:'cn-salon-npc-1',customerId:CUSTOMER,actorId:ID,activity:'poetry',fee:20,incomePolicy:policy};
  assert(payments.reserve(session).ok);assert(payments.settle(session,{elapsed:2.2}).ok);assert.equal(artist.account(ID).bank,10);assert.equal(official.account(CUSTOMER).bank,28);
  // A native historical meal transfer leaves the exact4 used by the new order.
  if(split){assert(artist.prepareMealPayment({actorId:ID,orderId:'cn-tavern-order-701',amount:6}).commit().ok);earn(guard);}
 }
 assert.equal(official.loadError,null);assert.equal(artist.loadError,null);assert.equal(guard.loadError,null);
 const aggregate=createNPCGuestAccounts([...(dropArtist?[]:[{id:ARTIST,economy:artist.mealFundsProvider()}]),{id:'china-guard-accounts',economy:guard}],{saved:game.chinaGuestMealAccounts,saveState:(next,patch)=>save({...patch,chinaGuestMealAccounts:next})});
 const ids=[M.host,M.cook,M.assistant,'cn-tavern-diner-west','cn-tavern-diner-east',ID],homes=[M.points.host,M.points.prep,M.points.assistant,[20,.215,22.4],[22,.215,22.4],[14,.115,13.8]],npcs=ids.map((id,i)=>({station:{id,npcName:id,npcPosition:homes[i]},root:{position:pos(...homes[i]),rotation:{y:0}},route:[],phase:0,alive:true,animate(){}})),actor=npcs.at(-1),player={root:{position:pos(14,.215,20),rotation:{y:0}},walking:false};
 const items=[18.1,23.9].flatMap(x=>[-1,1].map(side=>({id:`china-tavern-dining-${x}-${side}`,position:[x+1,.215,TAVERN_DINING_Z+side*1.32],anchor:[x,.215,TAVERN_DINING_Z+side*1.32],center:[x,.215,TAVERN_DINING_Z+side*1.32],seatY:.9,yaw:0}))).concat(['lan','zhu'].map((id,i)=>({id:'china-tavern-bed-'+id,kind:'bed',position:[18+i*5,4.015,19.5],anchor:[18+i*5,4.015,18.5],center:[18+i*5,4.015,18.5],supportY:4.9,yaw:0})));
 const facilities=createFacilityQueue(),needs=new Map([[ID,{seekMeal:true,seekToilet:false}]]);
 const scene=mod.namespace.createTavernServiceScene({npcs,lot:{group:{}},furniture:{items,facilities,releaseActor:id=>facilities.releaseActor(id),standPoint:(nav,extra,seat)=>pos(...seat.position)},doors:{},planPath:(from,to)=>[to],moveActor(){},poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>null,sharedNeeds:{has:id=>needs.has(id),register:()=>true,status:id=>needs.get(id)||{seekMeal:false,seekToilet:false},hunger:()=>0},officialEconomy:official,artistEconomy:artist,guestEconomy:aggregate,personalMealEconomy:noResolver?null:aggregate,enableArtistPersonalFunds:!legacy,canBorrowArtist:()=>borrowArtist,canBorrowGuest:()=>false,canBorrowClinic:()=>false,onMealReceipts:receipts=>{for(const r of receipts)if(needs.has(r.actorId))needs.get(r.actorId).seekMeal=false;},saveState:next=>save({chinaServiceWorld:next})});
 if(game.chinaServiceWorld&&!brokenWorld)assert(scene.restoreWorld(game.chinaServiceWorld));else assert(scene.initializeWorld());
 let time=0;const tick=()=>{time+=.1;scene.update(.1,time);},until=(test,label)=>{for(let i=0;i<2600&&!test();i++)tick();assert(test(),label+' '+JSON.stringify(scene.snapshot().orders.map(o=>[o.customerId,o.stage,o.payment])));};
 return {scene,artist,official,guard,aggregate,actor,npcs,needs,until,fail:value=>fail=value,get writes(){return writes;},get stored(){return copy(game);}};
}
const collect=f=>f.until(()=>f.scene.snapshot().orders.some(o=>o.customerId===ID&&o.payment==='reserved'),'original host collects this artist order');
const f=setup();assert.deepEqual(f.aggregate.account(ID),{cash:0,bank:7});assert.equal(f.scene.registerGuestPerson(ID),false);assert.equal(f.scene.registerClinicPerson(ID),false);assert.equal(f.scene.requestOfficialMeal(CUSTOMER),false,'financial source grants no absent body');assert.equal(setup(null,{borrowArtist:false}).scene.requestArtistMeal(ID),false,'money cannot bypass original artist borrower');
assert(f.scene.requestArtistMeal(ID));assert.equal(f.scene.artistMeal(ID).accountProvider,AGGREGATE);assert.equal(f.scene.artistMeal(ID).kind,'salon-artist');assert.equal(new Set(f.npcs.map(n=>n.station.id)).size,f.npcs.length);
const lodging=f.scene.prepareLodgingWorld(copy(f.scene.snapshot()));assert(lodging.ok,'lodging preparation validates the active aggregate artist lease');assert(f.scene.saveLodgingWorld(lodging.patch.chinaServiceWorld),'lodging save carries artist source verification');assert.equal(f.scene.artistMeal(ID).accountProvider,AGGREGATE);
const unpaid=setup(f.stored);assert.equal(unpaid.scene.artistMeal(ID).accountProvider,AGGREGATE);assert.equal(unpaid.scene.artistMeal(ID).orderId,f.scene.artistMeal(ID).orderId);collect(unpaid);assert.equal(unpaid.artist.account(ID).bank,0);assert.equal(unpaid.guard.account(ID).bank,1);assert.equal(unpaid.aggregate.snapshot().transfers.length,1);collect(f);assert.equal(f.artist.account(ID).bank,0);assert.equal(f.guard.account(ID).bank,1);assert.deepEqual(f.aggregate.snapshot().transfers[0].portions.map(p=>[p.providerId,p.amount,p.sourceSplit]),[[ARTIST,4,{cash:0,bank:4}],['china-guard-accounts',2,{cash:0,bank:2}]]);
const held=f.stored,liveCancel=setup(held);assert(liveCancel.scene.cancelArtistMeal(ID));assert.equal(liveCancel.artist.account(ID).bank,4);assert.equal(liveCancel.guard.account(ID).bank,3);assert.equal(liveCancel.scene.cancelArtistMeal(ID),false);
const g=setup(held);assert.equal(g.scene.artistMeal(ID).accountProvider,AGGREGATE);earn(g.guard,22);g.actor.alive=false;const before=copy(g.scene.snapshot()),money={artist:g.artist.snapshot(),guard:g.guard.snapshot(),aggregate:g.aggregate.snapshot()},saved=g.stored;g.fail(true);assert.equal(g.scene.cancelArtistMeal(ID),false);assert.deepEqual(copy(g.scene.snapshot()),before);assert.deepEqual({artist:g.artist.snapshot(),guard:g.guard.snapshot(),aggregate:g.aggregate.snapshot()},money);assert.deepEqual(g.stored,saved);g.fail(false);assert(g.scene.cancelArtistMeal(ID));assert.equal(g.artist.account(ID).bank,4);assert.equal(g.guard.account(ID).bank,6);assert.equal(g.official.account(CUSTOMER).bank,28);assert.equal(g.scene.cancelArtistMeal(ID),false);assert.equal(setup(g.stored).aggregate.loadError,null);
const consumed=setup(held),till=consumed.scene.snapshot().till;consumed.until(()=>!consumed.scene.artistMeal(ID),'same original prepaid artist plate is consumed');assert.equal(consumed.artist.account(ID).bank,0);assert.equal(consumed.guard.account(ID).bank,1);assert(consumed.scene.snapshot().till>=till+6);assert.equal(consumed.scene.state().history.filter(r=>r.event==='customer-payment'&&r.from===ID&&r.amount===6).length,1);assert.equal(consumed.scene.snapshot().mealReceipts.filter(r=>r.actorId===ID).length,1);assert.equal(consumed.aggregate.snapshot().transfers.length,1);assert.equal(consumed.official.account(CUSTOMER).bank,28);assert.equal(consumed.artist.summary().businessProceeds,10);
console.log('PASS original artist meal uses earned4+3, preserves artist category and borrower, reloads unpaid/prepaid, refunds exact4/2 after later wage/death and failed save, and consumes one original plate once');

for(const prepaid of [false,true]){
 const old=setup(null,{legacy:true,split:false});assert(old.scene.requestArtistMeal(ID));assert.equal(old.scene.artistMeal(ID).accountProvider,ARTIST);if(prepaid)collect(old);earn(old.guard);
 const restored=setup(old.stored);assert.equal(restored.scene.artistMeal(ID).accountProvider,ARTIST,'old explicit artist source stays pinned after other-job earnings');if(!prepaid)collect(restored);assert.equal(restored.artist.account(ID).bank,4);assert.equal(restored.guard.account(ID).bank,3);restored.actor.alive=false;assert(restored.scene.cancelArtistMeal(ID));assert.equal(restored.artist.account(ID).bank,10);assert.equal(restored.guard.account(ID).bank,3);assert.equal(restored.aggregate.snapshot().transfers.length,0);assert.equal(setup(restored.stored).artist.loadError,null);
}
console.log('PASS legacy explicit china-salon-economy unpaid/prepaid leases keep their original payer, native payment/refund and untouched second-job money');

for(const provider of [null,'forged-provider','china-guard-accounts',ARTIST]){const bad=copy(held);bad.chinaServiceWorld.artistDiner.accountProvider=provider;const rejected=setup(bad,{brokenWorld:true});assert.equal(rejected.scene.restoreWorld(bad.chinaServiceWorld),false);assert.equal(rejected.aggregate.account(ID).bank,1);}
const absent=copy(held);delete absent.chinaServiceWorld.artistDiner.accountProvider;assert.equal(setup(absent,{brokenWorld:true}).scene.restoreWorld(absent.chinaServiceWorld),false,'removed split provider cannot guess native artist ownership');
for(const option of [{noResolver:true},{dropArtist:true}]){const rejected=setup(held,{brokenWorld:true,...option});assert.equal(rejected.scene.restoreWorld(held.chinaServiceWorld),false,'source-authoritative verification cannot skip the original provider/coordinator');assert.equal(rejected.artist.account(ID).bank,0);assert.equal(rejected.guard.account(ID).bank,1);}
console.log('PASS forged, foreign, null and removed source labels, missing artist provider and missing resolver reject active split leases without moving money');

// Prior-category save fixture: enabling artist funds is not a registry migration.
const prior=setup(null,{legacy:true,split:false});earn(prior.guard);earn(prior.guard,22);assert(prior.scene.requestArtistMeal(ID));const categorySave=prior.stored,oldLease=categorySave.chinaServiceWorld.artistDiner;categorySave.chinaServiceWorld.artistDiner=null;categorySave.chinaServiceWorld.clinicPeople=[ID];categorySave.chinaServiceWorld.clinicDiner={...oldLease,kind:'clinic-staff',accountProvider:'china-guard-accounts'};
const category=setup(categorySave);assert.equal(category.scene.snapshot().artistDiner,null);assert.equal(category.scene.requestArtistMeal(ID),false);collect(category);assert.equal(category.artist.account(ID).bank,10);assert.equal(category.guard.account(ID).bank,0);assert.equal(category.aggregate.snapshot().transfers.length,0);assert(category.scene.cancelClinicMeal(ID));assert.equal(category.guard.account(ID).bank,6);assert.equal(category.artist.account(ID).bank,10);
console.log('PASS prior clinic-category artist identity retains its original category and guard-only source, including zero-balance refund; no controller is reassigned');
