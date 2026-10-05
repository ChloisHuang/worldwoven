// Regression scope: actual washroom closures/fixture, exclusive occupancy,
// interrupted actions and durable receipt outbox. These prevent remote relief,
// simultaneous mounting and duplicate need changes after a failed save/reload.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {buildChina}=await load('game/regions-east.js'),{createAutomaticDoors}=await load('game/automatic-doors.js'),N=await load('game/navigation.js'),T=await load('vendor/three/build/three.module.js');
 const {createChinaDailyToilet,CHINA_DAILY_TOILET:P}=await load('game/china-daily-toilet.js');
 const lot=buildChina(),doors=createAutomaticDoors(lot,'china');
 const make=(id,p)=>{const root=new T.Group();root.position.set(...p);return {station:{id},root,route:[],walking:false,collisionRadius:.34};};
 const player=make('player',[-18,4.015,-13.5]),guest=make('cn-tavern-diner-west',[19,.215,18]),other=make('other',[0,.215,20]);
 let saved={},writes=[],events=[],notices=[],failWrites=false,failCallback=false,busy=false;
 const args={lot,doors,notify:text=>notices.push(text),getPlayer:()=>player,getActors:()=>[guest,other],getBusy:()=>busy,getClock:()=>({day:2,hour:10.5}),saveState:s=>{if(failWrites)return false;saved=structuredClone(s);writes.push(s);return true;},onCompleted:r=>{assert(saved.receipts.some(s=>s.id===r.id),'receipt was persisted before shared need effect');events.push(r);return !failCallback;}};
 let service=createChinaDailyToilet(args);
 assert(service.state().available);assert(!service.executeIntent(service.intent()),'cannot use the fixture from a different room');assert.equal(service.state().serial,0);
 // Actual automatic door path and multilevel physical movement to the authored
 // approach. Idle there is outside every closure's safety hold zone.
 const nav={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4},route=doors.planPath(player.root.position,new T.Vector3(...P.approach),nav,.34);
 assert(route.length,'second-floor arrival can route to exact fixture approach');let frames=0;
 while(route.length&&frames++<3000){doors.update(.05,[player,guest,other]);const step=doors.routeStep(route,player.root.position,.025);const goal=step?.waypoint;if(!goal)continue;const dx=goal.x-player.root.position.x,dz=goal.z-player.root.position.z,dist=Math.hypot(dx,dz);if(dist<.001)continue;const scale=Math.min(.10,dist)/dist,delta=doors.constrainMove(player.root.position,dx*scale,dz*scale,.34);N.moveWithCollision(player.root.position,delta.dx,delta.dz,lot.colliders,.34,nav);}
 assert(frames<3000,'physical automatic-door arrival completes');assert(player.root.position.distanceTo(new T.Vector3(...P.approach))<.05);
 assert(service.executeIntent(service.intent()));assert(!service.requestActor(guest),'player reservation is exclusive');
 const tick=(n=1)=>{for(let i=0;i<n;i++){doors.update(.1,[player,guest,other]);service.update(.1);}};
 for(let i=0;i<80&&service.state().activity?.stage!=='using';i++)tick();
 assert.equal(service.state().activity?.stage,'using','all three real closures close after arrival');assert.deepEqual(player.root.position.toArray(),P.anchor);assert.equal(service.playerPose().action,'chair-sit');assert(Math.abs(service.playerPose().context.seatHeight-.605)<1e-8);
 tick(30);assert.equal(events.length,0);assert(service.cancel());assert.deepEqual(player.root.position.toArray(),P.approach);tick(100);assert.equal(events.length,0,'cancelled use grants no relief');
 busy=true;assert(!service.executeIntent(service.intent()),'busy actors cannot take a fixture');busy=false;
 assert(service.executeIntent(service.intent()));tick();assert.equal(service.state().activity.stage,'using');
 other.root.position.set(-18.1,4.015,-8);tick(3);assert(!service.active());assert.equal(events.length,0,'another actor entering interrupts without relief');other.root.position.set(0,.215,20);
 assert(service.executeIntent(service.intent()));tick(30);const interrupted=structuredClone(saved);assert.equal(interrupted.pending.stage,'using');
 // Simulate a tab loss at the mounted root, without disposing the old runtime.
 service=createChinaDailyToilet({...args,saved:interrupted});tick();assert(!service.active());assert.deepEqual(player.root.position.toArray(),P.approach);assert.equal(saved.pending,null);assert.equal(saved.lastOutcome.status,'interrupted');assert.equal(events.length,0);
 assert(service.executeIntent(service.intent()));tick();failWrites=true;tick(90);assert.equal(events.length,0,'failed completion save cannot change a need');assert.equal(service.state().activity.elapsed,P.seconds);failWrites=false;tick();assert.equal(events.length,1);assert(!service.active());assert.equal(saved.receipts.length,1);assert(saved.receipts[0].delivered);assert.deepEqual(player.root.position.toArray(),P.approach);
 service.dispose();service=createChinaDailyToilet({...args,saved});tick(20);assert.equal(events.length,1,'completed reload cannot replay an acknowledged receipt');
 const stale=service.intent();assert(service.executeIntent(stale));assert.equal(service.resolveIntent(stale),null,'old intent cannot reuse a reservation');tick();failCallback=true;tick(90);assert(!service.active());assert.equal(notices.at(-1),'如厕结束，记录正在保存');const pendingDelivery=structuredClone(saved);assert(pendingDelivery.receipts.some(r=>!r.delivered));const sameId=events.at(-1).id;failCallback=false;service=createChinaDailyToilet({...args,saved:pendingDelivery});tick();assert.equal(events.at(-1).id,sameId,'retry uses the same durable receipt id');assert(saved.receipts.every(r=>r.delivered));
 // Visitors keep their ordinary travel controller until actual arrival. No
 // timer or pose starts while a caller merely reports a successful route.
 assert(service.requestActor(guest));const origin=guest.root.position.toArray();service.updateActor(guest,.1,{travel:()=>true});assert.deepEqual(guest.root.position.toArray(),origin);assert.equal(service.state().activity.stage,'approaching');assert.equal(service.actorPose(guest),null);assert(service.active(guest.station.id));assert(!service.executeIntent(service.intent()));
 player.root.position.set(0,.215,20);guest.root.position.set(...P.approach);for(let i=0;i<4;i++){service.update(.1);service.updateActor(guest,.1);}assert.deepEqual(guest.root.position.toArray(),P.anchor);
 const count=events.length;for(let i=0;i<82;i++){doors.update(.1,[player,guest,other]);service.update(.1);service.updateActor(guest,.1);}assert.equal(events.length,count+1);assert.equal(events.at(-1).actorId,guest.station.id);assert(!service.ownsActor(guest));assert.deepEqual(guest.root.position.toArray(),P.approach);
 guest.root.position.set(19,.215,18);assert(service.requestActor(guest));tick(210);assert(!service.active(guest.station.id),'stalled travel releases the fixture');assert(!service.requestActor(guest),'stalled actor has a retry cooldown');tick(110);assert(service.requestActor(guest));service.cancel('test-end',guest.station.id);
 // If a late obstacle blocks the short dismount, the saved leaving state must
 // recover the real seated root rather than strand it inside the bowl collider.
 player.root.position.set(...P.approach);assert(service.executeIntent(service.intent()));tick();
 const blocker={minX:-18.9,maxX:-18.3,minY:4.015,maxY:6,minZ:-6.9,maxZ:-6.3};lot.colliders.push(blocker);tick(90);assert.equal(service.state().activity.stage,'leaving');assert.equal(saved.pending.stage,'leaving');assert(saved.pending.completed);const completedCount=events.length;
 service=createChinaDailyToilet({...args,saved});tick();assert(service.active(),'blocked exit stays safely occupied after reload');lot.colliders.splice(lot.colliders.indexOf(blocker),1);tick();assert(!service.active());assert.deepEqual(player.root.position.toArray(),P.approach);assert.equal(saved.lastOutcome.status,'completed');assert.equal(events.length,completedCount);
 const legacy={...saved,serial:99,pending:{id:'china-toilet-99',number:99,actorId:'player',facilityId:P.id,stage:'using'}};player.root.position.set(-17,4.015,-6.6);service=createChinaDailyToilet({...args,saved:legacy});tick();assert.deepEqual(player.root.position.toArray(),P.approach);assert.equal(saved.lastOutcome.status,'interrupted');assert.equal(events.length,completedCount,'old mounted anchor never supplies relief');
 assert.equal(new Set(saved.receipts.map(r=>r.id)).size,saved.receipts.length);service.dispose();doors.dispose();
 console.log('PASS: actual second-floor door route and closure, exact supported bowl mount, single occupant, busy/cancel/privacy interruption, failed-save boundary, interrupted/completed and blocked-exit reload, legacy anchor recovery, idempotent receipt retry, NPC travel ownership/stall cooldown');
})().catch(e=>{console.error(e);process.exitCode=1;});
