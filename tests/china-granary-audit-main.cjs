// Two serial cold processes, each using the real production China main entry.
// Wage/desk/6+4 completion proofs are explicitly staged; real work and phase
// timing are covered by china-granary-audit-flow.mjs, not simulated here again.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const phase=process.argv[2];
if(!['prepare','reload'].includes(phase)){
 const {spawnSync}=require('node:child_process');
 for(const part of ['prepare','reload']){
  const child=spawnSync(process.execPath,['--experimental-vm-modules',__filename,part],{stdio:'inherit',env:process.env});
  if(child.error)throw child.error;if(child.status!==0)process.exit(child.status||1);
 }
 process.exit(0);
}
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed fixture seam: '+a);harness=harness.replace(a,b);}
const extra=`\nexport function granaryMainReview(){return {saved,npcs,chinaAudience,copperLedger,chinaOfficialEconomy,chinaSalonEconomy,tavernProperty,simulationClock};}\nexport {save};`;
// Expose the actual core, never replace its production persistence callback.
const instrument=`const source=fs.readFileSync(file,'utf8');const code=file.endsWith('/game/china-palace-audience.js')?source.replace('  courtStatus:()=>','  __granaryProbe:()=>granaryAudit,\\n  courtStatus:()=>'):source;`;
once("const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),",instrument+"const m=new vm.SourceTextModule(code+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('let context=vm.createContext(',`const phase=${JSON.stringify(phase)};let writeMode=phase==='prepare'?'reject-plan':'accept',planAttempts=0,receiptAttempts=0,receiptWrites=0;let context=vm.createContext(`);
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert.equal(state().mode,phase==='reload'?'lot':'globe');");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}',`localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{
 if(k==='worlds-days-v1'){
  const candidate=JSON.parse(v)?.chinaAudience?.granaryAudit;
  if(writeMode==='reject-plan'&&candidate){planAttempts++;return false;}
  if(candidate?.batches?.some(b=>b.received)){receiptAttempts++;if(writeMode==='reject-receipt')return false;receiptWrites++;}
 }
 storage[k]=v;return true;
}}`);
once("const main=mod(path.join(root,'game/main.js'));",String.raw`
const clone=x=>JSON.parse(JSON.stringify(x)),out=path.resolve('qa/granary-audit');fs.mkdirSync(out,{recursive:true});
const duty=(actorId,day)=>({actorId,day,receiptId:'cn-official-duty:'+actorId+':'+day,evidence:{kind:'office-work',completed:true,actorId,day,audienceDay:day,audienceCompleted:true,duration:8,elapsed:8}});
if(phase==='prepare'){
 const e=mod(path.join(root,'game/china-official-economy.js'));await e.link(linker);await e.evaluate();
 const old=e.namespace.createChinaOfficialEconomy({getDay:()=>0,isAppointed:()=>true,saveState:()=>true});
 assert(old.completeDuty(duty('cn-minister-works',0)).ok);
 const prior=JSON.parse(storage['worlds-days-v1']);prior.chinaOfficialEconomy=clone(old.snapshot());storage['worlds-days-v1']=JSON.stringify(prior);
}else storage['worlds-days-v1']=fs.readFileSync(path.join(out,'main-pending.json'),'utf8');
const persistedInput=JSON.parse(storage['worlds-days-v1']);
const main=mod(path.join(root,'game/main.js'));`);
const begin=harness.indexOf('const report=[];for(let round=0;');if(begin<0)throw Error('Missing bounded fixture body');
harness=harness.slice(0,begin)+String.raw`
const loaded=persistedInput;
if(state().mode==='globe'){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}assert.equal(state().region,'china');
const r=main.namespace.granaryMainReview(),core=r.chinaAudience.__granaryProbe();
assert.equal(r.npcs.length,31);assert.equal(core.loadError,null);assert.equal(core.snapshot().baseline,1);
const people=r.npcs.slice(),identities=r.npcs.map(n=>n.station.id),day=r.simulationClock.state().day;
const funds=()=>JSON.stringify({player:r.copperLedger.state(),officials:r.chinaOfficialEconomy.snapshot(),salon:r.chinaSalonEconomy.snapshot(),property:r.tavernProperty.state()});
if(phase==='prepare'){
 assert(planAttempts>0,'Initial audience saves really reject the proposed baseline');
 assert.equal(core.snapshot().enabled,false);const rejected=core.activate();assert.equal(rejected.ok,false);assert.equal(rejected.code,'save-failed');
 assert.equal(core.snapshot().baseline,1);assert.equal(core.snapshot().enabled,false);
 // An actual production economic commit calls worldSnapshotWriter and then
 // storage. Only its witnessed-work certificate is a staged test input.
 const paid=r.chinaOfficialEconomy.completeDuty(duty('cn-minister-granary',day));assert(paid.ok);
 assert.equal(r.chinaOfficialEconomy.history().length,2);assert.equal(paid.transaction.id,'official-2');
 const paidSave=JSON.parse(storage['worlds-days-v1']),pending=paidSave.worldContinuity.regions.china.controllers.chinaAudience.granaryAudit;
 assert.equal(pending.baseline,1);assert.equal(pending.enabled,false);
 assert.equal(paidSave.chinaAudience?.granaryAudit,undefined,'Rejected audience saves keep old top-level state absent');
 assert(main.namespace.save());const ordinary=JSON.parse(storage['worlds-days-v1']);
 assert.deepEqual(ordinary.worldContinuity.regions.china.controllers.chinaAudience.granaryAudit,pending);
 assert.equal(ordinary.chinaAudience?.granaryAudit,undefined);
 assert.equal(ordinary.chinaOfficialEconomy.transactions[1].amount,24,'The old duty contract stays24');
 fs.writeFileSync(path.join(out,'main-pending.json'),storage['worlds-days-v1']);
 console.log(JSON.stringify({status:'PASS',phase,scope:'Actual main initial audience writes rejected; production official wage commits real source after pending baseline; ordinary save retains disabled baseline only in continuity',planAttempts,baseline:1,lastTransaction:2,npcCount:31}));
}else{
 assert.equal(loaded.chinaAudience?.granaryAudit,undefined);
 assert.equal(loaded.worldContinuity.regions.china.controllers.chinaAudience.granaryAudit.baseline,1);
 assert.equal(core.snapshot().enabled,false,'Cold controller does not treat pending baseline as activation');
 assert.deepEqual(clone(r.chinaOfficialEconomy.snapshot()),loaded.chinaOfficialEconomy,'Cold entry does not alter original wages');
 const moneyBefore=funds();assert(core.activate().ok);assert(core.prepare().ok);const batch=core.snapshot().batches.at(-1);
 assert.deepEqual(batch.receipts.map(row=>row.id),['official-2']);assert.equal(batch.fromSerial,1);assert.equal(batch.receipts[0].amount,24);
 // Explicitly staged completion proof. Separate actual-life/phase tests prove
 // Xu's distinct15–27s work and the second report6s/emperor4s timing.
 assert(core.inspected(batch.id,{actorId:'cn-minister-granary',position:[24,.215,32.5],elapsed:21,duration:21}).ok);
 const ref=core.report(day).auditReport,proof={reporterId:'cn-minister-granary',recipientId:'cn-emperor',reportSeconds:6,responseSeconds:4};
 assert(ref);assert(main.namespace.save());
 const before=JSON.parse(storage['worlds-days-v1']),oldTop=clone(r.saved.chinaAudience),oldWorld=clone(r.saved.worldContinuity),oldCore=clone(core.snapshot());
 assert.deepEqual(before.chinaAudience.granaryAudit,before.worldContinuity.regions.china.controllers.chinaAudience.granaryAudit);
 writeMode='reject-receipt';const failed=core.acknowledgeReport(ref,proof);assert.equal(failed.ok,false);assert.equal(failed.code,'save-failed');
 assert.equal(receiptAttempts,1);assert.equal(receiptWrites,0);assert.deepEqual(clone(core.snapshot()),oldCore);assert.deepEqual(clone(r.saved.chinaAudience),oldTop);assert.deepEqual(clone(r.saved.worldContinuity),oldWorld);assert.deepEqual(JSON.parse(storage['worlds-days-v1']),before);
 writeMode='accept';const accepted=core.acknowledgeReport(ref,proof);assert(accepted.ok&&!accepted.replayed);assert.equal(receiptAttempts,2);assert.equal(receiptWrites,1);
 const after=JSON.parse(storage['worlds-days-v1']),top=after.chinaAudience.granaryAudit,continuity=after.worldContinuity.regions.china.controllers.chinaAudience.granaryAudit;
 assert.deepEqual(top,continuity);assert.deepEqual(top,clone(core.snapshot()));assert.equal(top.batches.at(-1).received.batchId,batch.id);
 assert(core.acknowledgeReport(ref,proof).replayed);assert.equal(receiptAttempts,2);assert.equal(receiptWrites,1);
 assert.equal(funds(),moneyBefore);assert.deepEqual(r.npcs.map(n=>n.station.id),identities);assert(r.npcs.every((n,i)=>n===people[i]));
 fs.writeFileSync(path.join(out,'main-received.json'),storage['worlds-days-v1']);
 console.log(JSON.stringify({status:'PASS',phase,scope:'Actual cold production main with same31 identities restores pending cutoff from continuity; staged desk/6+4 proof enters real main save rollback and exact-once receipt; no day/path or browser/iOS claim',baseline:1,receiptAttempts,receiptWrites,receipt:top.batches.at(-1).received,moneyUnchanged:true,npcCount:31}));
}
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/china-granary-audit-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
