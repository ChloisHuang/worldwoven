// Production-main hooks: visible thresholds, real fixture intent/doors, manual
// cancellation, receipt save/reentry and cross-country player identity. Fixture
// ages set an existing overdue save; no money or food is minted for this test.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const additions="\nexport function dailyReview(){return {player,npcs,lot,camera,scene,sun,lighting,furniture,chinaDailyToilet,chinaTavern,dailyNeeds,saved,copperLedger};} export {requestStationIntent,requestFurniture};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace('getBoundingClientRect(){return', 'getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed={version:1,people:{player:{foodAge:12*60/.7,toiletAge:25*60/.7,receipts:{}},'cn-tavern-diner-west':{foodAge:7*60/.7,toiletAge:24*60/.7,receipts:{}}}};
harness=harness.replace('let context=vm.createContext(',"const needsSeed=JSON.parse(storage['worlds-days-v1']);needsSeed.dailyNeeds="+JSON.stringify(seed)+";storage['worlds-days-v1']=JSON.stringify(needsSeed);let context=vm.createContext(");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report={status:'RUNNING',scope:'China fixture route/main hooks plus one Egypt player-identity transfer; simulated DOM/renderer',checks:[]};
const record=label=>{report.checks.push(label);console.log(label);};
const frame=(n=1)=>{for(let i=0;i<n;i++){now+=33.333;raf();}};
const until=(pred,label,max=2600)=>{let n=0;for(;n<max&&!pred();n++)frame();assert(pred(),label+' '+JSON.stringify({player:state().player,toilet:state().chinaDailyToilet,tavern:state().chinaTavern?.staffScene?.actors}));record(label);};
const key=code=>events.keydown({code,repeat:false,preventDefault(){}});
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();frame();let r=main.namespace.dailyReview();
assert(r.chinaDailyToilet.state().available);assert(ids['player-health'].textContent.includes('很饿了'));assert(ids['player-health'].textContent.includes('该如厕了'));assert(!ids['player-health'].textContent.includes('foodAge'));record('only threshold icons and short status are visible');
// Follow the ordinary shared route from the residence's public ground entry,
// through its real switchback stair and net-room door to the fixture approach.
r.player.root.position.set(-15.2,.215,-13.4);assert(main.namespace.requestStationIntent(r.chinaDailyToilet.intent()));
until(()=>r.chinaDailyToilet.state().activity?.stage==='using','ground-floor public passage and real stair lead to private bowl');assert(state().playerPose.seated);frame(25);const beforeCancel=r.dailyNeeds.snapshot().people.player.toiletAge;
key('KeyE');frame();assert(!r.chinaDailyToilet.active());assert(r.dailyNeeds.snapshot().people.player.toiletAge>=beforeCancel);assert.equal(r.chinaDailyToilet.state().receipts.length,0);record('E cancels without a completion or relief');
assert(main.namespace.requestStationIntent(r.chinaDailyToilet.intent()));until(()=>r.chinaDailyToilet.state().activity?.stage==='using','fixture can be reused after cancellation');
until(()=>r.chinaDailyToilet.state().receipts.some(v=>v.actorId==='player'),'actual private 8-second use saves one completion receipt');assert(r.dailyNeeds.snapshot().people.player.toiletAge<1);assert.equal(r.chinaDailyToilet.state().receipts.length,1);frame(20);assert.equal(r.chinaDailyToilet.state().receipts.length,1);assert(!ids['player-health'].textContent.includes('该如厕了'));record('completed receipt relieves exactly once and the player exits safely');
// Moneyless orders remain rejected, including while physiological hunger exists.
const seat=r.chinaTavern.seats.find(s=>s.id==='china-tavern-dining-18.1-1');r.player.root.position.set(...seat.position);main.namespace.requestFurniture(seat);until(()=>state().seated===seat.id,'player reaches existing paid-meal interface');const hunger=r.dailyNeeds.hunger('player');assert.equal(r.copperLedger.balances().copper.cash,0);assert(!r.chinaTavern.requestMeal());assert(r.dailyNeeds.hunger('player')>=hunger);key('KeyE');frame();record('no cash means no dish and no hunger relief');
r.player.root.position.set(-13,.215,-14);until(()=>r.chinaDailyToilet.state().receipts.some(v=>v.actorId==='cn-tavern-diner-west'),'idle real diner walks from tavern to the same private toilet',6500);const guestReceipt=r.chinaDailyToilet.state().receipts.find(v=>v.actorId==='cn-tavern-diner-west');assert(guestReceipt.delivered);assert(r.dailyNeeds.snapshot().people['cn-tavern-diner-west'].toiletAge<2);assert(r.chinaTavern.state().staffScene.mealReceipts.some(v=>v.actorId==='cn-tavern-diner-west'));
events.pagehide();const before=r.dailyNeeds.snapshot(),serial=r.chinaDailyToilet.state().serial;ids['return-world'].onclick();frame(20);assert.deepEqual(r.dailyNeeds.snapshot(),before);global.gc?.();
all.find(e=>e.dataset.region==='egypt').onclick();ids.travel.onclick();frame(30);const abroad=main.namespace.dailyReview().dailyNeeds.snapshot();assert(abroad.people.player.foodAge>before.people.player.foodAge);assert.equal(abroad.people['cn-tavern-diner-west'].foodAge,before.people['cn-tavern-diner-west'].foodAge);ids['return-world'].onclick();global.gc?.();
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();frame();r=main.namespace.dailyReview();assert(r.dailyNeeds.snapshot().people.player.foodAge>=abroad.people.player.foodAge);assert.equal(r.chinaDailyToilet.state().serial,serial);assert.equal(r.dailyNeeds.snapshot().people.player.receipts['china-toilet'],before.people.player.receipts['china-toilet']);assert.equal(r.dailyNeeds.snapshot().people['cn-tavern-diner-west'].receipts['china-toilet'],guestReceipt.number);record('scene pause, cross-country identity and completed reentry preserve needs and receipt identity');
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);report.status='PASS';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;console.log(JSON.stringify(report));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/daily-needs-main-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
