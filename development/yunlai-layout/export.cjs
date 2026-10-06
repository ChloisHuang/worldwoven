const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=process.cwd(),out=path.resolve(process.env.OUT||'qa/room-layout-render');fs.mkdirSync(out,{recursive:true});
const load=require(root+'/tests/fixtures/browser-module-loader.cjs').createBrowserModuleLoader(root+'/source');
(async()=>{
 const T=await load('vendor/three/build/three.module.js'),lot=(await load('game/regions-east.js')).buildChina();
 const doors=(await load('game/automatic-doors.js')).createAutomaticDoors(lot,'china');
 lot.group.updateMatrixWorld(true);
 const report={source:root,created:new Date().toISOString(),scope:'Actual merged buildChina geometry including all floors, ceilings and roofs; automatic doors in default authored closed state. Offline material approximation only, no browser gameplay claim.',meshes:[],lights:[],doorStates:doors.getState(),rooms:lot.interiorRooms,files:{}};
 for(const f of ['china-royal-kitchen-building.js','china-tavern.js','china-public-toilet.js'])report.files[f]=crypto.createHash('sha256').update(fs.readFileSync(root+'/source/game/'+f)).digest('hex');
 let total=0;
 lot.group.traverse(o=>{
  if(o.userData.nightFixture){const p=o.getWorldPosition(new T.Vector3());report.lights.push({position:p.toArray(),...o.userData.nightFixture});}
  if(!o.isMesh)return;
  let geo=o.geometry.clone().applyMatrix4(o.matrixWorld);if(geo.index)geo=geo.toNonIndexed();
  const p=geo.attributes.position,n=geo.attributes.normal,c=geo.attributes.color,mat=o.material;
  if(Array.isArray(mat))throw Error('unexpected multimaterial');
  const arr=new Float32Array(p.count*9);
  for(let i=0;i<p.count;i++){arr[i*9]=p.getX(i);arr[i*9+1]=p.getY(i);arr[i*9+2]=p.getZ(i);arr[i*9+3]=n?n.getX(i):0;arr[i*9+4]=n?n.getY(i):1;arr[i*9+5]=n?n.getZ(i):0;arr[i*9+6]=mat.color.r*(c?c.getX(i):1);arr[i*9+7]=mat.color.g*(c?c.getY(i):1);arr[i*9+8]=mat.color.b*(c?c.getZ(i):1);}
  const file='mesh-'+report.meshes.length+'.bin';fs.writeFileSync(out+'/'+file,Buffer.from(arr.buffer));
  let names=[],par=o;while(par){if(par.name)names.push(par.name);par=par.parent;}
  report.meshes.push({file,name:names.reverse().join('/'),vertices:p.count,triangles:p.count/3,material:{type:mat.type,color:mat.color.toArray(),opacity:mat.opacity,transparent:mat.transparent,side:mat.side,emissive:mat.emissive?.toArray(),emissiveIntensity:mat.emissiveIntensity??0}});total+=p.count/3;geo.dispose();
 });
 const N=await load('game/navigation.js'),C=await load('game/camera.js'),solids=C.buildCameraSolids(lot).concat(doors.cameraColliders||[]);
 const requested=[
 {name:'dining-north',feet:[21,.215,15.4],yaw:0,pitch:.16,distance:5},
 {name:'dining-south',feet:[21,.215,16],yaw:Math.PI,pitch:.12,distance:5},
 {name:'inn-suite',feet:[19.65,4.015,16.8],yaw:1.5,pitch:.14,distance:3.1},
 {name:'second-floor-sign',feet:[22.5,4.015,8],yaw:0,pitch:.08,distance:2.3}
 ];
 report.cameras=requested.map(v=>{const target=new T.Vector3(v.feet[0],v.feet[1]+1.45,v.feet[2]);const desired=target.clone().add(new T.Vector3(Math.sin(v.yaw)*Math.cos(v.pitch)*v.distance,Math.sin(v.pitch)*v.distance,Math.cos(v.yaw)*Math.cos(v.pitch)*v.distance));const camera=C.resolveCameraPosition(target,desired,solids,.18);return {...v,actorBlocked:N.blocked(v.feet[0],v.feet[2],lot.colliders,.34,{y:v.feet[1],surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4}),camera:camera.toArray(),target:target.toArray(),actualDistance:camera.distanceTo(target),fov:50,aspect:1.6,near:camera.distanceTo(target)<.65?.04:.2};});
 report.cameras.push({"name": "inn-suite-wide", "camera": [19.7, 5.565, 11.7], "target": [18.0, 4.95, 17.7], "fov": 50, "aspect": 1.6, "near": 0.2, "mode": "Human eye-height corner review, no cutaway"});report.cameras.push({"name": "second-floor-sign-wide", "camera": [22.5, 5.565, 9.6], "target": [22.45, 6.25, 6.7], "fov": 50, "aspect": 1.6, "near": 0.2, "mode": "Human eye-height public hall review, no cutaway"});report.triangles=total;fs.writeFileSync(out+'/scene.json',JSON.stringify(report,null,2));console.log(JSON.stringify({out,meshes:report.meshes.length,triangles:total,lights:report.lights.length,cameras:report.cameras},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
