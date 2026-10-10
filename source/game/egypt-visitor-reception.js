// Visits originate only from the player actually asking at the original desk.
// This is a local guestbook, not an employment, passport or reward ledger.
export const EGYPT_VISITOR_DESK=Object.freeze([-3.6,0,10]);
export const EGYPT_VISITOR_ROUTES=Object.freeze([
 {id:'egypt-glyphs',name:'彩绘柱廊',guide:'穿过接待案北侧的彩绘门，沿西侧柱廊看太阳、河流与羽毛纹样。'},
 {id:'egypt-anubis-judgment',name:'阿努比斯审判厅',guide:'沿前庭向西，走公共通道进入审判厅；这里的天平是象征性的陈设。'},
 {id:'egypt-pharaoh-throne',name:'上层法老王殿',guide:'从西侧公共长坡道上楼，经上层平台进入王殿。请沿坡道行走。'},
 {id:'egypt-burial',name:'地下石棺墓室',guide:'穿过中央柱厅，沿下降甬道进入地下墓室，再从西侧前厅转入石棺室。'},
]);
const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const stamp=s=>s&&integer(s.day)&&Number.isFinite(s.hour)&&s.hour>=0&&s.hour<24;
const route=id=>EGYPT_VISITOR_ROUTES.find(r=>r.id===id);
const near=(actor,p,r)=>!!actor&&Math.abs(actor.root.position.y-p[1])<.4&&Math.hypot(actor.root.position.x-p[0],actor.root.position.z-p[2])<=r;
function valid(s){
 if(!s||s.version!==1||!integer(s.revision)||!integer(s.serial)||!Array.isArray(s.visits)||s.visits.length!==s.serial)return false;
 return s.visits.every((v,i)=>v&&v.id===`egypt-visit-${i+1}`&&v.actorId==='player'&&v.receptionistId==='egypt-royal-reception'&&route(v.destination)&&stamp(v.requestedAt)&&
  ['requested','registered','closed','cancelled'].includes(v.stage)&&(['registered','closed'].includes(v.stage)?stamp(v.registeredAt):v.registeredAt===null)&&
  (v.stage==='closed'?stamp(v.departedAt):v.departedAt===null)&&Array.isArray(v.arrivals)&&v.arrivals.every(a=>a&&route(a.destination)&&stamp(a.at)&&stamp(v.registeredAt))&&new Set(v.arrivals.map(a=>a.destination)).size===v.arrivals.length&&(i===s.visits.length-1||['closed','cancelled'].includes(v.stage)));
}
export function createEgyptVisitorReception({getPlayer,getClock,getStation,canReceive=()=>true,canRequest=()=>true,meetingReady=()=>false,saved=null,saveState=()=>false,notify=()=>{}}){
 let state={version:1,revision:0,serial:0,visits:[]},loadError=null,lastError=null,saving=false,disposed=false,task=null,elapsed=0;
 if(saved!=null){if(valid(saved))state=copy(saved);else loadError='invalid-visitor-record';}
 const latest=()=>state.visits.at(-1)||null;
 const atDesk=()=>near(getPlayer(),EGYPT_VISITOR_DESK,1.25);
 const local=()=>!disposed&&!loadError&&getPlayer()?.alive!==false&&atDesk()&&canRequest();
 const now=()=>{const c=getClock();return {day:c.day,hour:c.hour};};
 function commit(change){
  if(disposed||loadError||saving)return false;saving=true;
  try{const next=copy(state);change(next);next.revision++;if(!valid(next))return false;
   const result=saveState(copy(next));if(result===false||result?.ok===false||result?.then){if(result?.then)Promise.resolve(result).catch(()=>{});lastError='save-failed';return false;}
   state=next;lastError=null;return true;
  }catch{lastError='save-failed';return false;}finally{saving=false;}
 }
 function stop(){task=null;elapsed=0;}
 function request(destination){
  if(!local()||!route(destination)||!getStation(destination)||!stamp(now()))return false;
  const old=latest(),reuse=old&&!['closed','cancelled'].includes(old.stage);
  if(!commit(s=>{if(reuse){const v=s.visits.at(-1);v.destination=destination;v.stage=v.registeredAt?'registered':'requested';v.departedAt=null;}
   else{const serial=++s.serial;s.visits.push({id:`egypt-visit-${serial}`,actorId:'player',receptionistId:'egypt-royal-reception',destination,stage:'requested',requestedAt:now(),registeredAt:null,departedAt:null,arrivals:[]});}}))return false;
  elapsed=0;task=latest().stage==='requested'?'register':null;
  notify(task?'请留在接待案前，阿赫处理好原卷后会当面登记。':route(destination).guide);return true;
 }
 function resume(){const v=latest();if(!local()||v?.stage!=='requested')return false;task='register';elapsed=0;return true;}
 function depart(){
  if(!local())return false;const v=latest();
  if(v?.stage==='requested'){if(!commit(s=>s.visits.at(-1).stage='cancelled'))return false;stop();return true;}
  if(v?.stage!=='registered')return false;task='checkout';elapsed=0;notify('请留在案前，阿赫会核对同一来访号并记下离馆。');return true;
 }
 function meeting(){return {requested:!!task&&local()&&canReceive(),working:elapsed>0,kind:task};}
 function update(dt){
  if(disposed||loadError)return;
  const v=latest();
  if(task){
   if(!local()){stop();return;}
   if(!canReceive()||!meetingReady()){elapsed=0;return;}
   elapsed+=Math.min(.1,Math.max(0,dt));
   if(elapsed>=(task==='register'?4:2)){
    const kind=task;if(commit(s=>{const visit=s.visits.at(-1);if(kind==='register'){visit.stage='registered';visit.registeredAt=now();}else{visit.stage='closed';visit.departedAt=now();}})){
     stop();notify(kind==='register'?`阿赫：${v.id.replace('egypt-visit-','')}号来访已登记。${route(v.destination).guide} 打开来访记录可沿原路前往。`:'阿赫：同号来访已销号，欢迎下次再来。');
    }else{stop();notify('来访记录暂未保存，请在接待案重试。');}
   }
  }else if(!lastError)recordArrival();
 }
 function recordArrival(){
  const v=latest(),target=v&&getStation(v.destination);
  if(v?.stage!=='registered'||v.arrivals.some(a=>a.destination===v.destination)||!target||!near(getPlayer(),target.position,.7)||!stamp(now()))return false;
  if(!commit(s=>s.visits.at(-1).arrivals.push({destination:v.destination,at:now()})))return false;
  notify(`已到${route(v.destination).name}，记入同号来访记录。参观后可回接待案告辞。`);return true;
 }
 function view(){const v=latest();return {revision:state.revision,visit:v?copy(v):null,visits:copy(state.visits.slice(-8)),routes:EGYPT_VISITOR_ROUTES.filter(r=>getStation(r.id)).map(row=>copy(row)),atDesk:atDesk(),canRequest:local(),task,waiting:!!task&&elapsed===0,loadError,lastError};}
 return {request,resume,depart,stop,update,view,meeting,retryArrival:recordArrival,isActing:()=>!!task,hasVisit:()=>!!latest()&&['requested','registered'].includes(latest().stage),
  label:()=>task?elapsed>0?task==='register'?'阿赫正在核记来访与参观去向':'阿赫正在核对同号离馆记录':'等阿赫完成原事务后接待':null,
  destination:()=>latest()?.stage==='registered'?getStation(latest().destination):null,state:()=>({...copy(state),loadError,lastError}),dispose(){stop();disposed=true;}};
}
