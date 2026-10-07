import assert from 'node:assert/strict';
import {createNpcPublicInteractions} from '../source/game/npc-public-interactions.js';
import {isSociallyHeld,resetSocialHolds} from '../source/game/npc-social-ownership.js';
const actor=(id,x)=>({actorId:id,root:{visible:true,position:{x,y:0,z:0},rotation:{y:0}},walking:false});
const profile=()=>({traits:{sociability:1,quiet:.5,curiosity:.5,outdoors:.5},values:{company:1,quiet:.5,curiosity:.5},needs:{hunger:0,fatigue:0,social:1},relations:{},opinions:{},experiences:[]});
function setup(extra={}){resetSocialHolds();const roster=[actor('staff',0),actor('artist',1),actor('visitor',2),actor('official',2.5)],events=[],saved=[];let busy=false;
 const api=createNpcPublicInteractions({getActors:()=>roster,getBaseProfile:profile,isAvailable:()=>!busy,getCountry:()=> 'japan',worldSeed:44,saveState:s=>{saved.push(s);return true;},resolveMeeting:()=>({id:'public',private:false,places:[[0,0,0],[1,0,0]]}),createJourney:()=>({state:()=>({ok:true}),update:()=>({ok:true,phase:'arrived'}),cancel(){},finish(){}}),interactionContext:()=>({age:28,selfAge:30}),beginInteraction:participants=>({participants}),onInteraction:e=>events.push(e),...extra});return {api,roster,events,saved,busy:v=>busy=v};}
function run(api,n=1800){for(let i=0;i<n;i++)api.update(1);}
{
 const t=setup();run(t.api);assert.ok(t.events.length>0,'actual public pair completes');assert.ok(t.events.every(e=>e.duration>=6));const completed=t.api.snapshot().brain.conversations.filter(e=>e.status==='completed');assert.ok(completed.length);assert.ok(completed.every(e=>e.experience.kind==='greeting'));assert.ok(t.api.snapshot().brain.people.staff);assert.ok(t.api.snapshot().brain.people.artist);assert.ok(t.api.snapshot().brain.people.visitor);assert.ok(t.api.snapshot().brain.people.official);const before=t.api.snapshot();t.api.dispose();const r=setup({saved:before});run(r.api,1);assert.equal(r.events.length,0,'reload never replays a completed award');r.api.dispose();
}
{
 const t=setup();while(!t.api.status())t.api.update(1);const ids=t.api.status().participants;assert.ok(ids.every(isSociallyHeld));t.busy(true);t.api.update(1);assert.equal(t.api.status(),null);assert.ok(ids.every(id=>!isSociallyHeld(id)));assert.equal(t.events.length,0);t.api.dispose();
}
{
 const t=setup({saveState:()=>false});run(t.api);assert.equal(t.events.length,0,'failed save cannot award');assert.ok(Object.values(t.api.snapshot().brain.people).every(p=>Object.keys(p.relations).length===0));t.api.dispose();
}
{
 const t=setup({resolveMeeting:()=>({private:true,places:[[0,0,0],[1,0,0]]})});run(t.api);assert.equal(t.events.length,0,'public adapter never grants private rights');t.api.dispose();
}
{
 const t=setup();t.roster.push(actor('new-real-actor',1.5));run(t.api,20);assert.ok(t.api.state('new-real-actor'),'dynamic real roster enrolls');t.api.dispose();
}
{
 let fail=true;const t=setup({saveState:s=>!fail||!s.brain?.conversations?.some(e=>e.status==='completed')});
 run(t.api,1500);assert.equal(t.events.length,0);assert.ok(t.api.status(),'failed completion remains retryable');assert.ok(Object.values(t.api.snapshot().brain.people).every(p=>Object.keys(p.relations).length===0));
 fail=false;run(t.api,6);assert.equal(t.events.length,1,'retry awards once');t.api.dispose();
}
{
 const t=setup();while(!t.api.status())t.api.update(1);const saved=t.api.snapshot();t.api.dispose();const r=setup({saved});assert.equal(r.api.status(),null);assert.ok(Object.values(r.api.snapshot().brain.people).every(p=>!p.current));r.api.dispose();
}
console.log('PASS public NPC autonomous pairing, durable outcomes, owner cancellation, dynamic roster, private gate');
for(const change of ['dead','replace','identity']){
 const t=setup();while(!t.api.status())t.api.update(1);const ids=t.api.status().participants,n=t.roster.find(n=>n.actorId===ids[0]);
 if(change==='dead')n.alive=false;else if(change==='replace')t.roster.splice(t.roster.indexOf(n),1,actor(n.actorId,n.root.position.x));else n.actorId='replacement-person';
 t.api.update(1);assert.equal(t.api.status(),null,change);assert.equal(t.events.length,0,change);assert.ok(ids.every(id=>!isSociallyHeld(id)));t.api.dispose();
}
console.log('PASS original identity frozen through death, replacement and changed actor identity; no transfer or penalty');
