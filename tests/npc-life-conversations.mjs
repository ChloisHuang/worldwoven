// Prevent phantom completed topics, replayed social rewards, asymmetric commit
// failures and target-count frequency bias without constructing a scene.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLifeDecisions,conversationDisposition} from '../source/game/npc-life-decisions.js';
const ids=['reader','companion','uninformed'];
function setup(){const saved=createLifeDecisions({worldSeed:42,actorIds:ids}).snapshot();for(const id of ids){saved.people[id].random=1;saved.people[id].needs={social:.7,hunger:0,fatigue:0};}return saved;}
function offer(brain){const read=brain.choose('reader',[{id:'read',experience:{kind:'read',label:'刚在官署读完书卷'},duration:[10,10]}]);brain.tick(10);brain.complete('reader',read);const invitation=brain.choose('reader',[{id:'conversation',experienceId:brain.experience('reader').id,duration:[9,9],targets:[{id:'companion',relationship:{target:'companion'}}]}]);return {invitation,event:brain.invite('reader',invitation)};}
test('real completed topics, stable individual acceptance, and once-only directed results survive reload',()=>{
 const saved=setup();saved.people.reader.traits.curiosity=1;saved.people.reader.traits.quiet=1;saved.people.companion.traits.curiosity=.03;saved.people.companion.traits.quiet=.03;
 const brain=createLifeDecisions({actorIds:ids,saved}),interrupted=brain.choose('uninformed',[{id:'read',experience:{kind:'read'},duration:[10,10]}]);brain.complete('uninformed',interrupted,{fulfilled:false});assert.equal(brain.experience('uninformed'),null);
 const {event,invitation}=offer(brain);assert.equal(event.status,'accepted');assert.equal(brain.state('companion').current.conversationId,event.id);const rng=brain.state('companion').random;assert.deepEqual(brain.invite('reader',invitation),event);assert.equal(brain.state('companion').random,rng);
 assert.equal(brain.finishConversation(event.id,{elapsed:9,arrived:['reader']}).ok,false);
 const restored=createLifeDecisions({actorIds:ids,saved:brain.snapshot()}),result=restored.finishConversation(event.id,{elapsed:9,arrived:['reader','companion']});assert(result.ok);assert(restored.state('reader').relations.companion>0);assert(restored.state('companion').relations.reader<0);assert.deepEqual(restored.state('uninformed').relations,{});assert.deepEqual(restored.state('uninformed').opinions,{});
 const done=restored.snapshot(),again=createLifeDecisions({actorIds:ids,saved:done});assert(again.finishConversation(event.id,{elapsed:9,arrived:ids}).replayed);assert.deepEqual(again.snapshot(),done);
 assert.equal(conversationDisposition(saved.people.reader,saved.people.companion,'read').feeling,'appreciated');assert.equal(conversationDisposition(saved.people.companion,saved.people.reader,'read').feeling,'mismatched');
});
test('failed invitation/result saves roll back both people and RNG; cancellation grants no reward',()=>{
 let reject=false;const brain=createLifeDecisions({actorIds:ids,saved:setup(),onChange:()=>!reject});const {event}=offer(brain);assert.equal(event.status,'accepted');const before=brain.snapshot();reject=true;assert.equal(brain.finishConversation(event.id,{elapsed:12,arrived:ids}).reason,'save-failed');assert.deepEqual(brain.snapshot(),before);assert(brain.cancelConversation(event.id));for(const id of event.participants){assert.equal(brain.state(id).current,null);assert.deepEqual(brain.state(id).relations,{});}reject=false;
 const pending=createLifeDecisions({actorIds:ids,saved:setup(),onChange:()=>!reject});const read=pending.choose('reader',[{id:'read',experience:{kind:'read'}}]);pending.complete('reader',read);const choice=pending.choose('reader',[{id:'conversation',experienceId:pending.experience('reader').id,targets:[{id:'companion'}]}]),pre=pending.snapshot();reject=true;assert.equal(pending.invite('reader',choice).reason,'save-failed');assert.deepEqual(pending.snapshot(),pre);
});
test('conversation action frequency and next opportunity do not grow with eligible partner count',()=>{
 const small=[{id:'read',base:1},{id:'conversation',base:1,targets:[{id:'companion'}]}],large=[small[0],{...small[1],targets:[{id:'companion'},{id:'uninformed'},{id:'other'}]}];
 const a=createLifeDecisions({actorIds:ids,saved:setup()}),b=createLifeDecisions({actorIds:ids,saved:setup()});assert.deepEqual(a.distribution('reader',small).map(x=>x.probability),b.distribution('reader',large).map(x=>x.probability));a.defer('reader',12);b.defer('reader',12);for(let i=0;i<100;i++){assert.equal(a.choose('reader',small),null);assert.equal(b.choose('reader',large),null);a.tick(.01);b.tick(.01);}assert.deepEqual(a.state('reader'),b.state('reader'));a.tick(12);b.tick(12);assert.equal(a.choose('reader',small).id,b.choose('reader',large).id);assert.equal(a.state('reader').random,b.state('reader').random);
});

// ST01 chooses a sub-action only after the unchanged conversation opportunity.
// Saved histories below are completed source events, not UI choice injection.
function stagedSetup({mutual=false,mismatch=true}={}){
 const saved=setup();
 for(const id of ids.slice(0,2)){
  const target=id==='reader'?'companion':'reader',p=saved.people[id];
  p.relations[target]=.4;p.opinions[target]=.2;p.traits.sociability=.8;
  p.interactions={[target]:{completedCount:6,trust:.2,lastCompletedId:'old:5',interestGiven:mutual}};
  p.experiences=[{id:'real-reading',kind:'read',label:'读完的书',completedAt:1}];
 }
 saved.conversations=Array.from({length:6},(_,i)=>({id:'old:'+i,status:'completed',participants:ids.slice(0,2),experience:{id:'real-reading',kind:'read'},duration:9,results:ids.slice(0,2).map((id,j)=>({actorId:id,targetId:ids[1-j],feeling:mismatch&&i===2?'mismatched':'appreciated'}))}));
 return saved;
}
const offeredChoice=brain=>brain.choose('reader',[{id:'conversation',experienceId:'real-reading',duration:[9,13],targets:[{id:'companion',relationship:{target:'companion'}}]}]);
function chooseInteraction(kind,{saved=stagedSetup({mutual:true}),context=()=>({age:30,selfAge:31}),hooks}={}){
 for(let seed=1;seed<10000;seed++){
  const input=structuredClone(saved);input.people.reader.random=seed;
  const brain=createLifeDecisions({actorIds:ids,saved:input,interactionContext:context,meetingHooks:hooks}),choice=offeredChoice(brain);
  if(choice.interactionKind===kind)return {brain,choice,input};
 }
 throw Error('No eligible interaction: '+kind);
}
test('ST01 all eligible NPC sub-actions persist their kind and distinct outcomes without changing action RNG',()=>{
 for(const kind of ['gratitude','respectful-disagreement','shared-memory','apology','argument','confide','boundary','express-interest','respond-interest','flirt','public-invitation','quiet-company']){
  const {brain,choice,input}=chooseInteraction(kind),legacy=createLifeDecisions({actorIds:ids,saved:input});offeredChoice(legacy);
  assert.equal(brain.state('reader').random,legacy.state('reader').random,kind);
  const event=brain.invite('reader',choice);assert.equal(event.status,'accepted',kind);assert.equal(event.interactionKind,kind);assert.deepEqual(event.consent,{reader:true,companion:true});
  assert.equal(brain.finishConversation(event.id,{elapsed:choice.duration-1,arrived:ids}).ok,false);
  const result=brain.finishConversation(event.id,{elapsed:choice.duration,arrived:ids});assert(result.ok,kind);
  assert.equal(result.event.results[0].interactionKind,kind);assert.equal(brain.state('reader').interactions.companion.completedCount,7);
  const restored=createLifeDecisions({actorIds:ids,saved:brain.snapshot(),interactionContext:()=>({age:30,selfAge:31})}),before=restored.snapshot();
  assert(restored.finishConversation(event.id,{elapsed:100,arrived:ids}).replayed);assert.deepEqual(restored.snapshot(),before);
  assert.deepEqual(brain.state('uninformed').relations,{});
 }
});
test('NPC romantic/private possibilities require adults, independent desires and actual room; disagreement does not fabricate fault',()=>{
 const candidates=[{id:'conversation',base:1,targets:[{id:'companion'}]},{id:'read',base:1}];
 const full=createLifeDecisions({actorIds:ids,saved:stagedSetup({mutual:true}),interactionContext:()=>({age:30,selfAge:31})}),plain=createLifeDecisions({actorIds:ids,saved:stagedSetup({mutual:true})});
 assert.deepEqual(full.distribution('reader',candidates),plain.distribution('reader',candidates));
 for(const [saved,context,forbidden]of[
  [stagedSetup({mutual:true}),()=>({age:17,selfAge:30}),['flirt','express-interest','private-company']],
  [stagedSetup({mutual:false}),()=>({age:30,selfAge:31}),['flirt','public-invitation','private-company']],
  [stagedSetup({mutual:true,mismatch:false}),()=>({age:30,selfAge:31}),['argument','apology','private-company']]
 ]){
  for(let seed=1;seed<80;seed++){const input=structuredClone(saved);input.people.reader.random=seed;const brain=createLifeDecisions({actorIds:ids,saved:input,interactionContext:context});assert(!forbidden.includes(offeredChoice(brain).interactionKind));}
 }
});
test('managed private NPC occasion saves explicit two replies and loses completion on room withdrawal',()=>{
 let available=true,claims=0,releases=0;
 const meeting={id:'actual-room',managed:true,place:{id:'actual-room',fixtureId:'existing-bed'},private:true,available:true,authorized:ids.slice(0,2),places:[[0,0,0],[1,0,0]]};
 const context=()=>({age:30,selfAge:31,meeting:{...meeting,available}}),hooks={claim(){claims++;return {ok:available};},validate(){return {ok:available};},release(){releases++;}};
 const {brain,choice}=chooseInteraction('private-company',{context,hooks}),event=brain.invite('reader',choice);
 assert.equal(event.status,'accepted');assert.equal(event.fadeToBlack,true);assert.deepEqual(event.consent,{reader:true,companion:true});assert(brain.reserveMeeting(event.id));assert.equal(claims,1);
 assert(brain.conversationAllowed(event.id));available=false;assert(!brain.conversationAllowed(event.id));
 const before=brain.state('reader').relations.companion;assert.equal(brain.finishConversation(event.id,{elapsed:20,arrived:ids}).ok,false);
 brain.cancelConversation(event.id);brain.releaseMeeting(event.id);assert.equal(releases,1);assert.equal(brain.state('reader').relations.companion,before);
});
test('private refusal is one actual reply, never consent or a relationship reward',()=>{
 const saved=stagedSetup({mutual:true});saved.people.companion.random=12345;saved.people.companion.needs={hunger:1,fatigue:1,social:0};saved.people.companion.traits.sociability=0;saved.people.companion.traits.curiosity=0;saved.people.companion.traits.quiet=0;
 const meeting={id:'actual-room',managed:true,place:{id:'actual-room'},private:true,available:true,authorized:ids.slice(0,2),places:[[0,0,0],[1,0,0]]},context=()=>({age:30,selfAge:31,meeting}),hooks={claim:()=>({ok:true}),validate:()=>({ok:true}),release(){}};
 const {brain,choice}=chooseInteraction('private-company',{saved,context,hooks}),before=brain.state('companion').relations.reader,event=brain.invite('reader',choice);
 assert.equal(event.status,'declined');assert.equal(event.consent.companion,false);assert.equal(brain.state('companion').relations.reader,before);assert.equal(brain.finishConversation(event.id,{elapsed:50,arrived:ids}).ok,false);
});

test('actual workplace adapter moves the private pair, counts only together time, fades and restores both on interruption',async()=>{
 const {createWorkplaceConversations}=await import('../source/game/workplace-conversations.js');
 const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const claims=createFacilityQueue();let available=true,released=0;
 const meeting={id:'existing-private-room',managed:true,place:{id:'existing-private-room',fixtureId:'existing-bed'},private:true,available:true,authorized:ids.slice(0,2),places:[[4,0,0],[5,0,0]]};
 const context=()=>({age:30,selfAge:31,meeting:{...meeting,available}}),hooks={claim:()=>({ok:!!claims.reserve('existing-bed','reader')}),validate:()=>({ok:available&&!!claims.reservation('existing-bed','reader')}),release(){claims.release('existing-bed','reader');released++;}};
 const {brain,choice}=chooseInteraction('private-company',{context,hooks}),actors=ids.map(id=>({station:{id},root:{position:{x:0,y:0,z:0}}}));
 const flow=createWorkplaceConversations({places:[[1,0,0],[2,0,0]],placePrefix:'authored-public-',labels:{invited:'相约'},actors,brain,claims,available:()=>true,canReach:()=>true,clear(){},travel(n,p,dt){n.root.position.x=Math.min(p[0],n.root.position.x+dt);}});
 assert(flow.invite(actors[0],choice));const eventId=flow.snapshot().pair.id;
 assert.deepEqual(claims.state().filter(f=>f.reservations.length).map(f=>f.id),['existing-bed'],'only original physical fixture reserved');
 flow.update(2);assert.equal(flow.snapshot().pair.elapsed,0);assert(!actors[0].socialPrivateFade);
 flow.update(3);assert.equal(flow.snapshot().pair.elapsed,0);assert(actors[0].socialPrivateFade&&actors[1].socialPrivateFade);assert(!actors[2].socialPrivateFade);
 flow.update(2);assert.equal(flow.snapshot().pair.elapsed,2);assert.equal(brain.conversation(eventId).status,'accepted');
 available=false;flow.update(.1);assert.equal(flow.snapshot().pair,null);assert.equal(brain.conversation(eventId).status,'cancelled');assert.equal(released,1);assert(!actors[0].socialPrivateFade&&!actors[1].socialPrivateFade);assert.equal(brain.state('reader').relations.companion,.4);
});
test('private workplace reload cancels without result when original room cannot be reclaimed',async()=>{
 const {createWorkplaceConversations}=await import('../source/game/workplace-conversations.js');const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const meeting={id:'room',managed:true,place:{id:'room'},private:true,available:true,authorized:ids.slice(0,2),places:[[0,0,0],[1,0,0]]},context=()=>({age:30,selfAge:31,meeting}),hooks={claim:()=>({ok:true}),validate:()=>({ok:true}),release(){}};
 const {brain,choice}=chooseInteraction('private-company',{context,hooks}),actors=ids.map(id=>({station:{id},root:{position:{x:0,y:0,z:0}}})),options={places:[[0,0,0],[1,0,0]],placePrefix:'public-',labels:{},actors,claims:createFacilityQueue(),available:()=>true,canReach:()=>true,clear(){},travel(n,p){Object.assign(n.root.position,{x:p[0],y:p[1],z:p[2]});}};
 const flow=createWorkplaceConversations({...options,brain});flow.invite(actors[0],choice);flow.update(1);flow.update(2);const runtime=flow.snapshot(),saved=brain.snapshot();flow.dispose();
 const restored=createLifeDecisions({actorIds:ids,saved,interactionContext:context,meetingHooks:{...hooks,claim:()=>({ok:false})}}),next=createWorkplaceConversations({...options,brain:restored});assert(next.restore(runtime));assert.equal(next.snapshot().pair,null);assert.equal(restored.conversation(runtime.pair.id).status,'cancelled');assert(!actors[0].socialPrivateFade&&!actors[1].socialPrivateFade);assert.equal(restored.state('reader').relations.companion,.4);
});
