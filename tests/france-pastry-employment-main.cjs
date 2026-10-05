// One bounded production-main route: shared navigation, existing guest/tray,
// staff handoff and explicit shift end. Simulated DOM, actual Three geometry;
// This does not claim browser or iOS QA.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function teaReview(){return {player,lot,camera,scene,sun,lighting,npcs,franceTea,francePastryEmployment,formalCareers,copperLedger,automaticDoors,navOptions,careerHandbook};}
export function teaStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export function teaRuntime(){return {path:path.length,pending:pendingInteraction?.id,performing:performing?.id,clock:simulationClock.state()};}
export function teaView(){yaw=2.4;pitch=.26;distance=4.8;updateCamera(1,true);updateLabels();}
export {requestStationIntent,configureStableShadows,blocked,planPath};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=`{const prior=JSON.parse(storage['worlds-days-v1']);const core=mod(path.join(root,'game/formal-careers.js'));await core.link(linker);await core.evaluate();const career=core.namespace.createFormalCareers({getClock:()=>({day:0,hour:10,seconds:0}),saveState:()=>{}}).state();delete career.loadError;delete career.lastError;career.skills.ritual=8;career.skills.cooking=8;prior.appearance.seed=1;prior.formalCareers=career;storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const out=process.env.OUT_DIR||'qa/france-pastry-employment-main';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();const r=main.namespace.teaReview(),T=three.namespace;
for(const [x,y,z] of [[-7.9,.258,-10.55],[-5.9,.258,-9.03],[-5.05,.258,-8.5]])assert(!main.namespace.blocked(x,z,r.lot.colliders,.39,{...r.navOptions,y}),'authored pastry player point clears .39 planning capsule');
const report={scope:'Production main in simulated DOM; actual Three scene and common paths; not browser or iOS QA',checks:[]};
const mark=label=>{report.checks.push(label);console.log(label);};let frames=0,previous=r.player.root.position.clone();
function step(){main.namespace.teaStep(.1);frames++;assert(previous.distanceTo(r.player.root.position)<.65,'shared walking must not teleport');previous.copy(r.player.root.position);}
function detail(){return {runtime:main.namespace.teaRuntime(),player:r.player.root.position.toArray(),job:r.francePastryEmployment.state(),tea:r.franceTea.state(),host:r.npcs.find(n=>n.station.id==='france-salon').root.position.toArray(),cook:r.npcs.find(n=>n.station.id==='france-bakery').root.position.toArray(),toast:ids.toast.textContent};}
function until(fn,label,limit=5000){for(let i=0;i<limit&&!fn();i++)step();assert(fn(),label+' '+JSON.stringify(detail()));}
function request(kind,done,label){const q=r.francePastryEmployment.intent(kind);assert(q,'intent '+kind);assert(main.namespace.requestStationIntent(q));until(done,label);}
request('formal-apply',()=>r.formalCareers.applicationResult('fr-tea-pastry')?.status==='pending','walk to real local employer and submit');assert.equal(r.formalCareers.state().tenure,null);r.careerHandbook.close();mark('Arrival → shared path → actual 卡米耶 → durable pending, no automatic hiring');
request('formal-review',()=>r.formalCareers.isHired('fr-tea-pastry'),'physical interview approves');r.careerHandbook.close();assert.equal(r.francePastryEmployment.state().job,null);assert.equal(r.formalCareers.state().lastDuty,null);mark('Physical interview occupies one real slot; original 卡米耶 explicitly covers until start');
request('accept',()=>!!r.francePastryEmployment.state().job,'explicit start');
// Move by the common path to the original tea table while waiting for a real
// guest. No synthetic guest or production order is injected.
let steps=0,delivered=false,original=null;const deadline=frames+11000;
while(r.francePastryEmployment.state().job.completedTasks<1&&frames<deadline){
 const intent=r.francePastryEmployment.intent('task');if(intent){const key=intent.work.orderId+'-'+intent.work.key;if(intent.work.trayId)original??=intent.work.trayId;
  assert(main.namespace.requestStationIntent(intent),'request '+intent.work.key+' '+JSON.stringify(detail()));until(()=>{const next=r.francePastryEmployment.intent('task');return !next||next.work.orderId+'-'+next.work.key!==key;},'physical '+intent.work.key,4500);steps++;console.log('TASK',intent.work.key);if(intent.work.key==='release-tray'){delivered=true;assert.equal(r.franceTea.state().props.trayId,original);}
 }else step();
}
assert.equal(r.francePastryEmployment.state().job.completedTasks,1,JSON.stringify(detail()));assert(delivered);assert.equal(steps,5);assert.equal(r.francePastryEmployment.state().job.stage,'working');assert.equal(r.copperLedger.state().balances.france.bank,0);assert.deepEqual(JSON.parse(JSON.stringify(r.franceTea.workReceipts(r.francePastryEmployment.state().job.receiptId)[0].quality)),{received:true,cut:true,brewed:true,plated:true,handed:true,consumed:true,cleaned:true});mark('Original guest → receive/cut/brew/plate → original tray to 玛农 → real service/return/cleanup; one order leaves continuing shift');
request('end-shift',()=>r.francePastryEmployment.state().job.stage==='ready','explicit employer handover',6000);
request('claim',()=>!r.francePastryEmployment.state().job,'actual employer inspection and bank wage');const d=r.formalCareers.state().lastDuty;assert.equal(d.stage,'paid');assert.equal(d.customerReviews.length,1);assert.equal(r.copperLedger.state().balances.france.bank,d.wage);mark('Explicit handover/inspection pays actual on-duty hours once to French bank');

report.frames=frames;report.wage=d.wage;report.coveredSeconds=d.coveredSeconds;report.status='PASS';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
`;
harness=harness.slice(0,begin)+body;new vm.Script(harness,{filename:'france-pastry-employment-main-harness.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
