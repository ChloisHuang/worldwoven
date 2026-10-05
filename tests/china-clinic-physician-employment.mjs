// Focused identity, patient-work and durable salary contracts. Route geometry is
// covered separately by one production-main scenario, not by this fixture.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createChinaClinicService}=await import('../source/game/china-clinic-service.js');
const {createChinaClinicPhysicianEmployment}=await import('../source/game/china-clinic-physician-employment.js');
const {createFormalCareers,CLINIC_PHYSICIAN_ROLE:R,FORMAL_CAREER_SLOTS}=await import('../source/game/formal-careers.js');
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const {createGameHealthWorld}=await import('../source/game/game-health-world.js');
const {CHINA_CLINIC:C}=await import('../source/game/china-clinic.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const clean=c=>{const {loadError,lastError,...s}=c.state();return s;};
function fixture(saved={},options={}){
 const store=copy(saved),clock={day:1,hour:8,seconds:0,...store.clock},flags={clinic:false,employment:false,career:false,bank:false},writes=[],notices=[];let clinic,employment,mounted=null;
 const save=key=>value=>{if(flags[key]||key==='career'&&flags.careerPaid&&value.lastDuty?.stage==='paid')return false;store[key]=copy(value);store.clock=copy(clock);writes.push(key);return true;};
 const bank=createCurrencyLedger({saved:store.bank,saveState:save('bank')});
 const seed=createFormalCareers({getClock:()=>clock,saveState:()=>{}}),careerSeed=store.career||{...clean(seed),skills:{...seed.state().skills,care:options.care??2,writing:options.writing??2,ritual:options.ritual??1}};
 const careers=createFormalCareers({worldSeed:5,saved:careerSeed,getClock:()=>clock,saveState:save('career'),creditWageToBank:bank.creditWageToBank,...(options.noSlot?{slots:FORMAL_CAREER_SLOTS.map(s=>s.roleId===R.id?{...s,holderId:'occupied-npc'}:s)}:{})});
 if(!store.career&&!options.noExperience)assert(careers.recordClinicAssistantService({receiptId:'cn-pharmacy-labor-1',orderId:'cn-clinic-order-1',number:1,cardId:'cn-clinic-card-1',packetId:'cn-clinic-packet-1',recipientId:'cn-tavern-diner-west',recipientName:'来客',review:{evaluatorId:'cn-tavern-diner-west',positive:true,reason:'同号交付'}}).ok);
 const root=new T.Group(),person=(id,p,age=29)=>{const q=new T.Group();q.position.set(...p);root.add(q);return {station:{id,npcName:id,npcPosition:p,ageYears:age},root:q,ageYears:age,phase:0,route:[],walking:false,locomotion:{walkSpeed:10},animate(){}};};
 const player=person('player',C.points.assistantHandoff,options.ageYears??22),doctor=person('cn-clinic-physician',C.points.doctor),assistant=person('cn-pharmacy-assistant',C.points.assistant),guest=person('cn-tavern-diner-west',[20,.115,22.4]),other=person('cn-tavern-diner-east',[22,.115,22.4]),npcs=[doctor,assistant,guest,other];
 let lease=store.lease||null,guestIdle=true;const calls={claim:0,release:0,contacts:[]};
 const seat={id:C.seatId,kind:'seat',position:[23.55,4.015,-27.1],anchor:C.points.consult,seatY:4.675,yaw:Math.PI},furniture={items:[seat],facilities:createFacilityQueue(),releaseActor(id){this.facilities.releaseActor(id);},canSit:()=>true,standPoint:(_nav,_s,seat)=>new T.Vector3(...seat.position)};
 const claim=(id,claimId)=>{if(lease)return lease.actorId===id&&lease.claimId===claimId;if(!guestIdle)return false;lease={actorId:id,claimId};store.lease=copy(lease);calls.claim++;return true;},release=(id,claimId)=>{if(lease?.actorId!==id||lease.claimId!==claimId)return false;lease=null;store.lease=null;calls.release++;return true;};
 const doors={routeStep(route,p){while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.03){p.y=route[0].y;route.shift();}return {waypoint:route[0],phase:'walking'};}};
 clinic=createChinaClinicService({npcs,lot:{group:root,clinic:true},furniture,getMounted:()=>mounted,getPlayer:()=>player,doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;if(n.route[0])n.root.position.y=n.route[0].y;},poseContext:()=>({}),saved:store.clinic||{},saveState:save('clinic'),isPhysicianHired:()=>careers.isHired(R.id),getPhysicianEmployment:()=>employment?.state().job,claimPatient:claim,releasePatient:release,patientClaims:()=>lease?[lease]:[],onInteraction:e=>calls.contacts.push(copy(e)),notify:n=>notices.push(n)});
 employment=createChinaClinicPhysicianEmployment({clinic,careers,getPlayer:()=>player,getMounted:()=>mounted,getClock:()=>clock,saved:store.employment,saveState:save('employment'),notify:n=>notices.push(n)});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;employment.update(.1);clinic.update(.1,clock.seconds,{player,facilityId:mounted?.id});}};
 const until=(fn,label,limit=3000)=>{for(let i=0;i<limit&&!fn();i++)tick();assert(fn(),label+' '+JSON.stringify({c:clinic.state(),e:employment.state(),career:careers.state()}));};
 const act=(kind,expected=true)=>{const intent=employment.intent(kind);assert(intent,'intent '+kind);player.root.position.set(...intent.position);player.walking=false;assert.equal(employment.executeIntent(intent),expected,'exec '+kind);tick();return intent;};
 const meet=()=>{player.root.position.set(...C.points.assistantHandoff);until(()=>clinic.doctorReady(),'doctor at actual platform');};
 const hire=()=>{meet();act('formal-apply');assert.equal(careers.applicationResult(R.id).status,'pending');assert.equal(careers.state().tenure,null);assert.equal(employment.state().job,null);act('formal-review');until(()=>careers.applicationResult(R.id).status!=='pending','review decided');assert.equal(careers.applicationResult(R.id).status,'approved',JSON.stringify(careers.applicationResult(R.id)));};
 const admit=()=>{assert(clinic.considerPatient(guest,{careStatus:'care-advised',symptoms:['滞露不适：如厕拖延后有些难受']}));};
 return {store,clock,flags,bank,careers,clinic,employment,player,doctor,assistant,guest,other,calls,notices,root,seat,tick,until,act,meet,hire,admit};
}

test('physician submits locally, awaits original physician review and never starts or pays automatically',()=>{
 for(const options of [{care:0},{writing:1},{ageYears:17},{noExperience:true},{noSlot:true}]){const f=fixture({},options);f.meet();f.act('formal-apply',false);assert.equal(f.careers.applicationResult(R.id).status,'rejected');assert.equal(f.careers.state().tenure,null);const reload=fixture(f.store);assert.equal(reload.careers.state().loadError,null);}
 const f=fixture();f.meet();f.act('formal-apply');assert.equal(f.careers.state().tenure,null);const reload=fixture(f.store);reload.meet();reload.act('formal-review');assert(reload.careers.isHired(R.id));reload.player.root.position.set(24.9,4.015,-25.7);reload.tick(40);assert.equal(reload.clinic.state().physicianOwnership.status,'off-duty');assert.equal(reload.employment.state().job,null);assert.equal(reload.careers.state().lastDuty,null);assert.equal(reload.bank.state().bank,0);
});

test('real symptom record, original card to original assistant, verified recipient, recovery and one bank wage',()=>{
 const f=fixture();f.hire();f.act('accept');f.admit();f.until(()=>f.clinic.state().order.stage==='consult','patient actually seated');const original=f.clinic.state().order,receipt=f.employment.state().job.receiptId;
 f.tick(80);assert.equal(f.clinic.state().order.stage,'consult','physician never works automatically');assert.deepEqual(f.employment.state().patient.symptoms,[]);f.act('task');f.tick(24);assert.equal(f.clinic.state().order.stage,'writing');assert.equal(f.employment.state().patient.symptoms[0],'滞露不适：如厕拖延后有些难受');
 const reload=fixture(f.store);assert.equal(reload.clinic.state().order.id,original.id);reload.guest.root.position.set(...C.points.consult);reload.guest.serviceMount=reload.seat;const choice=reload.employment.intent('plan:stillwater-ache');assert(choice);reload.player.root.position.set(...choice.position);reload.flags.clinic=true;assert(reload.employment.executeIntent(choice));reload.tick(40);assert.equal(reload.clinic.state().order.stage,'writing','failed persistence cannot issue card');reload.flags.clinic=false;reload.tick(3);assert.equal(reload.clinic.state().order.stage,'handoff');assert.equal(reload.clinic.state().history.filter(r=>r.event==='physician-card-written').length,1);
 reload.act('task');assert(reload.employment.isActing(),'explicit handoff waits for original assistant');reload.until(()=>reload.clinic.state().order.cardHolder==='assistant','assistant reaches the requested handoff');reload.tick(1);assert(['stock','prepare'].includes(reload.clinic.state().order.stage));assert.equal(reload.clinic.state().order.cardId,original.cardId);assert.equal(reload.clinic.state().order.cardHolder,'assistant');assert.equal(reload.clinic.workReceipts(receipt).length,0);
 reload.until(()=>reload.clinic.workReceipts(receipt).length===1,'original assistant prepares and original patient receives');reload.tick(2);const proof=reload.clinic.workReceipts(receipt)[0];assert.equal(proof.recipientId,original.recipientId);assert.equal(proof.cardId,original.cardId);assert.equal(proof.packetId,'cn-clinic-packet-'+original.number);assert.equal(proof.carePlanId,'stillwater-ache');assert.equal(reload.employment.state().job.completedTasks,1);assert.equal(reload.bank.state().bank,0);assert(reload.calls.contacts.every(e=>e.participants[0]==='cn-pharmacy-assistant'));assert.equal(reload.employment.executeIntent(choice),false);
 reload.tick(400);reload.meet();reload.act('end-shift');const seconds=reload.careers.state().lastDuty.coveredSeconds;assert(seconds>0);reload.flags.bank=true;reload.act('claim',false);reload.flags.bank=false;reload.flags.careerPaid=true;reload.act('claim');const wage=reload.bank.state().bank;reload.flags.careerPaid=false;reload.act('claim');assert.equal(reload.bank.state().bank,wage);assert.equal(reload.bank.state().cash,0);assert.equal(reload.careers.state().lastDuty.stage,'paid');assert.equal(reload.careers.state().lastDuty.wage,Math.floor(30*(seconds*.7/60)/12));assert.equal(reload.employment.state().job,null);assert.equal(reload.employment.intent('accept'),null);reload.until(()=>!reload.clinic.owns(reload.guest),'patient returned and lease released');
});

test('wrong selection preserves original patient for correction; explicit cancel releases without effects',()=>{
 const f=fixture();f.hire();f.act('accept');f.admit();f.until(()=>f.clinic.state().order.stage==='consult','arrive');f.act('task');f.tick(24);const original=f.clinic.state().order;f.act('plan:mistbell');assert.equal(f.clinic.state().order.stage,'writing');assert.equal(f.clinic.state().order.id,original.id);assert(f.clinic.owns(f.guest));assert.equal(f.clinic.state().history.filter(r=>r.event==='delivered').length,0);assert.equal(f.clinic.state().workReceipts.length,0);assert.equal(f.bank.state().bank,0);f.act('plan:mistbell');assert.equal(f.clinic.state().history.filter(r=>r.event==='physician-plan-mismatch').length,1);f.act('cancel');assert.equal(f.clinic.state().order.stage,'cancelled');f.player.root.position.set(24.9,4.015,-25.7);f.until(()=>!f.clinic.owns(f.guest),'same patient returns after cancelled consultation');assert.equal(f.careers.state().lastDuty.stage,'missed');assert.equal(f.employment.state().job,null);assert.equal(f.calls.release,1);assert.equal(f.bank.state().bank,0);
});

test('explicit physician standby shift accrues actual workplace time without orders or automatic wages',()=>{
 const f=fixture();f.hire();f.act('accept');f.tick(100);const before=f.employment.state().job.coveredSeconds;assert(before>9);assert.equal(f.bank.state().bank,0);f.player.root.position.set(0,0,0);f.tick(100);assert.equal(f.employment.state().job.coveredSeconds,before);f.meet();f.act('end-shift');assert.equal(f.careers.state().lastDuty.completedTasks,0);f.act('claim');assert.equal(f.careers.state().lastDuty.stage,'paid');
});

test('cancelled unflushed attendance cannot leak to a later physician shift',()=>{
 const f=fixture();f.hire();f.act('accept');f.tick(3);assert(f.employment.snapshot().attendance>0);f.act('cancel');assert.equal(f.employment.snapshot().attendance,0);f.clock.day++;f.clock.hour=8;f.clock.seconds+=1440/.7;f.careers.observeDay();f.meet();f.act('accept');assert(f.employment.state().job.coveredSeconds<=.1);f.tick(2);assert(f.employment.state().job.coveredSeconds<.4);
});
