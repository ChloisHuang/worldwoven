// Portable, single synthetic closure only; no authored lot or renderer.
// node --experimental-vm-modules tests/door-route-lease.cjs
// CULTURAL_GAME_ROOT selects a checkout; AUTOMATIC_ROUTING_SOURCE may select
// an isolated helper delta while preserving that checkout's current leaf geometry.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(process.env.CULTURAL_GAME_ROOT||process.cwd(),'source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const source=file.endsWith('/game/automatic-routing.js')&&process.env.AUTOMATIC_ROUTING_SOURCE?process.env.AUTOMATIC_ROUTING_SOURCE:file,m=new vm.SourceTextModule(fs.readFileSync(source,'utf8'),{identifier:file});cache.set(file,m);return m;}
const linker=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
(async()=>{
 const module=mod(root+'/game/automatic-doors.js');await module.link(linker);await module.evaluate();const {createAutomaticDoors}=module.namespace,T=mod(root+'/vendor/three/build/three.module.js').namespace,results=[];
 for(const presence of ['absent','far'])for(const dt of [.025,.01]){
  const bounds={minX:-12,maxX:12,minZ:-12,maxZ:12},lot={group:new T.Group(),bounds,colliders:[],automaticDoorways:[{id:'lease-fixture',center:[0,0,0],width:3.2,height:3,axis:'x',style:'palace',motion:'hinge',swing:1}]},doors=createAutomaticDoors(lot),options={bounds,multilevel:false},p={x:0,y:0,z:1.1},end={x:0,y:0,z:-2},far={position:{x:10,y:0,z:10},radius:.34,height:1.95},actors=presence==='far'?[far]:[];
  let activeRoute=doors.planPath(p,end,options,.34);const retainedRoute=activeRoute,initial={...p};assert(activeRoute.length);assert.equal(doors.getState()[0].fraction,0);
  // A live automatic route keeps renewing even while physically waiting.
  for(let elapsed=0;elapsed<1;elapsed+=dt){doors.routeStep(activeRoute,p,.008);doors.update(dt,actors);}
  assert.equal(doors.getState()[0].fraction,1,'route lease opens the real leaf without actor proximity');assert.equal(doors.getState()[0].hold,1.1);assert.deepEqual(p,initial,'opening a leaf never moves the actor');
  // The manual-input contract abandons the old array. Keeping this test's
  // reference must not keep a lease alive; only routeStep may renew it.
  activeRoute=[];let firstHoldDecay=null,firstClosing=null,firstClosed=null;
  for(let tick=1;tick<=Math.ceil(3/dt);tick++){
   doors.update(dt,actors);const elapsed=tick*dt,d=doors.getState()[0];
   if(firstHoldDecay===null&&d.hold<1.1-1e-8)firstHoldDecay=elapsed;
   if(firstClosing===null&&d.fraction<1-1e-8)firstClosing=elapsed;
   if(firstClosed===null&&d.fraction===0)firstClosed=elapsed;
  }
  assert(firstHoldDecay>=.25-1e-8&&firstHoldDecay<=.25+2*dt+1e-8,'lease expires after .25 simulation seconds within discrete update observation');
  assert(firstClosing!==null&&firstClosing<=.25+1.1+3*dt,'expired lease cannot preserve the ordinary hold indefinitely');assert(firstClosed!==null&&firstClosed<=.25+1.1+.85+4*dt);assert.equal(doors.getState()[0].fraction,0);assert.equal(doors.getStats().active,0);assert.deepEqual(p,initial);assert.equal(activeRoute.length,0);
  // A new request still works after expiration, then disposal drops every
  // route record and prevents renewal, geometry work, and actor movement.
  activeRoute=doors.planPath(p,end,options,.34);doors.routeStep(activeRoute,p,.008);doors.update(dt,actors);assert(doors.getState()[0].fraction>0);
  let released=0;doors.root.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>released++);});const updates=doors.getStats().updates;
  doors.dispose();doors.dispose();assert.equal(released,2);assert.equal(lot.group.children.length,0);assert.equal(doors.cameraColliders.length,0);assert.equal(doors.getStats().active,0);assert.equal(doors.getRouteState(retainedRoute),null);assert.equal(doors.getRouteState(activeRoute),null);
  assert.equal(doors.routeStep(activeRoute,p).phase,'complete');assert.equal(doors.routeBlocked(activeRoute,p),false);assert.deepEqual(doors.planPath(p,end,options),[]);doors.update(.1,actors);assert.equal(doors.getStats().updates,updates);assert.deepEqual(p,initial);
  results.push({presence,dt,firstHoldDecay,firstClosing,firstClosed,released});
 }
 console.log(JSON.stringify({status:'PASS',scope:'Production createAutomaticDoors, one synthetic closure, live route renewal, .25s lease expiration, manual route abandonment, reentry and disposal; no authored lots or renderer',results},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
