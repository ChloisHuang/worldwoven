// ST03: no invented historic debt, no purchase of a person or consent. The
// dangerous regressions are hidden underage execution, stale-actor acceptance,
// free-release money side effects, and a display-only pause still admitting NPCs.
import assert from 'node:assert/strict';
import {SALON_ARTISTS,salonArtistStations} from '../source/game/china-tavern-salon-artists.js';
import {createChinaSalonContracts,SALON_RELEASE_TERMS} from '../source/game/china-salon-contracts.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(saved=null,options={}){
 const actors=new Map(salonArtistStations().map(station=>[station.id,{station,ageYears:station.ageYears,alive:true}]));
 const player={ageYears:24,alive:true},clock={day:3,hour:12};let durable=copy(saved),writes=0,meeting=true,relation=0,fail=null,onSave=null;
 const model=createChinaSalonContracts({saved,getArtist:id=>actors.get(id),getPlayer:()=>player,getClock:()=>clock,getRelationship:()=>relation,canDiscuss:()=>meeting,
  saveState:state=>{writes++;onSave?.();if(fail==='false')return false;if(fail==='object')return {ok:false};if(fail==='throw')throw Error('disk');if(fail==='async')return Promise.resolve();durable=copy(state);return true;},...options});
 return {model,actors,player,clock,get durable(){return copy(durable);},get writes(){return writes;},set meeting(v){meeting=v;},set relation(v){relation=v;},set fail(v){fail=v;},set onSave(v){onSave=v;}};
}
function release(f,id){
 assert(f.model.requestRelease(id).ok);assert.equal(f.model.view(id).status,'pending');
 const answer=f.model.respondRelease(id);assert.equal(answer.willing,true);assert.equal(f.model.view(id).status,'accepted');
 const result=f.model.confirmRelease(id);assert.equal(result.released,true);return result;
}
const first=SALON_ARTISTS[0].id,baseline=fixture();
assert.equal(baseline.writes,0);
for(const artist of SALON_ARTISTS){const v=baseline.model.view(artist.id);assert.equal(v.mode,'cooperating');assert.equal(v.fee,0);assert.deepEqual(v.original,SALON_RELEASE_TERMS);assert.equal(v.original.recordedDebt,0);assert(baseline.model.canInvite(artist.id));}
assert.equal(baseline.model.view('cn-unknown'),null);assert.equal(baseline.model.canInvite('cn-unknown'),false);
assert.equal(baseline.model.confirmRelease(first).ok,false);
assert.equal(baseline.model.setIndependentAvailability(first,false).ok,false);
console.log('PASS old and new saves acquire no invented debt, fee, release, or payment');

for(const profile of SALON_ARTISTS){
 const f=fixture(),actor=f.actors.get(profile.id),actorBefore=copy(actor);
 assert(f.model.requestRelease(profile.id).ok);const pending=f.model.snapshot(),requestId=f.model.view(profile.id).pending.id;
 assert(f.model.requestRelease(profile.id).replayed);assert.deepEqual(f.model.snapshot(),pending);
 const response=f.model.respondRelease(profile.id);assert(response.ok&&response.willing);assert(response.reply.includes('我愿结束原合作'));
 const accepted=f.model.snapshot();assert(f.model.respondRelease(profile.id).replayed);assert.deepEqual(f.model.snapshot(),accepted);
 assert(f.model.confirmRelease(profile.id).released);assert.equal(f.model.view(profile.id).mode,'independent');assert.equal(f.model.canInvite(profile.id),false);
 const released=f.model.snapshot();assert(f.model.confirmRelease(profile.id).replayed);assert.deepEqual(f.model.snapshot(),released);
 assert.equal(f.model.view(profile.id).release.requestId,requestId);assert.equal(f.model.view(profile.id).release.fee,0);assert.equal(f.model.view(profile.id).release.payment,null);
 assert.deepEqual(f.model.view(profile.id).release.original,SALON_RELEASE_TERMS);assert.deepEqual(actor,actorBefore,'identity, appearance and original station must not change');
 const loaded=fixture(f.durable);assert.equal(loaded.model.loadError,null);assert.deepEqual(loaded.model.snapshot(),released);assert.equal(loaded.model.canInvite(profile.id),false);
 loaded.actors.get(profile.id).station.salon.willing=false;
 assert.equal(loaded.model.setIndependentAvailability(profile.id,true).willing,false);assert.equal(loaded.model.canInvite(profile.id),false);
 loaded.actors.get(profile.id).station.salon.willing=true;
 assert.equal(loaded.model.setIndependentAvailability(profile.id,true).willing,true);assert(loaded.model.canInvite(profile.id));
 const reopened=loaded.model.snapshot();assert(loaded.model.setIndependentAvailability(profile.id,true).replayed);assert.deepEqual(loaded.model.snapshot(),reopened);
 assert(loaded.model.requestAvailability(profile.id,'paused').willing);assert.equal(loaded.model.canInvite(profile.id),false);
 assert.equal(fixture(loaded.durable).model.canInvite(profile.id),false);
 assert.equal(loaded.model.summary().released,1);assert.deepEqual(loaded.model.summary().payments,[]);
}
console.log('PASS all four actual artist identities: explicit answer, free release once, genuine admission pause/resume and durable original cooperation');

for(const target of ['player','artist','station']){
 for(const stage of ['request','answer','confirm','availability']){
  const f=fixture();if(stage!=='request')assert(f.model.requestRelease(first).ok);if(['confirm','availability'].includes(stage))assert(f.model.respondRelease(first).willing);if(stage==='availability')assert(f.model.confirmRelease(first).released);
  const person=target==='player'?f.player:target==='artist'?f.actors.get(first):f.actors.get(first).station;person.ageYears=17;
  const before=f.model.snapshot(),op={request:()=>f.model.requestRelease(first),answer:()=>f.model.respondRelease(first),confirm:()=>f.model.confirmRelease(first),availability:()=>f.model.setIndependentAvailability(first,true)}[stage];
  assert.equal(op().code,'artist-release-adult-identity');assert.deepEqual(f.model.snapshot(),before);
 }
}
for(const missing of [undefined,null,NaN,'27']){
 const f=fixture();f.actors.get(first).ageYears=missing;assert.equal(f.model.requestRelease(first).ok,false);
}
for(const stage of ['request','answer','confirm']){
 const f=fixture();if(stage!=='request')assert(f.model.requestRelease(first).ok);if(stage==='confirm')assert(f.model.respondRelease(first).willing);
 f.meeting=false;const before=f.model.snapshot();assert.equal(({request:()=>f.model.requestRelease(first),answer:()=>f.model.respondRelease(first),confirm:()=>f.model.confirmRelease(first)})[stage]().code,'artist-release-meeting-unavailable');assert.deepEqual(f.model.snapshot(),before);
}
for(const change of ['new-object','wrong-name','dead','wrong-activity']){
 const f=fixture();assert(f.model.requestRelease(first).ok);const actor=f.actors.get(first);
 if(change==='new-object')f.actors.set(first,copy(actor));else if(change==='wrong-name')actor.station.npcName='同名岗位的另一人';else if(change==='dead')actor.alive=false;else actor.station.salon.activities=['banquet'];
 assert.equal(f.model.respondRelease(first).ok,false);assert.equal(f.model.view(first).status,'pending');
 assert(f.model.cancelRelease(first).ok,'cancellation remains available when a participant becomes unavailable');
}
const absentCallback=fixture(null,{canDiscuss:undefined});assert.equal(absentCallback.model.requestRelease(first).ok,false);
console.log('PASS every execution stage rechecks both adulthood sources, exact live identity, life status, specialty and actual meeting; cancellation remains safe');

for(const refusal of ['willing','relationship']){
 const f=fixture();assert(f.model.requestRelease(first).ok);if(refusal==='willing')f.actors.get(first).station.salon.willing=false;else f.relation=-.5;
 const response=f.model.respondRelease(first);assert(response.ok);assert.equal(response.willing,false);assert.equal(f.model.view(first).mode,'cooperating');assert.equal(f.model.view(first).pending,null);assert.equal(f.model.summary().released,0);
}
const revoked=fixture();assert(revoked.model.requestRelease(first).ok);assert(revoked.model.respondRelease(first).willing);revoked.actors.get(first).station.salon.willing=false;
assert.equal(revoked.model.confirmRelease(first).released,false);assert.equal(revoked.model.view(first).mode,'cooperating');assert.equal(revoked.model.view(first).lastReply.kind,'revoke');
const cancel=fixture();assert(cancel.model.requestRelease(first).ok);const oldId=cancel.model.view(first).pending.id;assert(cancel.model.respondRelease(first).willing);assert(cancel.model.cancelRelease(first).ok);assert(cancel.model.cancelRelease(first).replayed);assert.equal(cancel.model.confirmRelease(first).ok,false);assert(cancel.model.requestRelease(first).ok);assert.notEqual(cancel.model.view(first).pending.id,oldId);
assert.equal(cancel.model.respondRelease(first,0).code,'stale-artist-contract');
const restoredPending=fixture(cancel.durable);assert.equal(restoredPending.model.loadError,null);assert(restoredPending.model.respondRelease(first).willing);
console.log('PASS refusals, changed mind, withdrawn request, stale buttons and restored pending actor cannot imply consent or release');

for(const failure of ['false','object','throw','async']){
 const f=fixture();f.fail=failure;const before=f.model.snapshot();assert.equal(f.model.requestRelease(first).ok,false);assert.deepEqual(f.model.snapshot(),before);assert.equal(f.durable,null);
 f.fail=null;assert(f.model.requestRelease(first).ok);assert(f.model.respondRelease(first).willing);f.fail=failure;const accepted=f.model.snapshot();assert.equal(f.model.confirmRelease(first).ok,false);assert.deepEqual(f.model.snapshot(),accepted);
 f.fail=null;assert(f.model.confirmRelease(first).released);
}
const busy=fixture();let nested;busy.onSave=()=>{nested=busy.model.requestRelease(SALON_ARTISTS[1].id);};assert(busy.model.requestRelease(first).ok);assert.equal(nested.code,'artist-contract-busy');assert.equal(busy.model.snapshot().events.length,1);
const invalidClock=fixture();invalidClock.clock.hour=24;assert.equal(invalidClock.model.requestRelease(first).ok,false);
const reversing=fixture();assert(reversing.model.requestRelease(first).ok);reversing.clock.day--;assert.equal(reversing.model.respondRelease(first).ok,false);
const good=fixture();release(good,first);
for(const damage of [s=>s.artists[first].original.recordedDebt=50,s=>s.artists[first].release.fee=50,s=>s.events.at(-1).fee=50,s=>s.events.at(-1).payment={id:'forged'},s=>s.events[0].identity.ageYears=17,s=>s.events[0].identity.actorId=SALON_ARTISTS[1].id,s=>s.events[1].willing=false,s=>s.artists[first].acceptsIndependentRequests=true,s=>s.events.push(copy(s.events.at(-1))),s=>s.revision++]){
 const corrupt=good.durable;damage(corrupt);const f=fixture(corrupt);assert(f.model.loadError);assert.equal(f.model.canInvite(first),false);assert.equal(f.model.requestRelease(first).ok,false);assert.deepEqual(f.model.snapshot(),corrupt);assert.equal(f.writes,0);
}
console.log('PASS failed/async/reentrant saves are atomic; event replay detects altered debt, fees, consent, identity, availability and duplicate releases without overwriting corrupt saves');

// Genuine earned artist accounts stay exactly where they were. Free release
// must neither run a fake zero-copper payment nor erase/pay a second wage.
const saved={copperLedger:{version:1,cash:1000,bank:0,accountOpened:false,nextTransaction:1,transactions:[]}};let economy,proof=null;
const ledger=createGameCurrencyLedger({saved,storage:{setItem:()=>true},transactionParticipant:tx=>tx.action==='settle'?economy.prepareIncome(tx,proof):null});
economy=createChinaSalonEconomy({copperLedger:ledger});
proof={id:'cn-salon-1-1',actorId:first,activity:'poetry',fee:115,completed:true,incomePolicy:economy.policy()};
assert(ledger.reserve(proof.fee,proof.id).ok);assert(ledger.settle(proof.id).ok);assert.equal(economy.account(first).bank,57);
const moneyBefore=JSON.stringify({wallet:ledger.history(),account:economy.snapshot()});
const f=fixture();release(f,first);assert(f.model.setIndependentAvailability(first,true).willing);
assert.equal(JSON.stringify({wallet:ledger.history(),account:economy.snapshot()}),moneyBefore);
proof={...proof,id:'cn-salon-3-2'};assert(ledger.reserve(proof.fee,proof.id).ok);assert(ledger.settle(proof.id).ok);assert.equal(economy.account(first).bank,114);
assert.deepEqual(f.model.summary(),{released:1,feesPaid:0,currency:'copper',payments:[],loadError:null});
console.log('PASS verified earned income and original wallet receipts are preserved; resumed artist can earn from another real service; release creates no money transaction');
