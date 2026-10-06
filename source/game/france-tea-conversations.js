import {createWorkplaceConversations} from './workplace-conversations.js';
export const FRANCE_TEA_TALK_PLACES=Object.freeze([[0,.23,-5],[0,.23,-3.5]]);
export function createFranceTeaConversations(options){return createWorkplaceConversations({...options,places:FRANCE_TEA_TALK_PLACES,placePrefix:'france-tea-talk-',labels:{invited:'相约到公共连廊说几句 · 来单先忙',appreciated:'喝茶与忙完一单的余暇 · 彼此谈得投缘',mismatched:'对喝茶与歇息各有想法 · 保留自己的习惯',neutral:'听听对方喝茶与工作的日常'}});}
