// Actual production main boot, ordinary-save and cold-reload entry. This uses
// a staged legacy ledger/calendar fixture; it does not claim natural gameplay.
// Only the restore phase builds China's real Three scene once. No full-day sim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed fixture seam: '+a);harness=harness.replace(a,b);}
const extra=`\nexport function gradePayReview(){return {saved,chinaOfficialEconomy,simulationClock,npcs,careerHandbook,player};}\nexport {save};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('let context=vm.createContext(', 'let policyRejected=0,ordinaryWrites=0;let context=vm.createContext(');
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}',"localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{if((process.env.OFFICIAL_GRADE_PHASE||'prepare')==='prepare'&&JSON.parse(v)?.chinaOfficialEconomy?.payPolicy){policyRejected++;return false;}storage[k]=v;ordinaryWrites++;return true;}}");
once('const main=mod(path.join(root,\'game/main.js\'));',String.raw`
const out=path.resolve('qa/official-grade-pay');fs.mkdirSync(out,{recursive:true});
const phase=process.env.OFFICIAL_GRADE_PHASE||'prepare',checkpoint=path.join(out,'main-ordinary-save.json');
assert(['prepare','restore'].includes(phase),'Use OFFICIAL_GRADE_PHASE=prepare or restore');
const clone=x=>JSON.parse(JSON.stringify(x));
const em=mod(path.join(root,'game/china-official-economy.js'));await em.link(linker);await em.evaluate();
let original;
if(phase==='prepare'){
 const prior=JSON.parse(storage['worlds-days-v1']);prior.simulationClock={version:1,seconds:5*1440/.7};
 const econ=em.namespace.createChinaOfficialEconomy({getDay:()=>5,isAppointed:()=>true,saveState:()=>true});
 const id='cn-minister-works',day=4;
 assert(econ.completeDuty({actorId:id,day,receiptId:'cn-official-duty:'+id+':'+day,evidence:{kind:'office-work',completed:true,actorId:id,day,elapsed:8,duration:8,audienceDay:day,audienceCompleted:true}}).ok);
 prior.chinaOfficialEconomy=clone(econ.snapshot());original=clone(prior.chinaOfficialEconomy);
 storage['worlds-days-v1']=JSON.stringify(prior);
}else{
 const prior=JSON.parse(fs.readFileSync(checkpoint,'utf8'));original=clone(prior.chinaOfficialEconomy);
 // Explicit later-day test input models another ordinary saved session. It
 // gives no work proof, money or elapsed offline earnings to the product.
 prior.simulationClock={version:1,seconds:8*1440/.7};storage['worlds-days-v1']=JSON.stringify(prior);
}
const main=mod(path.join(root,'game/main.js'));`);
const begin=harness.indexOf('const report=[];for(let round=0;');if(begin<0)throw Error('Missing bounded body seam');
harness=harness.slice(0,begin)+String.raw`
const r=main.namespace.gradePayReview(),econ=r.chinaOfficialEconomy;
assert.equal(econ.loadError,null);assert.deepEqual(clone(econ.history()),original.transactions);
assert.deepEqual(clone(econ.state().accounts),original.accounts);
assert.deepEqual(clone(r.saved.chinaOfficialPayActivation),{version:1,policyId:'cn-official-grade-v1',effectiveDay:6});
if(phase==='prepare'){
 assert(policyRejected>0);assert.equal(econ.gradePayPolicy(),null);assert.equal(r.simulationClock.state().day,5);
 assert(main.namespace.save(),'Actual production save() persists the pending activation with the old ledger');
 const durable=JSON.parse(storage['worlds-days-v1']);assert.deepEqual(durable.chinaOfficialEconomy,original);
 assert.equal(durable.chinaOfficialPayActivation.effectiveDay,6);
 fs.writeFileSync(checkpoint,storage['worlds-days-v1']);
 console.log(JSON.stringify({status:'PASS',phase,scope:'Actual whole-main boot rejects policy write; actual ordinary save retains original money and activation intent; staged legacy day5 fixture',policyRejected,ordinaryWrites,effectiveDay:6,transactions:econ.history().length,checkpoint}));
 return;
}
assert.equal(r.simulationClock.state().day,8);assert.equal(econ.gradePayPolicy().effectiveDay,6);
assert.equal(econ.state().governmentPaid,24);assert.equal(econ.history().length,1,'Cold reload neither catches up wages nor reprices old receipts');
assert.equal(econ.completeDuty({actorId:'cn-minister-works',day:4,receiptId:'cn-official-duty:cn-minister-works:4',evidence:{kind:'office-work',completed:true,actorId:'cn-minister-works',day:4,elapsed:8,duration:8,audienceDay:4,audienceCompleted:true}}).replayed,true);
assert.equal(econ.history().length,1);
const expected=[['cn-minister-works','工务主官','正二品',168],['cn-minister-granary','仓务总管','正三品',120],['cn-official-rites','礼仪主管','正四品',88],['cn-official-personnel','吏务主管','正五品',64],['cn-official-justice','刑名主官','正二品',168],['cn-official-records','文书承办官','正七品',38]];
const before=clone(econ.snapshot());all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
assert.equal(state().region,'china');const live=main.namespace.gradePayReview();assert.equal(live.npcs.length,31);
for(const [id,title,grade,wage] of expected){const n=live.npcs.find(n=>n.station.id===id);assert(n);assert(n.station.npcName.includes(title));assert(n.station.npcName.includes(grade));assert.equal(econ.dailyWageFor(id,8),wage);}
assert.deepEqual(clone(econ.snapshot()),before,'Entering the real scene does not grant wages');
live.careerHandbook.open({roleId:'cn-court-clerk',scope:'role'});
const dialog=all.find(e=>e.className?.split(' ').includes('career-dialog'));assert(dialog?.open);assert(dialog.textContent.includes('朝廷官职与品级俸例'));assert(dialog.textContent.includes('从一品 200文'));assert(dialog.textContent.includes('工务主官 · 正二品 · 新俸168文'));live.careerHandbook.close();
assert(main.namespace.save());const durable=JSON.parse(storage['worlds-days-v1']);
assert.equal(durable.chinaOfficialEconomy.payPolicy.effectiveDay,6);assert.deepEqual(durable.chinaOfficialEconomy.transactions,original.transactions);
fs.writeFileSync(path.join(out,'main-cold-restored.json'),storage['worlds-days-v1']);
console.log(JSON.stringify({status:'PASS',phase,scope:'Actual cold main reload at explicitly staged day8 preserves day6 activation/old24 wage; one real China scene and six actual NPC title/grade identities; simulated DOM/renderer, not browser or iOS',ordinaryWrites,effectiveDay:6,oldTransactions:1,npcCount:31,names:expected.map(([id])=>live.npcs.find(n=>n.station.id===id).station.npcName)}));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/china-official-grade-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
