import test from 'node:test';
import assert from 'node:assert/strict';
import {createCrimeRuntime} from '../source/game/crime-runtime.js';
import {resetSocialHolds,socialHoldOwner} from '../source/game/npc-social-ownership.js';
function fixture(country='china',{guards=false}={}){
 resetSocialHolds();let time=0,saveOK=true,visible=true,mode='leave',writes=0,relation=null,resumes=0;const health=[],relationships=[];
 const actor=(id,x)=>({actorId:id,station:{id,npcName:id,ageYears:25},root:{position:{x,y:0,z:0,toArray(){return[this.x,this.y,this.z];}},rotation:{y:0}},route:[],breakAt:10,alive:true,animate(){}});
 const p=actor('player',0),a=actor('a',.75),b=actor('b',1.5),g=actor('guard',6),actors=[p,a,b,...(guards?[g]:[])];
 const rt=createCrimeRuntime({country,lot:{},getActors:()=>actors,getPlayer:()=>p,getClock:()=>({seconds:time}),getProfile:()=>({values:{reliability:.4}}),getRelation:(a,b)=>a==='a'&&b==='b'?relation:null,getMode:()=>mode,getGuards:()=>guards?[g]:[],guardResumed(){resumes++;},planPath:()=>[],moveActor(){},doors:{routeStep:()=>({})},poseContext:()=>({}),canSee:()=>visible,isAdult:()=>true,playerAvailable:()=>true,stopPlayer(){},saveState(){writes++;return saveOK;},applyInjury:e=>{health.push(e);return{ok:true};},recordRelationship:e=>{relationships.push(e);return{ok:true};}});
 return {rt,p,a,b,g,actors,health,relationships,step(n=1){for(let i=0;i<n;i++){time+=.1;rt.update(.1,time);}},setRelation:x=>relation=x,resumes:()=>resumes,setSave:x=>saveOK=x,setSight:x=>visible=x,setMode:x=>mode=x,writes:()=>writes};
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
