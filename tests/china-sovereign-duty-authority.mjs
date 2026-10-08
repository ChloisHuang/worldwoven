// Reproduces stale imperial authority, automatic player decisions, remote
// acknowledgements and reassigned historical receipts. Route doubles exercise
// production ceremony/document controllers; main owns actual scene navigation.
// Run with: node --experimental-vm-modules tests/china-sovereign-duty-authority.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve('source'),context=vm.createContext({console,structuredClone}),cache=new Map();
const copy=value=>JSON.parse(JSON.stringify(value));
function module(file){if(cache.has(file))return cache.get(file);const result=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context});cache.set(file,result);return result;}
const linker=(name,from)=>module(name==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(from.identifier),name.split('?')[0]));
async function load(name){const result=module(path.join(root,'game',name));if(result.status==='unlinked')await result.link(linker);if(result.status==='linked')await result.evaluate();return result.namespace;}
const reportModule=await load('china-court-reports.js'),auditModule=await load('china-granary-audit.js'),moneyModule=await load('china-official-economy.js');
const {createCourtReports,readCourtAuthority}=reportModule,{createChinaGranaryAudit,CHINA_GRANARY_AUDITOR,CHINA_GRANARY_AUDIT_POINT}=auditModule;
let holder={holderId:'cn-emperor',revision:0,suspended:false};
const readAuthority=()=>({...holder}),term=()=>({holderId:holder.holderId,revision:holder.revision});
const completedSource=day=>({ledger:{lastDay:day,lastReceipt:`cn-morning-audience:${day}`,outcome:'completed',completedReceipt:`cn-morning-audience:${day}`},order:null,props:{workProgress:1}});
function pendingReport(day=0,reader=null){
 const reports=createCourtReports({readEdict:()=>completedSource(day),readAuthority:reader}),request=reports.report('works',day);
 assert(reports.decide(request.issueId,'approve',reader?holder.holderId:'cn-emperor',reader?term():null));
 const job=reports.inspection();assert(reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point}));return copy(reports.snapshot());
}
const oldPending=pendingReport(),oldReports=createCourtReports({saved:oldPending}),oldRef=oldReports.report('works',1).resultReport;
const oldProof={reporterId:'cn-minister-works',recipientId:'cn-emperor',reportSeconds:6,responseSeconds:4};
assert(oldReports.acknowledgeReport(oldRef,oldProof).ok);const historical=copy(oldReports.snapshot());
holder={holderId:'player',revision:1,suspended:false};
assert.deepEqual(copy(createCourtReports({readAuthority,saved:historical}).snapshot()),historical,'historical emperor receipt keeps its actual recipient and shape');
const reports=createCourtReports({readAuthority,saved:oldPending}),ref=reports.report('works',1).resultReport;
assert(!reports.acknowledgeReport(ref,oldProof).ok,'retired emperor cannot acknowledge new delivery');
const playerProof={...oldProof,recipientId:'player',authority:term()};
assert(!reports.acknowledgeReport(ref,{...playerProof,authority:{holderId:'player',revision:0}}).ok);
assert(!reports.acknowledgeReport(ref,{...playerProof,responseSeconds:3.99}).ok);
holder.suspended=true;assert.equal(readCourtAuthority(readAuthority),null);assert(!reports.acknowledgeReport(ref,playerProof).ok);
holder.suspended=false;assert(reports.acknowledgeReport(ref,playerProof).ok);
const named=copy(reports.snapshot()),receipt=named.cases[0].result.received;
assert.deepEqual(receipt.authority,{holderId:'player',revision:1});assert.equal(receipt.recipientId,'player');
holder.revision=2;assert.deepEqual(copy(createCourtReports({readAuthority,saved:named}).snapshot()),named,'later tenure cannot rewrite a received report');
const corrupt=copy(named);corrupt.cases[0].result.received.authority.holderId='cn-emperor';
assert.equal(createCourtReports({saved:corrupt}).snapshot().cases[0].result.received,undefined,'recipient and frozen term must agree');
holder.revision=1;
let rejectDecision=true;
const decisions=createCourtReports({readAuthority,readEdict:()=>completedSource(2),saveState:()=>!rejectDecision}),request=decisions.report('works',2);
assert(!decisions.decide(request.issueId,'approve','cn-emperor',{holderId:'cn-emperor',revision:0}));
assert(!decisions.decide(request.issueId,'approve','player',term()));assert.equal(decisions.snapshot().cases[0].response,null,'failed decision write remains uncommitted');
rejectDecision=false;assert(decisions.decide(request.issueId,'inquire','player',term()));assert(decisions.decide(request.issueId,'inquire','player',term()),'exact saved response may resume without a new decision');

// Audit future acknowledgements use the new holder, while every paid amount
// and source proof remains the official ledger's original record.
const {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS}=moneyModule;
const economy=createChinaOfficialEconomy({getDay:()=>10,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),saveState:()=>true});
assert(economy.activateGradePayPolicy().ok);
const audit=createChinaGranaryAudit({readAuthority,readReceipts:after=>economy.dutyAuditSource(after),saveState:()=>true});assert(audit.activate().ok);
const official=CHINA_OFFICIAL_IDS[0],duty={actorId:official,day:1,receiptId:'sovereign-duty:one',evidence:{kind:'office-work',completed:true,actorId:official,day:1,audienceDay:1,audienceCompleted:true,elapsed:8,duration:8}};
assert(economy.completeDuty(duty).ok);const moneyBefore=copy(economy.snapshot()),batch=audit.prepare().batch;
assert(audit.inspected(batch.id,{actorId:CHINA_GRANARY_AUDITOR,position:[...CHINA_GRANARY_AUDIT_POINT],elapsed:21,duration:21}).ok);
const auditPending=copy(audit.snapshot());
const auditRef=audit.report(2).auditReport,auditProof={...playerProof,reporterId:CHINA_GRANARY_AUDITOR};
assert(!audit.acknowledgeReport(auditRef,{...auditProof,recipientId:'cn-emperor'}).ok);
assert(!audit.acknowledgeReport(auditRef,{...auditProof,authority:{holderId:'player',revision:0}}).ok);
assert(audit.acknowledgeReport(auditRef,auditProof).ok);assert.deepEqual(copy(economy.snapshot()),moneyBefore);
const audited=copy(audit.snapshot()),coldAudit=createChinaGranaryAudit({readAuthority,readReceipts:after=>economy.dutyAuditSource(after),saved:audited,saveState:()=>true});
assert.equal(coldAudit.loadError,null);assert.deepEqual(copy(coldAudit.snapshot()),audited);assert.equal(audited.batches[0].received.recipientId,'player');
const badAudit=copy(audited);badAudit.batches[0].received.authority.revision=-1;
assert.equal(createChinaGranaryAudit({readReceipts:after=>economy.dutyAuditSource(after),saved:badAudit}).loadError,'invalid-saved-state');

// R199 can save a received ledger before the audience response has advanced.
// On the first authority-aware reload its old response gains explicit term 0.
// That exact replay is allowed, without adding the new field to old history.
holder={holderId:'cn-emperor',revision:0,suspended:false};
const migrationReports=createCourtReports({readAuthority,saved:historical,saveState:()=>assert.fail('historical replay must not write')});
assert(migrationReports.restoreReport(oldRef));
assert(migrationReports.acknowledgeReport(oldRef,{...oldProof,authority:term()}).replayed);
assert(!migrationReports.acknowledgeReport(oldRef,{...oldProof,authority:{holderId:'cn-emperor',revision:1}}).ok);
assert.deepEqual(copy(migrationReports.snapshot()),historical);
const legacyAudit=createChinaGranaryAudit({readReceipts:after=>economy.dutyAuditSource(after),saved:auditPending,saveState:()=>true});
const legacyAuditRef=legacyAudit.report(2).auditReport,legacyAuditProof={...oldProof,reporterId:CHINA_GRANARY_AUDITOR};
assert(legacyAudit.acknowledgeReport(legacyAuditRef,legacyAuditProof).ok);const historicalAudit=copy(legacyAudit.snapshot());
const migrationAudit=createChinaGranaryAudit({readAuthority,readReceipts:after=>economy.dutyAuditSource(after),saved:historicalAudit,saveState:()=>assert.fail('historical audit replay must not write')});
assert(migrationAudit.restoreReport(legacyAuditRef));assert(migrationAudit.acknowledgeReport(legacyAuditRef,{...legacyAuditProof,authority:term()}).replayed);
assert(!migrationAudit.acknowledgeReport(legacyAuditRef,{...legacyAuditProof,authority:{holderId:'cn-emperor',revision:1}}).ok);
assert.deepEqual(copy(migrationAudit.snapshot()),historicalAudit);
holder.suspended=true;assert(!migrationReports.acknowledgeReport(oldRef,{...oldProof,authority:term()}).ok);assert(!migrationAudit.acknowledgeReport(legacyAuditRef,{...legacyAuditProof,authority:term()}).ok);
holder={holderId:'player',revision:1,suspended:false};
assert(!migrationReports.acknowledgeReport(oldRef,playerProof).ok);assert(!migrationAudit.acknowledgeReport(legacyAuditRef,auditProof).ok);
assert(!migrationReports.acknowledgeReport(oldRef,{...oldProof,authority:{holderId:'cn-emperor',revision:0}}).ok,'new reign cannot acquire a legacy receipt by presenting former term 0');
assert(!migrationAudit.acknowledgeReport(legacyAuditRef,{...legacyAuditProof,authority:{holderId:'cn-emperor',revision:0}}).ok);
assert.deepEqual(copy(migrationReports.snapshot()),historical);assert.deepEqual(copy(migrationAudit.snapshot()),historicalAudit);assert.deepEqual(copy(economy.snapshot()),moneyBefore);

const lifeModule=await load('china-palace-life.js'),audienceModule=await load('china-palace-audience.js'),edictModule=await load('china-palace-edict.js');
const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
const E=(await load('china-palace-edict-place.js')).PALACE_EDICT,P=E.points;
function actor(station,position=station.npcPosition){
 const root=new T.Group(),head=new T.Group(),hands=[new T.Group(),new T.Group()];root.userData.head=head;root.userData.hands=hands;root.add(head,...hands);root.position.set(...position);
 for(const [i,hand]of hands.entries())hand.position.set(i?.16:-.16,1,.4);
 const small={textContent:''};return {station:{...station},actorId:station.id,alive:true,root,home:root.position.clone(),route:[],phase:0,walking:false,breakAt:20,label:{querySelector:()=>small},locomotion:{walkSpeed:9},animate(){root.updateWorldMatrix(true,true);}};
}
const royalActors=[...lifeModule.CHINA_PALACE_ROLES,{id:'cn-tea',npcPosition:[3,.8,-28]}].map(station=>actor(station));
const emperor=royalActors[0],player={actorId:'player',alive:true,root:new T.Group(),locomotion:{walkSpeed:1.4}};
player.root.position.set(12,.145,-14);
const chair={id:'china-furniture-seat',kind:'seat',position:emperor.home.toArray(),anchor:emperor.home.toArray(),yaw:0,seatY:8.5},throne={id:'china-furniture-throne',kind:'seat',position:[0,1.415,-6],anchor:[0,2.049,-8],yaw:0,seatY:2.69};
const furniture={items:[chair,throne],canSit:()=>true,canUse:()=>true,standPoint:()=>emperor.home.clone(),releaseActor(){},facilities:{reserve:()=>true,occupy:()=>true,releaseActor(){},state:()=>[]}};
const lot={group:new T.Group(),colliders:[],walkableSurfaces:[],doorways:[],bounds:{minX:-40,maxX:40,minZ:-45,maxZ:45}};
const doors={cameraColliders:[],routeStep(route,p){while(route.length&&Math.hypot(p.x-route[0].x,p.z-route[0].z)<.025)route.shift();return {waypoint:route[0]};}};
const planPath=(_,p)=>[p],moveActor=(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;if(n.route[0])n.root.position.y=n.route[0].y;};
holder={holderId:'cn-emperor',revision:0,suspended:true};
const palace=lifeModule.createChinaPalaceLife({npcs:royalActors,lot,furniture,doors,planPath,moveActor,poseContext:()=>({visualFloorOffset:0}),worldSeed:42,readAuthority,getPlayer:()=>player});
const privateHome=emperor.home.toArray(),privateId=emperor.station.id;
assert(!palace.requestDuty('china-morning-audience'),'suspended original emperor cannot be called to rule');assert.equal(palace.petitionAvailability().ok,false);
palace.update(.05,.05);assert(palace.state().actors[0].activity,'suspension retains ordinary private life');assert.equal(palace.state().duty,null);assert(palace.handoffBoundary().ok);
holder={holderId:'player',revision:1,suspended:false};
const formerBefore=copy(palace.snapshot()),playerBefore=player.root.position.toArray();
assert(palace.requestDuty('china-morning-audience'));assert.equal(palace.dutyState('china-morning-audience').ready,false);
assert.deepEqual(player.root.position.toArray(),playerBefore);assert.deepEqual(copy(palace.snapshot()).runtime.stages,formerBefore.runtime.stages,'player duty does not replace former emperor living script');
player.root.position.set(0,.13,-4.3);assert(!palace.dutyState('china-morning-audience').ready,'same horizontal point on lower floor is not attendance');
player.root.position.set(0,1.415,-4.3);assert(palace.dutyState('china-morning-audience').ready);
player.root.position.set(0,1.415,-8);assert(!palace.dutyState('china-morning-audience').ready,'under throne anchor is not attendance');
player.root.position.set(...throne.anchor);assert(palace.dutyState('china-morning-audience').ready);
assert(!palace.handoffBoundary().ok);palace.releaseDuty('china-morning-audience');assert(palace.handoffBoundary().ok);
assert.equal(palace.invitationOpportunity(),null);assert.equal(palace.petitionAvailability().ok,false);assert.equal(player.station,undefined);

// Run the original six-person assembly. Do not hand a saved completed timer
// to the service: the report and answer seconds must accrue in the live loop.
const officials=audienceModule.CHINA_COURT_OFFICIALS.map((station,i)=>actor(station,audienceModule.chinaCourtAssemblyRoute(i).court));
const originalWages=officials.map(n=>n.station.currentWage),notices=[];
let failAudienceSave=false,service;
const audienceArgs={npcs:[...officials,emperor],palace,lot,doors,planPath,moveActor,poseContext:()=>({}),readAuthority,readEdict:()=>completedSource(0),saved:{reports:oldPending},saveState:()=>!failAudienceSave,notify:text=>notices.push(text)};
service=audienceModule.createChinaPalaceAudience(audienceArgs);player.root.position.set(0,1.415,-4.3);
let time=0,hour=11.49;
const audienceTick=(dt=.05,extra={})=>{time+=dt;service.update(dt,time,{position:player.root.position,hour,day:0,...extra});};
const untilAudience=(predicate,limit=12000)=>{for(let i=0;i<limit&&!predicate();i++)audienceTick();assert(predicate(),JSON.stringify(service.state()));};
untilAudience(()=>service.state().phase==='holding');assert(!service.handoffBoundary().ok);hour=11.5;
untilAudience(()=>service.state().phase==='report');assert.equal(service.decideAsPlayer('approve').ok,false,'no answer before complete report');
for(let i=0;i<100;i++)audienceTick();assert.equal(service.playerDecision(),null,'five seconds is not six');
untilAudience(()=>!!service.playerDecision());for(let i=0;i<160;i++)audienceTick();
assert.equal(service.state().phase,'report');assert.equal(service.state().phaseTime,6);assert.equal(service.state().reports.cases[0].result.received,undefined,'waiting for a click never acknowledges');
assert(!notices.some(text=>text.startsWith('景珩')&&text.includes('收入承务案')),'retired emperor cannot speak the player response');
player.root.position.x=1;assert(!service.decideAsPlayer('approve').ok,'remote click is rejected');player.root.position.x=0;
failAudienceSave=true;assert(!service.decideAsPlayer('approve').ok);assert.equal(service.state().phase,'report');failAudienceSave=false;
assert(service.decideAsPlayer('approve').ok);assert.equal(service.state().speaker,'player');for(let i=0;i<40;i++)audienceTick();
const responseCheckpoint=copy(service.snapshot());assert.equal(responseCheckpoint.runtime.currentReport.resultDelivery.recipientId,'player');assert.equal(service.state().reports.cases[0].result.received,undefined);
service.dispose({suspend:true});service=audienceModule.createChinaPalaceAudience({...audienceArgs,saved:{continuity:responseCheckpoint}});assert(service.restore(responseCheckpoint));
for(let i=0;i<30;i++)audienceTick();assert.equal(service.state().reports.cases[0].result.received,undefined,'reload retains unfinished real response seconds');
untilAudience(()=>!!service.state().reports.cases[0].result.received);
const delivered=service.state().reports.cases[0].result.received;assert.equal(delivered.responseSeconds,4);assert.deepEqual(copy(delivered.authority),term());assert.equal(delivered.sourceEventId,'cn-edict-east-shore:0:completed');
untilAudience(()=>!!service.playerDecision());assert(service.decideAsPlayer('defer').ok);untilAudience(()=>service.handoffBoundary().ok);
assert.equal(service.state().schedule.outcome,'completed');assert.equal(service.state().actors.length,6);assert.deepEqual(officials.map(n=>n.station.currentWage),originalWages);
const completedAudience=copy(service.snapshot());assert(service.restore(completedAudience),'completed last player reply remains historical after the live duty term is released');assert.equal(service.state().phase,'waiting');
service.dispose({suspend:true});assert(palace.handoffBoundary().ok);

// Same original draft, herald, paper and approval location. Player consent is
// explicit; elapsed waiting, former emperor presence and an invalid term do
// not move the original paper past imperial approval.
const scribe=actor({id:'cn-calligraphy',npcName:'拟稿人'},P.scribe),herald=actor({id:E.herald.id,npcName:'传令人'},P.sealStand),gardener=actor({id:'cn-garden',npcName:'园丁'},[.8,.295,-18.7]);
const {createNPCPieceworkAccount}=await load('npc-piecework-account.js'),heraldRole=(await load('china-palace-herald-role.js')).PALACE_HERALD_ROLE;
const realHeraldAccount=createNPCPieceworkAccount({role:heraldRole,namespace:'chinaHeraldAccounts',proofKind:'npc-edict-delivery-piecework',saveState:()=>true});
const paid=[];let failEdictSave=false,flow;
const edictArgs={npcs:[scribe,herald,gardener,emperor],lot,palace,readAuthority,getPlayer:()=>player,audience:{courtStatus:()=>({phase:'waiting',schedule:{lastCompletedDay:0,completionId:'cn-morning-audience:0',outcome:'completed'}})},doors,planPath,moveActor,poseContext:()=>({}),heraldAccounts:{settle:(proof,world)=>{const result=realHeraldAccount.settle(proof,world);if(result.ok&&!result.replayed)paid.push(copy(proof));return result;}},saveState:()=>!failEdictSave};
flow=edictModule.createChinaPalaceEdict(edictArgs);player.root.position.set(10,.145,-14);
const edictTick=(dt=.05)=>{time+=dt;flow.update(dt,time,{position:player.root.position});};
const untilEdict=(predicate,limit=20000)=>{for(let i=0;i<limit&&!predicate();i++)edictTick();assert(predicate(),JSON.stringify(flow.state()));};
untilEdict(()=>flow.state().order?.stage==='to-approval'&&flow.state().actors.find(n=>n.id===E.herald.id)?.arrived);
assert(!flow.handoffBoundary().ok);assert(!flow.playerDecision().ready);assert(!flow.decideAsPlayer('approve').ok);
player.root.position.set(-15.1,.215,-13.35);untilEdict(()=>flow.playerDecision()?.ready);
for(let i=0;i<140;i++)edictTick();assert.equal(flow.state().order.stage,'to-approval');assert.equal(flow.state().order.approvedBy,undefined);
failEdictSave=true;assert(!flow.decideAsPlayer('approve').ok);assert.equal(flow.state().order.stage,'to-approval');failEdictSave=false;
assert(flow.decideAsPlayer('approve').ok);for(let i=0;i<40;i++)edictTick();
const approvalCheckpoint=copy(flow.snapshot()),forged=copy(approvalCheckpoint);delete forged.runtime.order.approvalDecision;assert(!flow.restore(forged),'a restored player approval needs the explicit original decision');
const staleDecision=copy(approvalCheckpoint);staleDecision.runtime.order.approvalDecision.authority.revision=0;assert(!flow.restore(staleDecision),'a decision from another term cannot resume this approval');
holder.suspended=true;for(let i=0;i<100;i++)edictTick();assert.equal(flow.state().phaseTime,approvalCheckpoint.runtime.phaseTime);holder.suspended=false;
flow.dispose({suspend:true});flow=edictModule.createChinaPalaceEdict({...edictArgs,saved:{continuity:approvalCheckpoint}});assert(flow.restore(approvalCheckpoint));
for(let i=0;i<30;i++)edictTick();assert.equal(flow.state().order.approvedBy,undefined,'partial approval does not become four seconds on cold load');
failEdictSave=true;for(let i=0;i<20;i++)edictTick();assert.equal(flow.state().order.stage,'approval');assert.equal(flow.state().approvalReceipt,null,'failed receipt save cannot advance the paper');failEdictSave=false;
untilEdict(()=>flow.state().order?.stage==='to-seal');assert.equal(flow.state().order.approvedBy,'player');assert.deepEqual(copy(flow.state().order.approvedAuthority),term());
const imperialReceipt=copy(flow.state().approvalReceipt);assert.equal(imperialReceipt.decisionMakerId,'player');assert.equal(imperialReceipt.approvalSeconds,4);
const staleApproval=copy(flow.snapshot());staleApproval.runtime.order.approvedAuthority.revision=0;assert(!flow.restore(staleApproval),'wrong frozen imperial term cannot become a delivery fee');
holder.revision=2;for(let i=0;i<80;i++)edictTick();assert.equal(flow.state().order.stage,'to-seal');assert.equal(realHeraldAccount.account(E.herald.id).bank,0);holder.revision=1;
untilEdict(()=>flow.state().order?.stage==='to-work');assert.equal(paid.length,1);assert.equal(paid[0].emperorId,'player');assert.equal(paid[0].approvedBy,'player');assert.equal(paid[0].steps.approvalSeconds,4);
assert.equal(realHeraldAccount.account(E.herald.id).bank,heraldRole.amount);const forgedPay=copy(paid[0]);forgedPay.actorId='player';forgedPay.sealedBy='player';assert(!realHeraldAccount.settle(forgedPay).ok,'player approver exception never creates a player worker or changes its wage');
assert(realHeraldAccount.settle(copy(paid[0])).replayed);assert.equal(realHeraldAccount.account(E.herald.id).bank,12,'same numbered order never pays a second delivery fee');
const differentApprover=copy(paid[0]);differentApprover.emperorId='cn-emperor';differentApprover.approvedBy='cn-emperor';assert(!realHeraldAccount.settle(differentApprover).ok,'changing an old receipt approver does not create a new fee');
const legacyAccount=createNPCPieceworkAccount({role:heraldRole,namespace:'chinaHeraldAccounts',proofKind:'npc-edict-delivery-piecework',saveState:()=>true});assert(legacyAccount.settle(differentApprover).ok);
const legacyFees=copy(legacyAccount.snapshot()),legacyReload=createNPCPieceworkAccount({role:heraldRole,namespace:'chinaHeraldAccounts',proofKind:'npc-edict-delivery-piecework',saved:legacyFees,saveState:()=>true});assert.deepEqual(copy(legacyReload.snapshot()),legacyFees);assert.equal(legacyReload.account(E.herald.id).bank,12);
untilEdict(()=>!flow.state().order&&flow.handoffBoundary().ok);assert.deepEqual(copy(flow.state().approvalReceipt),imperialReceipt);
assert.deepEqual(emperor.home.toArray(),privateHome);assert.equal(emperor.station.id,privateId);assert.equal(emperor.alive,true);assert.equal(player.station,undefined);assert.equal(player.actorId,'player');
flow.dispose({suspend:true});palace.dispose();
console.log('PASS: suspended and retired ruler guards; actual player presence, explicit choices and timed responses; frozen term receipts; legacy history and original wages; save rejection and cold resume; unchanged player identity and former ruler private life');
