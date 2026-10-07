import test from 'node:test';
import assert from 'node:assert/strict';
import {createRelationshipEvents} from '../source/game/relationship-events.js';
const event=(extra={})=>({id:'service:1',source:'china-meal',actorId:'player',participants:['player','guest'],kind:'meal',outcome:'completed',at:20,...extra});
const harm=(extra={})=>event({id:'harm:1',source:'crime-consequences',kind:'physical-harm',outcome:'failed',fault:true,...extra});
const profile=(extra={})=>({traits:{quiet:.5,curiosity:.5},values:{company:.5,reliability:.5},relations:{},interactions:{},...extra});
const supporting=(extra={})=>profile({relations:{player:.4},trust:{player:.2},interactions:{player:{completedCount:6,lastCompletedId:'conversation:6',trust:.15,supportStance:'support',supportEventId:'conversation:6',supportAt:10,...extra}}});

test('fame, locally appraised reputation, moral conduct and support are independent',()=>{
 const ledger=createRelationshipEvents({getProfile:id=>profile({values:{reliability:id==='guest'?1:0,company:.5}})});
 ledger.record(event({participants:['player','guest','other']}));
 const state=ledger.socialState('player');
 assert.deepEqual(state.knownBy,['guest','other']);assert.equal(state.fame,2);
 assert.equal(state.reputation,0,'no global omniscient reputation');assert.equal(state.supporterCount,0,'positive service never invents allegiance');
 assert(ledger.knownReputation('guest','player')>ledger.knownReputation('other','player'));
 assert.notEqual(ledger.knownReputation('guest','player'),ledger.knownOpinion('guest','player'));
 assert.equal(ledger.knownReputation('unaware','player'),0);assert.equal(ledger.knownConduct('unaware','player').acts,0);
 assert.equal(state.morality.acts,1,'one completed act, not one per observer');assert.equal(state.morality.integrity,.006);
 assert.equal(state.morality.respect,0);assert.equal(state.morality.care,0);
 const one=createRelationshipEvents();one.record(event());assert.deepEqual(one.conductFor('player'),state.morality,'number/taste of observers cannot change morality');
});

test('specific observers and existing factions only aggregate their own informed evidence',()=>{
 const people={guest:{actorId:'guest',factionId:'existing-workers'},other:{actorId:'other',factionId:'existing-guests'},unknown:{actorId:'unknown',factionId:'existing-workers'}};
 const ledger=createRelationshipEvents({getIdentity:id=>people[id],getProfile:()=>profile()});
 ledger.record(event());ledger.record(harm({participants:['player','other']}));
 assert(ledger.socialState('player',{observerId:'guest'}).reputation>0);
 assert(ledger.socialState('player',{observerId:'other'}).reputation<0);
 assert.equal(ledger.socialState('player',{observerId:'unknown'}).reputation,0);
 const faction=ledger.socialState('player',{observerIds:Object.keys(people),factionId:'existing-workers'});
 assert.deepEqual(faction.reputationObservers,['guest']);assert.equal(faction.reputation,ledger.knownReputation('guest','player'));
 assert.equal(ledger.knownConduct('guest','player').care,0,'unseen harm is not shared globally');
 assert(ledger.conductFor('player').care<0,'the actor still retains their own completed act');
});

test('refusal, cancellation and innocent failure are moral neutral; privacy and actual harm leave distinct evidence',()=>{
 const ledger=createRelationshipEvents();
 for(const outcome of ['refused','cancelled','failed'])ledger.record(event({id:outcome,outcome}));
 assert.equal(ledger.conductFor('player').acts,0);assert.equal(ledger.knownReputation('guest','player'),0);
 ledger.record(event({id:'retreat',source:'bath-privacy',kind:'privacy-retreat',at:40}));
 assert.equal(ledger.conductFor('player').respect,.012);assert.equal(ledger.conductFor('player').integrity,0);
 ledger.record(event({id:'intrusion',source:'bath-privacy',kind:'privacy-intrusion',outcome:'failed',fault:true,at:50}));
 assert(ledger.conductFor('player').respect<0);assert.equal(ledger.conductFor('player').lastFault.id,'intrusion');
 ledger.record(harm({at:60}));assert.equal(ledger.conductFor('player').care,-.16);
 assert.equal(ledger.knownConduct('guest','player').lastFault.id,'harm:1');
 const before=ledger.snapshot(),observer=ledger.projection('guest',profile({appearanceAffinity:1,relations:{player:1}}));
 assert(observer.trust.player<0);assert.deepEqual(ledger.snapshot(),before,'appearance/profile projection cannot forgive harm or grant consent');
});

test('independent conduct/reputation cooldowns, failed persistence and exact replay survive reload',()=>{
 let fail=true,saved;const ledger=createRelationshipEvents({saveState:next=>{if(fail)return false;saved=next;return true;}}),empty=ledger.snapshot();
 assert.equal(ledger.record(event()).reason,'save-failed');assert.deepEqual(ledger.snapshot(),empty);
 fail=false;ledger.record(event());const first=ledger.socialState('player',{observerId:'guest'});
 ledger.record(event({id:'service:2',at:21}));const cooled=ledger.socialState('player',{observerId:'guest'});
 assert.equal(cooled.reputation,first.reputation);assert.equal(cooled.morality.score,first.morality.score);assert.equal(cooled.morality.acts,2);
 const fresh=createRelationshipEvents({saved});const snapshot=fresh.snapshot();assert.equal(fresh.record(event()).replayed,true);assert.deepEqual(fresh.snapshot(),snapshot);
 fresh.record(event({id:'service:3',at:22}));assert.equal(fresh.knownReputation('guest','player'),first.reputation);
 fresh.record(event({id:'service:4',at:81}));assert(fresh.knownReputation('guest','player')>first.reputation);assert(fresh.conductFor('player').score>first.morality.score);
 assert.equal(fresh.record(event({id:'service:4',at:82})).reason,'event-conflict');
});

test('support requires an actual completed explicit stance and an active same-identity NPC',()=>{
 const profiles={guest:supporting(),thresholdOnly:supporting({supportStance:undefined,supportEventId:undefined}),withheld:supporting({supportStance:'withhold'}),unfinished:supporting({lastCompletedId:null}),retired:supporting(),dead:supporting(),replaced:supporting(),invented:supporting(),player:supporting()};
 const identities=Object.fromEntries(Object.keys(profiles).filter(id=>id!=='invented').map(id=>[id,{actorId:id,alive:true}]));
 identities.retired.retired=true;identities.dead.alive=false;identities.replaced.actorId='new-person';
 const ledger=createRelationshipEvents({getProfile:id=>profiles[id],getSupportProfile:id=>profiles[id],getObserverIds:()=>Object.keys(profiles),getIdentity:id=>identities[id]});
 const view=ledger.socialState('player');assert.deepEqual(view.supporters,['guest']);assert.equal(view.supporterCount,1);
 assert.deepEqual(ledger.stanceFor('guest','player'),view.stances.find(s=>s.observerId==='guest'));assert.equal(ledger.stanceFor('unfinished','player'),null);
 assert(view.knownBy.includes('thresholdOnly'));assert(!view.knownBy.includes('unfinished'));assert(!view.knownBy.includes('player'));
 assert.equal(ledger.socialState('new-person').fame,0,'a changed identity cannot inherit acquaintances or support');
 identities.player.alive=false;assert.equal(ledger.socialState('player').supporterCount,0);identities.player.alive=true;
 profiles.guest.interactions.player.boundary=true;assert.equal(ledger.socialState('player').supporterCount,0);
 profiles.guest.interactions.player.boundary=false;profiles.guest.relations.player=-.1;assert.equal(ledger.socialState('player').supporterCount,0);
 profiles.guest.relations.player=.4;profiles.guest.interactions.player.supportStance='withhold';assert.equal(ledger.socialState('player').supporterCount,0);
});

test('a new known fault withdraws active support without unrelated-clock comparisons or automatic repair',()=>{
 const p=supporting();const ledger=createRelationshipEvents({getProfile:()=>p,getSupportProfile:()=>p,getObserverIds:()=>['guest'],getIdentity:id=>({actorId:id,alive:true})});
 ledger.record(event());assert.deepEqual(ledger.socialState('player').supporters,['guest']);
 // This source time predates supportAt, but the completed harm really is new.
 ledger.record(harm({at:1}));assert.deepEqual(ledger.socialState('player').supporters,[]);
 for(let n=0;n<12;n++)ledger.record(event({id:`repair:${n}`,at:100+n*70}));
 assert(ledger.knownReputation('guest','player')>0);assert.deepEqual(ledger.socialState('player').supporters,[],'many services cannot silently renew a personal pledge after harm');
 p.interactions.player.supportEventId='conversation:reconsidered';p.interactions.player.supportEvidenceId=ledger.knownConduct('guest','player').last.id;p.interactions.player.supportFaultId='harm:1';
 assert.deepEqual(ledger.socialState('player').supporters,['guest'],'a new explicit stance may acknowledge the known fault');
 ledger.record(harm({id:'harm:2',at:2}));assert.deepEqual(ledger.socialState('player').supporters,[],'even a cooled new act can withdraw a pledge');
});

test('conversation awareness reads the original completed memories without a second reward or save',()=>{
 let saves=0;const p=supporting({supportStance:'withhold'}),ledger=createRelationshipEvents({getProfile:()=>p,getSupportProfile:()=>p,getObserverIds:()=>['guest'],getIdentity:id=>({actorId:id}),saveState:()=>{saves++;}});
 const before=ledger.snapshot(),view=ledger.socialState('player',{observerId:'guest'});
 assert.deepEqual(view.knownBy,['guest']);assert.equal(view.fame,1);assert.equal(view.reputation,0);assert.equal(view.knownConduct.acts,0);
 assert.equal(ledger.relationFor('guest','player'),0);assert.equal(saves,0);assert.deepEqual(ledger.snapshot(),before);
 ledger.observe(event({id:'legacy-owned',kind:'conversation'}));assert.equal(ledger.relationFor('guest','player'),0);assert.equal(ledger.knownOpinion('guest','player'),0);assert.equal(ledger.conductFor('player').acts,0);
 assert.equal(ledger.observe(event({id:'legacy-owned',kind:'conversation'})).replayed,true);
 assert.equal(ledger.record(event({id:'legacy-owned',kind:'conversation'})).reason,'event-conflict','same receipt cannot acquire a second relation writer');
});

test('legacy relations migrate as known identities without inferred morality, reputation or supporter headcounts',()=>{
 const saved={version:1,receipts:{old:true},people:{guest:{relations:{player:{relation:.8,trust:.7,aversion:0,knownEvents:10,last:{id:'old'}}}}},recent:[]};
 const ledger=createRelationshipEvents({saved,getProfile:()=>profile()});const view=ledger.socialState('player',{observerId:'guest'});
 assert.deepEqual(view.knownBy,['guest']);assert.equal(view.supporterCount,0);assert.equal(view.reputation,0);assert.equal(view.morality.acts,0);
 assert.equal(ledger.relationFor('guest','player'),.8);assert.equal(ledger.record(event({id:'old'})).replayed,true);
 assert.equal(ledger.conductFor('player').acts,0);assert.equal(saved.socialVersion,undefined,'migration does not mutate the caller save');
});

test('exact social receipts survive recent-body compaction and malformed IDs cannot create prototype identities',()=>{
 const ledger=createRelationshipEvents();for(let i=0;i<60;i++)ledger.record(event({id:`service:${i}`,at:i*70}));
 const saved=ledger.snapshot(),fresh=createRelationshipEvents({saved});assert.equal(saved.recent.length,48);
 assert.equal(fresh.record(event({id:'service:0',at:0})).replayed,true);assert.deepEqual(fresh.snapshot(),saved);
 for(const id of ['__proto__','constructor','toString'])assert.equal(fresh.record(event({id})).reason,'invalid-event');
 assert.equal(fresh.record(event({id:'bad-kind',kind:{unsupported:true}})).reason,'invalid-event');
 assert.deepEqual(fresh.snapshot(),saved);
 const exposed=fresh.conductFor('player');exposed.last.id='mutated';assert.notEqual(fresh.conductFor('player').last.id,'mutated');
});


test('single-pair stance read never enumerates global observers or writes',()=>{
 let reads=0,writes=0;const p=supporting();
 const ledger=createRelationshipEvents({getProfile:()=>p,getSupportProfile:id=>{assert.equal(id,'guest');reads++;return p;},getIdentity:id=>({actorId:id}),getObserverIds:()=>{throw new Error('Unexpected roster scan');},saveState:()=>{writes++;}});
 assert.equal(ledger.stanceFor('guest','player').active,true);assert.equal(reads,1);assert.equal(writes,0);
});

const theft=(extra={})=>({id:'crime:theft:personal',source:'crime-consequences',actorId:'player',kind:'property-theft',outcome:'failed',fault:true,at:10,...extra});
const witness=(extra={})=>theft({id:'crime:theft:witness:guard',conductEventId:'crime:theft:personal',participants:['player','guard'],at:30,...extra});

test('undiscovered personal theft changes only real actor conduct with atomic save and replay',()=>{
 let fail=true,saved;const ledger=createRelationshipEvents({saveState:s=>{if(fail)return false;saved=s;return true;}}),before=ledger.snapshot();
 assert.equal(ledger.recordPersonal(theft()).reason,'save-failed');assert.deepEqual(ledger.snapshot(),before);
 assert.equal(ledger.recordPersonal(theft({participants:['player','imaginary']})).reason,'personal-event-has-observers');
 assert.equal(ledger.recordPersonal(theft({participants:{player:true}})).reason,'invalid-event');
 assert.equal(ledger.recordPersonal(theft({outcome:'cancelled',fault:false})).reason,'no-completed-conduct');
 fail=false;assert.equal(ledger.recordPersonal(theft()).ok,true);const own=ledger.conductFor('player');assert.equal(own.integrity,-.12);assert.equal(own.acts,1);
 assert.equal(ledger.socialState('player').fame,0);assert.equal(ledger.knownReputation('guard','player'),0);assert.deepEqual(ledger.snapshot().people,{});
 const fresh=createRelationshipEvents({saved});assert.equal(fresh.recordPersonal(theft()).replayed,true);assert.deepEqual(fresh.snapshot(),saved);
 assert.equal(fresh.record(theft({participants:['player','guard']})).reason,'event-conflict');
});

test('only durable matching conduct can inform an actual later witness; repeated disclosure is not a second act',()=>{
 let fail=false;const ledger=createRelationshipEvents({saveState:()=>!fail});
 assert.equal(ledger.observeWitness(witness()).reason,'unknown-conduct-evidence');ledger.recordPersonal(theft());
 assert.equal(ledger.observeWitness(witness({actorId:'other',participants:['other','guard']})).reason,'conduct-evidence-conflict');
 assert.equal(ledger.observeWitness(witness({kind:'physical-harm'})).reason,'conduct-evidence-conflict');
 const before=ledger.snapshot();fail=true;assert.equal(ledger.observeWitness(witness()).reason,'save-failed');assert.deepEqual(ledger.snapshot(),before);
 fail=false;ledger.observeWitness(witness());assert.deepEqual(ledger.socialState('player').knownBy,['guard']);assert(ledger.knownReputation('guard','player')<0);
 assert.equal(ledger.knownConduct('guard','player').acts,1);assert.equal(ledger.knownConduct('guard','player').last.conductEventId,'crime:theft:personal');
 assert.equal(ledger.conductFor('player').acts,1);assert.equal(ledger.relationFor('guard','player'),0,'observation does not duplicate another reward owner');
 const known=ledger.knownConduct('guard','player'),reputation=ledger.knownReputation('guard','player');
 ledger.observeWitness(witness({id:'crime:theft:report-again',at:500}));assert.deepEqual(ledger.knownConduct('guard','player'),known);assert.equal(ledger.knownReputation('guard','player'),reputation);
 ledger.observeWitness(witness({id:'crime:theft:witness:other',participants:['player','other'],at:510}));assert.equal(ledger.knownConduct('other','player').acts,1);assert.equal(ledger.conductFor('player').acts,1);
 const saved=ledger.snapshot(),fresh=createRelationshipEvents({saved});assert.equal(fresh.observeWitness(witness()).replayed,true);assert.deepEqual(fresh.snapshot(),saved);
});

test('later reports may refer to original harm receipts and do not rescore the original informed victim',()=>{
 const ledger=createRelationshipEvents();ledger.record(harm());const own=ledger.conductFor('player'),guest=ledger.knownConduct('guest','player'),reputation=ledger.knownReputation('guest','player');
 const report=harm({id:'harm:guard-report',conductEventId:'harm:1',participants:['player','guard'],at:100});
 assert.equal(ledger.observeWitness(report).ok,true);assert.equal(ledger.knownConduct('guard','player').acts,1);assert.deepEqual(ledger.conductFor('player'),own);
 ledger.observeWitness({...report,id:'harm:victim-report',participants:['player','guest'],at:200});assert.deepEqual(ledger.knownConduct('guest','player'),guest);assert.equal(ledger.knownReputation('guest','player'),reputation);
 assert.equal(ledger.observeWitness({...report,id:'harm:chain',conductEventId:'harm:guard-report'}).reason,'conduct-evidence-conflict','reports retain the original act identity');
});

test('compacted source receipts remain usable for real later reports without full event archives',()=>{
 const ledger=createRelationshipEvents();ledger.recordPersonal(theft());
 for(let n=0;n<50;n++)ledger.record(event({id:`later:${n}`,actorId:'other',participants:['other','guest'],at:100+n*70}));
 assert(!ledger.snapshot().recent.some(e=>e.id==='crime:theft:personal'));
 const fresh=createRelationshipEvents({saved:ledger.snapshot()});assert.equal(fresh.observeWitness(witness()).ok,true);
 assert.equal(fresh.knownConduct('guard','player').acts,1);assert.equal(fresh.conductFor('player').acts,1);assert.equal(fresh.recordPersonal(theft()).replayed,true);
});
