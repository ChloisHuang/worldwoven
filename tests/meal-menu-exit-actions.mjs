// T05: ordinary chair controls do not belong in food menus. Exercise the real
// three-country UI entry points; preserve cancel, eat and Japan's pool exit.
// Service calls are recorded, so this is UI routing rather than economy/3D QA.
import assert from 'node:assert/strict';
import {createFranceMealUI} from '../source/game/france-meal-ui.js';
import {createEgyptMealUI} from '../source/game/egypt-meal-ui.js';
import {createJapanPlayerServiceUI} from '../source/game/japan-player-service-ui.js';
import {JAPAN_SERVICE_POINTS as P,JAPAN_DINING_MENU,JAPAN_BATH_BLENDS} from '../source/game/japan-service-orders.js';
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.style={};this._text='';this.open=false;this.scrollTop=0;}
 set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this._text='';this.children=nodes;}
 setAttribute(key,value){this.attrs[key]=String(value);}getAttribute(key){return this.attrs[key];}
 showModal(){this.open=true;}close(){this.open=false;}addEventListener(name,fn){this[name]=fn;}remove(){}
 querySelectorAll(selector){const key=selector.match(/^\[([^\]]+)\]$/)?.[1];return key?walk(this).filter(e=>e.attrs[key]!==undefined):[];}
}
const walk=node=>[node,...node.children.flatMap(walk)],document=()=>({head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag)});
const buttons=doc=>walk(doc.body).filter(e=>e.tag==='button'),byText=(doc,text)=>buttons(doc).find(e=>e.textContent===text);
const primary=(doc,cls)=>buttons(doc).find(e=>e.className?.split(' ').includes(cls));
const noChairExit=(doc,label)=>assert(!byText(doc,'起身'),label+' must not duplicate the furniture stand control');
const click=button=>{assert(button&&!button.disabled);button.onclick();};

for(const [country,create,cls]of [['france',createFranceMealUI,'fr-meal-primary'],['egypt',createEgyptMealUI,'eg-meal-primary']]){
 const doc=document(),calls={request:0,eat:0,cancel:0,stand:0},dish={id:'tea-cake',name:'当地正餐',price:country==='france'?4:5};
 let view={cash:20,seated:true,canOrder:true,price:dish.price,name:dish.name,menu:[dish],order:null};
 const service={view:()=>structuredClone(view),request(){calls.request++;return true;},eat(){calls.eat++;return true;},drink(){calls.eat++;return true;},cancel(){calls.cancel++;return true;}};
 const ui=create({service,onStand:()=>calls.stand++,document:doc});
 ui.open();noChairExit(doc,country+' seated menu');assert.equal(calls.request,0);click(primary(doc,cls));assert.equal(calls.request,1);assert(!ui.isOpen());
 ui.open();ui.close();assert.equal(calls.cancel,0,'closing a menu keeps its order');
 for(const stage of ['requested','ready',country==='france'?'drinking':'eating']){
  view.order={id:country+'-'+stage,customer:'player',dishId:dish.id,price:dish.price,stage,payment:stage==='requested'||stage==='ready'?'reserved':'settled'};
  view.canOrder=false;ui.open();noChairExit(doc,country+' '+stage);assert.equal(calls.stand,0);
  if(stage==='ready'){click(primary(doc,cls));assert.equal(calls.eat,1,'the actual food action still works');ui.open();}
  const cancel=buttons(doc).find(e=>e.textContent.includes('取消点餐')||e.textContent.includes('提前收餐'));
  assert(cancel,'meal cancellation/completion action remains available');const before=calls.cancel;click(cancel);assert.equal(calls.cancel,before+1);assert(!ui.isOpen());
 }
 assert.equal(calls.stand,0,'food actions do not stand or cancel the furniture controller');ui.dispose();
}

const doc=document(),calls={stand:0,stop:0,cancel:0,eat:0,meal:0},player={root:{position:{x:0,y:0,z:0}}};
const dining={id:'dining-ramen',kind:'seat',diningKind:'ramen',center:[4.1,0,4.75],position:[4.1,0,5.69],anchor:[4.1,0,4.85]};
const bench={id:'bath-bench',kind:'seat',center:[-7.7,3.8,7.55],position:[-7.7,3.8,6.61],anchor:[-7.7,3.8,7.39]};
const bath={id:'shared-bath',kind:'bath',center:[-7,3.8,3],position:[-7,3.8,3],anchor:[-7,3.8,3]};
const furniture={items:[dining,bench,bath]};let mounted=dining,visit=null,activity=null,soakReady=false;
const move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
const service={blends:JAPAN_BATH_BLENDS,menu:JAPAN_DINING_MENU,state:()=>({visit,activity,soakReady,soakSeconds:soakReady?10:3,cash:40,currency:'japan',payment:'reserved',progress:{blend:{code:'ready',text:'浴包已备好'},meal:{code:'ready',text:'餐点已备好'}}}),
 stopActivity(){calls.stop++;activity=null;},cancel(){calls.cancel++;visit=null;return {ok:true};},eat(){calls.eat++;return {ok:true};},orderMeal(){calls.meal++;return {ok:true};}};
const ui=createJapanPlayerServiceUI({service,furniture,getPlayer:()=>player,getMounted:()=>mounted,onStand:()=>{calls.stand++;mounted=null;},onFurniture:item=>{mounted=item;},document:doc});
move(dining.anchor);ui.openStation('jp-ramen');noChairExit(doc,'Japan counter-seat menu');ui.close();
visit={id:'jp-dining',number:1,orderKind:'dining',dishId:'ramen',price:8,stage:'waiting-meal',restSeatId:dining.id,diningPoint:dining.anchor};
const waitTarget=ui.target();assert.equal(waitTarget.serviceStep.kind,'wait');ui.interact(waitTarget);assert(ui.isOpen());noChairExit(doc,'Japan actual seated wait entry');assert(byText(doc,'取消本餐'));ui.close();
visit.stage='meal-ready';ui.open();noChairExit(doc,'Japan ready meal');click(primary(doc,'jp-service-primary'));assert.equal(calls.eat,1);assert.equal(calls.stand,0);assert(!ui.isOpen());
ui.open();click(byText(doc,'取消本餐'));assert.equal(calls.cancel,1);assert.equal(calls.stand,0);
mounted=bench;move(bench.anchor);visit={id:'jp-bath-meal',number:2,side:'men',stage:'resting',restSeatId:bench.id,diningPoint:bench.anchor};
ui.open();noChairExit(doc,'Japan rest-bench meal');assert.equal(primary(doc,'jp-service-primary').textContent,'在这里点一碗汤面');click(primary(doc,'jp-service-primary'));assert.equal(calls.meal,1);assert.equal(calls.stand,0);
visit.stage='waiting-meal';ui.open();noChairExit(doc,'Japan bath-associated meal');ui.close();
// Pool completion and early exit are service steps, not redundant chair actions.
for(const ready of [false,true]){
 mounted=bath;move(bath.anchor);visit={id:'jp-bath',number:3,stage:'bathing',side:'men',poolId:bath.id};soakReady=ready;
 ui.open();const action=primary(doc,'jp-service-primary');assert.match(action.textContent,ready?/完成泡汤并离池/:/提前离池/);noChairExit(doc,'Japan pool has one business exit');
 const before=calls.stand;click(action);assert.equal(calls.stand,before+1);assert.equal(mounted,null);assert(!ui.isOpen());
 mounted=bath;const target=ui.target();assert.equal(target.serviceStep.kind,'stand');assert.equal(ui.buttonLabel(target),'离池');ui.interact(target);assert.equal(calls.stand,before+2,'the actual near-pool entry still exits');
}
// Other furniture kinds retain their existing secondary exit rather than being
// silently treated as ordinary seats, including an interrupted pool activity.
mounted=bath;activity={point:bath.position,label:'正在清洗'};visit.stage='washing';ui.open();const stop=primary(doc,'jp-service-primary');assert.equal(stop.textContent,'停止当前动作');assert(byText(doc,'起身'));const oldStops=calls.stop;click(stop);assert.equal(calls.stop,oldStops+1);assert.equal(mounted,bath);
activity={point:bath.position,label:'正在清洗'};ui.open();const oldStand=calls.stand;click(byText(doc,'起身'));assert.equal(calls.stand,oldStand+1);assert.equal(mounted,null);assert.equal(calls.stop,oldStops+2);ui.dispose();
console.log('PASS three-country meal menus: no ordinary chair exit; confirm/eat/cancel/close retained; Japan counter/rest-bench entry, early/complete pool exits and non-seat activity escape retained');
