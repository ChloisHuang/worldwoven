const groundRaisedProbe=require('./fixtures/ground-raised-probe.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');const root=path.join(process.env.CULTURAL_GAME_ROOT||process.cwd(),'source'),cache=new Map();function mod(f){if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}const linker=(s,f)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(f.identifier),s.split('?')[0]));async function load(f){const m=mod(root+'/game/'+f);if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{const {createAutomaticDoors}=await load('automatic-doors.js'),{moveWithCollision}=await load('navigation.js'),{resolveCameraPosition,buildCameraSolids}=await load('camera.js'),T=mod(root+'/vendor/three/build/three.module.js').namespace,reports=[];
for(const[id,file,fn]of[['japan','japan-bathhouse.js','buildJapan'],['china','regions-east.js','buildChina'],['egypt','egypt-temple.js','buildEgypt'],['france','regions-west.js','buildFrance']]){
 const lot=(await load(file))[fn](),doors=createAutomaticDoors(lot,id),staticSolids=buildCameraSolids(lot),multi=!!lot.heightAware||id==='japan'||id==='egypt',opts=multi?{surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4}:{bounds:lot.bounds,multilevel:false};let samples=0,cameraSweeps=0;
 const flatHeight=(x,z)=>{let y=.015;for(const s of[...(lot.walkableSurfaces||[]),...(lot.group.userData.rugSurfaces||[])])if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)y=Math.max(y,s.y);return y;};
 const legacyIds=new Set(['japan-guest-shoji','cn-hall-front','cn-bedroom-front','egypt-private-suite-door','france-palace-front','france-bedroom-enfilade','france-private-bath']);
 for(const d of doors.getState().filter(d=>legacyIds.has(d.id)))for(const lateral of[-.35,0,.35])for(const sign of[-1,1]){
  const p={x:d.center[0]+(d.axis==='z'?sign*1.05:lateral),y:multi?(lot.levels||[]).reduce((y,l)=>Math.abs(l.y-d.center[1])<Math.abs(y-d.center[1])?l.y:y,0):d.center[1],z:d.center[2]+(d.axis==='x'?sign*1.05:lateral)};if(lot.heightAware){const q=groundRaisedProbe(lot,[p.x,d.center[1],p.z]);p.y=q[1];}
  doors.update(0,[p]);
  // A restore inside a wide hinge's swept arc must have an escape, rather than
  // making the leaf teleport through the actor. Retreat, then approach normally.
  const normalDistance=()=>Math.abs(d.axis==='z'?p.x-d.center[0]:p.z-d.center[2]);
  let retreat=0;const safeApproach=(d.id==='france-bedroom-enfilade'&&sign>0||d.id==='france-private-bath'&&sign<0)?1.45:Math.max(1.05,d.width/2+.8);
  while(normalDistance()<safeApproach-1e-6&&retreat++<300){doors.update(.016,[{position:p,radius:.34,height:1.95}]);const remaining=Math.min(.06,safeApproach-normalDistance()),dx=d.axis==='z'?sign*remaining:0,dz=d.axis==='x'?sign*remaining:0,before={...p},delta=doors.constrainMove(p,dx,dz,.34);moveWithCollision(p,delta.dx,delta.dz,lot.colliders,.34,opts);assert(Math.hypot(p.x-before.x,p.z-before.z)>.001,id+'/'+d.id+' restored actor has retreat escape');if(!multi)p.y=flatHeight(p.x,p.z);}
  assert(retreat<300,'retreat completes');
  // Near activation deliberately permits a short natural wait. Retain the
  // original other-side destination, adding at most 1.2 seconds of wait budget.
  let consecutiveWait=0;
  for(let n=0;n<Math.ceil((safeApproach+1.15)/.03)+75&&(d.axis==='z'?p.x-d.center[0]:p.z-d.center[2])*sign>-1.15;n++){
   const before={...p};doors.update(.016,[{position:p,radius:.34,height:1.95}]);const delta=doors.constrainMove(p,d.axis==='z'?-sign*.03:0,d.axis==='x'?-sign*.03:0,.34);moveWithCollision(p,delta.dx,delta.dz,lot.colliders,.34,opts);if(!multi)p.y=flatHeight(p.x,p.z);samples++;
   consecutiveWait=Math.hypot(p.x-before.x,p.z-before.z)<1e-7?consecutiveWait+.016:0;assert(consecutiveWait<=1.2+1e-8,id+'/'+d.id+' bounded near-door wait exceeded');
   if(n%10===0){const solids=staticSolids.concat(doors.cameraColliders),target=new T.Vector3(p.x,p.y+1.45,p.z);for(const yaw of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const desired=target.clone().add(new T.Vector3(Math.sin(yaw)*4.4,1,Math.cos(yaw)*4.4)),camera=resolveCameraPosition(target,desired,solids);assert(!solids.some(b=>camera.x>b.minX+.005&&camera.x<b.maxX-.005&&camera.y>b.minY+.005&&camera.y<b.maxY-.005&&camera.z>b.minZ+.005&&camera.z<b.maxZ-.005),id+'/'+d.id+' camera intersects door or wall');cameraSweeps++;}}
  }
  const normal=d.axis==='z'?p.x-d.center[0]:p.z-d.center[2];assert(normal*sign<-.95,id+'/'+d.id+' actual threshold blocked at '+JSON.stringify(p));
 }
 reports.push({id,doors:doors.getState().filter(d=>legacyIds.has(d.id)).map(d=>({id:d.id,motion:d.motion,style:d.style})),actualThresholdMovementSamples:samples,cameraSweeps});doors.dispose();lot.group.traverse(o=>o.geometry?.dispose());
}
assert.deepEqual(Object.fromEntries(reports.map(x=>[x.id,x.doors.length])),{japan:1,china:2,egypt:1,france:3},'original seven doors retained; all added openings separately covered by authored-threshold-probes-v3.cjs');console.log(JSON.stringify({status:'PASS',regions:reports,scope:'Authored door placement and actual lot-controller bidirectional crossing tests; not browser rendering'},null,2));})().catch(e=>{console.error(e);process.exit(1)});
