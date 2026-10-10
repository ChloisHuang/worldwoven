// Reuse the existing bounded production journey with a higher-rank core seed.
// The source route test remains unchanged; all seed edits are explicit.
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
// Replace only test expectations; product modules are loaded unchanged.
source=source.replaceAll("'cn-records-personnel'","'__TARGET__'").replaceAll("'cn-records-regular'","'cn-records-personnel'").replaceAll("'__TARGET__'","'cn-records-personnel-regular'").replaceAll("'从八品'","'正八品'");
source=source.replace('Actual production main full trial and personnel promotion route','Actual production main higher-grade promotion route after explicitly core-staged earlier service');
new vm.Script(source,{filename:__filename}).runInNewContext({require,console,process,Buffer,structuredClone,URL,__dirname,__filename});
