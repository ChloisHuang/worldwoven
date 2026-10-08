// Actual stock/property/business persistence catches duplicate procurement and
// owner changes. Controlled recruitment views exercise the DOM dispatch boundary;
// the recruitment tests own physical trial and safe-handoff evidence.
import assert from 'node:assert/strict';
import {createChinaTavernManagementUI} from '../source/game/china-tavern-management-ui.js';
import {createChinaTavernManagement} from '../source/game/china-tavern-management.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaTavernPropertyUI} from '../source/game/china-tavern-property-ui.js';
import {createChinaTavernService} from '../source/game/china-tavern-service.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {TAVERN_HIRING_ROLES as ROLES} from '../source/game/china-tavern-hiring.js';
import {Element,walk} from './fixtures/tavern-property-ui-fixture.mjs';
const copy=structuredClone,RICE='yunlai-mushroom-rice';
const doc=()=>({head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag)});
const byText=(root,text)=>walk(root).find(e=>e.tag==='button'&&e.textContent===text);
const byLabel=(root,text)=>walk(root).find(e=>e.tag==='button'&&e.getAttribute('aria-label')===text);
const click=e=>{assert(e,'control exists');assert(!e.disabled,`${e.textContent} is enabled`);e.onclick();};
function fixture(){
 let saved={chinaServiceWorld:{serial:7,revision:0,till:0,orders:[]},copperLedger:{version:1,cash:50,bank:900,accountOpened:true,nextTransaction:1,transactions:[]}},failure=false,property,day=0,writes=0;
 const links={},clock=()=>({seconds:day*1440/.7,day,hour:10});
 const save=patch=>{if(failure&&patch.chinaTavernBusiness?.receipts?.some(r=>r.kind==='stock-purchase'))return false;saved=copy({...saved,...patch});writes++;return true;};
 const ledger=createGameCurrencyLedger({saved,storage:{setItem:(_key,json)=>save(JSON.parse(json))},transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:clock,getTill:()=>saved.chinaServiceWorld.till,getBusinessAccount:()=>links.business,getStock:()=>links.stock,saveState:s=>save({chinaTavernProperty:s})});
 for(;day<8;day++){assert(property.refreshDay().ok);const s=property.state();if(s.market.willing){assert(property.applyPurchase(s.market.price).ok);assert(property.confirmPurchase().ok);break;}}
 assert.equal(property.state().ownerId,'player');
 const manager=createChinaTavernManagement({saved,property,sourceLinks:links,getClock:clock,saveFullWorld:save,getScene:()=>({snapshot:()=>copy(saved.chinaServiceWorld)}),
  getRole:roleId=>{const r=Object.values(ROLES).find(r=>r.roleId===roleId);return {...r,revision:0,holderId:r.originalHolderId};}});
 assert.equal(manager.loadError,null);assert(manager.activate().ok);
 const document=doc(),notifications=[],flags={nearby:true};
 const ui=createChinaTavernManagementUI({management:manager,document,isNearby:()=>flags.nearby,notify:t=>notifications.push(t)}),dialog=document.body.children.at(-1);
 return {manager,property,ui,dialog,document,flags,notifications,ledger,get writes(){return writes;},get saved(){return copy(saved);},set failure(v){failure=v;}};
}
const checks=[];
{
 const f=fixture(),balance=f.property.state().balance;f.ui.show();
 assert(f.dialog.textContent.includes(`经营余额${balance} 文`));assert(f.dialog.textContent.includes('营业盈亏0 文'));assert(f.dialog.textContent.includes('已挣未付0 文'));
 click(byText(f.dialog,'食材'));assert(f.dialog.textContent.includes('售价 6 文 · 每份食材 2 文'));assert(f.dialog.textContent.includes('售价 8 文 · 每份食材 3 文'));
 const first=byLabel(f.dialog,'云来菌菇饭补1份，2文');f.failure=true;click(first);first.onclick();
 assert(f.dialog.textContent.includes('保存未完成'));assert.equal(f.property.state().balance,balance);assert.equal(f.manager.stock.summary().inventory[RICE].available,0);assert.equal(f.notifications.length,0);
 f.failure=false;const retry=byLabel(f.dialog,'云来菌菇饭补1份，2文');click(retry);retry.onclick();
 assert.equal(f.manager.stock.summary().inventory[RICE].available,1);assert.equal(f.property.state().balance,balance-2);assert.equal(f.manager.business.accounting().procurementCash,2);assert.equal(f.notifications.length,1);
 assert.equal(f.saved.chinaTavernManagement.purchases.length,1,'failed purchase retries the same frozen authorization');
 const second=byLabel(f.dialog,'云来菌菇饭补1份，2文'),durable=f.saved;f.ui.hide();second.onclick();f.ui.show();second.onclick();assert.deepEqual(f.saved,durable);
 click(byText(f.dialog,'食材'));const stale=byLabel(f.dialog,'云来菌菇饭补1份，2文');click(byText(f.dialog,'收支'));stale.onclick();assert.deepEqual(f.saved,durable);
 assert(f.dialog.textContent.includes('库存食材成本2 文'));assert(f.dialog.textContent.includes('已耗食材 0 文'));assert(f.dialog.textContent.includes('营业盈亏0 文'),'procurement is inventory until real consumption');
 const rendered=f.dialog.children;f.ui.update();assert.equal(f.dialog.children,rendered,'unchanged frames retain DOM and scrolling');
 f.ui.dispose();checks.push('actual failed save/retry, original 6/8 sale prices and 2/3 supply costs, exact-once stale/double/closed controls, cash versus earned profit');
}
{
 const f=fixture();f.ui.show();click(byText(f.dialog,'食材'));const buy=byLabel(f.dialog,'云来菌菇饭补1份，2文');
 assert(f.property.draw(f.property.state().availableBalance).ok);click(buy);assert(f.dialog.textContent.includes('可用经营款不足'));assert.equal(f.manager.stock.summary().inventory[RICE].available,0);assert.equal(byLabel(f.dialog,'云来菌菇饭补1份，2文').disabled,true);
 assert(f.property.invest(20).ok);f.ui.update();const away=byLabel(f.dialog,'云来菌菇饭补1份，2文');f.flags.nearby=false;click(away);assert(f.dialog.textContent.includes('请回到酒楼'));assert.equal(f.manager.stock.summary().inventory[RICE].available,0);f.flags.nearby=true;
 f.ui.update(true);const beforeSale=byLabel(f.dialog,'云来菌菇饭补1份，2文');assert(f.property.setPrice(1).ok);const offer=f.property.state().market.offers.find(o=>o.status==='open');assert(f.property.replyOffer(offer.id,true).ok);
 click(beforeSale);assert.equal(f.manager.stock.summary().inventory[RICE].available,0);assert(f.dialog.textContent.includes('当前业主方可经营'));assert(!byLabel(f.dialog,'云来菌菇饭补1份，2文'));
 f.ui.dispose();checks.push('budget changing before click, proximity loss, ownership transfer invalidates procurement');
}
{
 const f=fixture(),s=f.manager.view();s.property.availableBalance=19;s.property.balance=40;s.property.operatingProfit=-9;s.business.wagesPayable=9;s.business.trialReserved=12;s.business.trialEarned=12;s.business.trialPaid=0;
 s.applications=[{id:'app',actor:{name:'顾谨',actorId:'cn-tavern-diner-west'},owner:copy(s.owner),roleId:ROLES.assistant.roleId,status:'submitted',trial:{request:{},work:{steps:[{},{}]},payment:null}}];
 s.recruitment.candidates=[{applicationId:'app',phase:'review',steps:[{},{}]}];
 let intents=['inspect','approve','pay','reject'].map(kind=>({id:`app:${kind}`,provider:'cn-tavern-recruitment',intentKey:'app:1',applicationId:'app',kind})),result=false,reviews=0,dismissals=0,approaches=0;
 const management={view:()=>copy(s),intents:()=>copy(intents),reviewApplication(){reviews++;if(result===true)s.applications[0].status='pending-safe-handoff';return result;},executeIntent:()=>result,
  dismiss(){dismissals++;return {ok:false,code:'handoff-pending',blockers:[{kind:'held-item'}]};}};
 const document=doc(),ui=createChinaTavernManagementUI({management,document,onIntent:()=>{approaches++;return result;}}),dialog=document.body.children.at(-1);
 ui.show();assert(dialog.textContent.includes('工资待付 · 已保留9 文'));assert(dialog.textContent.includes('试工预留12 文'));assert(dialog.textContent.includes('已挣未付21 文'));assert(dialog.textContent.includes('营业盈亏-9 文'));
 ui.show({applicationId:'app'});assert(dialog.textContent.includes('每桌实际擦拭5秒'));assert(dialog.textContent.includes('柜台接待24文'));assert(dialog.textContent.includes('完整覆盖12小时另加1文'));
 click(byText(dialog,'批准 · 等交接'));assert.equal(reviews,1);assert(dialog.textContent.includes('请与应聘者当面交谈'));assert.equal(s.applications[0].status,'submitted');
 const stale=byText(dialog,'批准 · 等交接');intents=intents.map(i=>({...i,intentKey:'app:2'}));click(stale);assert.equal(reviews,1);assert(dialog.textContent.includes('安排已变化'));
 result=true;click(byText(dialog,'批准 · 等交接'));assert.equal(reviews,2);assert(dialog.textContent.includes('已批准 · 等安全交接'));assert(!dialog.textContent.includes('已正式到岗'));
 const held=byText(dialog,'办理离岗 · 腾出岗位');click(held);assert.equal(dismissals,1);assert(dialog.textContent.includes('手中餐具尚未归还'));assert.equal(s.roles[0].holderId,ROLES.host.originalHolderId);
 const protectedBeforeClick=byText(dialog,'办理离岗 · 腾出岗位');s.roles[0].tenureHolderId='player';click(protectedBeforeClick);assert.equal(dismissals,1);assert(dialog.textContent.includes('你已正式任职'));assert.equal(walk(dialog).filter(e=>e.tag==='button'&&e.textContent==='办理离岗 · 腾出岗位').length,2);
 const changedRole=byText(dialog,'办理离岗 · 腾出岗位');s.roles[1].revision++;click(changedRole);assert.equal(dismissals,1);assert(dialog.textContent.includes('安排已变化'));
 const approach=byText(dialog,'前往当面交谈');result=false;click(approach);assert.equal(approaches,1);assert(ui.isOpen());assert(dialog.textContent.includes('暂时无法前往'));result=true;click(byText(dialog,'前往当面交谈'));assert.equal(approaches,2);assert(!ui.isOpen());
 ui.show('app');const cancel=byText(dialog,'婉拒申请'),snapshot=copy(s);dialog.cancel({preventDefault(){}});cancel.onclick();assert.deepEqual(s,snapshot);assert.equal(reviews,2);ui.dispose();f.ui.dispose();
 checks.push('real view-shaped obligations and loss display; false/stale applicant actions; approval remains pending; held work and player tenure block dismissal; reversible physical approach/close');
}
{
 const f=fixture();assert(f.manager.purchase({dishId:RICE,quantity:1,operationId:'ledger-purchase'}).ok);let opened=0,enabled=true;
 const ui=createChinaTavernPropertyUI({property:f.property,document:f.document,getManagement:()=>enabled?f.manager:null,onOpenManagement:()=>{opened++;f.ui.show();}}),dialog=f.document.body.children.at(-1);
 ui.open();click(byText(dialog,'账簿'));assert(!dialog.textContent.includes('全员NPC日薪、食材成本和招聘管理尚未开放'));assert(dialog.textContent.includes('采购食材 2 文'));assert(dialog.textContent.includes('采购支出 2 文'));assert(dialog.textContent.includes('库存成本 2 文'));
 const open=byText(dialog,'经营 · 食材与伙计');click(open);open.onclick();assert.equal(opened,1);assert(!ui.isOpen());assert(f.ui.isOpen());
 f.ui.hide();ui.open();enabled=false;const old=byText(dialog,'经营 · 食材与伙计');click(old);assert.equal(opened,1);assert(ui.isOpen());assert(dialog.textContent.includes('产权或经营安排已变化'));click(byText(dialog,'账簿'));assert(dialog.textContent.includes('全员NPC日薪、食材成本和招聘管理尚未开放'));
 enabled=true;assert(f.property.setPrice(1).ok);assert(f.property.replyOffer(f.property.state().market.offers.find(o=>o.status==='open').id,true).ok);ui.close();ui.open();assert(dialog.textContent.includes('接手后须另付原料进货款'));assert(dialog.textContent.includes('现有库存与欠薪随店保留'));assert.equal(f.manager.stock.summary().inventory[RICE].available,1);assert(!byText(dialog,'经营 · 食材与伙计'));
 ui.dispose();f.ui.dispose();checks.push('original property book opt-in entry, real expense labels, no stale manager entry, unchanged dormant fallback');
}
{
 const f=fixture(),player={root:{position:{x:22.35,y:.215,z:6.7}}},host={alive:true,station:{id:'cn-tavern-host',npcName:'许安'},root:{position:{x:24.1,y:.215,z:6.4}}};
 const scene={snapshot:()=>null,state:()=>({orders:[],tables:[],rooms:[]}),choices:()=>[],hostAtPost:()=>false,hostAdmissionOpen:()=>true};
 const base={meal:{staffScene:scene},property:f.property,careers:{isHired:()=>false,workState:()=>({revision:0})},getPlayer:()=>player,getClock:()=>({day:0,hour:10}),host,document:f.document};
 const service=createChinaTavernService({...base,getManagement:()=>f.manager});
 const dialog=f.document.body.children.find(e=>e.className.includes('cn-property-dialog'));
 assert.equal(service.hostAtPost(),false);assert(service.executeIntent(service.intent('property')));
 const balance=f.property.state().balance,bank=f.ledger.state().bank;click(byText(dialog,'注资 20 文'));
 assert.equal(f.property.state().balance,balance+20);assert.equal(f.ledger.state().bank,bank-20,'enabled owner invests at original register while host is away');
 const away=byText(dialog,'注资 20 文'),durable=f.saved;player.root.position.x=10;away.onclick();assert.deepEqual(f.saved,durable,'old control cannot invest away from register');service.update(.1);assert(!dialog.open);assert.equal(service.executeIntent(service.intent('property')),false);
 player.root.position.x=22.35;
 const off=createChinaTavernService(base),offDialog=f.document.body.children.filter(e=>e.className.includes('cn-property-dialog')).at(-1);
 assert(off.executeIntent(off.intent('property')));const dormantInvest=byText(offDialog,'注资 20 文');assert(dormantInvest.disabled,'omitted management callback preserves host requirement');dormantInvest.onclick();assert.deepEqual(f.saved,durable);assert(offDialog.textContent.includes('许安回案'));off.dispose();
 assert(f.property.setPrice(1).ok);assert(f.property.replyOffer(f.property.state().market.offers.find(o=>o.status==='open').id,true).ok);
 assert(service.executeIntent(service.intent('property')));const application=byText(dialog,'向业主申请购买'),sold=f.saved;assert(application.disabled,'non-owner still waits for host despite live manager');application.onclick();assert.deepEqual(f.saved,sold);assert(dialog.textContent.includes('许安回案'));assert(!byText(dialog,'注资 20 文'));
 service.dispose();f.ui.dispose();checks.push('actual service property wiring: enabled owner alone may invest at register without host; dormant/non-owner/away remain blocked');
}
{
 const f=fixture(),s=f.manager.view(),definitions=Object.values(ROLES),names=['许安','沈禾','陆青'],labels=['柜台接待','厨师','服务助理'];
 s.roles=s.roles.map(r=>({...r,holderId:null}));s.qualificationByApplication={};
 s.applications=definitions.map((role,index)=>{
  const id=`rehire:${role.roleId}`,actor={actorId:role.originalHolderId,bodyId:role.originalHolderId,name:names[index]};
  s.qualificationByApplication[id]={kind:'existing-incumbency',sourceId:'chinaTavernManagement',sourceRevision:index+1,receiptId:`original:${role.roleId}`,actorId:actor.actorId,bodyId:actor.bodyId,roleId:role.roleId};
  return {id,actor,owner:copy(s.owner),roleId:role.roleId,status:'submitted',trial:{request:null,work:null,payment:null},decision:null};
 });
 s.recruitment.candidates=s.applications.map(a=>({applicationId:a.id,phase:'meeting',steps:[]}));
 let intents=s.applications.map(a=>({id:`${a.id}:approve`,provider:'cn-tavern-recruitment',kind:'approve',qualificationKind:'existing-incumbency',roleId:a.roleId,applicationId:a.id,intentKey:`${a.id}:1`})),reviews=[];
 const manager={view:()=>copy(s),intents:()=>copy(intents),reviewApplication(id,accept){reviews.push({id,accept});const a=s.applications.find(a=>a.id===id);a.status='pending-safe-handoff';a.decision={qualification:copy(s.qualificationByApplication[id])};intents=intents.filter(i=>i.applicationId!==id);return true;},executeIntent(){throw Error('rehire must not request trial or payment');}};
 const document=doc(),ui=createChinaTavernManagementUI({management:manager,document}),dialog=document.body.children.at(-1),card=id=>walk(dialog).find(e=>e.getAttribute('data-panel-key')===id);
 ui.show(s.applications[0].id);
 for(const [index,a]of s.applications.entries()){
  assert(dialog.textContent.includes(`${names[index]}若愿意回来`));assert(card(a.id).textContent.includes('原任职资格已核对，无需另做试工'));
  assert(!card(a.id).textContent.includes('12文'));assert(!card(a.id).textContent.includes('5秒'));assert(byText(card(a.id),`同意复聘${labels[index]} · 等交接`));
 }
 const unverified=s.applications[1],stale=byText(card(unverified.id),'同意复聘厨师 · 等交接');delete s.qualificationByApplication[unverified.id];intents=intents.filter(i=>i.applicationId!==unverified.id);ui.update();stale.onclick();
 assert.equal(reviews.length,0);assert(card(unverified.id).textContent.includes('任职资格待核对'));assert(!card(unverified.id).textContent.includes('原任职资格已核对'));assert(!byText(card(unverified.id),'同意复聘厨师 · 等交接'));
 const a=s.applications[0];click(byText(card(a.id),'同意复聘柜台接待 · 等交接'));assert.deepEqual(reviews,[{id:a.id,accept:true}]);assert(card(a.id).textContent.includes('已批准 · 等安全交接'));assert(!card(a.id).textContent.includes('已正式到岗'));
 delete s.qualificationByApplication[a.id];ui.update();assert(card(a.id).textContent.includes('原任职资格已核对，无需另做试工'),'approved historical qualification remains explanatory without new grant');
 assert.equal(s.business.trialReserved,0);assert.equal(s.business.trialPaid,0);ui.dispose();f.ui.dispose();checks.push('all three original-role rehire cards read verified qualification, skip trial/payment, invalidate lost proof and retain pending safe handoff');
}
console.log('PASS management UI:',checks.join('; '));
