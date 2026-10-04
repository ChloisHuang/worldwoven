// Original 雅集楼 layout: the established north plinth and inset ground-floor
// doors remain in place; social, artistic and reading uses share one building.
export const CHINA_CULTURE_TOWER = Object.freeze({
 id:'china-culture-tower',name:'雅集楼',bounds:{minX:-11,maxX:11,minZ:-34,maxZ:-23},
 floors:[
  {id:'tea',name:'一层 · 茶叙会客',y:.815,ceiling:3.985},
  {id:'study',name:'二层 · 书画雅集',y:4.215,ceiling:7.385},
  {id:'archive-loft',name:'三层 · 藏书观景',y:7.615,ceiling:11.015}
 ],
 freedCourts:[
  {id:'west-open-court',name:'西苑留白庭',minX:-26,maxX:-16,minZ:8,maxZ:21},
  {id:'east-open-court',name:'东苑留白庭',minX:16,maxX:26,minZ:8,maxZ:21}
 ]
});

// Keep scene geometry, navigation solids, rugs and existing exploration IDs in
// the same rigid relocation. No global scale changes human-size work objects.
export function relocateCultureFurniture(room,record,delta,targets){
 const [dx,dy,dz]=delta;room.g.position.set(dx,dy,dz);
 for(const hull of [...record.colliders,...record.cameraColliders]){
  hull.minX+=dx;hull.maxX+=dx;hull.minZ+=dz;hull.maxZ+=dz;
  hull.minY=(hull.minY??.2)+dy;hull.maxY=(hull.maxY??3.5)+dy;
 }
 for(const rug of room.g.userData.rugSurfaces||[]){rug.minX+=dx;rug.maxX+=dx;rug.minZ+=dz;rug.maxZ+=dz;rug.y+=dy;}
 for(const t of targets.filter(t=>t.roomId===room.id))t.position=[t.position[0]+dx,.215+dy,t.position[2]+dz];
 room.floorY=.215+dy;
}
