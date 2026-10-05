// One real-main tavern meal and the affected staff responsibilities. The
// simulated DOM/renderer runs production actors, navigation, furniture and props.
// Optional Mesa frames use the same main scene and normal player camera.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
const extras=`
export function tavernStaffReview(){return {player,lot,camera,scene,sun,lighting,npcs,furniture,navOptions,chinaTavern,chinaTavernUI,chinaService:typeof chinaService==='undefined'?null:chinaService,chinaLabor,formalCareers,simulationClock,copperLedger,careerHandbook,npcSocial,saved};}
export function tavernStaffStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();careerHandbook.update(mode);}
export function tavernStaffView(a,p=.20){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);}
export {requestStationIntent,requestFurniture,navigateTo,configureStableShadows,blocked,cancelAction};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now(),T=three.namespace,checks=[],record=(label,details={})=>{checks.push({label,...details});console.log('PASS',label);};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.tavernStaffReview(),meal=r.chinaTavern;
assert(meal,'actual main owns meal service');
const actor=id=>r.npcs.find(n=>n.station.id===id),host=actor(meal.dish.host),cook=actor(meal.dish.cook),assistant=actor(meal.dish.assistant),staff=[host,cook,assistant];
assert.equal(meal.dish.assistant,'cn-tavern-assistant');assert(assistant,'Lu Qing exists as a real scene actor');assert.equal(assistant.station.npcName,'陆青');assert(staff.every(n=>(n.station.ageYears||n.station.age)>=18));
const identity=JSON.stringify(state().playerLook),hostHome=new T.Vector3(...meal.dish.points.host);
const frame=(n=1)=>{for(let i=0;i<n;i++){
 const before=staff.map(n=>n.root.position.clone());now+=100;main.namespace.tavernStaffStep(.1);
 assert(Date.now()-started<170000,'focused scene time bound');assert(process.memoryUsage().rss<1.2*1024**3,'focused scene memory bound');
 for(let j=0;j<staff.length;j++){const n=staff[j];assert(before[j].distanceTo(n.root.position)<.40,'continuous staff movement '+n.station.id);assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'staff stays outside static furniture '+n.station.id+' '+n.root.position.toArray());}
 const s=meal.state();assert.equal(s.failures.length,0,'meal route failure '+JSON.stringify(s.failures));assert(s.props.trayCount<=1&&s.props.bowlCount<=1,'one physical player dish');assert.notEqual(s.order?.holder,'host','shopkeeper never carries tray');
}};
const until=(pred,label,max=1400)=>{let steps=0;while(steps<max&&!pred()){frame();steps++;}assert(pred(),label+' '+JSON.stringify({game:{player:state().player,seated:state().seated,path:state().pathLength,pending:state().pendingInteraction},meal:meal.state()}));record(label,{steps});};
let renderer=null,canvas=null;
const capture=name=>{if(!renderer)return;main.namespace.tavernStaffView(1.0,.25);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync('qa/china-tavern-staff/'+name+'.png',canvas.toBuffer('image/png'));};
if(process.env.TAVERN_STAFF_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,700);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,700,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=1100/700;r.camera.updateProjectionMatrix();fs.mkdirSync('qa/china-tavern-staff',{recursive:true});
}
const seat=meal.seats.find(s=>s.id==='china-tavern-dining-18.1--1');assert(seat);
// Use the production station intent from the normal China arrival position.
assert(main.namespace.requestStationIntent(r.chinaTavernUI.intent(seat.id)));
until(()=>!!meal.state().order,'normal main route seats player and requests one meal');
const order=meal.state().order;assert.equal(state().seated,seat.id);assert.equal(order.seatId,seat.id);assert.equal(meal.requestMeal(),false,'duplicate order rejected');
until(()=>meal.state().order?.stage==='preparing','Xu An physically accepts the table order and reports it to Shen He');
assert(meal.state().history.some(h=>h.event==='accepted-at-table'&&h.orderId===order.id));assert(meal.state().history.some(h=>h.event==='cook-received-order'&&h.from===host.station.id&&h.to===cook.station.id));
until(()=>meal.state().order?.stage==='carrying','Lu Qing picks up the cook’s same physical tray');
const carried=meal.state(),dish=carried.order.mealId;assert.equal(carried.order.holder,'assistant');assert.equal(carried.props.mealId,dish);assert(carried.history.some(h=>h.event==='tray-received'&&h.mealId===dish&&h.to===assistant.station.id));
assert(host.root.position.distanceTo(hostHome)<.20,'host is back at the register during delivery');
until(()=>meal.state().order?.stage==='ready','Lu Qing delivers to the originally claimed table');frame(2);capture('01-delivered-table');
assert.equal(meal.state().order.seatId,seat.id);assert.equal(meal.state().props.mealId,dish);assert.equal(meal.state().order.holder,'table');
assert(meal.eat());assert.equal(meal.eat(),false,'repeat eat rejected');frame(2);
const hand=r.player.root.userData.hands[0].getWorldPosition(new T.Vector3());assert(hand.distanceTo(new T.Vector3(...meal.state().props.bowlPosition))<.11,'same bowl follows player palm');capture('02-eating-same-bowl');
until(()=>meal.state().order?.stage==='return','Lu Qing clears the same used dish');assert.equal(meal.state().order.holder,'assistant');assert(!meal.state().props.foodVisible);
until(()=>!meal.state().order,'Lu Qing returns and washes the same dish');
const completed=meal.state();assert.equal(completed.props.trayCount,0);assert.equal(completed.props.bowlCount,0);for(const event of['dish-prepared','dish-on-pass','tray-received','delivered','table-cleared','washed','complete'])assert(completed.history.some(h=>h.event===event&&h.mealId===dish),'same-dish event '+event);
assert.equal(JSON.stringify(state().playerLook),identity,'player identity unchanged');record('one physical meal keeps host, cook, assistant and table responsibilities distinct');
renderer?.dispose();canvas?.dispose();ids['return-world'].onclick();assert.equal(meal.state().props.bowlCount,0);assert.equal(state().characterResources.activeReferences,0);record('region exit releases the three staff actors and meal props');
console.log(JSON.stringify({status:'PASS',scope:'One China natural-main meal; production actors/routes/props with simulated DOM and renderer; optional Mesa is not browser QA',checks,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-staff-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
