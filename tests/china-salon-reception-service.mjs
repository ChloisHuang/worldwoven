// Original production salon + official wallet + artist ledger + business debit
// + receptionist account. Direct arrivals isolate transaction/controller risk;
// Work-contact observer is doubled here for transaction isolation; real rig/
// brush/page/card contacts are checked by development/salon-reception/contact.mjs.
// This is not natural-demand, pathfinding, pose-contact or browser evidence.
import assert from 'node:assert/strict';
import {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {createChinaSalonReceptionAccount} from '../source/game/china-salon-reception-account.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaOfficialSalonPayments} from '../source/game/china-official-salon-payments.js';
import {createChinaTavernSalon} from '../source/game/china-tavern-salon.js';
import {SALON_ROOMS} from '../source/game/china-tavern-salon-rooms.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {registerHooks} from 'node:module';
const THREE=await import('../source/vendor/three/build/three.module.js');
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createCharacter}=await import('../source/game/characters.js'),{npcRoleAppearance}=await import('../source/game/appearance.js');await import('../source/game/character-live-entry.js');
const copy=structuredClone,customerId=CHINA_OFFICIAL_IDS[5],artistId='cn-tavern-reciter',hostId='cn-tavern-reception';
class V{constructor(...p){this.set(...p);}set(x=0,y=0,z=0){Object.assign(this,{x,y,z});return this;}toArray(){return [this.x,this.y,this.z];}distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}clone(){return new V(...this.toArray());}}
function fixture(input={},dormant=true,observed=true,realContact=false){
 let saved=copy(input),service,fail=null,need={},account,property,artistEconomy,elapsed=0,revision=0;const npcs=[],poses=[];
 const actor=(id,pos,extra={})=>{const n={station:{id,npcName:id,ageYears:35,...extra},ageYears:35,alive:true,root:{position:new V(...(saved.positions?.[id]||pos)),rotation:{y:0}},home:new V(...pos),preferenceScore:0,locomotion:{walkSpeed:2},route:[],animate(t,walking,action,c){if(id===hostId)poses.push({walking,action,writing:!!c?.receptionWriting});}};if(realContact&&id===hostId){const real=createCharacter({...npcRoleAppearance('china',hostId,1),culture:'china',scale:.96});n.root=real.root;n.root.position.set(...(saved.positions?.[id]||pos));new THREE.Group().add(n.root);const observe=n.animate;n.animate=(...args)=>{real.animate(...args);observe(...args);};n.dispose=real.dispose;}npcs.push(n);return n;};
 const artist=actor(artistId,[18.8,7.815,18.66],{salon:{activities:['poetry'],willing:true}}),host=actor(hostId,[24.15,7.815,5.45],{workTarget:[24.15,8.95,6.15]}),guest=actor(customerId,[24.15,7.815,7.65]),player={ageYears:25,root:{position:new V(30,.215,20),rotation:{y:0}},locomotion:{walkSpeed:2}};
 function checkpoint(next){saved={...saved,...copy(next),...(service?{checkpoint:service.snapshot(),positions:Object.fromEntries(npcs.map(n=>[n.station.id,n.root.position.toArray()]))}:{})};return true;}
 const official=createChinaOfficialEconomy({saved:saved.chinaOfficialEconomy,getDay:()=>20,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),saveState:(next,tx,patch={})=>{if(fail==='all'||fail===tx.action)return false;return checkpoint({...patch,chinaOfficialEconomy:next});}});
 const bank=createGameCurrencyLedger({saved,storage:{setItem:()=>true}});
 // Lazy counterpart access removes initialization cycles, while saved sources
 // remain available for strict replay before the live income ledger exists.
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:bank,getClock:()=>({day:20}),getTill:()=>artistEconomy?.summary().businessProceeds??saved.chinaSalonEconomy?.businessProceeds??0,getReceptionAccount:()=>account||saved.chinaSalonReceptionAccount,saveState:()=>false});
 account=createChinaSalonReceptionAccount({saved:saved.chinaSalonReceptionAccount,getSalonIncome:()=>artistEconomy?.snapshot()||saved.chinaSalonEconomy,getProperty:()=>property});
 artistEconomy=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,copperLedger:bank,officialEconomy:official,getReceptionAccount:()=>account,saveState:(next,r,patch={})=>checkpoint({...patch,chinaSalonEconomy:next})});
 assert.equal(artistEconomy.loadError,null);assert.equal(account.loadError,null);assert.equal(property.loadError??property.state().loadError,null);
 const port=createChinaOfficialSalonPayments({officialEconomy:official,artistEconomy});
 service=createChinaTavernSalon({...(realContact?{}:{receptionProps:{sync(){},clear(){},dispose(){},state:()=>null,apply(o,n,t,c){n.animate(t,false,'calligraphy',{...c,receptionWriting:true});return {observed,sessionId:o.id,cardId:o.receptionWork.cardId,phase:o.receptionWork.phase};}}}),npcs,copperLedger:bank,economy:artistEconomy,npcPayments:port,...(dormant?{receptionDuty:{resolve:()=>({holderId:hostId,actor:host,revision,available:host.alive,alive:host.alive})}}:{}),sharedNeeds:{status:id=>need[id]||null,hunger:()=>.1},getPlayer:()=>player,poseContext:()=>({}),doors:{routeStep:r=>({waypoint:r[0]})},planPath:(_,p)=>[p],moveActor(n,x,z){n.root.position.x+=x;n.root.position.z+=z;},saved:saved.checkpoint?{continuity:saved.checkpoint}:{},saveState:()=>{if(fail==='all'||fail==='source')return false;return checkpoint({chinaSalonEconomy:artistEconomy.snapshot()});}});
 if(saved.checkpoint)assert(service.restore(saved.checkpoint));
 const pay=()=>{for(let day=0;day<2;day++)assert(official.completeDuty({actorId:customerId,day,receiptId:`cn-official-duty:${customerId}:${day}`,evidence:{kind:'office-work',completed:true,actorId:customerId,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}}).ok);};
 const tick=(count=1,context={})=>{for(let i=0;i<count;i++){elapsed+=.1;service.update(.1,elapsed,context);}};
 return {service,official,artistEconomy,account,property,artist,guest,host,player,pay,tick,poses,need,checkpoint,get saved(){return copy(saved);},set fail(v){fail=v;},changeHolder(){revision++;}};
}
function invited(f){f.pay();assert(f.service.requestNPC(customerId,artistId,'poetry',20));assert.equal(f.service.snapshot().session.receptionWork.steps.registerSeconds,0);}
function accepted(f){invited(f);f.artist.root.position.set(22.85,7.815,7.65);f.tick(33);assert.equal(f.service.snapshot().session.stage,'accepted');}
function reserved(f){accepted(f);f.tick(20);assert.equal(f.service.snapshot().session.stage,'escort');assert.equal(f.official.account(customerId).bank,28);}
function fade(f){reserved(f);for(const[a,p]of[[[19.95,7.815,9.22],[21.2,7.815,9.22]],[[18.65,4.015,9.25],[17.55,4.015,9.25]],[SALON_ROOMS[0].actor,SALON_ROOMS[0].player]]){f.artist.root.position.set(...a);f.guest.root.position.set(...p);f.tick();}f.tick();assert.equal(f.service.snapshot().session.stage,'fade');}
const f=fixture();assert.equal(f.account.account(hostId)?.bank||0,0);f.tick(50);assert.equal(f.account.snapshot().receipts.length,0,'idle tea earns nothing');fade(f);f.tick(23);assert.equal(f.artistEconomy.account(artistId).bank,0,'service complete alone cannot pay before physical closing');assert.equal(f.account.snapshot().receipts.length,0);f.tick(20);assert.equal(f.service.snapshot().session.stage,'visiting');assert.equal(f.artistEconomy.account(artistId).bank,10);assert.equal(f.account.account(hostId).bank,8);assert.equal(f.artistEconomy.summary().businessProceeds,10);assert.equal(f.property.state().balance,122,'original120 capital plus net10 minus true8 expense');assert.equal(f.official.account(customerId).bank,28);assert.equal(f.account.snapshot().receipts.length,1);assert(f.poses.filter(p=>p.writing&&p.action==='calligraphy').length>=60);
const restored=fixture(f.saved);assert.equal(restored.service.snapshot().session.stage,'visiting');restored.tick(70);assert.equal(restored.account.account(hostId).bank,8);assert.equal(restored.property.state().balance,122);assert.equal(restored.account.snapshot().receipts.length,1);
const paused=fixture();invited(paused);const before=paused.service.snapshot().session.receptionWork;paused.tick(30,{conversationActorId:hostId});assert.deepEqual(paused.service.snapshot().session.receptionWork,before);assert.equal(paused.account.snapshot().receipts.length,0);
const changed=fixture();invited(changed);changed.tick(10);changed.changeHolder();changed.tick();assert.equal(changed.service.snapshot().session,null);assert.equal(changed.account.snapshot().receipts.length,0);
const cancelled=fixture();reserved(cancelled);assert(cancelled.service.cancelNPC(customerId));assert.equal(cancelled.official.account(customerId).bank,48);assert.equal(cancelled.account.snapshot().receipts.length,0);assert.equal(cancelled.property.state().balance,120);
const failed=fixture();fade(failed);failed.fail='salon-settle';failed.tick(45);assert.equal(failed.account.account(hostId)?.bank||0,0);assert.equal(failed.artistEconomy.account(artistId).bank,0);assert.equal(failed.property.state().balance,120);assert.equal(failed.official.account(customerId).bank,48,'same original funds refunded after failed settlement');
const saveSource=fixture();fade(saveSource);saveSource.fail='source';saveSource.tick(45);const reload=fixture(saveSource.saved);assert.equal(reload.account.account(hostId).bank,8);assert.equal(reload.service.snapshot().session.stage,'visiting');reload.tick(70);assert.equal(reload.account.snapshot().receipts.length,1);
const old=fixture({},false);old.pay();assert(old.service.requestNPC(customerId,artistId,'poetry',20));assert(!old.service.snapshot().session.receptionWork);const legacy=fixture(old.saved,true);assert(!legacy.service.snapshot().session.receptionWork,'old in-flight session is not enrolled retroactively');
console.log('PASS original session three finite desk operations → official real20 → artist10 + business10 → receptionist8/business expense8 atomically; pause, changed holder, refund, failed save, post-save interruption, reload and old-session no-backpay');

const noContact=fixture({},true,false);invited(noContact);noContact.tick(40);assert.equal(noContact.service.snapshot().session.receptionWork.seconds,0);assert.equal(noContact.account.snapshot().receipts.length,0);console.log('PASS failed actual-contact observer cannot advance any work seconds or issue income');

const physical=fixture({},true,true,true);fade(physical);physical.tick(45);assert.equal(physical.account.account(hostId).bank,8);assert(physical.service.receptionWorkState().observed);assert.equal(physical.service.receptionWorkState().cardId,physical.service.snapshot().session.receptionWork.cardId);assert(physical.service.receptionWorkState().gap<.008);physical.service.dispose();physical.host.dispose();console.log('PASS same original paid controller completes with real complete-adult Wenwan rig, pen/page/card contacts, and one8 wage; no contact double in this scenario');

const held=fixture({},true,true,true);accepted(held);held.tick(7);const heldWork=held.service.snapshot().session.receptionWork,heldCard=held.service.receptionWorkState().cardPosition;held.tick(20,{conversationActorId:hostId});assert.deepEqual(held.service.snapshot().session.receptionWork,heldWork);assert.deepEqual(held.service.receptionWorkState().cardPosition,heldCard);assert(held.service.receptionWorkState().observed,'paused original plaque remains physically gripped');held.service.cancelNPC(customerId);assert.equal(held.service.receptionWorkState(),null);held.service.dispose();held.host.dispose();console.log('PASS real held-card conversation freezes grip and work clock; cancellation clears only that original paper/plaque without income');

// Money-only dormant port uses a receipt issued by the original controller above.
// A second authentic employer ledger does not authorize a body/controller move.
function crossFamily(input){
 let mode=null,onSave=null,writes=0;
 const live=fixture(input),guard=createNPCDutyAccount({role:GUARD,namespace:'chinaGuardAccounts',saved:input.chinaGuardAccounts,saveState:(next,r,patch={})=>live.checkpoint({...patch,chinaGuardAccounts:next})});
 const aggregate=createNPCGuestAccounts([{id:'china-salon-economy',economy:live.artistEconomy.mealFundsProvider()},{id:'china-guard-accounts',economy:guard}],{saved:input.chinaGuestMealAccounts,saveState:(next,patch)=>{writes++;onSave?.();if(mode==='false')return false;if(mode==='throw')throw Error('quota');if(mode==='promise')return Promise.resolve(true);if(mode==='reject')return Promise.reject(Error('unsupported'));return live.checkpoint({...patch,chinaGuestMealAccounts:next});}});
 return {...live,guard,aggregate,fail:v=>mode=v,onSave:v=>onSave=v,get writes(){return writes;},get saved(){return live.saved;}};
}
function earnedGuard(guard,day){const coverage=[{actorId:artistId,roleId:GUARD.id,slotId:GUARD.slotId,holderRevision:day}];let t=(day*1440+360-600)/RATE,end=t+90/RATE;guard.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;guard.observe({seconds:t,dt,coverage});}assert(guard.checkpoint({day,hour:18}));}
const multi=crossFamily(f.saved),prior={actorId:artistId,orderId:'cn-tavern-order-701',amount:6},combined={...prior,orderId:'cn-tavern-order-702'};
assert(multi.artistEconomy.prepareMealPayment(prior).commit().ok);earnedGuard(multi.guard,21);
assert.deepEqual(multi.aggregate.account(artistId),{cash:0,bank:7});assert.equal(multi.aggregate.prepareMealPayment({...combined,amount:8}).ok,false);
const unchanged={reception:multi.account.snapshot(),property:multi.property.snapshot(),official:multi.official.snapshot()},payment=multi.aggregate.prepareMealPayment(combined);assert(payment.ok);
const initial=()=>({artist:multi.artistEconomy.snapshot(),guard:multi.guard.snapshot(),aggregate:multi.aggregate.snapshot(),saved:multi.saved}),beforeMeal=initial();
for(const mode of ['false','throw','promise','reject']){multi.fail(mode);assert.equal(payment.commit().ok,false);assert.deepEqual(initial(),beforeMeal);}multi.fail(null);
const prepared=multi.artistEconomy.prepareMealRefund(prior);multi.onSave(()=>{assert.equal(prepared.commit().ok,false);assert.equal(multi.artistEconomy.prepareMealPayment({...prior,orderId:'cn-tavern-order-703'}).ok,false);});const count=multi.writes;assert(payment.commit().ok);assert.equal(multi.writes,count+1);multi.onSave(null);
assert.deepEqual(multi.aggregate.snapshot().transfers[0].portions.map(p=>p.sourceSplit),[{cash:0,bank:4},{cash:0,bank:2}]);assert.equal(multi.artistEconomy.account(artistId).bank,0);assert.equal(multi.guard.account(artistId).bank,1);assert(payment.commit().replayed);
assert.deepEqual({reception:multi.account.snapshot(),property:multi.property.snapshot(),official:multi.official.snapshot()},unchanged);
const again=crossFamily(multi.saved);assert.equal(again.aggregate.loadError,null);earnedGuard(again.guard,22);assert(again.aggregate.prepareMealRefund(combined).commit().ok);assert.equal(again.artistEconomy.account(artistId).bank,4);assert.equal(again.guard.account(artistId).bank,6);assert(again.aggregate.prepareMealRefund(combined).commit().replayed);assert.equal(again.aggregate.prepareMealPayment(combined).ok,false);
assert(again.artistEconomy.prepareMealRefund(prior).commit().ok);assert.equal(again.artistEconomy.account(artistId).bank,10);assert.equal(again.guard.account(artistId).bank,6);assert.equal(crossFamily(again.saved).aggregate.loadError,null);
console.log('PASS dormant original-controller earned artist10 → original meal6 leaves4 + actual observed guard3 pays6; reload and later wages refund original4/2 once, zero-balance source and old single-provider refund retained; receptionist/property/customer untouched');
const corrupt=multi.saved;corrupt.chinaSalonEconomy.accounts[artistId].bank++;const rejected=createChinaSalonEconomy({saved:corrupt.chinaSalonEconomy,officialEconomy:multi.official,getReceptionAccount:()=>multi.account});assert(rejected.loadError);assert.deepEqual(rejected.mealFundsProvider().snapshot(),corrupt.chinaSalonEconomy);assert.equal(rejected.mealFundsProvider().hasIncome(artistId),false);
const alias=createNPCGuestAccounts([{id:'first',economy:multi.artistEconomy.mealFundsProvider()},{id:'second',economy:multi.artistEconomy.mealFundsProvider()}]);assert(alias.loadError);assert.equal(alias.account(artistId),null);
