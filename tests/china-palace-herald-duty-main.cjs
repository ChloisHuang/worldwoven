// Fresh zero-fund actual main: autonomous court and the existing original
// edict must produce real work before any bank income. No seeded receipt or
// clock jump. Simulated DOM/renderer.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function heraldDutyReview(){return {player,npcs,chinaEdict,chinaAudience,chinaPalace,gardenSlot,gardenAccounts,heraldSlot,heraldAccounts,dailyNeeds,saved};} export function heraldDutyStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((file.endsWith('/game/main.js')?fs.readFileSync(file,'utf8').replace('enableHeraldNeeds:false','enableHeraldNeeds:true'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');

harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.HERALD_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.HERALD_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.HERALD_RESUME?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
if(!process.env.HERALD_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.heraldDutyReview(),n=r.npcs.find(n=>n.station.id==='cn-palace-herald'),originalIds=r.npcs.map(n=>n.station.id);let last='',frames=0,done=false;const trace=[];let previousStages='';
if(!process.env.HERALD_RESUME){assert.equal(r.heraldAccounts.account('cn-palace-herald').bank,0);assert(!r.heraldAccounts.hasIncome('cn-palace-herald'));assert(!r.dailyNeeds.has('cn-palace-herald'));}
const checkpoint=()=>{events.pagehide();fs.writeFileSync(process.env.HERALD_CHECKPOINT||'/tmp/china-herald-duty-checkpoint.json',storage['worlds-days-v1']);};checkpoint();
for(;frames<Number(process.env.HERALD_STEPS||4000);frames++){
 const before=n.root.position.clone();now+=250;main.namespace.heraldDutyStep(.25);assert(before.distanceTo(n.root.position)<.65,'continuous original herald');
 if(!r.heraldAccounts.hasIncome('cn-palace-herald'))assert(!r.dailyNeeds.has('cn-palace-herald'),'no needs before income');
 if(process.env.HERALD_DIAG){const c=r.chinaAudience.state(),key=c.actors.map(a=>a.stage+':'+a.arrived).join('|');if(key!==previousStages){previousStages=key;trace.push({frame:frames,time:c.time,budget:c.budget,actors:c.actors,history:c.history});}}
 const key=r.chinaAudience.courtStatus().phase+':'+(r.chinaEdict.state().order?.stage||'-');if(key!==last||frames%400===0){last=key;checkpoint();console.log(JSON.stringify({frame:frames,clock:r.saved.simulationClock,court:r.chinaAudience.courtStatus(),stage:r.chinaEdict.state().order?.stage,bank:r.heraldAccounts.account('cn-palace-herald'),p:n.root.position.toArray()}));}
 if(process.env.HERALD_DIAG&&r.chinaAudience.courtStatus().schedule.outcome==='postponed')break;
 if(r.heraldAccounts.hasIncome('cn-palace-herald')&&!r.chinaEdict.state().order&&(process.env.HERALD_EXPECT_ENROLLED==='0'||r.dailyNeeds.has('cn-palace-herald'))){done=true;break;}
}
checkpoint();if(process.env.HERALD_DIAG){fs.writeFileSync('/tmp/china-garden-court-trace.json',JSON.stringify(trace));console.log('DIAGNOSTIC ONLY',frames);return;}console.log('HERALD FINAL',JSON.stringify({done,frames,clock:r.saved.simulationClock,edict:r.chinaEdict.state(),account:r.heraldAccounts.snapshot()}));assert(done,'autonomous court, original draft/handoff, original sweep and full return');assert.equal(r.heraldAccounts.account('cn-palace-herald').bank,12);assert.equal(r.gardenAccounts.account('cn-garden').bank,8,'old Bo income preserved');assert.equal(r.heraldAccounts.account('cn-palace-herald').cash,0);assert.equal(r.heraldAccounts.snapshot().receipts.length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(r.dailyNeeds.has('cn-palace-herald'),process.env.HERALD_EXPECT_ENROLLED!=='0');if(process.env.HERALD_EXPECT_ENROLLED!=='0'){assert.equal(r.dailyNeeds.read('cn-palace-herald').foodStrain,0);assert.equal(r.dailyNeeds.status('cn-palace-herald').seekMeal,false);}console.log(JSON.stringify({status:'PASS',frames,scope:process.env.HERALD_RESUME?'Continuation of original earned world and physical return; simulated DOM/renderer':'Normal fresh main autonomous court to original written/handoff decree, Herald 12 and Bo 8, both bodies returned; simulated DOM/renderer, real Three/navigation, not browser'}));

`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.slice(0,harness.indexOf('\nconsole.log(JSON.stringify('))+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
