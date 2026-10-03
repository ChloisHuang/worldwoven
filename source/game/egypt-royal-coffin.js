import * as THREE from 'three';

// Original funerary carving, made for this tomb rather than a museum replica.
// Both objects fit the existing contact volumes; only their visible surfaces change.
const P={stone:0x866039,edge:0xc9a774,gold:0xd6ad5c,shade:0x9f773e,cut:0x73502f,
  lapis:0x214e62,blue:0x33778b,red:0x994b3c,linen:0xdac7a0,fold:0xb8a37c,light:0xe6d5b1,ink:0x24353c};

function tools(parent,material){
  const mesh=(geometry,color)=>{const m=new THREE.Mesh(geometry,material(color));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const relief=(shape,color,depth=.035,bevel=.008)=>mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:20}),color);
  const outline=points=>{const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return s;};
  const path=(points,color,r=.012)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(10,points.length*3),r,6,false),color);
  const loft=(rings,color,axis='y',segments=32)=>{
    const p=[],ix=[];for(const [t,rx,rz,cx=0,cz=0]of rings)for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,u=cx+Math.cos(a)*rx,v=cz+Math.sin(a)*rz;p.push(...(axis==='y'?[u,t,v]:[u,v,t]));}
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments,c=b+segments,d=a+segments;if(axis==='y')ix.push(a,c,b,a,d,c);else ix.push(a,b,c,a,c,d);}
    for(const [j,last]of [[0,false],[rings.length-1,true]]){const[t,,,cx=0,cz=0]=rings[j],n=p.length/3;p.push(...(axis==='y'?[cx,t,cz]:[cx,cz,t]));for(let i=0;i<segments;i++){const a=j*segments+i,b=j*segments+(i+1)%segments;if(last===(axis==='z'))ix.push(n,a,b);else ix.push(n,b,a);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();return mesh(geo,color);
  };
  return {mesh,relief,outline,path,loft};
}

function caseOutline(scale=1){
  const s=new THREE.Shape();
  s.moveTo(-.45,-1.66);s.quadraticCurveTo(-.58,-1.63,-.60,-1.40);
  s.bezierCurveTo(-.65,-.65,-.83,-.03,-.88,.55);
  s.bezierCurveTo(-.91,.85,-.78,1.09,-.68,1.22);
  s.bezierCurveTo(-.66,1.62,-.42,1.72,0,1.72);
  s.bezierCurveTo(.42,1.72,.66,1.62,.68,1.22);
  s.bezierCurveTo(.78,1.09,.91,.85,.88,.55);
  s.bezierCurveTo(.83,-.03,.65,-.65,.60,-1.40);
  s.quadraticCurveTo(.58,-1.63,.45,-1.66);s.quadraticCurveTo(0,-1.73,-.45,-1.66);
  if(scale===1)return s;
  const q=new THREE.Shape(s.getPoints(18).map(p=>p.multiplyScalar(scale)));return q;
}

function lidOutline(scale=1){
  const s=new THREE.Shape();s.moveTo(-.32,-.70);
  s.quadraticCurveTo(-.43,-.69,-.44,-.56);s.bezierCurveTo(-.43,-.17,-.47,.30,-.63,.72);
  s.quadraticCurveTo(-.74,.96,-.64,1.19);s.lineTo(-.55,1.38);
  s.bezierCurveTo(-.55,1.78,-.43,2.0,0,2.02);
  s.bezierCurveTo(.43,2,.55,1.78,.55,1.38);s.lineTo(.64,1.19);
  s.quadraticCurveTo(.74,.96,.63,.72);s.bezierCurveTo(.47,.30,.43,-.17,.44,-.56);
  s.quadraticCurveTo(.43,-.69,.32,-.70);s.quadraticCurveTo(0,-.74,-.32,-.70);
  if(scale===1)return s;
  return new THREE.Shape(s.getPoints(18).map(p=>new THREE.Vector2(p.x*scale,(p.y-.64)*scale+.64)));
}

export function addRoyalCoffin(parent,material,x,y,z){
  const g=new THREE.Group();g.name='Royal sarcophagus · carved case and linen';g.position.set(x,y,z);parent.add(g);
  const {mesh,relief,outline,path,loft}=tools(g,material);
  const horizontal=(shape,color,bottom,height,bevel=.018)=>{const m=relief(shape,color,height,bevel);m.rotation.x=-Math.PI/2;m.position.y=bottom;return m;};
  const base=(w,d,r)=>outline([[-w/2+r,-d/2],[w/2-r,-d/2],[w/2,-d/2+r],[w/2,d/2-r],[w/2-r,d/2],[-w/2+r,d/2],[-w/2,d/2-r],[-w/2,-d/2+r]]);
  horizontal(base(2.44,4.04,.16),P.stone,.03,.27,.025);
  horizontal(base(2.08,3.65,.15),P.edge,.32,.13,.022);
  horizontal(caseOutline(.99),P.shade,.47,.10,.018);
  // One shaped hollow shell, then two continuous inset rim profiles.
  for(const [outer,inner,bottom,height,color,bevel]of [[1,.82,.55,.49,P.gold,.018],[1.025,.80,1.035,.054,P.shade,.009],[1.00,.82,1.091,.022,P.gold,.008],[.87,.815,1.041,.027,P.lapis,.004]]){
    const s=caseOutline(outer),hole=new THREE.Path(caseOutline(inner).getPoints(20).reverse());s.holes.push(hole);horizontal(s,color,bottom,height,bevel);
  }
  horizontal(caseOutline(.814),P.lapis,.558,.025,.005);
  // Incised side registers conform to the casing, with broad, quiet inlays.
  const contours=caseOutline(.998).getPoints(30);
  for(const yy of [.66,.92])path([...contours.map(p=>[p.x,yy,-p.y]),[contours[0].x,yy,-contours[0].y]],P.shade,.012);
  for(const side of [-1,1])for(const [zz,xx]of [[-1.05,.76],[-.50,.87],[.1,.80],[.68,.68],[1.22,.60]]){
    const q=new THREE.Group();q.position.set(side*xx,.79,zz);q.rotation.y=side*Math.PI/2;g.add(q);
    const a=tools(q,material),s=new THREE.Shape();s.absellipse(0,0,.080,.115,0,Math.PI*2,false);
    const field=a.relief(s,P.lapis,.013,.005);field.position.z=.012;
    a.path([[0,.065,.037],[0,-.064,.037]],P.gold,.010);a.path([[-.038,.006,.037],[.038,.006,.037]],P.gold,.009);
  }
  // A fully covered mummy: a connected head/neck/shoulder/leg silhouette.
  // Bands follow its round section and diagonal tension instead of floating bars.
  const body=[[-1.46,.03,.045,0,.855],[-1.38,.20,.14,0,.885],[-1.20,.265,.187,0,.889],[-1.02,.247,.185,0,.889],[-.84,.15,.133,0,.864],[-.71,.19,.13,0,.854],[-.57,.37,.172,0,.86],[-.39,.405,.18,0,.866],[-.12,.37,.174,0,.853],[.15,.325,.157,0,.844],[.50,.28,.143,0,.827],[.82,.238,.139,0,.815],[1.06,.21,.136,0,.813],[1.25,.23,.129,0,.82],[1.37,.17,.09,0,.82],[1.42,.02,.02,0,.82]];
  loft(body,P.linen,'z',40);
  const section=t=>{const j=Math.max(0,Math.min(body.length-2,body.findIndex((r,i)=>i<body.length-1&&t>=r[0]&&t<=body[i+1][0]))),a=body[j],b=body[j+1],f=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));return a.map((v,i)=>v+(b[i]-v)*f);};
  for(let k=0;k<24;k++){
    const center=-1.35+k*.116,width=k<5?.065:.071,positions=[],indices=[];
    for(const edge of [-1,1])for(let i=0;i<=40;i++){
      const a=i*Math.PI/20,t=center+edge*width/2+Math.cos(a)*.030*Math.sin(k*.85),[,rx,ry,,cy]=section(t),raised=.007+Math.sin(i*Math.PI/40)*.001;
      positions.push(Math.cos(a)*(rx+raised),cy+Math.sin(a)*(ry+raised),t);
    }
    for(let i=0;i<40;i++)indices.push(i,i+1,i+42,i,i+42,i+41);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();mesh(geo,k%4===0?P.fold:P.light);
  }
  for(const side of [-1,1]){
    const points=[[side*.30,1.036,-.56],[side*.30,1.085,-.25],[side*.13,1.095,-.16],[-side*.16,1.095,-.42]];
    path(points,P.linen,.055);
    for(let i=0;i<5;i++){const t=i/5,xx=side*(.24-t*.30),zz=-.20-t*.14;path([[xx-.022,1.142,zz-.023],[xx,1.153,zz],[xx+.025,1.141,zz+.021]],P.fold,.007);}
  }
  // Narrow funerary chest band lies on top of the linen without exposed skin.
  const amulet=horizontal(outline([[-.055,.55],[.055,.55],[.076,.42],[0,.35],[-.076,.42]]),P.gold,1.151,.016,.004);
  amulet.name='Wrapped mummy · small protective pectoral';

  const lid=new THREE.Group();lid.name='Royal anthropoid lid · nemes and winged scarab';lid.position.set(x+3.5,y+.75,z-.5);lid.rotation.z=.13;lid.rotation.x=-.36;parent.add(lid);
  const a=tools(lid,material);
  const backing=a.relief(lidOutline(),P.shade,.13,.024);backing.position.z=-.10;
  const rim=a.relief(lidOutline(.95),P.gold,.08,.017);rim.position.z=.049;
  const field=a.relief(lidOutline(.875),P.lapis,.035,.010);field.position.z=.151;
  // Continuous shaped gilded torso, narrowing naturally into the wrapped feet.
  a.loft([[-.62,.30,.055,0,.18],[-.52,.345,.09,0,.17],[-.29,.325,.103,0,.17],[.09,.36,.115,0,.17],[.40,.425,.13,0,.17],[.67,.535,.13,0,.17],[.88,.57,.105,0,.17],[1.04,.39,.065,0,.17]],P.gold);
  // The royal nemes is one shaped textile field behind the carved mask.
  const nemes=new THREE.Shape();nemes.moveTo(-.28,1.84);nemes.bezierCurveTo(-.50,1.82,-.54,1.57,-.49,1.37);nemes.bezierCurveTo(-.53,1.17,-.56,.91,-.49,.79);nemes.lineTo(-.285,.79);nemes.lineTo(-.21,1.23);nemes.lineTo(.21,1.23);nemes.lineTo(.285,.79);nemes.lineTo(.49,.79);nemes.bezierCurveTo(.56,.91,.53,1.17,.49,1.37);nemes.bezierCurveTo(.54,1.57,.50,1.82,.28,1.84);nemes.quadraticCurveTo(0,2.0,-.28,1.84);
  const nm=a.relief(nemes,P.lapis,.076,.019);nm.position.z=.194;
  // Gold bands are fitted ribbons inside the silhouette, not separate bars.
  for(const side of [-1,1])for(let j=0;j<9;j++){
    const yy=.85+j*.109,outer=.495-Math.max(0,yy-1.42)*.12,inner=yy<1.23?.285-(yy-.85)*.14:.23;
    const s=a.outline([[side*inner,yy],[side*outer,yy-.012],[side*(outer+.004),yy+.031],[side*(inner-.004),yy+.040]]),b=a.relief(s,P.gold,.012,.002);b.position.z=.298;
  }
  a.path([[-.29,1.84,.308],[0,1.927,.31],[.29,1.84,.308]],P.gold,.025);
  // Gilded mask: brow, cheek, jaw and chin have their own sculpted planes.
  a.loft([[1.095,.075,.035,0,.29],[1.13,.145,.074,0,.30],[1.21,.208,.096,0,.30],[1.36,.248,.107,0,.30],[1.53,.256,.101,0,.30],[1.68,.235,.080,0,.30],[1.765,.184,.055,0,.30],[1.79,.05,.02,0,.30]],P.gold);
  for(const side of [-1,1]){
    const eye=new THREE.Shape();eye.moveTo(-.088,0);eye.quadraticCurveTo(-.01,.035,.087,.006);eye.quadraticCurveTo(0,-.036,-.088,0);
    const e=a.relief(eye,P.ink,.009,.003);e.position.set(side*.127,1.51,.407);e.rotation.y=side*.18;e.rotation.z=side*.045;
    a.path([[side*.043,1.587,.404],[side*.127,1.613,.404],[side*.221,1.577,.382]],P.lapis,.013);
    a.path([[side*.198,1.503,.399],[side*.247,1.481,.36]],P.lapis,.010);
  }
  // A tapered bridge and nostril plane, closed lips and traditional false beard.
  a.loft([[1.345,.048,.028,0,.405],[1.37,.057,.05,0,.411],[1.43,.035,.047,0,.409],[1.55,.021,.018,0,.398]],P.gold,'y',12);
  a.path([[-.070,1.276,.394],[-.031,1.283,.407],[0,1.278,.412],[.03,1.283,.407],[.070,1.276,.394]],P.cut,.009);
  a.path([[-.054,1.251,.39],[0,1.245,.405],[.054,1.251,.39]],P.shade,.008);
  a.loft([[.91,.040,.033,0,.337],[1.02,.047,.035,0,.365],[1.14,.055,.031,0,.366]],P.lapis,'y',16);
  for(const yy of [.943,.987,1.03,1.073])a.path([[-.037,yy,.387],[0,yy+.009,.402],[.037,yy,.387]],P.gold,.009);
  // Small upright cobra on the crown, folded inside the existing lid envelope.
  const cobra=new THREE.Shape();cobra.moveTo(-.024,1.72);cobra.lineTo(-.031,1.82);cobra.bezierCurveTo(-.095,1.88,-.059,1.972,0,1.977);cobra.bezierCurveTo(.059,1.972,.095,1.88,.031,1.82);cobra.lineTo(.024,1.72);cobra.closePath();const cm=a.relief(cobra,P.gold,.039,.007);cm.position.z=.316;
  a.path([[0,1.77,.369],[0,1.87,.375],[0,1.941,.372]],P.lapis,.009);
  // Broad curved collar, repeated fan-shaped inlays and crossed royal regalia.
  for(const [rx,ry,cy,color,r]of [[.50,.24,1.055,P.shade,.05],[.455,.19,1.047,P.lapis,.028],[.375,.125,1.04,P.red,.023],[.292,.065,1.039,P.lapis,.021]]){
    const p=[];for(let i=0;i<=28;i++){const t=Math.PI+i*Math.PI/28;p.push([Math.cos(t)*rx,cy+Math.sin(t)*ry,.326]);}a.path(p,color,r);
  }
  for(let i=1;i<16;i++){const t=Math.PI+i*Math.PI/16;a.path([[Math.cos(t)*.29,1.039+Math.sin(t)*.067,.355],[Math.cos(t)*.49,1.05+Math.sin(t)*.234,.355]],P.gold,.007);}
  for(const side of [-1,1])a.path([[side*.44,.68,.304],[side*.29,.50,.338],[-side*.18,.70,.358]],P.shade,.062);
  a.path([[-.31,.31,.363],[.23,.83,.363],[.29,.88,.36],[.34,.85,.35],[.32,.77,.351]],P.lapis,.026);
  a.path([[.31,.31,.369],[-.20,.80,.373]],P.lapis,.027);
  for(let i=0;i<3;i++)a.path([[-.20,.80,.373],[-.29-i*.026,.63-i*.020,.383]],P.gold,.015);
  // A winged scarab is carved into the lower field, with inset feather fans.
  for(const side of [-1,1]){
    const wing=new THREE.Shape();wing.moveTo(side*.07,.16);wing.bezierCurveTo(side*.18,.20,side*.32,.30,side*.35,.35);wing.bezierCurveTo(side*.38,.13,side*.27,-.01,side*.08,-.03);wing.closePath();const w=a.relief(wing,P.lapis,.02,.006);w.position.z=.292;
    for(let j=0;j<5;j++){const t=j/5;a.path([[side*.10,.055+t*.02,.323],[side*(.20+t*.12),.019+t*.055,.32]],P.gold,.007);}
  }
  a.loft([[-.01,.035,.020,0,.315],[.04,.082,.038,0,.316],[.13,.075,.039,0,.316],[.18,.035,.020,0,.312]],P.lapis,'y',20);a.path([[0,.015,.359],[0,.154,.359]],P.gold,.007);
  // Three quiet vertical lines evoke carved text registers below the emblem.
  for(const sx of [-.17,0,.17]){a.path([[sx,-.12,.30],[sx,-.48,.28]],P.shade,.011);for(const yy of[-.19,-.29,-.39])a.path([[sx-.041,yy,.299],[sx+.041,yy,.299]],P.lapis,.012);}
  a.path([[-.285,-.54,.276],[0,-.567,.29],[.285,-.54,.276]],P.lapis,.022);
  return {case:g,lid};
}
