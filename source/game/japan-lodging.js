import {JAPAN_GUEST_BED} from './japan-bedding.js';
import {JAPAN_SERVICE_POINTS as P,japanReceptionReady} from './japan-service-orders.js';
export const JAPAN_STAY_PRICE=12;
export const JAPAN_STAY_COUNTER=P.playerReception;
const copy=x=>JSON.parse(JSON.stringify(x)),integer=n=>Number.isSafeInteger(n)&&n>=0;
const live=b=>['reserved','active'].includes(b.stage);
const minutes=c=>c&&integer(c.day)&&Number.isFinite(c.hour)&&c.hour>=0&&c.hour<24?c.day*1440+c.hour*60:null;
export const japanStayTime=m=>`第${Math.floor(m/1440)+1}日 ${String(Math.floor(m%1440/60)).padStart(2,'0')}:${String(Math.floor(m%60)).padStart(2,'0')}`;
// The one authored guest room is sold once. The original currency journal and
// lodging record commit together; no other worker, wallet or stock is invented.
export function createJapanLodging({saved=null,copperLedger,getClock,getPlayer,getMounted=()=>null,getHost=()=>null,roomReady=()=>false,onLeaveBed=()=>true,saveState=()=>false,notify=()=>{}}){
 let data={version:1,nextId:1,revision:0,revenue:0,bookings:[]},loadError=null,lastError=null,pending=null,locked=false,disposed=false,nextExpiry=0;
 const holds=()=>copperLedger.reservations();
 function valid(s){
  if(!s||s.version!==1||!integer(s.nextId)||s.nextId<1||!integer(s.revision)||!integer(s.revenue)||!Array.isArray(s.bookings)||s.bookings.length!==s.nextId-1||s.bookings.filter(live).length>1)return false;
  let revenue=0;
  for(let i=0;i<s.bookings.length;i++){
   const b=s.bookings[i];if(!b||b.id!==`jp-room-stay-${i+1}`||b.roomId!==JAPAN_GUEST_BED||b.price!==JAPAN_STAY_PRICE||!['reserved','active','cancelled','checkout','expired'].includes(b.stage)||!Number.isFinite(b.requestedAt)||b.requestedAt<0)return false;
   if(['reserved','cancelled'].includes(b.stage)){if(b.checkedInAt!==null||b.endsAt!==null||b.hostId!==null)return false;}
   else{if(!Number.isFinite(b.checkedInAt)||b.checkedInAt<b.requestedAt||b.endsAt!==b.checkedInAt+1440||!['jp-welcome','jp-market-tea'].includes(b.hostId))return false;revenue+=b.price;}
   if(['checkout','expired','cancelled'].includes(b.stage)&&(!Number.isFinite(b.closedAt)||b.closedAt<(b.checkedInAt??b.requestedAt)))return false;
  }
  return s.revenue===revenue;
 }
 if(saved!=null){if(valid(saved))data=copy(saved);else loadError='invalid-lodging-record';}
 if(!loadError){const all=holds();for(const b of data.bookings){const h=all.find(h=>h.id===b.id);if(!h||h.currency!=='japan'||h.amount!==b.price||h.status!==({reserved:'reserved',cancelled:'refunded'}[b.stage]||'settled'))loadError='invalid-lodging-payment';}if(all.some(h=>h.id.startsWith('jp-room-stay-')&&!data.bookings.some(b=>b.id===h.id)))loadError='unmatched-lodging-payment';}
 const booking=()=>data.bookings.find(live)||null;
 const atCounter=()=>!getMounted()&&japanReceptionReady(getPlayer()?.root.position);
 const inRoom=()=>{const p=getPlayer()?.root.position;return !!p&&Math.abs(p.y-7.6)<.5&&p.x>=-3&&p.x<=5.8&&p.z>=-15&&p.z<=-8;};
 const fail=code=>{lastError=code;return {ok:false,code};};
 const ready=revision=>disposed||loadError||copperLedger.loadError?fail('records-unavailable'):pending||locked?fail('busy'):revision!==data.revision?fail('stale-choice'):{ok:true};
 function save(next){if(locked||pending)return fail('busy');locked=true;try{const r=saveState(copy(next));if(r===false||r?.ok===false||r?.then){if(r?.then)Promise.resolve(r).catch(()=>{});return fail('save-failed');}data=next;lastError=null;return {ok:true};}catch{return fail('save-failed');}finally{locked=false;}}
 function money(action,next,b){
  const change={action,next,b,before:data};pending=change;
  try{const r=action==='reserve'?copperLedger.reserve(b.price,b.id,'japan'):copperLedger[action](b.id);if(!r.ok)return fail(r.code);if(data!==next)return fail('lodging-participant-missing');lastError=null;return {ok:true};}finally{pending=null;}
 }
 function prepareCurrencyCommit(tx){
  const id=tx.action==='reserve'?tx.requestId:tx.reservationId;if(!id?.startsWith('jp-room-stay-'))return null;
  const p=pending;if(!p||p.action!==tx.action||p.b.id!==id||p.b.price!==tx.amount||tx.currency!=='japan')return {ok:false,code:'lodging-consent-required'};
  const unchanged=()=>!disposed&&!locked&&pending===p&&data===p.before;
  return {patch:{japanLodging:copy(p.next)},valid:unchanged,lock(){if(!unchanged())return false;locked=true;return true;},release(){locked=false;},committed(){if(!locked||data!==p.before)return false;data=p.next;return true;}};
 }
 function checkIn(revision){
  const ok=ready(revision);if(!ok.ok)return ok;
  if(!atCounter())return fail('counter-required');const host=getHost();if(!host)return fail('host-unavailable');
  let b=booking();if(b?.stage==='active')return fail('already-booked');
  if(!roomReady())return fail('room-unavailable');const now=minutes(getClock());if(now===null)return fail('clock-unavailable');
  if(!b){
   if(data.nextId>=Number.MAX_SAFE_INTEGER)return fail('records-unavailable');
   b={id:`jp-room-stay-${data.nextId}`,roomId:JAPAN_GUEST_BED,price:JAPAN_STAY_PRICE,stage:'reserved',requestedAt:now,checkedInAt:null,endsAt:null,hostId:null};
   const next=copy(data);next.nextId++;next.revision++;next.bookings.push(b);const reserved=money('reserve',next,b);if(!reserved.ok)return reserved;b=booking();
  }
  const next=copy(data),row=next.bookings.find(x=>x.id===b.id);Object.assign(row,{stage:'active',checkedInAt:now,endsAt:now+1440,hostId:host.id});next.revision++;next.revenue+=b.price;
  const result=money('settle',next,b);if(result.ok)notify(`${host.name}已登记三层唯一客房：12日本券，${japanStayTime(row.endsAt)}到期。`);return result;
 }
 function cancel(revision){
  const ok=ready(revision);if(!ok.ok)return ok;const b=booking();if(b?.stage!=='reserved')return fail('no-reservation');const now=minutes(getClock());if(now===null)return fail('clock-unavailable');
  const next=copy(data);Object.assign(next.bookings.find(x=>x.id===b.id),{stage:'cancelled',closedAt:now});next.revision++;
  const result=money('refund',next,b);if(result.ok)notify('入住登记尚未完成，12日本券已全额退回。');return result;
 }
 function checkout(revision,expired=false){
  const ok=ready(revision);if(!ok.ok)return ok;const b=booking();if(b?.stage!=='active')return fail('no-active-stay');const now=minutes(getClock());if(now===null)return fail('clock-unavailable');
  if(!onLeaveBed())return fail('exit-blocked');
  const next=copy(data);Object.assign(next.bookings.find(x=>x.id===b.id),{stage:expired?'expired':'checkout',closedAt:now});next.revision++;
  const result=save(next);if(result.ok)notify(`${expired?'住宿已到期':'已退房'}，房费不退。用过的被面由Yuki洗护、Nao换回，干净后才再接住客。`);return result;
 }
 function furnitureAccess(item,{quiet=false,restoring=false}={}){
  if((item?.bedId||item?.id)!==JAPAN_GUEST_BED)return true;
  const b=booking(),now=minutes(getClock()),ok=!loadError&&(restoring&&(b?.stage==='active'||saved==null)||b?.stage==='active'&&now!==null&&now<b.endsAt);
  if(!ok&&!quiet)notify(b?.stage==='reserved'?'入住尚未登记完成，请回一层继续办理或全额退款。':'这是付费客房，请到一层原接待柜台办理住宿。');return !!ok;
 }
 return {checkIn,cancel,checkout,prepareCurrencyCommit,furnitureAccess,atCounter,inRoom,
  view(){const b=booking();return {revision:data.revision,booking:copy(b),lastStay:copy(data.bookings.at(-1)||null),revenue:data.revenue,atCounter:atCounter(),inRoom:inRoom(),host:getHost(),roomReady:roomReady(),cash:copperLedger.balances()?.japan?.cash??null,loadError:loadError||copperLedger.loadError,lastError};},
  update(){if(disposed||loadError)return;const b=booking(),now=minutes(getClock());if(b?.stage==='active'&&now!==null&&now>=b.endsAt&&now>=nextExpiry){nextExpiry=now+.7;const prior=lastError,r=checkout(data.revision,true);if(!r.ok&&prior!==r.code)notify(r.code==='exit-blocked'?'住宿到期，床边出口畅通后会安全起身退房。':'退房记录暂未保存，原房与收据保留，稍后重试。');}},
  dispose(){disposed=true;}
 };
}
