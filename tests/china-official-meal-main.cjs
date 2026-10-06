// One bounded pair of existing low-funds guests in production main.
// Real actors, shared navigation, doors and facility claims; simulated DOM and
// renderer. This verifies movement/ownership, not browser or iOS presentation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
const extras=`
export function tavernStaffReview(){return {player,lot,camera,scene,sun,lighting,npcs,furniture,navOptions,chinaTavern,chinaTavernUI,chinaService:typeof chinaService==='undefined'?null:chinaService,chinaLabor,formalCareers,simulationClock,copperLedger,dailyNeeds,chinaAudience,chinaOfficialEconomy,chinaMoneyHouse,careerHandbook,npcSocial,saved};}
export function tavernStaffStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaTavernUI?.update();careerHandbook.update(mode);}
export function tavernStaffView(a,p=.20){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);}
export {requestStationIntent,requestFurniture,navigateTo,configureStableShadows,blocked,cancelAction,planPath};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
replaceOnce('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=String.raw`
const prior=JSON.parse(storage['worlds-days-v1']);prior.appearance.seed=42;prior.simulationClock={version:1,seconds:300};
prior.chinaAudience={day:0,calledDay:0,outcome:'completed',life:{duties:{'cn-minister-works':{day:0,stage:'awaiting-archive'}}}};
prior.dailyNeeds={version:2,people:{'cn-minister-works':{foodAge:24*60/.7,foodBalanceOffset:0,toiletAge:0,receipts:{}}}};
storage['worlds-days-v1']=JSON.stringify(prior);
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now(),copy=x=>JSON.parse(JSON.stringify(x));
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const id='cn-minister-works';let r=main.namespace.tavernStaffReview(),scene=r.chinaTavern.staffScene,official=r.npcs.find(n=>n.station.id===id),original=official;
const beforeActors=r.npcs.map(n=>n.station.id),clock=copy(r.simulationClock.snapshot()),initial=r.chinaOfficialEconomy.snapshot();assert.equal(initial.governmentPaid,0);assert.equal(initial.accounts[id].bank,0);assert.equal(initial.funding,'government-guaranteed');
// Start from one recorded completed real court boundary. This run verifies only
// the changed archive/payment/meal continuation, not the unchanged whole court.
let steps=0,orderId=null,frameTaken=false,renderer=null,canvas=null;
if(process.env.OFFICIAL_MEAL_MESA==='1'){
 const T=three.namespace,W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,700);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,700,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=1100/700;r.camera.updateProjectionMatrix();fs.mkdirSync('qa/china-official-meal',{recursive:true});
}
const progress=()=>({step:steps,economy:{governmentPaid:r.chinaOfficialEconomy.state().governmentPaid,account:r.chinaOfficialEconomy.account(id)},official:r.chinaAudience.state().life.actors.find(a=>a.id===id),lease:scene.officialMeal(id),orders:scene.state().orders.map(o=>({id:o.id,customerId:o.customerId,stage:o.stage,holder:o.holder})),actor:scene.state().actors.find(a=>a.id===id),failures:scene.state().failures});
function frame(){const p=official.root.position.clone(),mounted=!!official.serviceMount||!!r.chinaAudience.mountForActor(official);now+=100;main.namespace.tavernStaffStep(.1);steps++;const lease=scene.officialMeal(id);if(lease)orderId=lease.orderId;
 assert.equal(r.npcs.find(n=>n.station.id===id),original);assert.deepEqual(r.npcs.map(n=>n.station.id),beforeActors);if(!mounted&&!official.serviceMount&&!r.chinaAudience.mountForActor(official))assert(p.distanceTo(official.root.position)<.4,'same actor moves continuously');if(!official.serviceMount&&!r.chinaAudience.mountForActor(official)&&steps%12===0)assert(!main.namespace.blocked(official.root.position.x,official.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:official.root.position.y}),'shared route stays outside static solids');
 const order=orderId&&scene.state().orders.find(o=>o.id===orderId);if(order?.stage==='eating'&&!frameTaken&&(scene.continuitySnapshot().phases.find(([key])=>key===orderId)?.[1]||0)>=1.5){frameTaken=true;assert.equal(order.customerId,id);assert.equal(order.mealId,order.id+'-dish');assert(order.collected);assert.equal(r.chinaOfficialEconomy.account(id).cash,0);assert.equal(r.chinaOfficialEconomy.account(id).bank,18);assert(official.serviceMount);assert(scene.owns(official));
  if(renderer){for(const [name,p,yaw]of [['official-paid-meal',[21,.215,18.2],1.57]]){assert(!main.namespace.blocked(p[0],p[2],r.lot.colliders,.34,{...r.navOptions,y:p[1]}),'legal normal camera observer');r.player.root.position.set(...p);main.namespace.tavernStaffView(yaw,.24);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync('qa/china-official-meal/'+name+'.png',canvas.toBuffer('image/png'));}}
  const midBalance=copy(r.chinaOfficialEconomy.snapshot()),seatId=official.serviceMount.id;ids['return-world'].onclick();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();r=main.namespace.tavernStaffReview();scene=r.chinaTavern.staffScene;official=r.npcs.find(n=>n.station.id===id);original=official;assert.equal(scene.officialMeal(id)?.orderId,orderId,'same paid order survives active country return');assert.equal(official.serviceMount?.id,seatId,'official life cannot erase the tavern seat restored by continuity');assert.deepEqual(copy(r.chinaOfficialEconomy.snapshot()),midBalance,'midmeal restore never charges or injects again');

 }
 if(steps%200===0)console.log('PROGRESS',JSON.stringify(progress()));
}
for(;steps<6200&&!(orderId&&scene.snapshot().orders.find(o=>o.id===orderId)?.consumed&&!scene.officialMeal(id));)frame();
assert.equal(r.chinaOfficialEconomy.history().filter(t=>t.action==='withdraw').length,0,'NPC restaurant payment never creates a bank trip or cash withdrawal');assert(orderId&&frameTaken,'real official paid dish reaches his own hand '+JSON.stringify(progress()));assert(scene.snapshot().orders.find(o=>o.id===orderId)?.consumed,'meal completes '+JSON.stringify(progress()));assert(!scene.officialMeal(id));assert(!scene.owns(official));assert(!r.dailyNeeds.status(id).seekMeal);assert.equal(r.chinaOfficialEconomy.history().filter(t=>t.action==='duty').length,1);assert.equal(r.chinaOfficialEconomy.state().governmentPaid,24);assert.equal(r.chinaOfficialEconomy.state().destinations['cn-yunlai-tavern'],6);assert.equal(scene.state().failures.length,0);
const balance=copy(r.chinaOfficialEconomy.snapshot()),afterNeeds=copy(r.dailyNeeds.snapshot());ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();const again=main.namespace.tavernStaffReview();assert.deepEqual(copy(again.chinaOfficialEconomy.snapshot()),balance,'region transition never reinjects fiscal origin or replays wages');assert.equal(again.dailyNeeds.hunger(id),r.dailyNeeds.hunger(id));
renderer?.dispose();canvas?.dispose();ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
console.log(JSON.stringify({status:'PASS',scope:'One real main archive->combined NPC funds->original kitchen order->paid meal->same official resumed, active meal seat/receipt return and region persistence; simulated DOM'+(frameTaken&&process.env.OFFICIAL_MEAL_MESA==='1'?' + actual Three/Mesa normal player camera':'/renderer')+', not browser/iOS',steps,seconds:(Date.now()-started)/1000,orderId,governmentPaid:balance.governmentPaid,account:balance.accounts[id],image:process.env.OFFICIAL_MEAL_MESA==='1'?'qa/china-official-meal/official-paid-meal.png':null}));

`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-official-meal-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
