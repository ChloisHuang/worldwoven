// Shared-service extraction risks: regional receipt collisions, privacy bounds
// leaking across adjoining cubicles, early relief, or losing a mounted actor
// after interruption. Use small lots here; real routes remain scene QA's job.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {createChinaDailyToilet,CHINA_DAILY_TOILET}=await load('game/china-daily-toilet.js');
 const {createJapanDailyToilet,JAPAN_DAILY_TOILET}=await load('game/japan-daily-toilet.js');
 const {createFranceDailyToilet,FRANCE_DAILY_TOILET}=await load('game/france-daily-toilet.js');
 const {THREE,torus}=await load('game/geometry.js');
 const cases=[['china',createChinaDailyToilet,CHINA_DAILY_TOILET],['japan',createJapanDailyToilet,JAPAN_DAILY_TOILET],['france',createFranceDailyToilet,FRANCE_DAILY_TOILET]];
 function harness(region,create,P){
  const make=(id,p)=>{const root=new THREE.Group();root.position.set(...p);return {station:{id},root,route:[],walking:false,collisionRadius:.34};};
  const outside=[0,P.approach[1],0],player=make('player',outside),staff=make(region+'-staff',outside),other=make('other',outside);
  const bounds={minX:-30,maxX:30,minZ:-40,maxZ:40};
  const lot={group:new THREE.Group(),bounds,explorationTargets:[{id:P.id,position:[...P.approach]}],interiorRooms:[{id:'washroom',minX:-20,maxX:-15,minZ:-9,maxZ:-5}],colliders:[],cameraColliders:[],walkableSurfaces:[{...bounds,y:P.approach[1]}]};
  const closures=P.closures.map(id=>({id,kind:id==='cn-bath-washroom'?'full-curtain':'door',fraction:0}));
  const f={lot,player,staff,other,closures,saved:{},events:[],failSave:false,failComplete:false,busy:false};
  const options={lot,doors:{getState:()=>closures,cameraColliders:[]},getPlayer:()=>player,getActors:()=>[staff,other],getBusy:()=>f.busy,getClock:()=>({day:3,hour:11.2}),saveState:s=>{if(f.failSave)return false;f.saved=structuredClone(s);return true;},onCompleted:event=>{assert(f.saved.receipts.some(r=>r.id===event.id),'persist before need relief');f.events.push(event);return !f.failComplete;}};
  f.reload=(saved=f.saved)=>f.service=create({...options,saved:structuredClone(saved)});
  f.tick=(count=1)=>{for(let i=0;i<count;i++)f.service.update(.1);};
  f.arrive=()=>player.root.position.set(...P.approach);
  f.start=()=>{f.arrive();assert(f.service.executeIntent(f.service.intent()));f.tick();assert.equal(f.service.state().activity.stage,'using');};
  f.reload();return f;
 }
 for(const [region,create,P]of cases){
  const f=harness(region,create,P),staffId=f.staff.station.id;
  assert(f.service.state().available);assert(!f.service.executeIntent(f.service.intent()),'cannot mount from another room');
  const stale=f.service.intent();assert(f.service.requestActor(f.staff));assert(!f.service.requestActor(f.player),'one fixture shared by staff and player');
  const origin=f.staff.root.position.toArray();f.service.updateActor(f.staff,.1,{travel:()=>true});assert.deepEqual(f.staff.root.position.toArray(),origin);assert.equal(f.service.actorPose(f.staff),null,'successful routing is not physical arrival');
  assert.equal(f.service.resolveIntent(stale),null);assert(f.service.cancel('cancel-route',staffId));
  f.start();assert.deepEqual(f.player.root.position.toArray(),P.anchor);assert.equal(f.service.playerPose().context.seatHeight,P.seatY-P.anchor[1]);
  f.tick(79);assert.equal(f.events.length,0,'relief waits for the entire use');assert(f.service.cancel());assert.deepEqual(f.player.root.position.toArray(),P.approach);f.tick(20);assert.equal(f.events.length,0);
  f.start();f.closures[0].fraction=.2;f.tick(3);assert(!f.service.active());assert.equal(f.events.length,0,'an open closure interrupts without relief');f.closures[0].fraction=0;
  f.tick(3);f.start();f.other.root.position.set(...(region==='france'?[-19,P.approach[1],-10]:[P.anchor[0]+.6,P.approach[1],P.anchor[2]]));f.tick(3);assert(!f.service.active());assert.equal(f.events.length,0,'another person inside this enclosure interrupts use');f.other.root.position.set(0,P.approach[1],0);
  f.tick(3);f.start();f.tick(20);const interrupted=structuredClone(f.saved);f.reload(interrupted);f.tick();assert.equal(f.saved.lastOutcome.status,'interrupted');assert.deepEqual(f.player.root.position.toArray(),P.approach);assert.equal(f.events.length,0);
  f.start();f.failSave=true;f.tick(90);assert.equal(f.events.length,0,'failed completion write cannot grant relief');assert.equal(f.service.state().activity.elapsed,P.seconds);f.failSave=false;f.tick();assert.equal(f.events.length,1);assert.equal(f.events[0].source,region+'-toilet');assert.equal(f.events[0].facilityId,P.id);assert.match(f.events[0].id,new RegExp('^'+region+'-toilet-'));
  f.reload();f.tick(20);assert.equal(f.events.length,1,'acknowledged receipt does not replay');
  f.start();f.failComplete=true;f.tick(90);const queued=structuredClone(f.saved),receipt=f.events.at(-1).id;assert(queued.receipts.some(r=>!r.delivered));f.failComplete=false;f.reload(queued);f.tick();assert.equal(f.events.at(-1).id,receipt,'callback retry retains receipt identity');assert(f.saved.receipts.every(r=>r.delivered));
  f.start();f.other.root.position.set(...P.approach);const safeExit=f.service.exitPlan(f.player),beforeExitEvents=f.events.length;assert(safeExit,region+' same-room alternative landing exists');assert(f.service.cancel(),'one occupied landing must not deadlock every later visitor');assert.deepEqual(f.player.root.position.toArray(),safeExit);assert(f.player.root.position.distanceTo(f.other.root.position)>=.76-1e-7,'alternative dismount keeps both real bodies separate');assert.equal(f.events.length,beforeExitEvents,'interruption does not grant relief');f.other.root.position.set(0,P.approach[1],0);
  f.start();const blocker={minX:P.approach[0]-2,maxX:P.approach[0]+2,minY:P.approach[1],maxY:P.approach[1]+2,minZ:P.approach[2]-2,maxZ:P.approach[2]+2};f.lot.colliders.push(blocker);assert(!f.service.cancel(),'occupied exit retains the seated reservation');assert.equal(f.saved.pending.stage,'leaving');const count=f.events.length;f.reload();f.tick();assert(f.service.active());f.lot.colliders.pop();f.tick();assert(!f.service.active());assert.deepEqual(f.player.root.position.toArray(),P.approach);assert.equal(f.events.length,count,'interrupted exit recovery grants no relief');
  f.player.root.position.set(0,P.approach[1],0);f.staff.root.position.set(0,P.approach[1],0);assert(f.service.requestActor(f.staff));f.tick(201);assert(!f.service.ownsActor(f.staff),'stalled route releases reservation');assert(!f.service.requestActor(f.staff),'stalled actor waits before retry');f.tick(101);assert(f.service.requestActor(f.staff));
  f.player.root.position.set(0,P.approach[1],0);f.staff.root.position.set(...P.approach);f.service.updateActor(f.staff,.1);f.service.updateActor(f.staff,.1);assert(f.service.actorPose(f.staff));for(let i=0;i<82;i++){f.tick();f.service.updateActor(f.staff,.1);}assert.equal(f.events.at(-1).actorId,staffId);assert(!f.service.ownsActor(f.staff));assert.deepEqual(f.staff.root.position.toArray(),P.approach);
  f.service.dispose();
 }
 // China keeps its original saved namespace, obsolete-root recovery and one
 // lot-owned raised footrest; Japan remains ground supported with no new mesh.
 const china=harness(...cases[0]),C=CHINA_DAILY_TOILET;china.player.root.position.set(-17,4.015,-6.6);china.reload({serial:12,pending:{id:'china-toilet-12',number:12,actorId:'player',facilityId:C.id,stage:'using'}});china.tick();assert.deepEqual(china.player.root.position.toArray(),C.approach);assert.equal(china.lot.colliders.filter(c=>c.chinaToiletFootrest).length,1);assert.equal(china.service.intent().id,'cn-daily-toilet');assert.equal(china.service.intent().name,'后宫二层 · 净室');
 const japan=harness(...cases[1]),J=JAPAN_DAILY_TOILET;japan.other.root.position.set(23.15,0,-16.04);japan.start();assert.equal(japan.service.state().activity.privacy.ok,true,'neighboring cubicle is a separate enclosure');assert.equal(japan.lot.group.children.length,0,'adapter adds no geometry');
 const boundary=harness(...cases[1]);boundary.player.root.position.set(20,0,-14.59);assert(!boundary.service.executeIntent(boundary.service.intent()),'cannot start while still within the door safety hold zone');boundary.player.root.position.set(0,0,0);boundary.staff.root.position.set(20,0,-14.59);assert(boundary.service.requestActor(boundary.staff));let routeCalls=0;boundary.service.updateActor(boundary.staff,.1,{travel:()=>routeCalls++});assert.equal(routeCalls,1,'staff keeps routing beyond the safety hold zone');assert.equal(boundary.service.state().activity.stage,'approaching');boundary.service.dispose();
 const g=new THREE.Group();torus(g,20,.57,-16.04,.30,.085,0xffffff);assert(Math.abs(new THREE.Box3().setFromObject(g).max.y-J.seatY)<1e-7,'seat follows the actual six-segment rim top');
 japan.service.cancel();japan.closures[0].kind='half-curtain';japan.tick(3);japan.arrive();assert(japan.service.executeIntent(japan.service.intent()));japan.tick(151);assert(!japan.service.active(),'half curtains never count as private cubicle doors');assert.equal(japan.events.length,0);
 const foreign={id:'china-toilet-4',number:4,actorId:'player',source:'china-toilet',facilityId:C.id,completed:true,delivered:false};japan.reload({serial:4,receipts:[foreign],pending:{...foreign,stage:'using'}});japan.tick();assert.equal(japan.service.state().receipts.length,0,'regional outboxes cannot consume each other');assert.equal(japan.events.length,0);
 china.service.dispose();japan.service.dispose();
 console.log('PASS: shared private toilet adapters, China saved IDs/footrest/legacy root, Japan enclosure/rim/namespace, France existing private bath namespace, player/staff exclusivity, route ownership, complete-only relief, interruption and durable outbox recovery');
})().catch(error=>{console.error(error);process.exitCode=1;});
