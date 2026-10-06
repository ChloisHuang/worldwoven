import assert from 'node:assert/strict';
import {fixture} from './china-host-needs.mjs';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCPieceworkAccount} from '../source/game/npc-piecework-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {RANGE_WARDEN_ROLE} from '../source/game/china-range-warden-slot.js';
import {PALACE_GARDEN_ROLE} from '../source/game/china-palace-garden-role.js';
import {PALACE_HERALD_ROLE} from '../source/game/china-palace-herald-role.js';
import {heraldContract} from '../source/game/china-palace-herald-proof.js';
import {PALACE_SCRIBE_ROLE} from '../source/game/china-palace-scribe-role.js';
const copy=structuredClone;
const cases=[{id:'china-herald-accounts',namespace:'chinaHeraldAccounts',role:PALACE_HERALD_ROLE,kind:'npc-edict-delivery-piecework'},{id:'china-range-warden-accounts',namespace:'chinaRangeWardenAccounts',role:RANGE_WARDEN_ROLE},{id:'china-garden-accounts',namespace:'chinaGardenAccounts',role:PALACE_GARDEN_ROLE,kind:'npc-edict-piecework'},{id:'china-scribe-accounts',namespace:'chinaScribeAccounts',role:PALACE_SCRIBE_ROLE,kind:'npc-edict-draft-piecework'}];
function setup(config,saved,rejectWorld=false){
 const {id,namespace,role,kind}=config,actorId=role.incumbentId;let f,fail=false;
 const saveState=(state,_receipt,patch={})=>{if(fail)return false;if(f)Object.assign(f.game,copy(patch),{[namespace]:copy(state)});return true;};
 const options={role,namespace,saved:saved?.[namespace],saveState},account=kind?createNPCPieceworkAccount({...options,proofKind:kind}):createNPCDutyAccount(options);
 assert.equal(account.loadError,null);
 if(!saved){
  if(kind==='npc-edict-delivery-piecework')assert(account.settle({...heraldContract({id:'cn-edict-east-shore:0',audienceId:'cn-morning-audience:0',day:0},actorId,0,'cn-calligraphy',0,'cn-garden',0,'cn-emperor'),steps:{collectedSeconds:2,approvalSeconds:4,sealedSeconds:2.2,readingSeconds:6,responseSeconds:3,handoffSeconds:1.3,received:true},approvedBy:'cn-emperor',sealedBy:actorId,holder:'recipient'}).ok);
  else if(kind)assert(account.settle({kind,version:1,actorId,roleId:role.id,slotId:role.slotId,holderRevision:0,day:0,documentId:'cn-edict-east-shore:0',audienceId:'cn-morning-audience:0',amount:8,contractVersion:1,steps:kind==='npc-edict-piecework'?{received:true,filed:true,sweepSeconds:7}:{draftSeconds:5,handoffSeconds:2}}).ok);
  else{const coverage=[{actorId,roleId:role.id,slotId:role.slotId,holderRevision:0}];for(let i=0;i<=2600;i++)account.observe({seconds:i*.1,dt:.1,coverage});assert(account.checkpoint({day:0,hour:18}));}
 }
 const economy=createNPCGuestAccounts([{id,economy:account}]);
 const guest={station:{id:actorId,npcName:role.incumbentName,npcPosition:[24,.215,10]},root:{position:{x:24,y:.215,z:10,set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];},copy(p){Object.assign(this,{x:p.x,y:p.y,z:p.z});}},rotation:{y:0}},route:[],phase:0,alive:true,animate(){}};
 f=fixture(rejectWorld?{...saved,chinaServiceWorld:null}:saved,{extraActors:[guest],sceneOptions:{guestEconomy:economy,canBorrowGuest:id=>id===actorId}});f.game[namespace]=account.snapshot();f.hungry(false);f.needs.set(actorId,{seekMeal:true,seekToilet:false});return {...f,actorId,account,economy,fail:v=>fail=v};
}
for(const config of cases){
 const f=setup(config),before=f.account.account(f.actorId).bank;
 assert(f.scene.registerGuestPerson(f.actorId));assert(f.scene.requestGuestMeal(f.actorId));
 const waiting=copy(f.game),held=setup(config,waiting);assert.equal(held.scene.state().loadError,null,'unpaid active lease restores');
 f.until(()=>f.scene.snapshot().orders.some(o=>o.customerId===f.actorId&&o.payment==='reserved'),'original host collects own earned payment');
 const saved=copy(f.game),orderId=f.scene.guestMeal(f.actorId).orderId;
 assert.equal(saved.chinaServiceWorld.guestDiner.accountProvider,config.id);
 const g=setup(config,saved);assert.equal(g.scene.state().loadError,null);assert.equal(g.scene.guestMeal(g.actorId).orderId,orderId);assert.equal(g.account.account(g.actorId).bank,before-6);
 const oldWorld=copy(g.scene.snapshot()),oldAccount=g.account.snapshot();g.fail(true);assert.equal(g.scene.cancelGuestMeal(g.actorId),false);assert.deepEqual(copy(g.scene.snapshot()),oldWorld);assert.deepEqual(g.account.snapshot(),oldAccount);g.fail(false);
 assert(g.scene.cancelGuestMeal(g.actorId));assert.equal(g.account.account(g.actorId).bank,before);assert.equal(g.scene.cancelGuestMeal(g.actorId),false);
 const refunded=setup(config,copy(g.game));assert.equal(refunded.account.account(g.actorId).bank,before);assert.equal(refunded.account.snapshot().mealTransfers.filter(r=>r.kind==='meal-refund').length,1);
 for(const forged of ['unknown-provider',...cases.map(c=>c.id).filter(id=>id!==config.id),'china-royal-kitchen-accounts','china-guard-accounts']){const bad=copy(saved);bad.chinaServiceWorld.guestDiner.accountProvider=forged;const rejected=setup(config,bad,true);assert.equal(rejected.scene.restoreWorld(bad.chinaServiceWorld),false,forged);assert.equal(rejected.scene.state().loadError,'invalid-tavern-world',forged);assert.equal(rejected.account.account(rejected.actorId).bank,before-6);}
 const unpaid=copy(saved);unpaid[config.namespace]=waiting[config.namespace];const missing=setup(config,unpaid,true);assert.equal(missing.scene.restoreWorld(unpaid.chinaServiceWorld),false,'paid world without authoritative payment receipt rejects');
 console.log('PASS '+config.id+': earned funds, active waiting/prepaid restore, atomic failed refund, exact source once, forged source and absent receipt rejected');
}
