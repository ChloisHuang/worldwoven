// Directed production-main integration for the original China tea and six-book work.
// Seed 2 and player ritual/writing skills 4 make both real interviews deterministic.
// No NPC money, request, books or completed service are fabricated. Archive uses
// an explicit next-day clock fixture after verifying that Lan's same-day original
// cannot be reissued. Step only directly dependent source controllers plus the
// actual player input/navigation/Three rig. Simulated DOM, not browser/WebGL QA.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let harness = fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8');
function once(a, b) {
  if (!harness.includes(a) || harness.indexOf(a) !== harness.lastIndexOf(a)) throw Error('Harness seam changed: ' + a);
  harness = harness.replace(a, b);
}
const extra = `
export function pieceworkReview(){return {player,npcs,lot,furniture,navOptions,chinaPieceworkEmployment,chinaTeaService,chinaArchiveService,teaSlot,archiveSlot,chinaPalace,chinaTeaPersonal,chinaArchivePersonal,careerHandbook,formalCareers,copperLedger};}
export function pieceworkStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);chinaPieceworkEmployment?.update(dt,elapsed);chinaPalace?.update(dt,elapsed,{day:simulationClock.state().day,hour:simulationClock.state().hour,position:player.root.position});chinaTeaPersonal?.update(dt,elapsed);chinaArchiveService?.update(dt,elapsed,{});chinaArchivePersonal?.update(dt,elapsed);careerHandbook.update(mode);}
export function pieceworkNextDay(){const target=simulationClock.state().seconds+1440/.7;while(simulationClock.state().seconds<target)simulationClock.advance(.25);formalCareers.observeDay();}
export {requestStationIntent,resolvePlayerIntent,executeNearbyAction,navigateTo,cancelAction,currentControl,requestFurniture,save,planPath,blocked};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?" + JSON.stringify(extra) + ":''),");
once('vm.createContext({console,', 'vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.children=[];}add(...e){this.append(...e)}");
const seed = `if(process.env.PIECEWORK_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.PIECEWORK_RESUME,'utf8');}else{const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const base=JSON.parse(storage['worlds-days-v1']);base.appearance.seed=2;base.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:8,seconds:0})}).state();Object.assign(base.formalCareers.skills,{art:4,ritual:4,writing:4});storage['worlds-days-v1']=JSON.stringify(base);}`;
once("const main=mod(path.join(root,'game/main.js'));", seed + "const main=mod(path.join(root,'game/main.js'));");
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.PIECEWORK_RESUME?'lot':'globe');");
const begin = harness.indexOf('const report=[];for(let round=0;');
harness = harness.slice(0, begin) + String.raw`
const started=Date.now(),walk=e=>[e,...(e.children||[]).flatMap(walk)],dialog=()=>all.find(e=>e.className?.split(' ').includes('career-dialog'));
const step=(n=1)=>{for(let i=0;i<n;i++){now+=250;main.namespace.pieceworkStep(.25);assert(Date.now()-started<300000,'bounded focused integration');}};
const r=()=>main.namespace.pieceworkReview();const until=(pred,label,max=800)=>{let f=0;for(;f<max&&!pred();f++)step();assert(pred(),label+' '+JSON.stringify({p:state().player,path:state().pathLength,toast:ids.toast.textContent,employment:r().chinaPieceworkEmployment.state(),archive:r().chinaArchiveService.state(),tea:r().chinaTeaService.state()}));console.log('PASS',label,f);};
if(!process.env.PIECEWORK_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}step(1);
for(const roleId of (process.env.PIECEWORK_RESUME?['cn-archive-inspector']:['cn-palace-tea-service','cn-archive-inspector'])){
const svc=r().chinaPieceworkEmployment.forRole(roleId);if(!r().formalCareers.isHired(roleId)){assert(main.namespace.requestStationIntent(svc.intent('formal-view')));until(()=>r().careerHandbook.isOpen(),'walk to real '+roleId+' registration');
const button=label=>walk(dialog()).find(e=>e.tagName==='button'&&e.textContent===label);assert(button('提交职位申请'));button('提交职位申请').onclick();until(()=>r().formalCareers.applicationResult(roleId)?.status==='pending','saved pending '+roleId);
button('当面核验资格与职责').onclick();until(()=>r().formalCareers.isHired(roleId),'original person completes review '+roleId,900);assert(!svc.state().shift);r().careerHandbook.close();assert(main.namespace.requestStationIntent(svc.intent('accept')));until(()=>svc.state().shift?.stage==='working','safe original handoff '+roleId,1200);step(50);}
console.log('WORK',roleId,JSON.stringify(svc.state()));
if(roleId==='cn-palace-tea-service'){assert(main.namespace.requestStationIntent(svc.intent('await-original')));until(()=>!!r().chinaTeaService.state().runtime,'real existing guest voluntary original request',1200);for(let count=0;count<12;count++){if(!r().chinaTeaService.state().runtime)break;until(()=>!!svc.intent('original-step'),'original guest/work readiness '+count,200);const q=svc.intent('original-step'),phase=r().chinaTeaService.state().runtime.phase;assert(main.namespace.requestStationIntent(q),JSON.stringify({q,p:state().player,toast:ids.toast.textContent}));until(()=>!r().chinaTeaService.state().runtime||r().chinaTeaService.state().runtime.phase!==phase,'original tea gesture '+phase,300);}assert.equal(svc.state().income,8);console.log('PASS real original tea player bank8');}
if(roleId==='cn-archive-inspector'){
const options=r().chinaArchiveService.playerOptions();console.log('OPTIONS',JSON.stringify(options));main.namespace.save();fs.writeFileSync('/tmp/china-piecework-archive-checkpoint.json',storage['worlds-days-v1']);
// The original daily work may already have been performed by Lan. Never issue a second daily order.
if(r().chinaArchiveService.state().lastIssuedDay===state().simulationClock.day){assert.equal(r().chinaArchiveService.playerStart().ok,false);console.log('PASS daily original not duplicated');}
main.namespace.pieceworkNextDay();assert(main.namespace.requestStationIntent(svc.intent('begin-original')));until(()=>!!r().chinaArchiveService.state().order,'player receives next daily original');
for(let count=0;count<19;count++){const before=r().chinaArchiveService.state().order;if(!before)break;const key=r().chinaArchiveService.playerOptions()[0]?.id,q=svc.intent('original-step');assert(q);assert(main.namespace.requestStationIntent(q),JSON.stringify({q,p:state().player,toast:ids.toast.textContent,mode:state().mode}));until(()=>{const after=r().chinaArchiveService.state().order;return !after||r().chinaArchiveService.playerOptions()[0]?.id!==key;},'actual original book step '+count,500);}
assert.equal(svc.state().income,8);assert(r().lot.archiveBooks.allReturned());console.log('PASS player actual six books and bank8');
}
assert(main.namespace.requestStationIntent(svc.intent('end-shift')));until(()=>!svc.state().shift,'safe same person return '+roleId,500);assert(main.namespace.requestStationIntent(svc.intent('formal-resign')));assert(!r().formalCareers.isHired(roleId));r().careerHandbook.close();
}
console.log('PASS both actual registrations and safe original duties, seconds',(Date.now()-started)/1000);
})().catch(e=>{console.error(e);process.exit(1)});`;
new vm.Script(harness,{filename:'tests/china-piecework-main-inherited.cjs'}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
