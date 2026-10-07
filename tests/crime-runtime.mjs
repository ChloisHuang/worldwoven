import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrimeRuntime} from '../source/game/crime-runtime.js';
import {resetSocialHolds,socialHoldOwner} from '../source/game/npc-social-ownership.js';
function fixture(country='china',{guards=false}={}){
 resetSocialHolds();let time=0,saveOK=true,visible=true,mode='leave',writes=0,relation=null,resumes=0;const health=[],relationships=[],observed=[];
 const actor=(id,x)=>({actorId:id,station:{id,npcName:id,ageYears:25},root:{position:{x,y:0,z:0,toArray(){return[this.x,this.y,this.z];}},rotation:{y:0}},route:[],breakAt:10,alive:true,animate(){}});
 const p=actor('player',0),a=actor('a',.75),b=actor('b',1.5),g=actor('guard',6),actors=[p,a,b,...(guards?[g]:[])];
 const rt=createCrimeRuntime({country,lot:{},getActors:()=>actors,getPlayer:()=>p,getClock:()=>({seconds:time}),getProfile:()=>({values:{reliability:.4}}),getRelation:(a,b)=>a==='a'&&b==='b'?relation:null,getMode:()=>mode,getGuards:()=>guards?[g]:[],guardResumed(){resumes++;},planPath:()=>[],moveActor(){},doors:{routeStep:()=>({})},poseContext:()=>({}),canSee:()=>visible,isAdult:()=>true,playerAvailable:()=>true,stopPlayer(){},saveState(){writes++;return saveOK;},applyInjury:e=>{health.push(e);return{ok:true};},recordRelationship:e=>{relationships.push(e);return{ok:true};},observeCrimeEvidence:e=>{observed.push(e);return{ok:true};}});
 return {rt,p,a,b,g,actors,health,relationships,observed,step(n=1){for(let i=0;i<n;i++){time+=.1;rt.update(.1,time);}},setRelation:x=>relation=x,resumes:()=>resumes,setSave:x=>saveOK=x,setSight:x=>visible=x,setMode:x=>mode=x,writes:()=>writes};
}
test('four production country adapters validate physical action, cancel and route actual harm to existing health',()=>{
 for(const country of ['china','japan','france','egypt']){const f=fixture(country);assert(f.rt.choices().some(x=>x.kind==='harm'&&x.victimId==='a'));assert(f.rt.beginHarm('player','a'));f.step(3);assert(f.rt.cancelAction());assert.equal(f.health.length,0);assert.equal(f.rt.model.snapshot().cases.length,0);
  assert(f.rt.beginHarm('player','a'));f.step(15);assert.equal(f.health.length,1);assert.equal(f.health[0].victimId,'a');assert.match(f.health[0].id,new RegExp('crime:'+country+':'));assert.equal(f.relationships.length,1);assert.equal(f.rt.model.pendingEffects().length,0);assert.equal(f.rt.model.orders(),null,'no invented police');f.rt.dispose();}
});
test('lost sight or moving away during preparation cancels before an injury, no same-pair spam',()=>{
 const f=fixture();assert(f.rt.beginHarm('player','a'));f.setSight(false);f.step(15);assert.equal(f.health.length,0);f.setSight(true);assert(f.rt.beginHarm('player','a'));f.p.root.position.x=-.5;f.step(15);assert.equal(f.health.length,0);f.p.root.position.x=0;assert(f.rt.beginHarm('player','a'));f.step(15);assert.equal(f.rt.beginHarm('player','a'),false);f.rt.dispose();
});
test('original NPC movement lease is restored and failed save cannot create injury',()=>{
 const f=fixture();f.setMode(null);assert.equal(f.rt.beginHarm('a','b'),false);f.setMode('leave');f.a.route=[{x:4,y:0,z:0}];f.setSave(false);assert(f.rt.beginHarm('a','b'));f.step(15);assert.equal(f.health.length,0);assert.equal(socialHoldOwner('a'),null);assert.deepEqual(f.a.route,[{x:4,y:0,z:0}]);f.setSave(true);assert(f.rt.beginHarm('a','b'));f.step(15);assert.equal(f.health.length,1);assert.equal(socialHoldOwner('a'),null);assert.equal(f.a.alive,true);f.rt.dispose();
});
test('sleeping and private-faded bystanders cannot become witnesses or callers',()=>{
 const f=fixture();f.b.serviceMount={kind:'bed'};assert(f.rt.beginHarm('player','a'));f.step(15);assert(!f.rt.model.snapshot().cases[0].evidence.some(e=>e.witnessId==='b'));assert(!f.relationships[0].participants.includes('b'));f.rt.dispose();
});

test('unreachable chase cancels its actor lease after sustained route failure rather than resetting the wait on retries',()=>{
 const f=fixture('china',{guards:true});assert(f.rt.beginHarm('player','a'));f.step(20);assert.equal(f.rt.model.status('player@original').status,'pursuit');assert.equal(socialHoldOwner('guard'),'crime:china');f.step(200);assert.equal(f.rt.model.status('player@original').status,'reported');assert.equal(socialHoldOwner('guard'),null);f.rt.dispose();
});
test('a second shove or its cancellation during pursuit retains the guard enforcement lease',()=>{
 const f=fixture('china',{guards:true});assert(f.rt.beginHarm('player','a'));f.step(20);f.b.root.position.x=-.75;assert(f.rt.beginHarm('player','b'));f.step(3);assert.equal(socialHoldOwner('guard'),'crime:china');assert(f.rt.cancelAction());assert.equal(socialHoldOwner('guard'),'crime:china');assert(f.rt.beginHarm('player','b'));f.step(15);assert.equal(socialHoldOwner('guard'),'crime:china');f.rt.dispose();
});

test('autonomy requires the exact recent fault, not old aversion followed by an innocent failure',()=>{
 const f=fixture('france');f.p.root.position.x=10;const history={aversion:.6,trust:-.7,last:{outcome:'failed',fault:false,at:0}};f.setRelation(history);f.step(40);assert.equal(f.health.length,0);assert.equal(f.rt.activeAction(),null);f.setRelation({...history,last:{...history.last,fault:true}});f.step(40);assert.equal(f.health.length,1);assert.equal(f.health[0].actorId,'a');assert.equal(f.health[0].victimId,'b');f.rt.dispose();
});
test('disposing an idle region cannot reset the original archery routine',()=>{const f=fixture('china',{guards:true});f.step();f.rt.dispose();assert.equal(f.resumes(),0);});

test('real token theft queues own conduct and only actual witnesses in the original save; receiver failure survives reload',async()=>{
 const {createRelationshipEvents}=await import('../source/game/relationship-events.js');resetSocialHolds();let disk=null,accept=false,sourceOK=true;
 const p={actorId:'player',station:{id:'player',ageYears:25},root:{position:{x:0,y:0,z:0,toArray(){return [0,0,0];}},rotation:{y:0}},route:[],alive:true,animate(){}},w={...p,actorId:'cn-guard-left',station:{id:'cn-guard-left',ageYears:35},root:{position:{x:1,y:0,z:0},rotation:{y:0}}};
 const ledger=createRelationshipEvents({saveState:()=>accept});
 const settings={country:'china',lot:{holdingCell:{intake:[0,0,0],detention:[0,0,0],release:[0,0,0],evidence:{itemId:'original-seal',owner:'guard-post',position:[0,0,0]},setLocked(){},setEvidencePresent(){}}},getActors:()=>[p,w],getPlayer:()=>p,getClock:()=>({seconds:100}),getProfile:()=>({}),getRelation:()=>null,getMode:()=>null,getGuards:()=>[],guardResumed(){},planPath:()=>[],moveActor(){},doors:{},poseContext:()=>({}),canSee:()=>true,isAdult:()=>true,playerAvailable:()=>true,stopPlayer(){},saveState:s=>{if(!sourceOK)return false;disk=structuredClone(s);return true;},applyInjury:()=>({ok:true}),recordRelationship:e=>ledger.record(e),recordPersonalConduct:e=>ledger.recordPersonal(e),observeCrimeEvidence:e=>ledger.observeWitness(e)};
 let rt=createCrimeRuntime(settings);sourceOK=false;assert.equal(rt.interact({kind:'take',itemId:'original-seal'}),false);assert.equal(ledger.conductFor('player').acts,0);sourceOK=true;assert(rt.interact({kind:'take',itemId:'original-seal'}));assert.equal(disk.socialPending.length,2);assert.equal(ledger.conductFor('player').acts,0);const stored=structuredClone(disk);rt.dispose();
 accept=true;rt=createCrimeRuntime({...settings,saved:stored});rt.update(.1,.1);assert.equal(ledger.conductFor('player').acts,1);assert(ledger.conductFor('player').integrity<0);assert(ledger.knownReputation('cn-guard-left','player')<0);assert.equal(ledger.knownReputation('absent','player'),0);assert.equal(disk.socialPending.length,0);const before=ledger.snapshot();rt.dispose();rt=createCrimeRuntime({...settings,saved:stored});rt.update(.1,.1);assert.deepEqual(ledger.snapshot(),before);rt.dispose();
});

test('only a real later near-guard report discloses the original harmful event once',()=>{
 const f=fixture('china',{guards:true});f.g.root.position.x=10;assert(f.rt.beginHarm('player','a'));f.step(25);assert.equal(f.relationships.length,1);assert(!f.relationships[0].participants.includes('guard'));assert.equal(f.observed.length,1);assert.deepEqual(f.observed[0].participants,['player','guard']);assert.equal(f.observed[0].conductEventId,f.relationships[0].id);f.step(25);assert.equal(f.observed.length,1);f.rt.dispose();
});
