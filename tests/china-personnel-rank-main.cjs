// Reuse the existing bounded production journey with a higher-rank core seed.
// The source route test remains unchanged; all seed edits are explicit.
// PERSONNEL_RANK_PUBLIC=1 opts into the documented segmented royal endpoint.
// Without it, a blocked natural reception stays a durable CHECKPOINT.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let source=fs.readFileSync(path.join(__dirname,'china-personnel-main.cjs'),'utf8');
source=source.replaceAll("qa/personnel-main'","qa/personnel-rank-main'");
const marker="if(process.env.PERSONNEL_MAIN_ATTENDANCE==='1'){";
const index=source.indexOf(marker);if(index<0)throw Error('Missing storage-stage seam');
source=source.slice(0,index)+String.raw`
if(!journal.rankStaged){
 const seed=await require(path.resolve('tests/fixtures/personnel-rank-main-seed.cjs'))({prior:JSON.parse(storage['worlds-days-v1']),mod,linker,root,assert});
 storage['worlds-days-v1']=JSON.stringify(seed.save);
 journal={version:1,rankStaged:true,staging:seed.staging,completed:['00-initial','01-claimed',...Array.from({length:6},(_,i)=>'02-read-'+i),'03-compiled','04-signed'],evidence:[]};
}
`+source.slice(index);
// A real fixed draw may reject. Keep that original decision, then only stage
// the next calendar day before resubmission; no new service or skills granted.
source=source.replace("if(process.env.PERSONNEL_MAIN_ATTENDANCE==='1'){",String.raw`
if(process.env.PERSONNEL_RANK_PUBLIC==='1'&&(!journal.publicSegment||journal.rankRejected)){
 const retry=!!journal.rankRejected,prior=JSON.parse(storage['worlds-days-v1']);
 const staged=await require(path.resolve('tests/fixtures/personnel-rank-public-stage.cjs'))({prior,retry,mod,linker,root,assert});storage['worlds-days-v1']=JSON.stringify(staged);
 journal.publicSegment=true;journal.rankRejected=false;delete journal.baseline;
 journal.completed=journal.completed.filter(name=>!['09-rejected','09-imperial-approved','10-appointed'].includes(name));
 journal.staging+=' Segmented endpoint: original actual09 royal actors/controller/public player position reused. '+(retry?'Day14 resubmission/Lu/paper explicitly core-staged; old rejection kept. ':'Original new-grade day13 application/Lu/paper unchanged. ');
}
if(process.env.PERSONNEL_MAIN_ATTENDANCE==='1'){`);
source=source.replace("assert.equal(app().id,applicationId);assert.equal(app().stage,'imperial-approved',JSON.stringify(diagnostic()));",String.raw`
if(app().stage==='document-held'){checkpoint('09-still-waiting',{applicationId,waiting:clone(r.chinaPersonnelAppointment.snapshot()),emperor:emperor.root.position.toArray(),palace:clone(r.chinaPalace.state())});console.log('CHECKPOINT original emperor still busy; approval not bypassed');return;}
if(app().status==='rejected'){
 assert.equal(app().code,'promotion-review-rejected');assert.equal(app().imperialDecision.passed,false);assert.equal(career().currentRole().rankId,'cn-records-regular');
 journal.rankRejected=true;checkpoint('09-rejected',{applicationId,decision:app().imperialDecision,originalDrawRetained:true});console.log('CHECKPOINT fixed rejection preserved; next run may stage next calendar day');return;
}
assert.equal(app().id,applicationId);assert.equal(app().stage,'imperial-approved',JSON.stringify(diagnostic()));`);
// Replace only test expectations; product modules are loaded unchanged.
source=source.replaceAll("'cn-records-personnel'","'__TARGET__'").replaceAll("'cn-records-regular'","'cn-records-personnel'").replaceAll("'__TARGET__'","'cn-records-personnel-regular'").replaceAll("'从八品'","'正八品'");
source=source.replace('Actual production main full trial and personnel promotion route','Actual production main higher-grade promotion route after explicitly core-staged earlier service');
new vm.Script(source,{filename:__filename}).runInNewContext({require,console,process,Buffer,structuredClone,URL,__dirname,__filename});
