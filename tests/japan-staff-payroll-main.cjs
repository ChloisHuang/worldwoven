// One bounded production observation: original NPC work/waiting through 18:00
// pays actual covered hours. Only the starting game time is a test fixture.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function payrollReview(){return {player,npcs,japanService,japanStaffPayroll,copperLedger,simulationClock};}
export function payrollStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);}
export {save};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once("const main=mod(path.join(root,'game/main.js'));","{const prior=JSON.parse(storage['worlds-days-v1']);prior.appearance.seed=11;prior.simulationClock={version:1,seconds:300/.7};storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),out='qa/japan-staff-payroll';fs.mkdirSync(out,{recursive:true});all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();const r=main.namespace.payrollReview();
assert(r.japanService&&r.japanStaffPayroll);assert.equal(r.japanStaffPayroll.loadError,null);assert.equal(r.japanStaffPayroll.state().till,224);assert.equal(r.copperLedger.balances().japan.bank,0);assert.equal(r.copperLedger.balances().japan.cash,0);
const seen=new Map(),pauses=new Set();let steps=0;
while(r.simulationClock.state().hour<18&&steps<2700){
 now+=100;main.namespace.payrollStep(.1);steps++;
 if(steps%20===0){
  const s=r.japanService.state();for(const h of s.history)if(['cook','serve','wash'].includes(h.event))seen.set(h.visit+':'+h.event,h);
  const active=s.staffLife?.active;if(active&&['jp-sushi','jp-ramen'].includes(active.id)&&!['draining','handoff'].includes(active.phase)){pauses.add(active.id);assert(!r.japanService.staffCoverage().some(c=>c.actorId===active.id),'Real break does not cover a paid seat');}
 }
 if(steps%600===0)console.log('PROGRESS',JSON.stringify({steps,clock:r.simulationClock.state(),invoices:r.japanStaffPayroll.state().invoices,originalWork:[...seen.values()]}));
 assert(Date.now()-started<210000,'bounded production observation');assert(process.resourceUsage().maxRSS/1024<1228.8,'bounded scene memory');
}
assert(r.simulationClock.state().hour>=18);assert(r.japanStaffPayroll.flush().ok);assert(main.namespace.save());
const p=r.japanStaffPayroll.state(),paid=p.invoices.reduce((sum,row)=>sum+(row.paid?row.amount:0),0);assert(paid>0,'Real original coverage earns a nonzero wage');assert.equal(p.till,224-paid);assert(p.invoices.every(row=>row.closed&&row.paid));assert.equal(p.income.length,0,'No synthetic visitor revenue or player meal income');assert.equal(r.copperLedger.balances().japan.bank,0,'Player wallet is independent');assert.equal(r.copperLedger.balances().japan.cash,0);
for(const row of p.invoices){const weighted=Math.floor((18*row.seconds.kitchen+14*row.seconds.tableService)/(720/.7)+1e-9);assert.equal(row.amount,weighted);assert.equal(p.accounts[row.actorId].bank,weighted);assert(row.seconds.kitchen+row.seconds.tableService<=180/.7+.001);}
const stored=JSON.parse(storage['worlds-days-v1']),module=mod(path.join(root,'game/japan-staff-payroll.js')),reloaded=module.namespace.createJapanStaffPayroll({saved:stored.japanStaffPayroll,playerLedger:r.copperLedger,getClock:()=>r.simulationClock.state(),saveState:()=>true});assert.equal(reloaded.loadError,null);assert(reloaded.flush().ok);assert.equal(reloaded.state().till,p.till);assert.equal(reloaded.account('jp-sushi').bank,p.accounts['jp-sushi'].bank);assert.equal(reloaded.account('jp-ramen').bank,p.accounts['jp-ramen'].bank);
const report={status:'PASS',scope:'Original production main/NPCs/navigation with a 15:00 starting-clock fixture; simulated DOM/renderer, not browser/iOS or visual QA',clock:r.simulationClock.state(),invoices:p.invoices,accounts:p.accounts,till:p.till,originalWork:[...seen.values()],pausedActors:[...pauses],seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024};fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/japan-payroll-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
