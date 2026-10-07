import {isSociallyHeld} from './npc-social-ownership.js';
import {npcAppearance} from './appearance.js';

// Resident IDs (including Ren and the shrine attendant) are never reused for
// visitors. The durable visit number is committed before the scene spawns them.
const NAMES=['Hina','Takumi','Kaede','Riku','Yuna','Minato','Shiori','Kento'];
export function createJapanVisitorIdentity({id,number},worldSeed=1,shapeVersion=1) {
 const appearance=npcAppearance('japan',id,worldSeed,shapeVersion);
 return {id,name:NAMES[(number-1)%NAMES.length],appearance,side:appearance.bodyPreset.startsWith('masculine')?'men':'women'};
}

export function japanVisitorStation(visit) {
 return {id:visit.id,npcName:visit.name,name:'汤馆来客',culture:'japan',npcAction:null,npcLabel:'沿参道来到汤馆',npcPosition:visit.position.slice(),position:visit.position.slice(),dialogue:`我领的是第 ${visit.number} 号浴牌，泡完汤想坐下吃份喜欢的餐点。`};
}

// Facility experiences still use station IDs. A mobile employee participates
// only when actually beside the player, never remotely from another floor.
export function isJapanEmployeeInteraction(actor,state) {
 if(isSociallyHeld(actor.station.id))return true;
 const p=state.position,n=actor.root.position;
 return (state.conversationActorId||state.performing)===actor.station.id&&!!p&&Math.abs(p.y-n.y)<.65&&Math.hypot(p.x-n.x,p.z-n.z)<=(state.conversationActorId===actor.station.id?2.4:1.8);
}
