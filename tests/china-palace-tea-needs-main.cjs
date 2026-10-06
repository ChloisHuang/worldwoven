// Actual main borrowed meal / public stairs / cubicle / return. Starts from
// the separately verified earned-eight account; only due-needs age is arranged.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function teaNeedsReview(){return {player,npcs,lot,navOptions,chinaDailyToilet,chinaTeaService,chinaTeaPersonal,chinaPalace,chinaTavern,dailyNeeds,teaAccounts,teaSlot,saved};} export function teaNeedsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((file.endsWith('/game/main.js')?fs.readFileSync(file,'utf8').replace('const enableTeaNeeds=false','const enableTeaNeeds=true'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');

const seed=String.raw`
const initial=JSON.parse(fs.readFileSync(process.env.TEA_NEEDS_RESUME||'/tmp/china-tea-final-duty-checkpoint.json','utf8'));assert(initial.chinaTeaAccounts.accounts['cn-tea'].bank>=0);
if(!process.env.TEA_NEEDS_RESUME){initial.dailyNeeds.registeredPeople=[...new Set([...initial.dailyNeeds.registeredPeople,'cn-tea'])];initial.dailyNeeds.people['cn-tea']={foodAge:25*60/.7,toiletAge:37*60/.7,receipts:{}};}
storage['worlds-days-v1']=JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,'lot');");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const r=main.namespace.teaNeedsReview(),n=r.npcs.find(n=>n.station.id==='cn-tea'),originalIds=r.npcs.map(n=>n.station.id);const startingBank=r.teaAccounts.account('cn-tea').bank;let stairs=0,frames=0,last='',done=false;
for(;frames<Number(process.env.TEA_NEEDS_STEPS||3500);frames++){
 const before=n.root.position.clone(),wcBefore=r.chinaDailyToilet.actorPose(n),seatBefore=n.serviceMount;now+=200;main.namespace.teaNeedsStep(.2);
 const wc=r.chinaDailyToilet.actorPose(n),seat=n.serviceMount,mounting=seat&&seat!==seatBefore&&before.distanceTo(new three.namespace.Vector3(...seat.position))<.4,standing=seatBefore&&!seat&&before.distanceTo(new three.namespace.Vector3(...seatBefore.anchor))<.35;
 if(!wcBefore&&!wc)assert(before.distanceTo(n.root.position)<.5||mounting||standing,'continuous original tea '+JSON.stringify({before:before.toArray(),after:n.root.position.toArray(),task:r.chinaTeaPersonal?.state()}));
 if(n.walking&&n.root.position.y>.3&&n.root.position.y<3.9)stairs++;
 if(!seat&&!wc&&frames%30===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'tea clear of solids '+n.root.position.toArray());
 const task=r.chinaTeaPersonal?.state();if(task)assert(r.chinaTeaService.handoffBoundary().ok,'original tea service returned before trip');const key=task?.phase||'-';if(key!==last||frames%250===0){last=key;console.log(JSON.stringify({frame:frames,task,p:n.root.position.toArray(),balance:r.teaAccounts.account('cn-tea'),edict:r.chinaTeaService.state().order?.stage||null}));events.pagehide();fs.writeFileSync('/tmp/china-tea-needs-checkpoint.json',storage['worlds-days-v1']);}
 const needs=r.dailyNeeds.snapshot().people['cn-tea'];if(!task&&needs?.receipts?.['china-tavern-meal']&&Object.keys(needs.receipts).some(k=>k.includes('toilet'))){done=true;break;}
}
events.pagehide();fs.writeFileSync('/tmp/china-tea-needs-checkpoint.json',storage['worlds-days-v1']);const needs=r.dailyNeeds.snapshot().people['cn-tea'];console.log('TEA NEEDS FINAL',JSON.stringify({done,frames,stairs,needs,task:r.chinaTeaPersonal?.state(),p:n.root.position.toArray(),account:r.teaAccounts.account('cn-tea'),transfers:r.teaAccounts.snapshot().mealTransfers,archery:r.chinaTeaService.state()}));assert(done,'real paid meal, public toilet and return');assert(process.env.TEA_NEEDS_RESUME||stairs>10,'original public stairs used');assert.equal(r.teaAccounts.account('cn-tea').bank,startingBank-(process.env.TEA_NEEDS_RESUME?0:6));assert.equal(r.teaAccounts.snapshot().mealTransfers.filter(t=>t.kind==='meal-payment').length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(r.chinaTeaPersonal?.state(),null,'physical return gate released the trip before ordinary idle movement resumed');console.log('PASS real tea six-copper meal, public stairs/cubicle, return and original identities', {maxRSSMiB:process.resourceUsage().maxRSS/1024});
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.slice(0,harness.indexOf('\nconsole.log(JSON.stringify('))+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
