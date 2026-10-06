// A finite, authored adult company. Stable IDs retain their own appearance and
// preferences across visits; only one hosted visit runs at a time.
export const SALON_ACTIVITIES=Object.freeze({
 poetry:{name:'茶叙诗词'},story:{name:'茶叙游记'},music:{name:'茶叙曲词'},chess:{name:'茶叙棋理'},banquet:{name:'宴饮邀约'}
});
export const SALON_ARTISTS=Object.freeze([
 {id:'cn-tavern-reciter',name:'柳清弦',age:27,gender:'女',specialty:'诗词',preference:'喜静谈与诗词，不喜喧闹宴饮',activity:'poetry',position:[18.8,7.815,18.66],target:[18.8,8.98,17.9],action:'read',look:{bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'ruqun-long-skirt',clothes:0x995f7f,hair:0x262526},yes:'好呀，正有两句词想与你说。若有空房，我们一起去坐坐。'},
 {id:'cn-tavern-storyteller',name:'沈砚舟',age:31,gender:'男',specialty:'游记与说书',preference:'爱谈山川见闻，不赴喧闹酒局',activity:'story',position:[21.25,7.815,19.75],target:[20.65,8.98,19.3],action:'read',look:{bodyPreset:'masculine-lean',hairStyle:'side-part',wardrobePreset:'scholar-long-robe',clothes:0x4d737a,hair:0x382d27},yes:'我刚读到一段江行见闻。你若愿听，我们到楼下细说。'},
 // Keep both the front chair's narrow aisle and the hall doorway clear. This
 // table-side position faces the open arch, where two adults can pass normally.
 {id:'cn-tavern-songwriter',name:'顾流萤',age:25,gender:'女',specialty:'曲词与韵律',preference:'愿谈曲词韵律，今日不赴宴饮',activity:'music',position:[23.1,7.815,17.95],target:[24.2,8.98,18.2],action:'tea',look:{bodyPreset:'feminine-slender',hairStyle:'braided-tail',wardrobePreset:'ruqun-jacket',clothes:0xb0784f,hair:0x58412f},yes:'新填的曲词还想推敲几处。我们带一壶茶，下楼慢慢聊。'},
 {id:'cn-tavern-chess-poet',name:'陆怀川',age:29,gender:'男',specialty:'棋理与掌故',preference:'喜欢棋局掌故，不喜劝酒',activity:'chess',position:[23.05,7.815,20.15],target:[24.2,8.98,18.2],action:'relax',look:{bodyPreset:'masculine-broad',hairStyle:'swept-short',wardrobePreset:'scholar-tunic-trousers',clothes:0x647757,hair:0x252329},yes:'一局棋里也有许多故事。若得一间静室，我愿与你聊聊。'}
]);
export function salonArtistStations(){return SALON_ARTISTS.map(a=>({id:a.id,name:'顶层青楼 · '+a.specialty,action:'免费听'+a.specialty,playerAction:'relax',position:a.id==='cn-tavern-reciter'?[20.70,7.815,18.25]:[a.position[0],a.position[1],a.position[2]-.9],npcPosition:a.position.slice(),workTarget:a.target.slice(),npcName:a.name,npcAction:a.action,npcLabel:`成年艺者 · ${a.specialty}`,npcRotation:Math.PI,color:'#997588',age:a.age,ageYears:a.age,salon:{activities:[a.activity],willing:true,preference:a.preference,specialty:a.specialty,gender:a.gender,yes:a.yes},dialogue:`${a.preference}。公开听席不收费；单独茶叙另按报价，请到温晚的接待案前引见。`}));}
export function salonArtistAppearance(region,id,look){const a=region==='china'&&SALON_ARTISTS.find(a=>a.id===id);return a?{...look,...a.look}:look;}
