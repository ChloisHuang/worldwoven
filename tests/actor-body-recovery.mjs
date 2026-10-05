import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {beginActorNavigationStep,moveActorWithCollision,followActorRoute} from '../source/game/actor-navigation.js';
import {blocked} from '../source/game/navigation.js';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';

// This reproduces the reported face-to-face doorway deadlock and uses the real
// main mover for both route-driven NPCs and continuous manual player input.
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
const wrapper=main.slice(main.indexOf('function moveActor('),main.indexOf('\nfunction lotBounds('));
assert(wrapper.includes('probeBodyRecovery'));
assert(main.includes('if(paused){beginActorNavigationStep(0);return;}'));
assert(main.includes('for(let step=0;step<steps;step++){beginActorNavigationStep(stepDt);'));
const dt=1/30;
const actor=(id,x=0,z=0,y=0)=>({station:{id},root:{position:{x,y,z},rotation:{y:0}},route:[],locomotion:{walkSpeed:1},walking:false});
const options={bounds:{minX:-6,maxX:6,minZ:-6,maxZ:6},multilevel:false};
const corridor=[{minX:-6,maxX:-.36,minZ:-6,maxZ:6},{minX:.36,maxX:6,minZ:-6,maxZ:6}];
const router={routeStep:(route)=>({waypoint:route[0],phase:'walking'})};
function fixture(npcs,{player=null,walls=[],doors=router,navigation=options}={}){
 const context=vm.createContext({moveActorWithCollision,automaticDoors:doors,lot:{colliders:walls},navOptions:navigation,npcs,player});
 new vm.Script(wrapper).runInContext(context);
 return {move:context.moveActor,route:n=>followActorRoute(n,dt,{doors,moveActor:context.moveActor,npcs,playerPosition:player?.root.position,speedScale:1}),walls,navigation};
}
const tick=()=>beginActorNavigationStep(dt);
for(const goal of [0,.4]){
 // A shared passage waypoint can be occupied by another actor taking his
 // next turn. One clear frame used to erase waiting before the same turnout
 // moved the walker back, leaving ordinary NPCs oscillating here forever.
 const n=actor('walker',0,-.55),body=actor('blocker'),doors=createAutomaticRouting({doors:[],staticColliders:[],planningColliders:[],getSweepBoxes:()=>[],requestOpen:()=>{},getVersion:()=>0}),f=fixture([n,body],{doors});
 n.route=doors.planPath(n.root.position,{x:0,y:0,z:goal},options,.25);
 let first=Infinity;
 for(let i=1;i<=900;i++){tick();const before={...n.root.position},result=f.route(n);if(result.bodyBypassed)first=Math.min(first,i*dt);assert(Math.hypot(n.root.position.x-before.x,n.root.position.z-before.z)<=dt+1e-6,'recovery stays continuous');}
 assert(first>=5&&first<8,`brief clear trials cannot restart the same body's five-second wait: ${first}`);
 assert.equal(n.route.length,0,'occupied waypoint is reached using the retained real route');
 doors.dispose();
}
{
 const a=actor('a',0,-.251),b=actor('b',0,.251),f=fixture([a,b],{walls:corridor});a.route=[{x:0,y:0,z:3}];b.route=[{x:0,y:0,z:-3}];
 let first=Infinity,escaped=0;
 for(let i=1;i<=270;i++){
  tick();const outcomes=[f.route(a),f.route(b)];
  if(outcomes.some(r=>r.bodyBypassed)){first=Math.min(first,i*dt);escaped++;}
  if(i<150)assert(Math.hypot(a.root.position.x-b.root.position.x,a.root.position.z-b.root.position.z)>=.5-1e-6,'full body collision remains before 5s');
  for(const n of [a,b])assert(!blocked(n.root.position.x,n.root.position.z,corridor,.25,options),'escape never ignores the doorway frame');
 }
 assert(first>=5-1e-6&&first<5.5,`small yielding wiggles must not renew the wait forever: ${first}`);
 assert(escaped>0&&a.root.position.z>.8&&b.root.position.z<-.8,'both ordinary NPCs escape the head-on doorway');
}
function blockedManual(radius=.34,{walls=[],doors=router,bodyY=0,speed=1}={}){
 const n=actor('mover',0,-radius-.251),body=actor('blocker',0,0,bodyY),f=fixture([body],{player:n,walls,doors});
 return {...f,n,body,step:()=>f.move(n,0,speed*dt,radius)};
}
for(const clear of ['open','wall']){
 const f=blockedManual();for(let i=0;i<147;i++){tick();f.step();}
 if(clear==='open')f.body.root.position.x=4;
 else f.walls.push({minX:-5,maxX:5,minZ:-.22,maxZ:-.12,minY:0,maxY:3});
 for(let i=0;i<9;i++){tick();assert(!f.step().bodyBypassed);}
 f.walls.length=0;f.body.root.position.x=0;f.body.root.position.z=f.n.root.position.z+.591;
 for(let i=0;i<10;i++){tick();assert(!f.step().bodyBypassed,`${clear} clears the previous encounter rather than banking escape time`);}
}
{
 // The original diagonal misses the body, but the real wall slide hits it.
 const n=actor('wall-slider'),body=actor('slide-blocker',-.58,.11),walls=[{minX:.34,maxX:5,minZ:-5,maxZ:5}],f=fixture([body],{player:n,walls});
 let first=Infinity;
 for(let i=1;i<=240;i++){
  tick();const r=f.move(n,dt,dt,.34);if(r.bodyBypassed)first=Math.min(first,i*dt);
  assert(!blocked(n.root.position.x,n.root.position.z,walls,.34,options),'diagonal recovery keeps the sliding wall solid');
 }
 assert(first>=5&&first<5.1,'actual slide-induced body collision also starts the five-second timer');
 assert(n.root.position.z>.5,'the wall slider escapes the body along the legal slide');
}
for(const radius of [.25,.34]){
 const f=blockedManual(radius);let first=Infinity,restored=false;
 for(let i=1;i<=195;i++){tick();const result=f.step();if(result.bodyBypassed)first=Math.min(first,i*dt);else if(first<Infinity&&f.n.root.position.z>0)restored=true;}
 assert(Math.abs(first-5)<1e-6,'NPC-sized and manual player-sized movers have the same five-second rule');
 assert(restored,'body collision restores as soon as forward progress is clear');
 // A new direction must not inherit permission to walk back into the body.
 const before=f.n.root.position.z;tick();const reverse=f.move(f.n,0,-.6,radius);
 assert(!reverse.bodyBypassed&&f.n.root.position.z>-.001&&f.n.root.position.z<=before);
}
for(const stop of ['idle','paused','zero-intent']){
 const f=blockedManual();for(let i=0;i<147;i++){tick();f.step();}
 if(stop==='paused')beginActorNavigationStep(0);
 else {tick();if(stop==='zero-intent')f.move(f.n,0,0,.34);}
 for(let i=0;i<10;i++){tick();assert(!f.step().bodyBypassed,`${stop} breaks continuous blocked intent`);}
}
{
 const f=blockedManual();for(let i=0;i<60;i++){tick();for(let j=0;j<12;j++){assert(!f.move.probeBodyRecovery(f.n,0,dt,.34).bodyBypassed);assert(!f.step().bodyBypassed);}}
 // Two more seconds gives four total, despite 24 movement/probe calls per tick.
 for(let i=0;i<60;i++){tick();assert(!f.step().bodyBypassed);}
}
for(const kind of ['wall','furniture','closed-door','cross-floor','missing-floor']){
 const box={minX:-5,maxX:5,minZ:-.22,maxZ:-.12,minY:0,maxY:3};
 const doors=kind==='closed-door'?{...router,constrainMove:(p,dx,dz)=>({dx,dz:Math.min(dz,Math.max(0,-.56-p.z))})}:router;
 const walls=['wall','furniture'].includes(kind)?[box]:[];
 const f=blockedManual(.34,{walls,doors,bodyY:kind==='cross-floor'?3.8:0});
 if(['wall','furniture','closed-door'].includes(kind))f.body.root.position.z=.1;
 if(kind==='missing-floor'){
  // The body is across an unsupported edge. Floors/terrain do not qualify.
  const navigation={...options,multilevel:true,legacyGround:false,surfaces:[{minX:-5,maxX:5,minZ:-5,maxZ:-.58,y:0}]};
  const limited=fixture([f.body],{player:f.n,navigation});f.step=()=>limited.move(f.n,0,dt,.34);
 }
 for(let i=0;i<240;i++){tick();assert(!f.step().bodyBypassed,`${kind} does not activate body escape`);}
 if(kind==='cross-floor')assert(f.n.root.position.z>3,'a different floor is not a body blockage');
 else assert(f.n.root.position.z<-.55,`${kind} stays solid`);
}
for(const speed of [1,8]){
 const n=actor('bounded',0,-.591),bodies=Array.from({length:14},(_,i)=>actor('crowd-'+i,0,i*.35)),f=fixture(bodies,{player:n});
 let first=null,last=null,start=null,total=0,ended=false;
 for(let i=0;i<250;i++){
  tick();const before={...n.root.position},r=f.move(n,0,speed*dt,.34);
  if(r.bodyBypassed){first??=i*dt;start??=before;last=i*dt;total+=Math.hypot(n.root.position.x-before.x,n.root.position.z-before.z);}
  else if(first!==null){ended=true;break;}
 }
 assert(ended&&last-first<=1.25+1e-6,'even a continuing crowd cannot keep collision disabled');
 assert(total<=1.4+1e-6,`escape distance remains bounded at speed ${speed}: ${total}`);
 if(speed===8)assert(total>1.3,'fast movement exercises the distance limit');
}
{
 const f=blockedManual();for(let i=0;i<150;i++){tick();f.step();}
 f.walls.push({minX:-5,maxX:5,minZ:-.10,maxZ:.1,minY:0,maxY:3});
 for(let i=0;i<90;i++){tick();f.step();assert(!blocked(f.n.root.position.x,f.n.root.position.z,f.walls,.34,options),'a wall remains collidable during an active escape');}
}
console.log('PASS: shared main manual/NPC 5s body recovery, head-on doorway with yielding jitter, idle/pause/static/door/floor exclusions, per-substep accounting, clear-progress restoration and 1.25s/1.4m caps');
