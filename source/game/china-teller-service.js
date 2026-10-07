import {isSociallyHeld} from './npc-social-ownership.js';
import {createTellerInspection} from './china-teller-inspection.js';
import {TELLER_HOME} from './china-teller-audit-proof.js';
import {followActorRoute} from './actor-navigation.js';
const point=p=>({x:p[0],y:p[1],z:p[2]});
const near=(n,p,r=.04)=>!!n&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.2;
// One Chinese body writer. The shared bank UI only reads this admission binding.
export function createChinaTellerService({npcs,lot,resolveAssignment,getAssignment=resolveAssignment,getDay,getLedger,canControl,isCounterOpen,isPersonalBusy,doors,planPath,moveActor,poseContext,getPlayer,economy,saved,saveState}){
 let time=0;const routes=new Map(),tools=lot.tellerTools;
 const reset=n=>{routes.delete(n);n.route=[];n.walking=false;};
 const travel=(n,to,dt)=>{n.walking=false;if(near(n,to)){reset(n);return true;}let route=routes.get(n);if(!route||route.key!==to.join(',')){route={key:to.join(','),retryAt:0};routes.set(n,route);n.route=[];}if(!n.route.length&&time>=route.retryAt){route.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to);};
 const inspection=createTellerInspection({resolveAssignment,getDay,getActor:id=>npcs.find(n=>n.station.id===id),getLedger,canControl:n=>!economy.loadError&&canControl(n)&&!isPersonalBusy(n),isCounterOpen,travel,pose:(n,t,w)=>tools.pose(n,t,w,poseContext(n,null)),contact:(n,target,w)=>tools.contact(n,target,w),economy,saved,saveState});
 function counterBinding(){const a=getAssignment(),n=a?.holderId?npcs.find(n=>n.station.id===a.holderId):null;return {actor:n||null,holderId:a?.holderId||null,revision:a?.revision??null,get available(){return !!n&&!a.loadError&&n.alive!==false&&canControl(n)&&!inspection.loadError&&inspection.handoffBoundary().ok&&!isPersonalBusy(n)&&near(n,TELLER_HOME,.15)&&!n.walking&&!n.route.length;}};}
 return {...inspection,get loadError(){return inspection.loadError;},counterBinding,label:()=>inspection.ownedActorId()?'核对原账 · 核算并落记':'钱庄账房 · 等候办理',
  update(dt,t,context={}){time+=Math.max(0,dt);const before=inspection.ownedActorId();inspection.update(dt,t,context);const after=inspection.ownedActorId();
   if(before!==after){const n=npcs.find(n=>n.station.id===(after||before));if(n&&(canControl(n)||n.alive===false)){reset(n);n.returning=false;n.breakAt=t+12;}}
   if(after){const n=npcs.find(n=>n.station.id===after),label=n?.label?.querySelector?.('small');if(label)label.textContent='核对原账 · 原单尚未办结';return;}
   const a=resolveAssignment(),n=a?.actor;if(inspection.loadError||a?.status!=='npc'||!n||n.alive===false||!canControl(n)||isPersonalBusy(n))return;
   if(isSociallyHeld(n.station.id,context.conversationActorId)){n.walking=false;return;}
   if(!near(n,TELLER_HOME)){if(isCounterOpen())return;travel(n,TELLER_HOME,dt);tools.pose(n,t,null,poseContext(n,null));return;}
   reset(n);n.root.rotation.y=0;tools.pose(n,t,null,poseContext(n,null));const label=n.label?.querySelector?.('small');if(label)label.textContent=isCounterOpen()?'当面办理存取与兑换':'钱庄账房 · 等候办理';
  }
 };
}
