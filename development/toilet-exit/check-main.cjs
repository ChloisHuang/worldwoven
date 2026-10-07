// One bounded original official's upper-office -> public stair -> real toilet
// chain. Simulated DOM/renderer plus production Three/navigation, not phone QA.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function needsReview(){return {player,npcs,lot,furniture,navOptions,chinaDailyToilet,chinaAudience,dailyNeeds,simulationClock,saved,automaticDoors};} export function needsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export function leaveToiletPlayer(){path=planPath(player.root.position,new THREE.Vector3(22.45,4.015,9),.34);targetStation=null;} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((process.env.TOILET_BASELINE_SOURCE&&['daily-toilet.js','china-daily-toilets.js','china-official-life.js'].some(name=>file.endsWith('/game/'+name))?fs.readFileSync(process.env.TOILET_BASELINE_SOURCE.replace('baseline-daily-toilet.js','baseline-'+file.split('/').at(-1)),'utf8'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.OFFICIAL_TOILET_LOAD?'lot':'globe');");
const seed=String.raw`
assert(process.env.OFFICIAL_TOILET_LOAD,'Use the mounted checkpoint produced by china-official-toilet-main.cjs');
const initial=JSON.parse(fs.readFileSync(process.env.OFFICIAL_TOILET_LOAD,'utf8'));
if(!process.env.TOILET_CONTINUE){initial.worldContinuity.regions.china.player.position=[23.8,4.015,5.5];
initial.dailyNeeds.people['cn-official-records']={foodAge:0,toiletAge:25*60/.7,receipts:{}};
initial.simulationClock={version:1,seconds:1440/.7};}
storage['worlds-days-v1']=JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const r=main.namespace.needsReview(),id='cn-official-rites',actor=r.npcs.find(n=>n.station.id===id),service=r.chinaDailyToilet,publicState=()=>service.state().facilities.publicWashroom,originalIds=r.npcs.map(n=>n.station.id);
let frames=0,stairs=0,doorCrossings=0,lastZ=actor.root.position.z;
function step(){now+=100;main.namespace.needsStep(.1);frames++;if(actor.walking&&actor.root.position.y>.3&&actor.root.position.y<3.8)stairs++;if(lastZ<6.65&&actor.root.position.z>=6.65&&actor.root.position.y>4&&actor.root.position.y<4.1)doorCrossings++;lastZ=actor.root.position.z;if(frames%300===0)console.log('PROGRESS',JSON.stringify({frames,position:actor.root.position.toArray(),facility:publicState().activity,court:r.chinaAudience.state().phase,schedule:r.chinaAudience.state().schedule}));}
if(!process.env.TOILET_CONTINUE)assert.deepEqual(actor.root.position.toArray(),[24.9,4.265,5.57]);
if(process.env.TOILET_BASELINE_SOURCE){for(let i=0;i<250;i++)step();assert.equal(publicState().activity.stage,'leaving');assert(service.ownsActor(actor));assert(!service.requestPublicActor(r.npcs.find(n=>n.station.id==='cn-official-records')));assert.deepEqual(actor.root.position.toArray(),[24.9,4.265,5.57]);events.pagehide();fs.writeFileSync('qa/china-toilet-real-blocked.json',storage['worlds-days-v1']);console.log('PASS baseline reproduced persistent real main blocked seat after 25 seconds; saved old blocked checkpoint');}
else{
 if(!process.env.TOILET_CONTINUE){step();assert(!service.ownsActor(actor),'loaded original occupant safely dismounts despite occupied default landing');assert.equal(publicState().receipts.length,0,'old interrupted use never grants relief');assert(actor.root.position.distanceTo(r.player.root.position)>.65,'no overlapping people');assert(!main.namespace.blocked(actor.root.position.x,actor.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:actor.root.position.y}),'safe room landing');}
 main.namespace.leaveToiletPlayer();
 for(;frames<4200&&!publicState().receipts.some(v=>v.actorId!==id);)step();
 events.pagehide();fs.writeFileSync('qa/china-toilet-recovered-progress.json',storage['worlds-days-v1']);assert(publicState().receipts.some(v=>v.actorId!==id),'a different original person really uses the fixture');
 for(;frames<4600&&r.chinaAudience.state().schedule?.outcome!=='completed';)step();
 assert.equal(r.chinaAudience.state().schedule?.outcome,'completed','required people actually assemble and finish court');
 if(!process.env.TOILET_CONTINUE)assert(stairs>20&&doorCrossings>=1,'original blocked official physically leaves room via door and public staircase');assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);events.pagehide();fs.writeFileSync('qa/china-toilet-recovered-terminal.json',storage['worlds-days-v1']);console.log(JSON.stringify({status:'PASS',frames,stairs,doorCrossings,receipts:publicState().receipts,court:r.chinaAudience.state().schedule,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-official-toilet-main-inherited.cjs'}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
