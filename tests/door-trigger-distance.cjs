// Scene-free R15.1 sensing and production movement regression.
// node --max-old-space-size=384 --experimental-vm-modules tests/door-trigger-distance.cjs
// Optional BASELINE_DOOR_SOURCE / BASELINE_ROUTING_SOURCE report prior triggers.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source');
async function load(baseline=false){
 const cache=new Map();function mod(file){if(cache.has(file))return cache.get(file);const source=baseline&&file.endsWith('/game/automatic-doors.js')?process.env.BASELINE_DOOR_SOURCE:baseline&&file.endsWith('/game/automatic-routing.js')?process.env.BASELINE_ROUTING_SOURCE:null;let code=fs.readFileSync(source||file,'utf8');if(file.endsWith('/game/automatic-doors.js'))code=code.replace('    get cameraColliders(){','    testSweep(){return doors.flatMap(d=>getSweepBoxes(d));},\n    get cameraColliders(){');const m=new vm.SourceTextModule(code,{identifier:file});cache.set(file,m);return m;}
 const linker=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0])),m=mod(root+'/game/automatic-doors.js');await m.link(linker);await m.evaluate();return {create:m.namespace.createAutomaticDoors,T:mod(root+'/vendor/three/build/three.module.js').namespace,intersect:mod(root+'/game/navigation.js').namespace.segmentBoxIntersection};
}
const configurations=[{name:'narrow-hinge',width:2.2,motion:'hinge'},{name:'ordinary-hinge',width:3.2,motion:'hinge'},{name:'ceremonial-hinge',width:6,motion:'hinge'},{name:'slider',width:3.2,motion:'slide',style:'shoji'},{name:'curtain',width:2.2,motion:'gather',kind:'full-curtain'},{name:'overhead-curtain',width:2.2,motion:'gather',kind:'half-curtain'}];
const expectedOpeningSeconds=config=>config.motion==='hinge'?(config.width>4?.46:.30):config.motion==='gather'?.32:.28;
function fixture(lib,config={},axis='x',swing=1){const bounds={minX:-15,maxX:15,minZ:-15,maxZ:15},lot={group:new lib.T.Group(),bounds,colliders:[],automaticDoorways:[{id:'trigger-fixture',center:[0,0,0],width:3.2,height:3,axis,style:'palace',motion:'hinge',swing,...config}]},api=lib.create(lot);return {api,bounds,point:(l,n)=>axis==='x'?{x:l,y:0,z:n}:{x:n,y:0,z:l},normal:p=>axis==='x'?p.z:p.x};}
function hit(p,b,r,height=1.95){return p.y<b.maxY-.01&&p.y+height>b.minY+.01&&p.x>b.minX-r+1e-7&&p.x<b.maxX+r-1e-7&&p.z>b.minZ-r+1e-7&&p.z<b.maxZ+r-1e-7;}
function close(api,hz=60){for(let n=0;n<Math.ceil(hz*2.4);n++)api.update(1/hz,[]);assert.equal(api.getState()[0].fraction,0);assert.equal(api.getStats().active,0);}
function measure(lib,config,speed,side=-1,hz=60,radius=.34,lateral=0,evidence=null){const f=fixture(lib,config),p=f.point(lateral,side*12),pattern=Array.isArray(hz)?hz:[1/hz];let trigger=null,triggerAt=null,openAt=null,stalls=0,waitingSeconds=0,frames=0,elapsed=0;const actor={position:p,radius,height:1.95};
 for(;elapsed<30;frames++){
  const dt=pattern[frames%pattern.length],before={...p};elapsed+=dt;f.api.update(dt,[actor]);const state=f.api.getState()[0];if(trigger===null&&state.fraction>0){trigger=Math.abs(f.normal(p));triggerAt=elapsed-dt;}if(openAt===null&&state.fraction===1)openAt=elapsed;assert(!f.api.cameraColliders.some(b=>hit(p,b,radius)),'opening sweep penetrates actor');
  const velocity=f.point(0,-side*Math.min(speed*dt,Math.abs(-side*12-f.normal(p)))),delta=f.api.constrainMove(p,velocity.x,velocity.z,radius);p.x+=delta.dx;p.z+=delta.dz;
  if(Math.hypot(p.x-before.x,p.z-before.z)<1e-6){stalls++;waitingSeconds+=dt;assert(state.fraction<1,'reservation releases immediately at fully open pose');}
  assert((f.normal(p)-f.normal(before))*-side>=-1e-8,'held forward input never requires retreat');assert(Math.abs(p.x-lateral)<1e-8,'reservation never steers sideways');assert(!f.api.isOpeningObstructedBy(p),'normal approach waits outside actual opening sweep');
  assert(!f.api.cameraColliders.some(b=>hit(p,b,radius)),'actor penetrates leaf');
  for(const b of f.api.cameraColliders){if(p.y>=b.maxY-.01||p.y+1.95<=b.minY+.01)continue;assert.equal(lib.intersect(before,p,{...b,minY:b.minY-1.95+.01,maxY:b.maxY-.01},radius-1e-6),null,'movement sweeps through current leaf');}
  if(Math.abs(f.normal(p)+side*12)<.001)break;
 }
 assert(elapsed<30,'crossing deadlock');assert(waitingSeconds<=expectedOpeningSeconds(config)+2*Math.max(...pattern)+1e-6,JSON.stringify({check:'manual wait bounded by opening stroke plus two movement frames',waitingSeconds,config:config.name,speed,side,hz,radius,lateral}));assert(trigger!==null,'actor never activated threshold');if(evidence)Object.assign(evidence,{triggerDistance:+trigger.toFixed(3),openingSeconds:openAt===null?null:+(openAt-triggerAt).toFixed(3),waitingSeconds:+waitingSeconds.toFixed(3),pausedFrames:stalls});close(f.api,Array.isArray(hz)?60:hz);f.api.dispose();return +trigger.toFixed(3);
}
function probe(lib,p,velocity,speed=0,config={}){const f=fixture(lib,config),actor={position:{...p},radius:.34,height:1.95,velocity,speed};f.api.update(1/60,[actor]);const fraction=f.api.getState()[0].fraction;f.api.dispose();return fraction>0;}
(async()=>{
 const lib=await load(),baseline=process.env.BASELINE_DOOR_SOURCE&&process.env.BASELINE_ROUTING_SOURCE?await load(true):null,report={status:'PASS',scope:'Synthetic closures, actual production leaves/colliders and automatic routes; no authored lot or renderer',supersededExpectation:'25ca122 required zero paused frames. User-selected near sensing allows a short straight-line wait, bounded by opening stroke plus two frames; endpoint, collision, no-steering and no-retreat assertions remain.',triggerDistances:[],frameRateDistances:[],openingTimings:[],staticSweepClearance:[],negativeTriggers:[],manualCrossings:0,oppositeCrossings:0,automaticCrossings:0,stageRenewals:0,closedStartFallbacks:0,retreatChecks:0,reservationPassers:0};
 for(const config of configurations)for(const radius of[.25,.34]){
  const f=fixture(lib,config),sweep=f.api.testSweep();for(const lateral of[0,config.width/4,config.width/2-radius-.025]){
   const relevant=sweep.filter(b=>b.minY<1.94&&b.maxY>.01&&lateral>=b.minX-radius&&lateral<=b.maxX+radius),min=relevant.length?Math.min(...relevant.map(b=>b.minZ-radius)):0,max=relevant.length?Math.max(...relevant.map(b=>b.maxZ+radius)):0;
   const fullyOpenLaneClear=!f.api.planningColliders.some(b=>b.minY<1.94&&b.maxY>.01&&lateral>=b.minX-radius&&lateral<=b.maxX+radius);
   report.staticSweepClearance.push({configuration:config.name,radius,lateral:+lateral.toFixed(3),fullyOpenLaneClear,swingSide:+(-min).toFixed(3),backSide:+max.toFixed(3),sweepSamples:sweep.length});
  }f.api.dispose();
 }
 for(const config of configurations){
  const row={configuration:config.name,stationary:1.175};assert(probe(lib,{x:0,y:0,z:1.175},null),config.name+' near standing admission');assert(!probe(lib,{x:0,y:0,z:1.225},null),config.name+' far standing rejection');
  for(const speed of[1.25,5.2,8])for(const side of[-1,1]){const key=(side<0?'swingSide':'backSide')+'_'+speed;row[key]=measure(lib,config,speed,side);report.manualCrossings++;if(baseline)row['before_'+key]=measure(baseline,config,speed,side);}
  report.triggerDistances.push(row);
 }
 for(const config of configurations)for(const radius of[.25,.34])for(const hz of[20,144])for(const side of[-1,1]){measure(lib,config,8,side,hz,radius);report.manualCrossings++;}
 for(const config of configurations)for(const radius of[.25,.34])for(const side of[-1,1]){measure(lib,config,8,side,[.05,1/144,1/60,.025],radius);report.manualCrossings++;}
 for(const config of configurations.slice(1,3))for(const speed of[2,3.5,4.8,5.2,8])for(const hz of[20,60,144])for(const side of[-1,1]){const before=baseline?{}:null,after={};if(baseline)measure(baseline,config,speed,side,hz,.34,0,before);measure(lib,config,speed,side,hz,.34,0,after);report.frameRateDistances.push({configuration:config.name,speed,hz,side,before,after});report.manualCrossings++;}
 for(const config of configurations)for(const hz of[20,60,144]){
  const f=fixture(lib,config),p=f.point(0,1.1),fractions=[];for(let tick=0;tick<hz;tick++){f.api.update(1/hz,[{position:p,radius:.34}]);fractions.push(f.api.getState()[0].fraction);assert(!f.api.cameraColliders.some(b=>hit(p,b,.34)));if(fractions.at(-1)===1)break;}
  const duration=expectedOpeningSeconds(config);assert(fractions[0]>0&&fractions[0]<.1,'near occupancy starts gently instead of snapping');assert(fractions.at(-1)===1);assert(Math.abs(fractions.length/hz-duration)<1/hz+1e-6,'actual opening follows selected size/type duration');assert(fractions.length>4);report.openingTimings.push({configuration:config.name,hz,seconds:+(fractions.length/hz).toFixed(3),fractions:fractions.map(n=>+n.toFixed(4))});f.api.dispose();
 }
 for(const radius of[.25,.34])for(const hz of[20,60,144])for(const side of[-1,1])for(const lateral of[-1,1]){measure(lib,configurations[3],8,side,hz,radius,lateral*(1.6-radius-.025));report.manualCrossings++;}
 const negatives=[{name:'standing too far',p:{x:0,y:0,z:1.5},v:{x:0,z:0},speed:0},{name:'standing beside jamb',p:{x:2,y:0,z:1},v:{x:0,z:0},speed:0},{name:'parallel passer',p:{x:0,y:0,z:1.8},v:{x:5.2,z:0},speed:5.2},{name:'parallel near passer',p:{x:0,y:0,z:1},v:{x:5.2,z:0},speed:5.2},{name:'moving away',p:{x:0,y:0,z:1.8},v:{x:0,z:5.2},speed:5.2},{name:'moving away nearby',p:{x:0,y:0,z:1},v:{x:0,z:5.2},speed:5.2},{name:'approach misses aperture',p:{x:2,y:0,z:1.8},v:{x:0,z:-5.2},speed:5.2},{name:'far ordinary walker',p:{x:0,y:0,z:-4},v:{x:0,z:5.2},speed:5.2},{name:'far fast walker',p:{x:0,y:0,z:-6},v:{x:0,z:8},speed:8}];
 for(const c of negatives){const after=probe(lib,c.p,c.v,c.speed),before=baseline?probe(baseline,c.p,c.v,c.speed):null;assert.equal(after,false,c.name);if(baseline)assert.equal(before,true,c.name+' proves baseline regression');report.negativeTriggers.push({name:c.name,before,after});}
 // Desired input must not provide an alternate activation path for passers.
 for(const config of configurations.slice(1,3))for(const hz of[20,60,144])for(const direction of[-1,1]){
  const f=fixture(lib,config),p=f.point(direction*-6,1),dt=1/hz;for(let tick=0;tick<hz*3;tick++){f.api.update(dt,[{position:p,radius:.34,velocity:{x:direction*4,z:0}}]);const move=f.api.constrainMove(p,direction*4*dt,0,.34);assert(Math.abs(move.dx-direction*4*dt)<1e-7&&Math.abs(move.dz)<1e-7,'cold workspace does not block parallel passer');p.x+=move.dx;assert.equal(f.api.getState()[0].fraction,0,'parallel held input never opens the door');}f.api.dispose();report.reservationPassers++;
 }
 // Both an ordinary waiting actor and an actor restored inside the future
 // workspace retain voluntary retreat. A new reservation never cages either.
 for(const config of configurations.slice(1,3))for(const radius of[.25,.34])for(const hz of[20,60,144]){
  const f=fixture(lib,config),p=f.point(0,-6),dt=1/hz;let paused=false;
  for(let tick=0;tick<hz*3;tick++){f.api.update(dt,[{position:p,radius}]);const move=f.api.constrainMove(p,0,3.5*dt,radius);p.z+=move.dz;if(Math.abs(move.dz)<1e-8){paused=true;break;}}
  assert(paused,'normal approach reaches bounded workspace wait');const retreat=f.api.constrainMove(p,0,-.2,radius);assert(Math.abs(retreat.dz+.2)<1e-8&&retreat.dx===0,'waiting actor can retreat immediately');p.z+=retreat.dz;f.api.dispose();
  const inside=fixture(lib,config),restored=inside.point(0,-.8);let completedOpening=false;for(let tick=0;tick<hz;tick++)inside.api.update(dt,[{position:restored,radius}]);assert(inside.api.isOpeningObstructedBy(restored),'inside-workspace actor uses original real-leaf obstruction');
  for(let tick=0;tick<hz*2;tick++){inside.api.update(dt,[{position:restored,radius}]);completedOpening||=inside.api.getState()[0].fraction===1;const move=inside.api.constrainMove(restored,0,-2.5*dt,radius);assert(move.dz<0&&Math.abs(move.dx)<1e-8,'restored actor can back out naturally');restored.z+=move.dz;assert(!inside.api.cameraColliders.some(b=>hit(restored,b,radius)));}assert(completedOpening,'retreat frees real leaf to finish opening before normal delayed close');inside.api.dispose();report.retreatChecks+=2;
 }
 for(const config of configurations.slice(1,3)){
  const routeProbe=library=>{const f=fixture(library,config),p=f.point(0,config.width>4?3:2),route=f.api.planPath(p,f.point(0,-2),{bounds:f.bounds,multilevel:false},.34);assert(route.length);f.api.routeStep(route,p,.008);const retained=f.api.routeBlocked(route,p);f.api.update(1/60,[]);const opened=f.api.getState()[0].fraction>0;f.api.dispose();return {opened,retained};},after=routeProbe(lib),before=baseline?routeProbe(baseline):null;
  assert.deepEqual(after,{opened:false,retained:false},'far routeStep/routeBlocked cannot bypass near admission');if(before)assert(before.opened,'baseline router opened at prior broad reach');report.negativeTriggers.push({name:'far automatic '+config.name,before,after});
 }
 for(const axis of['x','z'])for(const swing of[-1,1])for(const hz of[20,60,144]){
  const f=fixture(lib,{width:6},axis,swing),ps=[f.point(0,-12),f.point(.1,12)],radius=.34,dt=1/hz;let steps=0;
  for(;steps<hz*5;steps++){f.api.update(dt,ps.map(position=>({position,radius,height:1.95})));assert(!ps.some(p=>f.api.cameraColliders.some(b=>hit(p,b,radius))));for(let j=0;j<ps.length;j++){const target=j?-12:12,normal=f.normal(ps[j]),v=f.point(0,Math.sign(target-normal)*Math.min(8*dt,Math.abs(target-normal))),delta=f.api.constrainMove(ps[j],v.x,v.z,radius);ps[j].x+=delta.dx;ps[j].z+=delta.dz;assert(!f.api.cameraColliders.some(b=>hit(ps[j],b,radius)));}if(ps.every((p,j)=>Math.abs(f.normal(p)-(j?-12:12))<.001))break;}
  assert(steps<hz*5,'opposite-side actors deadlock');close(f.api,hz);f.api.dispose();report.oppositeCrossings++;
 }
 // Router-only sensing: actor movement still uses the real live leaf colliders,
 // but no proximity descriptor can cover up an overly broad requestOpen path.
 for(const config of configurations)for(const radius of[.25,.34])for(const hz of[20,60,144])for(const side of[-1,1]){
  const f=fixture(lib,config),p=f.point(0,side*8),end=f.point(0,-side*8),route=f.api.planPath(p,end,{bounds:f.bounds,multilevel:false},radius),phases=new Set();let frames=0,firstRequest=null;
  assert(route.length);const far=f.api.routeStep(route,p,.008);assert.equal(far.waiting,false);f.api.update(1/hz,[]);assert.equal(f.api.getState()[0].fraction,0,'route cannot independently open at 8 m');
  for(;frames<hz*12&&route.length;frames++){f.api.update(1/hz,[]);const step=f.api.routeStep(route,p,.008);phases.add(step.phase);if(step.doorId&&firstRequest===null)firstRequest=Math.abs(f.normal(p));if(step.waypoint&&!step.waiting){const dx=step.waypoint.x-p.x,dz=step.waypoint.z-p.z,n=Math.hypot(dx,dz);if(n){const amount=Math.min(n,8/hz),delta=f.api.constrainMove(p,dx/n*amount,dz/n*amount,radius);p.x+=delta.dx;p.z+=delta.dz;if(Math.hypot(delta.dx,delta.dz)<1e-8)f.api.routeBlocked(route,p);}}assert(!f.api.cameraColliders.some(b=>hit(p,b,radius)),'automatic route overlaps leaf');}
  assert(Math.hypot(p.x-end.x,p.z-end.z)<.009,JSON.stringify({config:config.name,radius,hz,side,p,state:f.api.getRouteState(route)}));if(config.kind!=='half-curtain')assert(firstRequest!==null&&firstRequest<(config.width>4?3:2.5),JSON.stringify({check:'router admission remains near actual doorway',config:config.name,radius,hz,side,firstRequest}));close(f.api,hz);f.api.dispose();report.automaticCrossings++;
 }
 // A close start inside a future wide-leaf sweep must stage back, retain its
 // admitted lease even outside sensing, then rejoin; abandoning it must close.
 for(const radius of[.25,.34])for(const hz of[20,60,144]){
  const f=fixture(lib,{width:6}),p=f.point(.5,-.85),end=f.point(0,2),route=f.api.planPath(p,end,{bounds:f.bounds,multilevel:false},radius),phases=new Set();let heldOutside=false;
  for(let n=0;n<hz*8&&route.length;n++){f.api.update(1/hz,[{position:p,radius}]);const step=f.api.routeStep(route,p,.008);phases.add(step.phase);if(step.phase==='waiting'&&Math.abs(f.normal(p))>1.2)heldOutside=true;if(step.waypoint&&!step.waiting){const dx=step.waypoint.x-p.x,dz=step.waypoint.z-p.z,len=Math.hypot(dx,dz);if(len){const amount=Math.min(len,2.5/hz),move=f.api.constrainMove(p,dx/len*amount,dz/len*amount,radius);p.x+=move.dx;p.z+=move.dz;if(Math.hypot(move.dx,move.dz)<1e-8)f.api.routeBlocked(route,p);}}assert(!f.api.cameraColliders.some(b=>hit(p,b,radius)));}
  assert(Math.hypot(p.x-end.x,p.z-end.z)<.009,'near closed start stages and rejoins');assert(phases.has('staging'));assert(heldOutside,'stage lease renews outside near sensor');close(f.api,hz);f.api.dispose();report.stageRenewals++;
 }
 // Read-only planning eligibility survives starts in the future parked leaf,
 // even when the first static-grid waypoint temporarily points away/sideways.
 for(const config of configurations.slice(0,3))for(const axis of['x','z'])for(const radius of[.25,.34])for(const hz of[20,60,144])for(const leaf of[0,1]){
  const f=fixture(lib,config,axis),b=f.api.planningColliders[leaf],p={x:(b.minX+b.maxX)/2,y:0,z:(b.minZ+b.maxZ)/2},end=f.point(0,1.1),route=f.api.planPath(p,end,{bounds:f.bounds,multilevel:false},radius),label={config:config.name,axis,radius,hz,leaf};
  assert(!f.api.cameraColliders.some(box=>hit(p,box,radius)),JSON.stringify({check:'legal closed start',...label}));assert(route.length,JSON.stringify({check:'fallback route exists',...label}));assert.equal(f.api.getState()[0].fraction,0,'planning never opens a door');
  for(let n=0;n<hz*10&&route.length;n++){f.api.update(1/hz,[{position:p,radius}]);const step=f.api.routeStep(route,p,.008);if(step.waypoint&&!step.waiting){const dx=step.waypoint.x-p.x,dz=step.waypoint.z-p.z,length=Math.hypot(dx,dz);if(length){const amount=Math.min(length,2.5/hz),move=f.api.constrainMove(p,dx/length*amount,dz/length*amount,radius);p.x+=move.dx;p.z+=move.dz;if(Math.hypot(move.dx,move.dz)<1e-8)f.api.routeBlocked(route,p);}}assert(!f.api.cameraColliders.some(box=>hit(p,box,radius)),JSON.stringify({check:'closed fallback actor remains clear',...label}));}
  assert(Math.hypot(p.x-end.x,p.z-end.z)<.009,JSON.stringify({check:'closed fallback reaches retained target',...label,p,state:f.api.getRouteState(route)}));close(f.api,hz);f.api.dispose();report.closedStartFallbacks++;
 }
 // Recovery and close hysteresis use the original body volume, including a
 // second actor entering from the opposite side during a close.
 {const f=fixture(lib),p=f.point(0,0);f.api.update(0,[{position:p,radius:.34}]);assert.equal(f.api.getState()[0].fraction,1);for(let i=0;i<50;i++)f.api.update(.02,[]);assert.equal(f.api.getState()[0].fraction,1);for(let i=0;i<20;i++)f.api.update(.02,[]);const partial=f.api.getState()[0].fraction;assert(partial<1);f.api.update(.02,[{position:p,radius:.34}]);assert(f.api.getState()[0].fraction>partial&&f.api.getState()[0].fraction<1,'clear doorway occupancy reverses gently');for(let n=0;n<30;n++){f.api.update(.02,[{position:p,radius:.34}]);assert(!f.api.cameraColliders.some(b=>hit(p,b,.34)));}assert.equal(f.api.getState()[0].fraction,1);close(f.api);f.api.dispose();}
 report.maxRSSMiB=+(process.resourceUsage().maxRSS/1024).toFixed(1);assert(report.maxRSSMiB<600,'tiny fixture stays inside 600 MiB window');console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
