// Production guest-futon loop: two finite sets, genuine rests, original staff paths.
// BEDDING_OUT sets evidence directory; BEDDING_RESUME resumes last-save.json.
// Run --max-old-space-size=768 --experimental-vm-modules. Exit 75 is checkpoint, not PASS.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function once(a,b){if(!harness.includes(a)||harness.indexOf(a)!==harness.lastIndexOf(a))throw Error('seam changed '+a);harness=harness.replace(a,b);}
const extra=`
export function beddingEnter(){travelJourneyUI.close('linen-local-test');return enterRegion('japan');}
export function beddingCloseMenus(){contextMenu.close();playerConversationUI.close();careerHandbook.close();}
export function beddingReview(){return {player,npcs,japanService,furniture};}
export function beddingStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);}
export {requestFurniture,standFromSeat,save};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
once('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
once('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=`if(process.env.BEDDING_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.BEDDING_RESUME,'utf8');`;
once("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));" );
once("const state=()=>context.__worldsDays.getState();assert.equal(state().mode,'globe');","const state=()=>context.__worldsDays.getState();assert(['globe','lot'].includes(state().mode));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),out=process.env.BEDDING_OUT||'qa/japan-bedding';fs.mkdirSync(out,{recursive:true});
if(state().mode!=='lot')main.namespace.beddingEnter();
const r=main.namespace.beddingReview(),bed=r.furniture.items.find(i=>i.id==='japan-furniture-bed-0');assert(bed&&r.japanService);
const evidence=process.env.BEDDING_RESUME?JSON.parse(fs.readFileSync(path.join(path.dirname(process.env.BEDDING_RESUME),'evidence.json'),'utf8')):{phase:'initial',frames:0,checks:[],stages:[],roster:r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id)};
const view=()=>r.japanService.state().bedding;
const detail=()=>({phase:evidence.phase,frames:evidence.frames,clock:state().simulationClock,player:state().player,path:state().pathLength,seated:state().seated,bedding:view(),actors:r.japanService.state().actors,failures:r.japanService.state().failures,toast:ids.toast.textContent});
function checkpoint(){assert(main.namespace.save());fs.writeFileSync(out+'/last-save.json',storage['worlds-days-v1']);fs.writeFileSync(out+'/evidence.json',JSON.stringify(evidence,null,2));}
function record(label,details={}){evidence.checks.push({label,...details});console.log('PASS',label,JSON.stringify(details));checkpoint();}
function observe(){const b=view();assert(b&&b.sets.length===2);assert.deepEqual(Array.from(b.sets,x=>x.id).sort(),['jp-bedding-1','jp-bedding-2']);for(const set of b.sets){const prev=evidence.stages.filter(x=>x.id===set.id).at(-1);if(!prev||prev.stage!==set.stage||prev.cycle!==set.cycle){const row={id:set.id,stage:set.stage,cycle:set.cycle,owner:set.carryOwner,frame:evidence.frames};evidence.stages.push(row);console.log('BEDDING_STAGE',JSON.stringify(row));}}}
function step(n=1){for(let i=0;i<n;i++){now+=100;main.namespace.beddingStep(.1);evidence.frames++;observe();if(evidence.frames%20===0){assert(process.memoryUsage().rss<1152*1024**2,'RSS <=1152 MiB');checkpoint();if(Date.now()-started>Number(process.env.BEDDING_SEGMENT_MS||150000)){console.log('CHECKPOINT_NOT_PASS',JSON.stringify(detail()));process.exit(75);}}}}
function until(fn,label,max=24000){let n=0;for(;n<max&&!fn();n++)step();assert(fn(),label+' '+JSON.stringify(detail()));record(label,{frames:n});}
function mount(){main.namespace.beddingCloseMenus();if(state().seated!==bed.id&&!state().pathLength)main.namespace.requestFurniture(bed);until(()=>state().seated===bed.id,'ordinary guest futon route and mount',3000);}
if(process.env.BEDDING_RESUME){assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);record('cold continuation retains original world and bedding identity');}
if(evidence.phase==='initial'){
 if(!process.env.BEDDING_RESUME)r.player.root.position.set(2.48,7.6,-10.7); // Initial approach fixture only.
 until(()=>view().sets.some(s=>s.stage==='installed'),'original finite stock provides the existing guest-futon cover');
 evidence.phase='short';checkpoint();
}
if(evidence.phase==='short'){
 mount();step(2);assert(view().use&&!view().use.used);evidence.shortUse=view().use.id;
 assert(main.namespace.standFromSeat());step(2);assert(!view().sets.some(s=>s.stage==='dirty'));assert.equal(view().use,null);
 evidence.phase='rest';record('brief ordinary rest does not dirty a cover');
}
if(evidence.phase==='rest'){
 mount();until(()=>view().use?.used,'at least ten seconds of actual mounted rest');
 assert(view().use.elapsed>=10);assert.notEqual(view().use.id,evidence.shortUse);evidence.firstUse={...view().use};
 evidence.phase='release';checkpoint();
}
if(evidence.phase==='release'){
 if(state().seated===bed.id)assert(main.namespace.standFromSeat());step(2);
 assert.equal(view().use,null);assert(evidence.stages.some(s=>s.id===evidence.firstUse.linenId&&s.stage==='dirty'));
 evidence.phase='wash';record('genuine rest releases its original dirty cover once');
}
if(evidence.phase==='wash'){
 until(()=>{const s=view().sets.find(s=>s.id===evidence.firstUse.linenId);return s&&['clean','delivering','installed'].includes(s.stage)&&evidence.stages.some(x=>x.id===s.id&&x.stage==='folded');},'Yuki naturally completes original cover washing and folding; Nao restocks');
 const stages=evidence.stages.filter(s=>s.id===evidence.firstUse.linenId);for(const stage of ['dirty','collected','wet','drying','dry','folded','clean'])assert(stages.some(s=>s.stage===stage),'original set stage '+stage);
 assert(stages.some(s=>s.stage==='collected'&&s.owner==='jp-rest'),'Yuki owns collected original set');
 evidence.phase='second';record('same finite cover returns clean through original shared staff routes',{stages});
}
if(evidence.phase==='second'){
 until(()=>view().sets.some(s=>s.stage==='installed'),'an original reusable cover is installed for the next ordinary rest');
 mount();until(()=>view().use?.used,'second genuine ordinary futon rest');
 assert.notEqual(view().use.id,evidence.firstUse.id);assert(['jp-bedding-1','jp-bedding-2'].includes(view().use.linenId));
 evidence.secondUse={...view().use};assert(main.namespace.standFromSeat());step(2);evidence.phase='done';record('second unique occupation reuses the original finite inventory');
}
if(process.env.BEDDING_RESUME&&evidence.phase==='done'){
 const cycles=view().sets.map(s=>s.cycle),useSerial=view().nextUse;
 until(()=>{const s=view().sets.find(s=>s.id===evidence.secondUse.linenId);return s&&['clean','delivering','installed'].includes(s.stage);},'cold original second-use cycle continues through safe washing without another occupation');
 assert.deepEqual(Array.from(view().sets,s=>s.cycle),Array.from(cycles));assert.equal(view().nextUse,useSerial);assert.equal(view().use,null);record('cold cycle keeps original identities and does not create extra use');
}
until(()=>evidence.stages.some(s=>s.id==='jp-bedding-2'&&s.stage==='received')&&view().sets.find(s=>s.id==='jp-bedding-2').stage!=='received','Nao receives the original second set and carries it to the original linen table');
assert.deepEqual(r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),evidence.roster);checkpoint();
const result={status:'PASS',checks:evidence.checks,wallSeconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024,scope:'Production main with full original NPC roster, actual rest and natural shared staff paths; simulated DOM/renderer, not browser/iOS'};
fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/japan-bedding-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
