import {TAVERN_LAYOUT_VERSION as LAYOUT_VERSION} from './china-tavern-layout.js';
import {quoteSalonService,validSalonFee,SALON_QUOTE_VERSION} from './china-salon-pricing.js';
import {shapePreferenceScore} from './character-traits.js';
import {SALON_POET_ROLE,SALON_ARTIST_ROLES,salonCareerRole} from './china-salon-career-role.js';
import {salonPieces,salonPieceKey,salonRequest,SALON_BEAT_SECONDS,salonBeatLabel,salonBoardLabel,salonChessMove,salonPerformanceSeconds,salonServiceProofValid} from './china-salon-career-services.js';
import {knownAdult} from './player-age.js';
import {SALON_ROOMS,inSalonRoom} from './china-tavern-salon-rooms.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {changeSalonVisitor,salonReceipt} from './china-salon-payments.js';
const copy=x=>JSON.parse(JSON.stringify(x)),REG=[24.15,7.815,7.65],GUEST=[22.85,7.815,7.65];
const near=(n,p,r=.22)=>n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r&&Math.abs(n.root.position.y-p[1])<.35;
const adultArtist=n=>knownAdult(n)&&n.ageYears<=SALON_POET_ROLE.maximumAgeYears;
const blank=()=>({version:1,layoutVersion:LAYOUT_VERSION,revision:0,serial:0,shiftSerial:0,shift:null,order:null,reviews:[],income:0,lastEvent:null});
function valid(s){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,o=s?.order,role=salonCareerRole(o?.roleId??s?.shift?.roleId??SALON_POET_ROLE.id);
 return s?.version===1&&['revision','serial','shiftSerial','income'].every(k=>integer(s[k]))&&Array.isArray(s.reviews)&&s.reviews.length<=40&&
  (!s.shift||integer(s.shift.serial)&&s.shift.serial>0&&s.shift.serial<=s.shiftSerial&&integer(s.shift.day)&&salonCareerRole(s.shift.roleId??SALON_POET_ROLE.id))&&
  (!o||salonReceipt(o.id)&&Number(o.id.split('-').at(-1))===s.serial&&['cn-tavern-diner-west','cn-tavern-diner-east'].includes(o.customerId)&&role&&role.id===(s.shift?.roleId??SALON_POET_ROLE.id)&&integer(o.day)&&validSalonFee(o.fee,o.quoteVersion)&&salonServiceProofValid(o,role)&&
    (o.roomId===null||SALON_ROOMS.some(r=>r.id===o.roomId))&&s.shift);
}
// The career registry owns the continuing appointment. This controller owns
// voluntary, separately priced services, backed by an existing visitor purse.
export function createChinaSalonEmployment({salon,scene,careers,copperLedger,npcs,getPlayer,getClock,getMounted=()=>null,getBusy=()=>false,getAppearanceScore=()=>shapePreferenceScore(getPlayer()?.root.userData?.appearance?.shapeTraits),canSee=()=>true,saved=null,saveState=()=>true,openRegistration=()=>{},notify=()=>{}}){
 let current=blank(),loadError=null,lastError=null,disposed=false,elapsed=0,wait=0,reconciled=false,pendingPayment=null;
 if(saved!=null){if(valid(saved))current={...copy(saved),layoutVersion:LAYOUT_VERSION};else loadError='invalid-salon-employment';}
 const customer=()=>npcs.find(n=>n.station.id===current.order?.customerId),room=()=>SALON_ROOMS.find(r=>r.id===current.order?.roomId);
 const atRegistration=()=>!getMounted()&&near(getPlayer(),REG,.45)&&canSee({position:REG});
 const meet=()=>atRegistration()&&knownAdult(salon.receptionist)&&!(salon.admissionBusy?.()??salon.active());
 const activeRole=()=>salonCareerRole(current.order?.roleId??(current.shift?current.shift.roleId??SALON_POET_ROLE.id:null))||SALON_ARTIST_ROLES.find(r=>careers.isHired(r.id))||SALON_ARTIST_ROLES.find(r=>careers.applicationResult(r.id)?.status==='pending')||SALON_POET_ROLE;
 const hired=(role=activeRole())=>careers.isHired(role.id);
 const formals=new Map(SALON_ARTIST_ROLES.map(role=>[role.id,createFormalLaborContract({careers,workState:()=>careers?.workState?.()??careers?.state(),role,getJob:()=>current.shift,getPlayer,meetHost:meet,notify,openRegistration})]));
 const pieces=()=>salonPieces(activeRole()),piece=()=>pieces()[salonPieceKey(current.order)],requestName=()=>pieces()[current.order?.request]?.meaning;
 const shiftName=()=>activeRole().specialty+'台班',standIn=()=>activeRole().incumbentName;

 const fail=(text,code='unavailable')=>{lastError=code;notify(text);return false;};
 const persist=(next,world=null)=>{
  if(loadError||disposed)return false;
  const candidate={...copy(next),revision:current.revision+1},participant=world?scene.prepareLodgingWorld(world):null;
  if(participant?.ok===false)return fail('客单记录已变化，请重试','stale-world');
  try{const result=saveState(candidate,participant);if(result===false||result?.then)return fail('记录未保存，请重试','save-failed');current=candidate;lastError=null;return true;}catch{return fail('记录未保存，请重试','save-failed');}
 };
 const roleReviews=role=>current.reviews.filter(r=>(r.roleId??SALON_POET_ROLE.id)===role.id);
 const quote=(role=activeRole())=>quoteSalonService({appearanceScore:getAppearanceScore(),artLevel:careers.workState().skills.art,positiveReviews:roleReviews(role).filter(r=>r.positive).length});
 const inVenue=()=>{const p=getPlayer()?.root.position;return p&&p.x>16&&p.x<26&&p.z>3&&p.z<21&&Math.abs(p.y-7.815)<.45;};
 const startAvailable=(role=activeRole())=>!loadError&&!current.shift&&!current.order&&hired(role)&&adultArtist(getPlayer())&&!(salon.admissionBusy?.()??salon.active())&&getClock().hour>=6&&getClock().hour<22;
 function start(roleId=activeRole().id){const role=salonCareerRole(roleId);if(!role||!meet()||!startAvailable(role))return false;const serial=current.shiftSerial+1;
  if(!persist({...current,shiftSerial:serial,shift:{serial,day:getClock().day,roleId:role.id},lastEvent:`你已开班，${role.incumbentName}歇场；来客是否邀约依本人意愿与余钱。`}))return false;
  notify(shiftName()+'已开。来客可自行邀约，你可接受或谢绝；无客时可练习、休息或随时交班');return true;
 }
 function lifeChoices(n){
  const v=scene.snapshot()?.visitors.find(v=>v.id===n.station.id);
  if(salon.receptionAdmissionOpen?.()===false||!reconciled||loadError||!current.shift||current.order||!hired()||!adultArtist(getPlayer())||!knownAdult(n)||!knownAdult(salon.receptionist)||!inVenue()||getMounted()||getClock().hour>=22||getClock().day!==current.shift.day||!scene.salonCustomerAvailable(n)||!v||v.copper<quote()+6||!SALON_ROOMS.some(r=>salon.ledger.available(r)))return [];
  return [{id:'salon-'+activeRole().activity,external:true,label:`到云来雅集邀约${activeRole().specialty}茶叙`,base:.38,traits:{curiosity:.9,quiet:.6},needs:{social:.7},cooldown:120,duration:[0,0],targets:[{id:'player-'+activeRole().activity,choice:{topic:salonRequest(activeRole(),n.station.id)}}]}];
 }
 function invite(n,choice){
  if(!lifeChoices(n).length||choice?.id!=='salon-'+activeRole().activity)return false;
  if(!salon.workReachable(n,GUEST))return false;
  const serial=current.serial+1,o={id:`cn-salon-work-${serial}`,customerId:n.station.id,customerName:n.station.npcName,day:getClock().day,fee:quote(),quoteVersion:SALON_QUOTE_VERSION,roleId:activeRole().id,request:pieces()[choice.topic]?choice.topic:salonRequest(activeRole(),n.station.id),stage:'approaching',roomId:null,poem:null,answer:null};
  const world=changeSalonVisitor(scene.snapshot(),o,'invite');if(!world||!persist({...current,serial,order:o},world))return false;
  scene.resetSalonRoute(n);elapsed=wait=0;notify(`${o.customerName}想听${pieces()[o.request].meaning}，正在上楼请温晚引见；你可以婉拒`);return true;
 }
 function cancel(reason='你婉拒了这次邀约',endShift=false){
  const o=current.order;if(!o)return endShift?persist({...current,shift:null,lastEvent:`已交班，${standIn()}代管${shiftName()}。`}):false;
  if(o.stage==='ready')return fail('服务已完成，先请温晚将原客款结入银行；不会重新扣款');
  const world=changeSalonVisitor(scene.snapshot(),o,'cancel');if(!world)return fail('原客款待核对，暂不能释放此单');
  if(!persist({...current,order:null,...(endShift?{shift:null}:{}),lastEvent:reason+'；未完成不收费，已预留款全退。'},world))return false;
  salon.ledger.release(o.id);const n=npcs.find(n=>n.station.id===o.customerId);scene.resetSalonRoute(n);salon.resetWorkRoute(n);elapsed=wait=0;notify(reason+'；未完成不收费，来客照常返回生活');return true;
 }
 function acceptInvitation(){
  const o=current.order,n=customer();if(o?.stage!=='offered'||!meet()||!near(n,GUEST,.22)||!adultArtist(getPlayer())||!knownAdult(n)||getBusy())return false;
  const r=SALON_ROOMS.find(r=>salon.ledger.available(r));if(!r||!salon.ledger.reserve(r.id,o.id))return fail('两间客房暂有安排，未扣款；可以稍候或谢绝');
  const next={...o,stage:'escort',roomId:r.id},world=changeSalonVisitor(scene.snapshot(),next,'reserve');
  if(!world||!persist({...current,order:next},world)){salon.ledger.release(o.id);return false;}
  wait=0;notify(`${o.customerName}已预留${o.fee}文。请到${r.name}同席，完成${activeRole().specialty}内容与实际服务；此前可取消全退`);return true;
 }
 const bothInRoom=()=>{const o=current.order,r=room(),n=customer(),p=getPlayer();return !!o&&!!r&&salon.ledger.claim(r.id)?.owner===o.id&&salon.workRoomAvailable(r.id)&&adultArtist(p)&&knownAdult(n)&&knownAdult(salon.receptionist)&&inSalonRoom(r,p?.root.position)&&inSalonRoom(r,n?.root.position)&&near(p,r.player,.28)&&near(n,r.actor,.22)&&!npcs.some(other=>other!==n&&inSalonRoom(r,other.root.position));};
 function selectPiece(key){const o=current.order,role=activeRole();if(o?.stage!=='choose'||!pieces()[key]||!bothInRoom()||getBusy())return false;
  const stage=({poetry:'reciting',story:'narrating',music:'rhythm',chess:'chess'})[role.activity];
  if(!persist({...current,order:{...o,stage,...(role.activity==='poetry'?{poem:key}:{piece:key}),...(role.activity==='music'?{beats:[],pendingBeat:null}:{})}}))return false;
  const p=getPlayer(),n=customer();p.root.rotation.y=Math.atan2(n.root.position.x-p.root.position.x,n.root.position.z-p.root.position.z);elapsed=0;
  notify(`${piece().name}：${piece().text}`+(role.activity==='music'?` 请按 ${piece().pattern.map(salonBeatLabel).join('、')} 逐拍演绎。`:role.activity==='chess'?' 黑● 白○，棋题和可落空点在职业手册。':'（完整讲诵8秒）'));return true;
 }
 function finish(proof,correct,detail){const o=current.order,role=activeRole(),matched=salonPieceKey(o)===o.request,positive=matched&&correct;
  const review={id:o.id,roleId:role.id,specialty:role.activity,customerId:o.customerId,customerName:o.customerName,day:o.day,positive,score:positive?1:correct?0:-1,
   reason:positive?detail+'，也契合我这次的来意。':correct?detail+'，不过与我想听的内容不同。':'本场已完成，'+detail,amount:o.fee,proof:{specialty:role.activity,piece:salonPieceKey(o),...proof}};
  if(!persist({...current,order:{...o,...proof,stage:'ready',review}}))return false;
  elapsed=0;notify(`${o.customerName}：${review.reason} 服务已完成，请到温晚处按原客单结款`);return true;
 }
 function answer(key){const o=current.order,role=activeRole();if(o?.stage!=='discussion'||!bothInRoom()||getBusy())return false;
  if(role.activity==='poetry'){if(!pieces()[key])return false;return finish({answer:key,recitedSeconds:8},key===o.poem,key===o.poem?'诵读完整，题意也说得清楚':'题意回应与所诵诗篇不相合。');}
  if(role.activity==='story'&&['cause','wrong'].includes(key))return finish({answer:key,narratedSeconds:8},key==='cause',key==='cause'?'故事讲述完整，人物行动的前因后果说得清楚':'故事讲完了，但把人物行动的缘由说反了。');return false;
 }
 function beat(key){const o=current.order;if(activeRole().activity!=='music'||o?.stage!=='rhythm'||!SALON_BEAT_SECONDS[key]||!bothInRoom()||getBusy())return false;
  if(!persist({...current,order:{...o,stage:'beat',pendingBeat:key}}))return false;elapsed=0;notify(`第${o.beats.length+1}拍：${salonBeatLabel(key)}，保持${SALON_BEAT_SECONDS[key]}秒。`);return true;
 }
 function move(index){const o=current.order;if(activeRole().activity!=='chess'||o?.stage!=='chess'||!bothInRoom()||getBusy())return false;
  const result=salonChessMove(o.piece,index);if(!result)return fail('该点已有棋子或落子后无气，请选合法空点');
  return finish({move:result},result.correct,o.piece==='capture'?result.correct?`落在${salonBoardLabel(index)}，确实提掉${result.captured}颗白子`:'这步没有封住白子的最后一口气。':result.correct?`中央黑子连通后共有${result.liberties}口气，已经脱困`:`中央黑子仍只有${result.liberties}口气，尚未脱困。`);
 }
 function settle(){const o=current.order;if(o?.stage!=='ready'||!meet())return false;
  pendingPayment=o.id;let result;try{result=copperLedger.creditWageToBank({amount:o.fee,receiptId:o.id,currency:'copper',roleId:activeRole().id,slotId:activeRole().slotId,day:o.day});}finally{pendingPayment=null;}
  if(!result?.ok)return fail('客款入银行尚未保存，原单保留，请稍后重试',result?.code||'bank-unavailable');
  salon.ledger.release(o.id);const n=npcs.find(n=>n.station.id===o.customerId);scene.resetSalonRoute(n);salon.resetWorkRoute(n);elapsed=wait=0;notify(`${o.customerName}已按约支付${o.fee}文，存入银行；台班继续，可等客或交班`);return true;
 }
 function prepareCurrencyCommit(tx){
  if(!salonCareerRole(tx.roleId)&&!(tx.requestId||'').startsWith('cn-salon-work-'))return null;
  const o=current.order;
  if(pendingPayment!==o?.id||o?.stage!=='ready'||tx.action!=='wage'||tx.requestId!==o.id||tx.amount!==o.fee||tx.day!==o.day||tx.currency!=='copper'||tx.roleId!==activeRole().id||tx.slotId!==activeRole().slotId)return {ok:false,code:'salon-work-incomplete'};
  const world=changeSalonVisitor(scene.snapshot(),o,'settle');if(!world)return {ok:false,code:'salon-hold-missing'};
  const participant=scene.prepareLodgingWorld(world);if(!participant.ok)return participant;
  const next={...copy(current),revision:current.revision+1,order:null,reviews:[...current.reviews,o.review].slice(-40),income:current.income+o.fee,lastEvent:`${o.customerName}的${o.fee}文已入银行。`};
  return {ok:true,patch:{...participant.patch,chinaSalonEmployment:next},committed:()=>{participant.committed();current=next;}};
 }
 function endShift(){if(!atRegistration())return false;if(current.order)return cancel('你主动结束本次安排',true);if(!current.shift)return false;const ok=persist({...current,shift:null,lastEvent:`已交班，${standIn()}代管${shiftName()}。`});if(ok)notify('台班已交回'+standIn()+'；任职保留，完成客单的收入不变');return ok;}
 function reconcile(){
  const world=scene.snapshot();if(!world)return false;
  const o=current.order;
  for(const v of world.visitors.filter(v=>v.mode==='salon')){
   if(v.salonClaimId===o?.id&&v.id===o.customerId)continue;
   const orphan={id:v.salonClaimId,customerId:v.id},next=changeSalonVisitor(scene.snapshot(),orphan,'cancel');
   if(!next||!persist(current,next))return false;
  }
  if(o){const v=scene.snapshot().visitors.find(v=>v.id===o.customerId);
   if(v?.mode!=='salon'||v.salonClaimId!==o.id){loadError='missing-salon-lease';return false;}
   if(o.roomId){const r=room(),held=v.salonPayment;
    if(held?.id!==o.id||held.status!=='reserved'||held.amount!==o.fee){loadError='missing-salon-hold';return false;}
    if(o.stage!=='ready'&&!salon.ledger.claim(r.id)&&!salon.ledger.reserve(r.id,o.id,['player',o.customerId]))return cancel('房间恢复时已有其他安排');
   }
  }
  reconciled=true;return true;
 }
 function update(dt,t){
  if(disposed||loadError)return;if(!reconciled&&!reconcile())return;
  const o=current.order,n=customer();
  if(current.shift&&(!hired()||!adultArtist(getPlayer())||current.shift.day!==getClock().day||getClock().hour>=22)){
   if(o?.stage==='ready'){/* Completed work remains owed across midnight. */}
   else{if(o)cancel('本次台班结束，未完成安排已撤下',true);else persist({...current,shift:null,lastEvent:`休班，${standIn()}代管。`});return;}
  }
  if(!o)return;
  if(!knownAdult(n)||!adultArtist(getPlayer())||!knownAdult(salon.receptionist)){if(o.stage!=='ready')cancel('参与资格已变化，本次安排撤下');return;}
  wait+=Math.min(.1,Math.max(0,dt));if(wait>220&&o.stage!=='ready'){cancel('等候过久，温晚撤下本次安排');return;}
  if(o.stage==='approaching'){
   if(salon.workTravel(n,GUEST,dt)){if(persist({...current,order:{...o,stage:'offered'}})){wait=0;notify(`${o.customerName}：想听一段${pieces()[o.request].meaning}，愿付${o.fee}文。你愿意吗？`);}}
  }else if(o.stage==='offered'){
   // A restored invitation stays offered while its customer walks to the
   // current reception. The original order, quote and purse remain untouched.
   if(!near(n,GUEST,.22))salon.workTravel(n,GUEST,dt);
  }else if(o.stage==='escort'){
   salon.workTravel(n,room().actor,dt);
   if(bothInRoom()&&persist({...current,order:{...o,stage:'choose'}})){salon.ledger.occupy(o.roomId,o.id);wait=0;notify(`${o.customerName}想听${pieces()[o.request].meaning}。请从职业手册选择${activeRole().specialty}内容，开始这场茶叙`);}
  }else if(['choose','reciting','narrating','discussion','rhythm','beat','chess'].includes(o.stage)){
   if(!bothInRoom()){cancel('你们离开了茶席，本次服务尚未完成');return;}
   if(['reciting','narrating'].includes(o.stage)&&!getBusy()){
    elapsed+=Math.min(.1,Math.max(0,dt));if(elapsed>=8&&persist({...current,order:{...o,stage:'discussion'}})){elapsed=0;wait=0;notify(`${o.customerName}：${activeRole().activity==='poetry'?'你刚诵的这一段，写的是远行见闻，还是归家心绪？':piece().question}`);}
   }else if(o.stage==='beat'&&!getBusy()){
    elapsed+=Math.min(.1,Math.max(0,dt));if(elapsed>=SALON_BEAT_SECONDS[o.pendingBeat]){
     const beats=[...o.beats,o.pendingBeat];if(beats.length===4){const correct=beats.every((value,i)=>value===piece().pattern[i]);finish({beats,pendingBeat:null,performedSeconds:beats.reduce((sum,value)=>sum+SALON_BEAT_SECONDS[value],0)},correct,correct?'四拍逐一演绎完成，长短节奏与曲谱相合':'四拍演绎完了，但长短次序与所选曲谱不合。');}
     else if(persist({...current,order:{...o,stage:'rhythm',beats,pendingBeat:null}})){elapsed=wait=0;notify(`第${beats.length}拍已完成，请选择下一拍。`);}
    }
   }
  }
  const p=getPlayer()?.root.position;salon.workPose(n,t,['choose','reciting','narrating','discussion','rhythm','beat','chess','ready'].includes(o.stage)?'relax':null,p?.toArray());
 }
 function workChoices(){const o=current.order;if(!current.shift)return ['accept','formal-resign'];return ['work-view',...(o?.stage==='offered'?['take-invitation']:[]),...(o?.stage==='escort'?['go-room']:[]),...(o?.stage==='choose'?Object.keys(pieces()).map(key=>(activeRole().activity==='poetry'?'poem-':'piece-')+key):[]),...(o?.stage==='discussion'?activeRole().activity==='poetry'?['answer-river','answer-home']:['answer-cause','answer-wrong']:[]),...(o?.stage==='rhythm'?['beat-short','beat-long']:[]),...(o?.stage==='chess'?piece().board.flatMap((value,i)=>value==='.'&&salonChessMove(o.piece,i)?['move-'+i]:[]):[]),...(o?.stage==='ready'?['settle']:o?['decline']:[]),'end-shift'];}
 function intent(kind=null,roleId=activeRole().id){
  const role=salonCareerRole(roleId);if(disposed||loadError||!role)return null;const o=current.order;
  kind||=current.shift?'work-view':careers.applicationResult(role.id)?.status==='pending'?'formal-review':'formal-view';
  const administrative=['formal-view','formal-apply','formal-review','formal-resign','accept'].includes(kind);
  if(current.shift&&(role.id!==activeRole().id||administrative&&kind!=='formal-view'))return null;
  if(!administrative&&role.id!==activeRole().id)return null;
  if(kind==='formal-apply'&&(hired(role)||careers.applicationResult(role.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(role.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!hired(role)||kind==='accept'&&!startAvailable(role)||kind==='end-shift'&&!current.shift)return null;
  if(!administrative&&!workChoices().includes(kind))return null;
  const action=({'formal-view':'长期艺者 · 查看'+role.specialty+'申请条件','formal-apply':'向温晚提交'+role.specialty+'艺者申请','formal-review':'当面确认职责 · 请温晚审核','formal-resign':'向温晚办理艺者离职',accept:'自主开班 · '+role.specialty+'台班','work-view':'查看'+role.specialty+'台班 · 邀约与工作','take-invitation':`接受${o?.customerName||'来客'}的${role.specialty}邀约 · ${o?.fee||quote()}文`,decline:'谢绝或取消本次邀约 · 未完成全退','go-room':`前往${room()?.name||'雅间'} · 等双方就位`,settle:'请温晚验收原客单 · 客款入银行','end-shift':'当面交班 · 任职保留'})[kind]||
   (kind.startsWith('poem-')?'选诵 '+pieces()[kind.slice(5)]?.name:kind.startsWith('piece-')?'选 '+pieces()[kind.slice(6)]?.name:kind.startsWith('beat-')?`${salonBeatLabel(kind.slice(5))} · ${SALON_BEAT_SECONDS[kind.slice(5)]}秒`:kind.startsWith('move-')?'落黑子 · '+salonBoardLabel(Number(kind.slice(5))):kind.startsWith('answer-')?'回应：'+(role.activity==='poetry'?pieces()[kind.slice(7)]?.meaning:kind==='answer-cause'?piece()?.answer:piece()?.wrong):null);
  if(!action)return null;
  const remote=kind==='work-view'||kind==='decline',inRoom=kind==='go-room'||['poem-','piece-','beat-','move-','answer-'].some(prefix=>kind.startsWith(prefix));
  const position=remote?getPlayer()?.root.position.toArray():inRoom?room()?.player:REG;if(!position)return null;
  return {id:'cn-salon-job-'+kind,provider:'china-salon-employment',kind,roleId:role.id,...(inRoom&&o?{visualAnchor:{actorId:o.customerId}}:{}),name:'云来'+role.specialty+'台班',npcName:'温晚',targetKey:'cn-tavern-reception',targetName:'温晚 · 雅集接待',action,position:position.slice(),executionRadius:remote?.5:inRoom?.25:.45,interactionRadius:remote?.6:1.8,priority:47,visibilityChecked:remote,...(kind==='formal-view'?{registration:{scope:'role',roleId:role.id}}:{}),intentKey:[current.revision,careers.workState().revision,role.id,kind,o?.id||'-',o?.stage||'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind,old?.roleId);return next&&next.provider===old?.provider&&next.intentKey===old.intentKey?next:null;}
 function executeIntent(old){const q=resolveIntent(old);if(!q||!near(getPlayer(),q.position,q.executionRadius)||getMounted()||!q.visibilityChecked&&!canSee(q))return false;
  const kind=q.kind,formal=formals.get(q.roleId);if(kind==='formal-view'||kind==='work-view'){openRegistration({roleId:q.roleId,scope:'role'});return true;}
  if(kind==='formal-apply')return formal.apply();if(kind==='formal-review')return formal.review();if(kind==='formal-resign')return formal.resign();if(kind==='accept')return start(q.roleId);if(kind==='end-shift')return endShift();if(kind==='take-invitation')return acceptInvitation();if(kind==='decline')return cancel();if(kind==='settle')return settle();if(kind==='go-room')return true;
  if(kind.startsWith('poem-'))return selectPiece(kind.slice(5));if(kind.startsWith('piece-'))return selectPiece(kind.slice(6));if(kind.startsWith('answer-'))return answer(kind.slice(7));if(kind.startsWith('beat-'))return beat(kind.slice(5));if(kind.startsWith('move-'))return move(Number(kind.slice(5)));return false;
 }
 function label(){const o=current.order;if(!current.shift)return hired()?`${shiftName()}未开 · ${standIn()}代管`:null;
  return !o?shiftName()+' · 自由候客，可练习、休息或交班':({approaching:`${o.customerName}正来当面邀约`,offered:`${o.customerName}想听${requestName()} · ${o.fee}文 · 自主接受或谢绝`,escort:`请到${room()?.name}与${o.customerName}会合`,choose:`${o.customerName}想听${requestName()} · 请选择内容`,reciting:`正在诵读${piece()?.name} · ${Math.min(8,elapsed).toFixed(0)}/8秒`,narrating:`正在讲述${piece()?.name} · ${Math.min(8,elapsed).toFixed(0)}/8秒`,discussion:activeRole().activity==='poetry'?'诵读已完 · 请回应来客对题意的提问':'故事已讲完 · 请说明人物行动缘由',rhythm:`已完成${o.beats?.length||0}/4拍 · 请按谱选择下一拍`,beat:`第${(o.beats?.length||0)+1}拍 ${salonBeatLabel(o.pendingBeat)} · ${Math.min(salonPerformanceSeconds(o),elapsed).toFixed(1)}秒`,chess:'请检查棋子的气 · 选择一处合法空点落子',ready:`${o.customerName}评价已记 · ${o.fee}文待入银行`})[o.stage];}
 function state(role=activeRole()){
  // A catalogue card is a read-only view of its requested specialty. Its
  // quote/reviews cannot borrow another seat's reputation or current work.
  const active=role.id===activeRole().id,o=active?current.order:null,reviews=roleReviews(role),selected=o?salonPieces(role)[salonPieceKey(o)]:null;
  return {...copy(current),shift:active?copy(current.shift):null,order:o?copy(o):null,reviews:copy(reviews),roleId:role.id,specialty:role.activity,loadError,lastError,label:active?label():null,progressSeconds:Math.min(salonPerformanceSeconds(o),active?elapsed:0),progressTotal:salonPerformanceSeconds(o),quote:quote(role),requestName:o?salonPieces(role)[o.request]?.meaning||null:null,piece:selected||null,latestReview:copy(o?.review||reviews.at(-1)||null),job:active&&current.shift?{formalRoleId:role.id,stage:'working',completedTasks:reviews.length}:null};
 }
 const api={intent,resolveIntent,executeIntent,lifeChoices,invite,update,start,cancel,endShift,settle,prepareCurrencyCommit,atRegistration,
  owns:n=>n?.station.id===current.order?.customerId,onShift:artistId=>!!current.shift&&(!artistId||activeRole().incumbentId===artistId),active:()=>!!current.order,label,workChoices,
  playerAction:()=>['reciting','narrating'].includes(current.order?.stage)?'read':current.order?.stage==='beat'?'read':current.order?.stage==='chess'?'relax':null,
  playerStation:()=>['reciting','narrating','beat','chess'].includes(current.order?.stage)?{workTarget:room().actor.map((v,i)=>i===1?v+1.2:v)}:null,state,
  snapshot:()=>({version:1,layoutVersion:LAYOUT_VERSION,revision:current.revision,orderId:current.order?.id||null,stage:current.order?.stage||null,elapsed,wait}),
  restore:s=>{if(s?.version!==1||s.revision!==current.revision||s.orderId!==(current.order?.id||null)||s.stage!==(current.order?.stage||null))return false;elapsed=Number.isFinite(s.elapsed)?Math.max(0,Math.min(8,s.elapsed)):0;wait=Number.isFinite(s.wait)?Math.max(0,Math.min(220,s.wait)):0;reconciled=false;return true;},
  dispose(){disposed=true;scene.setSalonService(null);if(current.order)salon.ledger.release(current.order.id);}
 };
 api.forRole=roleId=>{const role=salonCareerRole(roleId);if(!role)return null;return {...api,intent:kind=>intent(kind,roleId),formal:{...formals.get(roleId),beginAvailability:()=>({ok:startAvailable(role)})},state:()=>state(role)};};
 Object.defineProperty(api,'formal',{get:()=>({...formals.get(activeRole().id),beginAvailability:()=>({ok:startAvailable()})})});
 return api;
}
