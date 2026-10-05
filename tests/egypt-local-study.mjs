// Guards the Egyptian local source against foreign-book leakage, mismatched skill
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
const local=studyOptions('egypt-papyrus','egypt');
assert.equal(studyCountry('egypt-papyrus'),'egypt');assert.deepEqual(local.map(x=>x.skill),['ritual','writing','art','cooking']);
for(const country of ['china','france','japan'])assert.equal(studyOptions('egypt-papyrus',country).length,0);
for(const source of ['cn-rest','cn-calligraphy','france-salon','france-atelier'])assert.equal(studyOptions(source,'egypt').length,0);
assert(local.every(x=>x.id.startsWith('eg-')&&x.action==='read'&&x.seconds===8));
assert.equal(new Set(local.map(x=>studyIcon(x.skill))).size,4,'all four skills have distinct icons');
assert(playerStationIntent({id:'egypt-papyrus',position:[-5.5,0,-1.7],action:'选择纸莎草书目与技能'}));
const f=fixture();
const finish=(skill,c=f.careers,source='egypt-papyrus')=>{const lesson=studyOptions(source).find(x=>x.skill===skill);const start=c.learningTicket(source,lesson.id);assert(start.ok);return {ticket:start.ticket,result:c.completeLearning(start.ticket,{seconds:8})};};
for(const lesson of local){
 const {ticket,result}=finish(lesson.skill);assert.equal(result.skill,lesson.skill);assert.equal(result.xpGained,10);assert.equal(result.level,0);assert.equal(result.required,30);
 assert.equal(f.careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
 assert.equal(fixture(f.store.saved).careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
}
assert.deepEqual(f.careers.state().skillXP,{ritual:10,writing:10,gardening:0,art:10,cooking:10,martial:0,care:0});
assert.equal(f.careers.learningTicket('egypt-papyrus','writing-intro').code,'unknown-learning-choice');
const cancelled=f.careers.learningTicket('egypt-papyrus','eg-art-intro').ticket;assert.equal(f.careers.completeLearning(cancelled,{seconds:7.99}).code,'learning-incomplete');
f.careers.cancelLearning(cancelled);assert.equal(f.careers.completeLearning(cancelled,{seconds:100}).code,'learning-interrupted');assert.equal(f.careers.state().skillXP.art,10);
const interrupted=f.careers.learningTicket('egypt-papyrus','eg-writing-intro').ticket,reload=fixture(f.store.saved);
assert.equal(reload.careers.completeLearning(interrupted,{seconds:8}).code,'learning-interrupted');
assert(reload.careers.resumeLearning(interrupted,{seconds:3}).ok);assert.equal(reload.careers.completeLearning(interrupted,{seconds:8}).xpGained,10);
const failed=f.careers.learningTicket('egypt-papyrus','eg-cooking-intro').ticket;f.flags.fail=true;assert.equal(f.careers.completeLearning(failed,{seconds:8}).code,'save-failed');assert.equal(f.careers.state().skillXP.cooking,10);f.flags.fail=false;assert.equal(f.careers.completeLearning(failed,{seconds:8}).xpGained,10);
// Country-specific books share one existing skill, XP curve and daily cap.
assert.equal(finish('art',f.careers,'cn-rest').result.xpGained,10);assert.equal(finish('art').result.level,1);assert.equal(finish('art').result.required,40);assert.equal(finish('art').result.limited,'daily-skill-limit');
assert.equal(studySkillProgress(f.careers.state(),'art',1).remaining,0);assert.equal(f.careers.state().skillXP.art,10);
f.clock.day=2;assert.equal(studySkillProgress(f.careers.state(),'art',2).remaining,4);assert.equal(finish('art').result.xp,20);
assert.equal(studyJobLinks(f.careers,'ritual','egypt'),'当地暂无以此技能为门槛的开放职位');
assert.equal(f.careers.learningTicket('egypt-cleopatra-suite','eg-writing-intro').code,'unknown-learning-source');
assert.equal(studyOptions('egypt-royal-reception').length,0,'no unrelated private/royal classroom source');
const published=JSON.parse(fs.readFileSync(new URL('./fixtures/egypt-study-published-v9.json',import.meta.url)));
for(const key of ['paid','active']){
 const {saved:old,clock}=published[key],m=fixture(old,clock,published.worldSeed),migrated=m.careers;
 assert.equal(migrated.state().loadError,null);assert.equal(migrated.state().version,10);
 for(const field of Object.keys(old))if(!['version','learning'].includes(field))assert.deepEqual(migrated.state()[field],old[field],key+' '+field+' preserved');
 for(const [source,row]of Object.entries(old.learning))assert.deepEqual(migrated.state().learning[source],row,'all six old tickets preserved');
 assert.deepEqual(migrated.state().learning['egypt-papyrus'],{issued:0,completed:0,issuedDay:null,lessonId:null});
 assert.equal(migrated.settle().code,'work-incomplete');assert.deepEqual(migrated.state().lastDuty,old.lastDuty);
 const completed=old.learning['cn-calligraphy'];assert.equal(migrated.completeLearning({source:'cn-calligraphy',id:`cn-calligraphy:${completed.issued}:${completed.issuedDay}`,lessonId:completed.lessonId},{seconds:8}).code,'learning-replayed');
 if(key==='paid'){
  assert.equal(finish('ritual',migrated).result.limited,'daily-skill-limit');assert.deepEqual(migrated.state().skillXP,old.skillXP);
  const row=old.learning['jp-library'],ticket={source:'jp-library',id:`jp-library:${row.issued}:${row.issuedDay}`,lessonId:row.lessonId};
  assert.equal(migrated.completeLearning(ticket,{seconds:8}).code,'learning-interrupted');assert(migrated.resumeLearning(ticket,{seconds:3}).ok);assert.equal(migrated.completeLearning(ticket,{seconds:8}).xpGained,10);
  assert.equal(fixture(m.store.saved,clock).careers.completeLearning(ticket,{seconds:8}).code,'learning-replayed');
 }
 for(const mutate of [s=>{delete s.learning['egypt-papyrus'];},s=>s.learning['egypt-papyrus'].completed=99,s=>s.learning['egypt-papyrus'].lessonId='writing-intro']){
  const broken=migrated.state();mutate(broken);const bad=fixture(broken,clock),before=clone(bad.store.saved);
  assert.equal(bad.careers.state().loadError,'invalid-career-state');assert.equal(bad.careers.learningTicket('egypt-papyrus','eg-writing-intro').code,'invalid-career-state');assert.deepEqual(bad.store.saved,before,'bad data not overwritten with zero progress');
 }
 for(const mutate of [s=>{delete s.learning['jp-library'];},s=>{delete s.learning['france-atelier'];},s=>s.learning['jp-library'].completed=99,s=>s.lastDuty.wage=999]){
  const broken=clone(old);mutate(broken);const bad=fixture(broken,clock);assert.equal(bad.careers.state().loadError,'invalid-career-state');assert.deepEqual(bad.store.saved,broken);
 }
}
// Real menu code, simulated DOM: the existing layout is reused unchanged.
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,events:{},setAttribute(k,v){this.attributes[k]=String(v);},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(k,v){this.events[k]=v;},remove(){}});
const doc={head:element('head'),body:element('body'),createElement:element},all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(x=>x.textContent).join('\n');let country='egypt';const requests=[];
const ui=createStudyMenu({careers:f.careers,getClock:()=>f.clock,getCountry:()=>country,document:doc,onChoose:(station,id)=>requests.push([station.id,id])}),station={id:'egypt-papyrus',name:'神殿书吏壁龛'},dialog=doc.body.children[0];
const find=p=>all(dialog).find(p),button=label=>find(e=>e.tag==='button'&&e.textContent===label),before=clone(f.store.saved);
assert(ui.open(station));assert.equal(all(dialog).filter(e=>e.className==='study-option').length,4);assert(!text(dialog).includes('西苑'));assert(!text(dialog).includes('霞汤屋'));assert(!text(dialog).includes('医药'));assert(!text(dialog).includes('礼务录事'));
for(const lesson of local){find(e=>e.className==='study-option'&&text(e).includes(lesson.title.slice(1,-1))).onclick();assert(text(dialog).includes(lesson.excerpt));assert(text(dialog).includes('升级进度'));assert(all(dialog).some(e=>e.attributes.role==='progressbar'&&e.attributes['aria-valuemax']));}
const stale=button('开始阅读 · 8秒');button('暂时不学').onclick();stale.onclick();assert.equal(requests.length,0);assert.deepEqual(f.store.saved,before);
assert(ui.open(station));find(e=>e.className==='study-option'&&text(e).includes('文书')).onclick();const start=button('开始阅读 · 8秒');start.onclick();start.onclick();assert.deepEqual(requests,[['egypt-papyrus','eg-writing-intro']]);assert.deepEqual(f.store.saved,before,'browsing never mints a ticket');
ui.open(station);const foreign=button('开始阅读 · 8秒');country='france';foreign.onclick();assert.equal(requests.length,1);ui.update();assert(!ui.isOpen());assert.equal(ui.open(station),false);ui.dispose();
console.log('PASS Egypt local study: four local skills/icons; shared XP/day cap; completion/cancel/reload/replay/save failure; authentic v9 paid and active tenure, wages, daily caps and all old tickets preserved; strict current-schema row; menu country/stale-action guards (simulated DOM)');
