// Reproduces officials meeting on the real bureau stair after one life route
// turns downhill before rejoining an upstairs bed route. The bounded retreat
// can stop fractionally below 0.15 m; tiny retries must not reset body recovery.
// Uses only the local bureau, actual geometry, route planner and route follower.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),context=vm.createContext({console,structuredClone,Float32Array,Uint32Array,Uint16Array,Uint8Array}),cache=new Map();
function mod(file){file=file.split('?')[0];if(cache.has(file))return cache.get(file);let s=fs.readFileSync(file,'utf8');if(file.endsWith('/regions-east.js'))s+='\nexport {palaceWall,palaceCeiling,palaceRoof,beam,boundBook,foldedCloth,packStatic};';const m=new vm.SourceTextModule(s,{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(base,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const r=mod(path.join(base,'game/regions-east.js'));await r.link(linker);await r.evaluate();
 const G=cache.get(path.join(base,'game/geometry.js')).namespace,H=r.namespace,T=G.THREE;
 const bureau=cache.get(path.join(base,'game/china-official-bureau.js')).namespace,B=bureau.CHINA_OFFICIAL_BUREAU;
 const nav=mod(path.join(base,'game/navigation.js'));if(nav.status==='unlinked')await nav.link(linker);if(nav.status==='linked')await nav.evaluate();
 const group=new T.Group(),roofGroup=new T.Group(),colliders=[],cameraColliders=[],walkableSurfaces=[{minX:14,maxX:29,minZ:23,maxZ:38,y:.115}],characterFootSurfaces=[],stairways=[],interiorRooms=[],doorways=[],explorationTargets=[],buildings=[],levels=[],lightingZones=[];
 const C={wood:0x805137,dark:0x50362d,red:0xac3b2d,gold:0xd7af56,cream:0xdbc5a0};
 const door=(id,name,axis,at,from,to,top,rooms,bottom)=>{doorways.push({id,name,axis,at,from,to,top,rooms,bottom});return {id,from,to,top,bottom};};
 const solid3=(g,x,y,z,w,h,d,color)=>{G.box(g,x,y,z,w,h,d,color);colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y-h/2,maxY:y+h/2});};
 const result=bureau.buildChinaOfficialBureau(G,{H,C,group,roofGroup,colliders,cameraColliders,walkableSurfaces,characterFootSurfaces,stairways,interiorRooms,doorways,explorationTargets,buildings,levels,lightingZones,palaceWall:H.palaceWall,door,upperFixture(){},solid3});
 // Exact adjacent palace wall and its wider lower trim, without a full scene.
 colliders.push({minX:28.615,maxX:29.385,minZ:23,maxZ:38,minY:0,maxY:.7},{minX:28.675,maxX:29.325,minZ:23,maxZ:38,minY:.7,maxY:4.8},{minX:14,maxX:29,minZ:37.615,maxZ:38.385,minY:0,maxY:.7},{minX:14,maxX:29,minZ:37.675,maxZ:38.325,minY:.7,maxY:4.8});
 // Neighboring cherry trunk, bamboo planter and welcoming bench retain their
 // production footprints while the route exits north of the bureau.
 colliders.push({minX:21.8005,maxX:22.1995,minZ:26.8005,maxZ:27.1995},{minX:26.9,maxX:27.7,minZ:23.6,maxZ:24.4},{minX:16.5,maxX:21.5,minZ:29.24,maxZ:29.96});
 const options={gridStep:.5,surfaces:walkableSurfaces,legacyGround:false,bounds:{minX:14,maxX:29,minZ:23,maxZ:38},bodyHeight:1.95,maxStep:.4,radius:.39,pathRadius:.39};
 const point=p=>({x:p[0],y:p[1],z:p[2]});

 const actorsModule=mod(path.join(base,'game/actor-navigation.js'));if(actorsModule.status==='unlinked')await actorsModule.link(linker);if(actorsModule.status!=='evaluated')await actorsModule.evaluate();const AN=actorsModule.namespace;
 const routingModule=mod(path.join(base,'game/automatic-routing.js'));if(routingModule.status==='unlinked')await routingModule.link(linker);if(routingModule.status!=='evaluated')await routingModule.evaluate();
 const stairY=z=>B.stair.y+(B.stair.endY-B.stair.y)*(z-B.stair.minZ)/(B.stair.maxZ-B.stair.minZ);
 const people=[35.5,34.8,34.1].map((z,i)=>({station:{id:['a','b','c'][i]},root:{position:{x:26.92,y:stairY(z),z},rotation:{y:0}},route:[],locomotion:{walkSpeed:1.8},walking:false,index:0}));
 const router=routingModule.namespace.createAutomaticRouting({doors:[],staticColliders:colliders,planningColliders:[],getSweepBoxes:()=>[],requestOpen(){},getVersion:()=>0});
 const moveActor=(actor,dx,dz,r,probeOnly=false)=>AN.moveActorWithCollision(actor,dx,dz,r,{doors:router,colliders,navigation:options,npcs:people,playerPosition:null,probeOnly});
 moveActor.probeBodyRecovery=(actor,dx,dz,r)=>moveActor(actor,dx,dz,r,true);
 // Two still-ascending rest journeys meet a reselected rest journey that first
 // follows publicExit down from the lower ramp, then rejoins the public ascent.
 people.forEach((n,i)=>{const bed=result.additionalFurniture[i+2];n.path=[...(i===2?[...B.stairRoute.slice(0,4)].reverse().concat(B.stairRoute):B.stairRoute.slice(4)),bed.position];n.bed=bed.id;n.route=router.planPath(n.root.position,point(n.path[0]),options,.25);});
 let ticks=0;
 for(;ticks<1600&&people.some(n=>!n.arrived);ticks++){
  AN.beginActorNavigationStep(.05);
  for(const n of people){
   if(n.arrived)continue;const target=n.path[n.index],p=n.root.position;
   if(Math.hypot(p.x-target[0],p.z-target[2])<.14&&Math.abs(p.y-target[1])<.32){
    if(++n.index===n.path.length){n.arrived=true;n.route=[];n.walking=false;continue;}
    n.route=router.planPath(p,point(n.path[n.index]),options,.25);continue;
   }
   const before={...p};n.lastStep=AN.followActorRoute(n,.05,{doors:router,moveActor,npcs:people,speedScale:.78});
   assert(Math.hypot(p.x-before.x,p.z-before.z)<.08,'all recovery movement stays continuous');
   assert(!nav.namespace.blocked(p.x,p.z,colliders,.25,{...options,y:p.y}),'recovery preserves stair walls and supports');
  }
 }
 const actors=people.map(n=>({id:n.station.id,bed:n.bed,arrived:!!n.arrived,position:n.root.position,index:n.index,next:n.route[0],travel:n.lastStep}));
 assert(people.every(n=>n.arrived),'opposing stair traffic must recover and reach separate bed approaches: '+JSON.stringify(actors));
 router.dispose();
 console.log(JSON.stringify({status:'PASS',scope:'local official stair counterflow, real geometry and movement',seconds:ticks*.05,actors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
