// The existing guard routine owns all arrows and patrols. The plot appointment
// may stop only an already safe original handoff and never survives cold load.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createChinaArcheryRoutine}=await import('../source/game/china-archery-routine.js');
const {CHINA_GUARD_ROUTES}=await import('../source/game/china-guard-routes.js');
const {CHINA_ARCHERY}=await import('../source/game/china-archery-court.js');
const {blocked,findPath}=await import('../source/game/navigation.js');
const {beginActorNavigationStep,moveActorWithCollision}=await import('../source/game/actor-navigation.js');
const {holdSocialActors,releaseSocialActors,resetSocialHolds}=await import('../source/game/npc-social-ownership.js');
const owner='palace-usurpation:0:1',ids=['cn-archery','cn-range-warden'];
function fixture(lot=null){
 resetSocialHolds();const flags={urgent:false,blocked:false},group=lot?.group||new T.Group();
 const actor=(id,i)=>{const root=new T.Group(),hands=[new T.Group(),new T.Group()];root.add(...hands);root.userData={hands,jinyiCostume:{dispose(){}}};
  root.position.set(-17.65,.13,18.45+i*1.35);group.add(root);return {bodyId:id+':body',station:{id},root,route:[],phase:0,locomotion:{walkSpeed:2},animate(){}};};
 const guards=ids.map(actor),player=actor('player',2),navigation=lot?{surfaces:lot.walkableSurfaces,bounds:lot.bounds,legacyGround:false,bodyHeight:1.95,maxStep:.4}:null;
 const planPath=(from,to,radius=.25)=>flags.blocked?[]:lot?findPath(from,to,lot.colliders,{...navigation,radius,pathRadius:radius}):[new T.Vector3(to.x,to.y,to.z)];
 const routine=createChinaArcheryRoutine({npcs:guards,lot:lot||{group,archery:{}},planPath,
  moveActor(n,dx,dz,radius){if(lot)return moveActorWithCollision(n,dx,dz,radius,{colliders:lot.colliders,navigation,npcs:guards,playerPosition:player.root.position});n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:()=>({}),getPlayer:()=>player,
  sharedNeeds:{status:()=>({seekMeal:flags.urgent,seekToilet:false})}});
 player.root.position.fromArray(routine.plotMeetingSite().position);
 const tick=()=>{beginActorNavigationStep(.1);routine.update(.1,.1,{position:player.root.position});};
 return {guards,player,flags,routine,navigation,planPath,tick,dispose(){routine.dispose();resetSocialHolds();}};
}
test('the plot stand fits the real court and leaves original patrol, return and bow routes clear',async()=>{
 const {buildChina}=await import('../source/game/regions-east.js'),lot=buildChina(),f=fixture(lot),r=f.routine,site=r.plotMeetingSite();
 const point=a=>({x:a[0],y:a[1],z:a[2]}),distance=(p,a,b)=>{
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)||0));
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
 };
 const stand=point(site.position),handoffs=ids.map(id=>site.actorPoints[id]),old=point([-16.35,.13,19.12]),arrival=.22,yieldDistance=1.05;
 try{
  for(const radius of [.34,.39])assert(!blocked(stand.x,stand.z,lot.colliders,radius,{...f.navigation,y:stand.y}),'original support and full player body must fit');
  assert(stand.x-arrival>CHINA_ARCHERY.range.maxX+.30,'the waiting player remains outside the original firing range');
  const exit=CHINA_GUARD_ROUTES.west.slice(0,2).map(row=>point(row.at));
  assert(distance(old,...exit)<.1,'the old plot stand occupies the unchanged original exit corridor');
  for(const handoff of handoffs)assert(Math.hypot(stand.x-handoff[0],stand.z-handoff[2])+arrival<2.75,'both original guards remain in meeting range after an early player stop');
  const clearRoute=(points,clearance)=>{
   for(let i=1;i<points.length;i++){
    const start=point(points[i-1]),target=point(points[i]),path=f.planPath(start,target),route=[start,...path];
    assert(path.length&&Math.hypot(path.at(-1).x-target.x,path.at(-1).z-target.z)<.06,'the unchanged real route reaches its original waypoint');
    for(let j=1;j<route.length;j++)assert(distance(stand,route[j-1],route[j])>clearance+arrival,'player arrival tolerance must leave the original route clear: '+JSON.stringify({start,target,from:route[j-1],to:route[j],distance:distance(stand,route[j-1],route[j]),required:clearance+arrival}));
   }
  };
  for(const [i,id] of ['east','west'].entries()){
   const route=CHINA_GUARD_ROUTES[id];
   clearRoute([handoffs[i],...route.slice(0,3).map(row=>row.at)],yieldDistance);
   clearRoute([...route.slice(-3).map(row=>row.at),handoffs[i]],yieldDistance);
   clearRoute([handoffs[i],CHINA_ARCHERY.rack,handoffs[i]],.34+.25);
  }
  assert(f.planPath(point(CHINA_GUARD_ROUTES.west[1].at),stand,.39).length,'the player can reach the supported stand through the unchanged entrance');
  // Exercise the closest legal early stop, then both original duty owners'
  // exit and return legs with production static and person collisions.
  const toward=new T.Vector3(...handoffs[0]).sub(f.player.root.position).normalize();f.player.root.position.addScaledVector(toward,arrival);
  assert(!blocked(f.player.root.position.x,f.player.root.position.z,lot.colliders,.34,{...f.navigation,y:stand.y}));
  for(const [i,routeId] of ['east','west'].entries())for(const returning of [false,true]){
   const route=CHINA_GUARD_ROUTES[routeId],original=r.snapshot(),index=returning?route.length-2:0;
   for(const [j,guard]of f.guards.entries())guard.root.position.fromArray(handoffs[j]);
   if(returning)f.guards[i].root.position.fromArray(route[index].at);
   assert(r.restore({...original,activeId:ids[1-i],phase:'relief',phaseTime:0,shiftPending:true,patrol:original.patrol.map(([id,p],j)=>[id,{...p,stage:j===i?'travel':'ready',index:j===i?index:0,time:0,visited:[],yielding:false}])}));
   assert(r.requestPlotMeeting(owner,ids));let done=false;
   for(let frame=0;frame<180&&!done;frame++){
    const before=f.guards[i].root.position.clone();f.tick();const state=r.state().guards[i];
    assert(before.distanceTo(f.guards[i].root.position)<.16,'the original guard walks continuously');
    assert.equal(state.patrol.yielding,false,'waiting player cannot hold the original patrol');
    assert(!blocked(state.position[0],state.position[2],lot.colliders,.25,{...f.navigation,y:state.position[1]}));
    done=returning?r.plotMeetingState(owner).ready:state.patrol.index===2&&state.patrol.stage==='observe';
   }
   assert(done,routeId+' original '+(returning?'return reaches the safe meeting handoff':'exit completes past the waiting player'));
   if(returning)assert(f.guards.every(guard=>r.canBorrowForPlot(guard)),'only the original safe handoff permits the meeting');
   assert(r.releasePlotMeeting(owner));
  }
 }finally{f.dispose();lot.group.traverse(object=>object.geometry?.dispose());}
});
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
