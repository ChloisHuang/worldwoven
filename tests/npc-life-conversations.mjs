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
