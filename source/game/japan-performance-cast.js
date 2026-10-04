export const PERFORMANCE_POINTS=Object.freeze({reception:[4.3,7.6,-4.6],reply:[2.9,7.6,-4.6],stage:[4.5,7.6,5.9],serve:[5.8,7.6,3.15],bar:[4.3,7.6,-6.3]});
export const PERFORMANCE_ACTIVITIES=Object.freeze({dance:{id:'dance',name:'观赏折扇小舞',fee:8,duration:14},story:{id:'story',name:'听町街短篇',fee:7,duration:14},tea:{id:'tea',name:'成年艺者陪席茶谈',fee:6,duration:12}});
export const PERFORMANCE_DRINKS=Object.freeze([{id:'tea',name:'焙茶',fee:2},{id:'sake',name:'清酒一小盏',fee:4}]);
export const PERFORMANCE_CAST=Object.freeze([
 {id:'jp-performance-reception',name:'绫乃',ageYears:36,position:[4.3,7.6,-6.3],specialty:'接待与奉茶',preference:'爽朗细心，按单准备一小盏饮品',activities:[],look:{bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'yukata-narrow-obi',clothes:0x577b78,hair:0x333032,accent:0xd7b576}},
 {id:'jp-salon-mai',name:'舞',ageYears:28,position:[2.4,7.6,-6.4],specialty:'折扇小舞',preference:'安静专注，喜欢细看舞步；不接说书',activities:['dance','tea'],yes:'我愿意。舞里那阵风，也可以等落座后慢慢说。',look:{bodyPreset:'feminine-slender',hairStyle:'low-bun',wardrobePreset:'kimono-soft-sleeve',clothes:0x9c5267,hair:0x27262d,accent:0xe0bc79}},
 {id:'jp-salon-ichiro',name:'一郎',ageYears:43,position:[5.9,7.6,-6.4],specialty:'町街说书',preference:'温和诙谐，爱聊旅途掌故；不接扇舞',activities:['story','tea'],yes:'好呀，我有一段雨夜小店的故事。你若愿听，我们慢慢讲。',look:{bodyPreset:'masculine-broad',hairStyle:'swept-short',wardrobePreset:'haori-trouser',clothes:0x405e83,hair:0x58504b,accent:0xb49160}}
]);
export const PERFORMANCE_SEATS=Object.freeze([
 {id:'jp-performance-guest-seat',kind:'seat',name:'三层演艺茶席 · 客席',action:'坐到演艺茶席',center:[3.1,7.6,2.1],anchor:[3.1,7.6,2.23],position:[2.25,7.6,2.1],exitPositions:[[2.25,7.6,2.1],[3.1,7.6,1.15]],yaw:0,seatY:8.245,size:[.74,1.45,.66]},
 {id:'jp-performance-artist-seat',kind:'seat',name:'三层演艺茶席 · 艺者席',action:'坐下休息',center:[5.1,7.6,2.1],anchor:[5.1,7.6,2.23],position:[5.95,7.6,2.1],exitPositions:[[5.95,7.6,2.1],[5.1,7.6,1.15]],yaw:0,seatY:8.245,size:[.74,1.45,.66]}
]);
export function performanceStations(){return PERFORMANCE_CAST.map((a,i)=>({id:a.id,npcName:a.name,ageYears:a.ageYears,npcOnly:i>0,name:i?'三层 · '+a.specialty:'三层 · 歌舞伎灵感小舞台接待',action:'查看演艺与饮品价目',position:i?a.position.slice():PERFORMANCE_POINTS.reception.slice(),npcPosition:a.position.slice(),npcAction:i?'relax':'tea',npcLabel:`${a.ageYears}岁 · ${a.specialty}`,color:'#a16b68',dialogue:i?a.preference:'这里是原创町街演艺小厅。可以观演，或请成年艺者陪席茶谈；先由本人回应，再确认价目。',performance:a}));}
export function performanceAppearance(region,id,look){const a=region==='japan'&&PERFORMANCE_CAST.find(a=>a.id===id);return a?{...look,...a.look}:look;}

