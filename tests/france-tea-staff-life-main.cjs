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
const out=process.env.OUT_DIR||'qa/france-tea-staff-life-main';fs.mkdirSync(out,{recursive:true});
all.find(e=>e.dataset.region==='france').onclick();ids.travel.onclick();const r=main.namespace.teaReview();
const recallOnly=process.env.STAFF_RECALL_ONLY==='1';
const report={scope:'Production main, simulated DOM/renderer, actual Three geometry and common NPC paths; not browser/iOS QA',checks:[],activities:[]};
const cook=r.npcs.find(n=>n.station.id==='france-bakery'),host=r.npcs.find(n=>n.station.id==='france-salon'),originalCook=cook,originalHost=host;
const mark=label=>{report.checks.push(label);console.log(label);};let frames=0;
function step(){const before=cook.root.position.clone();main.namespace.teaStep(.1);frames++;assert(cook.root.position.distanceTo(before)<.55,'original staff uses one physical move per step');assert.equal(r.npcs.find(n=>n.station.id==='france-bakery'),originalCook);assert.equal(r.npcs.find(n=>n.station.id==='france-salon'),originalHost);}
function detail(){return {frames,job:r.francePastryEmployment.state(),tea:r.franceTea.state(),cook:cook.root.position.toArray(),host:host.root.position.toArray(),toast:ids.toast.textContent};}
function until(fn,label,limit=5000){for(let i=0;i<limit&&!fn();i++)step();assert(fn(),label+' '+JSON.stringify(detail()));}
function request(kind,done,label){const q=r.francePastryEmployment.intent(kind);assert(q,'intent '+kind);assert(main.namespace.requestStationIntent(q));until(done,label);}
const lifeMod=mod(path.join(root,'game/france-tea-staff-life.js'));const destinations=[...new Map(lifeMod.namespace.franceTeaStaffChoices().flatMap(c=>c.targets.map(t=>[t.id,t.choice.point]))).values()];
assert(!main.namespace.blocked(...[r.franceTea.forRole('cook').registry[0],r.franceTea.forRole('cook').registry[2]],r.lot.colliders,.39,{...r.navOptions,y:.258}),'revised waiting player point clears .39 planning capsule');
assert(new three.namespace.Vector3(...r.franceTea.forRole('cook').registry).distanceTo(new three.namespace.Vector3(-6.95,.258,-10.55))<1.8,'physical employer meeting distance');
for(const p of recallOnly?[]:destinations){assert(!main.namespace.blocked(p[0],p[2],r.lot.colliders,.30,{...r.navOptions,y:p[1]}),'staff destination clears actual .25 capsule plus .05 planning margin: '+p);assert(main.namespace.planPath(cook.root.position,{x:p[0],y:p[1],z:p[2]},.25).length,'existing staff path reaches '+p);}
mark(recallOnly?'Revised waiting position clears .39 capsule and leaves the ordinary employer return approach open':'All four existing leisure destinations clear actual NPC planning margin and have common-door routes');
request('formal-apply',()=>r.formalCareers.applicationResult('fr-tea-pastry')?.status==='pending','physical application');r.careerHandbook.close();
request('formal-review',()=>r.formalCareers.isHired('fr-tea-pastry'),'physical interview');r.careerHandbook.close();assert.equal(r.francePastryEmployment.state().job,null);assert.equal(r.franceTea.state().offDuty.cook,null);
request('accept',()=>!!r.francePastryEmployment.state().job,'explicit shift');
const completed=new Set();let last=null;
for(let i=0;i<7000&&(recallOnly?!report.activities.length:completed.size<4);i++){
 step();const s=r.franceTea.state(),current=s.offDuty.cook;
 for(const e of s.history.filter(e=>e.event==='staff-rested'&&e.actorId==='france-bakery'))completed.add(e.activity);
 if(current?.elapsed>0&&current.choice.startedAt!==last){last=current.choice.startedAt;const entry={activity:current.choice.id,target:current.choice.targetId,position:cook.root.position.toArray(),frame:frames};report.activities.push(entry);console.log('ARRIVED',JSON.stringify(entry));}
}
if(!recallOnly){assert(completed.size>=3,'original cook reaches and completes multiple different activities: '+JSON.stringify(detail()));
assert(report.activities.some(a=>a.activity==='garden'));assert(report.activities.some(a=>a.activity==='read'));assert(report.activities.some(a=>a.activity==='rest'));
assert.equal(r.franceTea.state().staffOwnership.controller,'france-salon');assert.equal(r.franceTea.state().order.stage,'receiving');assert(r.franceTea.state().history.some(e=>e.event==='ticket'));mark('Original Camille walks, reads and rests at reachable places while original Manon brings the guest order');}
until(()=>r.franceTea.state().offDuty.cook&&cook.root.position.distanceTo(new three.namespace.Vector3(-6.95,.258,-10.55))>3,'away before handover');
request('end-shift',()=>r.francePastryEmployment.state().job.stage==='ready','original cook physically returns for explicit handover');
assert.equal(r.franceTea.state().offDuty.cook,null);assert.equal(r.franceTea.state().cookOwnership.controller,'france-bakery');assert([null,'france-bakery'].includes(r.franceTea.state().cookOwnership.taskOwner));assert.equal(r.copperLedger.state().balances.france.bank,0);mark('Requested handover physically returns original cook and restores sole original task ownership without phantom pay');
report.status='PASS';report.frames=frames;report.completed=[...completed];report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
`;
harness=harness.slice(0,begin)+body;new vm.Script(harness,{filename:'france-tea-staff-life-main-harness.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
