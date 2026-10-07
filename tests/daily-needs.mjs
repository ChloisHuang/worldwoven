// Shared-clock identity and supply receipts must survive scene/save boundaries;
// this catches double hunger, offscreen catch-up and replayable relief.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDailyNeeds,DAILY_NEEDS_ACTORS,DAILY_NEEDS_HOUR as H} from '../source/game/daily-needs.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {createGameHealth} from '../source/game/game-health.js';
import {JAPAN_STAFF_CREW} from '../source/game/japan-service-orders.js';
import {initialEgyptResidentSupply} from '../source/game/egypt-resident-supply.js';
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

// ST07: completed supply must account for intake as well as relieve hunger.
// Keep these beside existing receipt/clock tests to catch replay, migration and
// source-boundary regressions without creating another world-scene harness.
test('ordinary daily meals and an isolated extra meal do not create sustained excess; repeated intake does',()=>{
 const normal=fixture();normal.model.enter('china');
 for(let number=1;number<=6;number++){
  assert(normal.model.mealReceipts([meal(number)]));assert.equal(normal.model.read('player').excessFoodStrain,0);assert.equal(normal.model.read('player').foodStrain,0);
  normal.advance(24*H);
 }
 const f=fixture(),m=f.model;m.enter('china');
 for(const number of[1,2]){assert(m.mealReceipts([meal(number)]));assert.equal(m.read('player').excessFoodStrain,0);}
 assert(m.mealReceipts([meal(3)]));assert(m.read('player').excessFoodStrain>.99);assert.equal(m.read('player').foodStrain,0);assert.equal(m.hunger('player'),0);
 assert.equal(m.status('player').seekMeal,false);assert.match(m.status('player').text,/进食偏密/);assert.doesNotMatch(m.status('player').text,/\d/);
 assert.deepEqual(m.read('player').foodEvidence,{source:'china-tavern-meal',id:'cn-tavern-order-3-consumed',number:3,actorId:'player',dishId:'yunlai-mushroom-rice'});
 f.advance(24*H);assert.equal(m.read('player').excessFoodStrain,0);assert.equal(m.status('player').excessFood,null);assert(m.status('player').seekMeal,'health never prevents an actually hungry person from seeking food');
});

test('small tea food counts its real portion and independent country receipts share one intake history',()=>{
 const f=fixture(),m=f.model;m.enter('france');
 const cake=n=>({source:'france-tea-food',id:`france-tea-${n}-consumed`,number:n,actorId:'player',orderId:`france-tea-${n}`,mealId:`france-tea-${n}-tray`,dishId:'tea-cake',supplyReceipt:`france-tea-${n}`,completed:true});
 for(let n=1;n<=8;n++)assert(m.franceMealReceipts([cake(n)]));assert.equal(m.snapshot().people.player.foodLoad,24*H);assert.equal(m.read('player').excessFoodStrain,0);
 m.enter('china');assert(m.mealReceipts([meal(1)]));assert.equal(m.read('player').excessFoodStrain,0);
 m.enter('japan');const r={source:'japan-player-meal',id:'jp-player-dining-2-1-consumed',number:1,actorId:'player',orderId:'jp-player-dining-2-1',mealId:'jp-player-dining-2-1:meal',dishId:'sushi',supplyKind:'paid-dining',paymentReceipt:'jp-dining-2-1',completed:true};
 const before=m.snapshot();assert.equal(m.japanMealReceipts([r],[]),false);assert.deepEqual(m.snapshot(),before);assert(m.japanMealReceipts([r],[{id:r.paymentReceipt,status:'settled'}]));assert(m.read('player').excessFoodStrain>.99);
 const restored=fixture(m.snapshot(),{seconds:999999}).model;assert.equal(restored.japanMealReceipts([r],[{id:r.paymentReceipt,status:'settled'}]),false);assert.equal(restored.franceMealReceipts([cake(8)]),false);assert.deepEqual(restored.snapshot(),m.snapshot());
});

test('excess history and its cause commit atomically with the existing meal watermark',()=>{
 for(const failure of[()=>false,()=>{throw Error('disk');},()=>Promise.resolve(true)]){
  let reject=false,durable;const m=createDailyNeeds({saveState:s=>{if(reject)return failure();durable=structuredClone(s);return true;}});m.enter('china');assert(m.mealReceipts([meal(1),meal(2)]));
  const before=m.snapshot();reject=true;assert.equal(m.mealReceipts([meal(3)]),false);assert.deepEqual(m.snapshot(),before);assert.deepEqual(durable,before);
  reject=false;assert(m.mealReceipts([meal(3)]));const after=m.snapshot();assert.deepEqual(after,durable);assert.equal(m.mealReceipts([meal(3)]),false);assert.deepEqual(m.snapshot(),after);
  const r=createDailyNeeds({saved:durable});assert.deepEqual(r.snapshot(),after);assert.equal(r.mealReceipts([meal(2),meal(3)]),false);
  for(const invalid of[{...meal(4),completed:false},{...meal(4),mealId:'missing'},{...meal(4),paymentReceipt:null}])assert.equal(r.mealReceipts([invalid]),false);
  assert.deepEqual(r.snapshot(),after);
 }
});

test('intake pauses for unloaded, dead and offline identities, and new holders inherit no predecessor meals',()=>{
 let clock={seconds:0},alive=true;const id='cn-resident-successor',m=createDailyNeeds({getClock:()=>clock,isPersonAlive:person=>person!==id||alive});m.enter('china',[id,guest]);assert(m.register(id));
 for(let n=1;n<=3;n++)assert(m.mealReceipts([meal(n*3-2,id),meal(n*3-1,guest),meal(n*3)]));
 const before=m.snapshot(),half=H/2;clock.seconds+=half;m.update();assert.equal(m.snapshot().people[id].foodLoad,before.people[id].foodLoad-half);
 alive=false;m.enter('japan');const paused=m.snapshot();clock.seconds+=H;m.update();for(const who of[id,guest])assert.deepEqual(m.snapshot().people[who],paused.people[who]);
 m.enter('china',[id]);clock.seconds+=H;m.update();assert.deepEqual(m.snapshot().people[id],paused.people[id]);
 m.leave();const globe=m.snapshot();clock.seconds+=100000;m.update();assert.deepEqual(m.snapshot(),globe);
 const restored=createDailyNeeds({saved:globe,getClock:()=>clock});assert.deepEqual(restored.snapshot(),globe);assert(restored.register('cn-resident-later'));const later=restored.snapshot().people['cn-resident-later'];assert.equal(later.foodLoad,0);assert.equal(later.lastMeal,null);assert.deepEqual(later.receipts,{});
 const whole=fixture(before),split=fixture(before);for(const f of[whole,split])f.model.enter('china',[id,guest]);whole.advance(40);for(let n=0;n<40;n++)split.advance(1);assert.deepEqual(whole.model.snapshot(),split.model.snapshot());
});

test('legacy receipts and low hunger never imply old excess, while recorded real intake survives migration',()=>{
 for(const version of[1,2]){
  const old={version,registeredPeople:['cn-resident-successor'],people:Object.fromEntries(['player',guest,'cn-resident-successor'].map(id=>[id,{foodAge:0,toiletAge:25*H,receipts:{'china-tavern-meal':88}}]))};
  const m=createDailyNeeds({saved:old});for(const id of Object.keys(old.people)){assert.equal(m.read(id).excessFoodStrain,0);assert.equal(m.snapshot().people[id].lastMeal,null);assert.equal(m.mealReceipts([meal(88,id)]),false);assert.equal(m.snapshot().people[id].foodLoad,0);}
  assert(m.mealReceipts([meal(89)]));assert.equal(m.snapshot().people.player.foodLoad,24*H);assert.equal(m.read('player').excessFoodStrain,0);
 }
});

test('repeated actual intake causes a gradual, distinct, noninfectious course with saved provenance',()=>{
 const f=fixture(),m=f.model;m.enter('china',[guest]);const health=createGameHealth({worldSeed:9,actorIds:['player',guest]});
 for(let n=1;n<=3;n++)assert(m.mealReceipts([meal(n)]));
 const actors=()=>[{id:'player',sceneId:'china',dailyNeeds:m.read('player'),needs:{hunger:m.hunger('player')}},{id:guest,sceneId:'china',dailyNeeds:m.read(guest)}];
 assert.deepEqual(health.status('player').symptoms,[]);health.tick(1,{actors:actors()});assert.deepEqual(health.status('player').symptoms,[],'eating is not an instant diagnosis');
 health.tick(180,{actors:actors()});const c=health.snapshot().people.player.conditions['laden-grain'];assert.notEqual(c.stage,'well');assert.deepEqual(c.cause,m.read('player').foodEvidence);assert.equal(health.snapshot().people.player.conditions['hollow-grain'].stage,'well');assert(health.status('player').restRecommended);assert.match(health.status('player').symptoms.join(' '),/进食过密/);
 health.tick(20,{actors:actors(),interactions:[{source:'talk',id:'talk-1',number:1,participants:['player',guest],duration:20}]});assert.equal(health.snapshot().people[guest].conditions['laden-grain'].stage,'well');assert.equal(health.snapshot().people[guest].conditions.mistbell.stage,'well');
 const saved=health.snapshot(),restored=createGameHealth({worldSeed:9,actorIds:['player',guest],saved});assert.deepEqual(restored.snapshot(),saved);assert(restored.applyCare('player',{providerId:'china-clinic',receiptNumber:1}));assert.equal(restored.snapshot().people.player.conditions['laden-grain'].remaining,saved.people.player.conditions['laden-grain'].remaining);
 f.advance(24*H);assert.equal(m.read('player').excessFoodStrain,0);assert.notEqual(restored.snapshot().people.player.conditions['laden-grain'].stage,'well');restored.tick(1000,{actors:actors().map(a=>({...a,resting:true}))});assert.equal(restored.snapshot().people.player.conditions['laden-grain'].stage,'well');assert.deepEqual(restored.snapshot().people.player.conditions['laden-grain'].cause,c.cause,'the last observed cause remains traceable after recovery');
});


test('every enrolled identity and a registered current holder uses the same real-source intake accumulator',()=>{
 const m=createDailyNeeds(),successor='cn-resident-current-holder';assert(m.register(successor));const originalIds=Object.keys(m.snapshot().people);let nextNumber=1;
 for(const actorId of [...DAILY_NEEDS_ACTORS,successor]){
  const supply=initialEgyptResidentSupply();
  for(let portion=1;portion<=3;portion++){
   const number=nextNumber++;let r=meal(number,actorId),apply=()=>m.mealReceipts([r]);
   if(JAPAN_STAFF_CREW.includes(actorId)){const orderId=`jp-staff-meal-${number}`;r={source:'japan-staff-meal',id:orderId+'-consumed',number,actorId,orderId,mealId:orderId+':bowl',dishId:'staff-ramen',supplyReceipt:orderId+':prepared',completed:true};}
   if(actorId==='cn-emperor'||actorId.startsWith('cn-consort-')){const orderId=`cn-royal-meal-${number}`;r={source:'china-royal-kitchen',id:orderId+'-consumed',number,actorId,orderId,mealId:orderId+'-meal',dishId:'royal-steamed-meal',supplyReceipt:orderId+'-prepared',completed:true};}
   if(actorId==='egypt-papyrus'){
    const orderId=`egypt-meal-${number}`,prepared={number,actorId,orderId,supplyReceipt:orderId+'-prepared'};r={...prepared,source:'egypt-resident-meal',id:orderId+'-consumed',mealId:orderId+'-dish',dishId:'visitor-bread-stew',completed:true,eatingSeconds:12,day:0};
    supply.remaining--;supply.prepared.push(prepared);supply.consumed.push(r);apply=()=>m.egyptResidentMealReceipts([r],supply);
   }
   assert(apply(),actorId+' accepts its original food source');assert.equal(apply(),false,actorId+' rejects source replay');
  }
  assert(m.read(actorId).excessFoodStrain>.99,actorId+' shares excess history');assert.equal(m.read(actorId).foodStrain,0);assert.equal(m.read(actorId).foodEvidence.actorId,actorId);
 }
 assert.deepEqual(Object.keys(m.snapshot().people),originalIds,'no new identities from receipts');const restored=createDailyNeeds({saved:m.snapshot()});assert.deepEqual(restored.snapshot(),m.snapshot());
});
