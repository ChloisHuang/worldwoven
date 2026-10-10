// Real original-artisan service, timers, props and durable receipts. Actor
// positions and straight-line routes are staged fixtures, not production
// scene/pathfinding or browser evidence; salary/XP are separately contracted.
import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three');
const {createFranceArtService,FRANCE_ART_POINTS:P}=await import('../source/game/france-art-service.js');
const {validFranceArtReceipt}=await import('../source/game/france-art-role.js');
const {holdSocialActors,releaseSocialActors}=await import('../source/game/npc-social-ownership.js');
const {beginActorNavigationStep}=await import('../source/game/actor-navigation.js');
const DUTY='fr-atelier-labor-1',copy=structuredClone;
function fixture({saved=null,clock:clockSaved,actors:actorSaved,player:playerSaved}={}){
 const group=new T.Group();
 function actor(id,p){const root=new T.Group();root.position.fromArray(p);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.16,1.08,.43);hands[1].position.set(.16,1.08,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,home:new T.Vector3(...p),station:{id,npcPosition:p.slice()},phase:0,route:[],locomotion:{walkSpeed:2},animate(_time,walking,_action,context){this.lastPose={walking,context:copy(context)};}};}
 const artisan=actor('france-atelier',P.home),player=actor('player',playerSaved||[30,0,30]),npcs=[artisan];
 for(const r of actorSaved||[]){const n=npcs.find(a=>a.station.id===r.id);n.root.position.fromArray(r.position);n.root.rotation.y=r.yaw;}
 const clock=copy(clockSaved||{day:1,hour:6,seconds:0});let mounted=null,borrow=true,clientAvailable=true,blocked=false,reject=()=>false,durable=saved?copy(saved):null;
 const doors={routeStep(route,p){if(blocked)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createFranceArtService({npcs,lot:{group},doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},getPlayer:()=>player,getMounted:()=>mounted,getClock:()=>clock,poseContext:(_n,target)=>({...target}),canBorrow:()=>borrow,saved,saveState:s=>{if(reject(s))return false;durable=copy(s);return true;}});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;if(clock.hour>=24){clock.hour-=24;clock.day++;}beginActorNavigationStep(.1);service.update(.1,clock.seconds);}};
 const until=(predicate,label='expected state',limit=2000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),`${label}: ${JSON.stringify(service.state())}`);};
 const checkpoint=()=>({saved:service.snapshot(),clock:copy(clock),actors:npcs.map(n=>({id:n.station.id,position:n.root.position.toArray(),yaw:n.root.rotation.y})),player:player.root.position.toArray()});
 return {service,duty:service.duty,artisan,player,group,clock,tick,until,checkpoint,move:p=>player.root.position.fromArray(p),setDay:day=>{clock.day=day;clock.hour=6;},reject:fn=>reject=fn,borrow:v=>borrow=v,clientAvailable:v=>clientAvailable=v,mount:v=>mounted=v,block:v=>blocked=v,get durable(){return durable;},dispose:()=>service.dispose()};
}
function claim(f){f.move(P.registry);f.duty.requestMeeting(true);f.until(()=>f.duty.meetingReady(),'Lucien actual local meeting');assert(f.duty.claimDuty(DUTY));f.until(()=>f.duty.dutyActive(DUTY),'safe local duty takeover');f.duty.requestMeeting(false);}
function stage(f,expected,next,{minimum=true}={}){const w=f.duty.workIntent(DUTY);assert.equal(w?.stage,expected);f.move(w.position);assert.equal(f.duty.executeWork(w,'fr-atelier-labor-999'),false);assert(f.duty.executeWork(w,DUTY));if(minimum){f.tick(Math.round(w.duration*10)-1);assert.equal(f.service.state().order?.stage||'request',expected,'work must consume actual action seconds');}f.until(s=>next===null?!s.order:s.order?.stage===next,`${expected} to ${next}`);return w;}
function toHeld(f){claim(f);stage(f,'request','materials');stage(f,'materials','outline');stage(f,'outline','paint');stage(f,'paint','pickup');stage(f,'pickup','deliver');assert(f.duty.held());}

test('chosen original uses finite same-number supplies, physical stages, curator acceptance and distinct gallery art',()=>{
 const f=fixture();claim(f);const choices=f.duty.workChoices(DUTY);assert.equal(choices.length,4);const selected=choices.find(w=>w.designId==='colonnade-evening');f.move(selected.position);assert(f.duty.executeWork(selected,DUTY));f.until(s=>s.order?.stage==='materials');assert.equal(f.service.state().order.designId,'colonnade-evening');
 stage(f,'materials','outline');assert.equal(f.service.state().stock.sheets,5);stage(f,'outline','paint');stage(f,'paint','pickup');stage(f,'pickup','deliver');assert(f.duty.held());
 const props=f.group.getObjectByName('卢西安原画展览'),held=props.getObjectByName('同号创作原画');assert.equal(held.userData.orderId,'france-art-1');assert(held.children.length>10);const saved=f.checkpoint();f.dispose();const r=fixture(saved);assert(r.duty.held());assert.equal(r.service.state().stock.sheets,5);r.move(P.catalogue);const w=r.duty.workIntent(DUTY);assert(r.duty.executeWork(w,DUTY));r.borrow(false);r.tick(40);assert.equal(r.service.state().completed.length,0);r.borrow(true);r.until(s=>s.completed.length===1,'original artist sees gallery acceptance');assert.equal(r.service.state().completed[0].designId,'colonnade-evening');assert.equal(r.service.state().completed[0].artist,'player');assert(validFranceArtReceipt(r.duty.workReceipts(DUTY)[0]));assert(r.duty.canEndDuty(DUTY));const painting=r.group.getObjectByName('宫苑柱廊·暖暮');assert( painting&&painting.userData.orderId==='france-art-1');r.tick(30);assert.equal(r.duty.workReceipts(DUTY).length,1);r.dispose();
});
test('failed material save, repeat actions and failed catalogue save never duplicate stock or originals',()=>{
 const f=fixture();claim(f);stage(f,'request','materials');f.reject(s=>s.stock.sheets===5);const w=f.duty.workIntent(DUTY);f.move(w.position);assert(f.duty.executeWork(w,DUTY));f.tick(50);assert.equal(f.service.state().stock.sheets,6);assert.deepEqual(f.service.state().materials,[]);f.reject(()=>false);f.until(s=>s.order.stage==='outline');assert.equal(f.duty.executeWork(w,DUTY),false);stage(f,'outline','paint');stage(f,'paint','pickup');stage(f,'pickup','deliver');f.reject(s=>s.completed.length>0);const end=f.duty.workIntent(DUTY);f.move(end.position);assert(f.duty.executeWork(end,DUTY));f.tick(250);assert(f.duty.held());assert.equal(f.service.state().completed.length,0);assert.deepEqual(f.duty.workReceipts(DUTY),[]);f.reject(()=>false);f.until(s=>s.completed.length===1);assert.equal(f.service.state().stock.sheets,5);assert.equal(f.duty.workReceipts(DUTY).length,1);f.dispose();
});
test('cancel returns the actual canvas before NPC continuation, never refunds spent materials or awards NPC work XP',()=>{
 const f=fixture();toHeld(f);f.move(P.catalogue);assert.equal(f.duty.releaseDuty(DUTY,{evaluate:true}),false);f.move(P.desk);assert(f.duty.releaseDuty(DUTY,{evaluate:true}));assert.equal(f.service.state().stock.sheets,5);assert.equal(f.service.state().order.stage,'pickup');assert.equal(f.duty.workReceipts(DUTY)[0].completed,false);f.move([30,0,30]);f.until(s=>s.completed.length===1);assert.equal(f.service.state().completed[0].artist,'npc');assert.equal(f.duty.workReceipts(DUTY).filter(r=>r.completed).length,0);f.dispose();
});
test('six opening sets stop on exhaustion across reloads, preserve six distinct original IDs and leave needs/lesson independent',()=>{
 let f=fixture();for(let day=1;day<=6;day++){f.setDay(day);f.until(s=>s.completed.length===day,'daily finite original '+day);assert.equal(f.service.state().stock.sheets,6-day);const cp=f.checkpoint();f.dispose();f=fixture(cp);assert.equal(f.service.state().completed.length,day);}
 f.setDay(40);f.tick(200);assert.equal(f.service.state().serial,6);assert.equal(f.service.state().materials.length,6);assert.equal(f.group.getObjectByName('卢西安原画展览').children.length,6);assert.equal(f.service.state().receipts.length,0);f.dispose();
});
test('invalid restored material balance fails closed instead of replenishing',()=>{
 const f=fixture();const saved=f.service.snapshot();saved.stock.sheets=99;f.dispose();const r=fixture({saved});assert.equal(r.service.state().lastError,'invalid-artisan-state');r.tick(100);assert.equal(r.service.state().serial,0);assert.equal(r.duty.claimDuty(DUTY),false);r.dispose();
});
