import assert from 'node:assert/strict';
import {createJapanBedding as create,JAPAN_BEDDING_POINTS as P} from '../source/game/japan-bedding.js';
import {validJapanLinenReceipt} from '../source/game/japan-linen-role.js';
const rid='jp-linen-labor-1';let fail=false,last;const saveState=s=>{if(fail==='throw')throw Error('save failed');if(fail==='promise')return Promise.resolve(true);if(fail)return false;last=structuredClone(s);return true;};
const options={worldSeed:42,saveState,authorized:(actor,e)=>actor==='jp-rest'||actor==='player'&&e.receiptId===rid};
let b=create(options);const find=id=>b.state().sets.find(s=>s.id===id),id='jp-bedding-1',receive=(id,stage,pos,extra={})=>b.receive(id,stage,{expectedCycle:find(id).cycle,position:pos,...extra});
assert.equal(b.state().sets.length,2);assert.equal(b.status().available,true);assert.deepEqual(b.work(),[]);
assert(b.observeUse(.1,true));for(let i=0;i<15;i++)assert(b.observeUse(.1,true));assert(b.observeUse(0,false));assert.equal(find(id).cycle,0);assert.equal(find(id).stage,'installed');assert.equal(b.state().use,null);
for(let i=0;i<102;i++)assert(b.observeUse(.1,true));assert.equal(find(id).cycle,1);assert.equal(b.state().use.used,true);const use=b.state().use.id;
for(let i=0;i<10;i++)assert(b.observeUse(.1,true));assert.equal(find(id).cycle,1);
b=create({...options,saved:b.snapshot()});assert.equal(b.state().use.id,use);assert(b.observeUse(.1,true));assert.equal(find(id).cycle,1);assert(b.observeUse(0,false));assert.equal(find(id).stage,'dirty');assert.equal(b.work().length,1);
const steps=['dirty','collected','wet','drying','dry','folded'],stations=['guest','wash','hang','take','fold','restock'];
const wash=(stage,actor='player')=>b.advance(id,stage,actor,{expectedCycle:1,nextStage:{dirty:'collected',collected:'wet',wet:'drying',drying:'dry',dry:'folded',folded:'clean'}[stage],receiptId:rid,position:P[stations[steps.indexOf(stage)]]});
assert.equal(wash('folded'),false);assert.equal(b.advance(id,'dirty','player',{expectedCycle:2,nextStage:'collected',receiptId:rid,position:P.guest}),false);
const before=b.snapshot();for(const rejection of [true,'throw','promise']){fail=rejection;assert.equal(wash('dirty'),false);assert.deepEqual(b.snapshot(),before);}fail=false;
assert(wash('dirty'));assert.equal(find(id).carryOwner,'player');assert(wash('collected'));assert(wash('wet'));assert.equal(wash('drying'),false);for(let i=0;i<81;i++)b.tick(.1);assert(wash('drying'));
b=create({...options,saved:b.snapshot()});assert.equal(find(id).carryOwner,'player');assert(b.releaseCarrier('player'));assert.equal(find(id).carryOwner,null);assert.equal(wash('dry'),false);assert(b.claim(id,'player',{expectedCycle:1,receiptId:rid,position:P.take}));assert(wash('dry'));assert(wash('folded'));assert.equal(b.receipts(rid).length,1);assert(validJapanLinenReceipt(b.receipts(rid)[0]));assert.equal(wash('folded'),false);
assert(receive(id,'clean',P.restock));assert.equal(find(id).stage,'delivering');assert(receive(id,'delivering',P.guest));assert.equal(find(id).stage,'installed');assert.equal(b.receipts(rid).length,1);
// The initial second cover is owned, not a timer-generated or purchased good.
assert(receive('jp-bedding-2','incoming',P.receiving));assert.equal(receive('jp-bedding-2','received',P.guest),false);assert(receive('jp-bedding-2','received',P.restock));assert.equal(receive('jp-bedding-2','clean',P.restock),false);assert.equal(find('jp-bedding-2').stage,'clean');
const valid=b.snapshot();for(const mutate of [s=>s.sets.push(structuredClone(s.sets[0])),s=>s.sets[0].origin='free-restock',s=>s.sets[0].cycle=-1,s=>s.sets[1].stage='installed',s=>s.receipts.push(structuredClone(s.receipts[0])),s=>s.nextUse=0]){const bad=structuredClone(valid);mutate(bad);const q=create({...options,saved:bad});assert.equal(q.state().loadError,'invalid-bedding-state');assert.deepEqual(q.snapshot(),bad);assert.equal(q.observeUse(.1,true),false);assert(q.restore(valid));}
// A newly occupied bare futon makes Nao return the same carried clean cover.
for(let i=0;i<102;i++)b.observeUse(.1,true);b.observeUse(0,false);assert(b.advance(id,'dirty','jp-rest',{expectedCycle:2,nextStage:'collected',position:P.guest}));assert(receive('jp-bedding-2','clean',P.restock));assert(b.observeUse(.1,true));assert.equal(receive('jp-bedding-2','delivering',P.guest),false);assert(receive('jp-bedding-2','delivering',P.restock,{returnToStock:true}));assert.equal(find('jp-bedding-2').stage,'clean');assert(b.observeUse(0,false));assert.equal(find('jp-bedding-2').cycle,0);
console.log('PASS two owned identities, real sustained use/release, short-rest exclusion, original cycle cold restore, six wash stages, same-set receipt, finite receiving/install, occupied fallback return, atomic rejection and corrupt-state quarantine');
// Live occupation is safety evidence even when its durable identity write fails.
let rejectUse=true;const guarded=create({saveState:()=>!rejectUse});assert.equal(guarded.observeUse(.1,true),false);assert.equal(guarded.state().use,null);assert.equal(guarded.state().occupied,true);
rejectUse=false;assert(guarded.receive('jp-bedding-2','incoming',{position:P.receiving,expectedCycle:0}));assert(guarded.receive('jp-bedding-2','received',{position:P.restock,expectedCycle:0}));
// Set up an empty futon with Nao carrying the same real second set.
const empty=guarded.snapshot();empty.sets[0].stage='clean';empty.sets[0].station='restock';assert(guarded.restore(empty));assert(guarded.observeUse(0,false));assert(guarded.receive('jp-bedding-2','clean',{position:P.restock,expectedCycle:0}));rejectUse=true;assert.equal(guarded.observeUse(.1,true),false);rejectUse=false;
assert.equal(guarded.receive('jp-bedding-2','delivering',{position:P.guest,expectedCycle:0}),false,'never install under real occupant after failed use save');assert(guarded.receive('jp-bedding-2','delivering',{position:P.restock,expectedCycle:0,returnToStock:true}));assert.deepEqual(guarded.receivingWork(),[]);
// Dirty cover cannot be collected under that same unsaved real occupant.
const dirty=create({...options,saved:before});fail=true;assert.equal(dirty.observeUse(.1,true),false);fail=false;assert.deepEqual(dirty.work(),[]);assert.equal(dirty.advance(id,'dirty','jp-rest',{expectedCycle:1,nextStage:'collected',position:P.guest}),false);
console.log('PASS live mounted-bed guard survives rejected identity writes and prevents install/strip under occupied futon');
