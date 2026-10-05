import {approvePending} from './fixtures/career-application.mjs';
// Real regressions: user-selected books previously had no choices and all
// reading awarded ritual. Protect intent/skill binding and old salary saves.
import assert from 'node:assert/strict';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {studyOptions,studySkillProgress,studyJobLinks} from '../source/game/study-lessons.js';
import {createStudyMenu} from '../source/game/study-menu.js';
const clone=structuredClone;
function fixture(saved){const clock={day:1,hour:8,seconds:0},store={saved},flags={fail:false};const careers=createFormalCareers({worldSeed:785,saved,getClock:()=>clock,saveState:s=>{if(flags.fail)return false;store.saved=clone(s);},creditWageToBank:()=>({ok:true})});return{clock,store,flags,careers};}
const f=fixture();
assert.deepEqual(studyOptions('cn-rest').map(o=>o.skill),['ritual','writing','cooking','art','art']);
assert.deepEqual(studyOptions('cn-calligraphy').map(o=>o.action),['calligraphy']);
assert.deepEqual(studyOptions('france-atelier').map(o=>o.action),['paint']);
for(const station of ['cn-tea','cn-garden','cn-cooking','france-cafe'])assert.equal(studyOptions(station).length,0);
assert.equal(f.careers.learningTicket('cn-calligraphy','art-intro').code,'unknown-learning-choice');
let ticket=f.careers.learningTicket('cn-rest','writing-intro').ticket;
assert.equal(f.careers.completeLearning({...ticket,lessonId:'art-intro'},{seconds:8}).code,'invalid-learning-ticket');
assert.equal(f.careers.completeLearning(ticket,{seconds:7.99}).code,'learning-incomplete');
assert.equal(f.careers.state().skills.writing,0);
assert.equal(f.careers.completeLearning(ticket,{seconds:8}).skill,'writing');
assert.deepEqual(f.careers.state().skills,{ritual:0,writing:0,gardening:0,art:0,cooking:0});
assert.equal(f.careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
assert.equal(fixture(f.store.saved).careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
ticket=f.careers.learningTicket('cn-rest','art-intro').ticket;f.careers.cancelLearning(ticket);
assert.equal(f.careers.completeLearning(ticket,{seconds:100}).code,'learning-interrupted');
assert.equal(f.careers.state().skills.art,0);
ticket=f.careers.learningTicket('france-salon','fr-gardening-intro').ticket;
const reload=fixture(f.store.saved);assert.equal(reload.careers.completeLearning(ticket,{seconds:100}).code,'learning-interrupted');
assert.equal(reload.careers.state().skills.gardening,0);
const replaced=f.careers.learningTicket('france-salon','fr-art-intro').ticket;
assert.equal(f.careers.completeLearning(ticket,{seconds:8}).code,'invalid-learning-ticket');
f.flags.fail=true;assert.equal(f.careers.completeLearning(replaced,{seconds:8}).code,'save-failed');assert.equal(f.careers.state().skills.art,0);
f.flags.fail=false;assert.equal(f.careers.completeLearning(replaced,{seconds:8}).gained,1);
for(let i=0;i<3;i++){const t=f.careers.learningTicket(i%2?'france-atelier':'france-salon',i%2?'art-practice':'fr-art-intro').ticket;assert.equal(f.careers.completeLearning(t,{seconds:8}).gained,1);}
ticket=f.careers.learningTicket('cn-rest','art-intro').ticket;assert.equal(f.careers.completeLearning(ticket,{seconds:8}).limited,'daily-skill-limit');
assert.equal(studySkillProgress(f.careers.state(),'art',1).remaining,0);
f.clock.day=2;assert.equal(studySkillProgress(f.careers.state(),'art',2).remaining,4);
ticket=f.careers.learningTicket('cn-rest','art-intro').ticket;assert.equal(f.careers.completeLearning(ticket,{seconds:8}).gained,1);
assert(studyJobLinks(f.careers,'art').includes('云来诗词艺者'));assert(studyJobLinks(f.careers,'writing').includes('礼务录事'));assert(studyJobLinks(f.careers,'ritual').includes('酒楼常任服务助理'));assert(studyJobLinks(f.careers,'gardening').includes('西苑常任园艺助理'));

// A real qualified/paid clerk snapshot in the published v2 shape migrates
// without losing tenure, bank receipt identity, reviews, skill or work serials.
const legacySeed=f.careers.state();legacySeed.version=4;delete legacySeed.skillXP;legacySeed.skills={ritual:2,writing:2,gardening:0,art:5,cooking:0};legacySeed.daily={day:null,ritual:0,writing:0,gardening:0,art:0,cooking:0};for(const row of Object.values(legacySeed.learning))if(row.issuedDay!==null)row.issuedDay=1;const old=fixture(legacySeed);
old.careers.completedLowerWork({source:'fr-garden-labor',receiptId:'fr-garden-labor-5'});
assert(old.careers.apply(undefined,{ageYears:22}).ok);approvePending(old.careers);assert(old.careers.beginDuty().ok);
old.clock.hour=11.5;assert(old.careers.dutyEvent('court-start').ok);assert(old.careers.dutyEvent('court-completed').ok);assert(old.careers.dutyEvent('archive-completed').ok);assert(old.careers.settle().ok);
const v2=clone(old.store.saved);v2.version=2;delete v2.skillXP;delete v2.skills.cooking;delete v2.daily.cooking;delete v2.skills.art;delete v2.daily.art;delete v2.learning['france-salon'];delete v2.learning['france-atelier'];for(const row of Object.values(v2.learning))delete row.lessonId;
const restored=fixture(v2).careers;assert.equal(restored.state().loadError,null);assert.equal(restored.state().version,5);
for(const key of ['tenure','lastDuty','lastPaidDay','lowerWork','performance','promotionProgress','lastEvaluation'])assert.deepEqual(restored.state()[key],v2[key],key);
assert.deepEqual(restored.state().skills,{...v2.skills,art:0,cooking:0});assert.equal(restored.settle().code,'work-incomplete');
const unfinishedV2=clone(v2);unfinishedV2.learning['cn-rest'].issued++;const oldAttempt=fixture(unfinishedV2).careers;assert.equal(oldAttempt.completeLearning({source:'cn-rest',id:`cn-rest:${unfinishedV2.learning['cn-rest'].issued}:1`,lessonId:'ritual-intro'},{seconds:100}).code,'learning-interrupted');
const damaged=clone(v2);damaged.learning['cn-rest'].completed=99;assert.equal(fixture(damaged).careers.state().loadError,'invalid-career-state');
const badChoice=clone(f.store.saved);badChoice.learning['cn-rest'].lessonId='writing-practice';assert.equal(fixture(badChoice).careers.state().loadError,'invalid-career-state');

// Modal choices, dismissal, stale buttons and day rollover use the real state
// module; only DOM is simulated. This is not browser layout/iOS verification.
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,events:{},setAttribute(k,v){this.attributes[k]=String(v);},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(k,v){this.events[k]=v;},remove(){}});
const doc={head:element('head'),body:element('body'),createElement:element},all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(e=>e.textContent).join('\n');
let country='china';const requests=[],ui=createStudyMenu({careers:f.careers,getClock:()=>f.clock,getCountry:()=>country,document:doc,onChoose:(station,id)=>requests.push([station.id,id])});
const dialog=doc.body.children[0],find=predicate=>all(dialog).find(predicate),button=title=>find(e=>e.tag==='button'&&e.textContent===title),station={id:'cn-rest',name:'雅集楼三层 · 藏书观景'};
let before=clone(f.store.saved);assert(ui.open(station));assert.equal(all(dialog).filter(e=>e.className==='study-option').length,5);
assert(text(dialog).includes('升级进度 · 前往 Lv.1'));assert(text(dialog).includes('10 / 30 XP')||text(dialog).includes('0 / 30 XP'));find(e=>e.className==='study-option'&&text(e).includes('文书')).onclick();
assert(text(dialog).includes('Lv.0'));assert(text(dialog).includes('10 / 30 XP'));assert(text(dialog).includes('礼务录事：文书 Lv.2'));
const stale=button('开始阅读 · 8秒');button('暂时不学').onclick();stale.onclick();assert.equal(requests.length,0);assert.deepEqual(f.store.saved,before);
ui.open(station);find(e=>e.className==='study-option'&&text(e).includes('艺术')).onclick();assert(text(dialog).includes('云来诗词艺者'));assert(text(dialog).includes('淡墨铺远山'));
const start=button('开始阅读 · 8秒');start.onclick();start.onclick();assert.deepEqual(requests,[['cn-rest','art-intro']]);assert.deepEqual(f.store.saved,before,'UI does not mint tickets');
ui.open(station);const changed=button('开始阅读 · 8秒');f.clock.day++;ui.update();changed.onclick();assert.equal(requests.length,1);
dialog.events.cancel({preventDefault(){}});assert(!ui.isOpen());
assert.equal(ui.open({id:'cn-tea'}),false);ui.open({id:'cn-calligraphy',name:'翰墨书房'});assert(button('开始习字 · 8秒'));ui.close();
assert.equal(ui.open({id:'france-salon'}),false);country='france';ui.open({id:'france-atelier',name:'皇家艺术书斋'});assert(button('开始绘画 · 8秒'));ui.dispose();
console.log('PASS chosen study: five skills, source/lesson binding, witnessed completion, cancel/reload/replay/save failure, shared daily limits, paid v2 migration, real-role links and stale modal actions');
