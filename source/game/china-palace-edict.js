import {captureWorldRuntime,restoreWorldRuntime} from './world-continuity.js';
import {followActorRoute} from './actor-navigation.js';
import {PALACE_EDICT as E} from './china-palace-edict-place.js';
import {createPalaceEdictProps} from './china-palace-edict-props.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),copy=x=>JSON.parse(JSON.stringify(x));
const near=(n,p,r=.075)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.32;
const reverse=p=>p.slice().reverse().map(a=>a.slice()),P=E.points;
// Public front steps, east lane, north crosscourt and the actual two flights.
const HALL_EXIT=[[2,1.415,3],[2,1.415,6],[2,.13,11],[14,.13,11],[13.4,.145,-14]];
const STUDY_PATH=[[13.7,.145,-20.85],[0,.295,-20.85],[0,.815,-22.3],[0,.815,-24.3],[-7.85,.815,-24.3],[-7.85,2.515,-31],[-5.3,2.515,-31],[-5.3,4.215,-24.3],[4,4.215,-24.3],[4,4.215,-26],P.collect];
const STAGES=new Set(['preparing','drafting','await-pickup','scribe-handoff','to-approval','approval','to-seal','seal-place','sealing','seal-pickup','to-recipient','await-recipient','reading','response','recipient-handoff','to-work','file-receipt','to-sweep','sweeping','returning']);
const validAudience=s=>Number.isInteger(s?.lastCompletedDay)&&s.lastCompletedDay>=0&&s.completionId==='cn-morning-audience:'+s.lastCompletedDay;
// A ledger alone cannot restore a handoff. Reject incomplete checkpoints rather
// than leave an active order with no actors/tasks or invent completed work.
function resumable(snapshot){
 const l=snapshot?.ledger,s=snapshot?.runtime,o=s?.order;
 if(snapshot?.version!==1||!l||!s)return false;
 if(!o)return ['waiting','interrupted','completed'].includes(l.outcome);
 if(!STAGES.has(o.stage)||o.id!=='cn-edict-east-shore:'+l.lastDay||o.audienceId!==l.lastReceipt||l.lastReceipt!=='cn-morning-audience:'+l.lastDay)return false;
 if(l.outcome!=='active'&&!(l.outcome==='completed'&&o.stage==='returning'&&l.completedReceipt===l.lastReceipt))return false;
 if(!Array.isArray(s.tasks)||!s.tasks.every(t=>Array.isArray(t)&&t.length===2)||!Array.isArray(s.owned))return false;
 const tasks=new Map(s.tasks),owned=new Set(s.owned),required=['cn-palace-herald'];
 if(['preparing','drafting','await-pickup','scribe-handoff'].includes(o.stage))required.push('cn-calligraphy');
 if(['await-recipient','reading','response','recipient-handoff','to-work','file-receipt','to-sweep','sweeping'].includes(o.stage))required.push('cn-garden');
 return required.every(id=>owned.has(id)&&Array.isArray(tasks.get(id)?.path)&&tasks.get(id).path.length>0);
}

// Consumed receipts never auto-replay. An unfinished legacy order can only be
// reissued after the court's physical inquiry, using the same document identity.
export function createEdictLedger(saved={}){
 let lastDay=Number.isInteger(saved.lastDay)?saved.lastDay:-1,lastReceipt=saved.lastReceipt||null,outcome=saved.outcome==='active'&&!saved.preservePhysical?'interrupted':saved.outcome||'waiting',completedReceipt=saved.completedReceipt||null,consumedThroughDay=Math.max(lastDay,Number.isInteger(saved.consumedThroughDay)?saved.consumedThroughDay:-1);
 const identity=()=>({id:'cn-edict-east-shore:'+lastDay,audienceId:lastReceipt,day:lastDay});
 return {
  canBegin(s){return outcome!=='interrupted'&&validAudience(s)&&s.lastCompletedDay>consumedThroughDay;},
  begin(s){if(!this.canBegin(s))return null;lastDay=s.lastCompletedDay;consumedThroughDay=lastDay;lastReceipt=s.completionId;outcome='active';return identity();},
  reissue(documentId,audience){if(outcome!=='interrupted'||lastDay<0||lastReceipt!=='cn-morning-audience:'+lastDay||documentId!==identity().id)return null;outcome='active';if(validAudience(audience))consumedThroughDay=Math.max(consumedThroughDay,audience.lastCompletedDay);return identity();},
  finish(done){if(outcome!=='active')return false;outcome=done?'completed':'interrupted';if(done)completedReceipt=lastReceipt;return true;},
  snapshot:()=>({version:1,lastDay,lastReceipt,outcome,completedReceipt,consumedThroughDay})
 };
}

export function createChinaPalaceEdict({npcs,lot,audience,palace,doors,planPath,moveActor,poseContext,saved={},saveState=()=>{},notify=()=>{}}){
 if(saved.continuity?.version===1)saved={...saved,...saved.continuity.ledger,preservePhysical:resumable(saved.continuity)};
 const herald=npcs.find(n=>n.station.id===E.herald.id),scribe=npcs.find(n=>n.station.id==='cn-calligraphy'),recipient=npcs.find(n=>n.station.id==='cn-garden'),emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!herald||!scribe||!recipient||!emperor||!palace||!audience)return null;
 const actors={herald,scribe,recipient},owned=new Set([herald]),tasks=new Map(),leases=new Map(),ledger=createEdictLedger(saved),props=createPalaceEdictProps(lot.group),history=[],failures=[];
 let time=0,phaseTime=0,order=null,state={},disposed=false,speaker=null,utterance='',borrower=null,borrowUntil=0;
 const persist=()=>saveState(ledger.snapshot());
 const record=(event,n)=>{history.push({event,documentId:order?.id||null,audienceId:order?.audienceId||null,actor:n?.station.id||null,time:+time.toFixed(2),position:n?.root.position.toArray()});if(history.length>72)history.shift();};
 const tell=(n,text)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=text;};
 const paused=n=>state.conversationActorId===n.station.id||state.performing===n.station.id;
 const face=(n,p)=>{n.root.rotation.y=Math.atan2(p[0]-n.root.position.x,p[2]-n.root.position.z);};
 function claim(n){if(owned.has(n))return;owned.add(n);leases.set(n,time);n.route=[];}
 function release(n){if(n===herald)return;owned.delete(n);tasks.delete(n);n.route=[];n.walking=false;n.breakAt+=(time-(leases.get(n)||time));leases.delete(n);if(n.poseContext){n.poseContext.handoff=false;n.poseContext.receptionWriting=false;}tell(n,n.station.npcLabel);}
 function say(n,text){speaker=n;utterance=text;tell(n,text);record('speech:'+text,n);if(n===emperor)palace.setDutyLine(E.owner,text);const p=state.position;if(p&&Math.abs(p.y-n.root.position.y)<2&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<19)notify(n.station.npcName+'：'+text);}
 function enter(stage){order.stage=stage;phaseTime=0;speaker=null;utterance='';palace.setDutyLine(E.owner,null);record(stage);}
 function task(n,id,path,label){tasks.set(n,{id,path,index:0,arrived:false,planned:false,stalled:0,retries:0,label});n.route=[];record(id,n);}
 function travel(n,s,dt){
  if(s.arrived)return true;const target=s.path[s.index];
  if(near(n,target)){
   n.route=[];s.planned=false;s.retries=0;if(++s.index===s.path.length){s.arrived=true;record(s.id+':arrived',n);return true;}return false;
  }
  if(!s.planned){n.route=planPath(n.root.position,point(target),.25);s.planned=true;}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:state.position,speedScale:.78});
  s.stalled=n.walking||step.waiting?0:s.stalled+dt;if(s.stalled>4){s.stalled=0;s.planned=false;if(++s.retries===3){failures.push({actor:n.station.id,stage:s.id,target,position:n.root.position.toArray()});if(failures.length>8)failures.shift();}}
  return false;
 }
 const arrived=n=>!!tasks.get(n)?.arrived;
 function animate(n,t){
  const c=poseContext(n,null),stage=order?.stage;let action=null,target=null;
  c.heldProp=null;c.seatedMeal=false;c.handoff=!!order&&(n===herald&&['herald','transfer'].includes(order.holder)||n===recipient&&order.holder==='recipient'||stage==='scribe-handoff'&&n===scribe||stage==='recipient-handoff'&&n===recipient);
  if(!paused(n)&&!n.walking){
   if(n===scribe&&stage==='drafting'){action='calligraphy';target=P.draft;}
   if(n===herald&&stage==='sealing'){action='tidy';target=P.seal;}
   if(n===recipient&&stage==='sweeping'){action='tidy';target=[10,1.10,-15.2];}
   if(n===herald&&stage==='reading')c.handoff=true;
  }
  c.receptionWriting=action==='calligraphy';c.workHeight=target?(target[1]-n.root.position.y)/(n.characterScale||1):undefined;c.workDistance=target?Math.hypot(target[0]-n.root.position.x,target[2]-n.root.position.z)/(n.characterScale||1):undefined;
  if(target)face(n,target);n.animate(t+n.phase,n.walking,action,c);if(action==='tidy'&&n.root.userData.tools?.cloth)n.root.userData.tools.cloth.visible=false;
 }
 function prepare(data,reissued=false){if(!data)return false;order={...data,title:E.title,stage:'preparing',holder:'scribe-desk',sealed:false,reissued,claims:{scribe:scribe.station.id,herald:herald.station.id,recipient:null},rooms:[]};phaseTime=0;speaker=null;utterance='';claim(scribe);task(scribe,'return-writing-desk',[scribe.home.toArray()],reissued?'奉查问补拟荷庭东岸清扫令':'回书案拟定荷庭清扫令');task(herald,'collect-draft',[...HALL_EXIT,...STUDY_PATH],'沿公共楼梯前往书画室取稿');record(reissued?'reissued-after-inquiry':'begin');persist();return true;}
 persist();
 return {
  owns:n=>owned.has(n),socialStatus:n=>owned.has(n)?{busy:false,attention:true,job:n===speaker?utterance:tasks.get(n)?.label||'在传令案前候命'}:null,
  // Only the original idle herald may be lent. Wen, Bo and an unfinished
  // decree remain under this controller, including after a cancelled loan.
  heraldAvailability(owner){const a=(audience.courtStatus?.()||audience.state()),l=ledger.snapshot();return disposed?{ok:false,reason:'service-unavailable'}:borrower&&borrower!==owner?{ok:false,reason:'herald-borrowed'}:order||l.outcome==='interrupted'||ledger.canBegin(a.schedule)?{ok:false,reason:'edict-unfinished'}:a.phase!=='waiting'?{ok:false,reason:'court-busy'}:tasks.has(herald)?{ok:false,reason:'herald-returning'}:paused(herald)?{ok:false,reason:'herald-in-conversation'}:{ok:true,reason:null};},
  borrowHerald(owner){if(!owner||!this.heraldAvailability(owner).ok)return false;if(!borrower){borrower=owner;owned.delete(herald);tasks.delete(herald);herald.route=[];record('herald-loaned:'+owner,herald);}borrowUntil=time+8;return true;},
  releaseHerald(owner){if(borrower!==owner)return false;borrower=null;owned.add(herald);herald.route=[];herald.walking=false;if(herald.poseContext){herald.poseContext.handoff=false;herald.poseContext.receptionWriting=false;}task(herald,'return-after-loan',near(herald,P.sealStand,.2)?[P.sealStand]:[[-16.8,.215,-14.4],[-14.4,.145,-14.4],[-14.4,.115,-10],[-14.4,.115,.4],[-3,.13,11],[2,.13,11],[2,1.415,6],[2,1.415,3],P.sealStand],'文书接待告一段落 · 沿公共通道回传令案');record('herald-returned:'+owner,herald);return true;},
  borrowedHerald:owner=>borrower===owner,
  animateBorrowedSeal(owner,phase,elapsed){if(borrower!==owner)return false;props.animateBorrowedSeal(herald,phase,elapsed);return true;},
  reissueInterrupted(documentId){if(disposed||order||borrower)return false;return prepare(ledger.reissue(documentId,(audience.courtStatus?.()||audience.state()).schedule),true);},
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=dt;
   if(borrower&&time>borrowUntil)this.releaseHerald(borrower);
   if(!borrower&&!order&&arrived(herald)){const returning=tasks.get(herald);returning.settleElapsed=(returning.settleElapsed||0)+dt;if(returning.settleElapsed>=1.3)tasks.delete(herald);}
   const a=(audience.courtStatus?.()||audience.state());if(!borrower&&!order&&!tasks.has(herald)&&a.phase==='waiting'&&a.schedule.outcome==='completed'&&ledger.canBegin(a.schedule)&&!paused(scribe)&&!paused(recipient))prepare(ledger.begin(a.schedule));
   for(const n of owned){n.walking=false;const s=tasks.get(n);tell(n,n===speaker?utterance:s?.label||'在传令案前候命');if(!paused(n)&&s)travel(n,s,dt);}
   const stage=order?.stage,halt=!!order&&[...owned].some(paused)||state.conversationActorId===emperor.station.id;
   if(order&&!halt){
    const advanceAfter=(seconds,next)=>{phaseTime+=dt;if(phaseTime>=seconds){enter(next);return true;}return false;};
    if(stage==='preparing'&&arrived(scribe)){enter('drafting');say(scribe,order.reissued?'奉旨补办旧清扫令，重新拟稿呈陛下核准，待实作完成再留回执。':'据今日朝议，拟一纸荷庭清扫令，交陛下核准。');}
    else if(stage==='drafting'&&advanceAfter(5,'await-pickup'))tell(scribe,'清扫令初稿已写好 · 等沈序来取');
    else if(stage==='await-pickup'&&arrived(herald)&&arrived(scribe)){enter('scribe-handoff');order.holder='transfer';face(scribe,P.collect);face(herald,P.scribe);say(scribe,'沈序，请将这份原稿呈陛下核准。');}
    else if(stage==='scribe-handoff'&&advanceAfter(2,'to-approval')){order.holder='herald';order.claims.scribe=null;record('draft-received',herald);release(scribe);task(herald,'carry-draft-to-emperor',[...reverse(STUDY_PATH).slice(1,-1),[-13.7,.145,-20.85],[-13.7,.145,-14.5],P.approve],'携同一份原稿下楼 · 到公共听候处请准');palace.requestDuty(E.owner,{kind:'edict-review'});}
    else if(stage==='to-approval'){
     if(!palace.dutyState(E.owner))palace.requestDuty(E.owner,{kind:'edict-review'});
     if(arrived(herald)&&palace.dutyState(E.owner)?.ready){enter('approval');face(herald,emperor.root.position.toArray());say(emperor,'准。照此清扫东岸，收好落叶，留宽路给往来的人。');}
    }else if(stage==='approval'&&palace.dutyState(E.owner)?.ready&&advanceAfter(4,'to-seal')){order.approvedBy=emperor.station.id;record('approved',emperor);palace.releaseDuty(E.owner);task(herald,'carry-approved-draft',[[-14.4,.115,-10],[-14.4,.115,.4],[-8,.13,11],[2,.13,11],[2,1.415,6],[2,1.415,3],P.sealStand],'奉准回东侧传令案用印');}
    else if(stage==='to-seal'&&arrived(herald)){enter('seal-place');face(herald,P.seal);}
    else if(stage==='seal-place'&&advanceAfter(1.2,'sealing'))order.holder='seal-stand';
    else if(stage==='sealing'&&advanceAfter(2.2,'seal-pickup')){order.sealed=true;record('sealed',herald);}
    else if(stage==='seal-pickup'&&advanceAfter(1.2,'to-recipient')){order.holder='herald';task(herald,'carry-sealed-edict',[...HALL_EXIT,P.read],'持已用印原令前往荷庭东岸');}
    else if(stage==='to-recipient'&&arrived(herald)&&!paused(recipient)){claim(recipient);order.claims.recipient=recipient.station.id;task(recipient,'receive-at-east-shore',[[0,.295,-14.3],[10,.145,-14],P.recipient],'Bo 到荷庭东岸听令');enter('await-recipient');}
    else if(stage==='await-recipient'&&arrived(recipient)){enter('reading');face(herald,P.recipient);face(recipient,P.read);say(herald,E.title+'：'+E.text);}
    else if(stage==='reading'&&advanceAfter(6,'response'))say(recipient,'领会。现在就把东岸落叶扫进竹筐，清出这段行路。');
    else if(stage==='response'&&advanceAfter(3,'recipient-handoff'))order.holder='transfer';
    else if(stage==='recipient-handoff'&&advanceAfter(1.3,'to-work')){order.holder='recipient';record('edict-received',recipient);task(herald,'stand-clear-of-work',[[12.6,.145,-14]],'交令后退到侧旁 · 留出竹筐前工作通道');task(recipient,'walk-to-receipt-basket',[P.file],'Bo 携同号令到竹筐边留存');}
    else if(stage==='to-work'&&arrived(recipient)){enter('file-receipt');face(recipient,P.basket);}
    else if(stage==='file-receipt'&&advanceAfter(1.2,'to-sweep')){order.holder='basket';task(recipient,'walk-to-leaves',[P.work],'按令实作 · 到落叶边取帚清扫');}
    else if(stage==='to-sweep'&&arrived(recipient)){enter('sweeping');tell(recipient,'按令实作 · 把东岸落叶扫进竹筐');}
    else if(stage==='sweeping'&&advanceAfter(7,'returning')){ledger.finish(true);order.claims={scribe:null,herald:null,recipient:null};record('east-shore-cleaned',recipient);say(recipient,'东岸落叶已入筐，这段路清好了。');task(recipient,'return-garden-post',[[10,.145,-14],[0,.295,-14.3],recipient.home.toArray()],'清扫完成 · 沿荷桥返岗');task(herald,'return-seal-stand',[[13.4,.145,-14],...reverse(HALL_EXIT).slice(1),P.sealStand],'传达已办结 · 回传令案');persist();}
    else if(stage==='returning'){if(owned.has(recipient)&&arrived(recipient))release(recipient);if(arrived(herald)&&!owned.has(recipient)){record('closed');order=null;tasks.delete(herald);speaker=null;utterance='';}}
   }
   for(const n of owned)animate(n,t);props.update(order,actors,phaseTime,!order&&ledger.snapshot().outcome==='completed',halt);
  },
  snapshot:()=>({version:1,ledger:ledger.snapshot(),runtime:captureWorldRuntime({time,phaseTime,order,speakerId:speaker?.station.id||null,utterance,history,owned:[...owned].map(n=>n.station.id),leases:[...leases].map(([n,t])=>[n.station.id,t]),tasks:[...tasks].map(([n,s])=>[n.station.id,s])})}),
  restore(snapshot){if(!resumable(snapshot))return false;const s=restoreWorldRuntime(snapshot.runtime,{npcs});time=Math.max(0,s.time||0);phaseTime=Math.max(0,s.phaseTime||0);borrower=null;borrowUntil=0;order=s.order;speaker=npcs.find(n=>n.station.id===s.speakerId)||null;utterance=s.utterance||'';history.splice(0,history.length,...(s.history||[]));owned.clear();owned.add(herald);for(const id of s.owned||[]){const n=npcs.find(n=>n.station.id===id);if(n&&[herald,scribe,recipient].includes(n))owned.add(n);}leases.clear();for(const[id,t]of s.leases||[]){const n=npcs.find(n=>n.station.id===id);if(owned.has(n))leases.set(n,t);}tasks.clear();for(const[id,t]of s.tasks||[]){const n=npcs.find(n=>n.station.id===id);if(owned.has(n)){tasks.set(n,{...t,planned:false,stalled:0});n.route=[];}}if(speaker===emperor)palace.setDutyLine(E.owner,utterance);props.update(order,actors,phaseTime,!order&&ledger.snapshot().outcome==='completed',false);return true;},
  state:()=>({time,phaseTime,heraldBorrower:borrower,order:order?copy(order):null,ledger:ledger.snapshot(),speaker:speaker?.station.id||null,utterance,history:copy(history),failures:copy(failures),props:props.state(),actors:[...owned].map(n=>({id:n.station.id,position:n.root.position.toArray(),stage:tasks.get(n)?.id||'waiting',waypoint:tasks.get(n)?.index||0,arrived:arrived(n),walking:n.walking,paused:paused(n)})),rewards:false}),
  dispose({suspend=false}={}){if(disposed)return;disposed=true;if(order&&!suspend){ledger.finish(false);persist();}if(!suspend)palace.releaseDuty(E.owner);palace.setDutyLine(E.owner,null);for(const n of[...owned]){n.route=[];n.walking=false;release(n);}owned.clear();tasks.clear();props.dispose();}
 };
}
