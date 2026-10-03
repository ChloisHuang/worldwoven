// One bounded Japan scene for the two kitchen staff only. Resume visitors at
// their legal post-bath dining stage; do not replay previously verified baths.
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=path.resolve('source'),worldSeed=17,out=process.env.OUT_DIR;
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{buildJapan}=await import('../source/game/japan-bathhouse.js'),{createAutomaticDoors}=await import('../source/game/automatic-doors.js'),{createFurnitureInteractions}=await import('../source/game/furniture-interactions.js'),{createCharacter}=await import('../source/game/characters.js'),{npcRoleAppearance}=await import('../source/game/appearance.js'),{createJapanBathhouseOperations}=await import('../source/game/japan-bathhouse-operations.js'),{japanVisitorStation}=await import('../source/game/japan-visitors.js'),{moveWithCollision}=await import('../source/game/navigation.js'),F=await import('../source/game/floor-support.js');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner','One actual Japan scene under owner resource window');
const lot=buildJapan(),furniture=createFurnitureInteractions(lot,'japan'),doors=createAutomaticDoors(lot,'japan'),options={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
const npcs=lot.stations.map((station,i)=>actor(station,npcRoleAppearance('japan',station.id,worldSeed),i));
function actor(station,look,i){const verb=station.npcAction||'tea',style=/cook|sushi|knead|bake|bread|ramen/.test(verb)?'chef':/paint|draw|calligraphy|craft/.test(verb)?'artist':/garden/.test(verb)?'gardener':'casual';const n=createCharacter({...look,style,culture:'japan',scale:.96});n.station=station;n.characterScale=.96;n.phase=i*6.7;n.root.position.set(...station.npcPosition);n.home=n.root.position.clone();n.route=[];lot.group.add(n.root);return n;}
function moveActor(n,dx,dz,r){const before=n.root.position.clone(),v=doors.constrainMove(before,dx,dz,r);moveWithCollision(n.root.position,v.dx,v.dz,lot.colliders,r,options);const actual=doors.constrainMove(before,n.root.position.x-before.x,n.root.position.z-before.z,r);if(Math.abs(actual.dx-(n.root.position.x-before.x))>1e-5||Math.abs(actual.dz-(n.root.position.z-before.z))>1e-5){n.root.position.copy(before);moveWithCollision(n.root.position,actual.dx,actual.dz,lot.colliders,r,options);}}
function poseContext(n,station){const p=n.root.position,target=station?.workTarget;return {visualFloorOffset:F.characterFloorOffsetAt(lot,p.x,p.y,p.z),groundHeightAt:(x,z)=>F.visualSupportHeight(lot,x,z,n.root.position.y,true),footprintHeightAt:(a,b,c,d)=>F.footprintSupportHeight(lot,a,b,c,d,n.root.position.y,true),workHeight:target?(target[1]-p.y)/.96:undefined,workDistance:target?Math.hypot(target[0]-p.x,target[2]-p.z)/.96:undefined};}
function changeWardrobe(n,look){const position=n.root.position.clone(),yaw=n.root.rotation.y;n.dispose();n.root.removeFromParent();Object.defineProperties(n,Object.getOwnPropertyDescriptors(createCharacter({...look,culture:'japan',scale:.96})));n.root.position.copy(position);n.root.rotation.y=yaw;lot.group.add(n.root);}
const {createJapanServiceOrders}=await import('../source/game/japan-service-orders.js'),{createJapanVisitorIdentity}=await import('../source/game/japan-visitors.js');
const seed=createJapanServiceOrders({worldSeed}),seats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===3.8&&i.center[2]===7.55);
for(let i=0;i<2;i++)seed.spawn({...createJapanVisitorIdentity(seed.nextIdentity(),worldSeed),restPoint:seats[i].anchor,diningPoint:seats[i].anchor,servePoint:[seats[i].position[0]+.7,seats[i].position[1],seats[i].position[2]-.12],restSeatId:seats[i].id});
let saved={...seed.state(),staffLife:{version:1,next:0,dueIn:0}};
// These are the existing durable post-bath fields, with no borrowed locks.
for(const v of saved.visits){v.stage='waiting-meal';v.tokenId=v.id+':token';v.mixtureId=v.id+':mixture';v.mealRequested=true;saved.items.push({id:v.tokenId,visitId:v.id,tokenId:v.tokenId,kind:'token',blendId:v.blendId,location:{type:'guest',id:v.id}},{id:v.mixtureId,visitId:v.id,tokenId:v.tokenId,kind:'mixture',blendId:v.blendId,location:{type:'used',id:v.poolId}});}
const resume=process.env.RESUME_STAFF_CONFLICT==='1';
if(resume){
 saved.staffLife={version:1,next:1,dueIn:0,completed:1};
 const changing=saved.visits[1];changing.stage='changing';changing.mealRequested=false;changing.position=[8,3.8,-10.5];
 saved.items.find(i=>i.id===changing.mixtureId).location={type:'point',id:changing.side+'Service'};
 npcs.find(n=>n.station.id==='jp-ramen').root.position.set(6.5,3.8,-3.5);
 npcs.find(n=>n.station.id==='jp-sushi').root.position.set(3.35,0,-12.15);
 const {canTraverse}=await import('../source/game/navigation.js'),origin={x:6.5,y:3.8,z:-5.5};
 const probe=[5.67,7.33].map(x=>({x,sameFloor:true,clear:canTraverse(origin,{x,y:3.8,z:-5.5},lot.colliders,{...options,radius:.25}),obstacles:lot.colliders.filter(c=>c.minX<x+.25&&c.maxX>x-.25&&c.minZ<-5.25&&c.maxZ>-5.75&&(c.minY??0)<5.75&&(c.maxY??20)>3.82).map(c=>({minX:c.minX,maxX:c.maxX,minZ:c.minZ,maxZ:c.maxZ,minY:c.minY,maxY:c.maxY}))}));
 console.log(JSON.stringify({conflictSideStepProbe:probe}));assert.ok(probe.every(p=>!p.clear),'Original collision has no same-floor side step');
}
const initialIds=saved.visits.filter(v=>v.stage==='waiting-meal').map(v=>v.id),looks=npcs.filter(n=>['jp-ramen','jp-sushi','jp-omamori'].includes(n.station.id)).map(n=>({id:n.station.id,appearance:JSON.stringify(n.root.userData.appearance)}));
const routine=createJapanBathhouseOperations({npcs,lot,furniture,doors,moveActor,poseContext,changeWardrobe,worldSeed,saved,planPath:(a,b,r)=>doors.planPath(a,b,options,r),saveState:s=>saved=s,createVisitor:v=>{const n=actor(japanVisitorStation(v),v.appearance,v.number);npcs.push(n);return n;},removeVisitor:n=>{npcs.splice(npcs.indexOf(n),1);n.root.removeFromParent();n.dispose();}});
let renderer,canvas,camera,scene;const captured=new Set(),frames=[],contacts=[];
if(out){fs.mkdirSync(out,{recursive:true});const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,720);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(960,720,false);renderer.outputColorSpace=T.SRGBColorSpace;scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.add(lot.group,new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85));const sun=new T.DirectionalLight(0xffedcd,1.6);sun.position.set(-10,26,8);scene.add(sun,sun.target);camera=new T.PerspectiveCamera(50,4/3,.08,180);}
function capture(state){
 const a=state.staffLife.active;if(!a)return;const n=npcs.find(n=>n.station.id===a.id),task=n.serviceTask,key=a.id+'-'+a.phase;
 if(!task?.arrived||captured.has(key)||!['meal','tea','sleep'].includes(a.phase))return;
 if(a.phase==='sleep'){
  const contact=n.getPoseMetrics().lieContact;assert.ok(contact,'Actual resting pose records support contact');
  for(const [part,p]of Object.entries(contact))assert.ok(Math.abs(p.gap)<.04,a.id+' '+part+' mattress contact '+p.gap);
  assert.ok(furniture.standPoint(options,[],n.serviceMount),'Bunk has a collision-checked exit');
  const [x,y,z]=n.serviceMount.position;assert.ok(furniture.standPoint(options,[{minX:x-.25,maxX:x+.25,minY:y,maxY:y+1.95,minZ:z-.25,maxZ:z+.25}],n.serviceMount),'Player at bunk approach has a safe alternate staff exit');contacts.push({id:a.id,contact});
 }
 if(a.phase==='meal'){assert.equal(n.getPoseMetrics().action,'chair-sit');assert.equal(n.serviceMount.kind,'seat');}
 if(a.phase==='tea')assert.equal(n.getPoseMetrics().action,'tea');
 if(renderer){const views={meal:[[-4.6,13.05,-9.8],[-6.8,12.35,-7.8]],tea:[[-2.4,13.05,3.7],[-4.9,12.6,5.8]],sleep:[[-2.2,13.2,-8.5],[-4.3,12.5,-11.4]]};const[position,target]=views[a.phase];camera.position.set(...position);camera.lookAt(new T.Vector3(...target));scene.updateMatrixWorld(true);renderer.render(scene,camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync(out+'/'+key+'.png',canvas.toBuffer('image/png'));frames.push({filename:key+'.png',position,target});}
 captured.add(key);
}
let time=0,last='',dt=.1;const served=new Set();
try {
 for(let frame=0;frame<12000&&routine.state().staffLife.completed<2;frame++){
  time+=dt;doors.update(dt,npcs.map(n=>({position:n.root.position,radius:.25,height:1.95})));routine.update(dt,time,{night:true,position:new T.Vector3(0,0,38)});
  const state=routine.state(),life=state.staffLife,key=life.active?.id+':'+life.active?.phase+':'+life.events.length;
  for(const e of state.history)if(e.event==='serve'&&initialIds.includes(e.visit))served.add(e.visit);
  if(last!==key){last=key;console.log(JSON.stringify({time:+time.toFixed(1),life,claims:state.claims.map(j=>({kind:j.kind,workerId:j.workerId})),actors:state.actors.filter(n=>['jp-ramen','jp-sushi'].includes(n.id)),failures:state.failures}));}
  if(state.failures.length)console.log(JSON.stringify({failedActors:state.actors.map(a=>({...a,retreat:npcs.find(n=>n.station.id===a.id)?.serviceTask?.avoidRoute,yieldAt:npcs.find(n=>n.station.id===a.id)?.serviceTask?.yieldAt}))}));
  assert.equal(state.failures.length,0,'Actual staff route failure: '+JSON.stringify(state.failures));
  if(life.active&&!['draining','handoff'].includes(life.active.phase))assert.equal(state.claims.some(j=>j.workerId===life.active.id),false,'Off-duty worker never takes a new guest job');
  capture(state);
 }
 console.log(JSON.stringify({finalStaff: routine.state().staffLife,finalActors: routine.state().actors.map(a=>({...a,yieldAt:npcs.find(n=>n.station.id===a.id)?.serviceTask?.yieldAt,yieldTo:npcs.find(n=>n.station.id===a.id)?.serviceTask?.yieldToId}))}));
 assert.equal(routine.state().staffLife.completed,2,'Both staff complete actual meal/tea/night rest/return');assert.equal(served.size,initialIds.length,'Relief completes the waiting meal orders');
 assert.equal(captured.size,resume?3:6);assert.equal(contacts.length,resume?1:2);
 for(const look of looks)assert.equal(JSON.stringify(npcs.find(n=>n.station.id===look.id).root.userData.appearance),look.appearance,'Persistent employee appearance '+look.id);
 routine.dispose();assert.equal(furniture.facilities.state().some(f=>f.reservations.some(r=>['jp-ramen','jp-sushi'].includes(r.actor))),false,'Unload releases staff facilities');
 assert.ok(saved.staffLife.completed>=2,'Completed rotations are durable');
 console.log(JSON.stringify({status:'PASS',time,completed:saved.staffLife.completed,served:[...served],contacts,frames,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
}finally{if(out)fs.writeFileSync(out+'/frames.json',JSON.stringify({frames,contacts},null,2));routine.dispose();furniture.dispose();doors.dispose();npcs.forEach(n=>n.dispose());renderer?.dispose();canvas?.dispose();}
