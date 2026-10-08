import test from 'node:test';
import assert from 'node:assert/strict';
import {createPalaceUsurpation,palaceUsurpationCaseId,palaceUsurpationRoll} from '../source/game/palace-usurpation-ledger.js';
import {palaceUsurpationSame as same,palaceUsurpationPledgeDecision, palaceUsurpationContext} from '../source/game/palace-usurpation-policy.js';

// Persistence, identity and evidence regressions: a UI-only success, a stale body
// or a rejected world save must never create the unique emperor entitlement.
const copy=x=>JSON.parse(JSON.stringify(x));
function world() {
  const npc=(id,circleId,extra={})=>({id,bodyId:`body:${id}`,name:id,ageYears:30,alive:true,eligible:true,supportsGeneral:true,roleId:`role:${id}`,circleId,relationship:1,trust:1,informedOpinion:1,...extra});
  return {player:{id:'player',bodyId:'body:player',ageYears:24,alive:true},emperor:{id:'cn-emperor',bodyId:'body:emperor',ageYears:45,alive:true,tenureRevision:0},
    supporters:[npc('official-a','court',{official:true}),npc('official-b','court',{official:true}),npc('official-c','court',{official:true}),npc('commander','guard',{guardCommander:true}),npc('attendant','inner'),npc('guard-a','guard')],
    guard:{commanderId:'commander',guards:[{id:'commander',bodyId:'body:commander'},{id:'guard-a',bodyId:'body:guard-a'}]},
    experience:{intrigue:6,guard:6,abdication:6},exposure:0,
    safety:{oldWorkSettled:true,itemsSettled:true,meetingsSettled:true,actorTransitionsSafe:true},
    residences:{player:{roomId:'consort-reserve-1',bedId:'china-consort-bed-reserve-1'},formerEmperor:{roomId:'bedroom',bedId:'china-dragon-bed'}},
    unrelated:{money:123,property:['original-property'],kinship:['original-family'],career:{roleId:'old-role'},oldCharter:{signerId:'cn-emperor',text:'immutable'}},
  };
}
const FIRST=palaceUsurpationCaseId(1,0);
function seedFor(passed) {
  const people=palaceUsurpationContext(world()).supporters;
  for(let seed=1;seed<100000;seed++)if(people.every(p=>palaceUsurpationPledgeDecision(seed,FIRST,p).accepted)&&
    (passed?palaceUsurpationRoll(seed,`${FIRST}:resolution`)<.8:palaceUsurpationRoll(seed,`${FIRST}:resolution`)>=.9))return seed;
  throw Error('no deterministic fixture seed');
}
const GOOD=seedFor(true),BAD=seedFor(false);
function fixture(options={}) {
  const context=world(),clock={day:1,hour:8},saved={value:options.saved===undefined?undefined:copy(options.saved)},flags={save:'ok',verify:'ok'},calls={save:0,verify:0},evidence=new Map();
  if(options.context)Object.assign(context,copy(options.context));if(options.clock)Object.assign(clock,options.clock);
  for(const event of saved.value?.events||[])if(event.receipt){evidence.set(event.receipt.id,copy(event.receipt));if(event.receipt.safeHandoff)evidence.set(event.receipt.safeHandoff.id,copy(event.receipt.safeHandoff));}
  const deps={worldSeed:options.seed??GOOD,saved:saved.value,getClock:()=>clock,getContext:()=>context,
    verifyEvidence:(r,expected)=>{calls.verify++;if(flags.verify==='throw')throw Error('event source unavailable');if(flags.verify==='promise')return Promise.resolve(true);if(flags.verify==='truthy')return 1;
      assert.equal(expected.caseId,r.caseId);assert.equal(expected.kind,r.kind);return flags.verify==='ok'&&same(evidence.get(r.id),r);},
    saveState:next=>{calls.save++;if(flags.save==='false')return false;if(flags.save==='throw')throw Error('storage full');if(flags.save==='promise')return Promise.resolve(true);if(flags.save==='truthy')return 1;saved.value=copy(next);return true;},
    ...options.deps,
  };
  const core=createPalaceUsurpation(deps),task=()=>core.snapshot().cases.at(-1),id=()=>task()?.id||core.availability().caseId||FIRST;
  function publish(r) {r.participants.sort((a,b)=>a.actorId.localeCompare(b.actorId));for(const k of ['guardIds','officialIds','supporterIds'])r[k]?.sort();evidence.set(r.id,copy(r));return r;}
  function receipt(kind,actorId='player',extra={}) {
    const p=task(),actors=[...new Map([context.player,context.emperor,...context.supporters,...context.guard.guards].map(a=>[a.id,a])).values()],actor=actors.find(a=>a.id===actorId);
    const r={id:`actual:${id()}:${kind}:${actorId}`,kind,caseId:id(),playerId:'player',playerBodyId:p?.playerBodyId||context.player.bodyId,
      emperorId:p?.emperor.id||context.emperor.id,emperorBodyId:p?.emperor.bodyId||context.emperor.bodyId,emperorRevision:p?.emperor.revision??context.emperor.tenureRevision,
      actorId,actorBodyId:actor?.bodyId,targetId:'palace:courtyard',objectId:`physical:${id()}:${kind}`,participants:actors.map(a=>({actorId:a.id,bodyId:a.bodyId})),completed:true,at:copy(clock),...extra};
    if(kind==='political-response')r.durationSeconds=4;
    if(kind==='intrigue'){r.meal={orderId:`meal-order:${id()}`,objectId:r.objectId,consumerId:r.emperorId,consumerBodyId:r.emperorBodyId,status:'consumed'};r.storyActionId=`story-action:${id()}`;}
    if(kind==='guard'){r.commanderId=context.guard.commanderId;r.guardIds=context.guard.guards.map(g=>g.id);}
    if(kind==='abdication')r.officialIds=context.supporters.filter(p=>p.official).map(p=>p.id);
    if(kind==='acclamation')r.supporterIds=(task()?.pledges||[]).filter(p=>p.accepted&&!p.withdrawn).map(p=>p.actorId);
    if(kind==='safe-handoff')r.residences=copy(context.residences);
    if(kind==='investiture-reading'){r.documentId=`usurpation-charter:${id()}`;r.objectId=r.documentId;r.safeHandoff=receipt('safe-handoff');}
    return publish(r);
  }
  const f={core,context,clock,saved,flags,calls,evidence,receipt,publish,task,id,deps};
  f.pledge=actorId=>core.pledge(id(),actorId,receipt('political-response',actorId));
  f.prepare=kind=>core.recordPreparation(id(),kind,receipt(kind));
  f.resolve=()=>core.resolve(id(),receipt('mechanism-resolution'));
  f.invest=()=>core.investiture(id(),receipt('investiture-reading'));
  return f;
}
function plan(f,selected=['intrigue']) {
  assert(f.core.begin().ok);assert(f.core.selectRoute(f.id(),selected).ok);
  for(const person of f.context.supporters)assert.equal(f.pledge(person.id).accepted,true);
}
function ready(f,selected=['intrigue']) {plan(f,selected);for(const route of selected)assert(f.prepare(route).ok);assert(f.prepare('acclamation').ok);assert.equal(f.resolve().passed,true);}
const durable=f=>{const result=f.core.snapshot();delete result.lastError;return result;};

test('hidden opportunity requires real adult supporters across existing circles; menus never write',()=>{
  const f=fixture();for(let i=0;i<5;i++){assert(f.core.availability().ok);assert(f.core.view().visible);}assert.equal(f.calls.save,0);assert.equal(f.calls.verify,0);
  for(const mutate of [c=>c.player.ageYears=17,c=>c.player.alive=false,c=>c.supporters=c.supporters.slice(0,2),c=>c.supporters.forEach(p=>p.circleId='court'),
    c=>c.supporters.forEach(p=>p.supportsGeneral=false),c=>c.supporters.forEach(p=>p.eligible=false),c=>c.supporters.forEach(p=>p.ageYears=17),c=>c.supporters.forEach(p=>p.roleId=null)]){
    const locked=fixture();mutate(locked.context);assert.equal(locked.core.begin().ok,false);assert.equal(locked.calls.save,0);
    if(locked.context.player.ageYears>=18&&locked.context.player.alive){assert.equal(locked.core.view().visible,false);assert.deepEqual(locked.core.view().actions,[]);}
  }
  const duplicates=fixture();duplicates.context.supporters=[copy(duplicates.context.supporters[0]),copy(duplicates.context.supporters[0]),copy(duplicates.context.supporters[3])];assert.equal(duplicates.core.begin().ok,false);
  const missing=fixture({deps:{getContext:undefined}});assert.equal(missing.core.begin().ok,false);assert.equal(missing.core.view().visible,false);
});

test('one task preserves three independent preparations across selection changes and one witnessed investiture',()=>{
  const f=fixture(),unchanged=copy(f.context);plan(f,['intrigue']);const taskId=f.id();
  for(const route of ['intrigue','guard','abdication']){assert(f.core.selectRoute(taskId,route).ok);assert(f.prepare(route).ok);}
  assert(f.core.selectRoute(taskId,[]).ok);assert.equal(f.resolve().code,'select-a-route');
  assert(f.core.selectRoute(taskId,['abdication','intrigue','guard']).ok);assert.deepEqual(f.task().selectedRoutes,['intrigue','guard','abdication']);
  assert(f.prepare('acclamation').ok);assert.equal(f.resolve().passed,true);assert.equal(f.core.snapshot().office.actorId,'cn-emperor');
  assert.equal(f.task().stage,'ready-for-investiture');assert(f.invest().ok);
  const s=f.core.snapshot();assert.equal(s.cases.length,1);assert.equal(s.office.actorId,'player');assert.equal(s.office.revision,1);assert.equal(s.office.bodyId,'body:player');
  assert.deepEqual(s.office.residence,f.context.residences.player);assert.equal(s.office.formerEmperors.length,1);assert.equal(s.office.formerEmperors[0].alive,true);assert.equal(s.office.formerEmperors[0].actorId,'cn-emperor');
  assert.deepEqual(s.office.formerEmperors[0].residence,f.context.residences.formerEmperor);assert.deepEqual(f.context,unchanged);
  assert.equal(f.core.availability().ok,false);assert.equal(f.core.begin().ok,false);assert.equal(f.task().preparations.abdication.officialIds.length,3);
});

test('political responses are separate real four-second events, may refuse, and cannot reroll after save or reselect',()=>{
  const f=fixture();assert(f.core.begin().ok);assert.equal(f.task().pledges.length,0);
  for(const change of [r=>r.durationSeconds=3.999,r=>r.actorId='player',r=>r.actorBodyId='body:someone-else',r=>r.kind='general-conversation']){
    const r=f.receipt('political-response','official-a');change(r);f.publish(r);assert.equal(f.core.pledge(f.id(),'official-a',r).ok,false);
  }
  let seed=1;const cautious=palaceUsurpationContext(world()).supporters[0];cautious.relationship=-1;cautious.trust=-1;cautious.informedOpinion=-1;
  while(palaceUsurpationPledgeDecision(seed,FIRST,cautious).accepted)seed++;
  const no=fixture({seed});Object.assign(no.context.supporters[0],cautious);assert(no.core.begin().ok);assert.equal(no.pledge('official-a').accepted,false);
  const before=copy(no.task().pledges[0]);no.context.supporters[0].relationship=1;no.context.supporters[0].trust=1;no.context.supporters[0].informedOpinion=1;
  assert.equal(no.pledge('official-a').replayed,true);assert.deepEqual(no.task().pledges[0],before);assert(no.core.selectRoute(no.id(),'guard').ok);assert.equal(no.pledge('official-a').accepted,false);
  const re=fixture({seed,saved:no.saved.value});assert.equal(re.core.state().loadError,null);assert.equal(re.pledge('official-a').accepted,false);assert.equal(re.calls.save,0);
});

test('strict evidence lookup rejects UI flags, stale cases, wrong bodies, fake objects and asynchronous truth',async()=>{
  for(const mode of ['missing','false','throw','promise','truthy']){
    const f=fixture();assert(f.core.begin().ok);const r=f.receipt('political-response','official-a');if(mode==='missing')f.evidence.clear();else f.flags.verify=mode;
    const before=durable(f);assert.equal(f.core.pledge(f.id(),'official-a',r).code,'unverified-physical-evidence');assert.deepEqual(durable(f),before);
  }
  for(const change of [r=>r.caseId='another-case',r=>r.emperorRevision=1,r=>r.emperorBodyId='body:replacement',r=>r.playerBodyId='body:replacement',r=>r.completed=false,
    r=>r.participants=r.participants.filter(p=>p.actorId!=='player'),r=>r.participants.push(copy(r.participants[0])),r=>r.participants[0].bodyId='body:forged',r=>r.at.day=10]){
    const f=fixture();assert(f.core.begin().ok);const r=f.receipt('political-response','official-a');change(r);f.publish(r);assert.equal(f.core.pledge(f.id(),'official-a',r).ok,false);assert.equal(f.task().pledges.length,0);
  }
  const unavailable=fixture({deps:{verifyEvidence:undefined}});assert(unavailable.core.begin().ok);assert.equal(unavailable.pledge('official-a').ok,false);await Promise.resolve();
});

test('intrigue needs consumed original food plus its own plot event; kitchen work never grants an office',()=>{
  for(const change of [r=>r.meal.status='served',r=>r.meal.consumerId='player',r=>r.meal.consumerBodyId='wrong-body',r=>r.meal.objectId='new-bowl',r=>r.storyActionId=r.meal.orderId,r=>delete r.storyActionId,
    r=>r.participants=r.participants.filter(a=>a.actorId!=='cn-emperor')]){
    const f=fixture();plan(f);const r=f.receipt('intrigue');change(r);f.publish(r);assert.equal(f.core.recordPreparation(f.id(),'intrigue',r).ok,false);assert.equal(f.core.snapshot().office.actorId,'cn-emperor');
  }
  const f=fixture();plan(f);assert(f.prepare('intrigue').ok);assert.equal(f.task().stage,'planning');assert.equal(f.core.snapshot().office.actorId,'cn-emperor');
  assert.equal(f.invest().ok,false);assert.equal(f.resolve().passed,true);assert.equal(f.invest().code,'cross-circle-acclamation-required');
});

test('guard and joint pressure depend on named current officers and actual original guards',()=>{
  const noPolitics=fixture();assert(noPolitics.core.begin().ok);assert.equal(noPolitics.prepare('guard').code,'commander-response-required');assert.equal(noPolitics.prepare('abdication').code,'official-commitments-required');
  for(const change of [r=>r.commanderId='official-a',r=>r.guardIds=['guard-a'],r=>r.guardIds=['guard-a','new-guard'],r=>r.participants=r.participants.filter(a=>a.actorId!=='guard-a')]){
    const f=fixture();plan(f,['guard']);const r=f.receipt('guard');change(r);f.publish(r);assert.equal(f.core.recordPreparation(f.id(),'guard',r).ok,false);
  }
  for(const change of [r=>r.officialIds=['official-a','official-b'],r=>r.officialIds=['official-a','official-b','attendant'],r=>r.participants=r.participants.filter(a=>a.actorId!=='cn-emperor')]){
    const f=fixture();plan(f,['abdication']);const r=f.receipt('abdication');change(r);f.publish(r);assert.equal(f.core.recordPreparation(f.id(),'abdication',r).ok,false);
  }
  const guard=fixture();plan(guard,['guard']);assert(guard.prepare('guard').ok);guard.context.guard.guards[0].bodyId='replacement-guard-body';assert.equal(guard.resolve().code,'guard-preparation-required');
  const shared=fixture();shared.context.guard.guards=[{id:'commander',bodyId:'body:commander'},{id:'guard-a',bodyId:'body:guard-a'}];plan(shared,['guard']);assert(shared.prepare('guard').ok,'the actual warden may also be one of the two existing guards');
  const officials=fixture();plan(officials,['abdication']);assert(officials.prepare('abdication').ok);officials.context.supporters[0].official=false;assert.equal(officials.resolve().code,'abdication-preparation-required');
});

test('the original guards each decide politically; a commander cannot conscript a refusing guard',()=>{
  const c=world(),commander=c.supporters.find(p=>p.id==='commander'),guard=c.supporters.find(p=>p.id==='guard-a');
  Object.assign(guard,{relationship:-1,trust:-1,informedOpinion:-1});
  let seed=1;while(!palaceUsurpationPledgeDecision(seed,FIRST,commander).accepted||palaceUsurpationPledgeDecision(seed,FIRST,guard).accepted)seed++;
  const f=fixture({seed,context:c});assert(f.core.begin().ok);assert(f.core.selectRoute(f.id(),'guard').ok);
  assert.equal(f.pledge('commander').accepted,true);assert.equal(f.prepare('guard').code,'guard-political-responses-required');
  assert.equal(f.pledge('guard-a').accepted,false);assert.equal(f.prepare('guard').code,'guard-political-responses-required');
  assert.equal(f.task().preparations.guard,null);assert.equal(f.core.view().routes.find(r=>r.id==='guard').requirements.find(r=>r.id==='guard-responses').met,false);
  assert.equal(f.core.view().actions.find(a=>a.kind==='prepare'&&a.preparationKind==='guard').enabled,false);
  assert.equal(f.core.office().actorId,'cn-emperor');
});

test('mechanism success alone never grants office; cross-circle acclamation, safe handoff and the same paper remain necessary',()=>{
  const f=fixture();plan(f);assert(f.prepare('intrigue').ok);assert.equal(f.resolve().passed,true);assert.equal(f.core.snapshot().office.actorId,'cn-emperor');
  const courtOnly=f.receipt('acclamation');courtOnly.supporterIds=['official-a','official-b','official-c'];f.publish(courtOnly);assert.equal(f.core.recordPreparation(f.id(),'acclamation',courtOnly).code,'cross-circle-acclamation-required');
  assert(f.prepare('acclamation').ok);
  for(const field of Object.keys(f.context.safety)){f.context.safety[field]=false;assert.equal(f.invest().code,'safe-handoff-required');f.context.safety[field]=true;}
  const room=copy(f.context.residences.player);f.context.residences.player=null;assert.equal(f.invest().code,'verified-residences-required');f.context.residences.player=room;
  for(const change of [r=>delete r.safeHandoff,r=>r.documentId='different-paper',r=>r.safeHandoff.residences.player.roomId='unverified-room',r=>r.safeHandoff.id=r.id,r=>r.participants=r.participants.filter(p=>p.actorId!=='commander')]){
    const r=f.receipt('investiture-reading');change(r);f.publish(r);assert.equal(f.core.investiture(f.id(),r).ok,false);assert.equal(f.core.snapshot().office.actorId,'cn-emperor');
  }
  const r=f.receipt('investiture-reading');f.evidence.delete(r.safeHandoff.id);assert.equal(f.core.investiture(f.id(),r).code,'unverified-safe-handoff');f.evidence.set(r.safeHandoff.id,copy(r.safeHandoff));assert(f.core.investiture(f.id(),r).ok);
});

test('resolution waits for named political backing and existing imperial work, then keeps the successful case open for witnesses',()=>{
  const noPolitics=fixture();assert(noPolitics.core.begin().ok);assert(noPolitics.core.selectRoute(noPolitics.id(),'intrigue').ok);assert(noPolitics.prepare('intrigue').ok);
  assert.equal(noPolitics.resolve().code,'cross-circle-political-response-required');
  for(const field of ['itemsSettled','meetingsSettled','actorTransitionsSafe']){
    const f=fixture();plan(f);assert(f.prepare('intrigue').ok);f.context.safety[field]=false;assert.equal(f.resolve().code,'safe-resolution-required');assert.equal(f.task().resolution,null);
  }
  const f=fixture();assert(f.core.begin().ok);assert(f.core.selectRoute(f.id(),'intrigue').ok);
  for(const id of ['official-a','official-b','official-c','commander'])assert(f.pledge(id).accepted);
  assert(f.prepare('intrigue').ok);f.context.safety.oldWorkSettled=false;
  // The fixed success seed is below this four-person, two-circle chance.
  assert.equal(f.resolve().passed,true);assert.equal(f.core.abandon(f.id(),{confirmed:true}).code,'resolved-case-cannot-be-abandoned');
  assert.equal(f.core.view().actions.some(a=>a.kind==='abandon'),false);assert(f.core.view().people.find(a=>a.id==='attendant').canAsk);
  const fixed=copy(f.task().resolution);assert(f.pledge('attendant').accepted);assert.deepEqual(f.task().resolution,fixed);assert(f.prepare('acclamation').ok);
  assert.equal(f.invest().code,'safe-handoff-required');f.context.safety.oldWorkSettled=true;assert(f.invest().ok);
});

test('only synchronous true save commits every boundary; retry keeps the real checkpoint',async()=>{
  const stages=[['begin',f=>{},f=>f.core.begin()],['selection',f=>f.core.begin(),f=>f.core.selectRoute(f.id(),'intrigue')],
    ['politics',f=>f.core.begin(),f=>f.pledge('official-a')],['preparation',f=>plan(f),f=>f.prepare('intrigue')],
    ['resolution',f=>{plan(f);f.prepare('intrigue');},f=>f.resolve()],['investiture',f=>ready(f),f=>f.invest()],['abandon',f=>plan(f),f=>f.core.abandon(f.id(),{confirmed:true})]];
  for(const mode of ['false','throw','promise','truthy'])for(const [name,setup,act]of stages){
    const f=fixture();setup(f);const before=durable(f),persisted=f.saved.value===undefined?undefined:copy(f.saved.value);f.flags.save=mode;
    assert.equal(act(f).code,'save-failed',`${name}/${mode}`);assert.deepEqual(durable(f),before);assert.deepEqual(f.saved.value,persisted);
    f.flags.save='ok';assert(act(f).ok,`${name}/${mode} retry`);assert.equal(fixture({saved:f.saved.value}).core.state().loadError,null);
  }
  const f=fixture();ready(f);const r=f.receipt('investiture-reading');f.flags.save='false';assert.equal(f.core.investiture(f.id(),r).code,'save-failed');f.clock.hour+=.5;f.flags.save='ok';assert(f.core.investiture(f.id(),r).ok);assert.deepEqual(f.task().investiture.at,r.at);await Promise.resolve();
});

test('cold restoration, duplicate evidence and repeated investiture never reroll or grant a second tenure',()=>{
  const f=fixture();ready(f,['intrigue','guard','abdication']);assert(f.invest().ok);const before=copy(f.saved.value),count=f.calls.save;
  assert(f.invest().replayed);assert(f.resolve().replayed);assert.equal(f.calls.save,count);assert.deepEqual(f.saved.value,before);
  const re=fixture({saved:before});assert.equal(re.core.state().loadError,null);assert.equal(re.core.snapshot().office.revision,1);assert(re.invest().replayed);assert.equal(re.calls.save,0);
  const reordered=re.receipt('investiture-reading');reordered.participants.reverse();reordered.safeHandoff.participants.reverse();assert(re.core.investiture(re.id(),reordered).replayed);
  const forged=re.receipt('investiture-reading');forged.targetId='different-place';assert.equal(re.core.investiture(re.id(),forged).code,'evidence-conflict');
});

test('failure is durable and nonfatal, fixed cooldown survives reload and a later case has a distinct identity',()=>{
  const f=fixture({seed:BAD}),original=copy(f.context);plan(f);assert(f.prepare('intrigue').ok);assert(f.prepare('acclamation').ok);assert.equal(f.resolve().passed,false);
  assert.equal(f.task().stage,'failed');assert.equal(f.task().cooldownUntil.day,4);assert.equal(f.core.snapshot().office.actorId,'cn-emperor');assert.deepEqual(f.context,original);
  const decision=copy(f.task().resolution);f.context.exposure=0;assert(f.resolve().replayed);assert.deepEqual(f.task().resolution,decision);assert.equal(f.invest().ok,false);
  const re=fixture({seed:BAD,saved:f.saved.value,clock:{day:3,hour:23}});assert.equal(re.core.begin().code,'case-cooldown');assert.equal(re.task().cooldownUntil.day,4);
  re.clock.day=4;re.clock.hour=7.99;assert.equal(re.core.begin().ok,false);re.clock.hour=8;assert(re.core.begin().ok);assert.notEqual(re.id(),FIRST);assert.equal(re.core.snapshot().cases.length,2);
});

test('explicit abandonment keeps history and prepared facts, and cannot bypass fixed decisions or reuse a consumed meal',()=>{
  const f=fixture();plan(f);assert(f.prepare('intrigue').ok);const original=f.task();assert.equal(f.core.abandon(f.id()).code,'explicit-abandonment-required');
  assert(f.core.abandon(f.id(),{confirmed:true}).ok);assert(f.core.abandon(f.id(),{confirmed:true}).replayed);assert.equal(f.task().stage,'abandoned');assert.deepEqual(f.task().preparations,original.preparations);assert.equal(f.core.begin().code,'case-cooldown');
  f.clock.day=4;assert(f.core.begin().ok);const reused=f.receipt('intrigue');reused.meal=copy(original.preparations.intrigue.meal);reused.objectId=reused.meal.objectId;f.publish(reused);assert.equal(f.core.recordPreparation(f.id(),'intrigue',reused).code,'meal-or-story-already-used');
  assert.equal(f.core.view().history[0].stage,'abandoned');
});

test('malformed saves fail closed without overwriting historical state or exposing political actions',()=>{
  const f=fixture();ready(f);assert(f.invest().ok);
  const changes=[s=>s.worldSeed++,s=>s.revision++,s=>s.office.actorId='intruder',s=>s.office.revision++,s=>s.office.formerEmperors[0].alive=false,
    s=>s.cases[0].roll=.12345,s=>s.cases[0].resolution.chance=1,s=>s.cases[0].pledges[0].accepted=!s.cases[0].pledges[0].accepted,
    s=>s.cases[0].preparations.intrigue.meal.status='served',s=>s.cases[0].emperor.bodyId='wrong-body',s=>s.events[0].context.player.ageYears=17,
    s=>s.events.find(e=>e.type==='pledge').receipt.durationSeconds=0,s=>s.events.at(-1).receipt.safeHandoff.residences.player.roomId='stolen-room',
    s=>s.events.push(copy(s.events.at(-1))),s=>s.events.reverse(),s=>delete s.events,s=>s.cases.push(copy(s.cases[0]))];
  for(const mutate of changes){const bad=copy(f.saved.value);mutate(bad);const re=fixture({saved:bad});assert.equal(re.core.state().loadError,'invalid-usurpation-state');assert.equal(re.core.begin().ok,false);assert.equal(re.core.view().visible,false);assert.deepEqual(re.core.view().actions,[]);assert.equal(re.calls.save,0);assert.deepEqual(re.saved.value,bad);}
});

test('identity, lifetime and backwards clocks block new progress without clearing preparations or real experience',()=>{
  for(const mutate of [c=>c.player.bodyId='body:new-player',c=>c.player.ageYears=17,c=>c.player.alive=false,c=>c.emperor.bodyId='body:new-emperor',c=>c.emperor.tenureRevision=1,c=>c.emperor.alive=false]){
    const f=fixture();plan(f);assert(f.prepare('intrigue').ok);const before=copy(f.task());mutate(f.context);assert.equal(f.resolve().ok,false);assert.deepEqual(f.task(),before);
  }
  const f=fixture();plan(f);assert(f.prepare('intrigue').ok);f.context.experience={intrigue:0,guard:0,abdication:0};assert(f.core.selectRoute(f.id(),'guard').ok);assert.equal(f.task().experience.intrigue,6);assert(f.task().preparations.intrigue);
  f.clock.day=0;assert.equal(f.core.selectRoute(f.id(),'abdication').code,'invalid-clock');assert.equal(f.core.availability().ok,false);
  const noContext=fixture();plan(noContext);noContext.context.player=null;assert.doesNotThrow(()=>noContext.core.view());
});
