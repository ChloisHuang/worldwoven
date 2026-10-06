// Production main/Three/navigation tea integration probe.
// Normal existing guests choose their original unforced visits. No paid proof,
// actor coordinates, activity choice or earned money is seeded.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function tellerReview(){return {npcs,lot,navOptions,chinaTellerService,chinaTellerPersonal,tellerAccounts,tellerSlot,dailyNeeds,saved,chinaTavern,chinaDailyToilet};}
export function tellerStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}
export {save,blocked,startInteraction,cancelAction};
`;
const patch=String.raw`function tellerSource(file){let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){s+=${JSON.stringify(extras)};}return s;}`;
harness=harness.replace("function mod(file)",patch+"\nfunction mod(file)");
// Fixture has a const loader in some versions; install helper before VM context.
if(!harness.includes('function tellerSource'))harness=patch+'\n'+harness;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(tellerSource(file),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.TELLER_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.TELLER_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TELLER_RESUME?'lot':'globe');");
harness=harness.replace("let s=fs.readFileSync(file,'utf8');", "let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js'))s=s.replace('const enableTellerNeeds=false','const enableTellerNeeds=true');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const r=main.namespace.tellerReview();assert(r.tellerAccounts.hasIncome('cn-money-house-teller'));assert.equal(r.tellerAccounts.account('cn-money-house-teller').bank,8);assert(!r.dailyNeeds.has('cn-money-house-teller'));
for(let i=0;i<30;i++){now+=100;main.namespace.tellerStep(.1);}
assert(r.dailyNeeds.has('cn-money-house-teller'));const need=r.dailyNeeds.status('cn-money-house-teller');assert(!need.seekMeal&&!need.seekToilet);const life=r.dailyNeeds.read('cn-money-house-teller');assert.equal(life.foodStrain,0);assert.equal(life.toiletStrain,0);assert.equal(r.chinaTellerPersonal.state(),null);assert.equal(r.tellerAccounts.snapshot().receipts.length,1);assert(r.chinaTellerService.handoffBoundary().ok);
main.namespace.save();const next=JSON.parse(storage['worlds-days-v1']);assert.equal(next.chinaTellerInspection.version,2);assert.equal(next.chinaTellerInspection.order,null);assert(!next.worldContinuity.regions.china.controllers.chinaTellerService);assert(!next.worldContinuity.regions.china.controllers.chinaTellerPersonal);fs.writeFileSync('/tmp/china-teller-healthy-enrollment.json',storage['worlds-days-v1']);console.log('PASS actual main teller first healthy enrollment after real original wages, no initial need/strain, unchanged 8 and one receipt, authoritative v2',need);
})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
