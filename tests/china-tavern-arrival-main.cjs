// Regression for accepting tavern work but remaining idle at reception.
// One physical scene covers registration, auto-start, manual E and paid receipt.
// Simulated DOM; optional real Three/Mesa frame is not browser/iOS CSS evidence.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras="\nexport function employmentReview(){return {player,lot,camera,scene,sun,lighting,npcs,chinaLabor,chinaTavern,chinaTavernUI,copperLedger,npcSocial,careerHandbook,formalCareers,navOptions};} export function employmentStep(dt){beginActorNavigationStep(dt);elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI.update();careerHandbook.update(mode);} export function employmentView(a,p=.18){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export {navigateTo,requestStationIntent,configureStableShadows,nearbyInteractionClear};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now(),checks=[],T=three.namespace,record=s=>{checks.push(s);console.log('PASS',s)};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.employmentReview(),labor=r.chinaLabor,employment=labor.employment;
const frame=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.employmentStep(.1);assert(Date.now()-started<170000);assert(process.memoryUsage().rss<1.2*1024**3);}};
const until=(pred,label,max=900)=>{for(let i=0;i<max;i++){if(pred())return;frame();}throw Error(label+' '+JSON.stringify({labor:labor.state(),player:state().player,pending:state().pendingInteraction,path:state().pathLength,toast:ids.toast.textContent,tavern:r.chinaTavern.state()}));};
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),dialog=()=>find(document.body,e=>e.className==='cn-labor-dialog'),button=text=>{const b=find(dialog(),e=>e.tagName==='button'&&e.textContent===text);assert(b,text);assert(!b.disabled,text);return b;};
const key=c=>events.keydown({code:c,repeat:false,preventDefault(){}});
// Start outside the real public door. Every subsequent arrival uses main's
// production intent, route, doors, collision and employment controller.
r.player.root.position.set(14.8,.215,13.4);frame(2);
const nav=cache.get(root+'/game/navigation.js').namespace;
for(const point of [labor.intent().position,r.chinaTavern.dish.points.host,r.chinaTavern.dish.points.prep])assert(!nav.blocked(point[0],point[2],r.lot.colliders,.34,{...r.navOptions,y:point[1]}),'legal floor position '+point);
const view=ids['station-list'].children.find(e=>e.dataset.stationId==='cn-tavern-labor-view');assert(view);view.onclick();until(()=>labor.isOpen(),'registry arrival opens local work panel');
button('申请酒楼帮工').onclick();until(()=>employment.isHired(),'temporary registration');frame(2);
assert(!r.formalCareers.state().tenure);assert(!labor.active());
console.log('OBSERVATION',JSON.stringify({player:state().player,temporaryRole:employment.state().roleId,formalRole:r.formalCareers.state().tenure?.roleId||null,hostAvailable:labor.view().hostAvailable,tavern:r.chinaTavern.state(),actors:r.npcs.filter(n=>n.station.id==='cn-tavern-host'||n.station.id==='cn-tavern-cook').map(n=>({id:n.station.id,name:n.station.npcName,clothes:n.root.userData.appearance.clothes,bodyPreset:n.root.userData.appearance.bodyPreset,position:n.root.position.toArray(),yaw:n.root.rotation.y})),pending:state().pendingInteraction,path:state().pathLength}));
if(labor.isOpen())button('接下擦桌活').onclick();else ids['interact-button'].onclick();
assert(labor.active(),'explicit work acceptance starts a real slip');
assert.equal(state().pendingInteraction,'cn-tavern-labor-clean','accepted work must continue to its physical first table');
until(()=>labor.view().cleaning,'automatic first-table arrival starts work');frame(2);
assert.equal(state().pendingInteraction,null);assert.equal(labor.playerAction(),'tidy');
assert(!all.some(e=>e.className==='cn-labor-badge'&&!e.hidden),'no extra labor action badge');
assert.equal(ids['touch-action'].hidden,true,'one shared labor action control on touch');
until(()=>labor.view().job.completedTables===1,'first table completes');
record('explicit temporary registration stays distinct from formal tenure; accept continues to the real first table and starts physical work');
// Manual approach and E use the same next-table intent. Work is not granted by
// position, idle elapsed time, or a separate UI callback.
const second=labor.intent();main.namespace.navigateTo(new T.Vector3(...second.position));until(()=>!state().pathLength,'manual next-table approach');frame(2);assert(!labor.view().cleaning);key('KeyE');until(()=>labor.view().job.stage==='ready','manual E completes second table');
assert.equal(r.copperLedger.state().bank,0);assert(main.namespace.requestStationIntent(labor.intent()));until(()=>!labor.active(),'return to real host and inspect');assert.equal(r.copperLedger.state().bank,12);assert.equal(r.copperLedger.state().cash,0);
record('manual E and automatic work share real tables; completion pays only once to bank after host inspection');
// A failed formal application must remain unappointed; this routes through the
// real local registration intent and current catalogue eligibility.
assert(main.namespace.requestStationIntent(labor.intent('formal-view')));assert(r.careerHandbook.isOpen());const career=find(document.body,e=>e.className==='career-dialog');const unavailable=find(career,e=>e.tagName==='button'&&e.textContent==='条件不足 · 暂不可申请');assert(unavailable?.disabled);assert(!r.formalCareers.state().tenure);r.careerHandbook.close();
record('formal registry retains eligibility checks after temporary work; no automatic appointment or unrelated charges');
if(process.env.TAVERN_JOB_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});const canvas=W.createCanvas(844,390),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(844,390,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=844/390;r.camera.updateProjectionMatrix();main.namespace.employmentView(-.95,.18);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.mkdirSync('qa/china-tavern-arrival',{recursive:true});fs.writeFileSync('qa/china-tavern-arrival/01-legal-counter-view.png',canvas.toBuffer('image/png'));renderer.dispose();canvas.dispose();record('normal phone-aspect TPS counter frame captured with real Three/Mesa; simulated DOM, not browser/iOS');
}
ids['return-world'].onclick();console.log(JSON.stringify({status:'PASS',checks,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'One China tavern scene, production main with simulated phone DOM and optional Mesa'}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-employment-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
