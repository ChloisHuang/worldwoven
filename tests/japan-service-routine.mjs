// Bounded real-scene check: no alternate navigation or character animation.
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=path.resolve('source'),out=process.env.OUT_DIR;
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{buildJapan}=await import('../source/game/japan-bathhouse.js'),{createAutomaticDoors}=await import('../source/game/automatic-doors.js'),{createFurnitureInteractions}=await import('../source/game/furniture-interactions.js'),{createCharacter}=await import('../source/game/characters.js'),{npcRoleAppearance}=await import('../source/game/appearance.js'),{createJapanServiceRoutine,JAPAN_SERVICE_ROLES}=await import('../source/game/japan-service-routine.js'),{moveWithCollision}=await import('../source/game/navigation.js'),F=await import('../source/game/floor-support.js');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner','One actual scene at a time');
const lot=buildJapan(),furniture=createFurnitureInteractions(lot,'japan'),doors=createAutomaticDoors(lot,'japan'),options={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
const npcs=lot.stations.filter(s=>JAPAN_SERVICE_ROLES.includes(s.id)).map((station,i)=>{const look=npcRoleAppearance('japan',station.id,Number(process.env.IDENTITY_SEED||1)),n=createCharacter({...look,culture:'japan',scale:.96});n.station=station;n.characterScale=.96;n.phase=i*6.7;n.root.position.set(...station.npcPosition);n.home=n.root.position.clone();n.route=[];lot.group.add(n.root);return n;});
function moveActor(n,dx,dz,r){const before=n.root.position.clone(),v=doors.constrainMove(before,dx,dz,r);moveWithCollision(n.root.position,v.dx,v.dz,lot.colliders,r,options);const actual=doors.constrainMove(before,n.root.position.x-before.x,n.root.position.z-before.z,r);if(Math.abs(actual.dx-(n.root.position.x-before.x))>1e-5||Math.abs(actual.dz-(n.root.position.z-before.z))>1e-5){n.root.position.copy(before);moveWithCollision(n.root.position,actual.dx,actual.dz,lot.colliders,r,options);}}
function poseContext(n,station){const p=n.root.position,target=station?.workTarget;return {visualFloorOffset:F.characterFloorOffsetAt(lot,p.x,p.y,p.z),groundHeightAt:(x,z)=>F.visualSupportHeight(lot,x,z,n.root.position.y,true),footprintHeightAt:(a,b,c,d)=>F.footprintSupportHeight(lot,a,b,c,d,n.root.position.y,true),workHeight:target?(target[1]-p.y)/.96:undefined,workDistance:target?Math.hypot(target[0]-p.x,target[2]-p.z)/.96:undefined};}
function changeWardrobe(n,look){const position=n.root.position.clone(),yaw=n.root.rotation.y;n.dispose();n.root.removeFromParent();Object.assign(n,createCharacter({...look,culture:'japan',scale:.96}));n.root.position.copy(position);n.root.rotation.y=yaw;lot.group.add(n.root);}
let saved;const create=()=>createJapanServiceRoutine({npcs,furniture,doors,moveActor,poseContext,changeWardrobe,planPath:(a,b,r)=>doors.planPath(a,b,options,r),saveState:s=>saved=s});
const originalLooks=npcs.map(n=>JSON.stringify(n.root.userData.appearance));let routine=create(),last='',t=0;const dt=1/30,report={status:'RUNNING',stages:[],frames:[],source:source,side:routine.state().side};
let renderer,canvas,camera,scene,sun,gl;
if(out){assert(!fs.existsSync(out));fs.mkdirSync(out,{recursive:true});const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(960,720);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(960,720,false);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;gl=renderer.getContext();scene=new T.Scene();scene.background=new T.Color(0xa7c3bf);scene.add(lot.group,new T.HemisphereLight(0xfff4d8,0x6e8a7b,.85));sun=new T.DirectionalLight(0xffedcd,1.6);sun.position.set(-10,26,8);scene.add(sun,sun.target);camera=new T.PerspectiveCamera(55,4/3,.08,180);}
const captured=new Set();
function capture(stage){
 if(!renderer||captured.has(stage))return;
 const guest=npcs.find(n=>n.station.id==='jp-balcony'),j=guest.serviceTask;
 const targetActor=stage==='drying'?npcs.find(n=>n.station.id===(report.side==='men'?'jp-onsen':'jp-women-onsen')):guest;
 const task=targetActor.serviceTask;if(!task?.arrived||task.elapsed<.8)return;
 const p=targetActor.root.position;
 const views={arrival:[[-2.8,2.05,9],[-4.8,1.15,5.7]],towels:report.side==='men'?[[-2.3,5.8,8.4],[-3.65,4.95,6.55]]:[[1.9,5.8,8.35],[-.12,4.95,6.55]],bathing:report.side==='men'?[[-1.65,5.65,-6.9],[-3.35,4.8,-9.3]]:[[5.2,5.65,-7.25],[3.6,4.8,-9.7]],drying:[[p.x+.45,p.y+1.8,p.z+2.2],[p.x-.35,p.y+.95,p.z]],resting:[[p.x+1.8,p.y+1.7,p.z-2.25],[p.x,p.y+.95,p.z]]};
 if(!views[stage])return;const[position,target]=views[stage];camera.position.set(...position);camera.lookAt(new T.Vector3(...target));scene.updateMatrixWorld(true);renderer.render(scene,camera);gl.finish();assert.equal(gl.getError(),0);const name=String(report.frames.length+1).padStart(2,'0')+'-'+stage;fs.writeFileSync(out+'/'+name+'.png',canvas.toBuffer('image/png'));report.frames.push({name,time:t,camera:position,target,actors:routine.state().actors});captured.add(stage);
}
try{
 for(let i=0;i<15000&&routine.state().cycles<1;i++){
  t+=dt;doors.update(dt,npcs.map(n=>({position:n.root.position,radius:.25,height:1.95})));routine.update(dt,t,{position:new T.Vector3(0,0,37.5)});lot.update(dt,t);
  const state=routine.state();if(state.stage!==last){console.log(JSON.stringify({time:+t.toFixed(2),...state}));report.stages.push({stage:state.stage,time:t});last=state.stage;}
  assert.equal(state.failures.length,0,'Actual route failed: '+JSON.stringify(state));capture(state.stage);
 }
 assert.equal(routine.state().cycles,1,'Complete real loop within bounded simulation');assert.deepEqual(npcs.map(n=>JSON.stringify(n.root.userData.appearance)),originalLooks,'Temporary bath clothing restores exact saved identity');assert.equal(saved.cycles,1);
 // Reach the next bath, then preempt its actual occupied seat with a player request.
 for(let i=0;i<12000&&!npcs.some(n=>n.serviceMount?.kind==='bath');i++){t+=dt;doors.update(dt,npcs.map(n=>({position:n.root.position,radius:.25,height:1.95})));routine.update(dt,t,{position:new T.Vector3(0,0,37.5)});}
 const guest=npcs.find(n=>n.station.id==='jp-balcony'),bathId=guest.serviceMount?.id;assert(bathId,'Repeated visit reaches bath');routine.playerRequest(bathId);assert.equal(guest.serviceMount,null,'Player request immediately releases mounted seat');
 for(let i=0;i<900;i++){t+=dt;doors.update(dt,npcs.map(n=>({position:n.root.position,radius:.25,height:1.95})));routine.update(dt,t,{facilityId:bathId,position:new T.Vector3(...furniture.items.find(i=>i.id===bathId).anchor)});assert(!guest.serviceMount,'NPC cannot remount a player-owned bath');}
 routine.dispose();assert.deepEqual(routine.state().facilities,[]);assert(npcs.every(n=>!n.serviceMount&&!n.route.length));routine=create();assert.equal(routine.state().stage,'arrival');assert.deepEqual(routine.state().facilities,[]);routine.dispose();report.status='PASS';report.simulatedSeconds=t;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;assert(report.maxRSSMiB<1228.8,'Scene process stayed under 1.2 GiB');
 console.log(JSON.stringify(report));
}finally{if(out)fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));routine.dispose();furniture.dispose();doors.dispose();npcs.forEach(n=>n.dispose());renderer?.dispose();canvas?.dispose();}
