// Run china-guard-uniform-main.cjs first to obtain its natural active-save.json.
// Restore once at zero simulation time; no full route or payroll replay.
// Qualification is a fixture; the persisted range ticket is covered separately.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extra=`
export function guardBathWardrobeProbe(){const prior=seated;try{seated={kind:'bath',bathWardrobePreset:'bath-robe'};buildPlayer();return {source:player.root.userData.wardrobeSource,preset:player.root.userData.appearance.wardrobePreset,loan:!!player.root.userData.jinyiCostume};}finally{seated=prior;buildPlayer();}}
export function guardReview(){return {get player(){return player;},lot,camera,scene,sun,lighting,npcs,chinaArchery,chinaGuardEmployment,formalCareers,copperLedger,navOptions,careerHandbook};}
export function guardStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);careerHandbook.update(mode);}
export function guardView(a=0,p=.18,d=4.6){yaw=a;pitch=p;distance=d;updateCamera(1,true);}
export {requestStationIntent,configureStableShadows,blocked,save,cancelAction,buildPlayer};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extra)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const seed="storage['worlds-days-v1']=fs.readFileSync('qa/china-guard-uniform/active-save.json','utf8');const main=mod(path.join(root,'game/main.js'));";
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed);
harness=harness.replace("assert.equal(state().mode,'globe')","assert.equal(state().mode,'lot')");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
const r=main.namespace.guardReview();assert.equal(state().region,'china');assert.equal(state().playerWardrobeSource,'guard-duty');assert.equal(state().playerLook.wardrobePreset,'jinyi-training');assert(r.player.root.userData.jinyiCostume);assert.equal(r.chinaGuardEmployment.state().job.assignment,'patrol');const saved=JSON.parse(storage['worlds-days-v1']),old=JSON.parse(fs.readFileSync('qa/china-guard-uniform/active-save.json','utf8'));assert.deepEqual(saved.appearance,old.appearance);assert.equal(saved.outfit,old.outfit);assert.equal(r.player.root.position.distanceTo(new three.namespace.Vector3(...old.worldContinuity.regions.china.player.position)),0);assert.equal(state().continuity.relocated.length,0);assert.equal(state().continuity.skipped.length,0);const bath=main.namespace.guardBathWardrobeProbe();assert.equal(bath.source,'bath');assert.equal(bath.preset,'bath-robe');assert.equal(bath.loan,false);assert.equal(state().playerWardrobeSource,'guard-duty');assert(r.player.root.userData.jinyiCostume);assert.deepEqual(JSON.parse(storage['worlds-days-v1']).appearance,old.appearance);const report={status:'PASS',bathContext: bath,scope:'Production main loads persisted active guard duty at zero simulation time; no route replay or render',look:state().playerLook,source:state().playerWardrobeSource,restored:state().continuity,personalUnchanged:true};fs.writeFileSync('qa/china-guard-uniform/reload-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
})().catch(e=>{console.error(e);process.exit(1)});
`;
new vm.Script(harness,{filename:'guard-uniform-reload-harness.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename:__filename});
