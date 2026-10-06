// A toilet marker inside the fixture's own camera hull disappears even at its
// legal approach. Check only these five affected objects, not their service flows.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const T=await load('vendor/three/build/three.module.js'),C=await load('game/camera.js');
 const {createDailyToilet}=await load('game/daily-toilet.js'),{createAutomaticDoors}=await load('game/automatic-doors.js');
 const east=await load('game/regions-east.js'),west=await load('game/regions-west.js'),japan=await load('game/japan-bathhouse.js'),egypt=await load('game/egypt-temple.js');
 const cases=[['china',east.buildChina,[['china-daily-toilet','CHINA_DAILY_TOILET'],['china-public-toilet','CHINA_PUBLIC_TOILET']]],['japan',japan.buildJapan,[['japan-daily-toilet','JAPAN_DAILY_TOILET']]],['france',west.buildFrance,[['france-daily-toilet','FRANCE_DAILY_TOILET']]],['egypt',egypt.buildEgypt,[['egypt-daily-toilet','EGYPT_DAILY_TOILET']]]];
 for(const [country,build,facilities]of cases){
  if(process.argv[2]&&!process.argv[2].split(',').includes(country))continue;
  const lot=build(),doors=createAutomaticDoors(lot,country),solids=C.buildCameraSolids(lot).concat(doors.cameraColliders||[]);
  for(const [file,key]of facilities){
   const P=(await load('game/'+file+'.js'))[key],root=new T.Group();root.position.fromArray(P.approach);
   const service=createDailyToilet({facility:{...P,intentId:P.intentId||P.id,receiptSource:P.id},lot,doors,getPlayer:()=>({root})}),intent=service.intent();assert(intent,'actual fixture remains available '+P.id);
   const aim=root.position.clone().add(new T.Vector3(0,1.45,0)),yaw=Math.atan2(P.approach[0]-P.anchor[0],P.approach[2]-P.anchor[2]);
   const desired=aim.clone().add(new T.Vector3(Math.sin(yaw)*Math.cos(.15)*4.6,Math.sin(.15)*4.6,Math.cos(yaw)*Math.cos(.15)*4.6)),camera=new T.PerspectiveCamera(50,844/390,.04,100);
   camera.position.copy(C.resolveCameraPosition(aim,desired,solids,.18));camera.lookAt(aim);camera.updateMatrixWorld(true);
   const point=new T.Vector3(...intent.visualAnchor.point),hit=C.cameraDistanceToObstacle(camera.position,point,solids,0),distance=camera.position.distanceTo(point),projected=point.clone().project(camera);
   assert(hit>=distance-.3,'fixture self-occludes hand marker '+JSON.stringify({id:P.id,point:point.toArray(),camera:camera.position.toArray(),hit,distance}));
   assert(projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1,'hand marker in normal legal-approach view '+P.id);
   console.log('PASS',P.id,JSON.stringify({point:point.toArray(),camera:camera.position.toArray()}));service.dispose();
  }
  doors.dispose();lot.group.traverse(o=>{if(o.geometry)o.geometry.dispose();});
 }
})().catch(e=>{console.error(e);process.exitCode=1});
