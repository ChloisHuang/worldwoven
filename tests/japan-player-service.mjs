// The player shares employee jobs and physical capacity with ordinary guests.
// Leaving a work point or a region must not manufacture progress or duplicate ID.
import assert from 'node:assert/strict';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const bench={id:'japan-furniture-seat-7',kind:'seat',center:[-7.7,3.8,7.55],position:[-7.7,3.8,6.61],anchor:[-7.7,3.8,7.39],seatY:4.365};
const look={bodyPreset:'masculine-lean',wardrobePreset:'haori-trouser'},facilities=createFacilityQueue(),furniture={items:[bench],facilities,releaseActor:id=>facilities.releaseActor(id)};
const player={root:{position:{x:0,y:0,z:0},userData:{appearance:look}}};let mounted=null,saved;
const move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
const board=createJapanServiceOrders({worldSeed:29,saveState:s=>saved=s});
for(let i=0;i<2;i++)assert(board.spawn({name:'visitor',appearance:look,side:'men',restPoint:bench.anchor,diningPoint:bench.anchor}));
const service=createJapanPlayerService({board,furniture,getPlayer:()=>player,getMounted:()=>mounted});
assert.equal(service.register('cloud-leaf').ok,false,'No remote registration');move(P.playerReception);assert(service.register('lantern-petal').ok);
const v=service.state().visit;assert.equal(v.blendId,'lantern-petal');assert.equal(board.state().visits.length,3,'Player does not consume the two NPC arrival slots');
assert(service.register('cloud-leaf').ok);assert.equal(service.state().visit.id,v.id,'Repeated interaction does not clone the player order');
let job=board.jobs().find(j=>j.visitId===v.id&&j.kind==='register');assert(board.claim(job.id,'jp-welcome'));assert(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:P.playerReception}));
move(P.menChanging);assert(service.change().ok);service.update(.1);move(P.playerReception);service.update(.1);assert.equal(service.state().visit.stage,'changing','Walking away cannot finish changing');assert.equal(service.state().activity,null);
service.suspend();assert.equal(board.jobs().some(j=>j.visitId===v.id),false,'Absent player cannot hold an employee job');
const next=board.state().nextVisit,restored=createJapanServiceOrders({saved,worldSeed:29}),resumed=createJapanPlayerService({board:restored,furniture,getPlayer:()=>player,getMounted:()=>mounted});
assert.equal(resumed.state().visit.id,v.id);assert.equal(restored.state().nextVisit,next);assert.equal(restored.state().visits.filter(x=>x.customerType==='player').length,1);
assert.equal(resumed.bathAccess({id:'japan-furniture-bath-1'}).allowed,false,'A token alone cannot skip preparation, delivery and washing');
resumed.cancel();assert.equal(restored.jobs().some(j=>j.visitId===v.id),false);assert.equal(restored.state().visits.filter(x=>x.customerType==='npc').length,2,'Cancellation preserves other visitors');
board.dispose();restored.dispose();facilities.dispose();
console.log('PASS: shared player order, physical interaction, interruption, region suspension and durable identity');
