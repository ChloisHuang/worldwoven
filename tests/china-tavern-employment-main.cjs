// One affected China scene: a visible counter, actual one-click application,
// shared navigation, two physical tables, receipt and reversible employment.
// Simulated DOM; optional real Three/Mesa frame is not browser/iOS CSS evidence.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras="\nexport function employmentReview(){return {player,lot,camera,scene,sun,lighting,npcs,chinaLabor,chinaTavern,copperLedger,npcSocial};} export function employmentStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export function employmentView(a,p=.18){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export {navigateTo,requestStationIntent,configureStableShadows,nearbyInteractionClear};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now(),checks=[],T=three.namespace,record=s=>{checks.push(s);console.log('PASS',s)};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.employmentReview(),labor=r.chinaLabor,employment=labor.employment,wallet=r.copperLedger;
const identity=JSON.stringify(state().playerLook),npcCount=state().npcCount;
const frame=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.employmentStep(.1);assert(Date.now()-started<170000);assert(process.memoryUsage().rss<1.2*1024**3);}};
const until=(pred,label,max=800)=>{for(let i=0;i<max;i++){if(pred())return;frame();}throw Error(label+' '+JSON.stringify({labor:labor.state(),player:state().player,pending:state().pendingInteraction,path:state().pathLength,toast:ids.toast.textContent}));};
const walk=p=>{main.namespace.navigateTo(new T.Vector3(...p));until(()=>!state().pathLength,'independent walk');frame(2);};
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),dialog=()=>find(document.body,e=>e.className==='cn-labor-dialog'),button=text=>{const b=find(dialog(),e=>e.tagName==='button'&&e.textContent===text);assert(b,text);assert(!b.disabled,text);return b;};
const key=c=>events.keydown({code:c,repeat:false,preventDefault(){}}),up=c=>events.keyup({code:c});
// Test setup starts near the real reception; all interactions and work travel
// below use the production UI/controller, doors and pathfinder.
r.player.root.position.set(22.35,.215,13.3);frame(2);
assert(!employment.isHired());assert(!labor.accept());assert.equal(wallet.state().cash,0);
labor.open();assert(labor.isOpen());const apply=button('申请酒楼帮工');apply.onclick();const length=state().pathLength;assert(length>0);apply.onclick();assert.equal(state().pathLength,length);
// Cancelling an approach does not apply at a distance.
key('Escape');assert.equal(state().pendingInteraction,null);frame(2);assert(!employment.isHired());
labor.open();button('申请酒楼帮工').onclick();until(()=>employment.isHired(),'application on arrival');assert.equal(employment.state().revision,1);assert.equal(wallet.state().cash,0);apply.onclick();assert.equal(employment.state().revision,1);record('one-click application walks to Xu An once; cancelled/stale choices cannot register');
assert.equal(JSON.parse(storage['worlds-days-v1']).chinaEmployment.roleId,'cn-tavern-helper');
// Normal TPS frame of the actual counter and physical sign/book.
if(process.env.TAVERN_JOB_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});const canvas=W.createCanvas(1100,700),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,700,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=1100/700;r.camera.updateProjectionMatrix();main.namespace.employmentView(-.95,.18);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.mkdirSync('qa/china-tavern-employment',{recursive:true});fs.writeFileSync('qa/china-tavern-employment/01-hiring-counter.png',canvas.toBuffer('image/png'));renderer.dispose();canvas.dispose();record('normal 4.6m TPS sign and registration book captured');
}
// Failed main storage leaves the previously persisted role in place.
const save=context.localStorage.setItem;context.localStorage.setItem=()=>{throw Error('quota')};assert(!employment.resign());assert(employment.isHired());context.localStorage.setItem=save;
labor.open();button('接下擦桌活').onclick();assert(labor.active());assert(!r.chinaTavern.requestMeal());assert(!employment.resign());record('durable identity gates new work and cannot be removed with a live contract');
// First table: click its actual action in the daybook and let arrival execute.
const firstIntent=labor.intent();assert.equal(firstIntent.kind,'clean');assert(main.namespace.requestStationIntent(firstIntent));assert(main.namespace.requestStationIntent(firstIntent));until(()=>labor.view().cleaning,'first table automatic start');frame(10);assert.equal(labor.playerAction(),'tidy');key('KeyD');frame();up('KeyD');assert(!labor.view().cleaning);assert.equal(labor.view().job.completedTables,0);
assert(main.namespace.requestStationIntent(labor.intent()));until(()=>labor.view().job.completedTables===1,'first real table complete');assert.equal(wallet.state().cash,0);assert(!main.namespace.requestStationIntent(firstIntent));
// Second table: independently walk near its legal work side and use E.
const second=labor.view().target.position;walk([second[0],second[1],second[2]+.10]);frame();assert(ids['interact-button'].textContent.includes('擦拭'));key('KeyE');until(()=>labor.view().job.stage==='ready','manual second real table complete');assert.equal(wallet.state().cash,0);assert(!employment.resign());record('auto-arrival and manual E share table work; interrupted cleaning restarts and only two completed tables earn a receipt');
const claim=labor.intent();assert(main.namespace.requestStationIntent(claim));until(()=>wallet.state().cash===12&&!labor.active(),'one-click real-host wage');assert(!main.namespace.requestStationIntent(claim));assert(!labor.claim());assert.equal(wallet.history().filter(x=>x.action==='earn').length,1);record('one durable 12-copper wage after returning to available Xu An; stale claim cannot pay twice');
labor.open();button('办理离职').onclick();assert(!employment.isHired());assert(!labor.accept());labor.open();button('申请酒楼帮工').onclick();assert(employment.isHired());assert.equal(wallet.state().cash,12);assert.equal(npcCount,state().npcCount);assert.equal(JSON.stringify(state().playerLook),identity);record('leave and reapply preserve wallet, NPC count and player identity');
// Re-enter uses the same formal gameStorage and role; no main/model modifications.
ids['return-world'].onclick();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();const restored=main.namespace.employmentReview();assert(restored.chinaLabor.employment.isHired());assert.equal(restored.copperLedger.state().cash,12);assert.equal(restored.chinaLabor.state().job,null);ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);record('role and settled wallet survive region re-entry');
console.log(JSON.stringify({status:'PASS',checks,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'China counter and labor only; simulated DOM plus optional Mesa, no browser/iOS claim'}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-employment-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
