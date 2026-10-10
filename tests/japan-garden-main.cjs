// Production-main original pond checks. Only initial player arrival, age 18,
// gardening/ritual 1, accepted interview seed and clock day0/10:00 are staged.
// NPC/objects/work/receipts/wages and subsequent clock run through production.
// GARDEN_SCENARIO=npc exercises Akari independently; default tests the player.
// GARDEN_PAUSE_AT=plants creates a real partial-cycle checkpoint, exit75.
// Continue GARDEN_RESUME=<old>/last-save.json GARDEN_OUT=<new> without restaging.
// Uses the existing shared lock/guard and checkpoint harness. DOM/renderer are
// simulated; passing cannot establish GPU/browser/iOS visuals or mobile FPS.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const output=process.env.GARDEN_OUT||'qa/japan-garden-main';
if(process.env.GARDEN_MAIN_GUARDED!=='1'){
 fs.mkdirSync(output,{recursive:true});
 const result=require('node:child_process').spawnSync('flock',['-n','/workspace/shared/worldwoven-heavy-scene.lock','python','scripts/guard-process-tree.py','--seconds','180','--mib','1152','--samples',output+'/tree-rss.jsonl','--',process.execPath,'--max-old-space-size=768','--experimental-vm-modules',__filename],{stdio:'inherit',env:{...process.env,GARDEN_MAIN_GUARDED:'1'}});
 if(result.error)throw result.error;process.exit(result.status??1);
}
const startup=Date.now();
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function gardenEnter(){travelJourneyUI.close('garden-local-test');return enterRegion('japan');}
export function gardenCloseMenus(){contextMenu.close();playerConversationUI.close();careerHandbook.close();}
export function gardenSocial(){return {state:npcSocial?.state(),open:playerConversationUI.isOpen()};}
export function gardenDismissInvitation(){if(!npcSocial?.active())return false;if(playerConversationUI.isOpen()){playerConversationUI.close();return true;}return cancelAction();}
export function gardenReview(){return {player,npcs,lot,japanService,japanGardenEmployment,careerHandbook,formalCareers,copperLedger};}
export function gardenStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);}
export {requestStationIntent,executeNearbyAction,save,resolvePlayerIntent,interactionMenuOpen};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=`if(process.env.GARDEN_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.GARDEN_RESUME,'utf8');}else{const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const im=mod(path.join(root,'game/career-applications.js'));if(im.status!=='evaluated'){await im.link(linker);await im.evaluate();}const prior=JSON.parse(storage['worlds-days-v1']);let seed=1;while(im.namespace.careerInterviewRoll(seed,'jp-garden-service',0)>=.2)seed++;prior.appearance.seed=seed;prior.playerProfile={ageYears:18};prior.simulationClock={version:1,seconds:0};prior.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:10,seconds:0})}).state();prior.formalCareers.skills.ritual=1;prior.formalCareers.skills.gardening=1;storage['worlds-days-v1']=JSON.stringify(prior);}`;
once("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));" );
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const role='jp-garden-service',out=process.env.GARDEN_OUT||'qa/japan-garden-main',scenario=process.env.GARDEN_SCENARIO||'player';
fs.mkdirSync(out,{recursive:true});
if(process.env.GARDEN_RESUME)assert.notEqual(path.resolve(process.env.GARDEN_RESUME),path.resolve(out+'/last-save.json'));
if(state().mode!=='lot')assert(main.namespace.gardenEnter());
const r=main.namespace.gardenReview(),service=r.japanGardenEmployment;
assert(r.japanService&&service);assert.equal(service.state().lastError,null);
const edge=r.lot.gardenPond.edge;assert(edge.parent);const edgeBox=new three.namespace.Box3().setFromObject(edge),edgeMatrix=edge.matrixWorld.clone();assert.equal(edge.userData.gardenPondId,'jp-garden-pond-1');assert.equal(r.lot.gardenPond.fishCount,9);assert.equal(r.lot.gardenPond.plantCount,3);
const evidence=process.env.GARDEN_RESUME?JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.GARDEN_RESUME),'evidence.json'),'utf8')):{version:1,scenario,phase:scenario==='npc'?'npc':'apply',frames:0,checks:[],stages:[],roster:r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),bank:r.copperLedger.state().balances.japan.bank,initialXP:r.formalCareers.state().skillXP.gardening,fixture:{staged:['arrival [-17.1,0,-4.7]','age18','gardening1/ritual1','accepted interview seed','initial day0 10:00'],notStaged:['NPC positions','pond objects','inspection source','work actions','receipts','wages','subsequent clock']}};
const view=()=>r.japanService.state(),ledger=()=>view().gardenCare,item=()=>ledger().item;
const detail=()=>({phase:evidence.phase,frames:evidence.frames,clock:state().simulationClock,player:state().player,path:state().pathLength,pending:state().pendingInteraction,performing:state().performing,employment:service.state(),garden:ledger(),duty:view().gardenDuty,akari:view().actors.find(n=>n.id==='jp-garden-onsen'),staff:view().staffLife.active,social:main.namespace.gardenSocial(),failures:view().failures,toast:ids.toast.textContent});
function checkpoint(name=null){assert(main.namespace.save()!==false);fs.writeFileSync(out+'/last-save.json',storage['worlds-days-v1']);fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2));if(name){fs.writeFileSync(out+'/'+name+'-save.json',storage['worlds-days-v1']);console.log('MILESTONE',name,JSON.stringify(detail()));}}
function record(message){evidence.checks.push(message);console.log('CHECK',message);checkpoint();}
function observe(){assert.equal(ledger().loadError,null);assert.equal(r.lot.gardenPond.edge,edge,'same physical original east edging mesh retained');assert(edge.parent);assert(edge.matrixWorld.equals(edgeMatrix));const x=item();if(evidence.stages.at(-1)?.stage!==x.stage||evidence.stages.at(-1)?.cycle!==x.cycle)evidence.stages.push(structuredClone(x));
 const akari=r.npcs.find(n=>n.station.id==='jp-garden-onsen'),step=view().gardenDuty.step;
 if(step&&!r.player.walking){const distance=r.player.root.position.distanceTo(akari.root.position);assert(distance>=.59,'active original pond work clears Akari and player bodies '+distance);evidence.minimumWorkingClearance=Math.min(evidence.minimumWorkingClearance??Infinity,distance);if(akari.root.position.distanceTo(new three.namespace.Vector3(-17.1,0,-6))<.2)evidence.coveredStandbyReached=true;}
 for(const [id,actor]of [['player',r.player],['jp-garden-onsen',akari]])if(actor.getPoseMetrics().action==='pond-wipe'){
  const contact=actor.getPoseMetrics().pondWipeContact,cloth=actor.root.userData.tools.cloth,box=new three.namespace.Box3().setFromObject(cloth);assert(contact,'production action has explicit contact context');assert(cloth.visible&&!actor.root.userData.tools.can.visible,'cloth-only actual wipe');assert(Math.abs(box.min.y-edgeBox.max.y-.002)<.00001,'cloth bottom touches original top with 2mm clearance');assert(box.min.x>=edgeBox.min.x&&box.max.x<=edgeBox.max.x&&box.min.z>=edgeBox.min.z&&box.max.z<=edgeBox.max.z,'actual cloth remains over original stone');assert(Math.abs(contact.palmGap)<.002,'physical palm reaches cloth');
  evidence.contact??={};const c=evidence.contact[id]??={frames:0,first:structuredClone(contact),maxPalmGap:0};c.frames++;c.maxPalmGap=Math.max(c.maxPalmGap,Math.abs(contact.palmGap));
 }
}
function request(kind){main.namespace.gardenCloseMenus();const intent=service.intent(kind);assert(intent,'missing intent '+kind+' '+JSON.stringify(detail()));assert(main.namespace.requestStationIntent(intent),'route '+kind+' '+JSON.stringify(detail()));return intent;}
function step(n=1){for(let i=0;i<n;i++){
 const social=main.namespace.gardenSocial();if(social.state?.initiator==='npc'&&['choosing','awaiting-consent'].includes(social.state.stage)){assert(main.namespace.gardenDismissInvitation());evidence.interruptions??=[];evidence.interruptions.push({kind:'ordinary-npc-invitation',frame:evidence.frames});}
 if(service.state().job?.stage==='working'&&view().gardenDuty.status==='paused'&&!main.namespace.gardenSocial().state&&!state().pathLength&&!state().pendingInteraction&&!service.isActing())request('resume');
 now+=100;main.namespace.gardenStep(.1);evidence.frames++;observe();
 if(process.env.GARDEN_PAUSE_AT&&evidence.phase==='work'&&item().owner==='player'&&item().stage===process.env.GARDEN_PAUSE_AT&&!evidence.pauseUsed){evidence.pauseUsed=true;evidence.pauseStage=item().stage;checkpoint('partial-original-pond');console.log('CHECKPOINT: actual partial original pond; exit75 is not PASS');process.exit(75);}
 if((Date.now()-startup)/1000>135){checkpoint();console.log('CHECKPOINT: bounded actual continuation; exit75 is not PASS');process.exit(75);}
}}
function until(fn,label,max=8000){let n=0;for(;n<max&&!fn();n++)step();assert(fn(),label+' '+JSON.stringify(detail()));console.log('REACHED',label,n);}
if(!process.env.GARDEN_RESUME){r.player.root.position.set(-17.1,0,-4.7);assert.equal(item().cycle,0);record('labelled initial player inputs only; original pond unchanged');}
else{const prior=JSON.parse(fs.readFileSync(process.env.GARDEN_RESUME,'utf8'));assert.equal(state().simulationClock.seconds,prior.simulationClock.seconds);assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);assert.deepEqual(item(),prior.japanOperations.gardenCare.item);assert.equal(r.copperLedger.state().balances.japan.bank,prior.copperLedger.balances.japan.bank);evidence.coldRestores??=[];evidence.coldRestores.push({stage:item().stage,cycle:item().cycle,owner:item().owner,clock:state().simulationClock.seconds,bank:r.copperLedger.state().balances.japan.bank});record('cold save preserves original day/cycle/owner/steps/clock and bank');}
observe();
if(evidence.phase==='npc'){
 until(()=>item().cycle===1&&item().stage==='clean','Akari completes the four actual original-pond steps');
 assert.deepEqual(evidence.stages.filter(x=>x.cycle===1).map(x=>x.stage),['observe','plants','wipe','verify','clean']);for(const x of evidence.stages.filter(x=>['plants','wipe','verify'].includes(x.stage))){assert.equal(x.owner,'jp-garden-onsen');assert(x.steps.every(t=>t.actorId==='jp-garden-onsen'));}
 assert(evidence.contact?.['jp-garden-onsen']?.frames>=30,'NPC real timed wipe contact sampled');assert.equal(ledger().receipts.length,0);assert.equal(r.formalCareers.state().skillXP.gardening,evidence.initialXP);assert.equal(r.copperLedger.state().balances.japan.bank,evidence.bank);step(10);assert.equal(item().cycle,1);evidence.phase='npc-complete';record('same Akari finishes actual original pond once, without player XP/wages or same-day duplicate');
}
if(evidence.phase==='apply'){
 if(!r.formalCareers.applicationResult(role)){request('formal-apply');until(()=>r.formalCareers.applicationResult(role)?.status==='pending','local adult gardening1/ritual1 application');}
 assert.equal(service.state().job,null);if(!r.formalCareers.isHired(role)){request('formal-review');until(()=>r.formalCareers.isHired(role),'Akari personally reviews at original pond');}
 assert.equal(r.formalCareers.slotHolder(role),'player');assert.equal(service.state().job,null);evidence.phase='hired';record('exclusive original role hired separately from shift acceptance');
}
if(evidence.phase==='hired'){request('accept');until(()=>view().gardenDuty.status==='active','Akari physically hands over safely');evidence.receiptId=service.state().job.receiptId;evidence.phase='work';checkpoint('shift-handoff');}
if(evidence.phase==='work'){
 const done=()=>ledger().receipts.some(x=>x.workReceiptId===evidence.receiptId);
 for(let n=0;n<5000&&!done();n++){assert.equal(service.state().job?.receiptId,evidence.receiptId,'original shift retained');if(!service.isActing()&&!state().pathLength&&!state().pendingInteraction&&view().gardenDuty.status==='active'){const choice=service.taskChoices()[0];if(choice)request(choice.kind);}step();}
 assert(done(),'actual original pond receipt missing '+JSON.stringify(detail()));assert(evidence.contact?.player?.frames>=30,'player real timed wipe contact sampled');assert(evidence.coveredStandbyReached,'original Akari reaches distinct safe standby');step(2);const receipt=ledger().receipts.find(x=>x.workReceiptId===evidence.receiptId);assert.equal(receipt.day,0);assert.equal(receipt.cycle,1);assert.equal(service.state().job.completedTasks,1);assert.equal(r.formalCareers.state().skillXP.gardening,evidence.initialXP+10);assert.equal(r.formalCareers.recordJapanGardenReview(receipt).xpGained,0);evidence.phase='attendance';record('four physical original pond duties grant one source proof and exactly ten gardening XP');
}
if(evidence.phase==='attendance'){until(()=>service.state().job.coveredSeconds>=86,'real eligible on-site time reaches nonzero wage');evidence.phase='return';checkpoint();}
if(evidence.phase==='return'){if(service.state().job?.stage!=='ready')request('end-shift');until(()=>service.state().job?.stage==='ready','actual return and explicit handback to Akari');evidence.phase='claim';checkpoint();}
if(evidence.phase==='claim'){if(service.state().job)request('claim');until(()=>!service.state().job&&r.formalCareers.state().lastDuty.stage==='paid','one actual prorated Japanese wage deposited');evidence.phase='paid';checkpoint('paid');}
if(evidence.phase==='paid'){const paid=r.formalCareers.state().lastDuty,expected=Math.floor(12*Math.min(1,paid.coveredSeconds*.7/60/12)+1e-9);assert(expected>=1);assert.equal(paid.wage,expected);assert.equal(r.copperLedger.state().balances.japan.bank,evidence.bank+expected);assert.equal(r.formalCareers.state().skillXP.gardening,evidence.initialXP+10);assert.equal(service.claim(),false);assert.equal(r.formalCareers.recordJapanGardenReview(ledger().receipts[0]).xpGained,0);assert.equal(item().cycle,1);if(evidence.pauseUsed)assert(evidence.coldRestores.some(x=>x.stage===evidence.pauseStage&&x.owner==='player'));record('fixed 12/full day, actual attendance only; repeat/cold claim has no extra wage or XP');}
assert.deepEqual(r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),evidence.roster);checkpoint();
const result={status:'PASS',scenario:evidence.scenario,checks:evidence.checks,stages:evidence.stages,contact:evidence.contact||null,minimumWorkingClearance:evidence.minimumWorkingClearance||null,coveredStandbyReached:evidence.coveredStandbyReached||false,coldRestores:evidence.coldRestores||[],fixture:evidence.fixture,wallSeconds:(Date.now()-startup)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'Production main/Three/navigation and original full roster/pond; simulated DOM/renderer, not GPU/browser/iOS.'};fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/japan-garden-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({startup,structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
