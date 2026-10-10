import {isSociallyHeld} from './npc-social-ownership.js';
import {createTellerInspection} from './china-teller-inspection.js';
import {TELLER_HOME,TELLER_STANDS} from './china-teller-audit-proof.js';
import {followActorRoute} from './actor-navigation.js';
const point=p=>({x:p[0],y:p[1],z:p[2]});
const near=(n,p,r=.04)=>!!n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.2;
// One Chinese body writer. The shared bank UI only reads this admission binding.
export function createChinaTellerService({npcs,lot,resolveAssignment,getAssignment=resolveAssignment,getDay,getLedger,getGlobalAuditDay=()=>-1,canControl,isCounterOpen,isPersonalBusy,canPausePersonalForCounter=()=>false,getPersonalActivity=()=>null,getUnavailableReason=()=>null,doors,planPath,moveActor,poseContext,getPlayer,economy,saved,saveState}){
 let time=0;const routes=new Map(),tools=lot.tellerTools;
 const reset=n=>{routes.delete(n);n.route=[];n.walking=false;};
 const travel=(n,to,dt)=>{n.walking=false;if(near(n,to)){reset(n);return true;}let route=routes.get(n);if(!route||route.key!==to.join(',')){route={key:to.join(','),retryAt:0};routes.set(n,route);n.route=[];}if(!n.route.length&&time>=route.retryAt){route.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to);};
 // Pending personal trips must still block replacing the holder. Their slot
 // remains busy; only this counter view admits the same safe, present person.
 const serviceAssignment=()=>{const a=resolveAssignment();return a?.status==='busy'&&a.actor&&isPersonalBusy(a.actor)&&canPausePersonalForCounter(a.actor)&&canControl(a.actor)?{...a,status:'npc',available:true}:a;};
 const inspection=createTellerInspection({resolveAssignment:serviceAssignment,getDay,getGlobalAuditDay,getActor:id=>npcs.find(n=>n.station.id===id),getLedger,canControl:n=>!economy.loadError&&canControl(n)&&!isPersonalBusy(n),canControlCounter:n=>!economy.loadError&&canControl(n)&&(!isPersonalBusy(n)||canPausePersonalForCounter(n)),isCounterOpen,travel,pose:(n,t,w)=>tools.pose(n,t,w,poseContext(n,null)),contact:(n,target,w)=>tools.contact(n,target,w),economy,saved,saveState});
 const atWorkCounter=n=>{const p=n?.root?.position;return !!p&&Math.abs(p.y-TELLER_HOME[1])<=.15&&Math.abs(p.z-TELLER_HOME[2])<=.15&&p.x>=Math.min(TELLER_HOME[0],TELLER_STANDS.ledger[0])-.15&&p.x<=Math.max(TELLER_HOME[0],TELLER_STANDS.abacus[0])+.15;};
 function counterBinding(){
  const a=getAssignment(),n=a?.holderId?npcs.find(n=>n.station.id===a.holderId):null;
  const unavailable=()=>{
   if(a?.loadError)return '柜员任职记录暂时无法核对，请保留原存档';
   if(!n||n.alive===false)return '当前柜员未能在岗，暂时无法办理存取';
   const reason=getUnavailableReason(n);if(reason)return reason;
   if(inspection.loadError||economy.loadError)return '账房原核验记录暂时无法核对，请保留原存档';
   if(isPersonalBusy(n)&&!canPausePersonalForCounter(n))return `账房${getPersonalActivity(n)||'正在处理用餐或如厕'}，办完回柜后可办理`;
   if(!canControl(n)||isSociallyHeld(n.station.id))return '账房正在处理其他事务，结束并回柜后可办理';
   if(!inspection.canServeCounter(n))return '原核验单与当前柜员尚未核对，暂时无法办理';
   return atWorkCounter(n)?null:'账房暂时离柜，本人返回柜台后可办理';
  };
  return {actor:n||null,holderId:a?.holderId||null,revision:a?.revision??null,get available(){return unavailable()===null;},get unavailableMessage(){return unavailable();},beginService(){
   const current=getAssignment();if(current?.holderId!==a?.holderId||current?.revision!==a?.revision||unavailable())return false;
   reset(n);tools.pose(n,time,null,poseContext(n,null));return true;
  }};
 }
 return {...inspection,get loadError(){return inspection.loadError;},counterBinding,label:()=>inspection.ownedActorId()?'核对原账 · 核算并落记':'钱庄账房 · 等候办理',
  update(dt,t,context={}){time+=Math.max(0,dt);const before=inspection.ownedActorId();inspection.update(dt,t,context);const after=inspection.ownedActorId();
   if(before!==after){const n=npcs.find(n=>n.station.id===(after||before));if(n&&(canControl(n)||n.alive===false)){reset(n);n.returning=false;n.breakAt=t+12;}}
   if(after){const n=npcs.find(n=>n.station.id===after),label=n?.label?.querySelector?.('small');if(isCounterOpen()&&n&&canControl(n)){reset(n);tools.pose(n,t,null,poseContext(n,null));}if(label)label.textContent=isCounterOpen()?'当面办理存取与兑换 · 原核验暂存':'核对原账 · 原单尚未办结';return;}
   const a=serviceAssignment(),n=a?.actor;if(inspection.loadError||a?.status!=='npc'||!n||n.alive===false||!canControl(n))return;
   if(isPersonalBusy(n)){if(isCounterOpen()&&canPausePersonalForCounter(n)){reset(n);tools.pose(n,t,null,poseContext(n,null));}return;}
   if(isSociallyHeld(n.station.id,context.conversationActorId)){n.walking=false;return;}
   if(!near(n,TELLER_HOME)){if(isCounterOpen())return;travel(n,TELLER_HOME,dt);tools.pose(n,t,null,poseContext(n,null));return;}
   reset(n);n.root.rotation.y=0;tools.pose(n,t,null,poseContext(n,null));const label=n.label?.querySelector?.('small');if(label)label.textContent=isCounterOpen()?'当面办理存取与兑换':'钱庄账房 · 等候办理';
  }
 };
}
