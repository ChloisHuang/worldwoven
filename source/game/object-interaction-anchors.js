// Presentation identity is separate from navigation and permission. In
// particular, position is normally an approach point, never a marker fallback.
const finitePoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const value=source=>typeof source==='function'?source():source;
const STUDY_FIXTURES=new Set(['cn-rest','cn-calligraphy','france-salon','france-atelier','jp-library','egypt-papyrus']);
const EMPLOYERS={
 'japan-reception-employment':'jp-welcome','japan-bath-delivery-employment':'jp-onsen',
 'japan-women-bath-delivery-employment':'jp-women-onsen','japan-bath-mixing-employment':'jp-incense',
 'japan-kitchen-employment':'jp-sushi','japan-table-service-employment':'jp-ramen',
 'egypt-kitchen-employment':'egypt-royal-kitchen','egypt-table-service-employment':'egypt-royal-dining',
 'china-clinic-employment':'cn-clinic-physician','china-clinic-physician-employment':'cn-clinic-physician',
 'china-royal-kitchen-employment':'cn-cooking','china-guard-employment':'cn-range-warden',
 'china-tavern-labor':'cn-tavern-host','china-tavern-service':'cn-tavern-host','china-tavern-lodging':'cn-tavern-host',
 'china-salon-employment':'cn-tavern-reception','france-gardener-labor':'france-gardener',
 'france-tea-employment':'france-salon','france-pastry-employment':'france-bakery',
};
// These surfaces are authored in japan-bathhouse and its original counters.
// They are deliberately distinct from the service's clear standing positions.
const JAPAN_FIXTURES={
 'jp-sushi':[-6,1.065,-1.8],'jp-ramen':[4.1,1.07,4.15],
 'men-change':[-11.2,5.15,2.4],'women-change':[6.3,5.15,2.4],
 'men-wash':[-10.65,4.65,-4.15],'women-wash':[4.6,4.65,-4.15],
 'men-collect':[-4.2,4.42,-3.1],'women-collect':[1.35,4.42,-3.1],
};

// Explicit navigation/current-service controls have no object to label.
export function isObjectlessInteraction(action){
 if(!action)return false;
 if(action.contextControl||action.continuation)return true;
 if(action.provider==='china-court-career'&&action.kind==='attend')return true;
 if(action.provider==='china-guard-employment'&&action.kind==='task')return true;
 if(action.provider==='china-tavern-service'&&['work-view','end-shift'].includes(action.kind))return true;
 if(action.provider==='china-salon-employment'&&['work-view','decline'].includes(action.kind))return true;
 if(action.provider==='china-consort-petition'&&action.kind==='residence')return true;
 return !!action.playerService&&['stop','stand'].includes(action.serviceStep?.kind);
}

export function createObjectInteractionAnchors({actors=()=>[],stations=()=>[],furniture=()=>null}={}){
 let actorById=new Map(),stationById=new Map(),furnitureById=new Map();
 function refresh(){
  actorById=new Map();for(const actor of value(actors)||[])for(const id of[actor.actorId,actor.station?.id,actor.id])if(id)actorById.set(id,actor);
  stationById=new Map((value(stations)||[]).map(station=>[station.id,station]));
  const items=value(furniture);furnitureById=new Map((Array.isArray(items)?items:items?.items||[]).map(item=>[item.id,item]));
 }
 function clear(){actorById.clear();stationById.clear();furnitureById.clear();}
 const floor=(action,point)=>Number.isFinite(action?.position?.[1])?action.position[1]:point?.[1];
 function person(id,action,kind='chat'){
  const actor=typeof id==='object'?id:actorById.get(id);
  if(!actor?.root?.position)return null;
  return {id:'actor:'+(actor.actorId||actor.station?.id||actor.id),kind,actor,floorY:actor.root.position.y};
 }
 function fixture(id,point,action){return finitePoint(point)?{id:'object:'+id,kind:'hand',point:point.slice(),floorY:floor(action,point)}:null;}
 function furnishing(id,action){const item=typeof id==='object'?id:furnitureById.get(id);return item?{id:'furniture:'+item.id,kind:'hand',furniture:item,floorY:floor(item,item.center)}:null;}
 function authored(meta,action){
  if(!meta)return null;
  if(meta.actorId)return person(meta.actorId,action);
  if(meta.furnitureId)return furnishing(meta.furnitureId,action);
  return fixture(meta.id||action.facilityId||action.id,meta.point,action);
 }
 function resolve(action){
  if(!action||isObjectlessInteraction(action))return null;
  if(action.social)return person(action.actor||action.id,action,'chat');
  const explicit=action.visualAnchor||action.work?.visualAnchor||action.choice?.visualAnchor||action.serviceStep?.visualAnchor;
  if(explicit)return authored(explicit,action);
  if(action.furniture)return furnishing(furnitureById.get(action.id)||action,action);
  if(action.serviceStep?.item)return furnishing(action.serviceStep.item,action);
  if(action.seatId)return furnishing(action.seatId,action);
  const workPoint=action.playerWorkTarget||action.work?.target;
  if(finitePoint(workPoint))return fixture('work:'+workPoint.join(':'),workPoint,action);
  if(action.playerService||action.provider==='japan-player-service'){
   const step=action.serviceStep||action,kind=step?.kind;
   if(['change','wash','collect'].includes(kind)){
    const side=step.position?.[0]<0?'men':'women',id=side+'-'+kind;
    return fixture('jp-'+id,JAPAN_FIXTURES[id],action);
   }
   if(['register','return','panel'].includes(kind)||action.id==='jp-player-service-desk')return person('jp-welcome',action);
   if(['dining-panel','order'].includes(kind)){const id=step.dishId?'jp-'+step.dishId:action.id.replace('jp-dining-','jp-');return fixture(id,JAPAN_FIXTURES[id],action);}
   return null;
  }
  // A remote panel remains an ongoing control; attaching it to a distant
  // employer would wrongly make it look like an on-site interaction.
  if(action.continuation)return null;
  if(action.provider==='china-court-career'){
   if(action.kind==='attend')return null;
   if(['review','promotion-review'].includes(action.kind))return null; // Provider supplies the actual recruiter.
   return fixture('cn-court-career-desk',['archive','settle','receive-document','promotion-receive-document'].includes(action.kind)?[21.44,1.235,31.55]:[20.63,1.235,31.47],action);
  }
  if(action.provider==='france-gardener-labor'&&['take','return'].includes(action.kind))return fixture('fr-garden-tools',[-17.25,.83,14.2],action);
  if(action.provider==='china-guard-employment'&&action.kind==='task')return null;
  if(action.provider==='china-tavern-service'&&['task','work-view','end-shift'].includes(action.kind))return null;
  if(action.provider==='china-salon-employment'&&['work-view','decline','go-room'].includes(action.kind))return null;
  if(action.provider==='china-consort-petition'&&action.kind==='residence')return null;
  if(action.work)return null; // Incomplete work metadata must never become an employer marker.
  if(EMPLOYERS[action.provider])return person(EMPLOYERS[action.provider],action);
  const id=action.targetKey||action.id;
  const item=furnitureById.get(id);if(item)return furnishing(item,action);
  if(id==='france-cafe'||action.franceTea||action.menuId==='france-meal')return fixture('france-tea-table',[6.4,1.230,11.24],action);
  if(JAPAN_FIXTURES[id])return fixture(id,JAPAN_FIXTURES[id],action);
  const station=stationById.get(id)||action;
  if(STUDY_FIXTURES.has(id))return fixture(id,station.markerPoint||station.playerWorkTarget||station.workTarget,action);
  const actor=action.actor||actorById.get(id);if(actor)return person(actor,action);
  return fixture(id,station.markerPoint||station.playerWorkTarget||station.workTarget,action);
 }
 refresh();return {refresh,resolve,clear};
}
