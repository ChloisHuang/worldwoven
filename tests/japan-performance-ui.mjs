// Selection now precedes one shared invite action. Keep that choice, consent,
// reservation and cancellation tied to the rendered order across reopen/update.
// This is DOM behavior coverage, not a browser layout test.
import assert from 'node:assert/strict';
import {createJapanPerformanceUI} from '../source/game/japan-performance-ui.js';
import {PERFORMANCE_CAST,PERFORMANCE_ACTIVITIES,PERFORMANCE_DRINKS} from '../source/game/japan-performance-cast.js';
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={};this.style={};this._text='';this.open=false;this.scrollTop=0;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 append(...children){this.children.push(...children);}replaceChildren(...children){this._text='';this.children=children;}
 setAttribute(k,v){this.attributes[k]=String(v);}addEventListener(k,fn){this[k]=fn;}showModal(){this.open=true;}close(){this.open=false;}remove(){}focus(){}
 querySelectorAll(selector){return walk(this).slice(1).filter(e=>selector.startsWith('[data-')?e.dataset.jpPerformanceFocus:selector.split(',').some(s=>e.className?.split(' ').includes(s.slice(1))));}
}
const walk=e=>[e,...e.children.flatMap(walk)],doc={head:new Element('head'),body:new Element('body'),createElement:t=>new Element(t)};
let order=null,lastReply=null,cash=30,reception=true,available=true,requests=[],confirms=0,cancels=0,seated=0,stood=0,paymentError=null,recoveries=0;
const candidates=()=>PERFORMANCE_CAST.slice(1).map(c=>({...c,available:available&&!order,activities:c.activities.map(id=>PERFORMANCE_ACTIVITIES[id])}));
const service={view:()=>({order,lastReply,cash,currency:order?.currency||'japan',candidates:candidates(),drinks:PERFORMANCE_DRINKS,paymentError}),atReception:()=>reception,active:()=>!!order,recoverPayments(){recoveries++;paymentError=null;},seat:()=>({id:'seat'}),
 request(artistId,activity,drink){requests.push([artistId,activity,drink]);order={id:'order-'+requests.length,artistId,activity,drink,fee:PERFORMANCE_ACTIVITIES[activity].fee+(PERFORMANCE_DRINKS.find(d=>d.id===drink)?.fee||0),status:'invited',currency:'japan',actFee:PERFORMANCE_ACTIVITIES[activity].fee,drinkFee:PERFORMANCE_DRINKS.find(d=>d.id===drink)?.fee||0,paid:false,actComplete:false,drinkComplete:!drink};},
 confirm(){confirms++;if(order?.status!=='accepted')return false;cash-=order.fee;order={...order,paid:true,status:'seating'};return true;},cancel(){cancels++;order=null;return true;}};
const ui=createJapanPerformanceUI({service,getPlayer:()=>({root:{position:{x:4.3,y:7.6,z:-4.6}}}),onFurniture:()=>seated++,onStand:()=>stood++,document:doc});
const dialog=()=>walk(doc.body).find(e=>e.tag==='dialog'),byText=t=>walk(dialog()).find(e=>e.tag==='button'&&e.textContent===t),primary=()=>walk(dialog()).find(e=>e.className?.split(' ').includes('jp-performance-primary')),focus=k=>walk(dialog()).find(e=>e.dataset.jpPerformanceFocus===k),click=e=>{assert(e&&!e.disabled);e.onclick();};
assert(ui.open());assert.equal(walk(dialog()).filter(e=>e.className?.includes('jp-performance-primary')).length,1);assert.equal(requests.length,0);
click(focus('activity-jp-salon-ichiro-tea'));click(focus('drink-sake'));assert.equal(primary().textContent,'邀请一郎 · 10券');assert.equal(requests.length,0,'selection alone cannot request or reserve');
const oldInvite=primary();ui.close();ui.open();oldInvite.onclick();assert.equal(requests.length,0,'old closed controls are inert');assert.equal(primary().textContent,'邀请一郎 · 10券');
click(primary());oldInvite.onclick();assert.deepEqual(requests,[['jp-salon-ichiro','tea','sake']]);assert.equal(cash,30,'inviting is free');assert(primary().disabled,'cannot pay before a personal acceptance');
order={...order,status:'accepted'};lastReply={artistId:order.artistId,name:'一郎',willing:true,reply:'好呀，我们慢慢讲。'};ui.update();const pay=primary();assert.equal(pay.textContent,'确认预留 10券');click(pay);pay.onclick();assert.equal(confirms,1);assert.equal(cash,20);assert.equal(seated,1);assert(!ui.isOpen());
ui.open();assert.equal(primary().textContent,'入座茶谈');const staleCancel=byText('取消本次邀请');ui.close();assert(order,'close preserves reservation');ui.open();staleCancel.onclick();assert.equal(cancels,0);click(byText('取消本次邀请'));assert.equal(cancels,1);assert.equal(stood,1);assert.equal(order,null);
ui.open();click(primary());order={...order,status:'accepted'};cash=0;ui.update();assert(primary().disabled);assert(dialog().textContent.includes('余额不足'));click(byText('取消本次邀请'));assert.equal(confirms,1);
ui.open();reception=false;ui.update();assert(primary().disabled,'must physically be at the reception');reception=true;available=false;ui.update();assert(primary().disabled,'unavailable artist stays unavailable');available=true;cash=30;paymentError='save-failed';ui.update();assert(primary().disabled);click(byText('重试核对钱款'));assert(!primary().disabled);assert(recoveries>0);
click(primary());order={...order,paid:true,status:'performing',actComplete:true,drinkComplete:false};ui.update();assert(dialog().textContent.includes('未提供 4 券'),'refund card excludes the completed act');
order={...order,currency:'copper',fee:8,actFee:5,drinkFee:3};ui.update();assert(dialog().textContent.includes('中国铜钱 · 随身 30 铜文'));assert(dialog().textContent.includes('5 铜文 · 已结算'));assert(dialog().textContent.includes('3 铜文 · 未完成'));assert(dialog().textContent.includes('未提供 3 铜文'));ui.close();ui.open();assert(dialog().textContent.includes('中国铜钱'),'Reopening an old quote does not relabel it as Japanese tickets');
ui.dispose();assert(!ui.isOpen());console.log('PASS performance UI: selectable activity/drink, one invitation, personal acceptance before payment, one reserve, stale clicks, cancel/reopen, balance/capacity/location/payment guards and partial refund display');
