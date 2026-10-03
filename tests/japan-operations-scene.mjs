// One integrated Japan scene: order progress must come from the actual doors,
// routes, work anchors, actors, props and furniture. No alternate simulation.
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
const source=path.resolve('source');
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{buildJapan}=await import('../source/game/japan-bathhouse.js'),{createAutomaticDoors}=await import('../source/game/automatic-doors.js'),{createFurnitureInteractions}=await import('../source/game/furniture-interactions.js'),{createCharacter}=await import('../source/game/characters.js'),{npcRoleAppearance}=await import('../source/game/appearance.js'),{createJapanBathhouseOperations}=await import('../source/game/japan-bathhouse-operations.js'),{japanVisitorStation}=await import('../source/game/japan-visitors.js'),{moveWithCollision}=await import('../source/game/navigation.js'),F=await import('../source/game/floor-support.js');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner','One actual Japan scene under owner resource window');
const lot=buildJapan(),furniture=createFurnitureInteractions(lot,'japan'),doors=createAutomaticDoors(lot,'japan'),options={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
const npcs=lot.stations.map((station,i)=>actor(station,npcRoleAppearance('japan',station.id,17),i));
function actor(station,look,i){const n=createCharacter({...look,culture:'japan',scale:.96});n.station=station;n.characterScale=.96;n.phase=i*6.7;n.root.position.set(...station.npcPosition);n.home=n.root.position.clone();n.route=[];lot.group.add(n.root);return n;}
function moveActor(n,dx,dz,r){const before=n.root.position.clone(),v=doors.constrainMove(before,dx,dz,r);moveWithCollision(n.root.position,v.dx,v.dz,lot.colliders,r,options);const actual=doors.constrainMove(before,n.root.position.x-before.x,n.root.position.z-before.z,r);if(Math.abs(actual.dx-(n.root.position.x-before.x))>1e-5||Math.abs(actual.dz-(n.root.position.z-before.z))>1e-5){n.root.position.copy(before);moveWithCollision(n.root.position,actual.dx,actual.dz,lot.colliders,r,options);}}
function poseContext(n,station){const p=n.root.position,target=station?.workTarget;return {visualFloorOffset:F.characterFloorOffsetAt(lot,p.x,p.y,p.z),groundHeightAt:(x,z)=>F.visualSupportHeight(lot,x,z,n.root.position.y,true),footprintHeightAt:(a,b,c,d)=>F.footprintSupportHeight(lot,a,b,c,d,n.root.position.y,true),workHeight:target?(target[1]-p.y)/.96:undefined,workDistance:target?Math.hypot(target[0]-p.x,target[2]-p.z)/.96:undefined};}
function changeWardrobe(n,look){const position=n.root.position.clone(),yaw=n.root.rotation.y;n.dispose();n.root.removeFromParent();Object.defineProperties(n,Object.getOwnPropertyDescriptors(createCharacter({...look,culture:'japan',scale:.96})));n.root.position.copy(position);n.root.rotation.y=yaw;lot.group.add(n.root);}
let saved;const routine=createJapanBathhouseOperations({npcs,lot,furniture,doors,moveActor,poseContext,changeWardrobe,worldSeed:17,planPath:(a,b,r)=>doors.planPath(a,b,options,r),saveState:s=>saved=s,createVisitor:v=>{const n=actor(japanVisitorStation(v),v.appearance,v.number);npcs.push(n);return n;},removeVisitor:n=>{npcs.splice(npcs.indexOf(n),1);n.root.removeFromParent();n.dispose();}});
let time=0,last='',dt=1/20;
try {
 for(let frame=0;frame<16000&&routine.state().completed<1;frame++) {
  time+=dt;doors.update(dt,npcs.map(n=>({position:n.root.position,radius:.25,height:1.95})));routine.update(dt,time,{position:new T.Vector3(0,0,38)});
  const state=routine.state(),key=state.visits.map(v=>v.stage).join('|')+';'+state.history.length+';'+state.failures.length;
  if(last!==key){last=key;console.log(JSON.stringify({time:+time.toFixed(2),visits:state.visits.map(v=>({id:v.id,stage:v.stage,side:v.side})),latest:state.history.at(-1),failures:state.failures,actors:state.actors}));}
  if(state.failures.length)throw Error('Actual route failed: '+JSON.stringify(state.failures));
 }
 assert.equal(routine.state().completed,1,'One causal visitor lifecycle completes');
 assert(saved.nextVisit>=3,'Two distinct visitors were allocated durably');
 const history=routine.state().history;
 for(const event of ['register','prepare','deliverMix','bath-mounted','bathed','rested','cook','serve','ate','checkout','left'])assert(history.some(e=>e.event===event),event+' happened physically');
 console.log(JSON.stringify({status:'PASS',time,completed:routine.state().completed,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
}finally{routine.dispose();furniture.dispose();doors.dispose();npcs.forEach(n=>n.dispose());}
