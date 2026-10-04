// Adapter regressions cover real-actor identity, walls/floors, bounded visitor
// saves, and physical receipt validation. Pure elapsed-time math has its own suite.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameHealthWorld} from '../source/game/game-health-world.js';

const actor=(id,x=0,y=0,z=0)=>({station:{id},root:{position:{x,y,z}},walking:false});
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

test('only close same-floor visible actors transmit, with current life needs reused',()=>{
 for(const [other,extra]of[[source,{visible:()=>false}],[actor('cn-host',0,3.8),{}],[actor('cn-host',9),{}]]){
  const w=createGameHealthWorld({worldSeed:42,saved:illWorld()});w.enter('china',[other]);w.update(20,context([other],extra));assert.equal(condition(w,'player').dose,0);
 }
 const close=createGameHealthWorld({worldSeed:42,saved:illWorld()});close.enter('china',[source]);close.update(20,context());assert(condition(close,'player').dose>0);
 const healthy=createGameHealthWorld({worldSeed:42});healthy.enter('china',[source]);healthy.update(1000,context());assert.equal(condition(healthy,'player').dose,0);assert.equal(healthy.text('player'),'');
 const seed=illWorld();Object.assign(seed.health.people.player.conditions.mistbell,{stage:'ill',remaining:240});seed.health.people[source.station.id].conditions.mistbell.stage='well';
 const fed=createGameHealthWorld({worldSeed:42,saved:seed}),tired=createGameHealthWorld({worldSeed:42,saved:seed});
 for(const w of[fed,tired])w.enter('china',[source]);fed.update(10,context());tired.update(10,context([source],{lifePeople:{'cn-host':{needs:{hunger:.8,fatigue:.8}}}}));assert(condition(tired,'cn-host').dose>condition(fed,'cn-host').dose);
});

test('stable NPC and player courses survive another region, globe pause and reentry',()=>{
 const w=createGameHealthWorld({worldSeed:42,saved:illWorld()});w.enter('china',[source]);w.update(20,context());const before=w.snapshot();w.leave();w.update(500,context());assert.deepEqual(w.snapshot(),before,'no hidden/offline simulation');
 w.enter('japan',[actor('jp-host')]);w.update(5,context([actor('jp-host')]));const after=w.snapshot();assert.equal(condition(w,'player').stage,'well');assert(after.health.people['cn-host'].conditions.mistbell.remaining<before.health.people['cn-host'].conditions.mistbell.remaining);
 const restored=createGameHealthWorld({worldSeed:42,saved:JSON.parse(JSON.stringify(after))});restored.enter('china',[source]);assert.deepEqual(restored.snapshot().health.people,w.snapshot().health.people);assert.equal(restored.state().actorCount,3);
});

test('journey exposure happens once per real arrival, existing saves do not gain retroactive risk',()=>{
 const w=createGameHealthWorld({worldSeed:42});w.enter('japan');let chosen;
 for(let number=1;number<=80;number++){const v=visit(number);w.arrive(v);if(w.state().journeys[v.id].source){chosen=v;break;}w.depart(v.id);}
 assert(chosen,'one deterministic journey source among real arrivals');const once=w.snapshot();w.arrive(chosen);assert.deepEqual(w.snapshot().health.people[chosen.id],once.health.people[chosen.id]);
 const restored=createGameHealthWorld({worldSeed:42,saved:once,retainedVisitorIds:[chosen.id]});restored.enter('japan');restored.arrive(chosen);assert.deepEqual(restored.snapshot().health.people[chosen.id],once.health.people[chosen.id]);
 const old=createGameHealthWorld({worldSeed:42,visitorFloor:chosen.number});old.enter('japan');old.arrive(chosen);assert.equal(old.state().journeys[chosen.id].source,null);assert.equal(condition(old,chosen.id).dose,0);
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
 assert.equal(w.status('player').careStatus,'none');assert(w.clinicReceipts({history:[receipt(1)]}));const received=w.snapshot();assert.equal(received.health.people.player.supportRemaining,180);assert.equal(w.status('player').careStatus,'support-active');
 w.update(20,context());const after=w.snapshot();assert.equal(w.clinicReceipts({history:[receipt(1)]}),false);assert.deepEqual(w.snapshot(),after);
 const r=createGameHealthWorld({worldSeed:42,saved:after});assert.equal(r.clinicReceipts({history:[receipt(1)]}),false);assert.equal(r.snapshot().health.people.player.supportRemaining,160);
 const old=createGameHealthWorld({worldSeed:42,clinicFloor:4});assert.equal(old.clinicReceipts({history:[receipt(4)]}),false);assert(old.clinicReceipts({history:[receipt(5)]}));
});
