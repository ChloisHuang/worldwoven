// The resident's finite reserve and needs write are separate durable records.
// These checks catch duplicated stock, invented meals and lost relief on retry.
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEgyptResidentSupply,validEgyptResidentSupply,validEgyptResidentMealReceipt,sameEgyptResidentMealReceipt} from '../source/game/egypt-resident-supply.js';
import {createDailyNeeds,DAILY_NEEDS_HOUR as H} from '../source/game/daily-needs.js';

const actorId='egypt-papyrus',copy=structuredClone;
const prepared=number=>({orderId:`egypt-meal-${number}`,number,actorId,supplyReceipt:`egypt-meal-${number}-prepared`});
const receipt=(number,day=0)=>({...prepared(number),source:'egypt-resident-meal',id:`egypt-meal-${number}-consumed`,mealId:`egypt-meal-${number}-dish`,dishId:'visitor-bread-stew',completed:true,eatingSeconds:12,day});
function consumedSupply(number=1,day=0){const s=initialEgyptResidentSupply();s.remaining--;s.prepared.push(prepared(number));s.consumed.push(receipt(number,day));return s;}
function fixture(saved,extra={}){
 const clock={seconds:0};let durable,fail=false;
 const needs=createDailyNeeds({saved,getClock:()=>clock,saveState:s=>{if(fail)return false;durable=copy(s);return true;},...extra});
 needs.enter('egypt',[actorId]);
 return {needs,clock,advance:hours=>{clock.seconds+=hours*H;needs.update();},reject:value=>fail=value,get durable(){return durable;}};
}

test('opening reserve is finite, independently copied and conserved through prepared, eaten and wasted portions',()=>{
 const initial=initialEgyptResidentSupply(),s=initialEgyptResidentSupply();assert(validEgyptResidentSupply(s));assert.equal(s.remaining,24);
 for(let n=1;n<=24;n++){
  s.remaining--;s.prepared.push(prepared(n));assert(validEgyptResidentSupply(s));
  if(n%2)s.consumed.push(receipt(n,n));else s.wasted.push(`egypt-meal-${n}`);
  assert(validEgyptResidentSupply(s));
 }
 assert.equal(s.remaining,0);assert.deepEqual(initial,initialEgyptResidentSupply());
 const excess=copy(s);excess.prepared.push(prepared(25));assert.equal(validEgyptResidentSupply(excess),false);
 const reset=copy(s);reset.remaining=24;assert.equal(validEgyptResidentSupply(reset),false);
 for(const mutate of[
  s=>s.remaining++,s=>s.remaining=-1,s=>s.initial=25,s=>s.source='daily-restock',
  s=>{s.prepared.push(copy(s.prepared[0]));s.remaining--;},
  s=>s.prepared[0].actorId='player',s=>s.prepared[0].number=2,
  s=>s.consumed.push(copy(s.consumed[0])),s=>s.consumed.push(receipt(2)),
  s=>s.wasted.push(s.prepared[0].orderId),s=>s.wasted.push('egypt-meal-999'),
  s=>s.consumed[0].supplyReceipt='egypt-meal-2-prepared',s=>s.prepared=null
 ]){const bad=consumedSupply();mutate(bad);assert.equal(validEgyptResidentSupply(bad),false);}
 const waste=initialEgyptResidentSupply();waste.prepared.push(prepared(1));waste.remaining--;waste.wasted=['egypt-meal-1','egypt-meal-1'];assert.equal(validEgyptResidentSupply(waste),false);
 for(const bad of[null,undefined,[],{},0])assert.equal(validEgyptResidentSupply(bad),false);
});

test('resident receipts require the same original eater, portion, complete eating duration and game day',()=>{
 const r=receipt(1);assert(validEgyptResidentMealReceipt(r));assert(sameEgyptResidentMealReceipt(r,copy(r)));
 for(const bad of[null,{}, {...r,number:0},{...r,number:1.5},{...r,number:'1'},{...r,actorId:'player'},{...r,source:'egypt-visitor-meal'},{...r,id:'other'},{...r,orderId:'egypt-meal-2'},{...r,mealId:'other'},{...r,dishId:'other'},{...r,supplyReceipt:null},{...r,completed:false},{...r,eatingSeconds:11.99},{...r,eatingSeconds:Infinity},{...r,day:-1},{...r,day:1.5},{...r,day:undefined}]){
  assert.equal(validEgyptResidentMealReceipt(bad),false);assert.equal(sameEgyptResidentMealReceipt(r,bad),false);
 }
 assert(validEgyptResidentMealReceipt({...r,day:1}));assert.equal(sameEgyptResidentMealReceipt(r,{...r,day:1}),false);
});

test('only the exact durable consumption with a valid full supply graph relieves hunger',()=>{
 const f=fixture(),m=f.needs,s=consumedSupply(),r=s.consumed[0];f.advance(25);const before=m.snapshot();
 assert.equal(m.mealReceipts([r]),false);assert.equal(m.mealReceipts([{...r,verifiedEgyptResidentConsumption:true}]),false);
 assert.equal(m.egyptResidentMealReceipts([r]),false);
 assert.equal(m.egyptResidentMealReceipts([r],initialEgyptResidentSupply()),false);
 assert.equal(m.egyptResidentMealReceipts([{...r,day:1}],s),false);
 assert.equal(m.egyptResidentMealReceipts([receipt(2)],s),false);
 const onlyPrepared=copy(s);onlyPrepared.consumed=[];assert.equal(m.egyptResidentMealReceipts([r],onlyPrepared),false);
 const wasted=copy(onlyPrepared);wasted.wasted.push(r.orderId);assert.equal(m.egyptResidentMealReceipts([r],wasted),false);
 const wrongGraph=copy(s);wrongGraph.remaining=24;assert.equal(m.egyptResidentMealReceipts([r],wrongGraph),false);
 const fakeTavern={...r,source:'china-tavern-meal',id:'cn-tavern-order-1-consumed',orderId:'cn-tavern-order-1',mealId:'cn-tavern-order-1-dish',dishId:'yunlai-mushroom-rice',paymentReceipt:'cn-tavern-order-1'};
 assert.equal(m.mealReceipts([fakeTavern]),false);assert.deepEqual(m.snapshot(),before);
 assert.equal(m.egyptResidentMealReceipts([null,{},r],s),true);assert.equal(m.hunger(actorId),0);
 assert.equal(m.snapshot().people.player.foodAge,before.people.player.foodAge);assert.equal(m.egyptResidentMealReceipts([r],s),false);
 assert.deepEqual(s,consumedSupply(),'the bridge never mutates the supply ledger');
});

test('failed needs writes replay the saved meal once after reload without replenishing or repeating relief',()=>{
 const f=fixture(),s=consumedSupply(8,3),r=s.consumed[0];f.advance(48);const before=f.needs.snapshot();
 f.reject(true);assert.equal(f.needs.egyptResidentMealReceipts([r],s),false);assert.deepEqual(f.needs.snapshot(),before);assert.equal(f.durable,undefined);
 const g=fixture(before);assert(g.needs.egyptResidentMealReceipts([r],s));assert.equal(g.needs.hunger(actorId),0);assert.equal(g.durable.people[actorId].receipts['egypt-resident-meal'],8);
 g.advance(6);const saved=g.needs.snapshot(),h=fixture(saved);assert.equal(h.needs.egyptResidentMealReceipts([r],s),false);assert.deepEqual(h.needs.snapshot(),saved);
 assert.equal(s.remaining,23);assert.equal(s.prepared.length,1);assert.equal(s.consumed.length,1);
 for(const saveState of[()=>Promise.resolve(true),()=>{throw Error('disk');}]){
  const failing=fixture(before,{saveState});assert.equal(failing.needs.egyptResidentMealReceipts([r],s),false);assert.deepEqual(failing.needs.snapshot(),before);
 }
});

test('Samira gets a full 24-hour meal with no new toilet need or offscreen catch-up',()=>{
 const f=fixture(),m=f.needs,s=consumedSupply();assert(m.has(actorId));assert(m.egyptResidentMealReceipts(s.consumed,s));
 f.advance(23.99);assert(m.hunger(actorId)<1);assert.equal(m.status(actorId).seekMeal,false);
 f.advance(.02);assert.equal(m.hunger(actorId),1);assert.equal(m.status(actorId).seekMeal,true);f.advance(72);
 assert.equal(m.read(actorId).toilet,0);assert.equal(m.read(actorId).toiletStrain,0);assert.equal(m.status(actorId).seekToilet,false);assert.equal(m.snapshot().people[actorId].toiletAge,0);
 const age=m.snapshot().people[actorId].foodAge;m.enter('japan');f.advance(24);assert.equal(m.snapshot().people[actorId].foodAge,age);
 assert.equal(s.remaining,23,'advancing days does not replenish the game-opening reserve');
});

test('old needs saves enroll Samira without changing existing identities, and retain legacy resident hunger',()=>{
 for(const version of[1,2]){
  const old={version,people:{player:{foodAge:30*H,foodBalanceOffset:version===2?2*H:undefined,toiletAge:5*H,receipts:{'egypt-visitor-meal':7}}}},original=copy(old);
  const f=fixture(old),saved=f.needs.snapshot();assert.deepEqual(old,original);assert.equal(saved.version,2);
  assert.equal(saved.people.player.foodAge,30*H);assert.equal(saved.people.player.foodBalanceOffset,(version===1?30:2)*H);assert.equal(saved.people.player.toiletAge,5*H);assert.deepEqual(saved.people.player.receipts,old.people.player.receipts);
  assert.equal(saved.people[actorId].foodAge,7*H);assert.equal(saved.people[actorId].toiletAge,0);assert.deepEqual(saved.people[actorId].receipts,{});
  assert.deepEqual(fixture(saved).needs.snapshot(),saved);
 }
 const f=fixture(undefined,{legacyPeople:{[actorId]:{needs:{hunger:.8}}}});assert(Math.abs(f.needs.hunger(actorId)-.8)<1e-12);
 const s=consumedSupply();assert(f.needs.egyptResidentMealReceipts(s.consumed,s));assert.equal(f.needs.snapshot().people[actorId].foodBalanceOffset,0);
});
