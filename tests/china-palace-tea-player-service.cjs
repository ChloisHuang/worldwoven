// Reproduces player work being auto-run/cancelled or double-paid across pauses,
// failed saves and reloads. Uses real original Three props, narrow host/guest
// doubles and manual input, not a browser or naturally chosen demand claim.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console,structuredClone,performance}),cache=new Map();
const mod=file=>{if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context}));return cache.get(file);};
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const m=mod(path.join(root,'game/china-palace-tea-service.js'));await m.link(linker);await m.evaluate();const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 const proofModule=mod(path.join(root,'game/china-palace-tea-proof.js'));await proofModule.link(linker);await proofModule.evaluate();
 const am=mod(path.join(root,'game/npc-piecework-account.js'));await am.link(linker);await am.evaluate();
 const role=cache.get(path.join(root,'game/china-palace-tea-role.js')).namespace.PALACE_TEA_ROLE,P=cache.get(path.join(root,'game/china-palace-tea-props.js')).namespace.PALACE_TEA_POINTS;
 function actor(id,p){const root=new T.Group(),hands=[new T.Group(),new T.Group()];root.add(...hands);root.userData.hands=hands;root.position.set(...p);return {root,station:{id},home:root.position.clone(),route:[],walking:false,animate(){throw Error('service must not animate player or guest');}};}
 const player=actor('player',P.hostHome),guest=actor('cn-consort-yue',[2.9,.815,-28.25]),npcs=[guest],lot={group:new T.Group()};
 let saved=null,saveOK=true,busy=false,t=0,service,payments=[],assignment={status:'player',holderId:'player',actor:player,revision:2,alive:true,available:true};
 const npcAccount=am.namespace.createNPCPieceworkAccount({role,namespace:'chinaTeaAccounts',proofKind:'npc-palace-tea-piecework',saveState:()=>true});
 const account={settle(proof,patch){const valid=proofModule.namespace.validatePalaceTeaPlayerProof(proof);assert.throws(()=>proofModule.namespace.validatePalaceTeaProof(proof));assert.equal(npcAccount.settle(proof).ok,false);if(!saveOK)return {ok:false,code:'save-failed'};payments.push(valid);saved=structuredClone(patch.chinaTeaService);assert.equal(saved.orders.orders[0].stage,'cleared');assert.equal(saved.runtime.phase,'home');return {ok:true};}};
 const options={npcs,lot,account,resolveAssignment:()=>assignment,getBusy:()=>busy,saveState:s=>{if(!saveOK)return false;saved=structuredClone(s);return true;},planPath(){throw Error('service must not route player');},moveActor(){throw Error('service must not move player');}};
 const make=state=>m.namespace.createPalaceTeaService({...options,saved:state});
 const request=()=>service.request({guest,visitId:'same-real-visit',day:0,guestAsked:true,hostAccepted:true});
 const tick=(n=1,state={},observe=true)=>{for(let i=0;i<n;i++){const gp=service.guestPose(guest.station.id,t);if(gp&&observe){gp.archery.hands.forEach((p,j)=>guest.root.userData.hands[j].position.set(...p));service.observeGuestPose(guest,t);}t+=.1;service.update(.1,t,state);}};
 const moveToWork=()=>{const w=service.workIntent();assert(w,'expected player work');player.root.position.set(...w.position);player.root.rotation.y=Math.atan2(w.target[0]-w.position[0],w.target[2]-w.position[2]);return w;};
 const act=()=>{const w=moveToWork();assert(service.executeWork(w),w.kind);return w;};
 const reach=phase=>{for(let i=0;i<150&&service.state().runtime?.phase!==phase;i++)tick();assert.equal(service.state().runtime?.phase,phase);};
 const reload=()=>{const before=service.snapshot(),ids=service.state().props;service.dispose();service=make(before);assert.equal(service.loadError,null);service.setPlayerWorking(true);assert.deepEqual(service.snapshot().orders,before.orders);assert.equal(service.state().runtime.phase,before.runtime.phase);assert.equal(service.state().runtime.elapsed,before.runtime.elapsed);assert.equal(service.state().props.cupId,ids.cupId);assert.equal(service.state().props.trayId,ids.trayId);assert.equal(service.state().runtime.actionActive,false);assert(!service.handoffBoundary().ok);};
 service=make();assert(!request().ok);service.setPlayerWorking(true);assert(service.hostReady());assert(request().ok);assert(!request().ok);assert(service.owns(player));assert(!service.owns(guest));assert.equal(service.state().props.cupCount,1);const original=service.state().orders.orders[0],position=player.root.position.toArray();
 guest.root.position.set(...service.guestTarget(guest.station.id));tick(1200);assert.equal(service.state().runtime.phase,'approach');assert.deepEqual(player.root.position.toArray(),position);assert.equal(service.state().runtime.elapsed,0);assert.equal(payments.length,0);reload();
 const stale=act();tick(10);const beforePause=service.snapshot();tick(1200,{conversationActorId:'cn-scribe'});assert.deepEqual(service.snapshot().runtime,beforePause.runtime);assert.deepEqual(service.snapshot().orders,beforePause.orders);tick(1);busy=true;const elapsed=service.state().runtime.elapsed;tick(120);assert.equal(service.state().runtime.elapsed,elapsed);busy=false;assert(service.stopWorkAction());tick(20);assert.equal(service.state().runtime.elapsed,elapsed);assert(service.executeWork(service.workIntent()));reach('pickup');assert(!service.executeWork(stale));reload();
 act();reach('carry');const carried=service.snapshot();tick(100);assert.deepEqual(service.snapshot().runtime,carried.runtime);assert.equal(service.state().props.cupId,original.cupId);reload();
 act();reach('guest-lift');reload();reach('drink');const beforeDrink=service.state().runtime.elapsed;tick(50,{},false);assert.equal(service.state().runtime.elapsed,beforeDrink,'no elapsed proof without original guest pose');reload();reach('retrieve');
 assert.equal(service.state().orders.orders[0].stage,'drunk');reload();act();reach('return');reload();act();
 saveOK=false;tick(100);assert.equal(payments.length,0);assert.equal(service.state().runtime.phase,'clear');assert.equal(service.state().orders.orders[0].stage,'retrieved');assert.equal(service.state().props.cupCount,1);saveOK=true;tick();assert.equal(payments.length,1);assert.equal(payments[0].actorId,'player');assert.equal(payments[0].kind,'player-palace-tea-piecework');assert.equal(payments[0].amount,8);assert.equal(payments[0].cupId,original.cupId);assert.equal(payments[0].trayId,original.trayId);assert.equal(service.state().props.cupCount,0);assert(!service.handoffBoundary().ok);
 const completed=service.snapshot();service.dispose();service=make(completed);service.setPlayerWorking(true);tick(50);assert.equal(payments.length,1);assert.equal(service.state().runtime.phase,'home');act();assert(service.handoffBoundary().ok);assert.equal(service.state().runtime,null);guest.root.position.set(2.9,.815,-28.25);assert(!request().ok);assert.equal(payments.length,1);assert.equal(npcAccount.account('cn-tea').bank,0);service.dispose();

 // Adult player anatomy uses the actual larger player service clearance.
 {const cm=mod(path.join(root,'game/characters.js'));await cm.link(linker);await cm.evaluate();let maxGap=0;
 for(const variant of [0,1]){const rp=cm.namespace.createCharacter({culture:'china',variant,scale:1}),rg=cm.namespace.createCharacter({culture:'china',variant:1,scale:.96}),rpAnimate=rp.animate;rp.actorId='player';rp.station={id:'player'};rp.route=[];rp.root.position.set(...P.hostHome);rp.home=rp.root.position.clone();rp.animate=()=>{throw Error('no automatic player animation');};rg.station={id:'cn-consort-yue'};rg.route=[];rg.root.position.set(2.9,.815,-28.25);let paid=0;
 const rs=m.namespace.createPalaceTeaService({npcs:[rg],lot:{group:new T.Group()},resolveAssignment:()=>({status:'player',holderId:'player',actor:rp,revision:1,alive:true,available:true}),account:{settle(){paid++;return {ok:true};}},saveState:()=>true});rs.setPlayerWorking(true);assert(rs.request({guest:rg,visitId:'actual-rig',day:0,guestAsked:true,hostAccepted:true}).ok);rg.root.position.set(...P.guest);
 for(let i=0;i<350&&rs.state().runtime;i++){const w=rs.workIntent();if(w){rp.root.position.set(...w.position);rp.root.position.y=.885;assert(rs.executeWork(w));}const pose=rs.playerPose();if(pose){rpAnimate(i*.1,false,null,pose);rp.root.updateWorldMatrix(true,true);if(['prepare','pickup','carry','place','retrieve','return','clear'].includes(rs.state().runtime?.phase)){for(const side of [0,1]){const desired=rp.root.userData.body.localToWorld(new T.Vector3(...pose.archery.hands[side])),actual=rp.root.userData.hands[side].getWorldPosition(new T.Vector3()),gap=actual.distanceTo(desired);maxGap=Math.max(maxGap,gap);assert(gap<.04,`player ${variant} wrist miss ${gap} phase ${rs.state().runtime.phase} elapsed ${rs.state().runtime.elapsed}`);}}}const gp=rs.guestPose(rg.station.id,i*.1);if(gp){rg.animate(i*.1,false,null,gp);rs.observeGuestPose(rg,i*.1);}rs.update(.1,(i+1)*.1,{});}
 assert.equal(paid,1);assert(rs.handoffBoundary().ok);rs.dispose();rp.dispose();rg.dispose();}
 console.log('PASS both actual adult player rigs with larger service clearance and original cup/tray; max wrist gap',maxGap);}
 // A corrupt phase cannot reconstruct earned work or silently replace the
 // unfinished original with a new guest/day order.
 const invalid=structuredClone(carried);invalid.runtime.phase='clear';service=make(invalid);assert.equal(service.loadError,'invalid-tea-service-original');assert.deepEqual(service.snapshot(),invalid);service.dispose();

 // Exercise the real palace controller against an already accepted original
 // visit checkpoint. This is a restore/ownership fixture, not demand evidence.
 const lm=mod(path.join(root,'game/china-palace-life.js'));await lm.link(linker);await lm.evaluate();
 const fm=cache.get(path.join(root,'game/npc-facilities.js')),queue=fm.namespace.createFacilityQueue();
 guest.station={...lm.namespace.CHINA_PALACE_ROLES.find(r=>r.id===guest.station.id)};
 for(const station of [{id:'cn-tea',npcName:'Lin',npcPosition:P.hostHome},...lm.namespace.CHINA_PALACE_ROLES.filter(r=>r.id!==guest.station.id)]){const n=actor(station.id,station.npcPosition);n.station={...station};npcs.push(n);}
 for(const n of npcs){const head=new T.Group();n.root.add(head);n.root.userData.head=head;n.phase=0;n.locomotion={walkSpeed:1.3};n.animate=(t,walking,action,c={})=>{c.archery?.hands?.forEach((p,j)=>n.root.userData.hands[j]?.position.set(...p));};}
 const royals=npcs.filter(n=>n.station.royalRole),items=[{id:'china-furniture-throne',kind:'seat',position:[0,1.415,-4.3],anchor:[0,1.415,-4.3],yaw:0},...royals.map(n=>({id:n.station.privateBedId||'china-furniture-seat',kind:n.station.privateBedId?'bed':'seat',position:n.home.toArray(),anchor:n.home.toArray(),yaw:0}))];
 const furniture={items,facilities:queue,canSit:()=>true,canUse:()=>true,releaseActor:id=>queue.releaseActor(id),standPoint:(nav,safety,mount)=>new T.Vector3(...mount.position),bedSupportAt:()=>.215};
 Object.assign(lot,{colliders:[],walkableSurfaces:[],bounds:{minX:-40,maxX:40,minZ:-40,maxZ:40}});
 const lifeOptions={npcs,lot,furniture,getPlayer:()=>player,getTeaService:()=>service,poseContext:()=>({visualFloorOffset:0}),planPath:()=>[],moveActor:()=>{},doors:{cameraColliders:[],planningColliders:[],routeStep:()=>({waypoint:null})},saveState:()=>true};
 service=make(carried);service.setPlayerWorking(true);player.root.position.set(...P.hostPrep);guest.root.position.set(...P.guest);
 let palace=lm.namespace.createChinaPalaceLife(lifeOptions),world=palace.snapshot();palace.dispose();
 world.runtime.hostId='player';world.runtime.hostHeldId=guest.station.id;world.runtime.hostPreviousYaw=1.5;world.runtime.hostHeldAt=0;
 world.runtime.scripts[guest.station.id]=[{id:'tea-conversation',label:'原来客',path:[P.guest.slice()],duration:10,pair:true,chosen:true}];
 world.runtime.stages[guest.station.id]={choice:{id:'visit',targetId:'player',facilityId:'palace-tea-host',startedAt:0},index:0,waypoint:1,elapsed:0,arrived:true,planned:false,stalled:0,retries:0,mount:null,cycles:0,teaDecision:{visitId:original.visitId,asked:true}};
 world.runtime.claims=[{actor:guest.station.id,id:'palace-tea-host',remaining:3}];
 palace=lm.namespace.createChinaPalaceLife({...lifeOptions,saved:{continuity:world}});
 const sameVisit=palace.snapshot().runtime.stages[guest.station.id].teaDecision,yaw=player.root.rotation.y,playerBefore=player.root.position.toArray(),beforeOrders=service.snapshot().orders;
 for(let i=0;i<400;i++){t+=.1;palace.update(.1,t,{day:0,hour:10,conversationActorId:'cn-calligraphy',position:player.root.position});}
 assert(palace.state().hostHeld);assert.equal(palace.snapshot().runtime.hostId,'player');assert.deepEqual(palace.snapshot().runtime.stages[guest.station.id].teaDecision,sameVisit);assert.equal(palace.state().claims.find(c=>c.actor===guest.station.id).remaining,3);assert.deepEqual(service.snapshot().orders,beforeOrders);assert.equal(service.state().runtime.phase,'carry');assert.equal(player.root.rotation.y,yaw);assert.deepEqual(player.root.position.toArray(),playerBefore);
 const savedOriginal=service.snapshot();palace.dispose();assert.deepEqual(service.snapshot().orders,savedOriginal.orders,'leaving palace cannot cancel player original');service.dispose();queue.dispose();
 console.log('PASS player manual original cup/tray, no NPC movement/animation, long pause/resume, original phase reload, guest-pose evidence, atomic retry, distinct proof and NPC pay isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
