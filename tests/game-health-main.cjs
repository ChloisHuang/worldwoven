// One changed-path acceptance: production main saves/reentry, visible symptoms,
// rest, cancellation, and the real clinic's numbered counter handoff. Existing
// clinic geometry/guard tests own route coverage; this is not a country matrix.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const additions="\nexport function healthReview(){return {player,npcs,chinaClinic,furniture,gameHealth,saved};} export {requestFurniture,goToStation};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
const seed={version:1,health:{version:1,time:0,people:{player:{conditions:{mistbell:{stage:'ill',remaining:240}}},'cn-clinic-physician':{conditions:{'ember-weariness':{stage:'ill',remaining:150}}}}}};
harness=harness.replace('let context=vm.createContext(',"const healthSeed=JSON.parse(storage['worlds-days-v1']);healthSeed.gameHealth="+JSON.stringify(seed)+";storage['worlds-days-v1']=JSON.stringify(healthSeed);let context=vm.createContext(");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report={status:'RUNNING',scope:'One China production main lifecycle and clinic care handoff, simulated DOM/renderer',checks:[]};
const record=label=>{report.checks.push(label);console.log(label);};
const key=code=>events.keydown({code,repeat:false,preventDefault(){}});
const frame=()=>{now+=33.333;raf();};
const until=(pred,label,max=2200)=>{let n=0;for(;n<max&&!pred();n++)frame();assert(pred(),label+' '+JSON.stringify({player:state().player,clinic:state().chinaClinic?.order}));record(label);};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();frame();
let review=main.namespace.healthReview(),clinic=review.chinaClinic;
assert.equal(state().gameHealth.sceneId,'china');assert.equal(ids['player-health'].hidden,false);assert(ids['player-health'].textContent.includes('声音发闷'));
assert(review.npcs.find(n=>n.station.id==='cn-clinic-physician').healthLabel.textContent.includes('脚步发沉'));record('player and actual NPC show readable symptoms');
const look=JSON.stringify(state().playerLook),walkSpeed=review.player.locomotion.walkSpeed;
const chair=review.furniture.items.find(i=>i.id==='china-clinic-consult-seat');review.player.root.position.fromArray(chair.position);main.namespace.requestFurniture(chair);
until(()=>state().seated===chair.id,'real rest seat mounts');
const beforeRest=review.gameHealth.snapshot().health.people.player.conditions.mistbell.remaining;for(let i=0;i<45;i++)frame();const afterRest=review.gameHealth.snapshot().health.people.player.conditions.mistbell.remaining;
assert(beforeRest-afterRest>2,'sitting gives actual rest recovery');key('KeyE');frame();assert(!clinic.state().order,'early standing cancels');assert.equal(state().gameHealth.player.careStatus,'care-advised');record('rest progresses recovery and cancelled consultation gives no care');
main.namespace.requestFurniture(chair);until(()=>clinic.state().order?.stage==='handoff','new consultation produces numbered original card');const order=clinic.state().order;key('KeyE');frame();
const counter=review.npcs.find(n=>n.station.id==='cn-pharmacy-assistant').station;main.namespace.goToStation(counter);until(()=>state().pathLength===0,'player reaches actual pharmacy counter');until(()=>clinic.state().order?.stage==='ready','same card is prepared as same-number parcel');
assert.equal(state().gameHealth.player.careStatus,'care-advised','ready is not delivered');key('KeyE');until(()=>clinic.state().order?.stage==='complete','physical E handoff completes');
const afterCare=review.gameHealth.snapshot().health.people.player;assert.equal(afterCare.careReceipts['china-clinic'],order.number);assert.equal(state().gameHealth.player.careStatus,'support-active');assert.notEqual(afterCare.conditions.mistbell.stage,'well','support does not instantly cure');assert(ids['player-health'].textContent.includes('已有照护'));assert.equal(review.player.locomotion.walkSpeed,walkSpeed);assert.equal(JSON.stringify(state().playerLook),look);record('actual delivered receipt applies supportive care without cure or movement/look changes');
const remaining=afterCare.supportRemaining;assert.equal(review.gameHealth.clinicReceipts(clinic.state()),false);assert.equal(review.gameHealth.snapshot().health.people.player.supportRemaining,remaining);record('same receipt cannot be applied twice');
const beforeLeave=review.gameHealth.snapshot();ids['return-world'].onclick();assert.equal(state().gameHealth.sceneId,null);for(let i=0;i<30;i++)frame();assert.equal(review.gameHealth.snapshot().health.time,beforeLeave.health.time);assert.equal(state().characterResources.activeReferences,0);
ids.travel.onclick();frame();review=main.namespace.healthReview();assert.equal(state().gameHealth.sceneId,'china');assert.equal(review.gameHealth.snapshot().health.people.player.careReceipts['china-clinic'],order.number);assert(review.gameHealth.snapshot().health.people['cn-clinic-physician']);assert.equal(state().gameHealth.actorCount,beforeLeave.health.people?Object.keys(beforeLeave.health.people).length:0);assert.equal(review.gameHealth.clinicReceipts(review.saved.chinaClinic),false);record('scene dispose/reentry preserves identities, health and care dedupe');
events.pagehide();const durable=JSON.parse(storage['worlds-days-v1']);assert.equal(durable.gameHealth.health.people.player.careReceipts['china-clinic'],order.number);assert(durable.gameHealth.health.people.player.supportRemaining<remaining);ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);report.status='PASS';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;console.log(JSON.stringify(report));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/game-health-main-inherited.cjs'}).runInNewContext({require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
