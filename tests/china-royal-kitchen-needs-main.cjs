// One original Jia and both existing staircases. Renderer/DOM
// are simulated; real main owns actors, routes, receipts and complete saves.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function royalNeedsReview(){return {player,npcs,lot,furniture,navOptions,chinaDailyToilet,chinaRoyalKitchen,chinaTavern,dailyNeeds,royalKitchenAccounts,royalKitchenSlot,saved};} export function royalNeedsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=String.raw`
if(process.env.ROYAL_NEEDS_RESUME){storage['worlds-days-v1']=fs.readFileSync(process.env.ROYAL_NEEDS_RESUME,'utf8');}else{
 const initial=JSON.parse(storage['worlds-days-v1']),accountModule=mod(path.join(root,'game/npc-duty-account.js'));await accountModule.link(linker);await accountModule.evaluate();const roleModule=mod(path.join(root,'game/china-royal-kitchen-role.js'));await roleModule.link(linker);await roleModule.evaluate();
 const role=roleModule.namespace.ROYAL_KITCHEN_ROLE, ledger=accountModule.namespace.createNPCDutyAccount({role,namespace:'chinaRoyalKitchenAccounts',saveState:()=>true}),coverage=[{actorId:'cn-cooking',roleId:role.id,slotId:role.slotId,holderRevision:0}];
 for(let i=0;i<=6860;i++)ledger.observe({seconds:i*.1,dt:.1,coverage});assert(ledger.checkpoint({day:0,hour:18}));assert.equal(ledger.account('cn-cooking').bank,21);
 initial.chinaRoyalKitchenAccounts=ledger.snapshot();initial.simulationClock={version:1,seconds:1440/.7};initial.chinaAudience={day:1,calledDay:1,outcome:'completed'};initial.dailyNeeds={version:2,registeredPeople:['cn-cooking'],people:{'cn-cooking':{foodAge:25*60/.7,toiletAge:37*60/.7,receipts:{}}}};storage['worlds-days-v1']=JSON.stringify(initial);
}
`;
harness=harness.replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,process.env.ROYAL_NEEDS_RESUME?'lot':'globe');");
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
if(!process.env.ROYAL_NEEDS_RESUME){all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();}
const r=main.namespace.royalNeedsReview(),scene=r.chinaTavern.staffScene,wanted=['cn-cooking'],actors=wanted.map(id=>r.npcs.find(n=>n.station.id===id)),originalIds=r.npcs.map(n=>n.station.id),done=new Set(),stairs=new Map(wanted.map(id=>[id,0]));let frames=0,lastKey='',stall=0,lastPositions=actors.map(n=>n.root.position.clone());const begun=Date.now();
function checkpoint(){events.pagehide();fs.writeFileSync('/tmp/china-royal-kitchen-needs-checkpoint.json',storage['worlds-days-v1']);}
for(;frames<3000&&done.size<1;frames++){
 const before=actors.map(n=>({p:n.root.position.clone(),seat:n.serviceMount,wc:r.chinaDailyToilet.actorPose(n)}));now+=200;main.namespace.royalNeedsStep(.2);
 for(let i=0;i<actors.length;i++){const n=actors[i],id=n.station.id,old=before[i],wc=r.chinaDailyToilet.actorPose(n),seat=n.serviceMount,mounting=old.seat!==seat&&seat&&old.p.distanceTo(new three.namespace.Vector3(...seat.position))<.4,standing=old.seat&&!seat&&old.p.distanceTo(new three.namespace.Vector3(...old.seat.anchor))<.35;
  if(!old.wc&&!wc)assert(old.p.distanceTo(n.root.position)<.5||mounting||standing,'continuous royal cook body movement '+JSON.stringify({id,before:old.p.toArray(),after:n.root.position.toArray(),task:r.chinaRoyalKitchen.personalNeedsState()}));
  if(n.walking&&n.root.position.y>.3&&n.root.position.y<3.9)stairs.set(id,stairs.get(id)+1);
  if(!seat&&!wc&&frames%30===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'royal cook clear of solids '+id+' '+n.root.position.toArray());
  const need=r.dailyNeeds.status(id);if(!need.seekMeal&&!need.seekToilet&&r.chinaRoyalKitchen.personalNeedsState()?.actorId!==id){const p=[22.7,4.015,-5.9];assert(n.root.position.distanceTo(new three.namespace.Vector3(...p))<.3,'returns to actual royal kitchen post');done.add(id);}
 }
 const task=r.chinaRoyalKitchen.personalNeedsState(),key=task?.actorId+':'+task?.phase+':'+task?.index;if(key!==lastKey){checkpoint();lastKey=key;console.log('PHASE',JSON.stringify({frames,task,positions:actors.map(n=>n.root.position.toArray())}));}
 if(frames%100===0){checkpoint();console.log('PROGRESS',JSON.stringify({frames,task,positions:actors.map(n=>n.root.position.toArray()),orders:scene.snapshot().orders.map(o=>[o.customerId,o.stage]),failures:scene.state().failures,royalFailures:r.chinaRoyalKitchen.state().failures}));}
}
checkpoint();assert.equal(done.size,1,'original royal cook finish own paid meal/public WC and return');for(const [id,balance]of [['cn-cooking',15]]){assert.equal(r.royalKitchenAccounts.account(id).bank,balance);assert.equal(r.royalKitchenAccounts.account(id).cash,0);assert.equal(r.royalKitchenAccounts.snapshot().mealTransfers.filter(v=>v.actorId===id&&v.kind==='meal-payment').length,1);assert.equal(scene.snapshot().mealReceipts.filter(v=>v.actorId===id).length,1);assert.equal(r.chinaDailyToilet.state().facilities.publicWashroom.receipts.filter(v=>v.actorId===id).length,1);if(!process.env.ROYAL_NEEDS_RESUME)assert(stairs.get(id)>30);}
assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(r.npcs.length,31);assert.equal(scene.state().failures.length,0);console.log(JSON.stringify({status:'PASS',scope:'original Jia, test-only overdue needs and validated observed original 32/12h wage receipts; real main navigation/Three paid original meal, public cubicle and current-post return; simulated DOM/renderer',frames,stairs:[...stairs],seconds:(Date.now()-begun)/1000,maxRSSMiB:process.resourceUsage().maxRSS/1024}));ids['return-world'].onclick();

`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/china-royal-kitchen-needs-main-inherited.cjs'}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
