// The outside-window screenshot must agree with both the tavern panel and
// final formal admission. No route/work/wage scene is needed for this boundary.
import assert from 'node:assert/strict';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createChinaTavernEmployment} from '../source/game/china-tavern-employment.js';
import {createFormalCareers,TAVERN_STEWARD_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
const element=tag=>({tag,children:[],textContent:'',open:false,setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const doc={head:element('head'),body:element('body'),createElement:element},all=e=>[e,...e.children.flatMap(all)];
const clock={day:0,hour:19+46/60,seconds:0},bank=createCurrencyLedger({saveState:()=>{}}),initial=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();delete initial.loadError;delete initial.lastError;initial.skills.ritual=2;
let writes=0,labor;const careers=createFormalCareers({saved:initial,getClock:()=>clock,saveState:()=>{writes++;},creditWageToBank:bank.creditWageToBank});
const player={ageYears:24,walking:false,root:{position:{x:22.35,y:.215,z:11.7},rotation:{y:0}}},host={walking:false,root:{position:{x:24.1,y:.215,z:11.4}},station:{npcPosition:[24.1,.215,11.4]}},requests=[],panels=[];
const employment=createChinaTavernEmployment({saveState:()=>{},getJob:()=>labor?.view().job,meetHost:()=>labor.meetRegistrationHost()});
labor=createChinaTavernLabor({getPlayer:()=>player,host,employment,careers,copperLedger:bank,getClock:()=>clock,saveState:()=>{writes++;},onIntent:next=>requests.push(next),openRegistration:context=>panels.push(context),document:doc});
const view=labor.intent('formal-view');assert.deepEqual(view.registration,{scope:'role',roleId:ROLE.id});assert(labor.executeIntent(view));assert.deepEqual(panels.pop(),{country:'china',roleId:ROLE.id,scope:'role'});
const catalogue={...view,registration:{scope:'catalogue',roleId:ROLE.id}};assert(labor.executeIntent(catalogue));assert.equal(panels.pop().scope,'catalogue');assert(!labor.resolveIntent({...view,registration:{scope:'role',roleId:'cn-court-clerk'}}));assert(!labor.resolveIntent({...view,registration:{scope:'elsewhere',roleId:ROLE.id}}));
assert(labor.executeIntent(labor.intent('formal-apply')));assert(careers.isHired(ROLE.id));assert.equal(labor.view().job,null);assert.equal(requests.length,0,'application never starts walking to work');assert.equal(labor.intent().kind,'formal-view');assert.equal(labor.intent('accept'),null,'19:46 cannot offer a new shift');
const before=JSON.stringify(careers.state()),writesBefore=writes;for(let i=0;i<4;i++){assert(!labor.view().formalBeginAvailability.ok);assert.equal(labor.intent('accept'),null);}assert.equal(JSON.stringify(careers.state()),before);assert.equal(writes,writesBefore,'availability is read-only');
labor.open();const dialog=all(doc.body).find(e=>e.className==='cn-labor-dialog');assert(all(dialog).some(e=>e.textContent.includes('现在休班')));assert(!all(dialog).some(e=>e.tag==='button'&&e.textContent==='开始今日酒楼班次'));
clock.day=1;clock.hour=17.5;clock.seconds=100;labor.update(.1);const accepted=labor.intent('accept');assert(accepted);assert(all(dialog).some(e=>e.tag==='button'&&e.textContent==='开始今日酒楼班次'));
clock.hour=19+46/60;clock.seconds=110;assert(!labor.executeIntent(accepted),'stale daytime choice is rejected after closing time');assert.equal(labor.view().job,null);assert.equal(requests.length,0);
clock.day=2;clock.hour=17.5;clock.seconds=200;labor.close();assert(labor.executeIntent(labor.intent('accept')));assert.equal(requests.length,1);assert.equal(requests[0].kind,'clean');const job=structuredClone(labor.view().job);clock.hour=19+46/60;clock.seconds=210;assert(labor.intent('clean'),'already accepted work continues after the new-shift window');assert.deepEqual(labor.view().job,job);assert.equal(labor.intent().kind,'clean');assert.equal(bank.state().cash,0);assert.equal(bank.state().bank,0);
labor.dispose();console.log('PASS role-scoped China registration, explicit application without work, read-only 19:46 availability, panel/intent parity, stale start and existing-work continuation');
