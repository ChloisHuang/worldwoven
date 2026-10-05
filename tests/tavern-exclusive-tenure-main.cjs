// Short production-main integration: a restored formal hire is exclusive even
// before duty begins, and the displaced resident keeps walking with a new label.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
function replaceOnce(before,after){
 if(!harness.includes(before)||harness.indexOf(before)!==harness.lastIndexOf(before))throw Error('Fixture seam changed: '+before);
 harness=harness.replace(before,after);
}
const extras=`
export function exclusiveTenureReview(){return {npcs,lot,player,chinaTavern,chinaService,formalCareers};}
export function exclusiveTenureStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updateNPCs(dt,elapsed);}
export {blocked};
`;
replaceOnce("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
replaceOnce('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
replaceOnce('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
replaceOnce('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed=String.raw`
const prior=JSON.parse(storage['worlds-days-v1']),core=mod(path.join(root,'game/formal-careers.js')),fixtureSeconds=1440/.7;
prior.appearance.seed=26;prior.simulationClock={version:1,seconds:fixtureSeconds};
await core.link(linker);await core.evaluate();let learned;
const careers=core.namespace.createFormalCareers({worldSeed:26,getClock:()=>({day:1,hour:10,seconds:fixtureSeconds}),saveState:s=>{learned=s;}});
for(let i=0;i<2;i++){const ticket=careers.learningTicket('cn-rest','ritual-intro');assert(ticket.ok);assert(careers.completeLearning(ticket.ticket,{seconds:8}).ok);}
assert(careers.apply('cn-tavern-steward',{ageYears:24}).ok);assert.equal(careers.state().lastDuty,null);
prior.formalCareers=learned;storage['worlds-days-v1']=JSON.stringify(prior);
`;
replaceOnce("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
if(begin<0||end<begin)throw Error('Fixture scenario boundary changed');
const body=String.raw`
const started=Date.now();all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.exclusiveTenureReview(),assistant=r.npcs.find(n=>n.station.id==='cn-tavern-assistant'),scene=r.chinaTavern.staffScene;
assert(assistant);const identity=assistant,home=assistant.root.position.clone(),label=assistant.label.querySelector('small');let walked=0,maxDistance=0;
assert.equal(r.formalCareers.slotHolder('cn-tavern-steward'),'player');
assert.equal(r.formalCareers.state().lastDuty,null);assert.equal(r.chinaService.state().job,null);
for(let i=0;i<180;i++){
 const before=assistant.root.position.clone(),mounted=assistant.serviceMount;
 now+=100;main.namespace.exclusiveTenureStep(.1);
 assert.strictEqual(r.npcs.find(n=>n.station.id==='cn-tavern-assistant'),identity);
 const distance=before.distanceTo(assistant.root.position);if(distance>.01)walked++;
 maxDistance=Math.max(maxDistance,home.distanceTo(assistant.root.position));
 if(!mounted&&!assistant.serviceMount)assert(distance<.4,'continuous resident movement');
 assert.equal(scene.state().staffOwnership.assistant.holderId,'player');
 assert.equal(r.chinaService.state().job,null);assert.equal(r.formalCareers.state().lastDuty,null);
 assert(!scene.state().orders.some(o=>o.holder==='assistant'),'off-duty incumbent does not claim customer work');
}
const world=scene.state(),evidence={walked,maxDistance,label:label.textContent,actors:world.actors,life:world.staffLife.actors,events:world.staffLife.events,failures:world.failures};
assert(walked>5&&maxDistance>.3,'same resident follows a real reachable life destination '+JSON.stringify(evidence));
assert(!label.textContent.includes('服务助理'),'visible NPC subtitle no longer duplicates the player role');
assert(label.textContent.startsWith('已卸任 · '),'visible subtitle identifies the former incumbent');
const currentLife=world.staffLife.actors.find(a=>a.id===assistant.station.id);
if(currentLife.choice){assert(label.textContent.includes(currentLife.label),'subtitle describes the current real activity');assert.equal(label.textContent.includes('前往'),currentLife.phase==='approaching','subtitle distinguishes travel from the activity itself');}
assert.equal(assistant.station.npcName,'陆青');
assert.equal(scene.state().failures.length,0,'real navigation reaches the selected life destination without route failures');
assert(scene.state().staffLife.events.some(e=>e.actorId===assistant.station.id&&e.event.startsWith('arrived:')),'resident actually reaches a life destination '+JSON.stringify(evidence));
assert(['west','east'].every(side=>r.npcs.find(n=>n.station.id==='cn-tavern-diner-'+side).serviceMount?.id.startsWith('china-tavern-dining-')),'both real arrivals reach their dining chairs through production navigation '+JSON.stringify(evidence));
assert.equal(state().pathLength,0,'restored hiring never starts player movement');
console.log(JSON.stringify({status:'PASS',scope:'Short actual-main restored hire, dynamic NPC label and real navigation; simulated DOM/renderer',label:label.textContent,walkedSteps:walked,position:assistant.root.position.toArray(),seconds:(Date.now()-started)/1000}));
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/tavern-exclusive-tenure-main-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname,__filename});
