import {createDailyToilet} from './daily-toilet.js';

// The existing west-rear royal bath, porcelain WC and its two actual doors.
// Full window cloth and the shortened screen are authored in this same room.
// Ordinary navigation owns the legal east-side approach; only the final short
// seated mount uses the existing high fixture and its low footrest.
export const FRANCE_DAILY_TOILET=Object.freeze({
 id:'fr-royal-bath-toilet',provider:'france-daily-toilet',roomId:'royal-bath',
 approach:Object.freeze([-23.34,.264,-7.17]),anchor:Object.freeze([-24.17,.489,-7.51]),
 seatY:1.094,yaw:0,exitYaw:Math.PI/2,seconds:8,executionRadius:.06,
 closures:Object.freeze(['wing-entry--1--9.5','wing-enfilade--1']),
 privacyBounds:Object.freeze({minX:-25,maxX:-17,minZ:-13.5,maxZ:-6.6})
});
const FACILITY=Object.freeze({...FRANCE_DAILY_TOILET,receiptSource:'france-toilet',intentId:'fr-daily-toilet',
 name:'白金沐浴室 · 私密净室',approachLabel:'正前往西翼净室',privacyLabel:'等沐浴室空闲、两扇门合好'
});
export function createFranceDailyToilet(options){
 return createDailyToilet({...options,facility:FACILITY});
}
