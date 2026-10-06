import test from 'node:test';
import assert from 'node:assert/strict';
import {createConsortPetitionLedger,consortPetitionId,consortCharterId,consortPetitionRoll,consortReviewFactors,CONSORT_INCUMBENTS,CONSORT_SEAT_ID} from '../source/game/consort-petition-ledger.js';
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(options={}){
  const clock={day:1,hour:8},player={id:'player',ageYears:22,appearanceScore:50,traits:{}},emperor={id:'cn-emperor',ageYears:36,traits:{curiosity:.5,sociability:.5},relations:{},opinions:{},needs:{}},career={version:9,tenure:null,lastDuty:null,skills:{ritual:2,art:2},applications:{untouched:true},officialCareer:{untouched:true}},
    court={emperorId:'cn-emperor',empressId:null,consorts:copy(CONSORT_INCUMBENTS)},vacancy={slotId:CONSORT_SEAT_ID,roomId:'consort-reserve-1',bedId:'china-consort-bed-reserve-1',roomExists:true,bedExists:true,accessible:true,roomOwnerId:null,bedOwnerId:null},
    saved={value:options.saved?copy(options.saved):undefined},calls={save:0,verify:0},flags={fail:false,throw:false,async:false,verify:true},evidence=new Map();
  Object.assign(clock,options.clock);Object.assign(player,options.player);Object.assign(emperor,options.emperor);Object.assign(career,options.career);Object.assign(court,options.court);Object.assign(vacancy,options.vacancy);
  const deps={saved:saved.value,worldSeed:options.seed??1,saveState:next=>{calls.save++;if(flags.fail)return false;if(flags.throw)throw Error('storage full');if(flags.async)return Promise.resolve(false);saved.value=copy(next);return true;},getClock:()=>clock,getPlayer:()=>player,getEmperor:()=>emperor,getCourt:()=>court,getVacancy:()=>vacancy,getCareers:()=>career,verifyReceipt:r=>{calls.verify++;return flags.verify&&evidence.has(r.id)&&JSON.stringify(evidence.get(r.id))===JSON.stringify(r);}};
  const core=createConsortPetitionLedger({...deps,...options.deps});
  function receipt(kind,id=kind==='submission'?consortPetitionId('player',clock.day):core.petition()?.id||consortPetitionId('player',clock.day)){
    const r={id:`physical:${kind}:${id}`,kind,applicationId:id,playerId:player.id,emperorId:emperor.id,heraldId:options.heraldId||'cn-palace-herald',...(options.heraldRevision===undefined?{}:{heraldRevision:options.heraldRevision}),targetId:'cn-consort-petition-desk',completed:true,participants:kind==='submission'||kind==='charter-handoff'?['player',options.heraldId||'cn-palace-herald']:['player','cn-emperor',options.heraldId||'cn-palace-herald'],at:copy(clock)};
    if(kind.startsWith('charter-'))r.documentId=consortCharterId(id);
    evidence.set(r.id,copy(r));return r;
  }
  const f={core,clock,player,emperor,career,court,vacancy,saved,calls,flags,evidence,receipt,deps};
  f.submit=()=>core.submit(receipt('submission'));
  f.review=()=>core.reviewAudience(core.petition().id,receipt('audience'));
  f.accept=()=>core.respond(core.petition().id,'accept');
  f.handoff=()=>core.receiveCharter(core.petition().id,receipt('charter-handoff'));
  f.read=()=>core.completeInvestiture(core.petition().id,receipt('charter-reading'));
  return f;
}
function seedFor(passed){for(let seed=1;seed<1000;seed++)if((consortPetitionRoll(seed,consortPetitionId('player',1))<.53)===passed)return seed;throw Error('seed not found');}
const GOOD=seedFor(true),BAD=seedFor(false);
function advance(f,through='charter-held'){
  assert.equal(f.submit().code,'submitted');if(through==='submitted')return;
  assert.equal(f.review().code,'awaiting-choice');if(through==='awaiting-choice')return;
  assert.equal(f.accept().code,'accepted');if(through==='accepted')return;
  assert.equal(f.handoff().code,'charter-held');if(through==='charter-held')return;
  assert.equal(f.read().code,'appointed');
}

test('physical adult petition, audience, explicit choice, handoff and reading commit one independent identity and room/bed claim',()=>{
  const f=fixture({seed:GOOD}),originalCareer=copy(f.career),originalCourt=copy(f.court);
  assert.equal(f.core.charterRequest(),null);advance(f);
  assert.equal(f.core.state().appointment,null);assert.equal(f.core.residenceFor(),null);assert.equal(f.core.royalMealEligibility().eligible,false);
  const held=f.core.petition();assert.equal(f.core.charterRequest().documentId,consortCharterId(held.id));
  assert.equal(f.read().code,'appointed');const a=f.core.state().appointment;
  assert.equal(a.titleId,'consort');assert.equal(a.residence.slotId,CONSORT_SEAT_ID);assert.equal(a.residence.roomId,'consort-reserve-1');assert.equal(a.residence.bedId,'china-consort-bed-reserve-1');
  assert.equal(f.core.royalMealEligibility().eligible,true);assert.equal(f.core.statusCard().identity,'妃嫔');assert.equal(f.core.statusCard().primaryAction.id,'resign-title');
  assert.deepEqual(f.career,originalCareer);assert.deepEqual(f.court,originalCourt);assert.equal(f.calls.save,5);
});

test('menus are read-only; the submitted fixed draw and per-day limit survive withdrawal and reload',()=>{
  const f=fixture({seed:GOOD});for(let i=0;i<4;i++){f.core.availability();f.core.statusCard();f.core.royalMealEligibility();}assert.equal(f.calls.save,0);assert.equal(f.calls.verify,0);
  assert(f.submit().ok);const id=f.core.petition().id,roll=f.core.petition().roll;assert.equal(f.core.availability().ok,false);assert.equal(f.submit().replayed,true);
  assert(f.core.withdraw(id).ok);assert.equal(f.core.availability().reasons.includes('already-petitioned-today'),true);
  const re=fixture({seed:GOOD,saved:f.saved.value});assert.equal(re.core.state().loadError,null);assert.equal(re.core.petition().roll,roll);assert.equal(re.core.availability().ok,false);
  re.clock.day=2;assert(re.submit().ok);assert.notEqual(re.core.petition().id,id);assert.equal(re.core.history().length,2);assert.equal(re.core.history()[0].stage,'withdrawn');
});

test('a rejected audience has a durable reason, no document, no title and no outcome reroll',()=>{
  const f=fixture({seed:BAD});assert(f.submit().ok);assert.equal(f.review().code,'rejected');const record=copy(f.core.petition()),saveCalls=f.calls.save;
  f.career.skills={ritual:100,art:100};f.player.appearanceScore=100;f.emperor.relations.player=1;
  assert.equal(f.review().replayed,true);assert.deepEqual(f.core.petition(),record);assert.equal(f.calls.save,saveCalls);assert(record.review.reasons.includes('review-not-selected'));
  assert.equal(f.core.state().appointment,null);assert.equal(f.core.charterRequest(),null);assert.equal(f.handoff().code,'wrong-petition-stage');
  const re=fixture({seed:BAD,saved:f.saved.value});assert.deepEqual(re.core.petition(),record);assert.equal(re.core.state().loadError,null);
});

test('approval can be declined independently without granting anything or consuming a room',()=>{
  const f=fixture({seed:GOOD});advance(f,'awaiting-choice');assert.equal(f.core.respond(f.core.petition().id,'decline').code,'declined');
  assert.equal(f.core.residenceFor(),null);assert.equal(f.core.royalMealEligibility().eligible,false);assert.equal(f.core.state().appointment,null);assert.equal(f.core.charterRequest(),null);assert.equal(f.vacancy.roomOwnerId,null);
  assert.equal(f.core.respond(f.core.petition().id,'decline').replayed,true);assert.equal(f.accept().code,'choice-already-recorded');assert.equal(fixture({seed:GOOD,saved:f.saved.value}).core.state().loadError,null);
});

test('missing physical adapters, arbitrary completed flags, chat events, stale IDs and wrong charter cannot fabricate progress',()=>{
  const unconnected=fixture({seed:GOOD,deps:{getVacancy:undefined,verifyReceipt:undefined}});assert.equal(unconnected.submit().code,'real-residence-required');
  const f=fixture({seed:GOOD}),r=f.receipt('submission');f.evidence.clear();assert.equal(f.core.submit(r).code,'physical-submission-required');assert.equal(f.calls.save,0);
  assert(f.submit().ok);const id=f.core.petition().id;
  assert.equal(f.core.reviewAudience('stale',f.receipt('audience')).code,'stale-petition');
  const missingEmperor=f.receipt('audience');missingEmperor.participants=['player','cn-palace-herald'];assert.equal(f.core.reviewAudience(id,missingEmperor).code,'physical-audience-required');
  const chat=f.receipt('audience');chat.kind='conversation';assert.equal(f.core.reviewAudience(id,chat).code,'physical-audience-required');
  assert.equal(f.accept().code,'wrong-petition-stage');assert(f.review().ok);assert.equal(f.core.respond(id,true).code,'explicit-choice-required');assert(f.accept().ok);
  const wrong=f.receipt('charter-handoff');wrong.documentId='another-paper';assert.equal(f.core.receiveCharter(id,wrong).code,'physical-charter-required');
  assert.equal(f.read().code,'wrong-petition-stage');assert(f.handoff().ok);const missingWitness=f.receipt('charter-reading');missingWitness.participants=['player'];assert.equal(f.core.completeInvestiture(id,missingWitness).code,'physical-reading-required');
  assert.equal(f.core.state().appointment,null);
});

test('both ages are enforced on submission, audience, acceptance, paper receipt, investiture and loaded entitlement',()=>{
  for(const actor of ['player','emperor'])for(const age of [17,undefined,NaN]){
    const f=fixture({seed:GOOD});f[actor].ageYears=age;assert.equal(f.submit().code,'adults-required');assert.equal(f.calls.save,0);
  }
  const stages=[['submitted','review'],['awaiting-choice','accept'],['accepted','handoff'],['charter-held','read']];
  for(const actor of ['player','emperor'])for(const [stage,method]of stages){
    const f=fixture({seed:GOOD});advance(f,stage);f[actor].ageYears=17;const before=copy(f.saved.value);assert.equal(f[method]().code,'adults-required');assert.deepEqual(f.saved.value,before);
    const re=fixture({seed:GOOD,saved:f.saved.value,[actor]:{ageYears:17}});assert.equal(re.core.state().loadError,null);assert.equal(re.core.royalMealEligibility().eligible,false);assert.equal(re.core.charterRequest(),null);
  }
  const appointed=fixture({seed:GOOD});advance(appointed,'appointed');const re=fixture({seed:GOOD,saved:appointed.saved.value,player:{ageYears:17}});
  assert.equal(re.core.royalMealEligibility().eligible,false);assert.equal(re.core.residenceFor(),null);assert.equal(re.core.statusCard().titleId,null);assert.equal(re.read().code,'adults-required');
});

test('finite fourth seat protects all three original residents and emperor bed; changing occupancy blocks every grant boundary',()=>{
  for(const vacancy of [
    {roomExists:false},{bedExists:false},{accessible:false},{roomOwnerId:'other'},{bedOwnerId:'other'},
    {roomId:'guest'},{bedId:'china-consort-bed-heng'},{roomId:'bedroom'},{bedId:'china-furniture-bed-0'},
  ]){const f=fixture({seed:GOOD,vacancy});assert.equal(f.submit().ok,false);assert.equal(f.calls.save,0);}
  const full=fixture({seed:GOOD});full.court.consorts.push({actorId:'other',roomId:'elsewhere',bedId:'other-bed'});assert.equal(full.submit().code,'no-consort-vacancy');
  for(const [stage,method]of [['submitted','review'],['awaiting-choice','accept'],['accepted','handoff'],['charter-held','read']]){
    const f=fixture({seed:GOOD});advance(f,stage);f.vacancy.bedOwnerId='other';assert.equal(f[method]().code,'residence-occupied');assert.equal(f.core.state().appointment,null);
  }
  const clash=fixture({seed:GOOD});clash.court.empressId='cn-emperor';assert.equal(clash.submit().code,'court-registry-conflict');
  const changed=fixture({seed:GOOD});advance(changed,'charter-held');changed.vacancy.roomId='different-room';assert.equal(changed.read().code,'residence-changed');
});

test('an employed adult can petition; acceptance and investiture never clear duty, wages, tenure, applications or history',()=>{
  const f=fixture({seed:GOOD,career:{tenure:{roleId:'cn-court-clerk'},lastDuty:{stage:'working'}}}),initial=copy(f.career);advance(f,'awaiting-choice');
  assert.deepEqual(f.accept().reasons,['finish-current-duty','leave-formal-career']);assert.deepEqual(f.core.statusCard().blockers.map(b=>b.code),['finish-current-duty','leave-formal-career']);assert.deepEqual(f.career,initial);
  f.career.lastDuty.stage='ready';assert.deepEqual(f.accept().reasons,['settle-current-wages','leave-formal-career']);
  f.career.lastDuty.stage='paid';assert.deepEqual(f.accept().reasons,['leave-formal-career']);f.career.tenure=null;assert(f.accept().ok);assert(f.handoff().ok);
  f.career.tenure={roleId:'another-real-job'};assert.equal(f.read().code,'leave-formal-career');assert.equal(f.core.state().appointment,null);
  f.career.tenure=null;assert(f.read().ok);assert.deepEqual(f.career.applications,initial.applications);assert.deepEqual(f.career.officialCareer,initial.officialCareer);
});

test('synchronous failure at every mutation leaves the previous durable state intact and allows an identical retry',async()=>{
  for(const mode of ['fail','throw','async'])for(const [stage,method]of [[null,'submit'],['submitted','review'],['awaiting-choice','accept'],['accepted','handoff'],['charter-held','read']]){
    const f=fixture({seed:GOOD});if(stage)advance(f,stage);const before=copy(f.core.state()),persisted=f.saved.value&&copy(f.saved.value);f.flags[mode]=true;
    assert.equal(f[method]().ok,false);const after=f.core.state();delete before.lastError;delete after.lastError;assert.deepEqual(after,before);assert.deepEqual(f.saved.value,persisted);
    f.flags[mode]=false;assert(f[method]().ok);assert.equal(fixture({seed:GOOD,saved:f.saved.value}).core.state().loadError,null);
  }
  await Promise.resolve();
});

test('each durable stage reloads, final duplicate receipt is idempotent and conflicting duplicates fail',()=>{
  const f=fixture({seed:GOOD});advance(f,'appointed');f.vacancy.roomOwnerId='player';f.vacancy.bedOwnerId='player';f.court.consorts.push({actorId:'player',roomId:f.vacancy.roomId,bedId:f.vacancy.bedId});
  const before=copy(f.saved.value),count=f.calls.save;assert.equal(f.read().replayed,true);assert.equal(f.calls.save,count);assert.deepEqual(f.saved.value,before);
  const re=fixture({seed:GOOD,saved:f.saved.value,vacancy:f.vacancy,court:f.court});assert.equal(re.core.state().loadError,null);assert.equal(re.core.royalMealEligibility().eligible,true);assert.equal(re.read().replayed,true);assert.equal(re.calls.save,0);
  const reordered=Object.fromEntries(Object.entries(re.receipt('charter-reading')).reverse());reordered.at={hour:re.clock.hour,day:re.clock.day};reordered.participants.reverse();
  assert.equal(re.core.completeInvestiture(re.core.petition().id,reordered).replayed,true);assert.equal(re.calls.save,0);
  const forged=re.receipt('charter-reading');forged.targetId='different-target';assert.equal(re.core.completeInvestiture(re.core.petition().id,forged).code,'receipt-conflict');
  assert.equal(re.core.availability().ok,false);assert.equal(re.core.withdraw(re.core.petition().id).code,'wrong-petition-stage');
});

test('malformed or underage historical saves fail closed without deleting data or granting entitlements',()=>{
  const f=fixture({seed:GOOD});advance(f,'appointed');
  for(const mutate of [
    s=>s.appointment.residence.bedId='stolen',s=>s.petitions[0].ages.submitted.player=17,s=>s.petitions[0].ages.reviewed.emperor=17,
    s=>s.petitions[0].roll=.999999,s=>s.petitions[0].review.chance=1,s=>s.petitions[0].submission=null,s=>s.petitions[0].handoff=null,
    s=>s.petitions[0].reading.documentId='other',s=>s.petitions[0].choice.value='decline',s=>s.petitions.push(copy(s.petitions[0])),
    s=>s.worldSeed+=1,s=>s.appointment.titleId='empress',s=>s.appointment=null,
  ]){const bad=copy(f.saved.value);mutate(bad);const re=fixture({seed:GOOD,saved:bad});assert.equal(re.core.state().loadError,'invalid-consort-state');assert.equal(re.core.availability().ok,false);assert.equal(re.core.royalMealEligibility().eligible,false);assert.equal(re.submit().ok,false);assert.equal(re.calls.save,0);assert.deepEqual(re.saved.value,bad);}
});

test('review uses multiple existing factors, missing relations are neutral and skin, culture and gender are ignored',()=>{
  const f=fixture({seed:GOOD});const baseline=consortReviewFactors({player:f.player,emperor:f.emperor,skills:f.career.skills});assert.equal(baseline.relationship,0);assert.equal(baseline.personality,0);
  const altered=consortReviewFactors({player:{...f.player,skin:0x000000,culture:'egypt',gender:'female'},emperor:f.emperor,skills:f.career.skills});assert.deepEqual(altered,baseline);
  const bright=consortReviewFactors({player:{...f.player,appearanceScore:100},emperor:f.emperor,skills:f.career.skills});assert.equal(bright.appearance,.04);
  const skilled=consortReviewFactors({player:f.player,emperor:f.emperor,skills:{ritual:6,art:6}});assert(skilled.ritual+skilled.art>bright.appearance);
  advance(f,'awaiting-choice');assert.equal(f.core.petition().review.relationshipKnown,false);assert.deepEqual(f.emperor.relations,{});
});

test('backward simulation time cannot reset daily limits or finish an old event',()=>{
  const f=fixture({seed:GOOD});advance(f,'charter-held');f.clock.day=0;assert.equal(f.read().code,'invalid-clock');assert.equal(f.core.availability().ok,false);assert.equal(f.core.state().appointment,null);
});

// The scene keeps its actual finished event checkpoint while storage retries.
// A newer simulation tick must not force a new paper/event or change its time.
test('completed physical checkpoints can retry after time advances without changing their stable receipt',()=>{
  for(const [stage,kind,method]of [[null,'submission','submit'],['submitted','audience','reviewAudience'],['accepted','charter-handoff','receiveCharter'],['charter-held','charter-reading','completeInvestiture']]){
    const f=fixture({seed:GOOD});if(stage)advance(f,stage);const receipt=f.receipt(kind),id=receipt.applicationId;f.flags.fail=true;
    const call=()=>method==='submit'?f.core.submit(receipt):f.core[method](id,receipt);assert.equal(call().code,'save-failed');
    f.flags.fail=false;f.clock.hour+=.1;assert(call().ok);assert.equal(fixture({seed:GOOD,saved:f.saved.value,clock:f.clock}).core.state().loadError,null);
  }
  const f=fixture({seed:GOOD});advance(f,'awaiting-choice');f.clock.hour=9;assert(f.accept().ok);const receipt=f.receipt('charter-handoff');receipt.at.hour=8;f.evidence.set(receipt.id,copy(receipt));
  assert.equal(f.core.receiveCharter(f.core.petition().id,receipt).code,'physical-charter-required');
});

test('voluntary title resignation preserves the witnessed history, releases only the fourth claim and locks the resignation day',()=>{
  const f=fixture({seed:GOOD});advance(f,'appointed');const id=f.core.state().appointment.id,career=copy(f.career),court=copy(f.court);
  assert.equal(f.core.titleStatus().active,true);assert.equal(f.core.royalMealEligibility().appointmentReceiptId,f.core.petition().reading.id);
  assert.equal(f.core.resignTitle(id).code,'explicit-resignation-required');assert.equal(f.core.resignTitle('wrong',{confirmed:true}).code,'stale-appointment');
  f.clock.day=2;f.flags.fail=true;assert.equal(f.core.resignTitle(id,{confirmed:true}).code,'save-failed');assert(f.core.titleStatus().active);f.flags.fail=false;
  assert.equal(f.core.resignTitle(id,{confirmed:true}).code,'resigned');assert.equal(f.core.resignTitle(id,{confirmed:true}).replayed,true);
  assert.equal(f.core.titleStatus().active,false);assert.equal(f.core.state().appointment,null);assert.equal(f.core.petition().reading.kind,'charter-reading');assert.equal(f.core.history().length,1);
  assert.equal(f.core.availability().reasons.includes('already-petitioned-today'),true);assert.deepEqual(f.career,career);assert.deepEqual(f.court,court);
  const re=fixture({seed:GOOD,saved:f.saved.value,clock:{day:2,hour:8}});assert.equal(re.core.state().loadError,null);assert.equal(re.core.availability().ok,false);re.clock.day=3;assert(re.submit().ok);assert.equal(re.core.history()[0].stage,'resigned');
});

// New invitation regressions: a physical initiative shares the adult/title
// ledger without inventing a submission or bypassing the existing paper chain.
function invitationFixture(options={}){
  let seed=1;while(consortPetitionRoll(seed,consortPetitionId('player',1))>=.4)seed++;
  const f=fixture({seed,...options});f.invite=()=>{const r=f.receipt('invitation');r.participants=['player','cn-emperor'];f.evidence.set(r.id,copy(r));return f.core.considerInvitation(r,'palace-action:cn-emperor:1:garden');};return f;
}
test('emperor physical initiative reaches explicit choice once, restores, and uses the existing same-paper handoff',()=>{
 const f=invitationFixture();assert.equal(f.invite().code,'invited');const p=f.core.petition();assert.equal(p.source,'emperor-invitation');assert.equal(p.stage,'awaiting-choice');assert.equal(p.submission.kind,'invitation');assert.equal(p.audience,null);assert.equal(f.core.appointment(),null);assert.equal(f.core.residenceFor(),null);assert.equal(f.core.availability().ok,false);
 const revision=f.core.state().revision;assert(f.invite().replayed);assert.equal(f.core.state().revision,revision);
 const re=invitationFixture({saved:f.saved.value});assert.equal(re.core.state().loadError,null);assert.deepEqual(re.core.petition(),p);assert.equal(re.invite().replayed,true);
 assert(f.accept().ok);f.clock.hour=12;assert(f.accept().replayed,'accepted invitation remains idempotent beyond reply deadline');assert(f.handoff().ok);assert(f.read().ok);assert.equal(f.core.appointment().receiptId,f.core.petition().reading.id);assert.equal(f.core.petition().handoff.documentId,consortCharterId(p.id));
});
test('initiative is neutral to global shape score and protected traits, but uses real known relations, needs and bounded individual preferences',()=>{
 const a=invitationFixture({player:{appearanceScore:0,skin:'dark',gender:'male',ethnicity:'A'}}),b=invitationFixture({player:{appearanceScore:100,skin:'light',gender:'female',ethnicity:'B'}});assert(a.invite().ok&&b.invite().ok);assert.deepEqual(a.core.petition().review,b.core.petition().review);assert.equal(a.core.petition().review.factors.appearance,0);
 const known=invitationFixture({emperor:{relations:{player:.8},needs:{fatigue:.3}},deps:{getReviewContext:()=>({appearancePreference:.5})}});assert(known.invite().ok);assert(known.core.petition().review.relationshipKnown);assert(known.core.petition().review.factors.relationship>0);assert(known.core.petition().review.factors.circumstances<0);assert.equal(known.core.petition().review.factors.appearance,.02);
});
test('unselected initiative is durable and bounded, keeps self petition available and cannot reroll after restoration',()=>{
 let seed=1;while(consortPetitionRoll(seed,consortPetitionId('player',1))<.8)seed++;
 const f=invitationFixture({seed});assert.equal(f.invite().code,'not-invited');assert.equal(f.core.petition(),null);assert(f.core.availability().ok);assert.equal(f.core.invitationAvailability().ok,false);const re=invitationFixture({seed,saved:f.saved.value});assert(re.invite().replayed);assert.equal(re.core.petition(),null);assert(re.submit().ok);
});
test('underage, occupied room, existing petition and old duty cannot be bypassed by emperor initiation',()=>{
 for(const actor of ['player','emperor']){const f=invitationFixture({[actor]:{ageYears:17}});assert.equal(f.invite().code,'adults-required');assert.equal(f.core.state().revision,0);}
 const occupied=invitationFixture({vacancy:{roomOwnerId:'someone'}});assert.equal(occupied.invite().code,'residence-occupied');
 const pending=invitationFixture();assert(pending.submit().ok);assert.equal(pending.invite().code,'petition-pending');
 const f=invitationFixture({career:{tenure:{roleId:'cn-court-clerk'},lastDuty:{stage:'working'}}}),before=copy(f.career);assert(f.invite().offered);assert.equal(f.accept().ok,false);assert.deepEqual(f.career,before);assert.equal(f.core.respond(f.core.petition().id,'decline').code,'declined');assert.equal(f.core.appointment(),null);f.clock.day=2;assert(f.core.availability().ok);assert(f.core.invitationAvailability().reasons.includes('invitation-declined-cooldown'));f.clock.day=8;assert(f.core.invitationAvailability().ok);
});
test('unanswered invitation expires without granting a room, cancel never accepts, and age changes fail on accept and reload',()=>{
 const f=invitationFixture();assert(f.invite().offered);f.clock.hour=11;assert.equal(f.accept().code,'invitation-expired');assert.equal(f.core.expireInvitation().code,'expired');assert.equal(f.core.appointment(),null);assert.equal(invitationFixture({saved:f.saved.value}).core.state().loadError,null);
 const cancelled=invitationFixture();assert(cancelled.invite().offered);assert.equal(cancelled.core.withdraw(cancelled.core.petition().id).code,'withdrawn');assert.equal(cancelled.core.appointment(),null);
 const child=invitationFixture();assert(child.invite().offered);child.player.ageYears=17;assert.equal(child.accept().code,'adults-required');const re=invitationFixture({saved:child.saved.value,player:{ageYears:17}});assert.equal(re.accept().code,'adults-required');assert.equal(re.core.charterRequest(),null);
});
test('failed invitation/response saves do not publish a decision, lose a refusal or grant rights',()=>{
 const f=invitationFixture();f.flags.fail=true;assert.equal(f.invite().code,'save-failed');assert.equal(f.core.petition(),null);assert.equal(f.core.state().invitationDecisions.length,0);f.flags.fail=false;assert(f.invite().offered);const before=copy(f.core.state());f.flags.fail=true;assert.equal(f.accept().code,'save-failed');assert.equal(f.core.petition().stage,'awaiting-choice');assert.equal(f.core.state().revision,before.revision);assert.equal(f.core.appointment(),null);f.flags.fail=false;assert(f.core.respond(f.core.petition().id,'decline').ok);
});
test('malformed invitation origin/stage and receipt substitutions fail closed',()=>{
 const f=invitationFixture();assert(f.invite().offered);const malformed=copy(f.saved.value);malformed.petitions[0].stage='submitted';assert.equal(invitationFixture({saved:malformed}).core.state().loadError,'invalid-consort-state');
 const other=f.receipt('invitation');other.targetId='elsewhere';f.evidence.set(other.id,copy(other));assert.equal(f.core.considerInvitation(other,'palace-action:cn-emperor:1:garden').code,'receipt-conflict');
});

test('successor courier receipts keep one immutable tenure across the petition and reload',()=>{
 const f=fixture({seed:GOOD,heraldId:'cn-successor',heraldRevision:3});advance(f,'awaiting-choice');assert(f.accept().ok);
 const wrong=f.receipt('charter-handoff');wrong.heraldRevision=4;f.evidence.set(wrong.id,copy(wrong));assert.equal(f.core.receiveCharter(f.core.petition().id,wrong).ok,false);
 assert(f.handoff().ok);assert(f.read().ok);assert.equal(f.core.petition().reading.heraldId,'cn-successor');assert.equal(f.core.petition().reading.heraldRevision,3);
 assert.equal(createConsortPetitionLedger({...f.deps,saved:f.saved.value}).state().loadError,null);
 const corrupt=copy(f.saved.value);corrupt.petitions[0].reading.heraldRevision=4;assert.equal(createConsortPetitionLedger({...f.deps,saved:corrupt}).state().loadError,'invalid-consort-state');
 const missing=fixture({seed:GOOD,heraldId:'cn-successor'});assert.equal(missing.submit().ok,false,'only the historical original may omit tenure');
 const player=fixture({seed:GOOD,heraldId:'player',heraldRevision:0});assert.equal(player.submit().ok,false);
});
