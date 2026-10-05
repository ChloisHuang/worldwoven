import assert from 'node:assert/strict';
import {createCourtReports,edictReportSource,formatCourtEdictText} from '../source/game/china-court-reports.js';
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
const result=reports.report('works',2);assert.equal(result.sourceEventId,'cn-edict-east-shore:0:completed');assert.match(result.text,/亲到荷庭东岸/);assert.equal(reports.inspection(),null);
// A new completed command creates an east-shore check. The actual rendered
// work must be complete before that location can produce a verified result.
source={ledger:{lastDay:1,lastReceipt:'cn-morning-audience:1',outcome:'completed',completedReceipt:'cn-morning-audience:1'},order:null,props:{workProgress:.5}};
const completed=reports.report('works',3);assert.equal(completed.action,'approve');reports.decide(completed.issueId,'approve');const east=reports.inspection();assert.equal(east.place,'荷庭东岸');assert(!reports.inspected(east.id,{actorId:'cn-minister-works',position:east.point,place:east.place}));source.props.workProgress=1;assert(reports.inspected(east.id,{actorId:'cn-minister-works',position:east.point,place:east.place}));
const restored=createCourtReports({readEdict:()=>source,saved});assert.equal(restored.inspection(),null);assert.match(restored.report('works',4).text,/落叶入筐相符/);
source={ledger:{lastDay:2,lastReceipt:'cn-morning-audience:2',outcome:'interrupted',completedReceipt:'cn-morning-audience:1'},order:null,props:{workProgress:0}};
const interrupted=restored.report('works',5);assert.equal(interrupted.action,'inquire');assert.match(interrupted.text,/未有办结回执/);assert(restored.decide(interrupted.issueId,'inquire'));assert.match(restored.report('granary',5).text,/1件奉准核验未回报/);
assert.match(interrupted.text,/第3日《荷庭东岸清扫令》/);assert(!interrupted.text.includes('cn-edict'));assert.match(interrupted.response,/补办/);
const inquiry=restored.inspection();assert(!inquiry.label.includes('cn-edict'));assert(restored.inspected(inquiry.id,{actorId:'cn-minister-works',position:inquiry.point}));
// An old completed inquiry only recorded the interruption. Restore its prior
// instruction as a real visit; do not fabricate a success receipt or remote fix.
let reissues=0;const legacy=createCourtReports({readEdict:()=>source,saved:restored.snapshot(),reissueEdict:id=>{assert.equal(id,'cn-edict-east-shore:2');reissues++;source.ledger.outcome='active';source.order={id,stage:'drafting'};return true;}});
assert.equal(reissues,0);assert(legacy.hasPending());const revisit=legacy.inspection();assert.equal(revisit.place,'传令案');assert(legacy.inspected(revisit.id,{actorId:'cn-minister-works',position:revisit.point}));assert.equal(reissues,1);assert.equal(source.ledger.completedReceipt,'cn-morning-audience:1');const pending=legacy.report('works',6);assert.match(pending.text,/补办，现正拟稿/);
assert.equal(pending.action,'defer');assert(legacy.decide(pending.issueId,'defer'));source.ledger.outcome='completed';source.ledger.completedReceipt=source.ledger.lastReceipt;source.props.workProgress=1;const verified=legacy.inspection();assert.equal(verified.place,'荷庭东岸');assert(legacy.inspected(verified.id,{actorId:'cn-minister-works',position:verified.point}));assert.match(legacy.report('works',7).text,/回执与现场落叶入筐相符/);
// If repair finishes before the next report, that report itself must request
// east-shore inspection instead of allowing the next daily order to erase it.
const awaiting=restored.snapshot();awaiting.cases.at(-1).result.recoveryRequested=true;awaiting.cases.at(-1).result.reportedDay=undefined;
const quick=createCourtReports({readEdict:()=>source,saved:awaiting}),ready=quick.report('works',8);assert.equal(ready.action,'approve');assert(quick.decide(ready.issueId,'approve'));assert.equal(quick.inspection().place,'荷庭东岸');
assert.equal(formatCourtEdictText('奉旨核验cn-edict-east-shore:0 · 到传令案核对'),'奉旨核验第1日《荷庭东岸清扫令》 · 到传令案核对');
console.log('PASS: source IDs, untrusted/missing receipt rejection, emperor decision guard, deferred real-state change, physical inspection requirement, rendered-work verification, persistence and next report');
