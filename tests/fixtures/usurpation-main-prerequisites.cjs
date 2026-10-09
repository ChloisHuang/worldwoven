// Optional preflight against an unqualified, planning checkpoint, selected with
// USURPATION_MAIN_FROM. This is not a permanent post-investiture test entry.
// Declared input preparation only. No production scene, political result or
// royal meal is simulated here; those must run through the resumed main.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve('source'),copy=value=>JSON.parse(JSON.stringify(value));
const load=name=>import(pathToFileURL(path.join(root,'game',name)).href),cache=new Map();
const mod=file=>{if(!cache.has(file)){const entry={status:'unlinked',namespace:null,async link(){this.namespace=await import(pathToFileURL(file).href);this.status='evaluated';},async evaluate(){assert.equal(this.status,'evaluated');}};cache.set(file,entry);}return cache.get(file);};
const input=()=>JSON.parse(fs.readFileSync(process.env.USURPATION_MAIN_FROM||'tests/fixtures/usurpation-main-checkpoint.json','utf8'));
const output='qa/usurpation-prerequisites';fs.mkdirSync(output,{recursive:true});

test('isolated historical chef prerequisites leave the real world, original food and political case untouched',async()=>{
 const helper=require('./usurpation-main-kitchen-history.cjs'),before=input().save,prior=copy(before);
 const result=await helper({prior,mod,linker:()=>{},root,assert});
 assert.deepEqual(prior,before,'helper never edits its input');
 const candidate=copy(result.save);delete candidate.formalCareers;const expected=copy(before);delete expected.formalCareers;
 assert.deepEqual(candidate,expected);assert.equal(result.bankCalls,0);assert.equal(result.qualification.qualifiedDays,3);
 assert(result.stagedReceipts.every(row=>row.actorId==='player'&&row.completed));
 assert.equal(result.save.formalCareers.tenure,null);assert.equal(result.save.formalCareers.workExperience.royalKitchen.receipts.length,0);
 fs.writeFileSync(path.join(output,'kitchen.json'),JSON.stringify(result));
 console.log(JSON.stringify({kind:'staged-career-input',bankCalls:result.bankCalls,qualifiedDays:result.qualification.qualifiedDays,historyDays:result.stagedReceipts.map(row=>row.day),worldClockUnchanged:result.currentClockUnchanged}));
});

test('ordinary support history respects the pre-case window without touching political answers or the live clock',async()=>{
 const helper=require('./usurpation-main-support.cjs'),before=input().save,save=copy(before);
 const result=await helper({save,load});assert.deepEqual(save,before,'helper never edits its input');
 const candidate=copy(result.save),expected=copy(before);for(const key of ['relationshipEvents','playerConversations']){delete candidate[key];delete expected[key];}
 assert.deepEqual(candidate,expected);assert.equal(result.report.preservation.clockUnchanged,true);assert.equal(result.report.preservation.politicalUnchanged,true);assert.equal(result.report.preservation.otherFieldsUnchanged,true);
 const events=result.report.newEvents;for(let index=0;index<events.length;index++){
  assert(events[index].start>=result.report.window.start&&events[index].end<result.report.window.endExclusive);
  if(index)assert(events[index].start>=events[index-1].end,'one historical player never performs overlapping actions');
 }
 assert.deepEqual(result.save.palaceUsurpation,before.palaceUsurpation);
 fs.writeFileSync(path.join(output,'support.json'),JSON.stringify(result));
 console.log(JSON.stringify({kind:'staged-ordinary-history',window:result.report.window,actors:result.report.actors,newEvents:events.length}));
});
