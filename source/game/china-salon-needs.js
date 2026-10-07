import {isPlayerConversationHeld} from './npc-social-ownership.js';
import {TAVERN_LAYOUT_VERSION as LAYOUT_VERSION} from './china-tavern-layout.js';
import {TAVERN_DISHES} from './china-tavern-kitchen.js';
// Personal trips for the four existing artists. The original salon scheduler
// offers the opportunity; tavern/fixture ownership and receipts stay authoritative.
const copy=x=>JSON.parse(JSON.stringify(x));
const UP=[[14,.115,8.8],[16.9,.215,9.1],[17.55,.215,8.8],[17.55,2.115,4.2],[19.95,2.115,4.2],[19.95,4.015,9.1],[17.55,4.015,9.1],[17.55,5.915,4.2],[19.95,5.915,4.2],[19.95,7.815,9.1],[22.5,7.815,9.2]];
const reverse=a=>a.slice().reverse().map(p=>p.slice());
export function createSalonNeeds({artists,sharedNeeds,economy,getTavern=()=>null,getToilet=()=>null,travel,pose,poseContext=()=>({}),resetRoute=()=>{},saveState=()=>true,saved={}}){
 const tasks=new Map(),retryAt=new Map(),reasons=new Map();let time=0,disposed=false;
 const snapshot=()=>({version:1,layoutVersion:LAYOUT_VERSION,time,tasks:[...tasks].map(([n,s])=>[n.station.id,copy(s)]),retryAt:[...retryAt],reasons:[...reasons]});
 const persist=()=>saveState(snapshot());
 // Reconcile cached poverty hints only after income changes or restore, never
 // scan the financial journal in the animation loop. Pending fees are not income.
 function refreshFunds(id){
  if(reasons.get(id)!=='餐钱不足，歇场后再作打算')return false;
  const account=economy?.account(id);
  if(!account||account.cash+account.bank<TAVERN_DISHES[0].price)return false;
  reasons.delete(id);retryAt.delete(id);return true;
 }
 function restore(s){
  if(s?.version!==1)return false;time=Math.max(0,s.time||0);tasks.clear();
  for(const[id,row]of s.tasks||[]){
   const n=artists.find(a=>a.station.id===id);if(!n||!['toilet','go-meal','meal','return'].includes(row.kind)||!Array.isArray(row.path)||!row.path.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))continue;
   const task={...copy(row),index:Math.max(0,Math.min(row.index||0,row.path.length)),wait:0};
   if(s.layoutVersion!==LAYOUT_VERSION){
    const approach=getToilet()?.publicIntent?.()?.position;
    // Only authored public route anchors moved. In particular, the final
    // final return intent follows the current authored home; the body stays put.
    task.path=task.path.map((p,i)=>{
     const current=UP.find(q=>Math.abs(q[0]-p[0])<1e-6&&Math.abs(q[1]-p[1])<1e-6&&Math.abs(q[2]+5-p[2])<1e-6);
     return row.kind==='return'&&i===row.path.length-1?n.home.toArray():current?current.slice():row.kind==='toilet'&&i===row.path.length-1&&approach?approach.slice():p;
    });
    if(task.index===task.path.length&&task.path.length&&task.path.at(-1).some((v,i)=>v!==row.path.at(-1)[i]))task.index--;
   }
   tasks.set(n,task);if(task.kind!=='meal')resetRoute(n);
  }
  retryAt.clear();for(const[id,t]of s.retryAt||[])if(artists.some(n=>n.station.id===id)&&Number.isFinite(t))retryAt.set(id,t);
  reasons.clear();for(const[id,r]of s.reasons||[])if(artists.some(n=>n.station.id===id)&&['餐钱不足，歇场后再作打算','餐位暂忙，稍后再去'].includes(r))reasons.set(id,r);for(const n of artists)refreshFunds(n.station.id);return true;
 }
 restore(saved);
 function start(n,kind,path){tasks.set(n,{kind,path:path.map(p=>p.slice()),index:0,wait:0});reasons.delete(n.station.id);resetRoute(n);persist();}
 function returnHome(n,from){start(n,'return',[...(from==='toilet'?UP.slice(6):UP),n.home.toArray()]);}
 function progress(n,s,dt){if(s.index>=s.path.length)return true;if(travel(n,s.path[s.index],dt)){s.index++;s.wait=0;return s.index>=s.path.length;}s.wait=n.walking?0:s.wait+dt;return false;}
 function tryStart(n){
  if(disposed||tasks.has(n)||!sharedNeeds||time<(retryAt.get(n.station.id)||0))return false;
  const need=sharedNeeds.status(n.station.id),facility=getToilet(),tavern=getTavern();
  if(need?.seekToilet&&facility?.publicAvailable?.()&&facility.requestPublicActor(n)){start(n,'toilet',[...reverse(UP.slice(6)),facility.publicIntent().position]);return true;}
  if(need?.seekMeal){const account=economy?.account(n.station.id);if(!account||account.cash+account.bank<TAVERN_DISHES[0].price){reasons.set(n.station.id,'餐钱不足，歇场后再作打算');retryAt.set(n.station.id,time+12);return false;}
   if(tavern?.artistMealAvailable(n.station.id)){start(n,'go-meal',reverse(UP));return true;}reasons.set(n.station.id,'餐位暂忙，稍后再去');retryAt.set(n.station.id,time+12);
  }else reasons.delete(n.station.id);
  return false;
 }
 return {tryStart,refreshFunds,mealPending:n=>tasks.get(n)?.kind==='go-meal',owns:n=>tasks.has(n)||getTavern()?.artistMealActorId?.()===n.station.id,
  label:n=>{const s=tasks.get(n);return !s?reasons.get(n.station.id)||null:s.kind==='toilet'?getToilet()?.label(n.station.id)||'前往公共净室':s.kind==='go-meal'?'沿公共楼梯下楼自费吃饭':s.kind==='meal'?'用本人餐钱在酒楼就餐':'日常事务结束 · 返回原雅集厅';},
  update(dt,t){if(disposed)return;time+=Math.max(0,dt);const tavern=getTavern(),leasedId=tavern?.artistMealActorId?.(),borrowed=artists.find(n=>n.station.id===leasedId);
   // Adopt an already-durable tavern lease if a tab closed before the salon's
   // next save. This is the same actor, order, payment and actual mounted seat.
   if(borrowed&&tasks.get(borrowed)?.kind!=='meal'){tasks.set(borrowed,{kind:'meal',path:[],index:0,wait:0});persist();}
   for(const[n,s]of tasks){
    if(n.alive!==false&&isPlayerConversationHeld(n.station.id)){n.walking=false;continue;}
    if(s.kind==='meal'){if(leasedId===n.station.id)continue;returnHome(n,'meal');continue;}
    if(s.kind==='toilet'){
     const facility=getToilet();if(!facility?.ownsActor(n)){returnHome(n,'toilet');continue;}
     facility.updateActor(n,dt,{travel:(_,step)=>progress(n,s,step)});
     const mounted=facility.actorPose(n);if(mounted)n.animate(t+(n.phase||0),false,mounted.action,{...poseContext(n),...mounted.context});else pose(n,t,null);
     continue;
    }
    const arrived=progress(n,s,dt);pose(n,t,null);
    if(s.kind==='go-meal'&&arrived){if(tavern?.requestArtistMeal(n.station.id)){s.kind='meal';s.path=[];s.index=0;persist();}else{returnHome(n,'meal');retryAt.set(n.station.id,time+12);}}
    else if(s.kind==='return'&&arrived){tasks.delete(n);resetRoute(n);retryAt.set(n.station.id,time+4);persist();}
    else if(s.kind==='go-meal'&&s.wait>20){returnHome(n,'meal');retryAt.set(n.station.id,time+12);}
   }
  },snapshot,restore,
  dispose({suspend=false}={}){if(!suspend)for(const[n]of tasks){getToilet()?.cancel('artist-service-ended',n.station.id);if(getTavern()?.artistMealActorId?.()===n.station.id)getTavern().cancelArtistMeal(n.station.id);}disposed=true;tasks.clear();}
 };
}
