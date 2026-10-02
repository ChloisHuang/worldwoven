// Actual production frame loop / click-to-walk navigation, simulated DOM, renderer stub.
// Test-only module exports below do not modify production source.
const fs=require('fs'),path=require('path'),vm=require('vm');let harness=fs.readFileSync(path.join(__dirname,'fixtures','hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function structureReview(){return {player,lot,camera,cameraSolids,npcs,navOptions};} export {navigateTo};`:''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const report=[],T=three.namespace;all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();tick(3);const review=main.namespace.structureReview();
const route=async(target)=>{main.namespace.navigateTo(new T.Vector3(...target.position));let frames=0;while(state().pathLength&&frames++<2000){now+=100;raf();}assert.equal(state().pathLength,0,target.id+' frame-loop path stuck');const p=state().player;assert(Math.hypot(p.x-target.position[0],p.z-target.position[2])<.141,target.id+' reached actual destination '+JSON.stringify({p,target:target.position}));assert(Math.abs(p.y-target.position[1])<.02,target.id+' correct floor');assert(state().camera.every(Number.isFinite),target.id+' finite camera');report.push({id:target.id,frames,player:p});};
const targets=review.lot.explorationTargets.filter(t=>t.id.startsWith('jp-room-')||/jp-[1-4]-(stair|balcony-center)/.test(t.id));
for(const t of targets)await route(t);
for(const p of [...review.lot.circulation.guestApproach].reverse())await route({id:'explicit-guest-to-public-gallery',position:p});
await route({id:'return-to-ground-spawn',position:review.lot.spawn});
ids['return-world'].onclick();assert.equal(state().npcCount,0);assert.equal(state().player,null);assert.equal(state().characterResources.activeReferences,0);
fs.writeFileSync('qa/r12-japan/main-controller-report.json',JSON.stringify({status:'PASS',scope:'Production main frame loop and navigateTo used for non-activity room, landing and balcony targets; DOM/renderer simulated, not WebGL',routes:report},null,2));
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');new vm.Script(harness,{filename:path.join(__dirname,'japan-controller-test-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
