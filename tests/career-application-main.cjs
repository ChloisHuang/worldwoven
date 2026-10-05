// A single affected production route. Simulated DOM and renderer, real Three
// actors/navigation/world/storage; this is not browser or iOS validation.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);harness=harness.replace(before,after);}
const extra=`
export function applicationReview(){return {player,npcs,formalCareers,chinaService,chinaTavern,careerHandbook,copperLedger};}
export function applicationStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export {requestStationIntent,navigateTo,cancelAction};`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=String.raw`
{const prior=JSON.parse(storage['worlds-days-v1']),core=mod(path.join(root,'game/formal-careers.js')),seconds=1440/.7;prior.appearance.seed=26;prior.simulationClock={version:1,seconds};await core.link(linker);await core.evaluate();const {loadError,lastError,...careerSeed}=core.namespace.createFormalCareers({getClock:()=>({day:1,hour:10,seconds}),saveState:()=>{}}).state();careerSeed.skills.ritual=2;prior.formalCareers=careerSeed;storage['worlds-days-v1']=JSON.stringify(prior);}
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const started=Date.now(),roleId='cn-tavern-steward',checks=[];let r;
const record=label=>{checks.push(label);console.log('PASS',label);};
const enter=()=>{all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();r=main.namespace.applicationReview();assert(r.chinaService);};
const step=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.applicationStep(.1);if(Date.now()-started>300000)throw Error('focused time cap');assert(process.memoryUsage().rss<1.2*1024**3);}};
const detail=()=>({player:state().player,path:state().pathLength,clock:state().simulationClock,receipt:r.formalCareers.applicationResult(roleId),toast:ids.toast.textContent});
const until=(pred,label)=>{for(let i=0;i<2200&&!pred();i++)step();assert(pred(),label+' '+JSON.stringify(detail()));record(label);};
const request=kind=>{r.careerHandbook.close();const next=r.chinaService.forRole(roleId).intent(kind);assert(next,kind);assert(main.namespace.requestStationIntent(next),kind);};
enter();assert.equal(r.formalCareers.state().tenure,null);request('formal-apply');until(()=>r.formalCareers.applicationResult(roleId)?.status==='pending','normal arrival walks to Xu An and submits one pending application');
const receipt=r.formalCareers.applicationResult(roleId),id=receipt.id,roll=receipt.roll;assert.equal(receipt.interview,null);assert.equal(r.formalCareers.state().tenure,null);assert.equal(r.formalCareers.state().lastDuty,null);assert.equal(r.chinaService.state().job,null);assert.equal(r.formalCareers.slotHolder(roleId),'cn-tavern-assistant');r.careerHandbook.close();step(30);assert.equal(r.formalCareers.applicationResult(roleId).status,'pending');record('submission, idle simulation and panel dismissal cannot create tenure or work');
ids['return-world'].onclick();assert.equal(state().mode,'globe');assert.equal(state().characterResources.activeReferences,0);const stored=JSON.parse(storage['worlds-days-v1']).formalCareers;assert.equal(stored.applications.byRole[roleId].id,id);assert.equal(stored.tenure,null);enter();assert.equal(r.formalCareers.applicationResult(roleId).id,id);assert.equal(r.formalCareers.applicationResult(roleId).roll,roll);assert.equal(r.chinaService.state().job,null);record('leaving and reentering the region restores the same pending ID and draw');
request('formal-review');until(()=>r.formalCareers.applicationResult(roleId)?.status!=='pending','a second real route meets Xu An for the actual review');assert.equal(r.formalCareers.applicationResult(roleId).status,'approved',JSON.stringify(detail()));assert(r.formalCareers.isHired(roleId));assert.notEqual(r.formalCareers.applicationResult(roleId).interview.factors.recruiter,0,'review reads the live Xu An personality');assert.equal(r.formalCareers.slotHolder(roleId),'player');assert.equal(r.chinaService.state().job,null);assert.equal(r.formalCareers.state().lastDuty,null);assert.equal(r.copperLedger.state().cash,0);assert.equal(r.chinaService.forRole(roleId).intent('formal-review'),null);record('approval claims the single slot once, with no auto shift or salary');
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify({status:'PASS',checks,scope:'Actual production main, simulated DOM and renderer with real Three actors; not iOS',seconds:(Date.now()-started)/1000}));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'tests/career-application-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
