// Tiny child fixtures only. No scene or renderer is constructed.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'worldwoven-runner-'));
fs.mkdirSync(path.join(tmp,'tests'));
fs.copyFileSync('tests/run.cjs',path.join(tmp,'tests/run.cjs'));
async function runFixture(body){
 fs.writeFileSync(path.join(tmp,'tests/game-controller.cjs'),body);
 const p=spawn(process.execPath,['tests/run.cjs'],{cwd:tmp,env:{...process.env,TEST_FROM:'game-controller',TEST_ONLY:''},stdio:['ignore','pipe','pipe']});
 let err='',out='',finished=false,liveEvidence=false;
 p.stdout.on('data',d=>{out+=d;});p.stderr.on('data',d=>{err+=d;});
 const poll=setInterval(()=>{try{const progress=JSON.parse(fs.readFileSync(path.join(tmp,'qa/release-progress.json'))),stream=fs.readFileSync(path.join(tmp,'qa/release-game-controller-stderr.log'),'utf8');if(!finished&&progress.status==='RUNNING'&&progress.active?.name==='game-controller'&&stream.includes('LIVE_FIXTURE'))liveEvidence=true;}catch{}},10);
 const result=await new Promise(resolve=>p.on('close',(code,signal)=>{finished=true;resolve({code,signal});}));clearInterval(poll);
 return{...result,out,err,liveEvidence,progress:JSON.parse(fs.readFileSync(path.join(tmp,'qa/release-progress.json')))};
}
(async()=>{try{
 const good=await runFixture("console.error('LIVE_FIXTURE success');setTimeout(()=>console.log(JSON.stringify({status:'PASS'})),250);");
 assert.equal(good.code,0);assert(good.out.includes('Selected local geometry/controller checks'),'subset must not claim whole-suite success');assert(good.liveEvidence,'active name and stderr must be observable before child exits');assert.equal(good.progress.status,'PASS');assert.equal(good.progress.completed[0].code,0);assert.equal(good.progress.completed[0].signal,null);
 const killed=await runFixture("console.error('LIVE_FIXTURE intentional signal fixture');setTimeout(()=>process.kill(process.pid,'SIGTERM'),250);");
 assert.equal(killed.code,1);assert(killed.liveEvidence);assert.equal(killed.progress.status,'FAIL');assert.equal(killed.progress.completed[0].code,null);assert.equal(killed.progress.completed[0].signal,'SIGTERM');assert(killed.err.includes('intentional signal fixture'));
 console.log(JSON.stringify({status:'PASS',scope:'Small runner subprocess fixtures only',liveProgress:true,partialStderr:true,terminalExitAndSignal:true}));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
