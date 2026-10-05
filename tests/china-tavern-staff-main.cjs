// One real-main tavern meal and the affected staff responsibilities. The
// simulated DOM/renderer runs production actors, navigation, furniture and props.
// Optional Mesa frames use the same main scene and normal player camera.
// TAVERN_STAFF_SHIFT=1 selects the explicit assistant handover, wrong dish,
// correction and early-wage chain; the default is a price-confirmed customer meal.
// TAVERN_STAFF_PASS_FRAME=1 with both SHIFT and MESA stops at two genuine dishes
// on the pass, after one normal player-view frame, without repeating the shift.
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
export {requestStationIntent,requestFurniture,navigateTo,configureStableShadows,blocked,cancelAction,planPath};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
// Seed only the already-tested admission skill through its production learning
// API. Registration, hiring, shift start and every actor route still run in main.
const admissionSeed=String.raw`
if(process.env.TAVERN_STAFF_SHIFT==='1'){
 const prior=JSON.parse(storage['worlds-days-v1']),core=mod(path.join(root,'game/formal-careers.js')),fixtureSeconds=1440/.7;
 prior.appearance.seed=26;prior.simulationClock={version:1,seconds:fixtureSeconds};
 await core.link(linker);await core.evaluate();let learned;
 const seed=core.namespace.createFormalCareers({getClock:()=>({day:1,hour:10,seconds:fixtureSeconds}),saveState:s=>{learned=s;}});
 for(let i=0;i<2;i++){const ticket=seed.learningTicket('cn-rest','ritual-intro');assert(ticket.ok);assert(seed.completeLearning(ticket.ticket,{seconds:8}).ok);}
 prior.formalCareers=learned;storage['worlds-days-v1']=JSON.stringify(prior);
}
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",admissionSeed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now(),T=three.namespace,checks=[],record=(label,details={})=>{checks.push({label,...details});console.log('PASS',label);};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.tavernStaffReview(),meal=r.chinaTavern;
assert(meal,'actual main owns meal service');
const actor=id=>r.npcs.find(n=>n.station.id===id),host=actor(meal.dish.host),cook=actor(meal.dish.cook),assistant=actor(meal.dish.assistant),staff=[host,cook,assistant];
assert.equal(meal.dish.assistant,'cn-tavern-assistant');assert(assistant,'Lu Qing exists as a real scene actor');assert.equal(assistant.station.npcName,'陆青');assert(staff.every(n=>(n.station.ageYears||n.station.age)>=18));
for(const side of['west','east']){const guest=actor('cn-tavern-diner-'+side),p=guest.root.position;assert(!main.namespace.blocked(p.x,p.z,r.lot.colliders,.25,{...r.navOptions,y:p.y}),'guest starts at a legal supported home '+side);}
const identity=JSON.stringify(state().playerLook);
const progress=()=>{const w=meal.staffScene?.state();return {clock:state().simulationClock,player:state().player,path:state().pathLength,pending:state().pendingInteraction,toast:ids.toast.textContent,careerError:r.formalCareers.state().lastError,serviceError:r.chinaService?.state().lastError,meal:meal.state().order,world:w?{stage:w.stage,activity:w.activity,selectedOrderId:w.selectedOrderId,heldTrayId:w.heldTrayId,orders:w.orders.map(o=>({id:o.id,stage:o.stage,table:o.tableId,holder:o.holder})),actors:w.actors.map(a=>({...a,routeLength:actor(a.id)?.route?.length||0})),seats:meal.seats.map(s=>({id:s.id,position:s.position})),visitors:w.visitors,failures:w.failures}:null};};
const frame=(n=1)=>{for(let i=0;i<n;i++){
 const before=staff.map(n=>n.root.position.clone());now+=100;main.namespace.tavernStaffStep(.1);
 if(Date.now()-started>=300000)throw Error('focused scene time bound '+JSON.stringify(progress()));assert(process.memoryUsage().rss<1.2*1024**3,'focused scene memory bound');
 for(let j=0;j<staff.length;j++){const n=staff[j];assert(before[j].distanceTo(n.root.position)<.40,'continuous staff movement '+n.station.id);assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'staff stays outside static furniture '+n.station.id+' '+n.root.position.toArray());}
 const s=meal.state();assert.equal(s.failures.length,0,'meal route failure '+JSON.stringify(s.failures));assert(s.props.trayCount<=1&&s.props.bowlCount<=1,'one physical player dish');assert.notEqual(s.order?.holder,'host','shopkeeper never carries tray');
}};
const until=(pred,label,max=1400)=>{let steps=0;while(steps<max&&!pred()){frame();steps++;if(steps%200===0)console.log('WAIT',label,JSON.stringify(progress()));}assert(pred(),label+' '+JSON.stringify({progress:progress(),shift:r.chinaService?.state(),duty:r.formalCareers.state().lastDuty}));record(label,{steps});};
let renderer=null,canvas=null;
const capture=(name,yaw=1.0,pitch=.25)=>{if(!renderer)return;main.namespace.tavernStaffView(yaw,pitch);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync('qa/china-tavern-staff/'+name+'.png',canvas.toBuffer('image/png'));};
if(process.env.TAVERN_STAFF_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,700);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,700,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=1100/700;r.camera.updateProjectionMatrix();fs.mkdirSync('qa/china-tavern-staff',{recursive:true});
}
if(process.env.TAVERN_STAFF_SHIFT!=='1'){
const seat=meal.seats.find(s=>s.id==='china-tavern-dining-18.1-1');assert(seat);
assert(r.copperLedger.earn(6,'tavern-main-meal-fixture').ok,'six-copper test fixture uses the real ledger');
// Walk from the normal arrival, then confirm the visible price at the real seat.
main.namespace.requestFurniture(seat);until(()=>state().seated===seat.id,'normal main route reaches the available customer seat');
assert.equal(meal.state().order,null);assert.equal(r.copperLedger.state().cash,6);r.chinaTavernUI.open();assert(r.chinaTavernUI.isOpen());
const confirm=all.slice().reverse().find(e=>e.tagName==='button'&&e.textContent==='确认点餐 · 6文');assert(confirm&&!confirm.disabled,'price is explicit before payment');confirm.onclick();
until(()=>!!meal.state().order,'normal main route seats player and requests one meal');
const order=meal.state().order;assert.equal(state().seated,seat.id);assert.equal(order.seatId,seat.id);assert.equal(meal.requestMeal(),false,'duplicate order rejected');
assert.equal(r.copperLedger.state().cash,0);assert.equal(r.copperLedger.reservations().find(h=>h.id===order.id)?.status,'reserved','one price hold before cooking');
until(()=>meal.state().history.some(h=>h.event==='cook-received-order'&&h.orderId===order.id),'Xu An accepts the real table order and the cook receives its ticket');
assert(meal.state().history.some(h=>h.event==='accepted-at-table'&&h.orderId===order.id));
until(()=>meal.state().order?.stage==='carrying','Lu Qing picks up the cook’s same physical tray');
const carried=meal.state(),dish=carried.order.mealId;assert.equal(carried.order.holder,'assistant');assert.equal(carried.props.mealId,dish);assert(carried.history.some(h=>h.event==='tray-received'&&h.mealId===dish));
until(()=>meal.state().order?.stage==='ready','Lu Qing delivers to the originally claimed table');frame(2);capture('01-delivered-table');
assert.equal(meal.state().order.seatId,seat.id);assert.equal(meal.state().props.mealId,dish);assert.equal(meal.state().order.holder,'table');
assert.equal(r.copperLedger.reservations().find(h=>h.id===order.id)?.status,'settled','delivery settles the original price hold');assert.equal(r.copperLedger.state().cash,0);
assert(meal.eat());assert.equal(meal.eat(),false,'repeat eat rejected');frame(2);
const hand=r.player.root.userData.hands[0].getWorldPosition(new T.Vector3());assert(hand.distanceTo(new T.Vector3(...meal.state().props.bowlPosition))<.11,'same bowl follows player palm');capture('02-eating-same-bowl');
until(()=>meal.state().order?.stage==='return','Lu Qing clears the same used dish');assert.equal(meal.state().order.holder,'assistant');assert(!meal.state().props.foodVisible);
until(()=>!meal.state().order,'Lu Qing returns and washes the same dish');
const completed=meal.state();assert.equal(completed.props.trayCount,0);assert.equal(completed.props.bowlCount,0);for(const event of['dish-prepared','dish-on-pass','tray-received','delivered','table-cleared','washed'])assert(completed.history.some(h=>h.event===event&&h.mealId===dish),'same-dish event '+event);
assert.equal(JSON.stringify(state().playerLook),identity,'player identity unchanged');record('one physical meal keeps host, cook, assistant and table responsibilities distinct');
}else{
 const service=r.chinaService,scene=meal.staffScene,roleId='cn-tavern-steward',careers=r.formalCareers;
 assert(service&&scene,'actual main owns formal service adapter and physical scene');
 const role=service.forRole(roleId),world=()=>scene.state(),job=()=>service.state().job,order=id=>world().orders.find(o=>o.id===id);
 const request=(intent,label)=>{service.close();r.careerHandbook.close();assert(intent,'live intent '+label);assert(main.namespace.requestStationIntent(intent),'route '+label);};
 const choose=(kind,id,pred,label,max=400)=>{
  const choice=scene.choices().find(c=>c.kind===kind&&(id===undefined||c.orderId===id));
  assert(choice,'live task '+kind+' '+JSON.stringify({choices:scene.choices(),world:world()}));
  request(service.intent('task',null,choice),label);let steps=0;while(!pred()&&steps<max&&(state().pathLength||state().pendingInteraction)){frame();steps++;}
  assert(pred(),label+' '+JSON.stringify(progress()));record(label,{steps});return choice;
 };
 assert.equal(careers.state().skills.ritual,2);assert.equal(careers.state().tenure,null);assert.equal(job(),null);
 request(role.intent('formal-apply'),'formal application');until(()=>careers.isHired(roleId)||careers.state().lastError==='interview-rejected','normal arrival route receives a real application decision at Xu An’s register');
 assert(careers.isHired(roleId),'eligible seed26/day1 application is accepted without overriding its outcome '+JSON.stringify(careers.applicationResult()));
 assert.equal(job(),null,'hiring never starts a shift');assert.equal(careers.state().lastDuty,null);assert.equal(world().stage,'finished','ordinary tavern queue continues without a player shift');record('formal admission preserves the explicit separate shift-start choice');
 request(role.intent('accept'),'explicit shift start');until(()=>world().stage==='working','explicit start walks to Lu Qing and completes face-to-face handover');
 assert(world().history.some(h=>h.event==='handover-in'&&h.from===assistant.station.id&&h.to==='player'));
 assert.equal(careers.state().lastDuty.shiftKind,'continuous');assert.equal(job().continuous,true);assert.equal(r.chinaLabor.state().job,null,'formal service does not start the legacy two-table chore');
 until(()=>world().orders.filter(o=>o.stage==='pass').length>=2,'real customers order and pay while Shen He prepares two distinct pass dishes');
 const west=world().orders.find(o=>o.tableId==='west'),east=world().orders.find(o=>o.tableId==='east');assert(west&&east);assert.notEqual(west.dishId,east.dishId);
 assert.equal(world().till,west.price+east.price,'customer payments go to tavern till');assert.equal(r.copperLedger.state().cash,0,'customer revenue never enters player cash');
 choose('choose-order',west.id,()=>world().selectedOrderId===west.id,'player explicitly selects the west-table ticket');
 if(process.env.TAVERN_STAFF_PASS_FRAME==='1'){
  assert(renderer,'short pass frame requires TAVERN_STAFF_MESA=1');service.close();frame(2);capture('06-two-real-dishes-pass-clearance',-.6,.35);
  const evidence={scope:'One actual Three/Mesa normal 4.6m player-view frame of two real queued kitchen dishes; simulated DOM, not browser/iOS',image:'qa/china-tavern-staff/06-two-real-dishes-pass-clearance.png',player:r.player.root.position.toArray(),camera:r.camera.position.toArray(),orders:world().orders.filter(o=>o.stage==='pass').map(o=>({id:o.id,dishId:o.dishId,mealId:o.mealId,props:o.props}))};
  renderer.dispose();canvas.dispose();ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify({status:'PASS',...evidence,seconds:(Date.now()-started)/1000}));return;
 }
 choose('pickup',east.id,()=>world().heldTrayId===east.id,'player can deliberately pick the different noodle tray');
 assert.equal(order(east.id).holder,'assistant');assert.equal(world().selectedOrderId,west.id);assert.equal(scene.beginReturn(),false,'held tray blocks unsafe early handover');
 const beforeError=careers.state().performance;
 choose('deliver',west.id,()=>order(east.id).stage==='wrong','wrong dish reaches the actual west table and stays recoverable');
 const bad=careers.state().lastDuty.customerReviews.find(v=>v.reasonCode==='wrong-dish');assert(bad);assert.equal(bad.customerId,west.customerId);assert.equal(bad.score,-2);assert.equal(careers.state().performance,beforeError-2);assert(order(west.id).reviews.some(v=>v.id===bad.id&&!v.corrected));capture('03-wrong-dish-at-west');
 choose('retrieve',east.id,()=>world().heldTrayId===east.id,'player physically retrieves the wrong noodle tray');
 choose('return-tray',east.id,()=>!world().heldTrayId&&order(east.id).stage==='pass','wrong tray returns to its kitchen pass');
 assert.equal(world().selectedOrderId,west.id,'original guest ticket survives correction');
 choose('pickup',west.id,()=>world().heldTrayId===west.id,'player takes the west-table rice tray');
 choose('deliver',west.id,()=>order(west.id).stage==='eating','correct dish is delivered to the original west guest');
 const reviews=careers.state().lastDuty.customerReviews;assert.equal(reviews.filter(v=>v.reasonCode==='wrong-dish').length,1);assert.equal(reviews.filter(v=>v.reasonCode==='corrected'&&v.correctedReviewId===bad.id).length,1);assert.equal(careers.state().performance,beforeError-1);assert(order(west.id).reviews.every(v=>v.corrected));assert.equal(world().stage,'working','serving the first guests does not finish a continuous shift');capture('04-corrected-west-order');
 const unfinished=world().orders.filter(o=>o.stage!=='done').map(o=>o.id);assert(unfinished.length);assert.equal(world().heldTrayId,null);
 request(service.intent('end-shift'),'safe voluntary handover');until(()=>scene.finished()&&job()?.stage==='inspection','unencumbered player returns the role to Lu Qing before employer inspection');
 assert(world().history.some(h=>h.event==='handover-out'&&h.to===assistant.station.id));assert(unfinished.some(id=>world().orders.some(o=>o.id===id)),'unfinished real orders survive handover');
 const duty=careers.state().lastDuty;assert.equal(duty.stage,'inspection');assert(duty.coveredSeconds>0);assert(duty.coveredSeconds<=duty.endedSeconds-duty.startedSeconds+1e-6);assert(duty.completedTasks>=1);assert(duty.endedHour<18,'this is explicit early handover');
 request(service.intent('claim'),'employer wage inspection');until(()=>!job()&&careers.state().lastDuty.stage==='paid','Xu An settles one prorated wage after physical handover');
 const paid=careers.state().lastDuty,earnedHours=paid.coveredSeconds*.7/60,penalty=-paid.customerReviews.reduce((sum,v)=>sum+v.score,0),expected=Math.max(0,Math.floor(16*Math.min(1,earnedHours/12)+1e-9)-penalty);
 assert.equal(paid.wage,expected);assert(paid.wage<16,'short shift does not mint full-day salary');assert.equal(r.copperLedger.state().cash,0);assert.equal(r.copperLedger.state().bank,expected);assert.equal(role.intent('accept'),null,'settled day cannot start a second salary');assert.equal(JSON.stringify(state().playerLook),identity);
 record('continuous shift retains unfinished work and uses witnessed time plus durable service review for bank-only salary',{coveredSeconds:paid.coveredSeconds,wage:paid.wage,servicePenalty:penalty});
}
renderer?.dispose();canvas?.dispose();ids['return-world'].onclick();assert.equal(meal.state().props.bowlCount,0);assert.equal(state().characterResources.activeReferences,0);record('region exit releases the three staff actors and meal props');
console.log(JSON.stringify({status:'PASS',scope:process.env.TAVERN_STAFF_SHIFT==='1'?'One China natural-main formal assistant handover/wrong-dish/correction/early-wage chain; simulated DOM and renderer':'One China natural-main meal; production actors/routes/props with simulated DOM and renderer; optional Mesa is not browser QA',checks,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-tavern-staff-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
