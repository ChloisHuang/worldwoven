// Shared-catalogue regressions: the clerk-only entry point, selected registration
// and old unpaid receipts must not hide other careers or act on the wrong role.
// Real core + French labor intents; only DOM, actor and tool surfaces are stubs.
import assert from 'node:assert/strict';
import {createCareerHandbook} from '../source/game/career-handbook.js';
import {createFormalCareers, FORMAL_CAREER_ROLES, GARDEN_ASSISTANT_ROLE} from '../source/game/formal-careers.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {registerHooks} from 'node:module';
registerHooks({resolve(id,context,next){return id==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(id,context);}});
const {createFranceGardenerLabor}=await import('../source/game/france-gardener-labor.js');
const {FRANCE_GARDENER:P}=await import('../source/game/france-gardener-place.js');

const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,
  setAttribute(key,value){this.attributes[key]=String(value);},
  append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},
  showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const doc={head:element('head'),body:element('body'),createElement:element};
const all=e=>[e,...e.children.flatMap(all)],find=(e,p)=>all(e).find(p),text=e=>all(e).map(item=>item.textContent).join('\n');
const clock={day:0,hour:10,seconds:0},requests=[],store={},loan={owner:null,borrowed:false};
let country='china',failBank=false,ui;
const bank=createCurrencyLedger({saveState:s=>{if(failBank)return false;store.bank=structuredClone(s);}});
const careers=createFormalCareers({getClock:()=>clock,saveState:s=>{store.careers=structuredClone(s);},creditWageToBank:bank.creditWageToBank});
const player={ageYears:22,walking:false,root:{position:{x:0,y:0,z:0},rotation:{y:0}}};
const move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
const gardener={loanState:()=>({...loan}),hostReady:()=>true,requestMeeting:()=>true,releaseMeeting(){},
  reserveTools(id){if(loan.owner&&loan.owner!==id)return false;loan.owner=id;return true;},
  releaseTools(id){if(loan.owner===id){loan.owner=null;loan.borrowed=false;}},
  takeCan(id){if(loan.owner!==id)return false;loan.borrowed=true;return true;},
  returnCan(id){if(loan.owner!==id)return false;loan.borrowed=false;return true;}};
const labor=createFranceGardenerLabor({careers,gardener,getPlayer:()=>player,copperLedger:bank,
  saveState:s=>{store.labor=structuredClone(s);},openRegistration:options=>ui.open(options),document:null});
const clerk={intent(kind='view'){return {id:`clerk-${kind}`,provider:'china-court-career',kind,action:`录事${kind}`,intentKey:`${careers.state().revision}:${kind}`};}};
const tavern={intent(kind='view'){return {id:`tavern-${kind}`,provider:'china-tavern-labor',kind,action:`酒楼${kind}`,intentKey:`${careers.state().revision}:${kind}`};}};
ui=createCareerHandbook({careers,copperLedger:bank,getClock:()=>clock,getCountry:()=>country,document:doc,
  getService:roleId=>{
    assert.equal(FORMAL_CAREER_ROLES.find(role=>role.id===roleId)?.country,country,'Foreign controllers must not be consulted');
    return roleId===GARDEN_ASSISTANT_ROLE.id?labor:roleId==='cn-court-clerk'?clerk:tavern;
  },onIntent:intent=>requests.push(intent)});
const dialog=find(doc.body,e=>e.className==='career-dialog'),openButton=find(doc.body,e=>e.className==='career-open');
const buttons=label=>all(dialog).filter(e=>e.tag==='button'&&e.textContent===label);
const click=(label,index=0)=>{const b=buttons(label)[index];assert(b,`Missing button: ${label}`);b.onclick();return b;};
const assertCatalogue=()=>{for(const role of FORMAL_CAREER_ROLES)assert(text(dialog).includes(role.name));assert(text(dialog).includes('16–17铜文'));assert(text(dialog).includes('8–9法国券'));};

ui.update('lot');assert.equal(openButton.hidden,false,'A new player can discover careers before hiring');openButton.onclick();
assertCatalogue();assert(text(dialog).includes('从世界地图进入法国'));assert(text(dialog).includes('当前空缺 1/1'));
const before=careers.state();click('工资');click('成长');assert(text(dialog).includes('晋升 · 尚未开放'));assert.deepEqual(careers.state(),before,'Reading never changes career state');
ui.open(true);assert(text(dialog).includes('九品礼务录事'));click('职位目录');assertCatalogue();
assert.equal(buttons('录事apply').length,1);assert.equal(buttons('酒楼formal-apply').length,0,'Court registration never applies to another vacancy');
click('查看职责',0);assert.equal(buttons('录事apply').length,1,'Inspecting the registered role preserves its application');
click('职位目录');click('前往云来酒楼登记');assert.equal(requests.at(-1).provider,'china-tavern-labor');assert.equal(requests.at(-1).kind,'view');

// Enter through the actual French employer's formal-view handshake.
country='france';move(P.registration);assert(labor.executeIntent(labor.intent('formal-view')));assertCatalogue();
assert(text(dialog).includes('当前登记'));assert(text(dialog).includes('西苑常任园艺助理 · 埃米尔'));
assert.equal(buttons('申请常任园艺助理').length,1,'Application is next to its own catalogue entry');
const applicationRow=all(dialog).find(e=>e.className==='career-actions'&&e.children.some(b=>b.textContent==='申请常任园艺助理'));
assert(applicationRow?.children.some(b=>b.textContent==='查看职责'));
click('查看职责',2);assert.equal(buttons('申请常任园艺助理').length,1,'Details retain this employer registration');
for(let serial=1;serial<=2;serial++)assert(careers.completedLowerWork({source:'fr-garden-labor',receiptId:`fr-garden-labor-${serial}`}).ok);
ui.update('lot');const applyButton=click('申请常任园艺助理');const application=requests.at(-1);
assert.equal(application.kind,'formal-apply');assert.equal(application.provider,'france-gardener-labor');
assert.equal(careers.currentRole(),null,'A handbook click only creates physical navigation');
const count=requests.length;applyButton.onclick();assert.equal(requests.length,count,'Dismissed buttons cannot dispatch twice');
move([0,0,0]);assert.equal(labor.executeIntent(application),false,'The actual controller rejects remote registration');
move(P.registration);assert(labor.executeIntent(application));labor.update(.1);assert.equal(careers.currentRole().id,GARDEN_ASSISTANT_ROLE.id);

// Choosing the clerk in the catalogue cannot change the held role's work tabs.
ui.open({country:'france',roleId:'cn-court-clerk'});click('今日安排');assert(text(dialog).includes('西苑常任园艺助理'));
assert(!text(dialog).includes('朝会11:30'));assert.equal(buttons('开始今日园艺班次').length,1);
click('工资');assert(text(dialog).includes('日薪 · 8–9法国券'));assert(text(dialog).includes('前往中国钱庄'));
click('评价');assert(text(dialog).includes('主管 · 埃米尔'));assert(!text(dialog).includes('沈叙'));

// Real labor completion leaves an inspection receipt that remains due tomorrow.
const act=kind=>{const intent=labor.intent(kind);assert(intent,kind);move(intent.position);assert(labor.executeIntent(intent));for(let n=0;n<(kind==='water'?51:15);n++)labor.update(.1);};
ui.close();act('accept');act('take');act('water');act('water');act('return');assert.equal(careers.state().lastDuty.stage,'inspection');
clock.day=1;clock.hour=9;clock.seconds=100;assert(careers.observeDay().ok);ui.open();
assert(text(dialog).includes('第1日的工作仍待结清'));assert(text(dialog).includes('待埃米尔当面验收'));
assert.equal(buttons('提交当班验收 · 工资存法国券账户').length,1);
click('工资');assert(text(dialog).includes('第1日 · 待结清工资'));
failBank=true;click('提交当班验收 · 工资存法国券账户');const claim=requests.at(-1);move(claim.position);assert(labor.executeIntent(claim));labor.update(.1);
assert.equal(careers.state().lastDuty.stage,'ready');clock.day=2;clock.seconds=200;assert(careers.observeDay().ok);ui.open();
assert(text(dialog).includes('第1日的工作仍待结清'));assert(text(dialog).includes('工资待账户入账'));
click('工资');assert(text(dialog).includes('第1日 · 待结清工资'));assert(text(dialog).includes('核定9法国券'));
ui.update('lot');click('评价');assert(text(dialog).includes('主管 · 埃米尔'));assert(text(dialog).includes('第1日'));
assert(text(find(doc.body,e=>e.className?.startsWith('career-review-pop'))).includes('埃米尔'));
assert.equal(bank.balances().france.cash,0);assert.equal(bank.balances().france.bank,0);

// Travel and close invalidate old UI controls before their routed action runs.
ui.open({country:'france',roleId:GARDEN_ASSISTANT_ROLE.id});const route=buttons(`前往${GARDEN_ASSISTANT_ROLE.workplace}登记`)[0];assert(route);
country='china';const routed=requests.length;route.onclick();assert.equal(requests.length,routed);
ui.close();route.onclick();assert.equal(requests.length,routed);ui.update('globe');assert(find(doc.body,e=>e.className==='career-wallet-slot').hidden);
ui.dispose();labor.dispose();
console.log('PASS career handbook: all3 roles before hiring and from court; employer-specific registration; real French intent handshake; actual tenure and review; prior-day inspection/ready wages; stale/cross-country actions');
