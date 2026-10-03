import * as THREE from 'three';

// Original carved forms for the judgment-room vignette. All dimensions stay
// inside its existing plinths / collision footprints; no navigation is added.
const P={stone:0x40585b,edge:0x567174,dark:0x172e35,gold:0xd1ab63,goldShade:0x97703c,lapis:0x245564,linen:0xd3c09a,red:0x9f493b,sand:0xd1af77,cut:0x886039};

function sculptor(parent,material){
  const mesh=(geometry,color)=>{const o=new THREE.Mesh(geometry,material(color));o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
  // Smooth rings describe the silhouette; changing radii and offsets model
  // anatomy rather than leaving separate primitive joints on display.
  const loft=(rings,color,{axis='y',segments=24,pleat=0}={})=>{
    const positions=[],indices=[];
    for(const [t,rx,rz,cx=0,cz=0] of rings)for(let i=0;i<segments;i++){
      const a=i*Math.PI*2/segments,r=1+pleat*(i%2?-.5:.5),u=Math.cos(a)*rx*r+cx,v=Math.sin(a)*rz*r+cz;
      positions.push(...(axis==='y'?[u,t,v]:[u,v,t]));
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
      const a=j*segments+i,b=j*segments+(i+1)%segments,c=b+segments,d=a+segments;
      if(axis==='y')indices.push(a,c,b,a,d,c);else indices.push(a,b,c,a,c,d);
    }
    for(const [j,last] of [[0,false],[rings.length-1,true]]){
      const [t,,,cx=0,cz=0]=rings[j],center=positions.length/3;positions.push(...(axis==='y'?[cx,t,cz]:[cx,cz,t]));
      for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments;if(last===(axis==='y'))indices.push(center,a,b);else indices.push(center,b,a);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();return mesh(geo,color);
  };
  const path=(points,color,r=.012)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(8,points.length*4),r,6,false),color);
  const relief=(shape,color,depth=.035,bevel=.009)=>mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSegments:1,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:16}),color);
  const outline=points=>{const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return s;};
  const ellipse=(x,y,rx,ry)=>{const s=new THREE.Shape();s.absellipse(x,y,rx,ry,0,Math.PI*2,false);return s;};
  const block=(w,h,d,x,y,z,color,r=.04)=>{
    const hw=w/2,hh=h/2,s=new THREE.Shape();s.moveTo(-hw+r,-hh);s.lineTo(hw-r,-hh);s.quadraticCurveTo(hw,-hh,hw,-hh+r);s.lineTo(hw,hh-r);s.quadraticCurveTo(hw,hh,hw-r,hh);s.lineTo(-hw+r,hh);s.quadraticCurveTo(-hw,hh,-hw,hh-r);s.lineTo(-hw,-hh+r);s.quadraticCurveTo(-hw,-hh,-hw+r,-hh);const o=relief(s,color,d-2*r,r);o.position.set(x,y,z-d/2+r);return o;
  };
  return {mesh,loft,path,relief,outline,ellipse,block};
}

export function addAnubisGuardian(parent,material,x,y,z){
  const g=new THREE.Group();g.name='Anubis · carved jackal guardian';g.position.set(x,y,z);parent.add(g);
  const {loft,path,relief,outline,ellipse,block}=sculptor(g,material);
  block(1.55,.25,1.3,0,.125,0,P.cut,.035);block(1.32,.12,1.10,0,.31,0,P.goldShade,.025);
  for(const side of [-1,1]){
    const cx=side*.23,advance=side<0?.10:0;
    loft([[-.17,.11,.08,cx,.46],[.0,.145,.12,cx,.45],[.22+advance,.17,.095,cx,.435],[.43+advance,.155,.06,cx,.405],[.48+advance,.12,.035,cx,.40]],P.stone,{axis:'z'});
    loft([[.42,.115,.11,cx,.01+advance],[.62,.105,.11,cx,-.01+advance],[.82,.125,.14,cx,-.04+advance],[1.08,.17,.17,cx,-.04],[1.30,.142,.14,cx,.025],[1.43,.157,.16,cx,.015],[1.70,.19,.20,cx,0]],P.stone);
    for(const dx of [-.075,0,.075])path([[cx+dx,.436,.35+advance],[cx+dx,.422,.455+advance]],P.dark,.008);
    path([[cx-.08,.73,.09+advance],[cx-.045,.95,.13],[cx-.055,1.19,.11]],P.edge,.012);
  }
  // Waist, rib cage, pectoral slope and trapezius share a continuous volume.
  loft([[1.82,.31,.22],[2.06,.32,.225],[2.25,.365,.255],[2.47,.445,.28],[2.69,.51,.285],[2.82,.515,.24],[2.94,.405,.20],[3.07,.22,.17]],P.stone);
  loft([[2.96,.18,.155,0,-.035],[3.16,.175,.17,0,-.05],[3.38,.20,.21,0,-.055],[3.59,.22,.235,0,-.07]],P.stone);
  // Fine vertical pleats belong to the skirt surface, not hanging rods.
  loft([[1.48,.53,.315],[1.53,.525,.325],[1.72,.465,.305],[1.98,.355,.245],[2.07,.33,.24]],P.linen,{segments:64,pleat:.036});
  loft([[2.035,.34,.25],[2.11,.342,.25]],P.gold);
  for(let i=-5;i<=5;i++){
    const a=Math.PI/2+i*.18;
    path([[Math.cos(a)*.348,2.035,Math.sin(a)*.259],[Math.cos(a)*.422,1.80,Math.sin(a)*.306],[Math.cos(a)*.522,1.515,Math.sin(a)*.337]],i%2?P.goldShade:P.gold,.009);
  }
  const apron=relief(outline([[-.16,2.045],[.16,2.045],[.26,1.49],[0,1.37],[-.26,1.49]]),P.gold,.025,.012);apron.position.z=.342;
  const inlay=relief(outline([[-.105,1.99],[.105,1.99],[.16,1.54],[0,1.46],[-.16,1.54]]),P.lapis,.015,.006);inlay.position.z=.382;
  for(const yy of [1.63,1.75,1.87])path([[-.095,yy,.408],[.095,yy,.408]],P.gold,.012);
  for(const side of [-1,1]){
    const hold=side>0;
    loft([[1.88,.075,.083,side*.68,hold?.145:.065],[1.94,.098,.096,side*.70,hold?.17:.07],[2.06,.087,.098,side*.70,hold?.15:.06],[2.19,.073,.084,side*.68,hold?.12:.025],[2.34,.106,.116,side*.655,0],[2.51,.127,.135,side*.61,-.012],[2.74,.16,.165,side*.515,0],[2.83,.135,.13,side*.465,0]],P.stone);
    loft([[2.105,.09,.103,side*.694,hold?.135:.05],[2.19,.087,.098,side*.68,hold?.12:.035]],P.gold);
    if(!hold)for(const off of [-.04,0,.04])path([[side*.70+off,1.93,.157],[side*.69+off,2.01,.16]],P.dark,.006);
  }
  // Broad ceremonial collar follows the shoulder slope and carries three
  // beaded bands around a small neck opening.
  const collar=new THREE.Shape();collar.moveTo(-.205,3.095);collar.bezierCurveTo(-.30,3.01,-.48,2.94,-.495,2.84);collar.bezierCurveTo(-.34,2.65,.34,2.65,.495,2.84);collar.bezierCurveTo(.48,2.94,.30,3.01,.205,3.095);collar.bezierCurveTo(.18,2.97,-.18,2.97,-.205,3.095);
  const collarMesh=relief(collar,P.gold,.035,.014);collarMesh.position.z=.215;
  for(const [rx,ry,cy,c]of[[.435,.19,2.955,P.lapis],[.374,.13,2.959,P.red],[.303,.085,2.983,P.lapis]]){
    const pts=[];for(let i=0;i<=24;i++){const a=Math.PI+i*Math.PI/24;pts.push([Math.cos(a)*rx,cy+Math.sin(a)*ry,.273]);}path(pts,c,.020);
  }
  for(let i=0;i<13;i++){const a=Math.PI+i*Math.PI/12;path([[Math.cos(a)*.33,2.976+Math.sin(a)*.115,.289],[Math.cos(a)*.455,2.954+Math.sin(a)*.195,.289]],P.gold,.007);}
  // Skull and muzzle share one surface, with a low jaw and sloping bridge.
  loft([[-.34,.13,.16,0,3.54],[-.26,.22,.255,0,3.57],[-.10,.273,.285,0,3.60],[.08,.25,.245,0,3.62],[.23,.197,.167,0,3.56],[.43,.15,.115,0,3.49],[.66,.104,.080,0,3.445],[.76,.089,.066,0,3.447]],P.stone,{axis:'z',segments:28});
  loft([[.72,.091,.069,0,3.447],[.79,.095,.06,0,3.455],[.81,.062,.041,0,3.451]],P.dark,{axis:'z',segments:16});
  for(const side of [-1,1]){
    const ear=outline([[side*.12,3.76],[side*.15,4.015],[side*.255,4.39],[side*.337,4.02],[side*.338,3.77]]);
    const em=relief(ear,P.stone,.125,.022);em.position.z=-.15;
    const inner=outline([[side*.193,3.845],[side*.214,4.017],[side*.254,4.265],[side*.287,4.01],[side*.282,3.86]]);
    const im=relief(inner,P.goldShade,.016,.006);im.position.z=.004;
    const eye=new THREE.Shape();eye.moveTo(-.09,0);eye.quadraticCurveTo(-.01,.05,.10,.008);eye.quadraticCurveTo(.01,-.042,-.09,0);
    const e=relief(eye,P.gold,.016,.005);e.position.set(side*.228,3.665,.165);e.rotation.y=side*.70;e.rotation.z=-side*.14;
    const pupil=relief(ellipse(0,0,.019,.032),P.dark,.016,.002);pupil.position.copy(e.position);pupil.position.z+=.023;pupil.rotation.copy(e.rotation);
    path([[side*.19,3.697,.157],[side*.155,3.635,.269],[side*.115,3.58,.364]],P.dark,.010);
    path([[side*.085,3.427,.734],[side*.138,3.425,.49],[side*.186,3.457,.278]],P.dark,.009);
  }
  // A slender ankh staff held by the closed hand.
  path([[.745,.37,.145],[.745,3.27,.145]],P.gold,.026);
  const loop=new THREE.Shape();loop.absellipse(.745,3.425,.12,.165,0,Math.PI*2,false);const hole=new THREE.Path();hole.absellipse(.745,3.425,.079,.122,0,Math.PI*2,true);loop.holes.push(hole);const am=relief(loop,P.gold,.030,.005);am.position.z=.13;
  path([[.60,3.244,.145],[.89,3.244,.145]],P.gold,.024);
  path([[.705,2.033,.217],[.754,2.03,.224],[.79,2.056,.183]],P.edge,.024);
  return g;
}

export function addJudgmentBalance(parent,material,x,y,z){
  const g=new THREE.Group();g.name='Judgment balance · heart and feather';g.position.set(x,y,z);parent.add(g);
  const {loft,path,relief,outline,ellipse,block,mesh}=sculptor(g,material);
  block(2.5,.24,1.15,0,.12,0,P.cut,.035);block(1.65,.08,.75,0,.28,0,P.goldShade,.016);
  loft([[.32,.23,.23],[.36,.23,.23],[.40,.135,.135],[.51,.098,.098],[1.53,.059,.059],[1.64,.095,.095],[1.71,.143,.143],[1.77,.145,.145],[1.81,.08,.08]],P.gold);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;path([[Math.cos(a)*.065,1.49,Math.sin(a)*.065],[Math.cos(a)*.092,1.63,Math.sin(a)*.092],[Math.cos(a)*.138,1.73,Math.sin(a)*.138]],P.lapis,.009);}
  // Curved, tapered cast beam with open suspension eyes and central pivot.
  const beam=outline([[-1.09,1.86],[-.91,1.88],[-.14,1.96],[0,1.99],[.14,1.96],[.91,1.88],[1.09,1.86],[1.075,1.81],[.84,1.815],[.13,1.855],[0,1.85],[-.13,1.855],[-.84,1.815],[-1.075,1.81]]);
  const bm=relief(beam,P.gold,.085,.012);bm.position.z=-.045;
  for(const yy of [1.79,1.93]){const disc=relief(ellipse(0,yy,.069,.069),P.goldShade,.075,.007);disc.position.z=.025;}
  path([[0,1.84,.09],[0,1.48,.09]],P.dark,.013);const pointer=relief(outline([[-.035,1.54],[.035,1.54],[0,1.455]]),P.gold,.023,.002);pointer.position.z=.080;
  for(const side of [-1,1]){
    const cx=side*.86,cy=1.82;
    const loop=new THREE.Shape();loop.absellipse(cx,cy,.042,.052,0,Math.PI*2,false);const h=new THREE.Path();h.absellipse(cx,cy,.024,.033,0,Math.PI*2,true);loop.holes.push(h);const lm=relief(loop,P.gold,.03,.002);lm.position.z=-.015;
    // Three attachment points hold a shallow bowl with a rolled, solid rim.
    for(const a of [Math.PI/2,Math.PI*7/6,Math.PI*11/6])path([[cx,cy-.035,0],[cx+Math.cos(a)*.315,1.055,Math.sin(a)*.315]],P.gold,.009);
    const bowl=mesh(new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.10,.008),new THREE.Vector2(.23,.055),new THREE.Vector2(.335,.13),new THREE.Vector2(.343,.15),new THREE.Vector2(.319,.16),new THREE.Vector2(.302,.135),new THREE.Vector2(.213,.079),new THREE.Vector2(.095,.032),new THREE.Vector2(0,.030)],28),P.gold);bowl.position.set(cx,.902,0);
    const rim=[];for(let i=0;i<=32;i++){const a=i*Math.PI/16;rim.push([cx+Math.cos(a)*.329,1.058,Math.sin(a)*.329]);}path(rim,P.goldShade,.011);
  }
  // Symbolic heart and carved feather, each resting inside one shallow pan.
  const heart=new THREE.Shape();heart.moveTo(0,-.12);heart.bezierCurveTo(-.25,.02,-.17,.25,-.035,.17);heart.bezierCurveTo(.01,.11,.0,.12,.035,.17);heart.bezierCurveTo(.18,.25,.24,.025,0,-.12);const hm=relief(heart,P.red,.095,.028);hm.position.set(-.86,1.085,-.04);hm.rotation.y=-.20;
  const feather=new THREE.Shape();feather.moveTo(-.025,0);feather.bezierCurveTo(-.13,.14,-.12,.44,.015,.68);feather.bezierCurveTo(.15,.53,.17,.21,.035,.07);feather.lineTo(.018,-.05);feather.closePath();const fm=relief(feather,P.linen,.025,.008);fm.position.set(.86,1.046,-.018);fm.rotation.z=-.23;
  path([[.855,1.023,.025],[.88,1.24,.025],[.953,1.55,.025],[1.012,1.69,.025]],P.goldShade,.009);
  for(let i=0;i<7;i++){const t=i/7,yy=1.15+t*.43,xx=.873+t*.102;path([[xx-.075,yy+.082,.031],[xx,yy,.034],[xx+.076,yy+.052,.031]],P.goldShade,.006);}
  return g;
}

export function addHorusRelief(parent,material,x,y,z,rotation){
  const g=new THREE.Group();g.name='Eye of Horus · carved and inlaid stele';g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);
  const {relief,outline,ellipse,path,block}=sculptor(g,material);
  block(4.3,3.1,.115,0,0,0,P.cut,.018);block(4.19,2.99,.065,0,0,.068,P.sand,.012);
  // A quiet field and shallow inlay give the eye a coherent stele composition.
  for(const yy of [-1.36,1.36]){const band=relief(outline([[-1.94,yy-.027],[1.94,yy-.027],[1.94,yy+.027],[-1.94,yy+.027]]),P.lapis,.010,.002);band.position.z=.108;}
  for(const xx of [-1.91,1.91]){const band=relief(outline([[xx-.021,-1.31],[xx+.021,-1.31],[xx+.021,1.31],[xx-.021,1.31]]),P.goldShade,.014,.003);band.position.z=.108;}
  const eye=new THREE.Shape();eye.moveTo(-1.48,.26);eye.bezierCurveTo(-.72,.90,.21,.95,1.38,.26);eye.bezierCurveTo(.44,-.28,-.72,-.37,-1.48,.26);
  const inner=new THREE.Path();inner.moveTo(-1.25,.26);inner.bezierCurveTo(-.57,-.18,.38,-.18,1.15,.27);inner.bezierCurveTo(.23,.80,-.61,.74,-1.25,.26);eye.holes.push(inner);const e=relief(eye,P.lapis,.019,.009);e.position.z=.119;
  const brow=new THREE.Shape();brow.moveTo(-1.47,.80);brow.bezierCurveTo(-.37,1.30,.69,1.01,1.45,.53);brow.lineTo(1.33,.75);brow.bezierCurveTo(.35,1.32,-.55,1.38,-1.5,.96);brow.closePath();const b=relief(brow,P.dark,.019,.009);b.position.z=.122;
  const iris=relief(ellipse(-.15,.28,.29,.32),P.goldShade,.017,.005);iris.position.z=.12;const pupil=relief(ellipse(-.15,.28,.20,.28),P.dark,.019,.005);pupil.position.z=.142;
  const tear=new THREE.Shape();tear.moveTo(-.46,-.12);tear.lineTo(-.38,-.77);tear.bezierCurveTo(-.34,-1.18,.28,-1.15,.40,-.81);tear.bezierCurveTo(.45,-.63,.25,-.59,.19,-.75);tear.bezierCurveTo(.14,-.91,-.18,-.98,-.22,-.75);tear.lineTo(-.27,-.13);tear.closePath();const t=relief(tear,P.lapis,.020,.008);t.position.z=.124;
  const cheek=new THREE.Shape();cheek.moveTo(1.13,.10);cheek.bezierCurveTo(.80,-.04,.48,-.45,.38,-.63);cheek.lineTo(.56,-.54);cheek.bezierCurveTo(.75,-.26,1.1,-.01,1.37,.18);cheek.closePath();const c=relief(cheek,P.lapis,.02,.007);c.position.z=.124;
  // Compact original offering signs in two aligned side registers.
  for(const side of [-1,1]){
    const sx=side*1.69;
    for(const yy of [-.92,-.35,.24,.84]){
      if(yy===.84){const loop=new THREE.Shape();loop.absellipse(sx,yy+.06,.063,.088,0,Math.PI*2,false);const hole=new THREE.Path();hole.absellipse(sx,yy+.06,.035,.054,0,Math.PI*2,true);loop.holes.push(hole);const o=relief(loop,P.cut,.009,.001);o.position.z=.112;path([[sx,yy,.128],[sx,yy-.17,.128]],P.cut,.012);path([[sx-.076,yy-.045,.128],[sx+.076,yy-.045,.128]],P.cut,.012);}
      else if(yy===-.35){for(let j=0;j<3;j++)path([[sx-.10,yy+j*.066,.126],[sx-.035,yy+.032+j*.066,.126],[sx+.035,yy+j*.066,.126],[sx+.10,yy+.032+j*.066,.126]],P.cut,.008);}
      else {const sign=relief(outline([[sx-.085,yy-.10],[sx+.085,yy-.10],[sx+.057,yy+.10],[sx-.057,yy+.10]]),P.cut,.010,.001);sign.position.z=.113;path([[sx-.095,yy-.13,.127],[sx+.095,yy-.13,.127]],P.goldShade,.009);}
    }
  }
  for(let i=0;i<13;i++){const xx=-1.4+i*.233;path([[xx,-1.17,.123],[xx+(i%3-1)*.016,-1.26,.123]],i%3===0?P.red:P.goldShade,.010);}
  return g;
}
