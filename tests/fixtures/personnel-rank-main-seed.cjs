// Explicit core-generated history for one production higher-grade appointment.
// Reuses actual original actors/paper/world. This is not fifty days of world play.
module.exports=async function({prior,mod,linker,root,assert}){
 const path=require('node:path'),copy=x=>JSON.parse(JSON.stringify(x));
 const load=async name=>{const m=mod(path.join(root,'game',name));if(m.status==='unlinked')await m.link(linker);if(m.status!=='evaluated')await m.evaluate();return m.namespace;};
 const core=await load('formal-careers.js'),recordModule=await load('china-personnel-records.js'),workModule=await load('china-personnel-work.js'),money=await load('currency-ledger.js');
 const world=prior.worldContinuity.regions.china,LU='cn-official-personnel',EM='cn-emperor',officials=recordModule.CHINA_PERSONNEL_OFFICIALS_V1;
 const clock={day:7,hour:17,seconds:prior.simulationClock.seconds},calendar=(day,hour)=>(day*1440+hour*60-600)/.7;
 const actors=id=>({actorId:id,bodyId:id,alive:true,position:id===EM?[-15.1,.215,-13.35]:world.actors[id].position});
 const bank=money.createGameCurrencyLedger({saved:prior,getClock:()=>clock,storage:{setItem:()=>true}});
 const source=recordModule.createChinaPersonnelRecords({saved:world.controllers.chinaAudience.personnelRecords,saveState:()=>true,resolveActor:id=>({actorId:id,alive:true,position:officials.find(r=>r.actorId===id).office})});assert.equal(source.loadError,null);
 let careers,work;prior.formalCareers.skills.writing=4;
 const owner=prior.formalCareers.officialCareer.appointments.at(-1).id;
 careers=core.createFormalCareers({saved:prior.formalCareers,worldSeed:prior.appearance.seed,enablePersonnelProgression:true,getClock:()=>clock,resolvePromotionActor:actors,
 readPersonnelWork:q=>work?.snapshot().cases.findLast(j=>j.mode===q.mode&&(q.day===undefined||j.day===q.day)&&j.status==='signed')||null,
 saveState:s=>{prior.formalCareers=copy(s);return true;},creditWageToBank:r=>bank.creditWageToBank(r)});assert.equal(careers.state().loadError,null);
 let app=careers.promotionSummary().application;
 if(app.status==='pending')assert(careers.reviewPromotion({applicationId:app.id,step:'appointment',proof:{applicationId:app.id,documentId:'appointment:'+app.id,actorId:'player',targetId:'cn-court-career-desk',position:[20.55,.215,32.25],standing:true,clear:true,elapsed:3,duration:3,day:7,completedAt:clock.seconds}}).ok);
 assert.equal(careers.currentRole().rankId,'cn-records-personnel');
 work=workModule.createChinaPersonnelWork({saved:world.controllers.chinaPersonnelCareer.work,sourceFor:(d,n)=>source.sourceFor(d,n),readAppointment:()=>({actorId:'player',tenureId:owner,rankId:careers.currentRole().rankId}),validateEligibility:q=>q.officialTenureId===owner,resolveActor:actors,saveState:()=>true});assert.equal(work.loadError,null);
 for(let day=8;day<=13;day++){
  Object.assign(clock,{day,hour:10,seconds:calendar(day,10)});assert(careers.observeDay().ok);assert(careers.beginDuty().ok);clock.hour=11.5;assert(careers.dutyEvent('court-start').ok);clock.hour=12;assert(careers.dutyEvent('court-completed').ok);
  assert(source.witnessCourt({id:`cn-morning-audience:${day}`,day,actorIds:officials.map(r=>r.actorId)}).ok);
  for(const row of officials.slice(0,2))assert(source.witnessArchive({id:`cn-official-archive:${row.actorId}:${day}`,actorId:row.actorId,day,audienceId:`cn-morning-audience:${day}`,position:row.office,elapsed:8,duration:8}).ok);
  assert(work.claim({day,mode:'duty',officialTenureId:owner}).ok);const id=work.current().id;
  const proof=(targetId,position,duration,extra={})=>({caseId:id,actorId:'player',targetId,position,standing:true,clear:true,elapsed:duration,duration,...extra});
  for(const row of officials){assert(work.visit({caseId:id,actorId:row.actorId,proof:proof(row.actorId,row.office,3)}).ok);assert(work.record({caseId:id,actorId:row.actorId,archiveStatus:source.sourceFor(day).archives.some(r=>r.actorId===row.actorId)?'accepted':'awaiting'}).ok);}
  assert(work.compile({caseId:id,proof:proof('cn-court-career-desk',workModule.CHINA_PERSONNEL_COMPILE_POINT,8,{revision:work.current().revision})}).ok);
  const lu=actors(LU);assert(work.review({caseId:id,proof:proof(LU,[lu.position[0]+.7,lu.position[1],lu.position[2]],4,{revision:work.current().revision,recipientPosition:lu.position,recipientBodyId:lu.bodyId,recipientAlive:true})}).ok);
  assert(careers.dutyEvent('archive-completed',{proof:{actorId:'player',targetId:'cn-court-career-desk',position:[21.5,.215,32.25],standing:true,clear:true,elapsed:8,duration:8}}).ok);assert(careers.settle().ok);
 }
 clock.hour=14;clock.seconds=calendar(13,14);prior.simulationClock={version:1,seconds:clock.seconds};prior.copperLedger=copy(bank.state());
 const audience=world.controllers.chinaAudience;audience.personnelRecords=source.snapshot();audience.schedule={...audience.schedule,day:13,calledDay:13,outcome:'completed',lastCompletedDay:13,calledAt:null,leadSeconds:null,exception:null,completionId:'cn-morning-audience:13'};
 prior.chinaAudience={...prior.chinaAudience,...copy(audience.schedule),personnelRecords:copy(audience.personnelRecords)};
 const runtime={version:1,work:work.snapshot(),activity:null};prior.chinaPersonnelCareer=copy(runtime);world.controllers.chinaPersonnelCareer=runtime;
 const appointment={version:1,applicationId:app.id,activity:null};prior.chinaPersonnelAppointment=copy(appointment);world.controllers.chinaPersonnelAppointment=appointment;
 world.controllers.chinaCareer={...world.controllers.chinaCareer,duty:careers.workState().lastDuty,activity:null,progress:0,pending:false,waiting:null};
 world.activity={target:null,pending:null,performing:null,actionTime:0,studyTicket:null,destination:null,seated:null,seatedBerthId:null,bathTransition:null};
 assert.equal(careers.promotionSummary().qualifiedDays,6);assert(careers.promotionAvailability().ok);
 return {save:prior,staging:'Actual previous route checkpoint; explicit core-generated six from-eight duties days8–13, original source reads/manual records/signatures/archive/bank receipts, writing4 and calendar13 14:00 staged. No higher-grade application, NPC movement, reception, emperor approval or declaration staged.'};
};
