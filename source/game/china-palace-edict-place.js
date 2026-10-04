// One original fictional palace instruction, not a model of every Ming decree.
export const PALACE_EDICT=Object.freeze({
 owner:'china-palace-edict',title:'荷庭东岸清扫令',text:'命 Bo 清扫荷庭东岸落叶，收于竹筐，留宽路供人通行。',
 herald:{id:'cn-palace-herald',npcName:'沈序 · 宫苑传令',ageYears:34,npcPosition:[4.2,1.415,-4.15]},
 points:{draft:[5.15,5.083,-28.34],scribe:[5.2,4.215,-27.68],collect:[6.15,4.215,-27.65],
  seal:[4.2,2.33,-4.84],sealStand:[4.2,1.415,-4.18],approve:[-14.1,.145,-13.35],
  read:[11.5,.145,-14.0],recipient:[10,.145,-14.0],work:[10,.145,-14.6],file:[11.2,.145,-14.65],sweep:[10,.19,-15.3],basket:[11.2,.145,-15.3]},
});
export const palaceHeraldStation=()=>({...PALACE_EDICT.herald,npcOnly:true,name:'正殿东侧 · 传令案',action:'传达宫苑文书',npcAction:'edict-duty',npcLabel:'传令案前候命',position:PALACE_EDICT.herald.npcPosition.slice(),npcRotation:Math.PI,color:'#9b6651'});
export function palaceHeraldAppearance(region,id,look){return region==='china'&&id===PALACE_EDICT.herald.id?{...look,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe',clothes:0x865c4c,accent:0xc7aa68}:look;}

// Small real service furniture in the clear east hall bay and beside the
// existing east-shore tree. It occupies no gate, stair, seat or throne approach.
export function buildPalaceEdictPlace(G,{group,colliders,cameraColliders,explorationTargets}){
 const q=new G.THREE.Group();q.name='Palace edict sealing stand';group.add(q);const floor=1.415,x=4.2,z=-5.0;
 G.box(q,x,floor+.83,z,1.30,.10,.70,0x76513a);G.box(q,x,floor+.76,z,1.18,.09,.59,0xb89456);
 for(const dx of[-.51,.51])for(const dz of[-.23,.23])G.box(q,x+dx,floor+.4,z+dz,.08,.80,.08,0x67422e);
 G.box(q,x+.40,floor+.91,z-.06,.21,.06,.20,0x7a2f2a);
 const hull={minX:x-.65,maxX:x+.65,minZ:z-.35,maxZ:z+.35,minY:floor,maxY:floor+.88};colliders.push({...hull});cameraColliders.push({...hull});
 const b=PALACE_EDICT.points.basket;const basketHull={minX:b[0]-.36,maxX:b[0]+.36,minZ:b[2]-.36,maxZ:b[2]+.36,minY:b[1],maxY:b[1]+.36};colliders.push({...basketHull});cameraColliders.push({...basketHull});
 explorationTargets.push({id:'cn-edict-seal',name:'正殿传令案',position:PALACE_EDICT.points.sealStand.slice(),roomId:'hall'},{id:'cn-edict-garden-work',name:'荷庭东岸清扫处',position:PALACE_EDICT.points.work.slice(),roomId:'outdoors'});
 return PALACE_EDICT;
}
