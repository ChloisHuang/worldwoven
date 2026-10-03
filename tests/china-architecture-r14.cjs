require('node:fs').mkdirSync('qa/r14-palace',{recursive:true});
// Original R14 audit assertions unchanged; only loader adapted to portable suite.
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const source=path.resolve(process.env.SOURCE_DIR||'source'),load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader(source);
(async()=>{
const T=await load('vendor/three/build/three.module.js'),{buildChina}=await load('game/regions-east.js');const N=await load('game/navigation.js');const F=await load('game/floor-support.js');const C=await load('game/camera.js');
const lot=buildChina();lot.group.updateMatrixWorld(true);const opts={bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4,pathRadius:.39};
const point=p=>({x:p[0],y:p[1],z:p[2]}),spawn=point(lot.spawn),report={source,failures:[],routes:[],doors:[],rays:[],cameraChecks:0,steps:0};
const check=(value,label,details)=>{if(!value)report.failures.push({label,...details});};
function walk(start,route,radius,label){const p={...start};for(const to of route){let k=0,stuck=0;while(Math.hypot(p.x-to.x,p.z-to.z)>.00001&&k++<6000){const dx=to.x-p.x,dz=to.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,.039),old={...p};N.moveWithCollision(p,dx/d*step,dz/d*step,lot.colliders,radius,opts);report.steps++;if(Math.hypot(old.x-p.x,old.z-p.z)<1e-6)stuck++;else stuck=0;if(stuck>4)break;}if(Math.hypot(p.x-to.x,p.z-to.z)>.06||Math.abs(p.y-to.y)>.10){check(false,'controller '+label,{p,to,radius});return p;}}return p;}
for(const t of lot.explorationTargets){const end=point(t.position);if(N.blocked(end.x,end.z,lot.colliders,.39,{...opts,y:end.y})){check(false,'blocked target',{id:t.id,end});continue;}
 for(const [a,b,direction]of[[spawn,end,'out'],[end,spawn,'back']]){const route=N.findPath(a,b,lot.colliders,opts);if(!route.length&&Math.hypot(a.x-b.x,a.z-b.z)<.01&&Math.abs(a.y-b.y)<.01)continue;if(!route.length){check(false,'missing route',{id:t.id,direction});continue;}for(const radius of[.34,.39]){const p=walk(a,route,radius,t.id+' '+direction);check(Math.hypot(p.x-b.x,p.z-b.z)<.1&&Math.abs(p.y-b.y)<.1,'missed target',{id:t.id,direction,radius,p,b});}report.routes.push({id:t.id,direction,points:route.length});}
 console.log('target',t.id,report.failures.length);
}
for(const d of lot.doorways){for(let u=d.from+.61;u<=d.to-.60;u+=.48){const a=[...d.a],b=[...d.b];a[d.axis==='x'?0:2]=u;b[d.axis==='x'?0:2]=u;
 for(const [start,end]of[[a,b],[b,a]])for(const radius of[.34,.39]){const p=walk(point(start),[point(end)],radius,d.id+' '+u);check(Math.hypot(p.x-end[0],p.z-end[2])<.07,'door aperture',{id:d.id,u,radius,start,end,p});report.doors.push({id:d.id,u,radius});}}
}
const meshes=[];lot.group.traverse(o=>{if(o.isMesh&&!o.material.transparent)meshes.push(o);});const ray=new T.Raycaster();
for(const s of lot.architectureProgram.stairways){for(const t of[.02,.18,.39,.61,.82,.98])for(const side of[-1,0,1]){const x=s.axis==='x'?s.minX+(s.maxX-s.minX)*t:(s.minX+s.maxX)/2+side*((s.maxX-s.minX)/2-.48),z=s.axis==='z'?s.minZ+(s.maxZ-s.minZ)*t:(s.minZ+s.maxZ)/2+side*((s.maxZ-s.minZ)/2-.48),y=s.y+(s.endY-s.y)*t;
 ray.set(new T.Vector3(x,y+.23,z),new T.Vector3(0,-1,0));const hits=ray.intersectObjects(meshes,false),hit=hits.find(h=>h.point.y<=y+.18&&h.point.y>=y-.22);check(!!hit,'real tread support',{id:s.id,x,y,z,hits:hits.slice(0,3).map(h=>h.point.y)});if(hit)report.rays.push({id:s.id,x,z,navY:y,actualY:hit.point.y,error:hit.point.y-y});
 const p={x,y:N.resolveSurfaceHeight({x,y,z},opts,lot.colliders)??y,z};check(!N.blocked(x,z,lot.colliders,.34,{...opts,y:p.y}),'stair body/head clearance',{id:s.id,p,side});
 const aim=new T.Vector3(x,y+1.45,z);for(const yaw of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const desired=aim.clone().add(new T.Vector3(Math.sin(yaw)*4.3,1,Math.cos(yaw)*4.3));const camera=C.resolveCameraPosition(aim,desired,lot.cameraColliders);check(camera.toArray().every(Number.isFinite),'finite stair camera',{id:s.id});check(!lot.cameraColliders.some(b=>camera.x>b.minX+.006&&camera.x<b.maxX-.006&&camera.y>b.minY+.006&&camera.y<b.maxY-.006&&camera.z>b.minZ+.006&&camera.z<b.maxZ-.006),'camera inside stair solid',{id:s.id,camera:camera.toArray()});report.cameraChecks++;}
}}
for(const t of lot.explorationTargets.filter(t=>/gallery|loft/.test(t.id))){const[x,y,z]=t.position;for(const[dx,dz]of[[0,0],[-.27,0],[.27,0],[0,-.27],[0,.27]]){ray.set(new T.Vector3(x+dx,y+.1,z+dz),new T.Vector3(0,-1,0));const hit=ray.intersectObjects(meshes,false)[0];check(hit&&Math.abs(hit.point.y-y)<.13,'upper floor footprint geometry',{id:t.id,dx,dz,hit:hit?.point.toArray()});}}
for(const s of lot.stations)for(const p of[s.position,s.npcPosition,...s.route||[]])check(!N.blocked(p[0],p[2],lot.colliders,.39,{...opts,y:p[1]}),'station NPC actual floor',{id:s.id,p});
report.counts={targets:lot.explorationTargets.length,doorways:lot.doorways.length,stairs:lot.architectureProgram.stairways.length,rooms:lot.interiorRooms.length,colliders:lot.colliders.length,surfaces:lot.walkableSurfaces.length};report.status=report.failures.length?'FAIL':'PASS';fs.writeFileSync('qa/r14-palace/architecture-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,routes:report.routes.length,doors:report.doors.length,rays:report.rays.length},null,2));process.exitCode=report.failures.length?1:0;

})().catch(error=>{console.error(error);process.exitCode=1;});
