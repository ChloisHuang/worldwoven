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
// Later preparation/investiture/duty segments must continue this same journal.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let harness = fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8');
function once(before, after) {
  if (!harness.includes(before) || harness.indexOf(before) !== harness.lastIndexOf(before)) throw Error('Changed harness seam: ' + before);
  harness = harness.replace(before, after);
}
const seams = `
export function usurpationMainReview(){return {saved,player,npcs,lot,furniture,palaceUsurpation,palaceUsurpationUI,chinaUsurpationActions,serviceMenus,simulationClock,chinaAudience,chinaEdict,chinaPalace,chinaArchery,chinaRoyalKitchen,chinaRoyalKitchenEmployment,formalCareers,relationshipEvents,playerConversations,npcSocial,path,targetStation,pendingInteraction};}
export function usurpationMainStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);palaceUsurpationUI?.update();updateCamera(dt);}
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
 storage['worlds-days-v1']=JSON.stringify(input.save);journal=input.journal;coldInput=clone(input.save.palaceUsurpation||null);
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
 if(done('03-political-response')&&(process.env.USURPATION_MAIN_PHASE!=='political'||!done('04-cold-same-case'))){
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
 if(process.env.USURPATION_MAIN_PHASE==='political'){
  assert(done('04-cold-same-case'),'Resume the remotely preserved cold checkpoint');
  assert.deepEqual(clone(core.snapshot()),coldInput,'No history replacement before physical continuation');
  assert.deepEqual(clone(task().pledges),journal.pledges);
  assert.equal(task().id,journal.caseId);
  for(const [actorId,milestone] of [['cn-official-rites','05-rites-response'],['cn-official-justice','06-justice-response']]){
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
  console.log(JSON.stringify({status:'PASS',scope:'Same case, two existing ordinary court supporters physically answer; no new support, political decision or preparation is staged',checkpoint:checkpointPath,completed:journal.completed}));return;
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
