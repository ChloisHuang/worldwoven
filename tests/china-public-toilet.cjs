// Actual upper-floor public route and two-facility save ownership. Guards against
// a decorative-only WC, blocked curtain hold zone, false relief and lost legacy saves.
const assert=require('node:assert/strict');
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {buildChina}=await load('game/regions-east.js'),{createAutomaticDoors}=await load('game/automatic-doors.js'),N=await load('game/navigation.js'),T=await load('vendor/three/build/three.module.js');
 const {createFurnitureInteractions}=await load('game/furniture-interactions.js');
 const {createChinaDailyToilets}=await load('game/china-daily-toilets.js'),{CHINA_PUBLIC_TOILET:P}=await load('game/china-public-toilet.js'),{createDailyNeeds,DAILY_NEEDS_HOUR:H}=await load('game/daily-needs.js');
 const lot=buildChina(),doors=createAutomaticDoors(lot,'china'),nav={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4};
 const actor=(id,p)=>{const root=new T.Group();root.position.set(...p);return {station:{id},root,route:[],walking:false,collisionRadius:.34};};
 const player=actor('player',[14.9,.115,8.7]),guest=actor('cn-tavern-diner-west',[14,.115,22]),other=actor('other',[0,.115,20]);
 let stored={version:1,serial:7,receipts:[{id:'china-toilet-7',number:7,actorId:'player',source:'china-toilet',facilityId:'cn-bath-toilet',completed:true,delivered:true}]},needsSave;
 const needs=createDailyNeeds({saved:{version:2,people:{player:{foodAge:26*H,toiletAge:26*H,receipts:{'china-toilet':7}},'cn-tavern-diner-west':{foodAge:26*H,toiletAge:26*H,receipts:{}}}},saveState:s=>{needsSave=s;return true;}});needs.enter('china',[guest.station.id]);
 const args={lot,doors,getPlayer:()=>player,getActors:()=>[guest,other],saveState:s=>{stored=structuredClone(s);return true;},onCompleted:r=>needs.toiletReceipt(r)||(needs.snapshot().people[r.actorId]?.receipts[r.source]||0)>=r.number};
 let service=createChinaDailyToilets({...args,saved:stored});
 const furniture=createFurnitureInteractions(lot,'china'),chair=furniture.items.find(i=>i.id==='china-tavern-lobby-seat');
 assert(chair&&furniture.canSit(nav,[],chair),'existing waiting chair still mounts from its public corridor');
 assert(doors.planPath(new T.Vector3(22.7,4.015,9.15),new T.Vector3(...chair.position),nav,.34).length,'waiting chair retains public access');
 for(const id of ['lan','zhu']){const entry=lot.explorationTargets.find(t=>t.id==='cn-tavern-'+id+'-entry');assert(doors.planPath(new T.Vector3(22.7,4.015,9.15),new T.Vector3(...entry.position),nav,.34).length,'guest suite remains reachable');}
 const publicState=()=>service.state().facilities.publicWashroom;
 function tick(n=1){for(let i=0;i<n;i++){doors.update(.1,[player,guest,other]);service.update(.1);}}
 function walk(a,to){const route=doors.planPath(a.root.position,new T.Vector3(...to),nav,.34);assert(route.length,'ordinary shared navigation finds route '+JSON.stringify(to));let frames=0,minY=a.root.position.y,maxY=minY;
  while(route.length&&frames++<2200){doors.update(.05,[player,guest,other]);service.update(.05);const step=doors.routeStep(route,a.root.position,.025),goal=step?.waypoint;if(!goal)continue;const dx=goal.x-a.root.position.x,dz=goal.z-a.root.position.z,dist=Math.hypot(dx,dz);if(dist<.001)continue;const scale=Math.min(.11,dist)/dist,delta=doors.constrainMove(a.root.position,dx*scale,dz*scale,.34);N.moveWithCollision(a.root.position,delta.dx,delta.dz,lot.colliders,.34,nav);minY=Math.min(minY,a.root.position.y);maxY=Math.max(maxY,a.root.position.y);}
  assert(frames<2200,JSON.stringify({to,position:a.root.position.toArray(),step:doors.getRouteState(route)}));assert(a.root.position.distanceTo(new T.Vector3(...to))<.12);return {frames,minY,maxY};
 }
 assert.equal(service.intents().length,2);assert.equal(service.intent().id,P.intentId);
 const up=walk(player,P.approach);assert(up.minY<.3&&up.maxY>4,'real first-floor to second-floor travel');
 assert(service.executeIntent(service.intent()));for(let i=0;i<100&&publicState().activity?.stage!=='using';i++)tick();assert.equal(publicState().activity?.stage,'using',JSON.stringify(publicState()));assert(service.playerPose());assert.equal(publicState().activity.privacy.ok,true);assert.equal(needs.read('player').toilet,1);assert(!service.requestActor(guest),'one public occupant at a time');
 tick(20);assert(service.cancel());assert.equal(publicState().receipts.length,0);assert.equal(needs.read('player').toilet,1);assert.deepEqual(player.root.position.toArray(),P.approach);
 assert(service.executeIntent(service.intent()));tick();assert.equal(publicState().activity.stage,'using');const interrupted=structuredClone(stored);service=createChinaDailyToilets({...args,saved:interrupted});tick();assert(!service.active());assert.equal(stored.publicWashroom.lastOutcome.status,'interrupted');assert.equal(needs.read('player').toilet,1);
 assert(service.executeIntent(service.intent()));tick(90);assert(!service.active());assert.equal(publicState().receipts.length,1);assert(publicState().receipts[0].delivered);assert.equal(needs.read('player').toilet,0);assert.equal(needs.hunger('player'),1);assert.equal(stored.serial,7);assert.equal(stored.receipts[0].id,'china-toilet-7');assert.equal(needsSave.people.player.receipts['china-toilet'],7);assert.equal(needs.toiletReceipt(publicState().receipts[0]),false);
 const down=walk(player,[14.9,.115,8.7]);assert(down.minY<.3&&down.maxY>4);
 // A foreign occupant keeps the single cubicle unavailable; bounded waiting
 // cancels without relief and the reservation is reusable after they leave.
 other.root.position.set(23.8,4.015,5.9);walk(player,P.approach);assert(service.executeIntent(service.intent()));tick(160);assert(!service.active());assert.equal(publicState().receipts.length,1);assert.equal(publicState().lastOutcome.reason,'privacy-unavailable');other.root.position.set(0,.115,20);
 service=createChinaDailyToilets({...args,saved:stored});tick(20);assert.equal(publicState().receipts.length,1);assert.equal(service.state().facilities.palace.serial,7);
 service.dispose();doors.dispose();console.log(JSON.stringify({status:'PASS',up,down,checks:['real public stair ascent/descent','opaque curtain closes','exclusive occupancy and bounded wait','cancel/reload without relief','completed durable receipt once','palace receipt migration unchanged']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
