import {JAPAN_SERVICE_POINTS as P} from './japan-service-orders.js';

export const JAPAN_STAFF_CREW=['jp-ramen','jp-sushi'];
const TEA=[-4.9,11.4,5.25],TEA_TARGET=[-4.9,12.68,6.5];

// A bounded two-person kitchen shift. No live claim, held meal, seat lock or
// sleeping pose is restored from a save; an interrupted break gets its turn
// again after both real workers have safely met at the kitchen.
export function createJapanStaffLife({actors,board,furniture,assign,clear,unmount,taskOf,saved={}}) {
 const crew=JAPAN_STAFF_CREW.map(id=>actors.get(id));
 const seat=furniture.items.find(i=>i.kind==='seat'&&i.center[1]===11.4&&i.center[2]===-7.45);
 const bed=furniture.items.find(i=>i.kind==='bed'&&i.center[1]===11.4);
 if(crew.some(n=>!n)||!seat||!bed)return null;
 let next=Number.isInteger(saved.next)?Math.abs(saved.next)%2:0,dueIn=Number.isFinite(saved.dueIn)?Math.max(0,Math.min(90,saved.dueIn)):45;
 let active=null,night=false,completed=Math.max(0,saved.completed|0),interrupted=Math.max(0,saved.interrupted|0);
 const events=[];
 const note=event=>{events.push({event,workerId:active?.id||null,reliefId:active?.reliefId||null});if(events.length>24)events.shift();};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle;};
 const go=(n,to,options)=>assign(n,to,{staffLife:true,...options});
 const release=n=>{board.releaseWorkplace(n.station.id);furniture.releaseActor(n.station.id);};
 function finish() {
  const n=actors.get(active.id);release(n);note(active.interrupted?'break-interrupted':'returned-to-duty');
  if(active.interrupted){interrupted++;dueIn=20;}else{completed++;next=(next+1)%2;dueIn=night?35:75;}
  active=null;return true;
 }
 function leaveMount(n,phase) {
  if(!unmount(n))return false;
  release(n);active.phase=phase;active.wait=0;return true;
 }
 function interrupt(n) {
  if(!active||n.station.id!==active.id)return false;
  if(!unmount(n))return false;
  if(active.phase==='handoff'){const relief=actors.get(active.reliefId);if(taskOf(relief)?.staffLife)clear(relief);}
  clear(n);release(n);active.meal=false;active.interrupted=true;active.phase='returning';active.wait=0;return true;
 }
 return {
  idlePoint(id){return active?.reliefId===id?P.kitchenPickup:null;},
  canWork(id){return !active||(id!==active.id&&!(id===active.reliefId&&['draining','handoff'].includes(active.phase)));},
  update(dt,state={}) {
   if(!!state.night!==night){night=!!state.night;if(night&&!active)dueIn=Math.min(dueIn,10);}
   if(!active){dueIn-=dt;if(dueIn>0)return;active={id:crew[next].station.id,reliefId:crew[1-next].station.id,phase:'draining',sleep:night,meal:false,wait:0,interrupted:false};note('break-due');}
   const n=actors.get(active.id),relief=actors.get(active.reliefId);
   if(active.phase==='draining') {
    // Already claimed orders and trays finish normally. Neither actor can
    // claim another job until the relief physically reaches this handoff.
    if(busy(n)||busy(relief))return;
    clear(n);clear(relief);active.phase='handoff';active.retireReady=false;active.reliefReady=false;
    const met=()=>{if(active.retireReady&&active.reliefReady){note('relief-arrived');active.phase='preparing';}return true;};
    // Distinct adjacent positions let the retiring cook hand over without
    // occupying the point the replacement must reach.
    go(n,P.kitchen,{label:`把煮面与送餐班交给 ${relief.station.npcName}`,duration:1,onDone:()=>{active.retireReady=true;return met();}});
    go(relief,P.kitchenPickup,{label:`接替 ${n.station.npcName} 的煮面与送餐班`,duration:1,onDone:()=>{active.reliefReady=true;return met();}});return;
   }
   if(active.phase==='handoff'||busy(n))return;
   if(active.phase==='preparing') {
    if(!board.holdWorkplace('kitchen',active.id))return;
    go(n,P.kitchen,{label:'交班后煮自己的员工餐',action:'ramen',workTarget:[2.1,1.47,-13.4],duration:5,onDone:()=>{board.releaseWorkplace(active.id);active.meal=true;active.phase='meal';note('staff-meal-cooked');return true;}});
   }else if(active.phase==='meal'||active.phase==='sleep') {
    const eating=active.phase==='meal',fixture=eating?seat:bed;
    if(state.facilityId===fixture.id||!furniture.facilities.request(fixture.id,active.id)){
     active.wait+=dt;if(active.wait>=20)interrupt(n);return;
    }
    go(n,fixture.position,{label:eating?'端员工餐到员工室坐下吃':'夜班轮休，在员工室下铺睡一会儿',mount:fixture,action:eating?'chair-sit':'lie-rest',handoff:eating,seatedMeal:eating,duration:eating?9:30,onArrive:()=>{note(eating?'eating':'sleeping');return true;},onDone:()=>{
     if(!leaveMount(n,eating?'tea':'returning'))return false;
     active.meal=false;note(eating?'meal-finished':'woke-up');return true;
    }});
   }else if(active.phase==='tea') {
    go(n,TEA,{label:'在事务室茶具旁喝口茶',action:'tea',face:TEA_TARGET,duration:7,onArrive:()=>{note('drinking');return true;},onDone:()=>{active.phase=active.sleep?'sleep':'returning';return true;}});
   }else if(active.phase==='returning') {
    go(n,[4.35,0,-11.3],{label:'回厨房接回煮面与送餐班',duration:1,onDone:finish});
   }
  },
  abort(n){
   if(!active)return;
   if(n.station.id===active.reliefId&&active.phase==='handoff'){active.phase='draining';return;}
   interrupt(n);
  },
  playerRequest(id){if(active){const n=actors.get(active.id);if(n.serviceMount?.id===id||taskOf(n)?.mount?.id===id)interrupt(n);}},
  meals:()=>active?.meal?[{workerId:active.id,eating:taskOf(actors.get(active.id))?.arrived&&active.phase==='meal'}]:[],
  snapshot:()=>({version:1,next,dueIn:active?0:Math.max(0,dueIn),completed,interrupted}),
  state:()=>({crew:JAPAN_STAFF_CREW.slice(),nextWorkerId:crew[next].station.id,dueIn:Math.max(0,dueIn),completed,interrupted,active:active?{...active}:null,events:events.slice()}),
  dispose(){for(const n of crew)release(n);active=null;},
 };
}
