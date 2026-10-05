// The authored Japan reception stand is clear for its .25m NPC body, but not
// the player's .34m body. Exercise the production restore hook on actual solids.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve('source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});cache.set(file,m);return m;}
const link=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
(async()=>{
 const scene=mod(root+'/game/japan-bathhouse.js');await scene.link(link);await scene.evaluate();
 const lot=scene.namespace.buildJapan(),THREE=mod(root+'/vendor/three/build/three.module.js').namespace;
 const {blocked,resolveSurfaceHeight}=await import('../source/game/navigation.js');
 const {captureWorldActor,restoreWorldActor,nearestContinuityPosition}=await import('../source/game/world-continuity.js');
 const station=lot.stations.find(s=>s.id==='jp-performance-reception'),home=station.npcPosition;
 const navOptions={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
 const main=fs.readFileSync(root+'/game/main.js','utf8'),from=main.indexOf('function restoreWorldContinuity('),to=main.indexOf('\nfunction pauseForReadOnlyPanel',from);assert(from>=0&&to>from);
 const makeActor=(id,p)=>{const root=new THREE.Group();root.position.set(...p);return {station:{id},root,route:[],phase:0};};
 const legal=(p,r=.25)=>!blocked(p[0],p[2],lot.colliders,r,{...navOptions,y:p[1]});
 function restore(p,{playerAtHome=false}={}){
  const actor=makeActor(station.id,home),player=makeActor('player',station.position);
  const context={active:{id:'japan'},player,npcs:[actor],lot,furniture:{items:[]},navOptions,elapsed:0,multiLevel:true,blocked,resolveSurfaceHeight,restoreWorldActor,nearestContinuityPosition,planPath:()=>[],continuityControllers:()=>({}),seated:null,bathTransition:null,performing:null,targetStation:null,pendingInteraction:null,actionTime:0,lotAnimationTime:0,camTarget:new THREE.Vector3(),THREE,$:()=>({style:{}})};
  const actorState=captureWorldActor(actor,{region:'japan'}),playerState=captureWorldActor(player,{id:'player',region:'japan'});actorState.position=p.slice();if(playerAtHome)playerState.position=home.slice();
  vm.createContext(context);vm.runInContext(main.slice(from,to),context);context.restoreWorldContinuity({player:playerState,actors:{[station.id]:actorState},controllers:{},activity:{}});
  return {actor,player,report:context.continuityReport};
 }
 assert(legal(home));assert(!legal(home,.34),'Actual counter distinguishes the existing actor radii');
 const exact=restore(home);assert.deepEqual(exact.actor.root.position.toArray(),home,'Legal authored NPC stand must survive without relocation');assert.equal(exact.report.relocated.length,0);assert.equal(exact.report.skipped.length,0);
 const player=restore(home,{playerAtHome:true});assert(player.report.relocated.includes('player'),'Player retains the larger body');assert(!player.report.relocated.includes(station.id));assert(legal(player.player.root.position.toArray(),.34));
 const counter=lot.colliders.find(c=>home[0]>c.minX&&home[0]<c.maxX&&home[2]<c.minZ&&c.minZ-home[2]<.34&&c.minY===home[1]);assert(counter);
 const inside=[(counter.minX+counter.maxX)/2,home[1],(counter.minZ+counter.maxZ)/2];assert(!legal(inside));
 const corrected=restore(inside);assert(corrected.report.relocated.includes(station.id),'True counter penetration still requires a safe relocation');assert(legal(corrected.actor.root.position.toArray()));assert.equal(corrected.actor.root.position.y,home[1]);
 const upper=lot.levels.find(l=>l.y>home[1]),between=[home[0],(home[1]+upper.y)/2,home[2]],unsupported=restore(between);
 assert.equal(nearestContinuityPosition(between,{project:p=>{const y=resolveSurfaceHeight({x:p[0],y:p[1],z:p[2]},{...navOptions,radius:.25},lot.colliders);return y===null?null:[p[0],y,p[2]];},legal,maxRadius:0}),null,'Unsupported exact point must not snap onto either floor');
 // The nearby real stair can provide a safe point within the saved height band.
 const landing=unsupported.actor.root.position.toArray();assert(unsupported.report.restored.includes(station.id));assert(legal(landing));assert(Math.abs(landing[1]-between[1])<=.4);assert.notEqual(landing[1],home[1]);assert.notEqual(landing[1],upper.y);
 console.log('PASS actual Japan counter + production restore: legal NPC position retained, player radius retained, counter interior corrected on same floor, cross-floor snap rejected while same-height stair remains legal');
})().catch(e=>{console.error(e);process.exitCode=1;});
