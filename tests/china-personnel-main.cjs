// First production-main personnel route. Real Three scene, 31 original NPCs,
// shared player navigation, source books, court/social ownership and palace
// emperor movement. DOM/renderer are simulated; not browser/iOS/visual QA.
// Run SERIAL under flock + scripts/guard-process-tree.py (180s/1152MiB).
// Default resumes the local completed checkpoint, or the committed actual
// last completed fixture. PERSONNEL_MAIN_FRESH=1 replays the six-desk route.
// PERSONNEL_MAIN_BUNDLED=1 explicitly resumes the committed latest checkpoint.
// Default cold continuation does not rerun or claim fresh six-desk coverage.
// Completed milestones survive an external kill. PERSONNEL_MAIN_STOP_AFTER names a completed milestone;
// PERSONNEL_MAIN_FROM names a save checkpoint for a deliberate branch check.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let harness = fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8');
function once(a, b) {
  if (!harness.includes(a) || harness.indexOf(a) !== harness.lastIndexOf(a)) throw Error('Changed fixture seam: ' + a);
  harness = harness.replace(a, b);
}
const seams = `
export function personnelMainReview(){return {saved,player,npcs,lot,furniture,formalCareers,copperLedger,chinaOfficialEconomy,chinaAudience,chinaCareer,chinaPersonnelCareer,chinaPersonnelAppointment,chinaPalace,npcSocial,careerHandbook,simulationClock,path,targetStation,pendingInteraction};}
export function personnelMainStep(dt,beforePlayer=null){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);beforePlayer?.(personnelMainArrival());updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);updateCamera(dt);}
export function personnelMainConditions(){const lu=npcs.find(n=>n.station.id==='cn-official-personnel'),body=n=>n?.bodyId||n?.root?.userData?.bodyId||n?.actorId||n?.station?.id;return {player:{bodyId:body(player),alive:player?.alive!==false,visible:player?.root?.visible,walking:player?.walking,position:player?.root?.position.toArray()},lu:{bodyId:body(lu),alive:lu?.alive!==false,visible:lu?.root?.visible,walking:lu?.walking,position:lu?.root?.position.toArray()},cameraDistance:camera.position.distanceTo(camTarget),standing:{seated:!!seated,bathTransition:!!bathTransition,toiletPose:!!activeDailyToilet()?.playerPose()},busy:{interactionMenuOpen:!!interactionMenuOpen(),performing:!!performing,social:!!npcSocial?.active(),salon:!!chinaSalon?.active(),cleaning:!!chinaLabor?.isCleaning(),court:!!chinaCareer?.isActing(),personnel:!!chinaPersonnelCareer?.isActing()},openMenus:Object.entries({family:familyRuntime?.isOpen(),palace:palaceCompanionshipUI?.isOpen(),conversation:playerConversationUI.isOpen(),consort:chinaConsortUI?.isOpen(),context:contextMenu.isOpen(),passport:travelPassport.isOpen(),study:studyMenu.isOpen(),wallet:currencyWallet?.isOpen(),career:careerHandbook.isOpen(),outfit:outfitPreview.state().open,performance:japanPerformanceUI?.isOpen(),japanService:japanServiceUI?.isOpen(),tavern:chinaTavernUI?.isOpen(),lodging:chinaLodgingUI?.isOpen(),moneyHouse:chinaMoneyHouse?.isOpen(),service:chinaService?.isOpen(),labor:chinaLabor?.isOpen(),salon:chinaSalonUI?.isOpen()}).filter(([,open])=>open).map(([name])=>name)};}
export function personnelMainArrival(){const selected=pendingInteraction||targetStation;if(selected?.provider!=='china-personnel-appointment'||selected.kind!=='personnel-promotion-review')return null;const p=player.root.position,oldGap=Math.hypot(p.x-selected.position[0],p.z-selected.position[2]),oldHeightGap=Math.abs(p.y-selected.position[1]);if(path.length>2&&oldGap>.3)return null;const current=resolvePlayerIntent(selected),lu=npcs.find(n=>n.station.id==='cn-official-personnel'),brief=value=>value&&Object.fromEntries(['provider','kind','id','position','intentKey','executionRadius','visualAnchor','awaitingReception'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]])),radius=current?.executionRadius??.016;return {selected:brief(selected),current:brief(current),keysMatch:!!current&&selected.intentKey===current.intentKey,oldGap,oldHeightGap,currentGap:current?Math.hypot(p.x-current.position[0],p.z-current.position[2]):null,currentHeightGap:current?Math.abs(p.y-current.position[1]):null,near:!!current&&nearbyInteraction(current,p,{radius,clear:()=>true}),clear:!!current&&nearbyInteractionClear(current),nearAndClear:!!current&&nearbyInteraction(current,p,{radius,clear:nearbyInteractionClear}),player:p.toArray(),pathLength:path.length,lu:{position:lu.root.position.toArray(),bodyId:lu.bodyId||lu.root.userData.bodyId||lu.actorId||lu.station.id,alive:lu.alive!==false,walking:lu.walking,visible:lu.root.visible},meeting:npcSocial.meetingState(),runtime:chinaPersonnelAppointment.snapshot()};}
export {requestStationIntent,save};
`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(readProduction(file),");
once('const cache=new Map();', `const cache=new Map();function readProduction(file){let source=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){const gate='const CHINA_PERSONNEL_TRIAL_ENABLED=false;';assert.equal(source.split(gate).length,2,'Exact unpublished test-only activation seam');source=source.replace(gate,'const CHINA_PERSONNEL_TRIAL_ENABLED=true;')+${JSON.stringify(seams)};}return source;}`);
once('vm.createContext({console,', 'vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');", "const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode),'Fresh globe or ordinary auto-restored lot');");
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
once("const main=mod(path.join(root,'game/main.js'));", String.raw`
const output=path.resolve('qa/personnel-main');fs.mkdirSync(output,{recursive:true});
const clone=value=>JSON.parse(JSON.stringify(value)),latest=path.join(output,'latest.json');
const fresh=process.env.PERSONNEL_MAIN_FRESH==='1',forceBundle=process.env.PERSONNEL_MAIN_BUNDLED==='1',fixture=path.resolve('tests/fixtures/personnel-main-checkpoint.json');
if(forceBundle&&!fresh&&!process.env.PERSONNEL_MAIN_FROM)assert(fs.existsSync(fixture),'Requested committed checkpoint exists');
const bundled=!fresh&&(forceBundle||!fs.existsSync(latest))&&fs.existsSync(fixture)?JSON.parse(fs.readFileSync(fixture,'utf8')):null;
let journal=bundled?.journal||(!fresh&&fs.existsSync(latest)?JSON.parse(fs.readFileSync(latest,'utf8')):{version:1,completed:[],evidence:[]});
const from=process.env.PERSONNEL_MAIN_FROM;
if(from){storage['worlds-days-v1']=fs.readFileSync(path.resolve(output,from),'utf8');journal={version:1,completed:[],evidence:[],branchFrom:from};}
else if(bundled){assert.equal(bundled.version,1);storage['worlds-days-v1']=JSON.stringify(bundled.save);journal.provenance=bundled.provenance;}
else if(journal.saveFile)storage['worlds-days-v1']=fs.readFileSync(path.join(output,journal.saveFile),'utf8');
else {
 const seed=await require(path.resolve('tests/fixtures/personnel-main-seed.cjs'))({prior:JSON.parse(storage['worlds-days-v1']),mod,linker,root,assert});
 storage['worlds-days-v1']=JSON.stringify(seed.save);journal.seed=seed.seed;journal.staging=seed.staging;journal.source=clone(seed.source);
 fs.writeFileSync(path.join(output,'staged-seed.json'),storage['worlds-days-v1']);
}
if(process.env.PERSONNEL_MAIN_ATTENDANCE==='1'){
 assert(from,'Attendance interference check must use an explicit document-held source checkpoint');
 const prior=JSON.parse(storage['worlds-days-v1']);prior.simulationClock={version:1,seconds:(8*1440+10*60-600)/.7};
 storage['worlds-days-v1']=JSON.stringify(prior);
 journal.staging='Only the calendar is advanced to day8 10:00 from the real day7 document-held checkpoint; no full day is simulated and no actor or court endpoint is placed.';
}
const main=mod(path.join(root,'game/main.js'));
`);
const begin = harness.indexOf('const report=[];for(let round=0;');
if (begin < 0) throw Error('Missing bounded harness body');
harness = harness.slice(0, begin) + String.raw`
const started=Date.now()-process.uptime()*1000,done=name=>journal.completed.includes(name),P='personnel-promotion-',LU='cn-official-personnel';
let r,steps=0,currentLeg='boot';
const review=()=>main.namespace.personnelMainReview();
if(state().mode==='globe'){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}r=review();
assert.equal(state().region,'china');assert.equal(r.npcs.length,31);assert(r.chinaPersonnelCareer);assert(r.chinaPersonnelAppointment);
assert.equal(r.chinaPersonnelCareer.state().loadError,null);assert.equal(r.chinaPersonnelAppointment.state().loadError,null);
const career=()=>r.formalCareers,job=()=>r.chinaPersonnelCareer.state().case,app=()=>career().promotionSummary().application;
const actorIds=r.npcs.map(n=>n.station.id),originals=new Map(r.npcs.map(n=>[n.station.id,n]));
const paper=r.lot.group.getObjectByName('career-appointment-document'),roster=r.lot.group.getObjectByName('personnel-roster-document');
assert(paper);assert(roster);const paperHome=paper.parent===r.player.root.userData.hands[1]?r.lot.group:paper.parent;
const originalsSignature=()=>clone({actors:r.npcs.map(n=>({id:n.station.id,bodyId:n.bodyId||n.root.userData.bodyId||n.station.id,name:n.station.npcName,home:n.home.toArray(),look:clone(n.root.userData.appearance)})),beds:r.furniture.items.filter(i=>i.kind==='bed').map(i=>({id:i.id,position:i.position,ownerId:i.ownerId,privateRoomId:i.privateRoomId})),books:r.npcs.filter(n=>n.station.courtRole).map(n=>{const book=r.lot.group.getObjectByName('personnel-source-book:'+n.station.id);assert(book);return {id:n.station.id,position:book.position.toArray(),target:book.userData.personnelReadTarget};})});
if(!journal.baseline)journal.baseline={identities:originalsSignature(),bank:clone(r.copperLedger.state()),officialEconomy:clone(r.chinaOfficialEconomy.state()),skills:clone(career().state().skills),lastDuty:clone(career().state().lastDuty),rank:career().currentRole().rankId,wage:career().currentRole().wage};
const invariants=()=>{assert.equal(r.npcs.length,31);assert.deepEqual(r.npcs.map(n=>n.station.id),actorIds);for(const n of r.npcs)assert.equal(n,originals.get(n.station.id),'same original runtime actor');assert.deepEqual(originalsSignature(),journal.baseline.identities);assert.deepEqual(clone(r.copperLedger.state()),journal.baseline.bank,'No player wage before a future contract');const economy=clone(r.chinaOfficialEconomy.state()),old=journal.baseline.officialEconomy;assert.deepEqual(economy.transactions.slice(0,old.transactions.length),old.transactions,'Old NPC transactions stay unchanged');assert.deepEqual(economy.payPolicy,old.payPolicy);assert.equal(economy.dailyWage,old.dailyWage);assert.deepEqual(economy.dailyWages,old.dailyWages);for(const event of economy.transactions.slice(old.transactions.length)){assert(r.npcs.some(n=>n.station.courtRole&&n.station.id===event.actorId),'Only original six NPC accounts');assert(['duty','withdraw','meal-payment','meal-refund','salon-reserve','salon-settle','salon-refund'].includes(event.action));if(event.action==='duty'){assert.equal(event.evidence.kind,'office-work');assert.equal(event.evidence.actorId,event.actorId);assert.equal(event.evidence.completed,true);assert(event.evidence.elapsed>=8);assert.equal(event.amount,r.chinaOfficialEconomy.dailyWageFor(event.actorId,event.day));}}assert.deepEqual(clone(career().state().skills),journal.baseline.skills);};
const diagnostic=()=>{const live=review(),emperor=r.npcs.find(n=>n.station.id==='cn-emperor');return {leg:currentLeg,steps,seconds:(Date.now()-started)/1000,clock:state().simulationClock,player:state().player,pathLength:state().pathLength,path:live.path.slice(0,5).map(p=>[p.x,p.y,p.z]),target:live.targetStation,pending:live.pendingInteraction,roster:r.chinaPersonnelCareer.state(),appointment:r.chinaPersonnelAppointment.state(),career:career().promotionSummary(),lu:{position:originals.get(LU).root.position.toArray(),walking:originals.get(LU).walking,status:r.chinaAudience.socialStatus(originals.get(LU))},emperor:{position:emperor.root.position.toArray(),walking:emperor.walking},palace:r.chinaPalace.state(),meeting:r.npcSocial.meetingState(),toast:ids.toast.textContent};};
const step=(count=1,dt=.1)=>{for(let i=0;i<count;i++){now+=dt*1000;main.namespace.personnelMainStep(dt);steps++;}};
const until=(predicate,label,limit=1600)=>{currentLeg=label;for(let i=0;i<limit&&!predicate();i++)step();if(!predicate())throw Error(label+' did not complete: '+JSON.stringify(diagnostic()));};
const request=kind=>{r.careerHandbook.close();const service=kind.startsWith(P)?r.chinaPersonnelAppointment:kind.startsWith('personnel-')?r.chinaPersonnelCareer:r.chinaCareer;const intent=service.intent(kind);assert(intent,kind+' unavailable '+JSON.stringify(diagnostic()));assert(main.namespace.requestStationIntent(intent),kind+' request failed '+JSON.stringify(diagnostic()));return intent;};
const cancel=kind=>{request(kind);assert.equal(state().pathLength,0);assert.equal(review().pendingInteraction,null);assert.equal(r.npcSocial.meetingState(),null);};
function checkpoint(name,evidence={}){
 invariants();assert(main.namespace.save(),'ordinary production save');
 const file=name+'.json';fs.writeFileSync(path.join(output,file),storage['worlds-days-v1']);
 if(!done(name))journal.completed.push(name);journal.saveFile=file;
 journal.evidence.push({milestone:name,clock:clone(state().simulationClock),player:clone(state().player),...clone(evidence)});
 fs.writeFileSync(path.join(output,'latest.tmp'),JSON.stringify(journal,null,2));fs.renameSync(path.join(output,'latest.tmp'),latest);
 console.log('MILESTONE',name,JSON.stringify(evidence));
 if(process.env.PERSONNEL_MAIN_STOP_AFTER===name||Date.now()-started>110000){console.log(JSON.stringify({status:'CHECKPOINT',milestone:name,resume:latest,seconds:(Date.now()-started)/1000}));return true;}return false;
}
try {
 if(process.env.PERSONNEL_MAIN_DIAGNOSTIC==='arrival'){
  assert.equal(app().stage,'submitted');assert(r.chinaPersonnelAppointment.isActing());
  const samples=[],boot=clone(main.namespace.personnelMainConditions());let savedBefore=null,lost=false;
  for(let i=0;i<1600;i++){
   now+=100;main.namespace.personnelMainStep(.1,value=>{if(!value)return;const row={step:steps+1,...clone(value)};samples.push(row);if(samples.length>64)samples.shift();if(!savedBefore&&row.oldGap<=.3&&row.oldHeightGap<=.3&&row.meeting?.owner==='personnel-promotion-review'){assert(main.namespace.save());fs.writeFileSync(path.resolve('qa/arrival-before-cancel.json'),storage['worlds-days-v1']);savedBefore=row;}});steps++;
   if(!r.chinaPersonnelAppointment.isActing()&&app().stage==='submitted'||ids.toast.textContent.includes('当前动作已变化')){lost=true;break;}
   if(app().stage!=='submitted')break;
  }
  const result={scope:'Observation-only actual06 arrival diagnostic; stop at first lost queue; original product arrival guard unchanged',steps,lost,boot,savedBefore,samples,after:{conditions:clone(main.namespace.personnelMainConditions()),runtime:r.chinaPersonnelAppointment.snapshot(),application:{id:app().id,stage:app().stage,status:app().status},pathLength:state().pathLength,meeting:r.npcSocial.meetingState(),toast:ids.toast.textContent}};
  fs.writeFileSync(path.resolve('qa/personnel-arrival-diagnostic.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({scope:result.scope,steps,lost,savedBefore:!!savedBefore,last:samples.at(-1),after:result.after}));return;
 }
 if(process.env.PERSONNEL_MAIN_DIAGNOSTIC==='wait-boot'){
  const sample=at=>({at,conditions:clone(main.namespace.personnelMainConditions()),samePlayer:review().player===r.player,sameLu:review().npcs.find(n=>n.station.id===LU)===originals.get(LU),activity:clone(r.chinaPersonnelAppointment.snapshot()),application:{id:app()?.id,status:app()?.status,stage:app()?.stage},playerPathLength:state().pathLength,meeting:r.npcSocial.meetingState()});
  const samples=[sample('cold-boot')];for(let i=0;i<2;i++){step();samples.push(sample('step-'+(i+1)));if(!r.chinaPersonnelAppointment.isActing())break;}
  const result={scope:'Same actual06 cold boot; at most two production steps with normal updateCamera; no checkpoint/latest overwrite',samples};
  fs.writeFileSync(path.resolve('qa/boot-wait-diagnostic.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
 }
 if(process.env.PERSONNEL_MAIN_ATTENDANCE==='1'){
  assert.equal(app().stage,'document-held');assert.equal(career().currentRole().rankId,'cn-records-regular');assert.equal(career().currentRole().wage,22);
  const approvalBefore=clone(app()),clockBefore=clone(state().simulationClock);assert.equal(paper.parent,r.player.root.userData.hands[1]);assert.equal(paper.userData.personnelAppointmentId,app().id);
  request(P+'imperial-review');until(()=>r.chinaPersonnelAppointment.isWaiting(),'actual public arrival begins royal approval wait',1600);
  const applicationId=app().id,approvalWait=clone(r.chinaPersonnelAppointment.snapshot().activity);request('attend');
  assert.equal(r.chinaPersonnelAppointment.isActing(),false);assert.equal(r.chinaPersonnelAppointment.state().royalOwner,null);
  assert.equal(review().pendingInteraction?.provider,'china-court-career');
  step(30);assert.equal(r.chinaPersonnelAppointment.isActing(),false);assert.equal(review().pendingInteraction?.provider,'china-court-career','queued approval cannot steal ordinary attendance path');const routeAfterThreeSeconds={provider:review().pendingInteraction.provider,player:clone(state().player),pathLength:state().pathLength};
  until(()=>career().workState().lastDuty?.day===8&&career().workState().lastDuty?.stage==='arrived','actual next-day ordinary attendance',1400);
  assert.equal(app().id,applicationId);assert.equal(app().stage,'document-held');assert.equal(career().workState().lastDuty.officialRankId,'cn-records-regular');
  assert.deepEqual(clone(app()),approvalBefore,'Attendance never changes the application or stored decision');assert.equal(paper.parent,r.player.root.userData.hands[1]);assert.equal(paper.userData.personnelAppointmentId,applicationId);assert.equal(r.chinaPersonnelAppointment.isActing(),false);
  invariants();assert(main.namespace.save());const persisted=JSON.parse(storage['worlds-days-v1']);assert.deepEqual(persisted.formalCareers.lastDuty,clone(career().workState().lastDuty));
  const result={status:'PASS',scope:'Calendar-only staged day8; real main attendance cancels royal approval wait and retains its own actual path until the original court place; no full-day simulation',sourceCheckpoint:from,clockBefore,clockAfter:clone(state().simulationClock),applicationId,applicationUnchanged:true,paperName:paper.name,sameOriginalPaperHeld:true,approvalWait,routeAfterThreeSeconds,duty:clone(career().workState().lastDuty),futureRoleWage:career().currentRole().wage,playerBankUnchanged:true,original31Unchanged:true,steps,seconds:(Date.now()-started)/1000};
  fs.writeFileSync(path.join(output,'attendance-cancels-approval.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));return;
 }
 if(!done('00-initial')){assert.equal(job(),null);assert.equal(career().currentRole().rankId,'cn-records-regular');assert.equal(career().promotionSummary().qualifiedDays,3);assert.equal(career().promotionSummary().balance,3);if(checkpoint('00-initial',{scope:journal.staging}))return;}
 if(!done('01-claimed')){request('personnel-claim');until(()=>!!job(),'walk from actual scene spawn to claim');assert.equal(job().status,'draft');assert.equal(job().rows.filter(row=>row.visit).length,0);assert.deepEqual(clone(job().source),clone(r.chinaAudience.personnelSource(job().day,job().source.throughSerial)),'Claim freezes its actual committed source boundary');if(checkpoint('01-claimed',{caseId:job().id,mixedOriginals:job().source.archives.map(row=>row.actorId)}))return;}
 const authors=job().rows.map(row=>row.actorId);
 for(let i=0;i<authors.length;i++){
  const id=authors[i],milestone='02-read-'+i;
  if(done(milestone))continue;
  request('personnel-read:'+id);
  until(()=>!!job().rows.find(row=>row.actorId===id).visit,'actual original source desk '+id);
  const visit=job().rows.find(row=>row.actorId===id).visit;assert.equal(visit.duration,3);assert.equal(visit.elapsed,3);
  const answer=job().source.archives.some(row=>row.actorId===id)?'accepted':'awaiting';
  request('personnel-record:'+id+':'+answer);until(()=>job().rows.find(row=>row.actorId===id).archiveStatus===answer,'manual source answer '+id,10);
  if(checkpoint(milestone,{actorId:id,answer,proof:visit}))return;
 }
 if(!done('03-compiled')){request('personnel-compile');until(()=>!!job().compiled,'actual own desk eight-second compilation');assert.equal(job().compiled.proof.elapsed,8);assert.equal(job().compiled.proof.duration,8);if(checkpoint('03-compiled',{caseId:job().id,proof:job().compiled.proof}))return;}
 if(!done('04-signed')){request('personnel-review');until(()=>job().status==='signed','original Lu actual four-second trial signing');assert.equal(job().receipt.signerId,LU);assert.equal(job().reviews.at(-1).proof.elapsed,4);if(checkpoint('04-signed',{caseId:job().id,receipt:job().receipt,proof:job().reviews.at(-1).proof}))return;}
 if(!done('05-applied')){request(P+'apply');until(()=>app()?.toRankId==='cn-records-personnel'&&app().stage==='submitted','actual registration new promotion application');assert.equal(career().currentRole().rankId,'cn-records-regular');if(checkpoint('05-applied',{applicationId:app().id}))return;}
 if(!done('06-approach-saved')){
  request(P+'review');assert(r.chinaPersonnelAppointment.isActing());cancel(P+'cancel');assert.equal(app().stage,'submitted');
  request(P+'review');step(2);assert(r.chinaPersonnelAppointment.isActing());
  checkpoint('06-approach-saved',{applicationId:app().id,cancelReleased:true,activity:r.chinaPersonnelAppointment.state().activity,position:r.player.root.position.toArray()});
  console.log('CHECKPOINT cold restart required to verify actual approach restoration');return;
 }
 if(!done('07-recommended')){
  assert.equal(app().stage,'submitted');assert(r.chinaPersonnelAppointment.isActing(),'actual cold main restored the explicit review approach');
  assert.equal(r.chinaPersonnelAppointment.state().loadError,null);until(()=>app()?.stage==='document-ready','cold-restored actual Lu four-second recommendation');
  assert(app().recommendation);assert.equal(career().currentRole().rankId,'cn-records-regular');assert.equal(r.npcSocial.meetingState(),null);
  if(checkpoint('07-recommended',{applicationId:app().id,recommendation:app().recommendation,coldApproach:true}))return;
 }
 if(!done('08-document-held')){request(P+'receive-document');until(()=>app()?.stage==='document-held','same original physical recommendation pickup');assert.equal(paper.parent,r.player.root.userData.hands[1]);assert.equal(paper.userData.personnelAppointmentId,app().id);if(checkpoint('08-document-held',{applicationId:app().id,paperName:paper.name,paperHeld:true}))return;}
 if(!done('09-imperial-approved')){
  const emperor=originals.get('cn-emperor'),before=emperor.root.position.clone(),applicationId=app().id;
  request(P+'imperial-review');let moved=0,publicTicks=0;
  currentLeg='actual palace-owned imperial public approach and four-second review';
  for(let i=0;i<2400&&app().stage==='document-held';i++){
   step();if(emperor.root.position.distanceTo(before)>.1)moved++;
   const position=emperor.root.position,owner=r.chinaPersonnelAppointment.state().royalOwner,duty=owner&&r.chinaPalace.dutyState(owner);if(Math.hypot(position.x+15.1,position.z+13.35)<.3&&Math.abs(position.y-.215)<.3&&!emperor.walking&&duty?.ready===true&&duty.stage==='duty-public-review')publicTicks++;
  }
  assert.equal(app().id,applicationId);assert.equal(app().stage,'imperial-approved',JSON.stringify(diagnostic()));assert(publicTicks>=39,'actual palace duty supports four-second review at the public endpoint');const proof=app().imperialDecision.proof;assert.equal(proof.targetId,'cn-emperor');assert.equal(proof.recipientBodyId,emperor.bodyId||emperor.root.userData.bodyId||emperor.station.id);assert.equal(proof.elapsed,4);assert.equal(proof.duration,4);assert(Math.hypot(proof.recipientPosition[0]+15.1,proof.recipientPosition[2]+13.35)<.25&&Math.abs(proof.recipientPosition[1]-.215)<.3);
  assert.equal(career().currentRole().rankId,'cn-records-regular');assert.equal(paper.parent,r.player.root.userData.hands[1]);assert.equal(paper.userData.personnelAppointmentId,applicationId);
  if(checkpoint('09-imperial-approved',{applicationId,emperorStart:before.toArray(),emperorEnd:emperor.root.position.toArray(),palaceMovedTicks:moved,emperorAlreadyPublic:Math.hypot(before.x+15.1,before.z+13.35)<.25&&Math.abs(before.y-.215)<.3,publicTicks,imperialDecision:app().imperialDecision}))return;
 }
 if(!done('10-appointed')){
  request(P+'appointment');until(()=>r.chinaPersonnelAppointment.state().activity==='appointment'&&r.chinaPersonnelAppointment.state().progress>0,'actual original registry declaration begins');
  while(r.chinaPersonnelAppointment.state().progress*3<2.89)step();
  assert.equal(career().currentRole().rankId,'cn-records-regular','2.9 seconds cannot grant rank');assert.equal(app().stage,'imperial-approved');
  const before=clone(career().state().lastDuty);until(()=>app()?.status==='approved','actual original registry three-second declaration',5);
  assert.equal(career().currentRole().rankId,'cn-records-personnel');assert.equal(career().currentRole().gradeLabel,'从八品');assert.deepEqual(clone(career().state().lastDuty),before);
  assert.equal(paper.name,'career-appointment-document');assert.notEqual(paper.parent,r.player.root.userData.hands[1]);assert.equal(r.chinaPersonnelAppointment.intent(P+'appointment'),null);
  if(checkpoint('10-appointed',{applicationId:app().id,grade:career().currentRole().gradeLabel,oldDutyUnchanged:true,bankUnchanged:true}))return;
 }
 invariants();console.log(JSON.stringify({status:'PASS',scope:'Actual production main full trial and personnel promotion route through shared navigation; real original31 actors and original books/desks/beds/paper; only unpublished feature gate activated; explicit seed, simulated DOM/renderer, not browser/iOS/natural multi-day validation',checkpoints:journal.completed,seconds:(Date.now()-started)/1000}));
}catch(error){try{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify(diagnostic(),null,2));}catch{}throw error;}
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/china-personnel-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
