// Focused CN04 regression for off-site patrol, safe conversation and physical
// relief. Reuses the existing production-main input harness, without WebGL.
// Run: node --experimental-vm-modules tests/china-palace-patrol.cjs
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function courtReview(){return {player,lot,camera,scene,sun,lighting,npcs,chinaArchery,npcSocial,navOptions};} export function courtView(a){yaw=a;pitch=.16;distance=4.6;updateCamera(1,true);} export {navigateTo,configureStableShadows,blocked};`:''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report={status:'RUNNING',scope:'One China patrol and input check; real main in simulated DOM with renderer stub, not browser/device QA',checks:[]};
const record=label=>{report.checks.push(label);console.log(label);};let review,minGuardGap=Infinity,closest=null;
const frame=()=>{now+=33.333;raf();if(review){const s=state().chinaArchery,a=s.guards[0].position,b=s.guards[1].position,d=Math.hypot(a[0]-b[0],a[2]-b[2]);if(d<minGuardGap){minGuardGap=d;closest={phase:s.phase,positions:[a,b]};}}};
const wait=(predicate,label,max=8000)=>{let i=0;for(;i<max&&!predicate();i++)frame();assert(predicate(),label+' '+JSON.stringify(state().chinaArchery));record(label);};
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();tick(3);review=main.namespace.courtReview();assert.equal(state().npcCount,7);const T=three.namespace,pressE=()=>events.keydown({code:'KeyE',repeat:false,preventDefault(){}});
wait(()=>state().chinaArchery.guards[1].patrol.checkpoint==='gate'&&state().chinaArchery.guards[1].patrol.stage==='observe','guard reaches the gate');
const guard=review.npcs.find(n=>n.station.id==='cn-range-warden');review.player.root.position.copy(guard.root.position).add(new T.Vector3(1.2,0,.6));frame();pressE();frame();assert.equal(state().npcConversation.paused,true);const p=guard.root.position.clone(),time=state().chinaArchery.guards[1].patrol.time;for(let i=0;i<30;i++)frame();assert(guard.root.position.distanceTo(p)<.0001);assert.equal(state().chinaArchery.guards[1].patrol.time,time);assert(review.npcSocial.look(guard));pressE();frame();review.player.root.position.set(0,.13,23);record('safe greeting pauses and resumes the same observation');
wait(()=>state().chinaArchery.guards[1].patrol.checkpoint==='hall'&&state().chinaArchery.guards[1].patrol.stage==='observe','guard reaches the upper hall checkpoint');assert(Math.abs(guard.root.position.y-1.415)<.04);
review.player.root.position.set(-19.5,.13,17.2);wait(()=>state().chinaArchery.phase==='handover'&&state().chinaArchery.phaseTime>.7,'both guards physically return for relief');assert.equal(state().chinaArchery.handoffs,0);assert(state().chinaArchery.guards.every(g=>g.patrol.stage==='ready'));
wait(()=>state().chinaArchery.handoffs===1&&state().chinaArchery.phase==='aim','relieved guard begins training');assert(minGuardGap>.5,'guards need body clearance '+JSON.stringify({minGuardGap,closest}));
pressE();wait(()=>state().chinaArchery.phase==='player-aim','E joins after safe retrieval');pressE();frame();assert.equal(state().performing,null);assert.equal(state().chinaArchery.playerRequested,false);assert.equal(review.player.poseContext.archery,null);ids['touch-action'].onclick();wait(()=>state().chinaArchery.phase==='player-aim','touch joins practice');ids['touch-action'].onclick();frame();assert.equal(state().performing,null);
assert.equal(state().chinaArchery.failures.length,0);assert(state().chinaArchery.shots.every(s=>s.to[0]<s.from[0]&&s.to[0]>-25.2));ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);record('E/touch cancel, inward arrows and cleanup pass');report.status='PASS';report.minGuardGap=minGuardGap;

`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,"console.log(JSON.stringify(report,null,2));");
new vm.Script(harness,{filename:'tests/china-palace-patrol-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
