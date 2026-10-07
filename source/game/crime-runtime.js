import {createCrimeConsequences} from './crime-consequences.js';
import {holdSocialActors,releaseSocialActors,socialHoldOwner} from './npc-social-ownership.js';
import {followActorRoute} from './actor-navigation.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const idOf=n=>n.actorId||n.station?.id||'player';
// Scene adapter owns only short-lived movement leases. Identity, money, roles,
// health and relationships remain in their original authoritative modules.
export function createCrimeRuntime({country,lot,getActors,getPlayer,getClock,getAnimationTime=()=>getClock().seconds,getProfile,getRelation,getMode,getGuards,guardResumed,planPath,moveActor,doors,poseContext,canSee,isAdult,canPerceive=()=>true,playerAvailable,stopPlayer,saveState,saved={},applyInjury,recordRelationship,notify=()=>{}}){
 const owner='crime:'+country,held=new Map(),routes=new Map(),reported=new Set(),routeFailures=new Map();let action=null,scanIn=0,modelIn=0,modelElapsed=0,cachedOrder=null,leaseDirty=false,disposed=false,leases=clone(saved.leases||{}),lastNotice='';
 const actor=id=>getActors().find(n=>idOf(n)===id),key=n=>`${idOf(n)}@${n.lifeId??n.station?.lifeId??'original'}`;
 const available=n=>n&&n.alive!==false&&isAdult(idOf(n))&&!n.serviceMount&&!n.bathTransition&&(n===getPlayer()?playerAvailable():held.has(idOf(n))||getMode(n)==='leave');
 const rows=()=>getActors().map(n=>({key:key(n),id:idOf(n),countryId:country,sceneId:country,position:point(n.root.position),alive:n.alive!==false,awake:n.serviceMount?.kind!=='bed'&&n.socialPrivateFade!==true&&canPerceive(n),available:available(n),adult:isAdult(idOf(n))}));
 const guardRows=()=>getGuards().map(n=>({key:key(n),id:idOf(n),countryId:country,sceneId:country,position:point(n.root.position),alive:n.alive!==false,routeFailed:(routeFailures.get(idOf(n))||0)>getClock().seconds,available:!socialHoldOwner(idOf(n))||socialHoldOwner(idOf(n))===owner}));
 const jail=()=>lot.holdingCell?{countryId:country,sceneId:country,entry:point(lot.holdingCell.intake),cell:point(lot.holdingCell.detention),release:point(lot.holdingCell.release),guardCell:{x:-22.9,y:-4.1,z:35.45},guardEntry:{x:-18.1,y:-4.1,z:35}}:null;
 const items=()=>lot.holdingCell?.evidence?[{id:lot.holdingCell.evidence.itemId,ownerId:lot.holdingCell.evidence.owner,name:'封存巡查信物',countryId:country,sceneId:country,position:point(lot.holdingCell.evidence.position)}]:[];
 function persist(engine){return saveState({engine,leases:clone(leases)});}
 const model=createCrimeConsequences({saved:saved.engine,persist,getClock:()=>getClock().seconds,actors:rows,guards:guardRows,items,jail,harmRadius:.9,hasLineOfSight:(a,b)=>canSee(a.position||a,b.position||b)});
 function release(id){const n=actor(id),old=held.get(id)||leases[id];if(n&&old&&n.alive!==false&&(!old.lifeKey||old.lifeKey===key(n))){n.route=old.target?planPath(n.root.position,point(old.target),n===getPlayer()?.34:.25):[];n.walking=false;if(Number.isFinite(old.breakRemaining))n.breakAt=getAnimationTime()+old.breakRemaining;}held.delete(id);delete leases[id];routes.delete(id);}
 function reconcile(ids){const needed=new Set(ids.filter(id=>id!=='player'));
  const fresh=[...needed].filter(id=>!held.has(id));if(fresh.some(id=>{const n=actor(id);return !n||n.alive===false||socialHoldOwner(id)&&socialHoldOwner(id)!==owner;}))return false;
  const previous=clone(leases);for(const id of fresh){const n=actor(id);if(leases[id]?.lifeKey&&leases[id].lifeKey!==key(n))delete leases[id];leases[id]??={lifeKey:key(n),guard:getGuards().includes(n),target:n.route?.length?point(n.route.at(-1)):null,breakRemaining:Number.isFinite(n.breakAt)?n.breakAt-getAnimationTime():null};}
  if(fresh.length&&!persist(model.snapshot())){leases=previous;return false;}
  if(needed.size&&!holdSocialActors([...needed],owner))return false;
  for(const id of new Set([...held.keys(),...Object.keys(leases)]))if(!needed.has(id)){const wasGuard=held.get(id)?.guard===true;if(held.has(id))release(id);else delete leases[id];leaseDirty=true;if(wasGuard)guardResumed();}
  if(!needed.size)releaseSocialActors(owner);for(const id of fresh){held.set(id,clone(leases[id]));actor(id).route=[];}
  return true;
 }
 function enforcementIds(){return [cachedOrder?.guardKey,cachedOrder?.holdSubject?cachedOrder.subjectKey:null].filter(Boolean).map(k=>getActors().find(n=>key(n)===k)).filter(Boolean).map(idOf);}
 function walk(n,to,dt,speed=1){if(!n||!to)return;const p=point(to),id=idOf(n),current=routes.get(id);if(gap(n.root.position,p)<.16){n.walking=false;return;}
  if(!current||gap(current.target,p)>.6||!n.route?.length&&getClock().seconds>=current.retry){n.route=planPath(n.root.position,p,n===getPlayer()?.34:.25);routes.set(id,{target:p,retry:getClock().seconds+2,stalled:current&&gap(current.target,p)<=.6?current.stalled:0});}
  const route=routes.get(id);const before=point(n.root.position);followActorRoute(n,dt,{doors,moveActor,npcs:getActors().filter(a=>a!==getPlayer()),playerPosition:getPlayer()?.root.position,radius:n===getPlayer()?.34:.25,speedScale:speed});
  if(gap(before,n.root.position)<.001)route.stalled+=dt;else route.stalled=0;
  if(route.stalled>18){if(cachedOrder?.guardKey){const g=getActors().find(n=>key(n)===cachedOrder.guardKey);if(g)routeFailures.set(idOf(g),getClock().seconds+30);}model.cancelEnforcement('route-blocked');cachedOrder=model.orders();notify('通路暂时受阻，查捕线索保留；先让出通道，警卫会重新核实。');route.stalled=0;}
 }
 function flushEffects(){for(const effect of model.pendingEffects?.()||[]){const a=getActors().find(n=>key(n)===effect.actorKey),v=getActors().find(n=>key(n)===effect.victimKey);if(!a||!v)continue;if(a.alive===false||v.alive===false){model.ackEffect(effect.id);continue;}
   if(effect.kind==='harm'){const ok=applyInjury({id:effect.id,actorId:idOf(a),victimId:idOf(v),at:effect.at??getClock().seconds});if(!ok?.ok)continue;
    const rel=recordRelationship({id:effect.id+':relation',source:'crime-consequences',actorId:idOf(a),participants:[idOf(a),idOf(v),...(effect.witnessIds||[])],outcome:'failed',fault:true,kind:'physical-harm',at:effect.at??getClock().seconds});if(!rel?.ok)continue;
   }model.ackEffect(effect.id);
  }}
 function beginHarm(subjectId,victimId){const a=actor(subjectId),v=actor(victimId);if(a&&v&&!model.canHarm(key(a),key(v)).ok)return false;if(action||!available(a)||!v||!isAdult(victimId)||v.alive===false||gap(a.root.position,v.root.position)>.9||!canSee(a.root.position,v.root.position))return false;
  if(a===getPlayer())stopPlayer();action={actorId:subjectId,victimId,actorKey:key(a),victimKey:key(v),time:0,origin:point(a.root.position)};notify(`${a===getPlayer()?'你':a.station.npcName}正要推搡${v===getPlayer()?'你':v.station.npcName}。这会造成擦伤并留下目击线索；现在移动或按 E 可停止。`);return true;
 }
 function cancelAction(){if(!action)return false;action=null;reconcile(enforcementIds());return true;}
 function harmChoices(){const p=getPlayer();if(!p||!available(p)||action)return [];return getActors().filter(n=>n!==p&&n.alive!==false&&isAdult(idOf(n))&&gap(n.root.position,p.root.position)<.9&&canSee(p.root.position,n.root.position)).map(n=>({id:'crime-harm:'+idOf(n),crime:true,kind:'harm',victimId:idOf(n),name:n.station.npcName||'对方',action:'推搡（会致伤并留下违法记录）',position:n.root.position.toArray(),interactionRadius:.9,executionRadius:.9,priority:-20}));}
 function autonomous(){
  // A real history of serious mutual fallout is required. No roll invents a
  // crime, and beauty, country, poverty or occupational status are never causes.
  for(const a of getActors()){if(a===getPlayer()||!available(a)||socialHoldOwner(idOf(a)))continue;
   for(const v of getActors()){if(v===a||v.alive===false||!isAdult(idOf(v))||gap(a.root.position,v.root.position)>.9)continue;
    const relation=getRelation(idOf(a),idOf(v)),profile=getProfile(idOf(a));
    if(relation?.aversion>.42&&relation.trust<-.35&&relation.last?.outcome==='failed'&&relation.last.fault===true&&getClock().seconds-relation.last.at<180&&(profile.values?.reliability??.5)<.55&&canSee(a.root.position,v.root.position)){if(beginHarm(idOf(a),idOf(v)))return;}
   }
  }
 }
 function update(dt,t){if(disposed)return;
  if(action){const a=actor(action.actorId),v=actor(action.victimId);if(!a||!v||key(a)!==action.actorKey||key(v)!==action.victimKey||!available(a)||v.alive===false||gap(a.root.position,action.origin)>.2||gap(a.root.position,v.root.position)>.9||!canSee(a.root.position,v.root.position)){cancelAction();return;}
   if(!reconcile([...enforcementIds(),...(a===getPlayer()?[]:[idOf(a)])])){cancelAction();return;}action.time+=dt;a.root.rotation.y=Math.atan2(v.root.position.x-a.root.position.x,v.root.position.z-a.root.position.z);a.walking=false;
   a.animate(t+(a.phase||0),false,null,{...poseContext(a,null),handoff:true});
   if(action.time>=1.2){const result=model.offend({actorKey:key(a),victimKey:key(v),kind:'harm'});notify(result.ok?'推搡造成擦伤。附近看清的人会记住，受害者可以呼救。':'动作未能完成，未记入伤害。');action=null;reconcile(enforcementIds());flushEffects();}
  }
  modelElapsed+=dt;modelIn-=dt;
  if(modelIn<=0){modelIn=.5;if(leaseDirty&&persist(model.snapshot()))leaseDirty=false;flushEffects();const update=model.update(modelElapsed);for(const event of update.events||[])if(event.kind==='report'&&!reported.has(event.caseId)){reported.add(event.caseId);const witness=getActors().find(n=>key(n)===event.witnessKey);notify(event.witnessKey===event.guardKey?'巡卫当场看见了经过，正在核实涉事者。':`${witness===getPlayer()?'你':witness?.station?.npcName||'目击者'}当面呼救，近处巡卫听见了具体位置。`);}modelElapsed=0;cachedOrder=model.orders();const cell=lot.holdingCell;if(cell){const item=model.snapshot().items?.[cell.evidence.itemId];cell.setEvidencePresent(!item?.holderKey);}}
  const order=cachedOrder,subject=order&&getActors().find(n=>key(n)===order.subjectKey),guard=order&&getActors().find(n=>key(n)===order.guardKey);
  const ids=[guard,order?.holdSubject?subject:null].filter(Boolean).map(idOf);
  if(!action&&!reconcile(ids)){model.cancelEnforcement('actor-busy');cachedOrder=null;return;}
  const cell=lot.holdingCell;
  if(cell){const lock=order?.status==='custody'&&subject&&subject.root.position.z<34.0&&subject.root.position.y<-3;cell.setLocked(lock);}
  if(order){if(guard&&order.guardTarget)walk(guard,order.guardTarget,dt,order.status==='pursuit'?1.2:.85);if(subject&&order.holdSubject&&order.subjectTarget){if(subject===getPlayer())stopPlayer();walk(subject,order.subjectTarget,dt,.85);if(subject===getPlayer())subject.animate(t,!!subject.walking,null,poseContext(subject,null));}}
  const status=model.status(key(getPlayer())),notice=status?.status;
  if(notice&&notice!==lastNotice){lastNotice=notice;if(['pursuit','escort','custody','releasing','released'].includes(notice))notify({pursuit:'警卫根据真实目击正在追来。你可以停下配合，也可以归还物品。',escort:'警卫已近身拘捕，正带你沿通路去登记；不会瞬移。',custody:'已到小牢房，短暂留置按实际游玩时间计时，离线不补时。',releasing:'留置结束，门已打开，正沿楼梯返回公共庭院。',released:'已返回庭院。归还信物、向实际受害者道歉可以修复后续关系。'}[notice]);}
  scanIn-=dt;if(scanIn<=0){scanIn=2;if(!action&&!cachedOrder)autonomous();}
 }
 function choices(){const p=getPlayer();if(!p)return[];const result=model.status(key(p)).detained?[]:harmChoices();for(const x of model.actions(key(p))||[]){result.push({...x,id:'crime:'+x.kind+':'+(x.itemId||x.caseId||''),crime:true,name:'巡查与案情',action:x.label||x.action||({take:'拿走封存巡牌（未经许可，属于违法）',return:'归还原封存巡牌',report:'向近处警卫报告亲眼所见',surrender:'停下，向面前警卫说明并配合'}[x.kind]||x.kind),position:x.position?[x.position.x,x.position.y,x.position.z]:p.root.position.toArray(),interactionRadius:2,executionRadius:2,priority:20});}return result;}
 return {update,choices,beginHarm,cancelAction,model,status:()=>model.status(key(getPlayer())),snapshot:()=>({engine:model.snapshot(),leases:clone(leases)}),
  controlsPlayer:()=>!!cachedOrder?.holdSubject&&cachedOrder.subjectKey===key(getPlayer()),
  activeAction:()=>action&&clone(action),
  owns:n=>held.has(idOf(n)),
  pose(n,t){if(held.has(idOf(n))||action?.actorId===idOf(n)){n.animate(t+(n.phase||0),!!n.walking,null,{...poseContext(n,null),...(action?.actorId===idOf(n)?{handoff:true}:{})});return true;}return false;},
  interact(x){if(x.kind==='harm')return beginHarm('player',x.victimId);const p=key(getPlayer());const r=x.kind==='take'?model.take(p,x.itemId):x.kind==='return'?model.returnItem(p,x.itemId):x.kind==='report'?model.report(p,x.caseId):x.kind==='surrender'?model.surrender(p):null;flushEffects();if(r&&!r.ok)notify('这项操作目前不能完成，请靠近相关人物或物品。');return !!r?.ok;},
  dispose(){disposed=true;action=null;const wasGuard=[...held.values()].some(x=>x.guard);for(const id of [...held.keys()])release(id);releaseSocialActors(owner);if(wasGuard)guardResumed();}
 };
}
