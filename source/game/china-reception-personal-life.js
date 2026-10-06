import {SALON_RECEPTION_ROLE as ROLE} from './china-salon-reception-role.js';
import {createNPCPersonalTrip} from './npc-personal-trip.js';
import {followActorRoute} from './actor-navigation.js';
const point=p=>({x:p[0],y:p[1],z:p[2]}),near=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.15&&Math.abs(n.root.position.y-p[1])<.3;
// Third-floor counter -> original public stair flights -> ground-floor meal
// hub. The existing trip owns ordinary paid food and the public cubicle.
const corridor=[[22.5,7.815,7.9],[22.5,7.815,9.2],[19.95,7.815,9.1],[19.95,5.915,4.2],[17.55,5.915,4.2],[17.55,4.015,9.1],[19.95,4.015,9.1],[19.95,2.115,4.2],[17.55,2.115,4.2],[17.55,.215,8.8],[16.9,.215,9.1]];
export function createChinaReceptionPersonalLife({npcs,getHolder,getHome,canStart,canControl,economy,mealFunds=economy,sharedNeeds,getTavern,getToilet,getPlayer,doors,planPath,moveActor,poseContext,saved,saveState}){
 let time=0,loadError=null,invalidSnapshot=null;const identity=s=>s?.version===1&&(!s.task||s.task.actorId===ROLE.incumbentId);const routes=new Map(),home=n=>n===getHolder()?getHome():n.home.toArray();
 const reset=n=>{routes.delete(n);n.route=[];n.walking=false;};
 const life=createNPCPersonalTrip({getCandidates:()=>npcs.filter(n=>n.station.id===ROLE.incumbentId&&(n===getHolder()||economy.hasIncome(n.station.id))),getActor:id=>id===ROLE.incumbentId?npcs.find(n=>n.station.id===id):null,canControl,
  canStart:n=>canControl(n)&&canStart(n)&&!n.serviceMount&&near(n,home(n))&&(sharedNeeds.has(n.station.id)||economy.hasIncome(n.station.id)&&(economy.account(n.station.id)?.cash||0)+(economy.account(n.station.id)?.bank||0)>=6),
  canDepart:n=>canStart(n),getReturnTarget:home,getExitRoute:()=>corridor,getReturnRoute:n=>[...corridor.slice().reverse().map(p=>p.slice()),home(n)],economy:mealFunds,sharedNeeds,getTavern,getToilet,resetRoute:reset,
  travel(n,to,dt){n.walking=false;if(near(n,to)){reset(n);return true;}let route=routes.get(n);if(!route||route.key!==to.join(',')){route={key:to.join(','),retryAt:0};routes.set(n,route);n.route=[];}if(!n.route.length&&time>=route.retryAt){route.retryAt=time+3;n.route=planPath(n.root.position,point(to),.25);}followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,speedScale:.8});return near(n,to);},
  pose:(n,t,mounted)=>{const c=poseContext(n,null);n.animate(t+(n.phase||0),!!n.walking,mounted?.action||null,mounted?{...c,...mounted.context}:c);},saveState});
 if(saved!=null&&(!identity(saved)||!life.restore(saved))){loadError='invalid-reception-personal-state';invalidSnapshot=JSON.parse(JSON.stringify(saved));}
 return {...life,get loadError(){return loadError;},snapshot:()=>loadError?JSON.parse(JSON.stringify(invalidSnapshot)):life.snapshot(),restore:s=>!loadError&&identity(s)&&life.restore(s),blocks:()=>!!loadError||life.blocks(),canBorrowMeal:id=>!loadError&&id===ROLE.incumbentId&&life.canBorrowMeal(id),update(dt,t){
  if(loadError)return;
  time+=Math.max(0,dt);
  // The original prepaid tavern lease may reach storage before the following
  // source save. Adopt that exact lease, even when its payer now has only2.
  const tavern=getTavern(),id=tavern?.guestMealActorId?.(),n=npcs.find(n=>n.station.id===id),old=life.snapshot();
  if(id===ROLE.incumbentId&&n&&economy.hasIncome(id)&&tavern.guestMeal(id)&&(!old.task||old.task.actorId===id&&old.task.phase!=='meal')){
   const candidate={version:1,task:{actorId:id,phase:'meal',meal:true,path:[],index:0}};life.restore(candidate);
   try{const r=saveState(candidate);if(r===false||r?.ok===false||r?.then){life.restore(old);return;}}catch{life.restore(old);return;}
  }
  life.update(dt,t);
 }};
}
