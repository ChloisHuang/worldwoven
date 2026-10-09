// CR04 first production-main segment. One original China scene per invocation.
// Real Three/main/navigation/controllers; the established DOM/renderer harness
// is simulated. This is not browser/iOS/visual or natural multi-day acceptance.
// Run SERIAL with the existing shared lock + process-tree guard:
// 180 seconds, 1152 MiB aggregate RSS, node --max-old-space-size=768
// --experimental-vm-modules tests/china-usurpation-main.cjs.
// Default resumes qa/usurpation-main/checkpoint.json when present, else seeds.
// USURPATION_MAIN_FROM selects an explicit same-case checkpoint.
// USURPATION_MAIN_FRESH=1 explicitly starts the first segment again.
// USURPATION_MAIN_STOP_AFTER names a milestone. After 03-political-response,
// stop; the next invocation proves cold recovery without rerunning the route.
// USURPATION_MAIN_PHASE=political asks the two existing court supporters next.
// USURPATION_MAIN_PHASE=support appends bounded, declared pre-case ordinary
// history through existing writers, then physically asks the new supporters.
// USURPATION_MAIN_PHASE=kitchen-apply declares old chef qualifications, then
// performs the actual royal application, review and safe handover.
// USURPATION_MAIN_PHASE=kitchen-meal continues original weighted meal requests,
// actual player work, the fictional six-second preparation and consumption.
// Later preparation/investiture/duty segments must continue this same journal.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let harness = fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8');
function once(before, after) {
  if (!harness.includes(before) || harness.indexOf(before) !== harness.lastIndexOf(before)) throw Error('Changed harness seam: ' + before);
  harness = harness.replace(before, after);
}
const seams = `
export function usurpationMainReview(){return {saved,player,npcs,lot,furniture,palaceUsurpation,palaceUsurpationUI,chinaUsurpationActions,serviceMenus,simulationClock,chinaAudience,chinaEdict,chinaPalace,chinaArchery,chinaRoyalKitchen,chinaRoyalKitchenEmployment,careerHandbook,formalCareers,relationshipEvents,playerConversations,npcSocial,path,targetStation,pendingInteraction};}
export function usurpationMainStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);palaceUsurpationUI?.update();careerHandbook.update(mode);updateCamera(dt);}
export {usurpationView,usurpationContext,currentPalaceAuthority,performUsurpationAction,requestStationIntent,save,cancelAction};
`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", 'new vm.SourceTextModule(readProduction(file),');
once('const cache=new Map();', `const cache=new Map();function readProduction(file){let source=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){const disabled='const PALACE_USURPATION_ENABLED=false;',enabled='const PALACE_USURPATION_ENABLED=true;';const present=[disabled,enabled].filter(value=>source.includes(value));assert.equal(present.length,1,'Exact palace feature gate');assert.equal(source.split(present[0]).length,2);assert(source.includes('const TRAVEL_JOURNEYS_ENABLED=true;'),'Travel gate stays enabled');source=source.replace(disabled,enabled)+${JSON.stringify(seams)};}return source;}`);
once('vm.createContext({console,', 'vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');", "const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode),'Ordinary known-China restoration may enter lot automatically');");
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once('let context=vm.createContext(', 'let rejectBegin=false,rejectedBegins=0;let context=vm.createContext(');
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}', String.raw`localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{
 if(k==='worlds-days-v1'&&rejectBegin){const next=JSON.parse(v).palaceUsurpation,old=JSON.parse(storage[k]||'{}').palaceUsurpation;
  if(next?.revision===(old?.revision||0)+1&&next.events?.at(-1)?.type==='begin'){rejectedBegins++;return false;}}
 storage[k]=v;return true;
}}`);
once("const main=mod(path.join(root,'game/main.js'));", String.raw`
const output=path.resolve('qa/usurpation-main'),checkpointPath=path.join(output,'checkpoint.json');fs.mkdirSync(output,{recursive:true});
const clone=value=>JSON.parse(JSON.stringify(value));
const sourceCheckpoint=process.env.USURPATION_MAIN_FROM||
 (process.env.USURPATION_MAIN_FRESH==='1'?null:fs.existsSync(checkpointPath)?checkpointPath:null);
let journal={version:1,kind:'china-usurpation-main',completed:[],evidence:[]},coldInput=null;
if(sourceCheckpoint){
 const input=JSON.parse(fs.readFileSync(path.resolve(sourceCheckpoint),'utf8'));
 assert.equal(input.version,1);assert.equal(input.journal?.kind,'china-usurpation-main');
 assert(input.save&&Array.isArray(input.journal.completed));
 journal=input.journal;
 if(process.env.USURPATION_MAIN_PHASE==='support'&&!journal.supportHistory){
  const append=require(path.resolve('tests/fixtures/usurpation-main-support.cjs'));
  const load=async name=>{const m=mod(path.join(root,'game',name));if(m.status==='unlinked')await m.link(linker);if(m.status!=='evaluated')await m.evaluate();return m.namespace;};
  const candidate=await append({save:input.save,load});
  assert.equal(candidate.report.preservation.clockUnchanged,true);assert.equal(candidate.report.preservation.politicalUnchanged,true);assert.equal(candidate.report.preservation.otherFieldsUnchanged,true);
  input.save=candidate.save;journal.supportHistory=candidate.report;
 }
 if(process.env.USURPATION_MAIN_PHASE==='kitchen-apply'&&!journal.kitchenHistory){
  const helper=require(path.resolve('tests/fixtures/usurpation-main-kitchen-history.cjs'));
  const candidate=await helper({prior:input.save,mod,linker,root,assert});
  const {save:prepared,...report}=candidate;input.save=prepared;journal.kitchenHistory=report;
 }
 storage['worlds-days-v1']=JSON.stringify(input.save);coldInput=clone(input.save.palaceUsurpation||null);
 if(journal.caseId)assert.equal(coldInput?.cases?.at(-1)?.id,journal.caseId,'Never substitute another case checkpoint');
}else{
 const seed=await require(path.resolve('tests/fixtures/usurpation-main-seed.cjs'))({prior:JSON.parse(storage['worlds-days-v1']),mod,linker,root,assert});
 storage['worlds-days-v1']=JSON.stringify(seed.save);journal.seed={supported:seed.supported,pendingSupport:seed.pendingSupport,attempts:seed.attempts,day:seed.stagedDay};journal.staging=seed.staging;
}
const main=mod(path.join(root,'game/main.js'));
`);
const bodyStart = harness.indexOf('const report=[];for(let round=0;');
if (bodyStart < 0) throw Error('Missing bounded harness body');
harness = harness.slice(0, bodyStart) + String.raw`
const started=Date.now()-process.uptime()*1000,done=name=>journal.completed.includes(name),review=()=>main.namespace.usurpationMainReview();
let steps=0,leg='boot',walked=0,maxStep=0,readyTicks=0;
// The seed is a declared legacy known-China save. Do not turn travel off or
// build a second scene to work around a broken ordinary restoration path.
assert.equal(state().mode,'lot','Known China must restore through production startup');
assert.equal(state().region,'china');
const r=review(),core=r.palaceUsurpation,physical=r.chinaUsurpationActions;
assert(core&&physical&&r.palaceUsurpationUI);assert.equal(core.state().loadError,null);assert.equal(physical.state().loadError,null);
assert.equal(r.npcs.length,31);const originals=new Map(r.npcs.map(actor=>[actor.station.id,actor]));
const bodyId=actor=>actor.bodyId||actor.root.userData.bodyId||actor.actorId||actor.station.id;
const task=()=>core.currentTask(),view=()=>main.namespace.usurpationView(),contextNow=()=>main.namespace.usurpationContext();
const find=(element,predicate)=>predicate(element)?element:element.children?.map(child=>find(child,predicate)).find(Boolean);
const panel=()=>find(document.body,element=>element.id==='palace-usurpation-dialog');
const identities=()=>r.npcs.map(actor=>({id:actor.station.id,bodyId:bodyId(actor),name:actor.station.npcName,ageYears:actor.ageYears??actor.station.ageYears}));
if(!journal.identities)journal.identities=clone(identities());
function invariants(){
 assert.equal(r.npcs.length,31);for(const [id,actor]of originals)assert.equal(r.npcs.find(row=>row.station.id===id),actor,'Original body remains in scene');
 assert.deepEqual(clone(identities()),journal.identities);assert.equal(originals.get('cn-emperor').alive!==false,true);
 assert.equal(main.namespace.currentPalaceAuthority().holderId,'cn-emperor');assert.equal(core.state().loadError,null);assert.equal(physical.state().loadError,null);
 if(journal.caseId){assert.equal(task()?.id,journal.caseId);assert.equal(core.state().cases.length,1);}
}
function diagnostic(){const live=review();return {leg,steps,seconds:(Date.now()-started)/1000,clock:clone(r.simulationClock.state()),
 player:r.player.root.position.toArray(),path:live.path.slice(0,5).map(p=>[p.x,p.y,p.z]),pathLength:live.path.length,
 target:live.targetStation,pending:live.pendingInteraction,case:task(),physical:physical.state(),
 actors:[...originals].filter(([id])=>contextNow().supporters.some(person=>person.id===id)).map(([id,n])=>({id,bodyId:bodyId(n),position:n.root.position.toArray(),walking:n.walking,alive:n.alive!==false})),
 kitchen:r.chinaRoyalKitchen?.state(),employment:r.chinaRoyalKitchenEmployment?.state(),palace:r.chinaPalace?.state(),
 supporters:contextNow().supporters.map(person=>({id:person.id,circleId:person.circleId})),meeting:r.npcSocial?.meetingState(),toast:ids.toast.textContent};}
function step(){
 if(Date.now()-started>150000)throw Error('Bounded stop before external 180s limit: '+leg);
 assert(process.memoryUsage().rss<1100*1024*1024,'Leave aggregate-RSS margin for 1152 MiB guard');
 const before=r.player.root.position.clone();now+=100;main.namespace.usurpationMainStep(.1);steps++;
 const distance=r.player.root.position.distanceTo(before);walked+=distance;maxStep=Math.max(maxStep,distance);
 const activity=physical.state();if(activity.action==='political-response'&&!activity.waiting)readyTicks++;
}
function until(predicate,label,limit=1600){leg=label;for(let i=0;i<limit&&!predicate();i++)step();assert(predicate(),label+' incomplete; see diagnostic.json');}
function checkpoint(name,evidence={}){
 invariants();assert(main.namespace.save(),'Ordinary production save succeeds');
 if(!done(name))journal.completed.push(name);journal.evidence.push({milestone:name,clock:clone(r.simulationClock.state()),...clone(evidence)});
 journal.last={milestone:name,steps,seconds:(Date.now()-started)/1000};
 const saved=JSON.parse(storage['worlds-days-v1']);
 if(journal.caseId)assert.equal(saved.palaceUsurpation?.cases?.at(-1)?.id,journal.caseId);
 fs.writeFileSync(checkpointPath+'.tmp',JSON.stringify({version:1,save:saved,journal}));fs.renameSync(checkpointPath+'.tmp',checkpointPath);
 console.log('MILESTONE',name,JSON.stringify(evidence));
 return process.env.USURPATION_MAIN_STOP_AFTER===name;
}
function open(){
 if(r.palaceUsurpationUI.isOpen())return;
 const entry=r.serviceMenus.intent('palace-usurpation');assert(entry,'Actual service-menu entry available');
 assert.equal(entry.provider,'service-menu');assert(main.namespace.requestStationIntent(entry));
 until(()=>r.palaceUsurpationUI.isOpen(),'actual main service-menu opens palace panel',20);assert(panel().open);
}
function action(kind,extra={}){
 const selected=view().actions.find(row=>row.kind===kind&&Object.entries(extra).every(([key,value])=>row[key]===value));
 assert(selected&&selected.enabled,kind+' action available');return selected;
}
function click(selected){
 assert(r.palaceUsurpationUI.isOpen());r.palaceUsurpationUI.update();
 const button=find(panel(),element=>element.attrs?.['data-usurpation-action']===selected.id);
 assert(button&&!button.disabled,selected.id+' real panel button');button.onclick();return button;
}
try{
 if(done('03-political-response')&&(!['political','support','kitchen-apply','kitchen-meal','kitchen-finish'].includes(process.env.USURPATION_MAIN_PHASE)||!done('04-cold-same-case'))){
  assert(coldInput,'Cold check must come from the persisted same-case checkpoint');
  assert.deepEqual(clone(core.snapshot()),coldInput,'Cold main restores exact committed political history');
  assert.equal(task().id,journal.caseId);assert.deepEqual(clone(task().pledges),journal.pledges);
  assert.equal(physical.isActing(),false,'Cold load never invents a resumed timer or actor lease');
  assert.equal(physical.state().gathering,null);assert.equal(core.state().events.filter(event=>event.type==='pledge').length,journal.pledges.length);
  for(let i=0;i<4;i++)step();open();r.palaceUsurpationUI.close();main.namespace.cancelAction();
  assert.deepEqual(clone(task().pledges),journal.pledges);assert.equal(task().id,journal.caseId);
  assert.equal(core.state().events.filter(event=>event.type==='begin').length,1);
  assert.equal(core.state().events.filter(event=>event.type==='pledge').length,journal.pledges.length);
  checkpoint('04-cold-same-case',{caseId:journal.caseId,responseActor:journal.responseActor,receiptId:journal.pledges[0].receipt.id,rerolled:false});
  console.log(JSON.stringify({status:'PASS',scope:'CR04 first segment plus same-case cold recovery only; later preparations, investiture and imperial duties remain pending',checkpoint:checkpointPath,completed:journal.completed}));return;
 }
 if(process.env.USURPATION_MAIN_PHASE==='kitchen-apply'){
  assert(done('06-justice-response'));assert(journal.kitchenHistory);assert.equal(journal.kitchenHistory.bankCalls,0);
  assert.deepEqual(clone(core.snapshot()),coldInput);assert.deepEqual(clone(task().pledges),journal.pledges);
  const roleId='cn-royal-kitchen-cook',employment=r.chinaRoyalKitchenEmployment;
  const request=kind=>{r.careerHandbook.close();const next=employment.intent(kind);assert(next,kind+' physical employment intent');assert(main.namespace.requestStationIntent(next),'actual original kitchen route '+kind);};
  assert.equal(r.formalCareers.royalKitchenQualification().qualifiedDays,3);
  if(!done('k01-staged-chef-prerequisites'))if(checkpoint('k01-staged-chef-prerequisites',{staged:true,qualifiedDays:3,bankCalls:0,caseUnchanged:true,clockUnchanged:true,staging:journal.kitchenHistory.staging}))return;
  if(!done('k02-royal-application')){
   assert.equal(r.formalCareers.state().tenure,null);request('formal-apply');
   until(()=>r.formalCareers.applicationResult(roleId)?.status==='pending','walk to original Jia registration and lodge royal application');
   assert.equal(r.formalCareers.state().tenure,null);
   if(checkpoint('k02-royal-application',{applicationId:r.formalCareers.applicationResult(roleId).id,stage:'pending',caseId:journal.caseId}))return;
  }
  if(!done('k03-royal-review')){
   request('formal-review');until(()=>r.formalCareers.applicationResult(roleId)?.status!=='pending','original Jia reviews the actual royal application');
   const result=r.formalCareers.applicationResult(roleId);assert(result);assert.equal(employment.state().job,null);
   if(checkpoint('k03-royal-review',{applicationId:result.id,status:result.status,hired:r.formalCareers.isHired(roleId),caseId:journal.caseId}))return;
   assert(r.formalCareers.isHired(roleId),'If the real interview declines, preserve it instead of patching the outcome');
  }
  if(!done('k04-royal-handover')){
   assert(r.formalCareers.isHired(roleId));request('accept');
   until(()=>employment.state().job?.stage==='working','Jia and player finish the original safe kitchen handover');
   assert.equal(r.formalCareers.state().officialCareer.appointments.length,0);
   if(checkpoint('k04-royal-handover',{receiptId:employment.state().job.receiptId,day:employment.state().job.day,caseId:journal.caseId,originalJiaBody:bodyId(originals.get('cn-cooking'))}))return;
  }
  console.log(JSON.stringify({status:'PASS',scope:'Chef history is explicitly staged; royal application, Jia review and safe handover are actual main. No emperor order or intrigue evidence is staged.',checkpoint:checkpointPath,completed:journal.completed}));return;
 }
 if(process.env.USURPATION_MAIN_PHASE==='kitchen-meal'){
  assert(done('k04-royal-handover'));assert.deepEqual(clone(core.snapshot()),coldInput);
  const kitchen=r.chinaRoyalKitchen,employment=r.chinaRoyalKitchenEmployment,job=employment.state().job;
  assert(job?.stage==='working');assert.equal(job.receiptId,'cn-royal-kitchen-labor-1');
  const waitFor=(predicate,label,limit=2000)=>{
   leg=label;for(let i=0;i<limit&&!predicate();i++){
    if(Date.now()-started>132000){checkpoint('kitchen-progress-'+Math.floor(r.simulationClock.state().seconds),{incomplete:true,leg,orderId:journal.emperorOrderId||null});console.log(JSON.stringify({status:'CHECKPOINT',scope:'Original live kitchen progress only; resume this same saved world',checkpoint:checkpointPath}));return false;}step();
   }assert(predicate(),label+' incomplete; see diagnostic.json');return true;
  };
  const order=()=>journal.emperorOrderId?kitchen.lookupMeal(journal.emperorOrderId,'cn-emperor'):kitchen.mealFor('cn-emperor');
  const requestWork=()=>{r.palaceUsurpationUI.close();r.careerHandbook.close();const next=employment.intent('task');assert(next,'Original current kitchen task exists');assert(main.namespace.requestStationIntent(next),'Actual original meal route');return next.work;};
  if(!done('k05-original-emperor-order')){
   // Other original diners retain their earlier slips and queue order. Work
   // those same slips if needed; never manufacture the emperor's request.
   for(let i=0;i<12&&order()?.workerId!=='player';i++){
    if(!waitFor(()=>order()?.workerId==='player'||employment.intent('task'),'original weighted royal life issues its own meal request'))return;
    if(order()?.workerId==='player')break;
    const next=requestWork(),before=kitchen.lookupMeal(next.orderId,next.actorId).stage;
    if(!waitFor(()=>kitchen.lookupMeal(next.orderId,next.actorId).stage!==before,'complete existing original diner step '+next.key))return;
   }
   const original=order();assert(original&&original.workerId==='player'&&original.workReceiptId===job.receiptId);journal.emperorOrderId=original.id;
   if(checkpoint('k05-original-emperor-order',{orderId:original.id,actorId:original.actorId,workerId:original.workerId,workReceiptId:original.workReceiptId,staged:false}))return;
  }
  if(!done('k06-original-emperor-prepared')){
   for(let i=0;i<12&&!['prepared','cooked'].includes(order().stage);i++){
    if(!waitFor(()=>!!employment.intent('task'),'original meal work becomes available'))return;
    const next=requestWork(),before=kitchen.lookupMeal(next.orderId,next.actorId).stage;
    if(!waitFor(()=>kitchen.lookupMeal(next.orderId,next.actorId).stage!==before,'actual original kitchen step '+next.key))return;
   }
   assert(['prepared','cooked'].includes(order().stage));assert.equal(order().workerId,'player');assert(order().supplyReceipt);
   assert.equal(task().preparations.intrigue,null);
   if(checkpoint('k06-original-emperor-prepared',{orderId:order().id,mealId:order().mealId,supplyReceipt:order().supplyReceipt,remaining:kitchen.supplyState().remaining,staged:false}))return;
  }
  if(!done('k07-fictional-package-prepared')){
   open();const before=clone(order());click(action('prepare',{preparationKind:'intrigue'}));
   if(!waitFor(()=>physical.state().pendingMeal,'complete six actual seconds at the original kitchen board'))return;
   assert.equal(task().preparations.intrigue,null,'Preparation alone is not consumption or mechanism evidence');
   const pending=physical.snapshot().actions.mealPending;assert(pending?.bound&&pending.progress===6);assert.equal(pending.meal.orderId,order().id);
   assert.equal(order().stage,before.stage);assert.equal(order().supplyReceipt,before.supplyReceipt);
   if(checkpoint('k07-fictional-package-prepared',{orderId:order().id,storyActionId:pending.storyActionId,seconds:6,consumed:false,staged:false}))return;
  }
  if(!done('k08-intrigue-original-consumed')){
   for(let i=0;i<12&&!['served','eating','consumed'].includes(order().stage);i++){
    if(!waitFor(()=>!!employment.intent('task'),'original cooked meal task becomes available'))return;
    const next=requestWork(),before=kitchen.lookupMeal(next.orderId,next.actorId).stage;
    if(!waitFor(()=>kitchen.lookupMeal(next.orderId,next.actorId).stage!==before,'cook and physically deliver original meal '+next.key))return;
   }
   assert(['served','eating','consumed'].includes(order().stage));
   if(!waitFor(()=>!!task().preparations.intrigue,'original emperor arrives and consumes the same original dish'))return;
   const receipt=task().preparations.intrigue;assert.equal(receipt.meal.orderId,order().id);assert.equal(receipt.meal.objectId,order().mealId);assert.equal(order().stage,'consumed');assert(order().eatingSeconds>=12);
   assert.equal(receipt.storyActionId,journal.caseId+':story-package:'+order().id);assert.equal(receipt.meal.consumerId,'cn-emperor');
   if(checkpoint('k08-intrigue-original-consumed',{orderId:order().id,mealId:order().mealId,eatingSeconds:order().eatingSeconds,receiptId:receipt.id,storyActionId:receipt.storyActionId,staged:false}))return;
  }
  console.log(JSON.stringify({status:'PASS',scope:'Original emperor requested, player prepared and delivered, fictional six-second action and original at-least-twelve-second consumption complete; no source order or political outcome staged',checkpoint:checkpointPath,completed:journal.completed}));return;
 }
 if(process.env.USURPATION_MAIN_PHASE==='kitchen-finish'){
  assert(done('k08-intrigue-original-consumed'));assert.deepEqual(clone(core.snapshot()),coldInput);
  const kitchen=r.chinaRoyalKitchen,employment=r.chinaRoyalKitchenEmployment,receiptId='cn-royal-kitchen-labor-1',intrigue=clone(task().preparations.intrigue);
  const waitFor=(predicate,label,limit=2000)=>{
   leg=label;for(let i=0;i<limit&&!predicate();i++){
    if(Date.now()-started>132000){checkpoint('kitchen-finish-progress-'+Math.floor(r.simulationClock.state().seconds),{incomplete:true,leg,receiptId});console.log(JSON.stringify({status:'CHECKPOINT',scope:'Same original kitchen shift is still being safely settled',checkpoint:checkpointPath}));return false;}step();
   }assert(predicate(),label+' incomplete; see diagnostic.json');return true;
  };
  const request=kind=>{r.palaceUsurpationUI.close();r.careerHandbook.close();const next=employment.intent(kind);assert(next,kind+' original employment intent');assert(main.namespace.requestStationIntent(next));return next;};
  if(!done('k09-original-work-handed-back')){
   assert.equal(employment.state().job?.receiptId,receiptId);
   for(let i=0;i<18&&employment.state().job?.stage==='working';i++){
    if(kitchen.canEndDuty(receiptId)){
     request('end-shift');if(!waitFor(()=>employment.state().job?.stage==='ready'||employment.state().waiting&&!kitchen.canEndDuty(receiptId),'return to original Jia for safe shift handover'))return;
    }else{
     if(!waitFor(()=>!!employment.intent('task')||kitchen.canEndDuty(receiptId),'finish only already accepted original royal slips'))return;
     if(kitchen.canEndDuty(receiptId))continue;
     const next=request('task').work,before=kitchen.lookupMeal(next.orderId,next.actorId).stage;
     if(!waitFor(()=>kitchen.lookupMeal(next.orderId,next.actorId).stage!==before,'complete accepted original slip '+next.key))return;
    }
   }
   assert.equal(employment.state().job?.stage,'ready');assert.deepEqual(clone(task().preparations.intrigue),intrigue);
   if(checkpoint('k09-original-work-handed-back',{receiptId,coveredSeconds:employment.state().job.coveredSeconds,completedOrders:employment.state().job.completedOrders,staged:false}))return;
  }
  if(!done('k10-original-shift-paid')){
   request('claim');if(!waitFor(()=>!employment.state().job&&r.formalCareers.state().lastDuty.stage==='paid','original Jia inspects and settles the existing attendance wage'))return;
   const duty=r.formalCareers.state().lastDuty;assert.equal(duty.workReceiptId,receiptId);assert(duty.wage>=0);
   if(checkpoint('k10-original-shift-paid',{receiptId,wage:duty.wage,coveredSeconds:duty.coveredSeconds,questReward:false,staged:false}))return;
  }
  if(!done('k11-original-kitchen-resigned')){
   request('formal-resign');if(!waitFor(()=>!r.formalCareers.state().tenure,'leave the settled original job through original registration'))return;
   assert.equal(employment.state().job,null);assert.deepEqual(clone(task().preparations.intrigue),intrigue);
   assert.equal(contextNow().safety.oldWorkSettled,true);assert.equal(kitchen.state().jia.released,false);
   if(checkpoint('k11-original-kitchen-resigned',{receiptId,caseId:journal.caseId,intriguePreserved:true,oldWorkSettled:true,originalJiaReturned:true}))return;
  }
  console.log(JSON.stringify({status:'PASS',scope:'Same original accepted dishes completed, Jia handover and existing wage settled, original formal resignation; same intrigue evidence retained',checkpoint:checkpointPath,completed:journal.completed}));return;
 }
 if(['political','support'].includes(process.env.USURPATION_MAIN_PHASE)){
  assert(done('04-cold-same-case'),'Resume the remotely preserved cold checkpoint');
  assert.deepEqual(clone(core.snapshot()),coldInput,'No history replacement before physical continuation');
  assert.deepEqual(clone(task().pledges),journal.pledges);
  assert.equal(task().id,journal.caseId);
  let responsePlan=[['cn-official-rites','05-rites-response'],['cn-official-justice','06-justice-response']];
  if(process.env.USURPATION_MAIN_PHASE==='support'){
   const history=journal.supportHistory;assert(history&&history.caseId===journal.caseId);
   assert.equal(history.window.gameClockSeconds,r.simulationClock.state().seconds,'History preparation never advances the world');
   assert(history.newEvents.every(event=>event.start>=history.window.start&&event.end<history.window.endExclusive));
   const supported=history.actors.filter(row=>row.status==='support'||row.status==='already-staged'&&row.stance==='support').map(row=>row.actorId);
   for(const actorId of supported)assert(contextNow().supporters.some(person=>person.id===actorId),'Production profiles recognize the explicitly staged ordinary response: '+actorId);
   if(!done('07-staged-ordinary-history'))if(checkpoint('07-staged-ordinary-history',{caseId:journal.caseId,staged:true,window:history.window,actors:history.actors.map(row=>({actorId:row.actorId,status:row.status,eventId:row.eventId})),eventCount:history.newEvents.length,politicalUnchanged:true,clockUnchanged:true}))return;
   responsePlan=[['cn-official-records','08-records-response'],['cn-consort-heng','09-heng-response'],['cn-archery','10-archery-response'],['cn-range-warden','11-warden-response']].filter(([actorId])=>supported.includes(actorId));
  }
  for(const [actorId,milestone] of responsePlan){
   if(done(milestone))continue;
   assert(contextNow().supporters.some(person=>person.id===actorId),'Use an already-established ordinary supporter');
   assert(!task().pledges.some(person=>person.actorId===actorId),'Never re-ask an answered person');
   const body=originals.get(actorId),identity=bodyId(body),prior=clone(task().pledges);
   until(()=>{const offered=view().actions.find(row=>row.kind==='pledge'&&row.actorId===actorId&&row.enabled);return offered&&physical.intent(offered);},'original court supporter becomes safely approachable: '+actorId,1200);
   open();readyTicks=0;click(action('pledge',{actorId}));
   until(()=>task().pledges.some(person=>person.actorId===actorId),'original court person supplies the same-case four seconds: '+actorId,1600);
   const response=task().pledges.find(person=>person.actorId===actorId);
   assert.equal(response.bodyId,identity);assert.equal(response.receipt.actorBodyId,identity);
   assert.equal(response.receipt.kind,'political-response');assert.equal(response.receipt.durationSeconds,4);
   assert.equal(response.receipt.caseId,journal.caseId);assert.equal(response.receipt.completed,true);
   assert(readyTicks>=39,'Actual main frames provide four seconds');
   assert.deepEqual(clone(task().pledges.filter(person=>person.actorId!==actorId)),prior,'Earlier answers stay immutable');
   assert.equal(body,originals.get(actorId));assert.equal(physical.isActing(),false);
   journal.pledges=clone(task().pledges);
   if(checkpoint(milestone,{caseId:journal.caseId,actorId,bodyId:identity,accepted:response.accepted,receiptId:response.receipt.id,seconds:4,readyTicks,walked,maxStep}))return;
  }
  console.log(JSON.stringify({status:'PASS',scope:process.env.USURPATION_MAIN_PHASE==='support'?'Pre-case ordinary history is explicitly staged; each new political answer uses the original physical person and fixed case':'Same case, two existing ordinary court supporters physically answer; no new support, political decision or preparation is staged',checkpoint:checkpointPath,completed:journal.completed}));return;
 }
 if(!done('00-support-threshold')){
  const before=contextNow().supporters;assert.equal(before.length,2,'Pending ordinary support cannot unlock the third person');
  assert.equal(new Set(before.map(person=>person.id)).size,2);assert.equal(core.availability().visible,false);
  assert.equal(r.serviceMenus.intent('palace-usurpation'),null);assert.equal(core.begin().code,'support-not-established');assert.equal(task(),null);
  assert.equal(r.playerConversations.pending().id,journal.seed.pendingSupport.eventId);
  const recovered=r.playerConversations.retryPending();assert(recovered.ok);assert.equal(recovered.event.id,journal.seed.pendingSupport.eventId);
  assert.equal(recovered.event.result.supportStance,'support');
  const supporters=contextNow().supporters;assert.equal(supporters.length,3);assert.equal(new Set(supporters.map(person=>person.id)).size,3);
  assert(new Set(supporters.map(person=>person.circleId)).size>=2);assert(supporters.every(person=>person.ageYears>=18&&person.alive));
  assert(core.availability().visible);assert.equal(task(),null,'Ordinary support is never a political pledge or a case');
  until(()=>!!r.serviceMenus.intent('palace-usurpation'),'live entry cache observes newly committed ordinary support',12);
  open();assert.equal(panel().attrs['data-usurpation-stage'],'available');
  if(checkpoint('00-support-threshold',{before:before.map(person=>person.id),after:supporters.map(person=>({id:person.id,circleId:person.circleId})),historyCompletionId:recovered.event.id}))return;
 }
 if(!done('01-begin-atomic')){
  open();const before=clone(core.snapshot()),begin=action('begin');rejectBegin=true;
  const staleButton=click(begin);assert.equal(rejectedBegins,1);assert.equal(task(),null);assert.equal(core.state().lastError,'save-failed');
  assert.deepEqual(clone(core.snapshot()),before,'Refused candidate cannot become current core');
  assert(main.namespace.save(),'Ordinary save cannot silently retain rejected begin candidate');
  assert.equal(rejectedBegins,1);assert.equal(JSON.parse(storage['worlds-days-v1']).palaceUsurpation?.cases?.length||0,0);
  assert.equal(r.saved.palaceUsurpation?.cases?.length||0,0);
  rejectBegin=false;click(action('begin'));assert.equal(task().stage,'planning');journal.caseId=task().id;
  assert.equal(core.state().cases.length,1);assert.equal(task().pledges.length,0);assert.equal(Object.values(task().preparations).filter(Boolean).length,0);
  staleButton.onclick();assert.equal(task().id,journal.caseId);assert.equal(core.state().events.filter(event=>event.type==='begin').length,1);
  for(const routeId of ['intrigue','guard','abdication'])click(action('select-route',{routeId}));
  assert.deepEqual([...task().selectedRoutes].sort(),['abdication','guard','intrigue']);
  assert.equal(task().pledges.length,0);assert.equal(Object.values(task().preparations).filter(Boolean).length,0);
  if(checkpoint('01-begin-atomic',{caseId:journal.caseId,rejectedBegins,selectedRoutes:task().selectedRoutes,ordinarySaveHidRejectedCandidate:false}))return;
 }
 if(!journal.responseActor){
  // Fixed source order, selected only for a currently real legal intent.
  // We do not inspect the political roll, change a personality or reroll.
  const offered=view().actions.filter(row=>row.kind==='pledge'&&row.enabled);
  const choice=offered.find(row=>physical.intent(row));assert(choice,'At least one original supported adult can be approached');journal.responseActor=choice.actorId;
 }
 const original=originals.get(journal.responseActor);assert(original);const originalBodyId=bodyId(original);
 if(!done('02-cancel-preserves-case')){
  open();click(action('pledge',{actorId:journal.responseActor}));
  until(()=>physical.state().elapsed>=1,'original player route and first second of same-person political discussion');
  assert(physical.state().elapsed<4);assert.equal(task().pledges.length,0);
  const partial=clone(physical.state());main.namespace.cancelAction();
  assert.equal(physical.isActing(),false);assert.equal(physical.state().gathering,null);assert.equal(review().path.length,0);assert.equal(review().pendingInteraction,null);
  assert.equal(task().id,journal.caseId);assert.equal(task().pledges.length,0);assert.equal(bodyId(original),originalBodyId);
  open();r.palaceUsurpationUI.close();assert.equal(task().stage,'planning');
  if(checkpoint('02-cancel-preserves-case',{caseId:journal.caseId,actorId:journal.responseActor,bodyId:originalBodyId,elapsedBeforeCancel:partial.elapsed,walked,maxStep}))return;
 }
 open();readyTicks=0;click(action('pledge',{actorId:journal.responseActor}));
 until(()=>physical.state().elapsed>=3.8||task().pledges.length>0,'same original person supplies physical seconds');
 assert.equal(task().pledges.length,0,'Less than four physical seconds cannot record a political response');
 assert(physical.state().elapsed<4);assert.equal(bodyId(original),originalBodyId);
 until(()=>task().pledges.length===1,'complete the actual four-second political answer',6);
 const response=task().pledges[0];assert.equal(response.actorId,journal.responseActor);assert.equal(response.bodyId,originalBodyId);
 assert.equal(response.receipt.kind,'political-response');assert.equal(response.receipt.durationSeconds,4);assert.equal(response.receipt.actorBodyId,originalBodyId);
 assert.equal(response.receipt.caseId,journal.caseId);assert.equal(response.receipt.completed,true);
 assert(response.receipt.participants.some(person=>person.actorId===journal.responseActor&&person.bodyId===originalBodyId));
 assert(response.receipt.participants.some(person=>person.actorId==='player'&&person.bodyId===bodyId(r.player)));
 assert(readyTicks>=39,'Four seconds came from physical main updates');assert.equal(original,originals.get(journal.responseActor));
 assert.equal(physical.isActing(),false);assert.equal(core.state().events.filter(event=>event.type==='pledge').length,1);
 const recorded=clone(response),replayed=core.pledge(journal.caseId,journal.responseActor,response.receipt);
 assert(replayed.ok&&replayed.replayed);assert.equal(replayed.accepted,response.accepted);assert.deepEqual(clone(task().pledges[0]),recorded);
 open();r.palaceUsurpationUI.close();main.namespace.cancelAction();assert.equal(task().id,journal.caseId);
 journal.pledges=clone(task().pledges);
 checkpoint('03-political-response',{caseId:journal.caseId,actorId:response.actorId,bodyId:response.bodyId,accepted:response.accepted,receiptId:response.receipt.id,seconds:4,readyTicks,walked,maxStep});
 console.log(JSON.stringify({status:'CHECKPOINT',scope:'First main segment complete; run this same checkpoint once more for cold verification. Three preparations, investiture and player imperial duties are not yet tested.',checkpoint:checkpointPath,completed:journal.completed}));
}catch(error){
 fs.writeFileSync(path.join(output,'diagnostic.json'),JSON.stringify(diagnostic(),null,2));
 fs.writeFileSync(path.join(output,'interrupted.json'),JSON.stringify({version:1,save:JSON.parse(storage['worlds-days-v1']),journal}));
 console.error(JSON.stringify({status:'FAIL',leg,steps,message:error.message,diagnostic:path.join(output,'diagnostic.json'),lastCompletedCheckpoint:checkpointPath}));throw error;
}
})().catch(error=>{console.error(error);process.exit(1)});
`;
new vm.Script(harness, {filename: 'tests/china-usurpation-main-inherited.cjs', importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({
  structuredClone, URL, Float32Array, Float64Array, Uint8Array, Uint16Array, Uint32Array,
  Int8Array, Int16Array, Int32Array, ArrayBuffer, require, console, process, Buffer,
  __dirname: path.resolve('tests'), __filename,
});
