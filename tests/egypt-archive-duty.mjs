// Real archive service, durable state and rendered scroll identities. Straight-line
// actor routes are fixtures, not production navigation or browser visual evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three');
const {createEgyptArchiveService,EGYPT_ARCHIVE_POINTS:P}=await import('../source/game/egypt-archive-service.js');
const {validEgyptArchiveReceipt}=await import('../source/game/egypt-archive-role.js');
const {holdSocialActors,releaseSocialActors}=await import('../source/game/npc-social-ownership.js');
const {beginActorNavigationStep}=await import('../source/game/actor-navigation.js');
const DUTY='eg-archive-labor-1',copy=structuredClone,ID='egypt-artisan-1';
function fixture({saved=null,accepted=[],getAccepted=null,actorPosition=P.home,playerPosition=[30,0,30]}={}){
 const group=new T.Group();
 function actor(id,p){const root=new T.Group();root.position.fromArray(p);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.16,1.08,.43);hands[1].position.set(.16,1.08,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,home:new T.Vector3(...P.home),station:{id,npcPosition:p.slice()},route:[],phase:0,locomotion:{walkSpeed:2},animate(_t,walking,_a,context){this.lastPose={walking,context:copy(context)};}};}
 const client=actor('egypt-royal-reception',actorPosition),player=actor('player',playerPosition);let ids=copy(accepted),reject=()=>false,durable=saved?copy(saved):null,borrow=true,upstream=false,owns=false,mounted=null,blocked=false,time=0;
 const service=createEgyptArchiveService({npcs:[client],lot:{group},doors:{routeStep(route,p){if(blocked)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}},planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:(_n,target)=>({...target}),getPlayer:()=>player,getMounted:()=>mounted,getAccepted:getAccepted||(()=>ids),upstreamNeedsClient:()=>upstream,upstreamOwnsClient:()=>owns,canBorrow:()=>borrow,saved,saveState:s=>{if(reject(s))return false;durable=copy(s);return true;}});
 const tick=(count=1)=>{for(let i=0;i<count;i++){time+=.1;beginActorNavigationStep(.1);service.update(.1,time);}};
 const until=(predicate,label='expected state',limit=2000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),`${label}: ${JSON.stringify(service.state())}`);};
 return {service,duty:service.duty,client,player,group,tick,until,move:p=>player.root.position.fromArray(p),accept:v=>ids=copy(v),reject:fn=>reject=fn,borrow:v=>borrow=v,upstream:v=>upstream=v,upstreamOwns:v=>owns=v,mount:v=>mounted=v,block:v=>blocked=v,mesh:id=>group.getObjectByName(id+'-scroll'),checkpoint:()=>({saved:service.snapshot(),accepted:copy(ids),actorPosition:client.root.position.toArray(),playerPosition:player.root.position.toArray()}),get durable(){return durable;},dispose:()=>service.dispose()};
}
function claim(f){f.move(P.registry);f.duty.requestMeeting(true);f.until(()=>f.duty.meetingReady(),'Ahe local meeting');assert(f.duty.claimDuty(DUTY));f.until(()=>f.duty.dutyActive(DUTY),'safe archive takeover');f.duty.requestMeeting(false);}
function stage(f,expected,next){const w=f.duty.workIntent(DUTY);assert.equal(w?.stage,expected);f.move(w.position);assert.equal(f.duty.executeWork(w,'eg-archive-labor-999'),false);assert(f.duty.executeWork(w,DUTY));f.tick(Math.round(w.duration*10)-1);assert.equal(f.service.state().order?.stage||'register',expected,'actual timed work must finish before transition');f.until(s=>next===null?!s.order:s.order?.stage===next,`${expected} to ${next}`);return w;}
function toHeld(f){claim(f);stage(f,'register','pickup');stage(f,'pickup','store');assert(f.duty.held());}

test('only explicit accepted original source unlocks three timed steps and the same retained mesh',()=>{
 const f=fixture();claim(f);assert.equal(f.duty.workIntent(DUTY),null);f.tick(100);assert.equal(f.mesh(ID),undefined);assert.deepEqual(f.service.state().archived,[]);
 f.accept([ID]);f.tick();const mesh=f.mesh(ID);assert(mesh);assert.deepEqual(mesh.position.toArray(),P.top);stage(f,'register','pickup');assert.equal(f.mesh(ID),mesh);assert.deepEqual(f.duty.workReceipts(DUTY),[]);stage(f,'pickup','store');assert.equal(f.mesh(ID),mesh);assert.equal(f.service.state().order.holder,'player');assert(mesh.position.distanceTo(f.player.root.position)<2);assert.equal(f.duty.releaseDuty(DUTY,{evaluate:true}),true,'original can be returned locally');assert.equal(f.service.state().order.holder,'desk');f.dispose();
 const g=fixture({accepted:[ID]});toHeld(g);const carried=g.mesh(ID);stage(g,'store',null);assert.equal(g.mesh(ID),carried);assert.deepEqual(carried.position.toArray(),P.storageTop);assert.equal(carried.userData.archived,true);const [proof]=g.duty.workReceipts(DUTY);assert(validEgyptArchiveReceipt(proof));assert.equal(proof.itemId,ID+'-scroll');assert.equal(proof.supplyReceipt,ID+'-materials');assert.deepEqual(g.service.state().archived,[ID]);g.tick(100);assert.equal(g.duty.workReceipts(DUTY).length,1);assert.equal(g.duty.workIntent(DUTY),null);g.dispose();
});

test('refused register pickup and storage saves retry without losing the original or minting receipts',()=>{
 const f=fixture({accepted:[ID]});claim(f);const original=f.mesh(ID);
 for(const [name,next,reject]of [['register','pickup',s=>!!s.order],['pickup','store',s=>s.order?.holder==='player'],['store',null,s=>s.archived.length>0]]){
  const w=f.duty.workIntent(DUTY);assert.equal(w.stage,name);f.move(w.position);f.reject(reject);assert(f.duty.executeWork(w,DUTY));f.tick(Math.ceil(w.duration*10)+10);assert.equal(f.service.state().order?.stage||'register',name);assert.deepEqual(f.service.state().archived,[]);assert.deepEqual(f.duty.workReceipts(DUTY),[]);assert.equal(f.mesh(ID),original);if(name==='store')assert(f.duty.held());f.reject(()=>false);f.until(s=>next===null?!s.order:s.order?.stage===next);
 }
 assert.equal(f.duty.workReceipts(DUTY).length,1);assert.deepEqual(f.durable.archived,[ID]);f.dispose();
});

test('cold held restore preserves source identity and rejects mismatched revisions',()=>{
 const f=fixture({accepted:[ID]});toHeld(f);const saved=f.checkpoint();f.dispose();const g=fixture(saved);assert(g.service.restore(saved.saved));assert.equal(g.service.restore({...saved.saved,revision:saved.saved.revision+1}),false);assert.equal(g.service.restore({...saved.saved,revision:saved.saved.revision-1}),false);g.tick();assert(g.duty.held());assert.equal(g.mesh(ID).userData.orderId,ID);stage(g,'store',null);assert.equal(g.duty.workReceipts(DUTY).length,1);const archived=g.checkpoint();g.dispose();const h=fixture(archived);assert.equal(h.mesh(ID).userData.archived,true);assert.deepEqual(h.mesh(ID).position.toArray(),P.storageTop);h.dispose();
});

test('paused custody cannot be stolen; cancellation returns original and NPC finishes without player completion XP proof',()=>{
 const f=fixture({accepted:[ID]});toHeld(f);const mesh=f.mesh(ID);f.move([30,0,30]);f.tick();assert.equal(f.duty.dutyState().status,'paused');f.tick(150);assert(f.duty.held());assert.equal(f.mesh(ID),mesh);assert.deepEqual(f.service.state().archived,[]);assert.equal(f.duty.releaseDuty(DUTY,{evaluate:true}),false);f.move(P.desk);f.tick(10);assert.equal(f.duty.dutyState().status,'paused');f.reject(s=>s.duty===null);assert.equal(f.duty.releaseDuty(DUTY,{evaluate:true}),false);assert(f.duty.held());f.reject(()=>false);assert(f.duty.releaseDuty(DUTY,{evaluate:true}));assert.equal(f.service.state().order.holder,'desk');assert.equal(f.service.state().order.stage,'pickup');assert.equal(f.duty.workReceipts(DUTY)[0].outcome,'handoff');f.move([30,0,30]);f.until(s=>s.archived.includes(ID));assert.equal(f.mesh(ID),mesh);assert.deepEqual(f.duty.workReceipts(DUTY).filter(r=>r.completed),[]);assert.equal(f.duty.workReceipts(DUTY).length,1);f.dispose();
});

test('eight actual accepted originals remain individually retained and finite through reload',()=>{
 const f=fixture();const meshes=[];for(let i=1;i<=8;i++){f.accept(Array.from({length:i},(_,j)=>`egypt-artisan-${j+1}`));f.until(s=>s.archived.length===i,`archive original ${i}`);meshes.push(f.mesh(`egypt-artisan-${i}`));for(let j=0;j<i;j++){assert.equal(f.mesh(`egypt-artisan-${j+1}`),meshes[j]);assert.equal(meshes[j].userData.archived,true);}assert.equal(f.group.getObjectByName('阿赫原号卷轴收存').children.length,i);}
 const saved=f.checkpoint();f.dispose();const g=fixture(saved);g.tick(1000);assert.equal(g.service.state().archived.length,8);assert.equal(g.group.getObjectByName('阿赫原号卷轴收存').children.length,8);assert.deepEqual(g.duty.workReceipts(DUTY),[]);claim(g);assert.equal(g.duty.workIntent(DUTY),null);assert(g.duty.canEndDuty(DUTY));g.dispose();
});

test('upstream original acceptance returns held archive to desk then walks home without teleporting',()=>{
 const f=fixture({accepted:[ID]});f.until(s=>s.order?.holder==='npc');f.until(()=>f.client.root.position.distanceTo(new T.Vector3(...P.desk))>.6,'NPC departed desk toward storage');const mesh=f.mesh(ID);f.upstream(true);f.block(true);const start=f.client.root.position.clone();f.tick(30);assert(f.client.root.position.equals(start));assert.equal(f.service.state().order.holder,'npc');assert.equal(f.service.canAcceptOriginal(),false);f.block(false);
 let deskReturned=false;for(let i=0;i<150&&!f.service.canAcceptOriginal();i++){const before=f.client.root.position.clone();f.tick();assert(f.client.root.position.distanceTo(before)<.25,'NPC must walk rather than teleport');assert.equal(f.mesh(ID),mesh);if(f.service.state().order.holder==='desk'){deskReturned=true;assert.deepEqual(mesh.position.toArray(),P.top);}}
 assert(deskReturned);assert(f.service.canAcceptOriginal());assert.equal(f.service.state().order.stage,'pickup');assert.deepEqual(f.service.state().archived,[]);f.upstreamOwns(true);const home=f.client.root.position.clone();f.tick(30);assert(f.client.root.position.equals(home));assert.equal(f.service.owns(f.client),false);f.upstreamOwns(false);f.upstream(false);f.until(s=>s.archived.includes(ID));assert.equal(f.mesh(ID),mesh);f.dispose();
});

test('needs and social ownership block archive borrowing and meeting',()=>{
 const f=fixture({accepted:[ID]});f.borrow(false);f.move(P.registry);f.duty.requestMeeting(true);f.tick(40);assert.equal(f.duty.meetingReady(),false);assert.equal(f.duty.canClaimDuty(),false);assert.equal(f.service.owns(f.client),false);assert.equal(f.service.state().order,null);f.borrow(true);assert(holdSocialActors(['egypt-royal-reception'],'archive-fixture'));f.tick(40);assert.equal(f.duty.meetingReady(),false);assert.equal(f.duty.canClaimDuty(),false);assert.equal(f.service.owns(f.client),false);releaseSocialActors('archive-fixture');f.tick();assert(f.duty.meetingReady());f.duty.requestMeeting(false);f.move([30,0,30]);f.until(s=>s.order?.holder==='npc');f.borrow(false);const position=f.client.root.position.clone();f.tick(100);assert.equal(f.service.state().order.holder,'npc');assert(f.client.root.position.equals(position));assert.equal(f.service.owns(f.client),false);f.borrow(true);f.until(s=>s.archived.includes(ID));f.dispose();
});

test('invented source and malformed source completion persistence are rejected',()=>{
 for(const accepted of [['egypt-artisan-2'],[ID,ID],['egypt-artisan-9'],[{id:ID,accepted:true}]]){const f=fixture({accepted});f.tick(100);assert.equal(f.service.state().order,null);assert.equal(f.group.getObjectByName('阿赫原号卷轴收存').children.length,0);f.dispose();}
 const f=fixture({accepted:[ID]});toHeld(f);const held=f.checkpoint();stage(f,'store',null);const done=f.checkpoint();f.dispose();
 for(const [source,change]of [[held,s=>s.order.id='egypt-artisan-2'],[held,s=>s.order.number=8],[held,s=>s.order.holder='desk'],[held,s=>s.order.startedAt=undefined],[done,s=>s.archived=[ID,ID]],[done,s=>s.archived=['egypt-artisan-2']],[done,s=>s.archived=[]],[done,s=>s.receipts[0].supplyReceipt='invented'],[done,s=>s.receipts[0].completed=false]]){const saved=copy(source);change(saved.saved);const g=fixture(saved);assert.equal(g.service.state().lastError,'invalid-archive-state');g.dispose();}
 const missing=fixture({...done,accepted:[]});assert.equal(missing.service.state().lastError,'invalid-archive-state');missing.dispose();
});


test('real artisan completion history unlocks archive only after durably accepted delivery',async()=>{
 const {createEgyptArtisanService,EGYPT_ARTISAN_POINTS:A}=await import('../source/game/egypt-artisan-service.js');
 const group=new T.Group();function actor(id,p){const root=new T.Group();root.position.fromArray(p);group.add(root);return {root,home:new T.Vector3(...p),station:{id,npcPosition:p.slice()},phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};}
 const artisan=actor('egypt-papyrus',A.home),client=actor('egypt-royal-reception',A.clientHome),player=actor('player',[30,0,30]);let refuseAcceptance=true,time=0;
 const source=createEgyptArtisanService({npcs:[artisan,client],lot:{group},doors:{routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}},planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},getPlayer:()=>player,getClock:()=>({day:1,hour:6,seconds:time}),poseContext:()=>({}),saveState:s=>!(refuseAcceptance&&s.completed.length>0)});
 const f=fixture({getAccepted:()=>source.state().completed});claim(f);
 const tick=()=>{time+=.1;beginActorNavigationStep(.1);source.update(.1,time);f.tick();};
 for(let i=0;i<1500&&source.state().order?.stage!=='deliver';i++){tick();assert.equal(f.duty.workIntent(DUTY),null);assert.equal(f.mesh(ID),undefined);}
 assert.equal(source.state().order.stage,'deliver');for(let i=0;i<100;i++)tick();assert.deepEqual(source.state().completed,[]);assert.equal(f.duty.workIntent(DUTY),null);assert.equal(f.mesh(ID),undefined);
 refuseAcceptance=false;for(let i=0;i<200&&!source.state().completed.length;i++)tick();assert.deepEqual(source.state().completed,[ID]);assert.equal(f.duty.workIntent(DUTY).orderId,ID);stage(f,'register','pickup');stage(f,'pickup','store');stage(f,'store',null);assert.deepEqual(f.service.state().archived,source.state().completed);assert.equal(f.duty.workReceipts(DUTY).length,1);source.dispose();f.dispose();
});
