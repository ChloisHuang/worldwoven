// One bounded production-main route: shared navigation, existing guest/tray,
// staff handoff and explicit shift end. Simulated DOM, actual Three geometry;
// optional Mesa normal-view rendering is not browser QA.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function gardenReview(){return {player,lot,camera,scene,sun,lighting,npcs,franceGardener,franceLabor,formalCareers,copperLedger,automaticDoors,navOptions,careerHandbook};}
export function gardenStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export function gardenRuntime(){return {path:path.length,pending:pendingInteraction?.id,performing:performing?.id,clock:simulationClock.state()};}
export function gardenView(){yaw=2.4;pitch=.3;distance=4.8;updateCamera(1,true);updateLabels();}
export {requestStationIntent,configureStableShadows,blocked,planPath,save};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=`if(process.env.GARDEN_SAVE){storage['worlds-days-v1']=fs.readFileSync(process.env.GARDEN_SAVE,'utf8');}else{const prior=JSON.parse(storage['worlds-days-v1']);const core=mod(path.join(root,'game/formal-careers.js'));await core.link(linker);await core.evaluate();const career=core.namespace.createFormalCareers({getClock:()=>({day:0,hour:10,seconds:0}),saveState:()=>{}}).state();delete career.loadError;delete career.lastError;career.skills.gardening=8;prior.appearance.seed=1;prior.formalCareers=career;storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.GARDEN_SAVE?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const out=process.env.OUT_DIR||'qa/france-garden-hedge-main';fs.mkdirSync(out,{recursive:true});
if(!process.env.GARDEN_SAVE){all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();}const r=main.namespace.gardenReview(),T=three.namespace;
const report={scope:'Production main in simulated DOM; actual Three scene and shared paths; Mesa normal view is not browser/iOS QA',checks:[]};
const mark=label=>{report.checks.push(label);console.log(label);};let frames=0,previous=r.player.root.position.clone();
function step(){main.namespace.gardenStep(.1);frames++;assert(previous.distanceTo(r.player.root.position)<.65,'shared walking must not teleport');previous.copy(r.player.root.position);}
function detail(){return {runtime:main.namespace.gardenRuntime(),player:r.player.root.position.toArray(),job:r.franceLabor.state(),garden:r.franceGardener.state(),toast:ids.toast.textContent};}
function until(fn,label,limit=2500){for(let i=0;i<limit&&!fn();i++)step();assert(fn(),label+' '+JSON.stringify(detail()));}
function request(kind,done,label){const q=r.franceLabor.intent(kind);assert(q,'intent '+kind+' '+JSON.stringify(detail()));assert(main.namespace.requestStationIntent(q));until(done,label);}
let original;
if(!process.env.GARDEN_SAVE){
request('formal-apply',()=>r.formalCareers.applicationResult('fr-garden-assistant')?.status==='pending','walk to existing tools registry and submit');r.careerHandbook.close();
request('formal-review',()=>r.formalCareers.isHired('fr-garden-assistant'),'physical employer interview');r.careerHandbook.close();assert.equal(r.franceLabor.state().job,null);mark('Actual registry application / employer review preserves original gardener, no auto start');
request('accept',()=>!!r.franceLabor.state().job,'explicit garden shift');assert.equal(r.franceLabor.state().job.shiftKind,'continuous');
request('choose-prune',()=>r.franceGardener.maintenanceState().lease?.kind==='prune','select original pending hedge');
original=r.franceGardener.maintenanceState().lease.taskId;
request('take',()=>r.franceLabor.held(),'walk to original rack and take original shears');assert.equal(r.franceGardener.loanState().tool,'shears');mark('Shared route to original rack / take same original shears');
request('prune',()=>r.franceLabor.state().activity==='prune','walk to real hedge and begin clipping');for(let i=0;i<22;i++)step();assert(r.franceGardener.state().props.clippingsVisible);assert.equal(r.franceGardener.maintenanceState().prune.id,original);
main.namespace.save();fs.writeFileSync(out+'/mid-prune-save.json',storage['worlds-days-v1']);
}else{original=r.franceGardener.maintenanceState().lease.taskId;assert(r.franceLabor.held());assert.equal(r.franceGardener.loanState().tool,'shears');assert.equal(r.franceLabor.state().activity,'prune');mark('Full original mid-prune checkpoint reload retains original shears, hedge and unfinished action');}
let actual,canvas;
if(process.env.GARDEN_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1000,700);actual=new T.WebGLRenderer({canvas,antialias:true});actual.setSize(1000,700,false);actual.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(actual,r.sun);r.camera.aspect=1000/700;r.camera.updateProjectionMatrix();
}
async function screenshot(name){if(!actual)return;main.namespace.gardenView();actual.render(r.scene,r.camera);fs.writeFileSync(out+'/'+name+'.png',await canvas.toBuffer('image/png'));}
await screenshot('original-hedge-pruning');until(()=>r.franceGardener.maintenanceState().prune.pruned,'complete six second real hedge action');assert.equal(r.formalCareers.state().skillXP.gardening,0);mark('Same authored hedge / six second shears action and original falling clippings / no early XP');
request('return',()=>!r.franceLabor.held(),'walk back and return original shears');assert.equal(r.franceLabor.state().job.stage,'working');assert.equal(r.franceLabor.state().job.completedTasks,1);assert.equal(r.formalCareers.state().skillXP.gardening,10);assert.equal(r.copperLedger.state().balances.france.bank,0);assert.equal(r.franceGardener.maintenanceState().lease,null);assert.equal(r.franceLabor.intent('choose-prune'),null);await screenshot('original-shears-returned');mark('Same shears returned once / real employer review and 10 gardening XP / ongoing shift and no second hedge task');
until(()=>r.franceLabor.state().job.coveredSeconds>=140,'real in-garden attendance before meaningful wage',1800);
request('end-shift',()=>r.franceLabor.state().job.stage==='ready','walk to employer for explicit handover');request('claim',()=>!r.franceLabor.state().job,'same employer bank settlement');const d=r.formalCareers.state().lastDuty;assert.equal(d.stage,'paid');assert.equal(d.customerReviews.length,1);assert.equal(r.copperLedger.state().balances.france.bank,d.wage);assert.equal(r.copperLedger.history().filter(x=>x.action==='wage').length,1);assert(d.wage>0&&d.wage<8);mark('Explicit handover and inspection / actual on-duty time paid once to French bank');
main.namespace.save();fs.writeFileSync(out+'/completed-save.json',storage['worlds-days-v1']);actual?.dispose();
report.frames=frames;report.wage=d.wage;report.coveredSeconds=d.coveredSeconds;report.taskId=original;report.status='PASS';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
`;
harness=harness.slice(0,begin)+body;new vm.Script(harness,{filename:'france-garden-hedge-main-harness.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
