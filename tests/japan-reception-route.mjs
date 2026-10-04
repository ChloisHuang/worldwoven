// Original counter stall: one guest leaving, a second FIFO owner approaching,
// and the player at the exact 0.3232 m legal registration position.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {followActorRoute,moveActorWithCollision} from '../source/game/actor-navigation.js';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
import {canTraverse,blocked} from '../source/game/navigation.js';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P,japanReceptionReady} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
class Position{constructor(x,y,z){Object.assign(this,{x,y,z});}clone(){return new Position(this.x,this.y,this.z);}toArray(){return [this.x,this.y,this.z];}distanceToSquared(p){return (this.x-p.x)**2+(this.y-p.y)**2+(this.z-p.z)**2;}}
const source=fs.readFileSync('source/game/japan-bathhouse-operations.js','utf8');
const start=source.indexOf(' function tickTask('),end=source.indexOf(' function workerTask(',start);assert(start>=0&&end>start);
for(const dt of [.1,1/30]){
 const playerPosition=new Position(-3.970755216456002,0,5.027798132366138),fixed=playerPosition.toArray();
 const board=createJapanServiceOrders({worldSeed:42}),facilities=createFacilityQueue(),bench={id:'rest',kind:'seat',center:[-7.7,3.8,7.55],anchor:[-7.7,3.8,7.39]};
 const spawn=()=>board.spawn({appearance:{bodyPreset:'masculine-lean'},side:'men',restPoint:bench.anchor,diningPoint:bench.anchor,restSeatId:bench.id});
 const first=spawn(),second=spawn();
 assert(board.guestStep(first.id,'arrived',{position:P.reception}));let job=board.jobs().find(j=>j.visitId===first.id);assert(board.claim(job.id,'jp-welcome'));assert(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:P.reception}));
 assert(facilities.request('japan-service-reception',second.id));
 const player={root:{position:playerPosition,userData:{appearance:{bodyPreset:'feminine-slender'}}}},furniture={items:[bench],facilities,releaseActor:id=>facilities.releaseActor(id)};
 const service=createJapanPlayerService({board,furniture,getPlayer:()=>player});assert(service.register('cloud-leaf').ok);const queued=service.state().visit;assert.equal(queued.stage,'arriving');assert.equal(queued.id,'jp-player-service-42-3');
 const actor=(id,position)=>({station:{id},root:{position:new Position(...position),rotation:{y:0}},route:[],locomotion:{walkSpeed:1.3},walking:false});
 const leaving=actor(first.id,[-3.9153052287381076,0,5.615362563538363]),arriving=actor(second.id,[-2.471163237101111,0,7.028836762898889]),npcs=[leaving,arriving];
 // Actual reception solid from groundSolid(-7.05,.51,6.95,6.2,1.02,1.1).
 const walls=[{minX:-10.15,maxX:-3.95,minZ:6.4,maxZ:7.5,minY:0,maxY:1.02}];
 const navigation={bounds:{minX:-12,maxX:4,minZ:2,maxZ:10},multilevel:false,radius:.25},lot={colliders:walls};
 const doors=createAutomaticRouting({doors:[],staticColliders:walls,planningColliders:[],getSweepBoxes:()=>[],requestOpen:()=>{},getVersion:()=>0});
 const tasks=new Map(),moveActor=(n,dx,dz,r)=>moveActorWithCollision(n,dx,dz,r,{colliders:walls,navigation,npcs,playerPosition});
 let left=false;
 const task=(n,to,onDone)=>{const t={actor:n,to,duration:0,elapsed:0,stalled:0,retries:0,arrived:false,routeSet:false,onDone};tasks.set(n.station.id,t);return t;};
 task(leaving,[0,0,5.5],()=>{left=true;return true;});
 task(arriving,P.reception,()=>board.guestStep(second.id,'arrived',{position:arriving.root.position.toArray()}));
 const clear=n=>{tasks.delete(n.station.id);n.route=[];};
 const context=vm.createContext({tasks,board,furniture,lot,npcs,navigation,doors,moveActor,playerState:{position:playerPosition},followActorRoute,canTraverse,point:a=>({x:a[0],y:a[1],z:a[2]}),near:(p,a,r=.08)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.35,safety:n=>npcs.filter(a=>a!==n).map(a=>a.root.position).concat(playerPosition).map(p=>({minX:p.x-.25,maxX:p.x+.25,minZ:p.z-.25,maxZ:p.z+.25,minY:p.y,maxY:p.y+1.95})),planPath:(a,b,r)=>doors.planPath(a,b,navigation,r),clear,tell(){},isJapanEmployeeInteraction:()=>false,abortTask:(t,reason)=>assert.fail(reason+' '+JSON.stringify(t.actor.root.position))});
 vm.runInContext(source.slice(start,end)+'\nglobalThis.step=tickTask;',context);
 let accepted=0;
 for(let i=0;i<30/dt&&(!left||service.state().visit.stage!=='changing');i++){
  for(const t of [...tasks.values()])if(tasks.get(t.actor.station.id)===t)context.step(t,dt);
  for(const n of npcs){assert(!blocked(n.root.position.x,n.root.position.z,walls,.25,navigation));assert(Math.hypot(n.root.position.x-playerPosition.x,n.root.position.z-playerPosition.z)>=.59-1e-6,'Full guest/player radii remain intact');}
  assert(Math.hypot(leaving.root.position.x-arriving.root.position.x,leaving.root.position.z-arriving.root.position.z)>=.5-1e-6);
  if(board.getVisit(second.id).stage==='check-in'){
   assert(japanReceptionReady(arriving.root.position,'npc'));job=board.jobs().find(j=>j.visitId===second.id&&j.kind==='register');assert(board.claim(job.id,'jp-welcome'));assert(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:arriving.root.position.toArray()}));facilities.release('japan-service-reception',second.id);
  }
  service.update(dt);
  if(service.state().visit.stage==='check-in'){
   job=board.jobs().find(j=>j.visitId===queued.id&&j.kind==='register');assert(board.claim(job.id,'jp-welcome'));assert(board.complete(job.id,'jp-welcome',{position:P.registrar,guestPosition:playerPosition.toArray()}));facilities.release('japan-service-reception',queued.id);accepted++;
  }
 }
 assert(left,'Original guest can clear the counter');assert.equal(accepted,1,'FIFO advances once to the unchanged player position');assert.equal(service.state().visit.stage,'changing');assert.equal(board.state().items.filter(i=>i.visitId===queued.id&&i.kind==='token').length,1);assert.deepEqual(playerPosition.toArray(),fixed);
 board.dispose();facilities.dispose();doors.dispose();
}
console.log('PASS: actual Japan task movement clears original counter coordinates, preserves full bodies and desk, advances FIFO once with stationary player');
