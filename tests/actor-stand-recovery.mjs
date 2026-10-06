import test from 'node:test';
import assert from 'node:assert/strict';
import {beginActorNavigationStep,findActorStandPoint} from '../source/game/actor-navigation.js';
const actor=id=>({station:{id},root:{position:{x:0,y:0,z:0}}});
const seat={id:'original-chair'},landing={x:0,y:0,z:1.07};
test('only five simulated seconds of continuous dynamic-only get-up blockage permit the existing landing, equally for ordinary NPC and player',()=>{
 for(const id of ['ordinary-npc','player']){const n=actor(id),probe=({ignoreDynamicBodies})=>ignoreDynamicBodies?landing:null;for(let i=0;i<49;i++){beginActorNavigationStep(.1);for(let j=0;j<5;j++)assert.equal(findActorStandPoint(n,seat,probe),null,'repeated queries in one frame cannot accelerate time');}beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,probe),landing);assert.deepEqual(n.root.position,{x:0,y:0,z:0},'helper never moves or teleports an actor');}
});
test('static walls, table, door leaves or absent support never become a permitted landing',()=>{
 const n=actor('npc');for(let i=0;i<80;i++){beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,()=>null),null);}for(let i=0;i<49;i++){beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,({ignoreDynamicBodies})=>ignoreDynamicBodies?landing:null),null,'static blockage did not accumulate body escape');}
});
test('no get-up intent, changing seats, paused time and cleared bodies reset recovery; ordinary standing cannot accumulate',()=>{
 const n=actor('npc'),blocked=({ignoreDynamicBodies})=>ignoreDynamicBodies?landing:null;
 for(let i=0;i<100;i++)beginActorNavigationStep(.1);
 beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,blocked),null);
 for(let i=0;i<40;i++){beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,blocked),null);}
 beginActorNavigationStep(.1); // A whole step without any intent.
 beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,blocked),null);
 for(let i=0;i<40;i++){beginActorNavigationStep(.1);findActorStandPoint(n,seat,blocked);}
 beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,{id:'other-chair'},blocked),null);
 beginActorNavigationStep(0);assert.equal(findActorStandPoint(n,seat,blocked),null);
 beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,()=>landing),landing);
 for(let i=0;i<49;i++){beginActorNavigationStep(.1);assert.equal(findActorStandPoint(n,seat,blocked),null,'a cleared landing restored ordinary collision');}
});
