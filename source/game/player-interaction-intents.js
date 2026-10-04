// Visitor activities are explicit. An NPC's job/animation is never evidence
// that the player holds that job. Career applications are not implemented yet.
const PUBLIC_STATIONS=new Set([
 'jp-omamori','jp-welcome','jp-onsen','jp-women-onsen','jp-sushi','jp-ramen','jp-tea','jp-balcony','jp-performance-reception',
 'cn-tea','cn-calligraphy','cn-rest','cn-garden','cn-archery','cn-range-warden','cn-money-house-teller','cn-tavern-host','cn-tavern-reception',
 'france-atelier','france-salon','france-cafe',
 'egypt-sphinx','egypt-glyphs','egypt-papyrus','egypt-scales','egypt-guardian','egypt-burial','egypt-stars',
 'egypt-anubis-judgment','egypt-horus-eye','egypt-cleopatra-suite','egypt-pharaoh-throne','egypt-royal-reception','egypt-private-bath',
]);
export function playerStationIntent(station,{clinicCollection=null}={}){
 if(!station||station.npcOnly)return null;
 if(station.id==='cn-pharmacy-assistant')return clinicCollection?{...station,...clinicCollection,priority:40}:null;
 if(!PUBLIC_STATIONS.has(station.id))return null;
 return {...station,action:({'jp-sushi':'点寿司','jp-ramen':'点拉面','cn-archery':'参加习射','cn-range-warden':'参加习射'}[station.id]||station.action),priority:10};
}

export function nearbyInteraction(candidate,position,{radius=candidate?.interactionRadius??2.8,clear=()=>true}={}){
 const p=candidate?.position;if(!p||!position||Math.abs(p[1]-position.y)>.45)return false;
 return Math.hypot(p[0]-position.x,p[2]-position.z)<=radius&&clear(candidate);
}

// Task actions beat optional chats; distance breaks ties between equal choices.
export function chooseNearbyInteraction(candidates,position,clear){
 return candidates.filter(c=>c&&nearbyInteraction(c,position,{clear})).sort((a,b)=>(b.priority??20)-(a.priority??20)||
  Math.hypot(a.position[0]-position.x,a.position[2]-position.z)-Math.hypot(b.position[0]-position.x,b.position[2]-position.z))[0]||null;
}

// Resolve identity against live state, never an old button's callback. Providers
// supply their own phase/choice key; a new visit cannot inherit an old intent.
export function currentInteractionIntent(selected,current){
 if(!selected||!current||selected.id!==current.id||selected.provider!==current.provider)return null;
 if((selected.provider||selected.intentKey!==undefined)&&selected.intentKey!==current.intentKey)return null;
 return current;
}
