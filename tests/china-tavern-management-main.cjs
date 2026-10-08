// Production main with the existing Three/DOM harness. Feature is temporarily
// enabled in the test module only. Bank900 is a stated fixture; NPC work, routes,
// customer orders, trial qualification and cash mutations are actual code.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('Changed fixture seam: '+a);harness=harness.replace(a,b);}
const seams=`
export function tavernMainReview(){return {saved,player,npcs,lot,furniture,chinaTavern,chinaTavernUI,chinaService,chinaLabor,tavernManagement,tavernManagementUI,tavernProperty,tavernKitchenRoles,tavernHostRole,guestAccounts,copperLedger,simulationClock,path,targetStation,pendingInteraction};}
export function tavernMainStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);chinaTavernUI?.update();updateCamera(dt);}
export {requestStationIntent,save,cancelAction,navigateTo};
`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(readProduction(file),");
once('const cache=new Map();',`const cache=new Map();function readProduction(file){let source=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){const disabled='const CHINA_TAVERN_MANAGEMENT_ENABLED=false;',enabled='const CHINA_TAVERN_MANAGEMENT_ENABLED=true;';assert(source.includes(disabled)||source.includes(enabled));source=source.replace(disabled,enabled)+${JSON.stringify(seams)};}return source;}`);
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode),'Fresh globe or ordinary auto-restored lot');");
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}',"prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once('visited:[],stamps:{},outfit:0,appearance:',"visited:[],stamps:{},outfit:0,copperLedger:{version:1,cash:0,bank:900,accountOpened:true,nextTransaction:1,transactions:[]},appearance:");
once('let context=vm.createContext(', "let rejectedHandoffs=0;const rejectHandoff=process.env.TAVERN_MAIN_REJECT_HANDOFF==='1';let context=vm.createContext(");
once('localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v}', String.raw`localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{
 if(k==='worlds-days-v1'&&rejectHandoff){const next=JSON.parse(v),old=JSON.parse(storage[k]||'{}'),holder=next.chinaTavernKitchenRoles?.assistant?.holderId;
  if(['cn-tavern-diner-west','cn-tavern-diner-east'].includes(holder)&&old.chinaTavernKitchenRoles?.assistant?.holderId!==holder&&next.chinaTavernHiring?.events?.some(e=>e.kind==='assigned'&&e.data.assignment.holderId===holder)){rejectedHandoffs++;return false;}}
 storage[k]=v;return true;
}}`);
once("const main=mod(path.join(root,'game/main.js'));",String.raw`
const out=path.resolve('qa/tavern-management-main');fs.mkdirSync(out,{recursive:true});const clone=x=>JSON.parse(JSON.stringify(x));
let journal={version:1,completed:[],staging:'Initial player bank900 only; actual original NPC identities, finite purses, default meal orders, routes and work. DOM/renderer simulated, not browser/iOS.'};
const from=process.env.TAVERN_MAIN_FROM||(process.env.TAVERN_MAIN_FRESH==='1'?null:'tests/fixtures/tavern-management-main-checkpoint.json');
if(from){const input=JSON.parse(fs.readFileSync(path.resolve(from),'utf8'));storage['worlds-days-v1']=JSON.stringify(input.save||input);journal=input.journal||journal;}
if(process.env.TAVERN_MAIN_STAGE_WORK==='1'&&!journal.workDay){
 assert(journal.completed.includes('04-hired'));const next=JSON.parse(storage['worlds-days-v1']);
 const day=Math.floor((600+next.simulationClock.seconds*.7)/1440)+1;journal.workDay=day;
 next.simulationClock={version:1,seconds:(day*1440+360-600)/.7};storage['worlds-days-v1']=JSON.stringify(next);
 journal.staging+=' After real hiring, calendar alone staged to next day06 for bounded observed work; no overnight/full-day claim. Meal6 uses existing bank withdrawal, not added money.';
}
const main=mod(path.join(root,'game/main.js'));
`);
const begin=harness.indexOf('const report=[];for(let round=0;');if(begin<0)throw Error('Missing bounded body');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now()-process.uptime()*1000,review=()=>main.namespace.tavernMainReview(),done=id=>journal.completed.includes(id);let steps=0,leg='boot';
if(state().mode==='globe'){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=review(),m=r.tavernManagement,scene=r.chinaTavern.staffScene,originals=new Map(r.npcs.map(n=>[n.station.id,n]));
assert.equal(state().region,'china');assert(m);assert.equal(m.loadError,null);assert.equal(r.guestAccounts.loadError,null);assert.equal(scene.state().loadError,null);
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),panel=()=>find(document.body,e=>e.className?.split(' ').includes('cn-property-dialog'));
const button=label=>{const b=find(panel(),e=>e.tagName==='button'&&e.textContent===label);assert(b,label);assert(!b.disabled,label+' enabled');return b;};
const diagnostic=()=>({leg,steps,clock:r.simulationClock.state(),player:r.player.root.position.toArray(),pathLength:review().path.length,target:review().targetStation,pending:review().pendingInteraction,loadError:m.loadError,lastError:m.lastError,applications:m.hiring.applications(),recruitment:m.recruitment.state(),world:scene.state(),toast:ids.toast.textContent});
const trialCandidate=c=>['cn-tavern-diner-west','cn-tavern-diner-east'].includes(c?.actorId);
const step=()=>{now+=100;main.namespace.tavernMainStep(.1);steps++;const o=scene.playerOrder();if(journal.businessOrder&&o?.id===journal.businessOrder.id){const v=journal.businessOrder;if(o.stage==='carrying')v.carrier=o.holderActorId;if(o.stage==='return')v.collector=o.holderActorId;if(o.consumed)v.consumed=true;}};
const until=(fn,label,limit=4000)=>{leg=label;for(let i=0;i<limit&&!fn();i++){step();if(Date.now()-started>140000)throw Error('Safe bounded stop at '+label);}if(!fn())throw Error(label+' incomplete');};
function checkpoint(name,evidence){assert.equal(m.loadError,null);assert.equal(scene.state().loadError,null);assert.equal(r.npcs.length,31);for(const [id,n]of originals)assert.equal(r.npcs.find(n=>n.station.id===id),n);assert(main.namespace.save());if(!done(name))journal.completed.push(name);journal.last={name,evidence,clock:clone(r.simulationClock.state()),steps};const item={version:1,save:JSON.parse(storage['worlds-days-v1']),journal};fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify(item));console.log('MILESTONE',name,JSON.stringify(evidence));return process.env.TAVERN_MAIN_STOP_AFTER===name;}
try{
 if(!done('01-owner-stock')){
  assert.equal(r.tavernProperty.state().ownerId,'cn-tavern-host');assert.equal(m.stock.summary().active,false);
  assert(main.namespace.requestStationIntent(r.chinaService.intent('property')));until(()=>panel()?.open,'original property counter route');
  until(()=>{const b=find(panel(),e=>e.tagName==='button'&&e.textContent==='向业主申请购买');return !!b&&!b.disabled;},'original host returns to the property counter');button('向业主申请购买').onclick();const app=r.tavernProperty.state().market.application;assert.equal(app.status,'accepted');button('支付 '+app.amount+' 文 · 买下酒楼').onclick();assert.equal(r.tavernProperty.state().ownerId,'player');
  button('×').onclick();step();assert(m.stock.summary().active);assert.equal(m.stock.summary().inventoryValue,0,'No free opening raw portions');
  const budget=r.tavernProperty.state().balance,prefix=m.view().purchaseOperationPrefix;
  assert(m.purchase({dishId:'yunlai-mushroom-rice',quantity:8,operationId:prefix+':rice'}).ok);
  assert(m.purchase({dishId:'yunlai-green-noodles',quantity:8,operationId:prefix+':noodles'}).ok);
  assert.equal(r.tavernProperty.state().balance,budget-40);assert.equal(m.stock.summary().inventoryValue,40);
  if(checkpoint('01-owner-stock',{activationSerial:m.stock.summary().cutoff,procurement:40,inventoryValue:40,bank:r.copperLedger.state().bank}))return;
 }
 if(!done('02-applicant')){
  // The owner deliberately seeks a new guest applicant in this case. The old
  // assistant may independently ask to return; decline that real application
  // in person, then release the shared reception spot for existing lodgers.
  for(const c of m.recruitment.state().candidates.filter(c=>!trialCandidate(c)&&c.phase==='meeting'&&m.hiring.application(c.applicationId)?.status==='submitted')){
   assert(main.namespace.requestStationIntent(m.recruitment.intent(c.applicationId,'reject')));until(()=>m.hiring.application(c.applicationId).status==='rejected','owner physically declines former employee application');
   journal.declinedOriginalApplications=[...(journal.declinedOriginalApplications||[]),c.applicationId];
  }
  main.namespace.navigateTo(new three.namespace.Vector3(14,.115,13));until(()=>review().path.length===0,'owner leaves the original customer reception spot');
  if(r.tavernKitchenRoles.resolve('assistant').holderId){until(()=>!scene.snapshot().orders.some(o=>o.number<=m.stock.summary().cutoff&&o.stage!=='done')&&scene.kitchenHandoff('assistant').ok,'original legacy meals finish and actual assistant safe handoff');assert(m.dismiss('cn-tavern-steward').ok);}
  until(()=>m.recruitment.state().candidates.some(c=>trialCandidate(c)&&c.phase==='meeting'),'original idle NPC elects and physically arrives to apply',6000);
  const c=m.recruitment.state().candidates.find(c=>trialCandidate(c)&&c.phase==='meeting');journal.trialApplicationId=c.applicationId;assert(c.lease);assert(m.hiring.application(c.applicationId));
  if(checkpoint('02-applicant',{actorId:c.actorId,applicationId:c.applicationId,customerReleaseReceipt:c.lease.id}))return;
 }
 if(!done('03-trial')){
  let c=m.recruitment.state().candidates.find(c=>c.applicationId===journal.trialApplicationId);assert(c);
  if(!m.hiring.application(c.applicationId).trial.request){assert(main.namespace.requestStationIntent(m.recruitment.intent(c.applicationId,'trial')));until(()=>!!m.hiring.application(c.applicationId).trial.request,'owner walks to original applicant and orders trial');}
  until(()=>m.recruitment.candidate(c.applicationId)?.phase==='review'&&!!m.hiring.application(c.applicationId).trial.work,'original NPC cleans both tables and returns',6000);
  c=m.recruitment.candidate(c.applicationId);const a=m.hiring.application(c.applicationId);assert.equal(a.trial.work.steps.length,2);assert(a.trial.work.steps.every(s=>s.completedSeconds-s.startedSeconds>=5));
  if(checkpoint('03-trial',{actorId:c.actorId,applicationId:c.applicationId,steps:a.trial.work.steps,payment:!!a.trial.payment}))return;
 }
 if(!done('04-hired')){
  const c=m.recruitment.state().candidates.find(c=>c.applicationId===journal.trialApplicationId&&c.phase==='review');assert(c);const id=c.applicationId;
  if(m.hiring.application(id).status==='submitted')assert(main.namespace.requestStationIntent(m.recruitment.intent(id,'approve')));
  if(rejectHandoff){until(()=>rejectedHandoffs>0,'same approved handoff write is refused');assert.equal(m.hiring.application(id).status,'pending-safe-handoff');assert.equal(r.tavernKitchenRoles.resolve('assistant').holderId,null);assert.equal(m.recruitment.candidate(id).phase,'review');assert.equal(m.business.account(c.actorId).bank,12);
   checkpoint('04-handoff-rejected',{applicationId:id,rejectedHandoffs,holder:null,trialBank:12});const persisted=JSON.parse(storage['worlds-days-v1']);assert.equal(persisted.chinaTavernKitchenRoles.assistant.holderId,null);assert(!persisted.chinaTavernHiring.events.some(e=>e.kind==='assigned'&&e.applicationId===id));assert.deepEqual(persisted.chinaServiceWorld.recruitmentTableReceipts,persisted.worldContinuity.regions.china.controllers.chinaTavern.world.recruitmentTableReceipts);return;
  }
  until(()=>m.hiring.application(id).status==='assigned','owner approval and safe same-body role assignment');
  until(()=>m.business.snapshot().contracts.some(contract=>contract.actorId===c.actorId&&contract.roleId==='cn-tavern-steward'),'new source-bound fixed pay contract');
  const a=m.hiring.application(id),role=r.tavernKitchenRoles.resolve('assistant');assert.equal(role.holderId,a.actor.actorId);assert.equal(role.actor,originals.get(a.actor.actorId));assert.equal(a.decision.salary.baseDailyWage,16);assert(a.trial.payment);assert.equal(m.business.account(a.actor.actorId).bank,12);
  assert(m.business.snapshot().contracts.some(c=>c.actorId===a.actor.actorId&&c.roleId==='cn-tavern-steward'));
  if(checkpoint('04-hired',{actorId:a.actor.actorId,applicationId:id,slot:role.slotId,revision:role.revision,trialPayment:12,futureBase:16}))return;
 }
 if(!done('05-meal')){
  assert(journal.workDay,'Use explicit TAVERN_MAIN_STAGE_WORK=1 for the first work segment');
  const actorId=m.hiring.application(journal.trialApplicationId).actor.actorId;
  assert.equal(scene.kitchenRole('assistant').holderId,actorId);assert.equal(scene.kitchenRole('assistant').actor,originals.get(actorId));
  if(!journal.businessOrder){
   assert(r.copperLedger.withdraw(6,'tavern-main-operating-meal-cash').ok);r.tavernManagementUI.close();
   const choice=r.chinaTavern.seats.map(seat=>r.chinaTavernUI.intent(seat.id,'yunlai-mushroom-rice')).find(Boolean);assert(choice,'original available meal seat');
   assert(main.namespace.requestStationIntent(choice));until(()=>!!scene.playerOrder(),'owner walks to original chair and orders meal');
   const o=scene.playerOrder();journal.businessOrder={id:o.id,actorId,price:o.price};assert.equal(o.price,6);assert.equal(m.stock.order(o.id).status,'reserved');
  }
  const id=journal.businessOrder.id;
  until(()=>['ready','eating','finish-bite','dirty','return','done'].includes(scene.snapshot().orders.find(o=>o.id===id)?.stage),'original cook prepares and hired assistant delivers',6000);
  let o=scene.snapshot().orders.find(o=>o.id===id);assert.equal(o.relationshipServerId,actorId);assert.equal(o.relationshipCookId,'cn-tavern-cook');
  const prep=scene.snapshot().stockPreparations.find(p=>p.orderId===id),stock=m.stock.order(id);assert(prep&&prep.activeSeconds>=3.2);assert.equal(prep.actorId,'cn-tavern-cook');assert.equal(stock.status,'consumed');assert.equal(stock.allocation.unitCost,2);assert.equal(stock.consume.proof.preparationId,prep.id);
  assert.equal(r.copperLedger.reservations().find(v=>v.id===id).status,'settled');
  if(o.stage==='ready'){r.chinaTavernUI.open();const mealPanel=find(document.body,e=>e.className?.split(' ').includes('cn-meal-dialog')),eat=find(mealPanel,e=>e.tagName==='button'&&e.textContent==='享用送来的餐点');assert(eat&&!eat.disabled);eat.onclick();}
  until(()=>scene.snapshot().orders.find(o=>o.id===id)?.stage==='done','actual player eats and hired assistant returns original dishes',6000);
  o=scene.snapshot().orders.find(o=>o.id===id);assert(o.consumed&&!o.cancelled);assert.equal(journal.businessOrder.carrier,actorId);assert.equal(journal.businessOrder.collector,actorId);
  assert.equal(scene.snapshot().stockReceipts.filter(v=>v.kind==='consume'&&v.proof.order.orderId===id).length,1);
  if(checkpoint('05-meal',{...journal.businessOrder,prepSeconds:prep.activeSeconds,materialCost:stock.allocation.unitCost,server:o.relationshipServerId,cook:o.relationshipCookId}))return;
 }
 if(!done('06-observed')){
  const actorId=journal.businessOrder.actorId,rows=()=>m.business.snapshot().rows.filter(row=>row.actorId===actorId&&row.day===journal.workDay),hours=()=>rows().reduce((n,row)=>n+row.segments.reduce((v,s)=>v+s.endHour-s.startHour,0),0);
  until(()=>hours()>=.8,'hired assistant accrues only observed work or ordinary waiting',6000);
  assert(!m.business.snapshot().receipts.some(p=>p.kind==='npc-wage'&&p.actorId===actorId&&p.proof.row.day===journal.workDay));
  if(checkpoint('06-observed',{actorId,day:journal.workDay,hours:hours(),rows:rows(),baseDailyWage:16,unpaidUntilClose:true}))return;
 }
 console.log(JSON.stringify({status:'PASS',seconds:(Date.now()-started)/1000,completed:journal.completed,scope:journal.staging}));
}catch(e){main.namespace.save();fs.writeFileSync(path.join(out,'interrupted.json'),JSON.stringify({version:1,save:JSON.parse(storage['worlds-days-v1']),journal}));fs.writeFileSync(path.join(out,'diagnostic.json'),JSON.stringify(diagnostic()));console.error(JSON.stringify({status:'FAIL',leg,steps,message:e.message,diagnostic:path.join(out,'diagnostic.json')}));throw e;}
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/tavern-management-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
