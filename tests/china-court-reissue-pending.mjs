// Reproduce an on-site inquiry while the same living herald is socially held.
// The accepted audience is staged; the original frozen contracts come from the
// real controller's zero-time start, then its real interruption. No finished
// work, pay receipt, full route, or simulated day is substituted by this fixture.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
const {createChinaPalaceEdict}=await load('game/china-palace-edict.js');
const {createCourtReports}=await load('game/china-court-reports.js');
const {createNPCPieceworkAccount}=await load('game/npc-piecework-account.js');
const T=await load('vendor/three/build/three.module.js');
const {PALACE_EDICT:{points:P}}=await load('game/china-palace-edict-place.js');
const {PALACE_GARDEN_ROLE:GARDEN}=await load('game/china-palace-garden-role.js');
const {PALACE_SCRIBE_ROLE:SCRIBE}=await load('game/china-palace-scribe-role.js');
const {PALACE_HERALD_ROLE:HERALD}=await load('game/china-palace-herald-role.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const originalDay=4,documentId=`cn-edict-east-shore:${originalDay}`,audienceId=`cn-morning-audience:${originalDay}`;
const contractKeys=['pieceworkContract','scribeContract','heraldContract'];
const contracts=ledger=>Object.fromEntries(contractKeys.map(key=>[key,clone(ledger[key])]));

function fixture(saved={}){
 const actor=(id,position)=>{
  const root=new T.Group();root.position.set(...position);
  const hands=[new T.Group(),new T.Group()];hands.forEach((hand,i)=>{hand.position.set(i?.16:-.16,1,.4);root.add(hand);});root.userData.hands=hands;
  return {station:{id,npcName:id,npcLabel:'original job'},alive:true,root,home:root.position.clone(),route:[],phase:0,breakAt:20,locomotion:{walkSpeed:9},animate(){root.updateWorldMatrix(true,true);}};
 };
 const scribe=actor('cn-calligraphy',P.scribe),herald=actor('cn-palace-herald',P.sealStand),garden=actor('cn-garden',[.8,.295,-18.7]),emperor=actor('cn-emperor',[0,2.049,-8]);
 const holders=Object.fromEntries(Object.entries({scribe,herald,garden}).map(([role,n])=>[role,{status:'npc',actor:n,holderId:n.station.id,revision:0,alive:true,available:true}]));
 let canControlHerald=true,persisted=null,edictWrites=0,day=originalDay,flow;
 const account=(role,namespace,proofKind)=>createNPCPieceworkAccount({role,namespace,proofKind,saveState:()=>assert.fail('this bounded retry test must never settle unfinished work')});
 const accounts=[account(GARDEN,'chinaGardenAccounts','npc-edict-piecework'),account(SCRIBE,'chinaScribeAccounts','npc-edict-draft-piecework'),account(HERALD,'chinaHeraldAccounts','npc-edict-delivery-piecework')];
 const funds=()=>accounts.map(a=>a.snapshot()),initialFunds=clone(funds());
 const args={
  npcs:[scribe,herald,garden,emperor],lot:{group:new T.Group(),colliders:[],walkableSurfaces:[],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40}},
  audience:{state:()=>({phase:'waiting',schedule:{lastCompletedDay:day,completionId:`cn-morning-audience:${day}`,outcome:'completed'}})},
  palace:{requestDuty:()=>assert.fail('retry must not jump ahead to imperial draft approval'),dutyState:()=>null,releaseDuty(){},setDutyLine(){}},
  doors:{cameraColliders:[],routeStep:route=>({waypoint:route[0]})},planPath:(_,point)=>[point],
  moveActor(n,dx,dz){n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:()=>({}),
  resolveGardenAssignment:()=>holders.garden,resolveScribeAssignment:()=>holders.scribe,resolveHeraldAssignment:()=>holders.herald,
  canControlHerald:n=>n===herald&&canControlHerald,
  pieceworkAccounts:accounts[0],scribeAccounts:accounts[1],heraldAccounts:accounts[2],
  saveState:s=>{edictWrites++;persisted=clone(s);return true;}
 };
 const restart=s=>{flow?.dispose({suspend:true});flow=createChinaPalaceEdict({...args,saved:clone(s)});assert(flow);};
 restart(saved);
 return {scribe,herald,garden,emperor,holders,restart,funds,initialFunds,
  get flow(){return flow;},get saved(){return clone(persisted);},get writes(){return edictWrites;},
  socialPause:paused=>{canControlHerald=!paused;},setAudienceDay:value=>{day=value;},
  assertUnpaid(){assert.deepEqual(funds(),initialFunds,'no wage, receipt, or personal balance is fabricated');assert.equal(flow.state().rewards,false);}
 };
}

// Obtain the actual original zero-progress contracts, then interrupt that paper.
const f=fixture();f.flow.update(0,0);
assert.equal(f.flow.state().order.id,documentId);assert.equal(f.flow.state().order.audienceId,audienceId);
assert.equal(f.flow.state().order.stage,'drafting');
const frozenContracts=contracts(f.flow.snapshot().ledger);
assert.equal(frozenContracts.pieceworkContract.actorId,'cn-garden');
assert.equal(frozenContracts.scribeContract.actorId,'cn-calligraphy');
assert.equal(frozenContracts.heraldContract.actorId,'cn-palace-herald');
assert.equal(frozenContracts.heraldContract.emperorId,'cn-emperor');
f.flow.dispose();const interrupted=f.saved;
assert.equal(interrupted.outcome,'interrupted');assert.equal(interrupted.completedReceipt,null);
f.socialPause(true);f.setAudienceDay(originalDay+1);f.restart(interrupted);
assert.equal(f.herald.alive,true,'temporary control loss is not a dead or replaced herald');
assert.equal(f.flow.heraldBinding().available,false);

let reissues=0,reportWrites=0,reports;
reports=createCourtReports({readEdict:()=>f.flow.state(),saveState:()=>{reportWrites++;},reissueEdict:id=>{
 reissues++;assert.equal(id,documentId);
 assert.equal(reports.state().cases[0].result,null,'a candidate inspection result is not adopted before the synchronous reissue succeeds');
 return f.flow.reissueInterrupted(id);
}});
const request=reports.report('works',originalDay+1);
assert.equal(request.action,'inquire');assert.equal(request.sourceEventId,`${documentId}:interrupted`);
assert.equal(reports.inspection(),null,'the source does not authorize its own inquiry');
assert.equal(reports.decide(request.issueId,'inquire','cn-minister-works'),false);
assert.equal(reports.decide(request.issueId,'inquire','cn-emperor'),true);
const job=reports.inspection(),authorized=reports.snapshot();
assert.equal(job.id,request.issueId);assert.equal(job.documentId,documentId);assert.equal(job.place,'传令案');
assert.deepEqual(job.point,[5.35,1.415,-4.05]);
assert.equal(authorized.cases[0].response,'inquire');assert.equal(authorized.cases[0].decidedBy,'cn-emperor');
const pendingEdict=f.flow.snapshot(),writesBeforePause=f.writes,reportWritesBeforePause=reportWrites;
const assertPending=()=>{
 assert.deepEqual(reports.snapshot(),authorized,'failed attempts preserve the exact original case and imperial instruction');
 assert.equal(reports.hasPending(),true);assert.deepEqual(reports.inspection(),job);
 assert.deepEqual(f.flow.snapshot(),pendingEdict,'failed attempts neither activate nor replace the original paper');
 assert.equal(f.flow.state().order,null);assert.equal(f.flow.state().props.documentId,null);assert.equal(f.flow.state().props.scrollCount,0);
 assert.equal(f.flow.state().ledger.outcome,'interrupted');assert.equal(f.flow.state().ledger.completedReceipt,null);
 assert.equal(f.writes,writesBeforePause);assert.equal(reportWrites,reportWritesBeforePause);f.assertUnpaid();
};
for(let i=0;i<3;i++){
 assert.deepEqual(reports.inspection(),job);
 assert.equal(reports.report('works',originalDay+1).issueId,null,'queries reuse the previous instruction');
 assert.equal(reissues,0,'querying or preparing a remote report never requests physical reissue');
}
for(const input of [
 {actorId:'cn-minister-granary',position:job.point},
 {actorId:'cn-emperor',position:job.point},
 {actorId:'cn-minister-works',position:[job.point[0]+.31,job.point[1],job.point[2]]},
 {actorId:'cn-minister-works',position:[job.point[0],job.point[1]+.31,job.point[2]]}
]){
 assert.equal(reports.inspected(job.id,input),false);assert.equal(reissues,0);assertPending();
}
assert.equal(reports.inspected('court-issue-wrong',{actorId:'cn-minister-works',position:job.point}),false);
assert.equal(reissues,0);
for(let attempt=1;attempt<=3;attempt++){
 assert.equal(reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point}),false,'the actual controller rejects a socially unavailable original herald');
 assert.equal(reissues,attempt);assertPending();
}

// Existing edict API guards remain authoritative while the same case is pending.
f.socialPause(false);
const rejectsOriginal=label=>{
 const before=f.flow.snapshot(),writes=f.writes;
 assert.equal(f.flow.reissueInterrupted(documentId),false,label);
 assert.deepEqual(f.flow.snapshot(),before,label);assert.equal(f.writes,writes,label);
 assert.deepEqual(reports.snapshot(),authorized);f.assertUnpaid();
};
assert.equal(f.flow.reissueInterrupted('cn-edict-east-shore:999'),false,'a different number cannot use this inquiry');
for(const role of ['herald','scribe','garden']){
 const original=f.holders[role];
 for(const patch of [{actor:f.emperor},{holderId:'cn-wrong-holder'},{revision:original.revision+1}]){
  f.holders[role]={...original,...patch};rejectsOriginal(`${role}: original actor and holder revision remain required`);
 }
 f.holders[role]=original;
}
f.emperor.alive=false;rejectsOriginal('the original emperor must still be alive');f.emperor.alive=true;
assert.equal(reissues,3,'direct authority guards and restoration do not silently revisit the court case');

// Restored control accepts the same physical point and the original approval.
assert.equal(reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point}),true);
assert.equal(reissues,4);assert.equal(reportWrites,reportWritesBeforePause+1);
const accepted=reports.snapshot(),result=accepted.cases[0].result;
assert.equal(accepted.cases.length,1);assert.equal(accepted.sequence,authorized.sequence);
assert.equal(accepted.cases[0].id,job.id);assert.equal(accepted.cases[0].response,'inquire');assert.equal(accepted.cases[0].decidedBy,'cn-emperor');
assert.deepEqual(accepted.cases[0].source,authorized.cases[0].source);
assert.equal(result.id,`court-inspection:${job.id}`);assert.equal(result.recoveryRequested,true);
assert.deepEqual(result.position,job.point);assert.equal(result.source.eventId,`${documentId}:interrupted`);
assert.equal(result.reportedDay,undefined);assert.equal(result.received,undefined);
assert.equal(f.flow.state().order.id,documentId);assert.equal(f.flow.state().order.audienceId,audienceId);
assert.equal(f.flow.state().order.reissued,true);assert.equal(f.flow.state().ledger.outcome,'active');
assert.equal(f.flow.state().ledger.consumedThroughDay,originalDay+1);assert.equal(f.flow.state().ledger.completedReceipt,null);
assert.deepEqual(contracts(f.flow.snapshot().ledger),frozenContracts);
assert.deepEqual(f.flow.state().order.piecework,frozenContracts.pieceworkContract);
assert.deepEqual(f.flow.state().order.scribePiecework,frozenContracts.scribeContract);
assert.deepEqual(f.flow.state().order.heraldPiecework,frozenContracts.heraldContract);
f.flow.update(0,0);
assert.equal(f.flow.state().props.documentId,documentId);assert.equal(f.flow.state().props.scrollCount,1);
const active=f.flow.snapshot(),writesAfterStart=f.writes;
for(let i=0;i<3;i++){
 assert.equal(reports.inspection(),null);
 assert.equal(reports.inspected(job.id,{actorId:'cn-minister-works',position:job.point}),false);
 assert.equal(f.flow.reissueInterrupted(documentId),false);
 assert.equal(reissues,4);assert.deepEqual(reports.snapshot(),accepted);assert.deepEqual(f.flow.snapshot(),active);
}
assert.equal(f.writes,writesAfterStart);assert.equal(f.flow.state().history.filter(e=>e.event==='reissued-after-inquiry').length,1);
f.assertUnpaid();f.flow.dispose({suspend:true});

// A saved contract mismatch cannot become permission to rewrite its participants
// or price. The matching real original contracts succeeded in the path above.
for(const [key,mutate] of [
 ['pieceworkContract',c=>{c.amount++;}],
 ['scribeContract',c=>{c.documentId='cn-edict-east-shore:999';}],
 ['heraldContract',c=>{c.authorId='cn-wrong-author';}]
]){
 const bad=clone(interrupted);mutate(bad[key]);const mismatch=fixture(bad),before=mismatch.flow.snapshot(),writes=mismatch.writes;
 assert.equal(mismatch.flow.reissueInterrupted(documentId),false,`${key}: original strict contract guard`);
 assert.deepEqual(mismatch.flow.snapshot(),before);assert.equal(mismatch.writes,writes);assert.equal(mismatch.flow.state().order,null);
 assert.deepEqual(contracts(mismatch.flow.snapshot().ledger),contracts(bad));mismatch.assertUnpaid();mismatch.flow.dispose({suspend:true});
}

// Explicit historical input: older code stored a false recovery result. Loading
// it preserves that finding and the emperor's inquiry, but cannot retry remotely.
const legacySaved=clone(authorized),historicalResult={id:`court-inspection:${job.id}`,actorId:'cn-minister-works',position:job.point.slice(),place:job.place,source:clone(authorized.cases[0].source),recoveryRequested:false,reportedDay:originalDay+1};
legacySaved.cases[0].result=clone(historicalResult);
const legacyFixture=fixture(interrupted);legacyFixture.socialPause(true);
let legacyReissues=0;
const legacy=createCourtReports({saved:legacySaved,readEdict:()=>legacyFixture.flow.state(),reissueEdict:id=>{legacyReissues++;return legacyFixture.flow.reissueInterrupted(id);}});
const migrated=legacy.snapshot(),legacyCase=migrated.cases[0];
assert.equal(legacyReissues,0);assert.equal(legacyCase.id,job.id);assert.equal(legacyCase.response,'inquire');assert.equal(legacyCase.decidedBy,'cn-emperor');
assert.deepEqual(legacyCase.previousResult,historicalResult);assert.deepEqual(legacyCase.source,authorized.cases[0].source);assert.equal(legacyCase.result,null);
assert.equal(legacy.hasPending(),true);assert.deepEqual(legacy.inspection(),job);assert.deepEqual(legacy.inspection(),job);assert.equal(legacyReissues,0);
assert.equal(legacy.inspected(job.id,{actorId:'cn-minister-works',position:job.point}),false);
assert.equal(legacyReissues,1);assert.deepEqual(legacy.snapshot(),migrated);assert.equal(legacyFixture.flow.state().order,null);
legacyFixture.socialPause(false);
assert.equal(legacy.inspected(job.id,{actorId:'cn-minister-works',position:job.point}),true);
assert.equal(legacyReissues,2);assert.deepEqual(legacy.snapshot().cases[0].previousResult,historicalResult);
assert.equal(legacy.snapshot().cases[0].response,'inquire');assert.equal(legacy.snapshot().cases[0].decidedBy,'cn-emperor');
assert.equal(legacyFixture.flow.state().order.id,documentId);assert.equal(legacyFixture.flow.state().order.audienceId,audienceId);
assert.deepEqual(contracts(legacyFixture.flow.snapshot().ledger),frozenContracts);legacyFixture.assertUnpaid();legacyFixture.flow.dispose({suspend:true});
console.log('PASS actual edict/court on-site retry after temporary herald control loss, pending original case and emperor inquiry, remote/actor/distance/holder/contract guards, same-paper single reissue, unchanged unpaid contracts, and historical false-result migration; zero-time lightweight Three fixture, not route/day or wage completion evidence');
