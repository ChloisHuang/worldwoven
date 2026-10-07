import {createServiceRelationshipOutbox,serviceRelationshipEvent} from './service-relationship-outbox.js';
import {createPalaceTeaOrders} from './china-palace-tea-orders.js';
import {createPalaceTeaProps,PALACE_TEA_POINTS as P} from './china-palace-tea-props.js';
import {followActorRoute} from './actor-navigation.js';

// Guest movement/animation belongs solely to palace life. This bounded service
// borrows only the host; guestTarget/guestPose form the explicit handshake.
const copy=structuredClone,near=(n,p,r=.04)=>!!n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.3;
const LABEL={approach:'客人要一杯茶 · 请到茶案边',prepare:'按原单温杯备茶',pickup:'双手端起原杯与茶托',carry:'将原茶托送到客人面前',place:'把原杯与茶托安放在案上','guest-lift':'自愿端起原单茶杯',drink:'客人自愿品尝刚备好的茶',lower:'将原杯放回茶托',retrieve:'收起原杯与茶托',return:'把用过的原杯送回备茶处',clear:'清理原杯与茶托',home:'茶务办妥 · 回到原班位'};
export function createPalaceTeaService({npcs,lot,doors,planPath,moveActor,poseContext=()=>({}),resolveAssignment,account,saved,saveState=()=>false,onRelationshipEvent=()=>({ok:false})}={}){
 const relationshipOutbox=createServiceRelationshipOutbox(onRelationshipEvent);
 let relationshipTime=Number(saved?.relationshipTime)||0;const relationshipTimes={...(saved?.relationshipTimes||{})};
 let runtime=null,disposed=false,playerState={},loadError=null,lastGuestPose=-Infinity,recovery=null,ownedBody=null;
 const props=createPalaceTeaProps(lot.group),getHost=()=>{const a=resolveAssignment?.();return a?.alive!==false&&!['vacant','inactive','invalid'].includes(a?.status)?a?.actor||null:null;};
 const snapshot=(orders=ledger.snapshot())=>{for(const o of orders.orders||[])if(['cleared','cancelled'].includes(o.stage)&&relationshipTimes[o.id]===undefined)relationshipTimes[o.id]=relationshipTime;return loadError?copy(saved):({version:1,orders,relationshipTime,relationshipTimes:copy(relationshipTimes),runtime:copy(runtime),recovery:copy(recovery)});};
 const ledger=createPalaceTeaOrders({saved:saved?.orders,saveState:orders=>saveState(snapshot(orders))});
 if(ledger.loadError)loadError=ledger.loadError;
 if(saved!=null&&(saved.version!==1||!saved.orders||!(saved.runtime===null||saved.runtime&&Object.keys(LABEL).includes(saved.runtime.phase)&&['actorId','guestId','visitId'].every(k=>typeof saved.runtime[k]==='string'&&saved.runtime[k])&&['holderRevision','elapsed','age','stalled'].every(k=>Number.isFinite(saved.runtime[k])&&saved.runtime[k]>=0)&&Number.isSafeInteger(saved.runtime.holderRevision)&&typeof saved.runtime.planned==='boolean')))loadError='invalid-tea-service-save';
 if(!loadError&&saved?.runtime){const r=saved.runtime,original=ledger.snapshot().orders.find(o=>o.actorId===r.actorId&&o.holderRevision===r.holderRevision&&o.guestId===r.guestId&&o.visitId===r.visitId);if(!original||r.phase==='home'&&original.stage!=='cleared')loadError='invalid-tea-service-original';}

 // Unfinished objects never gain reconstructed work on load. Cancel the same
 // guest/day original before accepting a new request. Completed pay persists
 // independently and the saved home phase is a return-only body loan.
 if(!loadError&&ledger.active()){recovery={...ledger.active(),stage:'cancelled'};if(!ledger.cancel(ledger.active().id).ok)loadError='tea-recovery-save-failed';}
 if(!loadError&&!recovery&&saved?.recovery){const o=ledger.snapshot().orders.find(o=>o.id===saved.recovery.id&&o.stage==='cancelled');if(o&&JSON.stringify(o)===JSON.stringify(saved.recovery))recovery=o;else loadError='invalid-tea-recovery';}
 if(!loadError&&!recovery&&saved?.runtime&&saved.runtime.phase!=='home')recovery=ledger.snapshot().orders.find(o=>o.stage==='cancelled'&&o.actorId===saved.runtime.actorId&&o.holderRevision===saved.runtime.holderRevision&&o.visitId===saved.runtime.visitId)||null;
 if(!loadError&&saved?.runtime?.phase==='home'&&saved.runtime.actorId&&Number.isSafeInteger(saved.runtime.holderRevision))runtime={...copy(saved.runtime),elapsed:0,planned:false,stalled:0};
 const active=()=>ledger.active(),guest=()=>npcs.find(n=>n.station.id===runtime?.guestId)||null;
 function validHost(){const a=resolveAssignment?.();return !!runtime&&a?.status==='npc'&&a.alive!==false&&a.available!==false&&a.holderId===runtime.actorId&&a.revision===runtime.holderRevision&&a.actor?.alive!==false;}
 function blocked(n){return !n||n.alive===false||playerState.performing===n.station.id||playerState.conversationActorId===n.station.id;}
 function persist(){try{const r=saveState(snapshot());return r!==false&&r?.ok!==false&&!r?.then;}catch{return false;}}
 function transition(phase,step){const previous=copy(runtime);runtime={...runtime,phase,elapsed:0,planned:false,stalled:0};const o=active();const result=step?ledger.advance({...o,requestId:o.id,stage:step,observed:true}):{ok:persist()};if(!result.ok)runtime=previous;return result.ok;}
 function travel(n,to,dt){
  if(near(n,to)){n.route=[];n.walking=false;runtime.planned=false;return true;}
  if(!runtime.planned){n.route=planPath(n.root.position,{x:to[0],y:to[1],z:to[2]},.25)||[];runtime.planned=true;}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:playerState.position,speedScale:.78});runtime.stalled=n.walking||step.waiting?0:runtime.stalled+dt;
  if(runtime.stalled>4){runtime.planned=false;runtime.stalled=0;}if(near(n,to)){n.route=[];n.walking=false;runtime.planned=false;return true;}return false;
 }
 function pose(n,t){
  const target=['place','retrieve','drink','guest-lift','lower'].includes(runtime.phase)?P.serve:P.prep;if(!n.walking)n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);
  const touching=['prepare','pickup','carry','place','retrieve','return','clear'].includes(runtime.phase);
  const hands=touching?props.handTargets(n,runtime.phase,runtime.elapsed):[[-.18,.95,.23],[.18,.95,.23]];
  if(runtime.phase==='prepare'||runtime.phase==='clear'&&runtime.elapsed>=1){const wave=Math.sin(runtime.elapsed*3)*.025;hands[1][0]+=wave;hands[1][2]+=.02;}
  const ratio=Math.min(1,runtime.elapsed),lean=['prepare'].includes(runtime.phase)?.75:runtime.phase==='pickup'||runtime.phase==='retrieve'?.75*(1-ratio):runtime.phase==='place'||runtime.phase==='clear'?.75*ratio:0;
  n.animate(t+(n.phase||0),n.walking,null,{...poseContext(n,null),handoff:true,handoffLean:lean,handoffDip:lean/.75*.10,heldProp:null,archery:{hands}});
 }
 function cancel(reason='tea-service-interrupted'){
  if(!runtime)return true;const o=active(),host=npcs.find(n=>n.station.id===runtime.actorId)||null;if(o&&!ledger.cancel(o.id).ok)return false;
  if(o)props.update(o,{host,guest:guest()},['drink','lower','retrieve'].includes(runtime.phase)?'cancelled-table':'prepare',0);
  const a=resolveAssignment?.();if(host?.station.id===runtime.actorId&&(a?.holderId===runtime.actorId&&a.revision===runtime.holderRevision&&a.available!==false||a?.status==='vacant'&&ownedBody===host)){host.route=[];host.walking=false;}props.clear();runtime=null;ownedBody=null;return persist();
 }
 return {
  reconcileAfterRestore(){
   if(!recovery||loadError)return {ok:!loadError};const frozen=recovery;const a=resolveAssignment?.(),n=npcs.find(n=>n.station.id===frozen.actorId);
   if(!n||a?.holderId!==frozen.actorId||a.revision!==frozen.holderRevision||n.alive===false){recovery=null;return {ok:true,detached:true,actorId:frozen.actorId};}
   if(a.status!=='npc'||a.available===false)return {ok:false,pending:true};recovery=null;
   n.route=[];n.walking=false;n.returning=true;n.breakAt=0;props.clear();return {ok:true,actorId:frozen.actorId};
  },
  snapshot,state:()=>({loadError,orders:ledger.snapshot(),runtime:copy(runtime),recovery:copy(recovery),props:props.state()}),get loadError(){return loadError;},
  hostActor:getHost,hostReady:()=>{const a=resolveAssignment?.(),n=getHost();return !recovery&&a?.status==='npc'&&a.available!==false&&!!n&&near(n,P.hostHome,.18)&&!n.walking&&!n.route.length;},owns:n=>!!runtime&&n?.station.id===runtime.actorId,
  handoffBoundary:()=>({ok:!loadError&&!runtime&&!recovery,blockers:loadError||runtime||recovery?['original-tea-service']:[]}),
  guestTarget:id=>runtime?.guestId===id&&runtime.phase==='approach'?P.guest.slice():null,
  guestLookTarget:id=>runtime?.guestId===id&&!['approach','home'].includes(runtime.phase)?P.serve.slice():null,
  guestPose(id,t){
   if(runtime?.guestId!==id||!['guest-lift','drink','lower'].includes(runtime.phase))return null;const n=guest(),ratio=Math.min(1,runtime.elapsed),lean=runtime.phase==='guest-lift'?.75*(1-ratio):runtime.phase==='lower'?.75*ratio:0;
   return {handoff:true,handoffLean:lean,handoffDip:lean/.75*.10,heldProp:null,archery:{hands:[[-.18,.95,.2],props.guestHandTarget(n,runtime.phase,runtime.elapsed)]}};
  },
  observeGuestPose(n,t){
   if(runtime?.phase!=='drink'||n?.station.id!==runtime.guestId||!near(n,P.guest)||!Number.isFinite(t)||!n.root.userData.hands?.[1])return false;
   lastGuestPose=t;props.update(active(),{host:getHost(),guest:n},runtime.phase,runtime.elapsed);return true;
  },
  label:()=>LABEL[runtime?.phase]||null,cancel,
  request({guest:customer,visitId,day,guestAsked,hostAccepted}){
   const a=resolveAssignment?.(),host=a?.actor;
   if(disposed||loadError||runtime||recovery||a?.status!=='npc'||a.alive===false||a.available===false||blocked(host)||blocked(customer)||!near(customer,[2.9,.815,-28.25],.2)||!near(host,P.hostHome,.2)||host.walking||host.route.length||guestAsked!==true||hostAccepted!==true)return {ok:false,code:'tea-service-unavailable'};
   const before=runtime;runtime={phase:'approach',elapsed:0,age:0,actorId:a.holderId,holderRevision:a.revision,guestId:customer.station.id,visitId,planned:false,stalled:0};
   const result=ledger.request({guestId:customer.station.id,actorId:a.holderId,holderRevision:a.revision,visitId,day,arrived:true,guestAsked:true,hostAccepted:true});if(!result.ok){runtime=before;return result;}ownedBody=host;props.update(result.order,{host,guest:customer},'prepare');return result;
  },
  update(dt,t,state={}){
   relationshipTime+=Math.max(0,dt);relationshipOutbox.deliver(ledger.snapshot().orders.filter(o=>['cleared','cancelled'].includes(o.stage)).map(o=>serviceRelationshipEvent('china-palace-tea',o.id,o.stage==='cleared'?'completed':'cancelled',o.actorId,o.guestId,relationshipTimes[o.id]??0)));
   playerState=state;if(disposed||!runtime||loadError)return;const host=getHost(),customer=guest(),o=active();
   if(!validHost()||blocked(host)||runtime.phase!=='home'&&(blocked(customer)||state.urgentGuest||state.guestDeparted||state.urgentHost||state.serviceConflict)){cancel();return;}
   ownedBody=host;
   if(runtime.phase!=='approach'&&runtime.phase!=='home'&&!near(customer,P.guest)){cancel('guest-left-original-place');return;}
   const fixedHost=['prepare','pickup','clear'].includes(runtime.phase)?P.hostPrep:['place','guest-lift','drink','lower','retrieve'].includes(runtime.phase)?P.hostServe:null;
   if(fixedHost&&!near(host,fixedHost)){cancel('host-left-original-place');return;}
   if(!host.root.userData.hands?.[0]||!host.root.userData.hands?.[1]||!customer?.root.userData.hands?.[1]){cancel('service-hands-unavailable');return;}
   runtime.age+=dt;if(runtime.age>90){cancel('tea-service-timeout');return;}
   if(runtime.phase!=='drink'||lastGuestPose>=t-dt-.00001&&lastGuestPose<=t)runtime.elapsed+=dt;
   const phase=runtime.phase;
   if(phase==='approach'){const ready=travel(host,P.hostPrep,dt);if(ready&&near(customer,P.guest))transition('prepare');}
   else if(phase==='prepare'&&runtime.elapsed>=3)transition('pickup','prepared');
   else if(phase==='pickup'&&runtime.elapsed>=1)transition('carry','carried');
   else if(phase==='carry'&&travel(host,P.hostServe,dt))transition('place');
   else if(phase==='place'&&runtime.elapsed>=1)transition('guest-lift','placed');
   else if(phase==='guest-lift'&&runtime.elapsed>=1)transition('drink');
   else if(phase==='drink'&&runtime.elapsed>=3)transition('lower','drunk');
   else if(phase==='lower'&&runtime.elapsed>=1)transition('retrieve');
   else if(phase==='retrieve'&&runtime.elapsed>=1)transition('return','retrieved');
   else if(phase==='return'&&travel(host,P.hostPrep,dt))transition('clear');
   else if(phase==='clear'&&runtime.elapsed>=2){
    const done=ledger.prepareCompletion({...o,requestId:o.id,observed:true});if(done.ok){const previous=copy(runtime);runtime={...runtime,phase:'home',elapsed:0,age:0,planned:false};const result=done.commit((orders,proof)=>account.settle(proof,{chinaTeaService:snapshot(orders)}));if(!result.ok)runtime=previous;else props.clear();}
   }else if(phase==='home'&&travel(host,P.hostHome,dt)){runtime=null;host.route=[];host.walking=false;persist();}
   if(runtime){pose(host,t);props.update(active(),{host,guest:customer},runtime.phase,runtime.elapsed);}
  },
  dispose(){if(disposed)return;cancel('tea-region-left');disposed=true;props.dispose();}
 };
}
