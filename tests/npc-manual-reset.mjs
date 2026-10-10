import assert from 'node:assert/strict';
import {test} from 'node:test';
import {applyNpcManualReset,findNpcResetPosition} from '../source/game/npc-manual-reset.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
import {createLifeDecisions} from '../source/game/npc-life-decisions.js';
import {createNpcSocial} from '../source/game/npc-social.js';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
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

// Exercise the exact production admission gate without constructing a scene.
// orders() legitimately becomes null when a pursuit's assigned guard cannot
// act; the subject's persisted status must still prohibit relocation.
test('production reset refuses pursuit without an active guard order and uses the selected life identity',()=>{
 const source=readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
 const gate=source.slice(source.indexOf('function resetSelectedNPC(n){'),source.indexOf('\nfunction pauseForReadOnlyPanel'));
 assert(gate.startsWith('function resetSelectedNPC(n){'));
 for(const status of ['pursuit','escort','custody','releasing','invalid-save']){
  const n={actorId:'justice-successor',lifeId:'life-2',station:{id:'cn-official-justice'}},keys=[];
  const context={n,mode:'lot',npcs:[n],player:{},npcSocial:{state:()=>({id:n.actorId,stage:'choosing'}),canInteract:()=>true},
   crimeRuntime:{owns:()=>false,activeAction:()=>null,model:{orders:()=>null,status:key=>{keys.push(key);return {ok:status!=='invalid-save',status,detained:false};}}}};
  runInNewContext(gate+'; result=resetSelectedNPC(n);',context);
  assert.equal(context.result.ok,false,status+' cannot relocate without an active order');
  assert.match(context.result.message,/查捕|押送|留置|案情记录/);
  assert.deepEqual(keys,['justice-successor@life-2'],'never consult the retired station identity');
 }
});

test('paused choosing dialogue rolls back with a rejected save and cannot delay movement after a cold reset load',()=>{
 const n=actor('n'),player=actor('player');n.serviceMount=null;player.serviceMount=null;
 n.root.rotation={y:0};player.root.rotation={y:0};player.root.position.set(2,0,1);
 const ledger={lastCompleted:()=>null,event:()=>null};
 const social=createNpcSocial({actors:()=>[n],player:()=>player,ledger});
 assert.equal(social.begin(n).stage,'choosing');social.update(30);
 const before=social.snapshot(),beforeActor=JSON.stringify(n);
 const failed=applyNpcManualReset({actor:n,position:[6,0,7],preparations:[social.prepareManualReset(n)],now:200,persist:()=>false});
 assert.equal(failed.ok,false);assert.deepEqual(social.snapshot(),before);assert(social.isPaused(n));assert.equal(JSON.stringify(n),beforeActor);
 let checkpoint;
 const committed=applyNpcManualReset({actor:n,position:[6,0,7],preparations:[social.prepareManualReset(n)],now:200,persist:()=>{checkpoint={position:n.root.position.toArray(),breakAt:n.breakAt,social:social.snapshot()};return true;}});
 assert(committed.ok);assert.equal(checkpoint.social.conversation,null);assert.equal(social.isPaused(n),false);
 const cold=actor('n');cold.serviceMount=null;cold.root.rotation={y:0};cold.root.position.set(...checkpoint.position);cold.breakAt=checkpoint.breakAt;
 const restored=createNpcSocial({actors:()=>[cold],player:()=>player,ledger});assert(restored.restore(checkpoint.social));
 assert.equal(restored.state(),null);assert.equal(cold.breakAt,200,'the prior 30-second reading pause is not revived');
 social.dispose();restored.dispose();
});
