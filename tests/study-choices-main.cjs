// Actual main entry/E/automatic-intent/animation/cancel/receipt hooks. Reuse the
// scene harness only for the four existing learning stations, not a scene matrix.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras='\nexport function studyReview(){return {player,lot,studyMenu,formalCareers};} export function studyStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);} export {requestStationIntent,stationIntent,cancelAction};';
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const checks=[],record=s=>{checks.push(s);console.log('PASS',s);};
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),text=e=>[e.textContent||'',...(e.children||[]).map(text)].join('\n');
const dialog=find(document.body,e=>e.className.split(' ').includes('study-dialog'));
const button=label=>{const b=find(dialog,e=>e.tagName==='button'&&e.textContent===label);assert(b,'button '+label);assert(!b.disabled);return b;};
const choose=skill=>{const b=find(dialog,e=>e.className==='study-option'&&text(e).includes(skill));assert(b,skill);b.onclick();};
const key=code=>events.keydown({code,repeat:false,preventDefault(){}}),up=code=>events.keyup({code});
const step=(n=1)=>{for(let i=0;i<n;i++){now+=100;main.namespace.studyStep(.1);}};
const enter=region=>{all.find(e=>e.dataset.region===region).onclick();ids.travel.onclick();assert.equal(state().region,region);return main.namespace.studyReview();};
let r=enter('china'),reading=r.lot.stations.find(s=>s.id==='cn-rest');
const at=station=>{r.player.root.position.set(...station.position);step();};
at(reading);assert.equal(state().nearest,'cn-rest');key('KeyE');assert(state().studyMenuOpen,'independent manual E opens choices without a route flag');assert.equal(state().performing,null);
assert.equal(r.formalCareers.state().learning['cn-rest'].issued,0);key('KeyE');key('KeyW');step(3);up('KeyW');assert.equal(state().performing,null);assert.equal(state().pathLength,0);
choose('文书');const stale=button('开始阅读 · 8秒');stale.onclick();assert.equal(state().performing,'cn-rest');assert.equal(state().study.lessonId,'writing-intro');stale.onclick();assert.equal(r.formalCareers.state().learning['cn-rest'].issued,1);
step(79);assert.equal(state().formalCareers.skills.writing,0);assert(ids['player-state'].textContent.includes('/8秒'));
step(2);assert.equal(state().formalCareers.skills.writing,0);assert.equal(state().formalCareers.skillXP.writing,10);assert.equal(state().formalCareers.skills.ritual,0);assert.equal(state().performing,null);assert(ids.toast.textContent.includes('文书 +10 XP'),'completion receipt survives the first station stamp');assert(ids.toast.textContent.includes('书信与文书'));
step(20);assert.equal(state().formalCareers.skills.writing,0);assert.equal(state().formalCareers.skillXP.writing,10);record('manual E chooses writing, actual 8-second action grants only writing once and receipt survives first stamp');
key('KeyE');choose('艺术');button('开始阅读 · 8秒').onclick();step(25);key('KeyW');step();up('KeyW');assert.equal(state().performing,null);assert.equal(state().formalCareers.skills.art,0);assert.equal(state().study,null);record('actual movement cancels incomplete reading without art XP');
// A nearby selected activity traverses the shared approach before choosing a
// book; no prior visit/action flag is needed and no XP is issued by the route.
at(reading);r.player.root.position.z+=.7;step();main.namespace.requestStationIntent(main.namespace.stationIntent(reading));
assert(state().pendingInteraction||state().studyMenuOpen);for(let n=0;n<100&&!state().studyMenuOpen;n++)step();assert(state().studyMenuOpen,'automatic intent arrives at book menu');assert.equal(state().formalCareers.skills.art,0);
assert(!text(dialog).includes('园艺'));choose('烹饪');button('开始阅读 · 8秒').onclick();step(81);assert.equal(state().formalCareers.skillXP.cooking,10);assert.equal(state().formalCareers.skills.ritual,0);record('existing automatic approach opens the same choices and awards selected local cooking only');
const writing=r.lot.stations.find(s=>s.id==='cn-calligraphy');at(writing);key('KeyE');button('开始习字 · 8秒').onclick();assert.equal(state().performing,'cn-calligraphy');step(81);assert.equal(state().formalCareers.skills.writing,0);assert.equal(state().formalCareers.skillXP.writing,20);record('physical calligraphy remains an 8-second writing exercise');
at(reading);key('KeyE');const exitStale=button('开始阅读 · 8秒');ids['return-world'].onclick();assert(!state().studyMenuOpen);exitStale.onclick();assert.equal(state().performing,null);
r=enter('france');const salon=r.lot.stations.find(s=>s.id==='france-salon');at(salon);key('KeyE');assert(state().studyMenuOpen,'French salon manual entry '+JSON.stringify({nearest:state().nearest,pending:state().pendingInteraction,performing:state().performing,seated:state().seated,toast:ids.toast.textContent}));choose('艺术');button('开始阅读 · 8秒').onclick();step(81);assert.equal(state().formalCareers.skills.art,0);assert.equal(state().formalCareers.skillXP.art,10);
const atelier=r.lot.stations.find(s=>s.id==='france-atelier');at(atelier);key('KeyE');assert(text(dialog).includes('艺术家职位尚未开放'));button('开始绘画 · 8秒').onclick();step(81);assert.equal(state().formalCareers.skills.art,0);assert.equal(state().formalCareers.skillXP.art,20);assert.equal(state().formalCareers.skills.writing,0);assert.equal(state().formalCareers.skillXP.writing,20);record('France real reading/painting stations share chosen arts progression, with no invented artist job');
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
console.log(JSON.stringify({status:'PASS',checks,scope:'Actual main and four existing station hooks; simulated DOM/renderer, not browser or iOS verification'}));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/study-choices-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
