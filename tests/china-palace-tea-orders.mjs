import assert from 'node:assert/strict';
import {createPalaceTeaOrders,PALACE_TEA_STEPS,palaceTeaProof} from '../source/game/china-palace-tea-orders.js';
import {createPalaceTeaSlot} from '../source/game/china-palace-tea-role.js';
// These narrow cases reproduce repeat-request pay, replacement inheritance,
// partial/failed completion saves and legacy social-history backpay.
let persisted=null,saveOK=true;
const make=saved=>createPalaceTeaOrders({saved,saveState:s=>{if(!saveOK)return false;persisted=structuredClone(s);return true;}});
let ledger=make(),input={guestId:'cn-consort-yue',actorId:'cn-tea',holderRevision:0,day:0,visitId:'original-visit-1',arrived:true,guestAsked:true,hostAccepted:true};
assert.deepEqual(ledger.snapshot(),{version:1,orders:[]});
for(const key of ['arrived','guestAsked','hostAccepted'])assert(!ledger.request({...input,[key]:false}).ok);
assert(!ledger.request({...input,guestId:'cn-emperor'}).ok);
assert(!ledger.request({...input,actorId:'player'}).ok);
saveOK=false;assert(!ledger.request(input).ok);assert.equal(ledger.active(),null);saveOK=true;
const order=ledger.request(input).order;
assert(order);assert.equal(palaceTeaProof(order),null);
assert(!ledger.request(input).ok);assert(!ledger.request({...input,guestId:'cn-consort-heng'}).ok);
const evidence={requestId:order.id,actorId:order.actorId,holderRevision:0,guestId:order.guestId,visitId:order.visitId,cupId:order.cupId,trayId:order.trayId,observed:true};
for(const key of ['requestId','actorId','guestId','visitId','cupId','trayId'])assert(!ledger.advance({...evidence,[key]:'cn-wrong',stage:'prepared'}).ok);
assert(!ledger.advance({...evidence,holderRevision:1,stage:'prepared'}).ok);
assert(!ledger.advance({...evidence,stage:'placed'}).ok);
for(const stage of PALACE_TEA_STEPS.slice(1,-1))assert(ledger.advance({...evidence,stage}).ok);
assert(!ledger.advance({...evidence,stage:'cleared'}).ok);
const pending=ledger.prepareCompletion(evidence);assert(pending.ok);assert.equal(pending.proof.amount,8);assert.equal(ledger.active().stage,'retrieved');
assert(!pending.commit(()=>false).ok);assert.equal(ledger.active().stage,'retrieved');
let savedMoney=0,savedWorld;
assert(pending.commit((state,proof)=>{savedMoney+=proof.amount;savedWorld=state;return {ok:true};}).ok);
assert.equal(savedMoney,8);assert.equal(ledger.active(),null);assert.equal(savedWorld.orders[0].stage,'cleared');
assert(pending.commit(()=>{throw Error('must not retry save');}).replayed);assert.equal(savedMoney,8);
ledger=make(savedWorld);assert.equal(ledger.loadError,null);assert(!ledger.request(input).ok);
assert(!ledger.request({...input,actorId:'cn-new-host',holderRevision:1}).ok);
const second=ledger.request({...input,day:1,visitId:'original-visit-2'});assert(second.ok);assert(ledger.cancel(second.order.id).ok);assert(!ledger.request({...input,day:1}).ok);
const cancelled=ledger.snapshot();assert.equal(make(cancelled).loadError,null);
for(const mutate of [s=>s.orders[0].cupId='static-tea-cup',s=>s.orders[0].actorId='player',s=>s.orders[0].steps.pop(),s=>s.orders.push(structuredClone(s.orders[0])),s=>s.orders[0].amount=99,s=>s.orders[0].holderRevision=-1]){const bad=structuredClone(savedWorld);mutate(bad);const rejected=make(bad);assert(rejected.loadError);assert.deepEqual(rejected.snapshot(),bad);assert(!rejected.request(input).ok);}
const legacy={version:1,history:[{event:'tea-conversation:completed'}]};assert(make(legacy).loadError);
const third=make();const original=third.request(input).order;const ev={...evidence,requestId:original.id};for(const stage of PALACE_TEA_STEPS.slice(1,-1))assert(third.advance({...ev,stage}).ok);const stale=third.prepareCompletion(ev);assert(third.cancel(original.id).ok);assert.equal(stale.commit(()=>true).code,'stale-tea-completion');
const actor={station:{id:'cn-tea'},alive:true};let allowRelease=false;
const slot=createPalaceTeaSlot({resolveActor:id=>id==='cn-tea'?actor:null,canAssign:()=>true,canRelease:()=>allowRelease,saveState:()=>true});
assert.equal(slot.resolve().holderId,'cn-tea');assert(!slot.assign(null).ok);allowRelease=true;assert(slot.assign(null).ok);assert.equal(slot.resolve().status,'vacant');assert(!slot.assign('player').ok);
console.log('PASS dormant original tea request, consent/daily cap, ordered original objects, atomic completion retry, stale/cancel/replacement/save guards and role release');
