// Production main regression for Nagi’s original boiler tools and real bath load.
// Only player age, care/writing, interview seed and initial registry arrival are staged.
// NPCs, visitors, inventory, clocks, navigation and all work remain production.
// Run each mode separately with --max-old-space-size=768 --experimental-vm-modules.
// A bounded segment exits 75 (NOT PASS). Resume with BOILER_RESUME=<out>/last-save.json;
// keep its sibling evidence.json. Default mode is npc; BOILER_MODE=player tests hiring.
// BOILER_SIDE=women resumes the prior NPC checkpoint for the other original valve.
// BOILER_PAUSE_AT=adjust exits 75 at a real first-read boundary; resume to a different
// BOILER_OUT directory so the original cold-load fixture is never overwritten.
// Hand centers/plane offsets are rig evidence only, not rendered visual acceptance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function boilerEnter(){travelJourneyUI.close('boiler-local-test');return enterRegion('japan');}
export function boilerCloseMenus(){contextMenu.close();playerConversationUI.close();careerHandbook.close();}
export function boilerReview(){return {player,npcs,japanService,japanBoilerEmployment,careerHandbook,formalCareers,copperLedger};}
export function boilerStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);}
export {requestStationIntent,executeNearbyAction,save,resolvePlayerIntent,interactionMenuOpen};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=`if(process.env.BOILER_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.BOILER_RESUME,'utf8');}else if(process.env.BOILER_MODE==='player'){const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const im=mod(path.join(root,'game/career-applications.js'));if(im.status!=='evaluated'){await im.link(linker);await im.evaluate();}const prior=JSON.parse(storage['worlds-days-v1']);let seed=1;while(im.namespace.careerInterviewRoll(seed,'jp-boiler-service',0)>=.2)seed++;prior.appearance.seed=seed;prior.playerProfile={ageYears:18};prior.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:10,seconds:0})}).state();prior.formalCareers.skills.care=1;prior.formalCareers.skills.writing=1;storage['worlds-days-v1']=JSON.stringify(prior);}`;
once("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));" );
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),mode=process.env.BOILER_MODE||'npc',role='jp-boiler-service',out=process.env.BOILER_OUT||'qa/japan-boiler-'+mode;
assert(['npc','player'].includes(mode));fs.mkdirSync(out,{recursive:true});
if(state().mode!=='lot')main.namespace.boilerEnter();
const r=main.namespace.boilerReview(),service=r.japanBoilerEmployment;
assert(r.japanService&&service);assert.equal(service.state().lastError,null);
const evidence=process.env.BOILER_RESUME?JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.BOILER_RESUME),'evidence.json'),'utf8')):{mode,phase:'start',checks:[],stages:[],contacts:[],frames:0,roster:r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),bank:r.copperLedger.state().balances.japan.bank};
assert.equal(evidence.mode,mode);if(process.env.BOILER_SIDE&&evidence.side!==process.env.BOILER_SIDE){delete evidence.batchId;evidence.stages=[];evidence.contacts=[];evidence.side=process.env.BOILER_SIDE;}
const view=()=>r.japanService.state(),ledger=()=>view().boilerMaintenance;
const detail=()=>({frames:evidence.frames,clock:state().simulationClock,player:state().player,path:state().pathLength,employment:service.state(),boiler:ledger(),duty:view().boilerDuty,actors:view().actors,failures:view().failures,toast:ids.toast.textContent});
function checkpoint(){assert(main.namespace.save());fs.writeFileSync(out+'/last-save.json',storage['worlds-days-v1']);fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2));}
function record(label,details={}){evidence.checks.push({label,...details});console.log('PASS',label,JSON.stringify(details));checkpoint();}
function observe(){const rows=ledger().batches;if(mode==='npc'&&!evidence.batchId&&rows.some(b=>!evidence.side||b.side===evidence.side)){const b=rows.find(b=>!evidence.side||b.side===evidence.side);assert(b.visitIds.every(id=>id.startsWith('jp-visitor-')));evidence.batchId=b.id;}
 const b=rows.find(b=>b.id===evidence.batchId);if(b&&evidence.stages.at(-1)?.stage!==b.stage){evidence.stages.push({stage:b.stage,owner:b.owner,frame:evidence.frames});console.log('BOILER_STAGE',JSON.stringify(evidence.stages.at(-1)));}
 const actor=mode==='npc'?r.npcs.find(n=>n.station.id==='jp-steam'):r.player,task=mode==='npc'?actor.serviceTask:view().boilerDuty?.step;
 if(task&&(mode==='npc'?task.boilerWork&&task.arrived:service.isActing())){const target=task.workTarget||task.target;const kind=mode==='npc'?b?.stage:task.kind;if(target){const position=actor.root.position.toArray();assert(Math.hypot(position[0]-target[0],position[2]-target[2])<.85,'normal actor within original tool reach');actor.root.updateMatrixWorld(true);const hands=actor.getPoseMetrics?.().hands.map(p=>actor.root.localToWorld(new three.namespace.Vector3(...p)).toArray())||[];const handDistances=hands.map(p=>Math.hypot(...p.map((v,i)=>v-target[i])));const toolOffsets=hands.map(p=>({planeGap:Math.abs(p[2]-target[2]),radial:Math.hypot(p[0]-target[0],p[1]-target[1])}));const contact={kind,position,target,hands,handDistances,toolOffsets,action:mode==='npc'?task.action:'tidy',frame:evidence.frames},old=evidence.contacts.findIndex(c=>c.kind===kind);if(old<0||!evidence.contacts[old].handDistances||Math.min(...handDistances)<Math.min(...evidence.contacts[old].handDistances)){let nearest=null;actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();for(const range of mesh.geometry.userData.sourceRanges||[])if(/^(relaxed-palm-|relaxed-finger-|thumb-)/.test(range.name))for(let i=range.start;i<range.start+range.count;i++){const p=mesh.localToWorld(mesh.getVertexPosition(i,new three.namespace.Vector3())).toArray(),radial=Math.hypot(p[0]-target[0],p[1]-target[1]),planeGap=Math.abs(p[2]-target[2]);if(radial<=(kind==='read'||kind==='verify'?.3:.26)+.035&&(!nearest||planeGap<nearest.planeGap))nearest={range:range.name,point:p,planeGap,radial};}});contact.nearestHandSkin=nearest;if(old<0)evidence.contacts.push(contact);else evidence.contacts[old]=contact;}}}
}
function step(n=1){for(let i=0;i<n;i++){now+=100;main.namespace.boilerStep(.1);evidence.frames++;observe();if(process.env.BOILER_PAUSE_AT&&ledger().batches.find(b=>b.id===evidence.batchId)?.stage===process.env.BOILER_PAUSE_AT){checkpoint();console.log('CHECKPOINT_NOT_PASS requested cold boundary',process.env.BOILER_PAUSE_AT);process.exit(75);}if(evidence.frames%20===0){assert(process.memoryUsage().rss<1152*1024**2,'RSS <=1152 MiB');checkpoint();if(Date.now()-started>Number(process.env.BOILER_SEGMENT_MS||145000)){console.log('CHECKPOINT_NOT_PASS',JSON.stringify(detail()));process.exit(75);}}}}
function until(fn,label,max=24000){let n=0;for(;n<max&&!fn();n++)step();assert(fn(),label+' '+JSON.stringify(detail()));record(label,{frames:n});}
function request(kind){main.namespace.boilerCloseMenus();const intent=service.intent(kind);assert(intent,'intent '+kind+' '+JSON.stringify(detail()));assert(main.namespace.requestStationIntent(intent),'route '+kind+' '+JSON.stringify(detail()));return intent;}
if(process.env.BOILER_RESUME){if(mode==='player'&&evidence.phase==='work'&&evidence.batchId){const before=JSON.parse(fs.readFileSync(process.env.BOILER_RESUME,'utf8')).japanOperations.boilerMaintenance.batches.find(b=>b.id===evidence.batchId),after=ledger().batches.find(b=>b.id===evidence.batchId);assert.deepEqual(after.visitIds,before.visitIds);assert.equal(after.stage,before.stage);assert.deepEqual(after.steps,before.steps);assert.equal(view().boilerDuty.status,'paused');}assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);record('cold continuation retains original world');}
if(mode==='npc'){
 until(()=>ledger().batches.find(b=>b.id===evidence.batchId)?.stage==='completed','Nagi completes four operations for natural original bath admission');
 const b=ledger().batches.find(b=>b.id===evidence.batchId);assert.deepEqual(b.steps.map(s=>s.stage),['read','adjust','return','verify']);assert(b.steps.every(s=>s.actorId==='jp-steam'));assert.equal(ledger().receipts.length,0);assert.deepEqual(evidence.stages.map(s=>s.stage),['read','adjust','return','verify','completed']);record('original Nagi ordered work and no player growth',{batch:b,contacts:evidence.contacts});
}else{
 if(evidence.phase==='start'){
  if(!process.env.BOILER_RESUME){r.player.root.position.set(4.1,11.4,-10.8);assert.equal(r.player.ageYears,18);assert.equal(r.formalCareers.state().skills.care,1);assert.equal(r.formalCareers.state().skills.writing,1);}
  if(!r.formalCareers.applicationResult(role)){request('formal-apply');until(()=>r.formalCareers.applicationResult(role)?.status==='pending','adult care-1 writing-1 application at original fourth-floor registry');}
  assert.equal(service.state().job,null);if(!r.formalCareers.isHired(role)){request('formal-review');until(()=>r.formalCareers.isHired(role),'Nagi reviews application at original registry');}
  assert.equal(r.formalCareers.slotHolder(role),'player');assert.equal(service.state().job,null);evidence.phase='hired';record('unique original role granted separately from shift');
 }
 if(evidence.phase==='hired'){request('accept');until(()=>view().boilerDuty?.status==='active','Nagi safely completes physical handoff');evidence.phase='work';record('safe physical handoff');}
 if(evidence.phase==='work'){
  if(view().boilerDuty?.status==='paused'){request('resume');until(()=>view().boilerDuty.status==='active','explicit same-receipt resume');}
  if(!evidence.batchId){until(()=>service.taskChoices().some(c=>service.intent(c.kind)?.work.kind==='read'),'natural original guest bath creates real unworked load');const w=service.taskChoices().map(c=>service.intent(c.kind)?.work).find(w=>w.kind==='read');Object.assign(evidence,{batchId:w.batchId,receiptId:service.state().job.receiptId});observe();checkpoint();}
  let lastKey=null;const ordinaryStep=step;step=function(n=1){for(let i=0;i<n;i++){if(!service.isActing()&&!state().pathLength){const choice=service.taskChoices().find(c=>service.intent(c.kind)?.work.batchId===evidence.batchId);if(choice){const intent=service.intent(choice.kind);if(intent.work.key!==lastKey){lastKey=intent.work.key;console.log('SELECT_WORK',lastKey);request(choice.kind);}}}ordinaryStep();}};
  until(()=>ledger().receipts.some(x=>x.workReceiptId===evidence.receiptId&&x.batchId===evidence.batchId),'player completes same natural batch through four physically selected operations',18000);
 }
 if(evidence.phase==='work'){step(2);assert.equal(service.state().job.completedTasks,1);assert.equal(r.formalCareers.state().skillXP.care,10);assert.deepEqual(evidence.stages.map(s=>s.stage),['read','adjust','return','verify','completed']);const receipt=ledger().receipts.find(x=>x.workReceiptId===evidence.receiptId);assert(receipt.completed&&receipt.accurate);assert.equal(r.formalCareers.recordJapanBoilerReview(receipt).xpGained,0);assert.equal(r.formalCareers.state().skillXP.care,10);evidence.phase='return';record('final-only original batch receipt and exactly ten care XP',{receipt,contacts:evidence.contacts});}
 if(evidence.phase==='return'){request('end-shift');until(()=>service.state().job?.stage==='ready','return to Nagi and seal actual attendance');evidence.phase='claim';checkpoint();}
 if(evidence.phase==='claim'){request('claim');until(()=>service.state().job===null&&r.formalCareers.state().lastDuty.stage==='paid','one prorated Japanese bank wage');evidence.phase='paid';checkpoint();}
 const paid=r.formalCareers.state().lastDuty,expected=Math.floor(16*Math.min(1,paid.coveredSeconds*.7/60/12)+1e-9);assert.equal(paid.wage,expected);assert.equal(r.copperLedger.state().balances.japan.bank,evidence.bank+expected);assert.equal(r.formalCareers.state().skillXP.care,10);assert.equal(service.claim(),false);record('sixteen per full day, actual attendance only, no duplicate claim',{wage:paid.wage,coveredSeconds:paid.coveredSeconds});
}
assert.deepEqual(r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),evidence.roster);checkpoint();const result={status:'PASS',mode,checks:evidence.checks,wallSeconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'Production main and original full NPC roster, natural visitors, original tool geometry and actor routes; simulated DOM/renderer, not browser/iOS GPU visual QA'};fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/japan-boiler-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
