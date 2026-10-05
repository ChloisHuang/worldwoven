import fs from 'node:fs';
// Submission used to synchronously hire. Exercise the durable boundary rather
// than a timer: no tenure until a recruiter reviews the persisted application.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFormalCareers,COURT_CLERK_ROLE as CLERK,TAVERN_STEWARD_ROLE as TAVERN,GARDEN_ASSISTANT_ROLE as GARDEN,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {careerInterview,careerInterviewRoll} from '../source/game/career-applications.js';
const copy=structuredClone;
function fixture({saved,worldSeed=785,slots,day=1,context={},skills={ritual:2,writing:2,gardening:2,art:0,cooking:2}}={}){
 const clock={day,hour:8.25,seconds:0},flags={fail:false,throw:false,async:false},store={saved},calls={save:0,context:0,bank:0};
 if(!saved){const {loadError,lastError,...seed}=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();seed.skills={...seed.skills,...skills};saved=seed;}
 const careers=createFormalCareers({saved,worldSeed,slots,getClock:()=>clock,getHiringContext:()=>{calls.context++;return context;},creditWageToBank:()=>{calls.bank++;return {ok:true};},saveState:next=>{calls.save++;if(flags.fail)return false;if(flags.throw)throw Error('quota');if(flags.async)return Promise.resolve();store.saved=copy(next);}});
 const review=(role=CLERK,step='interview')=>careers.reviewApplication(role.id,{ageYears:18,applicationId:careers.applicationResult(role.id)?.id,step});
 return {careers,clock,flags,store,calls,review};
}
const durable=core=>{const {loadError,lastError,...state}=core.state();return state;};
const untouchedWork=core=>{const {revision,applications,...state}=durable(core);return state;};
test('submission is pending, reserves no job, and cannot be rerolled by closing/reloading or another day',()=>{
 const f=fixture(),before=untouchedWork(f.careers),vacancy=f.careers.catalogue();
 assert.equal(f.careers.apply(TAVERN.id,{ageYears:18}).code,'submitted');const r=f.careers.applicationResult();assert.equal(r.status,'pending');assert.equal(r.interview,null);assert.equal(r.tenure,null);assert.equal(f.calls.context,0);assert.equal(f.calls.bank,0);assert.deepEqual(untouchedWork(f.careers),before);assert.deepEqual(f.careers.catalogue(),vacancy);
 assert.equal(f.careers.beginDuty().code,'not-employed');assert.equal(f.careers.apply(TAVERN.id,{ageYears:18}).code,'application-pending');assert(f.careers.applicationAvailability(CLERK.id,{ageYears:18}).ok,'another role keeps its own submission allowance');
 const re=fixture({saved:f.store.saved,worldSeed:1,day:2});assert.deepEqual(re.careers.applicationResult(),r);assert.equal(re.careers.apply(TAVERN.id,{ageYears:18}).code,'application-pending');assert.equal(re.careers.state().loadError,null);
 assert.equal(re.review(TAVERN).code,'approved');assert.equal(re.careers.state().tenure.sinceDay,2);assert.equal(re.careers.state().lastDuty,null);assert.equal(re.calls.context,1);assert.equal(re.calls.bank,0);assert.equal(re.review(TAVERN).code,'no-pending-application');
});
test('actual review uses current context and skills while the single submitted draw stays fixed',()=>{
 const f=fixture({worldSeed:1}),context={relationship:0};assert(f.careers.apply(CLERK.id,{ageYears:18}).ok);const pending=copy(f.store.saved);assert.equal(f.calls.context,0);
 const r=fixture({saved:pending,context});assert.equal(r.review().code,'interview-rejected');assert.equal(r.careers.state().tenure,null);assert.equal(r.calls.context,1);const rejected=r.careers.applicationResult();assert.equal(rejected.status,'rejected');assert(rejected.interview.roll>=rejected.interview.chance);assert.equal(r.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today');assert.deepEqual(fixture({saved:r.store.saved}).careers.applicationResult(),rejected);
 const stronger=copy(pending);stronger.skills.ritual=10;stronger.skills.writing=10;const improved=fixture({saved:stronger,worldSeed:999,context:{relationship:1}});assert.equal(improved.review().code,'document-ready');assert.equal(improved.careers.applicationResult().roll,rejected.roll);assert(improved.careers.applicationResult().interview.chance>rejected.interview.chance);
});
test('court appointment needs real document stages; reloading preserves each stage and final approval time',()=>{
 const f=fixture();assert(f.careers.apply(CLERK.id,{ageYears:18}).ok);assert.equal(f.review(undefined,'appointment').code,'wrong-review-step');assert.equal(f.review().code,'document-ready');assert.equal(f.careers.state().tenure,null);assert(f.careers.applicationResult().appointment.text.includes('任命文书'));
 const re=fixture({saved:f.store.saved});assert.equal(re.careers.state().loadError,null);assert.equal(re.review().code,'wrong-review-step');assert.equal(re.review(undefined,'receive-document').code,'document-held');const hold=fixture({saved:re.store.saved});assert.equal(hold.careers.applicationResult().stage,'document-held');hold.clock.hour=9;assert.equal(hold.review(undefined,'appointment').code,'approved');assert.equal(hold.careers.state().tenure.sinceHour,9);assert.equal(hold.careers.state().lastDuty,null);assert.equal(hold.calls.bank,0);assert.equal(fixture({saved:hold.store.saved}).careers.state().loadError,null);
});
test('vacancy and skill changes between submitting, review and declaration are rechecked without consuming any slot',()=>{
 const f=fixture();assert(f.careers.apply(CLERK.id,{ageYears:18}).ok);const occupied=FORMAL_CAREER_SLOTS.map(slot=>slot.roleId===CLERK.id?{...slot,holderId:'existing-official'}:slot),busy=fixture({saved:f.store.saved,slots:occupied});assert.deepEqual(busy.review().reasons,['no-vacancy']);assert.equal(busy.careers.state().tenure,null);assert.equal(busy.calls.context,0);
 assert.equal(f.review().code,'document-ready');assert(f.review(undefined,'receive-document').ok);const atDeclaration=fixture({saved:f.store.saved,slots:occupied});assert.deepEqual(atDeclaration.review(undefined,'appointment').reasons,['no-vacancy']);assert.equal(atDeclaration.careers.state().tenure,null);assert.equal(fixture({saved:atDeclaration.store.saved,slots:occupied}).careers.state().loadError,null);
 const weaker=copy(f.store.saved);weaker.skills.writing=0;const unqualified=fixture({saved:weaker});assert.deepEqual(unqualified.review(undefined,'appointment').reasons,['writing-required']);assert.equal(unqualified.careers.state().tenure,null);
});
test('withdrawal consumes the submission day; leaving a meeting or stale IDs cannot decide a pending application',()=>{
 const f=fixture();assert(f.careers.apply(GARDEN.id,{ageYears:18}).ok);const id=f.careers.applicationResult().id,saved=copy(f.store.saved);assert.equal(f.careers.reviewApplication(GARDEN.id,{ageYears:18,applicationId:'old'}).code,'stale-application');assert.deepEqual(f.store.saved,saved);assert(f.careers.cancelApplication(GARDEN.id,id).ok);assert.equal(f.careers.applicationResult().status,'cancelled');assert.equal(f.careers.apply(GARDEN.id,{ageYears:18}).code,'already-applied-today');assert.equal(fixture({saved:f.store.saved}).careers.state().loadError,null);f.clock.day=2;assert(f.careers.apply(GARDEN.id,{ageYears:18}).ok);assert.notEqual(f.careers.applicationResult().id,id);
});
test('save failures cannot create employment, consume submission, or lose the pending decision',async()=>{
 for(const failure of ['fail','throw','async']){
  const f=fixture(),before=durable(f.careers);f.flags[failure]=true;assert(!f.careers.apply(TAVERN.id,{ageYears:18}).ok);assert.deepEqual(durable(f.careers),before);f.flags[failure]=false;assert(f.careers.apply(TAVERN.id,{ageYears:18}).ok);const pending=copy(f.store.saved);f.flags[failure]=true;assert(!f.review(TAVERN).ok);assert.equal(f.careers.state().tenure,null);assert.deepEqual(f.store.saved,pending);f.flags[failure]=false;assert(f.review(TAVERN).ok);assert.equal(fixture({saved:f.store.saved}).careers.state().loadError,null);
 }await Promise.resolve();
});
test('legacy approved receipts remain valid; malformed pending state fails closed',()=>{
 const f=fixture();assert(f.careers.apply(TAVERN.id,{ageYears:18}).ok);const valid=copy(f.store.saved);
 for(const mutate of [r=>r.id+='changed',r=>r.ok=true,r=>r.roll=2,r=>r.stage='document-held',r=>r.tenure={roleId:TAVERN.id}]){const bad=copy(valid);mutate(bad.applications.byRole[TAVERN.id]);assert.equal(fixture({saved:bad}).careers.state().loadError,'invalid-career-state');}
 assert(f.review(TAVERN).ok);const old=copy(f.store.saved),receipt=old.applications.byRole[TAVERN.id];for(const k of ['id','status','stage','roll','reviewedAt','decidedAt','appointment'])delete receipt[k];assert.equal(fixture({saved:old}).careers.state().loadError,null);assert(fixture({saved:old}).careers.isHired(TAVERN.id));
 const args={role:CLERK,skills:{ritual:2,writing:2},performance:0,worldSeed:1,day:1};assert.equal(careerInterview(args).roll,careerInterviewRoll(1,CLERK.id,1));
});

test('chef recruitment reads Xu An at the hiring counter, retaining Shen He as the technical incumbent',()=>{
 const chef=fixture().careers.catalogue().find(r=>r.id==='cn-tavern-chef');assert.equal(chef.employer,'许安');assert.equal(chef.workplace,'云来酒楼 · 招工柜台');assert.equal(chef.incumbentName,'沈禾');
 const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),start=main.indexOf('getHiringContext:')+'getHiringContext:'.length,end=main.indexOf(',creditWageToBank',start);assert(start>0&&end>start);
 const host={traits:{quiet:.8},relations:{player:.3}},cook={traits:{quiet:.1},relations:{player:-.7}};
 const read=new Function('chinaTavern','chinaAudience','franceGardener','saved','return ('+main.slice(start,end)+');')({staffScene:{state:()=>({staffLife:{decisions:{people:{'cn-tavern-host':host,'cn-tavern-cook':cook}}}})}},null,null,{});
 assert.deepEqual(read(chef).recruiterTraits,host.traits);assert.equal(read(chef).relationship,.3);
});

test('rejection and daily limits are specific to each role; another qualified role remains available',()=>{
 const f=fixture({worldSeed:2});assert(f.careers.apply(TAVERN.id,{ageYears:18}).ok);assert.equal(f.review(TAVERN).code,'interview-rejected');const rejected=f.careers.applicationResult(TAVERN.id);
 assert(f.careers.applicationAvailability('cn-tavern-chef',{ageYears:18}).ok);assert.equal(f.careers.applicationResult('cn-tavern-chef'),null);assert.equal(f.careers.apply('cn-tavern-chef',{ageYears:18}).code,'submitted');
 assert.equal(f.careers.apply(TAVERN.id,{ageYears:18}).code,'already-applied-today');assert.deepEqual(f.careers.applicationResult(TAVERN.id),rejected);
 f.clock.day=2;assert(f.careers.applicationAvailability(TAVERN.id,{ageYears:18}).ok);assert.equal(f.careers.apply(TAVERN.id,{ageYears:18}).code,'submitted');
 const re=fixture({saved:f.store.saved,day:2});assert.equal(re.careers.state().loadError,null);assert.equal(re.careers.applicationResult(TAVERN.id).status,'pending');assert.equal(re.careers.applicationResult('cn-tavern-chef').status,'pending');assert.equal(re.careers.state().tenure,null);
});
test('pending applications are role-local; real skill deficits stay distinct and one approval still owns the only job',()=>{
 const f=fixture();assert(f.careers.apply(TAVERN.id,{ageYears:18}).ok);assert.equal(f.careers.apply(CLERK.id,{ageYears:18}).code,'submitted');assert.equal(f.careers.apply(TAVERN.id,{ageYears:18}).code,'application-pending');
 const re=fixture({saved:f.store.saved});assert.equal(re.careers.state().loadError,null);assert(re.review(TAVERN).ok);assert.deepEqual(re.review(CLERK).reasons,['already-employed']);assert.equal(re.careers.state().tenure.roleId,TAVERN.id);assert.equal(re.careers.state().lastDuty,null);
 const unqualified=fixture({skills:{ritual:2,cooking:0}});assert(unqualified.careers.apply(TAVERN.id,{ageYears:18}).ok);assert.deepEqual(unqualified.careers.applicationAvailability('cn-tavern-chef',{ageYears:18}).reasons,['cooking-required']);assert.equal(unqualified.careers.applicationResult('cn-tavern-chef'),null);
});

test('approval, resignation, reload and reapplication distinguish current tenure from preserved appointment history',()=>{
 const f=fixture();assert(f.careers.apply(CLERK.id,{ageYears:18}).ok);assert(f.review().ok);assert(f.review(undefined,'receive-document').ok);assert(f.review(undefined,'appointment').ok);
 const approved=copy(f.store.saved),id=f.careers.applicationResult(CLERK.id).id;assert.equal(f.careers.state().tenure.applicationId,id);assert.equal(f.careers.applicationResult(CLERK.id).employmentStatus,'active');
 assert(f.careers.resign().ok);assert.equal(f.careers.state().tenure,null);assert.equal(f.careers.state().lastDuty,null);assert.equal(f.careers.slotHolder(CLERK.id),null);assert.equal(f.careers.catalogue().find(r=>r.id===CLERK.id).vacancy,1);assert.equal(f.careers.beginDuty().code,'not-employed');assert(!f.careers.settle().ok);assert.equal(f.calls.bank,0);
 const re=fixture({saved:f.store.saved});assert.equal(re.careers.applicationResult(CLERK.id).employmentStatus,'ended');assert.equal(re.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today');assert(re.careers.applicationAvailability(TAVERN.id,{ageYears:18}).ok);
 re.clock.day=2;assert.equal(re.careers.apply(CLERK.id,{ageYears:18}).code,'submitted');assert.notEqual(re.careers.applicationResult(CLERK.id).id,id);assert.equal(re.careers.state().tenure,null);assert.equal(re.careers.applicationHistory(CLERK.id)[0].id,id);assert.equal(re.careers.applicationHistory(CLERK.id)[0].employmentStatus,'ended');
 const pending=fixture({saved:re.store.saved,day:2});assert.equal(pending.careers.state().loadError,null);assert.equal(pending.careers.applicationResult(CLERK.id).status,'pending');assert.equal(pending.careers.applicationHistory(CLERK.id)[0].id,id);assert(pending.review().ok);assert(pending.review(undefined,'receive-document').ok);assert(pending.review(undefined,'appointment').ok);assert.equal(pending.careers.applicationResult(CLERK.id).employmentStatus,'active');assert.equal(pending.careers.applicationHistory(CLERK.id)[0].employmentStatus,'ended');
 const old=copy(approved);delete old.tenure.applicationId;delete old.applications.byRole[CLERK.id].tenure.applicationId;const legacy=fixture({saved:old});assert(legacy.careers.isHired(CLERK.id));assert.equal(legacy.careers.applicationResult(CLERK.id).employmentStatus,'active');assert.deepEqual(legacy.careers.state().tenure,old.tenure);
 const otherId=copy(approved);otherId.tenure.applicationId='career-application:'+CLERK.id+':0';const distinct=fixture({saved:otherId});assert.equal(distinct.careers.state().loadError,null);assert.equal(distinct.careers.applicationResult(CLERK.id).employmentStatus,'ended','matching role/time alone must not impersonate a different application ID');
});
