// YL02/FB02: the old empty-scene approach test missed a live artist standing
// 8.5 cm from the south banquet landing. Keep authored actors and occupied
// chairs in the clearance checks, then use the actual shared route executor.
// This is geometry/navigation coverage, not browser or visual acceptance.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {buildChina}=await load('game/regions-east.js'),{createAutomaticDoors}=await load('game/automatic-doors.js'),N=await load('game/navigation.js'),A=await load('game/actor-navigation.js'),T=await load('vendor/three/build/three.module.js'),{createFurnitureInteractions}=await load('game/furniture-interactions.js'),{SALON_ARTISTS}=await load('game/china-tavern-salon-artists.js');
 const lot=buildChina(),doors=createAutomaticDoors(lot,'china'),furniture=createFurnitureInteractions(lot,'china');
 const nav={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
 const make=(id,p,r=.25)=>{const root=new T.Group();root.position.set(...p);return {station:{id},root,collisionRadius:r,bodyHeight:1.95,route:[],walking:false,locomotion:{walkSpeed:1.3}};};
 const artists=SALON_ARTISTS.map(a=>make(a.id,a.position));
 const allSeats=furniture.items.filter(s=>s.kind==='seat'&&s.id.startsWith('china-tavern-'));
 const publicSeats=allSeats.filter(s=>s.id!=='china-tavern-lobby-seat');
 const occupied=publicSeats.map(s=>make('occupied:'+s.id,s.anchor));
 const homeBodies=[...artists,...occupied];
 const box=n=>{const p=n.root.position,r=n.collisionRadius;return {minX:p.x-r,maxX:p.x+r,minY:p.y,maxY:p.y+n.bodyHeight,minZ:p.z-r,maxZ:p.z+r};};
 const aside=(a,i)=>{const p=a.position.slice(),offset=[[-.55,0],[-.55,0],[0,.55],[0,-.55]][i];p[0]+=offset[0];p[2]+=offset[1];return p;};
 const checks=[],routes=[];let totalFrames=0;
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
 const oldLanding=[23.11,7.815,19.54],oldPoetPause=[23.05,7.815,19.60],oldGap=distance(oldLanding,oldPoetPause);
 assert(oldGap<.09&&oldGap<.34+.25,'baseline banquet artist pause intersects player landing');
 for(const state of ['home',...SALON_ARTISTS.map(a=>a.id)]){
  const bodies=[...SALON_ARTISTS.map((a,i)=>make(a.id,state===a.id?aside(a,i):a.position)),...occupied];
  for(const seat of publicSeats){
   const other=bodies.filter(n=>n.station.id!=='occupied:'+seat.id);
   assert(!N.blocked(...[seat.position[0],seat.position[2]],lot.colliders,.34,{...nav,y:seat.position[1]}),seat.id+' static approach');
   const landing=furniture.standPoint(nav,[...doors.cameraColliders,...other.map(box)],seat,.34);
   assert(landing,`${state}: ${seat.id} occupied-seat get-up has a real body-clear landing`);
   for(const n of other)if(Math.abs(n.root.position.y-seat.position[1])<1)assert(landing.distanceTo(n.root.position)>=.34+n.collisionRadius-1e-6,`${state}: ${seat.id} get-up must not depend on timed body bypass`);
  }
  checks.push('occupied seat entry/get-up: '+state);
 }
 function run(label,specs,bodies=[]){
  const movers=specs.map((s,i)=>({...s,actor:make(s.id||'route-'+i,s.from,s.radius??.34)}));
  const people=[...bodies,...movers.map(m=>m.actor)];let bypasses=0,minBodyGap=Infinity;
  const context=()=>({doors,colliders:lot.colliders,navigation:nav,npcs:people,playerPosition:null});
  const move=(actor,dx,dz,r)=>{const result=A.moveActorWithCollision(actor,dx,dz,r,context());if(result.bodyBypassed)bypasses++;return result;};
  move.probeBodyRecovery=(actor,dx,dz,r)=>A.moveActorWithCollision(actor,dx,dz,r,{...context(),probeOnly:true});
  for(const m of movers){assert(!N.blocked(m.from[0],m.from[2],lot.colliders,m.actor.collisionRadius,{...nav,y:m.from[1]}),label+' legal fixture start');m.actor.route=doors.planPath(m.actor.root.position,new T.Vector3(...m.to),nav,m.actor.collisionRadius);assert(m.actor.route.length,label+' actual route for '+m.actor.station.id);}
  let frames=0;
  for(;frames<1800&&movers.some(m=>m.actor.route.length);frames++){
   A.beginActorNavigationStep(.05);doors.update(.05,people);
   for(const m of movers){const n=m.actor,before=n.root.position.clone();if(n.route.length)A.followActorRoute(n,.05,{doors,moveActor:move,npcs:people,radius:n.collisionRadius,arrivalTolerance:.035});else n.walking=false;
    assert(before.distanceTo(n.root.position)<=.10,label+' continuous movement');
    assert(!N.blocked(n.root.position.x,n.root.position.z,lot.colliders,n.collisionRadius,{...nav,y:n.root.position.y}),label+' static collision at '+n.root.position.toArray());
    for(const other of people)if(other!==n&&Math.abs(n.root.position.y-other.root.position.y)<1){const gap=Math.hypot(n.root.position.x-other.root.position.x,n.root.position.z-other.root.position.z)-n.collisionRadius-other.collisionRadius;minBodyGap=Math.min(minBodyGap,gap);assert(gap>=-1e-5,label+' overlapping '+n.station.id+' with '+other.station.id);}
   }
  }
  assert(frames<1800,label+' stalled '+JSON.stringify(movers.map(m=>({id:m.actor.station.id,position:m.actor.root.position.toArray(),to:m.to,route:m.actor.route.length}))));
  for(const m of movers)assert(m.actor.root.position.distanceTo(new T.Vector3(...m.to))<.12,label+' endpoint');
  assert.equal(bypasses,0,label+' no timed body bypass is accepted as spacing evidence');
  totalFrames+=frames;routes.push({label,frames,minBodyGap:+minBodyGap.toFixed(4),bypasses});
 }
 for(const seat of allSeats)run('public hall to '+seat.id,[{from:[22.7,seat.position[1],9.15],to:seat.position}],homeBodies);
 for(const [i,a]of SALON_ARTISTS.entries()){
  const others=homeBodies.filter(n=>n.station.id!==a.id),rest=aside(a,i);
  run(a.id+' local pause',[{id:a.id,from:a.position,to:rest,radius:.25}],others);
  run(a.id+' pause return',[{id:a.id,from:rest,to:a.position,radius:.25}],others);
  run(a.id+' invitation to reception',[{id:a.id,from:a.position,to:[22.85,7.815,7.65],radius:.25}],others);
  run(a.id+' actual home return',[{id:a.id,from:[22.85,7.815,7.65],to:a.position,radius:.25}],others);
  run(a.id+' visitor approach',[{from:[22.7,7.815,9.15],to:[a.position[0],a.position[1],a.position[2]-.9]}],homeBodies);
 }
 run('occupied top east aisle',[{from:[24.8,7.815,10.95],to:[25.05,7.815,19.85]}],homeBodies);
 run('occupied top cross-room arch',[{from:[20.0,7.815,16.3],to:[24.9,7.815,16.3]}],homeBodies);
 run('occupied ground central service spine',[{from:[21,.215,20],to:[21,.215,11.3]}],homeBodies);
 run('opposing ground player and server',[{id:'player-route',from:[21,.215,20],to:[21,.215,11.3]},{id:'server-route',from:[21,.215,11.3],to:[21,.215,20],radius:.25}],homeBodies);
 run('opposing top east aisle',[{id:'player-route',from:[25.0,7.815,11.3],to:[25.0,7.815,16.3]},{id:'guest-route',from:[25.0,7.815,16.3],to:[25.0,7.815,11.3],radius:.25}],homeBodies);
 run('opposing top cross-room arch',[{id:'player-route',from:[20.0,7.815,16.3],to:[24.9,7.815,16.3]},{id:'artist-route',from:[24.9,7.815,16.3],to:[20.0,7.815,16.3],radius:.25}],homeBodies);
 doors.dispose();furniture.dispose?.();
 console.log(JSON.stringify({status:'PASS',scope:'Real constructed Yunlai geometry, all public chair approaches, occupied-chair get-up, all four artist homes/pauses/invitation/return, occupied aisles and simultaneous counterflow; no simulated browser/visual claim',baseline:{banquetInteriorWidth:3.38,banquetTableSideStrips:[1.06,.96],oldSouthSeatLanding:oldLanding,oldPoetPause,oldGap,requiredPlayerNPCGap:.59},checks,totalFrames,routes},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
