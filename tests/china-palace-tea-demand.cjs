// Bounded normal-choice demand model, not whole-world navigation/visual QA.
// Original palace preferences, actor PRNGs, cooldowns, claims, fatigue/social
// needs, shared hunger, kitchen ledger and private toilet remain live. No
// selected activity, visiting guest, service proof, or money is seeded.
// This model isolates a real product risk: optional demand may not sustainably
// cover 6 copper/day at 8 per complete original service (0.75/day required).
// Run: node --experimental-vm-modules tests/china-palace-tea-demand.cjs
// Optional TEA_DEMAND_SEEDS=1,42,12345 TEA_DEMAND_DAYS=3.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../source'),context=vm.createContext({console,structuredClone,performance,URL}),cache=new Map();
function mod(file){if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context}));return cache.get(file);}
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s.split('?')[0]));
async function load(file){const m=mod(path.join(root,'game',file));if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
const freshRandom=seed=>{let x=(seed^0xb55f1ac9)>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};};
(async()=>{
 const lifeModule=await load('china-palace-life.js'),teaModule=await load('china-palace-tea-service.js'),accounts=await load('npc-piecework-account.js'),role=(await load('china-palace-tea-role.js')).PALACE_TEA_ROLE;
 const needModule=await load('daily-needs.js'),clockModule=await load('simulation-clock.js'),kitchenModule=await load('china-royal-kitchen-service.js'),toiletModule=await load('china-daily-toilets.js'),facilities=await load('npc-facilities.js'),nav=await load('actor-navigation.js'),looks=await load('appearance.js'),characters=await load('characters.js');
 const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 const seeds=(process.env.TEA_DEMAND_SEEDS||'1,42,12345').split(',').map(Number),days=Number(process.env.TEA_DEMAND_DAYS||3),daySeconds=1440/clockModule.GAME_MINUTES_PER_SECOND;
 assert(seeds.length&&seeds.every(Number.isSafeInteger));assert(Number.isSafeInteger(days)&&days>0&&days<=7);
 const results=[];
 for(const seed of seeds){
  let elapsed=0,currentDt=.1,palace=null,tea=null,kitchen=null,toilet=null;
  // Start a complete calendar day, not the default partial first day at 10am.
  // This is clock initialization only; all choices/needs/accounts start fresh.
  const clock=clockModule.createSimulationClock({version:1,seconds:(1440-600)/.7}),random=freshRandom(seed),choiceSeen=new Map(),requestEvents=[],payEvents=[],cancelEvents=[];
  const daily=Array.from({length:days},(_,i)=>({day:i+1,visitsChosen:0,teaRequested:0,teaAccepted:0,completed:0,income:0,mealCompletions:0,toiletCompletions:0,choices:{},rejections:{}}));
  const bucket=()=>daily[Math.min(days-1,Math.floor((elapsed+1e-8)/daySeconds))];
  const stats={travelCalls:0,travelDistance:0,maxTravelStep:0,hostWanders:0,legacyHostBrainUrgentAtIgnored:null,guestPoseAcknowledgments:0,phases:[],saveWrites:0};
  const hostStation={id:'cn-tea',npcName:'Lin',npcLabel:'温杯沏茉莉花茶',npcAction:'tea',npcPosition:[2.9,.815,-29.68],route:[[2,.815,-26.2],[6,.815,-26.2]],workTarget:[2.9,1.8,-30.43]};
  const chefStation={id:'cn-cooking',npcName:'Jia',npcPosition:[20,4.015,-6.11],ageYears:35};
  // Production seeded appearance is used solely to obtain the real garment/
  // gait walk speed. Rendering is replaced by Three hand-target acknowledgments.
  function actor(station,i){
   const real=characters.createCharacter({...looks.npcRoleAppearance('china',station.id,seed),culture:'china',style:station.id==='cn-cooking'?'chef':'casual',scale:.96});
   const locomotion=real.locomotion;real.dispose();
   const root=new T.Group(),head=new T.Group(),hands=[new T.Group(),new T.Group()];root.add(head,...hands);root.userData.head=head;root.userData.hands=hands;root.position.set(...station.npcPosition);
   return {station,root,home:root.position.clone(),route:[],phase:i*6.7,breakAt:14,returning:false,locomotion,walking:false,alive:true,ageYears:station.ageYears,animate(t,walking,action,c={}){if(c.archery?.hands)c.archery.hands.forEach((p,j)=>hands[j]?.position.set(...p));root.updateWorldMatrix(true,true);}};
  }
  const npcs=[actor(hostStation,0),...lifeModule.CHINA_PALACE_ROLES.map((r,i)=>actor(r,i+1)),actor(chefStation,5)],host=npcs[0],royals=npcs.slice(1,5),consorts=royals.slice(1);
  assert.deepEqual(consorts.map(n=>n.station.id),['cn-consort-yue','cn-consort-heng','cn-consort-ling']);
  const queue=facilities.createFacilityQueue(),items=[{id:'china-furniture-throne',kind:'seat',position:[0,1.415,-4.3],anchor:[0,1.415,-4.3],yaw:Math.PI},...royals.map((n,i)=>({id:i?n.station.privateBedId:'china-furniture-seat',kind:i?'bed':'seat',position:n.home.toArray(),anchor:n.home.toArray(),yaw:0})),...[19.8,22.2].map(x=>({id:'china-palace-dining-seat-'+x,kind:'seat',position:[x,.215,-4.8],anchor:[x,.215,-4.8],seatY:.82,yaw:Math.PI}))];
  const furniture={items,facilities:queue,canSit:()=>true,canUse:()=>true,releaseActor:id=>queue.releaseActor(id),standPoint:(navigation,safety,mount)=>new T.Vector3(...mount.position),bedSupportAt:()=>.215};
  const lot={group:new T.Group(),colliders:[],cameraColliders:[],walkableSurfaces:[{minX:-30,maxX:30,minZ:-40,maxZ:40,y:4.015}],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40},interiorRooms:[{id:'washroom',minX:-19,maxX:-16,minZ:-8,maxZ:-5,floorY:4.015}],explorationTargets:[{id:'cn-bath-toilet',position:[-18.6,4.015,-6.6]}]};
  for(const n of npcs)lot.group.add(n.root);
  // Authored palace waypoints are retained. This bounded open-passage planner
  // does not pretend to reproduce whole-world walls or route detours.
  const planPath=(from,to)=>[new T.Vector3(to.x,to.y,to.z)];
  const doors={cameraColliders:[],planningColliders:[],routeBlocked:()=>false,getState:()=>['cn-bath-east','cn-bath-west','cn-bath-washroom'].map(id=>({id,kind:id==='cn-bath-washroom'?'full-curtain':'door',fraction:0})),routeStep(route,p,tolerance=.025){while(route.length&&p.distanceTo(route[0])<tolerance)route.shift();return{waypoint:route[0]};}};
  function moveActor(n,dx,dz,radius=.25){
   const p=n.root.position,to=n.route[0],before=p.clone(),horizontal=to?Math.hypot(to.x-p.x,to.z-p.z):0;
   // Follow each segment at bounded 3D speed, including stairs; never set an
   // actor to the end of the route. Local dynamic-body constraints remain live.
   const slope=to&&horizontal>1e-8?(to.y-p.y)/horizontal:0,scale=1/Math.sqrt(1+slope*slope);dx*=scale;dz*=scale;
   const toward=to&&horizontal>1e-8?Math.max(0,(dx*(to.x-p.x)+dz*(to.z-p.z))/horizontal):0;
   const allowed=nav.constrainActorMove(n,p,dx,dz,radius,npcs,null,p.y+toward*slope);
   const ratio=Math.hypot(dx,dz)>1e-8?Math.hypot(allowed.dx,allowed.dz)/Math.hypot(dx,dz):0;
   p.x+=allowed.dx;p.z+=allowed.dz;p.y+=toward*slope*ratio;
   const moved=p.distanceTo(before);assert(moved<=currentDt*n.locomotion.walkSpeed+.00001,'distance/time bound');stats.travelCalls++;stats.travelDistance+=moved;stats.maxTravelStep=Math.max(stats.maxTravelStep,moved);
   return {bodyBlocked:!!allowed.blocker,bodyBypassed:false};
  }
  const poseContext=()=>({visualFloorOffset:0});
  const needs=needModule.createDailyNeeds({getClock:clock.state,saveState:()=>true,isPersonAlive:id=>npcs.some(n=>n.station.id===id)});needs.enter('china',npcs.map(n=>n.station.id));assert(!needs.has('cn-tea'));
  const account=accounts.createNPCPieceworkAccount({role,namespace:'chinaTeaAccounts',proofKind:'npc-palace-tea-piecework',saveState:(money,record)=>{stats.saveWrites++;if(record?.evidence){bucket().completed++;bucket().income+=record.amount;payEvents.push({at:+elapsed.toFixed(2),day:clock.state().day,guestId:record.evidence.guestId,requestId:record.evidence.requestId,amount:record.amount});}return true;}});
  tea=teaModule.createPalaceTeaService({npcs,lot,doors,planPath,moveActor,poseContext,resolveAssignment:()=>({status:'npc',actor:host,holderId:'cn-tea',revision:0,alive:true,available:true}),account,saveState:()=>{stats.saveWrites++;return true;}});
  const originalRequest=tea.request;tea.request=arg=>{const result=originalRequest(arg);bucket().teaRequested++;if(result.ok)bucket().teaAccepted++;else bucket().rejections[result.code]=(bucket().rejections[result.code]||0)+1;requestEvents.push({at:+elapsed.toFixed(2),day:clock.state().day,guestId:arg.guest.station.id,hostAccepted:arg.hostAccepted,ok:result.ok,code:result.code||null});return result;};
  const updateTea=tea.update;tea.update=(dt,t,state)=>{const before=tea.owns(host)?tea.state():null;updateTea(dt,t,state);if(before?.runtime&&!tea.owns(host)){const original=before.orders.orders.find(o=>o.visitId===before.runtime.visitId),after=tea.state().orders.orders.find(o=>o.id===original?.id);if(after?.stage==='cancelled'){const guest=palace.socialProfile(after.guestId);cancelEvents.push({at:+elapsed.toFixed(2),requestId:after.id,guestId:after.guestId,phase:before.runtime.phase,age:before.runtime.age,urgentGuest:state.urgentGuest,guestNeeds:guest.needs,guestSharedNeeds:needs.status(after.guestId)});}}};
  const observePose=tea.observeGuestPose;tea.observeGuestPose=(n,t)=>{const result=observePose(n,t);if(result)stats.guestPoseAcknowledgments++;return result;};
  kitchen=kitchenModule.createChinaRoyalKitchenService({npcs,lot,doors,planPath,moveActor,poseContext,getClock:clock.state,worldSeed:seed,sharedNeeds:needs,getMountedActor:n=>palace?.mountForActor(n),saveState:()=>true});
  toilet=toiletModule.createChinaDailyToilets({lot,doors,getActors:()=>npcs,getClock:clock.state,saveState:()=>true,onCompleted:r=>needs.toiletReceipt(r)});
  palace=lifeModule.createChinaPalaceLife({npcs,lot,furniture,doors,planPath,moveActor,poseContext,worldSeed:seed,sharedNeeds:needs,getKitchen:()=>kitchen,getToilet:()=>toilet,getTeaService:()=>tea,saveState:s=>{for(const[id,p]of Object.entries(s.people)){const prev=choiceSeen.get(id)||0;if(p.choices>prev){choiceSeen.set(id,p.choices);if(p.current){const key=id+':'+p.current.id;bucket().choices[key]=(bucket().choices[key]||0)+1;if(p.current.id==='visit')bucket().visitsChosen++;}}}return true;}});
  assert(palace&&kitchen&&toilet);const seenPhases=new Set(),seenMeals=new Set(),seenToilets=new Set();let nextSample=0;
  function wander(dt,t){if(palace.owns(host)||tea.owns(host))return;host.walking=false;if(t>host.breakAt&&!host.route.length){if(!host.returning){const p=host.station.route[Math.floor(t/15)%host.station.route.length];host.route=planPath(host.root.position,{x:p[0],y:p[1],z:p[2]});host.returning=true;stats.hostWanders++;}else{host.route=planPath(host.root.position,host.home);host.returning=false;}host.breakAt=t+10+random()*8;}if(host.route.length){const step=nav.followActorRoute(host,dt,{doors,moveActor,npcs,arrivalTolerance:.16});if(step.blocked&&!doors.routeBlocked(host.route,host.root.position))host.route=[];}}
  while(elapsed<days*daySeconds-1e-8){
   currentDt=Math.min(.1,days*daySeconds-elapsed);elapsed+=currentDt;nav.beginActorNavigationStep(currentDt);clock.advance(currentDt);needs.update();toilet.update(currentDt);kitchen.update(currentDt,elapsed);palace.update(currentDt,elapsed,clock.state());wander(currentDt,elapsed);
   if(elapsed>=nextSample){nextSample+=1;const state=tea.state();if(state.runtime)seenPhases.add(state.runtime.phase);const p=palace.socialProfile('cn-tea');if(stats.legacyHostBrainUrgentAtIgnored===null&&(p.needs.hunger>.82||p.needs.fatigue>.88))stats.legacyHostBrainUrgentAtIgnored=+elapsed.toFixed(2);for(const r of kitchen.mealReceipts())if(!seenMeals.has(r.id)){seenMeals.add(r.id);bucket().mealCompletions++;}for(const r of toilet.state().facilities.palace.receipts)if(!seenToilets.has(r.id)){seenToilets.add(r.id);bucket().toiletCompletions++;}}
   assert(!needs.has('cn-tea'),'host needs gate remains off');
  }
  stats.phases=[...seenPhases];stats.travelDistance=+stats.travelDistance.toFixed(2);stats.maxTravelStep=+stats.maxTravelStep.toFixed(5);
  const money=account.snapshot(),end=palace.state(),teaEnd=tea.state();assert.equal(money.accounts['cn-tea']?.bank||0,payEvents.length*8);assert.equal(money.receipts.length,payEvents.length);assert(teaEnd.orders.orders.every(o=>consorts.some(n=>n.station.id===o.guestId)));assert(new Set(money.receipts.map(r=>r.id)).size===money.receipts.length);
  const result={seed,loadedSeconds:+elapsed.toFixed(6),days:daily,completed:payEvents.length,completionsPerDay:payEvents.length/days,income:payEvents.length*8,foodCost:days*6,netVersusFood:payEvents.length*8-days*6,account:money.accounts['cn-tea']||{bank:0,cash:0},requestEvents,payEvents,cancelEvents,stats,legacyHostBrainNeedsIgnored:end.decisions.people['cn-tea'].needs,kitchenSupply:kitchen.supplyState(),endActors:end.actors.map(n=>({id:n.id,activity:n.activity,stage:n.stage,cycles:n.cycles})),palaceFailures:end.failures,teaOrders:teaEnd.orders.orders.map(o=>({id:o.id,guestId:o.guestId,day:o.day,stage:o.stage})),walkSpeeds:Object.fromEntries(npcs.map(n=>[n.station.id,n.locomotion.walkSpeed]))};
  results.push(result);console.log('TEA_DEMAND_SEED '+JSON.stringify(result));
  palace.dispose();tea.dispose();kitchen.dispose();toilet.dispose();queue.dispose();
 }
 console.log('TEA_DEMAND_SUMMARY '+JSON.stringify({scope:'Actual normal-choice palace/service/accounts/shared needs/kitchen/private toilet; open static-passage movement and hand-target doubles; not whole-world or visual QA.',seeds,daysPerSeed:days,requiredCompletionsPerDay:.75,totalCompleted:results.reduce((n,r)=>n+r.completed,0),meanCompletionsPerDay:results.reduce((n,r)=>n+r.completed,0)/(seeds.length*days),limitations:['No whole-world walls, closed route doors, crowd, player interruptions, court duties or unrelated residents.','Private toilet privacy closures are closed fixtures; bed anchors are private-room home points.','Royal kitchen has real finite pantry, original orders, timed production, diner seats and consumed receipts; chef personal needs/trips and stair detours omitted.','Normal host wander uses the original 10 + uniform(0,8) wait and home-return formula with an independent deterministic RNG, because main uses Math.random.','Hand-target doubles acknowledge actual service guest poses; this is not anatomical/visual contact evidence.','No host needs enrollment, spending, automatic refill or baseline wage is added.']}));
})().catch(e=>{console.error(e);process.exitCode=1;});
