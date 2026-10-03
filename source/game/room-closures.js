export const SHOJI_SIDE_OVERLAP=.10;
// Traversable aperture policy, audited against the constructed regional walls.
// This is game design for the authored fantasy lots, not a historical claim.
// Geometry is resolved from live thresholds: raised palace levels remain valid.
const POLICY={
 japan:{
  'jp-food-prep-door':['half-curtain','Food preparation to public hall: split indigo service noren'],
  'jp-men-noren':['half-curtain','Retain the fixed men’s noren and existing offset privacy screen; no duplicate closure'],
  'jp-women-noren':['half-curtain','Retain the fixed women’s noren and existing offset privacy screen; no duplicate closure'],
  'jp-men-wet-threshold':['full-curtain','Changing to bathing: full split cloth keeps the wet area private'],
  'jp-women-wet-threshold':['full-curtain','Changing to bathing: full split cloth keeps the wet area private'],
  'jp-men-pool-entry':['open','Pool curb is a walk-in water entry, not a room wall'],
  'jp-women-pool-entry':['open','Pool curb is a walk-in water entry, not a room wall'],
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
  'cn-south-gate':['door','Inset central ceremonial timber gate, opening inward to the compound'],
  'cn-south-gate-west':['door','Inset west gatehouse bay preserves the broad ceremonial arrival'],
  'cn-south-gate-east':['door','Inset east gatehouse bay preserves the broad ceremonial arrival'],
  'cn-north-gate':['door','Inset paired timber gates protecting the rear compound'],
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
  'cn-bedroom-west':['door','Sleeping room west lateral opening must not bypass bedroom privacy'],
  'cn-bedroom-east':['door','Sleeping room east lateral opening must not bypass bedroom privacy'],
  'cn-kitchen-front':['full-curtain','Dining entrance uses full decorative silk panels'],
  'cn-kitchen-rear':['door','Rear food-preparation entrance gets a timber service closure'],
  'cn-kitchen-west':['half-curtain','Dining side/service transition uses split cloth'],
  'cn-kitchen-east':['half-curtain','Dining side/service transition uses split cloth'],
  'cn-bath-front':['door','Bathing/changing room arrival requires opaque privacy'],
  'cn-bath-west':['door','Bath side entry must not bypass privacy'],
  'cn-bath-east':['door','Washroom exterior side entry requires opaque privacy'],
  'cn-archive-front':['door','Enclosed archive entrance protects the reading/store function'],
  'cn-archive-rear':['door','Archive rear building entrance uses matching timber closure'],
  'cn-archive-west':['door','Archive lateral entrance uses matching timber closure'],
  'cn-archive-east':['door','Archive lateral entrance uses matching timber closure'],
  'cn-guest-front':['door','Guest sleeping room needs full opaque privacy'],
  'cn-guest-west':['door','Guest lateral access must not bypass sleeping privacy'],
  'cn-guest-east':['door','Guest lateral access must not bypass sleeping privacy'],
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
  'private-suite-entry':['door','Private royal reception suite has two-sided decorated timber doors'],
  'private-bedroom':['full-curtain','Inner sleeping room uses opaque linen drapes'],
  'upper-throne-entry':['open','Ceremonial throne approach meets the stair landing'],
  'dining-entry':['half-curtain','Dining/service suite arrival uses split linen'],
  'kitchen-entry':['half-curtain','Dining-to-kitchen working transition uses split linen'],
  'storage-entry':['door','Enclosed supply room uses a simple timber closure'],
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
 ...Object.fromEntries(['cn-south-gate','cn-south-gate-west','cn-south-gate-east','cn-north-gate','cn-west-gate','cn-east-gate'].map(id=>[id,{closureMount:{kind:'hinge',wallDepth:.65,revealDepth:.65,hingeLateralInset:.006,hingeNormalOffset:.18}}])),
 // Individual timber WC leaves need a running gap above the zero-height floor.
 // Keep the authored aperture, jambs and hinge location unchanged.
 'jp-washroom-cubicle-1':{bottomClearance:.012},
 'jp-washroom-cubicle-2':{bottomClearance:.012},
 'jp-washroom-cubicle-3':{bottomClearance:.012},
 // French private-bath leaves swing into bare .23m orangery slab;
 // bath tiles stop at z=-6.99 and the orangery rug starts at z=-4.65.
 'wing-enfilade--1':{bottomClearance:.012},
 'jp-men-noren':{at:5.12},'jp-women-noren':{at:5.12},
 // Clear the partition's real raised lattice face by 25mm at full travel.
 'jp-guest-suite-door':{at:-7.70,sideOverlap:SHOJI_SIDE_OVERLAP},
 'jp-operator-door':{at:-.70,bottomClearance:.012,sideOverlap:SHOJI_SIDE_OVERLAP},'jp-staff-room-door':{at:-.70,bottomClearance:.012,sideOverlap:SHOJI_SIDE_OVERLAP},
 'private-suite-entry':{bottomClearance:.012},
 'cn-hall-west':{at:-11.46},'cn-bedroom-east':{at:-15.54},
 'cn-archive-west':{at:-10.54},'cn-guest-west':{at:15.54},
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
 'cn-south-gate':['hinge',1,'Inward compound gate with hinge pins within its .65 m masonry reveal'],
 'cn-south-gate-west':['hinge',1,'Inward gatehouse side bay with hinge pins within its .65 m masonry reveal'],
 'cn-south-gate-east':['hinge',1,'Inward gatehouse side bay with hinge pins within its .65 m masonry reveal'],
 'cn-north-gate':['hinge',-1,'Inward compound gate with hinge pins within its .65 m masonry reveal'],
 'cn-west-gate':['hinge',-1,'Inward compound gate with hinge pins within its .65 m masonry reveal'],
 'cn-east-gate':['hinge',1,'Inward compound gate with hinge pins within its .65 m masonry reveal'],
 'jp-guest-suite-door':['slide',0,'Retain shoji motion; guest screen and public side gallery make a swing unnecessary'],
 'jp-operator-door':['slide',0,'Timber lattice office door slides clear of the narrow working gallery'],
 'jp-staff-room-door':['slide',0,'Sleeping-room shoji stays out of the shared working gallery and bunk approach'],
 'jp-washroom-cubicle-1':['hinge',1,'Inward timber cubicle leaves use the empty front of the stall; the WC is farther north'],
 'jp-washroom-cubicle-2':['hinge',1,'Inward timber cubicle leaves use the empty front of the stall; no outward sweep across the sink aisle'],
 'jp-washroom-cubicle-3':['hinge',1,'Inward timber cubicle leaves use the empty front of the stall; no outward sweep across the sink aisle'],
 'jp-supplies-door':['hinge',1,'Timber service doors swing into the clear south stock-room bay; crates start farther north'],
 'cn-hall-front':['hinge',1,'Retain the tested paired ceremonial lacquer doors swinging into the hall'],
 'cn-hall-rear':['hinge',-1,'Swing inward/south into the clear rear hall bay, away from the R14 rear terrace stair'],
 'cn-hall-west':['slide',0,'Tall hinged leaves would enter the indoor stair or the short exterior landing and rails; keep a sliding lattice closure'],
 'cn-hall-east':['hinge',1,'Swing inward/west between the existing chair groups, clear of the narrow exterior landing and its rails'],
 'cn-study-front':['hinge',1,'Paired timber panels swing into the clear south reception bay, short of the writing tables and side console'],
 'cn-bedroom-front':['hinge',1,'Retain the tested paired bedroom lacquer doors swinging into the front room bay'],
 'cn-bedroom-west':['hinge',1,'Swing outward/west into the broad perimeter-side court, away from the bed and interior console'],
 'cn-bedroom-east':['slide',0,'Exterior R14 side lane is narrow and the interior jamb adjoins the bookshelf; a swing lacks a robust clear margin'],
 'cn-kitchen-rear':['hinge',1,'Swing outward/north into the rear service court, away from stove and preparation table'],
 'cn-bath-front':['hinge',-1,'Swing outward/south; the interior west jamb is occupied by the linen cabinet'],
 'cn-bath-west':['hinge',1,'Swing outward/west into the perimeter-side court, avoiding the linen cabinet and tub aisle'],
 'cn-bath-east':['hinge',1,'Swing inward into the washroom; the exterior archive stair leaves insufficient passage around an outward leaf. The basin approach is centered clear of the parked interior leaf'],
 'cn-archive-front':['hinge',1,'With the R14 source top capped at3.930, swing north into the clear central aisle instead of across the short front terrace stair'],
 'cn-archive-rear':['hinge',-1,'With the R14 source top capped at3.930, swing south into the central rear aisle between the shelves, away from the exterior stair'],
 'cn-archive-west':['slide',0,'Switchback stair inside and external stair outside leave no source-proven full-height hinge sweep'],
 'cn-archive-east':['hinge',1,'With the R14 source top capped at3.930, swing west into side bays beside the reading table, avoiding the exterior stair landing'],
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
 'core-wing-1--5':['slide',0,'Use a surface-track panel on the arcade face: outward swing hits columns and inward swing approaches the bedpost']
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
 return thresholds.map(t=>{
  const p=policy[t.id];if(!p)throw new Error('Unclassified traversable opening: '+region+'/'+t.id);
  const axis=t.axis||(Math.abs(t.a[0]-t.b[0])>Math.abs(t.a[2]-t.b[2])?'z':'x');
  const choice=DOOR_MOTIONS[t.id];if(p[0]==='door'&&!choice)throw new Error('Unreviewed door motion: '+t.id);
  const fixedOverhead=p[0]==='half-curtain',existingBanner=(FIXED_BANNERS[region]||[]).some(b=>b.openingId===t.id);
  // Regional floorFit records a real finished sill, independent of route-probe Y.
  // Preserve its authored opening top; the rigid engine still subtracts25mm there.
  const fix=PLANES[t.id]||{},legacy=LEGACY[t.id]||{},bottom=fix.bottom??t.floorFit?.bottom??Math.max(t.a[1],t.b[1]);
  const wallPlane=t.at??(axis==='x'?(t.a[2]+t.b[2])/2:(t.a[0]+t.b[0])/2),closureMount=t.closureMount??fix.closureMount,at=closureMount?.wallPlane??fix.at??wallPlane;
  const lateral=t.from!==undefined?(t.from+t.to)/2:axis==='x'?(t.a[0]+t.b[0])/2:(t.a[2]+t.b[2])/2;
  return {id:legacy.id||t.id,openingId:t.id,kind:p[0],rationale:p[1],rooms:t.rooms||[],center:axis==='x'?[lateral,bottom,at]:[at,bottom,lateral],axis,closureMount:closureMount?{...closureMount,wallPlane:closureMount.wallPlane??wallPlane}:undefined,revealDepth:closureMount?.revealDepth??closureMount?.wallDepth,surfaceTrack:choice?.[0]==='slide'&&closureMount?.kind!=='pocket',trackMountOffset:at-wallPlane,width:t.width,sideOverlap:closureMount?.sideOverlap??fix.sideOverlap??0,bottomClearance:fix.bottomClearance??t.floorFit?.runningGap??0,height:t.floorFit?t.floorFit.top-bottom:fix.height??legacy.height??(t.top!==undefined?t.top-bottom:t.height),style:STYLE[region],motion:p[0]==='open'?'none':fixedOverhead?'fixed-overhead':p[0].includes('curtain')?'gather':choice[0],existingBanner,motionRationale:fixedOverhead?'Fixed hanging textile stays above actor height and never gathers automatically':p[0].includes('curtain')?'Gathered fabric stays at the jambs and has no rigid leaf swing':choice?.[2]||'Intentionally open circulation',operable:p[0]!=='open'&&!fixedOverhead,...(choice?.[1]?{swing:choice[1]}:{}),source:region==='japan'?'japan-bathhouse.js':region==='china'?'china-palace.js':region==='egypt'?'egypt-temple.js':'regions-west.js'};
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
 china:['gatehouse side arcade','front ceremonial court','bedroom-side courts (no unregistered enclosed side rooms in R12)','tea-side garden apertures','lotus bridge and stepped approaches','main hall upper stair/gallery (R14 contract)','rear archive upper stair/gallery (R14 contract)'],
 egypt:['internal forecourt around column hall','ascending ramp and both landing mouths','throne balcony connecting gallery','burial ramp','pyramid interior around separate living/service suites'],
 france:['front portico open sides','east state arcade open sides','west service arcade open sides','tea loggia open sides','rear terrace','garden axes and paths']
};
