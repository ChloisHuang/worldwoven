// Optional lock-aware participants must not change older currency producers.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
const copy=structuredClone;
function fixture({aware=true,valid=true,lock='ok',mode='ok'}={}){
 const saved={copperLedger:{version:1,cash:100,bank:50,accountOpened:true,nextTransaction:1,transactions:[]}},events=[];let durable=copy(saved),held=false,adopted=0,writes=0;
 const participant={ok:true,patch:{testParticipant:{version:1,value:7}},valid(){events.push('valid');return valid;},committed(){events.push('adopt');if(aware)assert(held);adopted++;return aware?true:false;}};
 if(aware)Object.assign(participant,{lock(){events.push('lock');if(lock==='throw')throw Error('lock failed');if(lock==='false')return false;held=true;return true;},release(){events.push('release');held=false;}});
 const ledger=createGameCurrencyLedger({saved,transactionParticipant:tx=>tx.action==='settle'?participant:null,storage:{setItem(k,text){writes++;if(events.includes('lock')&&lock==='ok')assert(held,'held until source storage and adoption');if(mode==='false')return false;if(mode==='object')return {ok:false,code:'rejected'};if(mode==='throw')throw Error('quota');if(mode==='promise')return Promise.resolve();if(mode==='reject')return Promise.reject(Error('async'));durable=JSON.parse(text);return true;}}});
 return {ledger,events,setMode:value=>mode=value,get held(){return held;},get adopted(){return adopted;},get writes(){return writes;},get durable(){return copy(durable);},saved};
}
for(const aware of [false,true]){const f=fixture({aware});assert(f.ledger.reserve(20,'service').ok);assert(f.ledger.settle('service').ok);assert.equal(f.adopted,1);assert.equal(f.held,false);assert.deepEqual(f.events,aware?['valid','lock','adopt','release']:['adopt']);assert.equal(f.durable.testParticipant.value,7);assert(f.ledger.settle('service').replayed);assert.equal(f.adopted,1);}
for(const options of [{valid:false},{lock:'false'},{lock:'throw'}]){const f=fixture(options);assert(f.ledger.reserve(20,'service').ok);const before=f.durable,source=f.ledger.snapshot(),writes=f.writes;assert.equal(f.ledger.settle('service').ok,false);assert.equal(f.writes,writes);assert.equal(f.adopted,0);assert.equal(f.held,false);assert.deepEqual(f.durable,before);assert.deepEqual(f.ledger.snapshot(),source);if(options.lock)assert(f.events.includes('release'));}
for(const mode of ['false','object','throw','promise','reject']){const f=fixture();assert(f.ledger.reserve(20,'service').ok);const before=f.durable,source=f.ledger.snapshot();f.setMode(mode);assert.equal(f.ledger.settle('service').ok,false);assert.equal(f.adopted,0);assert.equal(f.held,false);assert.deepEqual(f.durable,before);assert.deepEqual(f.ledger.snapshot(),source);f.setMode('ok');assert(f.ledger.settle('service').ok);assert.equal(f.adopted,1);assert.equal(f.held,false);}
// A legacy participant has no lock protocol: retain its old validity/adoption
// semantics rather than silently changing other countries' financial adapters.
const legacy=fixture({aware:false,valid:false});assert(legacy.ledger.reserve(20,'service').ok);assert(legacy.ledger.settle('service').ok);assert.deepEqual(legacy.events,['adopt']);
console.log('PASS optional payer participant validate/lock/save/adopt/finally lifecycle, all pre-write/save failures release and retry once; old no-lock participant behavior and replay untouched');
