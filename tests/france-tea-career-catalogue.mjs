// Tea roles share durable career/bank state with existing jobs. These cases
// protect source identity, local-currency pay and excused upstream handoffs.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createFormalCareers, FORMAL_CAREER_ROLES, FORMAL_CAREER_SLOTS,
  TEA_PREPARER_ROLE, TEA_SERVER_ROLE, TAVERN_STEWARD_ROLE} from '../source/game/formal-careers.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCareerHandbook} from '../source/game/career-handbook.js';

const copy=value=>structuredClone(value);
function fixture(saved={},options={}){
  const store=copy(saved),clock={day:1,hour:8,seconds:0,...options.clock},flags={rejectCareer:false};
  const bank=createCurrencyLedger({saved:store.bank,saveState:s=>{store.bank=copy(s);}});
  const careers=createFormalCareers({saved:store.careers,getClock:()=>clock,slots:options.slots,
    creditWageToBank:bank.creditWageToBank,saveState:s=>{if(flags.rejectCareer)return false;store.careers=copy(s);}});
  const study=(lessonId,count=1)=>{for(let i=0;i<count;i++){
    const ticket=careers.learningTicket('france-salon',lessonId);assert(ticket.ok);
    assert(careers.completeLearning(ticket.ticket,{seconds:8}).ok);
  }};
  const hire=role=>{study('ritual-intro',2);if(role.skillRequirements.writing)study('writing-intro');assert(careers.apply(role.id,{ageYears:18}).ok);};
  return {store,clock,flags,bank,careers,study,hire};
}

for(const role of [TEA_PREPARER_ROLE,TEA_SERVER_ROLE]){
  await test(`${role.id}: existing books qualify one separate assistant slot`,()=>{
    const f=fixture();
    assert.deepEqual(f.careers.apply(role.id,{ageYears:17}).reasons,
      ['adult-required','ritual-required',...(role.skillRequirements.writing?['writing-required']:[])]);
    f.study('ritual-intro',2);
    if(role.skillRequirements.writing){assert.deepEqual(f.careers.apply(role.id,{ageYears:18}).reasons,['writing-required']);f.study('writing-intro');}
    assert(f.careers.apply(role.id,{ageYears:18}).ok);
    assert.equal(f.careers.catalogue().find(item=>item.id===role.id).vacancy,0);
    assert.equal(f.careers.apply(TEA_SERVER_ROLE.id,{ageYears:18}).code,'already-employed');
    assert.deepEqual(f.careers.state().skills,{ritual:2,writing:role.skillRequirements.writing?1:0,gardening:0,art:0});
    const restored=fixture(f.store);
    assert.equal(restored.careers.state().version,3);
    assert.equal(restored.careers.state().loadError,null);
    assert.deepEqual(restored.careers.state().tenure,f.careers.state().tenure);
    assert.deepEqual(restored.careers.state().learning,f.careers.state().learning);
    const occupied=fixture({}, {slots:FORMAL_CAREER_SLOTS.map(slot=>slot.roleId===role.id?{...slot,holderId:'existing-assistant'}:slot)});
    occupied.study('ritual-intro',2);if(role.skillRequirements.writing)occupied.study('writing-intro');
    assert.deepEqual(occupied.careers.apply(role.id,{ageYears:18}).reasons,['no-vacancy']);
    assert.equal(occupied.careers.state().tenure,null);
    assert.equal(FORMAL_CAREER_SLOTS.find(slot=>slot.roleId===role.id).holderId,null);
  });

  await test(`${role.id}: receipt identity survives reload and pays only its French account`,()=>{
    const f=fixture();f.hire(role);const receiptId=`${role.workSource}-1`;
    assert.equal(f.careers.beginDuty({receiptId:'cn-tavern-labor-1'}).code,'invalid-work-receipt');
    assert(f.careers.beginDuty({receiptId}).ok);
    const resumed=fixture(f.store);assert.equal(resumed.careers.state().loadError,null);
    assert.equal(resumed.careers.state().lastDuty.workReceiptId,receiptId);
    assert(resumed.careers.canContinueLabor(receiptId));
    assert.equal(resumed.careers.laborEvent('completed',{roleId:role.id,receiptId:'fr-garden-labor-1'}).code,'wrong-duty-source');
    assert(resumed.careers.laborEvent('completed',{roleId:role.id,receiptId}).ok);
    assert(resumed.careers.laborEvent('inspected',{roleId:role.id,receiptId}).ok);
    const paid=resumed.careers.settle();assert(paid.ok);
    assert.deepEqual(paid.deposit,{amount:role.wage+1,receiptId:`career:${role.slotId}:1`,currency:'france',roleId:role.id,slotId:role.slotId,day:1});
    assert.equal(resumed.bank.balances().france.bank,role.wage+1);
    assert.equal(resumed.bank.balances().france.cash,0);assert.equal(resumed.bank.balances().copper.bank,0);
    assert.equal(resumed.careers.state().lastEvaluation.evaluatorId,role.supervisorId);
    const restored=fixture(resumed.store);assert.equal(restored.careers.state().loadError,null);
    assert.equal(restored.careers.state().lastDuty.stage,'paid');
    assert.equal(restored.careers.beginDuty({receiptId:`${role.workSource}-2`}).code,'already-paid-today');
    assert.equal(restored.bank.history().filter(row=>row.action==='wage').length,1);
    const malformed=copy(f.store);malformed.careers.lastDuty.workReceiptId='fr-garden-labor-1';
    assert.equal(fixture(malformed).careers.state().loadError,'invalid-career-state');
  });

  await test(`${role.id}: upstream handoff waits are excused, durable and restartable`,()=>{
    const f=fixture();f.hire(role);assert(f.careers.beginDuty({receiptId:`${role.workSource}-1`}).ok);
    f.flags.rejectCareer=true;
    assert.equal(f.careers.interruptDuty('tea-handoff-wait').code,'save-failed');
    assert.equal(f.careers.beginDuty({receiptId:`${role.workSource}-2`}).code,'interruption-unsaved');
    f.flags.rejectCareer=false;assert(f.careers.interruptDuty('tea-handoff-wait').ok);
    assert.equal(f.careers.state().performance,0);assert.equal(f.careers.state().lastEvaluation,null);
    const resumed=fixture(f.store);assert.equal(resumed.careers.state().loadError,null);
    assert.equal(resumed.careers.state().lastDuty.reason,'tea-handoff-wait');
    assert(resumed.careers.beginDuty({receiptId:`${role.workSource}-2`}).ok,'upstream wait does not consume the day');
    assert.equal(resumed.careers.state().lastDuty.workReceiptId,`${role.workSource}-2`);
    assert(resumed.careers.interruptDuty('tea-handoff-wait').ok);
    resumed.clock.day=2;assert(resumed.careers.observeDay().unchanged);
    assert.equal(resumed.careers.state().performance,0);assert.equal(resumed.careers.state().lastEvaluation,null);
    assert(resumed.careers.beginDuty({receiptId:`${role.workSource}-3`}).ok);
    assert(resumed.careers.interruptDuty('cancelled').ok);
    assert.equal(resumed.careers.state().performance,-1,'abandoning actual work retains the existing review rule');
    assert.equal(resumed.bank.balances().france.bank,0);
  });
}

await test('tea wait exemption cannot excuse an unrelated labor job',()=>{
  const f=fixture(),role=TAVERN_STEWARD_ROLE;f.hire(role);
  assert(f.careers.beginDuty({receiptId:`${role.workSource}-1`}).ok);
  assert(f.careers.interruptDuty('tea-handoff-wait').ok);
  assert.equal(f.careers.state().performance,-1);
  assert.equal(f.careers.beginDuty({receiptId:`${role.workSource}-2`}).code,'duty-missed');
});

// A small DOM stub exercises the actual handbook's role selection and routed
// actions. The service stub only supplies intents; it never completes work.
const element=tag=>({tag,children:[],textContent:'',open:false,hidden:false,
  setAttribute(){},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},
  showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const all=e=>[e,...e.children.flatMap(all)],text=e=>all(e).map(item=>item.textContent).join('\n');
for(const role of [TEA_PREPARER_ROLE,TEA_SERVER_ROLE])await test(`${role.id}: handbook describes its real duty, currency and cancellation`,()=>{
  const f=fixture();f.hire(role);assert(f.careers.beginDuty({receiptId:`${role.workSource}-1`}).ok);
  const doc={head:element('head'),body:element('body'),createElement:element},requests=[];
  const service={intent(kind='work'){return {id:`${role.id}-${kind}`,kind,action:kind==='cancel'?'取消本轮茶务班次':kind,intentKey:`${role.id}-${kind}`};}};
  const ui=createCareerHandbook({careers:f.careers,copperLedger:f.bank,getClock:()=>f.clock,getCountry:()=>'france',
    getService:id=>id===role.id?service:null,document:doc,onIntent:intent=>requests.push(intent)});
  const dialog=all(doc.body).find(item=>item.className==='career-dialog');
  const findButton=label=>all(dialog).find(item=>item.tag==='button'&&item.textContent===label);
  const click=label=>{const button=findButton(label);assert(button,`Missing ${label}`);button.onclick();return button;};
  ui.open({country:'france',roleId:role.id});for(const item of FORMAL_CAREER_ROLES)assert(text(dialog).includes(item.name));
  click('职责');assert(text(dialog).includes('加布里埃尔'));assert(text(dialog).includes('同一份茶盘'));
  assert(text(dialog).includes(role.id===TEA_PREPARER_ROLE.id?'亲手切好小蛋糕、冲泡热茶':'送回加布里埃尔原座位'));
  assert(text(dialog).includes(role.id===TEA_PREPARER_ROLE.id?'糕点房备茶案旁':'镜厅入口'));
  assert(findButton('取消本轮茶务班次'));
  click('今日安排');assert(text(dialog).includes(role.id===TEA_PREPARER_ROLE.id?'本轮茶点备制':'本轮侍茶服务'));
  const cancel=click('取消本轮茶务班次');assert.equal(requests.at(-1).kind,'cancel');cancel.onclick();assert.equal(requests.length,1);
  ui.open();click('工资');assert(text(dialog).includes(`日薪 · ${role.wage}–${role.wage+1}法国券`));
  assert(text(dialog).includes('选择法国券账户取款'));assert(!findButton('取消本轮茶务班次'));
  click('成长');assert(!text(dialog).includes('三份正式职位'));
  assert(f.careers.interruptDuty('tea-handoff-wait').ok);ui.open();
  assert(text(dialog).includes('不记缺勤差评'));assert(text(dialog).includes('重新接班'));
  ui.dispose();
});
