// Actual existing service/life sampler and original Three bodies, paired with
// management's retained-incumbent qualification source. Fixture floor, doors and
// owner position isolate rehire custody; this is not production-main proof.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as THREE from '../source/vendor/three/build/three.module.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {beginActorNavigationStep} from '../source/game/actor-navigation.js';
import {createChinaTavernManagement} from '../source/game/china-tavern-management.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createTavernRole} from '../source/game/china-tavern-role.js';
import {TAVERN_HIRING_ROLES as ROLES} from '../source/game/china-tavern-hiring.js';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createTavernServiceScene,verifySavedTavernStockReceipt,verifyTavernStockOrderSource,verifySavedRecruitmentTableWork}=await import('../source/game/china-tavern-service-scene.js');
const copy=structuredClone,RICE='yunlai-mushroom-rice',NOODLES='yunlai-green-noodles',WEST='cn-tavern-diner-west';
function actor(id,name,p){const root=new THREE.Group();root.position.fromArray(p);root.userData.bodyId=id;
 const hands=[new THREE.Object3D(),new THREE.Object3D()];hands[0].position.set(-.18,1.2,.3);hands[1].position.set(.18,1.2,.3);root.add(...hands);root.userData.hands=hands;
 return {station:{id,npcName:name,npcPosition:p.slice()},root,route:[],phase:0,walking:false,alive:true,locomotion:{walkSpeed:3},animate(){}};}
function fixture(initial=null,sceneOptions={}){
 let game=copy(initial?.game||{copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}}),seconds=initial?.seconds??0,manager=null,property=null,scene=null,mounted=null,reject=null,cleaningTable=null;
 const links={},getClock=()=>{const minutes=600+seconds*.7;return {seconds,day:Math.floor(minutes/1440),hour:minutes%1440/60};};
 const save=patch=>{if(reject?.(patch))return false;Object.assign(game,copy(manager?.snapshot()||{}),copy(patch));return true;};
 const npcs=[actor('cn-tavern-host','许安',[24.1,.215,6.4]),actor('cn-tavern-cook','沈禾',[23.3,.215,4.36]),actor('cn-tavern-assistant','陆青',[22,.215,9.1]),actor(WEST,'顾谨',[20,.215,22.4]),actor('cn-tavern-diner-east','周棠',[22,.215,22.4])];
 if(initial?.positions)for(const n of npcs)n.root.position.fromArray(initial.positions[n.station.id]);
 const player=actor('player','你',[14,.215,20]),byId=id=>npcs.find(n=>n.station.id===id),group=new THREE.Group();group.add(...npcs.map(n=>n.root),player.root);
 const ledger=createGameCurrencyLedger({saved:game,storage:{setItem(_key,json){return save(JSON.parse(json));}},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
 property=createChinaTavernProperty({saved:game.chinaTavernProperty,copperLedger:ledger,getClock,getTill:()=>scene?.snapshot().till??game.chinaServiceWorld?.till??0,
  getBusinessAccount:()=>links.business,getStock:()=>links.stock,saveState:next=>save({chinaTavernProperty:next})});
 const roles=Object.fromEntries(Object.values(ROLES).map(r=>[r.roleId,createTavernRole({...r,saved:game.roles?.[r.roleId],resolveActor:byId,canRelease:()=>r.roleId===ROLES.host.roleId?scene?.hostHandoff()||{ok:true}:scene?.kitchenHandoff(r.roleId===ROLES.chef.roleId?'chef':'assistant')||{ok:true},saveState:next=>save({roles:{...game.roles,[r.roleId]:next}})})]));
 const items=[{key:18.1,x:19,z:13.65},{key:23.9,x:23,z:17.65}].flatMap(t=>[-1,1].map(side=>({id:`china-tavern-dining-${t.key}-${side}`,kind:'chair',
  position:[t.x,.215,t.z+side*1.55],anchor:[t.x,.215,t.z+side*1.045],center:[t.x,.215,t.z+side*1.045],seatY:.9,yaw:side===1?Math.PI:0})));
 const facilities=createFacilityQueue(),furniture={items,facilities,releaseActor:id=>facilities.releaseActor(id),standPoint:(_nav,_extra,seat)=>new THREE.Vector3(...seat.position)};
 const doors={cameraColliders:[],routeStep(route,p,tolerance){while(route[0]&&Math.hypot(p.x-route[0].x,p.z-route[0].z)<=tolerance)route.shift();return {waypoint:route[0],waiting:false,phase:'walking'};}};
 const needs=new Map(npcs.map(n=>[n.station.id,{seekMeal:false,seekToilet:false}]));
 const chargePlayer=(action,o)=>{const hold=ledger.reservations().find(h=>h.id===o.id);if(action==='status')return {ok:true,status:hold?.status||'unpaid'};
  if(action==='reserve')return ledger.reserve(o.price,o.id,'copper');if(action==='settle')return ledger.settle(o.id);return !hold||hold.status==='refunded'?{ok:true}:ledger.refund(o.id);};
 scene=createTavernServiceScene({...sceneOptions,npcs,lot:{group,bounds:{minX:10,maxX:30,minZ:0,maxZ:25},colliders:[],cameraColliders:[]},furniture,doors,
  planPath:(_from,to)=>[{...to}],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;return {bodyBlocked:false};},
  poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>mounted,getClock,worldSeed:1,
  sharedNeeds:{status:id=>needs.get(id),has:()=>true,hunger:()=>0,register:()=>true},
  getHostRole:()=>roles[ROLES.host.roleId].resolve(),getKitchenRole:r=>roles[ROLES[r].roleId].resolve(),getManagement:()=>manager,getRecruitment:()=>manager?.recruitment,
  getPlayerCleaningTable:()=>cleaningTable,chargePlayer,saveState:next=>save({chinaServiceWorld:next})});
 if(game.chinaServiceWorld)assert(scene.restoreWorld(game.chinaServiceWorld));else {assert(scene.initializeWorld());const baseline=scene.snapshot();
  for(const v of baseline.visitors){v.copper=v.id===WEST?6:8;baseline.orders.find(o=>o.customerId===v.id).customerCopper=v.copper;}
  assert(scene.restoreWorld(baseline));}
 function prepareRole(roleId,holderId){const previous=roles[roleId].state().holderId,p=roles[roleId].prepareAssignment(holderId);if(!p.ok)return p;
  const patch={roles:{...game.roles,[roleId]:p.assignment}};
  return {...p,patch,save:fn=>p.save(bundle=>fn({...bundle,patch})),committed:()=>{const ok=p.committed();if(ok&&holderId===null)scene.releaseRecruitmentStaff(previous);return ok;}};}
 manager=createChinaTavernManagement({saved:game,property,sourceLinks:links,getClock,saveFullWorld:save,getRole:id=>roles[id]?.resolve(),getActor:byId,getScene:()=>scene,
  verifySavedStockReceipt:verifySavedTavernStockReceipt,verifySavedTrialTableWork:verifySavedRecruitmentTableWork,
  readPlayerState:()=>({actorId:'player',inScene:true,standing:true,busy:false,mounted:false,position:player.root.position.toArray()}),canSeeOwner:()=>true,
  prepareRoleAssignment:(a,assignment)=>prepareRole(a.roleId,assignment.holderId),prepareRoleDismissal:roleId=>prepareRole(roleId,null),
  readSafeHandoff:a=>{const c=manager.recruitment.candidate(a.id),slot=roles[a.roleId].state();if(!c?.lease||slot.holderId!==null||!scene.recruitmentLeaseValid(a.actor.actorId,c.lease,c))return null;
   return {id:a.id+':handoff',sourceId:'original-staff-scene-fixture',sourceRevision:scene.snapshot().revision,businessId:'cn-yunlai-tavern',applicationId:a.id,
    actorId:a.actor.actorId,bodyId:a.actor.bodyId,slotId:a.slotId,slotRevision:a.slotRevision,customerReleaseReceiptId:c.lease.id,destinationReleaseReceiptId:a.id+':vacant-slot'};},
  getNPCProfile:id=>{const n=byId(id);return n?{actorId:id,name:n.station.npcName,bodyId:id,bodyRevision:null,ageYears:29,alive:n.alive,protected:false,
   currentRoleId:Object.values(ROLES).find(r=>roles[r.roleId].state().holderId===id)?.roleId||null}:null;}});
 const tick=(count=1)=>{for(let i=0;i<count;i++){seconds+=.1;beginActorNavigationStep(.1);scene.update(.1,seconds);manager.update(.1);for(const n of npcs)scene.animateRecruitmentActor(n.station.id,seconds);}};
 const until=(fn,label)=>{for(let i=0;i<6000&&!fn();i++)tick();assert(fn(),label+': '+JSON.stringify({orders:scene.snapshot().orders,stock:manager.stock.summary(),candidates:manager.recruitment.state().candidates,actors:scene.state().actors,error:manager.loadError,last:manager.lastError}));};
 const buy=()=>{for(let i=0;i<8;i++){assert(property.refreshDay().ok);const s=property.state();if(s.market.willing){assert(property.applyPurchase(s.market.price).ok);assert(property.confirmPurchase().ok);assert(manager.activate().ok);return;}seconds+=1440/.7;}assert.fail('fixture owner purchase available');};
 const seat=items.find(i=>i.id==='china-tavern-dining-18.1-1');
 const mount=()=>{mounted=seat;player.root.position.fromArray(seat.anchor);return seat;};
 const request=()=>{assert(scene.requestPlayerMeal(mount(),RICE));return scene.playerOrder().id;};
 const snapshot=()=>({game:{...copy(game),...manager.snapshot(),chinaServiceWorld:scene.snapshot()},seconds,
  positions:Object.fromEntries(npcs.map(n=>[n.station.id,n.root.position.toArray()]))});
 return {scene,manager,property,ledger,npcs,byId,player,roles,needs,tick,until,buy,mount,request,snapshot,getClock,
  unmount(){mounted=null;player.root.position.set(14,.215,20);},reject:fn=>{reject=fn;},cleaning:id=>{cleaningTable=id;},
  setHour(hour){const c=getClock();seconds=((c.day*1440+hour*60)-600)/.7;},get game(){return copy(game);}};
}

// All three real incumbents can return to their OWN now-vacant role through the
// existing life sampler, a real public meeting and explicit owner approval.
for(const key of ['host','chef','assistant']){
 const f=fixture(),definition=ROLES[key],id=definition.originalHolderId,n=f.byId(id),identity=n.root;
 f.buy();assert.equal(f.manager.business.snapshot().contracts.length,0,'fixture exercises same-frame first ownership dismissal');
 assert(f.manager.dismiss(definition.roleId).ok);
 const qualified=f.manager.readExistingQualification(id,definition.roleId);assert(qualified);
 assert.equal(qualified.kind,'existing-incumbency');assert.equal(f.roles[definition.roleId].state().holderId,null);
 assert(f.manager.business.snapshot().contracts.some(c=>c.kind==='retained-original-incumbent'&&c.actorId===id));
 assert.deepEqual(f.manager.recruitment.additionalChoices('cn-clinic-physician'),[]);
 const wrongRole=Object.values(ROLES).find(r=>r.roleId!==definition.roleId);assert.equal(f.manager.readExistingQualification(id,wrongRole.roleId),null);
 n.root.userData.bodyId='different-body';assert.deepEqual(f.manager.recruitment.additionalChoices(id),[]);n.root.userData.bodyId=id;
 // Preserve the real unmet hunger intent. An empty chef/host cannot first serve
 // his own meal; only an actually owned meal/toilet/life action blocks custody.
 f.needs.get(id).seekMeal=true;
 f.until(()=>f.manager.recruitment.candidate(id)?.phase==='meeting',key+' actual retired life choice and physical meeting');
 let c=f.manager.recruitment.candidate(id);const applicationId=c.applicationId;
 assert.equal(c.lease.sourceId,'china-tavern-recruitment-staff-custody');assert.equal(c.lease.originalRoleId,definition.roleId);
 assert.equal(c.lease.visitorOrderId,undefined);assert(f.scene.recruitmentLeaseValid(id,c.lease,c));
 assert.equal(f.needs.get(id).seekMeal,true);assert.strictEqual(n.root,identity);assert.equal(f.manager.recruitment.intent(applicationId,'trial'),null);
 assert.equal(f.manager.recruitment.intent(applicationId,'approve').qualificationKind,'existing-incumbency');
 assert.equal(f.manager.view().qualificationByApplication[applicationId].kind,'existing-incumbency');
 f.tick(5);assert.equal(f.roles[definition.roleId].state().holderId,null,'no automatic approval');
 const beforePosition=n.root.position.clone();f.scene.update(.1,f.getClock().seconds);assert(beforePosition.equals(n.root.position),'retired scene cannot double-move borrowed staff');
 f.player.root.position.fromArray(c.meeting.position);f.player.root.position.x-=1.2;
 assert(f.manager.reviewApplication(applicationId,true));
 f.until(()=>f.manager.hiring.application(applicationId).status==='assigned',key+' same original body safely adopted');
 f.tick();const a=f.manager.hiring.application(applicationId);
 assert.equal(a.decision.qualification.kind,'existing-incumbency');assert.equal(a.trial.request,null);assert.equal(a.trial.work,null);assert.equal(a.trial.payment,null);
 assert.equal(a.decision.salary.baseDailyWage,definition.wage);assert.equal(a.decision.salary.excludedTrial,null);
 assert.equal(f.roles[definition.roleId].state().holderId,id);assert.strictEqual(f.byId(id).root,identity);
 assert(!f.manager.recruitment.owns(id));assert.equal(f.manager.business.snapshot().trials.length,0);
 assert.equal(f.manager.business.snapshot().receipts.filter(r=>r.kind==='trial-payment').length,0,'rehiring never repeats the guest trial fee');
 const cold=fixture(f.snapshot());assert.equal(cold.manager.loadError,null);assert.equal(cold.manager.hiring.application(applicationId).status,'assigned');
 assert.equal(cold.roles[definition.roleId].state().holderId,id);assert.equal(cold.manager.business.snapshot().trials.length,0);
}

// Same qualified original body may decline/leave and resume its old personal
// life. The source qualification creates neither consent nor a replacement job.
{
 const f=fixture();f.buy();assert(f.manager.dismiss(ROLES.chef.roleId).ok);
 f.until(()=>f.manager.recruitment.candidate('cn-tavern-cook')?.phase==='meeting','rejection fixture original choice');
 const c=f.manager.recruitment.candidate('cn-tavern-cook'),n=f.byId(c.actorId),p=n.root.position.clone();
 f.player.root.position.fromArray(c.meeting.position);f.player.root.position.x-=1.2;
 assert(f.manager.reviewApplication(c.applicationId,false));f.manager.recruitment.update(.1);
 assert.equal(f.manager.hiring.application(c.applicationId).status,'rejected');assert.equal(f.roles[ROLES.chef.roleId].state().holderId,null);
 assert(!f.manager.recruitment.owns(n.station.id));assert(p.equals(n.root.position));
 assert.equal(f.manager.business.snapshot().trials.length,0);
}
console.log('china tavern rehire scene: all three original incumbents, genuine life consent, same-body meeting/return/adoption and no duplicate trial fee passed (not full-main proof)');

