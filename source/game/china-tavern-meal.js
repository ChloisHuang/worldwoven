import {createTavernServiceScene} from './china-tavern-service-scene.js';
import {TAVERN_MEAL as M,TAVERN_DISHES} from './china-tavern-kitchen.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const LABELS={requested:'许安将按客单次序过来点菜',ordered:'许安在桌边记下菜与桌位',paid:'菜票已记下，沈禾按单备菜',preparing:'沈禾在切配',prepared:'食材备好，等候烹调',heating:'灶上正在烹调',cooked:'厨师把热菜送上传菜台',pass:'陆青按客单从传菜台取餐',carrying:'服务助理正在送餐',ready:'菌菇饭已上桌，选择用餐',eating:'慢慢享用菌菇饭','finish-bite':'吃好了，放回餐碗',dirty:'用后餐具与桌面等待清理',return:'服务助理把餐具送回后厨',done:'本单已收洗'};

// Customer UI and every staff role share this one world order queue. Existing
// meal controls remain a small facade; no second controller owns the actors.
export function createChinaTavernMeal({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,canRequest=()=>true,saved={},saveState=()=>{},notify=()=>{},navigation,world=null,saveServiceState=()=>true,onServiceReview=()=>({ok:true}),copperLedger}){
 const chargePlayer=(action,o)=>{if(!copperLedger||copperLedger.loadError)return {ok:false,code:'wallet-unavailable'};const hold=copperLedger.reservations().find(h=>h.id===o.id);if(action==='status')return {ok:true,status:hold?.status||'unpaid'};if(action==='reserve')return hold&&hold.status!=='reserved'?{ok:false,code:'payment-already-closed'}:copperLedger.reserve(o.price,o.id,'copper');if(action==='settle')return copperLedger.settle(o.id);return !hold||hold.status==='refunded'?{ok:true}:copperLedger.refund(o.id);};
 const staffScene=createTavernServiceScene({npcs,lot,furniture,doors,planPath,moveActor,poseContext,getPlayer,getMounted,navigation,saveState:saveServiceState,onReview:onServiceReview,chargePlayer,notify});
 if(world)staffScene.restoreWorld(world);else staffScene.initializeWorld();
 const seats=furniture.items.filter(i=>i.id.startsWith('china-tavern-dining-'));let disposed=false;
 const current=()=>staffScene.playerOrder();
 function requestMeal(dishId=M.id){if(!canRequest()){notify('请先交还手上的岗位或结清临工，再坐下点菜');return false;}const seat=getMounted();if(!seat||!seats.includes(seat)){notify('请先挑一个空餐位坐好');return false;}if(current()){notify('已经有一份待处理的点餐，稍等即可');return false;}return staffScene.requestPlayerMeal(seat,dishId);}
 return {seats,dish:M,menu:TAVERN_DISHES,walletCash:()=>copperLedger?.balances().copper.cash||0,staffScene,requestMeal,owns:n=>staffScene.owns(n),socialStatus:n=>staffScene.socialStatus(n),
  cancel:()=>staffScene.cancelPlayerMeal(),leaveSeat(id){if(current()?.seatId===id)staffScene.cancelPlayerMeal();},
  eat:()=>staffScene.eatPlayerMeal(),playerPose:()=>staffScene.playerPose(),statusLabel:seatId=>current()?.seatId===seatId?(LABELS[current().stage]||current().stage).replaceAll('菌菇饭',current().dishName):null,
  update(dt,t,options={}){if(!disposed)staffScene.update(dt,t,options);},
  view(){const o=current();return {order:o?{id:o.id,seatId:o.seatId,stage:o.stage,cancelled:!!o.cancelled}:null,label:o?(LABELS[o.stage]||o.stage).replaceAll('菌菇饭',o.dishName):null};},
  state(){const world=staffScene.state(),o=current(),shown=world.orders.find(q=>q.id===o?.id);return {serial:world.serial||0,order:o?copy(o):null,label:o?(LABELS[o.stage]||o.stage).replaceAll('菌菇饭',o.dishName):null,history:world.history,failures:world.failures,props:shown?.props||{trayCount:0,bowlCount:0,mealId:null},actors:world.actors,staffScene:world,persistentClaims:false};},
  snapshot:()=>staffScene.continuitySnapshot(),restore:snapshot=>staffScene.restoreContinuity(snapshot),
  dispose({suspend=false}={}){if(disposed)return;disposed=true;if(!suspend&&current())staffScene.cancelPlayerMeal();staffScene.dispose();}}
}
