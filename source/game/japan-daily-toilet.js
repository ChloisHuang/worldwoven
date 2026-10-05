import {createDailyToilet} from './daily-toilet.js';

// The western cubicle already has four joined walls, its own opaque hinged
// door and a porcelain bowl. The authored approach is inside the cubicle and
// beyond the door safety zone; the ordinary route must actually reach it first.
// G.torus uses six radial segments, so the visible rim top is .57 + .085*sin(π/3).
export const JAPAN_DAILY_TOILET=Object.freeze({
 id:'jp-washroom-private-1',provider:'japan-daily-toilet',roomId:'jp-washroom-cubicle-1',
 approach:Object.freeze([20,0,-14.7]),anchor:Object.freeze([20,0,-16.04]),
 seatY:.57+.085*Math.sin(Math.PI/3),yaw:0,exitYaw:0,seconds:8,executionRadius:.12,
 closures:Object.freeze(['jp-washroom-cubicle-1']),
 privacyBounds:Object.freeze({minX:18.2,maxX:21.56,minZ:-17.6,maxZ:-13.25})
});
const FACILITY=Object.freeze({...JAPAN_DAILY_TOILET,receiptSource:'japan-toilet',intentId:'jp-daily-toilet',
 name:'东侧洗手屋 · 独立净室',approachLabel:'正前往东侧洗手屋',privacyLabel:'等净室门合好',
 closureKinds:Object.freeze({'jp-washroom-cubicle-1':Object.freeze(['door'])})
});

export function createJapanDailyToilet(options){
 return createDailyToilet({...options,facility:FACILITY});
}
