// Original fictional-character palettes. Color choices are independent traits,
// not an attempt to infer a real person's ethnicity or identity.
import {DEFAULT_SHAPE_TRAITS,SHAPE_RANGES,normalizeShapeTraits} from '/assets/character-traits.c581cc6d4bbbc140.js';
export const APPEARANCE_VERSION=3;
export const NPC_SHAPE_VERSION=1;
// Durable v1 generation contract: never retune these bounds or salts in place.
// The seed is already persisted with the player; region + stable station ID is
// the resident identity key. Future generators must use a new saved version.
const NPC_SHAPE_V1_RANGES=Object.freeze({jawWidth:[.84,1.12],legLength:[.94,1.06],eyeSize:[.82,1.20],noseSize:[.80,1.18],noseWidth:[.80,1.18],socketDepth:[.65,1.65]});
export const BODY_PRESETS=['feminine-balanced','masculine-lean','feminine-slender','masculine-broad'];
export const HAIR_STYLES=['swept-short','side-part','chin-bob','shoulder-wave','low-bun','braided-tail'];
export const WARDROBE_PRESETS={
 japan:{feminine:['yukata-wide-obi','kimono-soft-sleeve'],masculine:['yukata-narrow-obi','haori-trouser']},
 china:{feminine:['ruqun-long-skirt','ruqun-jacket'],masculine:['scholar-long-robe','scholar-tunic-trousers']},
 egypt:{feminine:['linen-sheath','linen-pleated-dress'],masculine:['linen-kilt','linen-tunic-kilt']},
 france:{feminine:['court-gown','court-overgown'],masculine:['court-frock-coat','court-waistcoat']}
};
// Explicit NPC roles are outside the seeded/player wardrobe cycle.
export const ROLE_WARDROBE_PRESETS={japan:['miko-hakama']};
const skin=[[0xefc6a6,3],[0xdfb18d,3],[0xca9672,2],[0xa87050,2],[0x7e5037,1],[0x593725,1]];
const palettes={
 japan:{skin:[[0xefc6a6,3],[0xdfb18d,4],[0xca9672,3],[0xa87050,2],[0x7e5037,1]],hair:[[0x252329,5],[0x362c2a,4],[0x53382d,3],[0x725442,1],[0x6c6661,1]],eyes:[[0x332923,5],[0x4a3428,4],[0x674830,2],[0x80704b,1]],clothes:[0x587e7a,0x596d89,0x91606a,0xb19870,0x777159,0x776789,0xa77565,0x697c65]},
 china:{skin:[[0xefc6a6,3],[0xdfb18d,4],[0xca9672,3],[0xa87050,2],[0x7e5037,1]],hair:[[0x262526,5],[0x382d27,4],[0x58412f,3],[0x755743,1],[0x807872,1]],eyes:[[0x35271f,5],[0x52392b,4],[0x715139,2],[0x82704d,1]],clothes:[0x826e49,0x8f4945,0x4e7771,0x677c57,0x536784,0x98798a,0xbaa776,0x7b6654]},
 egypt:{skin:[[0xe7bb92,2],[0xd1a17b,3],[0xb9825b,4],[0x956044,3],[0x714832,3],[0x543625,1]],hair:[[0x272322,5],[0x392a22,4],[0x58402b,3],[0x79573d,1],[0x85766a,1]],eyes:[[0x3c2c20,4],[0x5e402c,4],[0x80643f,2],[0x777952,1]],clothes:[0xe5d6ac,0xd1be8d,0xc6ac7d,0x5b8e94,0x658480,0xb67d54,0x9c705b,0xc9c4a4]},
 france:{skin:[[0xf0cbb0,3],[0xe1b48f,3],[0xc89572,2],[0xa77355,2],[0x795039,2],[0x583725,2]],hair:[[0x302724,3],[0x5e4130,3],[0x8c6847,2],[0xb89965,2],[0x9a6650,1],[0x837b71,1]],eyes:[[0x4c3429,3],[0x76553b,2],[0x6f815e,2],[0x738fa7,2],[0x918267,1]],clothes:[0x608774,0x788e79,0xc8c8ad,0x466e61,0x859bac,0xbba978,0x9d8193,0x6f7585]}
};
function hash(s){let n=2166136261;for(let i=0;i<s.length;i++){n^=s.charCodeAt(i);n=Math.imul(n,16777619);}n^=n>>>16;n=Math.imul(n,0x7feb352d);n^=n>>>15;n=Math.imul(n,0x846ca68b);return(n^(n>>>16))>>>0;}
function random(seed,trait){return hash(seed+'|'+trait)/4294967296;}
function weighted(list,t){const sum=list.reduce((a,x)=>a+x[1],0);let n=t*sum;for(const[c,w]of list){n-=w;if(n<0)return c;}return list.at(-1)[0];}
const pick=(a,t)=>a[Math.min(a.length-1,Math.floor(t*a.length))];
function identity(seed,variant){
 const bodyPreset=BODY_PRESETS[variant];
 return {bodyPreset,hairStyle:pick(HAIR_STYLES,random(seed,'hair-style')),wardrobeIndex:Math.floor(random(seed,'wardrobe-cut')*2),gaitPreset:Math.floor(random(seed,'gait-personality')*4)};
}
function wardrobe(region,bodyPreset,index){const p=WARDROBE_PRESETS[region]||WARDROBE_PRESETS.france;return p[bodyPreset.startsWith('masculine')?'masculine':'feminine'][index%2];}
export function npcShapeTraits(region,id,worldSeed=1,shapeVersion=NPC_SHAPE_VERSION){
 if(shapeVersion!==1)throw new RangeError('Unsupported resident shape version');
 const key=`npc-shape-v1|${worldSeed>>>0}|${region}|${id}`;
 return Object.fromEntries(Object.entries(NPC_SHAPE_V1_RANGES).map(([trait,[min,max]])=>[trait,Number((min+(max-min)*random(key,trait)).toFixed(4))]));
}
// Keep the v1 color salts forever: a schema migration must never repaint residents.
export function npcAppearance(region,id,worldSeed=1,shapeVersion=NPC_SHAPE_VERSION){const p=palettes[region]||palettes.france,key=`v1|${worldSeed>>>0}|${region}|${id}`,variant=Math.floor(random(key,'silhouette')*4),traits=identity(key,variant);return{skin:weighted(p.skin,random(key,'skin')),hair:weighted(p.hair,random(key,'hair')),eyeColor:weighted(p.eyes,random(key,'eyes')),clothes:pick(p.clothes,random(key,'clothes')),accent:region==='egypt'?0xc4a657:region==='china'?0xd0b478:0xdfceb0,variant,...traits,wardrobePreset:wardrobe(region,traits.bodyPreset,traits.wardrobeIndex),shapeTraits:npcShapeTraits(region,id,worldSeed,shapeVersion)};}
// Only the omamori/Inari approach attendant wears shrine service clothing.
// Keep every identity salt and the resident's original locomotion cut intact.
export function npcRoleAppearance(region,id,worldSeed=1,shapeVersion=NPC_SHAPE_VERSION){
 const look=npcAppearance(region,id,worldSeed,shapeVersion);
 return region==='japan'&&id==='jp-omamori'?{...look,hairStyle:'low-bun',wardrobePreset:'miko-hakama',locomotionWardrobePreset:look.wardrobePreset}:look;
}
export function createAppearanceState(seed){const key='player|'+(seed>>>0),variant=Math.floor(random(key,'silhouette')*4);return{version:APPEARANCE_VERSION,npcShapeVersion:NPC_SHAPE_VERSION,seed:seed>>>0,player:{skin:weighted(skin,random(key,'skin')),hair:weighted(palettes.france.hair,random(key,'hair')),eyeColor:weighted(palettes.france.eyes,random(key,'eyes')),variant,...identity(key,variant),shapeTraits:{...DEFAULT_SHAPE_TRAITS}}};}
function validBase(a){return Number.isInteger(a?.seed)&&a.seed>=0&&a.seed<=4294967295&&a.player&&['skin','hair','eyeColor'].every(k=>Number.isInteger(a.player[k])&&a.player[k]>=0&&a.player[k]<=0xffffff)&&Number.isInteger(a.player.variant)&&a.player.variant>=0&&a.player.variant<4;}
function validIdentity(a){return validBase(a)&&BODY_PRESETS.includes(a.player.bodyPreset)&&HAIR_STYLES.includes(a.player.hairStyle)&&Number.isInteger(a.player.wardrobeIndex)&&a.player.wardrobeIndex>=0&&a.player.wardrobeIndex<2&&Number.isInteger(a.player.gaitPreset)&&a.player.gaitPreset>=0&&a.player.gaitPreset<4;}
export function validAppearanceState(a){return a?.version===APPEARANCE_VERSION&&a.npcShapeVersion===NPC_SHAPE_VERSION&&validIdentity(a)&&Object.entries(SHAPE_RANGES).every(([key,{min,max}])=>Number.isFinite(a.player.shapeTraits?.[key])&&a.player.shapeTraits[key]>=min&&a.player.shapeTraits[key]<=max);}
export function migrateAppearanceState(a){
 if(validAppearanceState(a))return a;
 // Legacy saves use exact neutral morphs. Never interpret new fields on old saves,
 // change the world seed, or reroll an existing face during schema migration.
 if(a?.version===1&&validBase(a))return{...a,version:APPEARANCE_VERSION,npcShapeVersion:NPC_SHAPE_VERSION,player:{...identity('player|'+a.seed,a.player.variant),...a.player,shapeTraits:{...DEFAULT_SHAPE_TRAITS}}};
 if(a?.version===2&&validIdentity(a))return{...a,version:APPEARANCE_VERSION,npcShapeVersion:NPC_SHAPE_VERSION,player:{...a.player,shapeTraits:{...DEFAULT_SHAPE_TRAITS}}};
 if(a?.version===APPEARANCE_VERSION&&validIdentity(a))return{...a,npcShapeVersion:NPC_SHAPE_VERSION,player:{...a.player,shapeTraits:normalizeShapeTraits(a.player.shapeTraits)}};
 return null;
}
// Pool existing colors equally: random player appearance has no culture, skin or
// presentation weighting. World/resident seed is deliberately not a random trait.
const playerColorPool={skin:[...new Set([...skin.map(x=>x[0]),...Object.values(palettes).flatMap(p=>p.skin.map(x=>x[0]))])],hair:[...new Set(Object.values(palettes).flatMap(p=>p.hair.map(x=>x[0])))],eyes:[...new Set(Object.values(palettes).flatMap(p=>p.eyes.map(x=>x[0])))]};
export function randomizePlayerAppearance(state,rng=Math.random){
 const roll=()=>{const n=rng();return Number.isFinite(n)?Math.max(0,Math.min(1-Number.EPSILON,n)):0;};
 const variant=Math.floor(roll()*BODY_PRESETS.length),shapeTraits={};
 // Independent unbiased draws, not a search for the highest preference score.
 for(const[key,{min,max}]of Object.entries(SHAPE_RANGES))shapeTraits[key]=Number((min+(max-min)*roll()).toFixed(4));
 return{...state,version:APPEARANCE_VERSION,npcShapeVersion:state.npcShapeVersion??NPC_SHAPE_VERSION,seed:state.seed,player:{skin:pick(playerColorPool.skin,roll()),hair:pick(playerColorPool.hair,roll()),eyeColor:pick(playerColorPool.eyes,roll()),variant,bodyPreset:BODY_PRESETS[variant],hairStyle:pick(HAIR_STYLES,roll()),wardrobeIndex:Math.floor(roll()*2),gaitPreset:Math.floor(roll()*4),shapeTraits}};
}
export function playerAppearance(state,region,outfit=0){const p=palettes[region]||palettes.france,key='player-clothes|'+state.seed+'|'+region,offset=Math.floor(random(key,'outfit')*p.clothes.length),wardrobePreset=wardrobe(region,state.player.bodyPreset,state.player.wardrobeIndex+Math.floor((outfit>>>0)/4));return{...state.player,wardrobePreset,clothes:p.clothes[(offset+(outfit>>>0))%p.clothes.length],accent:region==='egypt'?0xc4a657:region==='china'?0xd0b478:0xdfceb0};}
