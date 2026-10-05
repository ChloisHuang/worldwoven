import {studyOptions} from './study-lessons.js';
// Visitor activities are explicit. An NPC's job/animation is never evidence
// that the player holds that job. Registered work has its own live provider.
const PUBLIC_STATIONS=new Set([
 'jp-exchange-teller','jp-omamori','jp-welcome','jp-onsen','jp-women-onsen','jp-sushi','jp-ramen','jp-tea','jp-balcony','jp-performance-reception',
 'cn-tea','cn-calligraphy','cn-rest','cn-garden','cn-archery','cn-range-warden','cn-money-house-teller','cn-tavern-host','cn-tavern-reception',
 'france-atelier','france-salon','france-cafe','france-exchange-teller',
 'egypt-exchange-teller','egypt-sphinx','egypt-glyphs','egypt-papyrus','egypt-scales','egypt-guardian','egypt-burial','egypt-stars',
 'egypt-anubis-judgment','egypt-horus-eye','egypt-cleopatra-suite','egypt-pharaoh-throne','egypt-royal-reception','egypt-private-bath',
]);
export function playerStationIntent(station,{clinicCollection=null}={}){
 if(!station||station.npcOnly)return null;
 if(station.id==='cn-pharmacy-assistant')return clinicCollection?{...station,...clinicCollection,priority:40}:null;
 if(!PUBLIC_STATIONS.has(station.id))return null;
 return {...station,action:({'jp-sushi':'点寿司','jp-ramen':'点拉面','cn-rest':'选择书目与技能','cn-calligraphy':'选择习字练习','france-salon':'选择书目与技能','france-atelier':'选择艺术练习','cn-archery':'参加习射','cn-range-warden':'参加习射'}[station.id]||station.action),priority:station.priority??(studyOptions(station.id).length?20:10)};
}

export function nearbyInteraction(candidate,position,{radius=candidate?.interactionRadius??2.8,clear=()=>true}={}){
 const p=candidate?.position;if(!p||!position||Math.abs(p[1]-position.y)>.45)return false;
 return Math.hypot(p[0]-position.x,p[2]-position.z)<=radius&&clear(candidate);
}

// Task actions beat optional chats; distance breaks ties between equal choices.
export function chooseNearbyInteraction(candidates,position,clear){
 return nearbyInteractions(candidates,position,clear)[0]||null;
}

// The HUD and chooser share this one spatial pass. Service actions at the same
// counter share its visibility result; furniture retains its own marker test.
export function nearbyInteractions(candidates,position,clear=()=>true){
 const visibility=new Map(),seen=new Set(),near=[];
 for(const candidate of candidates){
  if(!candidate||!position||!nearbyInteraction(candidate,position))continue;
  const identity=interactionIdentity(candidate);if(seen.has(identity))continue;
  const key=candidate.furniture?'furniture:'+candidate.id:candidate.position.join(':');
  if(!visibility.has(key))visibility.set(key,clear(candidate));
  if(!visibility.get(key))continue;
  seen.add(identity);near.push(candidate);
 }
 return near.sort((a,b)=>(b.priority??20)-(a.priority??20)||
  Math.hypot(a.position[0]-position.x,a.position[2]-position.z)-Math.hypot(b.position[0]-position.x,b.position[2]-position.z));
}

export function interactionIdentity(item){return [item?.provider||'',item?.social?'social':'',item?.id||'',item?.intentKey??''].join('|');}

export function interactionIcon(item){
 if(item?.icon)return item.icon;
 if(item?.social)return 'chat';
 if(item?.furniture&&item.kind==='seat')return 'chair';
 return 'hand';
}

export function groupInteractions(candidates){
 const groups=new Map();
 for(const action of candidates){const id=action.targetKey||action.actor?.station?.id||action.id;
  if(!groups.has(id))groups.set(id,{id,name:action.targetName||action.name||'附近',actions:[]});
  groups.get(id).actions.push(action);
 }
 return [...groups.values()];
}

// Menu entries are navigation intents, never transactions. Existing service
// panels own their confirmation, money, occupancy and cancellation semantics.
export function createServiceMenuIntents(){
 const providers=new Map();
 function intent(id){const source=providers.get(id),target=source?.target();return target?{...target,id:'menu-'+id,provider:'service-menu',menuId:id,kind:'view',intentKey:target.intentKey??id,executionRadius:target.executionRadius??1.8,interactionRadius:target.interactionRadius??2.8,keepSeat:true}:null;}
 function resolveIntent(selected){return currentInteractionIntent(selected,intent(selected?.menuId));}
 return {
  register(id,source){providers.set(id,source);},clear(){providers.clear();},
  candidates(){return [...providers.keys()].map(intent).filter(Boolean);},intent,resolveIntent,
  executeIntent(selected){const current=resolveIntent(selected);return current?providers.get(current.menuId).open(current)!==false:false;},
 };
}

// Resolve identity against live state, never an old button's callback. Providers
// supply their own phase/choice key; a new visit cannot inherit an old intent.
export function currentInteractionIntent(selected,current){
 if(!selected||!current||selected.id!==current.id||selected.provider!==current.provider)return null;
 if((selected.provider||selected.intentKey!==undefined)&&selected.intentKey!==current.intentKey)return null;
 return current;
}
