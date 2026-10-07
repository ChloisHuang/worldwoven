// Directed actual-main teller integration. Select one country with TELLER_COUNTRY.
// Uses the existing original actors, actual movement/rigs and finite source work.
// Only dependent controllers advance; skills and next day are explicit fixtures.
// Simulated DOM, not browser/WebGL or iOS evidence. Run countries serially.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
if(process.env.WORLDWOVEN_GUARDED!=='1')throw new Error('Use development/heavy-probes/run-bounded.sh for the shared lock and resource limits');
let harness = require('../development/heavy-probes/bounded-dom.cjs')(fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8'));
function once(a, b) {
  if (!harness.includes(a) || harness.indexOf(a) !== harness.lastIndexOf(a)) throw Error('Harness seam changed: ' + a);
  harness = harness.replace(a, b);
}
const extra = `
export function tellerReview(){return {player,npcs,lot,furniture,navOptions,regionalTellerEmployment,chinaTellerService,chinaTellerPersonal,careerHandbook,formalCareers,copperLedger};}
export function tellerStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);regionalTellerEmployment?.update(dt,elapsed);chinaMoneyHouse?.update(dt,elapsed);chinaTellerService?.update(dt,elapsed,{});chinaTellerPersonal?.update(dt,elapsed);careerHandbook.update(mode);}
export function tellerNextDay(){const target=simulationClock.state().seconds+1440/.7;while(simulationClock.state().seconds<target)simulationClock.advance(.25);formalCareers.observeDay();}
export {requestStationIntent,resolvePlayerIntent,executeNearbyAction,navigateTo,cancelAction,currentControl,requestFurniture,save,planPath,blocked};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?" + JSON.stringify(extra) + ":''),");
once('vm.createContext({console,', 'vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
const seed = `if(process.env.TELLER_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.TELLER_RESUME,'utf8');}else{const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const base=JSON.parse(storage['worlds-days-v1']);base.appearance.seed=2;base.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:8,seconds:0})}).state();Object.assign(base.formalCareers.skills,{art:4,ritual:4,writing:4});storage['worlds-days-v1']=JSON.stringify(base);}`;
once("const main=mod(path.join(root,'game/main.js'));", seed + "const main=mod(path.join(root,'game/main.js'));");
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TELLER_RESUME?'lot':'globe');");
const begin = harness.indexOf('const report=[];for(let round=0;');
harness = harness.slice(0, begin) + String.raw`
if(process.env.PROBE_STAGE==='init'){console.log('PASS main import only',process.resourceUsage().maxRSS/1024);return;}
const started=Date.now(),walk=e=>[e,...(e.children||[]).flatMap(walk)],dialog=()=>all.find(e=>e.className?.split(' ').includes('career-dialog'));
const step=(n=1)=>{for(let i=0;i<n;i++){now+=250;main.namespace.tellerStep(.25);assert(Date.now()-started<180000,'bounded directed teller integration');}};
const r=()=>main.namespace.tellerReview();const until=(pred,label,max=800)=>{let f=0;for(;f<max&&!pred();f++)step();assert(pred(),label+' '+JSON.stringify({p:state().player,path:state().pathLength,toast:ids.toast.textContent,employment:r().regionalTellerEmployment.state(),inspection:r().regionalTellerEmployment.inspection.state(),tellers:r().npcs.filter(n=>n.station.id.includes('teller')).map(n=>({id:n.station.id,p:n.root.position.toArray(),route:n.route}))}));console.log('PASS',label,f);};
const country=process.env.TELLER_COUNTRY||'china',prefix={china:'cn',japan:'jp',france:'fr',egypt:'eg'}[country],currency=country==='china'?'copper':country,roleId=prefix+'-teller-auditor';
if(!process.env.TELLER_RESUME){all.find(e=>e.dataset.region===country).onclick();ids.travel.onclick();}if(process.env.PROBE_STAGE==='load'){console.log('PASS world load only',country,process.resourceUsage().maxRSS/1024);return;}step(1);
const svc=r().regionalTellerEmployment;assert(svc.forRole(roleId));
assert(main.namespace.requestStationIntent(svc.intent('formal-view')),JSON.stringify({q:svc.intent('formal-view'),p:state().player,toast:ids.toast.textContent}));until(()=>r().careerHandbook.isOpen(),'walk to actual '+country+' original counter registration',1500);
const button=label=>walk(dialog()).find(e=>e.tagName==='button'&&e.textContent===label);assert(button('提交职位申请'));button('提交职位申请').onclick();until(()=>r().formalCareers.applicationResult(roleId)?.status==='pending','saved local pending application',1);
if(process.env.TELLER_STOP_AFTER==='registration'){
 main.namespace.save();
 const checkpoint=path.resolve('qa','regional-teller-'+country+'-registration.json');
 fs.writeFileSync(checkpoint,storage['worlds-days-v1']);
 console.log('PASS registration checkpoint saved',country,checkpoint,(Date.now()-started)/1000);
 return;
}
button('当面核验资格与职责').onclick();until(()=>r().formalCareers.isHired(roleId),'same original teller interview',1200);assert(!svc.state().shift);r().careerHandbook.close();assert(main.namespace.requestStationIntent(svc.intent('accept')));until(()=>svc.state().shift?.stage==='working','original safe handoff',1200);step(120);
// Explicit clock fixture; the original China NPC audit may have used today.
main.namespace.tellerNextDay();
const beforeBalance=r().copperLedger.balances();
assert(main.namespace.requestStationIntent(svc.intent('begin-original')));until(()=>!!svc.inspection.state().order,'receive global daily original audit',800);
const original=structuredClone(svc.inspection.state().order.contract.source);
for(let count=0;count<10;count++){const q=svc.intent('original-step'),key=svc.inspection.actionDescriptor()?.key;assert(q,'next original work '+count);assert(main.namespace.requestStationIntent(q),JSON.stringify({q,p:state().player,toast:ids.toast.textContent,npcs:r().npcs.filter(n=>n.station.id.includes('teller')).map(n=>({id:n.station.id,p:n.root.position.toArray(),route:n.route}))}));until(()=>svc.inspection.actionDescriptor()?.key!==key,'actual four-currency audit step '+count,600);}
assert(!svc.inspection.state().order);assert.equal(svc.state().income,8);const afterBalance=r().copperLedger.balances();assert.equal(afterBalance[currency].bank-beforeBalance[currency].bank,8);
for(const c of Object.keys(afterBalance)){assert.equal(afterBalance[c].cash,beforeBalance[c].cash);if(c!==currency)assert.equal(afterBalance[c].bank,beforeBalance[c].bank);}
assert.deepEqual(svc.state().receipts[0].proof.source,original,'the salary receipt retains the exact original source, not the post-wage journal');
assert.equal(svc.inspection.start({country}).code,'teller-day-consumed');assert.equal(svc.state().receipts.length,1);
assert(main.namespace.requestStationIntent(svc.intent('end-shift')));until(()=>!svc.state().shift,'same original teller returned safely',700);
main.namespace.save();fs.writeFileSync('/tmp/regional-teller-'+country+'-complete.json',storage['worlds-days-v1']);
console.log('PASS',country,roleId,'four currency actual audit, one '+currency+' bank8, source unchanged, local explicit handoff',(Date.now()-started)/1000);
})().catch(e=>{console.error(e);process.exit(1)});`;
new vm.Script(harness,{filename:'tests/regional-teller-main-inherited.cjs'}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
