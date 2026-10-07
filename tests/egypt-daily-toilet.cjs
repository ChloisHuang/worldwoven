// Shared-service extraction risks: regional receipt collisions, privacy bounds
// leaking across adjoining cubicles, early relief, or losing a mounted actor
// after interruption. Use small lots here; real routes remain scene QA's job.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {createEgyptDailyToilet,EGYPT_DAILY_TOILET}=await load('game/egypt-daily-toilet.js');
 const {THREE}=await load('game/geometry.js');
 const cases=[['egypt',createEgyptDailyToilet,EGYPT_DAILY_TOILET]];
 function harness(region,create,P){
  const make=(id,p)=>{const root=new THREE.Group();root.position.set(...p);return {station:{id},root,route:[],walking:false,collisionRadius:.34};};
  const outside=[0,P.approach[1],0],player=make('player',outside),staff=make(region+'-staff',outside),other=make('other',outside);
  const bounds={minX:-30,maxX:30,minZ:-40,maxZ:40};
  const lot={group:new THREE.Group(),bounds,explorationTargets:[{id:P.id,position:[...P.approach]}],interiorRooms:[{id:'washroom',minX:-20,maxX:-15,minZ:-9,maxZ:-5}],colliders:[],cameraColliders:[],walkableSurfaces:[{...bounds,y:P.approach[1]}]};
  const closures=P.closures.map(id=>({id,kind:'full-curtain',fraction:0}));
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
  f.tick(3);f.start();f.other.root.position.set(...[13,0,1]);f.tick(3);assert(!f.service.active());assert.equal(f.events.length,0,'another person inside this enclosure interrupts use');f.other.root.position.set(0,P.approach[1],0);
  f.tick(3);f.start();f.tick(20);const interrupted=structuredClone(f.saved);f.reload(interrupted);f.tick();assert.equal(f.saved.lastOutcome.status,'interrupted');assert.deepEqual(f.player.root.position.toArray(),P.approach);assert.equal(f.events.length,0);
  f.start();f.failSave=true;f.tick(90);assert.equal(f.events.length,0,'failed completion write cannot grant relief');assert.equal(f.service.state().activity.elapsed,P.seconds);f.failSave=false;f.tick();assert.equal(f.events.length,1);assert.equal(f.events[0].source,region+'-toilet');assert.equal(f.events[0].facilityId,P.id);assert.match(f.events[0].id,new RegExp('^'+region+'-toilet-'));
  f.reload();f.tick(20);assert.equal(f.events.length,1,'acknowledged receipt does not replay');
  f.start();f.failComplete=true;f.tick(90);const queued=structuredClone(f.saved),receipt=f.events.at(-1).id;assert(queued.receipts.some(r=>!r.delivered));f.failComplete=false;f.reload(queued);f.tick();assert.equal(f.events.at(-1).id,receipt,'callback retry retains receipt identity');assert(f.saved.receipts.every(r=>r.delivered));
  f.start();f.other.root.position.set(...P.approach);const safeExit=f.service.exitPlan(f.player),beforeExitEvents=f.events.length;assert(safeExit,'same-room alternative landing exists');assert(f.service.cancel(),'one occupied landing must not deadlock every later visitor');assert.deepEqual(f.player.root.position.toArray(),safeExit);assert(f.player.root.position.distanceTo(f.other.root.position)>=.76-1e-7,'alternative dismount keeps both real bodies separate');assert.equal(f.events.length,beforeExitEvents,'interruption does not grant relief');f.other.root.position.set(0,P.approach[1],0);
  f.start();const blocker={minX:P.approach[0]-2,maxX:P.approach[0]+2,minY:P.approach[1],maxY:P.approach[1]+2,minZ:P.approach[2]-2,maxZ:P.approach[2]+2};f.lot.colliders.push(blocker);assert(!f.service.cancel(),'occupied exit retains the seated reservation');assert.equal(f.saved.pending.stage,'leaving');const count=f.events.length;f.reload();f.tick();assert(f.service.active());f.lot.colliders.pop();f.tick();assert(!f.service.active());assert.deepEqual(f.player.root.position.toArray(),P.approach);assert.equal(f.events.length,count,'interrupted exit recovery grants no relief');
  f.staff.root.position.set(0,P.approach[1],0);assert(f.service.requestActor(f.staff));f.tick(201);assert(!f.service.ownsActor(f.staff),'stalled route releases reservation');assert(!f.service.requestActor(f.staff),'stalled actor waits before retry');f.tick(101);assert(f.service.requestActor(f.staff));
  f.player.root.position.set(0,P.approach[1],0);f.staff.root.position.set(...P.approach);f.service.updateActor(f.staff,.1);f.service.updateActor(f.staff,.1);assert(f.service.actorPose(f.staff));for(let i=0;i<82;i++){f.tick();f.service.updateActor(f.staff,.1);}assert.equal(f.events.at(-1).actorId,staffId);assert(!f.service.ownsActor(f.staff));assert.deepEqual(f.staff.root.position.toArray(),P.approach);
  f.service.dispose();
 }
 const boundary=harness(...cases[0]),P=EGYPT_DAILY_TOILET;
 boundary.other.root.position.set(17.2,0,.8);boundary.start();assert(boundary.service.state().activity.privacy.ok,'original Seti position is outside the physical privacy bounds');boundary.service.cancel();boundary.tick(3);
 boundary.closures[0].kind='half-curtain';boundary.arrive();assert(boundary.service.executeIntent(boundary.service.intent()));boundary.tick(151);assert(!boundary.service.active());assert.equal(boundary.events.length,0,'short curtain is not privacy');boundary.closures[0].kind='full-curtain';
 const foreign={id:'japan-toilet-4',number:4,actorId:'player',source:'japan-toilet',facilityId:'jp-washroom-private-1',completed:true,delivered:false};boundary.reload({serial:4,receipts:[foreign],pending:{...foreign,stage:'using'}});boundary.tick();assert.equal(boundary.service.state().receipts.length,0,'foreign source cannot replay through Egyptian outbox');
 const {createDailyNeeds,DAILY_NEEDS_HOUR:H}=await load('game/daily-needs.js');let seconds=0,fail=true,snapshot;
 const needs=createDailyNeeds({saved:{version:2,people:{player:{foodAge:26*H,toiletAge:26*H,receipts:{'japan-toilet':4}}}},getClock:()=>({seconds}),saveState:s=>{if(fail)return false;snapshot=s;return true;}});needs.enter('egypt');
 const receipt={id:'egypt-toilet-1',number:1,actorId:'player',source:'egypt-toilet',facilityId:P.id,completed:true};
 assert.equal(needs.toiletReceipt({...receipt,facilityId:'jp-washroom-private-1'}),false);assert.equal(needs.toiletReceipt({...receipt,completed:false}),false);assert.equal(needs.toiletReceipt(receipt),false);assert.equal(needs.read('player').toilet,1);fail=false;assert(needs.toiletReceipt(receipt));assert.equal(needs.read('player').toilet,0);assert.equal(needs.hunger('player'),1);assert.equal(snapshot.people.player.receipts['japan-toilet'],4);assert.equal(needs.toiletReceipt(receipt),false);
 needs.leave();seconds+=6000;needs.update();assert.equal(needs.read('player').toilet,0,'unloaded world time gives no offline penalty');
 const reload=createDailyNeeds({saved:snapshot});assert.equal(reload.toiletReceipt(receipt),false);assert.equal(reload.read('player').toilet,0);boundary.service.dispose();
 console.log('PASS: Egypt shared lifecycle, strict privacy/closures, complete-only relief, interruption, durable source outbox and recovery');
})().catch(error=>{console.error(error);process.exitCode=1;});
