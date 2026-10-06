// Production main/Three/navigation tea integration probe.
// Normal existing guests choose their original unforced visits. No paid proof,
// actor coordinates, activity choice or earned money is seeded.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function archiveReview(){return {npcs,lot,navOptions,chinaArchiveService,chinaArchivePersonal,archiveAccounts,archiveSlot,dailyNeeds,saved,chinaTavern,chinaDailyToilet};}
export function archiveStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export {save,blocked,startInteraction,cancelAction};
`;
const patch=String.raw`function archiveSource(file){let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){s+=${JSON.stringify(extras)};}return s;}`;
harness=harness.replace("function mod(file)",patch+"\nfunction mod(file)");
// Fixture has a const loader in some versions; install helper before VM context.
if(!harness.includes('function archiveSource'))harness=patch+'\n'+harness;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(archiveSource(file),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.ARCHIVE_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.ARCHIVE_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.ARCHIVE_RESUME?'lot':'globe');");
harness=harness.replace("let s=fs.readFileSync(file,'utf8');", "let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js'))s=s.replace('const enableArchiveNeeds=false','const enableArchiveNeeds=true');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const r=main.namespace.archiveReview();assert(r.archiveAccounts.hasIncome('cn-rest'));assert.equal(r.archiveAccounts.account('cn-rest').bank,8);assert(!r.dailyNeeds.has('cn-rest'));
for(let i=0;i<30;i++){now+=100;main.namespace.archiveStep(.1);}
assert(r.dailyNeeds.has('cn-rest'));const need=r.dailyNeeds.status('cn-rest');assert(!need.seekMeal&&!need.seekToilet);const life=r.dailyNeeds.read('cn-rest');assert.equal(life.foodStrain,0);assert.equal(life.toiletStrain,0);assert.equal(r.chinaArchivePersonal.state(),null);assert.equal(r.archiveAccounts.snapshot().receipts.length,1);assert(r.chinaArchiveService.studyAvailable());
main.namespace.save();const next=JSON.parse(storage['worlds-days-v1']);assert.equal(next.chinaArchiveInspection.version,3);assert.equal(next.chinaArchiveInspection.order,null);assert(!next.worldContinuity.regions.china.controllers.chinaArchiveService);assert(!next.worldContinuity.regions.china.controllers.chinaArchivePersonal);fs.writeFileSync('/tmp/china-archive-healthy-enrollment.json',storage['worlds-days-v1']);console.log('PASS actual main first healthy enrollment after real original wages, no initial need/strain, unchanged 8 and one receipt, authoritative v3',need);
})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
