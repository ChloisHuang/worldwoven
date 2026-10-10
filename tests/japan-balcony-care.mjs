// Daily original-object duties must survive reload and failed writes without
// resetting inspection demand, duplicating XP proof, or inventing inventory.
import assert from 'node:assert/strict';
import {createJapanBalconyCare} from '../source/game/japan-balcony-care.js';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
let saved,deny=false,reenter=false;
const l=createJapanBalconyCare({saveState:s=>{if(reenter)assert.equal(l.observeDay(1,6),false);if(deny)return false;saved=structuredClone(s);}}),ID='jp-balcony-gallery-1',R='jp-balcony-labor-1';
assert.equal(l.observeDay(0,5.9),false);assert.equal(l.observeDay(0,18),false);assert.equal(l.observeDay(-1,6),false);deny=true;assert.equal(l.observeDay(0,6),false);assert.equal(l.state().lastOpenedDay,null);deny=false;reenter=true;assert(l.observeDay(0,6));reenter=false;
assert.equal(l.observeDay(0,8),false);assert.equal(l.observeDay(8,8),false,'unfinished cycle never resets on later day');assert(l.claimDuty(R));
for(const patch of [{id:'another'},{cycle:2},{day:1},{actor:'nobody'},{receiptId:'jp-balcony-labor-2'}])assert.equal(l.advance(patch.id||ID,'lanterns',patch.actor||'player',{cycle:1,day:0,receiptId:R,...patch}),false);
assert(l.advance(ID,'lanterns','player',{cycle:1,day:0,receiptId:R}));assert.equal(l.advance(ID,'lanterns','player',{cycle:1,day:0,receiptId:R}),false);
for(const step of [null,undefined,0,'lanterns',[],{}, {stage:'lanterns',actorId:'player',receiptId:R,extra:true}]){const bad=structuredClone(saved);bad.item.steps=[step];const invalid=createJapanBalconyCare({saved:bad});assert.equal(invalid.state().loadError,'invalid-balcony-care');assert.deepEqual(invalid.snapshot(),bad);assert.equal(invalid.observeDay(1,6),false);}
const cold=createJapanBalconyCare({saved});assert.equal(cold.duty().status,'paused');assert.equal(cold.state().item.owner,'player');assert.equal(cold.advance(ID,'walkway','jp-balcony',{cycle:1,day:0}),false);assert(cold.claimDuty(R));
for(const stage of ['walkway','wipe','verify'])assert(cold.advance(ID,stage,'player',{cycle:1,day:0,receiptId:R}));assert.equal(cold.receipts().length,1);assert.equal(cold.observeDay(0,12),false);assert.equal(cold.observeDay(0,12),false);assert.equal(cold.advance(ID,'verify','player',{cycle:1,day:0,receiptId:R}),false);
assert(cold.releaseDuty(R));assert(cold.observeDay(50,6),'loading far future registers only current day');assert.equal(cold.state().item.cycle,2);assert.equal(cold.state().item.day,50);assert(cold.advance(ID,'lanterns','jp-balcony',{cycle:2,day:50}));assert.equal(cold.claimDuty('jp-balcony-labor-2'),false);assert(cold.releaseNPC(),'urgent needs safely release stationary original gallery ownership');assert(cold.claimDuty('jp-balcony-labor-2'));
for(const stage of ['walkway','wipe','verify'])assert(cold.advance(ID,stage,'player',{cycle:2,day:50,receiptId:'jp-balcony-labor-2'}));assert.equal(cold.receipts().length,1,'mixed ownership never earns full player receipt');
for(const mutate of [s=>s.item.id='clone',s=>s.lastOpenedDay=49,s=>s.item.cycle=52,s=>s.receipts.push(s.receipts[0]),s=>s.receipts[0].day=51,s=>s.item.steps.push({stage:'verify',actorId:'player',receiptId:R})]){const bad=cold.snapshot();mutate(bad);const invalid=createJapanBalconyCare({saved:bad});assert(invalid.state().loadError);assert.deepEqual(invalid.snapshot(),bad);assert.equal(invalid.observeDay(51,6),false);}
let reject=true;const board=createJapanServiceOrders({worldSeed:42,saveState:()=>!reject});assert.equal(board.balcony.observeDay(0,6),false);reject=false;assert(board.balcony.observeDay(0,6));const prior=board.state(),same=createJapanServiceOrders({worldSeed:42,saved:prior});assert.equal(same.balcony.state().item.cycle,1);assert.equal(same.balcony.observeDay(0,6),false);const foreign=createJapanServiceOrders({worldSeed:43,saved:prior});assert.equal(foreign.balcony.state().item.cycle,0);
console.log('PASS original gallery care: exact one original object/day, no offline backfill, monotonic day, strict work/stage/source, cold ownership, failure/reentry rollback, urgent yield, mixed receipt rejection and worldSeed isolation');

// Failed writes never consume a step or release ownership; retry commits once.
let rejectWrite=false,writeResult=false,reentered=false;let care;
care=createJapanBalconyCare({saveState:s=>{if(reentered){assert.equal(care.restore(s),false);assert.equal(care.releaseNPC(),false);}if(rejectWrite){if(writeResult==='throw')throw Error('storage');return writeResult;}return true;}});
assert(care.observeDay(0,6));
function refused(action){const before=care.snapshot();rejectWrite=true;for(const result of [false,{ok:false},Promise.resolve(true),'throw']){writeResult=result;assert.equal(action(),false);assert.deepEqual(care.snapshot(),before);}rejectWrite=false;assert.equal(action(),true);}
refused(()=>care.claimDuty(R));
for(const stage of ['lanterns','walkway','wipe'])refused(()=>care.advance(ID,stage,'player',{cycle:1,day:0,receiptId:R}));
refused(()=>care.pauseDuty(R));assert.equal(care.advance(ID,'verify','player',{cycle:1,day:0,receiptId:R}),false);assert(care.claimDuty(R));
reentered=true;refused(()=>care.advance(ID,'verify','player',{cycle:1,day:0,receiptId:R}));reentered=false;
assert.equal(care.receipts(R).length,1);refused(()=>care.releaseDuty(R));assert.equal(care.observeDay(0,17),false);assert.equal(care.observeDay(-1,7),false);

// Cancel preserves original completed steps but prevents mixed-shift XP. Ren
// can resume the original pending round; neither cancel nor reload invents one.
const cancelled=createJapanBalconyCare();assert(cancelled.observeDay(3,8));assert(cancelled.claimDuty(R));assert(cancelled.advance(ID,'lanterns','player',{cycle:1,day:3,receiptId:R}));assert(cancelled.releaseDuty(R));
let continuation=createJapanBalconyCare({saved:cancelled.snapshot()});assert.equal(continuation.work()[0].stage,'walkway');assert.equal(continuation.observeDay(20,8),false);
assert(continuation.claimDuty('jp-balcony-labor-2'));for(const stage of ['walkway','wipe','verify'])assert(continuation.advance(ID,stage,'player',{cycle:1,day:3,receiptId:'jp-balcony-labor-2'}));assert.equal(continuation.receipts().length,0);
assert(continuation.releaseDuty('jp-balcony-labor-2'));assert(continuation.observeDay(20,8));assert.equal(continuation.state().item.cycle,2);for(const stage of ['lanterns','walkway','wipe','verify'])assert(continuation.advance(ID,stage,'jp-balcony',{cycle:2,day:20}));assert.equal(continuation.receipts().length,0);

for(const bad of [false,0,'broken',[],{},...[
 s=>s.duty=false,s=>s.item.steps=[undefined],s=>s.item.owner='visitor',s=>s.item.day=NaN,s=>s.extra={keep:undefined},s=>s.receipts.push({...s.receipts[0],cycle:2,id:`${ID}-cycle-2-${R}`}),s=>s.receipts[0].workReceiptId='jp-balcony-labor-01',s=>s.revision=-1
].map(mutate=>{const s=care.snapshot();mutate(s);return s;})]){
 let writes=0;const badCare=createJapanBalconyCare({saved:bad,saveState:()=>{writes++;return true;}});assert.equal(badCare.state().loadError,'invalid-balcony-care');assert.deepEqual(badCare.snapshot(),bad);
 assert.deepEqual(badCare.work(),[]);assert.deepEqual(badCare.receipts(),[]);assert.equal(badCare.claimDuty(R),false);assert.equal(badCare.releaseDuty(R),false);assert.equal(badCare.releaseNPC(),false);assert.equal(badCare.observeDay(30,6),false);assert.equal(writes,0);assert.deepEqual(badCare.snapshot(),bad);
}
console.log('PASS balcony care boundaries: exact quarantine, synchronous save rollback, reentry guard, cancel/cold handoff and mixed-shift receipt rejection');

// The operations board must not acknowledge a rejected durable write before care sees it.
let boardReject=true;const rejectedBoard=createJapanServiceOrders({saveState:()=>boardReject?{ok:false}:{ok:true}});
assert.equal(rejectedBoard.balcony.observeDay(0,6),false);assert.equal(rejectedBoard.balcony.state().item.cycle,0);assert.equal(rejectedBoard.state().balconyCare.item.cycle,0);boardReject=false;assert(rejectedBoard.balcony.observeDay(0,6));assert.equal(rejectedBoard.balcony.state().item.cycle,1);
assert(rejectedBoard.balcony.claimDuty(R));const beforeBoard=rejectedBoard.state();boardReject=true;assert.equal(rejectedBoard.balcony.advance(ID,'lanterns','player',{cycle:1,day:0,receiptId:R}),false);assert.deepEqual(rejectedBoard.state(),beforeBoard);assert.equal(rejectedBoard.balcony.releaseDuty(R),false);assert.deepEqual(rejectedBoard.state(),beforeBoard);boardReject=false;assert(rejectedBoard.balcony.advance(ID,'lanterns','player',{cycle:1,day:0,receiptId:R}));
console.log('PASS original corridor operations bridge: object-shaped storage failure does not consume a round, stage or owner; exact retry succeeds');
