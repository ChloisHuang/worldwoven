// Fresh zero-fund actual main: autonomous court and the existing original
// edict must produce real work before any bank income. No seeded receipt or
// clock jump. Simulated DOM/renderer.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function gardenDutyReview(){return {player,npcs,chinaEdict,chinaAudience,chinaPalace,gardenSlot,gardenAccounts,dailyNeeds,saved};} export function gardenDutyStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');

harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.GARDEN_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.GARDEN_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.GARDEN_RESUME?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
if(!process.env.GARDEN_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.gardenDutyReview(),n=r.npcs.find(n=>n.station.id==='cn-garden'),originalIds=r.npcs.map(n=>n.station.id);let last='',frames=0,done=false;const trace=[];let previousStages='';
if(!process.env.GARDEN_RESUME){assert.equal(r.gardenAccounts.account('cn-garden').bank,0);assert(!r.gardenAccounts.hasIncome('cn-garden'));assert(!r.dailyNeeds.has('cn-garden'));}
const checkpoint=()=>{events.pagehide();fs.writeFileSync(process.env.GARDEN_CHECKPOINT||'/tmp/china-garden-duty-checkpoint.json',storage['worlds-days-v1']);};checkpoint();
for(;frames<Number(process.env.GARDEN_STEPS||3000);frames++){
 const before=n.root.position.clone();now+=250;main.namespace.gardenDutyStep(.25);assert(before.distanceTo(n.root.position)<.65,'continuous original Bo');
 if(!r.gardenAccounts.hasIncome('cn-garden'))assert(!r.dailyNeeds.has('cn-garden'),'no needs before income');
 if(process.env.GARDEN_DIAG){const c=r.chinaAudience.state(),key=c.actors.map(a=>a.stage+':'+a.arrived).join('|');if(key!==previousStages){previousStages=key;trace.push({frame:frames,time:c.time,budget:c.budget,actors:c.actors,history:c.history});}}
 const key=r.chinaAudience.courtStatus().phase+':'+(r.chinaEdict.state().order?.stage||'-');if(key!==last||frames%400===0){last=key;checkpoint();console.log(JSON.stringify({frame:frames,clock:r.saved.simulationClock,court:r.chinaAudience.courtStatus(),stage:r.chinaEdict.state().order?.stage,bank:r.gardenAccounts.account('cn-garden'),p:n.root.position.toArray()}));}
 if(process.env.GARDEN_DIAG&&r.chinaAudience.courtStatus().schedule.outcome==='postponed')break;
 if(r.gardenAccounts.hasIncome('cn-garden')&&!r.chinaEdict.state().order){done=true;break;}
}
checkpoint();if(process.env.GARDEN_DIAG){fs.writeFileSync('/tmp/china-garden-court-trace.json',JSON.stringify(trace));console.log('DIAGNOSTIC ONLY',frames);return;}console.log('GARDEN FINAL',JSON.stringify({done,frames,clock:r.saved.simulationClock,edict:r.chinaEdict.state(),account:r.gardenAccounts.snapshot()}));assert(done,'autonomous court, original edict, physical sweep and full return');assert.equal(r.gardenAccounts.account('cn-garden').bank,8);assert.equal(r.gardenAccounts.account('cn-garden').cash,0);assert.equal(r.gardenAccounts.snapshot().receipts.length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(r.dailyNeeds.has('cn-garden'),process.env.GARDEN_EXPECT_ENROLLED==='1');console.log(JSON.stringify({status:'PASS',frames,scope:'Normal fresh main autonomous court to original edict and 8-copper physical work; simulated DOM/renderer, real Three/navigation, not browser'}));

`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.slice(0,harness.indexOf('\nconsole.log(JSON.stringify('))+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
