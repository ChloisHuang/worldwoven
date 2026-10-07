export const SHOJI_SIDE_OVERLAP=.10;
// Traversable aperture policy, audited against the constructed regional walls.
// This is game design for the authored fantasy lots, not a historical claim.
// Geometry is resolved from live thresholds: raised palace levels remain valid.
// Complete current room/open-space inventory: docs/d05-entry-audit.md. Legacy
// policy keys do not imply an extant aperture; classify only constructed doorways.
const POLICY={
 japan:{
  'jp-food-prep-door':['half-curtain','Food preparation to public hall: split indigo service noren'],
  'jp-men-noren':['half-curtain','Retain the fixed men’s noren and existing offset privacy screen; no duplicate closure'],
  'jp-women-noren':['half-curtain','Retain the fixed women’s noren and existing offset privacy screen; no duplicate closure'],
  'jp-men-wet-threshold':['full-curtain','Changing to bathing: full split cloth keeps the wet area private'],
  'jp-women-wet-threshold':['full-curtain','Changing to bathing: full split cloth keeps the wet area private'],
  'jp-men-pool-entry':['open','Open poolside approach to a supported bathing action; the retaining basin wall is not an ordinary walking passage'],
  'jp-women-pool-entry':['open','Open poolside approach to a supported bathing action; the retaining basin wall is not an ordinary walking passage'],
  'jp-library-open-nook':['open','Reading nook is part of the public kotatsu gathering floor'],
  'jp-guest-suite-door':['door','Sleeping suite needs opaque two-sided shoji privacy'],
  'jp-laundry-stair-foyer-door':['half-curtain','Linen workroom transition uses split service cloth, clear of stair mouth'],
  'jp-operator-door':['door','Private operator office and records use timber lattice closure'],
  'jp-apothecary-room-door':['half-curtain','Active preparation workroom uses split service noren'],
  'jp-staff-room-door':['door','Staff sleeping quarters require full opaque privacy'],
  'jp-laundry-door':['half-curtain','Linen service opening stays legible without a heavy door'],
  'jp-washroom-cubicle-1':['door','Individual WC requires full opaque closure'],
  'jp-washroom-cubicle-2':['door','Individual WC requires full opaque closure'],
  'jp-washroom-cubicle-3':['door','Individual WC requires full opaque closure'],
  'jp-washhouse-entry':['half-curtain','Shared sinks/linen arrival; each WC has its own full door'],
  'jp-torii':['open','Freestanding symbolic garden gateway'],
  'jp-courtyard-east-walk':['open','Outdoor cross-court circulation'],
  'jp-courtyard-west-walk':['open','Outdoor cross-court circulation'],
  'jp-market-door':['half-curtain','Travel shop threshold uses a split welcoming noren'],
  'jp-supplies-door':['door','Enclosed rear stock room needs a timber service closure'],
  'jp-gateway':['open','Broad arrival gateway and outdoor axis'],
  'jp-1-front-portal':['half-curtain','Retain the original overhead Yu-marked split noren; no duplicate moving half-curtain'],
  'jp-2-front-portal':['open','Shared bath foyer to safe balcony; privacy starts at changing rooms'],
  'jp-3-front-portal':['open','Public kotatsu hall to balcony'],
  'jp-4-front-portal':['open','Common service gallery to balcony; individual workrooms are classified separately']
 },
 china:{
  'cn-official-upper-entry':['open','Public upper office opens onto a supported balcony and public stair'],
  'cn-official-dorm-west-door':['full-curtain','Shared two-bed dormitory privacy curtain clear of both individual beds'],
  'cn-official-dorm-east-door':['full-curtain','Shared two-bed dormitory privacy curtain clear of both individual beds'],
  'cn-official-bureau-entry':['door','Fictional bureau office entry, inset timber leaves'],
  'cn-official-room-gu-door':['door','Gu Heng private duty lodging needs an opaque inset door'],
  'cn-official-room-xu-door':['door','Xu Zhiyuan private duty lodging needs an opaque inset door'],
  'cn-money-house-front':['door','Inset timber public money-house entrance'],
  'cn-money-house-store':['door','Enclosed coin store uses an inset timber door reached from the open counter-side aisle'],
  'cn-tavern-washroom-curtain':['full-curtain','Public inn WC has an opaque full curtain; its arrival and seat are clear of the safety hold zone'],
  'cn-tavern-public-entry':['open','Public house stair hall keeps direct access from the court'],
  'cn-tavern-dining-entry':['open','Open commercial restaurant arrival'],
  'cn-tavern-dining-hall':['open','Dining hall joins the public stair corridor'],
  'cn-tavern-lan-door':['door','Opaque inset timber leaves enclose an independent guest room'],
  'cn-tavern-zhu-door':['door','Opaque inset timber leaves enclose an independent guest room'],
  'cn-tavern-performance-entry':['open','Adult recital room opens onto the public third-floor hall'],
  'cn-tavern-banquet-entry':['open','Banquet salon has its own public-hall entrance'],
  'cn-tavern-salon-arch':['open','Open social threshold between recital and banquet rooms'],
  'cn-clinic-front':['door','Ground-floor pharmacy and public stair entrance uses inset timber leaves'],
  'cn-clinic-consult-door':['door','Upstairs consultation room with an inset privacy door off the shared landing'],
  'cn-clinic-stock-door':['door','Enclosed pharmacy stock room with inset timber closure'],
  'cn-south-gate':['door','Inset central ceremonial timber gate, opening inward to the compound'],
  'cn-south-gate-west':['door','Inset west gatehouse bay preserves the broad ceremonial arrival'],
  'cn-south-gate-east':['door','Inset east gatehouse bay preserves the broad ceremonial arrival'],
  'cn-north-gate':['door','Inset central rear gate preserves the north axis and leaves the archive terrace/stair untouched'],
  'cn-north-gate-west':['door','Inset west rear bay provides a separate usable outward gate'],
  'cn-north-gate-east':['door','Inset east rear bay provides a separate usable outward gate'],
  'cn-west-gate':['door','Inset service gates opening inward to the compound'],
  'cn-east-gate':['door','Inset side-court gates opening inward to the compound'],
  'cn-gatehouse-court':['open','Gatehouse arcade continues the ceremonial court axis'],
  'cn-hall-front':['door','Principal ceremonial entrance uses paired lacquer-and-gilt doors'],
  'cn-hall-rear':['door','Hall rear building envelope uses matching lacquer doors'],
  'cn-hall-west':['door','Hall side entrance uses matching doors, resolved on its relocated landing'],
  'cn-hall-east':['door','Hall side entrance uses matching lacquer doors'],
  'cn-tea-front':['full-curtain','Tea reception entrance uses full gathered silk drapes'],
  'cn-tea-rear':['half-curtain','Tea service/rear-court transition uses split hanging textile'],
  'cn-tea-west':['open','Public tea pavilion lateral cross-ventilation and garden access'],
  'cn-tea-east':['open','Public tea pavilion lateral cross-ventilation and garden access'],
  'cn-study-front':['door','Quiet study main entrance uses opaque lattice panels'],
  'cn-study-rear':['full-curtain','Quiet study rear threshold uses opaque gathered silk'],
  'cn-study-west':['full-curtain','Quiet study lateral threshold uses opaque gathered silk'],
  'cn-study-east':['full-curtain','Quiet study lateral threshold uses opaque gathered silk'],
  'cn-bedroom-front':['door','Sleeping room front requires full lacquered privacy'],
  'cn-bedroom-west':['door','Third-floor dressing room off the private bedroom retains an opaque door'],
  'cn-bedroom-east':['door','Sleeping room east lateral opening must not bypass bedroom privacy'],
  'cn-kitchen-front':['full-curtain','Dining entrance uses full decorative silk panels'],
  'cn-kitchen-rear':['door','Ground-floor dining rear service entrance retains its timber closure below the preparation floor'],
  'cn-kitchen-west':['half-curtain','Dining side/service transition uses split cloth'],
  'cn-kitchen-east':['half-curtain','Dining side/service transition uses split cloth'],
  'cn-bath-front':['door','Bathing/changing room arrival requires opaque privacy'],
  'cn-bath-west':['door','Linen/changing room off the washroom retains its opaque privacy door'],
  'cn-bath-east':['door','Second-floor washroom arrival from the public stair hall requires opaque privacy'],
  'cn-archive-front':['door','Culture tower ground-floor tea reception retains its existing inset main entrance'],
  'cn-archive-rear':['door','Culture tower ground-floor rear entrance retains matching timber closure'],
  'cn-archive-west':['door','Culture tower ground-floor lateral entrance retains its existing timber closure'],
  'cn-archive-east':['door','Culture tower ground-floor lateral entrance retains its existing timber closure'],
  'cn-consort-heng-door':['door','Opaque inset leaves enclose Shen Heng’s individual private bedroom'],
  'cn-consort-ling-door':['door','Opaque inset leaves enclose Ling Yi’s individual private bedroom'],
  'cn-consort-reserve-1-door':['door','Opaque inset leaves enclose the unassigned southern chamber from the common corridor'],
  'cn-guest-front':['door','Rear-palace ground-floor guest bedroom needs full opaque privacy'],
  'cn-guest-west':['door','Retained guest-suite lateral privacy policy for legacy layouts'],
  'cn-guest-east':['door','Ground-floor reception entrance retains its inset door; the inner corridor has separately enclosed private bedrooms'],
  'cn-kitchen-dining':['half-curtain','Food-service opening uses split cloth rather than a formal door'],
  'cn-bath-washroom':['full-curtain','Opaque gathered silk separates bath and WC without a rigid leaf obstructing the tub aisle'],
  'cn-lotus-bridge-south':['open','Outdoor bridge approach stays clear'],
  'cn-lotus-bridge-north':['open','Outdoor stepped bridge approach stays clear']
 },
 egypt:{
  'pyramid-main-entry':['open','Monumental sloped stone portal remains open for exploration'],
  'internal-painted-gateway':['open','Ceremonial painted gateway and column-hall axis'],
  'descending-passage-mouth':['open','Ramp entrance must stay free of a moving closure'],
  'burial-chamber-portal':['open','Tomb exploration sequence and sloped landing'],
  'judgment-hall-entry':['open','Public ritual/exploration room'],
  'private-suite-entry':['door','Private royal reception suite has two-sided timber leaves and rebated jambs within the stone wall'],
  'private-bedroom':['full-curtain','Inner sleeping room uses opaque linen drapes'],
  'upper-throne-entry':['open','Ceremonial throne approach meets the stair landing'],
  'dining-entry':['half-curtain','Dining/service suite arrival uses split linen'],
  'kitchen-entry':['half-curtain','Dining-to-kitchen working transition uses split linen'],
  'storage-entry':['door','Enclosed supply room uses an inset timber closure joined to the storage wall'],
  'private-bath-entry':['full-curtain','Private inner bathing room uses opaque full linen drapes']
 },
 france:{
  'front-entry':['door','Formal exterior paired panel doors'],
  'rear-entry':['door','Rear exterior gallery envelope gets matching paired doors'],
  'gallery-west-rear':['half-curtain','Pastry/service room entry uses a gathered service textile'],
  'gallery-west-front':['open','Public salon and mirror-gallery reception sequence'],
  'gallery-east-rear':['open','Public art/study-gallery sequence'],
  'gallery-east-front':['door','Bedroom-to-gallery opening requires full panel-door privacy'],
  'enfilade-west':['half-curtain','Pastry kitchen to salon service transition'],
  'enfilade-east':['door','Bedroom enfilade requires full opaque panel doors'],
  'core-wing--1--9.5':['half-curtain','Pastry to service arcade transition'],
  'wing-entry--1--9.5':['door','Bath-to-service-gallery side entrance needs full privacy'],
  'core-wing--1--5':['open','Public salon to open service arcade'],
  'wing-entry--1--5':['open','Orangery and arcade form a public garden route'],
  'wing-enfilade--1':['door','Private bath to orangery requires full opaque separation'],
  'wing-garden--1':['open','Public orangery to garden threshold'],
  'core-wing-1--9.5':['open','Art room to state arcade is a public sequence'],
  'wing-entry-1--9.5':['full-curtain','Formal dining room to state arcade uses full gathered drapery'],
  'core-wing-1--5':['door','Bedroom side-gallery opening must not bypass sleeping privacy'],
  'wing-entry-1--5':['open','Public music reception to state arcade'],
  'wing-enfilade-1':['full-curtain','Dining and music reception can be separated by gathered drapery'],
  'wing-garden-1':['open','Public music reception to garden threshold']
 }
};
const STYLE={japan:'shoji',china:'palace',egypt:'egypt',france:'french'};
// a/b points are route probes, not always the exact constructed wall plane.
const PLANES={
 // Individual timber WC leaves need a running gap above the zero-height floor.
 // Keep the authored aperture, jambs and hinge location unchanged.
 'jp-washroom-cubicle-1':{bottomClearance:.012},
 'jp-washroom-cubicle-2':{bottomClearance:.012},
 'jp-washroom-cubicle-3':{bottomClearance:.012},
 // French private-bath leaves swing into bare .23m orangery slab;
 // bath tiles stop at z=-6.99 and the orangery rug starts at z=-4.65.
 'wing-enfilade--1':{bottomClearance:.012},
 'jp-men-noren':{at:5.12},'jp-women-noren':{at:5.12},
 // Authored hollow partitions own the shoji wall plane and overlap.
 'jp-guest-suite-door':{sideOverlap:SHOJI_SIDE_OVERLAP},
 'jp-operator-door':{bottomClearance:.012,sideOverlap:SHOJI_SIDE_OVERLAP},'jp-staff-room-door':{bottomClearance:.012,sideOverlap:SHOJI_SIDE_OVERLAP},
 'private-suite-entry':{bottomClearance:.012},
 'core-wing-1--5':{at:11.22,bottomClearance:.012},
 'storage-entry':{bottomClearance:.012},
 'front-entry':{at:3.5},'private-bath-entry':{at:16.4},
 'dining-entry':{at:-5.85},'kitchen-entry':{at:-12.25}
};
const LEGACY={
 'jp-guest-suite-door':{id:'japan-guest-shoji',motion:'slide'},
 'cn-hall-front':{id:'cn-hall-front',motion:'hinge',swing:1},
 'cn-bedroom-front':{id:'cn-bedroom-front',motion:'hinge',swing:1},
 'private-suite-entry':{id:'egypt-private-suite-door',motion:'hinge',swing:1,height:3.36},
 'front-entry':{id:'france-palace-front',motion:'hinge',swing:1,height:3.86},
 'enfilade-east':{id:'france-bedroom-enfilade',motion:'hinge',swing:1},
 'wing-enfilade--1':{id:'france-private-bath',motion:'hinge',swing:-1}
};
// Explicit source-reviewed door motions; no blanket sliding fallback. Signs:
// swing +1 = negative world normal (−Z for axis X, −X for axis Z); −1 reverses.
// New hinge choices remain candidates pending full swept-room/controller QA.
const DOOR_MOTIONS={
 'cn-official-bureau-entry':['hinge',-1,'Swing east into the clear office entrance bay'],
 'cn-official-room-gu-door':['hinge',-1,'Swing south into the private room aisle beside the bed'],
 'cn-official-room-xu-door':['hinge',-1,'Swing south into the private room aisle beside the bed'],
 'cn-tavern-lan-door':['hinge',-1,'Paired inset leaves open south into a clear arrival bay; bed begins beyond the sweep'],
 'cn-tavern-zhu-door':['hinge',-1,'Paired inset leaves open south into a clear arrival bay; wardrobe stays at the rear wall'],
 'cn-south-gate':['hinge',1,'Inward compound gate with hinge pins within its source-authored .65 m masonry reveal'],
 'cn-south-gate-west':['hinge',1,'Inward compound gate with hinge pins within its source-authored .65 m masonry reveal'],
 'cn-south-gate-east':['hinge',1,'Inward compound gate with hinge pins within its source-authored .65 m masonry reveal'],
 'cn-north-gate':['hinge',1,'Outward2.2m rear bay fits the fixed north boundary and avoids the archive terrace/stair'],
 'cn-north-gate-west':['hinge',1,'Outward1.6m rear side bay stays within the exterior waiting area'],
 'cn-north-gate-east':['hinge',1,'Outward1.6m rear side bay stays within the exterior waiting area'],
 'cn-west-gate':['hinge',-1,'Inward compound gate with hinge pins within its source-authored .65 m masonry reveal'],
 'cn-east-gate':['hinge',1,'Inward compound gate with hinge pins within its source-authored .65 m masonry reveal'],
 'jp-guest-suite-door':['slide',0,'Paired shoji retract into hollow partition pockets clear of the guest screen and public gallery'],
 'jp-operator-door':['slide',0,'Timber lattice office door retracts inside its hollow partition clear of the working gallery'],
 'jp-staff-room-door':['slide',0,'Sleeping-room shoji retracts inside its partition pockets clear of the working gallery and bunk approach'],
 'jp-washroom-cubicle-1':['hinge',1,'Inward timber cubicle leaves use the empty front of the stall; the WC is farther north'],
 'jp-washroom-cubicle-2':['hinge',1,'Inward timber cubicle leaves use the empty front of the stall; no outward sweep across the sink aisle'],
 'jp-washroom-cubicle-3':['hinge',1,'Inward timber cubicle leaves use the empty front of the stall; no outward sweep across the sink aisle'],
 'jp-supplies-door':['hinge',1,'Timber service doors swing into the clear south stock-room bay; crates start farther north'],
 'cn-hall-front':['hinge',1,'Retain the tested paired ceremonial lacquer doors swinging into the hall'],
 'cn-hall-rear':['hinge',-1,'Swing inward/south into the clear rear hall bay, away from the R14 rear terrace stair'],
 'cn-hall-west':['slide',0,'Tall hinged leaves would enter the indoor stair or the short exterior landing and rails; keep a sliding lattice closure'],
 'cn-money-house-front':['hinge',1,'Open north into the clear public arrival bay'],
 'cn-money-house-store':['hinge',1,'Open north into the clear store arrival; chests stay along the back wall'],
 'cn-clinic-front':['hinge',1,'Open north into the unobstructed ground-floor public stair hall'],
 'cn-clinic-consult-door':['hinge',1,'Open north into the upstairs consultation arrival bay, away from the public stair'],
 'cn-clinic-stock-door':['hinge',1,'Open north beside the stock workbench, preserving the full counter-side staff aisle'],
 'cn-hall-east':['hinge',1,'Swing inward/west between the existing chair groups, clear of the narrow exterior landing and its rails'],
 'cn-study-front':['hinge',1,'Paired timber panels swing into the clear south reception bay, short of the writing tables and side console'],
 'cn-bedroom-front':['hinge',-1,'The rear-palace north entrance opens south into the clear bedroom arrival bay, leaving the common hall unobstructed'],
 'cn-bedroom-west':['hinge',1,'Swing outward/west into the broad perimeter-side court, away from the bed and interior console'],
 'cn-bedroom-east':['slide',0,'Exterior R14 side lane is narrow and the interior jamb adjoins the bookshelf; a swing lacks a robust clear margin'],
 'cn-kitchen-rear':['hinge',1,'Swing outward/north into the rear service court, away from stove and preparation table'],
 'cn-bath-front':['hinge',-1,'Swing outward/south; the interior west jamb is occupied by the linen cabinet'],
 'cn-bath-west':['hinge',1,'Swing outward/west into the perimeter-side court, avoiding the linen cabinet and tub aisle'],
 'cn-bath-east':['hinge',-1,'The rear-palace north washroom entry opens south into its clear arrival bay; the basin and mirror sit beyond the complete leaf sweep'],
 'cn-archive-front':['hinge',1,'With the R14 source top capped at3.930, swing north into the clear central aisle instead of across the short front terrace stair'],
 'cn-archive-rear':['hinge',-1,'With the R14 source top capped at3.930, swing south into the central rear aisle between the shelves, away from the exterior stair'],
 'cn-archive-west':['slide',0,'Switchback stair inside and external stair outside leave no source-proven full-height hinge sweep'],
 'cn-archive-east':['hinge',1,'With the R14 source top capped at3.930, swing west into side bays beside the reading table, avoiding the exterior stair landing'],
 'cn-consort-heng-door':['slide',0,'Retract into the authored west-wall pocket; no parked leaf may block the bedside aisle or shared corridor'],
 'cn-consort-ling-door':['slide',0,'Retract into the authored west-wall pocket; preserve both the bed approach and shared corridor'],
 'cn-consort-reserve-1-door':['slide',0,'Retract into the new chamber’s east-wall pockets, preserving the original common corridor and both adjacent bedrooms'],
 'cn-guest-front':['hinge',-1,'Swing outward/south into the open court; inward leaves seal the tea-table approach'],
 'cn-guest-west':['slide',0,'Inward sweep meets the tea table; outward sweep constricts the narrow raised-archive side lane'],
 'cn-guest-east':['hinge',-1,'Swing outward/east into the broad perimeter-side court, away from the guest bed'],
 'private-suite-entry':['hinge',1,'Retain tested decorated timber suite doors and their existing inward sweep'],
 'storage-entry':['hinge',-1,'Swing south into the clear kitchen aisle; inward/north swing would hit the storage urns'],
 'front-entry':['hinge',1,'Retain tested French paired panel entrance doors'],
 'rear-entry':['hinge',1,'French paired panels swing outward/north onto the clear terrace, away from the gallery urns'],
 'gallery-east-front':['hinge',1,'French panel doors swing west into the clear gallery bay, away from the bedroom furniture'],
 'enfilade-east':['hinge',1,'Retain tested bedroom enfilade panel-door sweep'],
 'wing-entry--1--9.5':['hinge',1,'French bath panels swing inward/west; outward swing would hit service-arcade columns'],
 'wing-enfilade--1':['hinge',-1,'Retain tested private-bath/orangery panel-door sweep'],
 'core-wing-1--5':['slide',0,'Use an authored in-wall pocket for the bedroom closure; retain its clear passage beside the bedpost and arcade columns']
};
const FIXED_BANNERS={
 japan:[
  {id:'jp-men-original-noren',openingId:'jp-men-noren',marks:'男 / MEN',center:[-6.5,3.8,5.34],width:2.8,hem:2.15,top:2.77,minZ:5.3235,maxZ:5.388},
  {id:'jp-women-original-noren',openingId:'jp-women-noren',marks:'女 / WOMEN',center:[3,3.8,5.34],width:2.6,hem:2.15,top:2.77,minZ:5.3235,maxZ:5.388},
  {id:'jp-entry-original-noren',openingId:'jp-1-front-portal',marks:'湯',center:[0,0,9.24],width:4.1,hem:2.20,top:2.90,minZ:9.22,maxZ:9.28802}
 ]
};
// The authored banner cloth and glyphs remain byte-for-byte in Japan's source.
// These proxies are camera-only, not extra rendered geometry or route barriers.
export function existingBannerCameraColliders(region){
 return (FIXED_BANNERS[region]||[]).map(b=>({id:b.id,minX:b.center[0]-b.width/2,maxX:b.center[0]+b.width/2,minY:b.center[1]+b.hem,maxY:b.center[1]+b.top,minZ:b.minZ,maxZ:b.maxZ}));
}
export function existingBannerAudit(region){return (FIXED_BANNERS[region]||[]).map(b=>({...b,center:[...b.center],controllerClearance:b.hem-1.95,actorCrownClearance:b.hem-1.876455}));}
export function classifyRoomOpenings(lot,region){
 const policy=POLICY[region];if(!policy)return [];
 const thresholds=lot.doorways||lot.group?.userData.doorways||[];
 // A staged lot explicitly names the rigid openings already migrated.
 // Without that list, a migrated lot still requires every rigid source mount.
 const requiredInsetIds=lot.requiredInsetDoorIds===undefined?null:new Set(lot.requiredInsetDoorIds);
 if(requiredInsetIds)for(const id of requiredInsetIds)if(!thresholds.some(t=>t.id===id))throw new Error('Missing required inset opening: '+region+'/'+id);
 const requireInset=!requiredInsetIds&&thresholds.some(t=>t.closureMount);
 return thresholds.map(t=>{
  const p=policy[t.id];if(!p)throw new Error('Unclassified traversable opening: '+region+'/'+t.id);
  const axis=t.axis||(Math.abs(t.a[0]-t.b[0])>Math.abs(t.a[2]-t.b[2])?'z':'x');
  const choice=DOOR_MOTIONS[t.id];if(p[0]==='door'&&!choice)throw new Error('Unreviewed door motion: '+t.id);
  const fixedOverhead=p[0]==='half-curtain',existingBanner=(FIXED_BANNERS[region]||[]).some(b=>b.openingId===t.id);
  // Regional floorFit records a real finished sill, independent of route-probe Y.
  // Preserve its authored opening top; the rigid engine still subtracts25mm there.
  const fix=PLANES[t.id]||{},legacy=LEGACY[t.id]||{},bottom=fix.bottom??t.floorFit?.bottom??Math.max(t.a[1],t.b[1]);
  const wallPlane=t.at??(axis==='x'?(t.a[2]+t.b[2])/2:(t.a[0]+t.b[0])/2),closureMount=t.closureMount,at=closureMount?.wallPlane??fix.at??wallPlane;
  if((requireInset||requiredInsetIds?.has(t.id))&&p[0]==='door'&&!closureMount)throw new Error('Incomplete source-authored inset lot: '+region+'/'+t.id);
  if(closureMount&&p[0]==='door'&&closureMount.kind!==(choice[0]==='slide'?'pocket':'hinge'))throw new Error('Door motion and inset source disagree: '+t.id);
  const lateral=t.from!==undefined?(t.from+t.to)/2:axis==='x'?(t.a[0]+t.b[0])/2:(t.a[2]+t.b[2])/2;
  return {id:legacy.id||t.id,openingId:t.id,kind:p[0],...(t.interactionOnly?{openingRole:'interaction-approach',apertureWidth:null}:{}),rationale:p[1],rooms:t.rooms||[],center:axis==='x'?[lateral,bottom,at]:[at,bottom,lateral],axis,closureMount:closureMount?{...closureMount,wallPlane:closureMount.wallPlane??wallPlane}:undefined,revealDepth:closureMount?.revealDepth??closureMount?.wallDepth,surfaceTrack:choice?.[0]==='slide'&&closureMount?.kind!=='pocket',trackMountOffset:at-wallPlane,width:t.width,sideOverlap:closureMount?.sideOverlap??fix.sideOverlap??0,bottomClearance:fix.bottomClearance??t.floorFit?.runningGap??0,height:t.floorFit?t.floorFit.top-bottom:fix.height??legacy.height??(t.top!==undefined?t.top-bottom:t.height),style:STYLE[region],motion:p[0]==='open'?'none':fixedOverhead?'fixed-overhead':p[0].includes('curtain')?'gather':choice[0],existingBanner,motionRationale:fixedOverhead?'Fixed hanging textile stays above actor height and never gathers automatically':p[0].includes('curtain')?'Gathered fabric stays at the jambs and has no rigid leaf swing':choice?.[2]||'Intentionally open circulation',operable:p[0]!=='open'&&!fixedOverhead,...(choice?.[1]?{swing:choice[1]}:{}),source:region==='japan'?'japan-bathhouse.js':region==='china'?'china-palace.js':region==='egypt'?'egypt-temple.js':'regions-west.js'};
 });
}
export function roomClosureSpecs(lot,region){
 const classified=classifyRoomOpenings(lot,region);
 // Tests/custom lots may supply explicit operable doors without a room registry.
 return classified.length?classified.filter(p=>p.operable):(lot.automaticDoorways||[]).filter(p=>p.kind!=='half-curtain').map(p=>({kind:'door',...p}));
}
// Source-authored noren already have real cloth and camera proxies. Generate
// only the other fixed service textiles, entirely outside automatic routing.
export function fixedHalfCurtainSpecs(lot,region){
 const classified=classifyRoomOpenings(lot,region);
 return classified.length?classified.filter(p=>p.kind==='half-curtain'&&!p.existingBanner):(lot.automaticDoorways||[]).filter(p=>p.kind==='half-curtain').map(p=>({...p,motion:'fixed-overhead',operable:false}));
}
export const OPEN_CIRCULATION_AUDIT={
 japan:['3 internal stair flights and their 6 endpoints','2F stair-to-foyer gallery','3F stair/public side gallery','4F boiler-control gallery','front balcony promenades','west garden pavilion open sides','east market linking arcade open sides','arrival/shrine garden paths'],
 china:['gatehouse arcade and ceremonial/inner/north courts','main hall public stair and upper viewing gallery','culture tower tea reception, public stairs and second-floor gallery, third-floor reading/viewing hall','rear-palace ground-floor lateral public arrivals and all three stair halls','rear-palace reception to private-suite corridor; individual bedrooms retain their doors','third-floor private sitting alcove inside the already enclosed bedroom suite','royal-kitchen stair to preparation threshold (fixed service half-curtain)','Yunlai public stair halls, open restaurant and kitchen service passage, recital/banquet thresholds','money-house public counter-side aisle to staff workspace; coin store retains its door','clinic pharmacy/public stair hall and upper waiting landing; consultation and stock rooms retain doors','official-bureau upper public balcony/stair and office; sleeping rooms retain their closures','southwest archery rear entrance and waiting court','lotus bridge, garden paths, building porches and side service lanes'],
 egypt:['entrance vestibule inner mouth and internal forecourt around column hall','ascending stair and both landing mouths','throne connecting platform and ceremonial hall','both descending stairs, turning landing and tomb antechamber','open offering-room and canopic-room portals off the burial sequence','public judgment hall and pyramid circulation around separate living/service suites'],
 france:['front portico open sides','east rear and east front state connector arcades (separate open-sided slabs)','west rear and west front service connector arcades (separate open-sided slabs)','tea loggia open sides','rear terrace','public salon/art/orangery/music circulation; private bedroom and bath boundaries retain closures','garden axes, paths and north/south ornamental gateways']
};
