// A real, unassigned bedchamber in the existing rear-palace ground floor.
// The title ledger may bind its owner later; geometry alone never grants rank.
export const RESERVED_CONSORT_QUARTERS=Object.freeze({
 roomId:'consort-reserve-1',bedId:'china-consort-bed-reserve-1',doorId:'cn-consort-reserve-1-door',
 buildingId:'rear-palace',name:'后宫南间',floorY:.215,ceiling:3.77,
 bounds:Object.freeze({minX:-26,maxX:-20.9,minZ:-1.4,maxZ:2}),
 door:Object.freeze({axis:'z',at:-20.9,from:-.375,to:.975,width:1.35}),
 waitingPoint:Object.freeze([-20.05,.215,.3]),entryPoint:Object.freeze([-21.75,.215,.3]),
 bedsidePoint:Object.freeze([-22.85,.215,.3]),exitPoints:Object.freeze([Object.freeze([-22.85,.215,.3]),Object.freeze([-22.15,.215,.3])]),
 bedCenter:Object.freeze([-24.1,.2,.3]),bedSize:Object.freeze([1.55,1.8,2.53]),
 ownerId:null,assignmentRequired:true,assignmentSource:'court-title-ledger',status:'unassigned'
});

// Deliberately scoped to this new room. Existing residents keep their current
// behavior; a later ledger supplies privateOwnerId only after assigning it.
export function canUseConsortQuarterFurniture(item,actorId='player'){
 return item?.privateRoomId!==RESERVED_CONSORT_QUARTERS.roomId||!!actorId&&item.privateOwnerId===actorId;
}
