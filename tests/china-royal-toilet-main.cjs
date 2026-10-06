// One bounded original emperor's third-floor home -> private second-floor toilet
// chain. Simulated DOM/renderer plus production Three/navigation, not phone QA.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function needsReview(){return {player,npcs,lot,furniture,navOptions,chinaDailyToilet,chinaAudience,chinaPalace,dailyNeeds,simulationClock,saved};} export function needsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=String.raw`
const initial=JSON.parse(storage['worlds-days-v1']);initial.simulationClock={version:1,seconds:300};initial.chinaAudience={day:0,calledDay:0,outcome:'completed'};const brainModule=mod(path.join(root,'game/npc-life-decisions.js'));if(brainModule.status==='unlinked')await brainModule.link((s,f)=>mod(path.resolve(path.dirname(f.identifier),s)));if(brainModule.status!=='evaluated')await brainModule.evaluate();initial.chinaPalaceLife=brainModule.namespace.createLifeDecisions({worldSeed:42,actorIds:['cn-emperor','cn-consort-yue','cn-consort-heng','cn-consort-ling','cn-tea']}).snapshot();for(const[id,p]of Object.entries(initial.chinaPalaceLife.people))p.current={id:'read',duration:id==='cn-emperor'?.4:1000,startedAt:0};initial.dailyNeeds={version:2,people:{'cn-emperor':{foodAge:0,toiletAge:25*60/.7,receipts:{}}}};
storage['worlds-days-v1']=JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const id='cn-emperor',r=main.namespace.needsReview(),actor=r.npcs.find(n=>n.station.id===id),originalIds=r.npcs.map(n=>n.station.id),service=r.chinaDailyToilet,publicState=()=>service.state().facilities.palace;
assert.equal(r.npcs.length,31);assert(r.dailyNeeds.status(id).seekToilet);
let frames=0,minY=actor.root.position.y,maxY=minY,stairFrames=0,using=0,snapshotSaved=false;
function step(){const before=actor.root.position.clone(),wasMounted=!!service.actorPose(actor)||!!service.restorePosition(id,before.toArray());now+=100;main.namespace.needsStep(.1);frames++;const mounted=!!service.actorPose(actor);if(!wasMounted&&!mounted)assert(before.distanceTo(actor.root.position)<.4,'continuous shared body movement');minY=Math.min(minY,actor.root.position.y);maxY=Math.max(maxY,actor.root.position.y);if(actor.walking&&actor.root.position.y>4.3&&actor.root.position.y<7.5)stairFrames++;
 if(!mounted&&frames%20===0)assert(!main.namespace.blocked(actor.root.position.x,actor.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:actor.root.position.y}),'emperor stays outside static geometry');
 if(publicState().activity?.actorId===id&&publicState().activity?.stage==='using'){using++;if(!snapshotSaved&&using>=15){events.pagehide();fs.writeFileSync('qa/china-royal-toilet-mounted.json',storage['worlds-days-v1']);snapshotSaved=true;}}
 if(frames%300===0)console.log('PROGRESS',JSON.stringify({frames,actor:r.chinaPalace.state().actors.find(a=>a.id===id),facility:publicState().activity}));
}
for(;frames<1200&&!publicState().receipts.some(v=>v.actorId===id);)step();
assert(publicState().receipts.some(v=>v.actorId===id),'original emperor completes real palace facility '+JSON.stringify(r.chinaPalace.state().actors));assert(!r.dailyNeeds.status(id).seekToilet);assert(!service.ownsActor(actor));assert.equal(publicState().receipts.filter(v=>v.actorId===id).length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(r.npcs.find(n=>n.station.id===id),actor);
{assert(stairFrames>20&&minY>=4&&minY<4.3&&maxY>=7.8,'actual descent from original imperial third-floor home to the existing second-floor fixture');assert(snapshotSaved);}
const serial=publicState().serial;for(let i=0;i<30;i++)step();assert.equal(publicState().serial,serial);assert(!r.chinaPalace.state().actors.find(a=>a.id===id).borrowed);assert.equal(r.chinaPalace.state().failures.length,0);
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log(JSON.stringify({status:'PASS',mode:'emperor-third-floor-to-palace-toilet',frames,minY,maxY,stairFrames,using,npcs:31,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-royal-toilet-main-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
