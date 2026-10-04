import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {followActorRoute,moveActorWithCollision} from '../source/game/actor-navigation.js';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';

// Execute the actual main automatic-movement/arrival branch without a renderer.
// This reproduces a one-click seat approach being cancelled at a person's body.
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const begin=main.indexOf(' while(path.length&&budget>1e-10)'),end=main.indexOf('\n // An NPC handover',begin);
assert(begin>=0&&end>begin);
const tickScript=new vm.Script('moving=false;if(path.length){let budget=.075;'+main.slice(begin,end));
class Position{
 constructor(x,y,z){Object.assign(this,{x,y,z});}
 clone(){return new Position(this.x,this.y,this.z);}
 distanceToSquared(p){return (this.x-p.x)**2+(this.y-p.y)**2+(this.z-p.z)**2;}
}
function fixture({start=[0,0,0],goal=[0,0,3],body=[0,0,1.2],walls=[]}={}){
 const player={root:{position:new Position(...start),rotation:{y:0}},locomotion:{walkSpeed:1.5}},npc={station:{id:'stationary-worker'},root:{position:new Position(...body),rotation:{y:0}},walking:false};
 const options={bounds:{minX:-10,maxX:30,minZ:-40,maxZ:10},multilevel:false},npcs=[npc],target={position:goal};
 const automaticDoors=createAutomaticRouting({doors:[],staticColliders:walls,planningColliders:[],getSweepBoxes:()=>[],requestOpen:()=>{},getVersion:()=>0});
 const route=automaticDoors.planPath(player.root.position,{x:goal[0],y:goal[1],z:goal[2]},options,.34);
 let completed=0,rejected=0,resolved=0;
 const context=vm.createContext({player,npcs,path:route,pendingInteraction:target,targetStation:target,automaticDoors,PLAYER_TRAVEL_SCALE:1,followActorRoute,
  intentWaypoint(step){resolved++;return step.waypoint;},moveActor(n,dx,dz,r){return moveActorWithCollision(n,dx,dz,r,{colliders:walls,navigation:options,npcs,playerPosition:player.root.position});},
  startInteraction(){completed++;},toast(){rejected++;},furniture:{releaseActor(){}}});
 return {player,npc,context,route,tick:()=>tickScript.runInContext(context),counts:()=>({completed,rejected,resolved})};
}
{
 const walls=[{minX:-4,maxX:-.4,minZ:-5,maxZ:5},{minX:.4,maxX:4,minZ:-5,maxZ:5}],f=fixture({walls});
 for(let i=0;i<35;i++)f.tick();
 assert.equal(f.context.path,f.route);assert(f.context.path.length);assert(f.context.pendingInteraction);
 assert.equal(f.counts().completed,0);assert.equal(f.counts().rejected,0,'a local body pause does not cancel the single-click intent');
 f.npc.root.position.z=7;
 for(let i=0;i<120&&f.context.path.length;i++)f.tick();
 for(let i=0;i<10;i++)f.tick();
 assert.equal(f.counts().completed,1,'same retained click finishes exactly once after the body leaves');assert.equal(f.context.pendingInteraction,null);assert.equal(f.counts().rejected,0);
}
{
 // Actual failing player/doctor coordinates and remaining approach waypoints.
 const f=fixture({start:[24.1216137,4.015,-30.5],goal:[22.46,4.015,-28.11],body:[23.55,4.015,-30.65]});
 const doctor=f.npc.root.position.clone();
 f.route.splice(0,f.route.length,...[[24,-30.5],[23.5,-30.5],[23,-30.5],[22.5,-30.5],[22,-30.5],[22,-30],[22,-29.5],[22,-29],[22,-28.5],[22.5,-28.5],[22.5,-28],[22.46,-28.11]].map(([x,z])=>({x,y:4.015,z})));
 for(let i=0;i<250&&f.context.path.length;i++){
  f.tick();assert(Math.hypot(f.player.root.position.x-doctor.x,f.player.root.position.z-doctor.z)>=.59-1e-6,'automatic player retains .34 + .25 body radii');
 }
 assert.equal(f.counts().completed,1,'the stationary doctor is passed using the common local yield');assert.equal(f.counts().rejected,0);assert(f.counts().resolved>0,'existing endpoint resolver is used');assert.deepEqual(f.npc.root.position,doctor,'the worker is not moved from the job');
}
{
 const f=fixture({body:[5,0,5],walls:[{minX:-4,maxX:4,minZ:.8,maxZ:1}]});
 f.route.splice(0,f.route.length,{x:0,y:0,z:3});
 for(let i=0;i<40&&f.context.path.length;i++)f.tick();
 assert.equal(f.context.path.length,0,'a true static blockage still abandons an impossible route');assert.equal(f.counts().completed,0);assert.equal(f.counts().rejected,1);
}
for(const obstruction of ['wall','floor','closed-door','occupied-destination']){
 const start={x:0,y:0,z:0},body={x:.5,y:0,z:0},goal={x:obstruction==='occupied-destination'?.6:1.5,y:obstruction==='floor'?3.8:0,z:0};
 const walls=obstruction==='wall'?[{minX:.75,maxX:1,minZ:-1,maxZ:1,minY:0,maxY:3}]:[];
 const doors=obstruction==='closed-door'?[{id:'closed',axis:'z',center:[1,0,0],width:2,fraction:0,boxes:[]}]:[];
 const options={bounds:{minX:-3,maxX:3,minZ:-3,maxZ:3},surfaces:[0,3.8].map(y=>({minX:-3,maxX:3,minZ:-3,maxZ:3,y})),legacyGround:false};
 const router=createAutomaticRouting({doors,staticColliders:walls,planningColliders:[],getSweepBoxes:()=>[],requestOpen:()=>{},getVersion:()=>0});
 const route=router.planPath(start,goal,options,.34);route.splice(0,route.length,{...body},goal);const before=route.slice();
 assert.equal(router.rejoinAroundBody(route,start,body,.59),false,'local rejoin preserves '+obstruction);assert.deepEqual(route,before);
}
console.log('PASS: actual main path consumer retains a body pause, resumes one click once, passes a stationary doctor with full radii, preserves endpoint resolution and rejects a true wall');
