// A deliberately compressed game timetable. The shared world clock starts at
// 10:00 and runs at .7 game minutes per real second; the court opens at 11:30.
export const COURT_START_HOUR=11.5;
export const COURT_CLOCK_MINUTES_PER_SECOND=.7;
export const COURT_CONGESTION_SECONDS=20;

// Static authored legs repeat for everyone. Keep a small scene-local cache;
// live travel still owns dynamic people, opening doors and obstruction checks.
export function cachedCourtPlanner(planPath,limit=192){
 const cache=new Map(),key=p=>[p.x,p.y,p.z].map(v=>v.toFixed(3)).join(',');
 return (from,to,radius)=>{const id=key(from)+'>'+key(to)+':'+radius;if(cache.has(id))return cache.get(id);const route=planPath(from,to,radius);cache.set(id,route);if(cache.size>limit)cache.delete(cache.keys().next().value);return route;};
}

export function courtRouteBudget({position,path,walkSpeed,planPath,safeExitSeconds=0,doorSeconds=0,doorways=[],knownSegments=0}){
 let from={x:position.x,y:position.y,z:position.z},distance=0;const crossed=new Set();
 for(const [index,a]of path.entries()){
  const to=Array.isArray(a)?{x:a[0],y:a[1],z:a[2]}:a;
  if(Math.hypot(to.x-from.x,to.z-from.z)<.08&&Math.abs(to.y-from.y)<.32){from=to;continue;}
  const route=index<knownSegments?[to]:planPath(from,to,.25);
  if(!route?.length)return {reachable:false,seconds:Infinity,distance,blockedTarget:[to.x,to.y,to.z]};
  for(const p of [...route,to]){distance+=Math.hypot(p.x-from.x,p.z-from.z);for(const d of doorways){const a=d.axis==='x'?from.z:from.x,b=d.axis==='x'?p.z:p.x;if(Math.abs(a-b)<1e-8)continue;const t=(d.at-a)/(b-a),lateral=d.axis==='x'?from.x+(p.x-from.x)*t:from.z+(p.z-from.z)*t,y=from.y+(p.y-from.y)*t;if(t>=0&&t<=1&&lateral>=d.from-.25&&lateral<=d.to+.25&&y>=d.bottom-.4&&y<d.top)crossed.add(d.id);}from=p;}
 }
 const speed=walkSpeed*.78;
 if(!(speed>0))return {reachable:false,seconds:Infinity,distance,blockedTarget:null};
 return {reachable:true,seconds:distance/speed+safeExitSeconds+doorSeconds+crossed.size*2,distance,doors:[...crossed]};
}

export function createAudienceSchedule(saved={}){
 let day=Math.max(0,Math.floor(saved.day||0)),calledDay=Number.isInteger(saved.calledDay)?saved.calledDay:-1,lastHour=null;
 let lastCompletedDay=Number.isInteger(saved.lastCompletedDay)?saved.lastCompletedDay:saved.outcome==='completed'?calledDay:-1;
 let outcome=calledDay===day?(['completed','postponed','missed',...(saved.preservePhysical?['called','in-session']:[])].includes(saved.outcome)?saved.outcome:'interrupted'):'waiting';
 let calledAt=saved.preservePhysical&&Number.isFinite(saved.calledAt)?saved.calledAt:null,leadSeconds=saved.preservePhysical&&Number.isFinite(saved.leadSeconds)?saved.leadSeconds:null,exception=saved.exception||null;
 const secondsUntil=hour=>(COURT_START_HOUR-hour)*60/COURT_CLOCK_MINUTES_PER_SECOND;
 return {
  observe(hour,simulationDay){
   if(!Number.isFinite(hour))return;
   const nextDay=Number.isSafeInteger(simulationDay)&&simulationDay>=day?simulationDay:lastHour!==null&&lastHour>18&&hour<6?day+1:day;
   if(nextDay>day){day=nextDay;outcome='waiting';exception=null;}
   // A saved summons is not a completed ceremony. Re-entering before the
   // fixed start must let the live controller gather everyone from their real
   // positions again; keeping today's calledDay would lock it out all day.
   // Completed/explicitly postponed days and their receipts remain terminal.
   if(outcome==='interrupted'&&calledDay===day&&lastCompletedDay!==day&&hour>=6&&hour<COURT_START_HOUR){calledDay=-1;outcome='waiting';exception=null;}
   lastHour=hour;
  },
  secondsUntil,
  due(hour,night=false,budgetSeconds=90){return !night&&hour>=6&&hour<COURT_START_HOUR&&calledDay!==day&&secondsUntil(hour)<=Math.max(0,budgetSeconds)+COURT_CONGESTION_SECONDS;},
  missed(hour){return hour>=COURT_START_HOUR&&calledDay!==day;},
  call(hour=10,budgetSeconds=90){calledDay=day;outcome='called';calledAt=hour;leadSeconds=budgetSeconds+COURT_CONGESTION_SECONDS;exception=null;},
  atStart(hour){return calledDay===day&&outcome==='called'&&hour>=COURT_START_HOUR;},
  start(hour){if(calledDay!==day||outcome!=='called'||hour<COURT_START_HOUR)return false;outcome='in-session';return true;},
  finish(value,reason=null){if(calledDay!==day&&value==='missed')calledDay=day;outcome=value;exception=reason;if(value==='completed')lastCompletedDay=calledDay;},
  snapshot:()=>({version:2,day,calledDay,outcome,lastCompletedDay,courtStart:COURT_START_HOUR,calledAt,leadSeconds,exception,completionId:lastCompletedDay>=0?'cn-morning-audience:'+lastCompletedDay:null})
 };
}
