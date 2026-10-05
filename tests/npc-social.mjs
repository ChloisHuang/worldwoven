// Regression for the reported remote employee pause and missing live-actor E
// target. Pure social rules; actual main input/render has a separate small scene.
import assert from 'node:assert/strict';
import {createNpcSocial,npcSocialReply} from '../source/game/npc-social.js';
const actor=(id,x=0,y=0,z=0)=>({station:{id,npcName:'Koharu',name:'汤馆前台',npcAction:'tidy'},root:{position:{x,y,z},rotation:{y:0},visible:true},route:[{x:4,y:0,z:0}],breakAt:25,phase:.7});
const n=actor('jp-welcome'),visitor=actor('jp-visitor-17-1',5),player={root:{position:{x:1,y:0,z:1}}};let people=[n],wall=false,busy=false;
const social=createNpcSocial({actors:()=>people,player:()=>player,visible:()=>!wall,status:()=>({busy,job:'给客人递手巾'})});
social.update(.1);assert(social.look(n)?.yaw>0);assert.equal(social.target().actor,n);social.update(2);assert.equal(social.look(n),null,'A passing look ends even if player stays near');
player.root.position={x:0,y:3.8,z:0};assert(!social.canInteract(n));assert.equal(social.begin(n),null,'No cross-floor conversation');
player.root.position={x:1,y:0,z:1};wall=true;assert.equal(social.begin(n),null,'No conversation through a wall or closed door');wall=false;
const route=n.route,reply=social.begin(n);assert(reply.paused);assert.match(reply.reply,/接待/);social.update(2);assert.equal(n.route,route);assert.equal(social.conversationActorId(),'jp-welcome');social.end();assert.equal(n.breakAt,27,'Routine break timer resumes after time spent talking');assert.equal(social.conversationActorId(),null);
social.begin(n);social.end();player.root.position={x:0,y:0,z:-1};social.update(.1);assert.equal(social.look(n),null,'Residual greeting cannot track a passer behind the actor');social.update(10);assert.equal(social.look(n),null,'No omniscient look directly behind');social.begin(n);assert(Math.abs(social.look(n).yaw)<=.68,'Explicit rear greeting never twists the neck');social.end();
busy=true;const acknowledged=social.begin(n);assert(!acknowledged.paused);assert.match(acknowledged.reply,/递手巾/);assert.equal(social.conversationActorId(),null,'Busy handoff keeps running');social.update(2);assert.equal(social.look(n),null);social.end();busy=false;
const routineBefore=n.breakAt;social.begin(n);social.update(2);busy=true;social.update(.1);
assert.equal(social.conversationActorId(),null,'a newly busy duty withdraws an earlier idle conversation pause');assert.equal(social.active(),false);assert.equal(n.route,route,'duty transition keeps the same real work route');assert(Math.abs(n.breakAt-routineBefore-2.1)<1e-8,'only actual paused time is restored once');
social.update(1);assert(Math.abs(n.breakAt-routineBefore-2.1)<1e-8);assert(!social.begin(n).paused,'subsequent greeting is the existing brief busy response');social.end();busy=false;
people.push(visitor);player.root.position={x:5,y:0,z:1};social.update(.1);assert.equal(social.target().id,'jp-visitor-17-1');assert.match(social.begin(visitor).reply,/来汤馆/);people=people.filter(n=>n!==visitor);social.update(.1);assert.equal(social.state(),null,'Removed transient actor cannot remain targeted');
player.root.position={x:0,y:0,z:1};social.begin(n);player.root.position.z=3;social.update(.1);assert.equal(social.state(),null,'Walking out of range ends conversation');assert.equal(n.route,route,'Social layer never replaces a routine route');
assert.match(npcSocialReply({...n,station:{id:'cn-calligraphy',npcAction:'calligraphy'}}),/作品/);social.dispose();console.log('PASS actual-actor targeting, brief attention, rear limits, floor/LOS/range gates, dynamic visitor lifecycle, busy continuation and routine timer restore');
