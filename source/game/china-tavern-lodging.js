// The inn shares the existing two room rows and business till. Every payment
// boundary joins the currency ledger's single durable game-snapshot write.
const copy=x=>JSON.parse(JSON.stringify(x));
const integer=n=>Number.isSafeInteger(n)&&n>=0;
export const INN_COUNTER=[22.35,.215,6.7];
export const innMinutes=clock=>clock&&integer(clock.day)&&Number.isFinite(clock.hour)?clock.day*1440+clock.hour*60:null;
export const innTimeLabel=minutes=>`第${Math.floor(minutes/1440)+1}日 ${String(Math.floor(minutes%1440/60)).padStart(2,'0')}:${String(Math.floor(minutes%60)).padStart(2,'0')}`;
export function validPlayerStay(world){
 const s=world.playerStay,held=world.rooms.filter(r=>r.guestId==='player');
 if(s==null)return held.length===0;
 if(s.version!==1||!integer(s.serial)||!integer(s.revision))return false;
 const b=s.booking;if(!b)return held.length===0;
 const room=world.rooms.find(r=>r.id===b.roomId);
 return held.length===1&&room===held[0]&&!room.dirty&&b.id===`cn-inn-stay-${s.serial}`&&s.serial>0&&b.price===room.price&&['waiting','active'].includes(b.stage)&&Number.isFinite(b.requestedAt)&&b.requestedAt>=0&&(b.stage==='waiting'?b.endsAt==null:Number.isFinite(b.checkedInAt)&&b.checkedInAt>=b.requestedAt&&b.endsAt===b.checkedInAt+1440);
}
export function closePlayerStayWorld(world,reason='checkout'){
 const next=copy(world),s=next.playerStay,b=s?.booking;if(!b||b.stage!=='active')return null;
 const room=next.rooms.find(r=>r.id===b.roomId);room.guestId=null;room.dirty=true;
 s.booking=null;s.revision++;s.lastStay={...b,stage:reason};next.revision=(next.revision||0)+1;return next;
}
export function expiredPlayerStay(world,clock){const b=world?.playerStay?.booking,now=innMinutes(clock);return b?.stage==='active'&&now!==null&&now>=b.endsAt;}

export function createChinaTavernLodging({scene,copperLedger,getClock,getPlayer,getMounted=()=>null,canSee=()=>true,roomAvailable=()=>true,onLeaveRoom=()=>true,notify=()=>{}}){
 let pending=null,lastError=null,disposed=false,loadError=null,nextExpiryRetryAt=0,expiryError=null;
 const loaded=scene.lodgingState().playerStay?.booking,holds=copperLedger.reservations();
 if(loaded){const h=holds.find(h=>h.id===loaded.id);if(!h||h.amount!==loaded.price||h.currency!=='copper'||h.status!==(loaded.stage==='active'?'settled':'reserved'))loadError='invalid-inn-receipt';}
 if(holds.some(h=>h.id.startsWith('cn-inn-stay-')&&h.status==='reserved'&&h.id!==loaded?.id))loadError='unmatched-inn-payment';
 const state=()=>scene.snapshot(),read=()=>scene.lodgingState(),record=()=>read().playerStay||{version:1,serial:0,revision:0,booking:null};
 const fail=code=>{lastError=code;return {ok:false,code};};
 const atCounter=()=>{const p=getPlayer()?.root.position;return !!p&&!getMounted()&&Math.hypot(p.x-INN_COUNTER[0],p.z-INN_COUNTER[2])<=.9&&Math.abs(p.y-INN_COUNTER[1])<.4&&canSee({position:INN_COUNTER});};
 function available(room){return !!room&&!room.dirty&&!room.guestId&&roomAvailable(room.id);}
 function ready(revision){if(disposed||loadError||read().loadError||copperLedger.loadError)return fail('records-unavailable');if(pending)return fail('busy');if(revision!==record().revision)return fail('stale-choice');return {ok:true};}
 function money(action,next,booking){
  pending={action,next,booking};
  try{const result=action==='reserve'?copperLedger.reserve(booking.price,booking.id,'copper'):copperLedger[action](booking.id);if(!result.ok)return fail(result.code);lastError=null;return result;}
  finally{pending=null;}
 }
 function confirm(roomId,revision){
  const ok=ready(revision);if(!ok.ok)return ok;
  if(!atCounter())return fail('counter-required');if(record().booking)return fail('already-booked');
  if(!scene.canHostLodging())return fail('host-post-unavailable');
  const world=state(),room=world.rooms.find(r=>r.id===roomId),now=innMinutes(getClock());
  if(!available(room)||now===null)return fail('room-unavailable');
  const s=record(),b={id:`cn-inn-stay-${s.serial+1}`,roomId,price:room.price,stage:'waiting',requestedAt:now,checkedInAt:null,endsAt:null};
  const next=copy(world);next.playerStay={...s,serial:s.serial+1,revision:s.revision+1,booking:b};next.rooms.find(r=>r.id===roomId).guestId='player';
  const result=money('reserve',next,b);if(result.ok)notify('房费已预留，请在案前等许安登记；入住前可取消并全额退回');return result;
 }
 function checkIn(){
  const s=record(),b=s.booking;if(disposed||loadError||pending||b?.stage!=='waiting'||!atCounter()||!scene.lodgingHostReady())return false;
  const next=state(),now=innMinutes(getClock());if(now===null)return false;
  next.playerStay={...s,revision:s.revision+1,booking:{...b,stage:'active',checkedInAt:now,endsAt:now+1440}};next.till+=b.price;
  const result=money('settle',next,b);if(result.ok)notify(`许安：${next.rooms.find(r=>r.id===b.roomId).name}已记在你名下，${innTimeLabel(now+1440)}退房。房费${b.price}文已入酒楼账`);return result.ok;
 }
 function cancel(revision){
  const ok=ready(revision);if(!ok.ok)return ok;const s=record(),b=s.booking;if(b?.stage!=='waiting')return fail('already-checked-in');
  const next=state();next.playerStay={...s,revision:s.revision+1,booking:null,lastStay:{...b,stage:'cancelled'}};next.rooms.find(r=>r.id===b.roomId).guestId=null;
  const result=money('refund',next,b);if(result.ok)notify(`${b.price}文房费已全额退回，房间仍是干净空房`);return result;
 }
 function checkout(revision,expired=false){
  const ok=ready(revision);if(!ok.ok)return ok;const b=record().booking;if(b?.stage!=='active')return fail('no-active-stay');
  if(!onLeaveRoom(b.roomId))return fail('exit-blocked');
  const next=closePlayerStayWorld(state(),expired?'expired':'checkout');
  if(!scene.saveLodgingWorld(next))return fail('save-failed');lastError=null;notify(expired?'住宿已到期，客房已交回，等待服务助理打扫':'已退房，客房留下用后污渍，服务助理会接着打扫');return {ok:true};
 }
 function prepareCurrencyCommit(tx){
  const id=tx.action==='reserve'?tx.requestId:tx.reservationId;if(!id?.startsWith('cn-inn-stay-'))return null;
  if(!pending||pending.action!==tx.action||pending.booking.id!==id||pending.booking.price!==tx.amount||tx.currency!=='copper')return fail('inn-consent-required');
  return scene.prepareLodgingWorld(pending.next);
 }
 function furnitureAccess(item,{quiet=false}={}){
  if(!item?.guestRoomId?.startsWith('tavern-guest-'))return true;const world=read(),room=world.rooms.find(r=>`tavern-guest-${r.id}`===item.guestRoomId);if(!room)return true;
  const b=world.playerStay?.booking,ok=!loadError&&b?.stage==='active'&&b.roomId===room.id&&room.guestId==='player'&&!room.dirty&&!expiredPlayerStay(world,getClock());
  if(!ok&&!quiet)notify(room.dirty?'这间客房还未打扫，请等服务助理清理':room.guestId&&room.guestId!=='player'?'这间客房已有住客，请尊重对方的房间':b?.stage==='waiting'?'先到一层让许安完成入住登记':'请先到一层向许安登记客房');return !!ok;
 }
 function view(){const world=read(),s=world.playerStay||{version:1,serial:0,revision:0,booking:null};return {...s,rooms:(world?.rooms||[]).map(r=>({...r,available:available(r)})),cash:copperLedger.balances()?.copper.cash??null,atCounter:atCounter(),hostAvailable:scene.canHostLodging(),lastError,loadError:loadError||world.loadError};}
 const service={view,confirm,cancel,checkout,furnitureAccess,prepareCurrencyCommit,atCounter,hostPending:()=>record().booking?.stage==='waiting'&&atCounter(),hostRespond:checkIn,
  update(){if(disposed||loadError)return;const clock=getClock(),now=innMinutes(clock);if(now===null||now<nextExpiryRetryAt)return;const world=read();if(!expiredPlayerStay(world,clock))return;nextExpiryRetryAt=now+.7;const result=checkout(world.playerStay.revision,true);if(!result.ok&&expiryError!==result.code){expiryError=result.code;notify(result.code==='exit-blocked'?'住宿已到期，床边出口畅通后会自动起身退房':'退房记录尚未保存，房间仍保留，稍后会重试');}if(result.ok)expiryError=null;},dispose(){disposed=true;scene.setPlayerLodging(null);}};
 scene.setPlayerLodging(service);return service;
}
