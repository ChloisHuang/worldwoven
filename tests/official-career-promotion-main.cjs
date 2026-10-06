// A single affected production route. Simulated DOM and renderer, real Three
// actors/navigation/world/storage; this is not browser or iOS validation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);harness=harness.replace(before,after);}
const extra=`
export function applicationReview(){return {player,npcs,formalCareers,chinaService,chinaCareer,chinaAudience,chinaTavern,careerHandbook,copperLedger,npcSocial};}
export function applicationStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export {requestStationIntent,navigateTo,cancelAction};`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=String.raw`
{const prior=JSON.parse(storage['worlds-days-v1']),core=mod(path.join(root,'game/formal-careers.js')),money=mod(path.join(root,'game/currency-ledger.js'));await core.link(linker);await core.evaluate();if(money.status==='unlinked')await money.link(linker);await money.evaluate();
 const c={day:1,hour:8,seconds:0};prior.appearance.seed=3;
 const bank=money.namespace.createGameCurrencyLedger({saved:prior,getClock:()=>c,storage:{setItem:()=>{}}});
 let initial=core.namespace.createFormalCareers({getClock:()=>c,saveState:()=>{}}).state();initial.skills.ritual=2;initial.skills.writing=2;
 const career=core.namespace.createFormalCareers({saved:initial,worldSeed:3,getClock:()=>c,saveState:s=>{prior.formalCareers=s;},creditWageToBank:d=>bank.creditWageToBank(d)});
 assert(career.apply('cn-court-clerk',{ageYears:22}).ok);const id=career.applicationResult().id;for(const step of ['interview','receive-document','appointment'])assert(career.reviewApplication('cn-court-clerk',{ageYears:22,applicationId:id,step}).ok);
 for(let day=1;day<=3;day++){c.day=day;c.hour=10;career.observeDay();assert(career.beginDuty().ok);c.hour=11.5;assert(career.dutyEvent('court-start').ok);c.hour=12;assert(career.dutyEvent('court-completed').ok);assert(career.dutyEvent('archive-completed').ok);assert(career.settle().ok);}
 prior.simulationClock={version:1,seconds:(3*1440+12*60-600)/.7};prior.chinaAudience={day:3,calledDay:3,outcome:'completed'};storage['worlds-days-v1']=JSON.stringify(prior);
}
`
replaceOnce("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),roleId='cn-court-clerk',checks=[];let r;
const record=label=>{checks.push(label);console.log('PASS',label);};
const enter=()=>{all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();r=main.namespace.applicationReview();assert(r.chinaCareer);};
const step=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.applicationStep(.1);if(Date.now()-started>300000)throw Error('focused time cap');assert(process.memoryUsage().rss<1.2*1024**3);}};
const detail=()=>({player:state().player,path:state().pathLength,clock:state().simulationClock,promotion:r.formalCareers.promotionSummary(),toast:ids.toast.textContent});
const until=(pred,label,limit=2200)=>{for(let i=0;i<limit&&!pred();i++)step();assert(pred(),label+' '+JSON.stringify(detail()));record(label);};
const request=kind=>{r.careerHandbook.close();const next=r.chinaCareer.intent(kind);assert(next,kind+' '+JSON.stringify(detail()));assert(main.namespace.requestStationIntent(next),kind+' '+JSON.stringify({next,...detail(),reviewer:r.npcs.find(n=>n.station.id==='cn-official-rites')?.root.position.toArray()}));};
enter();assert.equal(r.formalCareers.promotionSummary().qualifiedDays,3);assert.equal(r.formalCareers.currentRole().wage,18);const beforeBank=JSON.stringify(r.copperLedger.state()),beforeDuty=JSON.stringify(r.formalCareers.state().lastDuty);
if(process.env.PROMOTION_WALKING==='1')r.player.root.position.set(...r.chinaCareer.intent('promotion-apply').position); // legal registry checkpoint; initial journey is covered by the unmodified mode
request('promotion-apply');until(()=>r.formalCareers.promotionSummary().application?.status==='pending','normal arrival walks to the original bureau registry and submits a promotion');
const receipt=r.formalCareers.promotionSummary().application,id=receipt.id,roll=receipt.roll;assert.equal(receipt.review,null);assert.equal(r.formalCareers.currentRole().gradeLabel,'从九品');r.careerHandbook.close();step(5);assert.equal(r.formalCareers.promotionSummary().application.stage,'submitted');
// Replay an ordinary return-home walk in the original loaded six-official scene.
// Actor coordinates and all shared geometry are real; only the saved intention is selected.
if(process.env.PROMOTION_WALKING==='1'){
 const npc=r.npcs.find(n=>n.station.courtRole==='rites'),checkpoint=r.chinaAudience.snapshot(),row=checkpoint.life.runtime.stages.find(([actorId])=>actorId===npc.station.id)[1];
 Object.assign(row,{id:'life-rest',idle:false,arrived:false,called:false,courtReady:false,borrowed:false,mount:null,mountTarget:null,pairId:null,choice:{id:'rest',point:[24.4,3.915,32.1],duration:24,relief:{fatigue:-.7}},path:[[24.4,3.915,32.1]],index:0,planned:false,elapsed:0,duration:24,label:'回自己的值宿室歇息'});
 assert(r.chinaAudience.restore(checkpoint));step(2);assert(npc.walking,'real official return-home route moves');
 r.careerHandbook.open(false);const button=all.filter(e=>e.tagName==='button'&&(e.textContent||'').includes('呈实任考语')).at(-1);assert(button,'actual promotion button visible');
 const rendered=r.chinaCareer.intent('promotion-review'),before=npc.root.position.clone();step(2);assert(npc.root.position.distanceTo(before)>.01);assert.equal(r.chinaCareer.intent('promotion-review').intentKey,rendered.intentKey,'walking does not invalidate the rendered button');
 button.onclick();assert(r.npcSocial.meetingState(),'real button dispatch holds moving current reviewer');assert(state().pathLength>0,'button dispatch creates real player route');const held=npc.root.position.clone(),route=npc.route;step(5);assert(npc.root.position.distanceTo(held)<1e-8);assert.equal(npc.route,route);
 main.namespace.cancelAction();step(2);assert.equal(r.npcSocial.meetingState(),null);assert(npc.root.position.distanceTo(held)>.01,'cancel resumes same original path');
 record('rendered promotion button survives moving reviewer; real multi-NPC route starts, reviewer pauses, cancel resumes original return-home walk');
}
assert.equal(r.npcSocial.meetingState(),null);request('promotion-review');assert.equal(r.npcSocial.meetingState()?.owner,'court-career-review');main.namespace.cancelAction();assert.equal(r.npcSocial.meetingState(),null);assert.equal(r.formalCareers.promotionSummary().application.stage,'submitted');record('an explicit review approach reserves a bounded meeting; cancelling immediately releases it and preserves the application');
request('promotion-review');until(()=>r.formalCareers.promotionSummary().application?.stage==='document-ready','shared route reaches Shen Xu for the actual promotion review');assert.equal(r.formalCareers.currentRole().gradeLabel,'从九品');assert.equal(r.npcSocial.meetingState(),null);
if(process.env.PROMOTION_MEETING_ONLY==='1'){ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify({status:'PASS',checks,scope:'One effective reserved review intent; actual public navigation, explicit cancel releases meeting, completed review releases meeting. Prior paper/reentry/declaration evidence reused; simulated DOM/renderer, not iOS',seconds:(Date.now()-started)/1000}));return;}
request('promotion-receive-document');until(()=>r.formalCareers.promotionSummary().application?.stage==='document-held','return to the original archive physically picks up the promotion document');step(2);assert(r.player.root.userData.hands[1].children.some(o=>o.name==='career-appointment-document'));
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);enter();step(2);assert.equal(r.formalCareers.promotionSummary().application.id,id);assert.equal(r.formalCareers.promotionSummary().application.roll,roll);assert.equal(r.formalCareers.currentRole().gradeLabel,'从九品');assert(r.player.root.userData.hands[1].children.some(o=>o.name==='career-appointment-document'));record('region reload retains the same application, approved review and physical paper without granting the rank');
request('promotion-appointment');until(()=>r.formalCareers.promotionSummary().application?.status==='approved','walk back to registry and read the held document for three seconds');assert.equal(r.formalCareers.currentRole().gradeLabel,'正九品');assert.equal(r.formalCareers.currentRole().wage,22);assert.equal(JSON.stringify(r.copperLedger.state()),beforeBank);assert.equal(JSON.stringify(r.formalCareers.state().lastDuty),beforeDuty);assert.equal(r.chinaCareer.intent('promotion-appointment'),null);record('appointment changes only future rank pay; old paid wage and bank balance are unchanged');
r.careerHandbook.open(false);const words=e=>[e.textContent||'',...e.children.map(words)].join(' '),text=words(all.find(e=>e.className.split(' ').includes('career-dialog')&&e.open));assert(text.includes('正九品')&&text.includes('实任资历'),text);r.careerHandbook.close();
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify({status:'PASS',checks,scope:'One production bureau promotion route with actual Three actors/navigation/storage; prior ceremony evidence reused; simulated DOM and renderer, not iOS',seconds:(Date.now()-started)/1000}));

})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/career-application-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
