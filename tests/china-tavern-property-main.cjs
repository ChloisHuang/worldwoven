// One real counter route and UI transaction chain in production main. This uses
// the existing simulated DOM/Three harness, not browser or iOS visual evidence.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras="\nexport function propertyReview(){return {player,lot,npcs,chinaService,chinaTavern,formalCareers,tavernProperty,copperLedger};} export function propertyStep(dt){beginActorNavigationStep(dt);elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);chinaService.update(dt);} export {cancelAction};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace('visited:[],stamps:{},outfit:0,appearance:',"visited:[],stamps:{},outfit:0,copperLedger:{version:1,cash:0,bank:900,accountOpened:true,nextTransaction:1,transactions:[]},appearance:");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const started=Date.now();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.propertyReview(),find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),panel=()=>find(document.body,e=>e.className?.split(' ').includes('cn-property-dialog')),text=e=>[e.textContent||'',...(e.children||[]).map(text)].join('\n');
const button=label=>{const b=find(panel(),e=>e.tagName==='button'&&e.textContent===label);assert(b,label);assert(!b.disabled,label+' enabled');return b;};
const frame=()=>{now+=100;main.namespace.propertyStep(.1);};
r.player.root.position.set(14.8,.215,13.4);
const row=ids['station-list'].children.find(e=>e.dataset.stationId==='cn-tavern-property');assert(row,'visible ownership entry in actual activity list');row.onclick();
let frames=0;for(;frames<500&&!panel().open;frames++)frame();assert(panel().open,'route reaches physical property counter');
assert.equal(r.tavernProperty.state().ownerId,'cn-tavern-host');assert.equal(r.formalCareers.state().tenure,null);assert(!r.chinaService.active());
const sceneBefore=r.chinaTavern.staffScene.snapshot(),host=r.npcs.find(n=>n.station.id==='cn-tavern-host'),npcCount=r.npcs.length;
button('向业主申请购买').onclick();const app=r.tavernProperty.state().market.application;assert.equal(app.status,'accepted');assert.equal(r.copperLedger.state().bank,900,'seller consent alone takes no money');
const pay=button('支付 '+app.amount+' 文 · 买下酒楼');pay.onclick();const bank=r.copperLedger.state().bank;pay.onclick();assert.equal(r.copperLedger.state().bank,bank,'stale UI cannot buy twice');
assert.equal(r.tavernProperty.state().ownerId,'player');assert.equal(r.npcs.length,npcCount);assert.strictEqual(r.npcs.find(n=>n.station.id==='cn-tavern-host'),host);assert.equal(r.formalCareers.state().tenure,null);assert(!r.chinaService.active());assert.deepEqual(r.chinaTavern.staffScene.snapshot(),sceneBefore,'ownership does not reset orders, dirt or staff shifts');
button('注资 20 文').onclick();assert.equal(r.copperLedger.state().bank,bank-20);button('提取 10 文').onclick();assert.equal(r.copperLedger.state().bank,bank-10);
button('挂牌出售').onclick();assert(r.tavernProperty.state().market.offers.length);button('买方报价 · 3').onclick();button('拒绝').onclick();assert.equal(r.tavernProperty.state().market.offers[0].status,'rejected');
button('挂牌改价').onclick();button('降价一成').onclick();assert.equal(r.tavernProperty.state().market.price,324);const offer=r.tavernProperty.state().market.offers.find(o=>o.status==='open');button('买方报价 · 2').onclick();const choice=find(panel(),e=>e.tagName==='button'&&e.getAttribute?.('aria-label')===r.tavernProperty.state().npcNames[offer.buyerId]+'出价'+offer.amount+'文');assert(choice);choice.onclick();button('收 '+offer.amount+' 文 · 出售').onclick();assert.equal(r.tavernProperty.state().ownerId,offer.buyerId);assert.equal(r.copperLedger.state().bank,bank-10+offer.amount);assert(!r.chinaService.active());assert.equal(r.formalCareers.state().tenure,null);
button('账簿').onclick();assert(text(panel()).includes('全员NPC日薪、食材成本和招聘管理尚未开放'));
button('×').onclick();assert(!panel().open);assert(!r.chinaService.isOpen());ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
console.log(JSON.stringify({status:'PASS',frames,seconds:(Date.now()-started)/1000,scope:'One production main counter route, buy/capital/draw/reject/discount/sell through simulated DOM; existing NPC identities and world orders unchanged. Not browser/iOS QA.'}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/property-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
