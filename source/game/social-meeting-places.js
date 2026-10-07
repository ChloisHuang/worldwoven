import {followActorRoute} from './actor-navigation.js';

// ST01: a finite inventory of existing meeting fixtures, not new rooms or beds.
// Entitlement is deliberately separate from invitation/attraction/payment.
export const SOCIAL_MEETING_MATRIX=Object.freeze({
 china:{public:'正殿木扶椅旁',private:'仅已有客房或私室；双方现时使用权、空房和通路均须核实'},
 france:{public:'宫苑铸铁木条长椅旁',private:'现有王室寝床未建立双方私室使用权'},
 japan:{public:'一层迎宾或庭园木长椅旁',private:'现有客室与员工室未建立双方私室使用权'},
 egypt:{public:'王室餐厅坐凳旁',private:'现有王室寝床未建立双方私室使用权'}
});
const point=a=>({x:a[0],y:a[1],z:a[2]});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const near=(a,b)=>distance(a,b)<.09&&Math.abs(a.y-b.y)<.3;
const idOf=a=>a.actorId||a.station?.id||a.id;
const validPoint=a=>Array.isArray(a)&&a.length===3&&a.every(Number.isFinite);
const publicFixture=(country,item)=>item.kind==='seat'&&!item.privateRoomId&&!item.guestRoomId&&(
 country==='china'&&item.name==='正殿木扶椅'||
 country==='france'&&item.id.startsWith('france-garden-bench-')||
 country==='japan'&&['迎宾木长椅','庭园木长椅'].includes(item.name)||
 country==='egypt'&&['王室餐厅坐凳','王室餐厅东侧坐凳'].includes(item.name));
function contains(room,p){
 const bounds=room.bounds||room,b=Array.isArray(bounds)?bounds:[bounds.minX,bounds.maxX,bounds.minZ,bounds.maxZ],y=room.floorY??(Number.isFinite(room.floor)?(room.floor-1)*3.8:0);
 return b.every(Number.isFinite)&&p.x>=b[0]&&p.x<=b[1]&&p.z>=b[2]&&p.z<=b[3]&&Math.abs(p.y-y)<.65;
}
export function createSocialMeetingPlaces({country,lot,furniture,getActors=()=>[],getActor=id=>getActors().find(a=>idOf(a)===id),planPath,canEnterPrivateRoom=()=>false,roomAvailable=()=>false}){
 const held=new Map();
 function inventory(){
  const list=[];
  for(const item of furniture.items||[]){
   const isPublic=publicFixture(country,item),roomId=item.privateRoomId||item.guestRoomId;
   if(!isPublic&&!(country==='china'&&item.kind==='bed'&&roomId))continue;
   if(!validPoint(item.position))continue;
   const room=roomId?(lot.interiorRooms||[]).find(r=>r.id===roomId):null;
   if(!isPublic&&!room)continue;
   // Stand on the existing approach aisle, never a mattress or an invented bed.
   const p=item.position,yaw=item.yaw||0,dx=Math.cos(yaw)*.9,dz=-Math.sin(yaw)*.9;
   for(const side of [1,-1]){
    const points=[p.slice(),[p[0]+dx*side,p[1],p[2]+dz*side]];
    if(room&&!points.every(q=>contains(room,point(q))))continue;
    list.push({id:`social:${item.id}:${side}`,name:item.name,fixtureId:item.id,roomId:roomId||null,private:!isPublic,points});
   }
  }
  return list;
 }
 function validate(place,ids,{routes=false}={}){
  if(!Array.isArray(ids)||ids.length!==2||ids[0]===ids[1])return {ok:false,reason:'invalid-pair'};
  const actual=inventory().find(p=>p.id===place?.id);
  if(!actual||JSON.stringify(actual)!==JSON.stringify(place))return {ok:false,reason:'place-changed'};
  const owner=held.get(place.fixtureId);
  if(owner&&owner.join('|')!==ids.join('|'))return {ok:false,reason:'place-reserved'};
  const f=furniture.facilities?.state().find(f=>f.id===place.fixtureId);
  if(f?.player||f?.reservations.some(r=>!owner||!ids.includes(r.actor)))return {ok:false,reason:'place-occupied'};
  if(owner&&(!f?.reservations.some(r=>r.actor===ids[0])||place.private&&f.capacity>1&&!f.reservations.some(r=>r.actor===ids[1])))return {ok:false,reason:'claim-lost'};
  const room=place.private?(lot.interiorRooms||[]).find(r=>r.id===place.roomId):null;
  if(place.private){
   const roomFixtures=new Set((furniture.items||[]).filter(item=>(item.privateRoomId||item.guestRoomId)===place.roomId).map(item=>item.id));
   if(furniture.facilities.state().some(f=>roomFixtures.has(f.id)&&(f.player||f.reservations.some(r=>f.id!==place.fixtureId||!owner||!ids.includes(r.actor)))))return {ok:false,reason:'room-occupied'};
   if(!ids.every(id=>canEnterPrivateRoom(id,place.roomId,place,ids)===true))return {ok:false,reason:'private-entitlement-required'};
   if(roomAvailable(place.roomId,ids,place)!==true)return {ok:false,reason:'room-unavailable'};
   if(getActors().some(a=>!ids.includes(idOf(a))&&(a.root?.visible!==false||a.socialPrivateFade===true)&&a.root?.position&&contains(room,a.root.position)))return {ok:false,reason:'room-occupied'};
  }
  for(let i=0;i<2;i++){
   const actor=getActor(ids[i]),to=point(place.points[i]);
   if(!actor?.root?.position||actor.root.visible===false&&actor.socialPrivateFade!==true)return {ok:false,reason:'actor-unavailable'};
   if(getActors().some(a=>!ids.includes(idOf(a))&&(a.root?.visible!==false||a.socialPrivateFade===true)&&a.root?.position&&Math.abs(a.root.position.y-to.y)<.65&&distance(a.root.position,to)<.62))return {ok:false,reason:'approach-occupied'};
   if(routes&&!near(actor.root.position,to)){
    const route=planPath?.(actor.root.position,to,.34);
    if(!route?.length||!near({...route.at(-1),y:route.at(-1).y??actor.root.position.y},to))return {ok:false,reason:'unreachable'};
   }
  }
  return {ok:true,place};
 }
 function resolve(ids,{private:wantPrivate=false}={}){
  const candidates=inventory().filter(p=>p.private===wantPrivate);
  candidates.sort((a,b)=>a.points.reduce((sum,p,i)=>sum+distance(getActor(ids[i])?.root?.position||point(p),point(p)),0)-b.points.reduce((sum,p,i)=>sum+distance(getActor(ids[i])?.root?.position||point(p),point(p)),0));
  let reason=wantPrivate?'no-entitled-private-place':'no-public-meeting-place';
  for(const place of candidates){const result=validate(place,ids,{routes:true});if(result.ok)return result;reason=result.reason;}
  return {ok:false,reason,detail:SOCIAL_MEETING_MATRIX[country]?.[wantPrivate?'private':'public']||'当前地区没有已核实会面地点'};
 }
 function release(place,ids){
  if(!place||held.get(place.fixtureId)?.join('|')!==ids.join('|'))return;
  for(const id of ids)furniture.facilities.release(place.fixtureId,id);
  held.delete(place.fixtureId);
 }
 function claim(place,ids){
  const checked=validate(place,ids,{routes:true});if(!checked.ok)return checked;
  if(!furniture.facilities?.reserve(place.fixtureId,ids[0],{purpose:'social-meeting'})){furniture.facilities?.release(place.fixtureId,ids[0]);return {ok:false,reason:'place-reserved'};}
  held.set(place.fixtureId,ids.slice());
  // Claim every berth in a private room's bed, not just one sleeping slot.
  const f=furniture.facilities.state().find(f=>f.id===place.fixtureId);
  if(place.private&&f?.capacity>1&&!furniture.facilities.reserve(place.fixtureId,ids[1],{purpose:'social-meeting'})){release(place,ids);return {ok:false,reason:'place-reserved'};}
  return {ok:true,place};
 }
 return {resolve,validate,claim,release,matrix:()=>SOCIAL_MEETING_MATRIX[country]||null};
}

// Parent retains ledger timing, poses/fade and routine pause ownership. This
// runner only moves the real pair, holds the place, and checks every live frame.
// No route/claim is restored from a save; an interrupted event must be cancelled.
export function createSocialMeetingJourney({places,getActor,planPath,moveActor,doors,getActors=()=>[],isAdult=()=>false,isWilling=()=>false,isAvailable=()=>false}){
 let current=null;
 const state=()=>current?{ok:current.phase!=='cancelled',phase:current.phase,reason:current.reason||null,place:current.place,ids:current.ids.slice()}:null;
 function cancel(reason='cancelled'){
  if(!current)return null;
  places.release(current.place,current.ids);
  for(const id of current.ids){const actor=getActor(id);if(actor)actor.walking=false;}
  current.routes=[];current.phase='cancelled';current.reason=reason;return state();
 }
 function gates(ids,place){
  for(const id of ids){if(isAdult(id)!==true)return 'adulthood-required';if(isWilling(id,ids,place)!==true)return 'withdrawn';if(isAvailable(id,ids,place)!==true)return 'interrupted';}
  return null;
 }
 function start(ids,options={}){
  if(current&&current.phase!=='cancelled')return {ok:false,reason:'meeting-active'};
  const resolved=options.place?places.validate(options.place,ids,{routes:true}):places.resolve(ids,options);
  if(!resolved.ok)return resolved;
  const reason=gates(ids,resolved.place);if(reason)return {ok:false,reason};
  const claimed=places.claim(resolved.place,ids);if(!claimed.ok)return claimed;
  current={ids:ids.slice(),place:resolved.place,phase:'approaching',routes:[],elapsed:0};
  current.routes=ids.map((id,i)=>{const actor=getActor(id),to=point(current.place.points[i]);return near(actor.root.position,to)?[]:planPath(actor.root.position,to,.34);});
  return state();
 }
 function update(dt){
  if(!current||current.phase==='cancelled')return state();
  const reason=gates(current.ids,current.place),valid=places.validate(current.place,current.ids);
  if(reason||!valid.ok)return cancel(reason||valid.reason);
  const delta=Number.isFinite(dt)?Math.max(0,dt):0;
  if(current.phase==='arrived'){
   if(!current.ids.every((id,i)=>near(getActor(id).root.position,point(current.place.points[i]))))return cancel('left-place');
   return state();
  }
  current.elapsed+=delta;
  if(current.elapsed>90)return cancel('route-timeout');
  for(let i=0;i<2;i++){
   const actor=getActor(current.ids[i]),to=point(current.place.points[i]);
   if(near(actor.root.position,to)){actor.walking=false;continue;}
   if(!current.routes[i]?.length)return cancel('route-blocked');
   followActorRoute(actor,delta,{route:current.routes[i],doors,moveActor,npcs:getActors(),radius:.34,arrivalTolerance:.045,speedScale:.82});
  }
  if(current.ids.every((id,i)=>near(getActor(id).root.position,point(current.place.points[i])))){
   current.phase='arrived';
   for(let i=0;i<2;i++){const actor=getActor(current.ids[i]),other=getActor(current.ids[1-i]);actor.walking=false;if(actor.root.rotation)actor.root.rotation.y=Math.atan2(other.root.position.x-actor.root.position.x,other.root.position.z-actor.root.position.z);}
  }
  return state();
 }
 return {start,update,state,cancel,finish(){const result=cancel('completed');current=null;return result;},dispose(){cancel('region-unloaded');current=null;}};
}
