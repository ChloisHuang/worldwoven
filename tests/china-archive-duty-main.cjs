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
const patch=String.raw`function teaSource(file){let s=fs.readFileSync(file,'utf8');if(file.endsWith('/game/main.js')){s+=${JSON.stringify(extras)};}return s;}`;
harness=harness.replace("function mod(file)",patch+"\nfunction mod(file)");
// Fixture has a const loader in some versions; install helper before VM context.
if(!harness.includes('function teaSource'))harness=patch+'\n'+harness;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(teaSource(file),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.TEA_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.TEA_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.TEA_RESUME?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
if(!process.env.TEA_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.archiveReview(),n=r.npcs.find(n=>n.station.id==='cn-rest'),identities=r.npcs.map(n=>n.station.id);let last='',done=false,frames=0;
assert.equal(r.lot.archiveBooks.nodes.size,6);assert.equal(r.lot.archiveBooks.root.children.length,6);
if(!r.archiveAccounts.hasIncome('cn-rest'))assert(!r.dailyNeeds.has('cn-rest'));
for(;frames<Number(process.env.ARCHIVE_STEPS||2000);frames++){
const before=n.root.position.clone();now+=100;main.namespace.archiveStep(.1);const service=r.chinaArchiveService.state(),key=(service.order?.stage||'-')+':'+(service.order?.index||0);
assert(before.distanceTo(n.root.position)<.3,'continuous original Lan movement');
if(frames%20===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'original full-body table clearance '+n.root.position.toArray());
if(key!==last||frames%250===0){last=key;main.namespace.save();fs.writeFileSync('/tmp/china-archive-progress-checkpoint.json',storage['worlds-days-v1']);console.log(JSON.stringify({frame:frames,person:n.root.position.toArray(),service,account:r.archiveAccounts.account('cn-rest'),hands:r.lot.archiveBooks.state(),slot:r.archiveSlot.resolve().status}));}
if(!r.archiveAccounts.hasIncome('cn-rest'))assert(!r.dailyNeeds.has('cn-rest'));
if(r.archiveAccounts.hasIncome('cn-rest')&&r.chinaArchiveService.handoffBoundary().ok){done=true;break;}
}
main.namespace.save();fs.writeFileSync(process.env.ARCHIVE_CHECKPOINT||'/tmp/china-archive-duty-checkpoint.json',storage['worlds-days-v1']);assert(done,'original six volumes actually inspected and returned');assert.equal(r.archiveAccounts.account('cn-rest').bank,8);assert.equal(r.archiveAccounts.snapshot().receipts.length,1);assert(r.lot.archiveBooks.allReturned());assert.deepEqual(r.npcs.map(n=>n.station.id),identities);console.log('PASS actual main archive six-volume work and safe return; needs still gated',{frames,maxRSSMiB:process.resourceUsage().maxRSS/1024});
})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
