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
