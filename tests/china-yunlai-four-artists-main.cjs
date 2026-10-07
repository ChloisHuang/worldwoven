// A single production-main invitation after natural artist life. The banquet
// chair aisle must pass people with full bodies, without a second click.
// Run under guard-process-tree.py; optional WW_SALON_RENDER=1 captures the same run.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const reviewExports="\nexport function salonProbe(){return {player,lot,camera,scene,sun,lighting,npcs,navOptions,furniture,chinaSalon,chinaSalonUI,chinaTavern,copperLedger,automaticDoors,simulationClock};} export function salonView(a,p=.18){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export function salonStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);chinaSalonUI?.update();} export {navigateTo,configureStableShadows,blocked,planPath};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(reviewExports)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
harness=harness.replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url="file://"+file;}}');
harness=harness.replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}');
harness=harness.replace('const document={body:',"const document={head:new E('head'),body:");
const begin=harness.indexOf('const report=[];for(let round=0;');
harness=harness.slice(0,begin)+String.raw`
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.salonProbe(),s=r.chinaSalon,started=Date.now(),T=three.namespace;
r.player.root.position.set(24.15,7.815,7.65);assert(r.copperLedger.earn(100,'qa-prior-completed-labor').ok);
const frame=(dt=.05)=>main.namespace.salonStep(dt),reports=[];
for(let i=0;i<600;i++)frame();
if(process.env.WW_YUNLAI_EXPORT)require(process.cwd()+'/development/yunlai-layout/export-main.cjs')(r.scene,T,'/tmp/yunlai-whole-actual',r.player.root.position,r.camera.position);
for(const a of s.performers){
 let waited=0;while(!s.view().candidates.find(c=>c.id===a.station.id).available&&waited++<1200)frame();
 assert(waited<1200,'artist becomes available '+a.station.id);
 const activity=a.station.salon.activities[0];assert(s.request(a.station.id,activity),'one actual request '+a.station.id);
 let frames=0,minGap=Infinity;const trace=[];
 while(['invited','reply'].includes(s.state().session?.stage)&&frames++<3600){frame(1/60);trace.push(a.root.position.toArray());for(const other of s.performers.filter(n=>n!==a))minGap=Math.min(minGap,a.root.position.distanceTo(other.root.position));}
 console.log('ARTIST_RESULT',JSON.stringify({id:a.station.id,frames,stage:s.state().session?.stage||null,history:s.state().history.slice(-3),rooms:r.chinaTavern.snapshot().world.rooms}));
 const response=s.state().history.filter(h=>h.event==='response'&&h.actorId===a.station.id).at(-1);assert(response,'single invitation physically answered '+a.station.id);assert(Math.hypot(response.position[0]-22.85,response.position[2]-7.65)<.08);assert(s.state().session?.stage==='accepted'||s.state().history.slice(-2).some(h=>h.event==='no-room'),'only accepted or genuine no-room response');assert(minGap>=.5-1e-5,'full artist bodies stay separated');
 if(s.state().session){const checkpoint=s.snapshot(),body=a.root.position.toArray(),cash=r.copperLedger.state().cash;checkpoint.layoutVersion=2;checkpoint.artistLife.layoutVersion=2;
 assert(s.restore(checkpoint),'previous-layout ongoing introduction restores');assert.deepEqual(a.root.position.toArray(),body,'restore does not relocate performer');assert.equal(r.copperLedger.state().cash,cash);assert.equal(s.state().session.id,checkpoint.session.id);assert.equal(s.ledger.claim(checkpoint.session.roomId)?.owner,checkpoint.session.id,'same room reservation owner');}
 reports.push({id:a.station.id,frames,minGap,outcome:s.state().session?.stage||'no-room',trace});if(s.state().session)assert(s.cancel('本次布局检查结束'));
 let returning=0;while(s.state().returning&&returning++<2400)frame();assert(returning<2400,'artist physically returns '+a.station.id);
}
fs.mkdirSync('qa/yunlai-whole-floor',{recursive:true});fs.writeFileSync('qa/yunlai-whole-floor/four-artists-main.json',JSON.stringify({scope:'Actual production main, natural idle life, one request each and original session/room restore; simulated DOM, no browser/iOS claim',reports,seconds:(Date.now()-started)/1000},null,2));console.log('PASS four-artists-main',JSON.stringify({reports:reports.map(({trace,...v})=>v),seconds:(Date.now()-started)/1000}));
ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
})().catch(e=>{console.error(e);process.exit(1)});`;
new vm.Script(harness,{filename:'tests/salon-invitation-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__dirname:process.cwd()+'/tests'});
