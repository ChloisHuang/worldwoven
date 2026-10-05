// One read-only projection at an invitation or formal decision boundary. Existing
// NPC friendships, clocks and histories stay owned by their original controller.
const bounded=n=>Math.max(-1,Math.min(1,Number.isFinite(n)?n:0));
export function createPlayerSocialContext({getProfile,ledger}){
 function profileFor(id){const p=getProfile(id)||{},known=!!ledger.lastCompleted(id),relations={...p.relations},opinions={...p.opinions};if(known||Number.isFinite(relations.player))relations.player=bounded((relations.player||0)+ledger.relationFor(id,'player'));if(known||Number.isFinite(opinions.player))opinions.player=bounded((opinions.player||0)+ledger.knownOpinion(id,'player'));return {...p,relations,opinions};}
 return {profileFor,relationFor:(id,target='player')=>target==='player'?bounded(profileFor(id).relations.player):bounded(getProfile(id)?.relations?.[target]),knownOpinion:(id,target='player')=>target==='player'?bounded(profileFor(id).opinions.player):bounded(getProfile(id)?.opinions?.[target])};
}
