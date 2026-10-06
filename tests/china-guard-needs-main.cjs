// Actual main borrowed meal / public stairs / cubicle / return. Starts from
// the separately verified earned-six account; only due-needs age is arranged.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function guardNeedsReview(){return {player,npcs,lot,navOptions,chinaDailyToilet,chinaArchery,chinaTavern,dailyNeeds,guardAccounts,guardSlot,saved};} export function guardNeedsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((file.endsWith('/game/main.js')?fs.readFileSync(file,'utf8').replace('enablePersonalNeeds:false,savedPersonalNeeds:saved.chinaGuardPersonalNeeds','enablePersonalNeeds:true,savedPersonalNeeds:saved.chinaGuardPersonalNeeds'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');

const seed=String.raw`
const initial=JSON.parse(fs.readFileSync(process.env.GUARD_NEEDS_RESUME||'/tmp/china-guard-duty-checkpoint.json','utf8'));assert.equal(initial.chinaGuardAccounts.accounts['cn-archery'].bank,process.env.GUARD_NEEDS_RESUME?0:6);
if(!process.env.GUARD_NEEDS_RESUME){initial.dailyNeeds.registeredPeople=[...new Set([...initial.dailyNeeds.registeredPeople,'cn-archery'])];initial.dailyNeeds.people['cn-archery']={foodAge:25*60/.7,toiletAge:37*60/.7,receipts:{}};}
storage['worlds-days-v1']=JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,'lot');");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const r=main.namespace.guardNeedsReview(),n=r.npcs.find(n=>n.station.id==='cn-archery'),originalIds=r.npcs.map(n=>n.station.id);let stairs=0,frames=0,last='',done=false;
for(;frames<Number(process.env.GUARD_NEEDS_STEPS||3500);frames++){
 const before=n.root.position.clone(),wcBefore=r.chinaDailyToilet.actorPose(n),seatBefore=n.serviceMount;now+=200;main.namespace.guardNeedsStep(.2);
 const wc=r.chinaDailyToilet.actorPose(n),seat=n.serviceMount,mounting=seat&&seat!==seatBefore&&before.distanceTo(new three.namespace.Vector3(...seat.position))<.4,standing=seatBefore&&!seat&&before.distanceTo(new three.namespace.Vector3(...seatBefore.anchor))<.35;
 if(!wcBefore&&!wc)assert(before.distanceTo(n.root.position)<.5||mounting||standing,'continuous guard body '+JSON.stringify({before:before.toArray(),after:n.root.position.toArray(),task:r.chinaArchery.personalNeedsState()}));
 if(n.walking&&n.root.position.y>.3&&n.root.position.y<3.9)stairs++;
 if(!seat&&!wc&&frames%30===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'guard clear of solids '+n.root.position.toArray());
 const task=r.chinaArchery.personalNeedsState(),key=task?.phase||'-';if(key!==last||frames%250===0){last=key;console.log(JSON.stringify({frame:frames,task,p:n.root.position.toArray(),balance:r.guardAccounts.account('cn-archery'),archery:r.chinaArchery.state().phase}));events.pagehide();fs.writeFileSync('/tmp/china-guard-needs-checkpoint.json',storage['worlds-days-v1']);}
 const needs=r.dailyNeeds.snapshot().people['cn-archery'];if(!task&&needs?.receipts?.['china-tavern-meal']&&Object.keys(needs.receipts).some(k=>k.includes('toilet'))){done=true;break;}
}
events.pagehide();fs.writeFileSync('/tmp/china-guard-needs-checkpoint.json',storage['worlds-days-v1']);const needs=r.dailyNeeds.snapshot().people['cn-archery'];console.log('GUARD NEEDS FINAL',JSON.stringify({done,frames,stairs,needs,task:r.chinaArchery.personalNeedsState(),p:n.root.position.toArray(),account:r.guardAccounts.account('cn-archery'),transfers:r.guardAccounts.snapshot().mealTransfers,archery:r.chinaArchery.state()}));assert(done,'real paid meal, public toilet and return');assert(process.env.GUARD_NEEDS_RESUME||stairs>10,'original public stairs used');assert.equal(r.guardAccounts.account('cn-archery').bank,0);assert.equal(r.guardAccounts.snapshot().mealTransfers.filter(t=>t.kind==='meal-payment').length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert(Math.hypot(n.root.position.x+17.65,n.root.position.z-18.45)<.2);console.log('PASS real guard six-copper meal, public stairs/cubicle, return and original identities');
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.slice(0,harness.indexOf('\nconsole.log(JSON.stringify('))+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
