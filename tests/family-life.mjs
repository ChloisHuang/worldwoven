import test from 'node:test';
import assert from 'node:assert/strict';
import {createFamilyLife,familyConceptionRoll,familyAgeStage} from '../source/game/family-life.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const mom={royalSpouseOf:'father',actorId:'mother',name:'M',country:'china',ageYears:24,alive:true,reproductiveRole:'gestational'};
const dad={actorId:'father',name:'F',country:'france',ageYears:35,alive:true,reproductiveRole:'contributing',royalParentAtBirth:true};
const good=Array.from({length:1000},(_,i)=>`completion-${i}`).find(id=>familyConceptionRoll(1,id)<.15);
const bad=Array.from({length:1000},(_,i)=>`completion-${i}`).find(id=>familyConceptionRoll(1,id)>=.15);
function fixture(saved){let persisted=saved,saves=0,fail=false,verified=true;
 const options={saved,worldSeed:1,nowDay:10,verifyCompletion:()=>verified,saveState:s=>{saves++;if(fail)throw Error('storage unavailable');persisted=copy(s);return true;}};
 const core=createFamilyLife(options);
 if(!saved){assert(core.register(mom).ok);assert(core.register(dad).ok);}
 function ready(){for(const a of [mom,dad])assert(core.setFamilyPlanning(a.actorId,{contraception:false}).ok);assert(core.planFamily({id:'plan-1',participants:['mother','father'],consent:{mother:true,father:true},startedSeconds:100}).ok);}
 const event=(id=good)=>({id,source:'palace',stage:'completed',completed:true,paid:false,day:core.snapshot().nowDay,completedSeconds:101,participants:[mom,dad].map(a=>{const v=core.view(a.actorId);return {actorId:v.actorId,name:v.name,country:v.country,ageYears:v.ageYears,alive:v.alive,reproductiveRole:v.reproductiveRole,consent:true};})});
 return {core,options,event,ready,get persisted(){return persisted;},get saves(){return saves;},set fail(x){fail=x;},set verified(x){verified=x;}};
}
test('unknown/minor ages remain unavailable, exact year anchors survive stale registrations and restart',()=>{
 const f=fixture();assert(f.core.register({actorId:'unknown',name:'U',country:'japan',alive:true}).ok);assert.equal(f.core.view('unknown').ageYears,null);assert.equal(f.core.setFamilyPlanning('unknown',{contraception:false}).code,'living-adult-required');
 assert(f.core.register({...mom,actorId:'minor',ageYears:17}).ok);assert.equal(f.core.setFamilyPlanning('minor',{contraception:false}).ok,false);
 const before=f.saves;assert(f.core.register(mom).ok);assert.equal(f.saves,before);
 assert(f.core.advance(374.999).ok);assert.equal(f.core.view('mother').ageYears,24);assert(f.core.advance(375).ok);assert.equal(f.core.view('mother').ageYears,25);assert.equal(f.core.view('minor').ageYears,18);assert.equal(f.core.view('unknown').ageYears,null);
 assert(f.core.register(mom).ok);assert.equal(f.core.view('mother').ageYears,25);const restored=fixture(f.persisted);assert.equal(restored.core.view('mother').ageYears,25);assert.equal(restored.core.advance(2).code,'invalid-clock');
 assert.deepEqual([null,0,17,18,59,60].map(familyAgeStage),['unknown','child','child','adult','adult','elder']);
 for(const invalid of [NaN,Infinity,-1,'24'])assert.equal(f.core.register({...mom,actorId:'invalid',ageYears:invalid}).ok,false);
});
test('only authenticated completed nonpaid consensual adult events with matching current identities pass',()=>{
 const f=fixture();f.ready();const e=f.event();
 const changes=[{completed:false},{stage:'pending'},{source:'paid-service'},{paid:true},{paid:undefined},{day:9},{participants:[{...e.participants[0],ageYears:17},e.participants[1]]},{participants:[{...e.participants[0],consent:false},e.participants[1]]},{participants:[{...e.participants[0],name:'impostor'},e.participants[1]]},{participants:[e.participants[0],e.participants[0]]},{participants:[{...e.participants[0],ageYears:25},e.participants[1]]}];
 for(const change of changes)assert.equal(f.core.recordCompleted({...e,...change}).ok,false,JSON.stringify(change));
 f.verified=false;assert.equal(f.core.recordCompleted(e).code,'unverified-completion');f.verified=true;assert.equal(f.core.snapshot().events.length,0);assert(f.core.recordCompleted(e).ok);
});
test('default contraception, mutual pair planning, role eligibility, and planning revisions gate conception',()=>{
 const f=fixture();assert.equal(f.core.recordCompleted(f.event()).code,'contraception');f.ready();assert.equal(f.core.recordCompleted(f.event()).code,'contraception'); // already consumed before opt-in
 assert.equal(f.core.planFamily({id:'wrong',participants:['mother','father'],consent:{mother:true,father:false}}).ok,false);
 const g=fixture();for(const a of [mom,dad])g.core.setFamilyPlanning(a.actorId,{contraception:false});assert.equal(g.core.recordCompleted(g.event()).code,'no-mutual-plan');
 const h=fixture();h.ready();h.core.setFamilyPlanning('mother',{contraception:true});h.core.setFamilyPlanning('mother',{contraception:false});assert.equal(h.core.recordCompleted(h.event()).code,'no-mutual-plan');
 const k=fixture();k.ready();assert.equal(k.core.recordCompleted({...k.event(),completedSeconds:99}).code,'no-mutual-plan');
 const elderly=fixture();elderly.core.advance(10+365*22);elderly.core.setFamilyPlanning('mother',{contraception:false});elderly.core.setFamilyPlanning('father',{contraception:false});assert.equal(elderly.core.planFamily({id:'p',participants:['mother','father'],consent:{mother:true,father:true}}).ok,false);assert.equal(elderly.core.recordCompleted(elderly.event()).code,'ineligible-roles');
});
test('one deterministic roll and pregnancy persist; replays do not save, reroll, or duplicate children',()=>{
 const f=fixture();f.ready();const e=f.event();assert.equal(f.core.recordCompleted(e).code,'conceived');const snapshot=f.core.snapshot(),saves=f.saves;assert(f.core.recordCompleted(e).replayed);assert.equal(f.saves,saves);assert.deepEqual(f.core.snapshot(),snapshot);
 assert.equal(f.core.recordCompleted({...e,source:'salon'}).code,'event-identity-conflict');assert.equal(f.core.recordCompleted({...e,id:'another'}).code,'already-pregnant');
 const g=fixture(f.persisted);assert.equal(g.core.loadError,null);assert(g.core.recordCompleted(e).replayed);assert(g.core.advance(289.99).ok);assert.equal(g.core.children().length,0);assert(g.core.advance(290).ok);assert.equal(g.core.children().length,1);assert.equal(g.core.children()[0].ageYears,0);assert(['female','male'].includes(g.core.children()[0].childGender));assert(g.core.children()[0].name.endsWith('·1'));assert.equal(g.core.children()[0].birthCountry,'china');assert.deepEqual(g.core.children()[0].parentIds,['mother','father']);assert.deepEqual(g.core.children()[0].royalParentIdsAtBirth,['father']);assert.equal(g.core.children()[0].title,undefined);assert.equal(g.core.children()[0].job,undefined);
 assert(g.core.advance(655).ok);assert.equal(g.core.children()[0].ageYears,1);assert(g.core.recordCompleted(e).replayed);assert.equal(g.core.children().length,1);assert.equal(fixture(g.persisted).core.loadError,null);
 const no=fixture();no.ready();assert.equal(no.core.recordCompleted(no.event(bad)).code,'no-conception');assert(no.core.recordCompleted(no.event(bad)).replayed);assert.equal(no.core.snapshot().pregnancies.length,0);
});
test('country moves survive restore and birth; explicit father death permits birth with mother caregiver',()=>{
 const f=fixture();f.ready();f.core.recordCompleted(f.event());assert(f.core.register({...mom,country:'egypt'},20).ok);assert(f.core.register({...dad,alive:false},21).ok);assert(f.core.register(dad).ok);assert.equal(f.core.view('father').alive,false);
 const g=fixture(f.persisted);assert(g.core.advance(290).ok);const child=g.core.children('egypt')[0];assert.equal(child.birthCountry,'egypt');assert.equal(child.caregiverId,'mother');assert.equal(g.core.children('china').length,0);assert.equal(g.core.care(child.actorId,'father').ok,false);assert(g.core.care(child.actorId,'mother').ok);assert.equal(g.core.view(child.actorId).lastCareDay,290);
 assert(g.core.register({...mom,country:'egypt',alive:false},291).ok);assert.equal(g.core.view(child.actorId).caregiverId,null);assert.equal(fixture(g.persisted).core.loadError,null);assert.equal(g.core.view('father').ageYears,35);g.core.advance(1000);assert.equal(g.core.view('father').ageYears,35);
});
test('gestational death interrupts unborn pregnancy without erasing history or spawning a child',()=>{
 const f=fixture();f.ready();f.core.recordCompleted(f.event());assert(f.core.register({...mom,alive:false},20).ok);assert.equal(f.core.snapshot().pregnancies[0].status,'interrupted');assert(f.core.advance(500).ok);assert.equal(f.core.children().length,0);assert.equal(fixture(f.persisted).core.loadError,null);
 const g=fixture();g.ready();g.core.recordCompleted(g.event());assert(g.core.register({...mom,alive:false},300).ok);assert.equal(g.core.children().length,1);assert.equal(g.core.children()[0].caregiverId,'father');
});
test('all writes rollback on storage failure; corrupted saves stay blocked and are not overwritten',()=>{
 const f=fixture();f.ready();let before=f.core.snapshot();f.fail=true;assert.equal(f.core.recordCompleted(f.event()).code,'save-failed');assert.deepEqual(f.core.snapshot(),before);f.fail=false;assert.equal(f.core.recordCompleted(f.event()).code,'conceived');before=f.core.snapshot();f.fail=true;assert.equal(f.core.advance(290).code,'save-failed');assert.deepEqual(f.core.snapshot(),before);assert.equal(f.core.children().length,0);f.fail=false;assert(f.core.advance(290).ok);
 for(const corrupt of [s=>s.actors.mother.ageYears=-1,s=>s.events[0].roll=.999,s=>s.pregnancies[0].childId='missing',s=>s.actors.father.alive=false,s=>s.plans[0].consent.father=false]){const bad=copy(f.persisted);corrupt(bad);let writes=0;const core=createFamilyLife({saved:bad,saveState:()=>{writes++;}});assert.equal(core.loadError,'invalid-family-state');assert.deepEqual(core.snapshot(),bad);assert.equal(core.register(mom).code,'invalid-family-state');assert.equal(core.advance(1000).ok,false);assert.equal(writes,0);}
});
test('joint agreement changes both contraception settings and the pair plan in one atomic save',()=>{
 const f=fixture(),plan={id:'agreement',participants:['mother','father'],consent:{mother:true,father:true},startedSeconds:100};
 const before=f.core.snapshot();f.fail=true;assert.equal(f.core.agreeFamilyPlan(plan).code,'save-failed');assert.deepEqual(f.core.snapshot(),before);assert.equal(f.core.view('mother').contraception,true);assert.equal(f.core.view('father').contraception,true);
 f.fail=false;const saves=f.saves;assert(f.core.agreeFamilyPlan(plan).ok);assert.equal(f.saves,saves+1);assert.equal(f.core.view('mother').contraception,false);assert.equal(f.core.view('father').contraception,false);assert(f.core.agreeFamilyPlan(plan).replayed);assert.equal(f.core.recordCompleted(f.event()).code,'conceived');assert.equal(fixture(f.persisted).core.loadError,null);
 const rejected=fixture();assert.equal(rejected.core.agreeFamilyPlan({...plan,consent:{mother:true,father:false}}).ok,false);assert.equal(rejected.core.view('mother').contraception,true);
});
test('orphan care requires an explicitly consenting living adult guardian; no automatic appointment',()=>{
 const f=fixture();f.ready();f.core.recordCompleted(f.event());f.core.advance(290);const child=f.core.children()[0].actorId;
 f.core.register({actorId:'guardian',name:'G',country:'china',ageYears:30,alive:true});assert.equal(f.core.appointGuardian(child,'guardian',{consent:true}).ok,false);
 f.core.register({...mom,alive:false});f.core.register({...dad,alive:false});assert.equal(f.core.view(child).caregiverId,null);assert.equal(f.core.care(child,'guardian').ok,false);assert.equal(f.core.appointGuardian(child,'guardian',{consent:false}).ok,false);
 const before=f.core.snapshot();f.fail=true;assert.equal(f.core.appointGuardian(child,'guardian',{consent:true}).code,'save-failed');assert.deepEqual(f.core.snapshot(),before);f.fail=false;
 assert(f.core.appointGuardian(child,'guardian',{consent:true}).ok);assert(f.core.care(child,'guardian').ok);assert.equal(f.core.view(child).caregiverId,'guardian');assert.equal(f.core.lineage(child).guardianId,'guardian');assert.equal(fixture(f.persisted).core.loadError,null);
 f.core.register({actorId:'guardian',name:'G',country:'china',ageYears:30,alive:false});assert.equal(f.core.view(child).caregiverId,null);assert.equal(f.core.care(child,'guardian').ok,false);
});
test('adult relatives stay excluded from family planning and conception, including parents and guardians',()=>{
 const f=fixture();f.ready();f.core.recordCompleted(f.event());f.core.advance(290);const id=f.core.children()[0].actorId;assert(f.core.related(id,'mother'));assert(f.core.related(id,'father'));assert.equal(f.core.related('mother','father'),false);f.core.advance(290+365*18);f.core.setFamilyPlanning(id,{reproductiveRole:'gestational'});assert.equal(f.core.agreeFamilyPlan({id:'forbidden',participants:[id,'father'],consent:{[id]:true,father:true}}).code,'family-relationship-excluded');
});
test('simultaneous explicit deaths are observed before due births and cannot resurrect or reset ages',()=>{
 const f=fixture();f.ready();f.core.recordCompleted(f.event());assert(f.core.observeDeaths(['mother','father'],290).ok);assert.equal(f.core.children().length,0);assert.equal(f.core.snapshot().pregnancies[0].status,'interrupted');const age=f.core.view('mother').ageYears;f.core.advance(1000);assert.equal(f.core.view('mother').ageYears,age);f.core.register(mom);assert.equal(f.core.view('mother').alive,false);
});
test('biological kinship alone never grants a royal family title without a recorded lawful consort relation',()=>{const f=fixture();assert(f.core.register({...mom,royalSpouseOf:null}).ok);f.ready();f.core.recordCompleted(f.event());f.core.advance(290);const child=f.core.children()[0];assert.deepEqual(child.parentIds,['mother','father']);assert.deepEqual(child.royalParentIdsAtBirth,[]);assert.equal(child.royalParentAtBirth,false);});
test('born children activate an explicit adult game profile only at 18 and retain contraception and separate consent',()=>{const f=fixture();f.ready();f.core.recordCompleted(f.event());f.core.advance(290);const id=f.core.children()[0].actorId;f.core.advance(290+365*17);assert.equal(f.core.view(id).reproductiveRole,'none');f.core.advance(290+365*18);assert(['gestational','contributing'].includes(f.core.view(id).reproductiveRole));assert.equal(f.core.view(id).contraception,true);assert.equal(f.core.snapshot().plans.length,1);const role=f.core.view(id).reproductiveRole;f.core.advance(290+365*19);assert.equal(f.core.view(id).reproductiveRole,role);});
