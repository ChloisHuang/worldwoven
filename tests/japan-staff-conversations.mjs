// Target the new adapter's real-source, paired claim and durable health boundary.
// Navigation geometry is covered once through production main, not mocked here.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {createJapanStaffConversations,JAPAN_STAFF_TALK_PLACES} from '../source/game/japan-staff-conversations.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(saved=null,{reply=1}={}){
 let fail=false,available=true,serial=0;const contacts=[],notes=[],tasks=new Map(),facilities=createFacilityQueue();
 const crew=['worker','apothecary','uninformed'].map((id,i)=>({station:{id},root:{position:{x:-5.25+i*1.35,y:11.4,z:-.3,toArray(){return [this.x,this.y,this.z];}}}}));
 const initial=createLifeDecisions({worldSeed:42,actorIds:crew.map(n=>n.station.id)}).snapshot();
 for(const p of Object.values(initial.people)){p.random=1;p.cooldowns.pause=10000;p.needs={hunger:.1,fatigue:.1,social:.8};}
 // Different personal values affect the very same completed exchange.
 Object.assign(initial.people.worker,{traits:{curiosity:.95,outdoors:.1,sociability:.9,quiet:.9,appetite:.4},values:{company:.9,quiet:.9,curiosity:.95}});
 Object.assign(initial.people.apothecary,{traits:{curiosity:.1,outdoors:.9,sociability:.05,quiet:.05,appetite:.4},values:{company:.05,quiet:.05,curiosity:.1}});
 initial.people.apothecary.random=reply;
 const brain=createLifeDecisions({worldSeed:42,actorIds:crew.map(n=>n.station.id),saved:saved?.brain||initial,onChange:()=>!fail});
 const assign=(n,to,t)=>{const task={...t,to,elapsed:0,arrived:false};tasks.set(n.station.id,task);return task;};
 const adapter=createJapanStaffConversations({crew,brain,furniture:{facilities},assign,clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),canReach:()=>true,available:n=>available&&n.station.id!=='uninformed'?'break':false,save:()=>!fail,beginInteraction:participants=>({id:'contact-'+(++serial),participants}),onInteraction:e=>contacts.push(copy(e)),note:(event,data)=>notes.push({event,...data})});
 if(saved)adapter.restore(saved.runtime);
 const step=(dt=.1)=>{brain.tick(dt);adapter.update(dt,{});for(const[id,t]of [...tasks])if(t.arrived){t.elapsed+=dt;if(t.elapsed>=t.duration&&t.onDone?.()!==false&&tasks.get(id)===t)tasks.delete(id);}};
 const arrive=()=>{for(const[id,t]of tasks){const n=crew.find(n=>n.station.id===id);Object.assign(n.root.position,{x:t.to[0],y:t.to[1],z:t.to[2]});t.arrived=true;}};
 const invite=()=>{step();for(let i=0;i<300&&!adapter.state().pair;i++)step();assert(adapter.state().pair);};
 return {brain,adapter,tasks,crew,contacts,notes,facilities,step,arrive,invite,setFail:v=>fail=v,setAvailable:v=>available=v,snapshot:()=>({brain:brain.snapshot(),runtime:adapter.snapshot()}),serial:()=>serial};
}
test('requires actual source; accepted pair walks before contact or directed outcome; no third-party changes',()=>{
 const f=fixture();for(let i=0;i<250;i++)f.step();assert.equal(f.adapter.state().pair,null);assert.equal(f.brain.state('worker').experiences.length,0);
 assert.equal(f.brain.recordExperience('worker',{id:'original-order:7:prepare',kind:'staff-work',completed:false}).ok,false);
 assert(f.brain.recordExperience('worker',{id:'original-order:7:prepare',kind:'staff-work',label:'刚完成7号原浴牌配料',completed:true}).ok);
 f.invite();assert.equal(f.facilities.state().filter(s=>s.reservations.length).length,2);for(let i=0;i<20;i++)f.step();assert.equal(f.contacts.length,0);assert.equal(f.adapter.state().pair.elapsed,0);
 f.arrive();f.step();assert.equal(f.contacts.length,0,'arrival establishes contact but adds no walking time');const before=f.snapshot();for(let i=0;i<100&&f.adapter.state().pair;i++)f.step();const event=f.brain.snapshot().conversations.find(e=>e.status==='completed');assert(event);assert.equal(event.results.length,2);assert.notEqual(event.results[0].feeling,event.results[1].feeling);assert.deepEqual(f.brain.state('uninformed').relations,{});assert.deepEqual(f.brain.state('uninformed').opinions,{});assert.equal(f.facilities.state().filter(s=>s.reservations.length).length,0);assert.deepEqual(f.contacts[0].participants,event.participants);assert.equal(f.serial(),1);assert.equal(f.brain.finishConversation(event.id,{elapsed:999,arrived:event.participants}).replayed,true);assert.deepEqual(f.brain.state('uninformed').relations,before.brain.people.uninformed.relations);
});
test('new work, urgent needs or player recall cancels both claims without any relationship award',()=>{
 const f=fixture();f.brain.recordExperience('worker',{id:'original-order:8:prepare',kind:'staff-work',label:'刚完成8号浴牌',completed:true});f.invite();f.arrive();f.step();f.step(1);assert(f.contacts.length);f.setAvailable(false);f.step();assert.equal(f.adapter.state().pair,null);assert.equal(f.facilities.state().filter(s=>s.reservations.length).length,0);assert.equal(f.brain.snapshot().conversations.at(-1).status,'cancelled');assert.deepEqual(f.brain.state('worker').relations,{});assert.deepEqual(f.brain.state('apothecary').relations,{});
});
test('full checkpoint restores the same token and cumulative spoken seconds; orphan intention cancels',()=>{
 const f=fixture();f.brain.recordExperience('worker',{id:'original-order:9:prepare',kind:'staff-work',label:'刚完成9号浴牌',completed:true});f.invite();f.arrive();f.step();f.step(1);const s=f.snapshot(),g=fixture(s);assert.equal(g.adapter.state().pair.id,s.runtime.pair.id);g.arrive();g.step(.1);assert.equal(g.serial(),0,'restored event never allocates a new health token');assert.equal(g.contacts[0].id,s.runtime.pair.interaction.id);assert(Math.abs(g.contacts[0].duration-(s.runtime.pair.interaction.duration+.1))<1e-8);const orphan=fixture({brain:s.brain});orphan.step();assert.equal(orphan.brain.snapshot().conversations.at(-1).status,'cancelled');assert.deepEqual(orphan.brain.state('worker').relations,{});
});
test('failed contact checkpoint emits nothing; failed completion persists no result and retries once',()=>{
 const f=fixture();f.brain.recordExperience('worker',{id:'original-order:10:prepare',kind:'staff-work',label:'刚完成10号浴牌',completed:true});f.invite();f.arrive();f.setFail(true);f.step();for(let i=0;i<15;i++)f.step();assert.equal(f.contacts.length,0);assert.equal(f.serial(),1);assert.equal(f.adapter.state().pair.elapsed,0);f.setFail(false);f.step();f.setFail(true);for(let i=0;i<100;i++)f.step();assert(f.adapter.state().pair);assert.deepEqual(f.brain.state('worker').relations,{});const token=f.serial(),count=f.contacts.length;f.setFail(false);f.step();assert.equal(f.adapter.state().pair,null);assert.equal(f.brain.snapshot().conversations.filter(e=>e.status==='completed').length,1);assert.equal(f.serial(),token);assert.equal(f.contacts.length,count,'completion retries never invent extra exposure');
});

test('a personal refusal consumes one reply opportunity but grants no relationship or health effect',()=>{
 const f=fixture(null,{reply:123456});f.brain.recordExperience('worker',{id:'original-order:11:prepare',kind:'staff-work',label:'刚完成11号浴牌',completed:true});
 for(let i=0;i<300&&!f.brain.snapshot().conversations.length;i++)f.step();assert.equal(f.brain.snapshot().conversations.at(-1).status,'declined');assert.equal(f.adapter.state().pair,null);assert.equal(f.serial(),0);assert.deepEqual(f.brain.state('worker').relations,{});assert.deepEqual(f.brain.state('apothecary').opinions,{});const random=f.brain.state('apothecary').random;for(let i=0;i<50;i++)f.step();assert.equal(f.brain.state('apothecary').random,random);
});

test('original shift controller keeps claims, held cargo, urgent needs and new preparations above social time',async()=>{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js');
 function original({held=false,pending=false,urgent=false}={}){
  const homes={'jp-ramen':[2.1,0,-12.15],'jp-sushi':[3.35,0,-12.15],'jp-incense':[-5.25,11.4,-.3],'jp-herb-workshop':[24,0,10]},tasks=new Map(),facilities=createFacilityQueue();
  const actors=new Map(Object.entries(homes).map(([id,p])=>[id,{station:{id,npcName:id},root:{position:{x:p[0],y:p[1],z:p[2],toArray(){return[this.x,this.y,this.z];},set(x,y,z){Object.assign(this,{x,y,z});}},userData:{appearance:{}}},home:{toArray:()=>p}}]));
  const brain=createLifeDecisions({actorIds:[...actors.keys()],worldSeed:42}).snapshot();brain.people['jp-ramen'].current={id:'tea',targetId:'japan-staff-tea',duration:8,startedAt:0};brain.people['jp-ramen'].choices=1;for(const p of Object.values(brain.people)){p.random=1;p.cooldowns.pause=10000;}
  let pendingOrder=pending,cargo=held,need=urgent;const reads={board:0,jobs:0};
  const board={state:()=>{reads.board++;return {claims:[],items:cargo?[{location:{type:'worker',id:'jp-incense'}}]:[]};},jobs:()=>{reads.jobs++;return pendingOrder?[{id:'actual-new-guest:prepare',kind:'prepare'}]:[];},releaseWorkplace(){},holdWorkplace:()=>true};
  const life=createJapanStaffLife({actors,board,furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},sharedNeeds:{hunger:()=>.1,status:()=>({seekMeal:need,seekToilet:false})},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:'jp-ramen',dueIn:0,decisions:brain}});
  const step=(dt=.1)=>life.update(dt,{hour:12});const done=id=>{const t=tasks.get(id);actors.get(id).root.position.set(...t.to);t.arrived=true;t.onArrive?.();assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);};
  step();done('jp-ramen');done('jp-sushi');step();assert.equal(life.state().active.choice.id,'tea');done('jp-ramen');assert.equal(life.state().decisions.people['jp-ramen'].experiences.at(-1).kind,'staff-rest');
  return {life,actors,facilities,tasks,step,reads,resetReads(){reads.board=reads.jobs=0;},setOrder:v=>pendingOrder=v,setCargo:v=>cargo=v,setNeed:v=>need=v};
 }
 for(const options of [{held:true},{pending:true},{urgent:true}]){const f=original(options);f.step();assert.equal(f.life.state().conversations.pair,null);assert.equal(f.life.canWork('jp-incense'),true);f.life.dispose();}
 const f=original();for(let i=0;i<300&&!f.life.state().conversations.pair;i++)f.step();assert(f.life.state().conversations.pair);assert.equal(f.life.canWork('jp-incense'),false);assert.equal(f.life.canWork('jp-sushi'),true,'original relief still covers the kitchen');f.resetReads();f.step();assert.deepEqual(f.reads,{board:1,jobs:1},'two participants and repeated eligibility checks share one lazy read per update');f.resetReads();f.setOrder(true);f.step();assert.deepEqual(f.reads,{board:1,jobs:1},'next update reads the new numbered preparation order immediately');assert.equal(f.life.state().conversations.pair,null);assert.equal(f.life.canWork('jp-incense'),true,'same frame releases original clerk for new numbered order');assert.deepEqual(f.life.state().decisions.people['jp-incense'].relations,{});assert.equal(f.facilities.state().filter(s=>s.id.startsWith('japan-staff-work-talk')&&s.reservations.length).length,0);f.life.dispose();
 const g=original();for(let i=0;i<300&&!g.life.state().conversations.pair;i++)g.step();assert(g.life.state().conversations.pair);g.life.abort(g.actors.get('jp-incense'));assert.equal(g.life.state().conversations.pair,null);const resumed=g.life.continuity();g.resetReads();g.setCargo(true);g.life.restore(resumed);assert(g.reads.board>0,'external restore reads current work when rebuilding idle eligibility');g.life.dispose();
});

test('nearby player pause preserves the accepted pair and contact without deferring real invalidation',async()=>{
 const {setPlayerConversationHold}=await import('../source/game/npc-social-ownership.js');
 for(const invalid of [null,'dead','work','reservation','consent']){
  const f=fixture();f.brain.recordExperience('worker',{id:'original-paused-order',kind:'staff-work',label:'刚办完原单',completed:true});f.invite();f.arrive();f.step();f.step(.5);const before=f.adapter.snapshot(),contacts=f.contacts.length,token=f.serial();
  setPlayerConversationHold(before.pair.participants[0]);try{
   for(let i=0;i<200;i++)f.step();assert.deepEqual(f.adapter.snapshot().pair,before.pair);assert.deepEqual(f.adapter.snapshot().stages,before.stages);assert.equal(f.contacts.length,contacts);assert.equal(f.serial(),token);
   if(invalid==='dead')f.crew[0].alive=false;else if(invalid==='work')f.setAvailable(false);else if(invalid==='reservation')f.facilities.releaseActor(before.pair.participants[0]);else if(invalid==='consent')f.brain.cancelConversation(before.pair.id);
   if(invalid){f.step();assert.equal(f.adapter.state().pair,null,invalid);assert.deepEqual(f.brain.state('worker').relations,{});assert.equal(f.contacts.length,contacts);}else{setPlayerConversationHold(null);f.step();assert.equal(f.adapter.state().pair.id,before.pair.id);assert(Math.abs(f.adapter.state().pair.elapsed-before.pair.elapsed-.1)<1e-8);}
  }finally{setPlayerConversationHold(null);f.adapter.dispose();}
 }
});
