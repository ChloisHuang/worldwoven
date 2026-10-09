// Real original-artisan service, timers, props and durable receipts. Actor
// positions and straight-line routes are staged fixtures, not production
// scene/pathfinding or browser evidence; salary/XP are separately contracted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three');
const {createEgyptArtisanService,EGYPT_ARTISAN_POINTS:P}=await import('../source/game/egypt-artisan-service.js');
const {validEgyptArtisanReceipt}=await import('../source/game/egypt-artisan-role.js');
const {holdSocialActors,releaseSocialActors}=await import('../source/game/npc-social-ownership.js');
const {beginActorNavigationStep}=await import('../source/game/actor-navigation.js');
const DUTY='eg-papyrus-labor-1',copy=structuredClone;
function fixture({saved=null,clock:clockSaved,actors:actorSaved,player:playerSaved}={}){
 const group=new T.Group();
 function actor(id,p){const root=new T.Group();root.position.fromArray(p);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.16,1.08,.43);hands[1].position.set(.16,1.08,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,home:new T.Vector3(...p),station:{id,npcPosition:p.slice()},phase:0,route:[],locomotion:{walkSpeed:2},animate(_time,walking,_action,context){this.lastPose={walking,context:copy(context)};}};}
 const artisan=actor('egypt-papyrus',P.home),client=actor('egypt-royal-reception',P.clientHome),player=actor('player',playerSaved||[30,0,30]),npcs=[artisan,client];
 for(const r of actorSaved||[]){const n=npcs.find(a=>a.station.id===r.id);n.root.position.fromArray(r.position);n.root.rotation.y=r.yaw;}
 const clock=copy(clockSaved||{day:1,hour:6,seconds:0});let mounted=null,borrow=true,clientAvailable=true,blocked=false,reject=()=>false,durable=saved?copy(saved):null;
 const doors={routeStep(route,p){if(blocked)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createEgyptArtisanService({npcs,lot:{group},doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},getPlayer:()=>player,getMounted:()=>mounted,getClock:()=>clock,poseContext:(_n,target)=>({...target}),canBorrow:()=>borrow,canUseClient:()=>clientAvailable,saved,saveState:s=>{if(reject(s))return false;durable=copy(s);return true;}});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;if(clock.hour>=24){clock.hour-=24;clock.day++;}beginActorNavigationStep(.1);service.update(.1,clock.seconds);}};
 const until=(predicate,label='expected state',limit=2000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),`${label}: ${JSON.stringify(service.state())}`);};
 const checkpoint=()=>({saved:service.snapshot(),clock:copy(clock),actors:npcs.map(n=>({id:n.station.id,position:n.root.position.toArray(),yaw:n.root.rotation.y})),player:player.root.position.toArray()});
 return {service,duty:service.duty,artisan,client,player,group,clock,tick,until,checkpoint,move:p=>player.root.position.fromArray(p),setDay:day=>{clock.day=day;clock.hour=6;},reject:fn=>reject=fn,borrow:v=>borrow=v,clientAvailable:v=>clientAvailable=v,mount:v=>mounted=v,block:v=>blocked=v,get durable(){return durable;},dispose:()=>service.dispose()};
}
function claim(f){f.move(P.registry);f.duty.requestMeeting(true);f.until(()=>f.duty.meetingReady(),'Samira actual local meeting');assert(f.duty.claimDuty(DUTY));f.until(()=>f.duty.dutyActive(DUTY),'safe local duty takeover');f.duty.requestMeeting(false);}
function stage(f,expected,next,{minimum=true}={}){const w=f.duty.workIntent(DUTY);assert.equal(w?.stage,expected);f.move(w.position);assert.equal(f.duty.executeWork(w,'eg-papyrus-labor-999'),false);assert(f.duty.executeWork(w,DUTY));if(minimum){f.tick(Math.round(w.duration*10)-1);assert.equal(f.service.state().order?.stage||'request',expected,'work must consume actual action seconds');}f.until(s=>next===null?!s.order:s.order?.stage===next,`${expected} to ${next}`);return w;}
function toHeld(f){claim(f);stage(f,'request','materials');stage(f,'materials','outline');stage(f,'outline','paint');stage(f,'paint','pickup');stage(f,'pickup','deliver');assert(f.duty.held());}

test('one original numbered player commission consumes real steps and needs original client acceptance',()=>{
 const f=fixture();claim(f);f.clientAvailable(false);f.move(P.client);assert.equal(f.duty.executeWork(f.duty.workIntent(DUTY),DUTY),false);assert.equal(f.service.state().serial,0);f.clientAvailable(true);
 stage(f,'request','materials');const id=f.service.state().order.id;assert.equal(id,'egypt-artisan-1');assert.equal(f.service.state().stock.sheets,8);stage(f,'materials','outline');assert.equal(f.service.state().stock.sheets,7);assert.deepEqual(f.service.state().materials,[id+'-materials']);stage(f,'outline','paint');stage(f,'paint','pickup');assert.deepEqual(f.duty.workReceipts(DUTY),[]);stage(f,'pickup','deliver');assert.equal(f.service.state().order.holder,'player');f.tick();const root=f.group.getObjectByName('纸莎草原单工件');assert(root.visible);assert.equal(root.userData.orderId,id);assert(root.position.distanceTo(f.player.root.position)<2);
 const w=f.duty.workIntent(DUTY);f.move(w.position);f.client.root.position.x+=1;assert.equal(f.duty.executeWork(w,DUTY),false);f.tick(40);assert.deepEqual(f.duty.workReceipts(DUTY),[]);assert.equal(f.service.state().order.id,id);f.client.root.position.fromArray(P.clientHome);
 assert(f.duty.executeWork(w,DUTY));f.tick(10);f.clientAvailable(false);f.tick(50);assert.deepEqual(f.duty.workReceipts(DUTY),[]);assert(Math.abs(f.service.state().step.elapsed-1)<1e-9);f.clientAvailable(true);f.until(s=>!s.order,'Ahe acceptance');const [proof]=f.duty.workReceipts(DUTY);assert(validEgyptArtisanReceipt(proof));assert.equal(proof.completed,true);assert.equal(proof.orderId,id);assert.equal(proof.itemId,id+'-scroll');assert.equal(proof.supplyReceipt,id+'-materials');assert.deepEqual(f.service.state().completed,[id]);assert.deepEqual(f.service.state().materials,[id+'-materials']);assert(f.duty.canEndDuty(DUTY));assert.equal(f.duty.workIntent(DUTY),null,'only one original commission in this simulated day');f.tick(100);assert.equal(f.duty.workReceipts(DUTY).length,1);const accepted=f.checkpoint();f.dispose();const reload=fixture(accepted);const display=reload.group.getObjectByName('纸莎草原单工件');assert(display.visible);assert.equal(display.userData.orderId,id);assert.deepEqual(display.position.toArray(),P.clientTop);assert(reload.service.restore(accepted.saved));assert.equal(display.userData.orderId,id);reload.setDay(2);stage(reload,'request','materials');assert.equal(display.userData.orderId,id,'unspent next-day order leaves previous accepted display at client');assert.deepEqual(display.position.toArray(),P.clientTop);stage(reload,'materials','outline');assert.equal(display.userData.orderId,'egypt-artisan-2');assert(display.children[0].children.every(line=>!line.visible),'new material starts without completed ink');stage(reload,'outline','paint');assert(display.children[0].children.every(line=>line.visible));reload.dispose();
});

test('refused material or acceptance saves retain the exact original and debit or finish only once',()=>{
 const f=fixture();claim(f);stage(f,'request','materials');const w=f.duty.workIntent(DUTY);f.move(w.position);f.reject(s=>s.materials.length>0);assert(f.duty.executeWork(w,DUTY));f.tick(40);assert.equal(f.service.state().stock.sheets,8);assert.equal(f.service.state().order.stage,'materials');assert.deepEqual(f.service.state().materials,[]);assert.equal(f.durable.stock.sheets,8);f.reject(()=>false);f.until(s=>s.order?.stage==='outline');assert.equal(f.service.state().stock.sheets,7);stage(f,'outline','paint');stage(f,'paint','pickup');stage(f,'pickup','deliver');const deliver=f.duty.workIntent(DUTY);f.move(deliver.position);f.reject(s=>s.completed.length>0);assert(f.duty.executeWork(deliver,DUTY));f.tick(30);assert.equal(f.service.state().order.stage,'deliver');assert(f.duty.held());assert.deepEqual(f.duty.workReceipts(DUTY),[]);assert.deepEqual(f.durable.completed,[]);f.reject(()=>false);f.until(s=>!s.order);assert.equal(f.duty.workReceipts(DUTY).length,1);assert.equal(f.service.state().materials.length,1);assert.equal(f.service.state().stock.sheets,7);f.dispose();
});

test('cold held reload preserves same scroll, hand prop and strict persisted revision',()=>{
 const f=fixture();toHeld(f);const checkpoint=f.checkpoint();f.dispose();const g=fixture(checkpoint);assert(g.service.restore(checkpoint.saved));assert.equal(g.service.restore({...checkpoint.saved,revision:checkpoint.saved.revision+1}),false);assert.equal(g.service.restore({...checkpoint.saved,revision:checkpoint.saved.revision-1}),false);g.tick();assert(g.duty.held());assert.equal(g.service.state().order.id,checkpoint.saved.order.id);assert.equal(g.group.getObjectByName('纸莎草原单工件').userData.orderId,checkpoint.saved.order.id);assert.deepEqual(g.service.state().materials,checkpoint.saved.materials);stage(g,'deliver',null);assert.equal(g.duty.workReceipts(DUTY).length,1);assert.equal(g.service.state().stock.sheets,7);g.dispose();
});

test('pause preserves the original while explicit cancellation returns only that scroll to Samira',()=>{
 const f=fixture();toHeld(f);const id=f.service.state().order.id;f.move([30,0,30]);f.tick();assert.equal(f.duty.dutyState().status,'paused');f.tick(100);assert.equal(f.service.state().order.id,id);assert(f.duty.held());assert.deepEqual(f.duty.workReceipts(DUTY),[]);assert.equal(f.duty.releaseDuty(DUTY,{evaluate:true}),false,'carried original must first be returned to its desk');
 const saved=f.checkpoint();f.dispose();const g=fixture(saved);g.move(P.registry);g.tick(20);assert.equal(g.duty.dutyState().status,'paused','returning alone does not resume');claim(g);g.move(P.desk);g.reject(s=>s.duty===null);assert.equal(g.duty.releaseDuty(DUTY,{evaluate:true}),false);assert(g.duty.held());assert.deepEqual(g.duty.workReceipts(DUTY),[]);g.reject(()=>false);assert(g.duty.releaseDuty(DUTY,{evaluate:true}));assert.equal(g.service.state().order.id,id);assert.equal(g.service.state().order.stage,'pickup');assert.equal(g.service.state().order.holder,'desk');assert.equal(g.duty.workReceipts(DUTY)[0].outcome,'handoff');assert(g.duty.releaseDuty(DUTY,{evaluate:true}));assert.equal(g.duty.workReceipts(DUTY).length,1);g.move([30,0,30]);g.until(s=>s.completed.includes(id),'Samira accepts and completes exact returned original');assert.equal(g.service.state().stock.sheets,7);assert.deepEqual(g.service.state().materials,[id+'-materials']);assert.equal(g.duty.workReceipts(DUTY).filter(r=>r.completed).length,0);g.dispose();
});

test('meal need and social ownership gate Samira and original client; old NPC work drains before takeover',()=>{
 const f=fixture();f.borrow(false);f.duty.requestMeeting(true);f.move(P.registry);f.tick(30);assert.equal(f.duty.meetingReady(),false);assert.equal(f.duty.canClaimDuty(),false);assert.equal(f.service.owns(f.artisan),false);assert.equal(f.service.state().serial,0);f.borrow(true);f.tick();assert(f.duty.meetingReady());assert(holdSocialActors(['egypt-papyrus'],'artisan-fixture'));assert.equal(f.duty.meetingReady(),false);assert.equal(f.duty.canClaimDuty(),false);releaseSocialActors('artisan-fixture');f.duty.requestMeeting(false);f.move([30,0,30]);f.until(s=>s.order?.stage==='outline','autonomous original material debit');const id=f.service.state().order.id;
 f.move(P.registry);f.duty.requestMeeting(true);assert.equal(f.duty.meetingReady(),false);assert(f.duty.claimDuty(DUTY));assert.equal(f.duty.dutyState().status,'draining');assert.equal(f.duty.workIntent(DUTY),null);f.until(s=>s.order?.stage==='deliver');f.tick();assert.equal(f.artisan.lastPose.context.handoff,true);assert.deepEqual(f.artisan.lastPose.context.archery.hands,[[-.16,1.25,.43],[.16,1.25,.43]]);assert(holdSocialActors(['egypt-royal-reception'],'client-fixture'));f.tick(100);assert.equal(f.service.state().order.id,id);assert.equal(f.duty.dutyState().status,'draining');assert.deepEqual(f.duty.workReceipts(DUTY),[]);releaseSocialActors('client-fixture');f.until(()=>f.duty.dutyActive(DUTY),'old original accepted before Samira yields');assert.deepEqual(f.service.state().completed,[id]);assert.deepEqual(f.duty.workReceipts(DUTY),[]);assert.equal(f.service.state().stock.sheets,7);f.dispose();
});

test('eight autonomous originals remain finite across future simulated days and cold reload',()=>{
 const f=fixture();for(let day=1;day<=8;day++){f.setDay(day);f.until(s=>s.completed.length===day,`original ${day} accepted`);assert.equal(f.service.state().serial,day);assert.equal(f.service.state().stock.sheets,8-day);assert.equal(f.service.state().stock.pigment,8-day);f.tick(50);assert.equal(f.service.state().serial,day,'no second commission within the same day');}
 const saved=f.checkpoint();f.dispose();const g=fixture(saved);g.setDay(30);g.tick(1000);assert.equal(g.service.state().serial,8);assert.equal(g.service.state().completed.length,8);assert.equal(g.service.state().materials.length,8);assert.equal(g.service.state().stock.sheets,0);assert.equal(g.service.state().stock.pigment,0);assert.deepEqual(g.duty.workReceipts(DUTY),[]);claim(g);assert.equal(g.duty.workIntent(DUTY),null);assert(g.duty.canEndDuty(DUTY));g.dispose();
});


test('malformed original history, material source or completion proofs cannot restore',()=>{
 const f=fixture();toHeld(f);const held=f.checkpoint();stage(f,'deliver',null);const accepted=f.checkpoint();f.dispose();
 for(const [saved,change]of [
  [held.saved,s=>s.order.number=Number.NaN],
  [held.saved,s=>s.order.requestedAt=undefined],
  [held.saved,s=>s.order.title='invented'],
  [held.saved,s=>s.materials[0]='egypt-artisan-8-materials'],
  [held.saved,s=>s.completed.push('egypt-artisan-8')],
  [accepted.saved,s=>{s.materials=[];s.stock.sheets=s.stock.pigment=8;}],
  [accepted.saved,s=>{s.receipts[0]={...s.receipts[0],number:2,orderId:'egypt-artisan-2',id:'egypt-artisan-2-art-'+DUTY,itemId:'egypt-artisan-2-scroll',supplyReceipt:'egypt-artisan-2-materials'};}],
 ]){const invalid=copy(saved);change(invalid);const bad=fixture({saved:invalid});assert.equal(bad.service.state().lastError,'invalid-artisan-state');bad.dispose();}
});
