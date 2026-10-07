import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelationshipEvents,relationshipProfile} from '../source/game/relationship-events.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {createPlayerSocialContext} from '../source/game/player-social-context.js';
const make=(over={})=>createRelationshipEvents({...over});
const event=(over={})=>({id:'meal:1',source:'china-meal',actorId:'player',participants:['player','cn-guest'],kind:'meal',outcome:'completed',at:20,...over});
test('actual informed people only, distinct taste/value response, failed save/reload/exact replay',()=>{
 let saved,fail=true;const ledger=make({getProfile:id=>({traits:{appetite:id==='cn-guest'?1:0,quiet:id==='cn-guest'?1:0}}),saveState:s=>{if(fail)return false;saved=s;}});
 const e=event({participants:['player','cn-guest','fr-guest']});assert.equal(ledger.record(e).reason,'save-failed');assert.equal(ledger.pair('cn-guest','player'),null);
 fail=false;assert.equal(ledger.record(e).ok,true);assert(ledger.relationFor('cn-guest','player')>ledger.relationFor('fr-guest','player'));assert.equal(ledger.pair('unaware','player'),null);
 const prior=ledger.snapshot(),fresh=make({saved});assert.equal(fresh.record(e).replayed,true);assert.deepEqual(fresh.snapshot(),prior);assert.equal(fresh.record({...e,actorId:'fr-guest'}).reason,'event-conflict');
 assert.deepEqual(fresh.socialState('player').knownBy.sort(),['cn-guest','fr-guest']);assert.deepEqual(fresh.socialState('player').supporters,[]);
});
test('refusal, cancellation and ordinary failure never punish; fault is directional and cooling survives reload',()=>{
 const ledger=make();for(const outcome of ['refused','cancelled','failed'])assert.equal(ledger.record(event({id:outcome,outcome})).ok,true);
 assert.equal(ledger.relationFor('cn-guest','player'),0);assert.equal(ledger.knownOpinion('cn-guest','player'),0);
 ledger.record(event());const before=ledger.relationFor('cn-guest','player');ledger.record(event({id:'meal:2',at:21}));assert.equal(ledger.relationFor('cn-guest','player'),before);
 const fresh=make({saved:ledger.snapshot()});fresh.record(event({id:'meal:3',at:22}));assert.equal(fresh.relationFor('cn-guest','player'),before);
 fresh.record(event({id:'wrong-dish:1',outcome:'failed',fault:true,at:23}));assert(fresh.knownOpinion('cn-guest','player')<0);assert.equal(fresh.knownOpinion('player','cn-guest'),0);
});
test('legacy conversations remain unique owners; projection influences existing NPC choices without mutating saves',()=>{
 const ledger=make(),p=relationshipProfile('cn-guest',{relations:{player:.2},opinions:{player:.1}},1);
 ledger.record(event());const delta=ledger.relationFor('cn-guest','player');const social=createPlayerSocialContext({getProfile:id=>ledger.projection(id,p),ledger:{lastCompleted:()=>({}),relationFor:()=>.07,knownOpinion:()=>.07}});
 assert.equal(social.relationFor('cn-guest'),.2+delta+.07);assert.deepEqual(p.relations,{player:.2});
 const raw=createLifeDecisions({worldSeed:1,actorIds:['cn-guest','player']}),saved=raw.snapshot();
 const enhanced=createLifeDecisions({worldSeed:1,actorIds:['cn-guest','player'],saved,socialProjection:(id,p)=>ledger.projection(id,p)});
 const choices=[{id:'conversation',base:1,targets:[{id:'player',relationship:{target:'player',weight:1}},{id:'other',relationship:{target:'other',weight:1}}]},{id:'rest',base:1}];
 assert.deepEqual(enhanced.snapshot(),raw.snapshot());const a=raw.distribution('cn-guest',choices),b=enhanced.distribution('cn-guest',choices);assert.equal(a[0].probability,b[0].probability);assert(b[0].targets.find(t=>t.id==='player').probability>a[0].targets.find(t=>t.id==='player').probability);
});
test('old receipts beyond recent history never reward again; four sources keep individual evidence',()=>{
 const ledger=make();for(let i=0;i<65;i++)ledger.record(event({id:`meal:${i}`,source:['china-meal','japan-meal','france-meal','egypt-meal'][i%4],at:i*70}));
 const saved=ledger.snapshot();assert.equal(saved.recent.length,48);const fresh=make({saved});assert.equal(fresh.record(event({id:'meal:0',source:'china-meal',at:0})).replayed,true);assert.deepEqual(fresh.snapshot(),saved);
});
