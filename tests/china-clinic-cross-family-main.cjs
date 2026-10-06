// Bounded clinic production wiring probe: real prior employer receipts and only the
// departure gate, not a rerun of unchanged long meal/stair/toilet routes.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function guestFundsReview(){return {npcs,chinaClinic,chinaTavern,guestAccounts,clinicNPCEconomy,royalKitchenAccounts,heraldAccounts,saved};} export function guestFundsStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);activeDailyToilet()?.update(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);}`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
const seed=String.raw`
async function loadModule(file){const m=mod(path.join(root,'game/'+file));if(m.status==='unlinked')await m.link(linker);if(m.status==='linked')await m.evaluate();return m.namespace;}
const dutyModule=await loadModule('npc-duty-account.js'),royalModule=await loadModule('china-royal-kitchen-role.js'),formalModule=await loadModule('formal-careers.js'),clinicModule=await loadModule('china-clinic-npc-economy.js'),observerModule=await loadModule('china-clinic-npc-duty.js');
const royalRole=royalModule.ROYAL_KITCHEN_ROLE,doctorRole=formalModule.CLINIC_PHYSICIAN_ROLE,actorId=doctorRole.incumbentId;
const royal=dutyModule.createNPCDutyAccount({role:royalRole,namespace:'chinaRoyalKitchenAccounts',saveState:()=>true}),clinic=clinicModule.createClinicNPCEconomy({saveState:()=>true}),observer=observerModule.createClinicNPCDutyObserver({saveState:()=>true});
for(const [account,role,day,hours] of [[royal,royalRole,1,1.5],[observer,doctorRole,2,1.25]]){const coverage=[{actorId,roleId:role.id,slotId:role.slotId,holderRevision:day}];let t=(day*1440+360-600)/.7,end=t+hours*60/.7;account.observe({seconds:t,dt:.25,coverage});while(t<end){const dt=Math.min(.25,end-t);t+=dt;account.observe({seconds:t,dt,coverage});}if(day===1)assert(account.checkpoint({day,hour:18}));}
const proof=observer.seal({actorId,roleId:doctorRole.id,day:2,currentDay:2,currentHour:18,pendingOrders:false});assert(clinic.settle(proof).ok);assert.equal(royal.account(actorId).bank,4);assert.equal(clinic.account(actorId).bank,3);
const initial=JSON.parse(storage['worlds-days-v1']);initial.chinaRoyalKitchenAccounts=royal.snapshot();initial.chinaClinicNPCEconomy=clinic.snapshot();initial.simulationClock={version:1,seconds:3*1440/.7};initial.dailyNeeds={version:2,registeredPeople:[actorId],people:{[actorId]:{foodAge:25*60/.7,toiletAge:0,receipts:{}}}};storage['worlds-days-v1']=JSON.stringify(initial);
`;
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));",seed+"const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');
const body=String.raw`
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();const r=main.namespace.guestFundsReview(),beforeIds=r.npcs.map(n=>n.station.id);let frames=0;
for(;frames<10;frames++){now+=200;main.namespace.guestFundsStep(.2);if(r.chinaClinic.snapshot().personalNeeds?.task)break;}
const task=r.chinaClinic.snapshot().personalNeeds?.task;assert.equal(task?.actorId,actorId);assert(['draining','go-meal'].includes(task.phase));
if(task.phase==='draining')assert(r.chinaClinic.state().order,'original clinic work gate remains intact');
else{assert(r.chinaClinic.canBorrowMeal(actorId));assert(r.chinaTavern.staffScene.registerClinicPerson(actorId));assert(r.chinaTavern.staffScene.clinicMealAvailable(actorId),'actual main wrapper exposes aggregate7 rather than clinic-only3');}
assert.equal(r.guestAccounts.account(actorId).bank,7);assert.equal(r.royalKitchenAccounts.account(actorId).bank,4);assert.equal(r.clinicNPCEconomy.account(actorId).bank,3);assert.equal(r.heraldAccounts.account('cn-palace-herald').bank,0);assert.deepEqual(r.npcs.map(n=>n.station.id),beforeIds);assert.equal(beforeIds.length,31);events.pagehide();const persisted=JSON.parse(storage['worlds-days-v1']);assert.equal(persisted.chinaGuestMealAccounts.transfers.length,0);assert.equal(persisted.chinaClinicNPCEconomy.accounts[actorId].bank,3);
console.log(JSON.stringify({status:'PASS',scope:'Production main clinic3+former royal4 eligibility at original work gate; live-authorized registry/affordability only, no shortened physical meal route; original clinic wages, herald provider and31 identities retained; simulated DOM/renderer',frames:frames+1,phase:task.phase,maxRSSMiB:process.resourceUsage().maxRSS/1024}));
`;
harness=harness.slice(0,begin)+body+`\n})().catch(e=>{console.error(e);process.exit(1)});`;
new vm.Script(harness,{filename:__filename}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
