// One original host, moved counter/stairs and original kitchen. Renderer/DOM
// are simulated; real main owns actors, routes, receipts and complete saves.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function kitchenNeedsReview(){return {player,npcs,lot,furniture,navOptions,chinaDailyToilet,chinaTavern,dailyNeeds,tavernProperty,saved};} export function kitchenNeedsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=String.raw`
if(process.env.KITCHEN_NEEDS_RESTORE)storage['worlds-days-v1']=fs.readFileSync(process.env.KITCHEN_NEEDS_RESTORE,'utf8');else{const initial=JSON.parse(storage['worlds-days-v1']);initial.simulationClock={version:1,seconds:300};initial.chinaAudience={day:0,calledDay:0,outcome:'completed'};initial.dailyNeeds={version:2,registeredPeople:['cn-tavern-cook','cn-tavern-assistant'],people:Object.fromEntries(['cn-tavern-cook','cn-tavern-assistant'].map(id=>[id,{foodAge:25*60/.7,toiletAge:25*60/.7,receipts:{}}]))};storage['worlds-days-v1']=JSON.stringify(initial);}
`;
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.KITCHEN_NEEDS_RESTORE?'lot':'globe');");
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
if(!process.env.KITCHEN_NEEDS_RESTORE){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.kitchenNeedsReview(),scene=r.chinaTavern.staffScene,idsWanted=['cn-tavern-cook','cn-tavern-assistant'],originalIds=r.npcs.map(n=>n.station.id),actors=idsWanted.map(id=>r.npcs.find(n=>n.station.id===id)),done=new Set(),stairFrames=new Map(idsWanted.map(id=>[id,0])),contacts=new Map(idsWanted.map(id=>[id,new Set()]));
assert.equal(r.npcs.length,31);let frames=0,lastSaved='';const begun=Date.now();
function step(){const before=actors.map(n=>({p:n.root.position.clone(),seat:n.serviceMount,toilet:r.chinaDailyToilet.actorPose(n)}));now+=100;main.namespace.kitchenNeedsStep(.1);frames++;
 for(let i=0;i<actors.length;i++){const n=actors[i],id=n.station.id,old=before[i],wc=r.chinaDailyToilet.actorPose(n),mount=n.serviceMount,mounting=old.seat!==mount&&mount&&old.p.distanceTo(new three.namespace.Vector3(...mount.position))<.4,standing=old.seat&&!mount&&old.p.distanceTo(new three.namespace.Vector3(...old.seat.anchor))<.35;
  if(!old.toilet&&!wc)assert(old.p.distanceTo(n.root.position)<.4||mounting||standing,'continuous kitchen body motion '+JSON.stringify({id,before:old.p.toArray(),after:n.root.position.toArray(),phase:scene.kitchenBreak()?.phase}));
  if(n.walking&&n.root.position.y>.3&&n.root.position.y<3.9)stairFrames.set(id,stairFrames.get(id)+1);
  if(!mount&&!wc&&frames%32===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'kitchen person clear of solids '+id+' '+n.root.position.toArray());
  const o=scene.snapshot().orders.find(o=>o.customerId===id);if(o)contacts.get(id).add(o.stage);
  if(!done.has(id)&&!r.dailyNeeds.status(id).seekMeal&&!r.dailyNeeds.status(id).seekToilet&&scene.kitchenBreak()?.actorId!==id){const target=id==='cn-tavern-cook'?r.chinaTavern.dish.points.prep:r.chinaTavern.dish.points.assistant;assert(n.root.position.distanceTo(new three.namespace.Vector3(...target))<.25,'return to actual current job');done.add(id);}
 }
 const key=scene.kitchenBreak()?.actorId+':'+scene.kitchenBreak()?.phase;if(key!==lastSaved){events.pagehide();fs.writeFileSync('/tmp/china-kitchen-needs-checkpoint.json',storage['worlds-days-v1']);lastSaved=key;}
 if(frames%300===0)console.log('PROGRESS',JSON.stringify({frames,break:scene.kitchenBreak(),people:actors.map(n=>[n.station.id,n.root.position.toArray()]),orders:scene.snapshot().orders.map(o=>[o.customerId,o.stage]),failures:scene.state().failures}));
}
for(;frames<4400&&done.size<2;)step();
assert.equal(done.size,2,'both employees finish same paid meal, public WC and return');
for(const [id,balance]of [['cn-tavern-cook',234],['cn-tavern-assistant',254]]){assert.equal(r.tavernProperty.npcAccount(id).total,balance);assert.equal(r.tavernProperty.state().events.filter(e=>e.kind==='npc-meal-payment'&&e.actorId===id).length,1);assert.equal(scene.snapshot().mealReceipts.filter(v=>v.actorId===id).length,1);assert.equal(r.chinaDailyToilet.state().facilities.publicWashroom.receipts.filter(v=>v.actorId===id).length,1);assert(stairFrames.get(id)>30);assert(contacts.get(id).has('eating'));}
assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(scene.state().failures.length,0);assert(scene.hostAdmissionOpen());console.log(JSON.stringify({status:'PASS',scope:'two original kitchen people each self-pay, physically prepare/deliver own order, eat, public stairs/private toilet and return; daily clocks seeded only in this test; simulated DOM/renderer',frames,stairFrames:[...stairFrames],seconds:(Date.now()-begun)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));ids['return-world'].onclick();

`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-kitchen-needs-main-inherited.cjs'}).runInNewContext({URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
