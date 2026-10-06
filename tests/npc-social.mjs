// Regression for the reported remote employee pause and missing live-actor E
// target. Pure social rules; actual main input/render has a separate small scene.
import assert from 'node:assert/strict';
import {createNpcSocial,npcSocialReply} from '../source/game/npc-social.js';
import {isJapanEmployeeInteraction} from '../source/game/japan-visitors.js';
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
player.root.position={x:0,y:0,z:1};const neighbor=actor('nearby-neighbor',.3);people.push(neighbor);assert.equal(social.targets().length,2,'another nearby NPC does not hide the original chat');people.pop();social.begin(n);player.root.position.z=3;social.update(.1);assert.equal(social.state(),null,'Walking out of range ends conversation');assert.equal(n.route,route,'Social layer never replaces a routine route');
assert.match(npcSocialReply({...n,station:{id:'cn-calligraphy',npcAction:'calligraphy'}}),/作品/);social.dispose();console.log('PASS actual-actor targeting, brief attention, rear limits, floor/LOS/range gates, dynamic visitor lifecycle, busy continuation and routine timer restore');

{
 let interactions=0;player.root.position={x:0,y:0,z:1};const make=()=>createNpcSocial({actors:()=>[n],player:()=>player,beginInteraction:()=>({source:'conversation',id:'same-chat'}),onInteraction:()=>interactions++});const f=make();f.begin(n);f.update(.7);const snapshot=JSON.parse(JSON.stringify(f.snapshot())),g=make();assert(g.restore(snapshot));assert.equal(interactions,1);assert.equal(g.snapshot().conversation.duration,.7);assert.equal(g.snapshot().conversation.interaction.id,'same-chat');g.update(.2);assert(Math.abs(g.snapshot().conversation.duration-.9)<1e-9);assert.equal(interactions,2);g.dispose();console.log('PASS conversation resumes exact interaction identity and duration without emitting an arrival effect');
}

// Explicit meeting approaches may briefly pause an available routine from afar;
// menu reads, hard duties, cancellation and region teardown cannot pin an NPC.
{
 const n=actor('cn-official-rites',17.35,3.915,32.15),p={root:{position:{x:20.55,y:.215,z:32.25}}};let busy=false;const ended=[];
 const s=createNpcSocial({actors:()=>[n],player:()=>p,status:()=>({busy}),onMeetingEnded:(m,why)=>ended.push(why)}),route=n.route;
 assert.equal(s.meetingState(),null);assert.equal(s.conversationActorId(),null);
 assert(s.reserveMeeting(n,{owner:'review',duration:90}));assert.equal(s.conversationActorId(),n.station.id);assert.equal(s.active(),false);assert.equal(s.isPaused(n),true);assert.equal(s.canInteract(n),false);assert.equal(n.route,route);
 assert.equal(s.reserveMeeting(n,{owner:'other'}),false);assert.equal(s.releaseMeeting('other'),false);s.update(10);assert.equal(s.meetingState().remaining,80);
 busy=true;s.update(.1);assert.equal(s.meetingState(),null);assert.equal(s.conversationActorId(),null);assert.deepEqual(ended,['duty']);assert.equal(s.reserveMeeting(n,{owner:'review'}),false);
 busy=false;assert(s.reserveMeeting(n,{owner:'review',duration:5}));s.update(5);assert.equal(s.meetingState(),null);assert.equal(ended.at(-1),'expired');
 assert(s.reserveMeeting(n,{owner:'review'}));s.end();assert.equal(s.meetingState(),null);assert(s.reserveMeeting(n,{owner:'review'}));s.dispose();assert.equal(s.meetingState(),null);assert.equal(n.route,route);
 console.log('PASS explicit bounded meeting pause, exclusive owner, duty preemption, expiry, cancel and disposal; no actor movement or fabricated conversation');
}

// The same physical radius must reach the original Japan route owner. A click
// caught between frames cannot open a paused greeting while its owner walks on.
{const a=actor('jp-welcome'),p={x:2.3,y:0,z:0};assert(isJapanEmployeeInteraction(a,{position:p,conversationActorId:a.station.id}));assert(!isJapanEmployeeInteraction(a,{position:p,performing:a.station.id}));assert(!isJapanEmployeeInteraction(a,{position:{...p,x:2.5},conversationActorId:a.station.id}));assert(!isJapanEmployeeInteraction(a,{position:{...p,y:3.8},conversationActorId:a.station.id}));console.log('PASS Japan owner uses the same physical conversation radius while station activities remain local');}

// A moving actor may be borrowed only when its own routine explicitly permits it.
{
 const n={station:{id:'rites',npcName:'礼仪官'},root:{position:{x:5,y:0,z:0},rotation:{y:0}},walking:true,route:[{x:8,y:0,z:0}],breakAt:10};
 let allowed=false,busy=false;const route=n.route,events=[];const social=createNpcSocial({actors:()=>[n],player:()=>({root:{position:{x:0,y:0,z:0}}}),status:()=>({busy,canPause:allowed}),onMeetingEnded:(_,reason)=>events.push(reason)});
 assert.equal(social.reserveMeeting(n,{owner:'review'}),false);allowed=true;assert(social.reserveMeeting(n,{owner:'review'}));assert.equal(n.walking,false);assert.equal(n.route,route);assert(social.isPaused(n));social.update(3);social.releaseMeeting('review');assert.equal(n.breakAt,13);assert.equal(n.route,route);
 n.walking=true;busy=true;assert.equal(social.reserveMeeting(n,{owner:'review'}),false);busy=false;assert(social.reserveMeeting(n,{owner:'review'}));social.restore({version:1,time:3,attention:[]});assert.equal(social.meetingState(),null);
 console.log('PASS routine-approved walking meeting preserves original route, rejects busy duties and clears transient hold on restore');
}
