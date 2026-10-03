// Optional QA only. One child at a time; the default npm test is unchanged.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawnSync,spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const repo=path.resolve(__dirname,'../..'),source=path.resolve(process.env.SOURCE_ROOT||path.join(repo,'source'));
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'doors.json'),'utf8'));
const provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'portability-provenance.json'),'utf8'));
const digest=data=>crypto.createHash('sha256').update(data).digest('hex');
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i++){
 const arg=args[i];
 if(['--list','--check','--tiny'].includes(arg)){options[arg.slice(2)]=true;continue;}
 if(['--region','--door'].includes(arg)&&args[i+1]&&!args[i+1].startsWith('--')){options[arg.slice(2)]=args[++i];continue;}
 throw Error('Usage: node tests/door-geometry/run.cjs [--list | --check | --tiny] [--region REGION] [--door OPENING_OR_RUNTIME_ID]');
}
if(['list','check','tiny'].filter(k=>options[k]).length>1)throw Error('Choose one mode');
if(options.region&&!Object.hasOwn(manifest.expectedCounts,options.region))throw Error('Unknown region');
const selected=manifest.doors.filter(d=>(!options.region||d.region===options.region)&&(!options.door||d.id===options.door||d.openingId===options.door));
if(!selected.length)throw Error('No manifested closures matched');
if(options.list){console.log(JSON.stringify({status:'MANIFEST_ONLY_NOT_A_TEST',count:selected.length,doors:selected},null,2));process.exit(0);}
function verifyPortableFiles(){
 for(const row of provenance.files){
  const bytes=fs.readFileSync(path.join(__dirname,row.file));
  if(digest(bytes)!==row.portableSha256)throw Error('Portable harness hash mismatch: '+row.file);
  let original=bytes.toString('utf8');
  for(const edit of [...(row.reviewedPostPortEdits||[]).reverse(),...row.pathEdits.slice().reverse()]){
   if(original.split(edit.portable).length!==2)throw Error('Ambiguous portability path edit: '+row.file);
   original=original.replace(edit.portable,edit.upstream);
  }
  if(digest(original)!==row.upstreamSha256)throw Error('Undocumented upstream change: '+row.file);
 }
 for(const span of provenance.protectedTails){
  let text=fs.readFileSync(path.join(__dirname,span.file),'utf8');
  const record=provenance.files.find(row=>row.file===span.file);
  for(const edit of [...(record?.reviewedPostPortEdits||[])].reverse()){
   if(text.split(edit.portable).length!==2)throw Error('Ambiguous reviewed guard edit: '+span.file);
   text=text.replace(edit.portable,edit.upstream);
  }
  if(text.split(span.fromUniqueMarker).length!==2||digest(text.slice(text.indexOf(span.fromUniqueMarker)))!==span.upstreamSha256)throw Error('Protected V7 body changed: '+span.file);
 }
 if(!Number.isInteger(manifest.totalOperable)||manifest.doors.length!==manifest.totalOperable)throw Error('Manifested operable closure count mismatch');
 for(const region of Object.keys(manifest.expectedCounts)){
  const doors=manifest.doors.filter(d=>d.region===region);
  if(doors.length!==manifest.expectedCounts[region])throw Error('Manifest region count mismatch');
  // The unchanged adapter uses includes(); prove each supplied runtime ID selects only itself.
  for(const door of doors)if(doors.filter(d=>d.id.includes(door.id)).length!==1)throw Error('Ambiguous adapter filter: '+door.id);
 }
}
async function verifyPolicyLoader(){
 const policy=await import(pathToFileURL(path.join(source,'game/room-closures.js')).href);
 for(const region of Object.keys(manifest.expectedCounts)){
  const expected=manifest.doors.filter(d=>d.region===region);
  // Minimal policy inputs only: no buildJapan/buildChina/buildEgypt/buildFrance call.
  const lot={doorways:expected.map(d=>({id:d.openingId,a:[0,0,0],b:[2,0,0],width:2,height:3,at:0,axis:'x'}))};
  const actual=policy.roomClosureSpecs(lot,region);
  if(actual.length!==expected.length)throw Error('Policy closure count mismatch: '+region);
  for(let i=0;i<actual.length;i++)if(['id','openingId','motion'].some(k=>actual[i][k]!==expected[i][k]))throw Error('Policy alias or motion changed: '+region+'/'+expected[i].openingId);
 }
}
function checkSyntax(){
 for(const file of fs.readdirSync(__dirname).filter(f=>/\.(cjs|mjs)$/.test(f))){
  const child=spawnSync(process.execPath,['--check',path.join(__dirname,file)],{encoding:'utf8',timeout:10000});
  if(child.status!==0)throw Error('Syntax check failed: '+file+' '+(child.error?.message||child.stderr));
 }
}
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=path.resolve(process.env.QA_OUT||path.join(repo,'qa/door-geometry',stamp));
let child=null,interrupted=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interrupted=true;if(child)child.kill('SIGKILL');});
async function runChild(file,argv,env,seconds,logPrefix){
 const begin=Date.now(),out=fs.createWriteStream(logPrefix+'.stdout.log'),err=fs.createWriteStream(logPrefix+'.stderr.log');
 let timedOut=false,launchError=null;
 const result=await new Promise(resolve=>{
  child=spawn(process.execPath,['--max-old-space-size='+ (options.tiny?'256':'768'),'--experimental-vm-modules',path.join(__dirname,file),...argv],{cwd:repo,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  const timer=setTimeout(()=>{timedOut=true;child?.kill('SIGKILL');},seconds*1000);
  child.stdout.on('data',data=>out.write(data));
  child.stderr.on('data',data=>{err.write(data);process.stderr.write(data);});
  child.on('error',error=>{launchError=error.message;});
  child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal});});
 });
 child=null;
 await Promise.all([new Promise(resolve=>out.end(resolve)),new Promise(resolve=>err.end(resolve))]);
 return {...result,timedOut,launchError,elapsedSeconds:(Date.now()-begin)/1000,hardTimeoutSeconds:seconds};
}
(async()=>{
 verifyPortableFiles();
 await verifyPolicyLoader();
 if(options.check){checkSyntax();console.log(JSON.stringify({status:'PASS_PORTABLE_HASH_SYNTAX_POLICY_LOADER',authoredSceneBuilt:false,files:provenance.files.length,manifestedDoors:manifest.doors.length,source},null,2));return;}
 if(!options.tiny&&process.env.QA_RESOURCE_WINDOW!=='granted-by-owner')throw Error('No scene construction without an explicit owner resource window; use --check or --tiny for scene-free checks');
 if(!options.tiny){
  for(const [key,value]of Object.entries({INCLUDE_FURNITURE:'1',CANOPY_STATE:'closed',GEOMETRY_EPS:'0.00001',MAX_ARC_ERROR:'0.0001'})){
   if(process.env[key]!==undefined&&(key.includes('EPS')||key.includes('ERROR')?Number(process.env[key])!==Number(value):process.env[key]!==value))throw Error('This runner uses calibrated '+key+'='+value);
  }
  if(process.env.QA_DIAGNOSTIC_FRACTION!==undefined||process.env.QA_DIAGNOSTIC_FRACTIONS!==undefined)throw Error('Selected-pose diagnostics cannot be accepted by the serial sweep runner');
 }
 fs.mkdirSync(output,{recursive:true});
 const progressFile=path.join(output,'progress.json');
 if(fs.existsSync(progressFile))throw Error('Choose a fresh QA_OUT; existing evidence is never overwritten');
 const run={status:'RUNNING',mode:options.tiny?'tiny-fixtures':'serial-authored-sweeps',startedAt:new Date().toISOString(),source,output,authoredSceneBuilt:false,required:options.tiny?5:selected.length,completed:[],active:null};
 const save=()=>fs.writeFileSync(progressFile,JSON.stringify(run,null,2)+'\n');save();
 const cases=options.tiny?['tiny-adaptive-fixtures-v1.mjs','replay-archived-positives-v2.mjs','rail-support-negative-v1.mjs','box-support-selection-fixtures-v1.mjs','ashlar-provenance-fixtures-v1.cjs'].map(file=>({file,name:file})):selected.map(door=>({file:'leaf-static-adaptive-v7.cjs',name:door.region+'-'+door.id,door}));
 for(const entry of cases){
  if(interrupted){run.status='INTERRUPTED';break;}
  const perCase=path.join(output,entry.name.replace(/[^a-zA-Z0-9_-]+/g,'_'));fs.mkdirSync(perCase,{recursive:true});
  run.active=entry.name;save();console.log('CHECK',entry.name);
  const env={SOURCE_ROOT:source,QA_OUT:perCase,...(!options.tiny?{DOOR_FILTER:entry.door.id,INCLUDE_FURNITURE:'1',CANOPY_STATE:'closed',GEOMETRY_EPS:'0.00001',MAX_ARC_ERROR:'0.0001'}:{})};
  if(!options.tiny)run.authoredSceneBuilt=true;
  const result=await runChild(entry.file,entry.door?[entry.door.region]:[],env,options.tiny?60:300,path.join(perCase,'run'));
  let status=result.timedOut?'TIMEOUT':result.code===0?'PASS':'INCOMPLETE',reason=null,reportFile=null;
  if(status==='PASS'&&entry.door){
   const door=entry.door;reportFile=path.join(perCase,door.region+'-'+door.id.replace(/[^a-zA-Z0-9_-]+/g,'_')+'.json');
   try{
    const report=JSON.parse(fs.readFileSync(reportFile,'utf8')),row=report.doors?.[0];
    if(report.status!=='PASS_BOUNDED_SWEEP'||report.diagnosticOnly||report.doors.length!==1||row.id!==door.id||row.openingId!==door.openingId||row.motion!==door.motion||row.status!=='PASS_BOUNDED_SWEEP'||!Object.keys(report.loadedSourceHashes||{}).length)throw Error('Missing exact single-door sweep acceptance');
    if(door.motion==='gather'&&(row.railSupport?.status!=='PASS_ACTUAL_ROD_ENDCAP_SUPPORT'||row.railSupport.ends?.length!==2||row.railSupport.ends.some(end=>!end.accepted)))throw Error('Missing two accepted actual rod endcaps');
   }catch(error){status='INCOMPLETE';reason=error.message;}
  }
  const row={name:entry.name,status,...result,...(entry.door?{door:entry.door,reportFile}:{}),...(reason?{reason}:{})};run.completed.push(row);run.active=null;save();
  console.log(status,entry.name,result.elapsedSeconds+'s');
  if(status!=='PASS'){run.status=interrupted?'INTERRUPTED':status;break;}
 }
 if(run.status==='RUNNING')run.status=run.completed.length===run.required?'PASS':'INCOMPLETE';
 run.finishedAt=new Date().toISOString();save();
 console.log(JSON.stringify({status:run.status,mode:run.mode,completed:run.completed.length,required:run.required,output,scope:options.tiny?'Scene-free fixtures only; no authored-scene acceptance':'Rendered leaf/static sweep and gathered-rod support only; controller, camera, own-rail fit and rendering remain separate'},null,2));
 if(run.status!=='PASS')process.exitCode=interrupted?130:1;
})().catch(error=>{console.error(error.stack);process.exitCode=2;});
