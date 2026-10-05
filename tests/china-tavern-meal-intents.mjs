// Bounded UI/controller regression: a meal choice used to stop after sitting.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createChinaTavernMealUI} from '../source/game/china-tavern-meal-ui.js';
import {nearbyInteraction,currentInteractionIntent} from '../source/game/player-interaction-intents.js';
const element=()=>({children:[],style:{},open:false,setAttribute(){},append(...e){this.children.push(...e);},replaceChildren(...e){this.children=e;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}});
const doc={head:element(),body:element(),createElement:element};
const seat={id:'china-tavern-dining-west',kind:'seat',furniture:true,center:[18.1,.215,16.78],position:[18.1,.215,15.88],anchor:[18.1,.215,16.64]},reception={id:'cn-tavern-host',position:[22.35,.215,11.7]};
const player={root:{position:{x:22.35,y:.215,z:11.7}}},move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
let mounted=null,order=null,requests=0,mounts=0,free=true,busy=false,visible=true,show=true,mountSucceeds=true,plans=0,failPath=false;
const service={seats:[seat],dish:{host:reception.id,id:'yunlai-mushroom-rice',name:'云来菌菇饭',price:6},menu:[{id:'yunlai-mushroom-rice',name:'云来菌菇饭',price:6},{id:'yunlai-green-noodles',name:'青蔬汤面',price:8}],walletCash:()=>20,view:()=>({order,label:order?'许安正过来听你点菜':null}),requestMeal(){assert.equal(mounted,seat);requests++;order={id:'meal-'+requests,seatId:seat.id,stage:'requested'};return true;},cancel(){order=null;}};
const ctx={studyMenu:{close(){}},formalCareers:{cancelLearning(){}},studyTicket:null,chinaCareer:null,chinaService:null,franceLabor:null,player,currentInteractionIntent,nearbyInteraction,lot:{stations:[]},stationIntent:()=>null,nearbyInteractionClear:()=>visible,interactionMenuOpen:()=>ui.isOpen(),THREE:{Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z});}}},furniture:{releaseActor(){}},keys:new Set(),joy:{},joyPointer:null,arrivalViewUntil:0,planPath:()=>{plans++;return failPath?[]:[{}];},toast(){},$:()=>({style:{}}),standFromSeat:()=>{mounted=null;return true;},seated:null,chinaLabor:null,franceTea:null,chinaMoneyHouse:null,npcSocial:null,chinaSalon:null,chinaArchery:null,chinaClinic:null,japanPlayerService:null,pendingInteraction:null,performing:null,path:[],targetStation:null,actionTime:0};
const ui=createChinaTavernMealUI({service,getPlayer:()=>player,getMounted:()=>mounted,getReception:()=>reception,onIntent:i=>ctx.requestStationIntent(i),onMountSeat:item=>{mounts++;if(mountSucceeds){mounted=item;move(item.anchor);}},onStand:ctx.standFromSeat,onOpen:()=>{ctx.path=[];ctx.targetStation=null;ctx.pendingInteraction=null;},canChooseSeat:()=>free,canOrder:()=>!busy,canSee:()=>visible,canShow:()=>show,document:doc});ctx.chinaTavernUI=ui;
const main=fs.readFileSync('source/game/main.js','utf8'),take=(a,b)=>main.slice(main.indexOf(a),main.indexOf(b,main.indexOf(a)));
vm.createContext(ctx);vm.runInContext([take('function resolvePlayerIntent(','function goToStation('),take('function cancelAction(','function doInteraction('),take('function startInteraction(','function furnitureSafetyBoxes(')].join('\n'),ctx);
// Respect the same keepSeat contract as production without copying navigation.
ctx.standFromSeat=()=>{mounted=null;return true;};
const find=(e,p)=>p(e)?e:e.children?.map(c=>find(c,p)).find(Boolean),badge=find(doc.body,e=>e.className==='cn-meal-ticket'),dialog=find(doc.body,e=>e.className==='cn-meal-dialog');
const choice=()=>find(dialog,e=>e.textContent?.startsWith('在西窗')),card=()=>{ui.open();assert(ui.isOpen());return choice();};
const arrive=()=>{const i=ctx.pendingInteraction;assert(i);move(i.position);ctx.startInteraction(i);return i;};
const first=card();assert.match(first.textContent,/点云来菌菇饭 · 6文/);first.onclick();first.onclick();assert.equal(plans,1);assert.equal(requests,0);assert.equal(mounts,0);assert.deepEqual([...ctx.pendingInteraction.position],seat.position);const completed=arrive();assert.equal(requests,1);assert.equal(mounts,1);ctx.startInteraction(completed);first.onclick();assert.equal(requests,1,'one click mounts then orders once');
ui.open();assert(!choice(),'existing order shows status, not another meal');const cancel=find(dialog,e=>e.textContent==='取消点餐 · 送达前退款');cancel.onclick();assert.equal(order,null);cancel.onclick();
// Manual entry needs no prior automatic request or route state.
mounted=seat;move(seat.anchor);ui.open();const manual=find(dialog,e=>e.textContent==='确认点餐 · 6文');manual.onclick();assert.equal(requests,2);assert.equal(mounts,1);assert.equal(plans,1);manual.onclick();assert.equal(requests,2);
order=null;mounted=null;move(reception.position);const cancelled=card();cancelled.onclick();const pending=ctx.pendingInteraction;ctx.cancelAction();ctx.path=[];ctx.targetStation=null;assert.equal(ui.resolveIntent(pending),null);cancelled.onclick();assert.equal(ctx.pendingInteraction,null);assert.equal(requests,2);
ui.open();cancelled.onclick();assert.equal(ctx.pendingInteraction,null,'old closed menu button stays stale after reopen');choice().onclick();free=false;move(seat.position);ctx.startInteraction(ctx.pendingInteraction);assert.equal(mounts,1);assert.equal(requests,2,'occupied arrival never orders');free=true;
move(reception.position);mountSucceeds=false;card().onclick();arrive();assert.equal(requests,2,'failed mount cannot order');mountSucceeds=true;
move(reception.position);failPath=true;card().onclick();assert.equal(ctx.pendingInteraction,null);assert.equal(requests,2);failPath=false;
move(reception.position);card().onclick();const departing=ctx.pendingInteraction;ui.dispose();badge.onclick();assert.equal(ui.resolveIntent(departing),null);ctx.startInteraction(departing);assert.equal(requests,2,'disposed region cannot submit old choice');
// Badge has no order-driven global fallback; status remains explicitly openable.
const otherDoc={head:element(),body:element(),createElement:element};
const other=createChinaTavernMealUI({service,getPlayer:()=>player,getMounted:()=>mounted,getReception:()=>reception,onOpen(){},canOrder:()=>!busy,canSee:()=>visible,canShow:()=>show,document:otherDoc});
const ticket=find(otherDoc.body,e=>e.className==='cn-meal-ticket');move(reception.position);other.update();assert.equal(ticket.hidden,false);
move([22.35,4.1,11.7]);other.update();assert(ticket.hidden);move([21,.215,20.8]);other.update();assert(ticket.hidden,'old house rectangle does not expose badge');move(reception.position);visible=false;other.update();assert(ticket.hidden);visible=true;show=false;other.update();assert(ticket.hidden);show=true;
busy=true;other.open();assert(find(otherDoc.body,e=>e.textContent?.includes('短工还未收工')));assert.equal(other.intent(seat.id),null);other.close();busy=false;
move([0,.215,0]);order={id:'existing',seatId:seat.id,stage:'ready'};other.update();assert(ticket.hidden);other.open();assert(other.isOpen(),'explicit order inspection remains available');other.dispose();
console.log('PASS: one-click mount/order, manual seated order, repeat/stale/cancel/dispose, occupancy/mount/path failure, busy status, near/floor/occlusion/hidden badge');
