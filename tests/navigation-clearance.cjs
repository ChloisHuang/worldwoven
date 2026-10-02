require('node:fs').mkdirSync('qa',{recursive:true});
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
const source=fs.readFileSync('source/game/navigation.js','utf8');
const {blocked,findPath,moveWithCollision,resolveSurfaceHeight,canTraverse,segmentBoxIntersection,clearNavigationCache}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++};
const flat=(minX,maxX,minZ,maxZ,y)=>({minX,maxX,minZ,maxZ,y});
const ramp=(minX,maxX,minZ,maxZ,y,endY,axis='z')=>({...flat(minX,maxX,minZ,maxZ,y),endY,axis});
const japan=[flat(-14.4,14.4,-19.4,19.4,0)];
for(let floor=1;floor<=3;floor++) {
  const y=floor*3.8;
  japan.push(flat(-12,7.4,-12,4,y),flat(7.4,12,-12,-10,y),flat(7.4,12,-2,4,y),flat(10.8,12,-10,-2,y));
  japan.push(ramp(7.4,10.8,-10,-2,y,y-3.8));
}
const japanOptions={surfaces:japan,legacyGround:false};
const stations=[{x:-4,y:0,z:5},{x:-4,y:3.8,z:1},{x:-4,y:7.6,z:-6},{x:-4,y:11.4,z:1}];
function validateRoute(start,end,surfaces,colliders=[],label='route') {
  const options={surfaces,legacyGround:false};const path=findPath(start,end,colliders,options);
  check(path.length,`${label}: path exists`);
  const last=path.at(-1);check(Math.hypot(last.x-end.x,last.z-end.z)<.6,`${label}: reaches XZ`);
  check(Math.abs(last.y-end.y)<.07,`${label}: reaches floor`);
  let prior={...start};
  for(const point of path) {
    check(Math.abs(point.y-prior.y)<=.40001,`${label}: no floor teleport`);
    check(canTraverse(prior,point,colliders,options),`${label}: supported collision-free segment`);
    const d=Math.hypot(point.x-prior.x,point.z-prior.z),steps=Math.max(1,Math.ceil(d/.04));
    for(let i=0;i<steps;i++) {
      const dx=point.x-prior.x,dz=point.z-prior.z,remaining=Math.hypot(dx,dz);
      if(remaining<1e-7)break;
      const amount=Math.min(.04,remaining),oldY=prior.y;
      moveWithCollision(prior,dx/remaining*amount,dz/remaining*amount,colliders,.34,options);
      check(Math.abs(prior.y-oldY)<=.40001,`${label}: moving height continuity`);
    }
    check(Math.hypot(prior.x-point.x,prior.z-point.z)<.05&&Math.abs(prior.y-point.y)<.25,`${label}: playable movement follows route`);
  }
  check(Math.abs(prior.y-end.y)<.07,`${label}: movement arrives on correct floor`);
  return path.length;
}
function validateController(start,end,surfaces,colliders=[],label='controller') {
  const options={surfaces,legacyGround:false},path=findPath(start,end,colliders,options),position={...start};
  let frames=0,stalls=0;
  while(path.length&&frames++<12000) {
    const next=path[0],dx=next.x-position.x,dz=next.z-position.z,d=Math.hypot(dx,dz);
    if(d<.14&&Math.abs(next.y-position.y)<.45){path.shift();continue;}
    const amount=Math.min(d,.016*3.7),before={...position};
    moveWithCollision(position,dx/d*amount,dz/d*amount,colliders,.34,options);
    if(Math.hypot(position.x-before.x,position.y-before.y,position.z-before.z)<.00001)stalls++;
    if(stalls>4)break;
  }
  check(!path.length,`${label}: real controller reaches path end (${path.length} remain, ${stalls} stalls)`);
  check(Math.hypot(position.x-end.x,position.z-end.z)<.3&&Math.abs(position.y-end.y)<.1,`${label}: real controller arrives on exact floor`);
}
const routes=[];
for(let a=0;a<stations.length;a++)for(let b=0;b<stations.length;b++)if(a!==b)routes.push({from:a,to:b,points:validateRoute(stations[a],stations[b],japan,[],`Japan ${a}→${b}`)});
for(let a=0;a<stations.length;a++)for(let b=0;b<stations.length;b++)if(a!==b)validateController(stations[a],stations[b],japan,[],`Japan controller ${a}→${b}`);
const egypt=[flat(-14,14,-7,19,0),ramp(-1.6,1.6,-13,-7,-3,0),flat(-7,7,-19,-13,-3)];
const egyptWalls=[{minX:-7.3,maxX:-7,minZ:-19,maxZ:-13,minY:-3,maxY:1},{minX:7,maxX:7.3,minZ:-19,maxZ:-13,minY:-3,maxY:1}];
const entry={x:0,y:0,z:17},crypt={x:4,y:-3,z:-16};
routes.push({from:'Egypt entry',to:'crypt',points:validateRoute(entry,crypt,egypt,egyptWalls,'Egypt underground')});
routes.push({from:'Egypt crypt',to:'entry',points:validateRoute(crypt,entry,egypt,egyptWalls,'Egypt exit')});
// Same XZ targets on disconnected floors must never be mistaken for arrival.
const stacked=[flat(-2,2,-2,2,0),flat(-2,2,-2,2,3.8)];
check(findPath({x:0,y:0,z:0},{x:0,y:3.8,z:0},[],{surfaces:stacked}).length===0,'Disconnected stacked floors have no route');
const edge={x:1.95,y:3.8,z:0};moveWithCollision(edge,3,0,[],.34,{surfaces:stacked});
check(edge.x<=2.00001&&edge.y===3.8,'Upper-floor edge does not fall or teleport to ground');
check(blocked(0,0,[{minX:-1,maxX:1,minZ:-1,maxZ:1}],.34,{surfaces:stacked,y:0}),'Legacy collider blocks the ground floor');
check(!blocked(0,0,[{minX:-1,maxX:1,minZ:-1,maxZ:1}],.34,{surfaces:stacked,y:3.8}),'Legacy collider does not block above its height');
check(blocked(0,0,[],.34,{surfaces:[flat(-2,2,-2,2,0),flat(-2,2,-2,2,1.8)],y:0}),'Low floor ceiling blocks standing');
check(!blocked(0,0,[],.34,{surfaces:stacked,y:0}),'Full-height floor clearance remains walkable');
check(resolveSurfaceHeight({x:0,y:7.6,z:0},{surfaces:stacked})===null,'Support resolution never changes entire floors');
check(resolveSurfaceHeight({x:0,y:0,z:0},{surfaces:[]})===null,'Explicit empty surfaces blocks void');
check(resolveSurfaceHeight({x:0,y:0,z:0},{surfaces:[],legacyGround:true})===0,'Optional legacy ground works');
const upperObstacle={minX:-.5,maxX:.5,minZ:-.5,maxZ:.5,minY:3.8,maxY:5.8};
check(!blocked(0,0,[upperObstacle],.34,{surfaces:stacked,y:0}),'Upper-floor obstacle does not affect floor below');
check(blocked(0,0,[upperObstacle],.34,{surfaces:stacked,y:3.8}),'Upper-floor obstacle blocks its floor');
// Thin walls and diagonal corners are sampled throughout path edges.
const thin={minX:-.02,maxX:.02,minZ:-1,maxZ:1,minY:0,maxY:3};
check(!canTraverse({x:-1,y:0,z:0},{x:1,y:0,z:0},[thin],{surfaces:[flat(-2,2,-2,2,0)]}),'Traversal cannot tunnel through a thin wall');
const diagonalBox={minX:0,maxX:1,minZ:-1,maxZ:0,minY:0,maxY:2},diagonalOptions={surfaces:[flat(-2,2,-2,2,0)]};
check(!canTraverse({x:-.35,y:0,z:.325},{x:-.33,y:0,z:.345},[diagonalBox],diagonalOptions),'Swept collision rejects tiny diagonal corner cut');
const diagonalPosition={x:-.35,y:0,z:.325};moveWithCollision(diagonalPosition,.02,.02,[diagonalBox],.34,diagonalOptions);
check(!(diagonalPosition.x>-.34&&diagonalPosition.z>.34),'Manual movement slides instead of cutting the collider corner');
const thinGap=[flat(-1,.21,-1,1,0),flat(.24,1,-1,1,0)];
check(!canTraverse({x:0,y:0,z:0},{x:.5,y:0,z:0},[],{surfaces:thinGap}),'A sub-grid support gap blocks traversal');
const beforeGap={x:.19,y:0,z:0};moveWithCollision(beforeGap,.08,0,[],.34,{surfaces:thinGap});
check(beforeGap.x<=.21,'Movement cannot step across an unsupported sliver');
const disconnected=[flat(-1,-.01,-1,-.01,0),flat(.01,1,.01,1,0)];
check(findPath({x:-.5,y:0,z:-.5},{x:.5,y:0,z:.5},[],{surfaces:disconnected,maxSnapDistance:.2}).length===0,'Diagonal void corner cannot be cut');
check(segmentBoxIntersection({x:0,y:1,z:4},{x:0,y:1,z:-4},{minX:-1,maxX:1,minZ:-1,maxZ:1,minY:0,maxY:2})===.375,'3D camera segment intersects at expected fraction');
check(segmentBoxIntersection({x:0,y:4,z:4},{x:0,y:4,z:-4},{minX:-1,maxX:1,minZ:-1,maxZ:1,minY:0,maxY:2})===null,'Camera segment clears upper edge');
const mutableColliders=[],mutableOptions={surfaces:[flat(-2,2,-2,2,0)]},left={x:-1,y:0,z:0},right={x:1,y:0,z:0};
check(findPath(left,right,mutableColliders,mutableOptions).length>0,'Static cache initially records walkable route');
mutableColliders.push({minX:-.1,maxX:.1,minZ:-3,maxZ:3,minY:0,maxY:2});
check(findPath(left,right,mutableColliders,mutableOptions).length===0,'Collider count changes invalidate static cache');
mutableColliders[0].minZ=4;mutableColliders[0].maxZ=5;mutableOptions.cacheVersion=1;
check(findPath(left,right,mutableColliders,mutableOptions).length>0,'cacheVersion invalidates in-place geometry edits');
mutableColliders[0].minZ=-3;mutableColliders[0].maxZ=3;clearNavigationCache(mutableOptions);
check(findPath(left,right,mutableColliders,mutableOptions).length===0,'Explicit cache clear invalidates in-place geometry edits');
mutableColliders[0].minZ=4;mutableColliders[0].maxZ=5;mutableOptions.cache=false;
check(findPath(left,right,mutableColliders,mutableOptions).length>0,'Caching can be disabled for dynamic geometry');
const legacy=findPath({x:-2,z:0},{x:2,z:0},[],null);check(legacy.length>0&&!('y' in legacy[0]),'Null options preserve legacy 2D path shape');
const legacyPosition={x:0,y:1,z:0};moveWithCollision(legacyPosition,1,0,[],.34,null);check(legacyPosition.y===1&&Math.abs(legacyPosition.x-1)<1e-5,'Legacy move leaves y unchanged');
console.log(JSON.stringify({passed:true,checks,routes},null,2));
})();
