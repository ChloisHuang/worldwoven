import {canTraverse} from './navigation.js';
import {PALACE_EDICT as E} from './china-palace-edict-place.js';
import {createPalaceEdictProps} from './china-palace-edict-props.js';

const point=a=>({x:a[0],y:a[1],z:a[2]}),copy=x=>JSON.parse(JSON.stringify(x));
const near=(n,p,r=.075)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.32;
const reverse=p=>p.slice().reverse().map(a=>a.slice()),P=E.points;
// Public front steps, east lane, north crosscourt and the actual two flights.
const HALL_EXIT=[[2,1.415,3],[2,1.415,6],[2,.13,11],[14,.13,11],[13.4,.145,-14]];
const STUDY_PATH=[[13.7,.145,-20.85],[0,.295,-20.85],[0,.815,-22.3],[0,.815,-24.3],[-7.85,.815,-24.3],[-7.85,2.515,-31],[-5.3,2.515,-31],[-5.3,4.215,-24.3],[4,4.215,-24.3],[4,4.215,-26],P.collect];

// A receipt is consumed before actors move. Interrupted work is retired on
// reload/departure, never replayed or granted remote completion/rewards.
export function createEdictLedger(saved={}){
 let lastDay=Number.isInteger(saved.lastDay)?saved.lastDay:-1,lastReceipt=saved.lastReceipt||null,outcome=saved.outcome==='active'?'interrupted':saved.outcome||'waiting',completedReceipt=saved.completedReceipt||null;
 return {
  canBegin(s){return Number.isInteger(s?.lastCompletedDay)&&s.lastCompletedDay>lastDay&&s.completionId==='cn-morning-audience:'+s.lastCompletedDay;},
  begin(s){if(!this.canBegin(s))return null;lastDay=s.lastCompletedDay;lastReceipt=s.completionId;outcome='active';return {id:'cn-edict-east-shore:'+lastDay,audienceId:lastReceipt,day:lastDay};},
  finish(done){if(outcome!=='active')return false;outcome=done?'completed':'interrupted';if(done)completedReceipt=lastReceipt;return true;},
  snapshot:()=>({version:1,lastDay,lastReceipt,outcome,completedReceipt})
 };
}

export function createChinaPalaceEdict({npcs,lot,audience,palace,doors,planPath,moveActor,poseContext,saved={},saveState=()=>{},notify=()=>{}}){
 const herald=npcs.find(n=>n.station.id===E.herald.id),scribe=npcs.find(n=>n.station.id==='cn-calligraphy'),recipient=npcs.find(n=>n.station.id==='cn-garden'),emperor=npcs.find(n=>n.station.id==='cn-emperor');
 if(!herald||!scribe||!recipient||!emperor||!palace||!audience)return null;
 const actors={herald,scribe,recipient},owned=new Set([herald]),tasks=new Map(),leases=new Map(),ledger=createEdictLedger(saved),props=createPalaceEdictProps(lot.group),history=[],failures=[];
 const navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 let time=0,phaseTime=0,order=null,state={},disposed=false,speaker=null,utterance='';
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
 const safety=n=>[...(doors?.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(state.position?[state.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.27,maxX:p.x+.27,minZ:p.z-.27,maxZ:p.z+.27,minY:p.y,maxY:p.y+1.95}:p);
 function travel(n,s,dt){
  if(s.arrived)return true;const target=s.yieldPoint||s.path[s.index];
  if(near(n,target)){
   if(s.yieldPoint){const p=s.yieldTo?.root.position||state.position;if(p&&Math.abs(p.y-n.root.position.y)<.7&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<1.1)return false;s.yieldPoint=null;s.yieldTo=null;s.planned=false;return false;}
   n.route=[];s.planned=false;s.retries=0;if(++s.index===s.path.length){s.arrived=true;record(s.id+':arrived',n);return true;}return false;
  }
  if(!s.planned){n.route=planPath(n.root.position,point(target),.25);s.planned=true;}
  const direct=near(n,target,.45)&&canTraverse(n.root.position,point(target),lot.colliders.concat(safety(n)),navigation),step=direct?{waypoint:point(target)}:doors.routeStep(n.route,n.root.position,.025);
  if(!step.waiting&&step.waypoint){
   const p=step.waypoint,dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz),others=npcs.filter(a=>a!==n).map(a=>({actor:a,position:a.root.position}));if(state.position)others.push({position:state.position});
   const block=others.find(({position:p})=>Math.abs(p.y-n.root.position.y)<.7&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<.74&&(p.x-n.root.position.x)*dx+(p.z-n.root.position.z)*dz>.001&&Math.abs((p.x-n.root.position.x)*dz-(p.z-n.root.position.z)*dx)/Math.max(d,1e-10)<.54);
   if(block){if(!s.yieldPoint&&(!owned.has(block.actor)||n.station.id>block.actor.station.id))for(const sign of[1,-1]){const aside=[n.root.position.x+sign*dz/d*.82,n.root.position.y,n.root.position.z-sign*dx/d*.82];if(canTraverse(n.root.position,point(aside),lot.colliders.concat(safety(n)),navigation)){s.yieldPoint=aside;s.yieldTo=block.actor;s.planned=false;record('yield-passage',n);break;}}s.stalled=0;return false;}
   if(d>1e-10){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.78);moveActor(n,dx/d*amount,dz/d*amount,.25);n.root.rotation.y=Math.atan2(dx,dz);n.walking=before.distanceToSquared(n.root.position)>1e-9;}
  }
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
 function begin(receipt){const data=ledger.begin(receipt);if(!data)return;order={...data,title:E.title,stage:'preparing',holder:'scribe-desk',sealed:false,claims:{scribe:scribe.station.id,herald:herald.station.id,recipient:null},rooms:[]};persist();claim(scribe);task(scribe,'return-writing-desk',[scribe.home.toArray()],'回书案拟定荷庭清扫令');task(herald,'collect-draft',[...HALL_EXIT,...STUDY_PATH],'沿公共楼梯前往书画室取稿');record('begin');}
 persist();
 return {
  owns:n=>owned.has(n),socialStatus:n=>owned.has(n)?{busy:false,attention:true,job:n===speaker?utterance:tasks.get(n)?.label||'在传令案前候命'}:null,
  update(dt,t,playerState={}){
   if(disposed)return;state=playerState;time+=dt;
   const a=audience.state();if(!order&&a.phase==='waiting'&&a.schedule.outcome==='completed'&&ledger.canBegin(a.schedule)&&!paused(scribe)&&!paused(recipient))begin(a.schedule);
   for(const n of owned){n.walking=false;const s=tasks.get(n);tell(n,n===speaker?utterance:s?.label||'在传令案前候命');if(!paused(n)&&s)travel(n,s,dt);}
   const stage=order?.stage,halt=!!order&&[...owned].some(paused)||state.conversationActorId===emperor.station.id;
   if(order&&!halt){
    const advanceAfter=(seconds,next)=>{phaseTime+=dt;if(phaseTime>=seconds){enter(next);return true;}return false;};
    if(stage==='preparing'&&arrived(scribe)){enter('drafting');say(scribe,'据今日朝议，拟一纸荷庭清扫令，交陛下核准。');}
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
    else if(stage==='recipient-handoff'&&advanceAfter(1.3,'to-work')){order.holder='recipient';record('edict-received',recipient);task(recipient,'walk-to-receipt-basket',[P.file],'Bo 携同号令到竹筐边留存');}
    else if(stage==='to-work'&&arrived(recipient)){enter('file-receipt');face(recipient,P.basket);}
    else if(stage==='file-receipt'&&advanceAfter(1.2,'to-sweep')){order.holder='basket';task(recipient,'walk-to-leaves',[P.work],'按令实作 · 到落叶边取帚清扫');}
    else if(stage==='to-sweep'&&arrived(recipient)){enter('sweeping');tell(recipient,'按令实作 · 把东岸落叶扫进竹筐');}
    else if(stage==='sweeping'&&advanceAfter(7,'returning')){ledger.finish(true);persist();order.claims={scribe:null,herald:null,recipient:null};record('east-shore-cleaned',recipient);say(recipient,'东岸落叶已入筐，这段路清好了。');task(recipient,'return-garden-post',[[10,.145,-14],[0,.295,-14.3],recipient.home.toArray()],'清扫完成 · 沿荷桥返岗');task(herald,'return-seal-stand',[[13.4,.145,-14],...reverse(HALL_EXIT).slice(1),P.sealStand],'传达已办结 · 回传令案');}
    else if(stage==='returning'){if(owned.has(recipient)&&arrived(recipient))release(recipient);if(arrived(herald)&&!owned.has(recipient)){record('closed');order=null;tasks.delete(herald);speaker=null;utterance='';}}
   }
   for(const n of owned)animate(n,t);props.update(order,actors,phaseTime,!order&&ledger.snapshot().outcome==='completed',halt);
  },
  state:()=>({time,phaseTime,order:order?copy(order):null,ledger:ledger.snapshot(),speaker:speaker?.station.id||null,utterance,history:copy(history),failures:copy(failures),props:props.state(),actors:[...owned].map(n=>({id:n.station.id,position:n.root.position.toArray(),stage:tasks.get(n)?.id||'waiting',waypoint:tasks.get(n)?.index||0,arrived:arrived(n),walking:n.walking,paused:paused(n)})),rewards:false}),
  dispose(){if(disposed)return;disposed=true;if(order){ledger.finish(false);persist();}palace.releaseDuty(E.owner);palace.setDutyLine(E.owner,null);for(const n of[...owned]){n.route=[];n.walking=false;release(n);}owned.clear();tasks.clear();props.dispose();}
 };
}
