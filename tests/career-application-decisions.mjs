// Reproduce lost results, rerolled interviews and the daily-limit boundaries.
// Production core + save snapshots + handbook DOM; no world navigation stubs
// grant a job, wage or skill. Existing adapter tests cover physical submission.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createFormalCareers,COURT_CLERK_ROLE as CLERK,TAVERN_STEWARD_ROLE as TAVERN,TAVERN_CHEF_ROLE as CHEF,FORMAL_CAREER_SLOTS} from '../source/game/formal-careers.js';
import {careerInterview,careerInterviewRoll} from '../source/game/career-applications.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
const copy=structuredClone;
function fixture({saved,worldSeed=1,slots,day=1,context={}}={}){
 const clock={day,hour:8.25,seconds:0},flags={fail:false,throw:false,async:false},store={saved},calls={save:0,context:0,bank:0};
 const careers=createFormalCareers({saved,worldSeed,slots,getClock:()=>clock,getHiringContext:()=>{calls.context++;return context;},
  creditWageToBank:()=>{calls.bank++;return {ok:true};},saveState:next=>{calls.save++;if(flags.fail)return false;if(flags.throw)throw Error('quota');if(flags.async)return Promise.resolve();store.saved=copy(next);}});
 const qualify=()=>{for(const source of ['cn-rest','cn-calligraphy'])for(let n=0;n<2;n++){const issued=careers.learningTicket(source);assert(issued.ok);assert(careers.completeLearning(issued.ticket,{seconds:8}).ok);}};
 return {careers,clock,flags,store,calls,qualify};
}
const durable=core=>{const {loadError,lastError,...state}=core.state();return state;};
const gameplay=core=>{const {revision,applications,...state}=durable(core);return state;};
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
function uiFor(f){const doc={head:element('head'),body:element('body'),createElement:element},ui=createCareerHandbook({careers:f.careers,getClock:()=>f.clock,getPlayer:()=>({ageYears:18}),getCountry:()=> 'china',getService:()=>null,copperLedger:{state:()=>({cash:0})},document:doc});const dialog=doc.body.children.find(e=>e.tag==='dialog'),all=e=>[e,...e.children.flatMap(all)];return {ui,dialog,text:()=>all(dialog).map(e=>e.textContent).join('\n')};}
test('qualified interview may reject; persistent result and per-role daily lock never reroll',()=>{
 const f=fixture();f.qualify();const before=gameplay(f.careers),vacancies=f.careers.catalogue();
 const result=f.careers.apply(CLERK.id,{ageYears:18});assert.equal(result.code,'interview-rejected');
 const receipt=f.careers.applicationResult();assert.equal(receipt.ok,false);assert(receipt.saved);assert.equal(receipt.day,1);assert.equal(receipt.hour,8.25);assert(receipt.interview.roll>=receipt.interview.chance);
 assert.deepEqual(gameplay(f.careers),before);assert.deepEqual(f.careers.catalogue(),vacancies);assert.equal(f.calls.bank,0);
 const saved=copy(f.store.saved),count={...f.calls};for(let n=0;n<3;n++){assert(f.careers.eligibility(CLERK.id,{ageYears:18}).ok);assert.equal(f.careers.applicationAvailability(CLERK.id,{ageYears:18}).code,'already-applied-today');}
 assert.deepEqual(f.calls,count,'reading conditions never submits or samples');
 const view=uiFor(f);view.ui.open({roleId:CLERK.id,scope:'role'});assert(view.text().includes('申请未通过'));assert(view.text().includes('本次面谈未获录用'));assert(view.text().includes('第3日可再申请'));view.ui.close();view.ui.open();assert(view.text().includes('申请未通过'));assert.deepEqual(f.store.saved,saved);
 assert.equal(f.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today');assert.deepEqual(f.store.saved,saved);assert.deepEqual(f.careers.applicationResult(),receipt);assert.equal(f.calls.context,count.context);
 const reload=fixture({saved,worldSeed:785});assert.equal(reload.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today');assert.deepEqual(reload.careers.applicationResult(),receipt);assert.equal(reload.calls.context,0,'even changing the seed cannot reroll a saved same-day result');
 assert(reload.careers.applicationAvailability(TAVERN.id,{ageYears:18}).ok,'daily limits belong to each role');assert(reload.careers.apply(TAVERN.id,{ageYears:18}).ok);assert.equal(reload.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today','another result does not overwrite the first role limit');
 assert.equal(reload.careers.state().lastDuty,null);assert.equal(reload.calls.bank,0);
 const next=fixture({saved});next.clock.day=2;assert(next.careers.applicationAvailability(CLERK.id,{ageYears:18}).ok);assert(next.careers.apply(CLERK.id,{ageYears:18}).ok);assert.equal(next.careers.applicationResult().day,2);assert.equal(next.careers.state().lastDuty,null);assert.equal(next.calls.bank,0);
 view.ui.dispose();
});
test('approval stays near the top in current-job UI and survives reload; resign does not renew daily application',()=>{
 const f=fixture({worldSeed:785});f.qualify();assert(f.careers.apply(CLERK.id,{ageYears:18}).ok);const receipt=f.careers.applicationResult(),view=uiFor(f);view.ui.open({roleId:CLERK.id,scope:'role'});
 assert(view.text().includes('申请通过 · 正式任职已保存'));assert(view.text().includes('第2日 08:15生效'));assert(view.text().includes('班次由你另行开始'));assert.equal(view.dialog.children[3].attributes.role,'status');assert.equal(f.careers.state().lastDuty,null);assert.equal(f.calls.bank,0);
 const reload=fixture({saved:f.store.saved,worldSeed:785}),restored=uiFor(reload);restored.ui.open();assert(restored.text().includes('申请通过 · 正式任职已保存'));assert.deepEqual(reload.careers.applicationResult(),receipt);
 assert(reload.careers.resign().ok);assert.equal(reload.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today');restored.ui.open({roleId:CLERK.id,scope:'role'});assert(restored.text().includes('此前申请通过 · 当前已离任'));assert.equal(reload.careers.state().tenure,null);assert.equal(reload.careers.catalogue().find(r=>r.id===CLERK.id).vacancy,1);
 view.ui.dispose();restored.ui.dispose();
});
test('hard rejection keeps exact deficits and vacancy; saves no work or salary',()=>{
 const f=fixture({slots:FORMAL_CAREER_SLOTS.map(slot=>slot.roleId===CLERK.id?{...slot,holderId:'existing-official'}:slot)}),before=gameplay(f.careers);
 assert.deepEqual(f.careers.apply(CLERK.id,{ageYears:17}).reasons,['adult-required','ritual-required','writing-required','no-vacancy']);assert.equal(f.calls.context,0);assert.deepEqual(gameplay(f.careers),before);assert.equal(f.calls.bank,0);
 const view=uiFor(f);view.ui.open({roleId:CLERK.id,scope:'role'});assert(view.text().includes('年龄 17 / 18岁'));assert(view.text().includes('礼仪 0 / 2点'));assert(view.text().includes('文书 0 / 2点'));assert(view.text().includes('当前没有空缺'));
 const saved=copy(f.store.saved);f.qualify();assert.equal(f.careers.apply(CLERK.id,{ageYears:18}).code,'already-applied-today','practice cannot resubmit a completed rejection today');assert.deepEqual(f.careers.applicationResult().checked,saved.applications.byRole[CLERK.id].checked);view.ui.dispose();
});
test('false/throw/async save failures never approve or consume the day and retry deterministically',async()=>{
 for(const failure of ['fail','throw','async'])for(const seed of [1,785]){
  const f=fixture({worldSeed:seed});f.qualify();const before=durable(f.careers),saved=copy(f.store.saved);f.flags[failure]=true;
  assert.equal(f.careers.apply(CLERK.id,{ageYears:18}).code,failure==='async'?'async-save-unsupported':'save-failed');assert.deepEqual(durable(f.careers),before);assert.deepEqual(f.store.saved,saved);assert.equal(f.careers.applicationResult().saved,false);assert.equal(f.careers.state().tenure,null);assert.equal(f.calls.bank,0);assert(f.careers.applicationAvailability(CLERK.id,{ageYears:18}).ok);
  const view=uiFor(f);view.ui.open({roleId:CLERK.id,scope:'role'});assert(view.text().includes('申请未完成'));assert(view.text().includes('本次结果未保存'));assert(!view.text().includes('申请通过'));
  f.flags[failure]=false;const retry=f.careers.apply(CLERK.id,{ageYears:18});assert.equal(retry.ok,seed===785);assert(f.careers.applicationResult().saved);assert.equal(f.careers.applicationResult().interview.roll,careerInterviewRoll(seed,CLERK.id,1));view.ui.dispose();
 }
 await Promise.resolve();
});
test('legacy v3 saves retain employment; malformed new receipts fail closed',()=>{
 const f=fixture({worldSeed:785});f.qualify();assert(f.careers.apply(CLERK.id,{ageYears:18}).ok);const legacy=copy(f.store.saved);legacy.version=3;delete legacy.skills.cooking;delete legacy.daily.cooking;delete legacy.applications;const restored=fixture({saved:legacy});assert(restored.careers.isHired());assert.equal(restored.careers.applicationResult(),null);assert.deepEqual(restored.careers.state().tenure,f.careers.state().tenure);
 for(const corrupt of [r=>r.ok=false,r=>r.day=-1,r=>r.interview.roll=2,r=>r.checked.skills.ritual=-1]){const saved=copy(f.store.saved);corrupt(saved.applications.byRole[CLERK.id]);assert.equal(fixture({saved}).careers.state().loadError,'invalid-career-state');}
});
test('odds use bounded career and real-profile factors while the day/role draw stays fixed',()=>{
 const args={role:CLERK,skills:{ritual:2,writing:2},performance:0,worldSeed:1,day:1},base=careerInterview(args);
 for(const patch of [{skills:{ritual:8,writing:8}},{performance:8},{context:{relationship:1}},{context:{playerTraits:{quiet:.9,curiosity:.9}}}]){const result=careerInterview({...args,...patch});assert(result.chance>base.chance);assert.equal(result.roll,base.roll);}
 const strict=careerInterview({...args,context:{recruiterTraits:{conscientiousness:.85}}});assert(strict.chance<base.chance);assert.equal(strict.roll,base.roll);
 const best=careerInterview({...args,skills:{ritual:100,writing:100},performance:100,context:{relationship:10,playerTraits:{quiet:100,curiosity:100}}});assert(best.chance<=.95);assert(best.chance<1,'hard gates and strong skills never guarantee hiring');
 assert.notEqual(base.roll,careerInterview({...args,day:2}).roll);assert.notEqual(base.roll,careerInterview({...args,role:TAVERN}).roll);
});

test('cooking deficits and chef interview receipts persist across v4 reload',()=>{
 const f=fixture({worldSeed:26});assert.deepEqual(f.careers.apply(CHEF.id,{ageYears:18}).reasons,['cooking-required','ritual-required']);const old=copy(f.store.saved);const reload=fixture({saved:old,worldSeed:26});assert.equal(reload.careers.state().loadError,null);assert.deepEqual(reload.careers.applicationResult(CHEF.id).checked.skills,{cooking:0,ritual:0});assert.equal(reload.careers.apply(CHEF.id,{ageYears:18}).code,'already-applied-today');
 for(const lesson of ['cooking-intro','cooking-intro','ritual-intro']){const t=reload.careers.learningTicket('cn-rest',lesson);assert(reload.careers.completeLearning(t.ticket,{seconds:8}).ok);}
 reload.clock.day=2;assert(reload.careers.apply(CHEF.id,{ageYears:18}).ok);assert.equal(reload.careers.state().lastDuty,null);const restored=fixture({saved:reload.store.saved,worldSeed:26,day:2});assert.equal(restored.careers.state().loadError,null);assert(restored.careers.isHired(CHEF.id));assert.equal(restored.careers.applicationResult(CHEF.id).code,'approved');assert.equal(restored.careers.catalogue().find(r=>r.id===CHEF.id).vacancy,0);
});
