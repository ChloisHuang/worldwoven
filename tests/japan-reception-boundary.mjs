// Reproduce the real main stop that registered a visit but could not receive a token.
import assert from 'node:assert/strict';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P,JAPAN_RECEPTION_RADIUS,japanReceptionReady} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const original=[-3.970755216456002,0,5.027798132366138];
const outside=[P.playerReception[0]+JAPAN_RECEPTION_RADIUS+.001,0,P.playerReception[2]];
for(const position of [original,outside,[original[0],.401,original[2]]]){
 const board=createJapanServiceOrders({worldSeed:42}),facilities=createFacilityQueue();
 const player={root:{position:{x:position[0],y:position[1],z:position[2]},userData:{appearance:{bodyPreset:'masculine-lean'}}}};
 const bench={id:'rest',kind:'seat',center:[-7.7,3.8,7.55],anchor:[-7.7,3.8,7.39]};
 const service=createJapanPlayerService({board,furniture:{items:[bench],facilities,releaseActor:id=>facilities.releaseActor(id)},getPlayer:()=>player});
 const allowed=position===original;
 assert.equal(japanReceptionReady(player.root.position),allowed,'Actual registrar readiness uses the same boundary');
 assert.equal(service.register('cloud-leaf').ok,allowed,'Player registration uses the real legal counter area');
 if(allowed){
  const visit=service.state().visit;assert.equal(visit.stage,'check-in');assert(service.register('cloud-leaf').ok);assert.equal(service.state().visit.id,visit.id);
  const job=board.jobs().find(j=>j.visitId===visit.id&&j.kind==='register');assert(board.claim(job.id,'jp-welcome'));
  assert.equal(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:outside}),false,'Just outside cannot complete handover');
  assert(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:position}));
  assert.equal(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:position}),false,'One registration creates only one token');
  assert.equal(service.state().visit.stage,'changing');assert.equal(board.state().items.filter(i=>i.visitId===visit.id&&i.kind==='token').length,1);
 }else assert.equal(service.state().visit,null);
 board.dispose();facilities.dispose();
}
console.log('PASS: original 0.3232m main arrival, same counter readiness, outside/floor rejection, single numbered token');
