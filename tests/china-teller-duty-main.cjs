// Production main/Three/navigation tea integration probe.
// Normal existing guests choose their original unforced visits. No paid proof,
// actor coordinates, activity choice or earned money is seeded.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function tellerReview(){return {npcs,lot,navOptions,chinaTellerService,chinaTellerPersonal,tellerAccounts,tellerSlot,dailyNeeds,saved,chinaTavern,chinaDailyToilet,chinaMoneyHouse,copperLedger,simulationClock};}
export function tellerStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export {save,blocked,startInteraction,cancelAction};
`;
const patch=String.raw`function tellerSource(file){let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){s+=${JSON.stringify(extras)};}return s;}`;
harness=harness.replace("function mod(file)",patch+"\nfunction mod(file)");
// Fixture has a const loader in some versions; install helper before VM context.
if(!harness.includes('function tellerSource'))harness=patch+'\n'+harness;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(tellerSource(file),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.TELLER_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.TELLER_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TELLER_RESUME?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
if(!process.env.TELLER_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.tellerReview(),n=r.npcs.find(n=>n.station.id==='cn-money-house-teller'),identities=r.npcs.map(n=>n.station.id);let last='',done=false,frames=0;
assert(r.lot.tellerTools);assert.equal(r.lot.tellerTools.root.children.filter(n=>n.name==='cn-teller-original-ledger').length,1);
if(!r.tellerAccounts.hasIncome('cn-money-house-teller'))assert(!r.dailyNeeds.has('cn-money-house-teller'));
for(;frames<Number(process.env.TELLER_STEPS||2000);frames++){
const before=n.root.position.clone();now+=100;main.namespace.tellerStep(.1);const service=r.chinaTellerService.state(),key=(service.order?.stage||'-')+':'+(service.order?.index||0)+':'+(service.order?.calculationIndex||0);
assert(before.distanceTo(n.root.position)<.3,'continuous original Lan movement');
if(frames%20===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'original full-body table clearance '+n.root.position.toArray());
if(key!==last||frames%250===0){last=key;main.namespace.save();fs.writeFileSync('/tmp/china-teller-progress-checkpoint.json',storage['worlds-days-v1']);console.log(JSON.stringify({frame:frames,person:n.root.position.toArray(),stage:service.order?.stage,index:service.order?.index,calculationIndex:service.order?.calculationIndex,seconds:service.order?.seconds,account:r.tellerAccounts.account('cn-money-house-teller'),slot:r.tellerSlot.resolve().status,tool:r.lot.tellerTools.state()}));}
if(!r.tellerAccounts.hasIncome('cn-money-house-teller'))assert(!r.dailyNeeds.has('cn-money-house-teller'));
if(r.tellerAccounts.hasIncome('cn-money-house-teller')&&r.chinaTellerService.handoffBoundary().ok){done=true;break;}
}
main.namespace.save();fs.writeFileSync(process.env.TELLER_CHECKPOINT||'/tmp/china-teller-duty-checkpoint.json',storage['worlds-days-v1']);assert(done,'original bank ledger actually audited and returned');assert.equal(r.tellerAccounts.account('cn-money-house-teller').bank,8);assert.equal(r.tellerAccounts.snapshot().receipts.length,1);assert(r.chinaTellerService.counterBinding().available);assert.equal(r.chinaTellerPersonal,null);assert.deepEqual(r.npcs.map(n=>n.station.id),identities);console.log('PASS actual main teller original ledger work and safe return; needs still gated',{frames,maxRSSMiB:process.resourceUsage().maxRSS/1024});
})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
