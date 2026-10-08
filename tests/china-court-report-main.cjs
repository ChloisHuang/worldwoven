// One production-main persistence integration. The inspected source and 6/4
// completion certificate are explicit staged inputs; real phase timing is
// tested separately in china-court-report-receipt.mjs. This tests the actual
// main save/capture/storeWorldRegion/storage/rollback path, not another route.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed fixture seam: '+a);harness=harness.replace(a,b);}
const extra=`\nexport function reportReceiptMainReview(){return {saved,npcs,chinaAudience,copperLedger,chinaOfficialEconomy,chinaSalonEconomy,tavernProperty};}\nexport {save};`;
// Test-only access to the real reports instance: its production callback is
// unchanged, so acknowledging reaches saveReports -> real main full-world save.
const instrument=`const source=fs.readFileSync(file,'utf8');const code=file.endsWith('/game/china-palace-audience.js')?source.replace('  courtStatus:()=>','  __receiptProbe:()=>reports,\\n  courtStatus:()=>'):source;`;
once("const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),",instrument+"const m=new vm.SourceTextModule(code+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('let context=vm.createContext(',"let receiptWriteMode='accept',receiptAttempts=0,receiptWrites=0;let context=vm.createContext(");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}',"localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{if(k==='worlds-days-v1'&&JSON.parse(v)?.chinaAudience?.reports?.cases.some(c=>c.result?.received)){receiptAttempts++;if(receiptWriteMode==='reject')return false;receiptWrites++;}storage[k]=v;return true;}}");
once("const main=mod(path.join(root,'game/main.js'));",String.raw`
const sourceState={ledger:{lastDay:0,lastReceipt:'cn-morning-audience:0',outcome:'completed',completedReceipt:'cn-morning-audience:0'},order:null,props:{workProgress:1}};
const reportsModule=mod(path.join(root,'game/china-court-reports.js'));await reportsModule.link(linker);await reportsModule.evaluate();
const originalReports=reportsModule.namespace.createCourtReports({readEdict:()=>sourceState}),draft=originalReports.report('works',0);
assert(originalReports.decide(draft.issueId,'approve','cn-emperor'));const inspection=originalReports.inspection();assert(originalReports.inspected(inspection.id,{actorId:'cn-minister-works',position:inspection.point,place:inspection.place}));
const prior=JSON.parse(storage['worlds-days-v1']);prior.chinaAudience={reports:originalReports.snapshot()};storage['worlds-days-v1']=JSON.stringify(prior);
const main=mod(path.join(root,'game/main.js'));`);
const begin=harness.indexOf('const report=[];for(let round=0;');if(begin<0)throw Error('Missing bounded fixture body');
harness=harness.slice(0,begin)+String.raw`
const copy=x=>JSON.parse(JSON.stringify(x)),out=path.resolve('qa/court-report-receipts');fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();assert.equal(state().region,'china');
const r=main.namespace.reportReceiptMainReview(),core=r.chinaAudience.__receiptProbe();
assert.equal(r.npcs.length,31);const people=r.npcs.slice(),identities=r.npcs.map(n=>n.station.id);
const funds=()=>JSON.stringify({player:r.copperLedger.state(),officials:r.chinaOfficialEconomy.snapshot(),salon:r.chinaSalonEconomy.snapshot(),property:r.tavernProperty.state()});
const moneyBefore=funds(),ref=core.report('works',0).resultReport;
assert(ref);assert.equal(core.state().cases[0].result.reportedDay,undefined);
assert(main.namespace.save());const before=JSON.parse(storage['worlds-days-v1']),oldTop=copy(r.saved.chinaAudience),oldWorld=copy(r.saved.worldContinuity),oldCore=copy(core.snapshot());
assert.deepEqual(before.chinaAudience.reports,before.worldContinuity.regions.china.controllers.chinaAudience.reports);
const proof={reporterId:'cn-minister-works',recipientId:'cn-emperor',reportSeconds:6,responseSeconds:4};
receiptWriteMode='reject';const failed=core.acknowledgeReport(ref,proof);assert.equal(failed.ok,false);assert.equal(failed.code,'save-failed');
assert.equal(receiptAttempts,1);assert.equal(receiptWrites,0);assert.deepEqual(copy(r.saved.chinaAudience),oldTop);assert.deepEqual(copy(r.saved.worldContinuity),oldWorld);assert.deepEqual(copy(core.snapshot()),oldCore);
assert.deepEqual(JSON.parse(storage['worlds-days-v1']),before,'Rejected real localStorage write leaves the complete durable snapshot untouched');assert.equal(funds(),moneyBefore);
receiptWriteMode='accept';const accepted=core.acknowledgeReport(ref,proof);assert.equal(accepted.ok,true);assert.equal(accepted.replayed,false);
assert.equal(receiptAttempts,2);assert.equal(receiptWrites,1);
const after=JSON.parse(storage['worlds-days-v1']),top=after.chinaAudience.reports,continuity=after.worldContinuity.regions.china.controllers.chinaAudience.reports;
assert.deepEqual(top,continuity,'Actual main capture projects the same candidate into both stored paths');assert.deepEqual(top,copy(core.snapshot()));
const result=top.cases.find(c=>c.id===ref.caseId).result;assert.equal(result.reportedDay,0);assert.equal(result.received.inspectionId,ref.inspectionId);assert.equal(result.received.sourceEventId,ref.sourceEventId);
assert.equal(funds(),moneyBefore);assert.deepEqual(r.npcs.map(n=>n.station.id),identities);assert(r.npcs.every((n,i)=>n===people[i]),'All 31 actual body identities stay unchanged');
assert(core.acknowledgeReport(ref,proof).replayed);assert.equal(receiptWrites,1);assert.equal(receiptAttempts,2);
let reloadWrites=0;const cold=reportsModule.namespace.createCourtReports({saved:continuity,savedReport:ref,saveState:()=>reloadWrites++});assert(cold.restoreReport(ref));assert(cold.acknowledgeReport(ref,proof).replayed);assert.equal(reloadWrites,0);assert.deepEqual(copy(cold.snapshot()),top);
fs.writeFileSync(path.join(out,'main-receipt-saved.json'),storage['worlds-days-v1']);
console.log(JSON.stringify({status:'PASS',scope:'One actual production China main scene; staged already-inspected result and completion proof; real main save/capture/continuity/storage failure rollback and one success; phase timing separately verified; no route/day simulation or browser/iOS claim',npcCount:31,receiptAttempts,receiptWrites,receipt:result.received,moneyUnchanged:true}));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/china-court-report-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
