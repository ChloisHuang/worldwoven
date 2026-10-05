// An original game service in the public entry court. This is fictional ticket
// exchange, not a reconstruction of an ancient Egyptian banking institution.
export const EGYPT_EXCHANGE_COUNTER=Object.freeze({
 id:'egypt-exchange-counter',name:'沙海票券存取与兑换',floorY:0,
 stationId:'egypt-exchange-teller',defaultCurrency:'egypt',exchangeTo:'copper',tellerYaw:Math.PI,
 points:{counter:[3.9,0,7.65],teller:[3.9,0,9.72],ledger:[3.6,1.16,9.03],counting:[4.4,1.16,9.03]},
 role:{id:'egypt-exchange-teller',npcName:'奈赫特 · 票券出纳',ageYears:41},
 countingLabel:'清点票券 · 核对收支',approachMessage:'请走到入口前庭的票券柜台前，再办理存取与兑换',
});

export function egyptExchangeStation(){const c=EGYPT_EXCHANGE_COUNTER;return {...c.role,name:c.name,action:'办理票券存取、兑换与查账',position:c.points.counter,npcPosition:c.points.teller,npcAction:'money-house-duty',npcRotation:c.tellerYaw,npcLabel:'核对纸莎草账簿 · 清点票券',color:'#c19a5e',interactionRadius:1.4,priority:30,dialogue:'这里是幻想沙海里的游戏票券柜台。四地共用同一本账，可取出埃及券，也可以先看报价，再兑换其他游戏币种。'};}

export function egyptExchangeAppearance(region,id,look){return region==='egypt'&&id===EGYPT_EXCHANGE_COUNTER.stationId?{...look,bodyPreset:'masculine-lean',hairStyle:'side-part',wardrobePreset:'linen-tunic-kilt',clothes:0xe3d2a7,accent:0x267783}:look;}

// Solid original strokes spell the player's localized “兑换” sign. They remain
// legible without a downloaded font, canvas texture or historically false script.
const SIGN_STROKES=[
 [[.23,.97],[.34,.80]],[[.70,.98],[.59,.80]],[[.18,.75],[.18,.43],[.77,.43],[.77,.75],[.18,.75]],[[.39,.43],[.35,.19],[.14,.05]],[[.59,.43],[.59,.08],[.83,.08],[.86,.23]],
 [[1.05,.69],[1.39,.69]],[[1.21,.96],[1.21,.11],[1.11,.05]],[[1.04,.39],[1.38,.53]],[[1.51,.98],[1.39,.78]],[[1.45,.86],[1.76,.86],[1.62,.65]],[[1.42,.30],[1.42,.65],[1.87,.65],[1.87,.30]],[[1.64,.65],[1.64,.33],[1.52,.13],[1.36,.04]],[[1.35,.31],[1.94,.31]],[[1.66,.30],[1.79,.11],[1.96,.04]],
];

export function buildEgyptExchangeCounter(G,{group,colliders,cameraColliders}){
 const {THREE}=G,c=EGYPT_EXCHANGE_COUNTER,q=new THREE.Group();q.name='Public court fictional ticket exchange';group.add(q);
 const sand=0xcaa36c,edge=0xe6c58a,wood=0x785735,blue=0x267783,ink=0x193b44,papyrus=0xe6d3a4;
 const box=(name,x,y,z,w,h,d,color,solid=false)=>{const m=G.box(q,x,y,z,w,h,d,color);m.name=name;if(solid)for(const a of[colliders,cameraColliders])a.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});return m;};
 // The west side is the staff entrance. The existing central passage, thick
 // pyramid portal, reception desk and east column remain clear.
 box('Sandstone counting counter',3.9,.50,8.83,2.48,1,.64,sand,true);
 box('Counter limestone worktop',3.9,1.055,8.83,2.64,.11,.80,edge);
 box('Joined timber staff return',5.13,.50,9.73,.16,1,1.82,wood,true);
 box('Return top rail',5.13,1.055,9.73,.23,.11,1.9,edge);
 for(const x of[2.77,5.03])box('Counter painted upright',x,.51,8.497,.085,.91,.035,blue);
 for(const y of[.12,.87])box('Counter painted band',3.9,y,8.49,2.21,.055,.05,blue);
 box('Wood counting-front inset',3.9,.49,8.485,1.9,.57,.05,wood);
 // Opposed arrows and two voucher faces communicate exchange from afar.
 for(const x of[3.38,4.43]){box('Carved game voucher',x,.49,8.45,.42,.26,.025,papyrus);box('Voucher blue seal',x,.49,8.432,.09,.13,.015,blue);}
 for(const [y,dir]of[[.58,1],[.39,-1]]){
  box('Exchange arrow shaft',3.91,y,8.43,.44,.035,.02,edge);
  for(const up of[-1,1]){const m=box('Exchange arrowhead',3.91+dir*.17,y+up*.043,8.43,.13,.035,.02,edge);m.rotation.z=-dir*up*.75;}
 }
 box('Shallow papyrus cabinet',3.91,.84,10.75,2.38,1.68,.36,wood,true);
 for(const y of[.13,.72,1.40,1.72])box('Cabinet shelf edge',3.91,y,10.525,2.46,.08,.12,edge);
 for(const x of[2.78,5.04])box('Cabinet joint post',x,.89,10.50,.10,1.72,.14,blue);
 for(let i=0;i<6;i++){
  const roll=G.cyl(q,3.05+i*.34,1.06,10.47,.105,.105,.58,papyrus,10);roll.name='Stored papyrus account scroll';
  G.cyl(q,3.05+i*.34,1.08,10.47,.11,.11,.045,blue,10);
 }
 box('Joined exchange sign board',3.91,2.04,10.68,2.48,.57,.16,blue);
 for(const y of[1.755,2.325])box('Sign sandstone border',3.91,y,10.575,2.57,.045,.06,edge);
 for(const x of[2.645,5.175])box('Sign sandstone border',x,2.04,10.575,.045,.61,.06,edge);
 const sign=new THREE.Group();sign.name='兑换 · fictional game ticket exchange';sign.position.set(4.32,1.835,10.575);sign.rotation.y=Math.PI;q.add(sign);
 for(const stroke of SIGN_STROKES)for(let i=1;i<stroke.length;i++){
  const a=stroke[i-1],b=stroke[i],s=.42,dx=(b[0]-a[0])*s,dy=(b[1]-a[1])*s;
  const m=G.box(sign,(a[0]+b[0])*s/2,(a[1]+b[1])*s/2,0,Math.hypot(dx,dy)+.018,.024,.022,papyrus);m.rotation.z=Math.atan2(dy,dx);
 }
 // A bound writing roll and a tray of existing game tickets sit on the desk.
 box('Unrolled papyrus ledger',3.6,1.127,8.94,.62,.034,.40,papyrus);
 for(const x of[3.285,3.915]){const roll=G.cyl(q,x,1.155,8.94,.038,.038,.44,papyrus,10);roll.rotation.x=Math.PI/2;}
 for(let i=0;i<4;i++)box('Ink account line',3.6,1.147,8.80+i*.074,.43,.006,.013,ink);
 const pen=box('Reed writing pen',3.18,1.131,8.94,.022,.023,.33,wood);pen.rotation.y=-.25;
 box('Ticket counting tray',4.4,1.14,8.95,.49,.06,.40,wood);
 for(let i=0;i<3;i++){box('Stacked Egyptian game tickets',4.4,1.182+i*.012,8.95,.36,.012,.24,0xd6b76e);box('Ticket blue seal',4.4,1.191+i*.012,8.95,.11,.006,.13,blue);}
 return c;
}
