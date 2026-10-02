require('node:fs').mkdirSync('qa',{recursive:true});
// Synthetic R6 coverage; independent of scene builders being edited concurrently.
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
const source=fs.readFileSync('source/game/navigation.js','utf8');
const nav=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const {blocked,findPath,moveWithCollision,resolveSurfaceHeight,canTraverse,clearNavigationCache}=nav;
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++};
const bounds={minX:-30,maxX:30,minZ:-40,maxZ:40},empty=[];
const flat=(minX,maxX,minZ,maxZ,y=0)=>({minX,maxX,minZ,maxZ,y});
const ramp=(minX,maxX,minZ,maxZ,y,endY,axis='z')=>({...flat(minX,maxX,minZ,maxZ,y),endY,axis});
const legacy={bounds,multilevel:false},layered={bounds,surfaces:[flat(-30,30,-40,40)],legacyGround:false,bodyHeight:1.95,maxStep:.4};
const reports=[];
function validate(start,end,colliders,options,label){
 const began=performance.now(),path=findPath(start,end,colliders,options);
 check(path.length,`${label}: path exists`);
 const last=path.at(-1);check(Math.hypot(last.x-end.x,last.z-end.z)<.025,`${label}: reaches exact XZ`);
 if('y' in last)check(Math.abs(last.y-end.y)<.06,`${label}: reaches requested floor`);
 let prior={...start};
 for(const next of path){
  check(canTraverse(prior,next,colliders,options),`${label}: supported swept-clear segment`);
  check(Math.abs(next.x)<=29.66001&&Math.abs(next.z)<=39.66001,`${label}: body remains within outer bounds`);
  if('y' in next)check(Math.abs(next.y-prior.y)<=.40001,`${label}: no floor teleport`);
  prior=next;
 }
 const position={...start},route=path.slice();let frames=0,stalls=0;
 while(route.length&&frames++<18000){
  const next=route[0],dx=next.x-position.x,dz=next.z-position.z,d=Math.hypot(dx,dz);
  if(d<.05&&(!('y' in next)||Math.abs(position.y-next.y)<.1)){route.shift();continue;}
  const amount=Math.min(d,.0592),before={...position};
  moveWithCollision(position,dx/d*amount,dz/d*amount,colliders,.34,options);
  if(Math.hypot(position.x-before.x,position.z-before.z)<1e-8)stalls++;
  if(stalls>4)break;
 }
 check(!route.length,`${label}: controller follows route without stalling`);
 check(Math.hypot(position.x-end.x,position.z-end.z)<.1,`${label}: controller arrives`);
 if(options.multilevel===false)check(position.y===start.y,`${label}: legacy move preserves feet height`);
 else check(Math.abs(position.y-end.y)<.1,`${label}: controller arrives on correct floor`);
 reports.push({label,points:path.length,ms:+(performance.now()-began).toFixed(2)});
 return path;
}
for(const [name,o] of [['legacy',legacy],['multilevel',layered]]){
 check(!blocked(29.66,39.66,empty,.34,o),`${name}: exact radius-inset corner is walkable`);
 for(const p of [[29.67,0],[-29.67,0],[0,39.67],[0,-39.67],[30,40]])check(blocked(...p,empty,.34,o),`${name}: beyond edge is blocked`);
 for(const [x,z,dx,dz] of [[29.5,0,4,0],[-29.5,0,-4,0],[0,39.5,0,4],[0,-39.5,0,-4],[29.5,39.5,3,3]]){
  const pos={x,y:0,z};moveWithCollision(pos,dx,dz,empty,.34,o);
  check(Math.abs(pos.x)<=29.66001&&Math.abs(pos.z)<=39.66001,`${name}: manual movement stops inside edges/corners`);
 }
 validate({x:-29.5,y:0,z:-39.5},{x:29.5,y:0,z:39.5},empty,o,`${name} diagonal 60x80`);
 validate({x:29.66,y:0,z:39.66},{x:-29.66,y:0,z:-39.66},empty,o,`${name} exact inset corner endpoints`);
 const wall=[{minX:-.12,maxX:.12,minZ:-30,maxZ:30,minY:0,maxY:3}];
 const detour=validate({x:-25,y:0,z:0},{x:25,y:0,z:0},wall,o,`${name} full-size obstacle detour`);
 check(detour.some(p=>Math.abs(p.z)>30.39),`${name}: route actually uses expanded region`);
 const thin=[{minX:.004,maxX:.005,minZ:-40,maxZ:40,minY:0,maxY:3}];
 check(!canTraverse({x:-.5,y:0,z:0},{x:.5,y:0,z:0},thin,{...o,radius:0}),`${name}: swept segment catches sub-sample thin wall`);
 check(findPath({x:-25,y:0,z:0},{x:25,y:0,z:0},thin,o).length===0,`${name}: wall spanning bounds prevents crossing`);
 const diagonalBox=[{minX:0,maxX:1,minZ:-1,maxZ:0,minY:0,maxY:3}];
 check(!canTraverse({x:-.35,y:0,z:.325},{x:-.33,y:0,z:.345},diagonalBox,o),`${name}: diagonal corner cannot be cut`);
}
const height=validate({x:21,y:1.27,z:32},{x:27,y:1.27,z:36},empty,legacy,'legacy arbitrary feet height');
check(height.every(p=>!('y' in p)),'Legacy 2D waypoint shape preserved');
check(findPath({x:21,z:32},{x:27,z:36},empty,{...legacy,surfaces:[]}).length>0,'Explicit multilevel:false overrides surfaces');
check(blocked(20,0,empty,.34,null),'Null options retain original X extent');
check(blocked(0,25,empty,.34,null),'Null options retain original Z extent');
check(!blocked(14.4,19.4,empty,.34,null),'Null options retain old center-boundary behavior');
check(findPath({x:-2,z:0},{x:2,z:0},empty,null).every(p=>!('y' in p)),'Null options retain old 2D path shape');
const shifted={bounds:{minX:100.1,maxX:160.1,minZ:-300.2,maxZ:-220.2},multilevel:false};
const shiftedPath=findPath({x:101,y:7,z:-299},{x:159,y:7,z:-221},empty,shifted);
check(shiftedPath.length>0&&shiftedPath.at(-1).x===159,'Arbitrary offset bounds generate a usable grid');
check(!canTraverse({x:101,z:-299},{x:160,z:-221},empty,shifted),'Offset-bound traversal enforces radius inset');
const hollow={bounds,surfaces:[flat(-30,-1,-40,40),flat(1,30,-40,40)],legacyGround:false};
check(resolveSurfaceHeight({x:0,y:0,z:0},hollow)===null,'Layered mode does not implicitly fill an unsupported void');
check(findPath({x:-5,y:0,z:0},{x:5,y:0,z:0},empty,hollow).length===0,'Full-size unsupported trench disconnects surfaces');
const sliver={bounds,surfaces:[flat(20,25.21,30,36),flat(25.24,29,30,36)],legacyGround:false};
check(!canTraverse({x:25,y:0,z:33},{x:25.5,y:0,z:33},empty,sliver),'Expanded-zone sub-grid void cannot disappear between samples');
const stacked={bounds,surfaces:[flat(20,29,30,39,0),flat(20,29,30,39,3.8)]};
check(findPath({x:25,y:0,z:35},{x:25,y:3.8,z:35},empty,stacked).length===0,'Expanded-zone disconnected stacked floors never teleport');
const stair={bounds,surfaces:[flat(15,29,20,30,0),ramp(21,24,12,20,3.8,0),flat(15,29,5,12,3.8)],legacyGround:false,bodyHeight:1.95,maxStep:.4};
validate({x:26,y:0,z:27},{x:26,y:3.8,z:7},empty,stair,'expanded-zone ramp ascent');
validate({x:26,y:3.8,z:7},{x:26,y:0,z:27},empty,stair,'expanded-zone ramp descent');
const clearance={bounds,surfaces:[flat(20,29,30,39)],bodyHeight:1.95};
check(!blocked(25,35,[{minX:24,maxX:26,minZ:34,maxZ:36,minY:1.95,maxY:3}],.34,clearance),'1.95m body exactly clears overhead collider');
check(blocked(25,35,[{minX:24,maxX:26,minZ:34,maxZ:36,minY:1.94,maxY:3}],.34,clearance),'1.95m body rejects low overhead collider');
const mutable=[],options={bounds,multilevel:false},a={x:-10,z:0},b={x:10,z:0};
let route=findPath(a,b,mutable,options),originalLength=route.length;route[0].x=999;route.shift();
let again=findPath(a,b,mutable,options);check(again.length===originalLength&&again[0].x!==999,'Cached paths are independent of controller mutations');
mutable.push({minX:-.1,maxX:.1,minZ:-40,maxZ:40});
check(findPath(a,b,mutable,options).length===0,'Collider count changes invalidate legacy node/edge/path cache');
mutable[0].minZ=50;mutable[0].maxZ=51;options.cacheVersion=1;
check(findPath(a,b,mutable,options).length>0,'cacheVersion invalidates legacy geometry cache');
mutable[0].minZ=-40;mutable[0].maxZ=40;clearNavigationCache(options);
check(findPath(a,b,mutable,options).length===0,'Explicit cache clear invalidates legacy graph and cached paths');
options.cache=false;mutable[0].minZ=50;mutable[0].maxZ=51;
check(findPath(a,b,mutable,options).length>0,'cache:false always sees in-place geometry edits');
const changing={bounds:{...bounds},multilevel:false};
check(findPath({x:20,z:0},{x:27,z:0},empty,changing).length>0,'Expanded bounds route initializes');
changing.bounds.maxX=10;
check(findPath({x:20,z:0},{x:27,z:0},empty,changing).length===0,'In-place bounds edits invalidate cache');
assert.throws(()=>findPath(a,b,empty,{bounds,gridStep:0}),RangeError);checks++;
console.log(JSON.stringify({passed:true,checks,routes:reports},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
