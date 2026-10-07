// Directed actual-main teller integration. Select one country with TELLER_COUNTRY.
// Uses the existing original actors, actual movement/rigs and finite source work.
// Only dependent controllers advance; skills and next day are explicit fixtures.
// Simulated DOM, not browser/WebGL or iOS evidence. Run countries serially.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
if(process.env.WORLDWOVEN_GUARDED!=='1')throw new Error('Use development/heavy-probes/run-bounded.sh for the shared lock and resource limits');
const loadProfiler=require('../development/heavy-probes/profile-load.cjs');
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
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(__tellerProfileSource(file,fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?" + JSON.stringify(extra) + ":''),");
once('vm.createContext({console,', 'vm.createContext({__tellerMeasure,structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('await main.link(linker);await main.evaluate();',"await __tellerAsyncMeasure('main-link',()=>main.link(linker));await __tellerAsyncMeasure('main-evaluate',()=>main.evaluate());");
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.replaceChildren();}add(...e){this.append(...e)}");
const seed = `if(process.env.TELLER_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.TELLER_RESUME,'utf8');}else{const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const base=JSON.parse(storage['worlds-days-v1']);base.appearance.seed=2;base.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:8,seconds:0})}).state();Object.assign(base.formalCareers.skills,{art:4,ritual:4,writing:4});storage['worlds-days-v1']=JSON.stringify(base);}`;
once("const main=mod(path.join(root,'game/main.js'));", seed + "const main=mod(path.join(root,'game/main.js'));");
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TELLER_RESUME?'lot':'globe');");
const begin = harness.indexOf('const report=[];for(let round=0;');
harness = harness.slice(0, begin) + String.raw`
if(process.env.PROBE_STAGE==='init'){console.log('PASS main import only',process.resourceUsage().maxRSS/1024);return;}
console.log('RESOURCE post-import',JSON.stringify({cpu:process.cpuUsage(),rssMiB:process.memoryUsage().rss/1024/1024,load:require('os').loadavg()}));
const started=Date.now(),walk=e=>[e,...(e.children||[]).flatMap(walk)],dialog=()=>all.find(e=>e.className?.split(' ').includes('career-dialog'));
const step=(n=1)=>{for(let i=0;i<n;i++){now+=250;main.namespace.tellerStep(.25);assert(Date.now()-started<180000,'bounded directed teller integration');}};
const r=()=>main.namespace.tellerReview();const until=(pred,label,max=800)=>{let f=0;for(;f<max&&!pred();f++)step();assert(pred(),label+' '+JSON.stringify({p:state().player,path:state().pathLength,toast:ids.toast.textContent,employment:r().regionalTellerEmployment.state(),inspection:r().regionalTellerEmployment.inspection.state(),tellers:r().npcs.filter(n=>n.station.id.includes('teller')).map(n=>({id:n.station.id,p:n.root.position.toArray(),route:n.route}))}));console.log('PASS',label,f);};
const country=process.env.TELLER_COUNTRY||'china',prefix={china:'cn',japan:'jp',france:'fr',egypt:'eg'}[country],currency=country==='china'?'copper':country,roleId=prefix+'-teller-auditor';
if(!process.env.TELLER_RESUME){all.find(e=>e.dataset.region===country).onclick();ids.travel.onclick();}if(process.env.PROBE_STAGE==='load'){console.log('PASS world load only',country,process.resourceUsage().maxRSS/1024);return;}step(1);
const svc=r().regionalTellerEmployment;assert(svc.forRole(roleId));
const stopAfter=process.env.TELLER_STOP_AFTER;
const checkpoint=stage=>{main.namespace.save();const file=path.resolve('qa','regional-teller-'+country+'-'+stage+'.json');fs.writeFileSync(file,storage['worlds-days-v1']);console.log('PASS '+stage+' checkpoint saved',country,file,(Date.now()-started)/1000);};
const savedApplication=process.env.TELLER_RESUME?JSON.parse(fs.readFileSync(process.env.TELLER_RESUME,'utf8')).formalCareers.applications.byRole[roleId]:null;
if(stopAfter==='salary-attendance'){
 assert.equal(savedApplication?.status,'approved');assert(r().formalCareers.isHired(roleId));assert(!svc.state().shift);assert(!svc.inspection.state().order);assert.equal(svc.state().receipts.length,0);
 const bank=JSON.stringify(r().copperLedger.state());assert(main.namespace.requestStationIntent(svc.intent('accept')));
 until(()=>svc.state().shift?.stage==='working','fixed-salary original safe handoff',80);
 const incumbent=r().npcs.find(n=>n.station.id===svc.state().shift.standInId),home=incumbent.station.npcPosition,front=incumbent.station.position,rest=country==='china'?[home[0]-1.8,home[1],home[2]-.3]:[front[0]+1.7,front[1],front[2]-.7];
 until(()=>incumbent.root.position.distanceTo(new incumbent.root.position.constructor(...rest))<.06&&!incumbent.walking,'original incumbent physically clear for salaried duty',80);
 const duty=svc.intent('duty');assert(duty);assert(main.namespace.requestStationIntent(duty));
 until(()=>r().player.root.position.distanceTo(new (r().player.root.position.constructor)(...duty.position))<.1,'actual original work-side attendance position',80);
 const before=svc.state().shift.coveredSeconds,clockBefore=state().simulationClock.seconds;step(480);
 const covered=svc.state().shift.coveredSeconds-before;assert(covered>=119&&covered<=120.001,JSON.stringify({before,shift:svc.state().shift}));assert(Math.abs(state().simulationClock.seconds-clockBefore-120)<1e-6);
 assert.equal(JSON.stringify(r().copperLedger.state()),bank);assert.equal(svc.state().receipts.length,0);assert(!svc.inspection.state().order);assert.equal(r().formalCareers.workState().lastDuty.tellerPayVersion,1);
 console.log('PASS actual loaded attendance seconds',covered,'simulation game hours',covered*.7/60,'no wages before handback');checkpoint('salary-attendance');return;
}
if(stopAfter==='salary-return'){
 assert.equal(svc.state().shift?.salaryVersion,1);assert.equal(svc.state().shift.stage,'working');assert(svc.state().shift.coveredSeconds>=119);assert(!svc.inspection.state().order);
 const before=r().copperLedger.balances(),incumbentId=svc.state().shift.standInId,role=r().formalCareers.currentRole();assert(main.namespace.requestStationIntent(svc.intent('end-shift')));
 until(()=>!svc.state().shift,'actual original incumbent handback and fixed salary settlement',160);
 const duty=r().formalCareers.workState().lastDuty;assert.equal(duty.stage,'paid');assert.equal(duty.tellerPayVersion,1);const expected=Math.floor(role.wage*(duty.coveredSeconds*.7/60)/12+1e-9);assert(expected>0);assert.equal(duty.wage,expected);
 const after=r().copperLedger.balances();for(const c of Object.keys(after)){assert.equal(after[c].cash,before[c].cash);assert.equal(after[c].bank-before[c].bank,c===currency?expected:0);}
 const receiptId='career:'+role.slotId+':'+duty.day;assert.equal(r().copperLedger.state().transactions.filter(tx=>tx.requestId===receiptId&&tx.action==='wage').length,1);
 const incumbent=r().npcs.find(n=>n.station.id===incumbentId);assert(incumbent);assert(incumbent.root.position.distanceTo(new incumbent.root.position.constructor(...incumbent.station.npcPosition))<.06);
 const paid=JSON.stringify(r().copperLedger.state());assert.equal(r().formalCareers.settle().ok,false);assert.equal(JSON.stringify(r().copperLedger.state()),paid);
 console.log('PASS fixed short-shift wage',receiptId,currency,expected,'confirmed loaded seconds',duty.coveredSeconds,'original incumbent',incumbentId);checkpoint('salary-return');return;
}
if(stopAfter==='settlement'){
 const order=svc.inspection.state().order;assert.equal(order?.stage,'return');assert.equal(order.recorded,true);assert.equal(svc.state().receipts.length,0);
 const source=JSON.stringify(order.contract.source),before=r().copperLedger.balances(),work=svc.inspection.actionDescriptor();assert.equal(work.total,0);
 assert(main.namespace.requestStationIntent(svc.intent('original-step')));
 until(()=>!svc.inspection.state().order,'return to original counter and settle completed contract',120);
 const after=r().copperLedger.balances(),receipt=svc.state().receipts[0];assert.equal(svc.state().receipts.length,1);assert.equal(svc.state().income,8);assert.equal(receipt.id,order.contract.orderId);assert.equal(receipt.amount,8);assert.equal(receipt.currency,currency);assert.equal(JSON.stringify(receipt.proof.source),source);
 for(const c of Object.keys(after)){assert.equal(after[c].cash,before[c].cash);assert.equal(after[c].bank-before[c].bank,c===currency?8:0);}
 const paidBank=JSON.stringify(r().copperLedger.state());assert.equal(r().copperLedger.state().transactions.filter(tx=>tx.requestId===receipt.id&&tx.action==='wage').length,1);
 assert.equal(svc.inspection.start({country}).code,'teller-day-consumed');assert.equal(svc.state().receipts.length,1);assert.equal(JSON.stringify(r().copperLedger.state()),paidBank);assert.equal(svc.state().shift.stage,'working');
 console.log('PASS one original wage',receipt.id,currency,8);checkpoint('settlement');return;
}
if(stopAfter==='record'){
 const order=svc.inspection.state().order;assert.equal(order?.stage,'record');assert.equal(order.recorded,false);assert.equal(order.index,4);assert.equal(order.calculationIndex,4);
 const source=JSON.stringify(order.contract),bank=JSON.stringify(r().copperLedger.state()),work=svc.inspection.actionDescriptor();assert.equal(work.total,2);
 assert(main.namespace.requestStationIntent(svc.intent('original-step')));
 until(()=>svc.inspection.actionDescriptor()?.key!==work.key,'original pen contact records four-currency audit',120);
 const next=svc.inspection.state().order;assert.equal(next.stage,'return');assert.equal(next.recorded,true);assert.equal(JSON.stringify(next.contract),source);assert.equal(JSON.stringify(r().copperLedger.state()),bank);assert.equal(svc.state().receipts.length,0);
 checkpoint('record');return;
}
if(['checks','calculations'].includes(stopAfter)){
 const action=stopAfter==='checks'?'check':'calculate',indexField=action==='check'?'index':'calculationIndex';
 const order=svc.inspection.state().order;assert.equal(order?.stage,action);assert.equal(order[indexField],0);assert.equal(svc.state().shift?.stage,'working');
 const source=JSON.stringify(order.contract),bank=JSON.stringify(r().copperLedger.state());
 for(let count=0;count<4;count++){
  const work=svc.inspection.actionDescriptor();assert.equal(work.stage,action);assert.equal(work.index,count);assert.equal(work.total,2);
  const q=svc.intent('original-step');assert(q);assert(main.namespace.requestStationIntent(q));
  until(()=>svc.inspection.actionDescriptor()?.key!==work.key,'original 2-second '+action+' '+work.currency,120);
  const next=svc.inspection.state().order;assert.equal(next[indexField],count+1);assert.equal(JSON.stringify(next.contract),source);assert.equal(JSON.stringify(r().copperLedger.state()),bank);assert.equal(svc.state().receipts.length,0);
 }
 assert.equal(svc.inspection.state().order.stage,action==='check'?'calculate':'record');assert.equal(svc.inspection.state().order.calculationIndex,action==='check'?0:4);checkpoint(stopAfter);return;
}
if(stopAfter==='issuance'){
 assert(r().formalCareers.isHired(roleId));assert.equal(svc.state().shift?.stage,'working');assert(!svc.inspection.state().order);assert.equal(svc.state().receipts.length,0);
 main.namespace.tellerNextDay();r().copperLedger.observeDay();console.log('FIXTURE advance clock one day and apply existing bank day observation; no teller work or wage simulated');
 const sourceBefore=JSON.stringify(r().copperLedger.state());
 assert(main.namespace.requestStationIntent(svc.intent('begin-original')));
 until(()=>!!svc.inspection.state().order,'receive global daily original audit',240);
 const order=svc.inspection.state().order;assert.equal(order.stage,'check');assert.equal(order.index,0);assert.equal(order.calculationIndex,0);assert.equal(order.recorded,false);
 assert.equal(JSON.stringify(r().copperLedger.state()),sourceBefore,'issuance does not alter original bank journal');assert.equal(svc.state().receipts.length,0);
 console.log('PASS original contract',order.contract.orderId,'day',order.contract.day,'currency',order.contract.currency);checkpoint('issuance');return;
}
if(stopAfter==='handoff'){
 assert.equal(savedApplication?.status,'approved');assert(r().formalCareers.isHired(roleId));assert(!svc.state().shift);assert(!svc.inspection.state().order);
 assert(main.namespace.requestStationIntent(svc.intent('accept')));
 until(()=>svc.state().shift?.stage==='working','original safe handoff',240);
 const incumbent=r().npcs.find(n=>n.station.id===svc.state().shift.standInId);assert(incumbent);
 const home=incumbent.station.npcPosition,front=incumbent.station.position,rest=country==='china'?[home[0]-1.8,home[1],home[2]-.3]:[front[0]+1.7,front[1],front[2]-.7];
 until(()=>incumbent.root.position.distanceTo(new incumbent.root.position.constructor(...rest))<.06&&!incumbent.walking,'same original teller physically clear of work bay',160);
 assert.equal(svc.state().receipts.length,0);assert(!svc.inspection.state().order);
 console.log('PASS original incumbent position',incumbent.station.id,incumbent.root.position.toArray());checkpoint('handoff');return;
}
if(stopAfter==='interview'){assert.equal(savedApplication?.status,'pending');assert.equal(r().formalCareers.applicationResult(roleId)?.id,savedApplication.id);assert(!r().formalCareers.isHired(roleId));assert(!svc.state().shift);}
assert(main.namespace.requestStationIntent(svc.intent('formal-view')),JSON.stringify({q:svc.intent('formal-view'),p:state().player,toast:ids.toast.textContent}));until(()=>r().careerHandbook.isOpen(),'walk to actual '+country+' original counter registration',stopAfter==='interview'?80:1500);
const button=label=>walk(dialog()).find(e=>e.tagName==='button'&&e.textContent===label);
if(stopAfter==='registration'){assert(button('提交职位申请'));button('提交职位申请').onclick();until(()=>r().formalCareers.applicationResult(roleId)?.status==='pending','saved local pending application',1);checkpoint('registration');return;}
assert.equal(r().formalCareers.applicationResult(roleId)?.id,savedApplication.id,'resume must keep the same pending application');
assert(button('当面核验资格与职责'));button('当面核验资格与职责').onclick();until(()=>r().formalCareers.isHired(roleId),'same original teller interview',240);assert(!svc.state().shift);
if(stopAfter==='interview'){assert.equal(r().formalCareers.applicationResult(roleId)?.id,savedApplication.id);checkpoint('interview');return;}
r().careerHandbook.close();assert(main.namespace.requestStationIntent(svc.intent('accept')));until(()=>svc.state().shift?.stage==='working','original safe handoff',1200);step(120);
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
new vm.Script(harness,{filename:'tests/regional-teller-main-inherited.cjs'}).runInNewContext({__tellerProfileSource:loadProfiler.source,__tellerMeasure:loadProfiler.measure,__tellerAsyncMeasure:loadProfiler.asyncMeasure,structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
