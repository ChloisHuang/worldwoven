import {createLifeDecisions} from './npc-life-decisions.js';

// Stable authored adults. Seeded faces remain on the shared identity contract;
// dress, hair and personal values make these residents readable at play distance.
export const CHINA_CONSORTS=Object.freeze([
 {id:'cn-consort-yue',npcName:'月容 · 妃嫔',shortName:'月容',royalRole:'consort',ageYears:29,privateRoomId:'guest',privateBedId:'china-furniture-bed-2',npcPosition:[-23.5,.215,-2.2],costumeStyle:'flower-comb',personality:'温和好客，喜欢茶香与庭中闲谈',dialogue:'我是月容。闲时喜欢去找 Lin 品茶，也常与令仪聊庭里的花。若有些累，就回自己的客居歇歇。',appearance:{bodyPreset:'feminine-balanced',hairStyle:'low-bun',clothes:0x9b3f5d,accent:0xe1c17b},traits:{curiosity:.55,outdoors:.54,sociability:.87,quiet:.45,appetite:.60},relations:{'cn-tea':.40,'cn-consort-heng':.24,'cn-consort-ling':.34}},
 {id:'cn-consort-heng',npcName:'沈蘅 · 妃嫔',shortName:'沈蘅',royalRole:'consort',ageYears:34,privateRoomId:'consort-heng',privateBedId:'china-consort-bed-heng',npcPosition:[-17.95,.215,-4.3],costumeStyle:'jade-pin',personality:'沉静审慎，爱读书，也会独自看荷',dialogue:'我是沈蘅。比起热闹，我更喜欢安静读一卷书；读倦了便去看荷。月容谈茶时，我也愿意听一听。',appearance:{bodyPreset:'feminine-slender',hairStyle:'braided-tail',hair:0x262526,clothes:0x405875,accent:0xb8cfbc},traits:{curiosity:.94,outdoors:.58,sociability:.25,quiet:.92,appetite:.38},relations:{'cn-tea':.12,'cn-consort-yue':.30,'cn-consort-ling':.15}},
 {id:'cn-consort-ling',npcName:'令仪 · 妃嫔',shortName:'令仪',royalRole:'consort',ageYears:25,privateRoomId:'consort-ling',privateBedId:'china-consort-bed-ling',npcPosition:[-17.95,.215,.55],costumeStyle:'coral-spray',personality:'爽朗好奇，常去赏景，喜欢找熟人叙话',dialogue:'我是令仪。今日的水色和昨日不同，我总想出去看看。月容肯陪我说说见闻，沈蘅则常给我讲书里的故事。',appearance:{bodyPreset:'feminine-balanced',hairStyle:'shoulder-wave',hair:0x58412f,clothes:0xc37655,accent:0xf0cf8e},traits:{curiosity:.63,outdoors:.95,sociability:.82,quiet:.22,appetite:.70},relations:{'cn-tea':.24,'cn-consort-yue':.42,'cn-consort-heng':.18}}
]);
export const palaceResident=id=>CHINA_CONSORTS.find(p=>p.id===id);
export function palaceResidentAppearance(id){const p=palaceResident(id);return p?{...p.appearance,wardrobePreset:'palace-consort-ruqun',locomotionWardrobePreset:'ruqun-long-skirt'}:null;}
// A scene migration supplies authored values only for an unseen identity. It
// never resets an existing resident's PRNG, needs, choices or earned relations.
export function palaceResidentSave({worldSeed,actorIds,saved={}}){
 const initial=createLifeDecisions({worldSeed,actorIds,saved}).snapshot();
 for(const profile of CHINA_CONSORTS){
  const person=initial.people[profile.id];if(!person||saved.version===1&&saved.people?.[profile.id])continue;
  person.traits={...profile.traits};person.values={company:profile.traits.sociability,quiet:profile.traits.quiet,curiosity:profile.traits.curiosity};person.relations={...profile.relations};
 }
 return initial;
}
export const CONSORT_ROUTES=Object.freeze({
 'cn-consort-yue':[[-21.65,.215,-4.5],[-21.65,.215,-10.5],[-23.5,.215,-10.6],[-23.5,.215,-13.35]],
 'cn-consort-heng':[[-18.3,.215,-4.65],[-20,.215,-4.65],[-20,.215,-9.6],[-18.9,.215,-11],[-18.9,.215,-13.35]],
 'cn-consort-ling':[[-18.3,.215,.3],[-20,.215,.3],[-20,.215,-9.6],[-18.9,.215,-11],[-18.9,.215,-13.35]]
});
