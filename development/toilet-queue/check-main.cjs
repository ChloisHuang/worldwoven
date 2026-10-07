// One bounded original official's upper-office -> public stair -> real toilet
// chain. Simulated DOM/renderer plus production Three/navigation, not phone QA.
const fs=require('node:fs'),vm=require('node:vm');
if(process.env.QUEUE_GUARDED!=='1')throw new Error('Use development/toilet-queue/run-bounded.sh for resource limits');
let harness=require('./bounded-dom.cjs')(fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8'));
const extras=`\nexport function needsReview(){return {player,npcs,lot,furniture,navOptions,chinaDailyToilet,chinaAudience,dailyNeeds,simulationClock,saved,chinaClinic,chinaTellerPersonal,automaticDoors};} export function needsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((process.env.QUEUE_BASELINE&&file.includes('/game/')&&fs.existsSync('/tmp/toilet-queue-baseline/'+file.split('/').at(-1))?fs.readFileSync('/tmp/toilet-queue-baseline/'+file.split('/').at(-1),'utf8'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.QUEUE_LOAD?'lot':'globe');");
const seed=String.raw`
const initial=JSON.parse(storage['worlds-days-v1']);
initial.simulationClock={version:1,seconds:360};initial.chinaAudience={day:0,calledDay:0,outcome:'completed'};
const dueIds=['cn-official-justice','cn-official-rites','cn-official-records','cn-clinic-physician','cn-money-house-teller'];
initial.dailyNeeds={version:2,registeredPeople:['cn-clinic-physician','cn-money-house-teller'],people:Object.fromEntries(dueIds.map(id=>[id,{foodAge:0,toiletAge:25*60/.7,receipts:{}}]))};
storage['worlds-days-v1']=process.env.QUEUE_LOAD?fs.readFileSync(process.env.QUEUE_LOAD,'utf8'):JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
if(state().mode!=='lot'){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.needsReview(),service=r.chinaDailyToilet,publicState=()=>service.state().facilities.publicWashroom,people=['cn-official-justice','cn-official-rites','cn-official-records','cn-clinic-physician','cn-money-house-teller'],identities=r.npcs.map(n=>n.station.id);
let frames=0,maxCrowd=0,maxUnreserved=0;const receiptsAtStart=publicState().receipts.length;
function snap(label){events.pagehide();fs.writeFileSync('qa/toilet-queue-'+label+'.json',storage['worlds-days-v1']);}
function step(){now+=100;main.namespace.needsStep(.1);frames++;const crowd=r.npcs.filter(n=>Math.abs(n.root.position.y-4.015)<.3&&n.root.position.x>21.5&&n.root.position.x<26&&n.root.position.z>4.5&&n.root.position.z<8.3),unreserved=crowd.filter(n=>!service.ownsActor(n));maxCrowd=Math.max(maxCrowd,crowd.length);maxUnreserved=Math.max(maxUnreserved,unreserved.length);if(!process.env.QUEUE_BASELINE&&!process.env.QUEUE_LOAD)assert(r.npcs.filter(n=>service.publicContainsActor(n)).length<=1,'fresh remote admission allows only one real person inside private room');if(frames%300===0){console.log('PROGRESS',JSON.stringify({frames,crowd:crowd.map(n=>n.station.id),positions:people.map(id=>({id,p:r.npcs.find(n=>n.station.id===id).root.position.toArray()})),facility:publicState().activity,waiters:publicState().waiters,receipts:publicState().receipts.map(v=>v.actorId),clinic:r.chinaClinic?.personalNeedsState(),teller:r.chinaTellerPersonal?.state()}));snap(process.env.QUEUE_BASELINE?'baseline-progress':'progress');}}
const allCompleted=()=>people.every(id=>publicState().receipts.some(row=>row.actorId===id));
const exitingOfficials=()=>r.chinaAudience.snapshot().life?.runtime?.stages?.filter(([id,s])=>people.includes(id)&&s.toiletExit).map(([id])=>id)||[];
const settled=()=>allCompleted()&&!exitingOfficials().length&&!r.chinaClinic?.personalNeedsState()?.task&&!r.chinaTellerPersonal?.state()&&!r.npcs.some(n=>people.includes(n.station.id)&&service.publicContainsActor(n));
for(;frames<Math.min(300,Math.max(1,Number(process.env.QUEUE_STEPS)||300))&&!(process.env.QUEUE_BASELINE?maxUnreserved>=2&&maxCrowd>=2:settled());)step();
// Keep a short privacy/use interval in one process; read-back still interrupts
// a genuinely unfinished use, so never manufacture completion across a cut.
if(!process.env.QUEUE_BASELINE){let finishSteps=0;while(['waiting-privacy','using'].includes(publicState().activity?.stage)&&finishSteps++<250)step();}
snap(process.env.QUEUE_BASELINE?'baseline':'fixed');
assert.deepEqual(r.npcs.map(n=>n.station.id),identities);
if(process.env.QUEUE_BASELINE)assert(maxUnreserved>=2&&maxCrowd>=2,'normal concurrent demand reproduces unreserved crowd '+JSON.stringify({maxCrowd,maxUnreserved}));
console.log(JSON.stringify({status:process.env.QUEUE_BASELINE?'REPRODUCED':settled()?'PASS':'CHECKPOINT',frames,maxCrowd,maxUnreserved,receipts:publicState().receipts,people,completed:allCompleted(),settled:settled(),exitingOfficials:exitingOfficials(),maxRSSMiB:process.resourceUsage().maxRSS/1024}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-official-toilet-main-inherited.cjs'}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
