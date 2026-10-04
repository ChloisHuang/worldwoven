const assert=require('node:assert/strict');
(async()=>{const {createFacilityQueue}=await import('../source/game/npc-facilities.js'),q=createFacilityQueue();
assert(q.request('bath','guest'));assert(!q.request('bath','cleaner'));assert(!q.request('bath','second-guest'));
q.release('bath','guest');assert(!q.request('bath','second-guest'),'later arrival cannot jump cleaner');assert(q.request('bath','cleaner'));
assert.equal(q.prioritize('bath'),'cleaner');assert(!q.request('bath','cleaner'),'player owns priority even when NPC was using it');
q.releaseActor('second-guest');q.prioritize('bath',false);assert(q.request('bath','cleaner'));
q.releaseActor('cleaner');assert(q.request('bath','guest'));q.dispose();assert.deepEqual(q.state(),[]);assert(!q.request('bath','guest'));
const reload=createFacilityQueue();assert(reload.request('bath','guest'),'region re-entry inherits no stale owner');console.log('PASS NPC facility FIFO, player preemption, cancellation and fresh re-entry');
})().catch(e=>{console.error(e);process.exitCode=1;});
