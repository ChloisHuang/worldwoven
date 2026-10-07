// Production-main integration for the original Japan stage, bar and tea seats.
// Only player skills (art/ritual/writing 4) are seeded so seed42 can pass
// all three real interviews. No NPC money, visitors or orders are fabricated.
// VM + DOM harness: this is controller/geometry evidence, not browser/WebGL QA.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
let harness = fs.readFileSync(path.join(__dirname, 'fixtures/hotfix-input-harness.cjs'), 'utf8');
function once(a, b) {
  if (!harness.includes(a) || harness.indexOf(a) !== harness.lastIndexOf(a)) throw Error('Harness seam changed: ' + a);
  harness = harness.replace(a, b);
}
const extra = `
export function performanceReview(){return {player,npcs,lot,furniture,navOptions,japanPerformance,japanPerformanceEconomy,japanPerformanceEmployment,japanService,careerHandbook,formalCareers,copperLedger};}
export function performanceStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);careerHandbook.update(mode);}
export {requestStationIntent,resolvePlayerIntent,executeNearbyAction,navigateTo,cancelAction,currentControl,requestFurniture,save,planPath,blocked};`;
once("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?" + JSON.stringify(extra) + ":''),");
once('vm.createContext({console,', 'vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
once('{identifier:file,context}', '{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
once("const document={body:new E('body'),", "const document={head:new E('head'),body:new E('body'),");
once('add(...e){this.append(...e)}', "prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}querySelectorAll(selector){return this.children.flatMap(e=>[e,...(e.querySelectorAll?.('*')||[])]).filter(e=>selector==='*'||selector.startsWith('.')&&e.className?.split(' ').includes(selector.slice(1)));}get textContent(){return (this._text||'')+this.children.map(e=>e.textContent||'').join('');}set textContent(v){this._text=String(v);this.children=[];}add(...e){this.append(...e)}");
const seed = `const fm=mod(path.join(root,'game/formal-careers.js'));await fm.link(linker);await fm.evaluate();const base=JSON.parse(storage['worlds-days-v1']);base.formalCareers=fm.namespace.createFormalCareers({saveState:()=>true,getClock:()=>({day:0,hour:8,seconds:0})}).state();Object.assign(base.formalCareers.skills,{art:4,ritual:4,writing:4});storage['worlds-days-v1']=JSON.stringify(base);`;
once("const main=mod(path.join(root,'game/main.js'));", seed + "const main=mod(path.join(root,'game/main.js'));");
const begin = harness.indexOf('const report=[];for(let round=0;');
harness = harness.slice(0, begin) + String.raw`
const started=Date.now(),checks=[],walk=e=>[e,...(e.children||[]).flatMap(walk)],text=e=>e.textContent||'',dialog=()=>all.find(e=>e.className?.split(' ').includes('career-dialog'));
const check=(label,details={})=>{checks.push({label,...details});console.log('PASS',label,JSON.stringify(details));};
const step=(count=1)=>{for(let i=0;i<count;i++){now+=100;main.namespace.performanceStep(.1);assert(Date.now()-started<180000,'bounded integration budget');}};
const detail=()=>({player:state().player,path:state().pathLength,pending:state().pendingInteraction,clock:state().simulationClock,employment:state().japanPerformanceEmployment,toast:ids.toast.textContent});
const until=(pred,label,max=1800)=>{let frames=0;for(;frames<max&&!pred();frames++)step();assert(pred(),label+' '+JSON.stringify(detail()));check(label,{frames});};
const click=(button,label)=>{assert(button&&!button.disabled,label);button.onclick();};
const button=s=>walk(dialog()).find(e=>e.tagName==='button'&&text(e)===s);
const card=all.find(e=>e.dataset.region==='japan');click(card,'Japan globe card');click(ids.travel,'travel to original Japan');assert.equal(state().region,'japan');step(2);
const castModule=cache.get(path.join(root,'game/japan-performance-cast.js')).namespace,P=castModule.PERFORMANCE_POINTS,WORK_BAR=[4.3,7.6,-6.5],T=three.namespace;let r=main.namespace.performanceReview();const originalIds=r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),castIds=['jp-performance-reception','jp-salon-mai','jp-salon-ichiro'],identities=()=>r.npcs.filter(n=>castIds.includes(n.station.id)).map(n=>({id:n.station.id,name:n.station.npcName,age:n.ageYears,look:n.root.userData.appearance}));const originalCast=JSON.stringify(identities());
assert.equal(Object.values(r.japanPerformanceEconomy.snapshot().accounts).reduce((n,a)=>n+a.cash,0),0,'original NPCs have no invented purse');
for(const id of castIds)assert.equal(r.formalCareers.catalogue().find(x=>x.id===id)?.country,'japan');
check('original Japan scene and all three original specialty people load');
r.careerHandbook.open();assert(text(dialog()).includes('霞汤屋三层町街演艺小厅'));click(button('前往霞汤屋三层町街演艺小厅'),'navigate to physical three-role catalogue');assert(!r.careerHandbook.isOpen());assert(state().pathLength>0,'physical navigation, no remote registration');assert(main.namespace.currentControl()?.intentKey.startsWith('pending'),'route has cancel control');
until(()=>r.careerHandbook.isOpen(),'walk original stairs to receptionist and open performance catalogue');
assert.equal(walk(dialog()).filter(e=>e.className?.split(' ').includes('career-role-card')).length,3,'the workplace catalogue must show all three original positions');
assert(text(dialog()).includes('演艺厅接待奉茶员'));assert(text(dialog()).includes('演艺厅折扇舞者'));assert(text(dialog()).includes('演艺厅町街说书人'));assert(!/温晚|云来|中国|铜文|18–40|才艺名册/.test(text(dialog())),'Japan registration must not inherit China copy');
check('physical workplace catalogue has three Japanese roles and correct local copy');
const reenter=()=>{
main.namespace.save();const checkpoint=JSON.parse(storage['worlds-days-v1']);assert(checkpoint.worldContinuity,'world lifecycle saves actual original scene');assert(checkpoint.japanPerformanceEmployment,'employment state saved');assert.equal(checkpoint.japanPerformanceEmployment.order,null);const shift=JSON.stringify(r.japanPerformanceEmployment.state().shift);assert(checkpoint.worldContinuity.regions.japan.controllers.japanPerformanceEmployment,'employment continuity snapshot');
click(ids['return-world'],'return to globe');assert.equal(state().mode,'globe');assert.equal(state().japanPerformanceEmployment,null);assert.equal(state().japanPerformanceEconomy,null);assert.equal(state().npcCount,0);click(card,'reselect Japan');click(ids.travel,'reenter original Japan');r=main.namespace.performanceReview();assert.equal(state().continuity.skipped.length,0,'original lifecycle restores all controller snapshots');assert.equal(r.japanPerformanceEmployment.state().loadError,null);assert.equal(r.japanPerformanceEconomy.loadError,null);assert.deepEqual(r.npcs.filter(n=>!n.station.id.startsWith('jp-visitor-')).map(n=>n.station.id),originalIds);assert.equal(JSON.stringify(identities()),originalCast);assert.equal(r.japanPerformanceEmployment.state().income,0);assert.equal(JSON.stringify(r.japanPerformanceEmployment.state().shift),shift,'active empty shift restored');check('world leave/reentry restores original identities and new controllers without synthetic income');
};
for(const roleId of castIds){
 let service=r.japanPerformanceEmployment.forRole(roleId);r.careerHandbook.close();assert(main.namespace.requestStationIntent(service.intent('formal-view')));until(()=>r.careerHandbook.isOpen(),'open '+roleId+' registration');
 const apply=button('提交职位申请');click(apply,'submit '+roleId);until(()=>r.formalCareers.applicationResult(roleId)?.status==='pending','separate application '+roleId);assert.equal(r.japanPerformanceEmployment.state().shift,null);assert.equal(r.formalCareers.state().tenure,null);assert(text(dialog()).includes('你愿意按这份职责任职吗？'));
 const stale=service.intent('formal-review');click(button('当面确认职责 · 审核申请'),'review '+roleId);assert(r.formalCareers.isHired(roleId),'qualified original applicant hired '+JSON.stringify(r.formalCareers.applicationResult(roleId)));assert.equal(r.japanPerformanceEmployment.state().shift,null,'hiring does not start work');assert.equal(main.namespace.resolvePlayerIntent(stale),null,'review intent expires');assert.equal(r.formalCareers.slotHolder(roleId),'player');assert(text(dialog()).includes('未开班'));assert(!/温晚|云来|中国|铜文|18–40|才艺名册/.test(text(dialog())));
 click(button('自主开班 · '+r.formalCareers.currentRole().name),'explicit start '+roleId);assert.equal(r.japanPerformanceEmployment.state().shift.roleId,roleId);assert(r.japanPerformanceEmployment.onShift(roleId));assert.equal(r.japanPerformanceEmployment.state().order,null);until(()=>r.japanPerformanceEmployment.state().shift.ready,'original holder safely yields '+roleId);if(roleId==='jp-performance-reception'){main.namespace.navigateTo(new T.Vector3(...WORK_BAR));until(()=>!state().pathLength,'walk to actual original bar after receptionist yields');assert(r.player.root.position.distanceTo(new T.Vector3(...WORK_BAR))<.5,'bar accessible without overlap');assert(r.npcs.find(n=>n.station.id===roleId).root.position.distanceTo(r.player.root.position)>.8,'original receptionist safely beside work point');assert(main.namespace.requestStationIntent(service.intent('formal-view')));until(()=>r.careerHandbook.isOpen(),'return to original receptionist for handover');r.careerHandbook.close();}step(10);assert.equal(r.japanPerformanceEmployment.state().order,null,'unfunded NPCs cannot fabricate invitations');assert.equal(r.copperLedger.history().filter(t=>t.action==='wage').length,0,'empty shift cannot pay');
 if(roleId==='jp-salon-ichiro'){reenter();service=r.japanPerformanceEmployment.forRole(roleId);}
 r.careerHandbook.open();assert(text(dialog()).includes(service.label()),'handbook uses live role label');click(button('当面交班 · 任职保留'),'end empty shift '+roleId);assert.equal(r.japanPerformanceEmployment.state().shift,null);assert(r.formalCareers.isHired(roleId));until(()=>r.japanPerformanceEmployment.state().returns.length===0,'original holder returns home after '+roleId+' handover');assert(main.namespace.requestStationIntent(service.intent('formal-resign')));assert(!r.formalCareers.isHired(roleId));assert.equal(JSON.stringify(identities()),originalCast,'original cast identities untouched');check('separate apply, review, explicit start, empty no-pay handover and resign',{roleId});
}
// Test the actual local geometry without seeding a customer/order. The three
// original stage and seat entry positions remain the same; the bar approach
// is tested while its original receptionist is physically off the work point.
for(const [name,point] of [['stage',P.stage],['serve',P.serve]]){r.careerHandbook.close();main.namespace.navigateTo(new T.Vector3(...point));until(()=>!state().pathLength,'walk original '+name+' geometry');assert(r.player.root.position.distanceTo(new T.Vector3(...point))<.5,name+' reachable');}
const chair=r.furniture.items.find(i=>i.id==='jp-performance-artist-seat');main.namespace.requestFurniture(chair);until(()=>state().seated===chair.id,'original artist tea seat uses actual seat entry');assert(main.namespace.cancelAction(),'stand from original artist seat');until(()=>!state().seated,'stand safely from original artist seat');
console.log(JSON.stringify({status:'PASS',scope:'Original production main in VM with simulated DOM; only player skills fixture; no synthetic NPC money, no browser/WebGL visual claim',checks,seconds:(Date.now()-started)/1000},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness, {filename:'tests/japan-performance-main-inherited.cjs'}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:path.resolve('tests'),__filename});
