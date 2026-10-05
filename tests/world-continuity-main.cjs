// One actual China order interrupted in progress, plus an Egypt roundtrip.
// Actual Three geometry, door/navigation and production main; simulated DOM.
const fs=require('node:fs'),vm=require('node:vm');let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function continuityStep(dt){elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);chinaClinic?.update(dt,elapsed,{player,position:player.root.position,facilityId:seated?.id||null});updateGameHealth(dt);}
export function continuityProbe(){return {player,npcs,lot,furniture,chinaClinic,navOptions,path,actionTime};}
export {save,enterRegion,requestFurniture,requestStationIntent,blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('add(...e){this.append(...e)}','prepend(...e){this.children.unshift(...e)}add(...e){this.append(...e)}');
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta(meta){meta.url=require("node:url").pathToFileURL(file).href;}}').replace('const document={body:',"const document={head:new E('head'),body:");
const start=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',start);
const body=String.raw`
const T=three.namespace,api=main.namespace;api.enterRegion('china');let r=api.continuityProbe();const chair=r.furniture.items.find(s=>s.id==='china-clinic-consult-seat');r.player.root.position.set(...chair.position);api.requestFurniture(chair);
const frame=()=>{now+=1000/15;api.continuityStep(1/15);},until=(p,label,max=6000)=>{for(let i=0;i<max&&!p();i++)frame();assert(p(),label+' '+JSON.stringify(api.continuityProbe().chinaClinic.state()));};
until(()=>state().seated===chair.id,'physical chair mount');until(()=>r.chinaClinic.state().order?.stage==='writing'&&r.chinaClinic.snapshot().phaseTime>.7,'interrupted writing stage');
api.save();const before=JSON.parse(storage['worlds-days-v1']),checkpoint=before.worldContinuity.regions.china,orderId=r.chinaClinic.state().order.id;
assert(checkpoint.controllers.chinaClinic.phaseTime>.7);assert.equal(checkpoint.activity.seated,chair.id);assert.equal(checkpoint.player.position[1],4.015);
api.enterRegion('egypt');assert.equal(state().region,'egypt');api.save();const egypt=JSON.parse(storage['worlds-days-v1']).worldContinuity.regions.egypt;assert(egypt);api.enterRegion('china');r=api.continuityProbe();
assert.equal(state().seated,chair.id);assert.equal(r.chinaClinic.state().order.id,orderId);assert.equal(r.chinaClinic.state().order.stage,'writing');assert.equal(r.chinaClinic.snapshot().phaseTime,checkpoint.controllers.chinaClinic.phaseTime);assert.deepEqual(r.player.root.position.toArray(),checkpoint.player.position);assert.equal(r.player.root.rotation.y,checkpoint.player.yaw);
for(const id of ['cn-clinic-physician','cn-pharmacy-assistant']){const actor=r.npcs.find(n=>n.station.id===id);assert.deepEqual(actor.root.position.toArray(),checkpoint.actors[id].position,'same NPC position '+id);assert.equal(actor.root.rotation.y,checkpoint.actors[id].yaw);}
assert.equal(state().simulationClock.seconds,before.simulationClock.seconds,'country visits do not create offline time');assert(state().continuity.controllers.includes('chinaClinic'));console.log('PASS player/NPC floor + yaw + seat + interrupted phase survive China/Egypt/China');
until(()=>r.chinaClinic.state().order?.stage==='handoff','remaining writing time finishes');const counter=r.lot.stations.find(s=>s.id==='cn-pharmacy-assistant');api.requestStationIntent(counter);
until(()=>r.chinaClinic.state().order?.stage==='complete','physical assistant/player route completes same numbered delivery');assert.equal(r.chinaClinic.state().order.id,orderId);assert.equal(r.chinaClinic.state().history.filter(h=>h.event==='delivered'&&h.orderId===orderId).length,1);api.save();const delivered=JSON.parse(storage['worlds-days-v1']).gameHealth.deliveredThrough;
api.enterRegion('china');r=api.continuityProbe();frame();assert.equal(r.chinaClinic.state().order?.id,orderId);assert.equal(r.chinaClinic.state().order?.stage,'complete');assert.equal(r.chinaClinic.state().history.filter(h=>h.event==='delivered'&&h.orderId===orderId).length,1);api.save();assert.equal(JSON.parse(storage['worlds-days-v1']).gameHealth.deliveredThrough,delivered);ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);console.log('PASS original order resumes physical delivery once; completed order/care receipt not replayed; actor resources released');
`;
harness=harness.slice(0,start)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');new vm.Script(harness,{filename:'world-continuity-inherited.cjs'}).runInNewContext({URL,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
