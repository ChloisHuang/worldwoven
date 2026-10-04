import * as G from './geometry.js?rev=R7-20261002';
const {THREE}=G;
export const PERFORMANCE_POINTS=Object.freeze({reception:[4.3,7.6,-4.6],reply:[2.9,7.6,-4.6],stage:[4.5,7.6,5.9],serve:[5.8,7.6,3.15],bar:[4.3,7.6,-6.3]});
export const PERFORMANCE_ACTIVITIES=Object.freeze({dance:{id:'dance',name:'观赏折扇小舞',fee:8,duration:14},story:{id:'story',name:'听町街短篇',fee:7,duration:14},tea:{id:'tea',name:'成年艺者陪席茶谈',fee:6,duration:12}});
export const PERFORMANCE_DRINKS=Object.freeze([{id:'tea',name:'焙茶',fee:2},{id:'sake',name:'清酒一小盏',fee:4}]);
export const PERFORMANCE_CAST=Object.freeze([
 {id:'jp-performance-reception',name:'绫乃',ageYears:36,position:[4.3,7.6,-6.3],specialty:'接待与奉茶',preference:'爽朗细心，按单准备一小盏饮品',activities:[],look:{bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'yukata-narrow-obi',clothes:0x577b78,hair:0x333032,accent:0xd7b576}},
 {id:'jp-salon-mai',name:'舞',ageYears:28,position:[2.4,7.6,-6.4],specialty:'折扇小舞',preference:'安静专注，喜欢细看舞步；不接说书',activities:['dance','tea'],yes:'我愿意。舞里那阵风，也可以等落座后慢慢说。',look:{bodyPreset:'feminine-slender',hairStyle:'low-bun',wardrobePreset:'kimono-soft-sleeve',clothes:0x9c5267,hair:0x27262d,accent:0xe0bc79}},
 {id:'jp-salon-ichiro',name:'一郎',ageYears:43,position:[5.9,7.6,-6.4],specialty:'町街说书',preference:'温和诙谐，爱聊旅途掌故；不接扇舞',activities:['story','tea'],yes:'好呀，我有一段雨夜小店的故事。你若愿听，我们慢慢讲。',look:{bodyPreset:'masculine-broad',hairStyle:'swept-short',wardrobePreset:'haori-trouser',clothes:0x405e83,hair:0x58504b,accent:0xb49160}}
]);
export const PERFORMANCE_SEATS=Object.freeze([
 {id:'jp-performance-guest-seat',kind:'seat',name:'三层演艺茶席 · 客席',action:'坐到演艺茶席',center:[3.1,7.6,2.1],anchor:[3.1,7.6,2.23],position:[2.25,7.6,2.1],exitPositions:[[2.25,7.6,2.1],[3.1,7.6,1.15]],yaw:0,seatY:8.20,size:[.74,1.45,.66]},
 {id:'jp-performance-artist-seat',kind:'seat',name:'三层演艺茶席 · 艺者席',action:'坐下休息',center:[5.1,7.6,2.1],anchor:[5.1,7.6,2.23],position:[5.95,7.6,2.1],exitPositions:[[5.95,7.6,2.1],[5.1,7.6,1.15]],yaw:0,seatY:8.20,size:[.74,1.45,.66]}
]);
export function performanceStations(){return PERFORMANCE_CAST.map((a,i)=>({id:a.id,npcName:a.name,ageYears:a.ageYears,npcOnly:i>0,name:i?'三层 · '+a.specialty:'三层 · 歌舞伎灵感小舞台接待',action:'查看演艺与饮品价目',position:i?a.position.slice():PERFORMANCE_POINTS.reception.slice(),npcPosition:a.position.slice(),npcAction:i?'relax':'tea',npcLabel:`${a.ageYears}岁 · ${a.specialty}`,color:'#a16b68',dialogue:i?a.preference:'这里是原创町街演艺小厅。可以观演，或请成年艺者陪席茶谈；先由本人回应，再确认价目。',performance:a}));}
export function performanceAppearance(region,id,look){const a=region==='japan'&&PERFORMANCE_CAST.find(a=>a.id===id);return a?{...look,...a.look}:look;}

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
 for(let i=0;i<15;i++){
  const x=2.6+i*.272,c=[0x323536,0x54776a,0xbd8051][i%3];
  G.box(g,x,1.64,7.13,.266,2.67,.075,c);
  G.cyl(g,x-.082,1.64,7.07,.033,.033,2.67,c,6);
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
 sign(g,4.3,2.0,-5.25,'ACT 8  TEA 2',0x54776a,2.5);
 for(const x of[3.84,4.15,4.48]){G.cyl(g,x,1.29,-5.69,.09,.07,.16,0xe6d4ad,12);G.torus(g,x,1.375,-5.69,.077,.013,gold);}
 return {additionalFurniture:PERFORMANCE_SEATS.map(s=>({...s})),stageBounds:[2.5,6.5,4.8,7.2],references:['https://www2.ntj.jac.go.jp/unesco/kabuki/en/stage/index.html']};
}
