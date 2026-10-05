// Guards the new local source against foreign-book leakage, mismatched skill
// awards and damage to existing tickets/payroll when the source is appended.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {studyOptions,studyCountry,studySkillProgress,studyJobLinks} from '../source/game/study-lessons.js';
import {createStudyMenu} from '../source/game/study-menu.js';
import {studyIcon} from '../source/game/study-theme.js';
import {playerStationIntent} from '../source/game/player-interaction-intents.js';
const clone=structuredClone;
function fixture(saved,clock={day:1,hour:12,seconds:0},worldSeed=1){
 const store={saved},flags={fail:false};
 const careers=createFormalCareers({saved,worldSeed,getClock:()=>clock,saveState:s=>{if(flags.fail)return false;store.saved=clone(s);}});
 return {careers,clock,store,flags};
}
const local=studyOptions('jp-library','japan');
assert.equal(studyCountry('jp-library'),'japan');assert.deepEqual(local.map(x=>x.skill),['ritual','writing','cooking','care']);
for(const country of ['china','france','egypt'])assert.equal(studyOptions('jp-library',country).length,0);
for(const source of ['cn-rest','cn-calligraphy','france-salon','france-atelier'])assert.equal(studyOptions(source,'japan').length,0);
assert(local.every(x=>x.id.startsWith('jp-')&&x.action==='read'&&x.seconds===8));
assert.equal(new Set(local.map(x=>studyIcon(x.skill))).size,4,'care has its own icon');
assert(playerStationIntent({id:'jp-library',position:[-7.5,7.6,-13.3],action:'选择汤屋书目',npc:false}));
const f=fixture();
const finish=(skill,c=f.careers,source='jp-library')=>{const lesson=studyOptions(source).find(x=>x.skill===skill);const start=c.learningTicket(source,lesson.id);assert(start.ok);return {ticket:start.ticket,result:c.completeLearning(start.ticket,{seconds:8})};};
for(const lesson of local){
 const {ticket,result}=finish(lesson.skill);assert.equal(result.skill,lesson.skill);assert.equal(result.xpGained,10);assert.equal(result.level,0);assert.equal(result.required,30);
 assert.equal(f.careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
 assert.equal(fixture(f.store.saved).careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
}
assert.deepEqual(f.careers.state().skillXP,{ritual:10,writing:10,gardening:0,art:0,cooking:10,martial:0,care:10});
assert.equal(f.careers.learningTicket('jp-library','writing-intro').code,'unknown-learning-choice');
const cancelled=f.careers.learningTicket('jp-library','jp-care-intro').ticket;assert.equal(f.careers.completeLearning(cancelled,{seconds:7.99}).code,'learning-incomplete');
f.careers.cancelLearning(cancelled);assert.equal(f.careers.completeLearning(cancelled,{seconds:100}).code,'learning-interrupted');assert.equal(f.careers.state().skillXP.care,10);
const interrupted=f.careers.learningTicket('jp-library','jp-writing-intro').ticket,reload=fixture(f.store.saved);
assert.equal(reload.careers.completeLearning(interrupted,{seconds:8}).code,'learning-interrupted');
assert(reload.careers.resumeLearning(interrupted,{seconds:3}).ok);assert.equal(reload.careers.completeLearning(interrupted,{seconds:8}).xpGained,10);
const failed=f.careers.learningTicket('jp-library','jp-cooking-intro').ticket;f.flags.fail=true;assert.equal(f.careers.completeLearning(failed,{seconds:8}).code,'save-failed');assert.equal(f.careers.state().skillXP.cooking,10);f.flags.fail=false;assert.equal(f.careers.completeLearning(failed,{seconds:8}).xpGained,10);
// Country-specific books share one existing skill, XP curve and daily cap.
assert.equal(finish('care',f.careers,'cn-rest').result.xpGained,10);assert.equal(finish('care').result.level,1);assert.equal(finish('care').result.required,40);assert.equal(finish('care').result.limited,'daily-skill-limit');
assert.equal(studySkillProgress(f.careers.state(),'care',1).remaining,0);assert.equal(f.careers.state().skillXP.care,10);
f.clock.day=2;assert.equal(studySkillProgress(f.careers.state(),'care',2).remaining,4);assert.equal(finish('care').result.xp,20);
assert(studyJobLinks(f.careers,'ritual','japan').includes('男汤浴包配送员'));assert(!studyJobLinks(f.careers,'writing','japan').includes('礼务录事'));
const published=JSON.parse(fs.readFileSync(new URL('./fixtures/japan-study-published-v8.json',import.meta.url))),old=published.saved,migrated=fixture(old,published.clock,published.worldSeed).careers;
assert.equal(migrated.state().loadError,null);assert.equal(migrated.state().version,10);
for(const key of Object.keys(old))if(!['version','learning'].includes(key))assert.deepEqual(migrated.state()[key],old[key],key+' preserved');
for(const [source,row]of Object.entries(old.learning))assert.deepEqual(migrated.state().learning[source],row,'old ticket retained');
assert.deepEqual(migrated.state().learning['jp-library'],{issued:0,completed:0,issuedDay:null,lessonId:null});
const written=old.learning['cn-calligraphy'];assert.equal(migrated.completeLearning({source:'cn-calligraphy',id:`cn-calligraphy:${written.issued}:${written.issuedDay}`,lessonId:written.lessonId},{seconds:8}).code,'learning-replayed');
assert.equal(migrated.settle().code,'work-incomplete');assert.equal(finish('writing',migrated).result.xp,20);assert.equal(migrated.state().lastDuty.wage,old.lastDuty.wage);
for(const mutate of [s=>{delete s.learning['jp-library'];},s=>s.learning['jp-library'].completed=99,s=>s.learning['jp-library'].lessonId='writing-intro']){
 const broken=migrated.state();mutate(broken);assert.equal(fixture(broken,published.clock).careers.state().loadError,'invalid-career-state');
}
const badOld=clone(old);delete badOld.learning['france-atelier'];assert.equal(fixture(badOld,published.clock).careers.state().loadError,'invalid-career-state');
// Real menu code, simulated DOM: the existing layout is reused unchanged.
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,events:{},setAttribute(k,v){this.attributes[k]=String(v);},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(k,v){this.events[k]=v;},remove(){}});
const doc={head:element('head'),body:element('body'),createElement:element},all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');let country='japan';const requests=[];
const ui=createStudyMenu({careers:f.careers,getClock:()=>f.clock,getCountry:()=>country,document:doc,onChoose:(station,id)=>requests.push([station.id,id])}),station={id:'jp-library',name:'三层 · 藏书间北墙书架'},dialog=doc.body.children[0];
const find=p=>all(dialog).find(p),button=label=>find(e=>e.tag==='button'&&e.textContent===label),before=clone(f.store.saved);
assert(ui.open(station));assert.equal(all(dialog).filter(e=>e.className==='study-option').length,4);assert(!text(dialog).includes('西苑'));assert(!text(dialog).includes('礼务录事'));
for(const lesson of local){find(e=>e.className==='study-option'&&text(e).includes(lesson.title.slice(1,-1))).onclick();assert(text(dialog).includes(lesson.excerpt));assert(text(dialog).includes('升级进度'));assert(all(dialog).some(e=>e.attributes.role==='progressbar'&&e.attributes['aria-valuemax']));}
const stale=button('开始阅读 · 8秒');button('暂时不学').onclick();stale.onclick();assert.equal(requests.length,0);assert.deepEqual(f.store.saved,before);
assert(ui.open(station));find(e=>e.className==='study-option'&&text(e).includes('文书')).onclick();const start=button('开始阅读 · 8秒');start.onclick();start.onclick();assert.deepEqual(requests,[['jp-library','jp-writing-intro']]);assert.deepEqual(f.store.saved,before,'browsing never mints a ticket');
ui.open(station);const foreign=button('开始阅读 · 8秒');country='france';foreign.onclick();assert.equal(requests.length,1);ui.update();assert(!ui.isOpen());assert.equal(ui.open(station),false);ui.dispose();
console.log('PASS Japan local study: four local skills/icons; shared XP/day cap; completion/cancel/reload/replay/save failure; authentic v8 paid/applications/tickets preserved; strict current-schema row; menu country/stale-action guards (simulated DOM)');
