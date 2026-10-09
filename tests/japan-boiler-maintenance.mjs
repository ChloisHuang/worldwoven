import assert from 'node:assert/strict';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
import {createJapanBoilerMaintenance as create,JAPAN_BOILER_POOLS as P,JAPAN_BOILER_STAGES as STAGES,validJapanBoilerReceipt,sameJapanBoilerReceipt} from '../source/game/japan-boiler-maintenance.js';
const rid='jp-boiler-labor-1',event=(n,side='men')=>({visitId:`jp-visitor-42-${n}`,poolId:P[side],customerName:`来客${n}`});
let fail=false,calls=0;const saveState=()=>{calls++;if(fail==='throw')throw Error('rejected');if(fail==='promise')return Promise.resolve(true);return !fail;};
let ledger=create({saveState});assert.deepEqual(ledger.work(),[]);
for(const e of [{},event(0),{...event(1),poolId:'fake'}, {...event(1),customerName:''}])assert.equal(ledger.observeBath(e),false);
assert.equal(calls,0);assert(ledger.observeBath(event(1)));assert(ledger.observeBath(event(2)));assert.equal(ledger.observeBath(event(1)),false);
const batch=ledger.work()[0];assert.deepEqual(batch.visitIds,[event(1).visitId,event(2).visitId]);
const before=ledger.snapshot();for(const rejection of [true,'throw','promise']){fail=rejection;assert.equal(ledger.observeBath(event(3)),false);assert.deepEqual(ledger.snapshot(),before);}fail=false;
assert(ledger.claimDuty(rid));assert.equal(ledger.begin(batch.id,'read','jp-steam'),false);assert.equal(ledger.begin(batch.id,'read','player',{receiptId:'wrong'}),false);
assert(ledger.begin(batch.id,'read','player',{receiptId:rid}));assert(ledger.observeBath(event(3)));assert.equal(ledger.work().length,1);assert.deepEqual(ledger.work()[0].visitIds,batch.visitIds);assert.equal(ledger.state().batches.length,2);
assert(ledger.observeBath(event(4,'women')));assert.equal(ledger.work().length,2);
const advance=(stage,actor='player',receiptId=rid)=>ledger.advance(batch.id,stage,actor,{receiptId,nextStage:STAGES[STAGES.indexOf(stage)+1]||'completed'});
assert.equal(advance('verify'),false);assert.equal(ledger.advance(batch.id,'read','player',{receiptId:rid,nextStage:'verify'}),false);
assert(advance('read'));let saved=ledger.snapshot();assert(ledger.restore(saved,{preserveDuty:true}));assert.equal(ledger.duty().status,'active');assert.equal(ledger.work()[0].owner,'player');
ledger=create({saved,saveState});assert.equal(ledger.duty().status,'paused');assert.equal(ledger.work()[0].owner,'player');assert.equal(ledger.work()[0].workReceiptId,rid);assert.equal(ledger.work()[0].stage,'adjust');assert.equal(ledger.begin(batch.id,'adjust','jp-steam'),false);assert(ledger.restore(ledger.snapshot()));assert.equal(ledger.work()[0].owner,'player');assert.equal(advance('adjust'),false);assert.equal(ledger.observeBath(event(1)),false);assert(ledger.claimDuty(rid));
assert(advance('adjust'));assert.equal(advance('adjust'),false);assert(advance('return'));
saved=ledger.snapshot();fail=true;assert.equal(advance('verify'),false);assert.deepEqual(ledger.snapshot(),saved);fail=false;assert(advance('verify'));assert.equal(advance('verify'),false);
const receipt=ledger.receipts(rid)[0];assert.equal(ledger.receipts(rid).length,1);assert(validJapanBoilerReceipt(receipt));assert(sameJapanBoilerReceipt(receipt,structuredClone(receipt)));assert.equal(validJapanBoilerReceipt({...receipt,extra:true}),false);assert.equal(validJapanBoilerReceipt({...receipt,visitIds:[receipt.visitIds[0],receipt.visitIds[0]]}),false);assert.equal(validJapanBoilerReceipt({...receipt,loadCount:100}),false);
assert.equal(ledger.work().find(b=>b.side==='men').visitIds[0],event(3).visitId);assert(ledger.restore(ledger.snapshot()));assert.equal(ledger.receipts().length,1);assert.equal(ledger.observeBath(event(2)),false);
const valid=ledger.snapshot();for(const mutate of [s=>s.seen.pop(),s=>s.receipts.pop(),s=>s.batches[0].visitIds.push(event(99).visitId),s=>s.receipts[0].visitIds.reverse(),s=>s.batches[1].stage='verify',s=>s.nextBatch=1,s=>s.batches.push(structuredClone(s.batches[1]))]){const bad=structuredClone(valid);mutate(bad);assert.equal(ledger.restore(bad),false);assert.deepEqual(ledger.snapshot(),valid);}
// Handoff never rewards the player's last step for an NPC's earlier labor.
ledger=create();assert(ledger.observeBath(event(10)));const mixed=ledger.work()[0];assert(ledger.begin(mixed.id,'read','jp-steam'));assert.equal(ledger.claimDuty(rid),false);assert(ledger.advance(mixed.id,'read','jp-steam',{nextStage:'adjust'}));assert(ledger.releaseWorker('jp-steam'));assert(ledger.claimDuty(rid));for(const stage of STAGES.slice(1))assert(ledger.advance(mixed.id,stage,'player',{receiptId:rid,nextStage:STAGES[STAGES.indexOf(stage)+1]||'completed'}));assert.deepEqual(ledger.receipts(),[]);
// Outer guest transaction can observe without double-saving and roll back identity.
ledger=create({saveState});calls=0;const prior=ledger.snapshot();assert(ledger.observeBath(event(20),{persist:false}));assert.equal(calls,0);assert(ledger.restore(prior,{preserveDuty:true}));assert(ledger.observeBath(event(20)));assert.equal(calls,1);
assert(ledger.claimDuty(rid));assert(ledger.begin(ledger.work()[0].id,'read','player',{receiptId:rid}));assert(ledger.pauseDuty(rid));assert.equal(ledger.work()[0].owner,null);assert(ledger.releaseDuty(rid));assert.equal(ledger.duty(),null);assert(ledger.begin(ledger.work()[0].id,'read','jp-steam'));
console.log('PASS real bath identity, pool batching and first-read freeze, ordered ownership, strict final-only receipts, cold continuity, mixed-work XP exclusion, transactional rejection and outer rollback');

// Exercise the real player's service ID and board admission/interruption boundary.
const seedBoard=createJapanServiceOrders({worldSeed:42});
const playerVisit=seedBoard.spawn({customerType:'player',side:'women',appearance:{},name:'你',restPoint:[0,3.8,7],diningPoint:[0,3.8,7]});
assert.match(playerVisit.id,/^jp-player-service-42-/);
const ready=seedBoard.state(),pv=ready.visits[0];pv.stage='waiting-bath';pv.blendReceived=true;pv.mixtureId=pv.id+':mixture';
ready.items.push({id:pv.mixtureId,visitId:pv.id,kind:'mixture',location:{type:'point',id:'womenService'}});
let rejectBoard=false,lastSaved=null;
const persistBoard=next=>{if(rejectBoard)return false;lastSaved=structuredClone(next);return true;};
let board=createJapanServiceOrders({worldSeed:42,saved:ready,saveState:persistBoard});
const bathEvidence={poolId:pv.poolId,seatId:pv.poolId+'-seat-1'};
assert.equal(board.guestStep(pv.id,'bath-mounted',{...bathEvidence,poolId:P.men}),false);assert.deepEqual(board.boiler.work(),[]);
rejectBoard=true;assert.equal(board.guestStep(pv.id,'bath-mounted',bathEvidence),false);assert.equal(board.getVisit(pv.id).stage,'waiting-bath');assert.deepEqual(board.boiler.work(),[]);rejectBoard=false;
assert(board.guestStep(pv.id,'bath-mounted',bathEvidence));assert.equal(board.boiler.work().length,1);assert.deepEqual(board.boiler.work()[0].visitIds,[pv.id]);
const playerBatchId=board.boiler.work()[0].id;
assert.equal(board.guestStep(pv.id,'bath-mounted',bathEvidence),false);
assert(board.guestStep(pv.id,'bath-interrupted',{seatId:bathEvidence.seatId}));assert(board.guestStep(pv.id,'bath-mounted',bathEvidence));
assert.equal(board.boiler.work()[0].id,playerBatchId);assert.deepEqual(board.boiler.work()[0].visitIds,[pv.id]);
assert.equal(lastSaved.boilerMaintenance.seen.length,1);
board=createJapanServiceOrders({worldSeed:42,saved:lastSaved,saveState:persistBoard});assert.equal(board.getVisit(pv.id).stage,'waiting-bath');
assert(board.guestStep(pv.id,'bath-mounted',bathEvidence));assert.equal(board.boiler.work()[0].id,playerBatchId);assert.deepEqual(board.boiler.work()[0].visitIds,[pv.id]);
assert.equal(board.boiler.observeBath({...event(1),visitId:'jp-player-dining-42-1'}),false);
assert(board.boiler.claimDuty(rid));for(const stage of STAGES)assert(board.boiler.advance(playerBatchId,stage,'player',{receiptId:rid,nextStage:STAGES[STAGES.indexOf(stage)+1]||'completed'}));
assert(validJapanBoilerReceipt(board.boiler.receipts(rid)[0]));
assert(board.guestStep(pv.id,'bath-interrupted',{seatId:bathEvidence.seatId}));assert(board.guestStep(pv.id,'bath-mounted',bathEvidence));assert.deepEqual(board.boiler.work(),[]);assert.equal(board.boiler.receipts(rid).length,1);
console.log('PASS actual board player-service bath admission, rejection rollback, interrupted/remount and cold dedup, completed-load replay, dining ID exclusion');

// Corrupt saved work is quarantined, never silently replaced by an empty queue.
for(const badSaved of [{version:999},false,0,'bad-state',{...create().snapshot(),nextBatch:0}, {...create().snapshot(),seen:['orphaned-admission']}]){
 let writes=0;const quarantined=create({saved:badSaved,saveState:()=>{writes++;return true;}});
 assert.equal(quarantined.state().loadError,'invalid-boiler-state');assert.deepEqual(quarantined.work(),[]);assert.equal(quarantined.duty(),null);assert.deepEqual(quarantined.receipts(),[]);
 assert.deepEqual(quarantined.snapshot(),badSaved);assert.equal(quarantined.observeBath(event(30)),false);assert.equal(quarantined.claimDuty(rid),false);assert.equal(quarantined.begin('jp-boiler-batch-1','read','jp-steam'),false);assert.equal(quarantined.releaseWorker('jp-steam'),false);assert.equal(writes,0);assert.deepEqual(quarantined.snapshot(),badSaved);
 assert.equal(quarantined.restore({version:999}),false);assert.deepEqual(quarantined.snapshot(),badSaved);
 assert(quarantined.restore(create().snapshot()));assert.equal(quarantined.state().loadError,undefined);assert(quarantined.observeBath(event(30)));assert.equal(writes,1);
}
for(const missing of [undefined,null]){const legacy=create({saved:missing});assert.equal(legacy.state().loadError,undefined);assert(legacy.observeBath(event(31)));}
const corruptBoardSaved=structuredClone(lastSaved);corruptBoardSaved.boilerMaintenance={version:99,raw:'retain this work'};
const corruptBoard=createJapanServiceOrders({worldSeed:42,saved:corruptBoardSaved});assert.equal(corruptBoard.boiler.state().loadError,'invalid-boiler-state');assert.deepEqual(corruptBoard.state().boilerMaintenance,corruptBoardSaved.boilerMaintenance);assert.equal(corruptBoard.boiler.claimDuty(rid),false);
console.log('PASS corrupt ledger quarantine blocks mutations, preserves raw snapshot, isolates board service and recovers only on valid explicit restore');

// Explicit cancellation still hands a cold-reserved batch back to Nagi.
const coldSource=create();assert(coldSource.observeBath(event(50)));assert(coldSource.claimDuty(rid));const coldId=coldSource.work()[0].id;assert(coldSource.begin(coldId,'read','player',{receiptId:rid}));
const coldReserved=create({saved:coldSource.snapshot()});assert.equal(coldReserved.duty().status,'paused');assert.equal(coldReserved.begin(coldId,'read','jp-steam'),false);assert.equal(coldReserved.begin(coldId,'read','player',{receiptId:rid}),false);assert(coldReserved.observeBath(event(51,'women')));const independent=coldReserved.work().find(b=>b.side==='women');assert(coldReserved.begin(independent.id,'read','jp-steam'));for(const stage of STAGES)assert(coldReserved.advance(independent.id,stage,'jp-steam',{nextStage:STAGES[STAGES.indexOf(stage)+1]||'completed'}));assert.equal(coldReserved.work().find(b=>b.id===coldId).owner,'player','other pool does not displace cold player batch');assert(coldReserved.releaseDuty(rid));assert(coldReserved.begin(coldId,'read','jp-steam'));
console.log('PASS cold paused shift reserves its original batch until same-shift resume or explicit release');
