import {createPalaceCompanionship} from './palace-companionship.js';
import {SALON_ARTISTS} from './china-tavern-salon-artists.js';
const artists=new Set(SALON_ARTISTS.map(a=>a.id));
// Reuse the same two-person consent, identity, cooldown, journal and physical
// journey engine. This policy confers no title, wages, room or consent rights.
export function createChinaSalonCompanionship(options={}){
 return createPalaceCompanionship({...options,venuePolicy:{prefix:'salon-company',
  allowedPair:(a,b)=>a!==b&&(artists.has(a)||artists.has(b)),
  labels:{requested:'提出今夜相伴的请求',selected:'已选中，等待本人答复',summoned:'邀约已送达，等双方确认',travelling:'一同前往有合法使用权的客房',together:'双方自愿，相伴片刻'}
 }});
}
