import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyNpcManualReset,findNpcResetPosition} from '../source/game/npc-manual-reset.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
const actor=id=>({station:{id},root:{position:{x:1,y:0,z:1,toArray(){return [this.x,this.y,this.z];},set(x,y,z){Object.assign(this,{x,y,z});}}},route:[{x:3,y:0,z:2}],walking:true,returning:true,breakAt:99,serviceMount:{id:'bed'},coins:23,health:{toilet:1}});
test('actor-only reset commits position, claims, and interrupted intention without relief or reward',()=>{
 const n=actor('n'),other=actor('other'),facilities=createFacilityQueue();facilities.reserve('bed','n');facilities.occupy('bed','n');facilities.reserve('other-chair','other');
 const brain=createLifeDecisions({actorIds:['n','other'],onChange:()=>true});brain.choose('n',[{id:'rest',relief:{fatigue:-1},duration:[10,10]}]);const before=brain.snapshot(),otherBefore=JSON.stringify(other);
 const result=applyNpcManualReset({actor:n,position:[6,0,7],preparations:[brain.prepareInterruption('n'),facilities.prepareReleaseActor('n')],now:8,persist:()=>true});
 assert(result.ok);assert.deepEqual(n.root.position.toArray(),[6,0,7]);assert.equal(n.coins,23);assert.equal(n.health.toilet,1);assert.equal(n.serviceMount,null);assert.equal(n.route.length,0);assert.equal(brain.state('n').current,null);assert.deepEqual(brain.state('n').needs,before.people.n.needs);assert.deepEqual(brain.state('other'),before.people.other);assert.equal(JSON.stringify(other),otherBefore);assert.equal(facilities.reservation('bed','n'),null);assert(facilities.reservation('other-chair','other'));
});
test('rejected save restores the exact selected pose, route, intent, occupied slot and queue order',()=>{
 const n=actor('n'),facilities=createFacilityQueue();facilities.reserve('bed','n');facilities.occupy('bed','n');facilities.reserve('bed','waiting');const beforeClaims=facilities.state();const brain=createLifeDecisions({actorIds:['n'],onChange:()=>true});brain.choose('n',[{id:'rest',duration:[10,10]}]);const beforeBrain=brain.snapshot(),beforeActor=JSON.stringify(n),route=n.route;
 const result=applyNpcManualReset({actor:n,position:[6,0,7],preparations:[brain.prepareInterruption('n'),facilities.prepareReleaseActor('n')],now:8,persist:()=>false});
 assert.equal(result.code,'save-failed');assert.equal(JSON.stringify(n),beforeActor);assert.equal(n.route,route);assert.deepEqual(facilities.state(),beforeClaims);assert.deepEqual(brain.snapshot(),beforeBrain);
});
test('public landing checks actual supported floor, static/live walls, bodies and walkable exits',()=>{
 const n=actor('n'),navigation={surfaces:[{minX:-5,maxX:5,minZ:-5,maxZ:5,y:3.915}],bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},legacyGround:false,radius:.25,bodyHeight:1.95,maxStep:.4};
 const player=actor('player');player.root.position.set(0,3.915,0);
 const pos=findNpcResetPosition({actor:n,spawn:[0,3.915,0],navigation,actors:[n],player});assert(pos);assert.equal(pos[1],3.915);assert(Math.hypot(pos[0],pos[2])>.7);
 assert.equal(findNpcResetPosition({actor:n,spawn:[0,0,0],navigation}),null);
 assert.equal(findNpcResetPosition({actor:n,spawn:[0,3.915,0],navigation,doors:[{minX:-5,maxX:5,minZ:-5,maxZ:5,minY:3.9,maxY:6}]}),null);
});
