import {createChinaDailyToilet} from './china-daily-toilet.js';
import {createChinaPublicToilet} from './china-public-toilet.js';

// Keep the original palace save at the same root; the public facility adds an
// independent outbox. Facility receipt sequences cannot collide or replay.
export function createChinaDailyToilets(options){
 const {saved={},saveState=()=>true,getPlayer=()=>null,getBusy=()=>false}=options;
 let palaceSave=saved,publicSave=saved.publicWashroom||{};
 const services=[];
 const busy=(id,actor)=>services.some(s=>s.ownsActor(actor))||getBusy(id,actor);
 const persist=(kind,state)=>{const next=kind==='palace'?{...state,publicWashroom:publicSave}:{...palaceSave,publicWashroom:state};const result=saveState(next);if(result===false||result?.then)return false;if(kind==='palace')palaceSave=state;else publicSave=state;return true;};
 const palace=createChinaDailyToilet({...options,getBusy:busy,saveState:s=>persist('palace',s)});services.push(palace);
 const publicToilet=createChinaPublicToilet({...options,saved:publicSave,getBusy:busy,saveState:s=>persist('public',s)});services.push(publicToilet);
 const owned=actor=>services.find(s=>s.ownsActor(actor));
 const selected=()=>{const active=services.find(s=>s.active());if(active)return active;const p=getPlayer()?.root?.position;return services.filter(s=>s.intent()).sort((a,b)=>{const distance=s=>{const q=s.intent().position;return p?Math.hypot(q[0]-p.x,q[1]-p.y,q[2]-p.z):0;};return distance(a)-distance(b);})[0]||palace;};
 const forIntent=intent=>services.find(s=>s.intent()?.id===intent?.id);
 return {
  palaceIntent:()=>palace.intent(),palaceAvailable:()=>!!palace.intent()&&!palace.active(null),requestPalaceActor:actor=>palace.requestActor(actor),
  publicIntent:()=>publicToilet.intent(),publicAvailable:()=>!!publicToilet.intent()&&!publicToilet.active(null),requestPublicActor:actor=>publicToilet.requestActor(actor),
  exitPlan:actor=>owned(actor)?.exitPlan(actor)||null,
  restorePosition:(id,position)=>services.map(s=>s.restorePosition(id,position)).find(Boolean)||null,
  intent:()=>selected().intent(),intents:()=>services.map(s=>s.intent()).filter(Boolean),
  resolveIntent:intent=>forIntent(intent)?.resolveIntent(intent)||null,
  executeIntent:intent=>forIntent(intent)?.executeIntent(intent)||false,
  // Existing enrolled tavern guests use the nearby public stair, retaining the
  // old facility as a fallback only when a legacy lot lacks the new enclosure.
  requestActor:actor=>(publicToilet.intent()?publicToilet:palace).requestActor(actor),
  updateActor:(actor,dt,context)=>owned(actor)?.updateActor(actor,dt,context)||false,
  ownsActor:actor=>!!owned(actor),active:(id='player')=>services.some(s=>s.active(id)),
  cancel:(reason='cancelled',id='player')=>services.map(s=>s.cancel(reason,id)).every(Boolean),
  abandonActor:(id,reason='actor-unavailable')=>services.map(s=>s.abandonActor(id,reason)).every(Boolean),
  actorPose:actor=>owned(actor)?.actorPose(actor)||null,
  playerPose:()=>owned(getPlayer())?.playerPose()||null,playerAction:()=>owned(getPlayer())?.playerAction()||null,
  label:(id='player')=>services.find(s=>s.active(id))?.label(id)||null,
  update:dt=>services.forEach(s=>s.update(dt)),dispose:()=>services.forEach(s=>s.dispose()),
  state:()=>({...selected().state(),facilities:{palace:palace.state(),publicWashroom:publicToilet.state()}})
 };
}
