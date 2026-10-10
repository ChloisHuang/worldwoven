// Regressions: an optional rest must not duplicate dirt/XP, and failed saves
// must never advance the original object or make a still-used table clean.
import assert from 'node:assert/strict';
import {createJapanKotatsuCare} from '../source/game/japan-kotatsu-care.js';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
let saved,reject=false,reenter=false;
let l=createJapanKotatsuCare({saveState:s=>{if(reenter)assert.equal(l.beginRest('jp-kotatsu-2','jp-visitor-1-2'),false);if(reject)return false;saved=structuredClone(s);return true;}});
const id='jp-kotatsu-1',v='jp-visitor-1-1',r='jp-kotatsu-labor-1';
assert.equal(l.state().items.length,4);assert.equal(l.work().length,0);assert.equal(l.beginRest(id,'player'),false);reject=true;assert.equal(l.beginRest(id,v),false);assert.equal(l.state().items[0].cycle,0);reject=false;reenter=true;assert(l.beginRest(id,v));reenter=false;
assert(l.claimDuty(r));assert.equal(l.advance(id,'collect','player',{receiptId:r,cycle:1}),false,'cannot clean while ledger records actual sitter');assert.equal(l.endRest('jp-visitor-1-2'),false);assert(l.endRest(v));assert.equal(l.beginRest('jp-kotatsu-2',v),false,'once per same original visit');
assert(l.advance(id,'collect','player',{receiptId:r,cycle:1}));assert(l.pauseDuty(r));l=createJapanKotatsuCare({saved,saveState:s=>{if(reject)return false;saved=structuredClone(s);return true;}});assert.equal(l.duty().status,'paused');assert.equal(l.work()[0].owner,'player');assert.equal(l.advance(id,'smooth','player',{receiptId:r,cycle:1}),false);assert(l.claimDuty(r));
for(const stage of ['smooth','wipe','return']){reject=true;assert.equal(l.advance(id,stage,'player',{receiptId:r,cycle:1}),false);assert.equal(l.work()[0].stage,stage);reject=false;assert(l.advance(id,stage,'player',{receiptId:r,cycle:1}));}
assert.equal(l.receipts(r).length,1);assert.equal(l.advance(id,'return','player',{receiptId:r,cycle:1}),false);assert(l.releaseDuty(r));assert.equal(l.work().length,0);
assert(l.beginRest(id,'jp-visitor-1-3'));assert(l.endRest('jp-visitor-1-3'));assert(l.claimDuty('jp-kotatsu-labor-2'));assert(l.advance(id,'collect','player',{receiptId:'jp-kotatsu-labor-2',cycle:2}));assert(l.releaseDuty('jp-kotatsu-labor-2'));for(const stage of ['smooth','wipe','return'])assert(l.advance(id,stage,'jp-tea',{cycle:2}));assert.equal(l.receipts().length,1,'mixed completion grants no player receipt');
const bad=l.snapshot();bad.items[0].id='jp-kotatsu-2';const invalid=createJapanKotatsuCare({saved:bad});assert(invalid.state().loadError);assert.equal(invalid.beginRest(id,'jp-visitor-1-4'),false);assert.deepEqual(invalid.snapshot(),bad);
let fail=true;const board=createJapanServiceOrders({saveState:()=>!fail});assert.equal(board.kotatsu.beginRest(id,v),false);assert.equal(board.state().kotatsuCare.items[0].cycle,0);fail=false;assert(board.kotatsu.beginRest(id,v));assert.equal(board.state().kotatsuCare.items[0].stage,'resting');const foreign=createJapanServiceOrders({saved:board.state(),worldSeed:2});assert.equal(foreign.kotatsu.state().items[0].cycle,0);
console.log('PASS original four-table conservation, actual rest demand, one stop per visitor, no player self-demand, atomic/reentrant saves, cold same-owner steps, mixed handoff no reward, replay and foreign-world isolation');
