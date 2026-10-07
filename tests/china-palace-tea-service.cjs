// Real Three objects/hand following with narrow movement doubles; not browser
// coverage or natural multi-day demand/production navigation evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console,structuredClone,performance}),cache=new Map();
const mod=file=>{if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context}));return cache.get(file);};
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const m=mod(path.join(root,'game/china-palace-tea-service.js'));await m.link(linker);await m.evaluate();const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 const am=mod(path.join(root,'game/npc-piecework-account.js'));await am.link(linker);await am.evaluate();
 const role=cache.get(path.join(root,'game/china-palace-tea-role.js')).namespace.PALACE_TEA_ROLE;
 const cm=mod(path.join(root,'game/characters.js'));await cm.link(linker);await cm.evaluate();let maxContactGap=0;
 function actor(id,p){const character=cm.namespace.createCharacter({culture:'china',scale:.96,style:'casual',...(id==='cn-consort-yue'?{bodyPreset:'feminine-balanced'}:{})}),root=character.root;root.position.set(...p);const animate=character.animate;return {...character,root,station:{id},home:root.position.clone(),phase:0,route:[],locomotion:{walkSpeed:1.3},animate(t,walking,action,c){assert.equal(action,null);const empty=['approach','guest-lift','drink','lower','home'].includes(service?.state().runtime?.phase);if(id==='cn-tea'&&empty){assert.equal(c.handoff,false,'empty service stages release both arms');assert.equal(c.archery,null,'empty service stages cannot pin wrists');}else assert(c.handoff);animate(t,walking,action,c);root.updateWorldMatrix(true,true);if(c.handoffLean!==undefined&&c.archery?.hands){const sides=id==='cn-consort-yue'?[1]:[0,1];for(const side of sides){const desired=root.userData.body.localToWorld(new T.Vector3(...c.archery.hands[side])),actual=root.userData.hands[side].getWorldPosition(new T.Vector3()),gap=actual.distanceTo(desired);maxContactGap=Math.max(maxContactGap,gap);assert(gap<.04,`${id} actual anatomical wrist miss ${gap} phase=${service?.state().runtime?.phase} walking=${walking} lean=${c.handoffLean}`);}}}};}

 const host=actor('cn-tea',[2.9,.815,-29.68]),guest=actor('cn-consort-yue',[2.9,.815,-28.25]),npcs=[host,guest],lot={group:new T.Group()};let saved=null,paidHome=null,saveOK=true;
 const account=am.namespace.createNPCPieceworkAccount({role,namespace:'chinaTeaAccounts',proofKind:'npc-palace-tea-piecework',saveState:(money,r,patch)=>{if(!saveOK)return false;saved={...patch,chinaTeaAccounts:structuredClone(money)};if(patch.chinaTeaService?.runtime?.phase==='home')paidHome=structuredClone(patch.chinaTeaService);return true;}});
 let a={status:'npc',actor:host,holderId:'cn-tea',revision:0,alive:true,available:true};
 const options={npcs,lot,account,resolveAssignment:()=>a,poseContext:()=>({}),saveState:s=>{if(!saveOK)return false;saved={...saved,chinaTeaService:structuredClone(s)};return true;},planPath:(p,to)=>[to],doors:{routeStep:(route,p)=>{while(route.length&&Math.hypot(p.x-route[0].x,p.z-route[0].z)<.025)route.shift();return {waypoint:route[0]};}},moveActor(n,dx,dz){n.root.position.x+=dx;n.root.position.z+=dz;}};
 let service=m.namespace.createPalaceTeaService(options),t=0;
 const request=()=>service.request({guest,visitId:'original-visit',day:0,guestAsked:true,hostAccepted:true});
 assert(request().ok);assert(service.owns(host));assert(!service.owns(guest));assert(!service.handoffBoundary().ok);assert.equal(service.state().props.cupCount,1);
 const target=service.guestTarget(guest.station.id);guest.root.position.set(...target); // Palace life is the sole production guest mover.
 const phases=new Set();let blockedOnce=false,pausedOnce=false;
 for(let i=0;i<1200&&service.owns(host);i++){const state=service.state();phases.add(state.runtime.phase);if(state.runtime.phase==='prepare'&&!pausedOnce){const before=service.snapshot(),route=host.route,cup=service.state().props;for(let j=0;j<100;j++){t+=1;service.update(1,t,{conversationActorId:host.station.id});}assert.deepEqual(service.snapshot().runtime,before.runtime,'long nearby talk preserves original elapsed/age and route');assert.deepEqual(service.snapshot().orders,before.orders);assert.equal(host.route,route);assert.equal(service.state().props.cupCount,cup.cupCount);assert.equal(account.account('cn-tea').bank,0);pausedOnce=true;}if(state.runtime.phase==='clear'&&!blockedOnce){saveOK=false;for(let j=0;j<30;j++){t+=.1;service.update(.1,t);}assert.equal(account.account('cn-tea').bank,0);assert.equal(service.state().runtime.phase,'clear');saveOK=true;blockedOnce=true;}const look=service.guestLookTarget(guest.station.id);if(look)guest.root.rotation.y=Math.atan2(look[0]-guest.root.position.x,look[2]-guest.root.position.z);const pose=service.guestPose(guest.station.id,t);if(pose){guest.animate(t,false,null,pose);service.observeGuestPose(guest,t);}t+=.1;service.update(.1,t);}
 assert.equal(account.account('cn-tea').bank,8,JSON.stringify(service.state()));assert.equal(account.snapshot().receipts.length,1);assert(service.handoffBoundary().ok);assert.equal(service.state().props.cupCount,0);for(const phase of ['prepare','pickup','carry','place','drink','lower','retrieve','return','clear','home'])assert(phases.has(phase),phase);
 assert.equal(saved.chinaTeaService.orders.orders[0].stage,'cleared');service.dispose();
 service=m.namespace.createPalaceTeaService({...options,saved:saved.chinaTeaService});guest.root.position.set(2.9,.815,-28.25);assert(!request().ok);assert.equal(account.account('cn-tea').bank,8);service.dispose();
 // A mismatched saved paid return never touches the historical worker's
 // current route, walking state, or income after another person takes the slot.
 assert(paidHome);host.route=[{x:9,y:.815,z:-29}];host.walking=true;a={status:'npc',actor:guest,holderId:guest.station.id,revision:1,alive:true,available:true};service=m.namespace.createPalaceTeaService({...options,saved:paidHome});service.update(.1,t+.1);assert.equal(host.route.length,1);assert(host.walking);assert.equal(service.state().runtime,null);assert.equal(account.account('cn-tea').bank,8);service.dispose();host.route=[];host.walking=false;a={status:'npc',actor:host,holderId:'cn-tea',revision:0,alive:true,available:true};
 // Accepted unfinished original is safely cancelled on reload; no earned
 // progress is reassigned, and this same guest/day cannot be requested again.
 saved=null;service=m.namespace.createPalaceTeaService(options);assert(request().ok);const pending=service.snapshot();service.dispose();service=m.namespace.createPalaceTeaService({...options,saved:pending});assert.equal(service.state().orders.orders[0].stage,'cancelled');const durableRecovery=service.snapshot();assert(durableRecovery.recovery);service.dispose();service=m.namespace.createPalaceTeaService({...options,saved:durableRecovery});host.route=[{x:4.45,y:.815,z:-30}];host.walking=true;const recovery=service.reconcileAfterRestore();assert.equal(recovery.actorId,'cn-tea');assert.equal(host.route.length,0);assert(!host.walking);assert(host.returning);assert(!service.reconcileAfterRestore().actorId);assert(!request().ok);assert.equal(account.account('cn-tea').bank,8);service.dispose();

 // Departing guest and missing actual guest animation cannot mint time proof.
 for(const mode of ['guest-left','no-pose','vacancy','missing-hand']){
  saved=null;a={status:'npc',actor:host,holderId:'cn-tea',revision:0,alive:true,available:true};host.root.position.set(2.9,.815,-29.68);host.route=[];guest.root.position.set(2.9,.815,-28.25);service=m.namespace.createPalaceTeaService(options);assert(request().ok);guest.root.position.set(...service.guestTarget(guest.station.id));
  for(let i=0;i<2000&&service.state().runtime?.phase!=='drink';i++){t+=.1;service.update(.1,t);}assert.equal(service.state().runtime.phase,'drink');
  const hands=host.root.userData.hands;
  if(mode==='guest-left')guest.root.position.x+=3;
  if(mode==='vacancy')a={status:'vacant',actor:null,holderId:null,revision:1,alive:false,available:false};
  if(mode==='missing-hand')host.root.userData.hands=[hands[0]];
  for(let i=0;i<1000&&service.state().runtime;i++){t+=.1;service.update(.1,t);}
  assert.equal(service.state().runtime,null,mode);assert.equal(service.state().orders.orders[0].stage,'cancelled');assert.equal(host.route.length,0);assert.equal(account.account('cn-tea').bank,8);host.root.userData.hands=hands;service.dispose();
 }
 assert(maxContactGap<.04);console.log('actual rig max wrist gap',maxContactGap);
 console.log('PASS physical phase sequence, original Three cup/tray, one host owner, zero guest movement, failure at clear, atomic 8 pay and return, replay/reload cancellation');
})().catch(e=>{console.error(e);process.exitCode=1;});
