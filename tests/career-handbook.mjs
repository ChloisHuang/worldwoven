// Real core and country adapters with a tiny DOM and actor surface. This checks
// durable applications, dismissal and physical review without browser claims.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,context,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,context);}});
const THREE=await import('three');
const {createCareerHandbook}=await import('../source/game/career-handbook.js');
const {createFormalCareers,GARDEN_ASSISTANT_ROLE:GARDEN,COURT_CLERK_ROLE:CLERK}=await import('../source/game/formal-careers.js');
const {createFranceGardenerLabor}=await import('../source/game/france-gardener-labor.js');
const {createChinaCourtCareer}=await import('../source/game/china-court-career.js');
const {FRANCE_GARDENER:P}=await import('../source/game/france-gardener-place.js');
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');
const doc={head:element('head'),body:element('body'),createElement:element};
const clock={day:1,hour:8.25,seconds:0},root=new THREE.Group(),player={ageYears:22,walking:false,root},requests=[],store={};root.userData.hands=[new THREE.Group(),new THREE.Group()];root.add(...root.userData.hands);
const seed=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();delete seed.loadError;delete seed.lastError;seed.skills={...seed.skills,ritual:2,writing:2,gardening:2,art:0,cooking:2};
const careers=createFormalCareers({worldSeed:785,saved:seed,creditWageToBank:()=>({ok:true}),getClock:()=>clock,saveState:s=>{store.career=structuredClone(s);}});
let country='france',ready=false,ui;
const bank={state:()=>({cash:0})},gardener={loanState:()=>({owner:null,borrowed:false}),hostReady:()=>ready,requestMeeting:()=>true,releaseMeeting(){}};
const labor=createFranceGardenerLabor({gardener,careers,getPlayer:()=>player,getClock:()=>clock,copperLedger:bank,saveState:s=>{store.labor=s;},openRegistration:o=>ui.open(o),document:null});
const npc={station:{id:'cn-official-rites'},root:new THREE.Group(),walking:false};npc.root.position.set(20,.215,33);const office=new THREE.Group(),paper=new THREE.Group();office.add(paper);paper.position.set(21.44,1.235,31.55);
const court=createChinaCourtCareer({careers,getPlayer:()=>player,getClock:()=>clock,audience:{state:()=>({phase:'idle',schedule:{}})},getRecruiter:()=>npc,documentObject:paper,openRegistration:o=>ui.open(o)});
const stub={state:()=>({supply:{remaining:117,wasted:1}}),intent:kind=>({id:kind,kind,provider:'stub',intentKey:kind,action:kind,position:[22.35,.215,11.7],executionRadius:.9})};
ui=createCareerHandbook({careers,getPlayer:()=>player,getClock:()=>clock,getCountry:()=>country,getService:id=>id===GARDEN.id?labor:id===CLERK.id?court:stub,copperLedger:bank,document:doc,onIntent:r=>requests.push(r)});
const dialog=doc.body.children.find(e=>e.tag==='dialog'),buttons=()=>all(dialog).filter(e=>e.tag==='button'),click=label=>{const b=buttons().find(b=>b.textContent===label);assert(b,label);b.onclick();return b;};
const hud=doc.body.children.find(e=>e.className==='career-wallet-slot').children.find(e=>e.className==='career-open');ui.update('lot');assert.equal(hud.hidden,false);hud.onclick();assert.equal(dialog.open,true);assert.equal(requests.length,0);assert.equal(all(dialog).filter(e=>e.attributes['data-workplace']==='garden').length,1);click('前往西苑工具架');assert.equal(dialog.open,false);assert.equal(requests.at(-1).registration.roleId,GARDEN.id);assert.equal(careers.state().tenure,null);root.position.fromArray(P.registration);ui.update('lot');assert.equal(hud.hidden,false);const routed=requests.length;hud.onclick();assert.equal(requests.length,routed);assert.equal(dialog.open,true);click('前往西苑工具架');
root.position.set(0,0,0);ui.open({scope:'catalogue',roleId:GARDEN.id});assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,1);assert(!text(dialog).includes(CLERK.name));assert(all(dialog).find(e=>e.tag==='details').open!==true);click('前往申请');assert.equal(requests.at(-1).kind,'formal-view');root.position.fromArray(P.registration);assert(labor.executeIntent(requests.at(-1)));assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,1);
const stale=click('提交职位申请');const request=requests.at(-1);stale.onclick();assert.equal(requests.at(-1),request);assert(labor.executeIntent(request));labor.update(.1);assert.equal(careers.applicationResult(),null,'recruiter has not met applicant yet');root.position.set(0,0,0);labor.update(.1);assert.equal(labor.state().waitingForHost,false);assert.equal(careers.state().tenure,null);
root.position.fromArray(P.registration);ready=true;assert(labor.executeIntent(labor.intent('formal-apply')));labor.update(.1);const pending=careers.applicationResult();assert.equal(pending.status,'pending');assert.equal(labor.state().job,null);assert.equal(careers.state().tenure,null);assert(text(dialog).includes('埃米尔：'));assert(text(dialog).includes('待面谈'));ui.close();ui.open({scope:'role',roleId:GARDEN.id});assert.equal(careers.applicationResult().id,pending.id);
const review=click('当面确认职责并接受审核');const next=requests.at(-1);root.position.set(0,0,0);assert.equal(labor.executeIntent(next),false);root.position.fromArray(P.registration);ready=false;assert(labor.executeIntent(next));labor.update(.1);assert.equal(careers.applicationResult().status,'pending');root.position.set(0,0,0);labor.update(.1);assert.equal(labor.state().waitingForHost,false);assert.equal(careers.applicationResult().id,pending.id);
root.position.fromArray(P.registration);ready=true;assert(labor.executeIntent(labor.intent('formal-review')));labor.update(.1);assert(careers.isHired(GARDEN.id));assert(text(dialog).includes('录用通过'));assert.equal(labor.state().job,null);assert.equal(careers.state().lastDuty,null);assert.equal(careers.reviewApplication(GARDEN.id,{applicationId:pending.id,ageYears:22}).code,'no-pending-application');
assert(careers.beginDuty({receiptId:'fr-garden-labor-1'}).ok);assert(careers.laborEvent('completed',{roleId:GARDEN.id,receiptId:'fr-garden-labor-1'}).ok);assert(careers.laborEvent('inspected',{roleId:GARDEN.id,receiptId:'fr-garden-labor-1'}).ok);assert(careers.settle().ok);assert.equal(careers.state().lastDuty.stage,'paid');
assert(careers.resign().ok);country='china';const routeCount=requests.length;hud.onclick();assert.equal(requests.length,routeCount);assert.equal(all(dialog).filter(e=>e.attributes['data-workplace']).length,9);assert(buttons().some(b=>b.textContent==='前往钱庄原账核验处'));assert(buttons().some(b=>b.textContent==='前往射圃巡值登记'));assert(buttons().some(b=>b.textContent==='前往御膳备餐间'));assert(buttons().some(b=>b.textContent==='前往承务官署'));assert(buttons().some(b=>b.textContent==='前往云来酒楼'));assert(!buttons().some(b=>b.textContent==='提交职位申请'));click('前往承务官署');assert.equal(requests.at(-1).registration.roleId,CLERK.id);ui.open({scope:'catalogue',roleId:CLERK.id});assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,1);assert(!text(dialog).includes('酒楼'));ui.open({scope:'catalogue',roleId:'cn-tavern-steward'});const cards=all(dialog).filter(e=>e.className==='career-role-card');assert.equal(cards.length,2);assert(!text(dialog).includes(CLERK.name));for(const card of cards)assert.equal(all(card).filter(e=>e.className==='career-card-primary ww-airy-action').length,1);assert(!text(dialog).includes(GARDEN.name));assert(!text(dialog).includes('后厨登记簿'));assert.equal(cards.every(card=>text(card.children[0]).includes('许安')),true);
const beforeApplication=careers.applicationResult();assert(buttons().some(b=>b.textContent==='前往申请'));ui.open({scope:'role',roleId:'cn-tavern-chef'});assert(buttons().some(b=>b.textContent==='前往申请'));ui.open({scope:'catalogue',roleId:'cn-tavern-steward'});root.position.set(22.35,.215,11.7);ui.update('lot');assert.equal(buttons().filter(b=>b.textContent==='提交职位申请').length,2);assert.equal(buttons().filter(b=>b.textContent==='前往申请').length,0);click('提交职位申请');assert.equal(requests.at(-1).kind,'formal-apply');assert.deepEqual(careers.applicationResult(),beforeApplication,'the card dispatches the physical adapter instead of granting a job');
// One short appointment chain has a live recruiter and the real paper object.
const doCourt=kind=>{const next=court.intent(kind);assert(next,kind);root.position.fromArray(next.position);assert(court.executeIntent(next),kind);};
doCourt('apply');assert.equal(careers.state().tenure,null);npc.walking=true;const presenting=court.intent('review');root.position.fromArray(presenting.position);assert.equal(court.executeIntent(presenting),false);assert.equal(careers.applicationResult().stage,'submitted');npc.walking=false;player.walking=true;doCourt('review');assert.equal(careers.applicationResult().stage,'submitted','final moving arrival frame cannot approve or reject');player.walking=false;court.update(.1);assert.equal(careers.applicationResult().stage,'document-ready');assert.equal(careers.state().tenure,null);doCourt('receive-document');assert.equal(paper.parent,root.userData.hands[1]);assert.equal(careers.applicationResult().stage,'document-held');ui.close();ui.open({scope:'role',roleId:CLERK.id});assert(text(dialog).includes('承务官署任命文书'));assert(text(dialog).includes('宣读任命文书并受职'));clock.hour=9;doCourt('appointment');court.update(.1);assert.equal(court.playerAction(),'read');assert.equal(careers.state().tenure,null);root.position.x+=1;court.update(.1);assert.equal(court.state().activity,null);assert.equal(careers.applicationResult().stage,'document-held');assert.equal(paper.parent,root.userData.hands[1]);doCourt('appointment');for(let n=0;n<31;n++)court.update(.1);assert(careers.isHired(CLERK.id));assert.equal(paper.parent,office);assert.equal(careers.state().lastDuty.roleId,GARDEN.id);assert.equal(careers.state().tenure.sinceHour,9);assert(text(dialog).includes('本岗位未开班'));assert(text(dialog).includes('未开始'));assert(!text(dialog).includes('今日已结薪'));assert(!text(dialog).includes('9法国券'));assert(!text(dialog).includes('正式任职已保存'));assert(all(dialog).find(e=>e.className==='career-card-details career-employment-history').open!==true);
const re=createFormalCareers({worldSeed:1,saved:store.career,getClock:()=>clock,saveState:()=>{}});assert.equal(re.state().loadError,null);assert(re.isHired(CLERK.id));
ui.open({scope:'role',roleId:'cn-royal-kitchen-cook'});assert(text(dialog).includes('御膳厨役'));assert(text(dialog).includes('酒楼原单 0/3日'));assert(text(dialog).includes('开局库存余117/120 · 损耗1（不会每日补充）'));assert(text(dialog).includes('工作不授用膳资格'));ui.dispose();labor.dispose();court.dispose();console.log('PASS actual core + France recruiter wait/leave/resume + court live recruiter/paper pickup/declaration; compact local cards and pending/approved receipts; simulated DOM, not iOS');
// Patient ratings use the compact current-customer projection and their own pay
// label, rather than the tavern's corrected-order/flat-penalty presentation.
const {PHARMACY_ASSISTANT_ROLE:PHARMACY}=await import('../source/game/formal-careers.js');
const clinicSeed={...seed,tenure:{roleId:PHARMACY.id,slotId:PHARMACY.slotId,sinceDay:1,sinceHour:8}};
const clinicCore=createFormalCareers({saved:clinicSeed,getClock:()=>clock,saveState:()=>true});
assert(clinicCore.beginDuty({receiptId:'cn-pharmacy-labor-1'}).ok);
assert(clinicCore.recordClinicPatientReview({receiptId:'cn-pharmacy-labor-1',number:1,orderId:'cn-clinic-order-1',cardId:'cn-clinic-card-1',packetId:'cn-clinic-packet-1',recipientId:'cn-tavern-diner-west',recipientName:'顾谨',review:{version:1,evaluatorId:'cn-tavern-diner-west',rating:5,positive:true,responsibleSeconds:20,reason:'同号云纹包已及时交付本人'}}).ok);
const patientDoc={head:element('head'),body:element('body'),createElement:element};
const patientUI=createCareerHandbook({careers:clinicCore,getPlayer:()=>player,getClock:()=>clock,getCountry:()=> 'china',getService:()=>stub,copperLedger:bank,document:patientDoc});
patientUI.open({scope:'role',roleId:PHARMACY.id});const patientText=text(patientDoc.body);
assert(patientText.includes('患者评分 5 / 5'));assert(patientText.includes('政府拨付'));assert(patientText.includes('80%–120%'));assert(!patientText.includes('已纠正 +1'));assert(!patientText.includes('顾客评价扣薪'));
patientUI.dispose();console.log('PASS clinic handbook shows patient score, bounded government salary and no tavern penalty labels');
// Regression: an optional promotion must not consume the only work button.
// Use real saved qualification/application states and the production court adapter.
const promotionClock={day:1,hour:8,seconds:0};
const newCore=(saved,clock=promotionClock)=>createFormalCareers({worldSeed:3,saved,getClock:()=>clock,saveState:()=>true,creditWageToBank:()=>({ok:true})});
const promotionSeed=newCore().state();promotionSeed.skills.ritual=2;promotionSeed.skills.writing=2;
const earned=newCore(promotionSeed);assert(earned.apply(CLERK.id,{ageYears:22}).ok);
const applicationId=earned.applicationResult().id;for(const step of ['interview','receive-document','appointment'])assert(earned.reviewApplication(CLERK.id,{ageYears:22,applicationId,step}).ok);
for(let day=1;day<=3;day++){promotionClock.day=day;promotionClock.hour=10;assert(earned.beginDuty().ok);promotionClock.hour=11.5;assert(earned.dutyEvent('court-start').ok);promotionClock.hour=12;assert(earned.dutyEvent('court-completed').ok);assert(earned.dutyEvent('archive-completed').ok);assert(earned.settle().ok);}
const states=[['qualified',earned.state(),'promotion-apply']];assert(earned.applyPromotion().ok);const promotionId=earned.promotionSummary().application.id;states.push(['submitted',earned.state(),'promotion-review']);
for(const [step,stage,kind]of [['interview','document-ready','promotion-receive-document'],['receive-document','document-held','promotion-appointment'],['appointment','approved',null]]){assert(earned.reviewPromotion({applicationId:promotionId,step}).ok);states.push([stage,earned.state(),kind]);}
function promotionPanel(saved,{day=4,hour=8,canMeet=true}={}){
 const clock={day,hour,seconds:9000},core=newCore(saved,clock),doc={head:element('head'),body:element('body'),createElement:element},actor={ageYears:22,walking:false,root:new THREE.Group()},paper=new THREE.Group(),home=new THREE.Group();actor.root.userData.hands=[new THREE.Group(),new THREE.Group()];actor.root.add(...actor.root.userData.hands);home.add(paper);
 const sent=[],service=createChinaCourtCareer({careers:core,getPlayer:()=>actor,getClock:()=>clock,audience:{state:()=>({phase:'idle',schedule:{}})},getRecruiter:()=>npc,requestMeeting:()=>canMeet,documentObject:paper});service.update(.1);
 const ui=createCareerHandbook({careers:core,getPlayer:()=>actor,getClock:()=>clock,getCountry:()=> 'china',getService:()=>service,document:doc,onIntent:n=>sent.push(n)});
 const show=()=>{ui.open(false);return all(doc.body).filter(e=>e.tag==='button');};
 return {core,ui,service,actor,sent,clock,doc,show,dispose(){ui.dispose();service.dispose();}};
}
for(const [stage,saved,promotionKind]of states){
 const f=promotionPanel(saved),before=JSON.stringify(f.core.state()),bs=f.show(),work=bs.find(b=>b.attributes['data-career-action']==='work'),promotion=bs.find(b=>b.attributes['data-career-action']==='promotion');
 assert(work,stage+' must retain next-day attendance');assert.equal(!!promotion,!!promotionKind,stage);assert.equal(JSON.stringify(f.core.state()),before,'render has no effects');
 if(promotion){promotion.onclick();assert.equal(f.sent.at(-1).kind,promotionKind,stage+' has its independent promotion entry');f.show();}
 const workAgain=all(f.doc.body).find(b=>b.attributes['data-career-action']==='work');workAgain.onclick();assert.equal(f.sent.at(-1).kind,'attend');
 const pendingBefore=JSON.stringify(f.core.promotionSummary().application);f.actor.root.position.fromArray(f.sent.at(-1).position);assert(f.service.executeIntent(f.sent.at(-1)));assert.equal(f.core.workState().lastDuty.stage,'arrived');assert.equal(JSON.stringify(f.core.promotionSummary().application),pendingBefore,'starting work preserves promotion/paper receipt');assert.equal(f.core.currentRole().wage,stage==='approved'?22:18,'rank pay is unchanged by button choice');
 assert(!f.show().some(b=>b.attributes['data-career-action']==='promotion'),'unsettled duty retains original promotion gate');f.dispose();
}
for(const opts of [{day:3,hour:12},{day:4,hour:19}]){const f=promotionPanel(states[1][1],opts),bs=f.show();assert(!bs.some(b=>b.attributes['data-career-action']==='work'));assert(bs.some(b=>b.attributes['data-career-action']==='promotion'));assert(text(f.doc.body).includes(opts.day===3?'今日已结薪':'休班'));f.dispose();}
for(const stage of ['archive','ready']){
 const f=promotionPanel(states[1][1]);assert(f.core.beginDuty().ok);f.clock.hour=11.5;assert(f.core.dutyEvent('court-start').ok);f.clock.hour=12;assert(f.core.dutyEvent('court-completed').ok);if(stage==='ready')assert(f.core.dutyEvent('archive-completed').ok);
 const work=f.show().find(b=>b.attributes['data-career-action']==='work');assert(work,stage);assert(!all(f.doc.body).some(b=>b.attributes['data-career-action']==='promotion'));work.onclick();assert.equal(f.sent.at(-1).kind,stage==='ready'?'settle':'archive');f.dispose();
}
console.log('PASS real qualified/submitted/document-ready/document-held/promoted states retain independent attendance and promotion actions; actual attend preserves application/rank pay; archive/settle, paid-day and off-hours gates remain intact');
const {FORMAL_CAREER_ROLES}=await import('../source/game/formal-careers.js');
const {regionalTellerRole}=await import('../source/game/regional-teller-audit-proof.js');
// Teller fixed-salary roles use their dedicated shift adapter, covered for all
// four countries in regional-teller-career-panel.mjs, not generic accept.
let sharedRoles=0;
for(const role of FORMAL_CAREER_ROLES.filter(r=>r.id!==CLERK.id&&r.paymentKind!=='commission'&&!regionalTellerRole(r.id))){
 const localClock={day:5,hour:8,seconds:10000},localSeed={...seed,...(role.id==='cn-royal-kitchen-cook'?{workExperience:{tavernChef:[1,2,3].map(day=>({source:'china-tavern-chef',number:day,orderId:`cn-tavern-order-${day}`,mealId:`cn-tavern-order-${day}-dish`,actorId:'player',day,workReceiptId:`cn-tavern-chef-labor-${day}`,completed:true})),royalKitchen:{receipts:[]}}}:{}),tenure:{roleId:role.id,slotId:role.slotId,sinceDay:5,sinceHour:8}},core=newCore(localSeed,localClock);assert.equal(core.state().loadError,null,role.id);
 const doc={head:element('head'),body:element('body'),createElement:element},sent=[],service={state:()=>({}),intent:kind=>kind==='accept'?{id:role.id+'-accept',provider:role.id,kind,intentKey:role.id,action:'当班报到',position:[0,0,0]}:null};
 const ui=createCareerHandbook({careers:core,getPlayer:()=>player,getClock:()=>localClock,getCountry:()=>role.country,getService:()=>service,document:doc,onIntent:n=>sent.push(n)});ui.open(false);
 const work=all(doc.body).find(b=>b.attributes['data-career-action']==='work');assert(work,role.id);work.onclick();assert.equal(sent.at(-1).kind,'accept',role.id);assert(!all(doc.body).some(b=>b.attributes['data-career-action']==='promotion'));ui.dispose();sharedRoles++;
}
console.log(`PASS shared work-action dispatch remains available for all ${sharedRoles} other shift-based formal roles (real career state, adapter intent surface); commission and fixed-salary teller roles retain their separately tested dedicated panels`);

{const f=promotionPanel(states[1][1],{canMeet:false});assert(f.service.prepareIntent(f.service.intent('promotion-review')));assert(f.service.isWaiting());const work=f.show().find(b=>b.attributes['data-career-action']==='work');assert(work,'an optional queued review can be abandoned for an available shift');work.onclick();assert.equal(f.sent.at(-1).kind,'attend');f.service.stopActivity();f.actor.root.position.fromArray(f.sent.at(-1).position);assert(f.service.executeIntent(f.sent.at(-1)));assert(!f.service.isWaiting());assert.equal(f.core.promotionSummary().application.stage,'submitted');f.dispose();}
console.log('PASS an active optional review queue leaves attendance selectable; standard action cancellation releases the queue without withdrawing the application');

// The promotion branch uses the same stable wait record without skipping review.
{const f=promotionPanel(states[1][1],{canMeet:false});assert(f.service.prepareIntent(f.service.intent('promotion-review')));const saved=JSON.parse(JSON.stringify(f.service.snapshot()));assert.equal(saved.waiting.applicationId,f.core.promotionSummary().application.id);f.dispose();const re=promotionPanel(states[1][1],{canMeet:false});assert(re.service.restore(saved));assert(re.service.isWaiting());re.service.update(.6);assert(re.service.isWaiting());re.dispose();const ready=promotionPanel(states[1][1]);assert(ready.service.restore(saved));ready.service.update(.6);assert(!ready.service.isWaiting());assert.equal(ready.core.promotionSummary().application.stage,'submitted');ready.dispose();}
console.log('PASS promotion review wait persists and resumes only through actual reception readiness');

// Second-route projection is read-only and independently dispatched. Mutating
// only the royal runtime must refresh the open handbook without a core revision.
{
 const {appendOfficialPromotionPanel, appendOfficialCareerHistory, appendCourtRankReference} = await import('../source/game/official-career-panel.js');
 const {getChinaRecordsCareerRank} = await import('../source/game/china-official-ranks.js');
 const rank = getChinaRecordsCareerRank('cn-records-regular'), target = getChinaRecordsCareerRank('cn-records-personnel');
 const summary = {rank, rankId:rank.rankId, routeId:target.rankId, qualifiedDays:3, tenureDays:3, balance:3, lifetimeQualifiedDays:6, eligible:true, reasons:[], trialComplete:true, application:null};
 const runtime = {enabled:true, application:null, activity:null, progress:0, waiting:false, loadError:null, lastError:null};
 let enabled = true, available = true, cancelled = 0;
 const core = {promotionSummary:()=>summary, promotionAvailability:()=>({ok:available,reasons:[]}),personnelProgressionEnabled:()=>enabled,cancelPromotion:()=>cancelled++};
 const make=(tag,value,cls)=>Object.assign(element(tag),{textContent:value||'',className:cls||''}),kinds=[],metrics=[];
 const render=()=>{kinds.length=0;metrics.length=0;const panel={body:element('div'),actions:element('footer')};panel.actions.append(make('button','原朝班'));appendOfficialPromotionPanel({careers:core,role:CLERK,panel,make,metric:(...value)=>metrics.push(value),service:{personnelAppointmentState:()=>runtime},buttonFor:(label,run)=>Object.assign(make('button',label),{onclick:run}),action:(_role,kind,label)=>{kinds.push(kind);return Object.assign(make('button',label||kind),{onclick:()=>requests.push({kind})});}});return panel;};
 let view=render();assert.deepEqual(kinds,['personnel-promotion-apply']);assert.equal(cancelled,0);assert(metrics.flat().join(' ').includes('26–28文'));assert(text(view.body).includes('文书3级'));assert(text(view.body).includes('只保存一次抽签结果'));assert(text(view.actions).includes('原朝班'));
 const application={id:'personnel-ui-case',routeVersion:2,appointmentId:'ui-tenure',fromRankId:rank.rankId,toRankId:target.rankId,day:6,status:'pending',stage:'submitted',code:'submitted'};
 summary.application=application;runtime.application=application;available=false;
 for(const [stage,kind]of [['submitted','review'],['document-ready','receive-document'],['document-held','imperial-review'],['imperial-approved','appointment']]){
  application.stage=application.code=stage;view=render();assert.deepEqual(kinds,['personnel-promotion-'+kind]);view.actions.children[1].onclick();assert.equal(requests.at(-1).kind,'personnel-promotion-'+kind);assert(!kinds.some(kind=>kind.startsWith('promotion-')));assert.equal(cancelled,0);
 }
 for(const [activity,label]of [['review','陆谦当面核荐 2.0 / 4 秒'],['imperial-review','皇帝当面阅批 2.0 / 4 秒'],['appointment','原登记处宣读 1.5 / 3 秒']]){
  runtime.activity=activity;runtime.progress=.5;view=render();assert(text(view.body).includes(label));assert.deepEqual(kinds,['personnel-promotion-cancel']);assert(text(view.actions).includes('原朝班'));
 }
 runtime.activity='imperial-wait';runtime.waiting=true;view=render();assert(text(view.body).includes('公共听候处等候皇帝'));assert(!all(view.body).some(e=>e.tag==='progress'));assert(text(view.body).includes('取消等候 · 保留申请与原件'));assert.equal(cancelled,0);
 runtime.activity='review-wait';view=render();assert(text(view.body).includes('等待陆谦本人接待'));
 runtime.waiting=false;runtime.activity='review-approach';assert(text(render().body).includes('抵达停步后核荐4秒'));
 runtime.activity=null;runtime.loadError='invalid-saved-state';view=render();assert.equal(kinds.length,0);assert(text(view.body).includes('任命原件暂不可核验'));runtime.loadError=null;
 application.stage='decided';application.code='promotion-review-rejected';application.status='rejected';view=render();assert(metrics.flat().join(' ').includes('皇帝未准本次任命'));assert.equal(kinds.length,0);
 application.code='approved';application.status='approved';application.decidedAt={day:7};application.recommendation={};application.imperialDecision={passed:true};summary.rank=target;summary.rankId=target.rankId;summary.routeId=null;view=render();assert.equal(kinds.length,0);assert(metrics.flat().join(' ').includes('更高官职需新的实职与资历路线'));
 const history={body:element('div')};appendOfficialCareerHistory({careers:{state:()=>({officialCareer:{appointments:[{id:'ui-tenure',tenure:{sinceDay:1},endedAt:null}],service:[],applications:[application]}})},panel:history,make});assert(text(history.body).includes('吏务核籍录事'));assert(text(history.body).includes('第7日申请从八品'));assert(text(history.body).includes('皇帝原次阅批通过，结果已保存'));
 for(const flag of [false,true]){const panel={body:element('div')};appendCourtRankReference({panel,make,personnelProgressionEnabled:flag});assert(text(panel.body).includes(flag?'当前可玩升阶到从八品':'当前可玩升阶只到正九品'));assert.equal(text(panel.body).includes('从八品新班基础26文'),flag);assert.equal(text(panel.body).includes('本人核籍原册逐行验收与正九品至从八品实任履历核荐，皇帝最终授任'),flag);assert.equal(text(panel.body).includes('人员名册变更、更高阶考核与完整任免链'),flag);assert.equal(text(panel.body).includes('值勤名册目前为日常动作'),!flag);}
 summary.rank=rank;summary.rankId=rank.rankId;summary.application=null;summary.routeId=null;summary.eligible=false;enabled=false;available=false;view=render();assert.equal(kinds.length,0);assert(!metrics.flat().join(' ').includes('从八品'));assert(!text(view.body).includes('文书3级'));
 summary.application={...application,stage:'submitted',code:'submitted',status:'pending'};render();assert.equal(kinds.length,0,'disabled v2 receipt must never fall through to original promotion actions');
 // Use the existing real first-promotion fixture for all unrelated employment
 // and ordinary work, overriding only the new runtime read projection.
 const f=promotionPanel(states.at(-1)[1]);let royal={...runtime,enabled:true,application:{...application,status:'pending',code:'document-held',stage:'document-held'},activity:null,progress:0,waiting:false,lastError:null};
 const projectedCore={...f.core,personnelProgressionEnabled:()=>true,promotionSummary:()=>({...f.core.promotionSummary(),rank,rankId:rank.rankId,routeId:target.rankId,eligible:true,reasons:[],application:royal.application})};
 const projectedService={...f.service,personnelAppointmentState:()=>royal,intent:kind=>kind?.startsWith('personnel-promotion-')?{id:kind,provider:'china-personnel-appointment',kind,intentKey:royal.application.stage+':'+kind,action:kind,position:[0,0,0]}:f.service.intent(kind)};
 const royalDoc={head:element('head'),body:element('body'),createElement:element},royalUI=createCareerHandbook({careers:projectedCore,getPlayer:()=>f.actor,getClock:()=>f.clock,getCountry:()=> 'china',getService:()=>projectedService,document:royalDoc,copperLedger:bank});
 royalUI.open(false);const revision=f.core.state().revision;royal.activity='imperial-wait';royal.waiting=true;royalUI.update('lot');assert(text(royalDoc.body).includes('公共听候处等候皇帝'));
 royal.activity='imperial-review';royal.waiting=false;royal.progress=.5;royalUI.update('lot');assert(text(royalDoc.body).includes('皇帝当面阅批 2.0 / 4 秒'));
 royal.lastError='save-failed';royalUI.update('lot');assert(text(royalDoc.body).includes('原完成凭据待保存'));
 royal.lastError=null;royal.activity=null;royal.application={...royal.application,stage:'imperial-approved',code:'imperial-approved'};royalUI.update('lot');assert(text(royalDoc.body).includes('皇帝已准任 · 待宣读登记'));assert.equal(f.core.state().revision,revision);royalUI.dispose();f.dispose();
}
console.log('PASS gated second-route UI, independent five-stage dispatch, real-time royal wait/progress/error refresh without core revision, separate stop versus withdrawal, dynamic target-grade history and unopened higher ranks');

// A held clerk's registration card shows the attained job, while applicants
// still see the entry role. The personnel projection is a display fixture;
// its actual grant, contract and wage are covered by the production-main chain.
{
 const f=promotionPanel(states.at(-1)[1]),regular=f.core.currentRole();
 const unemployed=createFormalCareers({saved:seed,getClock:()=>f.clock,saveState:()=>true});
 const personnel={...f.core,currentRole:()=>({...regular,name:'吏务核籍录事',rankId:'cn-records-personnel',gradeLabel:'从八品',wage:26})};
 for(const [core,name,wage,owner]of [[unemployed,'礼务录事',18,false],[f.core,'礼务录事',22,true],[personnel,'吏务核籍录事',26,true]]){
  const doc={head:element('head'),body:element('body'),createElement:element},before=JSON.stringify(core.state());
  const ui=createCareerHandbook({careers:core,getPlayer:()=>f.actor,getClock:()=>f.clock,getCountry:()=> 'china',getService:()=>f.service,document:doc,copperLedger:bank});
  ui.open({scope:'catalogue',roleId:CLERK.id});const card=all(doc.body).find(e=>e.className==='career-role-card');assert(card);
  assert.equal(all(card).find(e=>e.tag==='h3').textContent,name);
  assert.equal(all(card).find(e=>e.className==='career-card-wage').textContent,wage+'铜文');
  assert.equal(all(card).some(e=>e.className==='career-vacancy held'),owner);
  if(wage===26){assert(text(card).includes('朝班：礼仪主管；核籍：吏务主管'));assert(text(card).includes('六官原案核籍、吏务主管验收与本人归档'));}
  else assert(!text(card).includes('核籍：吏务主管'));
  assert.equal(JSON.stringify(core.state()),before,'Registration rendering does not change rank, rules or contracts');ui.dispose();
 }
 f.dispose();
}
console.log('PASS clerk registration display: applicant18, attained regular22 and personnel26 with actual work supervisors; no career mutation');
