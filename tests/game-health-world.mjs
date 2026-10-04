// Adapter regressions cover actual interaction identity, bounded visitor
// saves, and physical receipt validation. Pure elapsed-time math has its own suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcSocial} from '../source/game/npc-social.js';
import {createGameHealthWorld} from '../source/game/game-health-world.js';

const actor=(id,x=0,y=0,z=0)=>({station:{id},root:{position:{x,y,z},rotation:{y:0},visible:true},walking:false});
const player=actor('player',.4),source=actor('cn-host');
const context=(actors=[source],extra={})=>({player,actors,visible:()=>true,...extra});
const condition=(world,id)=>world.snapshot().health.people[id].conditions.mistbell;
const visit=number=>({id:`jp-visitor-42-${number}`,number,stage:'arriving'});
function illWorld(){
 const world=createGameHealthWorld({worldSeed:42});world.enter('china',[source]);
 const saved=world.snapshot();Object.assign(saved.health.people[source.station.id].conditions.mistbell,{stage:'ill',remaining:240});
 return saved;
}
const receipt=number=>({event:'delivered',number,orderId:`cn-clinic-order-${number}`,cardId:`cn-clinic-card-${number}`,packetId:`cn-clinic-packet-${number}`,playerPosition:[0,3.8,0]});

test('zero interactions means zero health geometry/visibility calls and zero transmission',()=>{
 const w=createGameHealthWorld({worldSeed:42,saved:illWorld()}),bystander=actor('bystander');w.enter('china',[source,bystander]);
 let visibilityCalls=0,positionReads=0;const blind=id=>({station:{id},root:{get position(){positionReads++;throw Error('health must not read positions');}}});
 for(let i=0;i<100;i++)w.update(.1,{player:blind('player'),actors:[blind('cn-host'),blind('bystander')],visible:()=>{visibilityCalls++;return true;}});
 assert.equal(visibilityCalls,0);assert.equal(positionReads,0);assert.equal(condition(w,'player').dose,0);assert.equal(condition(w,'bystander').dose,0);
 assert(condition(w,'cn-host').remaining<240,'disease continues with no interactions');
});

test('only named participants in a real shared social session transmit, in every country',()=>{
 for(const region of['china','japan','france','egypt']){
  const w=createGameHealthWorld({worldSeed:42,saved:illWorld()}),bystander=actor('bystander'),actors=[source,bystander];w.enter(region,actors);let calls=0;
  const social=createNpcSocial({actors:()=>actors,player:()=>player,beginInteraction:ids=>w.beginInteraction('npc-social',ids),onInteraction:event=>{calls++;w.interaction(event);}});
  social.update(10);w.update(10,context(actors));assert.equal(calls,0,'passing attention is not a contact');
  assert(social.begin(source));social.update(10);w.update(10,context(actors));assert.equal(calls,1);assert(condition(w,'player').dose>0);assert.equal(condition(w,'bystander').dose,0);
  const event=w.snapshot().health.interactionProgress['npc-social'];assert.deepEqual(event.participants,['cn-host','player']);assert.equal(event.duration,10);
  social.end();social.update(10);w.update(10,context(actors));assert.equal(calls,1,'ending conversation stops contacts');
  const restored=createGameHealthWorld({worldSeed:42,saved:w.snapshot()});restored.enter(region,actors);assert(restored.beginInteraction('npc-social',['player','cn-host']).number>event.number,'reload never reuses a session ID');
 }
});

test('queued duplicate/reloaded interaction progress is idempotent and life needs still affect risk',()=>{
 const run=(lifePeople={})=>{const w=createGameHealthWorld({worldSeed:42,saved:illWorld()});w.enter('china',[source]);const event={...w.beginInteraction('npc-social',['player','cn-host']),duration:10};w.interaction(event);w.interaction(event);w.update(10,context([source],{lifePeople}));return {w,event};};
 const {w,event}=run(),saved=w.snapshot(),replay=createGameHealthWorld({worldSeed:42,saved}),clock=createGameHealthWorld({worldSeed:42,saved});
 for(const world of[replay,clock])world.enter('china',[source]);replay.interaction(event);replay.update(10,context());clock.update(10,context());assert.deepEqual(replay.snapshot(),clock.snapshot());
 const seed=illWorld();Object.assign(seed.health.people.player.conditions.mistbell,{stage:'ill',remaining:240});seed.health.people[source.station.id].conditions.mistbell.stage='well';
 const fed=createGameHealthWorld({worldSeed:42,saved:seed}),tired=createGameHealthWorld({worldSeed:42,saved:seed});
 for(const world of[fed,tired]){world.enter('china',[source]);world.interaction({...world.beginInteraction('npc-social',['player','cn-host']),duration:10});}
 fed.update(10,context());tired.update(10,context([source],{lifePeople:{'cn-host':{needs:{hunger:.8,fatigue:.8}}}}));assert(condition(tired,'cn-host').dose>condition(fed,'cn-host').dose);
});

test('stable NPC and player courses survive another region, globe pause and reentry',()=>{
 const w=createGameHealthWorld({worldSeed:42,saved:illWorld()});w.enter('china',[source]);w.update(20,context());const before=w.snapshot();w.leave();w.update(500,context());assert.deepEqual(w.snapshot(),before,'no hidden/offline simulation');
 w.enter('japan',[actor('jp-host')]);w.update(5,context([actor('jp-host')]));const after=w.snapshot();assert.equal(condition(w,'player').stage,'well');assert(after.health.people['cn-host'].conditions.mistbell.remaining<before.health.people['cn-host'].conditions.mistbell.remaining);
 const restored=createGameHealthWorld({worldSeed:42,saved:JSON.parse(JSON.stringify(after))});restored.enter('china',[source]);assert.deepEqual(restored.snapshot().health.people,w.snapshot().health.people);assert.equal(restored.state().actorCount,3);
});

test('new arrivals do not invent offscreen contacts; existing journey and disease saves survive',()=>{
 const w=createGameHealthWorld({worldSeed:42});w.enter('japan');
 for(let number=1;number<=40;number++){const v=visit(number);w.arrive(v);assert.equal(w.state().journeys[v.id].source,null);assert.equal(condition(w,v.id).dose,0);w.depart(v.id);}
 assert.deepEqual(w.snapshot().health.interactionProgress,{});
 const chosen=visit(40),saved=w.snapshot();saved.journeys[chosen.id].source='mistbell-shelter';Object.assign(saved.health.people[chosen.id].conditions.mistbell,{stage:'ill',remaining:123});
 const restored=createGameHealthWorld({worldSeed:42,saved,retainedVisitorIds:[chosen.id]});restored.enter('japan');restored.arrive(chosen);
 assert.equal(restored.state().journeys[chosen.id].source,'mistbell-shelter');assert.deepEqual(restored.snapshot().health.people[chosen.id],saved.health.people[chosen.id]);
});

test('visitor save stays bounded without losing an old still-present visitor or permanent actors',()=>{
 const w=createGameHealthWorld({worldSeed:42});w.enter('japan',[actor('jp-host')]);const longStay=visit(1);w.arrive(longStay);const stable=w.snapshot().health.people[longStay.id];
 for(let n=2;n<45;n++){const v=visit(n);w.arrive(v);w.depart(v.id);}
 assert.equal(w.state().visitorCount,8);assert.equal(Object.keys(w.state().journeys).length,8);assert(w.snapshot().health.people['jp-host']);assert.deepEqual(w.snapshot().health.people[longStay.id],stable);
 w.leave();w.depart(longStay.id);const saved=w.snapshot();const reloaded=createGameHealthWorld({worldSeed:42,saved,retainedVisitorIds:[longStay.id]});reloaded.enter('japan',[actor('jp-host')]);reloaded.arrive(longStay);assert.deepEqual(reloaded.snapshot().health.people[longStay.id],stable);assert.equal(reloaded.state().visitorCount,8);
});

test('only same-number physical delivery supports recovery and receipts cannot replay',()=>{
 const w=createGameHealthWorld({worldSeed:42,saved:illWorld()});w.enter('china',[source]);
 for(const wrong of[{...receipt(1),event:'ready'},{...receipt(1),packetId:'cn-clinic-packet-2'},{...receipt(1),playerPosition:null}])assert.equal(w.clinicReceipts({history:[wrong]}),false);
 assert.deepEqual(w.snapshot().health.interactionProgress,{},'old care receipts never create contacts');assert.equal(w.status('player').careStatus,'none');assert(w.clinicReceipts({history:[receipt(1)]}));const received=w.snapshot();assert.equal(received.health.people.player.supportRemaining,180);assert.equal(w.status('player').careStatus,'support-active');
 w.update(20,context());const after=w.snapshot();assert.equal(w.clinicReceipts({history:[receipt(1)]}),false);assert.deepEqual(w.snapshot(),after);
 const r=createGameHealthWorld({worldSeed:42,saved:after});assert.equal(r.clinicReceipts({history:[receipt(1)]}),false);assert.equal(r.snapshot().health.people.player.supportRemaining,160);
 const old=createGameHealthWorld({worldSeed:42,clinicFloor:4});assert.equal(old.clinicReceipts({history:[receipt(4)]}),false);assert(old.clinicReceipts({history:[receipt(5)]}));
});
