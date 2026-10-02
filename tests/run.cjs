// Serial by default: scene graphs and software-render contexts have large peaks.
// Stream each child's evidence immediately so a long controller run is observable.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');fs.mkdirSync('qa/gates',{recursive:true});
const tests=['runner-observability','npc-shape-geometry','npc-shape-stairs','npc-random-appearance','npc-appearance-controller','character-shapes','character-shape-contacts','random-appearance','random-appearance-controller','random-appearance-layout','random-appearance-reload','r12-1-dragon-bed','dragon-bed-input','dragon-bed-camera','r12-canopies','rest-bath-contact','lie-support-contact','rest-bath-input-events','rest-bath-travel','miko-role','miko-seat-contact','japan-structure-r12','japan-controller-r12','garden-bench-clearance','movement-runtime','controller-wallclock','hotfix-player-locomotion','hotfix-stair-locomotion','hotfix-doors','hotfix-input-events','hotfix-held-gesture','hotfix-visibility-seats','r11-locomotion','r11-stair-locomotion','r11-doors','china-decor-r11','france-sculpture-r11','furniture-interactions','furniture-discovery','furniture-seat-contact','furniture-safety-regression','furniture-preview-regression','furniture-controller','automatic-doors','automatic-door-scenes','door-safety-regression','floor-support','egypt-connections','france-furniture','france-tea','france-tea-station','france-tea-pose','china-palace-r10','china-work-anchors-r10','stable-shadows.mjs','appearance','characters','character-variety','character-stairs-japan','character-stairs-egypt','character-transitions','character-hand-clearance','night-lighting','night-field','navigation-clearance','navigation-bounds','camera-fixtures','render-depth','globe-surfaces','japan-program','scene-geometry','furniture-assemblies','rooms-and-doors','camera-scenes','game-controller'];
const from=process.env.TEST_FROM,only=process.env.TEST_ONLY?process.env.TEST_ONLY.split(',').filter(Boolean):null;
if(from&&only)throw Error('Choose TEST_FROM or TEST_ONLY, not both');
if(from&&!tests.includes(from))throw Error('Unknown TEST_FROM '+from);
if(only?.some(name=>!tests.includes(name)))throw Error('Unknown TEST_ONLY gate');
const selected=only?tests.filter(name=>only.includes(name)):from?tests.slice(tests.indexOf(from)):tests;
const digest=createHash('sha256');
function fingerprint(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())fingerprint(file);else{digest.update(file);digest.update('\0');digest.update(fs.readFileSync(file));}}}
for(const dir of ['source','tests','scripts','worker'])fingerprint(dir);
const sourceFingerprint=digest.digest('hex');
let child=null,interrupted=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interrupted=true;if(child)child.kill(signal);});
const run={status:'RUNNING',sourceFingerprint,scope:'Serial source geometry/controller checks; not browser or physical-device acceptance',startedAt:new Date().toISOString(),required:selected,completed:[],active:null};
const save=()=>fs.writeFileSync('qa/release-progress.json',JSON.stringify(run,null,2)+'\n');
(async()=>{
 for(const name of selected){
  if(interrupted)break;
  const start=Date.now();run.active={name,startedAt:new Date(start).toISOString()};save();console.log('CHECK',name);
  const out=fs.createWriteStream('qa/release-'+name+'-output.json'),err=fs.createWriteStream('qa/release-'+name+'-stderr.log');
  let lastError='',launchError=null;
  const result=await new Promise(resolve=>{
   child=spawn(process.execPath,['--experimental-vm-modules','tests/'+name+(name.endsWith('.mjs')?'':'.cjs')],{stdio:['ignore','pipe','pipe']});
   child.stdout.on('data',data=>out.write(data));
   child.stderr.on('data',data=>{err.write(data);lastError=(lastError+data).slice(-6000);process.stderr.write(data);});
   child.on('error',error=>{launchError=error.message;});
   child.on('close',(code,signal)=>resolve({code,signal,launchError}));
  });
  await Promise.all([new Promise(resolve=>out.end(resolve)),new Promise(resolve=>err.end(resolve))]);child=null;
  const row={name,status:result.code===0?'PASS':'FAIL',elapsedMs:Date.now()-start,...result};run.completed.push(row);run.active=null;fs.writeFileSync('qa/gates/'+name+'.json',JSON.stringify({...row,sourceFingerprint,finishedAt:new Date().toISOString()},null,2)+'\n');save();
  if(result.code!==0){run.status=interrupted?'INTERRUPTED':'FAIL';save();console.error('FAIL',name,JSON.stringify(result));if(lastError)console.error(lastError);process.exitCode=result.code||1;return;}
  console.log('PASS',name,row.elapsedMs+'ms',run.completed.length+'/'+selected.length);
 }
 run.status=interrupted?'INTERRUPTED':'PASS';run.finishedAt=new Date().toISOString();save();process.exitCode=interrupted?130:0;
 console.log((from||only?'Selected':'All registered')+' local geometry/controller checks '+run.status.toLowerCase()+'; this is not browser or device-performance verification');
})().catch(error=>{run.status='FAIL';run.error=String(error);save();console.error(error);process.exitCode=1;});
