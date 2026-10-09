import assert from 'node:assert/strict';
import {createJapanServiceOrders as create,JAPAN_LINEN_POINTS as L,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
let reject=false;const seed=create({capacity:7});
for(let i=0;i<7;i++)seed.spawn({side:i%2?'women':'men',appearance:{},name:`客人${i}`,restPoint:[0,3.8,7],diningPoint:[0,3.8,7]});
let saved=seed.state();saved.visits.forEach(v=>v.stage='changing');
let board=create({saved,capacity:7,saveState:()=>!reject});const ids=board.state().visits.map(v=>v.id);
reject=true;assert.equal(board.guestStep(ids[0],'changed',{position:P.menChanging}),false);assert.equal(board.getVisit(ids[0]).stage,'changing');assert.equal(board.linenWork()[0].stage,'clean');reject=false;
for(let i=0;i<6;i++)assert(board.guestStep(ids[i],'changed',{position:P[i%2?'womenChanging':'menChanging']}));
assert.equal(board.guestStep(ids[6],'changed',{position:P.menChanging}),false);assert.equal(board.linenWork().length,6);
assert(board.cancel(ids[0]));const towel=board.linenWork()[0];assert.equal(towel.stage,'dirty');assert.equal(towel.customerName,'客人0');board.forgetFinished();assert.equal(board.linenWork()[0].visitId,ids[0]);
const rid='jp-linen-labor-1';assert(board.setLinenDuty(rid,'active'));let cycle=towel.cycle;
function go(stage,next,position,actor='player',receiptId=rid){return board.linenAdvance(towel.id,stage,actor,{expectedCycle:cycle,nextStage:next,position,receiptId});}
assert.equal(go('dirty','collected',P.menChanging,'jp-rest'),false);assert.equal(go('dirty','collected',P.menChanging,'player','wrong'),false);
reject=true;assert.equal(go('dirty','collected',P.menChanging),false);assert.equal(board.linenWork()[0].stage,'dirty');reject=false;
assert(go('dirty','collected',P.menChanging));assert.equal(go('dirty','collected',P.menChanging),false);
saved=board.state();board=create({saved,saveState:()=>!reject});assert.equal(board.linenWork()[0].carryOwner,null);assert.equal(board.linenWork()[0].stage,'collected');assert(board.setLinenDuty(rid,'active'));
assert.equal(go('collected','wet',L.wash),false);assert.equal(board.linenClaim(towel.id,'player',{expectedCycle:cycle,position:L.wash,receiptId:rid}),false);assert(board.linenClaim(towel.id,'player',{expectedCycle:cycle,position:P.menChanging,receiptId:rid}));assert(go('collected','wet',L.wash));assert(go('wet','drying',L.hang));assert.equal(go('drying','dry',L.take),false);
for(let n=0;n<40;n++)board.linenTick(.1);saved=board.state();board=create({saved});assert(board.setLinenDuty(rid,'active'));assert.equal(go('drying','dry',L.take),false);for(let n=0;n<41;n++)board.linenTick(.1);assert(go('drying','dry',L.take));assert(go('dry','folded',L.fold));assert(go('folded','clean',L.restock));assert.equal(go('folded','clean',L.restock),false);
assert.equal(board.linenReceipts(rid).length,1);assert.equal(board.linenReceipts(rid)[0].customerName,'客人0');assert.equal(board.linenReceipts(rid)[0].id,`${towel.id}-cycle-1-${rid}`);assert(board.guestStep(ids[6],'changed',{position:P.menChanging}));assert.equal(board.linenWork()[0].cycle,2);assert.equal(board.linenWork()[0].id,towel.id);
// Real drying returns the issued object; replay and rejected persistence cannot duplicate it.
saved=board.state();saved.visits.find(v=>v.id===ids[6]).stage='drying';board=create({saved,saveState:()=>!reject});reject=true;assert.equal(board.guestStep(ids[6],'dried',{position:P.menChanging}),false);assert.equal(board.linenWork()[0].stage,'issued');reject=false;assert(board.guestStep(ids[6],'dried',{position:P.menChanging}));assert.equal(board.linenWork()[0].stage,'dirty');assert.equal(board.guestStep(ids[6],'dried',{position:P.menChanging}),false);
console.log('PASS bounded linen identities, real visit issue/return, capacity, cancellation, atomic save rejection, cold physical pickup, drying, duty ownership, receipts and replay');
