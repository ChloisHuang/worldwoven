import {findActorStandPoint} from '../source/game/actor-navigation.js';
// The royal controller and shared physiology must agree on one consumed meal.
// Stubs isolate receipt/choice/continuity failures; production navigation has a
// separate scene check and is not claimed by these direct-route fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createDailyNeeds,DAILY_NEEDS_HOUR as H} from '../source/game/daily-needs.js';
import {palaceResidentSave,CHINA_CONSORTS} from '../source/game/china-palace-residents.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {consortActivities} from '../source/game/china-consort-activities.js';
const ids=['cn-emperor',...CHINA_CONSORTS.map(p=>p.id)],dining='china-palace-dining-seat-19.8';
const copy=x=>JSON.parse(JSON.stringify(x));
const vector=(x=0,y=.215,z=0)=>({x,y,z,set(x,y,z){Object.assign(this,{x,y,z});return this;},copy(p){return this.set(p.x,p.y,p.z);},toArray(){return [this.x,this.y,this.z];},distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}});
const context=vm.createContext({console}),cache=new Map();
const props=new vm.SyntheticModule(['attachPalaceCostume','createPalaceMealKit'],function(){this.setExport('attachPalaceCostume',()=>({dispose(){}}));this.setExport('createPalaceMealKit',actor=>({show:v=>actor.kitVisible=v,sync(){},dispose(){}}));},{context});
const nav=new vm.SyntheticModule(['followActorRoute','findActorStandPoint'],function(){this.setExport('findActorStandPoint',findActorStandPoint);this.setExport('followActorRoute',(n,dt)=>{const target=n.route[0];if(!target)return {};const d=n.root.position.distanceTo(target),step=Math.min(d,dt*4);if(d<=step+.001){n.root.position.copy(target);n.route.shift();}else for(const key of['x','y','z'])n.root.position[key]+=(target[key]-n.root.position[key])*step/d;n.walking=true;return {};});},{context});
function module(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const mod=module('source/game/china-palace-life.js');await mod.link(s=>s.includes('actor-navigation')?nav:s.includes('china-palace-costume')?props:module('source/game/'+s.replace('./','')));await mod.evaluate();
const receipt=o=>({source:'china-royal-kitchen',number:o.number,id:o.id+'-consumed',actorId:o.actorId,orderId:o.id,mealId:o.mealId,dishId:'royal-steamed-meal',supplyReceipt:o.id+'-prepared',completed:true});
function fixture({actorId=ids[1],checkpoint=null,empty=false,withKitchen=true}={}){
 const clock={seconds:0},needs=createDailyNeeds({saved:checkpoint?.needs||{},getClock:()=>clock,legacyPeople:Object.fromEntries(ids.map(id=>[id,{needs:{hunger:.7}}]))});needs.enter('china',ids);
 const roles=mod.namespace.CHINA_PALACE_ROLES,npcs=[...roles,{id:'cn-tea',npcPosition:[2.9,.815,-28.25]}].map(station=>({station,home:vector(...station.npcPosition),root:{position:vector(...(checkpoint?.positions?.[station.id]||station.npcPosition)),rotation:{y:0}},route:[],phase:0,locomotion:{walkSpeed:4},animate(t,w,a,c){this.pose={...c};}}));
 const target=npcs.find(n=>n.station.id===actorId),items=[{id:'china-furniture-throne',position:[0,1.415,-4.3]},{id:'china-furniture-seat',position:[-21.7,7.815,-4.6]},...CHINA_CONSORTS.map(p=>({id:p.privateBedId,position:p.npcPosition,kind:'bed'})),{id:dining,position:[19.8,.215,1.3]},{id:'china-palace-dining-seat-22.2',position:[22.2,.215,1.3]}].map(s=>({...s,anchor:s.position.slice(),kind:s.kind||'seat',yaw:0}));
 let blockedExit=false,failComplete=false,failCancel=false,failStart=false,requests=0,consumes=0,cancels=0;
 let orders=copy(checkpoint?.orders||[]),serial=checkpoint?.serial||0;
 const service={
  canRequestMeal:id=>ids.includes(id)&&(!empty||orders.some(o=>o.actorId===id&&!['consumed','cancelled'].includes(o.stage))),
  mealFor:id=>copy(orders.findLast(o=>o.actorId===id)||null),lookupMeal:(id,actorId)=>copy(orders.find(o=>o.id===id&&o.actorId===actorId)||null),
  requestMeal({actorId,seatId}){requests++;const active=orders.find(o=>o.actorId===actorId&&!['consumed','cancelled'].includes(o.stage));if(active)return copy(active);if(empty)return null;const number=++serial,id='cn-royal-meal-'+number,o={id,number,actorId,seatId,mealId:id+'-meal',stage:'requested',eatingSeconds:0};orders.push(o);return copy(o);},
  mealReady(id,actorId){const o=orders.find(o=>o.id===id&&o.actorId===actorId);return !!o&&['served','eating'].includes(o.stage);},
  startMeal(id,actorId){if(failStart||!this.mealReady(id,actorId))return false;orders.find(o=>o.id===id).stage='eating';return true;},
  completeMeal(id,actorId){const o=orders.find(o=>o.id===id&&o.actorId===actorId);if(failComplete||!o||o.stage!=='eating'||o.eatingSeconds<12)return false;o.stage='consumed';consumes++;needs.mealReceipts([receipt(o)]);return true;},
  cancelMeal(id){if(failCancel)return false;const o=orders.findLast(o=>o.actorId===id);if(o&&!['consumed','cancelled'].includes(o.stage)){o.stage='cancelled';cancels++;}return true;}
 };
 const seed=palaceResidentSave({worldSeed:31,actorIds:[...ids,'cn-tea']});for(const[id,p]of Object.entries(seed.people)){p.current=id===actorId?{id:'meal',...(id!=='cn-emperor'?{targetId:dining}:{}),duration:15,startedAt:0}:{id:'read',duration:10000,startedAt:0};p.needs={hunger:.7,fatigue:.1,social:.1};}
 const life=mod.namespace.createChinaPalaceLife({npcs,lot:{colliders:[],bounds:{},interiorRooms:[]},furniture:{items,facilities:{reserve:()=>true,occupy:()=>true},releaseActor(){},canUse:()=>true,canSit:()=>true,standPoint:(nav,safety,seat)=>blockedExit?null:vector(...seat.position)},doors:{},planPath:(from,to)=>[vector(to.x,to.y,to.z)],moveActor(){},poseContext:()=>({visualFloorOffset:0}),worldSeed:31,saved:checkpoint?.continuity?{continuity:checkpoint.continuity}:seed,sharedNeeds:needs,getKitchen:withKitchen?()=>service:null});
 let t=0;const state=()=>life.state().actors.find(n=>n.id===actorId),tick=(count=1,player={})=>{for(let i=0;i<count;i++){t+=.1;clock.seconds+=.1;needs.update();const o=orders.findLast(o=>o.actorId===actorId);if(o?.stage==='eating'&&state().mounted===o.seatId&&player.conversationActorId!==actorId)o.eatingSeconds+=.1;life.update(.1,t,{hour:10,...player});}};
 const until=(fn,label)=>{for(let i=0;i<1600&&!fn();i++)tick();assert(fn(),label+JSON.stringify(state()));};
 return {life,target,npcs,needs,service,state,tick,until,get orders(){return orders;},get requests(){return requests;},get consumes(){return consumes;},get cancels(){return cancels;},serve(){orders.findLast(o=>o.actorId===actorId).stage='served';},block:v=>blockedExit=v,reject:v=>failComplete=v,rejectCancel:v=>failCancel=v,rejectStart:v=>failStart=v,checkpoint:()=>({continuity:copy(life.snapshot()),needs:needs.snapshot(),orders:copy(orders),serial,positions:Object.fromEntries(npcs.map(n=>[n.station.id,n.root.position.toArray()]))})};
}

test('only the four existing adults enroll for food, keeping legacy hunger and receipt provenance',()=>{
 const clock={seconds:0},legacy=Object.fromEntries(ids.map((id,i)=>[id,{needs:{hunger:.21+i*.19}}]));let saved,fail=false;
 const needs=createDailyNeeds({getClock:()=>clock,legacyPeople:legacy,saveState:s=>{if(fail)return false;saved=s;return true;}});needs.enter('china',ids);
 for(const id of ids){assert(needs.has(id));assert(Math.abs(needs.hunger(id)-legacy[id].needs.hunger)<1e-12);}assert.equal(needs.has('cn-royal-child'),false);
 clock.seconds+=40*H;needs.update();for(const id of ids){assert.equal(needs.read(id).toilet,0);assert.equal(needs.read(id).toiletStrain,0);assert.equal(needs.status(id).seekToilet,false);assert.equal(needs.snapshot().people[id].toiletAge,0);}
 const r=receipt({id:'cn-royal-meal-1',number:1,actorId:ids[0],mealId:'cn-royal-meal-1-meal'});
 for(const change of[{completed:false},{actorId:'player'},{actorId:'cn-minister-works'},{number:2},{id:'fake'},{mealId:'other'},{dishId:'staff-ramen'},{supplyReceipt:'missing'}])assert.equal(needs.mealReceipts([{...r,...change}]),false);
 fail=true;assert.equal(needs.mealReceipts([r]),false);assert.equal(needs.hunger(ids[0]),1);fail=false;assert(needs.mealReceipts([r]));assert.equal(needs.hunger(ids[0]),0);assert.equal(needs.mealReceipts([r]),false);assert.equal(createDailyNeeds({saved}).mealReceipts([r]),false);
});

test('ready original plate and accepted start gate all eating; conversation and reload preserve partial time',()=>{
 const f=fixture();assert.equal(f.requests,1);f.until(()=>f.state().mounted===dining,'reaches original seat');f.tick(50);assert.equal(f.state().elapsed,0);assert.equal(f.target.pose.seatedMeal,false);assert.equal(f.target.kitVisible,false);
 f.serve();f.rejectStart(true);f.tick(20);assert.equal(f.state().elapsed,0);f.rejectStart(false);f.tick(30);assert(f.target.pose.seatedMeal);assert.equal(f.target.kitVisible,false,'the kitchen is the only bowl owner');const partial=f.state().elapsed;f.tick(30,{conversationActorId:ids[1]});assert.equal(f.state().elapsed,partial);assert.equal(f.target.pose.seatedMeal,false);
 const saved=f.checkpoint(),r=fixture({checkpoint:saved});assert.equal(r.requests,0);assert.equal(r.state().orderId,f.state().orderId);assert.equal(r.state().mealId,f.state().mealId);assert.equal(r.state().elapsed,partial);r.reject(true);r.tick(170);assert.equal(r.state().elapsed,15);assert.equal(r.consumes,0);assert(r.needs.hunger(ids[1])>.7);r.reject(false);r.until(()=>r.consumes===1,'commits only the original full meal');assert(r.needs.hunger(ids[1])<.001);r.tick(10);assert.equal(r.consumes,1);
});

test('consumed kitchen receipt before palace checkpoint resumes the return without a second meal',()=>{
 const f=fixture();f.until(()=>f.state().mounted===dining,'seated');f.serve();f.tick(30);const stale=f.checkpoint();f.until(()=>f.consumes===1,'consumed');const durable=f.checkpoint();stale.orders=durable.orders;stale.needs=durable.needs;const r=fixture({checkpoint:stale});r.tick();assert.equal(r.requests,0);assert.equal(r.consumes,0);assert.equal(r.state().stage,'return-suite');assert.equal(r.state().mealCompleted,true);
 const next=fixture({checkpoint:{...durable,continuity:null}});assert.equal(next.requests,1,'a later intention requests a new meal instead of reusing the last consumed order');assert.equal(next.orders.length,2);
});

test('legacy seated time cannot consume a new dish; mismatched restored dish cannot feed or animate',()=>{
 const f=fixture();f.until(()=>f.state().mounted===dining,'seated');const old=f.checkpoint(),s=old.continuity.runtime.stages[ids[1]];delete s.choice.orderId;delete s.choice.mealId;s.elapsed=14;old.orders=[];old.serial=0;
 const migrated=fixture({checkpoint:old});migrated.tick();assert.equal(migrated.requests,1);assert.equal(migrated.state().elapsed,0);assert.equal(migrated.target.pose.seatedMeal,false);assert.equal(migrated.consumes,0);
 const mismatched=f.checkpoint();mismatched.orders[0].mealId='unrelated-bowl';mismatched.orders[0].stage='served';const rejected=fixture({checkpoint:mismatched});rejected.tick();assert.equal(rejected.cancels,1);assert.equal(rejected.consumes,0);assert.equal(rejected.target.pose.seatedMeal,false);assert.equal(rejected.state().stage,'return-suite');
});

test('duty cancels partial food before a blocked safe exit, then retains the original return route',()=>{
 const f=fixture({actorId:'cn-emperor'});f.until(()=>f.state().mounted===dining,'emperor seated');f.serve();f.tick(30);const p=f.target.root.position.toArray(),hunger=f.needs.hunger('cn-emperor');f.block(true);assert(f.life.requestDuty('fixture-court'));assert.equal(f.cancels,1);f.tick(20);assert.deepEqual(f.target.root.position.toArray(),p);assert.equal(f.consumes,0);assert(f.needs.hunger('cn-emperor')>=hunger);assert.equal(f.target.pose.seatedMeal,false);f.block(false);f.tick(2);assert.equal(f.state().stage,'return-suite');assert.equal(f.cancels,1);
});

test('expired seat claim cancels the original order once; failed cancellation retries before release',()=>{
 const f=fixture();f.until(()=>f.state().mounted===dining,'seated');const saved=f.checkpoint();saved.continuity.runtime.claims.find(c=>c.actor===ids[1]).remaining=.1;const r=fixture({checkpoint:saved});r.rejectCancel(true);r.tick(3);assert.equal(r.cancels,0);assert.equal(r.state().mounted,dining);r.rejectCancel(false);r.tick(2);assert.equal(r.cancels,1);assert.equal(r.state().mounted,null);assert.equal(r.state().stage,'return-suite');assert.equal(r.consumes,0);assert.equal(r.requests,0);
});

test('empty finite pantry filters only meals; even urgent hunger keeps ordinary weighted alternatives',()=>{
 const f=fixture({empty:true});assert.equal(f.requests,0);assert.notEqual(f.state().activity,'meal');assert.equal(f.life.state().claims.filter(c=>c.id===dining).length,0);
 const profile=CHINA_CONSORTS[1],brain=createLifeDecisions({worldSeed:19,actorIds:[profile.id],saved:{version:1,people:{[profile.id]:{...palaceResidentSave({worldSeed:19,actorIds:[profile.id]}).people[profile.id],needs:{hunger:1,fatigue:.1,social:.3}}}}}),stage=(id,label,path,duration,options)=>({id,label,path,duration,...options});
 const options=consortActivities({station:profile,home:vector(...profile.npcPosition)},{stage,homeExit:()=>[],homeReturn:()=>[],bed:{id:profile.privateBedId},mealSeats:[{id:dining,position:[19.8,.215,1.3]}],host:{station:{id:'cn-tea'}},available:()=>true});const distribution=brain.distribution(profile.id,options);assert(distribution.find(c=>c.id==='meal').probability<1);assert(distribution.some(c=>c.id==='read'&&c.probability>0));assert(!Object.hasOwn(options.find(c=>c.id==='meal').relief,'hunger'));
});
