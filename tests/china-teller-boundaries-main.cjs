// Actual main short boundaries. Reuses earned/prepaid terminal evidence.
// Counter mode arranges only the player standing point, due needs and death;
// it does not seed wages or move the worker to certify any physical work.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function tellerReview(){return {player,copperLedger,chinaMoneyHouse,npcs,lot,navOptions,chinaTellerService,chinaTellerPersonal,tellerAccounts,tellerSlot,dailyNeeds,saved,chinaTavern,chinaDailyToilet};}
export function tellerStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export {save,blocked,startInteraction,cancelAction};
`;
const patch=String.raw`function tellerSource(file){let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){s+=${JSON.stringify(extras)};}return s;}`;
harness=harness.replace("function mod(file)",patch+"\nfunction mod(file)");
// Fixture has a const loader in some versions; install helper before VM context.
if(!harness.includes('function tellerSource'))harness=patch+'\n'+harness;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(tellerSource(file),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.TELLER_RESUME){const initial=JSON.parse(fs.readFileSync(process.env.TELLER_RESUME,'utf8'));if(process.env.TELLER_COUNTER_BOUNDARY){initial.dailyNeeds.registeredPeople=[...new Set([...(initial.dailyNeeds.registeredPeople||[]),'cn-money-house-teller'])];initial.dailyNeeds.people['cn-money-house-teller']={foodAge:25*60/.7,toiletAge:37*60/.7,receipts:{}};}storage['worlds-days-v1']=JSON.stringify(initial);}const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TELLER_RESUME?'lot':'globe');");
harness=harness.replace("let s=fs.readFileSync(file,'utf8');", "let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js'))s=s.replace('const enableTellerNeeds=false','const enableTellerNeeds=true');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const r=main.namespace.tellerReview(),id='cn-money-house-teller',n=r.npcs.find(n=>n.station.id===id),identities=r.npcs.map(n=>n.station.id),before=r.tellerAccounts.snapshot();assert(r.chinaTellerPersonal);
if(process.env.TELLER_COUNTER_BOUNDARY){
 assert.equal(r.tellerAccounts.account(id).bank,8);r.player.root.position.set(-21,.215,-26.35);assert(r.chinaTellerService.counterBinding().available);assert(r.chinaMoneyHouse.open(),'present actual living clerk admits normal original player banking');
 const stale=all.filter(e=>e.dataset.moneyAction==='open').at(-1);assert(stale);const playerBefore=r.copperLedger.state(),origin=n.root.position.toArray();
 for(let i=0;i<12;i++){now+=100;main.namespace.tellerStep(.1);assert.equal(r.chinaTellerPersonal.state(),null,'open player business prevents due personal departure');assert.equal(r.chinaTellerService.state().order,null);assert.deepEqual(n.root.position.toArray(),origin);}
 n.alive=false;stale.onclick();assert.equal(r.chinaMoneyHouse.isOpen(),false);assert.deepEqual(r.copperLedger.state(),playerBefore,'dead pre-update stale callback cannot open or mutate player account');
 for(let i=0;i<5;i++){now+=100;main.namespace.tellerStep(.1);}assert.deepEqual(n.root.position.toArray(),origin);assert.deepEqual(r.tellerAccounts.snapshot(),before);
 assert(r.tellerSlot.assign(null).ok);assert.equal(r.chinaMoneyHouse.state().actor,null);assert(!r.chinaMoneyHouse.open());assert.equal(r.tellerSlot.assign(id).ok,false,'dead original cannot be reassigned');assert.equal(r.tellerSlot.state().holderId,null);
 console.log('PASS actual main player bank admission holds due needs; pre-update dead callback fails; no dead movement, pay, vacancy fallback or dead reassignment');
}else{
 assert.equal(r.tellerAccounts.account(id).bank,2);assert.equal(before.receipts.length,1);assert.equal(before.mealTransfers.filter(x=>x.kind==='meal-payment').length,1);
 for(let i=0;i<12;i++){now+=100;main.namespace.tellerStep(.1);}
 assert.deepEqual(r.tellerAccounts.snapshot(),before);assert.equal(r.chinaTellerPersonal.state(),null);assert(r.chinaTellerService.counterBinding().available);assert(n.root.position.distanceTo(new three.namespace.Vector3(-21,.215,-28.25))<.04);
 const need=r.dailyNeeds.snapshot().people[id];assert.equal(need.receipts['china-tavern-meal'],3);assert.equal(need.receipts['china-public-toilet'],1);main.namespace.save();const next=JSON.parse(storage['worlds-days-v1']);assert.equal(next.chinaTellerInspection.order,null);assert.equal(next.chinaTellerPersonalNeeds.task,null);assert(!next.worldContinuity.regions.china.controllers.chinaTellerService);assert(!next.worldContinuity.regions.china.controllers.chinaTellerPersonal);
 fs.writeFileSync('/tmp/china-teller-final-restored.json',storage['worlds-days-v1']);console.log('PASS actual main terminal reload retains same 2, wage/payment/meal/toilet and physical counter availability, no authority duplicate');
}
assert.deepEqual(r.npcs.map(n=>n.station.id),identities);console.log('RSS MiB',process.resourceUsage().maxRSS/1024);
})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
