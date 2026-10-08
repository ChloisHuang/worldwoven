import assert from 'node:assert/strict';
import {createCourtReports,edictReportSource,formatCourtEdictText} from '../source/game/china-court-reports.js';
const clone=value=>JSON.parse(JSON.stringify(value));
const proof=()=>({reporterId:'cn-minister-works',recipientId:'cn-emperor',reportSeconds:6,responseSeconds:4});
const acknowledge=(reports,report)=>assert.equal(reports.acknowledgeReport(report.resultReport,proof()).ok,true);
let source=null,saved;
const reports=createCourtReports({readEdict:()=>source,saveState:s=>saved=s});
assert.equal(reports.report('works',0).sourceEventId,null);
assert.equal(edictReportSource({ledger:{lastDay:0,lastReceipt:'wrong',outcome:'completed'}}),null);
source={ledger:{lastDay:0,lastReceipt:'cn-morning-audience:0',outcome:'active',completedReceipt:null},order:{id:'cn-edict-east-shore:0',stage:'to-recipient'},props:{workProgress:0}};
const active=reports.report('works',1);assert.equal(active.sourceEventId,'cn-edict-east-shore:0:active');assert.equal(active.action,'defer');assert.match(active.text,/送达途中/);
assert(!reports.decide(active.issueId,'defer','cn-minister-works'),'official cannot impersonate emperor');assert(reports.decide(active.issueId,'defer'));assert(!reports.decide(active.issueId,'approve'),'repeated response does not create another job');assert.equal(reports.inspection(),null,'active command is allowed to finish its real work');
source.ledger.outcome='completed';source.ledger.completedReceipt='cn-morning-audience:0';source.props.workProgress=1;source.order.stage='returning';
const job=reports.inspection();assert.equal(job.id,active.issueId);assert.equal(job.place,'荷庭东岸');
assert(!reports.inspected(job.id,{actorId:'cn-minister-works',position:[18,.215,32],place:job.place}),'speech alone cannot finish a physical inspection');
assert(reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point,place:job.place}));assert(!reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point,place:job.place}),'one physical result only');
const result=reports.report('works',2);assert.equal(result.sourceEventId,'cn-edict-east-shore:0:completed');assert.match(result.text,/亲到荷庭东岸/);assert.equal(reports.inspection(),null);assert.equal(reports.state().cases[0].result.reportedDay,undefined);acknowledge(reports,result);
// A new completed command creates an east-shore check. The actual rendered
// work must be complete before that location can produce a verified result.
source={ledger:{lastDay:1,lastReceipt:'cn-morning-audience:1',outcome:'completed',completedReceipt:'cn-morning-audience:1'},order:null,props:{workProgress:.5}};
const completed=reports.report('works',3);assert.equal(completed.action,'approve');reports.decide(completed.issueId,'approve');const east=reports.inspection();assert.equal(east.place,'荷庭东岸');assert(!reports.inspected(east.id,{actorId:'cn-minister-works',position:east.point,place:east.place}));source.props.workProgress=1;assert(reports.inspected(east.id,{actorId:'cn-minister-works',position:east.point,place:east.place}));
const restored=createCourtReports({readEdict:()=>source,saved});assert.equal(restored.inspection(),null);const restoredReport=restored.report('works',4);assert.match(restoredReport.text,/落叶入筐相符/);acknowledge(restored,restoredReport);
source={ledger:{lastDay:2,lastReceipt:'cn-morning-audience:2',outcome:'interrupted',completedReceipt:'cn-morning-audience:1'},order:null,props:{workProgress:0}};
const interrupted=restored.report('works',5);assert.equal(interrupted.action,'inquire');assert.match(interrupted.text,/未有办结回执/);assert(restored.decide(interrupted.issueId,'inquire'));assert.match(restored.report('granary',5).text,/1件奉准核验未回报/);
assert.match(interrupted.text,/第3日《荷庭东岸清扫令》/);assert(!interrupted.text.includes('cn-edict'));assert.match(interrupted.response,/补办/);
const inquiry=restored.inspection();assert(!inquiry.label.includes('cn-edict'));assert(restored.inspected(inquiry.id,{actorId:'cn-minister-works',position:inquiry.point}));
// An old completed inquiry only recorded the interruption. Restore its prior
// instruction as a real visit; do not fabricate a success receipt or remote fix.
let reissues=0;const legacy=createCourtReports({readEdict:()=>source,saved:restored.snapshot(),reissueEdict:id=>{assert.equal(id,'cn-edict-east-shore:2');reissues++;source.ledger.outcome='active';source.order={id,stage:'drafting'};return true;}});
assert.equal(reissues,0);assert(legacy.hasPending());const revisit=legacy.inspection();assert.equal(revisit.place,'传令案');assert(legacy.inspected(revisit.id,{actorId:'cn-minister-works',position:revisit.point}));assert.equal(reissues,1);assert.equal(source.ledger.completedReceipt,'cn-morning-audience:1');const pending=legacy.report('works',6);assert.match(pending.text,/补办，现正拟稿/);
assert.equal(pending.action,'defer');assert(legacy.decide(pending.issueId,'defer'));acknowledge(legacy,pending);source.ledger.outcome='completed';source.ledger.completedReceipt=source.ledger.lastReceipt;source.props.workProgress=1;const verified=legacy.inspection();assert.equal(verified.place,'荷庭东岸');assert(legacy.inspected(verified.id,{actorId:'cn-minister-works',position:verified.point}));assert.match(legacy.report('works',7).text,/回执与现场落叶入筐相符/);
// If repair finishes before the next report, that report itself must request
// east-shore inspection instead of allowing the next daily order to erase it.
const awaiting=restored.snapshot();awaiting.cases.at(-1).result.recoveryRequested=true;awaiting.cases.at(-1).result.reportedDay=undefined;
const quick=createCourtReports({readEdict:()=>source,saved:awaiting}),ready=quick.report('works',8);assert.equal(ready.action,'approve');assert(quick.decide(ready.issueId,'approve'));assert.equal(quick.inspection().place,'荷庭东岸');
assert.equal(formatCourtEdictText('奉旨核验cn-edict-east-shore:0 · 到传令案核对'),'奉旨核验第1日《荷庭东岸清扫令》 · 到传令案核对');
// Regression: merely preparing speech used to consume the inspection result.
// This fixture goes through the real approval and physical inspection core.
const completedSource=day=>({ledger:{lastDay:day,lastReceipt:`cn-morning-audience:${day}`,outcome:'completed',completedReceipt:`cn-morning-audience:${day}`},order:null,props:{workProgress:1}});
function pendingResult(day=10){
 const source=completedSource(day),reports=createCourtReports({readEdict:()=>source}),request=reports.report('works',day);
 assert(reports.decide(request.issueId,request.action));const job=reports.inspection();
 assert(reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point}));return reports.snapshot();
}
const pendingSave=pendingResult();let writes=0,lastCandidate;
const receipts=createCourtReports({readEdict:()=>completedSource(11),saved:pendingSave,saveState:candidate=>{writes++;lastCandidate=clone(candidate);}});
const prepared=receipts.report('works',12),ref=prepared.resultReport;
assert.deepEqual(ref,{caseId:'court-issue-1',inspectionId:'court-inspection:court-issue-1',sourceEventId:'cn-edict-east-shore:10:completed',reporterId:'cn-minister-works',day:12});
assert(Object.isFrozen(ref));assert.deepEqual(receipts.report('works',12).resultReport,ref);
assert.equal(writes,0,'preparing the same result repeatedly does not save or consume it');
assert.deepEqual(receipts.state(),pendingSave,'a newer numbered edict cannot replace the unreported inspection source');
assert.equal(receipts.report('granary',12).resultReport,undefined,'another official cannot prepare Gu’s result receipt');
for(const mutate of [p=>delete p.reporterId,p=>p.reporterId='cn-minister-granary',p=>p.recipientId='cn-minister-works',p=>p.reportSeconds=5.999,p=>p.responseSeconds=3.999,p=>p.reportSeconds='6',p=>p.responseSeconds=Infinity,p=>p.reportSeconds=7]){
 const bad=proof();mutate(bad);assert.equal(receipts.acknowledgeReport(ref,bad).ok,false);
}
for(const mutate of [r=>r.caseId='court-issue-2',r=>r.inspectionId='court-inspection:other',r=>r.sourceEventId='cn-edict-east-shore:11:completed',r=>r.reporterId='cn-emperor',r=>r.day=13,r=>r.day=-1,r=>r.day='12']){
 const bad={...ref};mutate(bad);assert.equal(receipts.acknowledgeReport(bad,proof()).ok,false);
}
assert.equal(receipts.acknowledgeReport(ref).ok,false);assert.equal(writes,0);
assert.deepEqual(receipts.acknowledgeReport(ref,proof()),{ok:true,replayed:false});assert.equal(writes,1);
const received=receipts.state().cases[0].result.received;
assert.deepEqual(received,{version:1,...ref,recipientId:'cn-emperor',reportSeconds:6,responseSeconds:4});
assert.equal(receipts.state().cases[0].result.reportedDay,12);assert.deepEqual(lastCandidate,receipts.snapshot());
assert.deepEqual(receipts.acknowledgeReport({...ref},proof()),{ok:true,replayed:true});assert.equal(writes,1,'an exact replay performs no second write');
assert.equal(receipts.acknowledgeReport({...ref,day:13},proof()).ok,false);
assert.equal(receipts.acknowledgeReport(ref,{...proof(),responseSeconds:5}).ok,false,'elapsed time cannot increase an existing receipt');
const leaked=receipts.snapshot();leaked.cases[0].result.received.recipientId='other';assert.deepEqual(receipts.state().cases[0].result.received,received);
const receiptReload=createCourtReports({saved:receipts.snapshot(),saveState:()=>assert.fail('replay must not save')});
assert(receiptReload.restoreReport(ref));assert.deepEqual(receiptReload.acknowledgeReport(ref,proof()),{ok:true,replayed:true});

// Runtime restoration binds precisely the saved report, without reselecting a
// newer source or turning a saved header into proof of completed speaking.
const unbound=createCourtReports({saved:pendingSave});assert.equal(unbound.acknowledgeReport(ref,proof()).code,'report-not-prepared');
assert.equal(unbound.restoreReport({...ref,sourceEventId:'wrong'}),false);assert.equal(unbound.restoreReport(ref),true);
assert.deepEqual(unbound.state(),pendingSave);acknowledge(unbound,{resultReport:ref});
const resumed=createCourtReports({saved:pendingSave,savedReport:ref});acknowledge(resumed,{resultReport:ref});
const twoPending=clone(pendingSave),second=clone(twoPending.cases[0]);
second.id='court-issue-2';second.result.id='court-inspection:court-issue-2';twoPending.cases.push(second);twoPending.sequence=2;
const secondRef={...ref,caseId:second.id,inspectionId:second.result.id},multiple=createCourtReports({saved:twoPending,savedReport:secondRef});
acknowledge(multiple,{resultReport:secondRef});assert.equal(multiple.state().cases[0].result.reportedDay,undefined);assert.equal(multiple.state().cases[1].result.reportedDay,12);
const refreshed=createCourtReports({saved:pendingSave});refreshed.report('works',12);const nextDay=refreshed.report('works',13);
assert.equal(refreshed.acknowledgeReport(ref,proof()).ok,false,'an older prepared day cannot acknowledge a newer report');acknowledge(refreshed,nextDay);

// Failed or unsupported persistence must leave the physical result pending.
// While writing, all observers see the old state and mutating reentry is held.
for(const mode of ['false','object','throw','resolved-promise','rejected-promise','reentry','mutation']){
 let modeActive=true,attempts=0,controller;
 controller=createCourtReports({saved:pendingSave,saveState:candidate=>{
  attempts++;assert.equal(candidate.cases[0].result.received.inspectionId,ref.inspectionId);
  assert.deepEqual(controller.snapshot(),pendingSave,'the candidate is not exposed before persistence succeeds');
  assert.deepEqual(controller.state(),pendingSave);
  assert.equal(controller.acknowledgeReport(ref,proof()).code,'busy');
  assert.equal(controller.restoreReport(ref),false);assert.equal(controller.report('works',12).code,'busy');
  assert.equal(controller.decide('court-issue-1','approve'),false);assert.equal(controller.inspection(),null);
  assert.equal(controller.inspected('court-issue-1',{actorId:'cn-minister-works',position:[0,0,0]}),false);
  if(!modeActive)return;
  if(mode==='false'||mode==='reentry')return false;if(mode==='object')return {ok:false};if(mode==='throw')throw Error('storage unavailable');
  if(mode==='resolved-promise')return Promise.resolve(true);if(mode==='rejected-promise')return Promise.reject(Error('storage unavailable'));
  candidate.cases[0].result.received.day=99;
 }});
 assert(controller.restoreReport(ref));assert.equal(controller.acknowledgeReport(ref,proof()).ok,false,mode);assert.equal(attempts,1);
 assert.deepEqual(controller.snapshot(),pendingSave,mode);modeActive=false;
 assert.equal(controller.acknowledgeReport(ref,proof()).ok,true,`${mode}: actual persistence retry can finish`);assert.equal(attempts,2);
 assert.equal(controller.acknowledgeReport(ref,proof()).replayed,true);assert.equal(attempts,2);
}
await Promise.resolve(); // Rejected unsupported save promises are handled.

// New receipts have strict identities, while legacy completed records remain
// unchanged and never acquire fabricated named acknowledgements on reload.
const validSaved=receipts.snapshot();
for(const mutate of [r=>r.received=null,r=>r.received.version=2,r=>r.received.caseId='other',r=>r.received.inspectionId='wrong',r=>r.received.sourceEventId='wrong',r=>r.received.reporterId='cn-minister-granary',r=>r.received.recipientId='other',r=>r.received.reportSeconds=5,r=>r.received.responseSeconds=3,r=>r.received.day=11,r=>delete r.reportedDay,r=>r.actorId='cn-minister-granary',r=>r.id='wrong',r=>r.source.eventId='wrong']){
 const corrupt=clone(validSaved);mutate(corrupt.cases[0].result);const restored=createCourtReports({saved:corrupt}).snapshot();
 assert.equal(restored.cases[0].result.reportedDay,undefined);assert.equal(restored.cases[0].result.received,undefined,'malformed named receipts cannot falsely close a case');
}
const historical=clone(validSaved);delete historical.cases[0].result.received;
const old=createCourtReports({saved:historical});assert.deepEqual(old.snapshot(),historical);assert.equal(old.restoreReport(ref),false);
assert.equal(old.acknowledgeReport(ref,proof()).code,'historical-report');assert.deepEqual(old.snapshot(),historical);

// Repeated preparation of a repair result reuses one follow-up even if its
// actual repaired order changes from active to completed before speaking ends.
let repairSource={ledger:{lastDay:15,lastReceipt:'cn-morning-audience:15',outcome:'interrupted'},order:null,props:{workProgress:0}},repairWrites=0;
const repair=createCourtReports({readEdict:()=>repairSource,saveState:()=>repairWrites++,reissueEdict:id=>{repairSource.ledger.outcome='active';repairSource.order={id,stage:'drafting'};return true;}});
const repairRequest=repair.report('works',15);assert(repair.decide(repairRequest.issueId,repairRequest.action));const repairJob=repair.inspection();
assert(repair.inspected(repairJob.id,{actorId:'cn-minister-works',position:repairJob.point}));
const repairReport=repair.report('works',16),repairCount=repairWrites;assert.equal(repairReport.action,'defer');
for(let i=0;i<3;i++)assert.deepEqual(repair.report('works',16),repairReport);assert.equal(repairWrites,repairCount);assert.equal(repair.state().cases.length,2);
assert(repair.decide(repairReport.issueId,'defer'));repairSource=completedSource(15);
const finishedRepair=repair.report('works',16);assert.equal(finishedRepair.issueId,null,'a deferred follow-up remains the emperor’s existing instruction');
assert.equal(repair.state().cases.length,2);assert.equal(repair.inspection().id,repairReport.issueId);
acknowledge(repair,finishedRepair);assert.equal(repair.state().cases[0].result.received.sourceEventId,'cn-edict-east-shore:15:interrupted');
console.log('PASS: physical inspection source, explicit named report/response receipts, exact identity and day guards, atomic persistence/reentry/retry, restore/replay, historical compatibility, and same-order follow-up reuse');
