// The existing guard routine owns all arrows and patrols. The plot appointment
// may stop only an already safe original handoff and never survives cold load.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createChinaArcheryRoutine}=await import('../source/game/china-archery-routine.js');
const {holdSocialActors,releaseSocialActors,resetSocialHolds}=await import('../source/game/npc-social-ownership.js');
const owner='palace-usurpation:0:1',ids=['cn-archery','cn-range-warden'];
function fixture(){
 resetSocialHolds();const flags={urgent:false,blocked:false},group=new T.Group();
 const actor=(id,i)=>{const root=new T.Group(),hands=[new T.Group(),new T.Group()];root.add(...hands);root.userData={hands,jinyiCostume:{dispose(){}}};
  root.position.set(-17.65,.13,18.45+i*1.35);group.add(root);return {bodyId:id+':body',station:{id},root,route:[],phase:0,locomotion:{walkSpeed:2},animate(){}};};
 const guards=ids.map(actor),player=actor('player',2);player.root.position.set(-16.35,.13,19.12);
 const routine=createChinaArcheryRoutine({npcs:guards,lot:{group,archery:{}},planPath:(_from,to)=>flags.blocked?[]:[new T.Vector3(to.x,to.y,to.z)],
  moveActor(n,dx,dz){n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:()=>({}),getPlayer:()=>player,
  sharedNeeds:{status:()=>({seekMeal:flags.urgent,seekToilet:false})}});
 const tick=()=>routine.update(.1,.1,{position:player.root.position});
 return {guards,player,flags,routine,tick,dispose(){routine.dispose();resetSocialHolds();}};
}
test('only the same two original guards wait at their actual safe handoff; cancel restores the same phase',()=>{
 const f=fixture(),r=f.routine,prior=r.snapshot();
 assert.equal(r.requestPlotMeeting(owner,[ids[0],'cn-impostor']),false);assert.equal(r.requestPlotMeeting(owner,[ids[0],ids[0]]),false);
 assert(r.requestPlotMeeting(owner,ids));assert.equal(r.plotMeetingState(owner).ready,false);f.tick();assert(r.plotMeetingState(owner).ready);
 const hold={palaceUsurpationGathering:true};assert(holdSocialActors(ids,hold));f.tick();assert.equal(r.enforcementActive(),false);
 assert(r.canBorrowForPlot(f.guards[0]));assert(r.canBorrowForPlot(f.guards[1]));assert.equal(r.snapshot().phaseTime,prior.phaseTime);
 assert.equal(r.requestPlotMeeting('palace-usurpation:0:2',ids),false);assert.equal(r.releasePlotMeeting('another-owner'),false);
 assert(r.releasePlotMeeting(owner));releaseSocialActors(hold);f.tick();assert.equal(r.plotMeetingState(owner).pending,false);
 assert.equal(r.snapshot().phase,'handover');assert(r.snapshot().phaseTime>prior.phaseTime);assert.equal(r.snapshot().shots.length,prior.shots.length);f.dispose();
});
test('a held original bow and an in-flight original arrow cannot turn an appointment ready',()=>{
 const f=fixture(),r=f.routine,prior=r.snapshot();
 assert(r.restore({...prior,phase:'aim',phaseTime:1.2}));assert(r.requestPlotMeeting(owner,ids));f.tick();
 assert.equal(r.plotMeetingState(owner).ready,false);assert.equal(r.state().phase,'aim');assert(r.handoffBoundary().blockers.some(b=>b.kind==='heldBow'));
 assert(r.restore({...prior,phase:'flight',phaseTime:.1,flightTime:.1,flightLane:0,start:[-18,1,18],end:[-24,1,18],flying:true}));
 assert.equal(r.plotMeetingState(owner).pending,false);assert(r.requestPlotMeeting(owner,ids));f.tick();
 assert.equal(r.plotMeetingState(owner).ready,false);assert.equal(r.state().flying,true);assert.equal(r.state().shots.length,0);f.dispose();
});
test('body replacement, real daily needs, player practice and enforcement preempt the appointment',()=>{
 const f=fixture(),r=f.routine;assert(r.requestPlotMeeting(owner,ids));f.tick();f.guards[0].bodyId+=':changed';f.tick();
 assert.equal(r.plotMeetingState(owner).reason,'original-guards-changed');assert.equal(r.canBorrowForPlot(f.guards[0]),false);
 assert(r.requestPlotMeeting(owner,ids));f.tick();f.flags.urgent=true;f.tick();assert.equal(r.plotMeetingState(owner).reason,'personal-needs');
 assert.equal(r.requestPlotMeeting(owner,ids),false);f.flags.urgent=false;
 assert(r.requestPlotMeeting(owner,ids));r.startPlayer(f.player);f.tick();assert.equal(r.plotMeetingState(owner).reason,'player-practice');r.stopPlayer();
 assert(r.requestPlotMeeting(owner,ids));assert(holdSocialActors(ids,'crime:fixture'));f.tick();assert.equal(r.plotMeetingState(owner).reason,'enforcement');
 releaseSocialActors('crime:fixture');f.dispose();
});
test('a normal save has no body appointment to restore',()=>{
 const f=fixture(),r=f.routine;assert(r.requestPlotMeeting(owner,ids));f.tick();assert(r.plotMeetingState(owner).ready);
 const saved=r.snapshot();assert.equal(Object.hasOwn(saved,'plotMeeting'),false);assert(r.restore(saved));
 assert.equal(r.plotMeetingState(owner).pending,false);assert.equal(r.canBorrowForPlot(f.guards[0]),false);f.dispose();
});
test('an actual empty original route cancels the appointment without moving its body or finishing work',()=>{
 const f=fixture(),r=f.routine;f.guards[0].root.position.x-=1;const position=f.guards[0].root.position.clone();f.flags.blocked=true;
 assert(r.requestPlotMeeting(owner,ids));f.tick();f.tick();assert.equal(r.plotMeetingState(owner).pending,false);
 assert.equal(r.plotMeetingState(owner).reason,'original-route-unavailable');assert(f.guards[0].root.position.equals(position));
 assert.equal(r.snapshot().phase,'handover');assert.equal(r.snapshot().shots.length,0);assert.equal(r.state().guards[0].patrol.checkpoint,'handoff');f.dispose();
});
test('a real stationary handoff permits in-place plot talk without deleting the retained original waypoint or advancing duty',()=>{
 const f=fixture(),r=f.routine,guard=f.guards[0];guard.route=[{x:-17.65,y:.13,z:18.45}];const route=guard.route,prior=r.snapshot();
 assert(r.canTalkForPlot(guard));assert.equal(r.canBorrowForPlot(guard),false);
 const hold={palaceUsurpationGathering:true};assert(holdSocialActors([ids[0]],hold));for(let i=0;i<40;i++)f.tick();
 assert.equal(guard.route,route);assert.equal(r.snapshot().phaseTime,prior.phaseTime);assert.equal(r.snapshot().shots.length,prior.shots.length);
 releaseSocialActors(hold);guard.root.position.x-=1;assert.equal(r.canTalkForPlot(guard),false);guard.root.position.x+=1;
 f.flags.urgent=true;assert.equal(r.canTalkForPlot(guard),false);f.dispose();
});
