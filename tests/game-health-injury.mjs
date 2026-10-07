// ST05: durable harm outboxes may retry or arrive across country restores.
// Regress the real health handoff, atomic save failure, receipt replay and bounded
// active-time recovery without adding a second disease, identity or death owner.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHealth,GAME_HEALTH_CONDITIONS} from '../source/game/game-health.js';
import {createGameHealthWorld} from '../source/game/game-health-world.js';

const actor=id=>({station:{id},walking:false});
const player=actor('player'),victim=actor('resident'),bystander=actor('bystander');
const event=(extra={})=>({id:'crime-china-1-injury',actorId:'player',victimId:'resident',at:20,...extra});
const model=saved=>createGameHealth({worldSeed:52,actorIds:['player','resident','bystander'],saved});
const bruise=(health,id='resident')=>health.snapshot().people[id].conditions['impact-bruise'];
const worldBruise=(world,id='resident')=>world.snapshot().health.people[id].conditions['impact-bruise'];
const context={player,actors:[victim,bystander]};
const receipt={event:'delivered',number:1,orderId:'cn-clinic-order-1',cardId:'cn-clinic-card-1',packetId:'cn-clinic-packet-1',recipientId:'resident',recipientPosition:[0,3.8,0]};

test('one confirmed event injures only the named person and preserves every existing disease stream',()=>{
 const initial=model().snapshot();Object.assign(initial.people.resident.conditions.mistbell,{stage:'ill',remaining:130});
 const health=model(initial),before=health.snapshot();
 assert.deepEqual(health.applyInjury(event()),{ok:true,applied:true,condition:'impact-bruise',victimId:'resident'});
 const after=health.snapshot();assert.equal(bruise(health).stage,'ill');assert.equal(bruise(health).remaining,90);
 assert.deepEqual(after.people.player,before.people.player);assert.deepEqual(after.people.bystander,before.people.bystander);
 for(const [name,condition]of Object.entries(before.people.resident.conditions))if(name!=='impact-bruise')assert.deepEqual(after.people.resident.conditions[name],condition);
 assert.deepEqual(after.interactionProgress,before.interactionProgress);assert.equal(after.time,before.time);
 assert.deepEqual(after.injuryReceipts[event().id],{actorId:'player',victimId:'resident',at:20});
 assert(health.status('resident').symptoms.includes(GAME_HEALTH_CONDITIONS['impact-bruise'].symptom));
 assert(health.status('resident').restRecommended);assert(health.status('resident').absenceRecommended);
 assert.equal(Object.hasOwn(after.people.resident,'alive'),false,'health never owns death or life identity');
});

test('strain, encounters and elapsed time cannot invent an event-only bruise',()=>{
 const health=model(),actors=['player','resident','bystander'].map(id=>({id,sceneId:'china',exertion:1,needs:{hunger:1,fatigue:1},dailyNeeds:{foodStrain:1,toiletStrain:1}}));
 health.tick(5000,{actors,interactions:[{source:'conversation',id:'conversation-1',number:1,participants:['player','resident'],duration:5000}]});
 for(const id of['player','resident','bystander']){assert.equal(bruise(health,id).stage,'well');assert.equal(bruise(health,id).dose,0);}
 assert.deepEqual(health.snapshot().injuryReceipts,{});
});

test('exact receipts prevent replay and conflicts after reload without imposing timestamp ordering',()=>{
 let health=model();health.applyInjury(event());health.tick(20);const saved=health.snapshot();health=model(JSON.parse(JSON.stringify(saved)));
 assert.deepEqual(health.applyInjury(event()),{ok:true,applied:false});assert.deepEqual(health.snapshot(),saved);
 for(const changed of[{victimId:'bystander'},{actorId:'bystander'},{at:21}]){
  assert.equal(health.applyInjury(event(changed)).reason,'event-conflict');assert.deepEqual(health.snapshot(),saved);
 }
 assert(health.applyInjury(event({id:'crime-egypt-2-injury',at:10})).applied,'older country outbox is a distinct event');
 assert(health.applyInjury(event({id:'crime-japan-3-injury',at:10})).applied,'same clock second is not a duplicate');
 assert.equal(bruise(health).remaining,90,'new injuries are capped rather than stacked');
 health.tick(1000);assert.equal(bruise(health).stage,'well');const recovered=health.snapshot();
 assert.equal(health.applyInjury(event()).applied,false);assert.deepEqual(health.snapshot(),recovered,'old outbox cannot re-injure a recovered person');
});

test('invalid, unknown and self-directed injury requests leave health and receipts unchanged',()=>{
 const health=model(),before=health.snapshot();
 for(const invalid of[null,{},event({id:''}),event({id:'__proto__'}),event({at:NaN}),event({at:-1}),event({actorId:'resident'}),event({victimId:'missing'}),event({actorId:'missing'})]){
  assert.equal(health.applyInjury(invalid).ok,false);assert.deepEqual(health.snapshot(),before);
 }
});

test('temporary injury uses active elapsed time, supportive clinic care and existing rest recovery',()=>{
 const ordinary=model(),supported=model(),rested=model(),split=model();
 for(const health of[ordinary,supported,rested,split])health.applyInjury(event());
 assert(supported.applyCare('resident',{providerId:'china-clinic',receiptNumber:7}));assert.equal(bruise(supported).remaining,90,'care is not an instant cure');
 ordinary.tick(20);supported.tick(20);rested.tick(20,{actors:[{id:'resident',resting:true}]});for(let n=0;n<20;n++)split.tick(1);
 assert(Math.abs(bruise(ordinary).remaining-bruise(split).remaining)<1e-9);
 assert(bruise(supported).remaining<bruise(ordinary).remaining);assert(bruise(rested).remaining<bruise(ordinary).remaining);
 for(const health of[ordinary,supported,rested,split]){health.tick(1000);assert.equal(bruise(health).stage,'well');assert.equal(health.status('resident').absenceRecommended,false);}
});

test('world saves receipt and condition before exposing injury; refused or throwing storage never mutates live health',()=>{
 for(const failure of[()=>false,()=>{throw Error('storage unavailable');},()=>Promise.resolve(false)]){
  let persist=()=>true,saves=0,durable;
  const world=createGameHealthWorld({worldSeed:52,saveState:state=>{saves++;const result=persist();if(result===true)durable=structuredClone(state);return result;}});
  world.enter('china',[victim,bystander]);const before=world.snapshot();persist=failure;
  assert.deepEqual(world.applyInjury(event()),{ok:false,applied:false,reason:'save-failed'});assert.deepEqual(world.snapshot(),before);assert.deepEqual(durable,before);
  persist=()=>true;assert(world.applyInjury(event()).applied);assert.deepEqual(durable,world.snapshot());assert.equal(worldBruise(world).stage,'ill');
  const savedCount=saves;assert.deepEqual(world.applyInjury(event()),{ok:true,applied:false});assert.equal(saves,savedCount,'durably acknowledged replay needs no write');
 }
});

test('each country adapter supports player/NPC injuries, paused globe recovery and durable clinic coexistence',()=>{
 for(const region of['china','japan','france','egypt']){
  let durable;const world=createGameHealthWorld({worldSeed:52,saveState:state=>{durable=structuredClone(state);return true;}});world.enter(region,[victim,bystander]);
  const id=`crime-${region}-4-injury`;assert(world.applyInjury(event({id})).applied);assert.equal(worldBruise(world).stage,'ill');assert(world.text('resident').includes('挫伤'));
  assert(world.applyInjury(event({id:`${id}-player`,actorId:'resident',victimId:'player'})).applied);assert(world.state().playerText.includes('挫伤'));
  world.update(10,context);assert(worldBruise(world).remaining<90);world.leave();const paused=world.snapshot();world.update(10000,context);assert.deepEqual(world.snapshot(),paused);
  const restored=createGameHealthWorld({worldSeed:52,saved:durable,saveState:()=>true});assert.deepEqual(restored.applyInjury(event({id})),{ok:true,applied:false});assert.deepEqual(restored.snapshot(),paused);
  restored.enter(region,[victim,bystander]);assert(restored.clinicReceipts({history:[receipt]}));assert.equal(restored.status('resident').careStatus,'support-active');assert.equal(restored.clinicReceipts({history:[receipt]}),false);
  restored.update(1000,context);assert.equal(worldBruise(restored).stage,'well');assert.equal(worldBruise(restored,'player').stage,'well');assert.equal(restored.state().actorCount,3);
 }
});
