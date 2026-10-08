// Actual China meshes/colliders and production door/path planner, scoped to the
// two original cleaning approaches. No production main, crowd or browser claim.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {buildChina}=await load('game/regions-east.js'),{createAutomaticDoors}=await load('game/automatic-doors.js'),
  N=await load('game/navigation.js'),T=await load('vendor/three/build/three.module.js'),
  {TAVERN_TABLE_CLEANING_POINTS:points,TAVERN_TABLE_LAYOUT:tables}=await load('game/china-tavern-layout.js'),
  {TAVERN_RECRUITMENT_TABLES}=await load('game/china-tavern-recruitment.js');
 assert.strictEqual(TAVERN_RECRUITMENT_TABLES,points,'NPC trials use the shared authored points');
 const lot=buildChina(),doors=createAutomaticDoors(lot,'china'),nav={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
 const old=[[19.75,.215,13.65],[22.25,.215,17.65]],routes=[];
 for(const radius of [.25,.34]){
  const actor={station:{id:radius===.25?'cn-tavern-diner-west':'player'},root:new T.Group(),collisionRadius:radius,route:[]};
  actor.root.position.set(22.35,.215,6.7);
  for(const [index,point] of points.entries()){
   assert(N.blocked(old[index][0],old[index][2],lot.colliders,radius,{...nav,y:old[index][1]}),'old approach really overlaps original table at radius '+radius);
   assert(!N.blocked(point.position[0],point.position[2],lot.colliders,radius,{...nav,y:point.position[1]}),'new shared approach must fit body '+point.id+' '+radius);
   const table=tables[index];assert.equal(point.position[2],table.z);assert.equal(point.workTarget[2],table.z);
   assert(Math.abs(point.position[0]-table.x)>1.45/2+radius,'body is completely outside original table edge');
   assert(Math.abs(point.workTarget[0]-table.x)<1.45/2,'hand target remains on original tabletop');
   assert(Math.abs(Math.hypot(point.position[0]-point.workTarget[0],point.position[2]-point.workTarget[2])-.55)<1e-9);
   const target=new T.Vector3(...point.position),route=doors.planPath(actor.root.position,target,nav,radius),waypoints=route.length;
   assert(waypoints,'actual production planPath reaches '+point.id+' at radius '+radius);
   let frames=0;
   while(route.length&&frames++<1200){
    doors.update(.05,[actor]);const goal=doors.routeStep(route,actor.root.position,.035)?.waypoint;if(!goal)continue;
    const dx=goal.x-actor.root.position.x,dz=goal.z-actor.root.position.z,d=Math.hypot(dx,dz);if(d<.001)continue;
    const step=Math.min(.065,d)/d,move=doors.constrainMove(actor.root.position,dx*step,dz*step,radius);
    N.moveWithCollision(actor.root.position,move.dx,move.dz,lot.colliders,radius,nav);
    assert(!N.blocked(actor.root.position.x,actor.root.position.z,lot.colliders,radius,{...nav,y:actor.root.position.y}),'actual movement never enters table/wall');
   }
   assert(frames<1200,'collision movement reaches '+point.id);assert(actor.root.position.distanceTo(target)<.08);
   const from={x:point.position[0],y:point.position[1]+1.45,z:point.position[2]},to={x:point.workTarget[0],y:point.workTarget[1],z:point.workTarget[2]},
    blockers=[...(lot.cameraColliders||lot.colliders),...(doors.cameraColliders||[])].map(box=>({box,t:N.segmentBoxIntersection(from,to,box)})).filter(hit=>hit.t!==null&&hit.t<.995);
   assert.equal(blockers.length,0,'original work surface is visible: '+JSON.stringify(blockers));
   routes.push({id:point.id,radius,oldBlocked:true,position:point.position,workTarget:point.workTarget,waypoints,frames});
  }
 }
 doors.dispose();lot.group.traverse(o=>o.geometry?.dispose());
 console.log(JSON.stringify({status:'PASS',scope:'actual China geometry, two shared table work points, radii .25/.34, original collisions and production planPath; not main',routes}));
})().catch(error=>{console.error(error);process.exitCode=1;});
