// Production main regression for the original reusable towel and Yuki's unique
// job. Only player age/ritual/interview seed/initial registry arrival are staged.
// NPCs, visitors, inventory, clocks, navigation and all work remain production.
// Run each mode separately with --max-old-space-size=768 --experimental-vm-modules.
// A bounded segment exits 75 (NOT PASS). Resume with LINEN_RESUME=<out>/last-save.json;
// keep its sibling evidence.json. Default mode is npc; LINEN_MODE=player tests hiring.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function linenEnter(){travelJourneyUI.close('linen-local-test');return enterRegion('japan');}
export function linenCloseMenus(){contextMenu.close();playerConversationUI.close();careerHandbook.close();}
export function linenReview(){return {player,npcs,japanService,japanLinenEmployment,careerHandbook,formalCareers,copperLedger};}
export function linenStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);}
export {requestStationIntent,executeNearbyAction,save,resolvePlayerIntent,interactionMenuOpen};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=`if(process.env.LINEN_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.LINEN_RESUME,'utf8');}else if(process.env.LINEN_MODE==='player'){const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const im=mod(path.join(root,'game/career-applications.js'));if(im.status!=='evaluated'){await im.link(linker);await im.evaluate();}const prior=JSON.parse(storage['worlds-days-v1']);let seed=1;while(im.namespace.careerInterviewRoll(seed,'jp-linen-service',0)>=.2)seed++;prior.appearance.seed=seed;prior.playerProfile={ageYears:18};prior.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:10,seconds:0})}).state();prior.formalCareers.skills.ritual=1;storage['worlds-days-v1']=JSON.stringify(prior);}`;
once("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));" );
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),mode=process.env.LINEN_MODE||'npc',role='jp-linen-service',out=process.env.LINEN_OUT||'qa/japan-linen-'+mode;
assert(['npc','player'].includes(mode));fs.mkdirSync(out,{recursive:true});
if(state().mode!=='lot')main.namespace.linenEnter();
const r=main.namespace.linenReview(),service=r.japanLinenEmployment;
assert(r.japanService&&service);assert.equal(service.state().lastError,null);
const evidence=process.env.LINEN_RESUME?JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.LINEN_RESUME),'evidence.json'),'utf8')):{mode,phase:'start',checks:[],stages:[],frames:0,roster:r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),bank:r.copperLedger.state().balances.japan.bank};
assert.equal(evidence.mode,mode);
const view=()=>r.japanService.state();
const detail=()=>({frames:evidence.frames,clock:state().simulationClock,player:state().player,path:state().pathLength,employment:service.state(),linens:view().linens,visits:view().visits,actors:view().actors,failures:view().failures,toast:ids.toast.textContent});
function checkpoint(){assert(main.namespace.save());fs.writeFileSync(out+'/last-save.json',storage['worlds-days-v1']);fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2));}
function record(label,details={}){evidence.checks.push({label,...details});console.log('PASS',label,JSON.stringify(details));checkpoint();}
function observe(){const rows=view().linens;assert.equal(rows.length,6);if(mode==='npc'&&!evidence.linenId){const first=rows.find(l=>l.stage==='issued');if(first){Object.assign(evidence,{linenId:first.id,cycle:first.cycle,visitId:first.visitId});const v=view().visits.find(v=>v.id===first.visitId);assert(v&&v.customerType!=='player');assert.equal(v.stage,'washing');}}
 const l=rows.find(l=>l.id===evidence.linenId);if(l&&l.cycle===evidence.cycle&&evidence.stages.at(-1)?.stage!==l.stage){if(mode==='npc'&&['collected','wet','dry','folded'].includes(l.stage))assert.equal(l.carryOwner,'jp-rest');evidence.stages.push({stage:l.stage,owner:l.carryOwner,frame:evidence.frames});console.log('LINEN_STAGE',JSON.stringify(evidence.stages.at(-1)));}}
function step(n=1){for(let i=0;i<n;i++){now+=100;main.namespace.linenStep(.1);evidence.frames++;observe();if(evidence.frames%20===0){assert(process.memoryUsage().rss<1152*1024**2,'RSS <=1152 MiB');checkpoint();if(Date.now()-started>Number(process.env.LINEN_SEGMENT_MS||150000)){console.log('CHECKPOINT_NOT_PASS',JSON.stringify(detail()));process.exit(75);}}}}
function until(fn,label,max=12000){let n=0;for(;n<max&&!fn();n++)step();assert(fn(),label+' '+JSON.stringify(detail()));record(label,{frames:n});}
function request(kind){main.namespace.linenCloseMenus();const intent=service.intent(kind);assert(intent,'intent '+kind+' '+JSON.stringify(detail()));const ok=main.namespace.requestStationIntent(intent);if(!ok)console.log('ROUTE_DEBUG',JSON.stringify({kind,intent,resolved:main.namespace.resolvePlayerIntent(intent),menu:main.namespace.interactionMenuOpen()}));assert(ok,'route '+kind+' '+JSON.stringify(detail()));return intent;}
if(process.env.LINEN_RESUME){assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);record('cold continuation retains original world');}
if(mode==='npc'){
 until(()=>{const l=view().linens.find(l=>l.id===evidence.linenId);return l&&l.cycle>evidence.cycle&&l.stage==='issued';},'same original towel is issued to a later natural original visitor',24000);
 const l=view().linens.find(l=>l.id===evidence.linenId);assert.notEqual(l.visitId,evidence.visitId);assert.equal(l.cycle,evidence.cycle+1);assert.deepEqual(evidence.stages.map(s=>s.stage),['issued','dirty','collected','wet','drying','dry','folded','clean']);assert.equal(view().linenReceipts.length,0,'NPC work creates no player growth receipt');record('Yuki naturally collects washes hangs takes folds and restocks',{linenId:l.id,firstVisit:evidence.visitId,nextVisit:l.visitId,stages:evidence.stages});
}else{
 if(evidence.phase==='start'){
  if(!process.env.LINEN_RESUME){r.player.root.position.set(5,11.4,3.9);assert.equal(r.player.ageYears,18);assert.equal(r.formalCareers.state().skills.ritual,1);}
  if(!r.formalCareers.applicationResult(role)){request('formal-apply');until(()=>r.formalCareers.applicationResult(role)?.status==='pending','submit adult ritual-1 application at original fourth-floor registry');}
  assert.equal(service.state().job,null);if(!r.formalCareers.isHired(role)){request('formal-review');until(()=>r.formalCareers.isHired(role),'Yuki reviews at original registry');}
  assert.equal(r.formalCareers.slotHolder(role),'player');assert.equal(service.state().job,null);evidence.phase='hired';record('unique original role granted separately from shift');
 }
 if(evidence.phase==='hired'){request('accept');until(()=>view().linenDuty?.status==='active','original Yuki safely completes handoff');assert(!view().linens.some(l=>l.carryOwner==='jp-rest'));evidence.phase='work';record('safe physical handoff');}
 if(evidence.phase==='work'){
  if(view().linenDuty?.status==='paused'){request('resume');until(()=>view().linenDuty.status==='active','explicit same-receipt resume');}
  if(!evidence.linenId){until(()=>service.taskChoices().some(c=>service.intent(c.kind)?.work.kind==='collect'),'natural visitor finishes drying and leaves original dirty towel');const w=service.taskChoices().map(c=>service.intent(c.kind)?.work).find(w=>w.kind==='collect');Object.assign(evidence,{linenId:w.linenId,cycle:w.cycle,visitId:w.visitId,receiptId:service.state().job.receiptId});observe();checkpoint();}
  let lastKey=null;const ordinaryStep=step;step=function(n=1){for(let i=0;i<n;i++){if(!service.isActing()&&!state().pathLength){const choice=service.taskChoices().find(c=>service.intent(c.kind)?.work.linenId===evidence.linenId);if(choice){const intent=service.intent(choice.kind);if(intent.work.key!==lastKey){lastKey=intent.work.key;console.log('SELECT_WORK',lastKey);request(choice.kind);}}}ordinaryStep();}};
  until(()=>view().linenReceipts.some(x=>x.workReceiptId===evidence.receiptId&&x.linenId===evidence.linenId&&x.cycle===evidence.cycle),'player completes the same natural towel through actual selected work',18000);
 }
}
`;
harness+=String.raw`
if(mode==='player'){
 if(evidence.phase==='work'){step(2);assert.equal(service.state().job.completedTasks,1);assert.equal(r.formalCareers.state().skillXP.ritual,10);assert.deepEqual(evidence.stages.map(s=>s.stage),['dirty','collected','wet','drying','dry','folded','clean']);const receipt=view().linenReceipts.find(x=>x.workReceiptId===evidence.receiptId);assert(receipt.completed&&receipt.accurate);assert.equal(r.formalCareers.recordJapanLinenReview(receipt).xpGained,0);assert.equal(r.formalCareers.state().skillXP.ritual,10);evidence.phase='return';record('one physical completion grants one receipt and exactly ten XP',{receipt});}
 if(evidence.phase==='return'){request('end-shift');until(()=>service.state().job?.stage==='ready','return to Yuki and seal actual attendance');evidence.phase='claim';checkpoint();}
 if(evidence.phase==='claim'){request('claim');until(()=>service.state().job===null&&r.formalCareers.state().lastDuty.stage==='paid','one prorated Japanese bank wage');evidence.phase='paid';checkpoint();}
 const paid=r.formalCareers.state().lastDuty,expected=Math.floor(14*Math.min(1,paid.coveredSeconds*.7/60/12)+1e-9);assert.equal(paid.wage,expected);assert.equal(r.copperLedger.state().balances.japan.bank,evidence.bank+expected);assert.equal(r.formalCareers.state().skillXP.ritual,10);assert.equal(service.claim(),false);record('fixed fourteen per full day, actual attendance only and no duplicate claim',{wage:paid.wage,coveredSeconds:paid.coveredSeconds});
}
assert.deepEqual(r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),evidence.roster);checkpoint();const result={status:'PASS',mode,checks:evidence.checks,wallSeconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'Production main, original full NPC roster and natural visitors; simulated DOM/renderer, not browser/iOS'};fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/japan-linen-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
