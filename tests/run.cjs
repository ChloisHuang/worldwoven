// Explicit, serial module selection. No argument lists choices, never runs everything.
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
process.chdir(path.resolve(__dirname,'..'));
const suites=require('./suites.json');
const entries=Object.entries(suites).flatMap(([module,tiers])=>Object.entries(tiers).flatMap(([tier,names])=>names.map(name=>({name,module,tier}))));
const options={},args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 const key=args[i];
 if(['--list','--check','--all'].includes(key))options[key.slice(2)]=true;
 else if(['--module','--tier','--match','--only'].includes(key)&&args[i+1]&&!args[i+1].startsWith('--'))options[key.slice(2)]=args[++i];
 else throw Error('Unknown/incomplete option '+key);
}
if(process.env.TEST_FROM)throw Error('TEST_FROM was a legacy full-tail run. Use --module or --only explicitly.');
if(process.env.TEST_ONLY){if(options.only)throw Error('Choose TEST_ONLY or --only');options.only=process.env.TEST_ONLY;}
if(options.module&&!Object.hasOwn(suites,options.module))throw Error('Unknown module '+options.module);
if(options.tier&&!['required','integration','targeted','archive','all'].includes(options.tier))throw Error('Unknown tier '+options.tier);
if(options.check){
 const known=new Set();
 for(const row of entries){if(known.has(row.name))throw Error('Duplicate test '+row.name);known.add(row.name);if(!fs.existsSync(path.resolve('tests',row.name)))throw Error('Missing test '+row.name);}
 const missing=fs.readdirSync('tests').filter(n=>/\.(cjs|mjs)$/.test(n)&&n!=='run.cjs'&&!known.has(n));
 if(missing.length)throw Error('Classify new tests in suites.json: '+missing.join(', '));
 console.log('CATALOG PASS: '+entries.length+' distinct entries; no test bodies executed. Nested door-geometry harness has its own manifest.');process.exit(0);
}
let rows=entries;
if(options.module)rows=rows.filter(r=>r.module===options.module);
if(options.only){
 const requested=options.only.split(',').filter(Boolean),canonical=n=>n.replace(/\.(cjs|mjs)$/,'');
 if(!requested.length)throw Error('Empty --only');
 for(const n of requested)if(!rows.some(r=>canonical(r.name)===canonical(n)))throw Error('Unknown selected test '+n);
 rows=rows.filter(r=>requested.some(n=>canonical(n)===canonical(r.name)));
}else{
 const tier=options.tier||(options.all||options.list||!args.length?'all':'required');
 rows=rows.filter(r=>tier==='all'?r.tier!=='archive':r.tier===tier);
}
if(options.match)rows=rows.filter(r=>r.name.includes(options.match));
const listing=options.list||(!args.length&&!options.only);
if(listing){
 console.log('CATALOG ONLY: no tests executed. required = module core, not complete module coverage.');
 for(const module of Object.keys(suites)){
  const subset=rows.filter(r=>r.module===module);if(!subset.length)continue;
  console.log('\n'+module+' ('+subset.length+')');for(const r of subset)console.log('  '+r.tier.padEnd(11)+' '+r.name);
 }
 console.log('\nRun: npm run test:characters | node tests/run.cjs --module food-lodging --tier integration --match guest');
 console.log('Complete module (explicit): node tests/run.cjs --module ui --all; archives: --module diagnostics --tier archive --list');
 process.exit(0);
}
if(!rows.length)throw Error('No tests matched');
if(!options.module&&!options.only&&!options.all)throw Error('Choose --module or --only');
if(!options.only&&!options.match&&!options.all&&rows.some(r=>r.tier==='integration'||r.tier==='archive'||r.tier==='targeted'))throw Error('Use --match / --only for targeted work, or --all for an intentional whole-module run');
if(rows.some(r=>r.tier==='archive'))throw Error('Archived source-locked investigations are reference-only; see tests/README.md before invoking their original files manually.');
const selected=rows.map(r=>r.name),logName=name=>name.replace(/[^a-zA-Z0-9_.-]/g,'_');
fs.mkdirSync('qa/gates',{recursive:true});
const digest=createHash('sha256');
function fingerprint(dir){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,entry.name);if(entry.isDirectory())fingerprint(file);else{digest.update(file);digest.update('\0');digest.update(fs.readFileSync(file));}}}
for(const dir of ['source','tests','scripts','worker'])fingerprint(dir);
const sourceFingerprint=digest.digest('hex');
let child=null,interrupted=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{interrupted=true;if(child)child.kill(signal);});
const run={status:'RUNNING',sourceFingerprint,scope:'Selected module checks only; not full module, browser or physical-device acceptance',selection:{module:options.module||null,tier:options.tier||null},startedAt:new Date().toISOString(),required:selected,completed:[],active:null};
const save=()=>fs.writeFileSync('qa/release-progress.json',JSON.stringify(run,null,2)+'\n');
(async()=>{
 for(const name of selected){
  if(interrupted)break;
  const start=Date.now();run.active={name,startedAt:new Date(start).toISOString()};save();console.log('CHECK',name);
  const out=fs.createWriteStream('qa/release-'+logName(name)+'-output.json'),err=fs.createWriteStream('qa/release-'+logName(name)+'-stderr.log');
  let lastError='',launchError=null;
  const result=await new Promise(resolve=>{
   child=spawn(process.execPath,['--experimental-vm-modules',path.resolve('tests',name)],{stdio:['ignore','pipe','pipe']});
   child.stdout.on('data',data=>out.write(data));
   child.stderr.on('data',data=>{err.write(data);lastError=(lastError+data).slice(-6000);process.stderr.write(data);});
   child.on('error',error=>{launchError=error.message;});
   child.on('close',(code,signal)=>resolve({code,signal,launchError}));
  });
  await Promise.all([new Promise(resolve=>out.end(resolve)),new Promise(resolve=>err.end(resolve))]);child=null;
  const row={name,status:result.code===0?'PASS':'FAIL',elapsedMs:Date.now()-start,...result};run.completed.push(row);run.active=null;fs.writeFileSync('qa/gates/'+logName(name)+'.json',JSON.stringify({...row,sourceFingerprint,finishedAt:new Date().toISOString()},null,2)+'\n');save();
  if(result.code!==0){run.status=interrupted?'INTERRUPTED':'FAIL';save();console.error('FAIL',name,JSON.stringify(result));if(lastError)console.error(lastError);process.exitCode=result.code||1;return;}
  console.log('PASS',name,row.elapsedMs+'ms',run.completed.length+'/'+selected.length);
 }
 run.status=interrupted?'INTERRUPTED':'PASS';run.finishedAt=new Date().toISOString();save();process.exitCode=interrupted?130:0;
 console.log('Selected local checks '+run.status.toLowerCase()+'; '+selected.length+' entries only, not full module/browser/device acceptance');
})().catch(error=>{run.status='FAIL';run.error=String(error);save();console.error(error);process.exitCode=1;});
