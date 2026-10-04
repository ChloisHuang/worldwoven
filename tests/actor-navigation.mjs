import assert from 'node:assert/strict';
import {followActorRoute,constrainActorMove,moveActorWithCollision} from '../source/game/actor-navigation.js';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
import {findPath,blocked} from '../source/game/navigation.js';

// Reproduce the 9 cm backward seed, a person far along a route, and a local
// doorway/crossing. No role gets a special planner or reduced collision radius.
const options={bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},multilevel:false};
const makeActor=(id,x=0,z=0,y=0)=>({station:{id},root:{position:{x,y,z},rotation:{y:0}},route:[],locomotion:{walkSpeed:1.5},walking:false});
function fixture(npcs,walls=[],doorways=[]){
 const router=createAutomaticRouting({doors:doorways,staticColliders:walls,planningColliders:[],getSweepBoxes:d=>d.boxes,requestOpen:()=>{},getVersion:()=>doorways[0]?.fraction||0});
 let player={x:0,y:0,z:4};
 const moveActor=(n,dx,dz,r)=>moveActorWithCollision(n,dx,dz,r,{colliders:walls.concat(doorways.flatMap(d=>d.boxes)),navigation:options,npcs,playerPosition:player});
 return {router,setPlayer:p=>player=p,step:(n,dt=.05)=>followActorRoute(n,dt,{doors:router,moveActor,npcs,playerPosition:player}),plan:(n,to)=>n.route=router.planPath(n.root.position,to,options,.25)};
}
const seed={x:.0939,y:0,z:0},end={x:1.802,y:0,z:0};
assert(findPath(seed,end,[],options)[0].x<seed.x,'fixture starts with a grid point behind the actor');
const traces=[];
for(const [id,role]of [['passerby',null],['court-official','works'],['palace-resident','emperor']]){
 const n=makeActor(id,seed.x),f=fixture([n]);n.station.courtRole=role;
 f.setPlayer({x:1.7,y:0,z:0});f.plan(n,end);
 assert(n.route[0].x>seed.x,'one-time planner join removes the backward seed for every role');
 const trace=[];for(let i=0;i<8;i++){const s=f.step(n);assert(n.walking&&!s.waiting,'distant player cannot deny the route');trace.push({...n.root.position});}
 traces.push(trace);f.router.dispose();
}
assert.deepEqual(traces[0],traces[1]);assert.deepEqual(traces[0],traces[2]);

{
 const n=makeActor('actor'),other=makeActor('body',0,1),people=[n,other];
 const stop=constrainActorMove(n,n.root.position,0,3,.25,people,null);
 assert(stop.dz<.5&&stop.dz>.49,'swept body collision cannot tunnel, full .25 + .25 radii');
 other.root.position.y=3.8;
 assert.equal(constrainActorMove(n,n.root.position,0,3,.25,people,null).dz,3,'different floor has no body obstruction');
 other.root.position.y=0;other.root.position.z=.2;
 assert.equal(constrainActorMove(n,n.root.position,0,-.1,.25,people,null).dz,-.1,'a restored overlap can separate');
 assert.equal(constrainActorMove(n,n.root.position,0,.1,.25,people,null).dz,0,'a restored overlap cannot deepen');
 const playerStop=constrainActorMove(n,n.root.position,0,1,.25,[n],{x:0,y:0,z:1});
 assert(playerStop.dz<.41&&playerStop.dz>.40,'player retains full .34 radius');
}
{
 const n=makeActor('walker',0,-1),wall={minX:-4,maxX:4,minZ:.4,maxZ:.6,minY:0,maxY:3},f=fixture([n],[wall]);
 n.route=[{x:0,y:0,z:2}];
 for(let i=0;i<50;i++)f.step(n);
 assert(n.root.position.z<=.15+1e-6);assert(!blocked(n.root.position.x,n.root.position.z,[wall],.25,options),'local follower cannot cut through a wall');
}
{
 const front=makeActor('front',0,.1),back=makeActor('back',0,-.6),d={id:'queue-door',axis:'x',center:[0,0,1],width:2,motion:'slide',fraction:0,boxes:[{minX:-1,maxX:1,minZ:.95,maxZ:1.05,minY:0,maxY:3}]},f=fixture([front,back],[],[d]);
 f.setPlayer({x:4,y:0,z:4});for(const n of [front,back])f.plan(n,{x:0,y:0,z:3});
 for(let i=0;i<10;i++){f.step(front);f.step(back);assert(Math.hypot(front.root.position.x-back.root.position.x,front.root.position.z-back.root.position.z)>=.5);}
 assert.equal(front.root.position.z,.1,'door staging waits outside the closed leaf');
 d.fraction=1;d.boxes=[];
 for(let i=0;i<30;i++){f.step(front);f.step(back);assert(Math.hypot(front.root.position.x-back.root.position.x,front.root.position.z-back.root.position.z)>=.5-1e-6,'queue never overlaps bodies');}
 assert(front.root.position.z>1.5&&back.root.position.z>1,'both retained routes resume after door opens');
}
{
 const a=makeActor('a',0,-1),b=makeActor('b',0,1),walls=[{minX:-5,maxX:-.645,minZ:-5,maxZ:5,minY:0,maxY:3},{minX:.645,maxX:5,minZ:-5,maxZ:5,minY:0,maxY:3}],f=fixture([a,b],walls);f.setPlayer({x:4,y:0,z:4});f.plan(a,{x:0,y:0,z:3});f.plan(b,{x:0,y:0,z:-3});
 for(let i=0;i<180;i++){
  f.step(a);f.step(b);
  assert(Math.hypot(a.root.position.x-b.root.position.x,a.root.position.z-b.root.position.z)>=.5-1e-6,'1.29 m corridor crossing never overlaps full bodies');
 }
 assert(a.root.position.z>1&&b.root.position.z< -1,'a local yield releases a head-on crossing');
}
console.log('PASS: identical role-independent route execution, backward seed, distant player, full body/wall radii, floor exclusion, local crossing and door queue resume');
