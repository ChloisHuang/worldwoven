// Production main/Three/navigation tea integration probe.
// Normal existing guests choose their original unforced visits. No paid proof,
// actor coordinates, activity choice or earned money is seeded.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function teaInit(){}
export function teaReview(){return {npcs,lot,scene,camera,sun,lighting,chinaPalace,testTea:chinaTeaService,testTeaAccount:teaAccounts,testTeaSlot:teaSlot,dailyNeeds,saved};}
export function teaStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export {save};
`;
const patch=String.raw`function teaSource(file){let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){s+=${JSON.stringify(extras)};}return s;}`;
harness=harness.replace("function mod(file)",patch+"\nfunction mod(file)");
// Fixture has a const loader in some versions; install helper before VM context.
if(!harness.includes('function teaSource'))harness=patch+'\n'+harness;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(teaSource(file),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.TEA_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.TEA_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TEA_RESUME?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
if(!process.env.TEA_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
main.namespace.teaInit();const r=main.namespace.teaReview(),identities=r.npcs.map(n=>n.station.id),host=r.npcs.find(n=>n.station.id==='cn-tea');let last='',done=false,frames=0;
if(!r.testTeaAccount.hasIncome('cn-tea'))assert(!r.dailyNeeds.has('cn-tea'));
for(;frames<Number(process.env.TEA_STEPS||5000);frames++){
 now+=250;main.namespace.teaStep(.25);const service=r.testTea.state(),key=(service.runtime?.phase||'-')+':'+service.orders.orders.length;
 if(key!==last||frames%500===0){last=key;console.log(JSON.stringify({frame:frames,clock:r.saved.simulationClock,host:host.root.position.toArray(),service,visitors:r.chinaPalace.state().actors.filter(n=>n.activity==='visit')}));}
 if(!r.testTeaAccount.hasIncome('cn-tea'))assert(!r.dailyNeeds.has('cn-tea'));
 if(r.testTeaAccount.hasIncome('cn-tea')&&r.testTea.handoffBoundary().ok&&(process.env.TEA_EXPECT_NEEDS==='0'||r.dailyNeeds.has('cn-tea'))){done=true;break;}
}
main.namespace.save();fs.writeFileSync(process.env.TEA_CHECKPOINT||'/tmp/china-tea-duty-checkpoint.json',storage['worlds-days-v1']);
console.log('TEA RESULT',JSON.stringify({done,frames,clock:r.saved.simulationClock,account:r.testTeaAccount.snapshot(),service:r.testTea.state(),failures:r.chinaPalace.state().failures}));
assert.deepEqual(r.npcs.map(n=>n.station.id),identities);if(process.env.TEA_OBSERVE!=='1'){assert(done,'normal optional visitor to physical completed original tea service');assert.equal(r.testTeaAccount.account('cn-tea').bank,8);if(process.env.TEA_EXPECT_NEEDS!=='0'){assert(r.dailyNeeds.has('cn-tea'));assert.equal(r.dailyNeeds.read('cn-tea').foodStrain,0);assert.equal(r.dailyNeeds.status('cn-tea').seekMeal,false);}}
console.log('PASS bounded actual main tea observation and gated earned-person enrollment; no browser claim');
})().catch(e=>{console.error(e);process.exit(1)});
`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
