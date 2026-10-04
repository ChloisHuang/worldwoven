// The rear of the existing east service bay becomes the house's own kitchen.
// Public stairs, the cross-hall and every dining/guest-room furniture ID stay put.
export const TAVERN_MEAL={id:'yunlai-mushroom-rice',name:'云来菌菇饭',host:'cn-tavern-host',cook:'cn-tavern-cook',floorY:.215,
 points:{host:[24.1,.215,11.4],prep:[23.3,.215,9.36],prepTop:[23.3,1.30,8.88],stove:[25.0,.215,9.36],stoveTop:[25.0,1.32,8.88],cookPass:[24.35,.215,9.36],hostPass:[24.35,.215,10.95],passTop:[24.35,1.29,10.1],wash:[25.1,.215,10.95],washTop:[25.1,1.30,10.1]}};
export function buildTavernKitchen(G,{group:g,block,table,H}){
 // An actual timber screen separates prep from the stair bay; the 1.2m side
 // opening and front of the pass remain usable from the public hall.
 block(g,21.97,1.35,9.48,.15,2.27,2.60,0x645344);
 for(const z of[8.25,9.48,10.70])G.box(g,21.88,1.59,z,.07,2.55,.075,0x9a7853);
 G.box(g,21.96,2.80,9.48,.24,.15,2.85,0x5c4537);
 const top=table(g,23.3,.215,8.60,1.55,.52,1.0);
 G.box(g,23.3,top+.025,8.82,.79,.045,.42,0xb68d58);
 for(const x of[22.76,23.82]){G.vessel(g,x,top,8.52,0x749180,.24);G.cyl(g,x,top+.17,8.52,.063,.066,.032,0xc8ae7b);}
 // Brick stove, recessed fire mouth, iron hob, two handles and a shallow pot.
 block(g,25.0,.735,8.65,1.18,1.04,.76,0x776b59);
 G.box(g,25.0,1.29,8.65,1.28,.10,.86,0x343d3a);
 G.box(g,25.0,.70,9.037,.53,.43,.025,0x302d27);
 for(const x of[24.68,25.32])G.box(g,x,.70,9.067,.085,.54,.07,0xa69071);
 G.box(g,25,.985,9.067,.72,.08,.07,0xa69071);
 for(const x of[24.86,25.10])G.cyl(g,x,.50,9.079,.024,.04,.15,0xa45b37,8);
 G.cyl(g,25,1.365,8.83,.33,.255,.14,0x3b4744,24);G.cyl(g,25,1.44,8.83,.297,.297,.015,0x8b7450,24);
 G.torus(g,25,1.45,8.83,.314,.025,0x76817a);
 for(const x of[24.62,25.38]){const h=G.torus(g,x,1.41,8.83,.075,.024,0x3b4744);h.scale.set(1,.72,1);}
 // Clean-water crock at the return end of the same pass, with a towel rail.
 H.bowl(g,25.1,1.29,10.1,0x809d93,.27);G.cyl(g,25.1,1.34,10.1,.205,.205,.012,0x83a9b0,24);
 G.box(g,25.68,1.06,10.1,.055,.05,.54,0xb39a65);G.box(g,25.71,.89,10.1,.025,.32,.33,0xdbcbaa);
 for(const y of[1.89,2.38]){G.box(g,22.15,y,8.64,.30,.055,.68,0x7c5a3b);for(const z of[8.43,8.75])G.vessel(g,22.16,y+.03,z,0xad9574,.22);}
}
