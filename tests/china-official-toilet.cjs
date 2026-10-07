// Direct controller + real public fixture contract: prevents court borrowing a
// mounted official, duplicate claims, phantom relief and per-frame queue retries.
const assert=require('node:assert/strict'),load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {createChinaOfficialLife}=await load('game/china-official-life.js'),{createChinaDailyToilets}=await load('game/china-daily-toilets.js'),{createDailyNeeds,DAILY_NEEDS_HOUR:H}=await load('game/daily-needs.js'),{createLifeDecisions}=await load('game/npc-life-decisions.js'),{createFacilityQueue}=await load('game/npc-facilities.js'),{CHINA_PUBLIC_TOILET:P}=await load('game/china-public-toilet.js'),T=await load('vendor/three/build/three.module.js');
 const ids=['cn-minister-works','cn-minister-granary','cn-official-rites','cn-official-personnel','cn-official-justice','cn-official-records'],clock={seconds:0};
 const officials=ids.map(id=>{const root=new T.Group();root.position.set(14,.115,13.8);return {station:{id},root,phase:0,route:[],walking:false,collisionRadius:.25,animate(){}};});
 let writes=0,reject=false,saved={},blockedExit=false,attempts=0,needWrites=0;
 const needs=createDailyNeeds({saved:{version:2,people:Object.fromEntries(ids.map(id=>[id,{foodAge:0,toiletAge:25*H,receipts:{}}]))},getClock:()=>clock,saveState:()=>{needWrites++;return true;}});needs.enter('china',ids);
 const lot={colliders:[],bounds:{minX:-40,maxX:40,minZ:-40,maxZ:40},walkableSurfaces:[{minX:0,maxX:30,minZ:0,maxZ:40,y:4.015}],explorationTargets:[{id:P.id,position:P.approach}],interiorRooms:[{id:P.roomId,minX:21.65,maxX:25.85,minZ:4.65,maxZ:6.65}]};
 const doors={getState:()=>[{id:P.closures[0],kind:'full-curtain',fraction:0}]};
 const args={lot,doors,getActors:()=>officials,getClock:()=>({day:0,hour:14}),saveState:s=>{writes++;if(reject)return false;saved=JSON.parse(JSON.stringify(s));return true;},onCompleted:r=>needs.toiletReceipt(r)||(needs.snapshot().people[r.actorId].receipts[r.source]||0)>=r.number};
 let toilet=createChinaDailyToilets(args);const request=toilet.requestPublicActor;toilet.requestPublicActor=n=>{attempts++;return request(n);};
 const furniture={items:[],facilities:createFacilityQueue(),standPoint:()=>null},decisions=createLifeDecisions({worldSeed:42,actorIds:ids}).snapshot();
 const flow=createChinaOfficialLife({officials,npcs:officials,lot,doors,furniture,sharedNeeds:needs,getToilet:()=>toilet,planPath:(_,to)=>[to],poseContext:()=>({}),safety:()=>[],travel(n,s){n.root.position.set(...s.path.at(-1));s.arrived=true;},saved:{decisions}});
 const tick=()=>{clock.seconds+=.1;needs.update();toilet.update(.1);flow.tick(.1,{hour:14});for(const n of officials)flow.update(n,.1,clock.seconds);};
 assert.equal(attempts,1);assert.equal(saved.publicWashroom.serial,1);assert.equal(flow.state().actors.filter(a=>a.activity==='toilet').length,1);for(let i=0;i<20;i++)tick();assert.equal(attempts,1,'busy toilet is filtered at existing decision opportunities');
 const first=officials[0],using=toilet.state().facilities.publicWashroom;assert.equal(using.activity.stage,'using');assert(!flow.meetingAvailable(first));assert(!flow.socialCanPause(first));assert.equal(needWrites,0);
 const lifeCheckpoint=JSON.parse(JSON.stringify(flow.snapshot())),toiletCheckpoint=JSON.parse(JSON.stringify(saved)),position=first.root.position.toArray();
 assert.deepEqual(toilet.restorePosition(ids[0],position),position);assert.equal(toilet.restorePosition(ids[1],position),null);assert.equal(toilet.restorePosition(ids[0],P.approach),null);
 // One hard court summon leaves the real cubicle before handing back control.
 lot.colliders.push({minX:21,maxX:26,minZ:4,maxZ:7,minY:4,maxY:6});flow.request(first);tick();assert(!flow.ready(first));assert(toilet.ownsActor(first));assert.equal(needWrites,0);assert.deepEqual(first.root.position.toArray(),P.anchor);
 lot.colliders.length=0;tick();assert(flow.ready(first));assert(!toilet.ownsActor(first));assert.deepEqual(first.root.position.toArray(),P.approach);assert.equal(needWrites,0);
 // Abrupt save recovery preserves the authored mount, then safely interrupts;
 // old time is never promoted into a completed use or artificial relief.
 first.root.position.set(...position);toilet=createChinaDailyToilets({...args,saved:toiletCheckpoint});assert(flow.restore(lifeCheckpoint));tick();assert(!toilet.ownsActor(first));assert.deepEqual(first.root.position.toArray(),P.approach);assert.equal(needWrites,0);assert(needs.status(ids[0]).seekToilet);
 // Interrupted urgent needs must not push the decision clock forward on every
 // idle frame. The same actor gets its next opportunity after twelve seconds.
 for(let i=0;i<125;i++)tick();assert(flow.state().actors.some(a=>a.activity==='toilet'),'due need resumes after the fixed idle cooldown');
 // Reservation write failure makes no claim; completion write failure keeps
 // the same mounted request and retries its receipt exactly once.
 for(const n of officials){flow.request(n);flow.update(n,.1,clock.seconds);}for(let i=0;i<110;i++)toilet.update(.1);reject=true;assert(!toilet.requestPublicActor(first));assert(!toilet.ownsActor(first));reject=false;assert(toilet.requestPublicActor(first));
 toilet.updateActor(first,.1);assert(toilet.actorPose(first));reject=true;for(let i=0;i<90;i++){toilet.update(.1);toilet.updateActor(first,.1);}assert.equal(needWrites,0);reject=false;toilet.update(.1);toilet.updateActor(first,.1);assert.equal(needWrites,1);assert(!needs.status(ids[0]).seekToilet);assert(needs.status(ids[1]).seekToilet);for(let i=0;i<30;i++)toilet.update(.1);assert.equal(needWrites,1);
 assert(ids.every(id=>needs.has(id)));const savedNeeds=needs.snapshot();needs.leave();clock.seconds+=48*H;needs.update();assert.equal(needs.snapshot().people[ids[1]].toiletAge,savedNeeds.people[ids[1]].toiletAge,'unloaded actors receive no offline age');
 // After the fixture releases a body, life must keep its physical egress
 // route instead of placing a twelve-second idle inside the privacy room.
 const needsBefore=JSON.stringify(needs.snapshot()),egressActor=officials[0];
 for(const legacyIdle of [false,true]){
  egressActor.root.position.set(...P.approach);const start=egressActor.root.position.toArray(),visits=[];
  const initial={version:1,decisions:createLifeDecisions({worldSeed:42,actorIds:[ids[0]]}).snapshot(),runtime:{time:0,conversation:null,stages:[[ids[0],{path:[P.approach.slice()],index:1,arrived:true,elapsed:0,duration:12,...(legacyIdle?{idle:true}:{choice:{id:'toilet',toilet:true,relief:{},cooldown:12}})}]]}};
  const egress=createChinaOfficialLife({officials:[egressActor],npcs:officials,lot,doors,furniture,sharedNeeds:needs,getToilet:()=>({ownsActor:()=>false,publicAvailable:()=>false,actorPose:()=>null}),planPath:(_,to)=>[to],poseContext:()=>({}),safety:()=>[],saved:initial,travel(n,s){visits.push(s.path[s.index]);n.root.position.set(...s.path[s.index]);s.index++;s.arrived=s.index>=s.path.length;}});
  egress.tick(.1,{hour:14});egress.update(egressActor,.1,1);
  let row=egress.snapshot().runtime.stages[0][1];assert(row.toiletExit,'new completion and legacy room idle own an explicit egress');assert(!row.idle);assert.equal(row.path.at(-1)[1],.115,'exit uses the original public ground-floor landing');
  if(!legacyIdle)assert.deepEqual(egressActor.root.position.toArray(),start,'starting egress never relocates the body');
  const checkpoint=egress.snapshot(),position=egressActor.root.position.toArray();assert(egress.restore(checkpoint));assert.deepEqual(egressActor.root.position.toArray(),position);assert(egress.snapshot().runtime.stages[0][1].toiletExit,'saved return route retains its owner');
  egress.request(egressActor);egress.update(egressActor,.1,2);assert(egress.ready(egressActor),'real official remains summonable while leaving');assert.deepEqual(egressActor.root.position.toArray(),position,'court takes the current body without snapping');assert(egress.courtPlan(egressActor).path.length,'court retains remaining physical stair route');
  egress.dispose({suspend:true});
 }
 assert.equal(JSON.stringify(needs.snapshot()),needsBefore,'egress and old-idle recovery grant no physiological receipt or relief');
 console.log('PASS official post-WC public egress, old room-idle recovery, route checkpoint and real court interruption without extra relief');
 flow.dispose({suspend:true});toilet.dispose();console.log('PASS six original officials, bounded decision retries, exclusive public fixture, hard summons/blocked exit, exact mount restore without phantom relief, reservation/completion save failures, one durable need receipt and no off-scene aging');
})().catch(e=>{console.error(e);process.exitCode=1;});
