// CR04 facade regressions: a live source object, actual surface/collider routes,
// borrowed original bodies, and a same-write meal marker after rejected saves.
// This is controller evidence; it does not substitute for normal-view play QA.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const THREE=await import('three');
const {findPath}=await import('../source/game/navigation.js');
const {beginActorNavigationStep,moveActorWithCollision}=await import('../source/game/actor-navigation.js');
const {createChinaUsurpationScene}=await import('../source/game/china-usurpation-scene.js');
const {createPalaceUsurpation}=await import('../source/game/palace-usurpation-ledger.js');
const {palaceUsurpationRoll}=await import('../source/game/palace-usurpation-policy.js');
const {createRoyalKitchenOrders}=await import('../source/game/china-royal-kitchen-orders.js');
const {createChinaArcheryRoutine}=await import('../source/game/china-archery-routine.js');
const {socialHoldOwner,resetSocialHolds}=await import('../source/game/npc-social-ownership.js');
const copy=value=>structuredClone(value),supporterIds=['cn-official-one','cn-official-two','cn-official-three','cn-range-warden','cn-archery'];
function fixture(saved={}){
 resetSocialHolds();const clock={day:7,hour:14,...saved.clock},flags={runtimeSave:true,coreSave:true,busy:false,yield:false,borrow:true};
 const lot={group:new THREE.Group(),archery:{},colliders:[],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40},doorways:[],
  walkableSurfaces:[{minX:-30,maxX:30,minZ:-40,maxZ:40,y:.14}],
  architectureProgram:{courts:[{id:'grand-court',openToSky:true,bounds:{minX:-15,maxX:15,minZ:6,maxZ:31}}]}};
 function actor(id,i){const root=new THREE.Group(),hand=new THREE.Group(),otherHand=new THREE.Group();hand.position.set(.12,1.1,.35);otherHand.position.set(-.12,1.1,.35);root.add(hand,otherHand);root.userData.hands=[hand,otherHand];root.userData.jinyiCostume={dispose(){}};
  root.position.set(-5+i*1.5,.14,22);root.visible=false;lot.group.add(root);return {actorId:id,bodyId:id+':original',alive:true,ageYears:30,
   station:{id,npcName:id},root,phase:0,route:[{x:12,y:.14,z:28}],walking:false,locomotion:{walkSpeed:3},animate(){}};}
 const player=actor('player',0),npcs=['cn-emperor',...supporterIds].map((id,i)=>actor(id,i+1));
 const all=[player,...npcs],byId=id=>all.find(a=>a.actorId===id),options={bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4};
 const plans=[],planPath=(a,b,radius=.34)=>{plans.push(radius);return findPath(a,b,lot.colliders,{...options,radius,pathRadius:radius});};
 const doors={cameraColliders:[],routeStep(route,p,r){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<r)route.shift();return {phase:'walking',waypoint:route[0]};}};
 const moveActor=(a,dx,dz,r,probeOnly=false)=>moveActorWithCollision(a,dx,dz,r,{doors,colliders:lot.colliders,navigation:options,npcs,playerPosition:player.root.position,probeOnly});
 moveActor.probeBodyRecovery=(a,dx,dz,r)=>moveActor(a,dx,dz,r,true);
 const context={player:{id:'player',bodyId:player.bodyId,ageYears:30,alive:true},emperor:{id:'cn-emperor',bodyId:byId('cn-emperor').bodyId,ageYears:40,alive:true,tenureRevision:0},
  supporters:supporterIds.map((id,index)=>({id,bodyId:byId(id).bodyId,name:id,ageYears:35,alive:true,eligible:true,supportsGeneral:true,
   roleId:'role-'+index,circleId:index>=3?'guard':'court',official:index<3,guardCommander:index===3,relationship:1,trust:1,informedOpinion:1})),
  guard:{commanderId:supporterIds[3],guards:[supporterIds[3],'cn-archery'].map(id=>({id,bodyId:byId(id).bodyId}))},
  experience:{intrigue:6,guard:6,abdication:6},exposure:0,safety:{oldWorkSettled:true,itemsSettled:true,meetingsSettled:true,actorTransitionsSafe:true},
  residences:{player:{roomId:'new-room',bedId:'new-bed'},formerEmperor:{roomId:'old-room',bedId:'old-bed'}}};
 let sceneService,coreDurable=saved.core,sceneDurable=saved.scene;
 let seed=0;while(!supporterIds.every(id=>palaceUsurpationRoll(seed,`palace-usurpation:0:1:political-response:${id}`)<.9)||palaceUsurpationRoll(seed,'palace-usurpation:0:1:resolution')>=.2)seed++;
 const core=createPalaceUsurpation({worldSeed:seed,saved:saved.core,getClock:()=>clock,getContext:()=>context,
  verifyEvidence:(...args)=>sceneService?.verifyEvidence(...args)===true,saveState:value=>{if(!flags.coreSave)return false;coreDurable=copy(value);sceneDurable=sceneService?.snapshot();return true;}});
 if(!saved.core){assert(core.begin().ok);assert(core.selectRoute(core.currentTask().id,['guard']).ok);}
 const orderModel=createRoyalKitchenOrders({saved:saved.orders||null,getClock:()=>clock,saveState:()=>true});
 let meal=orderModel.forActor('cn-emperor');
 if(!meal){meal=orderModel.request({actorId:'cn-emperor',seatId:'china-palace-dining-seat-19.8',workerId:'player',workReceiptId:'cn-royal-kitchen-labor-1'});assert(orderModel.prepare(meal.id));meal=orderModel.lookup(meal.id);}
 const dish=new THREE.Group();dish.name=meal.mealId;dish.userData={orderId:meal.id,mealId:meal.mealId};lot.group.add(dish);
 let job={stage:'working',receiptId:meal.workReceiptId};
 const kitchen={mealFor:id=>orderModel.forActor(id),lookupMeal:(id,actorId)=>{const o=orderModel.lookup(id);return o?.actorId===actorId?o:null;},
  mealObject:id=>id===meal.id?dish:null,dutyActive:id=>job?.receiptId===id,isActing:()=>false};
 const archery=createChinaArcheryRoutine({npcs,lot,planPath,moveActor,doors,getPlayer:()=>player,poseContext:()=>({}),sharedNeeds:{status:()=>flags.yield?{seekMeal:true}:null}});
 const scene={country:'china',lot,player,npcs,archery,royalKitchen:kitchen,royalKitchenEmployment:{state:()=>({job})},furniture:{items:[]}};
 sceneService=createChinaUsurpationScene({core,getScene:()=>scene,getContext:()=>context,getClock:()=>clock,enabled:()=>scene.country==='china',
  planPath,moveActor,doors,isPresent:a=>all.includes(a),canBorrow:()=>flags.borrow,shouldYield:()=>flags.yield,
  standing:a=>!a.mount,canSee:()=>true,getBusy:()=>flags.busy,saved:saved.scene,
  saveState:value=>{assert.deepEqual(sceneService.snapshot(),value);if(!flags.runtimeSave)return false;sceneDurable=copy(value);coreDurable=core.snapshot();return true;}});
 const tick=seconds=>{for(let i=0;i<Math.round(seconds*10);i++){beginActorNavigationStep(.1);clock.hour+=.1/3600;
  if(archery.plotMeetingState(core.currentTask().id).pending)archery.update(.1,i/10,{position:player.root.position});
  sceneService.update(.1,i/10);}};
 function begin(kind,actorId){const selected=sceneService.intent(kind,actorId);assert(selected,kind);player.root.position.set(...selected.position);player.walking=false;
  assert(sceneService.prepareIntent(selected));assert(sceneService.executeIntent(selected),kind);return selected;}
 return {lot,scene,player,npcs,byId,context,flags,plans,core,archery,service:sceneService,orders:orderModel,dish,meal,tick,begin,
  leaveDuty(){job=null;},checkpoint:()=>({core:copy(coreDurable),scene:copy(sceneDurable),orders:orderModel.snapshot(),clock:copy(clock)}),
  save:()=>({core:core.snapshot(),scene:sceneService.snapshot(),orders:orderModel.snapshot(),clock:copy(clock)}),dispose(){sceneService.dispose();archery.dispose();resetSocialHolds();}};
}

test('political talk uses an adjacent supported stand and the original invisible-at-camera body',()=>{
 const f=fixture(),person=f.byId(supporterIds[0]),originalRoute=person.route,oldPosition=person.root.position.clone();
 f.begin('political-response',person.actorId);assert(person.root.position.equals(oldPosition),'borrowing cannot relocate a body');
 assert(socialHoldOwner(person.actorId));f.tick(3.9);assert.equal(f.core.currentTask().pledges.length,0);f.tick(.1);
 assert.equal(f.core.currentTask().pledges.length,1);assert.equal(person.route,originalRoute);assert.equal(socialHoldOwner(person.actorId),null);
 assert(f.service.state().papers.some(p=>p.id.startsWith('usurpation-notebook:')));assert(!f.service.state().papers.some(p=>p.charter));f.dispose();
});
test('a public gathering walks original bodies and yields without consuming the case',()=>{
 const f=fixture();for(const id of supporterIds){f.begin('political-response',id);f.tick(4);}
 assert(f.core.selectRoute(f.core.currentTask().id,['abdication']).ok);
 const official=f.byId(supporterIds[0]),route=official.route,start=official.root.position.clone();
 f.begin('abdication');assert(official.root.position.equals(start));f.tick(.1);assert(official.root.position.distanceTo(start)<.3);
 assert.equal(f.core.currentTask().preparations.abdication,null);assert(f.plans.includes(.34)&&f.plans.includes(.25));
 f.flags.yield=true;f.tick(.1);assert.equal(f.service.active(),false);assert.equal(socialHoldOwner(official.actorId),null);
 assert.equal(f.core.currentTask().stage,'planning');assert.equal(official.route,route);f.dispose();
});
test('a blocked post and unreachable original court do not create a gathering or proof',()=>{
 const f=fixture();f.lot.colliders.push({minX:-30,maxX:30,minZ:-40,maxZ:40,minY:0,maxY:3});
 assert.equal(f.service.intent('political-response',supporterIds[0]),null);assert.equal(f.core.currentTask().pledges.length,0);f.dispose();
});
test('guard intent is read-only and an at-site appointment waits without a timer until the original guards return',()=>{
 const f=fixture();assert.equal(f.service.intent('guard'),null);
 for(const id of supporterIds){f.begin('political-response',id);f.tick(4);}
 const selected=f.service.intent('guard');assert(selected);assert.equal(f.archery.plotMeetingState(f.core.currentTask().id).pending,false);
 f.player.root.position.set(...selected.position);assert(f.service.executeIntent(selected));assert(f.service.state().pendingGuard);
 assert.equal(f.service.snapshot().actions.activity,null);f.tick(.1);assert.equal(f.service.state().elapsed,0);
 f.service.cancel();assert.equal(f.archery.plotMeetingState(f.core.currentTask().id).pending,false);assert.equal(f.core.currentTask().preparations.guard,null);f.dispose();
});
test('original routed witnesses and a task-owned named charter complete one real investiture',()=>{
 const f=fixture();for(const id of supporterIds){f.begin('political-response',id);f.tick(4);}
 const until=predicate=>{for(let i=0;i<900&&!predicate();i++)f.tick(.1);assert(predicate(),JSON.stringify({state:f.service.state(),activity:f.service.snapshot().actions.activity,actors:f.npcs.map(a=>({id:a.actorId,position:a.root.position.toArray(),walking:a.walking}))}));};
 f.begin('guard');until(()=>!!f.core.currentTask().preparations.guard);
 f.begin('acclamation');until(()=>!!f.core.currentTask().preparations.acclamation);
 const witnesses=f.core.currentTask().preparations.acclamation.supporterIds;assert(witnesses.includes('cn-range-warden'));
 assert(f.core.currentTask().preparations.acclamation.targetId.startsWith('usurpation-range-handoff:'));
 f.begin('mechanism-resolution');until(()=>f.core.currentTask().stage==='ready-for-investiture');
 const caseId=f.core.currentTask().id,selected=f.service.intent('investiture-reading');assert(selected);
 assert(witnesses.every(id=>selected.participantIds.includes(id)));assert(selected.position[0]<-16);
 const document=f.lot.group.getObjectByName('usurpation-charter:'+caseId);assert(document?.isObject3D);
 assert.equal(document.userData.caseId,caseId);assert.equal(document.userData.holderBodyId,f.player.bodyId);
 f.player.root.position.set(...selected.position);assert(f.service.prepareIntent(selected));assert.equal(document.visible,true);
 assert(f.service.executeIntent(selected));until(()=>f.core.currentTask().stage==='invested');
 assert.equal(f.core.office().actorId,'player');assert.equal(f.byId('cn-emperor').alive,true);assert.equal(f.core.office().formerEmperors.at(-1)?.actorId,'cn-emperor');
 f.dispose();
});
test('meal marker and adapter binding share one snapshot, and only consumed original order can apply cold',()=>{
 const f=fixture();assert(f.core.selectRoute(f.core.currentTask().id,['intrigue']).ok);
 // The real upper preparation surface is present; the player is already there.
 f.lot.walkableSurfaces.push({minX:16,maxX:26,minZ:-12,maxZ:-3,y:4.015});f.player.root.position.set(20,4.015,-6.11);
 f.begin('intrigue');f.tick(6);const snapshot=f.service.snapshot(),pending=snapshot.actions.mealPending;
 assert(pending?.bound);assert.equal(snapshot.storyMeals[pending.storyActionId].binding.objectId,f.dish.name);
 assert.equal(f.orders.lookup(f.meal.id).stage,'prepared');assert.equal(f.core.currentTask().preparations.intrigue,null);
 assert(f.orders.change(f.meal.id,'prepared','cooked'));assert(f.orders.change(f.meal.id,'cooked','carrying'));
 assert(f.orders.change(f.meal.id,'carrying','served'));assert(f.orders.change(f.meal.id,'served','eating'));
 assert.equal(f.orders.consume(f.meal.id,'cn-emperor',11.9),false);assert(f.orders.consume(f.meal.id,'cn-emperor',12));
 f.flags.coreSave=false;f.tick(.1);assert.equal(f.core.currentTask().preparations.intrigue,null);
 const saved=f.save();f.dispose();const cold=fixture(saved);cold.leaveDuty();cold.tick(1.1);
 assert.equal(cold.core.currentTask().preparations.intrigue.meal.orderId,f.meal.id);assert.equal(cold.core.currentTask().preparations.intrigue.meal.status,'consumed');
 assert.equal(cold.byId('cn-emperor').alive,true);assert.equal(cold.orders.snapshot().supply.remaining,119);cold.dispose();
});
