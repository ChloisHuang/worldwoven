// Production-main original bedroom checks. Only age 18,
// ritual 1, accepted interview seed and clock day0/10:00 are staged.
// NPC/objects/work/receipts/wages and subsequent clock run through production.
// Default cold-checks the unique paid fixture when present. BEDCHAMBER_FRESH=1
// starts explicit player work; BEDCHAMBER_SCENARIO=npc exercises original Julie independently.
// BEDCHAMBER_PAUSE_AT=pillowWest creates a real partial-cycle checkpoint, exit75.
// Continue BEDCHAMBER_RESUME=<old>/last-save.json BEDCHAMBER_OUT=<new> without restaging.
// Uses the existing shared lock/guard and checkpoint harness. DOM/renderer are
// simulated; passing cannot establish GPU/browser/iOS visuals or mobile FPS.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const paidFixture=path.join(__dirname,'fixtures/france-bedchamber-paid/checkpoint.json');
if(!process.env.BEDCHAMBER_RESUME&&!process.env.BEDCHAMBER_FRESH&&!process.env.BEDCHAMBER_PAUSE_AT&&!['npc','route'].includes(process.env.BEDCHAMBER_SCENARIO)&&fs.existsSync(paidFixture))process.env.BEDCHAMBER_RESUME=paidFixture;
const output=process.env.BEDCHAMBER_OUT||'qa/france-bedchamber-main';
if(process.env.BEDCHAMBER_MAIN_GUARDED!=='1'){
 fs.mkdirSync(output,{recursive:true});
 const result=require('node:child_process').spawnSync('flock',['-n','/workspace/shared/worldwoven-heavy-scene.lock','python','scripts/guard-process-tree.py','--seconds','180','--mib','1152','--samples',output+'/tree-rss.jsonl','--',process.execPath,'--max-old-space-size=768','--experimental-vm-modules',__filename],{stdio:'inherit',env:{...process.env,BEDCHAMBER_MAIN_GUARDED:'1'}});
 if(result.error)throw result.error;process.exit(result.status??1);
}
const startup=Date.now();
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function bedchamberEnter(){travelJourneyUI.close('bedchamber-local-test');return enterRegion('france');}
export function bedchamberClose(){contextMenu.close();playerConversationUI.close();careerHandbook.close();}
export function bedchamberReview(){return {player,npcs,lot,scene,camera,camTarget,franceBedchamber,franceBedchamberEmployment,careerHandbook,formalCareers,copperLedger,furniture};}
export function bedchamberStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);}
export function bedchamberUse(){requestFurniture(furniture.items.find(i=>i.id==='france-furniture-bed-0'));}
export function bedchamberMounted(){return seated;}
export function bedchamberSocial(){return npcSocial?.state();}
export function bedchamberDismiss(){playerConversationUI.close();return cancelAction();}
export function bedchamberView(a,p=.18,d=4.6){yaw=a;pitch=p;distance=d;updateCamera(1,true);}
export {requestStationIntent,standFromSeat,cancelAction,save};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=`if(process.env.BEDCHAMBER_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.BEDCHAMBER_RESUME,'utf8');}else{const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const im=mod(path.join(root,'game/career-applications.js'));if(im.status!=='evaluated'){await im.link(linker);await im.evaluate();}const prior=JSON.parse(storage['worlds-days-v1']);let seed=1;while(im.namespace.careerInterviewRoll(seed,'fr-bedchamber-service',0)>=.2)seed++;prior.appearance.seed=seed;prior.playerProfile={ageYears:18};prior.simulationClock={version:1,seconds:0};prior.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:10,seconds:0})}).state();prior.formalCareers.skills.ritual=1;storage['worlds-days-v1']=JSON.stringify(prior);}`;
once("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));" );
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const role='fr-bedchamber-service',out=process.env.BEDCHAMBER_OUT||'qa/france-bedchamber-main',scenario=process.env.BEDCHAMBER_SCENARIO||'player';fs.mkdirSync(out,{recursive:true});
if(process.env.BEDCHAMBER_RESUME)assert.notEqual(path.resolve(process.env.BEDCHAMBER_RESUME),path.resolve(out+'/last-save.json'));
if(state().mode!=='lot')assert(main.namespace.bedchamberEnter());const r=main.namespace.bedchamberReview(),service=r.franceBedchamberEmployment,care=r.franceBedchamber.care;assert(service);assert.equal(care.state().loadError,null);
const evidence=process.env.BEDCHAMBER_RESUME?JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.BEDCHAMBER_RESUME),'evidence.json'),'utf8')):{version:1,scenario,phase:scenario==='npc'?'bed-use':'apply',frames:0,checks:[],stages:[],contacts:{},roster:r.npcs.map(n=>n.station.id),bank:r.copperLedger.balances().france.bank,initialXP:r.formalCareers.state().skillXP.ritual,fixture:{staged:['age18','ritual1','accepted interview seed','initial day0 10:00'],notStaged:['player/NPC positions','original bed/fabric objects','bed rest or departure','work actions','receipts','wages','subsequent clock']}};
const initialRun={phase:evidence.phase,frames:evidence.frames,checks:evidence.checks.length};
const original=r.lot.franceBedchamber;const originals=[original.cover,...original.embroidery,...original.pillows,...original.folded].map(n=>({object:n,matrix:n.matrixWorld.clone()}));
const item=()=>care.state().item,view=()=>r.franceBedchamber.state();
const detail=()=>({phase:evidence.phase,player:state().player,path:state().pathLength,pending:state().pendingInteraction,mounted:main.namespace.bedchamberMounted()?.id,clock:state().simulationClock,employment:service.state(),care:view(),julie:r.npcs.filter(n=>n.station.id==='france-bedroom').map(n=>({pos:n.root.position.toArray(),route:n.route,walking:n.walking})),social:main.namespace.bedchamberSocial(),toast:ids.toast.textContent});
function checkpoint(name){assert(main.namespace.save()!==false);fs.writeFileSync(out+'/last-save.json',storage['worlds-days-v1']);fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2));if(name){fs.writeFileSync(out+'/'+name+'-save.json',storage['worlds-days-v1']);console.log('MILESTONE',name,JSON.stringify(detail()));}}
function record(s){evidence.checks.push(s);console.log('CHECK',s);checkpoint();}
function observe(){assert.equal(care.state().loadError,null);assert(originals.every(n=>n.object.parent),'all same original textiles/pillows remain in scene');const x=item();if(evidence.stages.at(-1)?.stage!==x.stage||evidence.stages.at(-1)?.cycle!==x.cycle)evidence.stages.push(structuredClone(x));
 for(const actor of [r.player,r.npcs.find(n=>n.station.id==='france-bedroom')]){const m=actor.getPoseMetrics();if(m.action==='linen-care'){const contact=m.linenCareContact;assert(contact,'actual contact metrics exist');const id=actor===r.player?'player':'france-bedroom';evidence.contacts[id]??={frames:0,maxGap:0};evidence.contacts[id].frames++;assert.equal(contact.hands.length,2);assert(contact.hands.every(h=>h.reachError<.002&&Math.abs(h.palm[1]-contact.target[1]-.001)<.002),'actual bare palms meet original textile '+JSON.stringify(contact));const errors=contact.hands.map(h=>h.reachError);evidence.contacts[id].maxGap=Math.max(evidence.contacts[id].maxGap,...errors);}}
}
function step(n=1){for(let i=0;i<n;i++){const social=main.namespace.bedchamberSocial();if(social?.initiator==='npc'&&['choosing','awaiting-consent'].includes(social.stage))main.namespace.bedchamberDismiss();const prev=r.player.root.position.clone();now+=100;main.namespace.bedchamberStep(.1);evidence.frames++;assert(Math.hypot(r.player.root.position.x-prev.x,r.player.root.position.z-prev.z)<.6||main.namespace.bedchamberMounted()||!main.namespace.bedchamberMounted()&&evidence.phase==='bed-leave','continuous walking or legitimate furniture mount/unmount');observe();
 if(process.env.BEDCHAMBER_PAUSE_AT&&evidence.phase==='work'&&item().stage===process.env.BEDCHAMBER_PAUSE_AT&&!evidence.pauseUsed){evidence.pauseUsed=true;evidence.pauseStage=item().stage;checkpoint('partial-original-bed');console.log('CHECKPOINT actual partial original bed; exit75 not PASS');process.exit(75);}
 if((Date.now()-startup)/1000>135){checkpoint();console.log('CHECKPOINT bounded original continuation; exit75 not PASS');process.exit(75);}
}}
function until(fn,label,max=7000){let n=0;for(;n<max&&!fn();n++)step();assert(fn(),label+' '+JSON.stringify(detail()));console.log('REACHED',label,n);}
function request(kind){main.namespace.bedchamberClose();const w=service.intent(kind);assert(w,'missing intent '+kind+' '+JSON.stringify(detail()));assert(main.namespace.requestStationIntent(w),'route '+kind+' '+JSON.stringify(detail()));return w;}
if(process.env.BEDCHAMBER_RESUME){const old=JSON.parse(fs.readFileSync(process.env.BEDCHAMBER_RESUME,'utf8'));assert.equal(state().simulationClock.seconds,old.simulationClock.seconds);assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);assert.deepEqual(item(),old.franceBedchamber.item);assert.equal(r.copperLedger.balances().france.bank,old.copperLedger.balances.france.bank);evidence.coldRestores??=[];evidence.coldRestores.push({cycle:item().cycle,stage:item().stage,owner:item().owner,bank:r.copperLedger.balances().france.bank});record('cold original use/cycle/actors and bank preserved');}
if(evidence.phase==='apply'){request('formal-apply');until(()=>r.formalCareers.applicationResult(role)?.status==='pending','normal spawn through palace to Julie local application');request('formal-review');until(()=>r.formalCareers.isHired(role),'same original Julie personally grants one exclusive role');assert.equal(service.state().job,null);evidence.phase='hired';record('local hiring is separate from starting a shift');}
if(evidence.phase==='hired'){request('accept');until(()=>view().duty.status==='active','same Julie safe physical handoff');evidence.receiptId=service.state().job.receiptId;evidence.phase='bed-use';checkpoint();}
if(evidence.phase==='bed-use'){assert.equal(item().cycle,0);main.namespace.bedchamberClose();main.namespace.bedchamberUse();until(()=>!!main.namespace.bedchamberMounted(),'actual player route and royal-bed mount');until(()=>care.state().users.player?.used===true,'ten actual resting seconds on original bed');assert.equal(item().cycle,0,'occupancy alone does not invent completed departure');assert.equal(service.taskChoices().length,0);evidence.phase='bed-leave';checkpoint('actual-bed-use');}
if(evidence.phase==='bed-leave'){main.namespace.standFromSeat();until(()=>!main.namespace.bedchamberMounted(),'actual original-bed departure');until(()=>item().cycle===1,'same departed use creates original care');evidence.useId=item().useId;evidence.phase=scenario==='npc'?'npc-work':'resume';record('original bed remains usable; real rest/leave is sole care source');}
if(evidence.phase==='resume'){request('resume');until(()=>view().duty.status==='active','local resume of original shift after bed rest');evidence.phase='work';checkpoint();}
if(evidence.phase==='work'){
 if(view().duty.status==='paused'){request('resume');until(()=>view().duty.status==='active','explicit cold local resume');}
 for(let n=0;n<6500&&!care.receipts(evidence.receiptId).length;n++){if(!service.isActing()&&!state().pathLength&&!state().pendingInteraction){const w=service.taskChoices()[0];if(w)request(w.kind);}step();}
 assert.equal(care.receipts(evidence.receiptId).length,1,'original full player receipt '+JSON.stringify(detail()));step(2);assert.equal(r.formalCareers.state().skillXP.ritual,evidence.initialXP+10);assert.equal(service.state().job.completedTasks,1);assert.equal(care.receipts()[0].useId,evidence.useId);assert.equal(r.formalCareers.recordFranceBedchamberReview(care.receipts()[0]).xpGained,0);assert(evidence.contacts.player.frames>80);evidence.phase='attendance';record('six original physical care steps, one real-use proof and ten ritual XP');
}
if(evidence.phase==='npc-work'){until(()=>item().cycle===1&&item().stage==='clean','original Julie autonomously completes six actual care stages');assert.equal(care.receipts().length,0);assert.equal(r.formalCareers.state().skillXP.ritual,evidence.initialXP);assert.equal(r.copperLedger.balances().france.bank,evidence.bank);assert(evidence.contacts['france-bedroom'].frames>80);evidence.phase='npc-complete';record('same Julie covers original duty without a player proof or invented payment');}
if(evidence.phase==='attendance'){until(()=>service.state().job.coveredSeconds>=86,'actual onsite eligible time for nonzero salary');evidence.phase='end';checkpoint();}
if(evidence.phase==='end'){request('end-shift');until(()=>service.state().job?.stage==='ready','return and explicit handback to original Julie');evidence.phase='claim';checkpoint();}
if(evidence.phase==='claim'){request('claim');until(()=>!service.state().job&&r.formalCareers.state().lastDuty.stage==='paid','actual fixed time wage in France bank');evidence.phase='paid';checkpoint('paid');}
if(evidence.phase==='paid'){const wage=r.formalCareers.state().lastDuty.wage;assert(wage>=1);assert.equal(wage,Math.floor(12*Math.min(1,r.formalCareers.state().lastDuty.coveredSeconds*.7/60/12)+1e-9));assert.equal(r.copperLedger.balances().france.bank,evidence.bank+wage);assert.equal(service.claim(),false);assert.equal(r.formalCareers.recordFranceBedchamberReview(care.receipts()[0]).xpGained,0);assert.equal(r.formalCareers.state().skillXP.ritual,evidence.initialXP+10);record('12/full-day attendance salary, actual hours only, cold/repeat no extra wage or XP');}
assert.deepEqual(r.npcs.map(n=>n.station.id),evidence.roster);checkpoint();const result={status:'PASS',scenario,currentRun:{initialPhase:initialRun.phase,observedFrames:evidence.frames-initialRun.frames,checks:evidence.checks.slice(initialRun.checks)},cumulativeChecks:evidence.checks,stages:evidence.stages,contacts:evidence.contacts,coldRestores:evidence.coldRestores||[],fixture:evidence.fixture,wallSeconds:(Date.now()-startup)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'Production main/Three/navigation/original actors and original bed use/care; simulated DOM/renderer, not GPU/browser/iOS.'};fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/france-bedchamber-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({startup,structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
