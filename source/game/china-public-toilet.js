import {createDailyToilet} from './daily-toilet.js';

// The public inn stair hall has its own WC. The existing guest suites, staircase,
// console and waiting chair remain usable; no palace/private-room access is needed.
export const CHINA_PUBLIC_TOILET=Object.freeze({
 id:'cn-tavern-public-toilet',provider:'china-daily-toilet',roomId:'tavern-public-washroom',
 approach:Object.freeze([23.8,4.015,5.5]),anchor:Object.freeze([24.9,4.265,5.57]),
 seatY:4.87,yaw:0,seconds:8,executionRadius:.12,
 closures:Object.freeze(['cn-tavern-washroom-curtain']),
 closureKinds:Object.freeze({'cn-tavern-washroom-curtain':Object.freeze(['full-curtain'])}),
 receiptSource:'china-public-toilet',intentId:'cn-public-daily-toilet',
 name:'云来楼二层 · 公共净室',approachLabel:'沿公共楼梯前往云来楼净室',privacyLabel:'等公共净室门帘合好'
});
export function createChinaPublicToilet(options){return createDailyToilet({...options,facility:CHINA_PUBLIC_TOILET});}

export function buildChinaPublicToilet(G,{group,C,palaceWall,door,doorways,colliders,cameraColliders,walkableSurfaces,interiorRooms,explorationTargets,sign}){
 const P=CHINA_PUBLIC_TOILET,y=4.015,top=7.57,g=new G.THREE.Group();g.name='China yunlai public washroom';group.add(g);
 const bounds={minX:21.65,maxX:25.85,minZ:4.65,maxZ:6.65};
 const wall=(axis,at,from,to,openings=[])=>palaceWall(g,colliders,cameraColliders,{axis,at,from,to,bottom:y-.015,top,depth:.18,color:C.cream,openings});
 const op=door('cn-tavern-washroom-curtain','公共净室私密门帘','x',6.65,21.9,23.0,y+2.75,[P.roomId,'tavern-hall-2'],y-.015);
 doorways.at(-1).floorFit={bottom:y,top:y+2.75};
 wall('x',4.65,21.65,25.85);wall('x',6.65,21.65,25.85,[op]);wall('z',21.65,4.65,6.65);wall('z',25.85,4.65,6.65);
 interiorRooms.push({id:P.roomId,name:P.name,...bounds,floorY:y,ceiling:top});
 explorationTargets.push({id:P.id,name:'云来楼二层公共净室',roomId:P.roomId,position:[...P.approach]});
 // Same porcelain bowl, tank and supported footrest as the existing rear-palace
 // net room, at its established seat height. No new body/need animation system.
 const x=24.9,z=5.5,base=y-.215;
 G.cyl(g,x,base+.61,z,.36,.31,.72,0xc6c9b7,12);G.torus(g,x,base+.99,z,.31,.08,0xe5dec5);G.box(g,x,base+1.13,z-.5,.72,.7,.26,0xc6c9b7);
 const hull={minX:x-.45,maxX:x+.45,minY:y,maxY:base+1.48,minZ:z-.65,maxZ:z+.55};colliders.push(hull);cameraColliders.push({...hull});
 G.box(g,x,y+.1175,z+.52,.92,.235,.68,0x715741);G.box(g,x,y+.235,z+.52,.96,.03,.72,0xb19365);
 const foot={minX:x-.48,maxX:x+.48,minY:y,maxY:y+.25,minZ:z+.16,maxZ:z+.88};colliders.push(foot);cameraColliders.push({...foot});walkableSurfaces.push({...foot,y:y+.25,owner:g.name});
 // Compact hand basin along the rear partition, clear of the arrival and mount.
 G.box(g,22.6,y+.50,5.02,.72,1,.46,C.wood);G.sphere(g,22.6,y+1.02,5.02,.29,0xd7d8c2,1,.32,.65);
 const sink={minX:22.24,maxX:22.96,minY:y,maxY:y+1.12,minZ:4.79,maxZ:5.25};colliders.push(sink);cameraColliders.push({...sink});
 sign(g,'公共净室',22.45,y+2.98,6.77,1.8,.44);
 return P;
}
