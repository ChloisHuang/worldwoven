// Family care needs a usable patch of floor, not merely a walkable point.
// Existing room ownership, walls, furniture and entry/working anchors stay intact.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function familyRoomBounds(room){const b=room?.bounds||room;return Array.isArray(b)?{minX:b[0],maxX:b[1],minZ:b[2],maxZ:b[3]}:b;}
export function familyRoomContains(room,p,margin=0){const b=familyRoomBounds(room),y=room?.floorY??(Number.isFinite(room?.floor)?(room.floor-1)*3.8:p.y);return !!b&&[b.minX,b.maxX,b.minZ,b.maxZ].every(Number.isFinite)&&p.x>=b.minX+margin&&p.x<=b.maxX-margin&&p.z>=b.minZ+margin&&p.z<=b.maxZ-margin&&Math.abs(p.y-y)<.65;}
export function chooseFamilyPlacement({base,room=null,blocked,planPath,actors=[],reservedPoints=[]}){
 const candidates=[],inside=(p,margin)=>!room||familyRoomContains(room,p,margin);
 if(room){const b=familyRoomBounds(room);for(let x=b.minX+.85;x<=b.maxX-.85;x+=.5)for(let z=b.minZ+.85;z<=b.maxZ-.85;z+=.5)candidates.push({x,y:base.y,z});}
 else for(const r of [1.5,2,2.5,3])for(let i=0;i<12;i++)candidates.push({x:base.x+Math.cos(i*Math.PI/6)*r,y:base.y,z:base.z+Math.sin(i*Math.PI/6)*r});
 const options=[];for(const p of candidates){
  if(blocked(p,.75)||actors.some(a=>Math.abs(a.y-p.y)<.7&&distance(a,p)<.75+(a.radius||.25))||reservedPoints.some(a=>Math.abs(a.y-p.y)<.7&&distance(a,p)<.85))continue;
  const pairs=[[[.95,0],[-.95,0]],[[0,.95],[0,-.95]]].map(pair=>pair.map(([x,z])=>({x:p.x+x,y:p.y,z:p.z+z}))).filter(pair=>pair.every(q=>inside(q,.35)&&!blocked(q,.35)&&!reservedPoints.some(a=>Math.abs(a.y-q.y)<.7&&distance(a,q)<.65)));
  if(!pairs.length)continue;let clearance=.75;for(const r of [1,1.2,1.4])if(inside(p,r)&&!blocked(p,r))clearance=r;
  options.push({position:p,pairs,clearance,score:clearance*10-distance(base,p)*.025});
 }
 options.sort((a,b)=>b.score-a.score);for(const option of options.slice(0,16))for(const pair of option.pairs){const ordered=[...pair].sort((a,b)=>distance(a,base)-distance(b,base));for(const care of ordered){const route=planPath(base,care,.25);if(Array.isArray(route)&&(route.length||distance(base,care)<.16))return {position:option.position,carePoints:ordered,clearance:option.clearance,roomId:room?.id||null};}}
 return null;
}
