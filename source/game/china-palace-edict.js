import {captureWorldRuntime,restoreWorldRuntime} from './world-continuity.js';
import {followActorRoute} from './actor-navigation.js';
import {PALACE_EDICT as E} from './china-palace-edict-place.js';
import {createPalaceEdictProps} from './china-palace-edict-props.js';
import {PALACE_GARDEN_ROLE as GARDEN_ROLE} from './china-palace-garden-role.js';
import {PALACE_SCRIBE_ROLE as SCRIBE_ROLE} from './china-palace-scribe-role.js';
import {PALACE_HERALD_ROLE as HERALD_ROLE} from './china-palace-herald-role.js';
import {heraldContract,deliveryBase,validDeliveryCheckpoint} from './china-palace-herald-proof.js';
import {personId} from './china-tavern-role.js';
import {createChinaScribePersonalLife} from './china-scribe-personal-life.js';
import {createChinaGardenPersonalLife} from './china-garden-personal-life.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),copy=x=>JSON.parse(JSON.stringify(x));
const near=(n,p,r=.075)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.32;
const reverse=p=>p.slice().reverse().map(a=>a.slice()),P=E.points;
// Public front steps, east lane, north crosscourt and the actual two flights.
const HALL_EXIT=[[2,1.415,3],[2,1.415,6],[2,.13,11],[14,.13,11],[13.4,.145,-14]];
const STUDY_PATH=[[13.7,.145,-20.85],[0,.295,-20.85],[0,.815,-22.3],[0,.815,-24.3],[-7.85,.815,-24.3],[-7.85,2.515,-31],[-5.3,2.515,-31],[-5.3,4.215,-24.3],[4,4.215,-24.3],[4,4.215,-26],P.collect];
const STAGES=new Set(['preparing','drafting','await-pickup','scribe-handoff','to-approval','approval','to-seal','seal-place','sealing','seal-pickup','to-recipient','await-recipient','reading','response','recipient-handoff','to-work','file-receipt','to-sweep','sweeping','returning']);
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function matchesContract(value,identity,actorId,revision){
 const expected={kind:'npc-edict-piecework',version:1,actorId,roleId:GARDEN_ROLE.id,slotId:GARDEN_ROLE.slotId,holderRevision:revision,documentId:identity.id,audienceId:identity.audienceId,day:identity.day,amount:GARDEN_ROLE.amount,contractVersion:GARDEN_ROLE.contractVersion,steps:{received:false,filed:false,sweepSeconds:0}};
 return same(value,expected);
}
function validWorkCheckpoint(l,s,o){
 if(o.piecework==null)return l.pieceworkContract==null;
 const who=s.recipientId||'cn-garden',revision=s.holderRevision??0;
 if(o.recipientId!==who||o.holderRevision!==revision||!matchesContract(l.pieceworkContract,o,who,revision))return false;
 const proof=o.piecework,steps=proof.steps,base={...proof,steps:{received:false,filed:false,sweepSeconds:0}};
 if(!same(base,l.pieceworkContract)||!steps||Object.keys(steps).length!==3)return false;
 const received=['to-work','file-receipt','to-sweep','sweeping','returning'].includes(o.stage),filed=['to-sweep','sweeping','returning'].includes(o.stage),sweep=o.stage==='returning'?7:o.stage==='sweeping'?Math.min(7,s.phaseTime):0;
 return steps.received===received&&steps.filed===filed&&Number.isFinite(sweep)&&sweep>=0&&steps.sweepSeconds===sweep;
}
function scribeContract(identity,actorId,revision){return {kind:'npc-edict-draft-piecework',version:1,actorId,roleId:SCRIBE_ROLE.id,slotId:SCRIBE_ROLE.slotId,holderRevision:revision,documentId:identity.id,audienceId:identity.audienceId,day:identity.day,amount:SCRIBE_ROLE.amount,contractVersion:SCRIBE_ROLE.contractVersion,steps:{draftSeconds:0,handoffSeconds:0}};}
function validScribeCheckpoint(l,s,o){
 if(o.scribePiecework==null)return l.scribeContract==null;
 const who=s.scribeId||'cn-calligraphy',revision=s.scribeRevision??0,p=o.scribePiecework;
 if(o.scribeId!==who||o.scribeRevision!==revision||!same(l.scribeContract,scribeContract(o,who,revision)))return false;
 if(!same({...p,steps:{draftSeconds:0,handoffSeconds:0}},l.scribeContract)||!p.steps||Object.keys(p.steps).length!==2)return false;
 if(['preparing','drafting','await-pickup'].includes(o.stage)&&o.holder!=='scribe-desk'||o.stage==='scribe-handoff'&&o.holder!=='transfer')return false;
 const drafted=!['preparing','drafting'].includes(o.stage),handed=!['preparing','drafting','await-pickup','scribe-handoff'].includes(o.stage);
 return p.steps.draftSeconds===(drafted?5:o.stage==='drafting'?Math.min(5,s.phaseTime):0)&&p.steps.handoffSeconds===(handed?2:o.stage==='scribe-handoff'?Math.min(2,s.phaseTime):0);
}
const validAudience=s=>Number.isInteger(s?.lastCompletedDay)&&s.lastCompletedDay>=0&&s.completionId==='cn-morning-audience:'+s.lastCompletedDay;
// A ledger alone cannot restore a handoff. Reject incomplete checkpoints rather
// than leave an active order with no actors/tasks or invent completed work.
function resumable(snapshot){
 const l=snapshot?.ledger,s=snapshot?.runtime,o=s?.order;
 if(snapshot?.version!==1||!l||!s)return false;
 if(!o)return ['waiting','interrupted','completed'].includes(l.outcome);
 if(!validWorkCheckpoint(l,s,o)||!validScribeCheckpoint(l,s,o)||!validDeliveryCheckpoint(l,s,o)||!STAGES.has(o.stage)||o.id!=='cn-edict-east-shore:'+l.lastDay||o.audienceId!==l.lastReceipt||l.lastReceipt!=='cn-morning-audience:'+l.lastDay)return false;
 if(l.outcome!=='active'&&!(l.outcome==='completed'&&o.stage==='returning'&&l.completedReceipt===l.lastReceipt))return false;
 if(!Array.isArray(s.tasks)||!s.tasks.every(t=>Array.isArray(t)&&t.length===2)||!Array.isArray(s.owned))return false;
 const tasks=new Map(s.tasks),owned=new Set(s.owned),required=[s.heraldId||'cn-palace-herald'];
 if(['preparing','drafting','await-pickup','scribe-handoff'].includes(o.stage))required.push(s.scribeId||'cn-calligraphy');
 if(['await-recipient','reading','response','recipient-handoff','to-work','file-receipt','to-sweep','sweeping'].includes(o.stage))required.push(s.recipientId||'cn-garden');
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

export function createChinaPalaceEdict({npcs,lot,audience,palace,doors,planPath,moveActor,poseContext,resolveGardenAssignment=null,canControlGarden=n=>n?.alive!==false,pieceworkAccounts=null,mealFunds=null,resolveScribeAssignment=null,canControlScribe=n=>n?.alive!==false,scribeAccounts=null,resolveHeraldAssignment=null,canControlHerald=n=>n?.alive!==false,heraldAccounts=null,getPlayer=()=>null,sharedNeeds=null,getTavern=()=>null,getToilet=()=>null,enablePersonalNeeds=false,savedPersonalNeeds=null,savePersonalNeeds=()=>false,enableScribeNeeds=false,savedScribeNeeds=null,saveScribeNeeds=()=>false,saved={},saveState=()=>{},notify=()=>{}}){
 if(saved.continuity?.version===1)saved={...saved,...saved.continuity.ledger,preservePhysical:resumable(saved.continuity)};
 const originalHerald=npcs.find(n=>n.station.id===E.herald.id),originalScribe=npcs.find(n=>n.station.id==='cn-calligraphy'),originalRecipient=npcs.find(n=>n.station.id==='cn-garden'),emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!originalHerald||!originalScribe||!originalRecipient||!emperor||!palace||!audience)return null;
 let herald=npcs.find(n=>personId(n)===(saved.continuity?.runtime?.heraldId||saved.heraldContract?.actorId))||originalHerald,heraldRevision=saved.continuity?.runtime?.heraldRevision??saved.heraldContract?.holderRevision??0;
 let scribe=npcs.find(n=>personId(n)===(saved.continuity?.runtime?.scribeId||saved.scribeContract?.actorId))||originalScribe,scribeRevision=saved.continuity?.runtime?.scribeRevision??saved.scribeContract?.holderRevision??0;
 let recipient=npcs.find(n=>personId(n)===saved.continuity?.runtime?.recipientId)||originalRecipient,boundRevision=saved.continuity?.runtime?.holderRevision??0;
 const scribeHome=originalScribe.home.toArray(),gardenHome=originalRecipient.home.toArray(),actors={herald,scribe,recipient},owned=new Set([herald]),tasks=new Map(),leases=new Map(),props=createPalaceEdictProps(lot.group),history=[],failures=[];
 let ledger=createEdictLedger(saved),contract=saved.pieceworkContract||null,draftContract=saved.scribeContract||null,deliveryContract=saved.heraldContract||null,time=0,phaseTime=0,order=null,state={},disposed=false,speaker=null,utterance='',borrower=null,borrowUntil=0,personalLife=null,scribeLife=null;
 const persist=()=>{try{const r=saveState({...ledger.snapshot(),pieceworkContract:contract,scribeContract:draftContract,heraldContract:deliveryContract});return r!==false&&r?.ok!==false&&!r?.then;}catch{return false;}};
 const assignment=()=>resolveGardenAssignment?.()||{status:'npc',actor:recipient,holderId:personId(recipient),revision:boundRevision,alive:recipient.alive!==false,available:true};
 const available=()=>{const a=assignment();return a.status==='npc'&&a.actor===recipient&&a.holderId===personId(recipient)&&a.revision===boundRevision&&a.alive&&a.available&&canControlGarden(recipient)&&recipient.alive!==false;};
 const scribeAssignment=()=>resolveScribeAssignment?.()||{status:'npc',actor:scribe,holderId:personId(scribe),revision:scribeRevision,alive:scribe.alive!==false,available:true};
 const scribeAvailable=()=>{const a=scribeAssignment();return a.status==='npc'&&a.actor===scribe&&a.holderId===personId(scribe)&&a.revision===scribeRevision&&a.alive&&a.available&&scribe!==getPlayer()&&canControlScribe(scribe)&&scribe.alive!==false;};
 const heraldAssignment=()=>resolveHeraldAssignment?.()||{status:'npc',actor:herald,holderId:personId(herald),revision:heraldRevision,alive:herald.alive!==false,available:true};
 const heraldAvailable=()=>{const a=heraldAssignment();return a.status==='npc'&&a.actor===herald&&a.holderId===personId(herald)&&a.revision===heraldRevision&&a.alive&&a.available&&herald!==getPlayer()&&canControlHerald(herald)&&herald.alive!==false;};
 const freshDelivery=data=>heraldContract(data,personId(herald),heraldRevision,personId(scribe),scribeRevision,personId(recipient),boundRevision,personId(emperor));
 const originalActorsReady=()=>emperor.alive!==false&&heraldAvailable()&&scribeAvailable();
 const named=()=>recipient.station.npcName||personId(recipient);
 const freshContract=data=>pieceworkAccounts&&available()?{kind:'npc-edict-piecework',version:1,actorId:personId(recipient),roleId:GARDEN_ROLE.id,slotId:GARDEN_ROLE.slotId,holderRevision:boundRevision,documentId:data.id,audienceId:data.audienceId,day:data.day,amount:GARDEN_ROLE.amount,contractVersion:GARDEN_ROLE.contractVersion,steps:{received:false,filed:false,sweepSeconds:0}}:null;
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
 function prepare(data,reissued=false){if(!data)return false;if(!reissued){contract=freshContract(data);draftContract=scribeAccounts&&scribeAvailable()?scribeContract(data,personId(scribe),scribeRevision):null;deliveryContract=heraldAccounts&&heraldAvailable()?freshDelivery(data):null;}order={...data,title:E.title,stage:'preparing',holder:'scribe-desk',sealed:false,reissued,contractPersisted:true,piecework:contract?copy(contract):null,scribePiecework:draftContract?copy(draftContract):null,heraldPiecework:deliveryContract?copy(deliveryContract):null,heraldId:personId(herald),heraldRevision,scribeId:personId(scribe),scribeRevision,recipientId:personId(recipient),holderRevision:boundRevision,claims:{scribe:scribe.station.id,herald:herald.station.id,recipient:null},rooms:[]};phaseTime=0;speaker=null;utterance='';claim(scribe);task(scribe,'return-writing-desk',[scribeHome],reissued?'奉查问补拟荷庭东岸清扫令':'回书案拟定荷庭清扫令');task(herald,'collect-draft',[...HALL_EXIT,...STUDY_PATH],'沿公共楼梯前往书画室取稿');record(reissued?'reissued-after-inquiry':'begin');if(!persist())order.contractPersisted=false;return true;}
 if(enablePersonalNeeds&&pieceworkAccounts&&sharedNeeds)personalLife=createChinaGardenPersonalLife({npcs,getHolder:()=>recipient,getHome:()=>gardenHome,canStart:n=>!order&&!owned.has(n)&&!paused(n)&&(n!==recipient||available()),canControl:n=>canControlGarden(n)&&!paused(n),economy:pieceworkAccounts,mealFunds:mealFunds||pieceworkAccounts,sharedNeeds,getTavern,getToilet,getPlayer,doors,planPath,moveActor,poseContext,saved:saved.continuity?.personalLife||savedPersonalNeeds,saveState:savePersonalNeeds});
 if(enableScribeNeeds&&scribeAccounts&&sharedNeeds)scribeLife=createChinaScribePersonalLife({npcs,getHolder:()=>scribe,getHome:()=>scribeHome,canStart:n=>!order&&!owned.has(n)&&!paused(n)&&(n!==scribe||scribeAvailable()),canControl:n=>canControlScribe(n)&&!paused(n),economy:scribeAccounts,mealFunds:mealFunds||scribeAccounts,sharedNeeds,getTavern,getToilet,getPlayer,doors,planPath,moveActor,poseContext,saved:saved.continuity?.scribeLife||savedScribeNeeds,saveState:saveScribeNeeds});
 persist();
 return {
  reservesGardenPerson:n=>n===recipient&&!!order,
  reservesScribePerson:n=>n===scribe&&!!order,
  scribeBinding:()=>({actorId:personId(scribe),holderRevision:scribeRevision,available:scribeAvailable()}),
  scribeHandoffBoundary:()=>({ok:!order&&!borrower&&ledger.snapshot().outcome!=='interrupted'&&!owned.has(scribe)&&!scribeLife?.blocks()&&near(scribe,scribeHome,.2),blockers:order?[{kind:'original-edict-unfinished'}]:[]}),
  bindScribeAssignment(){const a=scribeAssignment();if(order||ledger.snapshot().outcome==='interrupted'||borrower||scribeLife?.blocks())return {ok:false,code:'original-edict-unfinished'};if(a.status!=='npc'||!a.alive||!a.available||!a.actor||!canControlScribe(a.actor)||a.holderId==='player'||[herald,recipient,emperor].includes(a.actor))return {ok:false,code:'scribe-holder-unavailable'};if(a.actor===scribe&&a.revision===scribeRevision)return {ok:true,replayed:true};if(owned.has(scribe))return {ok:false,code:'scribe-return-pending'};scribe=a.actor;actors.scribe=scribe;scribeRevision=a.revision;claim(scribe);task(scribe,'arrive-scribe-assignment',[scribeHome],'沿原公共通道到原拟稿书案');persist();return {ok:true};},
  resolveHeraldActor:()=>herald.alive!==false?herald:null,
  heraldBinding:()=>({actorId:personId(herald),holderRevision:heraldRevision,available:heraldAvailable()}),
  reservesHeraldPerson:n=>n===herald&&(!!order||!!borrower||tasks.has(herald)||ledger.snapshot().outcome==='interrupted'),
  heraldHandoffBoundary:()=>({ok:!order&&!borrower&&!tasks.has(herald)&&ledger.snapshot().outcome!=='interrupted'&&!paused(herald)&&near(herald,P.sealStand,.2),blockers:order?[{kind:'original-edict-unfinished'}]:[]}),
  bindHeraldAssignment(){const a=heraldAssignment();if(a.actor===herald&&a.revision===heraldRevision)return {ok:true,replayed:true};if(!this.heraldHandoffBoundary().ok)return {ok:false,code:'herald-duty-unfinished'};if(a.status!=='npc'||!a.alive||!a.available||!a.actor||!canControlHerald(a.actor)||a.holderId==='player'||[scribe,recipient,emperor].includes(a.actor))return {ok:false,code:'herald-holder-unavailable'};owned.delete(herald);tasks.delete(herald);herald=a.actor;actors.herald=herald;heraldRevision=a.revision;owned.add(herald);task(herald,'arrive-herald-assignment',[P.sealStand],'沿原公共通道到传令案');persist();return {ok:true};},
  canBorrowMeal:id=>personalLife?.canBorrowMeal(id)||scribeLife?.canBorrowMeal(id)||false,personalNeedsState:()=>personalLife?.state()||null,scribeNeedsState:()=>scribeLife?.state()||null,
  gardenBinding:()=>({actorId:personId(recipient),holderRevision:boundRevision,available:available()}),
  gardenHandoffBoundary:()=>({ok:!order&&!borrower&&ledger.snapshot().outcome!=='interrupted'&&!owned.has(recipient)&&!personalLife?.blocks()&&near(recipient,gardenHome,.2),blockers:order?[{kind:'original-edict-unfinished'}]:[]}),
  bindGardenAssignment(){const a=assignment();if(order||ledger.snapshot().outcome==='interrupted'||borrower||personalLife?.blocks())return {ok:false,code:'original-edict-unfinished'};if(a.status!=='npc'||!a.alive||!a.available||!a.actor||!canControlGarden(a.actor)||a.holderId==='player'||[herald,scribe,emperor].includes(a.actor))return {ok:false,code:'garden-holder-unavailable'};if(a.actor===recipient&&a.revision===boundRevision)return {ok:true,replayed:true};if(owned.has(recipient))return {ok:false,code:'garden-return-pending'};recipient=a.actor;actors.recipient=recipient;boundRevision=a.revision;claim(recipient);task(recipient,'arrive-garden-assignment',[gardenHome],'沿原公共通道到荷庭清扫岗位');persist();return {ok:true};},
  owns:n=>owned.has(n)||!!personalLife?.owns(n)||!!scribeLife?.owns(n),socialStatus:n=>scribeLife?.owns(n)?{busy:true,canPause:false,attention:false,job:scribeLife.label()}:personalLife?.owns(n)?{busy:true,canPause:false,attention:false,job:personalLife.label()}:owned.has(n)?{busy:!!order,canPause:!order,attention:!order,job:n===speaker?utterance:tasks.get(n)?.label||'在传令案前候命'}:null,
  // Only the original idle herald may be lent. Wen, Bo and an unfinished
  // decree remain under this controller, including after a cancelled loan.
  heraldAvailability(owner){const a=(audience.courtStatus?.()||audience.state()),l=ledger.snapshot();return disposed||!heraldAvailable()?{ok:false,reason:'service-unavailable'}:borrower&&borrower!==owner?{ok:false,reason:'herald-borrowed'}:order||l.outcome==='interrupted'||ledger.canBegin(a.schedule)?{ok:false,reason:'edict-unfinished'}:a.phase!=='waiting'?{ok:false,reason:'court-busy'}:tasks.has(herald)?{ok:false,reason:'herald-returning'}:paused(herald)?{ok:false,reason:'herald-in-conversation'}:{ok:true,reason:null};},
  borrowHerald(owner){if(!owner||!this.heraldAvailability(owner).ok)return false;if(!borrower){borrower=owner;owned.delete(herald);tasks.delete(herald);herald.route=[];record('herald-loaned:'+owner,herald);}borrowUntil=time+8;return true;},
  releaseHerald(owner){if(borrower!==owner)return false;borrower=null;owned.add(herald);herald.route=[];herald.walking=false;if(herald.poseContext){herald.poseContext.handoff=false;herald.poseContext.receptionWriting=false;}task(herald,'return-after-loan',near(herald,P.sealStand,.2)?[P.sealStand]:[[-16.8,.215,-14.4],[-14.4,.145,-14.4],[-14.4,.115,-10],[-14.4,.115,.4],[-3,.13,11],[2,.13,11],[2,1.415,6],[2,1.415,3],P.sealStand],'文书接待告一段落 · 沿公共通道回传令案');record('herald-returned:'+owner,herald);return true;},
  borrowedHerald:owner=>borrower===owner,
  animateBorrowedSeal(owner,phase,elapsed){if(borrower!==owner)return false;props.animateBorrowedSeal(herald,phase,elapsed);return true;},
  reissueInterrupted(documentId){if(disposed||order||borrower||!available()||!originalActorsReady())return false;const l=ledger.snapshot();if(contract&&!matchesContract(contract,{id:documentId,audienceId:l.lastReceipt,day:l.lastDay},personId(recipient),boundRevision))return false;if(draftContract&&!same(draftContract,scribeContract({id:documentId,audienceId:l.lastReceipt,day:l.lastDay},personId(scribe),scribeRevision)))return false;if(deliveryContract&&!same(deliveryContract,freshDelivery({id:documentId,audienceId:l.lastReceipt,day:l.lastDay})))return false;return prepare(ledger.reissue(documentId,(audience.courtStatus?.()||audience.state()).schedule),true);},
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=dt;
   if(order?.contractPersisted===false){order.contractPersisted=true;if(!persist()){order.contractPersisted=false;return;}}
   personalLife?.update(dt,t);scribeLife?.update(dt,t);
   if(!order&&owned.has(scribe)&&arrived(scribe))release(scribe);
   if(!order&&owned.has(recipient)&&arrived(recipient))release(recipient);
   if(borrower&&time>borrowUntil)this.releaseHerald(borrower);
   if(!borrower&&!order&&arrived(herald)){const returning=tasks.get(herald);returning.settleElapsed=(returning.settleElapsed||0)+dt;if(returning.settleElapsed>=1.3)tasks.delete(herald);}
   const a=(audience.courtStatus?.()||audience.state());if(!borrower&&!order&&!tasks.has(herald)&&a.phase==='waiting'&&a.schedule.outcome==='completed'&&ledger.canBegin(a.schedule)&&!owned.has(recipient)&&!personalLife?.blocks()&&!scribeLife?.blocks()&&available()&&originalActorsReady()&&!paused(scribe)&&!paused(recipient))prepare(ledger.begin(a.schedule));
   for(const n of owned){n.walking=false;const s=tasks.get(n);tell(n,n===speaker?utterance:s?.label||'在传令案前候命');if(!paused(n)&&n.alive!==false&&(!order||available()&&originalActorsReady())&&s)travel(n,s,dt);}
   const stage=order?.stage,halt=!!order&&(!available()||!originalActorsReady()||[...owned].some(paused))||state.conversationActorId===emperor.station.id;
   if(order&&!halt){
    const advanceAfter=(seconds,next)=>{phaseTime+=dt;if(phaseTime>=seconds){enter(next);return true;}return false;};
    if(stage==='preparing'&&arrived(scribe)){enter('drafting');say(scribe,order.reissued?'奉旨补办旧清扫令，重新拟稿呈陛下核准，待实作完成再留回执。':'据今日朝议，拟一纸荷庭清扫令，交陛下核准。');}
    else if(stage==='drafting'&&order.holder==='scribe-desk'&&near(scribe,scribeHome,.2)&&arrived(scribe)){phaseTime=Math.min(5,phaseTime+dt);if(order.scribePiecework)order.scribePiecework.steps.draftSeconds=phaseTime;if(phaseTime>=5){enter('await-pickup');tell(scribe,'清扫令初稿已写好 · 等沈序来取');}}
    else if(stage==='await-pickup'&&order.holder==='scribe-desk'&&arrived(herald)&&arrived(scribe)){enter('scribe-handoff');order.holder='transfer';if(order.heraldPiecework)order.heraldPiecework.holder='transfer';face(scribe,P.collect);face(herald,P.scribe);say(scribe,'沈序，请将这份原稿呈陛下核准。');}
    else if(stage==='scribe-handoff'&&order.holder==='transfer'&&near(scribe,scribeHome,.2)&&near(herald,P.collect,.2)&&arrived(scribe)&&arrived(herald)){
     phaseTime=Math.min(2,phaseTime+dt);if(order.scribePiecework)order.scribePiecework.steps.handoffSeconds=phaseTime;if(order.heraldPiecework)order.heraldPiecework.steps.collectedSeconds=phaseTime;
     if(phaseTime>=2){const before=this.snapshot();enter('to-approval');order.holder='herald';if(order.heraldPiecework)order.heraldPiecework.holder='herald';order.claims.scribe=null;record('draft-received',herald);release(scribe);task(herald,'carry-draft-to-emperor',[...reverse(STUDY_PATH).slice(1,-1),[-13.7,.145,-20.85],[-13.7,.145,-14.5],P.approve],'携同一份原稿下楼 · 到公共听候处请准');
      const proof=order.scribePiecework,validProof=!proof||same({...proof,steps:{draftSeconds:0,handoffSeconds:0}},scribeContract(order,personId(scribe),scribeRevision)),paid=proof&&validProof?scribeAccounts?.settle(proof,{chinaEdict:{...ledger.snapshot(),pieceworkContract:contract,scribeContract:draftContract,heraldContract:deliveryContract}}):{ok:!proof&&persist()};
      if(!paid?.ok||paid.replayed&&!persist()){this.restore(before);tell(scribe,'原稿已写就并交付 · 等待原回执入账');}else palace.requestDuty(E.owner,{kind:'edict-review'});
     }
    }
    else if(stage==='to-approval'){
     if(!palace.dutyState(E.owner))palace.requestDuty(E.owner,{kind:'edict-review'});
     if(arrived(herald)&&palace.dutyState(E.owner)?.ready){enter('approval');face(herald,emperor.root.position.toArray());say(emperor,'准。照此清扫东岸，收好落叶，留宽路给往来的人。');}
    }else if(stage==='approval'&&palace.dutyState(E.owner)?.ready){phaseTime=Math.min(4,phaseTime+dt);if(order.heraldPiecework)order.heraldPiecework.steps.approvalSeconds=phaseTime;if(phaseTime>=4){enter('to-seal');order.approvedBy=emperor.station.id;if(order.heraldPiecework)order.heraldPiecework.approvedBy=personId(emperor);record('approved',emperor);palace.releaseDuty(E.owner);task(herald,'carry-approved-draft',[[-14.4,.115,-10],[-14.4,.115,.4],[-8,.13,11],[2,.13,11],[2,1.415,6],[2,1.415,3],P.sealStand],'奉准回东侧传令案用印');}}
    else if(stage==='to-seal'&&arrived(herald)){enter('seal-place');face(herald,P.seal);}
    else if(stage==='seal-place'&&advanceAfter(1.2,'sealing')){order.holder='seal-stand';if(order.heraldPiecework)order.heraldPiecework.holder='seal-stand';}
    else if(stage==='sealing'){phaseTime=Math.min(2.2,phaseTime+dt);if(order.heraldPiecework)order.heraldPiecework.steps.sealedSeconds=phaseTime;if(phaseTime>=2.2){enter('seal-pickup');order.sealed=true;if(order.heraldPiecework)order.heraldPiecework.sealedBy=personId(herald);record('sealed',herald);}}
    else if(stage==='seal-pickup'&&advanceAfter(1.2,'to-recipient')){order.holder='herald';if(order.heraldPiecework)order.heraldPiecework.holder='herald';task(herald,'carry-sealed-edict',[...HALL_EXIT,P.read],'持已用印原令前往荷庭东岸');}
    else if(stage==='to-recipient'&&arrived(herald)&&!paused(recipient)){claim(recipient);order.claims.recipient=recipient.station.id;task(recipient,'receive-at-east-shore',[[0,.295,-14.3],[10,.145,-14],P.recipient],named()+' 到荷庭东岸听令');enter('await-recipient');}
    else if(stage==='await-recipient'&&arrived(recipient)){enter('reading');face(herald,P.recipient);face(recipient,P.read);say(herald,E.title+'：'+E.text.replace('Bo',named()));}
    else if(stage==='reading'){phaseTime=Math.min(6,phaseTime+dt);if(order.heraldPiecework)order.heraldPiecework.steps.readingSeconds=phaseTime;if(phaseTime>=6){enter('response');say(recipient,'领会。现在就把东岸落叶扫进竹筐，清出这段行路。');}}
    else if(stage==='response'){phaseTime=Math.min(3,phaseTime+dt);if(order.heraldPiecework)order.heraldPiecework.steps.responseSeconds=phaseTime;if(phaseTime>=3){enter('recipient-handoff');order.holder='transfer';if(order.heraldPiecework)order.heraldPiecework.holder='transfer';}}
    else if(stage==='recipient-handoff'&&order.holder==='transfer'&&near(herald,P.read,.2)&&near(recipient,P.recipient,.2)&&arrived(herald)&&arrived(recipient)){phaseTime=Math.min(1.3,phaseTime+dt);if(order.heraldPiecework)order.heraldPiecework.steps.handoffSeconds=phaseTime;if(phaseTime>=1.3){const before=this.snapshot();enter('to-work');order.holder='recipient';if(order.heraldPiecework){order.heraldPiecework.holder='recipient';order.heraldPiecework.steps.received=true;}record('edict-received',recipient);if(order.piecework)order.piecework.steps.received=true;task(herald,'stand-clear-of-work',[[12.6,.145,-14]],'交令后退到侧旁 · 留出竹筐前工作通道');task(recipient,'walk-to-receipt-basket',[P.file],named()+' 携同号令到竹筐边留存');const proof=order.heraldPiecework,validProof=!proof||same(deliveryBase(proof),freshDelivery(order)),paid=proof&&validProof?heraldAccounts?.settle(proof,{chinaEdict:{...ledger.snapshot(),pieceworkContract:contract,scribeContract:draftContract,heraldContract:deliveryContract}}):{ok:!proof&&persist()};if(!paid?.ok||paid.replayed&&!persist()){this.restore(before);tell(herald,'原令交付已完成 · 等待原回执入账');}}}
    else if(stage==='to-work'&&arrived(recipient)){enter('file-receipt');face(recipient,P.basket);}
    else if(stage==='file-receipt'&&advanceAfter(1.2,'to-sweep')){order.holder='basket';if(order.piecework)order.piecework.steps.filed=true;task(recipient,'walk-to-leaves',[P.work],'按令实作 · 到落叶边取帚清扫');}
    else if(stage==='to-sweep'&&arrived(recipient)){enter('sweeping');tell(recipient,'按令实作 · 把东岸落叶扫进竹筐');}
    else if(stage==='sweeping'){
     // Every payable second belongs to this frozen, live assignee at the work
     // point. Pauses, re-entry and idle time cannot substitute for sweeping.
     if(near(recipient,P.work,.2)&&arrived(recipient)){phaseTime=Math.min(7,phaseTime+dt);if(order.piecework)order.piecework.steps.sweepSeconds=phaseTime;}
     if(phaseTime>=7){const before=this.snapshot();enter('returning');ledger.finish(true);order.claims={scribe:null,herald:null,recipient:null};record('east-shore-cleaned',recipient);say(recipient,'东岸落叶已入筐，这段路清好了。');task(recipient,'return-garden-post',[[10,.145,-14],[0,.295,-14.3],gardenHome],'清扫完成 · 沿荷桥返岗');task(herald,'return-seal-stand',[[13.4,.145,-14],...reverse(HALL_EXIT).slice(1),P.sealStand],'传达已办结 · 回传令案');
      const proof=order.piecework,validProof=!proof||matchesContract({...proof,steps:{received:false,filed:false,sweepSeconds:0}},order,personId(recipient),boundRevision),paid=proof&&validProof?pieceworkAccounts?.settle(proof,{chinaEdict:{...ledger.snapshot(),pieceworkContract:contract,scribeContract:draftContract,heraldContract:deliveryContract}}):{ok:!proof&&persist()};
      if(!paid?.ok||paid.replayed&&!persist()){this.restore(before);tell(recipient,'清扫实作已完成 · 等待原回执入账');}
     }
    }
    else if(stage==='returning'){if(owned.has(recipient)&&arrived(recipient))release(recipient);if(arrived(herald)&&!owned.has(recipient)){record('closed');order=null;tasks.delete(herald);speaker=null;utterance='';}}
   }
   for(const n of owned)animate(n,t);props.update(order,actors,phaseTime,!order&&ledger.snapshot().outcome==='completed',halt);
  },
  snapshot:()=>({version:1,ledger:{...ledger.snapshot(),pieceworkContract:contract,scribeContract:draftContract,heraldContract:deliveryContract},personalLife:personalLife?.snapshot()||null,scribeLife:scribeLife?.snapshot()||null,runtime:captureWorldRuntime({heraldId:personId(herald),heraldRevision,emperorId:personId(emperor),scribeId:personId(scribe),scribeRevision,recipientId:personId(recipient),holderRevision:boundRevision,time,phaseTime,order,speakerId:speaker?.station.id||null,utterance,history,owned:[...owned].map(n=>n.station.id),leases:[...leases].map(([n,t])=>[n.station.id,t]),tasks:[...tasks].map(([n,s])=>[n.station.id,s])})}),
  restore(snapshot){if(!resumable(snapshot))return false;const s=restoreWorldRuntime(snapshot.runtime,{npcs});const restoredRecipient=npcs.find(n=>personId(n)===(s.recipientId||'cn-garden'));const restoredScribe=npcs.find(n=>personId(n)===(s.scribeId||'cn-calligraphy'));const restoredHerald=npcs.find(n=>personId(n)===(s.heraldId||'cn-palace-herald'));if(!restoredRecipient||!restoredScribe||!restoredHerald)return false;herald=restoredHerald;actors.herald=herald;heraldRevision=s.heraldRevision??0;scribe=restoredScribe;actors.scribe=scribe;scribeRevision=s.scribeRevision??0;recipient=restoredRecipient;actors.recipient=recipient;boundRevision=s.holderRevision??0;ledger=createEdictLedger({...snapshot.ledger,preservePhysical:true});contract=snapshot.ledger.pieceworkContract||null;draftContract=snapshot.ledger.scribeContract||null;deliveryContract=snapshot.ledger.heraldContract||null;time=Math.max(0,s.time||0);phaseTime=Math.max(0,s.phaseTime||0);borrower=null;borrowUntil=0;order=s.order;speaker=npcs.find(n=>n.station.id===s.speakerId)||null;utterance=s.utterance||'';if(snapshot.personalLife)personalLife?.restore(snapshot.personalLife);if(snapshot.scribeLife)scribeLife?.restore(snapshot.scribeLife);history.splice(0,history.length,...(s.history||[]));owned.clear();owned.add(herald);for(const id of s.owned||[]){const n=npcs.find(n=>n.station.id===id);if(n&&[herald,scribe,recipient].includes(n))owned.add(n);}leases.clear();for(const[id,t]of s.leases||[]){const n=npcs.find(n=>n.station.id===id);if(owned.has(n))leases.set(n,t);}tasks.clear();for(const[id,t]of s.tasks||[]){const n=npcs.find(n=>n.station.id===id);if(owned.has(n)){tasks.set(n,{...t,planned:false,stalled:0});n.route=[];}}if(speaker===emperor)palace.setDutyLine(E.owner,utterance);props.update(order,actors,phaseTime,!order&&ledger.snapshot().outcome==='completed',false);return true;},
  state:()=>({time,phaseTime,heraldBorrower:borrower,order:order?copy(order):null,ledger:ledger.snapshot(),speaker:speaker?.station.id||null,utterance,history:copy(history),failures:copy(failures),props:props.state(),actors:[...owned].map(n=>({id:n.station.id,position:n.root.position.toArray(),stage:tasks.get(n)?.id||'waiting',waypoint:tasks.get(n)?.index||0,arrived:arrived(n),walking:n.walking,paused:paused(n)})),rewards:false,piecework:pieceworkAccounts?{role:GARDEN_ROLE.id,amount:GARDEN_ROLE.amount,actorId:personId(recipient),holderRevision:boundRevision,available:available()}:null}),
  dispose({suspend=false}={}){if(disposed)return;disposed=true;personalLife?.dispose({suspend});scribeLife?.dispose({suspend});if(order&&!suspend){ledger.finish(false);persist();}if(!suspend)palace.releaseDuty(E.owner);palace.setDutyLine(E.owner,null);for(const n of[...owned]){n.route=[];n.walking=false;release(n);}owned.clear();tasks.clear();props.dispose();}
 };
}
