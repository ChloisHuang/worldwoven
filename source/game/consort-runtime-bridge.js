import {createConsortPetitionLedger,CONSORT_SEAT_ID} from './consort-petition-ledger.js';
import {createEmpressTitleLedger} from './empress-title-ledger.js';
import {CHINA_CONSORTS} from './china-palace-residents.js';

export const CONSORT_LEDGER_KEY='consortPetitions';
export const EMPRESS_LEDGER_KEY='empressTitles';
export const CONSORT_SERVICE_KEY='chinaConsortCourt';
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const adult=n=>Number.isFinite(n)&&n>=18;
const read=fn=>{try{return typeof fn==='function'?fn():null;}catch{return null;}};
const restoreRoot=(target,before)=>{for(const key of Object.keys(target))if(!Object.hasOwn(before,key))delete target[key];Object.assign(target,before);};
const durable=state=>{const {loadError,lastError,...data}=state;return data;};

/**
 * quarters is the existing RESERVED_CONSORT_QUARTERS export, passed by main.
 * captureWorld(target) may fill the detached candidate root; the current main's
 * zero-argument worldSnapshotWriter is also supported because it only replaces
 * root fields. Its temporary root writes are restored before writeWorld runs.
 * writeWorld(next) must synchronously persist one whole world JSON atomically.
 * The original saved root retains its identity and changes only after success.
 */
export function createConsortRuntimeBridge({saved,quarters,getScene,getPlayerProfile,getAppearanceScore,getAppearancePreference,getPlayerTraits,getNPCProfile,getConversationCount,getCareers,getClock,getService,
  captureWorld,writeWorld,canReleaseTitle,worldSeed=saved?.appearance?.seed??1}={}){
  if(!object(saved)||!object(quarters)||!quarters.roomId||!quarters.bedId||!quarters.doorId||typeof writeWorld!=='function'||typeof getClock!=='function')throw new TypeError('consort bridge needs saved root, authored quarters, clock and atomic world writer');
  let ledger=null,empressLedger=null,committing=false,lastEmperorAge=null;
  const scene=()=>read(getScene)||{};
  const state=()=>ledger?.state()||null;
  const profile=()=>read(getPlayerProfile)||saved.playerProfile||{};
  function emperor(){
    const s=scene(),actor=s.country==='china'?s.npcs?.find(n=>n.station?.id==='cn-emperor'):null;
    if(actor){lastEmperorAge=actor.station.ageYears;return {id:'cn-emperor',ageYears:actor.station.ageYears};}
    // Away from China, the last witnessed adult identity keeps its title. It
    // supplies no scene, audience, room access or food entitlement remotely.
    const recorded=ledger?.witnessedEmperorAge();
    return {id:'cn-emperor',ageYears:s.country==='china'?undefined:lastEmperorAge??recorded};
  }
  const player=()=>({id:'player',ageYears:profile().ageYears});
  function reviewContext(){return {appearancePreference:read(()=>getAppearancePreference?.('cn-emperor','player')),player:{appearanceScore:read(getAppearanceScore),traits:read(getPlayerTraits)||profile().traits||saved.japanPerformance?.life?.people?.player?.traits},emperor:read(()=>getNPCProfile?.('cn-emperor'))||read(()=>scene().palace?.state())?.decisions?.people?.['cn-emperor']||{}};}
  function court(){
    const a=ledger?.appointment();
    return {emperorId:'cn-emperor',empressId:empressLedger?.appointment()?.actorId||null,consorts:[...CHINA_CONSORTS.map(c=>({actorId:c.id,roomId:c.privateRoomId,bedId:c.privateBedId})),...(a?[{actorId:a.actorId,roomId:a.residence.roomId,bedId:a.residence.bedId}]:[])]};
  }
  function physical(){
    const s=scene();if(s.country!=='china')return {scene:s,room:null,bed:null,door:null,accessible:false};
    const room=s.lot?.interiorRooms?.find(r=>r.id===quarters.roomId),bed=s.furniture?.items?.find(b=>b.id===quarters.bedId&&b.kind==='bed'&&b.privateRoomId===quarters.roomId),door=s.lot?.doorways?.find(d=>d.id===quarters.doorId);
    const accessible=!!(room&&bed&&door?.rooms?.includes(quarters.roomId)&&door.rooms.includes('residence-suite-corridor')&&s.lot.interiorRooms.some(r=>r.id==='residence-suite-corridor'));
    return {scene:s,room,bed,door,accessible};
  }
  function vacancy(){
    const {room,bed,accessible}=physical();
    return {slotId:CONSORT_SEAT_ID,roomId:quarters.roomId,bedId:quarters.bedId,roomExists:!!room,bedExists:!!bed,accessible,roomOwnerId:room?.privateOwnerId??null,bedOwnerId:bed?.privateOwnerId??null};
  }
  function projectOwnership(next=state()){
    const {room,bed,accessible}=physical(),a=next?.appointment;
    // next is either a core-validated committed state or the current ledger.
    const valid=!next?.loadError&&a?.titleId==='consort'&&a.actorId==='player'&&a.residence.roomId===quarters.roomId&&a.residence.bedId===quarters.bedId&&adult(player().ageYears)&&adult(emperor().ageYears)&&accessible&&[room,bed].every(item=>item.privateOwnerId==null||item.privateOwnerId==='player');
    for(const item of [room,bed])if(item&&(item.privateOwnerId==null||item.privateOwnerId==='player'))item.privateOwnerId=valid?'player':null;
    if(bed&&(bed.privateOwnerId===null||bed.privateOwnerId==='player')){bed.name=bed.privateOwnerId==='player'?'后宫南间卧榻 · 你的寝居':'后宫南间卧榻 · 尚未分配';bed.worldLabel=bed.privateOwnerId==='player'?'南间卧榻 · 你的寝居':'南间卧榻 · 尚未分配';}
    return {projected:!!(valid&&room?.privateOwnerId==='player'&&bed?.privateOwnerId==='player'),roomId:quarters.roomId,bedId:quarters.bedId,ownerId:valid&&room?.privateOwnerId==='player'&&bed?.privateOwnerId==='player'?'player':null};
  }
  function commit({nextLedger,nextEmpress,nextService}={}){
    if(committing)return false;committing=true;
    const before={...saved},next={...saved};
    try{
      try{
        captureWorld?.(next);
        // The existing captureWorldContinuity changes only root dailyNeeds and
        // worldContinuity references. Carry these candidate writes, then undo.
        for(const key of Object.keys(saved))if(saved[key]!==before[key]||!Object.hasOwn(before,key))next[key]=saved[key];
      }finally{restoreRoot(saved,before);}
      const service=read(getService),checkpoint=nextService??read(()=>service?.snapshot?.()??service?.checkpoint?.())??saved[CONSORT_SERVICE_KEY];
      const live=state(),titleData=nextLedger??(live&&!live.loadError?durable(live):saved[CONSORT_LEDGER_KEY]);
      if(titleData!==undefined)next[CONSORT_LEDGER_KEY]=copy(titleData);
      const empress=empressLedger?.state(),empressData=nextEmpress??(empress&&!empress.loadError?durable(empress):saved[EMPRESS_LEDGER_KEY]);
      if(empressData!==undefined)next[EMPRESS_LEDGER_KEY]=copy(empressData);
      if(checkpoint!==undefined){
        if(!object(checkpoint)||checkpoint.version!==1)return false;
        next[CONSORT_SERVICE_KEY]=copy(checkpoint);
        const china=next.worldContinuity?.regions?.china;
        if(china?.version===1){next.worldContinuity={...next.worldContinuity,regions:{...next.worldContinuity.regions,china:{...china,controllers:{...china.controllers,[CONSORT_SERVICE_KEY]:copy(checkpoint)}}}};}
      }
      const clock=read(getClock);if(Number.isFinite(clock?.seconds)&&clock.seconds>=0)next.simulationClock={version:1,seconds:clock.seconds};
      const result=writeWorld(copy(next));
      if(result&&typeof result.then==='function'){Promise.resolve(result).catch(()=>{});return false;}
      if(result===false)return false;
      Object.assign(saved,next);
      // Projection happens after the durable write, before core.saveState
      // returns. It therefore uses the validated next ledger, not old core state.
      try{projectOwnership(titleData);}catch{/* The next scene refresh can retry projection; never roll back a durable commit. */}
      return true;
    }catch{return false;}finally{committing=false;}
  }
  // No constructor callback assumes that a service or even a scene exists yet.
  ledger=createConsortPetitionLedger({saved:saved[CONSORT_LEDGER_KEY],worldSeed,saveState:next=>commit({nextLedger:next}),getClock,getPlayer:player,getEmperor:emperor,getCourt:court,getVacancy:vacancy,getCareers,getReviewContext:reviewContext,
    verifyReceipt:(receipt,expected)=>{const s=scene(),service=read(getService);return s.country==='china'&&service?.verifyReceipt?.(receipt,expected)===true;}});
  empressLedger=createEmpressTitleLedger({saved:saved[EMPRESS_LEDGER_KEY],worldSeed,getClock,getConsort:()=>ledger,getPlayer:player,getEmperor:emperor,getContext:reviewContext,getConversationCount:()=>getConversationCount?.('cn-emperor')??0,saveState:next=>commit({nextEmpress:next}),verifyReceipt:(receipt,expected)=>scene().country==='china'&&read(getService)?.verifyReceipt?.(receipt,expected)===true});
  function titleStatus(){const base=ledger.titleStatus(),empress=empressLedger.titleStatus();return {...base,loadError:base.loadError||empress.loadError,titleId:empress.active?'empress':base.titleId,empressAppointmentId:empress.appointmentId};}
  function releaseTitleAvailability(){
    if(empressLedger.state().loadError||empressLedger.appointment()||empressLedger.hasOpen())return {ok:false,reasons:['finish-empress-affairs']};
    const a=ledger?.appointment();if(!a)return {ok:false,reasons:['not-appointed']};
    let permission;try{permission=canReleaseTitle?.({appointment:copy(a),scene:scene()});}catch{}
    return permission===true||permission?.ok===true?{ok:true,reasons:[]}:{ok:false,reasons:Array.isArray(permission?.reasons)&&permission.reasons.length?[...permission.reasons]:['title-rights-busy']};
  }
  function resignTitle(id,options){
    if(options?.confirmed!==true)return {ok:false,code:'explicit-resignation-required',reasons:['explicit-resignation-required']};
    if(ledger.appointment()){const ready=releaseTitleAvailability();if(!ready.ok)return {ok:false,code:ready.reasons[0],reasons:ready.reasons};}
    return ledger.resignTitle(id,options);
  }
  function statusCard(){if(ledger.appointment())return empressLedger.statusCard();const card=ledger.statusCard();if(card.primaryAction?.id==='resign-title'){const release=releaseTitleAvailability();card.primaryAction={...card.primaryAction,enabled:release.ok};if(!release.ok)card.blockers=release.reasons.map(code=>({code,text:'先结束寝居、用膳或册书中的活动'}));}return card;}
  return {ledger,empressLedger,commitLedger:next=>commit({nextLedger:next}),commitService:next=>commit({nextService:next}),projectOwnership,vacancy,
    titleStatus,royalMealEligibility:()=>ledger.royalMealEligibility(),statusCard,releaseTitleAvailability,resignTitle};
}
