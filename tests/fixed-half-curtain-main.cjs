// Focused release gate: real authored lots and main UI with a renderer stub.
const fs=require('fs'),path=require('path'),vm=require('vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures/hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?'\\nexport function fixedReview(){return {lot,automaticDoors,player};}':''),");
const start=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',start);
const body=String.raw`
const report=[],T=three.namespace,C=mod(path.join(root,'game/room-closures.js')).namespace,review=()=>main.namespace.fixedReview();
let fixedCount=0,generatedCount=0,banners=0;
for(let round=0;round<2;round++)for(const id of ['japan','china','egypt','france']){
 console.error('FIXED-CURTAIN MAIN',round,id);all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();tick(4);
 assert.equal(state().region,id);assert.equal(state().bounds.maxX-state().bounds.minX,60);assert.equal(state().bounds.maxZ-state().bounds.minZ,80);
 const r=review(),classified=C.classifyRoomOpenings(r.lot,id),half=classified.filter(d=>d.kind==='half-curtain');
 assert(state().automaticDoors.every(d=>d.kind!=='half-curtain'),'fixed fabric must never enter automatic routing');
 const initial=state().player;ids.joystick.listeners.pointerdown({pointerId:99,clientX:85,clientY:54});tick(20);ids.joystick.listeners.pointerup({pointerId:99});
 assert(Math.hypot(state().player.x-initial.x,state().player.z-initial.z)>.1,id+' touch movement');const stopped=state().player;tick(4);assert(Math.hypot(state().player.x-stopped.x,state().player.z-stopped.z)<.001,id+' touch release');
 const rows=[];
 for(const d of half){
  const groups=r.automaticDoors.root.children.filter(g=>g.name.endsWith(' / '+d.id));
  assert.equal(groups.length,d.existingBanner?0:1,id+'/'+d.id+' exactly one existing or generated cloth');
  if(d.existingBanner){rows.push({id:d.id,sourceBanner:true,noDuplicate:true});continue;}
  const g=groups[0];g.updateWorldMatrix(true,true);const matrix=g.children.map(o=>o.matrixWorld.elements.slice()),bounds=new T.Box3().setFromObject(g),hem=bounds.min.y-d.center[1];
  assert(hem>1.95+.10,id+'/'+d.id+' authored cloth stays above actor clearance');
  const stats=r.automaticDoors.getStats();
  for(const sign of [-1,1]){const p={x:d.center[0]+(d.axis==='z'?sign*.25:0),y:d.center[1],z:d.center[2]+(d.axis==='x'?sign*.25:0)};for(let f=0;f<24;f++)r.automaticDoors.update(1/60,[{position:p,radius:.34,height:1.95,speed:2}]);}
  g.updateWorldMatrix(true,true);assert.deepEqual(g.children.map(o=>o.matrixWorld.elements.slice()),matrix,id+'/'+d.id+' static near player and NPC-shaped occupants');
  rows.push({id:d.id,hem,actorHeight:1.95,unchangedTransforms:true,automatic:false});
 }
 assert.equal(r.automaticDoors.getStats().fixedHalfCurtains,half.filter(d=>!d.existingBanner).length);
 if(round===0){fixedCount+=half.length;generatedCount+=half.filter(d=>!d.existingBanner).length;banners+=half.filter(d=>d.existingBanner).length;}
 const before=state().playerLook;ids['appearance-button'].onclick();ids['outfit-next'].onclick();ids['outfit-cancel'].onclick();assert.deepEqual(state().playerLook,before,'cancel preserves identity');
 ids['return-world'].onclick();assert.equal(state().mode,'globe');assert.equal(state().npcCount,0);assert.equal(state().characterResources.activeReferences,0);assert.equal(state().player,null);
 report.push({round,region:id,rows,cleanup:'PASS'});
}
assert.equal(fixedCount,18);assert.equal(generatedCount,15);assert.equal(banners,3);
const result={status:'PASS',scope:'Real four-region production scene/main handlers with simulated DOM and renderer stub; 18 fixed entries, no duplicate source noren, actual clearance and immutable transforms near actor/NPC descriptors, touch movement/release, outfit cancellation and two complete region cleanup cycles. Eight synthetic axis/style crossings remain a separate gate; this is not browser/iOS QA.',fixedCount,generatedCount,banners,report};
fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/fixed-half-curtain-main.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
`;
harness=harness.slice(0,start)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(__dirname,'fixed-half-curtain-main-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
