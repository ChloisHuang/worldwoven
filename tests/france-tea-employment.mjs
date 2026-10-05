// Regression for persistent local hiring, one physical service owner, actual
// guest completion and prorated wages. Geometry is one separate main route.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js');
const {createFranceTeaEmployment}=await import('../source/game/france-tea-employment.js');
const {createFormalCareers,TEA_SERVER_ROLE:R,FORMAL_CAREER_SLOTS}=await import('../source/game/formal-careers.js');
const {careerInterviewRoll}=await import('../source/game/career-applications.js');
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(saved={},options={}){
 const store=copy(saved),clock=store.clock||{day:1,hour:8,seconds:0},flags={},notices=[];let tea,employment,mounted=null;
 const save=key=>value=>{if(flags[key]||key==='career'&&flags.paid&&value.lastDuty?.stage==='paid')return false;store[key]=copy(value);store.clock=copy(clock);return true;};
 const bank=createCurrencyLedger({saved:store.bank,saveState:save('bank')});
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();delete initial.loadError;delete initial.lastError;
 initial.skills.ritual=options.ritual??2;initial.skills.writing=1;
 let seed=1;while(careerInterviewRoll(seed,R.id,clock.day)>=.6)seed++;
 const careers=createFormalCareers({worldSeed:seed,getClock:()=>clock,saved:store.career||initial,saveState:save('career'),creditWageToBank:bank.creditWageToBank,...(options.noSlot?{slots:FORMAL_CAREER_SLOTS.map(s=>s.roleId===R.id?{...s,holderId:'another-npc'}:s)}:{})});
 const group=new T.Group(),seat={id:'real-loggia-south',kind:'seat',center:P.seatCenter,anchor:[6.6,.16,12.21],position:[5.37,.16,12.5],seatY:.9535,yaw:Math.PI};
 const actor=(id,pos)=>{const root=new T.Group();root.position.set(...pos);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,ageYears:22,station:{id,npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:5},animate(){}};};
 const npcs=[actor(P.cook,P.cookAside),actor(P.host,P.hostHome),actor(P.guest,P.guestHome)],player=actor('player',store.player||[-5.5,.302,-4.45]);
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>true,standPoint:()=>new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 const doors={cameraColliders:[],routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.04){p.y=route[0].y;route.shift();}return {waypoint:route[0]};}};
 tea=createFranceTeaService({npcs,lot:{group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},furniture,doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;if(n.route[0])n.root.position.y=n.route[0].y;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,getMounted:()=>mounted,worldSeed:1,saved:store.tea,saveState:save('tea'),isServerHired:()=>careers.isHired(R.id)});
 employment=createFranceTeaEmployment({tea,careers,getPlayer:()=>player,getMounted:()=>mounted,getClock:()=>clock,saved:store.employment,saveState:save('employment'),notify:n=>notices.push(n)});
 if(store.world){npcs.forEach((n,i)=>{n.root.position.set(...store.world.actors[i].position);n.serviceMount=store.world.actors[i].mounted?seat:null;});assert(tea.restore(store.world.tea));assert(employment.restore(store.world.employment));}
 const tick=(n=1)=>{for(let i=0;i<n;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;employment.update(.1);tea.update(.1,clock.seconds,{hour:clock.hour});}};
 const until=(fn,label,limit=10000)=>{for(let i=0;i<limit&&!fn();i++)tick();assert(fn(),label+' '+JSON.stringify({order:tea.state().order,duty:tea.dutyState(),job:employment.state().job,notes:notices.slice(-3)}));};
 const act=(kind,expected=true)=>{const q=employment.intent(kind);assert(q,'intent '+kind);player.root.position.set(...q.position);player.walking=false;assert.equal(employment.executeIntent(q),expected,'execute '+kind);tick();return q;};
 const meet=()=>{player.root.position.set(...tea.registry);until(()=>tea.meetingReady(),'actual employer arrival');};
 const hire=()=>{meet();act('formal-apply');assert.equal(careers.applicationResult(R.id).status,'pending');assert.equal(careers.state().tenure,null);act('formal-review');assert(careers.isHired(R.id));};
 const work=()=>{const q=act('task');until(()=>tea.dutyStep(employment.state().job.receiptId)?.key!==q.work.key||tea.dutyStep(employment.state().job.receiptId)?.orderId!==q.work.orderId,'actual step '+q.work.key,150);return q;};
 const completeOrder=()=>{player.root.position.set(0,.16,2);const count=employment.state().job.completedTasks;until(()=>employment.intent('task'),'demand driven guest arrival');while(employment.state().job.completedTasks===count){if(employment.intent('task'))work();else tick();}return tea.workReceipts(employment.state().job.receiptId).at(-1);};
 const checkpoint=()=>{store.clock=copy(clock);store.player=player.root.position.toArray();store.world={tea:tea.snapshot(),employment:employment.snapshot(),actors:npcs.map(n=>({position:n.root.position.toArray(),mounted:!!n.serviceMount}))};return copy(store);};
 return {store,flags,clock,bank,careers,tea,employment,player,npcs,seat,tick,until,act,meet,hire,work,completeOrder,checkpoint,notices};
}
{
 const f=fixture(),remote=f.employment.intent('formal-apply');f.player.root.position.set(20,0,20);assert(!f.employment.executeIntent(remote));f.meet();f.act('formal-apply');assert.equal(f.careers.applicationResult(R.id).status,'pending');assert.equal(f.careers.slotHolder(R.id),P.host);const id=f.careers.applicationResult(R.id).id;
 const g=fixture(f.checkpoint());assert.equal(g.careers.applicationResult(R.id).id,id);g.act('formal-review');assert(g.careers.isHired(R.id));assert.equal(g.careers.slotHolder(R.id),'player');assert.equal(g.careers.catalogue().find(r=>r.id===R.id).vacancy,0);assert.equal(g.employment.state().job,null);assert.equal(g.careers.state().lastDuty,null);assert.equal(g.bank.state().balances.france.bank,0);g.tick(2);assert.equal(g.tea.state().staffOwnership.cover,true);
 for(const option of[{ritual:0},{noSlot:true}]){const h=fixture({},option);h.meet();h.act('formal-apply',false);assert.equal(h.careers.applicationResult(R.id).status,'rejected');assert.equal(h.careers.apply(R.id,{ageYears:22}).code,'already-applied-today');assert.equal(h.careers.state().tenure,null);}
 console.log('PASS physical persistent pending/review, exclusive tenure, role/day limit, no auto-work/pay');
}
{
 const f=fixture();f.hire();f.act('accept');assert(!f.tea.request(),'employee cannot order for themselves');assert.equal(f.tea.state().staffOwnership.controller,'player','active duty remains player-owned while idle');assert.equal(f.tea.state().staffOwnership.taskOwner,null,'no customer claim while idle');
 const first=f.completeOrder();assert.equal(first.customerId,P.guest);assert.equal(first.trayId,first.orderId+'-tray');assert.equal(f.employment.state().job.stage,'working');assert.equal(f.careers.state().lastDuty.customerReviews.length,1);assert.equal(f.bank.state().balances.france.bank,0);
 const g=fixture(f.checkpoint());g.tick(5);assert.equal(g.employment.state().job.completedTasks,1);assert.equal(g.careers.state().lastDuty.customerReviews.length,1);const second=g.completeOrder();assert.notEqual(second.orderId,first.orderId);assert.equal(g.employment.state().job.completedTasks,2);assert.equal(g.careers.state().lastDuty.customerReviews.length,2);assert.equal(g.employment.state().job.stage,'working');
 // Qualified on-duty standby counts; no artificial task is needed to earn time.
 g.player.root.position.set(...g.tea.registry);g.tick(2500);assert(g.employment.state().job.coveredSeconds>200);g.meet();g.act('end-shift');assert.equal(g.careers.state().lastDuty.stage,'inspection');const d=g.careers.state().lastDuty,expected=Math.floor(10*d.coveredSeconds*.7/60/12);assert(expected>0);g.meet();g.flags.bank=true;g.act('claim',false);assert.equal(g.careers.state().lastDuty.stage,'ready');g.flags.bank=false;g.flags.paid=true;g.act('claim');assert.equal(g.bank.state().balances.france.bank,expected);g.flags.paid=false;g.act('claim');assert.equal(g.bank.state().balances.france.bank,expected);assert.equal(g.employment.state().job,null);assert.equal(g.employment.intent('accept'),null);
 const paid=fixture(g.checkpoint());assert.equal(paid.careers.state().loadError,null);assert.equal(paid.bank.state().balances.france.bank,expected);assert.equal(paid.careers.state().lastDuty.customerReviews.length,2);
 console.log('PASS repeated real guest orders preserve originals; standby/end-shift/pay/retry/reload are idempotent');
}
{
 const f=fixture();f.hire();f.act('accept');f.player.root.position.set(0,.16,2);f.until(()=>f.employment.intent('task'),'guest');f.work();f.until(()=>f.employment.intent('task'),'cook arrives to hear order');f.work();f.until(()=>f.employment.intent('task')?.work.key==='take-tray','same tray ready');f.work();assert(f.tea.held());const trayId=f.tea.state().order.trayId,id=f.employment.state().job.receiptId;
 const g=fixture(f.checkpoint());assert(g.tea.held());assert.equal(g.tea.state().order.trayId,trayId);assert.equal(g.tea.state().props.trayCount,1);g.player.root.position.set(1,.16,3);const pos=g.player.root.position.toArray();assert(g.employment.formal.cancel(g.employment.state().job));g.tick();assert.equal(g.tea.state().order.stage,'recover-host');assert.deepEqual(g.tea.state().order.recovery.position,pos);assert.equal(g.tea.state().props.trayId,trayId);g.player.root.position.set(13,0,5);g.until(()=>!g.tea.state().order,'NPC safely recovers original tray and finishes');assert.equal(g.tea.workReceipts(id).length,0);assert.equal(g.bank.state().balances.france.bank,0);
 console.log('PASS carried-tray checkpoint and interruption return one original tray to original NPC without work credit');
}
