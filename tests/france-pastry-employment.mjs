// Regression for persistent local hiring, one physical service owner, actual
// guest completion and prorated wages. Geometry is one separate main route.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js');
const {createFranceTeaEmployment}=await import('../source/game/france-tea-employment.js');
const {createFormalCareers,TEA_PASTRY_ROLE:R,FORMAL_CAREER_SLOTS}=await import('../source/game/formal-careers.js');
const {careerInterviewRoll}=await import('../source/game/career-applications.js');
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(saved={},options={}){
 const store=copy(saved),clock=store.clock||{day:1,hour:8,seconds:0},flags={},notices=[];let tea,employment,mounted=null;
 const save=key=>value=>{if(flags[key]||key==='career'&&flags.paid&&value.lastDuty?.stage==='paid')return false;store[key]=copy(value);store.clock=copy(clock);return true;};
 const bank=createCurrencyLedger({saved:store.bank,saveState:save('bank')});
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();delete initial.loadError;delete initial.lastError;
 initial.skills.ritual=1;initial.skills.cooking=options.cooking??2;
 let seed=1;while(options.reject?careerInterviewRoll(seed,R.id,clock.day)<.95:careerInterviewRoll(seed,R.id,clock.day)>=.6)seed++;
 const careers=createFormalCareers({worldSeed:seed,getClock:()=>clock,saved:store.career||initial,saveState:save('career'),creditWageToBank:bank.creditWageToBank,...(options.noSlot?{slots:FORMAL_CAREER_SLOTS.map(s=>s.roleId===R.id?{...s,holderId:'another-npc'}:s)}:{})});
 const group=new T.Group(),seat={id:'real-loggia-south',kind:'seat',center:P.seatCenter,anchor:[6.6,.16,12.21],position:[5.37,.16,12.5],seatY:.9535,yaw:Math.PI};
 const actor=(id,pos)=>{const root=new T.Group();root.position.set(...pos);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,ageYears:22,station:{id,npcLabel:id,npcAction:'read'},characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:5},animate(){}};};
 const npcs=[actor(P.cook,P.cookAside),actor(P.host,P.hostHome),actor(P.guest,P.guestHome)],player=actor('player',store.player||[-5.5,.302,-4.45]);
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>true,standPoint:()=>new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 const doors={cameraColliders:[],routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.04){p.y=route[0].y;route.shift();}return {waypoint:route[0]};}};
 tea=createFranceTeaService({npcs,lot:{group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},furniture,doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;if(n.route[0])n.root.position.y=n.route[0].y;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,getMounted:()=>mounted,worldSeed:1,saved:store.tea,saveState:save('tea'),isCookHired:()=>careers.isHired(R.id)});
 tea=tea.forRole('cook');
 employment=createFranceTeaEmployment({tea,role:R,careers,getPlayer:()=>player,getMounted:()=>mounted,getClock:()=>clock,saved:store.employment,saveState:save('employment'),notify:n=>notices.push(n)});
 if(store.world){npcs.forEach((n,i)=>{n.root.position.set(...store.world.actors[i].position);n.serviceMount=store.world.actors[i].mounted?seat:null;});assert(tea.restore(store.world.tea));assert(employment.restore(store.world.employment));}
 const tick=(n=1)=>{for(let i=0;i<n;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;employment.update(.1);tea.update(.1,clock.seconds,{hour:clock.hour});}};
 const until=(fn,label,limit=10000)=>{for(let i=0;i<limit&&!fn();i++)tick();assert(fn(),label+' '+JSON.stringify({order:tea.state().order,duty:tea.dutyState(),job:employment.state().job,notes:notices.slice(-3)}));};
 const act=(kind,expected=true)=>{const q=employment.intent(kind);assert(q,'intent '+kind);player.root.position.set(...q.position);player.walking=false;assert.equal(employment.executeIntent(q),expected,'execute '+kind);tick();return q;};
 const meet=()=>{player.root.position.set(...tea.registry);until(()=>tea.meetingReady(),'actual employer arrival');};
 const hire=()=>{meet();act('formal-apply');assert.equal(careers.applicationResult(R.id).status,'pending');assert.equal(careers.state().tenure,null);act('formal-review');assert(careers.isHired(R.id));};
 const work=()=>{const q=act('task');until(()=>tea.dutyStep(employment.state().job.receiptId)?.key!==q.work.key||tea.dutyStep(employment.state().job.receiptId)?.orderId!==q.work.orderId,'actual step '+q.work.key,150);return q;};
 const completeOrder=()=>{player.root.position.set(-7,.258,-8);const count=employment.state().job.completedTasks;until(()=>employment.intent('task'),'demand driven guest arrival');while(employment.state().job.completedTasks===count){if(employment.intent('task'))work();else tick();}return tea.workReceipts(employment.state().job.receiptId).at(-1);};
 const checkpoint=()=>{store.clock=copy(clock);store.player=player.root.position.toArray();store.world={tea:tea.snapshot(),employment:employment.snapshot(),actors:npcs.map(n=>({position:n.root.position.toArray(),mounted:!!n.serviceMount}))};return copy(store);};
 return {store,flags,clock,bank,careers,tea,employment,player,npcs,seat,tick,until,act,meet,hire,work,completeOrder,checkpoint,notices};
}
{
 const f=fixture(),remote=f.employment.intent('formal-apply');f.player.root.position.set(20,0,20);assert(!f.employment.executeIntent(remote));f.meet();f.act('formal-apply');assert.equal(f.careers.applicationResult(R.id).status,'pending');assert.equal(f.careers.slotHolder(R.id),P.cook);const id=f.careers.applicationResult(R.id).id;
 const g=fixture(f.checkpoint());assert.equal(g.careers.applicationResult(R.id).id,id);g.act('formal-review');assert(g.careers.isHired(R.id));assert.equal(g.careers.slotHolder(R.id),'player');assert.equal(g.careers.catalogue().find(r=>r.id===R.id).vacancy,0);assert.equal(g.employment.state().job,null);assert.equal(g.careers.state().lastDuty,null);assert.equal(g.bank.state().balances.france.bank,0);g.tick(2);assert.equal(g.tea.state().cookOwnership.cover,true);assert.equal(g.npcs.filter(n=>n.station.id===P.cook).length,1);
 for(const option of[{cooking:0},{noSlot:true}]){const h=fixture({},option);h.meet();h.act('formal-apply',false);assert.equal(h.careers.applicationResult(R.id).status,'rejected');assert.equal(h.careers.apply(R.id,{ageYears:22}).code,'already-applied-today');assert.equal(h.careers.state().tenure,null);assert(h.careers.apply('fr-tea-server',{ageYears:22}).code!=='already-applied-today');}
 const denied=fixture({},{reject:true});denied.meet();denied.act('formal-apply');denied.act('formal-review',false);assert.equal(denied.careers.applicationResult(R.id).code,'interview-rejected');const deniedReload=fixture(denied.checkpoint());assert.equal(deniedReload.careers.applicationResult(R.id).code,'interview-rejected');assert.equal(deniedReload.careers.slotHolder(R.id),P.cook);assert.equal(deniedReload.employment.intent('formal-review'),null);
 console.log('PASS pastry physical employer pending/reload/review, one original incumbent, no hiring autowork and role/day refusal');
}
{
 const f=fixture();f.hire();f.act('accept');assert(!f.tea.request(),'employee cannot become own customer');assert.equal(f.tea.state().cookOwnership.controller,'player');assert.equal(f.tea.state().staffOwnership.controller,P.host);assert(!f.tea.forRole('host').claimDuty('fr-tea-labor-1'),'one player duty lease');
 f.until(()=>f.employment.intent('task'),'real guest and host order');assert.equal(f.employment.intent('task').work.key,'receive-order');f.work();const original=f.tea.state().order.trayId;assert.equal(f.tea.state().props.trayCount,1);
 f.work();f.work();assert.equal(f.employment.intent('task').work.key,'plate-order');
 const g=fixture(f.checkpoint());assert.equal(g.tea.state().order.trayId,original);assert.equal(g.tea.state().props.trayCount,1);assert.equal(g.employment.intent('task').work.key,'plate-order');g.work();g.until(()=>g.employment.intent('task'),'actual NPC reaches handover');assert.equal(g.employment.intent('task').work.key,'release-tray');g.work();assert.equal(g.employment.state().job.completedTasks,0,'handoff alone earns no completed order');assert.equal(g.tea.workReceipts(g.employment.state().job.receiptId).length,0);g.player.root.position.set(-7,.258,-8);g.flags.tea=true;g.until(()=>g.tea.state().order?.stage==='washing','same cups physically return');g.tick(40);assert.equal(g.employment.state().job.completedTasks,0,'failed source save cannot produce a completion');g.flags.tea=false;g.until(()=>g.employment.state().job.completedTasks===1,'original NPC delivers, guest consumes, same cup returns');
 const first=g.tea.workReceipts(g.employment.state().job.receiptId)[0];assert.equal(first.trayId,original);assert.equal(first.cupId,first.orderId+'-cup');assert.equal(first.customerId,P.guest);assert.deepEqual(first.quality,{received:true,cut:true,brewed:true,plated:true,handed:true,consumed:true,cleaned:true});assert.equal(g.careers.state().lastDuty.customerReviews.length,1);assert.equal(g.employment.state().job.stage,'working');assert.equal(g.bank.state().balances.france.bank,0);
 const h=fixture(g.checkpoint());h.tick(5);assert.equal(h.employment.state().job.completedTasks,1);const second=h.completeOrder();assert.notEqual(first.orderId,second.orderId);assert.equal(h.employment.state().job.completedTasks,2);
 // Unmounted standby inside the kitchen counts; the private WC/off-work area does not.
 h.player.root.position.set(...h.tea.registry);h.tick(2500);const covered=h.employment.state().job.coveredSeconds;assert(covered>200);h.player.root.position.set(12,.3,-8);h.tick(100);assert.equal(h.employment.state().job.coveredSeconds,covered);
 h.meet();h.act('end-shift');const d=h.careers.state().lastDuty,expected=Math.floor(14*d.coveredSeconds*.7/60/12);assert(expected>0);h.meet();h.flags.bank=true;h.act('claim',false);h.flags.bank=false;h.flags.paid=true;h.act('claim');assert.equal(h.bank.state().balances.france.bank,expected);h.flags.paid=false;h.act('claim');assert.equal(h.bank.state().balances.france.bank,expected);assert.equal(h.employment.state().job,null);assert.equal(h.employment.intent('accept'),null);
 const paid=fixture(h.checkpoint());assert.equal(paid.careers.state().loadError,null);assert.equal(paid.careers.state().lastDuty.stage,'paid');assert.equal(paid.careers.state().lastDuty.customerReviews.length,2);assert.equal(paid.bank.state().balances.france.bank,expected);
 console.log('PASS original preparation/plate/handoff/consumption/cleanup receipts, repeat demand, kitchen-only standby and idempotent bank/reload');
}
{
 const f=fixture();f.hire();f.act('accept');f.until(()=>f.employment.intent('task'),'guest');f.work();f.work();const original=f.tea.state().order.trayId;
 assert(f.employment.formal.cancel(f.employment.state().job));f.tick();f.player.root.position.set(-8,.258,-8);f.until(()=>!f.tea.state().order,'original cook takes over interrupted prep and server cleans');assert.equal(f.tea.state().props.trayCount,0);assert.equal(f.tea.workReceipts('fr-pastry-labor-1').length,0);assert.equal(f.bank.state().balances.france.bank,0);assert(original);
 console.log('PASS interrupted preparation restores original NPC task without duplicate tray or player completion credit');
}
{
 const clock={day:0,hour:8,seconds:0},careers=createFormalCareers({getClock:()=>clock,saveState:()=>true});
 const learn=id=>{const result=careers.learningTicket('france-salon',id);assert(result.ok);return careers.completeLearning(result.ticket,{seconds:8});};
 for(let n=0;n<4;n++)assert.equal(learn('fr-cooking-intro').xpGained,10);
 for(let n=0;n<3;n++)assert.equal(learn('fr-ritual-intro').xpGained,10);
 assert(!careers.eligibility(R.id,{ageYears:18}).ok);clock.day++;
 for(let n=0;n<3;n++)assert.equal(learn('fr-cooking-intro').xpGained,10);
 assert.equal(careers.state().skills.cooking,2);assert.equal(careers.state().skills.ritual,1);assert(careers.eligibility(R.id,{ageYears:18}).ok);
 console.log('PASS France existing reading place reaches cooking2/ritual1 in two days using progressive XP');
}
