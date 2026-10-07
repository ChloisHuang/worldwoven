import {SALON_ARTISTS} from './china-tavern-salon-artists.js';
import {knownAdult} from './player-age.js';

// There is no authored historic debt or ownership contract for these artists.
// Never manufacture one on migration. Ending their voluntary venue cooperation
// is free; this journal does not reserve, settle or credit any currency.
export const SALON_RELEASE_TERMS=Object.freeze({version:1,kind:'voluntary-cooperation',recordedDebt:0,exitFee:0,currency:'copper',personalOwnership:false,exclusive:false});
export const SALON_RELEASE_NOTICE='四位艺者原为自愿合作，没有已记录的身契或旧债，赎身不适用；本人可免费结束合作。独立后先休整，是否接自由委托仍由本人决定，付费不能购买亲密或同意。';
const copy=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const byId=new Map(SALON_ARTISTS.map(a=>[a.id,a]));
const stamp=at=>object(at)&&Object.keys(at).length===2&&integer(at.day)&&Number.isFinite(at.hour)&&at.hour>=0&&at.hour<24;
const time=at=>at.day*24+at.hour;
const replies=Object.freeze({
 'cn-tavern-reciter':'我愿结束原合作，先安静整理自己的诗稿。日后是否接茶叙，仍请先问我。',
 'cn-tavern-storyteller':'我愿结束原合作，先把一路见闻理清。再接游记委托时，我会自己答复。',
 'cn-tavern-songwriter':'我愿结束原合作，先歇场推敲曲词。往后的邀约，也要由我当次点头。',
 'cn-tavern-chess-poet':'我愿结束原合作，先整理自己的棋谱。往后接不接棋理委托，我自己决定。'
});
const blankArtist=id=>({actorId:id,original:copy(SALON_RELEASE_TERMS),mode:'cooperating',acceptsIndependentRequests:true,pending:null,release:null,lastReply:null});
const blank=()=>({version:1,revision:0,serial:0,artists:Object.fromEntries(SALON_ARTISTS.map(a=>[a.id,blankArtist(a.id)])),events:[]});
const validIdentity=i=>object(i)&&Object.keys(i).length===5&&byId.has(i.actorId)&&i.name===byId.get(i.actorId).name&&i.activity===byId.get(i.actorId).activity&&Number.isFinite(i.ageYears)&&i.ageYears>=18&&Number.isFinite(i.playerAgeYears)&&i.playerAgeYears>=18;
function canonicalEvent(current,event){
 const {kind,actorId,at}=event||{},artist=current.artists[actorId];
 if(!artist||!stamp(at)||current.events.length&&time(at)<time(current.events.at(-1).at))throw Error('invalid-artist-contract-event');
 const base={sequence:current.revision+1,kind,actorId,at:copy(at)},pending=artist.pending;
 if(kind==='request'){
  if(artist.mode!=='cooperating'||pending||!validIdentity(event.identity)||event.identity.actorId!==actorId)throw Error('invalid-artist-release-request');
  return {...base,requestId:`cn-artist-contract-${current.serial+1}`,identity:copy(event.identity),terms:copy(SALON_RELEASE_TERMS)};
 }
 if(['answer','revoke'].includes(kind)){
  if(!pending||pending.status!==(kind==='answer'?'pending':'accepted')||typeof event.willing!=='boolean'||kind==='revoke'&&event.willing!==false||typeof event.reply!=='string'||!event.reply.trim()||event.reply.length>300)throw Error('invalid-artist-release-response');
  return {...base,requestId:pending.id,willing:event.willing,reply:event.reply};
 }
 if(kind==='cancel'){
  if(!pending)throw Error('missing-artist-release-request');
  return {...base,requestId:pending.id};
 }
 if(kind==='release'){
  if(!pending||pending.status!=='accepted')throw Error('artist-release-not-accepted');
  return {...base,requestId:pending.id,identity:copy(pending.identity),original:copy(artist.original),consent:copy(pending.answer),fee:0,currency:'copper',payment:null,acceptsIndependentRequests:false};
 }
 if(kind==='availability'){
  if(artist.mode!=='independent'||typeof event.accepts!=='boolean'||typeof event.willing!=='boolean'||typeof event.reply!=='string'||!event.reply.trim()||event.reply.length>300)throw Error('invalid-independent-availability');
  return {...base,requestId:artist.release.requestId,accepts:event.accepts,willing:event.willing,reply:event.reply};
 }
 throw Error('invalid-artist-contract-kind');
}
function append(current,input){
 const event=canonicalEvent(current,input),next=copy(current),artist=next.artists[event.actorId];
 next.revision++;if(!integer(next.revision))throw Error('artist-contract-overflow');
 next.events.push(event);
 if(event.kind==='request'){
  next.serial++;if(!integer(next.serial))throw Error('artist-contract-overflow');
  artist.pending={id:event.requestId,identity:copy(event.identity),status:'pending',requestedAt:copy(event.at),answer:null};
 }else if(event.kind==='answer'||event.kind==='revoke'){
  artist.lastReply={requestId:event.requestId,kind:event.kind,willing:event.willing,reply:event.reply,at:copy(event.at)};
  if(event.willing){artist.pending.status='accepted';artist.pending.answer=copy(artist.lastReply);}else artist.pending=null;
 }else if(event.kind==='cancel')artist.pending=null;
 else if(event.kind==='release'){
  artist.mode='independent';artist.acceptsIndependentRequests=false;artist.pending=null;
  artist.release={requestId:event.requestId,identity:copy(event.identity),original:copy(event.original),consent:copy(event.consent),at:copy(event.at),fee:0,currency:'copper',payment:null};
 }else if(event.kind==='availability'){
  if(event.willing)artist.acceptsIndependentRequests=event.accepts;
  artist.lastReply={requestId:event.requestId,kind:event.kind,accepts:event.accepts,willing:event.willing,reply:event.reply,at:copy(event.at)};
 }
 return next;
}
function restore(saved){
 if(saved==null)return blank();
 if(!object(saved)||saved.version!==1||!Array.isArray(saved.events)||!integer(saved.revision)||!integer(saved.serial))throw Error('invalid-artist-contracts');
 let next=blank();
 for(const event of saved.events){const candidate=append(next,event);if(!same(candidate.events.at(-1),event))throw Error('invalid-artist-contract-proof');next=candidate;}
 if(!same(next,saved))throw Error('invalid-artist-contract-state');
 return next;
}
function age(person){return person?.ageYears??person?.age??person?.station?.ageYears??person?.station?.age;}

// The caller owns the actual meeting/route. It must supply the original actor
// from the production roster and a live canDiscuss check; an absent callback
// cannot fabricate an off-screen answer. No money or income provider is needed.
export function createChinaSalonContracts({saved=null,getArtist=()=>null,getPlayer=()=>null,getClock=()=>({day:0,hour:12}),getRelationship=()=>0,canDiscuss=()=>false,saveState=null}={}){
 let current=blank(),loadError=null,saving=false;
 try{current=restore(saved);}catch(error){loadError=error.message;}
 const actors=new Map(),requestActors=new Map();
 for(const profile of SALON_ARTISTS){const actor=getArtist(profile.id);if(actor)actors.set(profile.id,actor);}
 const fail=code=>({ok:false,code});
 const result=(actorId,extra={})=>({ok:true,...extra,view:view(actorId)});
 function actorFor(id){
  const actor=getArtist(id),profile=byId.get(id);
  if(!profile||!actor||actor!==actors.get(id)||actor.station?.id!==id||actor.station.npcName!==profile.name||!actor.station.salon?.activities?.includes(profile.activity)||actor.alive===false||!knownAdult(actor))return null;
  return actor;
 }
 function available(id,expectedRevision){
  if(loadError||saving)return fail(loadError||'artist-contract-busy');
  if(expectedRevision!==undefined&&expectedRevision!==current.revision)return fail('stale-artist-contract');
  const artist=actorFor(id),player=getPlayer();
  if(!artist||!knownAdult(player)||player.alive===false)return fail('artist-release-adult-identity');
  if(current.artists[id].pending&&requestActors.has(id)&&requestActors.get(id)!==artist)return fail('artist-release-identity-changed');
  if(canDiscuss(artist)!==true)return fail('artist-release-meeting-unavailable');
  return {ok:true,artist,player};
 }
 function at(){const clock=getClock();return {day:clock?.day,hour:clock?.hour};}
 function persist(input){
  if(loadError||saving)return fail(loadError||'artist-contract-busy');
  if(typeof saveState!=='function')return fail('persistence-unavailable');
  let next;try{next=append(current,{...input,at:at()});}catch(error){return fail(error.message);}
  saving=true;
  try{
   const saved=saveState(copy(next));
   if(saved?.then){Promise.resolve(saved).catch(()=>{});return fail('async-save-unsupported');}
   if(saved===false||saved?.ok===false)return fail('save-failed');
   current=next;return result(input.actorId);
  }catch{return fail('save-failed');}finally{saving=false;}
 }
 function decision(id,artist,{availability=false,accepts=false}={}){
  const relation=Number(getRelationship(id,'player'));
  if(artist.station.salon.willing===false&&(!availability||accepts))return {willing:false,reply:availability?'我现在想歇一会儿，暂不接自由委托。':'今天我不想谈这项安排，请尊重我的决定。'};
  if(!Number.isFinite(relation)||relation<-.4)return {willing:false,reply:'这件事我想自己再考虑，现在不委托你替我安排。'};
  return {willing:true,reply:availability?(accepts?'我愿恢复接受自由委托；每一单仍会另行答复。':'我想先暂停接单，歇场整理自己的作品。'):replies[id]};
 }
 function view(id){
  if(!byId.has(id))return null;
  const artist=current.artists[id];
  return {...copy(artist),name:byId.get(id).name,status:artist.pending?.status||artist.mode,fee:0,currency:'copper',notice:SALON_RELEASE_NOTICE,revision:current.revision,canInvite:!loadError&&(artist.mode!=='independent'||artist.acceptsIndependentRequests),loadError};
 }
 function requestRelease(id,expectedRevision){
  const check=available(id,expectedRevision);if(!check.ok)return check;
  const artist=current.artists[id];
  if(artist.mode==='independent')return result(id,{replayed:true});
  if(artist.pending)return result(id,{replayed:true});
  const identity={actorId:id,name:byId.get(id).name,activity:byId.get(id).activity,ageYears:age(check.artist),playerAgeYears:age(check.player)};
  const response=persist({kind:'request',actorId:id,identity});if(response.ok)requestActors.set(id,check.artist);return response;
 }
 function respondRelease(id,expectedRevision){
  const check=available(id,expectedRevision);if(!check.ok)return check;
  const pending=current.artists[id].pending;if(!pending)return fail('missing-artist-release-request');
  if(pending.status==='accepted')return result(id,{replayed:true,willing:true,reply:pending.answer.reply});
  const answer=decision(id,check.artist),response=persist({kind:'answer',actorId:id,...answer});
  return response.ok?{...response,...answer}:response;
 }
 function confirmRelease(id,expectedRevision){
  const check=available(id,expectedRevision);if(!check.ok)return check;
  const artist=current.artists[id];if(artist.mode==='independent')return result(id,{replayed:true});
  if(artist.pending?.status!=='accepted')return fail('artist-release-not-accepted');
  const answer=decision(id,check.artist);
  if(!answer.willing){const response=persist({kind:'revoke',actorId:id,...answer});return response.ok?{...response,...answer,released:false}:response;}
  const response=persist({kind:'release',actorId:id});return response.ok?{...response,released:true,willing:true}:response;
 }
 function cancelRelease(id,expectedRevision){
  if(loadError||saving)return fail(loadError||'artist-contract-busy');
  if(expectedRevision!==undefined&&expectedRevision!==current.revision)return fail('stale-artist-contract');
  if(!byId.has(id))return fail('unknown-salon-artist');
  if(!current.artists[id].pending)return result(id,{replayed:true});
  return persist({kind:'cancel',actorId:id});
 }
 function setIndependentAvailability(id,accepts,expectedRevision){
  const check=available(id,expectedRevision);if(!check.ok)return check;
  const artist=current.artists[id];
  if(artist.mode!=='independent'||typeof accepts!=='boolean')return fail('not-independent-artist');
  if(artist.acceptsIndependentRequests===accepts)return result(id,{replayed:true,willing:true});
  const answer=decision(id,check.artist,{availability:true,accepts});
  const response=persist({kind:'availability',actorId:id,accepts,...answer});return response.ok?{...response,...answer}:response;
 }
 return {
  get loadError(){return loadError;},view,requestRelease,respondRelease,confirmRelease,cancelRelease,setIndependentAvailability,
  requestAvailability:(id,status,revision)=>['paused','available'].includes(status)?setIndependentAvailability(id,status==='available',revision):fail('invalid-independent-availability'),
  canInvite:id=>!!byId.has(id)&&!loadError&&!!actorFor(id)&&(current.artists[id].mode!=='independent'||current.artists[id].acceptsIndependentRequests),
  snapshot:()=>copy(loadError?saved:current),
  summary:()=>({released:loadError?null:Object.values(current.artists).filter(a=>a.mode==='independent').length,feesPaid:0,currency:'copper',payments:[],loadError})
 };
}
