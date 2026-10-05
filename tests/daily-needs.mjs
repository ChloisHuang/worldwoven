// Shared-clock identity and supply receipts must survive scene/save boundaries;
// this catches double hunger, offscreen catch-up and replayable relief.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDailyNeeds,DAILY_NEEDS_HOUR as H} from '../source/game/daily-needs.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {createGameHealth} from '../source/game/game-health.js';
const guest='cn-tavern-diner-west';
const meal=(number,actorId='player')=>({source:'china-tavern-meal',id:`cn-tavern-order-${number}-consumed`,number,actorId,orderId:`cn-tavern-order-${number}`,mealId:`cn-tavern-order-${number}-dish`,dishId:'yunlai-mushroom-rice',paymentReceipt:`cn-tavern-order-${number}`,completed:true});
function fixture(saved,clock={seconds:0}){let durable,allow=true;const model=createDailyNeeds({saved,getClock:()=>clock,saveState:s=>{if(!allow)return false;durable=structuredClone(s);return true;}});return {model,clock,get saved(){return durable;},reject:v=>allow=!v,advance:seconds=>{clock.seconds+=seconds;model.update();}};}

test('one player follows active countries, NPC time pauses offscreen and offline does not catch up',()=>{
 const f=fixture(),m=f.model;m.enter('china',[guest]);f.advance(22*H);const a=m.snapshot();
 assert(m.status('player').seekMeal);m.enter('japan',[]);f.advance(24*H);const b=m.snapshot();
 assert.equal(b.people[guest].foodAge,a.people[guest].foodAge);assert.equal(b.people.player.foodAge,a.people.player.foodAge+24*H);
 m.leave();f.advance(500*H);assert.deepEqual(m.snapshot(),b);m.enter('china',[guest]);f.advance(H);assert(Math.abs(m.snapshot().people[guest].foodAge-b.people[guest].foodAge-H)<1e-8);
 const saved=m.snapshot(),r=fixture(saved,{seconds:100000});r.model.enter('china',[guest]);assert.deepEqual(r.model.snapshot(),saved);r.advance(H);assert(Math.abs(r.model.snapshot().people.player.foodAge-saved.people.player.foodAge-H)<1e-8);
});

test('one completed full meal lasts a simulated day; a mild warning is not another meal request',()=>{
 const f=fixture(),m=f.model;m.enter('china',[guest]);assert(m.mealReceipts([meal(1),meal(2,guest)]));
 const readings=[];
 for(const hour of[0,6,12,18,23.99,24]){
  f.clock.seconds=hour*H;m.snapshot();const need=m.read('player'),status=m.status('player');
  assert(Math.abs(need.hunger-hour/24)<1e-12);assert.equal(need.foodStrain,0);assert.equal(status.seekMeal,hour>=24);assert.equal(m.status(guest).seekMeal,hour>=24);
  assert.equal(status.food,hour>=24?'很饿了':hour>=18?'有些饿了':null);readings.push({hour,hunger:need.hunger,seekMeal:status.seekMeal});
 }
 assert(m.mealReceipts([meal(3)]));assert.equal(m.hunger('player'),0);assert.equal(m.status('player').seekMeal,false);
 console.log('24h full-meal balance',JSON.stringify(readings));
});

test('v1 migration preserves hunger, strain, recorded age and receipts without replay or phantom food',()=>{
 for(const hours of[0,6,12,24,36,48]){
  const old={version:1,people:{player:{foodAge:hours*H,toiletAge:37*H,receipts:{'china-tavern-meal':7,'japan-toilet':4}}}},original=structuredClone(old);
  const f=fixture(old),m=f.model,need=m.read('player'),snapshot=m.snapshot();
  assert.equal(snapshot.version,2);assert.deepEqual(old,original);assert.equal(snapshot.people.player.foodAge,hours*H);assert.equal(snapshot.people.player.foodBalanceOffset,hours*H);
  assert(Math.abs(need.hunger-Math.min(1,hours/12))<1e-12);assert(Math.abs(need.foodStrain-Math.max(0,Math.min(1,(hours-24)/24)))<1e-12);
  assert.equal(snapshot.people.player.toiletAge,old.people.player.toiletAge);assert.deepEqual(snapshot.people.player.receipts,old.people.player.receipts);
  assert.equal(m.mealReceipts([meal(7)]),false);assert.deepEqual(fixture(snapshot,{seconds:999999}).model.snapshot(),snapshot);
  assert(m.mealReceipts([meal(8)]));assert.equal(m.snapshot().people.player.foodBalanceOffset,0);assert.equal(m.hunger('player'),0);
 }
});

test('real meal and toilet receipt each relieve once; wrong supply, partial/cancel and failed writes cannot relieve',()=>{
 const f=fixture(),m=f.model;m.enter('china',[guest]);f.advance(37*H);const before=m.snapshot();
 for(const bad of[{...meal(1),completed:false},{...meal(1),mealId:'other'},{...meal(1),paymentReceipt:null},{...meal(1),actorId:'unknown'}])assert.equal(m.mealReceipts([bad]),false);
 assert.deepEqual(m.snapshot(),before);f.reject(true);assert.equal(m.mealReceipts([meal(1)]),false);assert.deepEqual(m.snapshot(),before);f.reject(false);
 assert(m.mealReceipts([meal(1)]));assert.equal(m.read('player').hunger,0);assert(m.status('player').seekToilet);assert.equal(m.mealReceipts([meal(1)]),false);
 const receipt={source:'china-toilet',id:'china-toilet-1',number:1,actorId:'player',facilityId:'cn-bath-toilet',completed:true};
 assert.equal(m.toiletReceipt({...receipt,completed:false}),false);assert(m.toiletReceipt(receipt));assert.equal(m.status('player').seekToilet,false);
 f.advance(2*H);const reloaded=fixture(m.snapshot(),f.clock).model;reloaded.enter('china',[guest]);const checkpoint=reloaded.snapshot();
 assert.equal(reloaded.mealReceipts([meal(1)]),false);assert.equal(reloaded.toiletReceipt(receipt),false);assert.deepEqual(reloaded.snapshot(),checkpoint);
});

test('partitioned simulation time is equivalent and enrolled life hunger is a projection with no phantom snacks',()=>{
 const a=fixture(),b=fixture();a.model.enter('china',[guest]);b.model.enter('china',[guest]);a.advance(480);for(let i=0;i<480;i++)b.advance(1);assert.deepEqual(a.model.snapshot(),b.model.snapshot());
 const brain=createLifeDecisions({actorIds:[guest,'legacy'],sharedNeeds:a.model}),choice={id:'meal',relief:{hunger:-1},duration:[1,1]};
 brain.tick(500);assert.equal(brain.state(guest).needs.hunger,a.model.hunger(guest));const selected=brain.choose(guest,[choice]);brain.complete(guest,selected);assert.equal(brain.state(guest).needs.hunger,a.model.hunger(guest));
 assert(a.model.mealReceipts([meal(3,guest)]));assert.equal(brain.state(guest).needs.hunger,0);assert(brain.state('legacy').needs.hunger>0);
});

test('neglect develops gradual fictional noninfectious symptoms, with no contact roulette',()=>{
 const f=fixture(),m=f.model;m.enter('china',[guest]);const health=createGameHealth({worldSeed:9,actorIds:['player',guest]});
 const actors=()=>[{id:'player',sceneId:'china',dailyNeeds:m.read('player'),needs:{hunger:m.hunger('player')}},{id:guest,sceneId:'china',needs:{hunger:0}}];
 health.tick(60,{actors:actors()});assert.equal(health.status('player').symptoms.length,0);
 f.advance(96*H);health.tick(180,{actors:actors()});const p=health.snapshot().people.player;
 assert.notEqual(p.conditions['hollow-grain'].stage,'well');assert.notEqual(p.conditions['stillwater-ache'].stage,'well');
 health.tick(20,{actors:actors(),interactions:[{source:'talk',id:'talk-1',number:1,participants:['player',guest],duration:20}]});
 for(const name of['hollow-grain','stillwater-ache','mistbell'])assert.equal(health.snapshot().people[guest].conditions[name].stage,'well');
 assert(m.mealReceipts([meal(1)]));assert.notEqual(health.snapshot().people.player.conditions['hollow-grain'].stage,'well','food does not instantly cure illness');
 const healthSaved=health.snapshot(),restored=createGameHealth({worldSeed:9,actorIds:['player',guest],saved:healthSaved});assert.deepEqual(restored.snapshot(),healthSaved,'existing health stages and progress survive the balance update');
});
