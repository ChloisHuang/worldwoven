// Original fictional-character palettes. Color choices are independent traits,
// not an attempt to infer a real person's ethnicity or identity.
export const APPEARANCE_VERSION=1;
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
export function npcAppearance(region,id,worldSeed=1){const p=palettes[region]||palettes.france,key=`v${APPEARANCE_VERSION}|${worldSeed>>>0}|${region}|${id}`;return{skin:weighted(p.skin,random(key,'skin')),hair:weighted(p.hair,random(key,'hair')),eyeColor:weighted(p.eyes,random(key,'eyes')),clothes:pick(p.clothes,random(key,'clothes')),accent:region==='egypt'?0xc4a657:region==='china'?0xd0b478:0xdfceb0,variant:Math.floor(random(key,'silhouette')*4)};}
export function createAppearanceState(seed){const key='player|'+(seed>>>0);return{version:APPEARANCE_VERSION,seed:seed>>>0,player:{skin:weighted(skin,random(key,'skin')),hair:weighted(palettes.france.hair,random(key,'hair')),eyeColor:weighted(palettes.france.eyes,random(key,'eyes')),variant:Math.floor(random(key,'silhouette')*4)}};}
export function validAppearanceState(a){return a?.version===APPEARANCE_VERSION&&Number.isInteger(a.seed)&&a.seed>=0&&a.seed<=4294967295&&a.player&&['skin','hair','eyeColor'].every(k=>Number.isInteger(a.player[k])&&a.player[k]>=0&&a.player[k]<=0xffffff)&&Number.isInteger(a.player.variant)&&a.player.variant>=0&&a.player.variant<4;}
export function playerAppearance(state,region,outfit=0){const p=palettes[region]||palettes.france,key='player-clothes|'+state.seed+'|'+region,offset=Math.floor(random(key,'outfit')*p.clothes.length);return{...state.player,clothes:p.clothes[(offset+(outfit>>>0))%p.clothes.length],accent:region==='egypt'?0xc4a657:region==='china'?0xd0b478:0xdfceb0};}
