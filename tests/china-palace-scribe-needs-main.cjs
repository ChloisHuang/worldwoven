// Actual main borrowed meal / public stairs / cubicle / return. Starts from
// the separately verified earned-eight account; only due-needs age is arranged.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function scribeNeedsReview(){return {player,npcs,lot,navOptions,chinaDailyToilet,chinaEdict,chinaTavern,dailyNeeds,scribeAccounts,scribeSlot,saved};} export function scribeNeedsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);} export {blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule((file.endsWith('/game/main.js')?fs.readFileSync(file,'utf8').replace('enableScribeNeeds:false,savedScribeNeeds:saved.chinaScribePersonalNeeds','enableScribeNeeds:true,savedScribeNeeds:saved.chinaScribePersonalNeeds'):fs.readFileSync(file,'utf8'))+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');

const seed=String.raw`
const initial=JSON.parse(fs.readFileSync(process.env.SCRIBE_NEEDS_RESUME||'/tmp/china-scribe-duty-checkpoint.json','utf8'));assert(initial.chinaScribeAccounts.accounts['cn-calligraphy'].bank>=0);
if(!process.env.SCRIBE_NEEDS_RESUME){initial.dailyNeeds.registeredPeople=[...new Set([...initial.dailyNeeds.registeredPeople,'cn-calligraphy'])];initial.dailyNeeds.people['cn-calligraphy']={foodAge:25*60/.7,toiletAge:37*60/.7,receipts:{}};}
storage['worlds-days-v1']=JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));").replace("assert.equal(state().mode,'globe');","assert.equal(state().mode,'lot');");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const r=main.namespace.scribeNeedsReview(),n=r.npcs.find(n=>n.station.id==='cn-calligraphy'),originalIds=r.npcs.map(n=>n.station.id);const startingBank=r.scribeAccounts.account('cn-calligraphy').bank;let stairs=0,frames=0,last='',done=false;
for(;frames<Number(process.env.SCRIBE_NEEDS_STEPS||3500);frames++){
 const before=n.root.position.clone(),wcBefore=r.chinaDailyToilet.actorPose(n),seatBefore=n.serviceMount;now+=200;main.namespace.scribeNeedsStep(.2);
 const wc=r.chinaDailyToilet.actorPose(n),seat=n.serviceMount,mounting=seat&&seat!==seatBefore&&before.distanceTo(new three.namespace.Vector3(...seat.position))<.4,standing=seatBefore&&!seat&&before.distanceTo(new three.namespace.Vector3(...seatBefore.anchor))<.35;
 if(!wcBefore&&!wc)assert(before.distanceTo(n.root.position)<.5||mounting||standing,'continuous original scribe '+JSON.stringify({before:before.toArray(),after:n.root.position.toArray(),task:r.chinaEdict.scribeNeedsState()}));
 if(n.walking&&n.root.position.y>.3&&n.root.position.y<3.9)stairs++;
 if(!seat&&!wc&&frames%30===0)assert(!main.namespace.blocked(n.root.position.x,n.root.position.z,r.lot.colliders,.25,{...r.navOptions,y:n.root.position.y}),'scribe clear of solids '+n.root.position.toArray());
 const task=r.chinaEdict.scribeNeedsState();if(task)assert.equal(r.chinaEdict.state().order,null,'original edict fully returned before trip');const key=task?.phase||'-';if(key!==last||frames%250===0){last=key;console.log(JSON.stringify({frame:frames,task,p:n.root.position.toArray(),balance:r.scribeAccounts.account('cn-calligraphy'),edict:r.chinaEdict.state().order?.stage||null}));events.pagehide();fs.writeFileSync('/tmp/china-scribe-needs-checkpoint.json',storage['worlds-days-v1']);}
 const needs=r.dailyNeeds.snapshot().people['cn-calligraphy'];if(!task&&needs?.receipts?.['china-tavern-meal']&&Object.keys(needs.receipts).some(k=>k.includes('toilet'))){done=true;break;}
}
events.pagehide();fs.writeFileSync('/tmp/china-scribe-needs-checkpoint.json',storage['worlds-days-v1']);const needs=r.dailyNeeds.snapshot().people['cn-calligraphy'];console.log('SCRIBE NEEDS FINAL',JSON.stringify({done,frames,stairs,needs,task:r.chinaEdict.scribeNeedsState(),p:n.root.position.toArray(),account:r.scribeAccounts.account('cn-calligraphy'),transfers:r.scribeAccounts.snapshot().mealTransfers,archery:r.chinaEdict.state()}));assert(done,'real paid meal, public toilet and return');assert(process.env.SCRIBE_NEEDS_RESUME||stairs>10,'original public stairs used');assert.equal(r.scribeAccounts.account('cn-calligraphy').bank,startingBank-(process.env.SCRIBE_NEEDS_RESUME?0:6));assert.equal(r.scribeAccounts.snapshot().mealTransfers.filter(t=>t.kind==='meal-payment').length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),originalIds);assert.equal(r.chinaEdict.scribeNeedsState(),null,'physical return gate released the trip before ordinary idle movement resumed');console.log('PASS real scribe six-copper meal, public stairs/cubicle, return and original identities', {maxRSSMiB:process.resourceUsage().maxRSS/1024});
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.slice(0,harness.indexOf('\nconsole.log(JSON.stringify('))+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
