// Actual original orders produce the topics; fixtures only isolate competing
// choices and reply randomness. Synthetic movement tests ownership/save edges.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createNpcSocial} from '../source/game/npc-social.js';
import {createPlayerConversationLedger} from '../source/game/player-conversation-ledger.js';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js');
const {createLifeDecisions}=await import('../source/game/npc-life-decisions.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const ids=[P.cook,P.host,P.guest],copy=x=>JSON.parse(JSON.stringify(x));
// Execute the production main call, including its stage filter, without loading
// another entire world. The social object and tea controller below are real.
const mainSource=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const mainTeaCall=mainSource.match(/const teaPlayerSocial=npcSocial\?\.state\(\);franceTea\?\.update\(dt,t,.*?\);(?=chinaLabor)/)?.[0];
assert(mainTeaCall,'production main French social mapping exists');
const mainTeaUpdate=new Function('npcSocial','franceTea','dt','t','performing','npcs','simulationClock',mainTeaCall);
function fixture(saved=null,{reply=1}={}){
 let fail=false,urgent=null,time=saved?.time||0,serial=0,mounted=null;const contacts=[],facilities=createFacilityQueue();
 const actor=(id,position)=>{const root=new T.Group();root.position.set(...position);return {root,station:{id,npcLabel:id,npcAction:'read'},route:[],locomotion:{walkSpeed:3},animate(t,w,a){this.action=a;}};};
 const npcs=ids.map((id,i)=>actor(id,[P.cookAside,P.hostHome,P.guestHome][i])),player=actor('player',[25,0,25]);
 const seat={id:'tea-seat',kind:'seat',center:P.seatCenter,position:[5.37,.16,12.5],anchor:[6.6,.16,12.21],seatY:.9535,yaw:Math.PI};
 const furniture={items:[seat],facilities,canSit:()=>true,standPoint:()=>new T.Vector3(...seat.position),releaseActor:id=>facilities.releaseActor(id)};
 const decisions=createLifeDecisions({worldSeed:1,actorIds:ids}).snapshot();for(const id of ids){decisions.people[id].random=id===P.host?1:reply;decisions.people[id].cooldowns={pause:9999,garden:9999};}
 decisions.people[P.guest].current={id:'tea',duration:9,startedAt:0};decisions.people[P.guest].choices=1;
 const tea=createFranceTeaService({npcs,lot:{group:new T.Group(),colliders:[],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40}},furniture,
  doors:{cameraColliders:[],routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.04)route.shift();return {waypoint:route[0]};}},
  planPath:(a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,getMounted:()=>mounted,
  sharedNeeds:{status:id=>({seekToilet:urgent===id})},worldSeed:1,saved:saved?{continuity:saved.tea}:{life:decisions},saveState:()=>!fail,
  beginInteraction:participants=>({id:'france-contact-'+(++serial),participants}),onInteraction:e=>contacts.push(copy(e)),propsFactory:()=>({state:()=>({}),update(){},clear(){},dispose(){}})});
 if(saved){npcs.forEach((n,i)=>{n.root.position.set(...saved.actors[i].position);n.serviceMount=saved.actors[i].mounted?seat:null;});tea.restore(saved.tea);}
 const step=(context={})=>{const before=npcs.map(n=>n.root.position.clone());time+=.1;if(context.social){context.social.update(.1);mainTeaUpdate(context.social,tea,.1,time,null,npcs,{state:()=>({hour:15})});}else tea.update(.1,time,context);npcs.forEach((n,i)=>{if(!n.serviceMount)assert(n.root.position.distanceTo(before[i])<1.7,'no duplicate move outside a legitimate chair stand');});};
 const until=(fn,label,limit=2500)=>{for(let i=0;i<limit&&!fn();i++)step();assert(fn(),label+' '+JSON.stringify(tea.state()));};
 return {tea,npcs,player,seat,contacts,facilities,step,until,setFail:v=>fail=v,setUrgent:id=>urgent=id,serial:()=>serial,mount(){player.root.position.set(...seat.anchor);mounted=seat;},snapshot:()=>({time,tea:tea.snapshot(),actors:npcs.map(n=>({position:n.root.position.toArray(),mounted:!!n.serviceMount}))})};
}
function actualPair(f){f.until(()=>!!f.tea.state().talks.pair,'actual original tea causes accepted conversation');return f.tea.state().talks.pair;}
test('real guest drink and original service leave source evidence; actual pair alone receives durable results',()=>{
 const f=fixture();f.until(()=>f.tea.state().order?.stage==='drinking','real hot tea delivered');assert(ids.every(id=>f.tea.socialStatus(f.npcs.find(n=>n.station.id===id)).busy));assert(ids.every(id=>!f.tea.state().life.people[id].experiences.length));
 const pair=actualPair(f),before=copy(f.tea.state().life.people);assert.equal(f.tea.state().order,null);assert(ids.every(id=>before[id].experiences.length),'only real consumed/cleaned original source actions create experience');assert.equal(f.contacts.length,0);assert(pair.participants.every(id=>f.tea.socialStatus(f.npcs.find(n=>n.station.id===id)).busy));
 f.until(()=>f.tea.state().life.conversations.some(e=>e.status==='completed'),'same pair physically finishes');const event=f.tea.state().life.conversations.find(e=>e.status==='completed');assert.equal(event.results.length,2);for(const id of ids)if(!pair.participants.includes(id)){assert.deepEqual(f.tea.state().life.people[id].relations,before[id].relations);assert.deepEqual(f.tea.state().life.people[id].opinions,before[id].opinions);}assert.equal(f.facilities.state().filter(s=>s.id.startsWith('france-tea-talk-')&&s.reservations.length).length,0);assert.equal(f.serial(),1);assert(f.contacts.every(e=>JSON.stringify(e.participants)===JSON.stringify(event.participants)));assert(Math.abs(f.contacts.at(-1).duration-event.duration)<1e-8);
 const g=fixture(f.snapshot());g.step();assert.deepEqual(g.tea.state().life.people[P.host].relations,f.tea.state().life.people[P.host].relations);assert.equal(g.tea.state().life.conversations.filter(e=>e.status==='completed').length,1);
});
test('a refused invitation consumes one chance and never checks health or changes relationships',()=>{
 const f=fixture(null,{reply:123456});f.until(()=>f.tea.state().life.conversations.length,'real order then voluntary response');const event=f.tea.state().life.conversations[0];assert.equal(event.status,'declined');assert.equal(f.serial(),0);assert.equal(f.tea.state().talks.pair,null);for(const id of ids)assert.deepEqual(f.tea.state().life.people[id].relations,{});const choices=f.tea.state().life.people[P.host].choices;for(let i=0;i<20;i++)f.step();assert.equal(f.tea.state().life.people[P.host].choices,choices,'no per-frame re-roll');
});
test('new player order, employer meeting, player social and urgent need release both original people without rewards',()=>{
 for(const mode of ['order','meeting','social','urgent']){const f=fixture(),pair=actualPair(f);if(mode==='order'){f.mount();assert(f.tea.request());assert.equal(f.tea.state().order.customer,'player');}else if(mode==='meeting')f.tea.requestMeeting(true);else if(mode==='social')f.step({playerSocialActorId:pair.participants[0]});else {f.setUrgent(pair.participants[0]);f.step();}assert.equal(f.tea.state().talks.pair,null,mode);assert.equal(f.tea.state().life.conversations.at(-1).status,'cancelled');assert.equal(f.facilities.state().filter(s=>s.id.startsWith('france-tea-talk-')&&s.reservations.length).length,0);assert.equal(f.serial(),0);for(const id of ids)assert.deepEqual(f.tea.state().life.people[id].relations,{});if(mode==='order'){const id=f.tea.state().order.id;f.until(()=>f.tea.state().order?.stage==='ready','original staff resume new order');assert.equal(f.tea.state().order.id,id);assert.equal(f.tea.state().history.filter(e=>e.event==='tray-received'&&e.orderId===id).length,1);}}
});
test('the original guest next real order preempts the two idle staff and keeps one original tray',()=>{
 const f=fixture(),pair=actualPair(f);assert(pair.participants.includes(P.host)&&pair.participants.includes(P.cook));
 // The prior tea is genuinely complete. Only make this nonparticipant's next
 // decision due, to exercise new demand against an already accepted meeting.
 const saved=f.snapshot();saved.tea.nextChoice=saved.time;saved.tea.life.people[P.guest].nextDecisionAt=saved.time;saved.tea.life.people[P.guest].cooldowns.tea=0;
 const g=fixture(saved);g.step();assert.equal(g.tea.state().talks.pair,null);assert.equal(g.tea.state().life.conversations.at(-1).status,'cancelled');assert.equal(g.tea.state().order.customer,'guest');assert.equal(g.tea.state().order.id,'france-tea-2');assert.equal(g.serial(),0);
 g.until(()=>g.tea.state().order?.stage==='drinking','new original guest order actually reaches drinking');const state=g.tea.state();assert.equal(state.order.trayId,state.order.id+'-tray');assert.equal(state.history.filter(e=>e.event==='tray-received'&&e.orderId===state.order.id).length,1);for(const id of ids)assert.deepEqual(state.life.people[id].relations,{});
});
test('talking checkpoint restores both commitments, places and health token; failed save cannot award',()=>{
 const f=fixture();actualPair(f);f.until(()=>f.tea.state().talks.pair?.elapsed>1,'talking seconds');const saved=f.snapshot(),g=fixture(saved);assert.deepEqual(g.tea.state().talks,f.tea.state().talks);g.step();assert.equal(g.serial(),0);assert.equal(g.contacts[0].id,saved.tea.talks.pair.interaction.id);assert(Math.abs(g.contacts[0].duration-(saved.tea.talks.pair.interaction.duration+.1))<1e-8);
 g.setFail(true);for(let i=0;i<100;i++)g.step();assert(g.tea.state().talks.pair);for(const id of ids)assert.deepEqual(g.tea.state().life.people[id].relations,{});const contactCount=g.contacts.length;g.setFail(false);g.step();assert.equal(g.tea.state().talks.pair,null);assert.equal(g.contacts.length,contactCount);assert.equal(g.tea.state().life.conversations.filter(e=>e.status==='completed').length,1);
 const orphan=copy(saved);delete orphan.tea.talks;const h=fixture(orphan);h.step();assert.equal(h.tea.state().talks.pair,null);assert.equal(h.tea.state().life.conversations.at(-1).status,'cancelled');
});
test('failed story save leaves no experience while original guest drinking and cup return continue',()=>{
 const f=fixture();f.until(()=>f.tea.state().order?.stage==='drinking','original drinking stage');f.setFail(true);for(let i=0;i<100;i++)f.step();assert.equal(f.tea.state().order.finished,true,'actual drinking completes even while optional story storage fails');assert.notEqual(f.tea.state().order.stage,'drinking');assert.equal(f.tea.state().life.people[P.guest].experiences.length,0);assert.equal(f.tea.state().talks.pair,null);f.setFail(false);actualPair(f);assert.equal(f.tea.state().life.people[P.guest].experiences.length,1);
});

test('local player conversation pauses and resumes an existing NPC pair through production main',()=>{
 const f=fixture();actualPair(f);f.until(()=>f.tea.state().talks.pair?.elapsed>.3,'real pair talking');const before=f.tea.state().talks.pair,n=f.npcs.find(n=>n.station.id===before.participants[0]);f.player.root.position.copy(n.root.position).add(new T.Vector3(1,0,0));
 const ledger=createPlayerConversationLedger({worldSeed:42,getProfile:id=>f.tea.socialProfile(id),getClock:()=>({day:1,seconds:200}),saveState:()=>true});
 const social=createNpcSocial({actors:()=>f.npcs,player:()=>f.player,ledger,status:n=>f.tea.socialStatus(n),getCountry:()=> 'france'});
 assert.equal(social.begin(n).stage,'choosing');assert.equal(social.conversationActorId(),n.station.id);const position=n.root.position.toArray(),route=n.route,contacts=f.contacts.length;
 for(let i=0;i<200;i++)f.step({social});assert.equal(social.state().stage,'choosing');assert.deepEqual(f.tea.state().talks.pair,before);assert.deepEqual(n.root.position.toArray(),position);assert.equal(n.route,route);assert.equal(f.contacts.length,contacts);assert.equal(f.tea.state().life.conversations.at(-1).status,'accepted');
 social.end();f.step();const resumed=f.tea.state().talks.pair;assert.equal(resumed.id,before.id);assert(Math.abs(resumed.elapsed-before.elapsed-.1)<1e-8,'paused wall time is never replayed as contact');social.dispose();f.tea.dispose();
});
test('production main protects real choosing and talking player stages from autonomous invitations',()=>{
 const f=fixture();actualPair(f);f.tea.requestMeeting(true);f.tea.requestMeeting(false);const saved=f.snapshot();
 // Release only the cancellation cooldowns, so the pending player menu is
 // exercised against genuinely eligible autonomous choices and real evidence.
 for(const p of Object.values(saved.tea.life.people)){p.cooldowns.conversation=0;p.nextDecisionAt=0;p.replyAfter=0;}
 const g=fixture(saved),host=g.npcs.find(n=>n.station.id===P.host);g.player.root.position.copy(host.root.position).add(new T.Vector3(1,0,0));
 const ledger=createPlayerConversationLedger({worldSeed:4,getProfile:id=>g.tea.socialProfile(id),getClock:()=>({day:1,seconds:200}),saveState:()=>true});
 const social=createNpcSocial({actors:()=>g.npcs,player:()=>g.player,ledger,status:n=>g.tea.socialStatus(n),getCountry:()=> 'france',beginInteraction:participants=>({id:'player-contact',participants})});
 assert.equal(social.begin(host).stage,'choosing');assert.equal(social.isPaused(host),true,'local topic menu holds only its current actor');for(let i=0;i<5;i++)g.step({social});assert.equal(social.state().stage,'choosing');assert(!g.tea.state().talks.pair?.participants.includes(P.host));assert.equal(g.tea.socialProfile(P.host).current,null);
 const result=social.choose('art');assert.equal(result.event.status,'accepted');assert.equal(social.state().stage,'talking');const id=social.state().eventId;for(let i=0;i<5;i++)g.step({social});assert.equal(social.state().eventId,id);assert.equal(social.state().stage,'talking');assert(!g.tea.state().talks.pair?.participants.includes(P.host));assert.equal(g.tea.socialProfile(P.host).current,null);assert.equal(ledger.event(id).status,'accepted');
});

test('local conversation hold never preserves dead actors, lost places, urgent duties or a new real order',async()=>{
 const {setPlayerConversationHold}=await import('../source/game/npc-social-ownership.js');
 for(const invalid of ['dead','place','urgent','order']){
  const f=fixture();const pair=actualPair(f),id=pair.participants[0],n=f.npcs.find(n=>n.station.id===id);setPlayerConversationHold(id);
  try{
   f.step({conversationActorId:id,playerSocialActorId:id});assert.equal(f.tea.state().talks.pair.id,pair.id,'local factors alone do not revoke the old pair');
   if(invalid==='dead')n.alive=false;else if(invalid==='place')f.facilities.releaseActor(id);else if(invalid==='urgent')f.setUrgent(id);else{f.mount();assert(f.tea.request());}
   f.step({conversationActorId:id,playerSocialActorId:id});assert.equal(f.tea.state().talks.pair,null,invalid);assert.equal(f.tea.state().life.conversations.at(-1).status,'cancelled');assert.equal(f.contacts.length,0);for(const participant of pair.participants)assert.deepEqual(f.tea.state().life.people[participant].relations,{});
  }finally{setPlayerConversationHold(null);f.tea.dispose();}
 }
});
