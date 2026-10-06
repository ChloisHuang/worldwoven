import assert from 'node:assert/strict';
import {CLINIC_CARE_PLANS} from '../source/game/china-clinic-physician-work.js';
import {createClinicNPCEconomy} from '../source/game/china-clinic-npc-economy.js';
import {PHARMACY_ASSISTANT_ROLE as A,CLINIC_PHYSICIAN_ROLE as D} from '../source/game/formal-careers.js';
const copy=structuredClone;
const proof=(role,actorId=role.incumbentId,from=6,to=18)=>({kind:'clinic-npc-duty',closed:true,roleId:role.id,slotId:role.slotId,actorId,day:1,segments:[{startHour:from,endHour:to,holderRevision:0}],reviews:[]});
const review=(p,number=1,seconds=20)=>({... (p.roleId===D.id?{questioned:true,careCorrect:true,carePlanId:CLINIC_CARE_PLANS[0].id}:{}),actorId:p.actorId,patientId:'cn-tavern-diner-west',number,orderId:`cn-clinic-order-${number}`,cardId:`cn-clinic-card-${number}`,packetId:`cn-clinic-packet-${number}`,holderRevision:0,completed:true,responsibleSeconds:seconds,rating:seconds===null?3:5});
let saved,fail=false;const e=createClinicNPCEconomy({saveState:s=>{if(fail)return false;saved=s;return true;}});
assert.deepEqual(e.account(D.incumbentId),{bank:0,cash:0});assert.equal(e.snapshot().receipts.length,0);
const doctor=proof(D);doctor.reviews=[review(doctor)];fail=true;assert.equal(e.settle(doctor).code,'save-failed');assert.equal(e.account(D.incumbentId).bank,0);fail=false;
assert(e.settle(doctor).ok);assert.deepEqual(e.account(D.incumbentId),{bank:36,cash:0});assert(e.settle(doctor).replayed);assert.equal(e.snapshot().receipts.length,1);
const assistant=proof(A);assert(e.settle(assistant).ok);assert.deepEqual(e.account(A.incumbentId),{bank:13,cash:0});
const loaded=createClinicNPCEconomy({saved,saveState:()=>true});assert.equal(loaded.loadError,null);assert(loaded.settle(doctor).replayed);assert.deepEqual(loaded.snapshot(),saved);
const repeatedDay={...doctor,day:2};assert.equal(e.settle(repeatedDay).code,'duplicate-clinic-patient-proof');
const wrongCare={...doctor,day:3,reviews:[{...review(doctor,3),careCorrect:false}]};assert.equal(e.settle(wrongCare).code,'invalid-clinic-patient-proof');
const changed=copy(doctor);changed.segments[0].endHour=17;assert.equal(e.settle(changed).code,'clinic-wage-conflict');
const altered=copy(saved);altered.accounts[D.incumbentId].cash=1;assert(createClinicNPCEconomy({saved:altered}).loadError);
for(const patch of [{actorId:'player'},{closed:false},{slotId:A.slotId},{segments:[{startHour:5,endHour:18,holderRevision:0}]},{segments:[{startHour:6,endHour:19,holderRevision:0}]},{segments:[{startHour:6,endHour:8,holderRevision:0},{startHour:7,endHour:10,holderRevision:0}]}])assert.equal(e.settle({...doctor,...patch}).ok,false);
const shift=createClinicNPCEconomy({saveState:()=>true}),first=proof(D,D.incumbentId,6,12),second=proof(D,'cn-clinic-successor',12,18);second.segments[0].holderRevision=1;
assert(shift.settle(first).ok);assert(shift.settle(second).ok);assert.equal(shift.account(first.actorId).bank,15);assert.equal(shift.account(second.actorId).bank,15);
assert.equal(shift.settle(proof(A,first.actorId,7,8)).code,'overlapping-clinic-coverage');assert.equal(shift.settle(proof(D,'cn-third-person',10,11)).code,'overlapping-clinic-coverage');
const bad=proof(A,'cn-future-assistant');bad.reviews=[review(bad),review(bad)];assert.equal(shift.settle(bad).code,'invalid-clinic-patient-proof');bad.reviews=[{...review(bad),actorId:D.incumbentId}];assert.equal(shift.settle(bad).code,'invalid-clinic-patient-proof');
const tiny=proof(A,'cn-small-duty',6,6.01);tiny.day=2;assert(shift.settle(tiny).ok);assert.equal(shift.account(tiny.actorId).bank,0,'rounding never guarantees free minimum pay');
for(const [seconds,rating,amount] of [[100,2,27],[200,1,24],[null,3,30]]){const ledger=createClinicNPCEconomy({saveState:()=>true}),p=proof(D);p.reviews=[{...review(p,8,seconds),rating}];assert(ledger.settle(p).ok);assert.equal(ledger.account(p.actorId).bank,amount);}
for(const saver of [()=>{throw Error('quota');},()=>Promise.resolve(true)]){const ledger=createClinicNPCEconomy({saveState:saver});assert.equal(ledger.settle(first).code,'save-failed');assert.deepEqual(ledger.snapshot(),{version:1,accounts:{},receipts:[]});}
let writes=0;const idle=createClinicNPCEconomy({saveState:()=>{writes++;return true;}});for(let n=0;n<100;n++){idle.account(D.incumbentId);idle.snapshot();}assert.equal(writes,0);assert.equal(idle.snapshot().receipts.length,0,'reads and elapsed external time cannot accrue work');
const snapshot=shift.snapshot();snapshot.accounts[first.actorId].bank=999;assert.equal(shift.account(first.actorId).bank,15);
console.log('PASS clinic-only zero-funded personal accounts, original role rates/rating, unique government receipts, atomic save/reload/replay, distinct successors, no overlapping slot/person work, bank-only credits and rejected fabricated balances; accounting seam only, no live coverage/withdrawal/needs activation');
