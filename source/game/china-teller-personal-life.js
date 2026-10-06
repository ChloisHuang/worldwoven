import {createNPCPersonalTrip} from './npc-personal-trip.js';
import {followActorRoute} from './actor-navigation.js';
const point=p=>({x:p[0],y:p[1],z:p[2]});
const near=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.15&&Math.abs(n.root.position.y-p[1])<.3;
// Original counter east aisle, public front door, road and tavern cubicle.
// There is no extra worker, free meal, bank trip or private-room shortcut.
const corridor=[[-18.55,.215,-28.25],[-18.55,.215,-26.35],[-21,.215,-24.4],[-21,.215,-21.4],[-13.7,.145,-20.85],[13.7,.145,-20.85],[13.4,.145,-14],[14.9,.13,11],[16.9,.215,9.1]];
export function createChinaTellerPersonalLife({npcs,getHolder,getHome,canStart,canControl,economy,mealFunds=economy,sharedNeeds,getTavern,getToilet,getPlayer,doors,planPath,moveActor,poseContext,saved,saveState}){
 let time=0;const routes=new Map(),home=n=>n===getHolder()?getHome():n.home.toArray();
 const reset=n=>{routes.delete(n);n.route=[];n.walking=false;};
 const life=createNPCPersonalTrip({saved,getCandidates:()=>npcs.filter(n=>n===getHolder()||economy.hasIncome(n.station.id)),getActor:id=>npcs.find(n=>n.station.id===id),canControl,
  canStart:n=>canControl(n)&&canStart(n)&&near(n,home(n))&&(sharedNeeds.has(n.station.id)||(mealFunds.account(n.station.id)?.cash||0)+(mealFunds.account(n.station.id)?.bank||0)>=6),
  canDepart:n=>canStart(n),getReturnTarget:home,getExitRoute:()=>corridor,getReturnRoute:n=>[...corridor.slice().reverse().map(p=>p.slice()),home(n)],economy:mealFunds,sharedNeeds,getTavern,getToilet,resetRoute:reset,
  travel(n,to,dt){n.walking=false;if(near(n,to)){reset(n);return true;}let route=routes.get(n);if(!route||route.key!==to.join(',')){route={key:to.join(','),retryAt:0};routes.set(n,route);n.route=[];}if(!n.route.length&&time>=route.retryAt){route.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to);},
  pose:(n,t,mounted)=>{const context=poseContext(n,null);n.animate(t+n.phase,!!n.walking,mounted?.action||null,mounted?{...context,...mounted.context}:context);},saveState});
 return {...life,update(dt,t){time+=Math.max(0,dt);life.update(dt,t);for(const n of npcs)if(life.owns(n)){const label=n.label?.querySelector?.('small');if(label)label.textContent=life.label();}}};
}
