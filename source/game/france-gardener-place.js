import * as G from './geometry.js';
import {addFlowerShrub} from './france-garden.js';

// The large parterres are closed by real boxwood. These small nursery beds sit
// beside the west walk, where a gardener can reach the roots without crossing it.
export const FRANCE_GARDENER={id:'france-gardener',stand:[-17.25,0,14.2],standTop:[-17.25,.83,14.2],approach:[-16.62,0,14.2],
 playerApproach:[-16.50,0,14.2],registration:[-18.25,0,15.55],host:[-17.15,0,15.55],
 beds:[{id:'west-nursery-rose-a',center:[-15.2,.18,12.6],approach:[-16.28,0,12.6],target:[-15.55,.24,12.6]},
  {id:'west-nursery-rose-b',center:[-15.2,.18,15.7],approach:[-16.28,0,15.7],target:[-15.55,.24,15.7]}],
 hedge:{id:'west-parterre-east-hedge',approach:[-15.28,0,21.2],target:[-14.64,.655,21.2]},rest:[-26.1,0,16.5],walk:[-16.1,0,26.5]};

export function addFranceGardenerPlace(group,colliders,cameraBox){
 const P=FRANCE_GARDENER,q=new G.THREE.Group();q.name='West garden nursery and tool stand';group.add(q);
 for(const bed of P.beds){const [x,,z]=bed.center;
  G.box(q,x,.11,z,1.42,.18,1.06,0xaebda0);G.box(q,x,.205,z,1.25,.035,.90,0x796449);
  for(const dz of[-.50,.50])G.box(q,x,.20,z+dz,1.44,.13,.085,0xebe7d5);
  for(const dx of[-.68,.68])G.box(q,x+dx,.20,z,.085,.13,.98,0xebe7d5);
  addFlowerShrub(q,x+.12,z,{base:.22,scale:.72,seed:bed.id.endsWith('a')?17:23});
  G.collider(colliders,x,z,1.44,1.08);cameraBox(x,.45,z,1.44,.90,1.08);
 }
 const [x,,z]=P.stand;G.box(q,x,.79,z,.58,.08,1.04,0xa39870);
 for(const dx of[-.22,.22])for(const dz of[-.43,.43])G.box(q,x+dx,.40,z+dz,.07,.76,.07,0x536f60);
 G.box(q,x,.28,z,.51,.055,.94,0x859379);G.box(q,x-.26,.98,z,.055,.40,1.02,0x536f60);
 G.box(q,x+.04,1.11,z+.30,.60,.035,.035,0x536f60);
 // A hiring book uses the existing rack; the approach leaves the tool lane clear.
 const book=G.box(q,x,.854,z+.28,.36,.035,.30,0xe8dec0);book.name='West garden helper register';
 G.box(q,x,.875,z+.28,.014,.007,.28,0x8c7452);
 G.collider(colliders,x,z,.62,1.08);cameraBox(x,.59,z,.62,1.18,1.08);
 q.userData.originalGardenAsset=true;group.userData.gardenerPlace=P;return q;
}
