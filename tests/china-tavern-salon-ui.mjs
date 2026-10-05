// Selection-only cards, one fixed action, and session-bound callbacks protect
// the consent/payment boundary when this panel closes, reopens or refreshes.
// These finite DOM checks do not claim browser layout or service-core coverage.
import assert from 'node:assert/strict';
import {createChinaTavernSalonUI} from '../source/game/china-tavern-salon-ui.js';
import {SALON_ARTISTS,SALON_ACTIVITIES} from '../source/game/china-tavern-salon-artists.js';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.style={};this._text='';this.open=false;this._scrollTop=0;this.scrollLeft=0;this.scrollWrites=0;this.replacements=0;this.parentNode=null;}
 set scrollTop(v){this._scrollTop=v;this.scrollWrites++;}get scrollTop(){return this._scrollTop;}
 set textContent(v){this.replaceChildren();this._text=String(v);}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 append(...children){for(const child of children)this.insertBefore(child,null);}
 insertBefore(child,next){if(child.parentNode)child.remove();const i=next?this.children.indexOf(next):this.children.length;this.children.splice(i,0,child);child.parentNode=this;}
 replaceChildren(...children){this.replacements++;for(const child of [...this.children])child.remove();this._text='';this.append(...children);}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(k,fn){this[k]=fn;}showModal(){this.open=true;}close(){this.open=false;}
 contains(node){return !!node&&walk(this).includes(node);}remove(){if(this.contains(doc.activeElement))doc.activeElement=doc.body;if(this.parentNode){this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;}}
 focus(options){doc.activeElement=this;this.focusOptions=options;}
 querySelectorAll(selector){return walk(this).slice(1).filter(e=>selector==='[data-cn-salon-focus]'?e.attrs['data-cn-salon-focus']:selector.split(',').some(s=>e.className?.split(' ').includes(s.slice(1))));}
}
const walk=e=>[e,...e.children.flatMap(walk)],doc={head:new Element('head'),body:new Element('body'),createElement:t=>new Element(t)};
let session=null,lastReply=null,cash=18,reception=true,available=true,paymentError=null,age=27,eligible=true,returning=false,recoveryWorks=true,backgroundTick=0,extraFee=0,backgroundStatus=false;
const requests=[],reservations=[],cancellations=[],rooms=[{id:'lan',name:'兰房',claim:null},{id:'zhu',name:'竹房',claim:null}];
const legacyFees={poetry:6,story:8,music:7,chess:5,banquet:8}; // Existing session UI remains valid at its frozen pre-upgrade price.
const candidates=()=>eligible?SALON_ARTISTS.map((c,i)=>({...c,ageYears:i?c.age:age,available:available&&!session&&!returning,activities:[{id:c.activity,...SALON_ACTIVITIES[c.activity],fee:legacyFees[c.activity]+extraFee}],status:backgroundStatus&&i===2?'在窗边练习':available?'歇场待客':'正在吃饭',elapsed:backgroundTick})):[];
const service={view:()=>({session:session?{...session,phaseTime:backgroundTick}:null,lastReply,cash,candidates:candidates(),rooms,returning,paymentError,fade:session?.stage==='fade',label:({invited:'等待本人答复',reply:'艺者正在当面答复',accepted:'愿意茶叙，请确认价目',escort:'随艺者沿公共楼梯去客房',entering:'等两人进到雅间',fade:'茶叙进行中',visiting:'茶叙已完成，可以告辞'})[session?.stage]}),
 atReception:()=>reception,active:()=>!!session,recoverPayments(){if(recoveryWorks)paymentError=null;},
 request(id,activity,fee){requests.push([id,activity]);session={id:'visit-'+requests.length,actorId:id,activity,fee,stage:'invited',payment:'unpaid'};return true;},
 startEscort(){assert.equal(session?.stage,'accepted');reservations.push(session.id);cash-=session.fee;session={...session,stage:'escort',payment:'reserved'};return true;},
 cancel(){cancellations.push(session.id);if(session.payment==='reserved')cash+=session.fee;session=null;return true;}};
const ui=createChinaTavernSalonUI({service,getPlayer:()=>({root:{position:{x:24.15,y:7.815,z:12.65}}}),document:doc});
const dialog=()=>walk(doc.body).find(e=>e.tag==='dialog'),primary=()=>walk(dialog()).find(e=>e.className?.split(' ').includes('cn-salon-primary')),byText=t=>walk(dialog()).find(e=>e.tag==='button'&&e.textContent===t),focus=k=>walk(dialog()).find(e=>e.attrs['data-cn-salon-focus']===k),click=e=>{assert(e&&!e.disabled);e.onclick();};
assert(ui.open());assert.equal(walk(dialog()).filter(e=>e.className?.includes('cn-salon-primary')).length,1);assert(dialog().textContent.includes('付费不替代本人意愿'));
// The phone scroll owner is content; landscape also has cast/detail scrollers.
const scrollers=()=>[dialog(),...dialog().querySelectorAll('.cn-salon-content,.cn-salon-cast,.cn-salon-detail')];
const retainedScrollers=scrollers();retainedScrollers.forEach((node,i)=>{node.scrollTop=25+i*31;node.scrollLeft=3+i;node.scrollWrites=0;});
const artistCard=focus('artist-cn-tavern-chess-poet');artistCard.focus();retainedScrollers[1].activeTouch=17;
for(let i=0;i<90;i++){backgroundTick++;backgroundStatus=i%2===0;rooms[0].physicallyOccupied=i%3===0;ui.update();}
assert.deepEqual(scrollers(),retainedScrollers,'background and room/status changes preserve all actual scrollers');
assert.equal(focus('artist-cn-tavern-chess-poet'),artistCard);assert.equal(doc.activeElement,artistCard);assert.equal(retainedScrollers[1].activeTouch,17);
retainedScrollers.forEach((node,i)=>{assert.equal(node.scrollTop,25+i*31);assert.equal(node.scrollWrites,0,'no scroll assignments interrupt a held touch or inertia');assert.equal(node.scrollLeft,3+i);});
const rootReplacements=dialog().replacements;
click(focus('artist-cn-tavern-chess-poet'));assert.equal(primary().textContent,'请引见陆怀川');assert(dialog().textContent.includes('5铜文'));
assert.equal(dialog().replacements,rootReplacements,'selecting artist leaves the dialog and scrollers mounted');assert.equal(doc.activeElement,artistCard);
const chessChoice=focus('activity-chess');chessChoice.focus();const stalePriceInvite=primary();extraFee=2;ui.update();assert(dialog().textContent.includes('7铜文'));assert.equal(focus('activity-chess'),chessChoice);assert.equal(doc.activeElement,chessChoice);stalePriceInvite.onclick();assert.equal(requests.length,0,'detached earlier price action cannot invite');
available=false;ui.update();assert(primary().disabled);assert.equal(artistCard.attrs['aria-pressed'],'true','busy update keeps user selection');assert.equal(doc.activeElement,chessChoice);primary().onclick();assert.equal(requests.length,0);available=true;extraFee=0;ui.update();assert(!primary().disabled);assert.equal(doc.activeElement,chessChoice);retainedScrollers.forEach((node,i)=>assert.equal(node.scrollTop,25+i*31));
click(focus('activity-banquet'));assert.equal(requests.length,0,'changing artist/activity does not invite or reserve');assert(dialog().textContent.includes('5铜文'));
const oldInvite=primary();ui.close();ui.open();oldInvite.onclick();assert.equal(requests.length,0);click(primary());assert(!ui.isOpen());assert.deepEqual(requests,[['cn-tavern-chess-poet','banquet']]);assert.equal(cash,18);
ui.open();assert(primary().disabled);assert.equal(reservations.length,0);const sessionScrollers=scrollers();sessionScrollers.forEach((node,i)=>{node.scrollTop=20+i*19;node.scrollWrites=0;});for(let i=0;i<60;i++){backgroundTick++;ui.update();}assert.deepEqual(scrollers(),sessionScrollers);sessionScrollers.forEach((node,i)=>{assert.equal(node.scrollTop,20+i*19);assert.equal(node.scrollWrites,0);});session={...session,stage:'reply'};ui.update();assert(primary().disabled);
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
console.log('PASS China salon UI: stable phone/landscape scrollers, focus and held-gesture identity across timers/status/room/price changes, selection, one invite, free consent/decline, busy/full/18+ guards, accepted-only reservation, insufficient cash, repeat/stale clicks, close/reopen, refund/settlement, all session stages and payment retry');
