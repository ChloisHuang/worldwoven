import * as G from '/assets/geometry.accd26d9fe1820ba.js';
const {THREE}=G;
export function createCharacter({skin=0xdba783,hair=0x463328,clothes=0x5d93a8,accent=0xe7cab0,style='casual',culture=null,variant=0,scale=1}={}){
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);body.position.y=-.144;root.scale.setScalar(scale);
 G.sphere(body,0,1.18,0,.38,clothes,.94,culture==='japan'?1.12:1.28,.65);if(!['japan','china','egypt'].includes(culture)&&!(culture==='france'&&variant%2))G.cyl(body,0,.82,0,.28,.31,.2,0x334856);
 G.cyl(body,0,1.59,0,.1,.1,.18,skin);if(culture!=='japan')G.box(body,0,1.48,.238,.18,.09,.055,accent);
 const head=new THREE.Group();head.position.y=1.91;body.add(head);G.sphere(head,0,0,0,.32,skin,.86,1.06,.82);G.sphere(head,0,.14,-.04,.32,hair,.93,.69,.88);G.sphere(head,-.17,.16,.2,.14,hair,.9,.52,.7);G.sphere(head,.15,.19,.17,.14,hair,.95,.44,.63);
 for(const x of [-.105,.105]){G.sphere(head,x,.018,.252,.045,0xfff6e5,.8,1.1,.4);G.sphere(head,x,.016,.269,.025,0x343235,.7,1,.4);G.box(head,x,.09,.259,.075,.022,.03,hair);G.sphere(head,x*1.7,-.092,.2,.05,0xe2a18d,1,.5,.3);}
 G.sphere(head,0,-.035,.273,.046,skin,.7,1,.7);G.box(head,0,-.145,.251,.1,.018,.013,0xa96151);for(const x of [-.29,.29])G.sphere(head,x,0,0,.071,skin,.6,1,.7);
 if(style==='chef'){G.cyl(head,0,.36,0,.28,.28,.2,0xf6f0da);for(const x of [-.14,0,.14])G.sphere(head,x,.5,0,.19,0xf6f0da,1,.7,1);G.box(body,0,1.12,.239,.42,.65,.04,0xf3e2b9);G.box(body,0,.97,.268,.25,.14,.03,0xe2c990);}
 if(style==='artist'){if(culture==='france'||!culture){G.sphere(head,0,.31,-.015,.31,0xb26047,1.1,.36,1);G.cyl(head,.07,.44,0,.025,.025,.09,0x644537);}G.box(body,-.15,1.09,.23,.1,.18,.035,0xe3b759);G.box(body,.08,1.24,.24,.08,.12,.036,0x87aea4);}
 if(style==='gardener'){G.cyl(head,0,.29,0,.4,.4,.05,0xc5a578,20);G.cyl(head,0,.39,0,.22,.27,.2,0xc5a578,12);G.cyl(head,0,.34,0,.26,.26,.07,0x977254,12);}

 // Japan's wrapped yukata is articulated with the original body; all other clothing is unchanged.
 let kimonoSkirt=null;
 if(culture==='japan'){
  kimonoSkirt=new THREE.Group();kimonoSkirt.position.y=.64;body.add(kimonoSkirt);
  G.cyl(kimonoSkirt,0,0,0,.27,.35,.74,clothes,12);
  // The wearer's left front panel lies over the right, including at the crossed collar.
  G.box(kimonoSkirt,.055,.015,.282,.017,.66,.014,new THREE.Color(clothes).multiplyScalar(.86).getHex()).rotation.z=-.055;
  G.torus(kimonoSkirt,0,-.346,0,.344,.009,accent);
  const neckline=new THREE.Shape();neckline.moveTo(-.145,1.525);neckline.lineTo(.145,1.525);neckline.lineTo(0,1.295);neckline.closePath();G.mesh(body,new THREE.ShapeGeometry(neckline),0xe6d3b7,0,0,.264);
  const inner=G.box(body,.083,1.357,.267,.057,.39,.018,0xeee4cf);inner.rotation.z=-.54;
  const under=G.box(body,.101,1.354,.276,.026,.38,.018,accent);under.rotation.z=-.54;
  const over=G.box(body,-.067,1.356,.299,.066,.414,.021,0xf0e4cb);over.rotation.z=.54;
  const edge=G.box(body,-.096,1.356,.322,.015,.402,.012,accent);edge.rotation.z=.54;
  const obi=variant%2?0x9c5d5c:0x9c7854;
  G.cyl(body,0,1.038,0,.299,.313,.19,obi,12);G.box(body,0,1.038,.28,.58,.19,.085,obi);G.box(body,0,1.13,.253,.578,.014,.143,obi);
  G.box(body,0,1.045,.335,.58,.021,.022,variant%2?0x84a49b:0xe1c392);G.sphere(body,.095,1.045,.357,.035,accent,1,.8,.35);G.box(body,.118,.981,.349,.017,.098,.013,accent);
  G.box(body,0,1.034,-.245,.44,.18,.087,obi);
  for(const side of [-1,1])G.box(body,side*.106,1.067,-.319,.2,.2,.075,obi).rotation.z=side*.16;
  G.box(body,0,1.061,-.364,.105,.16,.055,accent);
  // Small geometric blossom/woven motifs, made from geometry rather than a texture.
  for(const [x,y,z,g] of [[.18,1.255,.243,body],[-.16,-.18,.276,kimonoSkirt],[.17,-.245,.277,kimonoSkirt]]){
   for(let i=0;i<4;i++){const a=i*Math.PI/2;G.sphere(g,x+Math.cos(a)*.022,y+Math.sin(a)*.022,z,.026,accent,1,.65,.19);}
   G.sphere(g,x,y,z+.005,.012,0xe5d2a8,1,1,.25);
  }
  if(variant%2){G.sphere(head,.16,.29,-.12,.16,hair,1,.9,1);for(let i=0;i<4;i++)G.sphere(head,.25+Math.cos(i*1.57)*.045,.31+Math.sin(i*1.57)*.045,0,.035,0xe8b3ad,.9,.9,.4);}
 }else if(culture==='china'){
  G.cyl(body,0,.64,0,.27,.35,.68,clothes,12);
  G.box(body,0,1.05,.232,.57,.18,.08,culture==='japan'?0xa8685c:0xc7a256);
  const collarA=G.box(body,-.08,1.35,.258,.07,.38,.045,0xe8dec1);collarA.rotation.z=.54;
  const collarB=G.box(body,.09,1.34,.264,.065,.39,.047,culture==='japan'?0xc89c7d:0xc9a759);collarB.rotation.z=-.53;
  if(culture==='japan')G.box(body,0,1.05,-.24,.3,.2,.15,0xa8685c);
  else{G.box(body,.1,.89,.26,.07,.23,.035,0xc9a759);G.sphere(head,0,.37,-.04,.15,hair,1,.9,1);G.box(head,0,.39,0,.39,.028,.027,0xc4aa68);G.sphere(head,.22,.39,0,.035,0x85ab9c);}
  if(culture==='japan'&&variant%2){G.sphere(head,.16,.29,-.12,.16,hair,1,.9,1);for(let i=0;i<4;i++)G.sphere(head,.25+Math.cos(i*1.57)*.045,.31+Math.sin(i*1.57)*.045,0,.035,0xe8b3ad,.9,.9,.4);}
 }else if(culture==='egypt'){
  G.cyl(body,0,.67,0,.29,.34,.63,0xe7d8af,12);G.box(body,0,1.0,.24,.57,.12,.08,0xc3a14d);
  for(let row=0;row<3;row++){const y=1.48-row*.065;G.box(body,0,y,.245+row*.016,.32+row*.11,.045,.047,row%2?0xb99a49:0x528a9a);}
  G.box(body,0,.77,.31,.22,.37,.04,0xc5ab58);G.box(body,0,.77,.335,.09,.32,.018,0x4d899a);
 }else if(culture==='france'){
  if(variant%2){G.cyl(body,0,.62,0,.23,.46,.75,clothes,16);G.box(body,0,1.05,.24,.5,.08,.06,0x725e56);}
  else{G.box(body,0,1.25,.247,.29,.48,.05,0xb6a27c);for(const y of [1.1,1.23,1.36])G.sphere(body,.05,y,.28,.016,0x755d45);}
  for(const side of [-1,1])G.box(body,side*.07,1.45,.259,.12,.16,.027,0xe8dec3).rotation.z=side*.4;
 }
 const arms=[],forearms=[],hands=[],legs=[];
 for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.34,1.43,0);body.add(arm);G.sphere(arm,0,-.13,0,.12,clothes,.93,1.4,.92);if(culture==='japan'){
 const sleeveShape=new THREE.Shape();sleeveShape.moveTo(-.094,-.06);sleeveShape.quadraticCurveTo(0,-.008,.094,-.06);sleeveShape.lineTo(.135,-.278);sleeveShape.quadraticCurveTo(.145,-.322,.096,-.327);sleeveShape.lineTo(-.096,-.327);sleeveShape.quadraticCurveTo(-.145,-.322,-.135,-.278);sleeveShape.closePath();
 G.mesh(arm,new THREE.ExtrudeGeometry(sleeveShape,{depth:.208,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.023,bevelThickness:.022,curveSegments:3}),clothes,0,0,-.104);
 G.box(arm,0,-.311,.009,.265,.014,.229,accent);
 G.box(arm,side*.079,-.179,.141,.029,.084,.014,accent).rotation.z=side*.5;
 }else if(culture==='china'){G.cyl(arm,0,-.19,0,.13,.18,.27,clothes,10);G.cyl(arm,0,-.31,0,.18,.18,.04,0xe2caa0,10);}if(culture==='france'&&variant%2)G.sphere(arm,0,-.06,0,.16,clothes,1,1.1,1);const elbow=new THREE.Group();elbow.position.y=-.25;arm.add(elbow);G.sphere(elbow,0,-.09,0,.082,skin,1,1.35,1);const hand=new THREE.Group();hand.position.set(0,-.22,0);elbow.add(hand);G.sphere(hand,0,0,0,.078,skin,.95,1.12,.75);G.sphere(hand,-side*.057,.01,.023,.036,skin,.7,1.2,.8);arms.push(arm);forearms.push(elbow);hands.push(hand);const leg=new THREE.Group();leg.position.set(side*.145,.84,0);body.add(leg);G.cyl(leg,0,-.28,0,.105,.085,.55,0x445a68,8);G.sphere(leg,0,-.61,.07,.12,0x433c39,1,.72,1.7);legs.push(leg);}
 const tools={},toolGroup=new THREE.Group();hands[1].add(toolGroup);const leftTools=new THREE.Group();hands[0].add(leftTools);
 function prop(name,left=false){const g=new THREE.Group();(left?leftTools:toolGroup).add(g);g.visible=false;tools[name]=g;return g;}
 let p=prop('brush');G.cyl(p,0,-.08,0,.018,.022,.33,0xa1774e,6);G.cone(p,0,-.28,0,.031,.09,0x4b3b2c,7).rotation.z=Math.PI;
 p=prop('knife');G.cyl(p,0,-.04,0,.027,.027,.16,0x765143,6);G.box(p,.065,-.19,0,.15,.19,.024,0xafc7c5);
 p=prop('cup');G.cyl(p,0,-.03,.04,.095,.08,.15,0xe7dbc2,14);G.cyl(p,0,.05,.04,.074,.074,.008,0x77654a,14);G.torus(p,.105,-.02,.04,.049,.016,0xe7dbc2,0);
 p=prop('book',true);G.box(p,.15,-.02,.04,.34,.06,.25,0x947763);G.box(p,.15,.017,.04,.3,.016,.22,0xf1dfbd);for(const x of [.045,.14,.235])G.box(p,x,.029,.04,.01,.006,.15,0xb5a481);p.rotation.z=-.35;
 p=prop('palette',true);G.sphere(p,0,0,.06,.16,0xc5a16d,1,.16,.75);for(let i=0;i<4;i++)G.sphere(p,(i-1.5)*.065,.035,.06,.027,[0xa24f41,0xe0c564,0x6c9b89,0x829eaf][i],1,.4,1);
 p=prop('can');G.cyl(p,0,-.12,0,.16,.14,.24,0x76a39b,10);G.torus(p,0,.02,0,.16,.026,0x5e847e,0);G.cyl(p,.19,-.04,0,.032,.045,.32,0x6c968d,8).rotation.z=-.8;G.cyl(p,.32,.06,0,.064,.05,.05,0x52796e,8).rotation.z=-.8;
 p=prop('feather');G.cyl(p,0,.09,0,.009,.009,.34,0xc5b686,6);for(let i=0;i<6;i++){const yy=.02+i*.045;for(const side of [-1,1]){const f=G.sphere(p,side*(.06-i*.005),yy,0,.052,0xf3e8c4,1.2,.48,.15);f.rotation.z=side*.42;}}
 p=prop('cloth',true);G.box(p,.1,-.02,0,.32,.075,.27,0xe1c7b0);G.box(p,.1,.02,.08,.32,.018,.035,0x929c85);
 // New station props are hidden outside their exact actions.
 p=prop('ramenBowl',true);p.position.set(0,.1,.075);G.cyl(p,0,-.04,.045,.148,.088,.14,0xe7dbc2,16);G.torus(p,0,.031,.045,.143,.016,0xb15d4b);G.cyl(p,0,.027,.045,.125,.125,.008,0xa66a38,16);
 for(let i=0;i<3;i++)G.torus(p,-.034+i*.031,.035,.045,.026,.008,0xe8c378);
 G.sphere(p,.055,.042,.069,.035,0xf4e5c2,1,.16,1);G.sphere(p,.055,.048,.069,.017,0xddaa4c,1,.2,1);
 p=prop('ladle');const ladleStem=G.cyl(p,-.08,-.042,.1075,.013,.013,.281,0x806046,7);ladleStem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-.16,-.084,.215).normalize());G.sphere(p,-.16,-.084,.215,.055,0x9eaaa6,1,.28,1);G.cyl(p,-.16,-.072,.215,.046,.037,.016,0xb1844d,10);
 p=prop('chopsticks');for(const x of [-.018,.018]){const stick=G.cyl(p,x-.06,-.05,.125,.008,.005,.294,0xb78c57,6);stick.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(-.12,-.10,.25).normalize());}
 p=prop('sushiPlate',true);p.position.set(0,.1,.075);G.cyl(p,0,-.025,.05,.165,.14,.025,0xe6dac0,16);G.torus(p,0,-.006,.05,.153,.011,0xa65e50);for(const x of [-.064,.064]){G.sphere(p,x,.027,.05,.059,0xf4e8cd,.77,.43,1.22);G.sphere(p,x,.052,.05,.063,0xd78369,.8,.20,1.24);}
 p=prop('bathBucket');G.cyl(p,0,-.22,0,.139,.109,.22,0xb89465,12);for(const y of [-.14,-.29])G.torus(p,0,y,0,.126,.011,0x78674d);G.torus(p,0,-.075,0,.108,.014,0x997647,0);
 p=prop('bathCloth',true);G.box(p,0,-.045,.055,.19,.024,.19,0xeadfc8);G.box(p,0,-.028,.055,.19,.008,.036,0x95a8a0);
 const seated=new THREE.Group();body.add(seated);seated.visible=false;
 // Folded legs and lap use a short silhouette, so no standing mesh can extend through the floor.
 for(const side of [-1,1]){G.sphere(seated,side*.158,.715,.195,.16,clothes,.93,.65,1.63);G.sphere(seated,side*.148,.675,-.17,.105,0xe7deca,.91,.57,1.3);}
 G.sphere(seated,0,.826,.135,.3,clothes,1.12,.33,1.06);
 const down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3(),pole=new THREE.Vector3(),elbowPoint=new THREE.Vector3(),wristPoint=new THREE.Vector3(),upperQ=new THREE.Quaternion(),lowerQ=new THREE.Quaternion();
 function reach(i,x,y,z){
  const shoulder=arms[i].position;wristPoint.set(x,y-body.position.y,z);direction.copy(wristPoint).sub(shoulder);
  const distance=Math.min(.468,Math.max(.035,direction.length()));direction.normalize();wristPoint.copy(shoulder).addScaledVector(direction,distance);
  const along=(.25*.25-.22*.22+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,.25*.25-along*along));
  pole.set(0,-1,0).addScaledVector(direction,direction.y);if(pole.lengthSq()<.001)pole.set(0,0,1);pole.normalize();
  elbowPoint.copy(shoulder).addScaledVector(direction,along).addScaledVector(pole,height);
  upperQ.setFromUnitVectors(down,direction.copy(elbowPoint).sub(shoulder).normalize());lowerQ.setFromUnitVectors(down,direction.copy(wristPoint).sub(elbowPoint).normalize());
  arms[i].quaternion.copy(upperQ);forearms[i].quaternion.copy(upperQ).invert().multiply(lowerQ);
  // Keep vessels upright independently of arm articulation.
  (i?toolGroup:leftTools).quaternion.copy(lowerQ).invert();
 }
 root.userData={body,head,arms,forearms,hands,legs,tools,seated,kimonoSkirt,garment:culture==='japan'?'wrapped-yukata':null,poseQA:null};

 function animate(time,walking=false,action=null){seated.visible=false;legs.forEach(l=>l.visible=true);if(kimonoSkirt){kimonoSkirt.position.set(0,.64,0);kimonoSkirt.scale.set(1,1,1);}root.userData.poseQA=null;const phase=Math.sin(time*2.7),sway=walking?Math.sin(time*8)*.58:0;for(const t of Object.values(tools))t.visible=false;legs[0].rotation.x=sway;legs[1].rotation.x=-sway;arms[0].rotation.set(-sway*.75,0,.04);arms[1].rotation.set(sway*.75,0,-.04);forearms[0].rotation.set(0,0,0);forearms[1].rotation.set(0,0,0);body.position.y=-.144+(walking?Math.abs(Math.sin(time*8))*.045:Math.sin(time*1.8)*.01);body.rotation.z=walking?Math.sin(time*4)*.025:0;body.rotation.x=0;head.rotation.set(0,walking?0:Math.sin(time*.7)*.08,0);toolGroup.rotation.set(0,0,0);leftTools.rotation.set(0,0,0);
 if(!action)return;head.rotation.x=.13;
 if(action==='kotatsu'){
  body.position.y=-.444;body.rotation.set(0,0,0);legs.forEach(l=>l.visible=false);seated.visible=true;
  if(kimonoSkirt){kimonoSkirt.position.set(0,.8,.065);kimonoSkirt.scale.set(1.06,.34,1.16);}
  const sip=Math.pow((Math.sin(time*.8)+1)*.5,3);
  reach(0,-.30,.748,.35);reach(1,.25,.844+sip*.346,.405-sip*.22);
  tools.cup.visible=true;head.rotation.x=.065-sip*.055;head.rotation.y=Math.sin(time*.35)*.035;
  root.userData.poseQA={action,seated:true,rootAtSurface:true,tableTop:.70,seatTop:.16,lapTop:.481,contact:'knees under quilt; cup above table',hands:[[-.30,.748,.35],[.25,.844+sip*.346,.405-sip*.22]]};return;
 }
 if(action==='sushi-eat'){
  body.position.y=-.144;body.rotation.set(0,0,0);const sip=Math.pow((Math.sin(time*.95)+1)*.5,2);
  reach(0,-.16,1.19,.32);reach(1,.08,1.40+sip*.07,.25-sip*.15);
  tools.sushiPlate.visible=true;tools.chopsticks.visible=true;toolGroup.rotation.x-=sip;head.rotation.x=.16-sip*.12;
  root.userData.poseQA={action,seated:false,rootAtSurface:true,workTop:1.17,contact:'held nigiri plate and tasting chopsticks',hands:[[-.16,1.19,.32],[.08,1.40+sip*.07,.25-sip*.15]]};return;
 }
 if(action==='ramen'){
  body.position.y=-.144;body.rotation.set(0,0,0);const serve=(Math.sin(time*1.15)+1)*.5,stir=Math.sin(time*2.3);
  reach(0,-.16,1.07+serve*.065,.32-serve*.035);reach(1,.07-serve*.07,1.27+serve*.10,.26-serve*.025);
  tools.ramenBowl.visible=true;if(serve<.83){tools.ladle.visible=true;toolGroup.rotation.z+=-.12+stir*.08;}else{tools.chopsticks.visible=true;toolGroup.rotation.z-=.24;}
  head.rotation.x=.12+serve*.035;head.rotation.y=-serve*.08;
  root.userData.poseQA={action,seated:false,rootAtSurface:true,workTop:1,contact:'upright bowl and ladle/chopsticks',hands:[[-.16,1.07+serve*.065,.32-serve*.035],[.07-serve*.07,1.27+serve*.10,.26-serve*.025]]};return;
 }
 if(action==='bath-attendant'){
  body.position.y=-.144;body.rotation.set(0,0,0);const sweep=Math.sin(time*1.45);
  reach(0,-.29+sweep*.055,.89,.17+sweep*.025);reach(1,.34,1.0,.24);
  tools.bathCloth.visible=true;tools.bathBucket.visible=true;head.rotation.x=.22;
  root.userData.poseQA={action,seated:false,rootAtSurface:true,workTop:.80,contact:'cloth above wash shelf; carried bucket',hands:[[-.29+sweep*.055,.89,.17+sweep*.025],[.34,1,.24]]};return;
 }

 if(/relax/.test(action)){arms[0].rotation.x=-.15;arms[1].rotation.x=-.15;forearms[0].rotation.x=-.25;forearms[1].rotation.x=-.25;head.rotation.x=-.045+Math.sin(time*.6)*.025;return;}
 if(/ritual/.test(action)){arms[0].rotation.x=-1.2;arms[1].rotation.x=-1.28+Math.sin(time*.7)*.06;forearms[0].rotation.x=-.25;forearms[1].rotation.x=-.26;tools.feather.visible=true;toolGroup.rotation.x=-(arms[1].rotation.x+forearms[1].rotation.x);head.rotation.x=.18;return;}
 if(/knead/.test(action)){arms[0].rotation.x=-1.12+Math.sin(time*3.4)*.18;arms[1].rotation.x=-1.12+Math.sin(time*3.4+.8)*.18;arms[0].rotation.z=-.12;arms[1].rotation.z=.12;forearms.forEach(a=>a.rotation.x=-.2);body.rotation.x=Math.sin(time*3.4)*.025;}
 else if(/cook|sushi|bake/.test(action)){arms[0].rotation.x=-1.12;arms[1].rotation.x=-1.03+Math.sin(time*5)*.21;forearms[0].rotation.x=-.16;forearms[1].rotation.x=-.25+Math.sin(time*5)*.14;tools.knife.visible=true;}
 else if(/paint|calligraphy|craft/.test(action)){const calligraphy=/calligraphy/.test(action);arms[0].rotation.x=-1.0;arms[1].rotation.x=(calligraphy?-1.14:-1.66)+Math.sin(time*1.4)*.09;arms[1].rotation.z=Math.sin(time*1.2)*.12;forearms[1].rotation.x=-.25+Math.cos(time*2.1)*.09;tools.brush.visible=true;toolGroup.rotation.x=.25;if(!calligraphy){tools.palette.visible=true;leftTools.rotation.x=-(arms[0].rotation.x+forearms[0].rotation.x)-.2;}}
 else if(/tea/.test(action)){const sip=(Math.sin(time*.9)+1)*.5;arms[1].rotation.x=-1.05-sip*.68;forearms[1].rotation.x=-.35-sip*.5;arms[0].rotation.x=-.75;tools.cup.visible=true;toolGroup.rotation.x=-(arms[1].rotation.x+forearms[1].rotation.x)-sip*.12;head.rotation.x=-sip*.05;}
 else if(/read|rest/.test(action)){arms[0].rotation.x=-1.22;arms[1].rotation.x=-1.2;arms[0].rotation.z=-.18;arms[1].rotation.z=.2;forearms[0].rotation.x=-.35;forearms[1].rotation.x=-.4;tools.book.visible=true;head.rotation.x=.27+Math.sin(time*.6)*.025;}
 else if(/garden/.test(action)){arms[1].rotation.x=-.95;forearms[1].rotation.x=-.15;arms[1].rotation.z=.2+Math.sin(time*1.3)*.13;tools.can.visible=true;toolGroup.rotation.z=-.55;head.rotation.x=.18;}
 else {arms[0].rotation.x=-1.05+phase*.12;arms[1].rotation.x=-1.02-phase*.12;tools.cloth.visible=true;head.rotation.x=.2;}
 }
 return {root,animate};
}
