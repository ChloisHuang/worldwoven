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
const {createChinaCourtCareer}=await import('../source/game/china-court-career.js');
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
const clerk=createChinaCourtCareer({careers,audience:{state:()=>({})},getPlayer:()=>player,getClock:()=>clock,openRegistration:context=>ui.open(context)});
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
assert.equal(dialog.open,false);assert.equal(requests.at(-1).kind,'view');assert.deepEqual(requests.at(-1).registration,{scope:'catalogue',roleId:'cn-court-clerk'});
const untouched=careers.state();move(requests.at(-1).position);assert(clerk.executeIntent(requests.at(-1)));assertCatalogue();
assert.equal(buttons('条件不足 · 暂不可申请').length,0,'Total registry selects a counter, never applies remotely');
click('选择酒楼常任服务助理');const selected=requests.at(-1);assert.deepEqual(selected.registration,{scope:'role',roleId:'cn-tavern-steward'});
assert.equal(selected.kind,'formal-view');ui.open({country:'china',...selected.registration});
assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,1);assert(!text(dialog).includes('礼务录事'));
assert(text(dialog).includes('22岁 / 18岁'));assert(text(dialog).includes('0点 / 2点'));
assert.equal(buttons('条件不足 · 暂不可申请')[0].disabled,true);assert.deepEqual(careers.state(),untouched);

for(const unsupported of ['japan','egypt']){country=unsupported;ui.close();ui.update('lot');assert.equal(openButton.hidden,true);const count=requests.length;openButton.onclick();assert.equal(requests.length,count);assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,0);ui.close();}

// The real French adapter retains catalogue/role scope through navigation and reloads the target counter.
country='france';ui.update('lot');openButton.onclick();const totalIntent=requests.at(-1);assert.equal(totalIntent.kind,'formal-view');
move(P.registration);assert(labor.executeIntent(totalIntent));assertCatalogue();assert(text(dialog).includes('总登记处'));
click('选择西苑常任园艺助理');const roleIntent=requests.at(-1);assert.deepEqual(roleIntent.registration,{scope:'role',roleId:GARDEN_ASSISTANT_ROLE.id});
assert(labor.executeIntent(roleIntent));assert(text(dialog).includes('岗位柜台'));assert(!text(dialog).includes('总登记处'));
assert.equal(buttons('选择西苑常任园艺助理').length,0);assert.equal(buttons('条件不足 · 暂不可申请').length,1);
assert.equal(labor.resolveIntent({...roleIntent,registration:{scope:'role',roleId:'cn-tavern-steward'}}),null,'Counter cannot be retargeted to a foreign role');
assert(labor.executeIntent(labor.intent('formal-apply')));labor.update(.1);assert(text(dialog).includes('申请未通过 · 未建立正式任职'));
for(let serial=1;serial<=2;serial++)assert(careers.completedLowerWork({source:'fr-garden-labor',receiptId:`fr-garden-labor-${serial}`}).ok);
ui.update('lot');const apply=click('申请常任园艺助理'),application=requests.at(-1);assert.equal(careers.currentRole(),null);
const count=requests.length;apply.onclick();assert.equal(requests.length,count);move([0,0,0]);assert.equal(labor.executeIntent(application),false);
move(P.registration);assert(labor.executeIntent(application));labor.update(.1);assert.equal(careers.currentRole().id,GARDEN_ASSISTANT_ROLE.id);
assert(text(dialog).includes('已任职 · 未报到'));assert.equal(all(dialog).filter(e=>e.className==='career-role-card').length,0,'Owned counter shows this role status/report action only');

ui.close();ui.update('lot');assertIcon();openButton.onclick();
assert.equal(all(dialog).filter(e=>e.className==='career-metric').length,4);assert.equal(buttons('开始今日园艺班次').length,1,'Admission is explicit even though the world defaults to role status');
assert.equal(labor.intent().kind,'formal-view');assert(text(dialog).includes('未开始'));assert(text(dialog).includes('日薪 8–9法国券'));
assert(!text(dialog).includes('先到'));assert(!text(dialog).includes('再找'));assert(!text(dialog).includes('本日开工时段已过。下一模拟日再来办理'));
const staleStart=labor.intent('accept');clock.hour=19+46/60;ui.update('lot');assert(text(dialog).includes('休班 · 未报到'));
assert.equal(buttons('开始今日园艺班次').length,0);assert.equal(labor.intent('accept'),null);assert.equal(labor.executeIntent(staleStart),false);assert.equal(labor.state().job,null);
clock.hour=10;ui.update('lot');assert.equal(buttons('开始今日园艺班次').length,1,'Read-only late-window checks never advance the saved/core clock');
for(const abroad of ['china','japan','egypt']){country=abroad;ui.close();ui.update('lot');assert.equal(openButton.hidden,false);openButton.onclick();assert(text(dialog).includes('西苑常任园艺助理'));assert(text(dialog).includes('法国 ·'));assert.equal(all(dialog).filter(e=>e.className==='career-role-card'||e.className==='career-tabs').length,0);assert.equal(buttons('开始今日园艺班次').length,0);}
country='france';ui.close();openButton.onclick();

// Already admitted work keeps one current action after18:00; no next-step list or extra start button.
const act=kind=>{const intent=labor.intent(kind);assert(intent,kind);move(intent.position);assert(labor.executeIntent(intent));for(let n=0;n<(kind==='water'?51:15);n++)labor.update(.1);};
click('开始今日园艺班次');const start=requests.at(-1);move(start.position);assert(labor.executeIntent(start));labor.update(.1);
clock.hour=19+46/60;ui.open();assert(text(dialog).includes('当班中'));assert(text(dialog).includes('0 / 2 畦'));
assert.equal(buttons('领取浇水壶').length,1);assert.equal(buttons('开始今日园艺班次').length,0);assert.equal(buttons('亲手浇花 · 5 秒').length,0);
ui.close();act('take');ui.open();assert.equal(buttons('亲手浇花 · 5 秒').length,1);assert.equal(buttons('归还浇水壶').length,0);
ui.close();act('water');act('water');act('return');ui.open();assert.equal(buttons('提交当班验收 · 工资存法国券账户').length,1);
clock.day=1;clock.hour=9;clock.seconds=100;assert(careers.observeDay().ok);ui.update('lot');assert(text(dialog).includes('第1日未结班次'));assert(text(dialog).includes('已完成 · 待核薪'));
failBank=true;click('提交当班验收 · 工资存法国券账户');const claim=requests.at(-1);move(claim.position);assert(labor.executeIntent(claim));labor.update(.1);ui.open();
assert(text(dialog).includes('9法国券 · 待入账'));assert(text(dialog).includes('好评 +1'));assert.equal(bank.balances().france.bank,0);

// A previously selected role route cannot run after travel or closing.
ui.open({country:'france',scope:'catalogue',roleId:GARDEN_ASSISTANT_ROLE.id});const route=buttons('选择西苑常任园艺助理')[0];assert(route);
country='china';const routed=requests.length;route.onclick();assert.equal(requests.length,routed);ui.close();route.onclick();assert.equal(requests.length,routed);
ui.update('globe');assert(find(doc.body,e=>e.className==='career-wallet-slot').hidden);ui.dispose();labor.dispose();clerk.dispose();
console.log('PASS career UI: explicit catalogue-to-counter context; compact status/primary step/4 metrics; matching window availability; after-hours admitted work; local-only catalogue and real held role abroad');
