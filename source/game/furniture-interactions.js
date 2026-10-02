import * as THREE from 'three';
import * as G from './geometry.js';
import {blocked,canTraverse} from './navigation.js';

// Bounded R11 contract: exactly one existing seat, one canopy, and one cultural
// changing place per region. Coordinates are measured against the R10 furniture.
// Neither the region topology nor its collider/walkable arrays is modified.
export const FURNITURE_DESCRIPTORS={
 china:{seat:{name:'寝殿阅读椅',anchor:[-17.9056,.285,-2.2944],position:[-17.15,.215,-3.05],yaw:Math.PI*.75,seatY:.875,center:[-18.1,.2,-2.1],size:[.9,1.65,.9]},canopy:{name:'寝殿纱帐',position:[-21,.215,-5.8],center:[-21,.2,-9],width:3.68,depth:3.94,top:3.08,bottom:1.05,color:0xe8d5b4},wardrobe:{name:'寝殿更衣妆台',position:[-23.7,.215,-.65],center:[-24.8,.2,-1.4],size:[.75,2.3,3.1],style:'dressing'}},
 france:{seat:{name:'翡翠沙龙扶手椅',anchor:[-6.65,.302,1.51],position:[-6.65,.302,.68],yaw:Math.PI,seatY:.9535,center:[-6.65,.23,1.8],size:[1.12,1.85,1.15]},canopy:{name:'皇家寝床纱帐',position:[7.55,.302,.58],center:[7.55,.23,-2.64],width:3.38,depth:4.04,top:4.07,bottom:1.35,color:0xf0e8d8},wardrobe:{name:'王宫衣橱',position:[-18.18,.23,-8.85],center:[-18.18,.23,-7.45],size:[1.37,2.45,.71],style:'armoire'}},
 japan:{seat:{name:'书阁木长椅',anchor:[-5,7.6,-11.64],position:[-5,7.6,-10.76],yaw:0,seatY:8.165,center:[-5,7.6,-11.8],size:[2.1,.57,.6]},canopy:{name:'客室薄纱寝帐',position:[2.48,7.6,-11.6],center:[4.4,7.6,-11.6],width:2.14,depth:3.08,top:9.88,bottom:8.11,color:0xe6deca,bamboo:true,curtainSide:'west'},wardrobe:{name:'汤馆和服更衣柜',position:[-9.92,3.8,2.4],center:[-11.32,3.8,2.4],size:[.95,2.65,3.9],style:'lockers'}},
 egypt:{seat:{name:'王室餐厅坐凳',anchor:[14.71,0,-9.3],position:[13.95,0,-9.3],yaw:-Math.PI/2,seatY:.66,center:[15.15,0,-9.3],size:[1.02,.66,1.02]},canopy:{name:'王室亚麻纱帐',position:[20.4,0,1.71],center:[20.4,0,-1.25],width:2.36,depth:3.56,top:3.21,bottom:.98,color:0xf0dfb6},wardrobe:{name:'王室雪松衣箱',position:[12.5,0,9.7],center:[14.2,0,9.7],size:[2.2,1.18,1.1],style:'chest'}}
};
const point=a=>new THREE.Vector3(...a);
const boxOf=d=>new THREE.Box3(new THREE.Vector3(d.center[0]-d.size[0]/2,d.center[1],d.center[2]-d.size[2]/2),new THREE.Vector3(d.center[0]+d.size[0]/2,d.center[1]+d.size[1],d.center[2]+d.size[2]/2));
function clothGeometry(width,height){
 const p=[],uv=[],idx=[],nx=32,ny=12;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const u=x/nx,v=y/ny;p.push(u*width,-v*height,.029*Math.sin(u*Math.PI*12)*(.82+.18*v));uv.push(u,v);}
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;idx.push(a,c,b,b,c,d);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();return geo;
}
function canopyGeometry(parent,d,region){
 const g=new THREE.Group();g.name=region+' operable gauze canopy';g.userData.furnitureInteraction='canopy';parent.add(g);g.position.set(d.center[0],0,d.center[2]);
 if(d.curtainSide==='west'){g.rotation.y=-Math.PI/2;d={...d,width:d.depth,depth:d.width};}
 const x=0,z=d.depth/2,y=d.top;
 // One suspended, non-coplanar single sheet per half; no doubled back/front wall.
 const mat=new THREE.MeshToonMaterial({color:d.color,transparent:true,opacity:.32,side:THREE.DoubleSide,depthWrite:false,depthTest:true});mat.forceSinglePass=true;
 const panels=[],rings=[],half=d.width/2-.016;
 const rail=G.cyl(g,x,y+.055,z,.025,.025,d.width+.10,0xb29462,12);rail.rotation.z=Math.PI/2;rail.name='Continuous curtain rail';
 if(d.bamboo)for(const xx of [-1,1])for(const zz of [-1,1]){const pole=G.cyl(g,x+xx*d.width/2,(d.top+.055+d.center[1])/2,zz*d.depth/2,.025,.034,d.top+.055-d.center[1],0x887655,8);pole.name='Bamboo sleeping-canopy post';}
 if(d.bamboo)for(const xx of[-1,1]){const p=G.cyl(g,x+xx*d.width/2,y+.055,0,.024,.024,d.depth,0x887655,8);p.rotation.x=Math.PI/2;p.name='Joined bamboo canopy side rail';}
 for(const side of[-1,1]){
  const panel=new THREE.Mesh(clothGeometry(half,y-d.bottom),mat);panel.name='Translucent pleated gauze '+(side<0?'left':'right');panel.position.set(x+side*d.width/2,y,z);panel.scale.x=-side;panel.castShadow=false;panel.receiveShadow=false;panel.renderOrder=22+(side>0?1:0);panel.userData={clothThickness:.004,singleSheet:true,side};g.add(panel);panels.push(panel);
  for(let i=0;i<7;i++){const ring=G.torus(g,0,y+.024,z,.032,.008,0xb29462,0);ring.rotation.y=Math.PI/2;ring.name='Suspension ring';rings.push({ring,side,u:i/6});}
 }
 function set(amount){const width=THREE.MathUtils.lerp(1,.105,amount);for(const p of panels)p.scale.x=-p.userData.side*width;for(const{ring,side,u}of rings)ring.position.x=x+side*d.width/2-side*half*u*width;}
 return {group:g,panels,material:mat,set};
}
function changingDetails(parent,d,region){
 const g=new THREE.Group();g.name=region+' cultural changing place';g.userData.furnitureInteraction='wardrobe';parent.add(g);const[x,y,z]=d.center;
 // Details sit within existing storage footprints, never creating a new obstacle.
 if(d.style==='dressing'){
  const frame=G.box(g,x-.23,1.83,z+.67,.065,1.38,.80,0xc8a15d);frame.name='Dressing mirror frame';G.box(g,x-.184,1.83,z+.67,.014,1.20,.65,0xa0b7ad).name='Inset polished bronze mirror';
  for(let i=0;i<3;i++)G.box(g,x+.10,1.07+i*.065,z+.79,.38,.06,.58,[0x9b6768,0xbba47a,0x738e82][i]).name='Folded embroidered silk';
 }else if(d.style==='armoire'){
  for(const dx of[-.31,.31]){G.box(g,x+dx,1.49,z-.371,.57,2.12,.025,0x759782).name='North-facing wardrobe panel';G.box(g,x+dx,1.49,z-.389,.44,1.88,.014,0xd7d7bf).name='Wardrobe raised ivory inset';const ring=G.torus(g,x+dx*.33,1.66,z-.422,.047,.009,0xc7a75b,0);ring.name='Wardrobe brass pull';}
  G.box(g,x,2.39,z-.413,.53,.18,.024,0xcfbc83).name='Wardrobe carved cartouche';
 }else if(d.style==='lockers'){
  // Silk sash hung on the existing locker edge makes the changing use legible.
  G.box(g,x+.495,y+1.49,z-.51,.018,.56,.14,0x986c78).name='Locker hanging obi sash';G.box(g,x+.514,y+1.73,z-.51,.035,.08,.19,0xd0b783).name='Obi sash folded tie';
 }else{
  G.box(g,x,.63,z+.557,2.04,.78,.022,0x765136).name='Royal cedar chest front';
  for(const dx of[-.92,0,.92])G.box(g,x+dx,.63,z+.577,.048,.82,.018,0xc9a34e).name='Gold chest band';
  G.box(g,x,.72,z+.596,.15,.20,.018,0xc9a34e).name='Royal chest clasp';
  for(const side of[-1,1]){G.box(g,x+side*1.117,.63,z,.024,.78,1.03,0x765136).name='Royal chest side';for(const dz of[-.44,.44])G.box(g,x+side*1.135,.63,z+dz,.016,.82,.048,0xc9a34e).name='Chest side gold band';const handle=G.torus(g,x+side*1.155,.78,z,.12,.022,0xc9a34e,0);handle.rotation.y=Math.PI/2;handle.name='Chest carrying ring';}
  for(const dx of[-.72,.72])G.box(g,x+dx,1.105,z-.48,.17,.028,.09,0xc9a34e).name='Inset chest lid hinge';
 }
 return g;
}
export function createFurnitureInteractions(lot,region,{curtains={},onCurtainChange=()=>{}}={}){
 const desc=FURNITURE_DESCRIPTORS[region];if(!desc)throw new Error('Unknown furniture region '+region);
 const root=new THREE.Group();root.name='R11 bounded furniture interactions';lot.group.add(root);
 const items=Object.entries(desc).map(([kind,d])=>({...d,id:region+'-furniture-'+kind,kind,furniture:true,action:kind==='seat'?'坐下休息':kind==='canopy'?'开合纱帐':'挑选服装',interactionRadius:2.1,position:d.position.slice()}));
 const seat=items[0],canopy=items[1],wardrobe=items[2],cloth=canopyGeometry(root,canopy,region);changingDetails(root,wardrobe,region);
 let amount=curtains[region]===false?0:1,target=amount,disposed=false;cloth.set(amount);
 const picks=items.map(item=>({item,box:item.kind==='canopy'?new THREE.Box3(new THREE.Vector3(item.center[0]-item.width/2,item.bottom,item.center[2]-item.depth/2),new THREE.Vector3(item.center[0]+item.width/2,item.top+.1,item.center[2]+item.depth/2)):boxOf(item)}));
 // Only the collider containing this authored seat is exempt during the short
 // mount/dismount segment. No global collider disable, nav teleport, or wall skip.
 const seatColliders=lot.colliders.filter(c=>c.minX<=seat.center[0]&&c.maxX>=seat.center[0]&&c.minZ<=seat.center[2]&&c.maxZ>=seat.center[2]&&(c.maxY??3.5)>seat.center[1]+.1&&(c.minY??-1)<seat.seatY&&(c.maxX-c.minX)<=seat.size[0]+.2&&(c.maxZ-c.minZ)<=seat.size[2]+.2);
 function transferClear(a,b,options,extra=[]){const colliders=lot.colliders.filter(c=>!seatColliders.includes(c)).concat(extra);return canTraverse(a,b,colliders,{...options,radius:.34});}
 return {items,root,cloth,seatColliders,
  update(dt){if(disposed)return;const step=Math.min(1,Math.max(0,dt)*2.4);amount=target>amount?Math.min(target,amount+step):Math.max(target,amount-step);cloth.set(amount);},
  toggleCurtain(){target=target?0:1;curtains[region]=!!target;onCurtainChange(region,!!target);return !!target;},
  curtainLabel:()=>target?'合上纱帐':'拉开纱帐',
  pick(ray,visible=()=>true){let best=null;for(const{item,box}of picks){const hit=ray.intersectBox(box,new THREE.Vector3());if(hit&&visible(hit)){const d=ray.origin.distanceTo(hit);if(!best||d<best.distance)best={item,distance:d};}}return best?.item||null;},
  seatCameraSolids(boxes){if(region!=='france')return boxes;const exact={minX:-7.24,maxX:-6.06,minY:.225,maxY:2.035,minZ:1.20,maxZ:2.40},index=boxes.findIndex(b=>Object.keys(exact).every(k=>Math.abs(b[k]-exact[k])<1e-5));if(index<0)return boxes;
   // Only the occupied fauteuil's coarse box is replaced by cavity-aware
   // proxies. Room walls, other furniture and every moving door remain intact.
   return boxes.filter((_,i)=>i!==index).concat([
    {minX:-7.24,maxX:-6.06,minY:.225,maxY:.985,minZ:1.20,maxZ:2.40},
    {minX:-7.17,maxX:-6.13,minY:1.02,maxY:2.035,minZ:2.04,maxZ:2.26},
    {minX:-7.19,maxX:-7.08,minY:1.0,maxY:1.43,minZ:1.43,maxZ:2.13},
    {minX:-6.22,maxX:-6.11,minY:1.0,maxY:1.43,minZ:1.43,maxZ:2.13}]);},
  canSit(options,extra=[]){return seatColliders.length>0&&transferClear(point(seat.position),point(seat.anchor),options,extra);},
  standPoint(options,extra=[]){const anchor=point(seat.anchor);for(const a of[seat.position,...[-.3,.3].map(offset=>[seat.position[0]+Math.cos(seat.yaw)*offset,seat.position[1],seat.position[2]-Math.sin(seat.yaw)*offset])]){const p=point(a);if(!blocked(p.x,p.z,lot.colliders.concat(extra),.34,{...options,y:p.y})&&transferClear(anchor,p,options,extra))return p;}return null;},
  state:()=>({region,curtainsOpen:!!target,curtainProgress:amount,items:items.map(({id,kind,position,anchor,seatY})=>({id,kind,position,anchor,seatY})),seatColliderCount:seatColliders.length}),
  dispose(){if(disposed)return;disposed=true;root.traverse(o=>o.geometry?.dispose());cloth.material.dispose();root.removeFromParent();}
 };
}

// Preview transactions never write persisted outfit state. Closing, escaping,
// leaving a region and committing are explicit terminal operations.
export function createOutfitPreview(initial=0){
 let open=false,original=0,selected=0;
 const normalize=n=>Number.isInteger(n)?((n%8)+8)%8:0;
 return {begin(value=initial){original=selected=normalize(value);open=true;return selected;},select(value){if(open)selected=normalize(value);return selected;},cancel(){open=false;selected=original;return original;},confirm(){open=false;original=selected;return selected;},state:()=>({open,original,selected})};
}
