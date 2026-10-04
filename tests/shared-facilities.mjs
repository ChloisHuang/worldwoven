// Regression: a player's request must never clear another pool occupant, and a
// cancelled waiter must not acquire a later vacancy. No scene allocation here.
import assert from 'node:assert/strict';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const q=createFacilityQueue();q.define('pool',['seat-1','seat-2','seat-3']);
for(const [actor,seat]of [['npc-a','seat-1'],['npc-b','seat-2'],['player','seat-3']]){assert.equal(q.reserve('pool',actor).seatId,seat);assert(q.occupy('pool',actor));}
assert.equal(q.prioritize('pool'),null);assert.equal(q.state()[0].reservations.length,3);
assert.equal(q.reserve('pool','waiter-a'),null);assert.equal(q.reserve('pool','waiter-b'),null);
q.releaseActor('player');assert.equal(q.reserve('pool','waiter-b'),null,'FIFO cannot be bypassed');assert.equal(q.reserve('pool','waiter-a').seatId,'seat-3');
q.releaseActor('waiter-b');q.releaseActor('npc-a');assert.equal(q.reserve('pool','player').seatId,'seat-1');
assert.equal(q.reservation('pool','npc-b').seatId,'seat-2');assert.equal(q.state()[0].queue.length,0);
q.request('chair','npc');assert.equal(q.prioritize('chair'),'npc');assert.equal(q.request('chair','npc'),false);q.prioritize('chair',false);assert(q.request('chair','npc'),'Exclusive fixtures keep prior behavior');
q.dispose();assert.deepEqual(q.state(),[]);assert.equal(q.reserve('pool','player'),null);
console.log('PASS shared seats preserve bathers, bounded capacity, FIFO, cancellation and disposal');
