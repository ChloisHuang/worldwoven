// Staged-isolated production main: real player/performer/customer rigs, original
// controllers and navigation; simulated DOM/renderer. Original official payroll
// evidence and initial arrival position are fixtures; no natural-demand claim.
// Only player, reception employment, salon, clock and doors step in this probe.
const fs=require('node:fs'),vm=require('node:vm');let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`\nexport function receptionReview(){return {player,formalCareers,careerHandbook,chinaSalonReceptionEmployment,chinaSalonReceptionDuty,npcs,chinaSalon,chinaSalonEmployment,chinaTavern,chinaDailyToilet,receptionSlot,receptionAccounts,chinaSalonEconomy,tavernProperty,guestAccounts,dailyNeeds,simulationClock,chinaOfficialEconomy,copperLedger,saved};} export function receptionStep(dt){beginActorNavigationStep(dt);elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);chinaSalonReceptionEmployment?.update(dt,elapsed);chinaSalon?.update(dt,elapsed);} export function receptionEnter(){travelJourneyUI.close('reception-local-test');return enterRegion('china');} export {save,requestStationIntent,navigateTo};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),").replace('vm.createContext({console,','vm.createContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta:meta=>{meta.url=require("node:url").pathToFileURL(file).href;}}').replace('add(...e){this.append(...e)}','prepend(...els){for(const e of els.reverse()){e.remove?.();e.parent=this;this.children.unshift(e);}}add(...e){this.append(...e)}').replace("const document={body:new E('body'),","const document={head:new E('head'),body:new E('body'),").replace('getBoundingClientRect(){return','getClientRects(){return this.hidden?[]:[this.getBoundingClientRect()]}getBoundingClientRect(){return');
harness=harness.replace("const main=mod(path.join(root,'game/main.js'));", "{const prior=JSON.parse(storage['worlds-days-v1']);const core=mod(path.join(root,'game/formal-careers.js'));await core.link(linker);await core.evaluate();const career=core.namespace.createFormalCareers({getClock:()=>({day:0,hour:10,seconds:0}),saveState:()=>{}}).state();delete career.loadError;delete career.lastError;career.skills.ritual=2;career.skills.writing=1;prior.appearance.seed=3;prior.formalCareers=career;storage['worlds-days-v1']=JSON.stringify(prior);}const main=mod(path.join(root,'game/main.js'));");
const begin=harness.indexOf('const report=[];for(let round=0;');harness=harness.slice(0,begin)+String.raw`
main.namespace.receptionEnter();const r=main.namespace.receptionReview(),e=r.chinaSalonReceptionEmployment,d=r.chinaSalonReceptionDuty,s=r.chinaSalon;
const roster=r.npcs.map(n=>n.station.id),guest=r.npcs.find(n=>n.station.id==='cn-minister-works'),artist=r.npcs.find(n=>n.station.id==='cn-tavern-reciter');assert.equal(roster.length,31);assert(guest&&artist);
r.player.root.position.set(24.15,7.815,7.65);
let frames=0;const checkpoints='qa/salon-reception-player';fs.mkdirSync(checkpoints,{recursive:true});
function receptionTick(n=1){for(let i=0;i<n;i++){now+=100;main.namespace.receptionStep(.1);frames++;}}
function detail(){return JSON.stringify({frames,clock:r.simulationClock.state(),player:r.player.root.position.toArray(),artist:artist.root.position.toArray(),guest:guest.root.position.toArray(),session:s.snapshot().session,returning:s.snapshot().returning,duty:d.state(),job:e.state().job,failures:s.state().failures});}
function until(fn,label,max=1400){for(let i=0;i<max&&!fn();i++)receptionTick();assert(fn(),label+' '+detail());}
function request(kind){const intent=e.intent(kind);assert(intent,'intent '+kind+' '+detail());assert(main.namespace.requestStationIntent(intent),'route '+kind+' '+detail());return intent;}
function checkpoint(name){main.namespace.save();fs.writeFileSync(checkpoints+'/'+name+'.json',storage['worlds-days-v1']);}
assert(e.executeIntent(e.intent('formal-apply')));r.careerHandbook.close();assert(e.executeIntent(e.intent('formal-review')));r.careerHandbook.close();assert(r.formalCareers.isHired('cn-salon-reception'));assert(e.executeIntent(e.intent('accept')));until(()=>r.receptionSlot.state().holderId==='player','physical handoff',100);
// The only arrival fixture: original official already at the counter, with
// real payroll record. All subsequent bodies follow production navigation.

const day=r.simulationClock.state().day,customerId=guest.station.id;
const pay=r.chinaOfficialEconomy.completeDuty({actorId:customerId,day,receiptId:"cn-official-duty:"+customerId+":"+day,evidence:{kind:'office-work',completed:true,actorId:customerId,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}});assert(pay.ok,JSON.stringify(pay));
const customerBefore=r.chinaOfficialEconomy.account(customerId).bank;
request('task:'+d.workIntent(e.state().job.receiptId).key);until(()=>s.receptionAdmissionOpen(),'player actual route to original desk',150);
guest.root.position.set(24.15,7.815,7.65);guest.route=[];guest.walking=false;
let offer=null;until(()=>{offer=s.npcChoices(customerId).find(c=>c.artistId===artist.station.id);return !!offer;},'original paid choice',400);assert(s.requestNPC(customerId,offer.artistId,offer.activity,offer.fee),detail());
const originalId=s.snapshot().session.id,phases=new Set();let lastKey=null,savedReserved=false;
for(let i=0;i<2400&&!d.workReceipts(e.state().job.receiptId).length;i++){
 const w=d.workIntent(e.state().job.receiptId);if(w&&w.key!==lastKey){lastKey=w.key;request('task:'+w.key);console.log('PLAYER_RECEPTION_ACTION',w.key,frames);}
 receptionTick();const session=s.snapshot().session,observed=s.receptionWorkState();if(observed?.observed)phases.add(observed.phase);
 if(session?.payment==='reserved'&&!savedReserved){checkpoint('reserved');savedReserved=true;console.log('PLAYER_RECEPTION_RESERVED',frames);}
 if(i%300===0)console.log('PLAYER_RECEPTION_PROGRESS',detail());
}
const workId=e.state().job.receiptId,receipt=d.workReceipts(workId)[0];assert(receipt,'one original review '+detail());assert.equal(receipt.sessionId,originalId);assert.equal(receipt.proof.amount,0);assert.equal(receipt.proof.contractVersion,2);receptionTick(12);
assert.equal(r.formalCareers.state().skillXP.writing,10);assert.equal(r.receptionAccounts.account('cn-tavern-reception').bank,0);assert.equal(r.chinaOfficialEconomy.account(customerId).bank,customerBefore-offer.fee);assert.equal(r.chinaSalonEconomy.account(artist.station.id).bank,Math.floor(offer.fee/2));assert.deepEqual([...phases].sort(),['close','register','reserve']);
until(()=>s.receptionWorkBoundary(),'artist original return',800);until(()=>e.state().job.coveredSeconds>=65,'nonzero actual attendance',700);checkpoint('finished-order');
const covered=e.state().job.coveredSeconds;request('end-shift');until(()=>e.state().job?.stage==='ready','original NPC retakes post',300);request('claim');until(()=>e.state().job===null,'bank salary inspection',100);
const paid=r.formalCareers.state().lastDuty;assert(paid.wage>0&&paid.wage<=16);assert.equal(paid.completedTasks,1);assert.equal(r.receptionAccounts.account('cn-tavern-reception').bank,0);assert.equal(d.workReceipts(workId).length,1);assert.deepEqual(r.npcs.map(n=>n.station.id),roster);assert.equal(r.formalCareers.state().skillXP.writing,10);checkpoint('paid');
const finalSave=JSON.parse(storage['worlds-days-v1']);assert.equal(finalSave.copperLedger.balances.copper.bank,paid.wage);assert.equal(paid.wage,Math.floor(16*Math.min(1,paid.coveredSeconds*.7/(12*60))+1e-9));assert.equal(finalSave.copperLedger.transactions.filter(x=>x.action==='wage').length,1);assert.equal(finalSave.chinaTavernProperty.events.filter(x=>x.kind==='wage').at(-1).amount,paid.wage);
console.log('PASS isolated production main original paid customer -> actual register/reserve/close/appraisal -> one writing10XP -> original artist share, zero NPC8 -> physical return and positive attendance salary',{frames,covered,wage:paid.wage,fee:offer.fee,proof:receipt.proof,scope:'Initial payroll/arrival staged; actual rigs/navigation; unrelated world routines not advanced; simulated DOM/renderer, no browser/iOS claim'});
})().catch(e=>{console.error(e);process.exit(1)});
`;
vm.runInThisContext('(function(require){'+harness+'\n})',{filename:__filename})(require);
