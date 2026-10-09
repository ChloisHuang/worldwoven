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

// A player fills the same slot, but salary is accounted separately. This
// regression guards against reusing the incumbent's eight-copper order proof.
const {CHINA_OFFICIAL_IDS}=await import('../source/game/china-official-economy.js');
const player={alive:true},playerSlot=createSalonReceptionSlot({resolveActor:id=>id===R.incumbentId?actor:null,getPlayer:()=>player,canAssign:()=>true,canRelease:()=>true,saveState:()=>true});
assert(playerSlot.assign('player').ok);assert.equal(playerSlot.resolve().actor,player);assert.equal(playerSlot.resolve().revision,1);
assert.equal(playerSlot.prepareAssignment('cn-tavern-host').code,'unsupported-reception-holder');
const playerAssignment=playerSlot.resolve();
for(const customer of [{...session},{...session,id:'cn-salon-npc-1',customerId:'player'},{...session,id:'cn-salon-npc-1',customerId:'invented'},{...session,customerId:CHINA_OFFICIAL_IDS[0]}])assert.equal(createReceptionWork(customer,playerAssignment),null,'player cannot self-serve or invent a customer');
const npcSession={...session,id:'cn-salon-npc-1',customerId:CHINA_OFFICIAL_IDS[0],stage:'invited',roomId:null};
let playerWork=createReceptionWork(npcSession,playerAssignment);
assert.equal(playerWork.contractVersion,2);assert.equal(playerWork.amount,0);
const playerContext={present:true,posed:true,sourceValid:true,assignment:playerAssignment};
assert(!advanceReceptionWork(playerWork,npcSession,'register',.1,{...playerContext,assignment:{...playerAssignment,revision:2}}));
assert(!advanceReceptionWork(playerWork,npcSession,'register',.1,{...playerContext,present:false}));
assert.equal(playerWork.seconds,0);
for(const phase of ['register','reserve','close']){
 if(phase==='reserve'){npcSession.stage='accepted';npcSession.roomId=SALON_ROOMS[0].id;}
 if(phase==='close')npcSession.stage='fade';
 for(let i=0;i<19;i++)assert(!advanceReceptionWork(playerWork,npcSession,phase,.1,playerContext));
 assert.equal(receptionWorkProof(playerWork,npcSession),null,'partial work cannot certify a service');
 playerWork=structuredClone(playerWork);assert(receptionWorkValid(playerWork,npcSession),'cold work retains exact original contract and progress');
 assert(advanceReceptionWork(playerWork,npcSession,phase,.1,playerContext));
}
const playerProof=receptionWorkProof(playerWork,npcSession);assert(playerProof);assert.equal(playerProof.contractVersion,2);assert.equal(playerProof.amount,0);assert.equal(playerProof.actorId,'player');
assert.deepEqual(validateReceptionProof(playerProof),playerProof);
for(const patch of [{amount:8},{contractVersion:1},{actorId:R.incumbentId},{customerId:'player'},{sessionId:'cn-salon-1-1'},{steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:1.9}}])assert.throws(()=>validateReceptionProof({...playerProof,...patch}));
assert(!receptionWorkValid({...playerWork,amount:8},npcSession));assert(!receptionWorkValid({...playerWork,contractVersion:1},npcSession));
assert(!advanceReceptionWork(playerWork,npcSession,'close',.1,playerContext));
const loadedPlayerSlot=createSalonReceptionSlot({saved:playerSlot.state(),getPlayer:()=>player,canAssign:()=>true});assert.equal(loadedPlayerSlot.resolve().holderId,'player');assert.equal(loadedPlayerSlot.resolve().revision,1);
const blockedPlayerSlot=createSalonReceptionSlot({resolveActor:()=>actor,getPlayer:()=>player,canAssign:id=>id!=='player',canRelease:()=>true});assert(!blockedPlayerSlot.assign('player').ok,'caller hiring eligibility is retained');
console.log('PASS player same-slot assignment and cold restoration; actual NPC customers only; exact v2 zero-order-pay proof, three physical phases and no stale/partial/duplicate work');
