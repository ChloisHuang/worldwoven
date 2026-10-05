// Selection-only cards, one fixed action, and session-bound callbacks protect
// the consent/payment boundary when this panel closes, reopens or refreshes.
// These finite DOM checks do not claim browser layout or service-core coverage.
import assert from 'node:assert/strict';
import {createChinaTavernSalonUI} from '../source/game/china-tavern-salon-ui.js';
import {SALON_ARTISTS,SALON_ACTIVITIES} from '../source/game/china-tavern-salon-artists.js';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.style={};this._text='';this.open=false;this.scrollTop=0;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;this._text='';}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(k,fn){this[k]=fn;}showModal(){this.open=true;}close(){this.open=false;}remove(){}focus(){}
 querySelectorAll(selector){return walk(this).slice(1).filter(e=>selector==='[data-cn-salon-focus]'?e.attrs['data-cn-salon-focus']:selector.split(',').some(s=>e.className?.split(' ').includes(s.slice(1))));}
}
const walk=e=>[e,...e.children.flatMap(walk)],doc={head:new Element('head'),body:new Element('body'),createElement:t=>new Element(t)};
let session=null,lastReply=null,cash=18,reception=true,available=true,paymentError=null,age=27,eligible=true,returning=false,recoveryWorks=true;
const requests=[],reservations=[],cancellations=[],rooms=[{id:'lan',name:'兰房',claim:null},{id:'zhu',name:'竹房',claim:null}];
const candidates=()=>eligible?SALON_ARTISTS.map((c,i)=>({...c,ageYears:i?c.age:age,available:available&&!session&&!returning,activities:[{id:c.activity,...SALON_ACTIVITIES[c.activity]}],status:available?'歇场待客':'正在吃饭'})):[];
const service={view:()=>({session,lastReply,cash,candidates:candidates(),rooms,returning,paymentError,fade:session?.stage==='fade',label:({invited:'等待本人答复',reply:'艺者正在当面答复',accepted:'愿意茶叙，请确认价目',escort:'随艺者沿公共楼梯去客房',entering:'等两人进到雅间',fade:'茶叙进行中',visiting:'茶叙已完成，可以告辞'})[session?.stage]}),
 atReception:()=>reception,active:()=>!!session,recoverPayments(){if(recoveryWorks)paymentError=null;},
 request(id,activity){requests.push([id,activity]);session={id:'visit-'+requests.length,actorId:id,activity,fee:SALON_ACTIVITIES[activity].fee,stage:'invited',payment:'unpaid'};return true;},
 startEscort(){assert.equal(session?.stage,'accepted');reservations.push(session.id);cash-=session.fee;session={...session,stage:'escort',payment:'reserved'};return true;},
 cancel(){cancellations.push(session.id);if(session.payment==='reserved')cash+=session.fee;session=null;return true;}};
const ui=createChinaTavernSalonUI({service,getPlayer:()=>({root:{position:{x:24.15,y:7.815,z:12.65}}}),document:doc});
const dialog=()=>walk(doc.body).find(e=>e.tag==='dialog'),primary=()=>walk(dialog()).find(e=>e.className?.split(' ').includes('cn-salon-primary')),byText=t=>walk(dialog()).find(e=>e.tag==='button'&&e.textContent===t),focus=k=>walk(dialog()).find(e=>e.attrs['data-cn-salon-focus']===k),click=e=>{assert(e&&!e.disabled);e.onclick();};
assert(ui.open());assert.equal(walk(dialog()).filter(e=>e.className?.includes('cn-salon-primary')).length,1);assert(dialog().textContent.includes('付费不替代本人意愿'));
click(focus('artist-cn-tavern-chess-poet'));assert.equal(primary().textContent,'请引见陆怀川');assert(dialog().textContent.includes('5铜文'));click(focus('activity-banquet'));assert.equal(requests.length,0,'changing artist/activity does not invite or reserve');assert(dialog().textContent.includes('8铜文'));
const oldInvite=primary();ui.close();ui.open();oldInvite.onclick();assert.equal(requests.length,0);click(primary());assert(!ui.isOpen());assert.deepEqual(requests,[['cn-tavern-chess-poet','banquet']]);assert.equal(cash,18);
ui.open();assert(primary().disabled);assert.equal(reservations.length,0);session={...session,stage:'reply'};ui.update();assert(primary().disabled);
// Decline and full room responses remain visible without a payment action.
session=null;lastReply={actorId:'cn-tavern-chess-poet',name:'陆怀川',willing:false,reply:'今日就先谢过了。'};ui.update();assert(dialog().textContent.includes('未收费'));assert.equal(reservations.length,0);
lastReply={...lastReply,willing:true,roomUnavailable:true,reply:'愿意茶叙。'};rooms.forEach(r=>r.claim={status:'occupied'});ui.update();assert(dialog().textContent.includes('眼下没有空房'));assert(dialog().textContent.includes('茶叙中'));
rooms.forEach(r=>r.claim=null);click(focus('activity-chess'));click(primary());ui.open();session={...session,stage:'accepted',roomId:'lan'};lastReply={actorId:session.actorId,name:'陆怀川',willing:true,reply:'一局棋里也有许多故事。'};ui.update();assert.equal(primary().textContent,'确认预留 5文 · 随艺者下楼');
cash=4;ui.update();assert(primary().disabled);assert(dialog().textContent.includes('余额不足'));primary().onclick();assert.equal(reservations.length,0);cash=18;ui.update();reception=false;ui.update();assert(primary().disabled);reception=true;ui.update();
const pay=primary();click(pay);pay.onclick();assert.equal(reservations.length,1);assert.equal(cash,13);assert(!ui.isOpen());ui.open();assert(dialog().textContent.includes('已预留'));assert.equal(primary().textContent,'收起 · 随艺者下楼');click(primary());assert(session,'close retains session and reserved money');assert.equal(cash,13);
ui.open();const staleCancel=byText('取消并全额退款');ui.close();ui.open();staleCancel.onclick();assert.equal(cancellations.length,0);click(byText('取消并全额退款'));assert.equal(cash,18);assert(!session);
ui.open();click(primary());ui.open();session={...session,stage:'accepted'};ui.update();click(primary());ui.open();session={...session,stage:'entering'};ui.update();assert.equal(primary().textContent,'收起 · 等候入房');session={...session,stage:'fade'};ui.update();assert(primary().disabled);assert(byText('取消并全额退款'));session={...session,stage:'visiting',payment:'settled'};ui.update();assert(dialog().textContent.includes('告辞不退款'));assert.equal(primary().textContent,'告辞离席');assert(!byText('取消并全额退款'));click(primary());assert.equal(cash,13,'settled service does not refund');
ui.open();available=false;ui.update();assert(primary().disabled);assert(dialog().textContent.includes('正在吃饭'));available=true;returning=true;ui.update();assert(primary().disabled);returning=false;reception=false;ui.update();assert(primary().disabled);reception=true;eligible=false;ui.update();assert(primary().disabled);assert(dialog().textContent.includes('年满18岁'));eligible=true;age=17;ui.update();assert(primary().disabled,'age check remains required even if malformed candidates slip through');age=27;ui.update();
paymentError='save-failed';recoveryWorks=false;ui.update();assert(primary().disabled);click(byText('重试核对铜钱'));assert(primary().disabled);recoveryWorks=true;click(byText('重试核对铜钱'));assert(!primary().disabled);const disposed=primary();ui.dispose();disposed.onclick();assert.equal(requests.length,3);
console.log('PASS China salon UI: selection, one invite, free consent/decline, busy/full/18+ guards, accepted-only reservation, insufficient cash, repeat/stale clicks, close/reopen, refund/settlement, all session stages and payment retry');
