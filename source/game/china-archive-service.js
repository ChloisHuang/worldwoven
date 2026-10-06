import {createArchiveInspection} from './china-archive-inspection.js';
import {followActorRoute} from './actor-navigation.js';
const point=p=>({x:p[0],y:p[1],z:p[2]});
const near=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.04&&Math.abs(n.root.position.y-p[1])<.2;
// Navigation/pose adapter for the original six-book business. All movement uses
// the shared full-body planner; no relocation or separate inventory copies.
export function createChinaArchiveService({npcs,lot,resolveAssignment,getDay,canControl,doors,planPath,moveActor,poseContext,getPlayer,economy,saved,saveState}){
 let time=0;const routes=new Map(),books=lot.archiveBooks;
 const reset=n=>{routes.delete(n);n.route=[];n.walking=false;};
 const inspection=createArchiveInspection({resolveAssignment,getDay,getActor:id=>npcs.find(n=>n.station.id===id),canControl,books,economy,saved,saveState,
  travel(n,to,dt){n.walking=false;if(near(n,to)){reset(n);return true;}let route=routes.get(n);if(!route||route.key!==to.join(',')){route={key:to.join(','),retryAt:0};routes.set(n,route);n.route=[];}if(!n.route.length&&time>=route.retryAt){route.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to);},
  pose(n,t,work){books.pose(n,t,work,poseContext(n,null));}});
 return {...inspection,get loadError(){return inspection.loadError;},label:()=>inspection.state()?.recovery?'中断馆藏原册归位 · 不计工资':inspection.state()?.order?'核检整理原六册 · 原单未办结':'藏书巡检已返岗',
  update(dt,t,state){time+=Math.max(0,dt);const before=inspection.ownedActorId();inspection.update(dt,t,state);const after=inspection.ownedActorId();
   if(after){const n=npcs.find(n=>n.station.id===after),label=n?.label?.querySelector?.('small');if(label)label.textContent=inspection.state()?.recovery?'中断原册归位 · 不计工资':'正在逐册核检整理';}
   if(before!==after){const n=npcs.find(n=>n.station.id===(after||before));if(n&&(canControl(n)||n.alive===false)){reset(n);n.returning=false;n.breakAt=t+12;if(!after){const label=n.label?.querySelector?.('small');if(label)label.textContent=n.station.npcLabel;}}}
  }};
}
