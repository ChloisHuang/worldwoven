// Focused UI contract checks: this panel must never turn a remote click into a
// physical receipt, accept stale choices, or replace focused/scrolled content.
import assert from 'node:assert/strict';
import test from 'node:test';
import {consortPetitionView,createChinaConsortPetitionUI} from '../source/game/china-consort-petition-ui.js';
const target={id:'reception',position:[1,.2,1],radius:1.1},meeting={id:'audience',position:[5,.2,5],radius:1.1};
const walk=e=>[e,...e.children.flatMap(walk)];
function fixture(options={}){
 let doc;
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this._text='';this.listeners={};this.scrollTop=0;this.replacements=0;}
  set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
  append(...items){for(const e of items){e.remove();e.parent=this;this.children.push(e);}}
  replaceChildren(...items){this.replacements++;for(const e of this.children)e.parent=null;this.children=[];this._text='';this.append(...items);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(e=>e!==this);this.parent=null;}
  setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
  addEventListener(k,f){this.listeners[k]=f;}showModal(){this.open=true;}close(){this.open=false;}focus(){doc.activeElement=this;}
 }
 doc={head:new Element('head'),body:new Element('body'),createElement:t=>new Element(t)};
 let card={stage:'none',blockers:[],physical:{heraldPresent:true}},details={seat:{occupied:3,capacity:4}},rows=[];
 const player={root:{position:{x:0,y:.2,z:0}}},intents=[],choices=[],withdrawals=[];
 const service={statusCard:()=>structuredClone(card),interactionTarget:()=>['submitted','accepted','charter-held'].includes(card.stage)?meeting:target,
  respond(choice){choices.push(choice);card.stage=choice==='accept'?'accepted':'declined';return {ok:true};},withdraw(){withdrawals.push(card.applicationId);card.stage='withdrawn';return {ok:true};},submit(){throw Error('UI must not call physical service methods');},requestAudience(){throw Error('UI must not call physical service methods');},requestInvestiture(){throw Error('UI must not call physical service methods');}};
 const ui=createChinaConsortPetitionUI({service,getPlayer:()=>player,getDetails:()=>details,getLedger:()=>({history:()=>rows}),onIntent:intent=>{assert.equal(ui.isOpen(),false);intents.push(intent);return true;},document:doc,...options});
 const dialog=doc.body.children[0],find=id=>walk(dialog).find(e=>e.attrs['data-consort-action']===id),visible=()=>walk(dialog).filter(e=>e.tag==='button'&&!e.hidden);
 return {doc,dialog,ui,find,visible,intents,choices,withdrawals,player,service,setCard:v=>{card=v;},getCard:()=>card,setDetails:v=>{details=v;},setRows:v=>{rows=v;}};
}
test('read-only view keeps approval and acceptance separate from appointed identity',()=>{
 for(const stage of ['none','submitted','awaiting-choice','accepted','charter-held']){
  const v=consortPetitionView({card:{stage,titleId:'consort',result:{passed:true},blockers:[]},target});
  assert.equal(v.identity,'无宫廷名位');assert.notEqual(v.result,'名位生效');
 }
 const v=consortPetitionView({card:{stage:'appointed',titleId:'consort',residence:{}},details:{seat:{occupied:4,capacity:4},residenceLabel:'南苑寝房',meal:{remaining:97,capacity:120,target}}});
 assert.equal(v.identity,'妃嫔');assert.equal(v.mealText,'库存御膳 · 余 97 / 120 份');assert.equal(v.actions.length,1);assert.equal(v.actions[0].action,'meal');
 assert(!JSON.stringify(v).includes('现金'));assert.equal(consortPetitionView({card:{},target}).actions[0].disabled,true);
});
test('all physical buttons dispatch route intents and never mutate the ledger remotely',()=>{
 const f=fixture();for(const [stage,action]of [['none','submit'],['submitted','audience'],['accepted','investiture'],['charter-held','read-charter']]){
  f.setCard({stage,blockers:[],physical:{heraldPresent:true}});f.ui.open();f.find('primary').onclick();assert.equal(f.intents.at(-1).action,action);assert.equal(f.getCard().stage,stage);
 }
 assert.equal(f.choices.length,0);f.ui.dispose();
});
test('at-site labels do not bypass herald presence or explicit acceptance blockers',()=>{
 const f=fixture();f.player.root.position={x:1,y:.2,z:1};f.setCard({stage:'none',blockers:[],physical:{heraldPresent:false}});f.ui.open();assert.equal(f.find('primary').disabled,true);assert.equal(f.find('primary').textContent,'等候沈序接待');
 f.setCard({stage:'awaiting-choice',result:{passed:true},blockers:[{code:'finish-current-duty',text:'先完成原职位班次'},{code:'leave-formal-career',text:'先办妥原正式职位离任'}]});f.ui.update();assert.equal(f.find('accept').disabled,true);assert.equal(f.find('decline').disabled,false);assert(f.dialog.textContent.includes('先完成原职位班次'));f.find('accept').onclick();assert.equal(f.choices.length,0);f.find('decline').onclick();assert.deepEqual(f.choices,['decline']);assert.equal(f.getCard().stage,'declined');f.ui.dispose();
});
test('emperor invitation is an explicit choice with its own source and expiry wording',()=>{
 const card={applicationId:'invitation-one',source:'emperor-invitation',stage:'awaiting-choice',blockers:[],expiresAt:2*1440+14*60+30,result:{passed:true}};
 const v=consortPetitionView({card,target,history:[{...card,submittedAt:{day:2}}]});
 assert.equal(v.identity,'无宫廷名位');assert.equal(v.stageLabel,'皇帝相邀 · 待你答复');assert.equal(v.result,'皇帝相邀');assert(v.note.includes('第3日 14:30 前答复'));assert.equal(v.historyLabel,'宫廷往来');assert(!JSON.stringify(v).includes('自荐'));
 assert.deepEqual(v.actions.map(a=>[a.action,a.label]),[['accept','接受皇帝邀约'],['decline','婉拒邀约']]);
 const speaking=consortPetitionView({card:{stage:'none',blockers:[],physical:{phase:'invitation'}},target});assert.equal(speaking.actions.length,0);assert.equal(speaking.note,'皇帝正在与你说话');
 const expired=consortPetitionView({card:{...card,stage:'expired'},target});assert.equal(expired.stageLabel,'皇帝邀约已过期');assert.equal(expired.result,'邀约已过期');assert(!expired.actions.some(a=>a.action==='accept'||a.action==='decline'));
});
test('invitation close and Escape never accept, and a fresh explicit choice does',()=>{
 const f=fixture();f.setCard({applicationId:'invitation-one',source:'emperor-invitation',stage:'awaiting-choice',blockers:[]});f.ui.open();assert.equal(f.choices.length,0);
 walk(f.dialog).find(e=>e.attrs['aria-label']==='关闭名位状态').onclick();assert.equal(f.ui.isOpen(),false);assert.equal(f.getCard().stage,'awaiting-choice');
 f.ui.open();f.dialog.listeners.cancel({preventDefault(){}});assert.equal(f.choices.length,0);assert.equal(f.getCard().stage,'awaiting-choice');
 f.ui.open();f.find('accept').onclick();assert.deepEqual(f.choices,['accept']);assert.equal(f.getCard().stage,'accepted');assert(f.dialog.textContent.includes('已接受皇帝邀约'));f.ui.dispose();
});
test('replaced or expired invitations invalidate captured answers before the service is called',()=>{
 const f=fixture();f.setCard({applicationId:'invitation-one',source:'emperor-invitation',stage:'awaiting-choice',blockers:[]});f.ui.open();const old=f.find('accept').onclick;
 f.getCard().applicationId='invitation-two';old();assert.equal(f.choices.length,0);assert.equal(f.getCard().stage,'awaiting-choice');
 const current=f.find('accept').onclick;f.getCard().stage='expired';current();assert.equal(f.choices.length,0);assert.equal(f.find('accept').hidden,true);assert(f.dialog.textContent.includes('邀约已过期'));f.ui.dispose();
});
test('semantic changes invalidate captured actions; focus, history and scroll survive updates',()=>{
 const f=fixture();f.setCard({stage:'awaiting-choice',blockers:[],historyCount:1});f.setRows([{id:'secret-id',stage:'awaiting-choice',submittedAt:{day:2}}]);f.ui.open();const accept=f.find('accept'),captured=accept.onclick,history=walk(f.dialog).find(e=>e.tag==='details'),body=walk(f.dialog).find(e=>e.className?.includes('cn-consort-content'));
 accept.focus();history.open=true;body.scrollTop=34;const children=[...f.dialog.children];for(let n=0;n<20;n++)f.ui.update();assert.deepEqual(f.dialog.children,children);assert.equal(f.doc.activeElement,accept);assert.equal(body.scrollTop,34);assert.equal(history.open,true);
 f.setDetails({seat:{occupied:3,capacity:4},meal:{remaining:90}});f.setCard({stage:'awaiting-choice',blockers:[{code:'settle-current-wages',text:'先结清原职位待领工资'}],historyCount:1});captured();assert.equal(f.choices.length,0);assert.equal(f.find('accept').disabled,true);assert.equal(f.doc.activeElement,accept);assert.equal(history.open,true);assert.equal(body.scrollTop,34);assert(!f.dialog.textContent.includes('secret-id'));
 f.setCard({stage:'awaiting-choice',blockers:[],historyCount:1});f.ui.update();const current=f.find('accept').onclick;f.ui.close();f.ui.open();current();assert.equal(f.choices.length,0);f.find('accept').onclick();assert.deepEqual(f.choices,['accept']);assert.equal(f.getCard().stage,'accepted');f.ui.dispose();
});
test('rejected same-day state shows result and reason, then enables next-day travel',()=>{
 const f=fixture();f.setCard({stage:'rejected',historyCount:1,result:{passed:false,reasons:[{code:'review-not-selected',text:'皇帝未予批准'}]},blockers:[{code:'already-petitioned-today',text:'今日已自荐，次日可再试'}]});f.ui.open();assert(f.dialog.textContent.includes('次日可再试'));assert(f.dialog.textContent.includes('皇帝未予批准'));assert.equal(f.find('primary').disabled,true);f.getCard().blockers=[];f.ui.update();assert.equal(f.find('primary').disabled,false);f.ui.dispose();
});
test('active physical sequence is read-only at site, with return route when away',()=>{
 const f=fixture();f.setCard({stage:'accepted',blockers:[],physical:{phase:'drafting',documentId:'private-receipt-id'}});f.player.root.position={x:5,y:.2,z:5};f.ui.open();assert.equal(f.find('primary').disabled,true);assert(f.dialog.textContent.includes('沈序正在拟册'));assert(!f.dialog.textContent.includes('private-receipt-id'));f.player.root.position.x=0;f.ui.update();f.find('primary').onclick();assert.equal(f.intents.at(-1).action,'return');f.ui.dispose();
});
test('close/Escape retains application and dispose removes owned DOM/styles',()=>{
 const f=fixture();f.setCard({stage:'submitted',blockers:[]});f.ui.open();f.dialog.listeners.cancel({preventDefault(){}});assert.equal(f.ui.isOpen(),false);assert.equal(f.getCard().stage,'submitted');assert.equal(f.choices.length,0);assert.equal(f.intents.length,0);f.ui.dispose();assert.equal(f.doc.head.children.length,0);assert.equal(f.doc.body.children.length,0);assert.equal(f.ui.open(),false);
});
test('appointed meal uses the existing live intent and blocks unavailable stock',()=>{
 const f=fixture(),mealIntent={...target,provider:'china-royal-player-meal',kind:'eat',orderId:'one-real-order'};f.setCard({stage:'appointed',titleId:'consort',residence:{},blockers:[]});f.setDetails({meal:{target:mealIntent,label:'享用青蔬膳',statusLabel:'青蔬膳已备好',remaining:86,capacity:120}});f.ui.open();assert.equal(f.find('meal').textContent,'享用青蔬膳');assert(f.dialog.textContent.includes('青蔬膳已备好 · 余 86 / 120 份'));f.find('meal').onclick();assert.deepEqual(f.intents.at(-1).target,mealIntent);f.setDetails({meal:{available:false,reason:'原库存已用尽',remaining:0,capacity:120}});f.ui.open();assert.equal(f.find('meal').disabled,true);assert(f.dialog.textContent.includes('原库存已用尽'));f.ui.dispose();
});
test('title release needs a fresh explicit confirmation and live bridge permission',()=>{
 let active=true,id='appointment-one',ok=true,f;const calls=[];
 const titleBridge={titleStatus:()=>({active,appointmentId:id}),releaseTitleAvailability:()=>({ok,reasons:ok?[]:['title-rights-busy']}),resignTitle(value,options){calls.push({id:value,options});active=false;f.setCard({stage:'resigned',blockers:[]});return {ok:true};}};
 f=fixture({titleBridge});f.setCard({stage:'appointed',titleId:'consort',residence:{},blockers:[]});f.ui.open();f.find('resign-title').onclick();assert.equal(calls.length,0);assert(f.dialog.textContent.includes('辞去后交还寝房与御膳资格'));f.find('cancel-resignation').onclick();assert.equal(calls.length,0);
 f.find('resign-title').onclick();const stale=f.find('confirm-resignation').onclick;ok=false;stale();assert.equal(calls.length,0);assert.equal(f.find('confirm-resignation').disabled,true);assert(f.dialog.textContent.includes('先结束寝居、用膳或册书中的活动'));ok=true;id='appointment-two';f.ui.update();stale();assert.equal(calls.length,0);assert.equal(f.find('confirm-resignation').hidden,true);f.find('resign-title').onclick();f.find('confirm-resignation').onclick();assert.deepEqual(calls,[{id:'appointment-two',options:{confirmed:true}}]);assert.equal(f.getCard().stage,'resigned');assert(!f.dialog.textContent.includes('appointment-two'));f.ui.dispose();
});

// An empress petition lives beside the already-earned consort title. These
// cases catch accidental promotion on approval, lost benefits, stale choices,
// and bypassing the physical release with the original resignation control.
test('empress requests preserve actual identity and benefits through pending and terminal outcomes',()=>{
 const details={residenceLabel:'南苑寝房',residenceTarget:target,meal:{remaining:86,capacity:120,target:meeting}};
 for(const stage of ['none','submitted','awaiting-choice','accepted','charter-held','rejected','declined','withdrawn','released']){
  const v=consortPetitionView({card:{titleKind:'empress',titleId:'consort',empressId:null,operation:stage==='released'?'release':'appoint',stage,residence:{},blockers:[],result:{passed:true}},target,details});
  assert.equal(v.identity,'妃嫔');assert.equal(v.hasTitle,true);assert.notEqual(v.result,'后位生效');assert.equal(v.residenceText,'南苑寝房');assert.equal(v.mealText,'库存御膳 · 余 86 / 120 份');assert.deepEqual(v.benefitActions.map(a=>a.action),['meal','residence']);
  if(['none','rejected','declined','withdrawn','released'].includes(stage)){assert.deepEqual(v.actions.map(a=>a.action),['empress-submit']);assert.equal(v.eligibilityText,'游戏资格：任妃3日、与皇帝完成2次交谈');}
 }
 for(const stage of ['appointed','submitted','awaiting-choice','accepted','charter-held','rejected','declined','withdrawn']){
  const v=consortPetitionView({card:{titleKind:'empress',titleId:'empress',empressId:'player',operation:'release',stage,residence:{},blockers:[]},target,details});
  assert.equal(v.identity,'皇后');assert.equal(v.seatText,'后位已由你担任');assert.equal(v.residenceText,'南苑寝房');
  if(['appointed','rejected','declined','withdrawn'].includes(stage)){assert.equal(v.actions[0].action,'empress-release');assert.equal(v.actions[0].label,'当面请辞后位');}
 }
});

test('empress petition and release buttons navigate without changing title; release choice is explicit',()=>{
 const f=fixture();f.setCard({titleKind:'empress',titleId:'consort',stage:'none',operation:'appoint',blockers:[],physical:{heraldPresent:false}});f.player.root.position={x:1,y:.2,z:1};f.ui.open();assert.equal(f.find('primary').textContent,'当面请册皇后');assert.equal(f.find('primary').disabled,false);f.find('primary').onclick();assert.equal(f.intents.at(-1).action,'empress-submit');assert.equal(f.getCard().titleId,'consort');
 f.setCard({titleKind:'empress',titleId:'empress',stage:'appointed',operation:'appoint',blockers:[]});f.ui.open();f.find('primary').onclick();assert.equal(f.intents.at(-1).action,'empress-release');assert.equal(f.getCard().titleId,'empress');
 f.setCard({titleKind:'empress',titleId:'empress',stage:'awaiting-choice',operation:'release',applicationId:'release-one',blockers:[]});f.ui.open();assert.equal(f.find('accept').textContent,'确认请辞后位');assert.equal(f.find('decline').textContent,'保留后位');assert(f.dialog.textContent.includes('保留原妃位与寝居'));f.dialog.listeners.cancel({preventDefault(){}});assert.equal(f.choices.length,0);assert.equal(f.getCard().titleId,'empress');
 f.ui.open();f.find('accept').onclick();assert.deepEqual(f.choices,['accept']);assert.equal(f.getCard().stage,'accepted');assert.equal(f.getCard().titleId,'empress');assert.equal(f.ui.menuContext().hasTitle,true);f.ui.dispose();
});

test('withdrawal uses the active service only after a fresh nonphysical state check',()=>{
 const f=fixture();f.setCard({titleKind:'empress',titleId:'consort',stage:'accepted',operation:'appoint',applicationId:'empress-one',blockers:[]});f.ui.open();const stale=f.find('withdraw').onclick;f.getCard().physical={phase:'drafting'};stale();assert.equal(f.withdrawals.length,0);assert.equal(f.find('withdraw').hidden,true);assert(f.dialog.textContent.includes('沈序正在拟册'));
 f.getCard().physical={};f.ui.update();const replaced=f.find('withdraw').onclick;f.getCard().applicationId='empress-two';replaced();assert.equal(f.withdrawals.length,0);f.find('withdraw').onclick();assert.deepEqual(f.withdrawals,['empress-two']);assert.equal(f.getCard().stage,'withdrawn');assert.equal(f.getCard().titleId,'consort');assert.equal(f.find('withdraw').hidden,true);
 f.setCard({stage:'submitted',applicationId:'consort-one',blockers:[]});f.ui.update();f.find('withdraw').onclick();assert.deepEqual(f.withdrawals,['empress-two','consort-one']);f.ui.dispose();
});

test('empress route reads its own history and prevents original title resignation during a pending release',()=>{
 const calls=[],titleBridge={titleStatus:()=>({active:true,appointmentId:'original-consort'}),releaseTitleAvailability:()=>({ok:true,reasons:[]}),resignTitle:()=>{calls.push('resign');return {ok:true};}},f=fixture({titleBridge});
 f.setRows([{id:'old-consort',stage:'appointed',submittedAt:{day:0}}]);f.service.currentLedger=()=>({petition:()=>({id:'release-one',operation:'release'})});f.service.history=()=>[{titleKind:'empress',operation:'appoint',stage:'appointed',submittedAt:{day:3}},{titleKind:'empress',operation:'release',stage:'submitted',submittedAt:{day:4}}];
 f.setCard({titleKind:'empress',titleId:'empress',stage:'submitted',operation:'release',blockers:[]});f.ui.open();assert(f.dialog.textContent.includes('册后 · 皇后册封已生效'));assert(f.dialog.textContent.includes('辞后 · 请辞已呈'));assert(!f.dialog.textContent.includes('自荐'));assert(f.dialog.textContent.includes('先当面辞后并办结文书'));assert.equal(f.find('resign-title').textContent,'辞去妃位');assert.equal(f.find('resign-title').disabled,true);f.find('resign-title').onclick();assert.equal(calls.length,0);
 f.setCard({titleKind:'empress',titleId:'consort',stage:'released',operation:'release',blockers:[]});f.ui.update();assert.equal(f.find('resign-title').disabled,false);assert.equal(f.ui.menuContext().hasTitle,true);f.ui.dispose();
});
