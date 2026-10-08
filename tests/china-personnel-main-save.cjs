// Actual main callbacks, ordinary save and independent cold-process recovery.
// Every invocation is ONE phase/scene; run SERIAL with the shared flock and
// guard-process-tree.py (180s/1152MiB, NODE_OPTIONS=--max-old-space-size=768).
// Phases: promotion-reject -> promotion-restore -> duty-attend; then separate
// duty-unsigned and duty-payout -> duty-restore. Payroll rosters are explicitly
// staged through real cores, reusing existing shared full-six route evidence.
// Legacy branches invoke main's unchanged clock/settlement callback WITHOUT a
// lot; they do not claim natural globe ticking or offline salary.
// Prerequisite: actual personnel-main 09-imperial-approved or 10-appointed save.
// PERSONNEL_SAVE_FROM overrides the phase input. Outputs never overwrite the
// first route's checkpoints. No auto-spawn and no shared-six route rerun.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const phase = process.env.PERSONNEL_SAVE_PHASE || process.argv[2] || 'promotion-reject';
if (!['promotion-reject', 'promotion-restore', 'duty-attend', 'duty-unsigned', 'duty-payout', 'duty-restore', 'legacy-ready', 'legacy-pending'].includes(phase)) throw Error('Unknown personnel save phase: ' + phase);
let harness = fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8');
function once(a, b) {
  if (!harness.includes(a) || harness.indexOf(a) !== harness.lastIndexOf(a)) throw Error('Changed fixture seam: ' + a);
  harness = harness.replace(a, b);
}
const seams = `
export function personnelSaveReview(){return {saved,player,npcs,lot,furniture,formalCareers,copperLedger,chinaAudience,chinaCareer,chinaPersonnelCareer,chinaPersonnelAppointment,chinaPalace,npcSocial,careerHandbook,simulationClock,path,targetStation,pendingInteraction};}
export function personnelSaveStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);updateCamera(dt);}
export {requestStationIntent,save,advanceWorldClock};
`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", 'new vm.SourceTextModule(readProduction(file),');
once('const cache=new Map();', `const cache=new Map();function readProduction(file){let source=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){const gate='const CHINA_PERSONNEL_TRIAL_ENABLED=false;';assert.equal(source.split(gate).length,2,'Exact unpublished test-only activation seam');source=source.replace(gate,'const CHINA_PERSONNEL_TRIAL_ENABLED=true;')+${JSON.stringify(seams)};}return source;}`);
once('let context=vm.createContext(', `const phase=${JSON.stringify(phase)};let writeMode='accept',rejectedWrites=0,decisionCommits=0,rejectedCandidate=null,rejectedOldRoot=null;let context=vm.createContext(`);
once('vm.createContext({console,', 'vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');", "const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode),'Ordinary cold saves may enter China directly');");
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}', String.raw`localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{
 if(k==='worlds-days-v1'){
  const candidate=JSON.parse(v),row=candidate.formalCareers?.officialCareer?.applications?.findLast(a=>a.routeVersion===2);
  if(writeMode==='reject-declaration'&&row?.status==='approved'){
   rejectedWrites++;rejectedCandidate=candidate;rejectedOldRoot=storage[k];return false;
  }
  const previous=JSON.parse(storage[k]||'{}').formalCareers?.officialCareer?.applications?.findLast(a=>a.routeVersion===2);
  if(row?.status==='approved'&&previous?.id===row.id&&previous.status==='pending')decisionCommits++;
 }
 storage[k]=v;return true;
}}`);
once("const main=mod(path.join(root,'game/main.js'));", String.raw`
const clone=value=>JSON.parse(JSON.stringify(value)),out=path.resolve('qa/personnel-main-save');fs.mkdirSync(out,{recursive:true});
const file=name=>path.join(out,name+'.json');
let staging='Actual checkpoint reused unchanged.',fixtureEvidence=null;
const inputs={'promotion-reject':'qa/personnel-main/09-imperial-approved.json','promotion-restore':file('promotion-rejected'),
 'duty-attend':fs.existsSync(file('promotion-restored'))?file('promotion-restored'):'qa/personnel-main/10-appointed.json',
 'duty-unsigned':file('duty-attended'),'duty-payout':file('duty-attended'),'duty-restore':file('duty-paid')};
let input=process.env.PERSONNEL_SAVE_FROM||inputs[phase],prior;
if(phase.startsWith('legacy-'))prior=JSON.parse(storage['worlds-days-v1']);
else if(phase==='promotion-reject'&&!process.env.PERSONNEL_SAVE_FROM&&!fs.existsSync(input)){
 input=path.resolve('tests/fixtures/personnel-main-checkpoint.json');const bundled=JSON.parse(fs.readFileSync(input,'utf8'));
 assert.equal(bundled.version,1);assert.equal(bundled.provenance.resumeBoundary.completedThrough,'09-imperial-approved');
 prior=bundled.save;staging='Reuse committed actual09 imperial-approved checkpoint unchanged. '+bundled.provenance.staging;
}else{assert(input&&fs.existsSync(input),'Missing actual prerequisite checkpoint for '+phase+': '+input);prior=JSON.parse(fs.readFileSync(input,'utf8'));}
if(['duty-attend','duty-unsigned','duty-payout','legacy-ready','legacy-pending'].includes(phase)){
 const staged=await require(path.resolve('tests/fixtures/personnel-main-storage.cjs'))({phase,prior,mod,linker,root,assert});prior=staged.save;staging=staged.staging;fixtureEvidence=clone(staged.evidence||null);
}
storage['worlds-days-v1']=JSON.stringify(prior);const inputSave=clone(prior);
const main=mod(path.join(root,'game/main.js'));
`);
const begin = harness.indexOf('const report=[];for(let round=0;');
if (begin < 0) throw Error('Missing bounded harness body');
harness = harness.slice(0, begin) + String.raw`
const started=Date.now()-process.uptime()*1000,review=()=>main.namespace.personnelSaveReview(),legacy=phase.startsWith('legacy-');let steps=0,leg='boot';
if(!legacy&&state().mode==='globe'){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=review(),career=r.formalCareers,appointment=r.chinaPersonnelAppointment;
if(legacy){assert.equal(state().mode,'globe');assert.equal(r.npcs.length,0);assert.equal(r.chinaCareer,null);}
else{assert.equal(state().region,'china');assert.equal(r.npcs.length,31);assert.equal(r.chinaPersonnelCareer.state().loadError,null);assert.equal(appointment.state().loadError,null);}
assert.equal(career.state().loadError,null);assert.equal(r.copperLedger.loadError,null);
for(const key of ['skills','skillXP','tenure'])assert.deepEqual(clone(career.state()[key]),inputSave.formalCareers[key],'Cold boot retains original '+key);
assert.deepEqual(clone(career.state().officialCareer.appointments),inputSave.formalCareers.officialCareer.appointments,'Cold boot cannot duplicate appointment/occupancy');
assert.equal(career.slotHolder('cn-court-clerk'),'player');
const app=()=>career.promotionSummary().application,job=()=>r.chinaPersonnelCareer.state().case,duty=()=>career.state().lastDuty;
const idsBefore=r.npcs.map(n=>n.station.id),actorsBefore=r.npcs.slice(),skillsBefore=clone(career.state().skills),xpBefore=clone(career.state().skillXP),tenureBefore=clone(career.state().tenure);
const oldWages=inputSave.copperLedger.transactions.filter(t=>t.action==='wage');
const wages=()=>clone(r.copperLedger.history().filter(t=>t.action==='wage'));
const occupation=()=>clone({tenure:career.state().tenure,holder:career.slotHolder('cn-court-clerk'),appointments:career.state().officialCareer.appointments});
const occupationBefore=occupation();
const invariants=()=>{
 assert.deepEqual(r.npcs.map(n=>n.station.id),idsBefore);assert(r.npcs.every((n,i)=>n===actorsBefore[i]));
 assert.deepEqual(occupation(),occupationBefore,'No duplicate appointment or vacancy');
 assert.deepEqual(clone(career.state().skills),skillsBefore);assert.deepEqual(clone(career.state().skillXP),xpBefore,'No duplicate XP');
 assert.deepEqual(wages().slice(0,oldWages.length),oldWages,'Old bank amounts and receipt IDs stay immutable');
};
const diagnostic=()=>({phase,leg,steps,seconds:(Date.now()-started)/1000,clock:r.simulationClock.state(),player:state().player,
 pathLength:state().pathLength,appointment:appointment?.state(),roster:r.chinaPersonnelCareer?.state(),career:career.workState(),
 pending:review().pendingInteraction,meeting:r.npcSocial?.meetingState(),toast:ids.toast.textContent});
// No globe RAF simulation: the scene-free legacy branch deliberately invokes
// the original main callback that contains its existing five-second settlement.
const step=(count=1)=>{for(let i=0;i<count;i++){now+=100;if(legacy)main.namespace.advanceWorldClock(.1);else main.namespace.personnelSaveStep(.1);steps++;}};
const until=(predicate,label,limit=1800)=>{leg=label;for(let i=0;i<limit&&!predicate();i++)step();assert(predicate(),label+' '+JSON.stringify(diagnostic()));};
const request=kind=>{
 r.careerHandbook.close();const service=kind.startsWith('personnel-promotion-')?appointment:kind.startsWith('personnel-')?r.chinaPersonnelCareer:r.chinaCareer;
 const intent=service.intent(kind);assert(intent,kind+' unavailable '+JSON.stringify(diagnostic()));assert(main.namespace.requestStationIntent(intent),kind+' request failed');
};
const write=name=>{assert(main.namespace.save(),'Actual ordinary main save');fs.writeFileSync(file(name),storage['worlds-days-v1']);return JSON.parse(storage['worlds-days-v1']);};
const report=extra=>console.log(JSON.stringify({status:'PASS',phase,staging,fixtureEvidence,steps,seconds:(Date.now()-started)/1000,
 scope:legacy?'Actual production main settlement/persistence callback invoked without a China scene; not natural globe ticking or offline income':
 'Actual main and original31 actors/shared navigation; payroll roster staging explicitly labeled; simulated DOM/renderer, not browser/iOS or natural multi-day gameplay',...extra}));
try{
 if(phase==='promotion-reject'){
  assert.equal(app().stage,'imperial-approved');assert.equal(career.currentRole().rankId,'cn-records-regular');
  assert.equal(app().imperialDecision.proof.elapsed,4);const original=clone(app()),bank=clone(r.saved.copperLedger);
  request('personnel-promotion-appointment');until(()=>appointment.state().activity==='appointment'&&appointment.state().progress>=2.9/3-1e-8,'Real registry arrival and2.9s declaration');
  assert.equal(app().stage,'imperial-approved');assert.equal(career.currentRole().rankId,'cn-records-regular');
  write('promotion-before-refusal');const rootBefore=storage['worlds-days-v1'],formalBefore=clone(r.saved.formalCareers),worldBefore=clone(r.saved.worldContinuity),worldRef=r.saved.worldContinuity;
  writeMode='reject-declaration';
  // Isolate the last ordinary controller tick so unrelated NPC callbacks cannot
  // overwrite the old world between refusal and rollback assertions. This is
  // the original adapter attached to actual main and its real formal callback.
  appointment.update(.1);
  assert.equal(rejectedWrites,1);assert.equal(storage['worlds-days-v1'],rootBefore);assert.equal(rejectedOldRoot,rootBefore);
  assert.deepEqual(clone(r.saved.formalCareers),formalBefore);assert.equal(r.saved.worldContinuity,worldRef);assert.deepEqual(clone(r.saved.worldContinuity),worldBefore);
  assert.equal(career.currentRole().rankId,'cn-records-regular');assert.deepEqual(clone(app()),original);assert.deepEqual(clone(r.saved.copperLedger),bank);
  const retained=clone(appointment.snapshot());assert.equal(retained.activity.progress,3);assert.equal(retained.activity.proof.elapsed,3);assert.equal(retained.activity.proof.duration,3);
  assert.deepEqual(rejectedCandidate.formalCareers.officialCareer.applications.at(-1).declaration.proof,retained.activity.proof);
  const durable=write('promotion-rejected');assert.deepEqual(durable.formalCareers,formalBefore);
  assert.deepEqual(durable.worldContinuity.regions.china.controllers.chinaPersonnelAppointment,retained,'Ordinary save retains completed same-case proof');
  assert.equal(rejectedWrites,1,'Ordinary old-core save is accepted');invariants();report({rejectedWrites,applicationId:original.id,retainedProof:retained.activity.proof,checkpoint:file('promotion-rejected')});return;
 }
 if(phase==='promotion-restore'){
  const old=inputSave.formalCareers.officialCareer.applications.at(-1),proof=inputSave.worldContinuity.regions.china.controllers.chinaPersonnelAppointment.activity.proof;
  assert.equal(app().id,old.id);assert.equal(app().stage,'imperial-approved');assert.deepEqual(clone(appointment.snapshot().activity.proof),proof);
  assert.deepEqual(wages(),oldWages,'Cold reload grants no wage');
  r.careerHandbook.close();until(()=>app().status==='approved','Cold same-case completed declaration retry',30);
  assert.equal(career.currentRole().rankId,'cn-records-personnel');assert.equal(career.currentRole().gradeLabel,'从八品');assert.equal(career.currentRole().wage,26);
  assert.deepEqual(clone(app().declaration.proof),proof);assert.equal(app().roll,old.roll);assert.deepEqual(clone(app().imperialDecision),old.imperialDecision);
  assert.equal(career.state().officialCareer.applications.length,inputSave.formalCareers.officialCareer.applications.length);assert.equal(decisionCommits,1);
  assert.deepEqual(clone(duty()),inputSave.formalCareers.lastDuty);assert.deepEqual(wages(),oldWages);assert.equal(appointment.intent('personnel-promotion-appointment'),null);
  const replay=career.reviewPromotion({applicationId:old.id,step:'appointment',proof});assert(replay.ok&&replay.replayed);assert.equal(decisionCommits,1);
  invariants();write('promotion-restored');report({applicationId:old.id,roll:old.roll,decisionCommits,proof,checkpoint:file('promotion-restored')});return;
 }
 if(phase==='duty-attend'){
  assert.equal(career.currentRole().rankId,'cn-records-personnel');assert.equal(r.simulationClock.state().day,8);assert.deepEqual(wages(),oldWages,'Later-day cold boot grants no offline wage');
  request('attend');until(()=>duty()?.day===8&&duty().stage==='arrived','Real main day8 attendance and new contract');
  const contract=duty().officialPayContract;assert.equal(duty().officialPayVersion,2);assert.equal(contract.basePay,26);assert.equal(contract.preparationBonus,2);assert.equal(duty().wage,null);
  assert.equal(duty().personnelWork,null);assert.equal(duty().personnelArchiveProof,null);assert(duty().arrivalHour<=11.5-5/60);assert.deepEqual(wages(),oldWages);
  invariants();write('duty-attended');report({contract,arrivalHour:duty().arrivalHour,checkpoint:file('duty-attended')});return;
 }
 if(['duty-unsigned','duty-payout'].includes(phase)){
  const baseline={bank:clone(r.saved.copperLedger),service:clone(career.state().officialCareer.service),application:clone(app())};
  assert.equal(career.currentRole().rankId,'cn-records-personnel');assert.equal(duty().stage,'archive');assert.equal(duty().officialPayContract.basePay,26);assert.equal(duty().officialPayContract.preparationBonus,2);
  assert.equal(job().id,fixtureEvidence.caseId);assert.equal(job().day,8);assert.equal(job().mode,'duty');
  const unpaid=()=>{assert.equal(duty().stage,'archive');assert.deepEqual(wages(),oldWages);assert.deepEqual(clone(r.saved.copperLedger),baseline.bank);assert.deepEqual(clone(career.state().officialCareer.service),baseline.service);assert.deepEqual(clone(app()),baseline.application);};
  const proof={actorId:'player',targetId:'cn-court-career-desk',position:[21.5,.215,32.25],standing:true,clear:true,elapsed:8,duration:8};
  if(phase==='duty-unsigned'){
   assert.equal(job().status,'draft');assert(job().compiled);assert.equal(job().receipt,null);assert.equal(career.archiveAvailability().code,'personnel-duty-required');
   assert.equal(r.chinaCareer.intent('archive'),null);assert.equal(career.dutyEvent('archive-completed',{proof}).code,'personnel-duty-required');
   assert.equal(career.settle().code,'work-incomplete');step(12);unpaid();invariants();write('duty-unsigned-blocked');
   report({caseId:job().id,unsignedNoWage:true,coreRefusals:fixtureEvidence});return;
  }
  assert.equal(job().status,'signed');assert(career.archiveAvailability().ok);assert.equal(duty().personnelArchiveProof,null);
  for(const invalid of [{...proof,elapsed:7.9},{...proof,actorId:'cn-official-records'}]){
   assert.equal(career.dutyEvent('archive-completed',{proof:invalid}).code,'invalid-personnel-archive-proof');unpaid();
  }
  const signed=clone(job());request('archive');until(()=>r.chinaCareer.state().activity==='archive'&&r.chinaCareer.state().progress>=7.9/8-1e-8,'Real own archive7.9s');
  unpaid();until(()=>duty().stage==='paid','Actual own archive8s and main bank payout',15);
  assert.equal(duty().wage,28);assert.equal(duty().personnelArchiveProof.elapsed,8);assert.deepEqual(clone(duty().personnelWork),signed);
  const receipt=wages().filter(row=>row.requestId==='career:cn-court-clerk-1:8');assert.equal(receipt.length,1);assert.equal(receipt[0].amount,28);
  assert.equal(wages().length,oldWages.length+1);assert.equal(r.saved.copperLedger.balances.copper.bank,baseline.bank.balances.copper.bank+28);
  assert.equal(career.state().officialCareer.service.length,baseline.service.length+1);assert.equal(career.state().officialCareer.service.at(-1).wage,28);
  const paidBank=clone(r.saved.copperLedger);assert.equal(career.settle().ok,false);step(12);assert.deepEqual(clone(r.saved.copperLedger),paidBank);
  invariants();write('duty-paid');report({contract:duty().officialPayContract,wage:duty().wage,caseId:signed.id,receipt:receipt[0],checkpoint:file('duty-paid')});return;
 }
 if(phase==='duty-restore'){
  assert.equal(duty().stage,'paid');assert.equal(duty().wage,28);assert.deepEqual(clone(duty()),inputSave.formalCareers.lastDuty);
  assert.deepEqual(wages(),oldWages);const service=clone(career.state().officialCareer.service),bank=clone(r.saved.copperLedger);
  step(12);assert.deepEqual(wages(),oldWages);assert.deepEqual(clone(r.saved.copperLedger),bank);assert.deepEqual(clone(career.state().officialCareer.service),service);
  assert.equal(career.settle().ok,false);assert.equal(r.chinaCareer.intent('archive'),null);assert.equal(r.chinaPersonnelCareer.intent('personnel-claim'),null);invariants();write('duty-cold-restored');
  report({wage:28,receiptId:'career:cn-court-clerk-1:8',noExtraWageOrXP:true,checkpoint:file('duty-cold-restored')});return;
 }
 // Later-day boot must settle this exact legacy contract only. Both variants
 // contain an immutable old22 paid receipt and a ready22 day5 work contract.
 assert.equal(career.currentRole().rankId,'cn-records-regular');assert.equal(duty().wage,22);assert.equal(duty().day,5);assert.equal(duty().stage,'ready');
 const paid4=wages().find(row=>row.requestId==='career:cn-court-clerk-1:4');assert.equal(paid4.amount,22);
 const pendingBefore=wages().find(row=>row.requestId==='career:cn-court-clerk-1:5');assert.equal(!!pendingBefore,phase==='legacy-pending');
 const service=clone(career.state().officialCareer.service),oldContract=clone(duty());
 r.careerHandbook.close();until(()=>duty().stage==='paid','Cold main settles exact old22 contract',60);
 const paid5=wages().filter(row=>row.requestId==='career:cn-court-clerk-1:5');assert.equal(paid5.length,1);assert.equal(paid5[0].amount,22);
 if(pendingBefore)assert.deepEqual(paid5[0],pendingBefore,'Bank-committed cleanup keeps the original receipt ID');
 assert.equal(wages().length,oldWages.length+(pendingBefore?0:1));assert.equal(wages().filter(row=>row.day>5).length,0,'No offline salary for skipped days');
 assert.deepEqual(clone(duty()),{...oldContract,stage:'paid'});assert.deepEqual(clone(career.state().officialCareer.service),service);
 const settled=clone(r.saved.copperLedger);step(12);assert.deepEqual(clone(r.saved.copperLedger),settled);assert.equal(career.settle().ok,false);
 invariants();write(phase+'-restored');report({wage:22,receiptId:paid5[0].requestId,transactionId:paid5[0].id,oldReceipt:paid4.id,bankReplay:!!pendingBefore,noOfflineWages:true});
}catch(error){try{fs.writeFileSync(file(phase+'-failure'),JSON.stringify(diagnostic(),null,2));}catch{}throw error;}
})().catch(e=>{console.error(e);process.exit(1)});
`;
const script = new vm.Script(harness, {filename:'tests/china-personnel-main-save-inherited.cjs', importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER});
if (process.env.PERSONNEL_SAVE_SYNTAX === '1') console.log('PASS personnel save generated harness parsed; no main module or scene executed');
else script.runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
