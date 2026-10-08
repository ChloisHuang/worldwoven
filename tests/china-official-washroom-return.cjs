// Original China geometry, original public WC closure, authored official route
// and bed approach. Starts are legal staged points near the supplied screenshot;
// no user save, renderer, browser FPS or exact screenshot-state claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);let s=fs.readFileSync(file,'utf8');for(const [suffix,a,b]of [
 ['/china-palace-audience.js',' return {\n  personnelSource:',' return {travelProbe:travel,\n  personnelSource:'],
 ['/china-official-life.js',' return {\n  courtCompleted',' return {routeProbe:publicRoute,\n  courtCompleted']])if(file.endsWith(suffix)){assert.equal(s.split(a).length,2);s=s.replace(a,b);}const m=new vm.SourceTextModule(s,{identifier:file});cache.set(file,m);return m;}
const linker=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
async function load(f){const m=mod(root+'/game/'+f);if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
 const regions=await load('regions-east.js'),{createAutomaticDoors}=await load('automatic-doors.js'),{createFurnitureInteractions}=await load('furniture-interactions.js'),A=await load('china-palace-audience.js'),L=await load('china-official-life.js'),AN=await load('actor-navigation.js'),N=await load('navigation.js'),B=(await load('china-official-bureau.js')).CHINA_OFFICIAL_BUREAU;
 const T=mod(root+'/vendor/three/build/three.module.js').namespace,lot=regions.buildChina(),furniture=createFurnitureInteractions(lot,'china'),options={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
 const bed=furniture.items.find(m=>m.id===B.beds[4]);assert.equal(bed.ownerId,'cn-official-justice');const results=[];
 for(const [name,start,body]of [['inside-WC',[22.45,4.015,6.2],false],['hall-near-frame',[23.15,4.015,7.2],false],['brief-player-block',[22.45,4.015,6.2],true]]){
  const npcs=[...A.CHINA_COURT_OFFICIALS,{id:'cn-emperor',npcPosition:[0,1.415,-8]}].map(station=>{const root=new T.Group(),head=new T.Group();root.add(head);root.userData.head=head;root.position.fromArray(station.npcPosition);return {station,root,home:root.position.clone(),route:[],locomotion:{walkSpeed:1.4},phase:0,walking:false,animate(){}};});
  const n=npcs.find(n=>n.station.id==='cn-official-justice');n.root.position.fromArray(start);assert(!N.blocked(start[0],start[2],lot.colliders,.25,{...options,y:start[1]}),'legal staged initial feet');
  const player=body?new T.Vector3(22.45,4.015,7.2):new T.Vector3(24.4,4.015,8.6),doors=createAutomaticDoors(lot,'china');let plans=0;
  const plan=(from,to,r=.25)=>{plans++;return doors.planPath(from,to,options,r);};
  const move=(actor,dx,dz,r,probeOnly=false)=>AN.moveActorWithCollision(actor,dx,dz,r,{doors,colliders:lot.colliders,navigation:options,npcs,playerPosition:player,probeOnly});move.probeBodyRecovery=(actor,dx,dz,r)=>move(actor,dx,dz,r,true);
  const life=L.createChinaOfficialLife({officials:npcs.slice(0,6),npcs,lot,furniture,doors,planPath:plan,poseContext:()=>({}),travel(){},safety:()=>doors.cameraColliders,worldSeed:42,getClock:()=>({day:0,hour:22+37/60})});
  const route=life.routeProbe(n,bed.position),expected=route.map(p=>p.slice()),stage={id:'life-rest',path:route,index:0,arrived:false,planned:false,stalled:0,retries:0};
  assert(route.some(p=>p[1]===.115),'return genuinely descends to the public ground route');assert.deepEqual(route.at(-1),bed.position);
  const schedule=A.createAudienceSchedule();schedule.call();schedule.finish('completed');
  const service=A.createChinaPalaceAudience({npcs,palace:{dutyState:()=>null,setDutyLine(){},releaseDuty(){}},lot,doors,planPath:plan,moveActor:move,poseContext:()=>({}),saved:schedule.snapshot()});
  const phases=new Set(),seen=new Set();let ticks=0,bodyWaits=0;
  for(;ticks<5000&&!stage.arrived;ticks++){
   AN.beginActorNavigationStep(.05);
   // The nearby player walks aside after a short hold using the same physical
   // door/static collision checks; the official is never placed at a target.
   if(body&&ticks>=40&&player.x<24.35){const delta=doors.constrainMove(player,.045,0,.34);N.moveWithCollision(player,delta.dx,delta.dz,lot.colliders,.34,options);}
   doors.update(.05,[{position:player,radius:.34,height:1.95},...npcs.map(n=>({position:n.root.position,radius:.25,height:1.95}))]);
   const before=n.root.position.clone();service.travelProbe(n,stage,.05);const state=doors.getRouteState(n.route);if(state?.phase)phases.add(state.phase);if(state?.doorId)seen.add(state.doorId);if(stage.travel?.body)bodyWaits++;
   assert(Math.hypot(n.root.position.x-before.x,n.root.position.z-before.z)<.06&&Math.abs(n.root.position.y-before.y)<=options.maxStep+1e-8,'normal walk distance and existing authored curb/stair support step: '+JSON.stringify({name,before:before.toArray(),after:n.root.position.toArray(),target:stage.path[stage.index]}));assert(!N.blocked(n.root.position.x,n.root.position.z,lot.colliders,.25,{...options,y:n.root.position.y}),'walls and supported floors retained');
  }
  assert(stage.arrived,JSON.stringify({name,position:n.root.position.toArray(),stage,door:doors.getRouteState(n.route),plans}));
  assert.deepEqual(stage.path,expected);assert.equal(stage.index,expected.length);assert(Math.hypot(n.root.position.x-bed.position[0],n.root.position.z-bed.position[2])<.15);assert(Math.abs(n.root.position.y-bed.position[1])<.32);
  if(body)assert(bodyWaits>0,'actual nearby player creates a body hold');if(name==='inside-WC')assert(seen.has('cn-tavern-washroom-curtain'),'real WC closure was used');
  results.push({name,simulationSeconds:ticks*.05,plans,bodyWaits,phases:[...phases],doors:[...seen],final:n.root.position.toArray(),bed:bed.id});service.dispose();life.dispose();doors.dispose();
 }
 furniture.dispose();lot.group.traverse(o=>o.geometry?.dispose());console.log(JSON.stringify({status:'PASS',scope:'Original China geometry and automatic doors, staged nearby legal starts, actual official public route to original bed, normal and brief-player-block cases; not user-save reproduction or device performance',results}));
})().catch(e=>{console.error(e);process.exitCode=1;});
