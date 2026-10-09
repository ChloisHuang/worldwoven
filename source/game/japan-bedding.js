// Two owned reusable guest-futon covers, not purchased goods or replenishing stock.
// The original futon remains usable while its covers are being washed.
export const JAPAN_GUEST_BED='japan-furniture-bed-0';
export const JAPAN_BEDDING_POINTS=Object.freeze({receiving:[1.5,0,-33],guest:[2.5,7.6,-11.8],restock:[8.6,11.4,3.85],wash:[4.3,11.4,5.95],hang:[8.6,11.4,3.85],take:[8.6,11.4,3.85],fold:[8.6,11.4,3.85]});
export const JAPAN_BEDDING_REST_SECONDS=10;
const copy=x=>JSON.parse(JSON.stringify(x)),obj=x=>x&&typeof x==='object'&&!Array.isArray(x),serial=n=>Number.isSafeInteger(n)&&n>0;
const STAGES=['incoming','received','clean','delivering','installed','dirty','collected','wet','drying','dry','folded'],WASH=['dirty','collected','wet','drying','dry','folded'],NEXT={dirty:'collected',collected:'wet',wet:'drying',drying:'dry',dry:'folded',folded:'clean'};
const HOST='jp-rest',CLERK='jp-herb-workshop',workId=id=>typeof id==='string'&&/^jp-linen-labor-[1-9][0-9]*$/.test(id)&&serial(Number(id.slice(15)));
const near=(p,q)=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&Math.hypot(p[0]-q[0],p[2]-q[2])<=.45&&Math.abs(p[1]-q[1])<.4;
const origin='bathhouse-owned-opening-bedding-v1';
const opening=()=>({version:1,nextUse:1,use:null,sets:[1,2].map(n=>({id:`jp-bedding-${n}`,origin,stage:n===1?'installed':'incoming',station:n===1?'guest':'receiving',carryOwner:null,cycle:0,visitId:null,customerName:'客房旅人',dryingElapsed:0,steps:[]})),receipts:[]});
export function createJapanBedding({saved=null,worldSeed=1,saveState=()=>true,authorized=()=>false}={}){
 let data=opening(),loadError=null,invalidSaved=null;
 const set=id=>data.sets.find(s=>s.id===id),guest=s=>['installed','dirty'].includes(s.stage),snapshot=()=>copy(loadError?invalidSaved:data);
 const visitId=id=>typeof id==='string'&&new RegExp(`^jp-bedding-use-${worldSeed>>>0}-[1-9][0-9]*$`).test(id)&&serial(Number(id.split('-').at(-1)));
 function valid(s){
  if(!obj(s)||s.version!==1||!serial(s.nextUse)||!Array.isArray(s.sets)||s.sets.length!==2||!Array.isArray(s.receipts))return false;
  if(new Set(s.sets.map(x=>x?.id)).size!==2||s.sets.some(x=>!['jp-bedding-1','jp-bedding-2'].includes(x?.id)))return false;
  if(s.sets.filter(guest).length>1||s.sets.filter(x=>x.stage==='delivering').length>1)return false;
  const owners=new Set();
  for(const x of s.sets){
   if(x.origin!==origin||!STAGES.includes(x.stage)||!Object.hasOwn(JAPAN_BEDDING_POINTS,x.station)||!Number.isSafeInteger(x.cycle)||x.cycle<0||!Number.isFinite(x.dryingElapsed)||x.dryingElapsed<0||x.dryingElapsed>8||![null,CLERK,HOST,'player'].includes(x.carryOwner)||!Array.isArray(x.steps)||x.steps.length>6||x.customerName!=='客房旅人')return false;
   if(x.cycle===0?x.visitId!==null:!visitId(x.visitId)||Number(x.visitId.split('-').at(-1))>=s.nextUse)return false;
   if(['incoming','received'].includes(x.stage)&&(x.id!=='jp-bedding-2'||x.cycle!==0||x.station!=='receiving'))return false;
   if(guest(x)&&x.station!=='guest'||['incoming','installed','dirty','drying','clean'].includes(x.stage)&&x.carryOwner!==null)return false;
   if(x.stage==='delivering'&&(x.station!=='restock'||x.carryOwner!==CLERK))return false;
   if(x.carryOwner===CLERK&&!['received','delivering'].includes(x.stage)||[HOST,'player'].includes(x.carryOwner)&&!['collected','wet','dry','folded'].includes(x.stage))return false;
   if(x.carryOwner){if(owners.has(x.carryOwner))return false;owners.add(x.carryOwner);}
   if(WASH.includes(x.stage)&&x.cycle===0)return false;
   if(x.steps.some((step,i)=>!obj(step)||step.stage!==WASH[i]||![HOST,'player'].includes(step.actorId)||(step.actorId==='player'?!workId(step.receiptId):step.receiptId!==null)))return false;
   if(WASH.includes(x.stage)&&x.steps.length!==WASH.indexOf(x.stage))return false;
  }
  if(s.use!==null&&(!obj(s.use)||!visitId(s.use.id)||Number(s.use.id.split('-').at(-1))>=s.nextUse||!Number.isFinite(s.use.elapsed)||s.use.elapsed<0||s.use.elapsed>10||typeof s.use.used!=='boolean'||s.use.used!==(s.use.elapsed>=10)||s.use.linenId!==null&&!s.sets.some(x=>x.id===s.use.linenId&&x.stage==='installed')||s.use.used&&s.use.linenId&&s.sets.find(x=>x.id===s.use.linenId).visitId!==s.use.id))return false;
  const ids=new Set();for(const r of s.receipts){if(!obj(r)||r.source!=='japan-linen'||!['jp-bedding-1','jp-bedding-2'].includes(r.linenId)||!serial(r.cycle)||!visitId(r.visitId)||!workId(r.workReceiptId)||r.id!==`${r.linenId}-cycle-${r.cycle}-${r.workReceiptId}`||r.customerName!=='客房旅人'||r.completed!==true||r.accurate!==true||r.outcome!=='completed'||ids.has(`${r.linenId}:${r.cycle}`)||r.cycle>s.sets.find(x=>x.id===r.linenId).cycle)return false;ids.add(`${r.linenId}:${r.cycle}`);}
  return true;
 }
 function restore(s){if(!valid(s))return false;data=copy(s);loadError=null;invalidSaved=null;return true;}
 function tx(fn){if(loadError)return false;const prior=copy(data);try{if(fn()===false){data=prior;return false;}const result=saveState(copy(data));if(result===false||result?.then){if(result?.then)Promise.resolve(result).catch(()=>{});data=prior;return false;}return true;}catch{data=prior;return false;}}
 function observeUse(dt,mounted){
  if(loadError||!Number.isFinite(dt)||dt<0)return false;
  if(!mounted&&!data.use||mounted&&data.use?.used)return true;
  return tx(()=>{
   if(!mounted){if(data.use.used&&data.use.linenId){const x=set(data.use.linenId);x.stage='dirty';x.steps=[];}data.use=null;return;}
   if(!data.use){if(data.nextUse>=Number.MAX_SAFE_INTEGER)return false;data.use={id:`jp-bedding-use-${worldSeed>>>0}-${data.nextUse++}`,linenId:data.sets.find(x=>x.stage==='installed')?.id||null,elapsed:0,used:false};}
   const u=data.use;u.elapsed=Math.min(10,u.elapsed+Math.min(.1,dt));if(u.elapsed>=10){u.used=true;if(u.linenId){const x=set(u.linenId);if(x.cycle>=Number.MAX_SAFE_INTEGER)return false;x.cycle++;x.visitId=u.id;x.steps=[];}}
  });
 }
 function wash(id,stage,actor,e){
  const x=set(id),station={dirty:'guest',collected:'wash',wet:'hang',drying:'take',dry:'fold',folded:'restock'}[stage];
  if(!x||x.stage!==stage||!station||e.nextStage!==NEXT[stage]||e.expectedCycle!==x.cycle||!authorized(actor,e)||x.carryOwner&&x.carryOwner!==actor||data.sets.some(y=>y!==x&&y.carryOwner===actor)||!near(e.position,JAPAN_BEDDING_POINTS[station])||stage==='dirty'&&data.use||stage==='drying'&&x.dryingElapsed<8||['collected','wet','dry','folded'].includes(stage)&&x.carryOwner!==actor)return false;
  x.steps.push({stage,actorId:actor,receiptId:actor==='player'?e.receiptId:null});x.stage=NEXT[stage];x.station=station;x.carryOwner=['collected','wet','dry','folded'].includes(x.stage)?actor:null;
  if(x.stage==='drying')x.dryingElapsed=0;
  if(x.stage==='clean'&&actor==='player'&&x.steps.every(s=>s.actorId==='player'&&s.receiptId===e.receiptId)){const id=`${x.id}-cycle-${x.cycle}-${e.receiptId}`;data.receipts.push({source:'japan-linen',id,workReceiptId:e.receiptId,linenId:x.id,cycle:x.cycle,visitId:x.visitId,customerName:x.customerName,completed:true,accurate:true,outcome:'completed'});}
 }
 function receive(id,stage,e){const x=set(id);if(!x||x.stage!==stage||e.expectedCycle!==x.cycle)return false;
  if(stage==='incoming'){if(data.sets.some(y=>y.carryOwner===CLERK)||!near(e.position,JAPAN_BEDDING_POINTS.receiving))return false;x.stage='received';x.carryOwner=CLERK;}
  else if(stage==='received'){if(x.carryOwner&&x.carryOwner!==CLERK||!near(e.position,JAPAN_BEDDING_POINTS.restock))return false;x.stage='clean';x.station='restock';x.carryOwner=null;}
  else if(stage==='clean'){if(data.use||data.sets.some(y=>guest(y)||y.stage==='delivering'||y.carryOwner===CLERK)||!near(e.position,JAPAN_BEDDING_POINTS.restock))return false;x.stage='delivering';x.carryOwner=CLERK;}
  else if(stage==='delivering'&&e.returnToStock){if(x.carryOwner!==CLERK||!near(e.position,JAPAN_BEDDING_POINTS.restock))return false;x.stage='clean';x.station='restock';x.carryOwner=null;}
  else if(stage==='delivering'){if(data.use||data.sets.some(guest)||x.carryOwner!==CLERK||!near(e.position,JAPAN_BEDDING_POINTS.guest))return false;x.stage='installed';x.station='guest';x.carryOwner=null;}
  else return false;
 }
 const work=()=>loadError?[]:data.sets.filter(x=>WASH.includes(x.stage)&&!(x.stage==='dirty'&&data.use)).map(x=>({...copy(x),bedding:true,position:JAPAN_BEDDING_POINTS[x.station].slice()}));
 const api={snapshot,state:()=>loadError?{...copy(data),loadError}:copy(data),restore,observeUse,work,
  advance:(id,stage,actor,e={})=>tx(()=>wash(id,stage,actor,e)),
  claim(id,actor,e={}){return tx(()=>{const x=set(id);if(!x||!['collected','wet','dry','folded'].includes(x.stage)||x.carryOwner||x.cycle!==e.expectedCycle||!authorized(actor,e)||data.sets.some(y=>y.carryOwner===actor)||!near(e.position,JAPAN_BEDDING_POINTS[x.station]))return false;x.carryOwner=actor;});},
  releaseCarrier(actor){return tx(()=>{for(const x of data.sets)if(x.carryOwner===actor){if(actor===CLERK){x.stage=x.stage==='delivering'?'clean':'incoming';x.station=x.stage==='clean'?'restock':'receiving';}x.carryOwner=null;}});},
  tick(dt){if(!Number.isFinite(dt)||dt<=0||!data.sets.some(x=>x.stage==='drying'&&x.dryingElapsed<8))return false;return tx(()=>{for(const x of data.sets)if(x.stage==='drying')x.dryingElapsed=Math.min(8,x.dryingElapsed+Math.min(.1,dt));});},
  receivingWork(){if(loadError)return [];const held=data.sets.find(x=>x.carryOwner===CLERK);return copy(held?[held]:data.sets.filter(x=>x.stage==='incoming'||x.stage==='clean'&&!data.use&&!data.sets.some(y=>guest(y)||y.stage==='delivering')));},
  receive:(id,stage,e)=>tx(()=>receive(id,stage,e)),
  receipts:id=>loadError?[]:copy(data.receipts.filter(r=>!id||r.workReceiptId===id)),
  status:()=>({bedId:JAPAN_GUEST_BED,available:!loadError&&data.sets.some(x=>x.stage==='installed'),message:loadError?'寝具记录待恢复，原榻仍可休息':'寝具正在洗护，原榻仍可休息；洗净后会换回'})
 };
 if(saved!==null&&saved!==undefined&&!restore(saved)){loadError='invalid-bedding-state';invalidSaved=copy(saved);}return api;
}
