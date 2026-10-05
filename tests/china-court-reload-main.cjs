// A plausible old two-official save with an unfinished summons. No saved
// positions, relocated actors, forced court phase or pose overrides are used.
// Once natural gathering starts, reload its actual physical world checkpoint.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function reloadCourtReview(){return {player,npcs,chinaAudience,chinaPalace};}
export function reloadCourtStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export {save,enterRegion};
`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const fixture=`{
 const prior=JSON.parse(storage['worlds-days-v1']);
 const brain=mod(path.join(root,'game/npc-life-decisions.js'));await brain.link(linker);await brain.evaluate();
 const officials=brain.namespace.createLifeDecisions({worldSeed:42,actorIds:['cn-minister-works','cn-minister-granary']}).snapshot();
 const palace=brain.namespace.createLifeDecisions({worldSeed:42,actorIds:['cn-emperor','cn-consort']}).snapshot();
 prior.chinaAudience={version:1,day:4,calledDay:4,outcome:'called',lastCompletedDay:3,life:{version:1,decisions:officials}};
 prior.chinaPalaceLife=palace;
 // Omit simulationClock to exercise the real legacy migration from day four.
 storage['worlds-days-v1']=JSON.stringify(prior);
}const main=mod(path.join(root,'game/main.js'));`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",fixture);
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
const out=process.env.OUT_DIR||'qa/china-court-reload-main';fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',fixture:'Legacy day4 unfinished summon; two official decisions, old palace roster, no simulationClock or actor positions',checks:[],phases:[]};
const record=text=>{console.log(text);report.checks.push(text);fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();let r=main.namespace.reloadCourtReview();
let officials=r.npcs.filter(n=>n.station.courtRole),emperor=r.npcs.find(n=>n.station.id==='cn-emperor');
assert.equal(officials.length,6);assert.equal(state().simulationClock.day,4);assert.equal(state().simulationClock.hour,10);
assert(officials.every(n=>n.root.position.distanceTo(n.home)<.001));assert(emperor.root.position.distanceTo(emperor.home)<.001);
const before=JSON.parse(storage['worlds-days-v1']),oldPeople=before.chinaAudience.life.decisions.people;
assert.equal(Object.keys(oldPeople).length,6);assert.equal(before.chinaAudience.lastCompletedDay,3);
record('All six fixed official identities initialize from the two-person legacy save; emperor and officials start at their authored homes');
let phase='',frames=0,reportFrames=0,standingPair=false,reloaded=false;
for(;frames<4900;frames++){
 const positions=officials.map(n=>n.root.position.clone()),beforeCourt=r.chinaAudience.state();main.namespace.reloadCourtStep(1/30);
 const s=r.chinaAudience.state(),clock=state().simulationClock;
 for(const[i,n]of officials.entries()){
  const mounted=beforeCourt.life.actors[i].mounted||s.life.actors[i].mounted;
  if(!mounted)assert(Math.hypot(n.root.position.x-positions[i].x,n.root.position.z-positions[i].z)<.2,'official moved without continuous travel '+n.station.id);
 }
 const arrived=s.actors.filter(n=>n.stage==='enter-hall'&&n.arrived).length;
 if(arrived===2&&['assembling','holding'].includes(s.phase)&&clock.hour<11.5)standingPair=true;
 if(s.phase!==phase){phase=s.phase;report.phases.push({phase,clock,arrived});console.log('PHASE',phase,clock.hour.toFixed(4),arrived);}
 if(frames%300===0)fs.writeFileSync(out+'/live.json',JSON.stringify({clock,court:s,palace:r.chinaPalace.state()},null,2));
 if(s.schedule.outcome==='postponed')assert.fail('natural assembly postponed '+JSON.stringify({exception:s.exception,actors:s.actors,royal:r.chinaPalace.dutyState('china-morning-audience')}));
 if(s.phase==='report'){
  reportFrames++;assert(clock.hour>=11.5);assert.equal(arrived,6);
  assert(officials.every(n=>n.root.userData.courtPosture?.kneeling===1),'each real rig stays kneeling after the complete updateNPCs controller chain');
 }
 if(!reloaded&&s.phase==='assembling'&&clock.hour>10.55){
  main.namespace.save();const checkpoint=JSON.parse(storage['worlds-days-v1']).worldContinuity.regions.china;
  assert.equal(checkpoint.controllers.chinaAudience.schedule.outcome,'called');assert.equal(checkpoint.controllers.chinaAudience.runtime.phase,'assembling');
  main.namespace.enterRegion('china');r=main.namespace.reloadCourtReview();officials=r.npcs.filter(n=>n.station.courtRole);emperor=r.npcs.find(n=>n.station.id==='cn-emperor');
  for(const n of officials){assert.deepEqual(n.root.position.toArray(),checkpoint.actors[n.station.id].position,'real official position survives gathering reload');assert.equal(n.route.length,0,'restored controller discards old routes before replanning');assert(r.chinaAudience.socialStatus(n).busy,'gathering remains busy after reload');}
  assert.equal(state().simulationClock.seconds,clock.seconds,'reentry adds no offline or simulated time');assert.equal(r.chinaAudience.state().phase,'assembling');assert.equal(r.chinaAudience.state().schedule.courtStart,11.5);reloaded=true;
  record('Actual assembling checkpoint restores exact official positions, clears stale routes, keeps duty busy and retains the same fixed-start summons');
 }
 if(s.schedule.outcome==='completed')break;
}
assert(reloaded,'physical gathering save/reentry was exercised');assert(frames<4900,'fixed-start ceremony completes naturally');assert(reportFrames>20,'kneeling remains installed across frames');
const final=r.chinaAudience.state();assert.equal(final.schedule.completionId,'cn-morning-audience:4');assert.equal(final.schedule.lastCompletedDay,4);assert.equal(final.failures.length,0);
report.frames=frames;report.reportFrames=reportFrames;report.standingPairBeforeStart=standingPair;report.final={schedule:final.schedule,actors:final.actors,clock:state().simulationClock};
record('Interrupted legacy summons resumes real travel; all six officials assemble, kneel at fixed11:30, and complete the day4 ceremony without route failure or pose overwrite');
report.status='PASS';ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exit(1)});
`;
harness=harness.slice(0,begin)+body;
new vm.Script(harness,{filename:'tests/reload-court-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
