import assert from 'node:assert/strict';
import {createChinaPieceworkEmployment} from '../source/game/china-piecework-employment.js';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {PALACE_TEA_ROLE,createPalaceTeaSlot} from '../source/game/china-palace-tea-role.js';
import {ARCHIVE_ROLE,createArchiveSlot} from '../source/game/china-archive-role.js';
import {ARCHIVE_HOME,archivePlayerContract,archiveProof} from '../source/game/china-archive-catalogue.js';
const copy=structuredClone;
const pos=a=>({x:a[0],y:a[1],z:a[2],toArray:()=>[...a]});
for(const role of [PALACE_TEA_ROLE,ARCHIVE_ROLE]){
 const home=role===PALACE_TEA_ROLE?[2.9,.815,-29.68]:ARCHIVE_HOME,player={actorId:'player',ageYears:22,root:{position:pos(role===PALACE_TEA_ROLE?[3.6,.815,-29.35]:[-3.2,7.615,-28.7])}},npc={station:{id:role.incumbentId},ageYears:30,root:{position:pos(home)},route:[],alive:true};
 const store={},clock={day:1,hour:8,seconds:100},flags={fail:false,boundary:false};let app,careers;
 const seed=createFormalCareers({saveState:()=>true,getClock:()=>clock}).state();seed.tenure={roleId:role.id,slotId:role.slotId,sinceDay:1,sinceHour:8};Object.assign(seed.skills,role.skillRequirements);
 careers=createFormalCareers({saved:seed,getClock:()=>clock,saveState:s=>(store.formalCareers=copy(s),true)});
 const bank=createGameCurrencyLedger({saved:store,storage:{setItem(k,v){if(flags.fail)return false;Object.assign(store,JSON.parse(v));return true;}},transactionParticipant:tx=>app.prepareCurrencyCommit(tx)});
 const createSlot=role===PALACE_TEA_ROLE?createPalaceTeaSlot:createArchiveSlot;
 const slot=createSlot({resolveActor:id=>id===npc.station.id?npc:null,getPlayer:()=>player,canAssign:()=>true,canRelease:()=>flags.boundary,saveState:s=>(store.slot=copy(s),true)});
 const source={order:null,runtime:null,orders:{orders:[]}},service={state:()=>copy(source),label:()=>'',handoffBoundary:()=>({ok:flags.boundary}),playerHandoffBoundary:()=>({ok:flags.boundary}),setPlayerWorking(){},workIntent:()=>null,playerOptions:()=>[],isActing:()=>false,held:()=>false,playerPose:()=>null,stopWorkAction(){},playerBusy:()=>false,playerWorkPose:()=>null,pausePlayerWork(){}};
 const config={careers,copperLedger:bank,tea:service,archive:service,teaSlot:slot,archiveSlot:slot,npcs:[npc],getPlayer:()=>player,getClock:()=>clock,saved:null,saveState:s=>{if(flags.fail)return false;store.chinaPieceworkEmployment=copy(s);return true;}};
 app=createChinaPieceworkEmployment(config);assert(app.start(role.id));assert.equal(app.state().shift.stage,'handoff');app.update();assert.equal(slot.state().holderId,npc.station.id,'unfinished NPC work not stolen');flags.boundary=true;app.update();assert.equal(slot.state().holderId,'player');assert.equal(app.state().shift.stage,'working');assert.equal(bank.balances().copper.bank,0);
 let proof;
 if(role===ARCHIVE_ROLE){const contract=archivePlayerContract(1,slot.state().revision);proof=archiveProof(contract);source.order={contract,stage:'settle',index:6};}
 else {const id='cn-palace-tea:1:cn-consort-yue',order={id,actorId:'player',holderRevision:slot.state().revision,guestId:'cn-consort-yue',visitId:'original-visit-1',day:1,roleId:role.id,slotId:role.slotId,contractVersion:1,amount:8,cupId:id+':cup',trayId:id+':tray',stage:'retrieved',steps:['accepted','prepared','carried','placed','drunk','retrieved']};source.orders.orders=[order];source.runtime={phase:'home'};const {palaceTeaProof}=await import('../source/game/china-palace-tea-orders.js');proof=palaceTeaProof({...order,stage:'cleared',steps:[...order.steps,'cleared']});}
 assert(!bank.creditWageToBank({amount:8,receiptId:proof.requestId||proof.orderId,currency:'copper',roleId:role.id,slotId:role.slotId,day:1}).ok,'direct bank action has no live source commit');
 flags.fail=true;assert(!app.settle(proof,{originalSource:'completed'}).ok);assert.equal(bank.balances().copper.bank,0);assert.equal(app.state().receipts.length,0);flags.fail=false;assert(app.settle(proof,{originalSource:'completed'}).ok);assert.equal(bank.balances().copper.bank,8);assert.equal(app.state().receipts.length,1);assert.equal(store.originalSource,'completed');assert.equal(careers.state().performance,1);assert(app.settle(proof).replayed);assert.equal(bank.balances().copper.bank,8);
 const restored=createChinaPieceworkEmployment({...config,saved:store.chinaPieceworkEmployment});assert.equal(restored.state().income,8);assert.equal(restored.state().loadError,null);assert(restored.endShift());restored.update();assert.equal(slot.state().holderId,npc.station.id);assert.equal(restored.state().shift,null);assert(careers.isHired(role.id));
}
console.log('PASS both employment adapters: original-boundary handoff, empty no pay, live source atomic bank+career+work patch, failed save retry, replay/reload, same-person return and retained tenure');
// A busy or temporarily away incumbent does not discard the desk application.
{
 const role=PALACE_TEA_ROLE,clock={day:0,hour:10,seconds:0},player={actorId:'player',ageYears:24,root:{position:pos([3.6,.815,-29.35])}},npc={station:{id:'cn-tea',npcName:'Lin'},alive:true,root:{position:pos([15,.815,-29])},route:[]};
 const seed=createFormalCareers({saveState:()=>true,getClock:()=>clock}).state();seed.skills.ritual=4;let saved;const careers=createFormalCareers({saved:seed,worldSeed:2,getClock:()=>clock,saveState:()=>true});
 const slot=createPalaceTeaSlot({resolveActor:()=>npc,getPlayer:()=>player,canAssign:()=>true,saveState:()=>true});
 const service={state:()=>({orders:{orders:[]}}),label:()=>null,handoffBoundary:()=>({ok:true}),playerHandoffBoundary:()=>({ok:true}),setPlayerWorking(){},workIntent:()=>null,playerOptions:()=>[],isActing:()=>false,held:()=>false,playerPose:()=>null,stopWorkAction(){},playerBusy:()=>false,playerWorkPose:()=>null,pausePlayerWork(){}};
 const config={careers,copperLedger:{},tea:service,archive:service,teaSlot:slot,archiveSlot:slot,npcs:[npc],getPlayer:()=>player,getClock:()=>clock,saveState:s=>(saved=copy(s),true)};let app=createChinaPieceworkEmployment(config),svc=app.forRole(role.id);
 assert(svc.executeIntent(svc.intent('formal-apply')));assert.equal(careers.applicationResult(role.id).status,'pending');assert(!careers.isHired(role.id));assert(svc.executeIntent(svc.intent('formal-review')));assert(saved.reviewQueue);app=createChinaPieceworkEmployment({...config,saved});assert(app.state().reviewQueue);app.update();assert(!careers.isHired(role.id));npc.root.position=pos([2.9,.815,-29.68]);app.update();assert(careers.isHired(role.id));assert.equal(app.state().shift,null);assert.equal(app.state().reviewQueue,null);
}
console.log('PASS real desk intake, persisted current-person review queue, no remote hire, actual return approval and independent shift');
