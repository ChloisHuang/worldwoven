/** Ming-informed original court dress; sources and limits: docs/ROYAL_COSTUME.md.
 * Garments enter the existing sculpt/skin pipeline; accessories use head bones.
 */
import * as THREE from 'three';
import {embroidery,dragonRoundel,floralSpray} from './china-royal-embroidery.js';
const GOLD=0xf0cd77,SHADOW_GOLD=0xa57931,JADE=0x63a092,WINE=0x782e3a,INK=0x222930;
const TAU=Math.PI*2;
function piping(g,loft,name,rings,color){return loft(g,name,rings,color,{segs:24,steps:4});}
function boots(g,{loft,shoe},side){
 shoe(g,side,false);
 loft(g,'palace-footwear-black-boot-'+side,[[.083,.041,.054,side*.089,-.018],[.16,.041,.045,side*.089,-.019],[.29,.047,.047,side*.089,-.014]],INK,{steps:10});
 // Recolor only the just-authored court footwear, not the shared palette.
 g.traverse(m=>{if(m.isMesh&&/^footwear|^sole-/.test(m.name))m.material={color:new THREE.Color(INK),skin:false,isMaterial:false};});
}
export function buildPalaceEmperorGarments(g,{loft,surface,ribbon,hand,shoe,conformFront,tone},C){
 const body=[[.14,.224,.131,0,-.010],[.34,.216,.128,0,-.008],[.72,.179,.113,0,-.006],[1.02,.157,.105,0,-.006],[1.16,.160,.100,0,-.006],[1.29,.188,.090,0,-.011],[1.337,.192,.080,0,-.012],[1.382,.116,.060,0,-.004],[1.404,.047,.039,0,.001]];
 loft(g,'palace-imperial-continuous-long-robe',body,C.yukata,{steps:38});
 // A round standing collar over a vermilion inner edge replaces the generic
 // crossed robe. The robe is ordinary court dress, not Qing court regalia.
 piping(g,loft,'palace-imperial-round-collar',[[1.384,.082,.052,0,0],[1.398,.056,.043,0,.001],[1.414,.043,.036,0,.003]],WINE);
 piping(g,loft,'palace-imperial-collar-gold-edge',[[1.384,.083,.053,0,0],[1.391,.071,.050,0,0]],GOLD);
 for(const side of[-1,1]){
  const sleeve=[[.942,.036,.043,side*.300,-.003],[.99,.050,.062,side*.298,-.008],[1.08,.080,.083,side*.281,-.017],[1.18,.087,.085,side*.250,-.020],[1.28,.079,.077,side*.206,-.016],[1.337,.061,.063,side*.173,-.012]];
  loft(g,'palace-imperial-draped-sleeve-'+side,sleeve,C.yukata,{steps:25});
  piping(g,loft,'palace-imperial-sleeve-inner-cuff-'+side,[[.932,.037,.044,side*.302,-.003],[.955,.041,.048,side*.300,-.004]],WINE);
  piping(g,loft,'palace-imperial-sleeve-gold-cuff-'+side,[[.957,.043,.050,side*.300,-.004],[.984,.051,.060,side*.298,-.007]],GOLD);
  piping(g,loft,'palace-imperial-sleeve-cuff-piping-'+side,[[.984,.052,.061,side*.298,-.007],[.990,.053,.063,side*.298,-.008]],SHADOW_GOLD);
  loft(g,'wrist-imperial-'+side,[[.916,.022,.023,side*.303,0],[.948,.027,.028,side*.301,-.002]],C.skin,{steps:5});hand(g,side);boots(g,{loft,shoe},side);
  conformFront(dragonRoundel(g,'palace-imperial-sleeve-shoulder-dragon-'+side,side*.206,1.268,.051,GOLD),sleeve,.004);
 }
 // Both front and back bear original coiled-dragon linework, with shoulder
 // roundels. These are authored gold strips, not images or sampled brocade.
 for(const back of[false,true]){
  const disc=embroidery(g,'palace-imperial-medallion-silk-'+back,SHADOW_GOLD);disc.fill(Array.from({length:32},(_,i)=>{const a=i/32*TAU;return[Math.sin(a)*.085,1.231+Math.cos(a)*.086];}));
  for(const m of[conformFront(disc.finish(),body,.0025),conformFront(dragonRoundel(g,'palace-imperial-coiled-dragon-'+back,0,1.231,.081,GOLD),body,.0045)])if(back){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,-p.getZ(i)-.020);m.geometry.computeVertexNormals();}
 }
 piping(g,loft,'palace-imperial-vermilion-belt',[[1.020,.163,.111,0,-.005],[1.077,.163,.111,0,-.005]],WINE);
 for(const y of[1.020,1.073])piping(g,loft,'palace-imperial-belt-gold-edge-'+y,[[y,.165,.113,0,-.005],[y+.005,.165,.113,0,-.005]],GOLD);
 for(let i=0;i<12;i++){const a=i*TAU/12;
  surface(g,'palace-imperial-gold-belt-setting-'+i,4,3,(u,v)=>{const b=a+(u-.5)*.27;return[Math.sin(b)*.167,1.028+v*.042,-.005+Math.cos(b)*.115];},GOLD);
  surface(g,'palace-imperial-jade-belt-plaque-'+i,4,3,(u,v)=>{const b=a+(u-.5)*.20;return[Math.sin(b)*.169,1.033+v*.032,-.005+Math.cos(b)*.117];},i%3===0?0xd7dec0:JADE);
 }
 piping(g,loft,'palace-imperial-woven-hem-border',[[.142,.226,.133,0,-.010],[.223,.224,.133,0,-.010]],tone(C.yukata,.71));
 for(const y of[.149,.208])piping(g,loft,'palace-imperial-hem-gold-piping-'+y,[[y,.228,.135,0,-.010],[y+.009,.228,.135,0,-.010]],GOLD);
 const hem=embroidery(g,'palace-imperial-gold-hem-clouds',GOLD);
 for(const x of[-.155,-.078,0,.078,.155])hem.stroke([[x-.027,.181],[x-.022,.192],[x-.010,.196],[x,.182],[x+.011,.188],[x+.025,.180]],.004);
 conformFront(hem.finish(),body,.008);
 for(const side of[-1,1]){
  conformFront(floralSpray(g,'palace-imperial-gold-cloud-sprig-'+side,side*.092,.55,.072,GOLD,side),body,.004);
  conformFront(ribbon(g,'palace-imperial-side-seam-'+side,[[side*.143,1.0,0],[side*.164,.72,0],[side*.204,.28,0]],.0035,SHADOW_GOLD),body,.003);
 }
}

export function buildPalaceConsortGarments(g,{loft,surface,ribbon,hand,shoe,conformFront,tone},C){
 const cream=0xe9d5a8,teal=0x397c79,deep=0x622c49;
 const skirt=[[.14,.251,.145,0,-.008],[.34,.241,.141,0,-.006],[.64,.210,.130,0,-.006],[.88,.177,.114,0,-.004],[1.09,.146,.096,0,-.003]];
 loft(g,'palace-consort-ivory-pleated-skirt',skirt,cream,{segs:24,steps:28,deform:(p,a,v)=>{const fold=.004*Math.cos(a*12)*(1-v*.6);p[0]+=Math.sin(a)*fold;p[2]+=Math.cos(a)*fold;return p;}});
 piping(g,loft,'palace-consort-teal-skirt-hem',[[.141,.254,.149,0,-.008],[.241,.249,.148,0,-.007]],teal);
 for(const y of[.150,.224])piping(g,loft,'palace-consort-skirt-hem-gold-'+y,[[y,.256,.151,0,-.008],[y+.009,.256,.151,0,-.008]],GOLD);
 const upper=[[1.04,.150,.102,0,-.003],[1.14,.145,.095,0,-.004],[1.24,.155,.094,0,-.007],[1.33,.183,.082,0,-.012],[1.37,.125,.063,0,-.004],[1.406,.047,.039,0,0]];
 loft(g,'palace-consort-crossed-robe-bodice',upper,C.yukata,{steps:28});
 // An open-front long overrobe exposes a separate ivory skirt. Three curved
 // layers create a court silhouette before embroidery is added.
 const coat=[[.40,.240,.149,0,-.006],[.56,.225,.143,0,-.006],[.80,.198,.130,0,-.004],[1.10,.154,.105,0,-.003]];
 surface(g,'palace-consort-open-overrobe',36,24,(u,v)=>{const y=.40+v*.70,w=.240+(.154-.240)*v,d=.149+(.105-.149)*v,a=(.67-.32*v)+u*(TAU-2*(.67-.32*v));return[Math.sin(a)*w,y,-.004+Math.cos(a)*d];},C.yukata);
 for(const side of[-1,1]){
  const points=Array.from({length:9},(_,i)=>{const v=i/8,a=.67-.32*v;return[side*Math.sin(a)*(.240+(.154-.240)*v),.40+v*.70,-.004+Math.cos(a)*(.149+(.105-.149)*v)+.003];});
  ribbon(g,'palace-consort-overrobe-teal-facing-'+side,points,.034,teal);ribbon(g,'palace-consort-overrobe-gold-edge-'+side,points,.006,GOLD,.003);
  const sleeve=[[.939,.043,.049,side*.301,-.004],[.985,.064,.074,side*.299,-.010],[1.065,.098,.102,side*.282,-.027],[1.17,.103,.104,side*.252,-.029],[1.27,.084,.081,side*.207,-.018],[1.337,.060,.064,side*.171,-.012]];
  loft(g,'palace-consort-hanging-sleeve-'+side,sleeve,C.yukata,{steps:25});
  piping(g,loft,'palace-consort-sleeve-ivory-inner-'+side,[[.927,.041,.046,side*.303,-.001],[.946,.047,.053,side*.301,-.003]],cream);
  piping(g,loft,'palace-consort-sleeve-teal-cuff-'+side,[[.947,.049,.055,side*.301,-.004],[.986,.066,.076,side*.299,-.010]],teal);
  for(const y of[.949,.981])piping(g,loft,'palace-consort-sleeve-cuff-gold-'+side+'-'+y,[[y,y<.96?.050:.065,y<.96?.057:.077,side*.300,-.006],[y+.006,y<.96?.053:.068,y<.96?.061:.079,side*.300,-.006]],GOLD);
  conformFront(floralSpray(g,'palace-consort-sleeve-gold-floral-'+side,side*.278,1.10,.100,GOLD,side),sleeve,.004);
  loft(g,'wrist-consort-'+side,[[.916,.022,.023,side*.303,0],[.945,.026,.028,side*.301,-.002]],C.skin,{steps:5});hand(g,side);shoe(g,side,false);
  conformFront(floralSpray(g,'palace-consort-overrobe-floral-'+side,side*.127,.77,.105,GOLD,side),coat,.007);
 }
 // Right-opening crossed layers; gold edging makes the overlap readable.
 for(const[name,points,width,color,offset]of[
  ['ivory-inner',[[-.032,1.408,0],[0,1.355,0],[.033,1.322,0]],.032,cream,.004],
  ['teal-overlap',[[.035,1.405,0],[.060,1.347,0],[-.025,1.239,0],[-.103,1.118,0]],.039,teal,.006],
  ['gold-overlap',[[.035,1.405,0],[.060,1.347,0],[-.025,1.239,0],[-.103,1.118,0]],.006,GOLD,.008]
 ])conformFront(ribbon(g,'palace-consort-collar-'+name,points,width,color),upper,offset);
 piping(g,loft,'palace-consort-wide-silk-sash',[[1.066,.156,.108,0,-.003],[1.126,.153,.105,0,-.003]],deep);
 for(const y of[1.069,1.118])piping(g,loft,'palace-consort-sash-gold-edge-'+y,[[y,.158,.110,0,-.003],[y+.006,.157,.109,0,-.003]],GOLD);
 const clasp=embroidery(g,'palace-consort-sash-gold-clasp',GOLD);clasp.ellipse(0,1.099,.038,.024,.008);conformFront(clasp.finish(),upper,.019);
 const jade=embroidery(g,'palace-consort-sash-jade',JADE);jade.fill([[-.022,1.100],[0,1.117],[.022,1.100],[0,1.082]]);conformFront(jade.finish(),upper,.020);
 for(const side of[-1,1]){
  const ends=[[side*.025,1.080,0],[side*.049,.95,0],[side*.059,.76,0],[side*.071,.63,0]];
  conformFront(ribbon(g,'palace-consort-pendant-silk-'+side,ends,.021,teal),skirt,.014);
  conformFront(ribbon(g,'palace-consort-pendant-gold-'+side,ends,.004,GOLD),skirt,.016);
 }
 const panel=embroidery(g,'palace-consort-skirt-brocade-vines',SHADOW_GOLD);
 for(const side of[-1,1])panel.stroke([[side*.02,.32],[side*.055,.40],[side*.033,.47],[side*.058,.54]],.005);
 conformFront(panel.finish(),skirt,.007);conformFront(floralSpray(g,'palace-consort-skirt-gold-peony',0,.41,.117,SHADOW_GOLD),skirt,.008);
 // Three pearl/jade swags at the upper chest, authored into the cloth so they
 // follow the torso without floating through book/meal arm movements.
 const jewel=embroidery(g,'palace-consort-chest-gold-chain',GOLD);jewel.stroke([[-.088,1.329],[-.065,1.295],[0,1.274],[.065,1.295],[.088,1.329]],.005);jewel.ellipse(0,1.270,.016,.024,.005);conformFront(jewel.finish(),upper,.014);
}
export function createPalaceMealKit(actor){
 const groups=[],materials=new Map(),material=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshToonMaterial({color:c}));return materials.get(c);};
 const add=(p,geo,c,x,y,z)=>{const m=new THREE.Mesh(geo,material(c));m.position.set(x,y,z);p.add(m);return m;};
 const bowl=new THREE.Group(),palm=new THREE.Vector3();bowl.name='Palace porcelain bowl with dumplings';actor.root.add(bowl);groups.push(bowl);
 add(bowl,new THREE.CylinderGeometry(.125,.080,.055,16),0xb5c5aa,0,.014,0);
 for(const x of[-.045,.045])add(bowl,new THREE.SphereGeometry(.047,10,7),0xf0dfbd,x,.059,0).scale.set(.80,.54,1.15);
 for(const g of groups)g.visible=false;let disposed=false;
 return {show(value){for(const g of groups)g.visible=value;},sync(){if(!bowl.visible)return;actor.root.updateWorldMatrix(true,true);actor.root.userData.hands[0].getWorldPosition(palm);actor.root.worldToLocal(palm);bowl.position.copy(palm);bowl.position.y+=.02;bowl.position.z+=.035;bowl.rotation.set(0,0,0);},dispose(){if(disposed)return;disposed=true;for(const g of groups){g.removeFromParent();g.traverse(o=>o.geometry?.dispose());}for(const m of materials.values())m.dispose();}};
}

// Head ornaments interpret material and craft, not a rank-specific ceremonial
// crown. In particular the consort is not dressed as Xiaoduan Empress daily.
export function attachPalaceCostume(actor){
 const role=actor.station.royalRole;if(!role)return null;
 const group=new THREE.Group();group.name='Original palace '+role+' court ornaments';actor.root.userData.head.add(group);
 const bands=new THREE.DataTexture(new Uint8Array([90,150,213,255]),4,1,THREE.RedFormat);bands.minFilter=bands.magFilter=THREE.NearestFilter;bands.generateMipmaps=false;bands.needsUpdate=true;
 const materials=new Map(),material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshToonMaterial({color,gradientMap:bands}));return materials.get(color);};
 const part=(name,geo,color,x=0,y=0,z=0)=>{const mesh=new THREE.Mesh(geo,material(color));mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
 const bead=(name,color,x,y,z,r=.008)=>part(name,new THREE.SphereGeometry(r,8,6),color,x,y,z);
 const wire=(name,points,r=.003,color=GOLD)=>part(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,5,false),color);
 if(role==='emperor'){
  const rings=[[.211,.105,.091,-.012],[.264,.107,.091,-.016],[.315,.089,.078,-.027],[.349,.050,.045,-.038],[.356,.003,.003,-.041]],p=[],idx=[];
  for(const[y,rx,rz,z]of rings)for(let i=0;i<=24;i++){const a=i/24*TAU;p.push(Math.sin(a)*rx,y,z+Math.cos(a)*rz);}
  for(let j=0;j<rings.length-1;j++)for(let i=0;i<24;i++){const a=j*25+i;idx.push(a,a+1,a+25,a+1,a+26,a+25);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(idx);geo.computeVertexNormals();part('black everyday yishan cap',geo,INK);
  const band=part('black cap forehead binding',new THREE.CylinderGeometry(.108,.110,.025,24),0x171d24,0,.219,-.012);band.scale.z=.86;
  // Paired upward folded wings sit behind the crown. No horizontal officer's
  // wings, fantasy crown spikes or Qing conical hat are used.
  for(const side of[-1,1]){
   const sh=new THREE.Shape();sh.moveTo(-.041,0);sh.lineTo(-.044,.110);sh.bezierCurveTo(-.044,.153,-.014,.170,.018,.153);sh.bezierCurveTo(.038,.145,.047,.120,.046,.094);sh.lineTo(.038,0);sh.closePath();
   const wing=part('upturned folded cap wing '+side,new THREE.ExtrudeGeometry(sh,{depth:.018,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.003,curveSegments:7}),0x272e35,side*.049,.286,-.097);wing.rotation.z=-side*.095;wing.rotation.x=-.10;
   wire('fine gold wing binding '+side,[[side*.015,.313,-.075],[side*.014,.414,-.063],[side*.043,.443,-.060],[side*.083,.412,-.069]],.0017,SHADOW_GOLD);
  }
  wire('cap curved gold stitching',[[-.087,.271,.040],[-.050,.290,.064],[0,.294,.070],[.050,.290,.064],[.087,.271,.040]],.0033);
  bead('gold cap jewel setting',GOLD,0,.285,.075,.019).scale.set(1,.84,.30);bead('jade cap jewel',JADE,0,.286,.081,.012).scale.set(1,.78,.26);
  for(const side of[-1,1])bead('cap pearl '+side,0xeee2bd,side*.034,.287,.071,.0065);
 }else{
  const pin=part('gold transverse hairpin',new THREE.CylinderGeometry(.004,.004,.296,8),GOLD,0,.287,-.055);pin.rotation.z=Math.PI/2;
  // A low three-flower comb and two pendants, deliberately open around the bun;
  // its blue-green insets are original solid colors, never real feathers.
  for(const[cx,cy,cz,scale]of[[0,.336,-.003,1],[.094,.292,-.010,.77],[-.094,.292,-.010,.77]]){
   for(let i=0;i<5;i++){const a=i*TAU/5,px=cx+Math.sin(a)*.022*scale,py=cy+Math.cos(a)*.022*scale;
    const gold=bead('layered gold flower petal',GOLD,px,py,cz,.018*scale);gold.scale.set(.77,1.05,.25);gold.rotation.z=-a;
    const inset=bead('turquoise flower inset',0x359eac,px,py,cz+.004,.013*scale);inset.scale.set(.70,1,.22);inset.rotation.z=-a;
   }
   bead('flower pearl heart',0xffedc9,cx,cy,cz+.011,.009*scale);
   for(const side of[-1,1]){const leaf=bead('filigree gold leaf',GOLD,cx+side*.038*scale,cy-.022*scale,cz-.004,.019*scale);leaf.scale.set(.47,1,.24);leaf.rotation.z=-side*.74;const inset=bead('jade leaf inset',JADE,cx+side*.038*scale,cy-.022*scale,cz+.001,.014*scale);inset.scale.set(.36,1,.20);inset.rotation.z=-side*.74;}
  }
  wire('curved gold comb',[[-.124,.277,-.012],[-.068,.301,.018],[0,.313,.025],[.068,.301,.018],[.124,.277,-.012]],.0045);
  for(const side of[-1,1]){
   wire('pearl pendant chain '+side,[[side*.127,.286,.005],[side*.138,.244,.016],[side*.135,.196,.018],[side*.130,.166,.013]],.0020);
   for(let i=0;i<5;i++)bead('strung pendant pearl',0xffedc9,side*(.132+.004*Math.sin(i*.8)),.264-i*.019,.016,.006);
   bead('gold pendant drop',GOLD,side*.131,.164,.016,.012).scale.set(.70,1.5,.45);bead('jade pendant center',JADE,side*.131,.164,.022,.008).scale.set(.65,1.4,.35);
  }
 }
 // Batch all static ornaments by material: 5–7 draws instead of one mesh for
 // every pearl/petal. Batching retains the existing head bone and animation.
 const batches=new Map();for(const mesh of[...group.children]){mesh.updateMatrix();const geo=mesh.geometry,pos=geo.attributes.position,nor=geo.attributes.normal,b=batches.get(mesh.material)||{p:[],n:[],i:[],names:[]},base=b.p.length/3,nm=new THREE.Matrix3().getNormalMatrix(mesh.matrix),v=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrix);b.p.push(v.x,v.y,v.z);v.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize();b.n.push(v.x,v.y,v.z);}for(let i=0;i<(geo.index?.count??pos.count);i++)b.i.push(base+(geo.index?geo.index.getX(i):i));b.names.push(mesh.name);batches.set(mesh.material,b);geo.dispose();group.remove(mesh);
 }
 for(const[mat,b]of batches){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setIndex(b.i);geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,mat);mesh.name='Batched '+role+' '+mat.color.getHexString();mesh.userData.originalParts=b.names;mesh.castShadow=true;group.add(mesh);}
 actor.root.userData.palaceCostume=group;let disposed=false;
 return {dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.traverse(o=>o.geometry?.dispose());for(const m of materials.values())m.dispose();bands.dispose();delete actor.root.userData.palaceCostume;}};
}
