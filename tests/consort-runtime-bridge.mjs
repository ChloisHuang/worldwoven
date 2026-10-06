import test from 'node:test';
import assert from 'node:assert/strict';
import {createConsortRuntimeBridge,CONSORT_LEDGER_KEY as LK,CONSORT_SERVICE_KEY as SK} from '../source/game/consort-runtime-bridge.js';
import {consortPetitionId,consortPetitionRoll,consortCharterId} from '../source/game/consort-petition-ledger.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const Q={roomId:'consort-reserve-1',bedId:'china-consort-bed-reserve-1',doorId:'cn-consort-reserve-1-door'};
const seed=Array.from({length:100},(_,i)=>i+1).find(n=>consortPetitionRoll(n,consortPetitionId('player',1))<.53);
function fixture(options={}){
  const saved=options.saved?copy(options.saved):{appearance:{seed:options.seed??seed},playerProfile:{ageYears:22},formalCareers:{version:9,tenure:null,lastDuty:null,skills:{ritual:2,art:2}},dailyNeeds:{before:true},worldContinuity:{version:1,activeRegion:'china',regions:{china:{version:1,region:'china',player:{id:'player'},actors:{},controllers:{original:{preserve:true}}}}}};
  const clock={day:1,hour:8,seconds:222,...options.clock},calls={write:0,capture:0,brain:0},flags={fail:false,throw:false,async:false,captureThrow:false,busy:false},writes=[];
  const scene={country:'china',lot:{interiorRooms:[{id:Q.roomId},{id:'residence-suite-corridor'}],doorways:[{id:Q.doorId,rooms:[Q.roomId,'residence-suite-corridor']}]},
    furniture:{items:[{id:Q.bedId,kind:'bed',privateRoomId:Q.roomId,privateOwnerId:null},{id:'original-bed',privateRoomId:'guest',privateOwnerId:'cn-consort-yue'}]},npcs:[{station:{id:'cn-emperor',ageYears:36}}],
    palace:{state:()=>{calls.brain++;return {decisions:{people:{'cn-emperor':{traits:{curiosity:.5,sociability:.5},relations:{},needs:{}}}}};}}};
  let service=null,captureBaseNeeds=saved.dailyNeeds;
  const bridge=createConsortRuntimeBridge({saved,quarters:Q,getScene:()=>scene,getPlayerProfile:()=>saved.playerProfile,getAppearanceScore:()=>50,getConversationCount:()=>2,getCareers:()=>saved.formalCareers,getClock:()=>clock,getService:()=>service,
    captureWorld:()=>{calls.capture++;captureBaseNeeds=saved.dailyNeeds;saved.dailyNeeds={captured:true};saved.worldContinuity={...saved.worldContinuity,regions:{...saved.worldContinuity.regions,china:{...saved.worldContinuity.regions.china,player:{id:'player',capture:calls.capture},controllers:{original:{preserve:true},[SK]:{stale:true}}}}};if(flags.captureThrow){saved.extraTransient='must-rollback';throw Error('capture');}},
    writeWorld:next=>{calls.write++;assert.equal(saved.dailyNeeds,captureBaseNeeds,'capture must be detached before storage is called');if(flags.fail)return false;if(flags.throw)throw Error('storage');if(flags.async)return Promise.resolve(false);writes.push(copy(next));return true;},
    canReleaseTitle:()=>flags.busy?{ok:false,reasons:['royal-meal-in-progress']}:true});
  // The constructor above sees a null service. Wire it only after the ledger exists.
  const physical={version:1,flow:{stage:'idle'},receipts:[]};service={snapshot:()=>copy(physical),verifyReceipt:r=>physical.receipts.some(old=>JSON.stringify(old)===JSON.stringify(r))};
  function record(kind){const id=['submission','invitation'].includes(kind)?consortPetitionId('player',clock.day):bridge.ledger.petition().id;
    const receipt={id:`actual:${kind}:${id}`,kind,applicationId:id,playerId:'player',emperorId:'cn-emperor',heraldId:'cn-palace-herald',targetId:'actual-desk',completed:true,participants:['player','cn-emperor','cn-palace-herald'],at:{day:clock.day,hour:clock.hour}};
    if(kind.startsWith('charter-'))receipt.documentId=consortCharterId(id);physical.receipts.push(copy(receipt));physical.flow.stage=kind;return receipt;
  }
  function act(kind){const r=record(kind),id=r.applicationId;return kind==='submission'?bridge.ledger.submit(r):kind==='audience'?bridge.ledger.reviewAudience(id,r):kind==='charter-handoff'?bridge.ledger.receiveCharter(id,r):bridge.ledger.completeInvestiture(id,r);}
  function advance(complete=true){assert.equal(act('submission').code,'submitted');assert.equal(act('audience').code,'awaiting-choice');assert.equal(bridge.ledger.respond(bridge.ledger.petition().id,'accept').code,'accepted');assert.equal(act('charter-handoff').code,'charter-held');if(complete)assert.equal(act('charter-reading').code,'appointed');}
  return {saved,clock,scene,calls,flags,writes,bridge,physical,record,act,advance,setService:value=>{service=value;}};
}

test('a completed entity event and title ledger enter the same world write before ownership is projected',()=>{
  const f=fixture();assert.equal(f.calls.write,0);f.advance();const last=f.writes.at(-1),a=last[LK].appointment;
  assert.equal(last[SK].receipts.at(-1).id,a.receiptId);assert.deepEqual(last.worldContinuity.regions.china.controllers[SK],last[SK]);assert.deepEqual(last.worldContinuity.regions.china.controllers.original,{preserve:true});
  assert.equal(f.scene.furniture.items[0].privateOwnerId,'player');assert.equal(f.scene.lot.interiorRooms[0].privateOwnerId,'player');assert.equal(f.scene.furniture.items[1].privateOwnerId,'cn-consort-yue');
  assert.deepEqual(last.simulationClock,{version:1,seconds:222});assert.equal(f.bridge.royalMealEligibility().appointmentReceiptId,a.receiptId);assert.equal(f.calls.write,5);
});

test('capture, failed writes and Promise writers leave saved root references, claims and core unchanged; same physical event retries',async()=>{
  for(const mode of ['fail','throw','async','captureThrow']){
    const f=fixture();f.advance(false);const before=copy(f.saved),world=f.saved.worldContinuity,needs=f.saved.dailyNeeds,revision=f.bridge.ledger.state().revision;
    const receipt=f.record('charter-reading');f.flags[mode]=true;assert.equal(f.bridge.ledger.completeInvestiture(receipt.applicationId,receipt).code,'save-failed');
    assert.deepEqual(f.saved,before);assert.equal(f.saved.worldContinuity,world);assert.equal(f.saved.dailyNeeds,needs);assert.equal(f.bridge.ledger.state().revision,revision);assert.equal(f.scene.furniture.items[0].privateOwnerId,null);
    f.flags[mode]=false;f.clock.hour+=.1;assert(f.bridge.ledger.completeInvestiture(receipt.applicationId,receipt).ok);assert.equal(f.scene.furniture.items[0].privateOwnerId,'player');
  }
  await Promise.resolve();
});

test('explicit service commits work without a constructed service and override stale continuity controller snapshots',()=>{
  const f=fixture();f.setService(null);const next={version:1,flow:{stage:'restored'},receipts:[]};assert(f.bridge.commitService(next));
  assert.deepEqual(f.saved[SK],next);assert.deepEqual(f.saved.worldContinuity.regions.china.controllers[SK],next);assert.equal(f.bridge.ledger.state().revision,0);
  const before=copy(f.saved);f.flags.fail=true;assert.equal(f.bridge.commitService({version:1,flow:{stage:'not-persisted'},receipts:[]}),false);assert.deepEqual(f.saved,before);
});

test('title survives region changes and reload; meals and application stay China-only and room projection can precede mount restore',()=>{
  const f=fixture();f.advance();const brainReads=f.calls.brain;
  for(let i=0;i<100;i++)assert(f.bridge.titleStatus().active);assert.equal(f.calls.brain,brainReads,'light title checks never snapshot the emperor brain');
  f.scene.country='france';f.scene.npcs=[];assert(f.bridge.titleStatus().active);assert.equal(f.bridge.statusCard().titleId,'consort');assert.equal(f.bridge.royalMealEligibility().eligible,false);assert.equal(f.bridge.ledger.availability().ok,false);
  const re=fixture({saved:f.saved});re.scene.country='japan';re.scene.npcs=[];assert(re.bridge.titleStatus().active);assert.equal(re.bridge.royalMealEligibility().eligible,false);
  re.scene.country='china';re.scene.npcs=[{station:{id:'cn-emperor',ageYears:36}}];assert.equal(re.scene.furniture.items[0].privateOwnerId,null);assert(re.bridge.projectOwnership().projected);assert.equal(re.scene.furniture.items[0].privateOwnerId,'player');
  re.saved.playerProfile.ageYears=17;assert.equal(re.bridge.titleStatus().active,false);assert.equal(re.bridge.royalMealEligibility().eligible,false);re.bridge.projectOwnership();assert.equal(re.scene.furniture.items[0].privateOwnerId,null);
});

test('resignation waits for real rights to finish, then atomically releases only the player fourth seat and preserves title history',()=>{
  const f=fixture();f.advance();const id=f.bridge.titleStatus().appointmentId,saveCount=f.calls.write;f.flags.busy=true;
  assert.equal(f.bridge.resignTitle(id,{confirmed:true}).code,'royal-meal-in-progress');assert.equal(f.calls.write,saveCount);assert(f.bridge.titleStatus().active);
  f.flags.busy=false;assert.equal(f.bridge.resignTitle(id).code,'explicit-resignation-required');assert.equal(f.calls.write,saveCount);
  assert.equal(f.bridge.resignTitle(id,{confirmed:true}).code,'resigned');assert.equal(f.bridge.titleStatus().active,false);assert.equal(f.scene.furniture.items[0].privateOwnerId,null);assert.equal(f.scene.lot.interiorRooms[0].privateOwnerId,null);
  assert.equal(f.scene.furniture.items[1].privateOwnerId,'cn-consort-yue');assert.equal(f.saved[LK].petitions[0].reading.kind,'charter-reading');assert.equal(f.bridge.royalMealEligibility().appointmentReceiptId,null);
});

test('projection never overwrites other occupants or turns a malformed historical ledger into a new empty one',()=>{
  const f=fixture();f.advance();f.scene.furniture.items[0].privateOwnerId='another-person';assert.equal(f.bridge.projectOwnership().projected,false);assert.equal(f.scene.furniture.items[0].privateOwnerId,'another-person');assert.equal(f.scene.lot.interiorRooms[0].privateOwnerId,null);assert.equal(f.bridge.royalMealEligibility().eligible,false);
  const corrupt=copy(f.saved);corrupt[LK].version=999;const re=fixture({saved:corrupt});assert.equal(re.bridge.ledger.state().loadError,'invalid-consort-state');assert(re.bridge.commitService({version:1,flow:{stage:'idle'},receipts:[]}));assert.equal(re.saved[LK].version,999);assert.equal(re.bridge.titleStatus().active,false);
});

test('invitation and physical receipt share one atomic world write; country round-trip and reconstruction cannot reroll or grant rights',()=>{
 const f=fixture({seed:3}),before=copy(f.saved),receipt=f.record('invitation');f.flags.fail=true;
 assert.equal(f.bridge.ledger.considerInvitation(receipt,'palace-action:cn-emperor:4:hall-rest').code,'save-failed');assert.deepEqual(f.saved,before);assert.equal(f.bridge.ledger.petition(),null);
 f.flags.fail=false;assert(f.bridge.ledger.considerInvitation(receipt,'palace-action:cn-emperor:4:hall-rest').offered);const saved=copy(f.saved),p=f.bridge.ledger.petition();assert.equal(saved[SK].receipts[0].id,p.submission.id);assert.deepEqual(saved.worldContinuity.regions.china.controllers[SK],saved[SK]);assert.equal(f.scene.furniture.items[0].privateOwnerId,null);
 f.scene.country='france';f.scene.npcs=[];assert.equal(f.bridge.ledger.invitationAvailability().ok,false);assert.equal(f.bridge.royalMealEligibility().eligible,false);assert.deepEqual(f.bridge.ledger.petition(),p);
 const re=fixture({saved});re.scene.country='japan';re.scene.npcs=[];assert.equal(re.bridge.ledger.charterRequest(),null);assert.deepEqual(re.bridge.ledger.petition(),p);assert.equal(re.calls.write,0);
 re.scene.country='china';re.scene.npcs=[{station:{id:'cn-emperor',ageYears:17}}];assert.equal(re.bridge.ledger.respond(p.id,'accept').code,'adults-required');re.scene.npcs[0].station.ageYears=36;
 assert(re.bridge.ledger.considerInvitation(receipt,'palace-action:cn-emperor:4:hall-rest').replayed);assert.equal(re.calls.write,0);assert(re.bridge.ledger.respond(p.id,'accept').ok);assert.equal(re.bridge.titleStatus().active,false);assert.equal(re.scene.furniture.items[0].privateOwnerId,null);
});


test('empress and same-day release persist original paper with unchanged consort residence, pay and meal authority',()=>{
 const f=fixture();f.advance();const a=copy(f.bridge.ledger.appointment()),career=copy(f.saved.formalCareers),core=f.bridge.empressLedger;
 for(let day=4;;day++)if(consortPetitionRoll(f.saved.appearance.seed,`empress-petition:player:${day}:appoint:1`)<.3){f.clock.day=day;break;}
 function record(kind,operation){const id=kind==='submission'?core.availability(operation).applicationId:core.petition().id;const r={id:`${id}:${kind}`,kind,applicationId:id,playerId:'player',emperorId:'cn-emperor',heraldId:'cn-palace-herald',targetId:kind==='submission'?'cn-emperor':'cn-consort-public-audience',completed:true,participants:['player','cn-emperor','cn-palace-herald'],at:{day:f.clock.day,hour:f.clock.hour},...(kind.startsWith('charter-')?{documentId:consortCharterId(id)}:{})};f.physical.receipts.push(copy(r));return r;}
 function start(operation){assert(core.submit(record('submission',operation),operation).ok);assert.equal(f.bridge.resignTitle(a.id,{confirmed:true}).code,'finish-empress-affairs');assert(core.reviewAudience(core.petition().id,record('audience')).ok);assert(core.respond(core.petition().id,'accept').ok);assert(core.receiveCharter(core.petition().id,record('charter-handoff')).ok);}
 start('appoint');const reading=record('charter-reading'),before=copy(f.saved);f.flags.fail=true;assert.equal(core.completeInvestiture(core.petition().id,reading).code,'save-failed');assert.deepEqual(f.saved,before);assert.equal(f.bridge.titleStatus().titleId,'consort');f.flags.fail=false;assert(core.completeInvestiture(core.petition().id,reading).ok);assert.equal(f.bridge.titleStatus().titleId,'empress');assert.equal(f.bridge.statusCard().titleId,'empress');assert(f.bridge.royalMealEligibility().eligible);assert.equal(f.scene.furniture.items[0].privateOwnerId,'player');assert.equal(f.saved.empressTitles.appointment.receiptId,reading.id);assert.equal(f.saved[SK].receipts.at(-1).id,reading.id);assert.equal(f.bridge.releaseTitleAvailability().ok,false);
 const re=fixture({saved:f.saved,clock:f.clock});assert.equal(re.bridge.titleStatus().titleId,'empress');re.scene.country='france';re.scene.npcs=[];assert.equal(re.bridge.statusCard().titleId,'empress');assert.equal(re.bridge.royalMealEligibility().eligible,false);
 start('release');assert(core.completeInvestiture(core.petition().id,record('charter-reading')).ok);assert.equal(f.bridge.titleStatus().titleId,'consort');assert(f.bridge.releaseTitleAvailability().ok);assert(f.bridge.royalMealEligibility().eligible);assert.deepEqual(f.bridge.ledger.appointment(),a);assert.deepEqual(f.saved.formalCareers,career);assert.equal(f.scene.furniture.items[0].privateOwnerId,'player');assert.equal(core.availability('appoint').reasons[0],'already-petitioned-today');
 const corrupt=copy(f.saved);corrupt.empressTitles.version=999;const locked=fixture({saved:corrupt});assert.equal(locked.bridge.titleStatus().loadError,'invalid-empress-state');assert(locked.bridge.commitService({version:1,flow:null,receipts:[]}));assert.equal(locked.saved.empressTitles.version,999,'bad historical data is retained for repair');
});
