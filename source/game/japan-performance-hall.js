import * as G from './geometry.js?rev=R7-20261002';
const {THREE}=G;
import {PERFORMANCE_SEATS} from './japan-performance-cast.js';
export {performanceStations,performanceAppearance} from './japan-performance-cast.js';

// A modest stage in the existing east hall. No kotatsu, library, guest room,
// stair, original station, or furniture descriptor is moved or renumbered.
// Original geometry, inspired by Japan Arts Council's joshiki-maku reference:
// https://www2.ntj.jac.go.jp/unesco/kabuki/en/stage/index.html
export function buildJapanPerformanceHall({floor,obstacle,sign}){
 const g=new THREE.Group();g.name='Original Kasumi performance and tea salon';floor.add(g);
 const wood=0x684534,gold=0xc4a36b;
 G.box(g,4.5,.14,6,4,.13,2.4,wood);
 for(let i=0;i<12;i++)G.box(g,2.67+i*.33,.21,6,.305,.016,2.32,i%2?0xa4754c:0xb58353);
 G.box(g,4.5,.235,4.79,4.04,.055,.09,gold);
 // Front is fully open. A three-colour rear curtain and narrow side wings
 // establish the performance silhouette without covering the audience view.
 const curtain=new THREE.Group();curtain.name='Sewn three-colour stage curtain';curtain.userData.noStaticBatch=true;g.add(curtain);
 for(let i=0;i<15;i++){
  const x=2.47+i*.272,c=[0x323536,0x54776a,0xbd8051][i%3],points=[],indices=[];
  for(let row=0;row<=4;row++)for(let col=0;col<=4;col++){const u=col/4,v=row/4;points.push(x+u*.272,.29+v*2.70,7.12+Math.cos((i+u)*Math.PI*2)*(.026+.012*(1-v)));}
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){const a=row*5+col;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();
  const cloth=G.mesh(curtain,geo,c,0,0,0,{side:THREE.DoubleSide});cloth.receiveShadow=false;cloth.userData.shadowPolicy='toon-lit-casting-cloth-no-shadow-receiver';
 }
 for(const x of[2.43,6.57]){G.box(g,x,1.69,7.1,.14,3.23,.2,wood);G.box(g,x,1.68,6.55,.095,3.18,1.1,wood);obstacle(x,7.6+1.68,6.55,.095,3.18,1.1);}
 G.box(g,4.5,3.29,7.1,4.34,.18,.28,wood);obstacle(4.5,7.6+1.64,7.16,4.34,3.28,.16);
 const plaque=new THREE.Group();plaque.position.set(4.5,0,7.0);plaque.rotation.y=Math.PI;g.add(plaque);sign(plaque,0,2.97,0,'KASUMI',wood,2.1);
 floor.userData.characterMatSurfaces.push({minX:2.5,maxX:6.5,minZ:4.8,maxZ:7.1,offset:.218});
 // One table, two physically supported chairs, one server. Capacity is real.
 G.box(g,4.1,.88,3.18,2.25,.13,.77,wood);for(const x of[3.18,5.02])G.box(g,x,.45,3.18,.13,.85,.56,wood);obstacle(4.1,8.08,3.18,2.25,.96,.77);
 for(const s of PERFORMANCE_SEATS){const [x,,z]=s.center;for(const dx of[-.27,.27])for(const dz of[-.23,.23])G.box(g,x+dx,.29,z+dz,.075,.56,.075,wood);G.box(g,x,.54,z,.74,.10,.66,wood);G.box(g,x,.615,z,.68,.06,.6,s.id.includes('guest')?0x657a79:0x95546a);for(const dx of[-.31,.31])G.box(g,x+dx,.89,z-.29,.065,.72,.065,wood);G.box(g,x,1.12,z-.29,.70,.13,.065,wood);obstacle(x,8.20,z,.74,1.20,.66);}
 G.box(g,4.3,.58,-5.67,1.72,1.08,.62,wood);G.box(g,4.3,1.16,-5.67,1.82,.1,.72,0xac7b50);obstacle(4.3,8.2,-5.67,1.82,1.2,.72);
 // Price plaque is a world object at the only reception point; exact Chinese
 // menu text appears in the nearby E/touch interaction, at readable scale.
 sign(g,4.3,2.0,-5.25,'STAGE AND TEA',0x54776a,2.5);
 for(const x of[3.84,4.15,4.48]){G.cyl(g,x,1.29,-5.69,.09,.07,.16,0xe6d4ad,12);G.torus(g,x,1.375,-5.69,.077,.013,gold);}
 return {additionalFurniture:PERFORMANCE_SEATS.map(s=>({...s})),stageBounds:[2.5,6.5,4.8,7.2],references:['https://www2.ntj.jac.go.jp/unesco/kabuki/en/stage/index.html']};
}
