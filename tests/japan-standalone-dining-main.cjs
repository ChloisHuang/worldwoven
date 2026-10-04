// Narrow JP04 scene check through the complete production main module.
// DOM is simulated; optional normal gameplay frames use actual Three/Mesa.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner','One actual-region scene at a time');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const additions="\nexport function diningReview(){return {player,npcs,lot,furniture,camera,scene,sun,copperLedger,japanService,japanPlayerService,japanServiceUI,navOptions};} export function diningStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);japanServiceUI?.update();lotAnimationTime+=dt;lot.update?.(dt,lotAnimationTime);} export function diningView(a,p=.16){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export {navigateTo,configureStableShadows};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
harness=harness.replace("const document={body:new E('body')","const document={head:new E('head'),body:new E('body')");
harness=harness.replace('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const out=process.env.DINING_OUT||'/tmp/worldwoven-jp04',report={status:'RUNNING',checks:[],frames:[]};fs.mkdirSync(out,{recursive:true});
const record=label=>{report.checks.push(label);console.log(label);fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));};
// Source-backed wages from the existing Chinese labor state machine, without
// constructing China or mutating a saved balance by hand.
const laborModule=mod(root+'/game/china-tavern-labor.js');if(laborModule.status==='unlinked')await laborModule.link(linker);if(laborModule.status==='linked')await laborModule.evaluate();
const T=three.namespace,wallet=main.namespace.diningReview().copperLedger,laborActor={root:{position:new T.Vector3(),rotation:{y:0}}},host={root:{position:new T.Vector3(24.1,.215,11.4)},station:{npcPosition:[24.1,.215,11.4]}};
const labor=laborModule.namespace.createChinaTavernLabor({getPlayer:()=>laborActor,host,copperLedger:wallet,document:null});
for(let j=0;j<3;j++){laborActor.root.position.set(22.35,.215,11.7);assert(labor.accept());for(const p of [[19.3,.215,18.1],[22.7,.215,18.1]]){laborActor.root.position.set(...p);assert(labor.startCleaning());for(let i=0;i<51;i++)labor.update(.1);}laborActor.root.position.set(22.35,.215,11.7);assert(labor.claim());}labor.dispose();assert.equal(wallet.state().cash,36);
all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();assert.equal(state().region,'japan');
let review=main.namespace.diningReview();assert.equal(review.lot.stations.length,14);const residentIds=review.npcs.map(n=>n.station.id),identity=JSON.stringify(state().savedOutfit);
const seats=review.furniture.items.filter(s=>s.diningKind);assert.equal(seats.length,7,JSON.stringify(review.furniture.state().rejectedSeats));
for(const seat of seats)assert(review.furniture.canSit(review.navOptions,[],seat),'Authored stool has a real clear transfer: '+seat.id);
let activeVisit=null,working=new Set(),served=new Set(),renderer,canvas;
const frame=(count=1)=>{for(let i=0;i<count;i++){now+=100;main.namespace.diningStep(.1);const s=review.japanService.state();for(const n of review.npcs){const task=n.serviceTask;if(task?.arrived&&task.orderJobId===activeVisit+':cook'){assert(['sushi','ramen'].includes(n.getPoseMetrics().action));working.add(activeVisit);}}for(const e of s.history)if(e.event==='serve')served.add(e.visit);if(s.failures.some(e=>e.actor==='jp-sushi'||e.actor==='jp-ramen'))throw Error('Kitchen route failure '+JSON.stringify(s.failures));}};
const until=(test,max=2200)=>{for(let i=0;i<max;i++){frame();if(test())return;}throw Error('JP04 stalled '+JSON.stringify({state:state().japanPlayerService,player:state().player,actors:review.japanService.state().actors,failures:review.japanService.state().failures,path:state().pathLength,nearest:state().nearest,pending:state().pendingInteraction}));};
const key=code=>events.keydown({code,repeat:false,preventDefault(){}}),find=(e,p)=>p(e)?e:e.children?.map(x=>find(x,p)).find(Boolean),dialog=()=>find(document.body,e=>e.tagName==='dialog'&&e.className==='jp-service-dialog'),primary=()=>find(dialog(),e=>e.className==='jp-service-primary');
const travel=p=>{main.namespace.navigateTo(new T.Vector3(...p));until(()=>state().pathLength===0);frame();};
const meal=()=>review.japanPlayerService.state();
async function setupRender(){if(process.env.DINING_MESA!=='1')return;const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,760);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,760,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,review.sun);review.camera.aspect=1100/760;review.camera.updateProjectionMatrix();}
function capture(name,angle=-.2){if(!renderer)return;main.namespace.diningView(angle,.12);review.scene.updateMatrixWorld(true);renderer.render(review.scene,review.camera);const gl=renderer.getContext();gl.finish();assert.equal(gl.getError(),0);fs.writeFileSync(out+'/'+name+'.png',canvas.toBuffer('image/png'));report.frames.push({name,camera:review.camera.position.toArray(),player:review.player.root.position.toArray(),fov:review.camera.fov,renderer:gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)});}
await setupRender();
try{
 for(const dish of (process.env.DINING_FRAME_ONLY?['sushi']:['sushi','ramen'])){
  // The ordinary activity-list route now leads to the actual menu entrance.
  const station=review.lot.stations.find(s=>s.id==='jp-'+dish),row=ids['station-list'].children.find(e=>e.children.some(c=>c.children?.some(t=>t.textContent===station.action)));
  if(row)row.onclick();else main.namespace.navigateTo(new T.Vector3(...station.position));until(()=>state().pathLength===0);frame(2);assert.equal(state().nearest,'jp-dining-'+dish);key('KeyE');assert(dialog().open);assert(primary().textContent.includes('确认预留'));const before=wallet.state().cash;
  primary().onclick();activeVisit=meal().visit.id;assert.equal(meal().visit.orderKind,'dining');assert.equal(meal().visit.tokenId,null);assert.equal(meal().visit.mixtureId,null);assert.equal(wallet.state().cash,before-(dish==='sushi'?8:6));
  until(()=>!!state().seated);assert.equal(review.furniture.items.find(s=>s.id===state().seated).diningKind,dish);until(()=>meal().visit?.stage==='meal-ready');assert(working.has(activeVisit));assert(served.has(activeVisit));frame(2);capture(dish+'-delivered-tps',dish==='sushi'?.1:-.28);
  if(dish==='sushi')key('KeyE');else ids['touch-action'].onclick();assert.equal(meal().visit.stage,'eating');frame(process.env.DINING_FRAME_ONLY?30:8);capture(dish+'-eating-tps',process.env.DINING_FRAME_ONLY?1.1:dish==='sushi'?.7:-.6);until(()=>!meal().visit,100);assert.equal(wallet.reservations().find(h=>h.id===review.japanService.state().diningReceipts.at(-1).paymentId).status,'settled');
  record(dish+': one confirmation -> actual kitchen work -> real walking delivery -> E/touch eating, with no bath token');
  key('KeyW');frame(3);events.keyup({code:'KeyW'});assert.equal(state().seated,null);
 }
 if(process.env.DINING_FRAME_ONLY){ids['return-world'].onclick();report.status='PASS';report.scope='One sushi meal, same already-passed main flow, normal TPS seated eating recapture after server steps away. Simulated DOM and actual Three/Mesa pixels.';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;return;}
 travel([-6,0,-.25]);key('KeyE');const beforeCancel=wallet.state().cash;primary().onclick();activeVisit=meal().visit.id;until(()=>review.japanService.state().claims.some(j=>j.visitId===activeVisit));review.japanServiceUI.open();find(dialog(),e=>e.textContent==='取消本餐').onclick();frame(2);assert.equal(meal().visit,null);assert.equal(wallet.state().cash,beforeCancel);assert(!review.japanService.state().claims.some(j=>j.visitId===activeVisit));record('Cancel releases only the pending player meal and refunds its hold; resident/customer work remains');
 // Fresh pending order then production leave/disposal; restore its saved board
 // and shared ledger below without constructing a second actual-region scene.
 travel([4.1,0,5.7]);key('KeyE');const beforeLeave=wallet.state().cash;primary().onclick();const pending=meal().visit;assert(pending);ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);assert.equal(wallet.state().cash,beforeLeave);assert.equal(wallet.reservations().find(h=>h.id===pending.paymentId).status,'refunded');assert.equal(state().japanPlayerService,null);record('Production leave/disposal refunds only the pending Japanese meal and releases scene actors');
 assert.equal(JSON.stringify(state().savedOutfit),identity);report.status='PASS';report.scope='One real Japanese scene and all 14 original residents; full production main, input, navigation, one scheduler, independent paid sushi/ramen and cancel/dispose. Simulated DOM, actual optional Three/Mesa TPS pixels; no browser or iOS claim.';report.residentIds=residentIds;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;
}finally{renderer?.dispose();canvas?.dispose();fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
return;
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
new vm.Script(harness,{filename:'tests/japan-standalone-dining-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename:__filename});
