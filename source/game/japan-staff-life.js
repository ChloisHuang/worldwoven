import {JAPAN_SERVICE_POINTS as P,JAPAN_BATH_CREWS,JAPAN_LOCAL_WORKERS} from './japan-service-orders.js';

// Keep the original kitchen indices first so version-one saves retain their
// next worker and counters. One global turn shares the table and single bunk.
export const JAPAN_STAFF_CREW=['jp-ramen','jp-sushi','jp-welcome','jp-market-tea','jp-incense','jp-herb-workshop','jp-onsen','jp-steam','jp-women-onsen','jp-rest',...JAPAN_LOCAL_WORKERS];
const TEA=[-4.9,11.4,5.25],TEA_TARGET=[-4.9,12.68,6.5];
const KITCHEN={ids:['jp-ramen','jp-sushi'],retire:P.kitchen,relief:P.kitchenPickup,back:[4.35,0,-11.3],duty:'煮面与送餐班',mealLabel:'交班后煮自己的员工餐',mealAction:'ramen',mealDuration:5,mealEvent:'staff-meal-cooked'};
const FRONT_DESK={ids:['jp-welcome','jp-market-tea'],retire:[-6.65,0,5.7],relief:P.registrar,back:[-6.65,0,5.7],duty:'登记与退牌班',mealLabel:'从后厨现成汤锅盛自己的员工餐',mealAction:'tidy',mealDuration:3,mealEvent:'staff-meal-served'};
const APOTHECARY={ids:['jp-incense','jp-herb-workshop'],retire:[-5.25,11.4,-.3],relief:P.apothecary,back:[-5.25,11.4,-.3],duty:'浴牌配料班',mealLabel:FRONT_DESK.mealLabel,mealAction:'tidy',mealDuration:3,mealEvent:'staff-meal-served'};
// Meet in the clear central foyer, beside the bath entrances and away from
// benches. The boiler and guest-linen workers keep their authored home work.
const MEN_BATH={ids:JAPAN_BATH_CREWS.men,retire:[-3.8,3.8,6.2],relief:[-2.4,3.8,6.2],duty:'男汤浴包与布巾班',side:'men',homeReturn:true,mealLabel:FRONT_DESK.mealLabel,mealAction:'tidy',mealDuration:3,mealEvent:'staff-meal-served'};
const WOMEN_BATH={...MEN_BATH,ids:JAPAN_BATH_CREWS.women,retire:[-.6,3.8,6.2],relief:[.8,3.8,6.2],duty:'女汤浴包与布巾班',side:'women'};
const COURTYARD={...MEN_BATH,ids:['jp-omamori','jp-garden-onsen'],local:true,side:null,duty:'庭园与御守照料'};
const HALL={...COURTYARD,ids:['jp-tea','jp-balcony'],duty:'暖桌与望景廊接待'};
const profile=id=>[KITCHEN,FRONT_DESK,APOTHECARY,MEN_BATH,WOMEN_BATH,COURTYARD,HALL].find(shift=>shift.ids.includes(id));
// The kotatsu already has a floor cushion and an authored seated anchor. Enter
// from its open side, then use the ordinary furniture transfer/exit checks.
const KOTATSU={id:'japan-kotatsu-host',kind:'kotatsu',action:'kotatsu',position:[-5.9,7.6,5.6],anchor:[-7,7.6,5.525],yaw:Math.PI};
const LOCAL_WAIT={'jp-omamori':[3.3,0,30.6],'jp-garden-onsen':[-17.1,0,-6],'jp-tea':[-4.9,7.6,6.5],'jp-balcony':[-3.3,11.4,10.25]};

// Seven bounded coverage pairs. No live claim, held meal, seat lock or
// sleeping pose is restored from a save; an interrupted break gets its turn
// again after both real workers have safely met at their service counter.
export function createJapanStaffLife({actors,board,furniture,assign,clear,unmount,taskOf,changeWardrobe=()=>{},saved={}}) {
 const crew=JAPAN_STAFF_CREW.map(id=>actors.get(id)).filter(Boolean);
 const seat=furniture.items.find(i=>i.kind==='seat'&&i.center[1]===11.4&&i.center[2]===-7.45);
 const bed=furniture.items.find(i=>i.kind==='bed'&&i.center[1]===11.4);
 if(!crew.length||!seat||!bed)return null;
 let next=Number.isInteger(saved.next)?Math.abs(saved.next)%(saved.version===5?crew.length:saved.version===4?10:saved.version===3?6:saved.version===2?4:2):0,dueIn=Number.isFinite(saved.dueIn)?Math.max(0,Math.min(90,saved.dueIn)):45;
 let active=null,night=false,completed=Math.max(0,saved.completed|0),interrupted=Math.max(0,saved.interrupted|0);
 const events=[];let reliefLook=null;
 const post=id=>{const n=actors.get(id),mount=id==='jp-tea'?KOTATSU:null;return {to:mount?mount.position:n.home.toArray(),mount,action:n.station.npcAction,workTarget:n.station.workTarget,face:n.station.workTarget,label:n.station.npcLabel};};
 const shiftFor=id=>{const shift=profile(id);return shift.local?{...shift,retire:LOCAL_WAIT[id],relief:post(id).to}:shift;};
 function dressRelief(){
  if(active.id!=='jp-omamori'||reliefLook)return;
  const n=actors.get(active.reliefId);reliefLook={...n.root.userData.appearance};
  changeWardrobe(n,{...reliefLook,wardrobePreset:'miko-hakama',hairStyle:'low-bun',locomotionWardrobePreset:reliefLook.locomotionWardrobePreset||reliefLook.wardrobePreset});
 }
 function restoreRelief(){if(reliefLook){changeWardrobe(actors.get(active.reliefId),reliefLook);reliefLook=null;}}
 function endLocalCoverage(){
  if(!profile(active.id).local)return true;
  const relief=actors.get(active.reliefId);if(!unmount(relief))return false;
  clear(relief);furniture.releaseActor(active.reliefId);restoreRelief();active.covering=false;return true;
 }
 const note=event=>{events.push({event,workerId:active?.id||null,reliefId:active?.reliefId||null});if(events.length>24)events.shift();};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle;};
 const go=(n,to,options)=>assign(n,to,{staffLife:true,...options});
 const release=n=>{board.releaseWorkplace(n.station.id);furniture.releaseActor(n.station.id);};
 function finish() {
  const n=actors.get(active.id);restoreRelief();release(n);note(active.interrupted?'break-interrupted':'returned-to-duty');
  if(active.interrupted){interrupted++;dueIn=20;}else{completed++;dueIn=night?35:75;}
  // A player who keeps using the bunk cannot starve the other workers.
  next=(next+1)%crew.length;
  active=null;return true;
 }
 function leaveMount(n,phase) {
  if(!unmount(n))return false;
  release(n);active.phase=phase;active.wait=0;return true;
 }
 function interrupt(n) {
  if(!active||n.station.id!==active.id)return false;
  if(!unmount(n)||!endLocalCoverage())return false;
  if(active.phase==='handoff'){const relief=actors.get(active.reliefId);if(taskOf(relief)?.staffLife)clear(relief);}
  clear(n);release(n);active.meal=false;active.interrupted=true;active.phase='returning';active.wait=0;return true;
 }
 return {
  idlePoint(id){return active?.reliefId===id&&(!profile(id).local||active.covering)?shiftFor(active.id).relief:id==='jp-tea'?KOTATSU.position:id==='jp-welcome'?FRONT_DESK.retire:id==='jp-incense'?APOTHECARY.retire:null;},
  // Nao stays the supply clerk between relief shifts; training is not a
  // permanent reassignment away from the rear-yard crates.
  canClaim(id,kind){
   if(JAPAN_LOCAL_WORKERS.includes(id))return false;
   const primary=id==='jp-herb-workshop'&&kind==='prepare'?'jp-incense':id==='jp-steam'&&kind==='deliverMix'?'jp-onsen':id==='jp-rest'&&kind==='deliverMix'?'jp-women-onsen':null;
   return !primary||(active?.id===primary&&active.reliefId===id&&!['draining','handoff'].includes(active.phase));
  },
  idleTask(id){
   const n=actors.get(id);
   if(profile(id)?.local){const work=post(active?.reliefId===id&&active.covering?active.id:id);return {...work,duration:4};}
   if(active?.reliefId===id){const shift=profile(id);return {duration:4,face:shift===KITCHEN?P.mealTray:shift===FRONT_DESK?P.tokenTray:shift.side?P[shift.side+'Service']:P.blendWork,label:'留在代班岗位，等候下一张单'};}
   return id==='jp-herb-workshop'?{duration:4,action:n.station.npcAction,workTarget:n.station.workTarget,label:n.station.npcLabel}:null;
  },
  canWork(id){return !active||(id!==active.id&&!(id===active.reliefId&&['draining','handoff'].includes(active.phase)));},
  update(dt,state={}) {
   if(!!state.night!==night){night=!!state.night;if(night&&!active)dueIn=Math.min(dueIn,10);}
   if(!active){dueIn-=dt;if(dueIn>0)return;const id=crew[next].station.id;active={id,reliefId:profile(id).ids.find(other=>other!==id),covering:false,phase:'draining',sleep:night,meal:false,wait:0,interrupted:false};note('break-due');}
   const n=actors.get(active.id),relief=actors.get(active.reliefId),shift=shiftFor(active.id);
   if(active.phase==='draining') {
    // Already claimed orders and trays finish normally. Neither actor can
    // claim another job until the relief physically reaches this handoff.
    if(busy(n)||busy(relief)||!unmount(n)||!unmount(relief))return;
    clear(n);clear(relief);furniture.releaseActor(n.station.id);furniture.releaseActor(relief.station.id);active.phase='handoff';active.retireReady=false;active.reliefReady=false;
    const met=()=>{if(active.retireReady&&active.reliefReady){active.covering=!!shift.local;dressRelief();note('relief-arrived');active.phase='preparing';}return true;};
    // Distinct adjacent positions let the retiring worker hand over without
    // occupying the point the replacement must reach.
    const reliefPost=shift.local?post(active.id):null;
    if(reliefPost?.mount&&!furniture.facilities.request(reliefPost.mount.id,active.reliefId)){active.phase='draining';return;}
    go(n,shift.retire,{face:shift===APOTHECARY||shift.side||shift.local?shift.relief:null,label:`把${shift.duty}交给 ${relief.station.npcName}`,duration:1,onDone:()=>{active.retireReady=true;return met();}});
    go(relief,shift.relief,{...(reliefPost?.mount?{mount:reliefPost.mount,action:reliefPost.action,workTarget:reliefPost.workTarget}:{}),face:reliefPost?.mount?reliefPost.workTarget:shift===APOTHECARY||shift.side||shift.local?shift.retire:null,label:`接替 ${n.station.npcName} 的${shift.duty}`,duration:1,onDone:()=>{active.reliefReady=true;return met();}});return;
   }
   if(active.phase==='handoff'||busy(n))return;
   if(active.phase==='preparing') {
    if(!board.holdWorkplace('kitchen',active.id))return;
    go(n,P.kitchen,{label:shift.mealLabel,action:shift.mealAction,workTarget:[2.1,1.47,-13.4],duration:shift.mealDuration,onDone:()=>{board.releaseWorkplace(active.id);active.meal=true;active.phase='meal';note(shift.mealEvent);return true;}});
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
    go(n,shift.local?shift.retire:active.id==='jp-herb-workshop'||shift.homeReturn?n.home.toArray():shift.back,{label:`回岗位接回${shift.duty}`,duration:1,onDone:shift.local?()=>{active.phase='reclaiming';return true;}:finish});
   }else if(active.phase==='reclaiming') {
    if(!endLocalCoverage())return;
    const work=post(active.id);if(work.mount&&!furniture.facilities.request(work.mount.id,active.id))return;
    go(n,work.to,{...work,duration:1,onDone:finish});
   }
  },
  abort(n){
   if(!active)return;
   if(n.station.id===active.reliefId){if(active.phase==='handoff'){restoreRelief();active.phase='draining';return;}if(profile(active.id).local&&active.covering)interrupt(actors.get(active.id));return;}
   interrupt(n);
  },
  playerRequest(id){if(active){const n=actors.get(active.id);if(n.serviceMount?.id===id||taskOf(n)?.mount?.id===id)interrupt(n);}},
  meals:()=>active?.meal?[{workerId:active.id,eating:taskOf(actors.get(active.id))?.arrived&&active.phase==='meal'}]:[],
  snapshot:()=>({version:5,next,dueIn:active?0:Math.max(0,dueIn),completed,interrupted}),
  state:()=>({crew:crew.map(n=>n.station.id),nextWorkerId:crew[next].station.id,dueIn:Math.max(0,dueIn),completed,interrupted,active:active?{...active}:null,events:events.slice()}),
  dispose(){if(active)restoreRelief();for(const n of crew)release(n);active=null;},
 };
}
