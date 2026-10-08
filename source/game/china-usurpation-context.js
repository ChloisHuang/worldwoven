import {RESERVED_CONSORT_QUARTERS as QUARTERS} from './china-consort-quarters.js';
import {validRoyalKitchenServiceReceipt} from './china-royal-kitchen-role.js';

// These are sources of acquaintance in the existing scene, not factions whose
// members automatically share allegiance. Every political answer is separate.
export const USURPATION_COURT_IDS = Object.freeze(['cn-minister-works','cn-minister-granary','cn-official-rites','cn-official-personnel','cn-official-justice','cn-official-records']);
const innerIds = new Set(['cn-consort-yue','cn-consort-heng','cn-consort-ling','cn-palace-herald','cn-calligraphy','cn-cooking']);
const idOf = actor => actor?.actorId || actor?.station?.id || null;
export const usurpationBodyId = actor => actor?.bodyId || actor?.root?.userData?.bodyId || idOf(actor);
const ageOf = actor => actor?.ageYears ?? actor?.station?.ageYears;
const livingAdult = actor => !!actor?.root && actor.alive !== false && Number.isFinite(ageOf(actor)) && ageOf(actor) >= 18;
const bounded = value => Number.isFinite(value) ? Math.max(-1,Math.min(1,value)) : 0;
const count = values => Math.min(6,new Set(values.filter(value => typeof value === 'string' && value)).size);

/** Reads only authenticated current controllers. Legacy aggregate performance,
 * wealth and a character's clothes cannot manufacture support or experience. */
export function readChinaUsurpationContext({scene, relationships, getProfile = () => ({}), careers,
 guardWork, authority = {holderId:'cn-emperor',revision:0}, exposure = 0, safety = {}} = {}) {
 const people = scene?.country === 'china' ? scene.npcs || [] : [];
 const player = scene?.player, emperor = people.find(actor => idOf(actor) === 'cn-emperor');
 const guard = scene?.archery?.guardBinding?.(), commander = scene?.archery?.wardenBinding?.();
 const guards = [guard,commander].filter(row => row?.available && people.some(actor => idOf(actor) === row.actorId && livingAdult(actor)))
  .map(row => {const actor=people.find(person=>idOf(person)===row.actorId);return {id:row.actorId,bodyId:usurpationBodyId(actor)};});
 const guardIds = new Set(guards.map(row=>row.id)), seen = new Set(), supporters=[];
 for (const actor of people) {
  const id=idOf(actor);if(!id || id==='player' || id==='cn-emperor' || seen.has(id) || !livingAdult(actor))continue;
  seen.add(id);const profile=getProfile(id)||{},stance=relationships?.stanceFor?.(id,'player',profile);
  if(stance?.active!==true || stance.observerId!==id || !stance.eventId)continue;
  const pair=relationships?.pair?.(id,'player')||{},official=USURPATION_COURT_IDS.includes(id);
  supporters.push({id,bodyId:usurpationBodyId(actor),name:actor.station?.npcName||id,ageYears:ageOf(actor),alive:true,
   eligible:true,supportsGeneral:true,roleId:actor.station?.id||id,
   circleId:official?'court':guardIds.has(id)?'guard':innerIds.has(id)?'inner':'town',official,
   guardCommander:id===commander?.actorId&&commander.available===true,
   relationship:bounded(profile.relations?.player??pair.relation),trust:bounded((profile.trust?.player??pair.trust??0)+(profile.interactions?.player?.trust||0)),
   informedOpinion:bounded(relationships?.knownReputation?.(id,'player'))});
 }
 const career=careers?.loadError?null:careers;
 const kitchen=(career?.workExperience?.royalKitchen?.receipts||[]).filter(validRoyalKitchenServiceReceipt);
 const officialServices=(career?.officialCareer?.service||[]).filter(row=>row.positive===true&&row.score>0);
 const actualGuardPoints=guardWork?.job?.checkpoints||[];
 const bed=scene?.furniture?.items?.find(item=>item.id===QUARTERS.bedId&&item.kind==='bed'&&item.privateRoomId===QUARTERS.roomId);
 const room=scene?.lot?.interiorRooms?.find(item=>item.id===QUARTERS.roomId);
 const door=scene?.lot?.doorways?.find(item=>item.id===QUARTERS.doorId);
 const permitted=item=>!!item&&(item.privateOwnerId==null||item.privateOwnerId==='player');
 let playerResidence=permitted(room)&&permitted(bed)&&door?.rooms?.includes(QUARTERS.roomId)&&door.rooms.includes('residence-suite-corridor')
  ? {roomId:room.id,bedId:bed.id}:null;
 // A valid existing paid stay is a fallback, never a free room or a new lease.
 if(!playerResidence&&scene?.lodging?.furnitureAccess){
  const legal=scene.furniture?.items?.find(item=>item.kind==='bed'&&item.guestRoomId?.startsWith('tavern-guest-')&&scene.lodging.furnitureAccess(item,{quiet:true})===true);
  if(legal)playerResidence={roomId:legal.guestRoomId,bedId:legal.id};
 }
 const formerBed=scene?.furniture?.items?.find(item=>item.kind==='bed'&&item.privateRoomId==='bedroom');
 return {player:{id:'player',bodyId:usurpationBodyId(player),ageYears:ageOf(player),alive:livingAdult(player)},
  emperor:{id:'cn-emperor',bodyId:usurpationBodyId(emperor),alive:livingAdult(emperor),tenureRevision:authority.revision},supporters,
  guard:{commanderId:commander?.available?commander.actorId:null,guards},
  experience:{intrigue:count(kitchen.map(row=>row.orderId)),guard:count(actualGuardPoints.map(row=>`${row.circuit}:${row.routeId}:${row.index}:${row.id}`)),abdication:count(officialServices.map(row=>row.id))},
  exposure:Number.isFinite(exposure)?Math.max(0,Math.min(1,exposure)):0,safety,
  residences:{player:playerResidence,formerEmperor:formerBed?{roomId:'bedroom',bedId:formerBed.id}:null}};
}

/** Projection follows a committed office. It never changes a lease, a former
 * partner's title, another person's room, or the emperor's original chamber. */
export function projectUsurpationResidence(office,scene) {
 const residence=office?.residence;
 if(office?.actorId!=='player'||scene?.country!=='china'||residence?.roomId!==QUARTERS.roomId||residence?.bedId!==QUARTERS.bedId)return false;
 const room=scene.lot?.interiorRooms?.find(item=>item.id===residence.roomId),bed=scene.furniture?.items?.find(item=>item.id===residence.bedId&&item.privateRoomId===residence.roomId);
 if(!room||!bed||[room,bed].some(item=>item.privateOwnerId!=null&&item.privateOwnerId!=='player'))return false;
 room.privateOwnerId=bed.privateOwnerId='player';bed.name='南间卧榻 · 你的寝居';bed.worldLabel='南间卧榻 · 你的寝居';return true;
}
