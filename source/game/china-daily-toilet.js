import {createDailyToilet} from './daily-toilet.js';
import {THREE,box} from './geometry.js';

// This is the existing second-floor washroom and its existing porcelain fixture.
// Ordinary routes end at its clear west-side approach. Only the final short seat
// mount is owned here; neither player nor visitors are moved across rooms/floors.
export const CHINA_DAILY_TOILET = Object.freeze({
 id:'cn-bath-toilet',provider:'china-daily-toilet',roomId:'washroom',
 approach:Object.freeze([-18.6,4.015,-6.6]),anchor:Object.freeze([-17,4.265,-6.53]),
 seatY:4.87,yaw:0,seconds:8,executionRadius:.12,
 closures:Object.freeze(['cn-bath-east','cn-bath-west','cn-bath-washroom'])
});
function addFootrest(lot){
 // The retained porcelain seat is 85.5cm above the floor. This low, solid
 // timber footrest supports the usual seated rig instead of lengthening legs
 // through the rim. It is a lot-owned furnishing, installed once per lot.
 if(lot.group.getObjectByName('China washroom seated footrest'))return;
 const g=new THREE.Group();g.name='China washroom seated footrest';lot.group.add(g);
 box(g,-17,4.1325,-6.08,.92,.235,.68,0x715741);
 box(g,-17,4.25,-6.08,.96,.03,.72,0xb19365);
 const solid={minX:-17.48,maxX:-16.52,minY:4.015,maxY:4.265,minZ:-6.44,maxZ:-5.72,chinaToiletFootrest:true};
 lot.colliders.push(solid);lot.cameraColliders?.push(solid);
 lot.walkableSurfaces.push({minX:solid.minX,maxX:solid.maxX,minZ:solid.minZ,maxZ:solid.maxZ,y:4.265,owner:g.name});
}

const FACILITY=Object.freeze({...CHINA_DAILY_TOILET,receiptSource:'china-toilet',intentId:'cn-daily-toilet',
 name:'后宫二层 · 净室',approachLabel:'正前往后宫净室',privacyLabel:'等净室门帘合好',
 closureKinds:Object.freeze({'cn-bath-washroom':Object.freeze(['full-curtain'])}),
 legacyAnchors:Object.freeze([Object.freeze([-17,4.015,-6.6])])
});

export function createChinaDailyToilet(options){
 return createDailyToilet({...options,facility:FACILITY,prepareLot:addFootrest});
}
