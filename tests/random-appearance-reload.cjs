// Re-evaluate the actual startup/save migration path with a fresh DOM+VM for
// every case, including the exact saved R13 state on two independent reloads.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
 const A=await import('../source/game/appearance.js'),T=await import('../source/game/character-traits.js'),legacy=JSON.parse(fs.readFileSync('tests/fixtures/appearance-r12-player-samples.json'))[2].state;
 const cases=[['v1',{version:1,seed:legacy.seed,player:Object.fromEntries(['skin','hair','eyeColor','variant'].map(k=>[k,legacy.player[k]]))}],['v2',legacy],['v3',A.randomizePlayerAppearance(A.createAppearanceState(legacy.seed),()=>.73)]];
 const shapeInvalid={...cases[2][1],player:{...cases[2][1].player,shapeTraits:{jawWidth:-500,legLength:500,eyeSize:'huge',noseSize:null,noseWidth:false,socketDepth:999}}};cases.push(['v3-clamped',shapeInvalid]);cases.push(['v3-repeat',cases[2][1]]);
 const oldV3={...cases[2][1]};delete oldV3.npcShapeVersion;cases.push(['v3-before-npc-extension',oldV3]);
 const results=[];
 for(const[label,appearance]of cases){
  const expected=A.migrateAppearanceState(appearance),saved={visited:[],stamps:{},outfit:5,appearance},encoded=JSON.stringify(saved);
  let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
  harness=harness.replace(/const storage=\{.*?\};let context/,`const storage={'worlds-days-v1':${JSON.stringify(encoded)}};let context`);
  harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport const reloadReview=()=>saved;`:''),");
  const start=harness.indexOf('const state=()=>context.__worldsDays.getState();');
  harness=harness.slice(0,start)+`reportReload(JSON.parse(JSON.stringify(main.namespace.reloadReview())),JSON.parse(storage['worlds-days-v1']));})().catch(e=>{throw e});`;
  let completed=false;
  await new vm.Script(harness,{filename:path.join(__dirname,'random-appearance-reload-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename,reportReload:(actual,stored)=>{actual=JSON.parse(JSON.stringify(actual));stored=JSON.parse(JSON.stringify(stored));assert.deepEqual(actual.appearance,expected,label+' startup retains exact traits');assert.equal(actual.outfit,5);assert.deepEqual(stored.appearance,expected,label+' migration persisted');assert.equal(stored.appearance.seed,legacy.seed);completed=true;}});
  assert(completed);results.push({label,preservedWorldSeed:legacy.seed,persistedAppearanceVersion:expected.version});
 }
 console.log(JSON.stringify({status:'PASS',scope:'Fresh actual-main.js startup VM reloads with renderer stub, not browser storage/WebGL',results},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
