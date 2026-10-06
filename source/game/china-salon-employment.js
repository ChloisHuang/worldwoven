import {TAVERN_LAYOUT_VERSION as LAYOUT_VERSION} from './china-tavern-layout.js';
import {quoteSalonService,validSalonFee,SALON_QUOTE_VERSION} from './china-salon-pricing.js';
import {shapePreferenceScore} from './character-traits.js';
import {SALON_POET_ROLE as ROLE} from './china-salon-career-role.js';
import {knownAdult} from './player-age.js';
import {SALON_ROOMS,inSalonRoom} from './china-tavern-salon-rooms.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {changeSalonVisitor,salonReceipt} from './china-salon-payments.js';
const copy=x=>JSON.parse(JSON.stringify(x)),REG=[24.15,7.815,7.65],GUEST=[22.85,7.815,7.65];
const POEMS=Object.freeze({river:{name:'《江行》',text:'江风拂水，远帆带暮色；一盏清茶，听两岸人声。',meaning:'远行见闻'},home:{name:'《归灯》',text:'灯在窗前，归人认旧路；茶温未冷，细雨到檐边。',meaning:'归家心绪'}});
const STAGES=['approaching','offered','escort','choose','reciting','discussion','ready'];
const near=(n,p,r=.22)=>n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<=r&&Math.abs(n.root.position.y-p[1])<.35;
const adultArtist=n=>knownAdult(n)&&n.ageYears<=ROLE.maximumAgeYears;
const blank=()=>({version:1,layoutVersion:LAYOUT_VERSION,revision:0,serial:0,shiftSerial:0,shift:null,order:null,reviews:[],income:0,lastEvent:null});
function valid(s){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,o=s?.order;
 return s?.version===1&&['revision','serial','shiftSerial','income'].every(k=>integer(s[k]))&&Array.isArray(s.reviews)&&s.reviews.length<=40&&
  (!s.shift||integer(s.shift.serial)&&s.shift.serial>0&&s.shift.serial<=s.shiftSerial&&integer(s.shift.day))&&
  (!o||salonReceipt(o.id)&&Number(o.id.split('-').at(-1))===s.serial&&['cn-tavern-diner-west','cn-tavern-diner-east'].includes(o.customerId)&&STAGES.includes(o.stage)&&integer(o.day)&&validSalonFee(o.fee,o.quoteVersion)&&POEMS[o.request]&&
    (o.roomId===null||SALON_ROOMS.some(r=>r.id===o.roomId))&&(o.poem===null||POEMS[o.poem])&&s.shift);
}
// The career registry owns the continuing appointment. This controller owns
// voluntary, separately priced services, backed by an existing visitor purse.
export function createChinaSalonEmployment({salon,scene,careers,copperLedger,npcs,getPlayer,getClock,getMounted=()=>null,getBusy=()=>false,getAppearanceScore=()=>shapePreferenceScore(getPlayer()?.root.userData?.appearance?.shapeTraits),canSee=()=>true,saved=null,saveState=()=>true,openRegistration=()=>{},notify=()=>{}}){
 let current=blank(),loadError=null,lastError=null,disposed=false,elapsed=0,wait=0,reconciled=false,pendingPayment=null;
 if(saved!=null){if(valid(saved))current={...copy(saved),layoutVersion:LAYOUT_VERSION};else loadError='invalid-salon-employment';}
 const customer=()=>npcs.find(n=>n.station.id===current.order?.customerId),room=()=>SALON_ROOMS.find(r=>r.id===current.order?.roomId);
 const atRegistration=()=>!getMounted()&&near(getPlayer(),REG,.45)&&canSee({position:REG});
 const meet=()=>atRegistration()&&knownAdult(salon.receptionist)&&!(salon.admissionBusy?.()??salon.active());
 const hired=()=>careers.isHired(ROLE.id);
 const formal=createFormalLaborContract({careers,workState:()=>careers?.workState?.()??careers?.state(),role:ROLE,getJob:()=>current.shift,getPlayer,meetHost:meet,notify,openRegistration});
 const fail=(text,code='unavailable')=>{lastError=code;notify(text);return false;};
 const persist=(next,world=null)=>{
  if(loadError||disposed)return false;
  const candidate={...copy(next),revision:current.revision+1},participant=world?scene.prepareLodgingWorld(world):null;
  if(participant?.ok===false)return fail('客单记录已变化，请重试','stale-world');
  try{const result=saveState(candidate,participant);if(result===false||result?.then)return fail('记录未保存，请重试','save-failed');current=candidate;lastError=null;return true;}catch{return fail('记录未保存，请重试','save-failed');}
 };
 const quote=()=>quoteSalonService({appearanceScore:getAppearanceScore(),artLevel:careers.workState().skills.art,positiveReviews:current.reviews.filter(r=>r.positive).length});
 const inVenue=()=>{const p=getPlayer()?.root.position;return p&&p.x>16&&p.x<26&&p.z>3&&p.z<21&&Math.abs(p.y-7.815)<.45;};
 const startAvailable=()=>!loadError&&!current.shift&&!current.order&&hired()&&adultArtist(getPlayer())&&!(salon.admissionBusy?.()??salon.active())&&getClock().hour>=6&&getClock().hour<22;
 function start(){if(!meet()||!startAvailable())return false;const serial=current.shiftSerial+1;
  if(!persist({...current,shiftSerial:serial,shift:{serial,day:getClock().day},lastEvent:'你已开班，柳清弦歇场；来客是否邀约依本人意愿与余钱。'}))return false;
  notify('诗词台班已开。来客可自行邀约，你可接受或谢绝；无客时可练习、休息或随时交班');return true;
 }
 function lifeChoices(n){
  const v=scene.snapshot()?.visitors.find(v=>v.id===n.station.id);
  if(!reconciled||loadError||!current.shift||current.order||!hired()||!adultArtist(getPlayer())||!knownAdult(n)||!knownAdult(salon.receptionist)||!inVenue()||getMounted()||getClock().hour>=22||getClock().day!==current.shift.day||!scene.salonCustomerAvailable(n)||!v||v.copper<quote()+6||!SALON_ROOMS.some(r=>salon.ledger.available(r)))return [];
  return [{id:'salon-poetry',external:true,label:'到云来雅集邀约诗词茶叙',base:.38,traits:{curiosity:.9,quiet:.6},needs:{social:.7},cooldown:120,duration:[0,0],targets:[{id:'player-poet',choice:{topic:n.station.id==='cn-tavern-diner-west'?'river':'home'}}]}];
 }
 function invite(n,choice){
  if(!lifeChoices(n).length||choice?.id!=='salon-poetry')return false;
  if(!salon.workReachable(n,GUEST))return false;
  const serial=current.serial+1,o={id:`cn-salon-work-${serial}`,customerId:n.station.id,customerName:n.station.npcName,day:getClock().day,fee:quote(),quoteVersion:SALON_QUOTE_VERSION,request:choice.topic==='home'?'home':'river',stage:'approaching',roomId:null,poem:null,answer:null};
  const world=changeSalonVisitor(scene.snapshot(),o,'invite');if(!world||!persist({...current,serial,order:o},world))return false;
  scene.resetSalonRoute(n);elapsed=wait=0;notify(`${o.customerName}想听${POEMS[o.request].meaning}，正在上楼请温晚引见；你可以婉拒`);return true;
 }
 function cancel(reason='你婉拒了这次邀约',endShift=false){
  const o=current.order;if(!o)return endShift?persist({...current,shift:null,lastEvent:'已交班，柳清弦代管诗词台班。'}):false;
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
  wait=0;notify(`${o.customerName}已预留${o.fee}文。请到${r.name}同席，选诗、诵读后再回应题意；此前可取消全退`);return true;
 }
 const bothInRoom=()=>{const o=current.order,r=room(),n=customer(),p=getPlayer();return !!o&&!!r&&salon.ledger.claim(r.id)?.owner===o.id&&salon.workRoomAvailable(r.id)&&adultArtist(p)&&knownAdult(n)&&knownAdult(salon.receptionist)&&inSalonRoom(r,p?.root.position)&&inSalonRoom(r,n?.root.position)&&near(p,r.player,.28)&&near(n,r.actor,.22)&&!npcs.some(other=>other!==n&&inSalonRoom(r,other.root.position));};
 function recite(key){const o=current.order;if(o?.stage!=='choose'||!POEMS[key]||!bothInRoom()||getBusy())return false;
  if(!persist({...current,order:{...o,stage:'reciting',poem:key}}))return false;const p=getPlayer(),n=customer();p.root.rotation.y=Math.atan2(n.root.position.x-p.root.position.x,n.root.position.z-p.root.position.z);elapsed=0;notify(`${POEMS[key].name}：${POEMS[key].text}（诵读8秒）`);return true;
 }
 function answer(key){const o=current.order;if(o?.stage!=='discussion'||!POEMS[key]||!bothInRoom()||getBusy())return false;
  const matched=o.poem===o.request,correct=key===o.poem,positive=matched&&correct;
  const review={id:o.id,customerId:o.customerId,customerName:o.customerName,day:o.day,positive,score:positive?1:correct?0:-1,reason:positive?'选诗契合我的来意，诵读完整，题意也说得清楚。':correct?'诵读与题意说清了，不过这首与我想听的心绪不同。':'诵读完成了，不过刚才的题意回应有些不相合。',amount:o.fee};
  if(!persist({...current,order:{...o,stage:'ready',answer:key,review}}))return false;
  elapsed=0;notify(`${o.customerName}：${review.reason} 服务已完成，请到温晚处按原客单结款`);return true;
 }
 function settle(){const o=current.order;if(o?.stage!=='ready'||!meet())return false;
  pendingPayment=o.id;let result;try{result=copperLedger.creditWageToBank({amount:o.fee,receiptId:o.id,currency:'copper',roleId:ROLE.id,slotId:ROLE.slotId,day:o.day});}finally{pendingPayment=null;}
  if(!result?.ok)return fail('客款入银行尚未保存，原单保留，请稍后重试',result?.code||'bank-unavailable');
  salon.ledger.release(o.id);const n=npcs.find(n=>n.station.id===o.customerId);scene.resetSalonRoute(n);salon.resetWorkRoute(n);elapsed=wait=0;notify(`${o.customerName}已按约支付${o.fee}文，存入银行；台班继续，可等客或交班`);return true;
 }
 function prepareCurrencyCommit(tx){
  if(tx.roleId!==ROLE.id&&!(tx.requestId||'').startsWith('cn-salon-work-'))return null;
  const o=current.order;
  if(pendingPayment!==o?.id||o?.stage!=='ready'||tx.action!=='wage'||tx.requestId!==o.id||tx.amount!==o.fee||tx.day!==o.day||tx.currency!=='copper'||tx.roleId!==ROLE.id||tx.slotId!==ROLE.slotId)return {ok:false,code:'salon-work-incomplete'};
  const world=changeSalonVisitor(scene.snapshot(),o,'settle');if(!world)return {ok:false,code:'salon-hold-missing'};
  const participant=scene.prepareLodgingWorld(world);if(!participant.ok)return participant;
  const next={...copy(current),revision:current.revision+1,order:null,reviews:[...current.reviews,o.review].slice(-40),income:current.income+o.fee,lastEvent:`${o.customerName}的${o.fee}文已入银行。`};
  return {ok:true,patch:{...participant.patch,chinaSalonEmployment:next},committed:()=>{participant.committed();current=next;}};
 }
 function endShift(){if(!atRegistration())return false;if(current.order)return cancel('你主动结束本次安排',true);if(!current.shift)return false;const ok=persist({...current,shift:null,lastEvent:'已交班，柳清弦代管诗词台班。'});if(ok)notify('台班已交回柳清弦；任职保留，完成客单的收入不变');return ok;}
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
   else{if(o)cancel('本次台班结束，未完成安排已撤下',true);else persist({...current,shift:null,lastEvent:'休班，柳清弦代管。'});return;}
  }
  if(!o)return;
  if(!knownAdult(n)||!adultArtist(getPlayer())||!knownAdult(salon.receptionist)){if(o.stage!=='ready')cancel('参与资格已变化，本次安排撤下');return;}
  wait+=Math.min(.1,Math.max(0,dt));if(wait>220&&o.stage!=='ready'){cancel('等候过久，温晚撤下本次安排');return;}
  if(o.stage==='approaching'){
   if(salon.workTravel(n,GUEST,dt)){if(persist({...current,order:{...o,stage:'offered'}})){wait=0;notify(`${o.customerName}：想听一段${POEMS[o.request].meaning}，愿付${o.fee}文。你愿意吗？`);}}
  }else if(o.stage==='offered'){
   // A restored invitation stays offered while its customer walks to the
   // current reception. The original order, quote and purse remain untouched.
   if(!near(n,GUEST,.22))salon.workTravel(n,GUEST,dt);
  }else if(o.stage==='escort'){
   salon.workTravel(n,room().actor,dt);
   if(bothInRoom()&&persist({...current,order:{...o,stage:'choose'}})){salon.ledger.occupy(o.roomId,o.id);wait=0;notify(`${o.customerName}想听${POEMS[o.request].meaning}。请从职业手册选诗，开始这场茶叙`);}
  }else if(['choose','reciting','discussion'].includes(o.stage)){
   if(!bothInRoom()){cancel('你们离开了茶席，本次服务尚未完成');return;}
   if(o.stage==='reciting'&&!getBusy()){
    elapsed+=Math.min(.1,Math.max(0,dt));if(elapsed>=8&&persist({...current,order:{...o,stage:'discussion'}})){elapsed=0;wait=0;notify(`${o.customerName}：你刚诵的这一段，写的是远行见闻，还是归家心绪？`);}
   }
  }
  const p=getPlayer()?.root.position;salon.workPose(n,t,['choose','reciting','discussion','ready'].includes(o.stage)?'relax':null,p?.toArray());
 }
 function intent(kind=null){
  if(disposed||loadError)return null;const o=current.order;
  kind||=current.shift?'work-view':careers.applicationResult(ROLE.id)?.status==='pending'?'formal-review':'formal-view';
  if(['formal-apply','formal-review','formal-resign','accept'].includes(kind)&&current.shift)return null;
  if(kind==='formal-apply'&&(hired()||careers.applicationResult(ROLE.id)?.status==='pending'))return null;
  if(kind==='formal-review'&&careers.applicationResult(ROLE.id)?.status!=='pending')return null;
  if(kind==='formal-resign'&&!hired()||kind==='accept'&&!startAvailable()||kind==='end-shift'&&!current.shift)return null;
  if(kind==='take-invitation'&&o?.stage!=='offered'||kind==='decline'&&(!o||o.stage==='ready')||kind==='settle'&&o?.stage!=='ready'||kind==='go-room'&&o?.stage!=='escort')return null;
  if(kind.startsWith('poem-')&&(o?.stage!=='choose'||!POEMS[kind.slice(5)]))return null;
  if(kind.startsWith('answer-')&&(o?.stage!=='discussion'||!POEMS[kind.slice(7)]))return null;
  const action=({'formal-view':'长期艺者 · 查看申请条件','formal-apply':'向温晚提交诗词艺者申请','formal-review':'当面确认职责 · 请温晚审核','formal-resign':'向温晚办理艺者离职',accept:'自主开班 · 诗词台班','work-view':'查看诗词台班 · 邀约与工作','take-invitation':`接受${o?.customerName||'来客'}的诗词邀约 · ${o?.fee||quote()}文`,decline:'谢绝或取消本次邀约 · 未完成全退','go-room':`前往${room()?.name||'雅间'} · 等双方就位`,settle:'请温晚验收原客单 · 客款入银行','end-shift':'当面交班 · 任职保留'})[kind]||(kind.startsWith('poem-')?'选诵 '+POEMS[kind.slice(5)]?.name:kind.startsWith('answer-')?'回应：'+POEMS[kind.slice(7)]?.meaning:null);
  if(!action)return null;
  const remote=kind==='work-view'||kind==='decline',inRoom=kind==='go-room'||kind.startsWith('poem-')||kind.startsWith('answer-');
  const position=remote?getPlayer()?.root.position.toArray():inRoom?room()?.player:REG;if(!position)return null;
  return {id:'cn-salon-job-'+kind,provider:'china-salon-employment',kind,roleId:ROLE.id,...(inRoom&&o?{visualAnchor:{actorId:o.customerId}}:{}),name:'云来诗词台班',npcName:'温晚',targetKey:'cn-tavern-reception',targetName:'温晚 · 雅集接待',action,position:position.slice(),executionRadius:remote ? .5 : inRoom ? .25 : .45,interactionRadius:remote ? .6 : 1.8,priority:47,visibilityChecked:remote,...(kind==='formal-view'?{registration:{scope:'role',roleId:ROLE.id}}:{}),intentKey:[current.revision,careers.workState().revision,kind,o?.id||'-',o?.stage||'-'].join(':')};
 }
 function resolveIntent(old){const next=intent(old?.kind);return next&&next.provider===old?.provider&&next.intentKey===old.intentKey?next:null;}
 function executeIntent(old){const q=resolveIntent(old);if(!q||!near(getPlayer(),q.position,q.executionRadius)||getMounted()||!q.visibilityChecked&&!canSee(q))return false;
  const kind=q.kind;if(kind==='formal-view'||kind==='work-view'){openRegistration({roleId:ROLE.id,scope:'role'});return true;}
  if(kind==='formal-apply')return formal.apply();if(kind==='formal-review')return formal.review();if(kind==='formal-resign')return formal.resign();if(kind==='accept')return start();if(kind==='end-shift')return endShift();if(kind==='take-invitation')return acceptInvitation();if(kind==='decline')return cancel();if(kind==='settle')return settle();if(kind==='go-room')return true;
  if(kind.startsWith('poem-'))return recite(kind.slice(5));if(kind.startsWith('answer-'))return answer(kind.slice(7));return false;
 }
 function label(){const o=current.order;if(!current.shift)return hired()?'诗词台班未开 · 柳清弦代管':null;
  return !o?'诗词台班 · 自由候客，可练习、休息或交班':({approaching:`${o.customerName}正来当面邀约`,offered:`${o.customerName}想听${POEMS[o.request].meaning} · ${o.fee}文 · 自主接受或谢绝`,escort:`请到${room()?.name}与${o.customerName}会合`,choose:`${o.customerName}想听${POEMS[o.request].meaning} · 请选诗`,reciting:`正在诵读${POEMS[o.poem]?.name} · ${Math.min(8,elapsed).toFixed(0)}/8秒`,discussion:'诵读已完 · 请回应来客对题意的提问',ready:`${o.customerName}评价已记 · ${o.fee}文待入银行`})[o.stage];}
 const workChoices=()=>!current.shift?['accept','formal-resign']:['work-view',...(current.order?.stage==='offered'?['take-invitation']:[]),...(current.order?.stage==='escort'?['go-room']:[]),...(current.order?.stage==='choose'?['poem-river','poem-home']:[]),...(current.order?.stage==='discussion'?['answer-river','answer-home']:[]),...(current.order?.stage==='ready'?['settle']:current.order?['decline']:[]),'end-shift'];
 return {intent,resolveIntent,executeIntent,lifeChoices,invite,update,start,cancel,endShift,settle,prepareCurrencyCommit,atRegistration,formal:{...formal,beginAvailability:()=>({ok:startAvailable()})},
  owns:n=>n?.station.id===current.order?.customerId,onShift:()=>!!current.shift,active:()=>!!current.order,label,workChoices,
  playerAction:()=>current.order?.stage==='reciting'?'read':null,
  playerStation:()=>current.order?.stage==='reciting'?{workTarget:room().actor.map((v,i)=>i===1?v+1.2:v)}:null,
  state:()=>({...copy(current),loadError,lastError,label:label(),progressSeconds:current.order?.stage==='reciting'?Math.min(8,elapsed):0,quote:quote(),latestReview:current.order?.review||copy(current.reviews.at(-1)||null),job:current.shift?{formalRoleId:ROLE.id,stage:'working',completedTasks:current.reviews.length}:null}),
  snapshot:()=>({version:1,layoutVersion:LAYOUT_VERSION,revision:current.revision,orderId:current.order?.id||null,stage:current.order?.stage||null,elapsed,wait}),
  restore:s=>{if(s?.version!==1||s.revision!==current.revision||s.orderId!==(current.order?.id||null)||s.stage!==(current.order?.stage||null))return false;elapsed=Number.isFinite(s.elapsed)?Math.max(0,Math.min(8,s.elapsed)):0;wait=Number.isFinite(s.wait)?Math.max(0,Math.min(220,s.wait)):0;reconciled=false;return true;},
  dispose(){disposed=true;scene.setSalonService(null);if(current.order)salon.ledger.release(current.order.id);}
 };
}
