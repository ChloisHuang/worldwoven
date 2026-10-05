// One bounded production-main route: shared navigation, existing guest/tray,
// staff handoff and explicit shift end. Simulated DOM, actual Three geometry;
// optional Mesa normal-view rendering is not browser QA.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function teaReview(){return {player,lot,camera,scene,sun,lighting,npcs,franceTea,franceTeaEmployment,formalCareers,copperLedger,automaticDoors,navOptions,careerHandbook};}
export function teaStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export function teaRuntime(){return {path:path.length,pending:pendingInteraction?.id,performing:performing?.id,clock:simulationClock.state()};}
export function teaView(){yaw=2.4;pitch=.26;distance=4.8;updateCamera(1,true);updateLabels();}
export {requestStationIntent,configureStableShadows,blocked,planPath};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=`{const prior=JSON.parse(storage['worlds-days-v1']);const core=mod(path.join(root,'game/formal-careers.js'));await core.link(linker);await core.evaluate();const career=core.namespace.createFormalCareers({getClock:()=>({day:0,hour:10,seconds:0}),saveState:()=>{}}).state();delete career.loadError;delete career.lastError;career.skills.ritual=8;career.skills.writing=8;prior.appearance.seed=1;prior.formalCareers=career;storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const out=process.env.OUT_DIR||'qa/france-tea-employment-main';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();const r=main.namespace.teaReview(),T=three.namespace;
assert(main.namespace.blocked(5.65,11.88,r.lot.colliders,.39,{...r.navOptions,y:.16}),'prototype NPC point is too close for player');assert(!main.namespace.blocked(5.4,12,r.lot.colliders,.39,{...r.navOptions,y:.16}),'player serving point clears same table and seat');
const report={scope:'Production main in simulated DOM; actual Three scene and common paths; optional Mesa is not browser QA',checks:[]};
const mark=label=>{report.checks.push(label);console.log(label);};let frames=0,previous=r.player.root.position.clone();
function step(){main.namespace.teaStep(.1);frames++;assert(previous.distanceTo(r.player.root.position)<.65,'shared walking must not teleport');previous.copy(r.player.root.position);}
function detail(){return {runtime:main.namespace.teaRuntime(),player:r.player.root.position.toArray(),job:r.franceTeaEmployment.state(),tea:r.franceTea.state(),host:r.npcs.find(n=>n.station.id==='france-salon').root.position.toArray(),cook:r.npcs.find(n=>n.station.id==='france-bakery').root.position.toArray(),toast:ids.toast.textContent};}
function until(fn,label,limit=5000){for(let i=0;i<limit&&!fn();i++)step();assert(fn(),label+' '+JSON.stringify(detail()));}
function request(kind,done,label){const q=r.franceTeaEmployment.intent(kind);assert(q,'intent '+kind);assert(main.namespace.requestStationIntent(q));until(done,label);}
request('formal-apply',()=>r.formalCareers.applicationResult('fr-tea-server')?.status==='pending','walk to real local employer and submit');assert.equal(r.formalCareers.state().tenure,null);r.careerHandbook.close();mark('Arrival → shared path → actual 玛农 → durable pending, no automatic hiring');
request('formal-review',()=>r.formalCareers.isHired('fr-tea-server'),'physical interview approves');r.careerHandbook.close();assert.equal(r.franceTeaEmployment.state().job,null);assert.equal(r.formalCareers.state().lastDuty,null);mark('Physical interview occupies one real slot; original 玛农 explicitly covers until start');
request('accept',()=>!!r.franceTeaEmployment.state().job,'explicit start');
// Move by the common path to the original tea table while waiting for a real
// guest. No synthetic guest or production order is injected.
let steps=0,delivered=false,original=null;const deadline=frames+11000;
while(r.franceTeaEmployment.state().job.completedTasks<1&&frames<deadline){
 const intent=r.franceTeaEmployment.intent('task');if(intent){const key=intent.work.orderId+'-'+intent.work.key;if(intent.work.trayId)original??=intent.work.trayId;
  assert(main.namespace.requestStationIntent(intent),'request '+intent.work.key+' '+JSON.stringify(detail()));until(()=>{const next=r.franceTeaEmployment.intent('task');return !next||next.work.orderId+'-'+next.work.key!==key;},'physical '+intent.work.key,4500);steps++;console.log('TASK',intent.work.key);if(intent.work.key==='serve-tray'){delivered=true;assert.equal(r.franceTea.state().props.trayId,original);}
 }else step();
}
assert.equal(r.franceTeaEmployment.state().job.completedTasks,1,JSON.stringify(detail()));assert(delivered);assert(steps>=6);assert.equal(r.franceTeaEmployment.state().job.stage,'working');assert.equal(r.copperLedger.state().balances.france.bank,0);mark('Original guest’s order → kitchen report → same tray → original table → same cup return; one order leaves continuing shift');
request('end-shift',()=>r.franceTeaEmployment.state().job.stage==='ready','explicit employer handover',6000);
request('claim',()=>!r.franceTeaEmployment.state().job,'actual employer inspection and bank wage');const d=r.formalCareers.state().lastDuty;assert.equal(d.stage,'paid');assert.equal(d.customerReviews.length,1);assert.equal(r.copperLedger.state().balances.france.bank,d.wage);mark('Explicit handover/inspection pays actual on-duty hours once to French bank');
if(process.env.TEA_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});const canvas=W.createCanvas(1000,700),actual=new T.WebGLRenderer({canvas,antialias:true});actual.setSize(1000,700,false);actual.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(actual,r.sun);r.camera.aspect=1000/700;r.camera.updateProjectionMatrix();main.namespace.teaView();actual.render(r.scene,r.camera);const png=await canvas.toBuffer('image/png');fs.writeFileSync(out+'/tea-handover.png',png);actual.dispose();report.render='Actual Three/Mesa normal follow camera';
}
report.frames=frames;report.wage=d.wage;report.coveredSeconds=d.coveredSeconds;report.status='PASS';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
`;
harness=harness.slice(0,begin)+body;new vm.Script(harness,{filename:'france-tea-employment-main-harness.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
