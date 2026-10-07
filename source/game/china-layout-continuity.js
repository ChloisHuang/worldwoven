// Only stale spatial intent is invalidated. Saved bodies stay where the shared
// continuity resolver can safely restore them; no lift/teleport moves a worker
// to the relocated kitchen, and no order, balance or receipt is rewritten here.
export const CHINA_LAYOUT_REVISION=3;
export const movedChinaSeat=id=>typeof id==='string'&&(id.startsWith('china-palace-dining-seat-')||id.startsWith('china-tavern-dining-')||id.startsWith('china-tavern-bed-')||id==='china-tavern-lobby-seat');
const affected=p=>Array.isArray(p)&&p.length===3&&p[0]>=15.6&&p[0]<=26.4&&p[2]>=-12.4&&p[2]<=21.4;
export function migrateChinaLayoutContinuity(saved){
 if(!saved||saved.chinaLayoutRevision===CHINA_LAYOUT_REVISION)return false;
 const legacy=!saved.chinaLayoutRevision;
 const moved=id=>legacy?movedChinaSeat(id):typeof id==='string'&&(id.startsWith('china-tavern-dining-')||id.startsWith('china-tavern-listening-')||id.startsWith('china-tavern-banquet-')||saved.chinaLayoutRevision<2&&id.startsWith('china-tavern-bed-'));
 const changed=p=>affected(p)&&(legacy||p[2]>=10.2);
 const cp=saved.worldContinuity?.regions?.china;
 if(cp?.version===1){
  for(const state of[cp.player,...Object.values(cp.actors||{})].filter(Boolean)){
   if(changed(state.target))state.target=null;
   if(moved(state.mountId))state.mountId=null;
  }
  const a=cp.activity;if(a){if(moved(a.seated))a.seated=null;if(changed(a.destination))a.destination=null;
   const ref=a.performing;if(!legacy&&ref&&!ref.provider&&['cn-tavern-reciter','cn-tavern-storyteller','cn-tavern-songwriter','cn-tavern-chess-poet'].includes(ref.id)){a.target={...ref};a.pending={...ref};a.performing=null;a.actionTime=0;}if(legacy&&ref&&(ref.id==='cn-cooking'||ref.id?.startsWith('cn-tavern-')||ref.provider?.includes('royal-kitchen')||ref.provider?.includes('tavern'))){a.performing=null;a.actionTime=0;}
  }
 }
 saved.chinaLayoutRevision=CHINA_LAYOUT_REVISION;return true;
}
