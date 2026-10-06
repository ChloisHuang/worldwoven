// Fresh zero-fund actual main: autonomous court and the existing original
// edict must produce real work before any bank income. No seeded receipt or
// clock jump. Simulated DOM/renderer.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function heraldDutyReview(){return {player,npcs,chinaEdict,chinaAudience,chinaPalace,gardenSlot,gardenAccounts,heraldSlot,heraldAccounts,dailyNeeds,saved};} export function heraldDutyStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((file.endsWith('/game/main.js')?fs.readFileSync(file,'utf8').replace('enableHeraldNeeds:false','enableHeraldNeeds:true'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');

harness=harness.replace("const main=mod(path.join(root,'game/main.js'));","if(process.env.HERALD_RESUME)storage['worlds-days-v1']=fs.readFileSync(process.env.HERALD_RESUME,'utf8');const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.HERALD_RESUME?'lot':'globe');");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();const r=main.namespace.heraldDutyReview(),n=r.npcs.find(n=>n.station.id==='cn-palace-herald');for(let i=0;i<12;i++){now+=200;main.namespace.heraldDutyStep(.2);}assert.equal(r.heraldAccounts.account(n.station.id).bank,0);assert(!r.heraldAccounts.hasIncome(n.station.id));assert(!r.dailyNeeds.has(n.station.id));assert.equal(r.chinaEdict.heraldNeedsState(),null);assert.equal(r.chinaEdict.resolveHeraldActor(),n);assert(r.chinaEdict.heraldBinding().available);assert.equal(r.npcs.length,31);console.log('PASS production-enabled fresh gate: zero funds, no income or needs, original live herald');
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.slice(0,harness.indexOf('\nconsole.log(JSON.stringify('))+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
