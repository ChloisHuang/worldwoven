// A single production-main invitation after natural artist life. The banquet
// chair aisle must pass people with full bodies, without a second click.
// Run under guard-process-tree.py; optional WW_SALON_RENDER=1 captures the same run.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const reviewExports="\nexport function salonProbe(){return {player,lot,camera,scene,sun,lighting,npcs,navOptions,furniture,chinaSalon,chinaSalonUI,chinaTavern,copperLedger,automaticDoors,simulationClock};} export function salonView(a,p=.18){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export function salonStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaSalonUI?.update();} export {navigateTo,configureStableShadows,blocked,planPath};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(reviewExports)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();tick(2);
const r=main.namespace.salonProbe(),s=r.chinaSalon,a=s.performers.find(n=>n.station.id==='cn-tavern-chess-poet'),started=Date.now(),T=three.namespace;
r.player.root.position.set(24.15,7.815,12.65);assert(r.copperLedger.earn(12,'qa-prior-completed-labor').ok);
const frame=(dt=.05)=>main.namespace.salonStep(dt),positions=()=>s.performers.map(n=>({id:n.station.id,p:n.root.position.toArray(),mount:n.serviceMount?.id||null}));
for(let i=0;i<600;i++)frame();
let i=0;while(!s.view().candidates.find(c=>c.id===a.station.id).available&&i++<400)frame();
r.chinaSalonUI.open();const card=all.slice().reverse().find(e=>e.attrs?.['data-cn-salon-focus']==='artist-'+a.station.id);assert(card);card.onclick();const button=all.slice().reverse().find(e=>e.textContent==='请引见陆怀川');assert(button&&!button.disabled);button.onclick();assert.equal(s.state().session?.stage,'invited');
let minGap=Infinity,minPeopleGap=Infinity,last=a.root.position.clone(),still=0;const trace=[];
for(let i=0;i<2400&&s.state().session?.stage==='invited';i++){
 frame(1/60);for(const other of s.performers.filter(n=>n!==a))minPeopleGap=Math.min(minPeopleGap,a.root.position.distanceTo(other.root.position));trace.push(a.root.position.toArray());if(a.root.position.distanceTo(last)<.001)still+=1/60;else still=0;last.copy(a.root.position);
 minGap=Math.min(minGap,a.root.position.distanceTo(new T.Vector3(22.85,7.815,12.65)));
 if(still>6)break;
}
for(let i=0;i<30&&s.state().session?.stage==='reply';i++)frame();
console.log('RESULT',JSON.stringify({stage:s.state().session,artists:positions(),history:s.state().history,failures:s.state().failures,minGap,minPeopleGap,seconds:(Date.now()-started)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
assert.equal(s.state().session?.stage,'accepted','single Lu invitation actually answers');assert(minPeopleGap>=.5-1e-5,'artists pass with normal full .25 + .25 radii');assert.equal(s.state().history.filter(h=>h.event==='invited').length,1);assert.equal(s.state().history.filter(h=>h.event==='response').length,1);assert.equal(r.copperLedger.state().cash,12);assert.equal(s.state().failures.length,0);
fs.mkdirSync('qa/salon-invitation',{recursive:true});fs.writeFileSync('qa/salon-invitation/single-request.json',JSON.stringify({scope:'Actual production main and natural artist life, simulated DOM, single UI request followed at 60Hz; no browser/iOS claim',stage:s.state().session,history:s.state().history,minPeopleGap,trace},null,2));
if(process.env.WW_SALON_RENDER){const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});const canvas=W.createCanvas(852,393),renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(852,393,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,r.sun);r.camera.aspect=852/393;r.camera.updateProjectionMatrix();main.namespace.salonView(Math.PI,.18);r.scene.updateMatrixWorld(true);r.lighting.update(r.player.root.position);renderer.render(r.scene,r.camera);renderer.getContext().finish();assert.equal(renderer.getContext().getError(),0);fs.writeFileSync('qa/salon-invitation/normal-after-response.png',canvas.toBuffer('image/png'));renderer.dispose();canvas.dispose();}
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
})().catch(e=>{console.error(e);process.exit(1)});`;
new vm.Script(harness,{filename:'tests/salon-invitation-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests'});
