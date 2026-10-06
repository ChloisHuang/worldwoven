import assert from 'node:assert/strict';
import {createReceptionWork,advanceReceptionWork,receptionWorkValid,receptionWorkProof} from '../source/game/china-salon-reception-work.js';
import {validateReceptionProof} from '../source/game/china-salon-reception-proof.js';
const session={id:'cn-salon-1-1',actorId:'cn-tavern-reciter',activity:'poetry',fee:20,stage:'invited',roomId:null};
const assignment={holderId:'cn-tavern-reception',revision:0,available:true,alive:true};
const w=createReceptionWork(session,assignment),ctx={present:true,posed:true,assignment,sourceValid:true};
assert(w);assert(!createReceptionWork(session,{...assignment,available:false}));assert(!createReceptionWork(session,{...assignment,holderId:'cn-tavern-reciter'}));
for(const reason of ['present','posed','sourceValid']){for(let i=0;i<25;i++)assert(!advanceReceptionWork(w,session,'register',.1,{...ctx,[reason]:false}));assert.equal(w.seconds,0);}
for(const altered of [{revision:1},{alive:false},{holderId:'cn-tavern-host'}]){assert(!advanceReceptionWork(w,session,'register',.1,{...ctx,assignment:{...assignment,...altered}}));assert.equal(w.seconds,0);}
assert(!advanceReceptionWork(w,session,'reserve',10,ctx));assert(!advanceReceptionWork(w,session,'register',100,ctx));assert.equal(w.seconds,.1,'elapsed clock jumps cannot fabricate work');
for(let i=0;i<19;i++)advanceReceptionWork(w,session,'register',.1,ctx);assert.equal(w.steps.registerSeconds,2);assert.equal(w.phase,'reserve');assert.equal(receptionWorkProof(w,session),null);
session.stage='accepted';session.roomId='tavern-guest-orchid';
// Use the actual published room identity rather than a made-up room.
const {SALON_ROOMS}=await import('../source/game/china-tavern-salon-rooms.js');session.roomId=SALON_ROOMS[0].id;
for(let i=0;i<20;i++)advanceReceptionWork(w,session,'reserve',.1,ctx);assert.equal(w.phase,'close');assert.equal(w.roomId,session.roomId);
session.stage='fade';const before=structuredClone(w);assert(!advanceReceptionWork(w,session,'close',.1,{...ctx,sourceValid:false}));assert.deepEqual(w,before);
for(let i=0;i<20;i++)advanceReceptionWork(w,session,'close',.1,ctx);const proof=receptionWorkProof(w,session);assert(proof);assert.deepEqual(validateReceptionProof(proof),proof);assert.equal(proof.amount,8);assert.equal(w.phase,'completed');
for(const bad of [{...proof,amount:9},{...proof,actorId:'cn-tavern-host'},{...proof,customerId:'made-up-visitor'},{...proof,steps:{...proof.steps,closeSeconds:1.9}},{...proof,extra:true}])assert.throws(()=>validateReceptionProof(bad));
assert(!receptionWorkValid({...w,sessionId:'cn-salon-2-2'},session));assert(!receptionWorkValid(w,{...session,stage:'invited'}));
assert(!advanceReceptionWork(w,session,'close',100,ctx),'completed work cannot be paid/timed twice');
console.log('PASS frozen original-session receptionist contract; bounded physical phase evidence; no idle, absent, pause, stale holder, invalid customer, wrong room/phase or duplicate completion');
const {createSalonReceptionSlot,SALON_RECEPTION_ROLE:R}=await import('../source/game/china-salon-reception-role.js');
const actor={station:{id:R.incumbentId},alive:true};
const slot=createSalonReceptionSlot({resolveActor:id=>id===R.incumbentId?actor:null,canAssign:()=>true,canRelease:()=>true,saveState:()=>true});
assert.equal(slot.resolve().holderId,R.incumbentId);assert.equal(slot.resolve().actor,actor);assert(slot.assign(null).ok);assert.equal(slot.resolve().holderId,null);assert.equal(slot.resolve().status,'vacant');assert(!slot.assign('player').ok);
const missing=createSalonReceptionSlot({saved:{version:1,roleId:R.id,slotId:R.slotId,holderId:'cn-not-present',revision:3},resolveActor:()=>null,canAssign:()=>true});assert.equal(missing.resolve().holderId,'cn-not-present');assert.equal(missing.resolve().status,'unloaded');
console.log('PASS dormant reception role preserves explicit vacancy and missing-holder identity; no player appointment or fallback wage holder');
