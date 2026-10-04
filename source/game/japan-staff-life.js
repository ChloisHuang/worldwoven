import {createLifeDecisions} from './npc-life-decisions.js';
import {JAPAN_SERVICE_POINTS as P,JAPAN_BATH_CREWS,JAPAN_LOCAL_WORKERS} from './japan-service-orders.js';

// Keep the original kitchen indices first so version-one saves retain their
// next worker and counters. Independent due times share one safe relief slot.
export const JAPAN_STAFF_CREW=['jp-ramen','jp-sushi','jp-welcome','jp-market-tea','jp-incense','jp-herb-workshop','jp-onsen','jp-steam','jp-women-onsen','jp-rest',...JAPAN_LOCAL_WORKERS];
const TEA=[-4.9,11.4,5.25],TEA_TARGET=[-4.9,12.68,6.5],TEA_FACILITY='japan-staff-tea';
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
const KOTATSU={id:'japan-kotatsu-host',kind:'kotatsu',poseAction:'kotatsu',position:[-5.9,7.6,5.6],anchor:[-7,7.6,5.525],yaw:Math.PI};
// The shrine's back lane is single-file: wait past the east end so both the
// incoming replacement and outgoing worker retain their actual clear route.
const LOCAL_WAIT={'jp-omamori':[7.5,0,30.5],'jp-garden-onsen':[-17.1,0,-6],'jp-tea':[-4.9,7.6,6.5],'jp-balcony':[-3.3,11.4,10.25]};

// Seven bounded coverage pairs. No live claim, held meal, seat lock or
// sleeping pose is restored from a save; an interrupted break gets its turn
// again after both real workers have safely met at their service counter.
export function createJapanStaffLife({actors,board,furniture,assign,clear,unmount,taskOf,changeWardrobe=()=>{},canReach=()=>true,worldSeed=1,saved={}}) {
 // A reduced scene can omit a whole pair, but never schedule half a pair.
 const crew=JAPAN_STAFF_CREW.filter(id=>profile(id).ids.every(other=>actors.has(other))).map(id=>actors.get(id));
 const seats=furniture.items.filter(i=>i.kind==='seat'&&i.center[1]===11.4&&i.center[2]===-7.45);
 const beds=furniture.items.filter(i=>i.kind==='bed'&&i.center[1]===11.4);
 if(!crew.length)return null;
 let next=Number.isInteger(saved.next)?Math.abs(saved.next)%(saved.version>=5?crew.length:saved.version===4?10:saved.version===3?6:saved.version===2?4:2):0,dueIn=Number.isFinite(saved.dueIn)?Math.max(0,Math.min(90,saved.dueIn)):45;
 let time=Number.isFinite(saved.clock)?saved.clock:Number.isFinite(saved.decisions?.time)?saved.decisions.time:0;
 let active=null,night=!!saved.night,completed=Math.max(0,saved.completed|0),interrupted=Math.max(0,saved.interrupted|0);
 if(saved.nextId&&crew.some(n=>n.station.id===saved.nextId))next=crew.findIndex(n=>n.station.id===saved.nextId);
 const events=[];let reliefLook=null,resumeReturn=saved.version>=6&&!!saved.returning;
 const decisions=createLifeDecisions({worldSeed,actorIds:crew.map(n=>n.station.id),saved:saved.decisions});
 const phase=id=>decisions.state(id).traits.quiet*45;
 const due=Object.fromEntries(crew.map(n=>{const id=n.station.id;return [id,Number.isFinite(saved.breakDue?.[id])?saved.breakDue[id]:time+(saved.version&&id===crew[next].station.id?dueIn:dueIn+phase(id)+1)];}));
 const dueOrder=(a,b)=>due[a.station.id]-due[b.station.id]||(a.station.id<b.station.id?-1:1);
 const nextWorker=()=>active?actors.get(active.id):crew.slice().sort(dueOrder)[0];
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
 const note=(event,detail={})=>{events.push({event,workerId:active?.id||null,reliefId:active?.reliefId||null,...detail});if(events.length>24)events.shift();};
 const busy=n=>{const t=taskOf(n);return !!t&&!t.idle;};
 const go=(n,to,options)=>assign(n,to,{staffLife:true,...options});
 const release=n=>{board.releaseWorkplace(n.station.id);furniture.releaseActor(n.station.id);};
 // Availability is a hard gate, independent of preference. Check it once at
 // the real handoff, then reserve only the chosen facility for this break.
 const nearPoint=(n,p,r=1)=>n?.root.position&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<1;
 function vacant(id,state) {
  const f=furniture.facilities.state().find(f=>f.id===id);
  return state.facilityId!==id&&!f?.player&&(!f||!f.reservations.some(r=>r.actor!==active.id)&&(!f.queue.length||f.queue[0]===active.id));
 }
 function candidates(n,state) {
  const teaClear=![...actors.values()].some(other=>other!==n&&nearPoint(other,TEA,.7))&&!(state.position&&Math.hypot(state.position.x-TEA[0],state.position.z-TEA[2])<.7&&Math.abs(state.position.y-TEA[1])<1);
  const targets=items=>items.map(item=>({id:item.id,available:vacant(item.id,state)&&canReach(n,item.position),choice:{facilityId:item.id}}));
  return [
   {id:'meal',targets:targets(seats),available:!board.state().claims.some(j=>j.resource==='kitchen')&&canReach(n,P.kitchen),base:.15,traits:{appetite:.9},needs:{hunger:3.4},relief:{hunger:-.72},duration:[8,12],cooldown:90},
   // Drinking nearby is not a conversation: no invented partner, social relief,
   // familiarity or observer opinion is awarded for merely sharing the room.
   {id:'tea',targets:[{id:TEA_FACILITY,available:vacant(TEA_FACILITY,state)&&teaClear&&canReach(n,TEA),choice:{facilityId:TEA_FACILITY}}],base:.3,traits:{quiet:.65,sociability:.2},needs:{fatigue:.2},relief:{fatigue:-.12},duration:[6,11],cooldown:55},
   {id:'rest',targets:targets(beds),base:.12,traits:{quiet:.45},needs:{fatigue:3.5},relief:{fatigue:-.78},duration:[20,34],cooldown:140},
  ];
 }
 function completeChoice(fulfilled=true) {
  if(!active.choice)return;
  decisions.complete(active.id,active.choice,{fulfilled});active.choice=null;
 }
 function chooseBreak(n,state) {
  const choice=decisions.choose(active.id,candidates(n,state),Number.isFinite(state.hour)?state.hour:night?22:12);
  if(!choice){active.phase='returning';note('no-leisure-available');return;}
  active.choice=choice;
  if(!furniture.facilities.request(choice.facilityId,active.id)||(choice.id==='meal'&&!board.holdWorkplace('kitchen',active.id))){interrupt(n);return;}
  active.phase=choice.id==='meal'?'preparing':choice.id==='rest'?'sleep':'tea';
  note('leisure-chosen',{choice:choice.id,resumed:!!choice.resumed});
 }
 function finish() {
  const n=actors.get(active.id);restoreRelief();board.releaseWorkplace(n.station.id);if(!n.serviceMount)furniture.releaseActor(n.station.id);note(active.interrupted?'break-interrupted':'returned-to-duty');
  if(active.interrupted)interrupted++;else completed++;
  // A person's next due time does not stretch when unrelated workers are added.
  // The one shared relief slot still imposes real capacity and coverage limits.
  due[active.id]=time+(active.interrupted?20:night?420:900);
  active=null;return true;
 }
 function leaveMount(n,phase) {
  if(!unmount(n))return false;
  release(n);active.phase=phase;active.wait=0;return true;
 }
 function interrupt(n,{coverageAborted=false}={}) {
  if(!active||n.station.id!==active.id)return false;
  if(!unmount(n)||(coverageAborted&&!endLocalCoverage()))return false;
  if(active.phase==='handoff'){const relief=actors.get(active.reliefId);if(taskOf(relief)?.staffLife)clear(relief);}
  clear(n);release(n);completeChoice(false);active.meal=false;active.interrupted=true;active.phase='returning';active.wait=0;return true;
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
   if(profile(id)?.local){const work=post(active?.reliefId===id&&active.covering?active.id:id);return {...work,staffLife:true,duration:4};}
   if(active?.reliefId===id){const shift=profile(id);return {duration:4,face:shift===KITCHEN?P.mealTray:shift===FRONT_DESK?P.tokenTray:shift.side?P[shift.side+'Service']:P.blendWork,label:'留在代班岗位，等候下一张单'};}
   return id==='jp-herb-workshop'?{duration:4,action:n.station.npcAction,workTarget:n.station.workTarget,label:n.station.npcLabel}:null;
  },
  canWork(id){return !active||(id!==active.id&&!(id===active.reliefId&&['draining','handoff'].includes(active.phase)));},
  update(dt,state={}) {
   time+=dt;decisions.tick(dt);
   if(!!state.night!==night){night=!!state.night;if(night)for(const n of crew){const id=n.station.id;due[id]=Math.min(due[id],time+10+phase(id));}}
   if(!active){
    // Reserve only the relief slot now. Existing jobs drain before the real
    // handoff establishes eligibility for an action; no per-frame lottery.
    const candidate=resumeReturn?crew[next]:crew.filter(n=>due[n.station.id]<=time).sort(dueOrder)[0];
    if(!candidate)return;const id=candidate.station.id;next=crew.indexOf(candidate);active={id,reliefId:profile(id).ids.find(other=>other!==id),covering:false,phase:'draining',choice:null,meal:false,wait:0,interrupted:resumeReturn&&!!saved.returnInterrupted,returnOnly:resumeReturn};resumeReturn=false;note('break-due');
   }
   const n=actors.get(active.id),relief=actors.get(active.reliefId),shift=shiftFor(active.id);
   if(active.phase==='draining') {
    // Already claimed orders and trays finish normally. Neither actor can
    // claim another job until the relief physically reaches this handoff.
    if(busy(n)||busy(relief)||!unmount(n)||!unmount(relief))return;
    clear(n);clear(relief);furniture.releaseActor(n.station.id);furniture.releaseActor(relief.station.id);active.phase='handoff';active.retireReady=false;active.reliefReady=false;
    const met=()=>{if(active.retireReady&&active.reliefReady){active.covering=!!shift.local;dressRelief();note('relief-arrived');active.phase=active.returnOnly?'returning':'choosing';}return true;};
    // Distinct adjacent positions let the retiring worker hand over without
    // occupying the point the replacement must reach.
    const reliefPost=shift.local?post(active.id):null;
    if(reliefPost?.mount&&!furniture.facilities.request(reliefPost.mount.id,active.reliefId)){active.phase='draining';return;}
    go(n,shift.retire,{face:shift===APOTHECARY||shift.side||shift.local?shift.relief:null,label:`把${shift.duty}交给 ${relief.station.npcName}`,duration:1,onDone:()=>{active.retireReady=true;return met();}});
    go(relief,shift.relief,{...(reliefPost?.mount?{mount:reliefPost.mount,action:reliefPost.action,workTarget:reliefPost.workTarget}:{}),face:reliefPost?.mount?reliefPost.workTarget:shift===APOTHECARY||shift.side||shift.local?shift.retire:null,label:`接替 ${n.station.npcName} 的${shift.duty}`,duration:1,onDone:()=>{active.reliefReady=true;return met();}});return;
   }
   if(active.phase==='handoff'||busy(n))return;
   if(active.phase==='choosing')chooseBreak(n,state);
   if(active.phase==='preparing') {
    if(!vacant(active.choice.facilityId,state)||!board.holdWorkplace('kitchen',active.id)){interrupt(n);return;}
    go(n,P.kitchen,{label:shift.mealLabel,action:shift.mealAction,workTarget:[2.1,1.47,-13.4],duration:shift.mealDuration,onDone:()=>{board.releaseWorkplace(active.id);active.meal=true;active.phase='meal';note(shift.mealEvent);return true;}});
   }else if(active.phase==='meal'||active.phase==='sleep') {
    const eating=active.phase==='meal',fixture=furniture.items.find(item=>item.id===active.choice.facilityId);
    if(!fixture){interrupt(n);return;}
    if(state.facilityId===fixture.id||!furniture.facilities.request(fixture.id,active.id)){
     active.wait+=dt;if(active.wait>=20)interrupt(n);return;
    }
    go(n,fixture.position,{label:eating?'端员工餐到员工室坐下吃':'轮休，在员工室下铺睡一会儿',mount:fixture,action:eating?'chair-sit':'lie-rest',handoff:eating,seatedMeal:eating,duration:active.choice.duration,onArrive:()=>{note(eating?'eating':'sleeping');return true;},onDone:()=>{
     if(!leaveMount(n,'returning'))return false;
     completeChoice();active.meal=false;note(eating?'meal-finished':'woke-up');return true;
    }});
   }else if(active.phase==='tea') {
    go(n,TEA,{label:'在事务室茶具旁喝口茶',action:'tea',face:TEA_TARGET,duration:active.choice.duration,onArrive:()=>{note('drinking');return true;},onDone:()=>{completeChoice();release(n);active.phase='returning';return true;}});
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
   if(n.station.id===active.reliefId){if(active.phase==='handoff'){restoreRelief();active.phase='draining';return;}if(profile(active.id).local&&active.covering)interrupt(actors.get(active.id),{coverageAborted:true});return;}
   interrupt(n);
  },
  playerRequest(id){if(active){const n=actors.get(active.id);if(active.choice?.facilityId===id||n.serviceMount?.id===id||taskOf(n)?.mount?.id===id)interrupt(n);}},
  meals:()=>active?.meal?[{workerId:active.id,eating:taskOf(actors.get(active.id))?.arrived&&active.phase==='meal'}]:[],
  snapshot:()=>({version:7,next:crew.indexOf(nextWorker()),nextId:nextWorker().station.id,clock:time,night,breakDue:{...due},dueIn:active?0:Math.max(0,due[nextWorker().station.id]-time),completed,interrupted,returning:active?['returning','reclaiming'].includes(active.phase):resumeReturn,returnInterrupted:active?active.interrupted:resumeReturn&&!!saved.returnInterrupted,decisions:decisions.snapshot()}),
  state:()=>({crew:crew.map(n=>n.station.id),nextWorkerId:nextWorker().station.id,dueIn:Math.max(0,due[nextWorker().station.id]-time),completed,interrupted,active:active?JSON.parse(JSON.stringify(active)):null,decisions:decisions.snapshot(),events:events.slice()}),
  dispose(){decisions.dispose();if(active)restoreRelief();for(const n of crew)release(n);active=null;},
 };
}
