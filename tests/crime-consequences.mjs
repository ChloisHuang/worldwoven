// ST05 regressions: finite ownership, physical evidence/guards and atomic saves
// prevent remote arrests, free-money return loops, inherited guilt and replayed
// injury effects. Scene integration/actual routes are verified by the caller.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrimeConsequences} from '../source/game/crime-consequences.js';

const p=(x=0,y=0,z=0)=>({x,y,z});
function fixture({saved,actors:inputActors,guards:inputGuards,countryId='china',...config}={}){
 const actor=(id,x,extra={})=>({id,key:`${id}:life-1`,countryId,sceneId:countryId,position:p(x),alive:true,available:true,adult:true,...extra});
 const actors=inputActors||[actor('player',0),actor('victim',1),actor('witness',4)];
 const guards=inputGuards||[actor('guard',20)];
 const items=[{id:'official-seal',ownerId:'china-office',name:'值守封印',countryId:'china',sceneId:'china',position:p()}];
 const jail={countryId:'china',sceneId:'china',entry:p(30),cell:p(30,-4),release:p(28)};
 const writes=[],blocked=new Set();let saveOK=true;
 const model=createCrimeConsequences({saved,actors:()=>actors,guards:()=>guards,items,jail:()=>jail,persist:(next,events)=>{writes.push({next,events});return saveOK;},hasLineOfSight:(a,b)=>!blocked.has(`${a.id}>${b.id}`),...config});
 return {model,actors,guards,items,jail,writes,blocked,key:actors[0]?.key,victimKey:actors[1]?.key,witnessKey:actors[2]?.key,saveFails:()=>{saveOK=false;},saveWorks:()=>{saveOK=true;}};
}
const current=f=>f.model.snapshot().cases.at(-1);
function arrest(f){f.guards[0].position=p(.5);assert(f.model.update(.1).ok);assert.equal(current(f).status,'pursuit');assert(f.model.update(.1).ok);assert.equal(current(f).status,'escort');}
function enterCell(f){f.actors[0].position={...f.jail.entry};f.guards[0].position={...f.jail.entry};f.model.update(.1);assert.equal(f.model.orders().subjectTarget.y,-4);f.actors[0].position={...f.jail.cell};f.guards[0].position={...f.jail.cell};f.model.update(.1);assert.equal(current(f).status,'custody');}

test('finite seal records physical theft, ownership and observed restitution without money',()=>{
 const f=fixture(),before=structuredClone(f.actors);
 const taken=f.model.take(f.key,'official-seal');assert(taken.ok);assert.equal(taken.caseId,'crime:china:1');
 assert.equal(f.model.snapshot().items['official-seal'].holderKey,f.key);
 assert.equal(f.model.take(f.victimKey,'official-seal').reason,'item-unavailable');
 assert.equal(f.model.returnItem(f.victimKey,'official-seal').reason,'not-item-holder');
 assert(f.model.returnItem(f.key,'official-seal').ok);
 assert.equal(current(f).returned,true);assert.equal(current(f).status,'witnessed','return preserves the observed offense');
 assert.equal(f.model.take(f.key,'official-seal').reason,'item-case-open','no take/return farming');
 assert.equal(f.model.snapshot().items['official-seal'].transfers,2);
 assert.deepEqual(f.actors,before,'engine cannot mutate purse, health, actor life or position');
 assert(!JSON.stringify(f.model.snapshot()).match(/money|balance|wallet|health|damage/));
});

test('range, blocked sight, floors and country boundaries gate real offenses and witnesses',()=>{
 for(const change of[f=>{f.actors[0].position=p(4);},f=>{f.blocked.add('player>official-seal');},f=>{f.actors[0].sceneId='other';},f=>{f.actors[0].position=p(0,-4);}]){const f=fixture();change(f);assert.equal(f.model.take(f.key,'official-seal').reason,'item-out-of-reach');assert.equal(f.model.snapshot().cases.length,0);}
 const f=fixture();f.blocked.add('witness>player');f.actors[1].sceneId='other';assert(f.model.take(f.key,'official-seal').ok);assert.equal(current(f).evidence.length,0);assert.equal(current(f).status,'undiscovered');
 assert(f.model.returnItem(f.key,'official-seal').ok);assert.equal(current(f).status,'repaired');
 assert(f.model.take(f.key,'official-seal').ok,'a physically returned, unwitnessed finite object exists again');
});

test('an actual victim can call while working; no false reports or remote heard calls',()=>{
 const f=fixture();f.actors[1].available=false;
 assert(f.model.harm(f.key,f.victimKey).ok);assert.equal(current(f).evidence.find(e=>e.witnessKey===f.victimKey).kind,'victim');
 assert.equal(f.model.report('stranger:life-1','crime:china:1').reason,'not-witness');
 assert.equal(f.model.report(f.victimKey,'crime:china:1').reason,'no-guard-in-hearing');
 f.guards[0].position=p(9);assert(f.model.report(f.victimKey,'crime:china:1').ok);assert.equal(current(f).status,'reported');
 assert.equal(current(f).reportRevision,1);assert.equal(f.model.report(f.victimKey,'crime:china:1').reason,'no-guard-in-hearing','same report cannot multiply');
});

test('remembered reports route to last seen place and search ends without remote tracking',()=>{
 const f=fixture();f.model.harm(f.key,f.victimKey);f.actors[0].position=p(60);f.guards[0].position=p(10);
 f.model.update(1);assert.equal(current(f).status,'pursuit');assert.deepEqual(f.model.orders().guardTarget,p(0));
 f.model.update(5);assert.deepEqual(f.model.orders().guardTarget,p(0));assert.equal(current(f).searchRemaining,13);
 f.model.update(13);assert.equal(current(f).status,'reported');assert.equal(f.model.orders(),null);
 f.model.update(2);assert.equal(current(f).status,'reported','consumed memory alone cannot restart pursuit');
 f.actors[0].position=p(15);f.model.update(1);assert.equal(current(f).status,'pursuit','an actual new guard sighting can resume');assert.deepEqual(f.model.orders().guardTarget,p(15));
});

test('actual guard proximity and LOS are necessary before arrest; both actors walk into cell',()=>{
 const f=fixture();f.model.take(f.key,'official-seal');f.guards[0].position=p(5);f.model.update(1);f.model.update(1);assert.equal(current(f).status,'pursuit');
 f.guards[0].position=p(.5);f.blocked.add('guard>player');f.model.update(1);assert.equal(current(f).status,'pursuit');
 f.blocked.delete('guard>player');f.model.update(1);assert.equal(current(f).status,'escort');assert.deepEqual(f.model.orders().subjectTarget,f.jail.entry);
 f.actors[0].position={...f.jail.entry};f.model.update(1);assert.equal(current(f).escortStage,'entry','guard must actually accompany subject');
 f.guards[0].position={...f.jail.entry};f.model.update(1);assert.equal(current(f).escortStage,'cell');
 f.actors[0].position={...f.jail.cell};f.model.update(1);assert.equal(current(f).status,'escort');
 f.guards[0].position={...f.jail.cell};f.model.update(1);assert.equal(current(f).status,'custody');assert.equal(f.model.orders().guardKey,null,'guard job lease is released at custody');
 assert.equal(f.model.snapshot().items['official-seal'].holderKey,null);assert.equal(current(f).confiscated,true);
});

test('finite custody pauses absent/offline, survives reload and ends at a physically reached exit',()=>{
 const f=fixture();f.model.harm(f.key,f.victimKey);arrest(f);enterCell(f);assert.equal(current(f).custodyRemaining,45);
 const saved=f.model.snapshot(),g=fixture({saved});g.actors[0].position={...g.jail.cell};
 assert.deepEqual(g.model.snapshot(),saved,'loading grants no offline elapsed time');
 g.model.update(10000,{activeSimulation:false});assert.equal(current(g).custodyRemaining,45);
 g.model.update(10000,{actors:[],guards:[]});assert.equal(current(g).custodyRemaining,45);
 g.actors[0].sceneId='france';g.model.update(100);assert.equal(current(g).custodyRemaining,45);assert.equal(g.model.orders(),null);
 g.actors[0].sceneId='china';g.model.update(44);assert.equal(current(g).custodyRemaining,1);
 g.model.update(1);assert.equal(current(g).status,'releasing');assert.equal(g.model.orders().holdSubject,true);
 g.model.update(100);assert.equal(current(g).status,'releasing','expiry does not teleport to the exit');
 g.actors[0].position={...g.jail.release};g.model.update(1);assert.equal(current(g).status,'released');assert.equal(g.model.orders(),null);assert.equal(g.model.status(g.key).detained,false);
});

test('return and nearby surrender reduce custody without erasing observed crime',()=>{
 const f=fixture();f.model.take(f.key,'official-seal');assert.equal(f.model.surrender(f.key).reason,'no-guard-in-reach');
 assert(f.model.returnItem(f.key,'official-seal').ok);f.guards[0].position=p(.5);assert(f.model.surrender(f.key).ok);arrest(f);enterCell(f);
 assert(current(f).custodyRemaining>0&&current(f).custodyRemaining<45);assert.equal(current(f).returned,true);assert.equal(current(f).surrendered,true);
 assert.equal(f.model.cancelEnforcement().reason,'custody-must-be-served');
});

test('guard unavailability/route failure drops orders and preserves evidence for a later genuine sighting',()=>{
 for(const phase of['pursuit','escort']){
  const f=fixture();f.model.harm(f.key,f.victimKey);f.guards[0].position=p(.5);f.model.update(.1);if(phase==='escort')f.model.update(.1);
  f.guards[0].available=false;assert.equal(f.model.orders(),null,'runtime can release lease even before the next save');f.model.update(.1);
  assert.equal(current(f).status,'reported');assert.equal(current(f).guardKey,null);assert(current(f).evidence.length);assert.equal(f.model.status(f.key).detained,false);
 }
 const f=fixture();f.model.harm(f.key,f.victimKey);arrest(f);assert(f.model.cancelEnforcement('blocked-stair').ok);assert.equal(f.model.orders(),null);assert.equal(current(f).lastOutcome,'blocked-stair');
});

test('harm works in four countries; enforcement requires actual original China guards',()=>{
 for(const countryId of['china','france','japan','egypt']){
  const f=fixture({countryId});f.guards[0].position=p(.5);assert(f.model.harm(f.key,f.victimKey).ok);f.model.update(1);
  assert(current(f).evidence.length>=1);assert.equal(current(f).status,countryId==='china'?'pursuit':'witnessed');assert.equal(f.model.pendingEffects().length,1);
 }
});

test('injury outbox is durable and replay-safe; physical range, age and cooldown prevent spam',()=>{
 const f=fixture(),result=f.model.offend({actorKey:f.key,victimKey:f.victimKey,kind:'harm'});assert(result.ok);
 assert.equal(f.model.harm(f.key,f.victimKey).reason,'harm-cooldown');assert.equal(f.model.pendingEffects().length,1);
 const effect=f.model.pendingEffects()[0];assert.equal(effect.id,'crime:china:1:harm');assert.equal(effect.receiptNumber,1);assert.equal(effect.actorId,'player');assert.equal(effect.victimKey,f.victimKey);assert.equal(effect.at,0);
 const restored=fixture({saved:f.model.snapshot()});assert.deepEqual(restored.model.pendingEffects(),[effect]);restored.saveFails();assert.equal(restored.model.ackEffect(effect.id).reason,'save-failed');assert.deepEqual(restored.model.pendingEffects(),[effect]);restored.saveWorks();assert(restored.model.ackEffect(effect.id).ok);assert.deepEqual(restored.model.pendingEffects(),[]);assert.equal(restored.model.ackEffect(effect.id).replayed,true);
 for(const change of[g=>{g.actors[1].position=p(3);},g=>{g.actors[1].adult=false;},g=>{g.blocked.add('player>victim');},g=>{g.actors[1].alive=false;}]){const g=fixture();change(g);assert.equal(g.model.harm(g.key,g.victimKey).reason,'victim-out-of-reach');assert.deepEqual(g.model.pendingEffects(),[]);}
});

test('all mutations persist first, reject reentrancy and keep the old snapshot on save failure',()=>{
 const f=fixture(),empty=f.model.snapshot();f.saveFails();assert.equal(f.model.take(f.key,'official-seal').reason,'save-failed');assert.deepEqual(f.model.snapshot(),empty);assert.deepEqual(f.model.pendingEffects(),[]);
 assert.equal(f.model.harm(f.key,f.victimKey).reason,'save-failed');assert.deepEqual(f.model.snapshot(),empty);
 f.saveWorks();f.model.take(f.key,'official-seal');const before=f.model.snapshot();f.saveFails();assert.equal(f.model.returnItem(f.key,'official-seal').reason,'save-failed');assert.deepEqual(f.model.snapshot(),before);
 f.guards[0].position=p(.5);assert.equal(f.model.update(1).reason,'save-failed');assert.deepEqual(f.model.snapshot(),before);assert.equal(f.model.orders(),null);
 let model,reentrant;const g=fixture({persist:()=>{reentrant=model.harm('player:life-1','victim:life-1');return true;}});model=g.model;assert(model.take(g.key,'official-seal').ok);assert.equal(reentrant.reason,'crime-busy');assert.equal(model.snapshot().cases.length,1);
 const asyncSave=fixture({persist:()=>Promise.resolve(true)});assert.equal(asyncSave.model.harm(asyncSave.key,asyncSave.victimKey).reason,'save-failed');assert.equal(asyncSave.model.snapshot().cases.length,0);
});

test('new lifetime never inherits guilt, inventory, injury effects or confinement',()=>{
 const f=fixture();f.model.take(f.key,'official-seal');arrest(f);enterCell(f);
 const originalKey=f.key;f.actors[0].key='player:life-2';f.model.update(1);
 assert.equal(current(f).status,'closed');assert.equal(current(f).lastOutcome,'subject-life-replaced');assert.equal(f.model.orders(),null);assert.equal(f.model.status('player:life-2').status,'clear');assert.equal(f.model.status(originalKey).status,'closed');
 const g=fixture();g.model.harm(g.key,g.victimKey);g.actors[0].alive=false;g.model.update(1);assert.equal(current(g).status,'closed');assert.equal(g.model.pendingEffects()[0].actorKey,'player:life-1','saved effect stays tied to the old lifetime for the idempotent health adapter');
});

test('invalid saves remain visible and read-only instead of silently forgiving or spawning inventory',()=>{
 const f=fixture();f.model.take(f.key,'official-seal');const invalid=f.model.snapshot();invalid.items['official-seal'].ownerId='player';
 const g=fixture({saved:invalid});assert.equal(g.model.status(g.key).reason,'invalid-crime-save');assert.equal(g.model.take(g.key,'official-seal').reason,'invalid-crime-save');assert.deepEqual(g.model.snapshot(),invalid);assert.equal(g.model.orders(),null);assert.equal(g.writes.length,0);
 const detached=f.model.snapshot();detached.items['official-seal'].holderKey=null;assert.equal(f.model.snapshot().items['official-seal'].holderKey,f.key);
});

test('separate entry/cell guard anchors keep the guard outside; custody and exit use real arrival radius',()=>{
 const f=fixture();f.jail.guardEntry=p(30,0,1);f.jail.guardCell=p(30,-4,2.55);
 f.model.harm(f.key,f.victimKey);arrest(f);assert.deepEqual(f.model.orders().guardTarget,f.jail.guardEntry);
 f.actors[0].position={...f.jail.entry};f.guards[0].position={...f.jail.guardEntry};f.model.update(.1);assert.deepEqual(f.model.orders().guardTarget,f.jail.guardCell);
 f.actors[0].position=p(30,-4,.7);f.guards[0].position={...f.jail.guardCell};f.model.update(.1);assert.equal(current(f).status,'escort','near gate is not inside the cell');
 f.actors[0].position={...f.jail.cell};f.guards[0].position=p(30,-4,1.8);f.model.update(.1);assert.equal(current(f).status,'escort','guard has not reached its outside station');
 f.guards[0].position={...f.jail.guardCell};f.model.update(.1);assert.equal(current(f).status,'custody');f.model.update(45);
 f.actors[0].position=p(28.7);f.model.update(1);assert.equal(current(f).status,'releasing');f.actors[0].position=p(28.4);f.model.update(1);assert.equal(current(f).status,'released');
});

test('a busy suspect retains their original service until a safe arrest handoff',()=>{
 const f=fixture();f.model.harm(f.key,f.victimKey);f.guards[0].position=p(.5);f.model.update(.1);f.actors[0].available=false;f.model.update(2);
 assert.equal(current(f).status,'pursuit');assert.equal(f.model.orders().holdSubject,false);assert.equal(f.model.orders().subjectTarget,null);
 f.actors[0].available=true;f.model.update(.1);assert.equal(current(f).status,'escort');
});

test('country-specific effect identities and captured world time survive independent regional saves',()=>{
 const china=fixture({getClock:()=>721.25}),japan=fixture({countryId:'japan',getClock:()=>728});
 china.model.harm(china.key,china.victimKey);japan.model.harm(japan.key,japan.victimKey);
 const a=china.model.pendingEffects()[0],b=japan.model.pendingEffects()[0];assert.notEqual(a.id,b.id);assert.notEqual(a.source,b.source);assert.equal(a.at,721.25);assert.equal(b.at,728);
 china.model.update(1);assert.equal(china.model.pendingEffects()[0].at,721.25,'outbox retry cannot change event time');
 const reload=fixture({saved:china.model.snapshot(),getClock:()=>900});assert.equal(reload.model.pendingEffects()[0].at,721.25);assert.equal(reload.model.harm(reload.key,reload.victimKey).reason,'harm-cooldown');
});

test('idle clock ticks do not rewrite the world save; real events capture their simulation time',()=>{
 const f=fixture();for(let i=0;i<100;i++)assert(f.model.update(.5).ok);assert.equal(f.writes.length,0);assert.equal(f.model.snapshot().time,0);
 assert(f.model.harm(f.key,f.victimKey).ok);assert.equal(current(f).at,50);assert.equal(f.model.snapshot().time,50);const count=f.writes.length;
 for(let i=0;i<100;i++)f.model.update(.5);assert.equal(f.writes.length,count,'stationary unreported witnesses do not write clock-only saves');
 const saved=f.model.snapshot(),g=fixture({saved});assert.deepEqual(g.model.snapshot(),saved,'unpersisted idle time is not granted on reload');
});

test('repeat harm after sixty simulated seconds stays one case with new idempotent incident receipts',()=>{
 let clock=200;const f=fixture({countryId:'france',getClock:()=>clock});f.model.harm(f.key,f.victimKey);const first=f.model.pendingEffects()[0];
 f.model.ackEffect(first.id);f.model.update(59.9);assert.equal(f.model.harm(f.key,f.victimKey).reason,'harm-cooldown');
 f.actors[2].position=p(50);f.model.update(.1);clock=260;const second=f.model.harm(f.key,f.victimKey);assert(second.ok);
 assert.equal(f.model.snapshot().cases.length,1);assert.equal(current(f).incidentCount,2);assert.equal(current(f).lastIncidentAt,60);assert.equal(current(f).lastHarmAt,260);assert.equal(current(f).at,200,'original crime history remains');
 const effect=f.model.pendingEffects()[0];assert.notEqual(effect.id,first.id);assert.equal(effect.receiptNumber,2);assert.equal(effect.caseId,first.caseId);assert.equal(effect.at,260);assert(!effect.witnessKeys.includes(f.witnessKey),'an old witness absent now does not observe the new injury');assert(current(f).evidence.some(e=>e.witnessKey===f.witnessKey),'old evidence remains');
 const reload=fixture({countryId:'france',saved:f.model.snapshot()});assert.equal(reload.model.harm(reload.key,reload.victimKey).reason,'harm-cooldown');assert.deepEqual(reload.model.pendingEffects(),[effect]);
});

test('repeat incidents do not stack custody and detention still prevents further harm',()=>{
 const f=fixture();f.model.harm(f.key,f.victimKey);f.model.update(60);f.model.harm(f.key,f.victimKey);assert.equal(f.model.snapshot().cases.length,1);arrest(f);enterCell(f);assert.equal(current(f).custodyRemaining,45);f.actors[1].position={...f.jail.cell};assert.equal(f.model.harm(f.key,f.victimKey).reason,'actor-detained');
});

test('a repeated incident never updates the guard target unless someone can actually convey the sighting',()=>{
 const f=fixture();f.model.harm(f.key,f.victimKey);f.guards[0].position=p(10);f.model.report(f.victimKey,'crime:china:1');
 f.actors[0].position=p(60);f.actors[1].position=p(61);f.actors[2].position=p(50);f.model.update(60);assert.equal(current(f).status,'pursuit');assert.deepEqual(f.model.orders().guardTarget,p());
 assert(f.model.harm(f.key,f.victimKey).ok);assert.deepEqual(f.model.orders().guardTarget,p());assert.deepEqual(current(f).lastKnown,p());
});

test('canHarm is a read-only eligibility query using current transient simulation time',()=>{
 const f=fixture({countryId:'japan'});assert(f.model.canHarm(f.key,f.victimKey).ok);assert.equal(f.writes.length,0);f.model.harm(f.key,f.victimKey);
 const snapshot=f.model.snapshot(),count=f.writes.length;assert.equal(f.model.canHarm(f.key,f.victimKey).reason,'harm-cooldown');f.model.update(60);
 assert.deepEqual(f.model.snapshot(),snapshot);assert.equal(f.writes.length,count);assert(f.model.canHarm(f.key,f.victimKey).ok);assert(f.model.canHarm(f.key,f.victimKey).ok);assert.equal(f.writes.length,count);
 f.actors[1].position=p(5);assert.equal(f.model.canHarm(f.key,f.victimKey).reason,'victim-out-of-reach');f.actors[1].position=p(1);assert(f.model.harm(f.key,f.victimKey).ok);assert.equal(current(f).incidentCount,2);
});

test('two real guards retain only reports each one actually heard',()=>{
 const f=fixture();f.guards[0].id='guard-a';f.guards[0].key='guard-a:life-1';f.guards[0].position=p(10);f.guards.push({...f.guards[0],id:'guard-b',key:'guard-b:life-1',position:p(100)});
 f.model.harm(f.key,f.victimKey);f.model.update(1);assert.equal(f.model.orders().guardKey,'guard-a:life-1');assert.deepEqual(f.model.orders().guardTarget,p());
 f.actors[0].position=p(70);f.actors[1].position=p(71);f.actors[2].position=p(50);f.guards[1].position=p(75);f.model.update(1);
 assert.deepEqual(current(f).guardReports['guard-b:life-1'].position,p(70));assert.deepEqual(f.model.orders().guardTarget,p(),'a distant guard does not get another guard’s private sighting');
 f.guards[0].available=false;f.model.update(1);f.model.update(1);assert.equal(f.model.orders().guardKey,'guard-b:life-1');assert.deepEqual(f.model.orders().guardTarget,p(70));
});

test('incomplete finite-item provenance and malformed guard memory fail closed on restore',()=>{
 const f=fixture();f.model.take(f.key,'official-seal');
 for(const mutate of[s=>{delete s.items['official-seal'];},s=>{s.cases[0].guardReports=[];},s=>{s.cases[0].guardReports.bad={position:p(),revision:NaN,at:0};}]){const saved=f.model.snapshot();mutate(saved);const g=fixture({saved});assert.equal(g.model.status(g.key).reason,'invalid-crime-save');assert.deepEqual(g.model.snapshot(),saved);assert.equal(g.writes.length,0);}
});
