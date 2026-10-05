// Reported regression: one role's outcome must not hide another role's action
// or actual qualification deficit at the same recruiter.
import assert from 'node:assert/strict';
import {createFormalCareers} from '../source/game/formal-careers.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';
const A='cn-tavern-steward',B='cn-tavern-chef';
const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(n=>n.textContent).join('\n');
function fixture(cooking){
 const clock={day:1,hour:10,seconds:0},seed=createFormalCareers({getClock:()=>clock,saveState:()=>{}}).state();seed.skills={ritual:2,writing:2,gardening:0,art:0,cooking};const core=createFormalCareers({worldSeed:2,saved:seed,getClock:()=>clock,saveState:()=>{}});
 assert(core.apply(A,{ageYears:22}).ok);assert.equal(core.reviewApplication(A,{ageYears:22,applicationId:core.applicationResult(A).id}).code,'interview-rejected');
 const doc={head:element('head'),body:element('body'),createElement:element},requests=[],ui=createCareerHandbook({careers:core,getClock:()=>clock,getCountry:()=> 'china',getPlayer:()=>({ageYears:22,root:{position:{x:22.35,y:.215,z:11.7}}}),getService:id=>({atRegistration:()=>true,intent:kind=>({id:`${id}:${kind}`,roleId:id,kind,intentKey:kind,action:kind,position:[22.35,.215,11.7]})}),copperLedger:{state:()=>({cash:0})},document:doc,onIntent:i=>requests.push(i)});
 const dialog=doc.body.children.find(e=>e.tag==='dialog');ui.open({scope:'role',roleId:A});
 const cards=()=>all(dialog).filter(e=>e.className==='career-role-card'),card=id=>cards().find(e=>text(e).includes(core.catalogue().find(r=>r.id===id).name)),primary=id=>all(card(id)).find(e=>e.className==='career-card-primary ww-airy-action');
 return {core,clock,ui,card,primary,requests};
}
const f=fixture(2);assert(f.card(A)&&f.card(B),'A rejection keeps other real jobs at this workplace visible');assert(text(f.card(A)).includes('本岗位今日次数已用'));assert(!text(f.card(B)).includes('今日次数'));assert.equal(f.primary(B).textContent,'提交职位申请');f.primary(B).onclick();assert.equal(f.requests.at(-1).roleId,B);assert.equal(f.requests.at(-1).kind,'formal-apply');assert.equal(f.core.applicationResult(B),null,'UI only requests the physical adapter');assert(f.core.apply(B,{ageYears:22}).ok);assert.equal(f.core.apply(A,{ageYears:22}).code,'already-applied-today');f.clock.day=2;f.ui.open({scope:'role',roleId:A});assert.equal(f.primary(A).textContent,'提交职位申请');assert(f.core.apply(A,{ageYears:22}).ok);f.ui.dispose();
const missing=fixture(0);assert(text(missing.card(B)).includes('烹饪需2级（当前0）'));assert(!text(missing.card(B)).includes('今日次数'));assert.equal(missing.primary(B).textContent,'查看申请条件');missing.primary(B).onclick();assert.equal(missing.requests.length,0);assert.equal(missing.core.applicationResult(B),null);missing.ui.dispose();
console.log('PASS role-local rejection UI: A daily lock, qualified B submit, real B skill deficit, next-day A, no remote mutation');
