// Local registration and a single current-role handbook must not mix countries,
// show tabs, or turn an unemployed HUD icon into a remote application.
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
ui=createCareerHandbook({careers,copperLedger:bank,getClock:()=>clock,getCountry:()=>country,getPlayer:()=>player,document:doc,
  getService:roleId=>{
    assert.equal(FORMAL_CAREER_ROLES.find(role=>role.id===roleId)?.country,country,'Foreign controllers must not be consulted');
    return roleId===GARDEN_ASSISTANT_ROLE.id?labor:roleId==='cn-court-clerk'?clerk:tavern;
  },onIntent:intent=>requests.push(intent)});
const dialog=find(doc.body,e=>e.className==='career-dialog'),openButton=find(doc.body,e=>e.className==='career-open');
const buttons=label=>all(dialog).filter(e=>e.tag==='button'&&e.textContent===label);
const click=(label,index=0)=>{const b=buttons(label)[index];assert(b,`Missing button: ${label}`);b.onclick();return b;};
const assertCatalogue=()=>{const cards=all(dialog).filter(e=>e.className==='career-role-card');assert.equal(cards.length,country==='china'?2:1);for(const role of FORMAL_CAREER_ROLES)assert.equal(cards.some(card=>text(card).includes(role.name)),role.country===country);assert.equal(all(dialog).filter(e=>e.className==='career-tabs'||e.attributes.role==='tab').length,0);assert.equal(buttons('查看职责').length,0);};
const assertIcon=()=>{assert.equal(openButton.textContent,'');assert(openButton.children.some(e=>e.className==='career-icon'&&e.attributes['aria-hidden']==='true'&&e.innerHTML.includes('<svg')));const css=text(doc.head);assert(css.includes('width:44px;height:44px'));assert(css.includes('border:0;border-radius:0;background:transparent;box-shadow:none'));};

ui.update('lot');assertIcon();assert.equal(openButton.attributes['aria-label'],'前往当地职业登记处');openButton.onclick();
assert.equal(dialog.open,false,'Unemployed HUD navigates instead of opening a work handbook');
assert.equal(requests.at(-1).kind,'view');assert.equal(requests.at(-1).provider,'china-court-career');
assert.equal(careers.currentRole(),null);assert.equal(careers.state().lastDuty,null);
ui.open();assert.equal(buttons('工资').length,0);assert.equal(buttons('评价').length,0);assert.equal(buttons('晋升').length,0);
assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,0,'No remote job catalogue from unemployed handbook');
const before=careers.state();ui.open(true);assertCatalogue();
assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,2);
assert(text(dialog).includes('22岁 / 18岁'));assert(text(dialog).includes('0点 / 2点'));
assert.equal(buttons('条件不足 · 暂不可申请').length,1);assert.equal(buttons('条件不足 · 暂不可申请')[0].disabled,true);
const requestCount=requests.length;click('条件不足 · 暂不可申请');assert.equal(requests.length,requestCount);
assert.deepEqual(careers.state(),before,'Reading requirements never changes career state');
click('前往云来酒楼登记');assert.equal(requests.at(-1).provider,'china-tavern-labor');assert.equal(requests.at(-1).kind,'formal-view');

// Countries without a registry never offer a false route or a foreign catalogue.
for(const unsupported of ['japan','egypt']){country=unsupported;ui.update('lot');assert.equal(openButton.hidden,true);const count=requests.length;openButton.onclick();assert.equal(requests.length,count);assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,0);ui.close();}

// The physical employer renders only its country's registry and actual result.
country='france';ui.update('lot');openButton.onclick();assert.equal(requests.at(-1).kind,'formal-view');
assert.equal(dialog.open,false);move(P.registration);assert(labor.executeIntent(labor.intent('formal-view')));assertCatalogue();
assert(text(dialog).includes('当前登记处'));assert(text(dialog).includes('埃米尔'));
assert.equal(buttons('条件不足 · 暂不可申请').length,1);
assert(labor.executeIntent(labor.intent('formal-apply')));labor.update(.1);
assert(text(dialog).includes('申请未通过 · 未建立正式任职'));assert.equal(careers.currentRole(),null);
assert.equal(labor.state().job,null);assert.equal(labor.state().formalHired,false);assert.equal(bank.state().bank,0);
assert.equal(buttons('条件不足 · 暂不可申请').length,1);
for(let serial=1;serial<=2;serial++)assert(careers.completedLowerWork({source:'fr-garden-labor',receiptId:`fr-garden-labor-${serial}`}).ok);
ui.update('lot');const applyButton=click('申请常任园艺助理');const application=requests.at(-1);
assert.equal(application.kind,'formal-apply');assert.equal(application.provider,'france-gardener-labor');
assert.equal(careers.currentRole(),null,'A handbook click only creates physical navigation');
const count=requests.length;applyButton.onclick();assert.equal(requests.length,count,'Dismissed buttons cannot dispatch twice');
move([0,0,0]);assert.equal(labor.executeIntent(application),false,'The actual controller rejects remote registration');
move(P.registration);assert(labor.executeIntent(application));labor.update(.1);assert.equal(careers.currentRole().id,GARDEN_ASSISTANT_ROLE.id);

// The current-role handbook is separate from the registry catalogue.
assert(text(dialog).includes('申请通过 · 正式任职已保存'));ui.close();ui.update('lot');assertIcon();assert.equal(openButton.attributes['aria-label'],'打开当前职业手册');openButton.onclick();assert.equal(buttons('职位目录').length,0);assert(text(dialog).includes('西苑常任园艺助理'));
assert(!text(dialog).includes('朝会11:30'));assert.equal(buttons('开始今日园艺班次').length,1);
assert(text(dialog).includes('银行薪资 · 日薪 8–9法国券'));assert(text(dialog).includes('法国银行'));
assert(text(dialog).includes('主管 · 埃米尔'));assert(!text(dialog).includes('沈叙'));assert(text(dialog).includes('晋升条件 · 尚未开放'));assert(!text(dialog).includes('礼务录事'));assert.equal(buttons('录事apply').length,0);
for(const abroad of ['china','japan','egypt']){country=abroad;ui.close();ui.update('lot');assert.equal(openButton.hidden,false);openButton.onclick();assert(text(dialog).includes('西苑常任园艺助理'));assert(text(dialog).includes('法国 ·'));assert.equal(all(dialog).filter(e=>e.className==='career-role-card'||e.className==='career-tabs').length,0);assert.equal(buttons('开始今日园艺班次').length,0);}
country='france';ui.close();openButton.onclick();

// Real labor completion leaves an inspection receipt that remains due tomorrow.
const act=kind=>{const intent=labor.intent(kind);assert(intent,kind);move(intent.position);assert(labor.executeIntent(intent));for(let n=0;n<(kind==='water'?51:15);n++)labor.update(.1);};
ui.close();act('accept');act('take');act('water');act('water');act('return');assert.equal(careers.state().lastDuty.stage,'inspection');
clock.day=1;clock.hour=9;clock.seconds=100;assert(careers.observeDay().ok);ui.open();
assert(text(dialog).includes('第1日的工作仍待结清'));assert(text(dialog).includes('待埃米尔当面验收'));
assert.equal(buttons('提交当班验收 · 工资存法国券账户').length,1);
assert(text(dialog).includes('第1日 · 待结清工资'));
failBank=true;click('提交当班验收 · 工资存法国券账户');const claim=requests.at(-1);move(claim.position);assert(labor.executeIntent(claim));labor.update(.1);
assert.equal(careers.state().lastDuty.stage,'ready');clock.day=2;clock.seconds=200;assert(careers.observeDay().ok);ui.open();
assert(text(dialog).includes('第1日的工作仍待结清'));assert(text(dialog).includes('工资待账户入账'));
assert(text(dialog).includes('第1日 · 待结清工资'));assert(text(dialog).includes('核定9法国券'));
ui.update('lot');assert(text(dialog).includes('主管 · 埃米尔'));assert(text(dialog).includes('第1日'));
assert(text(find(doc.body,e=>e.className?.startsWith('career-review-pop'))).includes('埃米尔'));
assert.equal(bank.balances().france.cash,0);assert.equal(bank.balances().france.bank,0);

// Travel and close invalidate old UI controls before their routed action runs.
ui.open({country:'france',roleId:'cn-court-clerk'});const route=buttons(`前往${GARDEN_ASSISTANT_ROLE.workplace}登记`)[0];assert(route);
country='china';const routed=requests.length;route.onclick();assert.equal(requests.length,routed);
ui.close();route.onclick();assert.equal(requests.length,routed);ui.update('globe');assert(find(doc.body,e=>e.className==='career-wallet-slot').hidden);
ui.dispose();labor.dispose();
console.log('PASS career handbook: original icon-only HUD; no tabs or duties page; China/France local catalogues; no false Japan/Egypt registry; actual held-role single page abroad; existing physical apply and pending wage UI preserved');
