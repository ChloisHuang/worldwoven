// A fictional local exchange desk in Kasumi-yu's existing public reception.
// Its tickets, rates, account and receipts belong to the shared game ledger.
export const JAPAN_EXCHANGE_COUNTER=Object.freeze({
 id:'japan-exchange-counter',name:'霞汤屋 · 両替柜台',floorY:0,
 stationId:'jp-exchange-teller',defaultCurrency:'japan',exchangeTo:'copper',tellerYaw:Math.PI,
 // Explicit shift waiting point clears the original southeast floor lantern.
 points:{counter:[9,0,6.2],teller:[9,0,8.35],standby:[10.2,0,5.5],ledger:[8.68,1.18,7.69],counting:[9.43,1.18,7.69]},
 role:{id:'jp-exchange-teller',npcName:'澄江 · 両替出纳',ageYears:42},
 countingLabel:'清点票券 · 核对收支',approachMessage:'请走到汤屋一层接待厅的両替柜台前，再办理存取与兑换',
});

export function japanExchangeStation(){const c=JAPAN_EXCHANGE_COUNTER;return {...c.role,name:c.name,action:'办理存取、兑换与查账',position:c.points.counter,npcPosition:c.points.teller,npcAction:'money-house-duty',npcRotation:c.tellerYaw,npcLabel:'核对账簿 · 清点票券',color:'#b09569',interactionRadius:1.4,priority:30,dialogue:'正式岗位工钱记在同一本银行账里。请先取出要带在身上的日本票券；兑换其他游戏币种前，可以在这里核对报价和往来账。'};}

export function japanExchangeAppearance(region,id,look){return region==='japan'&&id===JAPAN_EXCHANGE_COUNTER.stationId?{...look,bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'kimono-soft-sleeve',clothes:0x526875,accent:0xc2a878}:look;}

// Original solid ink strokes for 両替, readable without a canvas or font fetch.
// Coordinates are authored top-down and reflected once onto the south face.
const GLYPHS=[
 [[[.08,.08],[.92,.08]],[[.5,.08],[.5,.87]],[[.12,.31],[.88,.31],[.88,.92],[.76,.92]],[[.12,.31],[.12,.92]],[[.29,.40],[.29,.73],[.71,.73],[.71,.40]]],
 [[[.08,.15],[.43,.15]],[[.03,.32],[.46,.32]],[[.27,.02],[.24,.30],[.07,.48]],[[.24,.31],[.43,.47]],[[.57,.15],[.92,.15]],[[.54,.32],[.97,.32]],[[.75,.02],[.73,.30],[.56,.47]],[[.74,.31],[.94,.48]],[[.22,.53],[.79,.53],[.79,.95],[.22,.95],[.22,.53]],[[.22,.74],[.79,.74]]],
];

export function buildJapanExchangeCounter(G,{group,colliders,cameraColliders}){
 const {THREE}=G,c=JAPAN_EXCHANGE_COUNTER,q=new THREE.Group();q.name='Kasumi-yu light-wood exchange desk';group.add(q);
 const wood=0xc5a474,endgrain=0xb18a59,ink=0x363f44,paper=0xf0e2bc,indigo=0x526875;
 const box=(name,x,y,z,w,h,d,color,solid=false)=>{const m=G.box(q,x,y,z,w,h,d,color);m.name=name;if(solid){const b={minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2,owner:c.id};colliders.push(b);cameraColliders.push({...b});}return m;};
 // Beside the reception, beyond the ramen seating, with the entrance and east
 // stair route untouched. The west end opens into a separate staff bay.
 box('Light-wood exchange desk',9,.54,7.42,2.45,1.08,.66,wood,true);
 box('Broad writing top',9,1.115,7.42,2.61,.07,.81,paper);
 box('Joined timber desk footing',9,.075,7.42,2.51,.15,.72,endgrain);
 for(const x of[7.84,8.23,8.62,9.01,9.40,9.79,10.16])box('Vertical desk joinery',x,.56,7.077,.034,.91,.035,endgrain);
 for(const y of[.22,.88])box('Dark lower rail',9,y,7.058,2.37,.04,.045,endgrain);
 box('Short east staff return',10.21,.54,8.05,.14,1.08,1.27,wood,true);
 box('Staff return rail',10.21,1.115,8.05,.20,.07,1.34,paper);
 // A shallow ledger rack and a wall sign use the reception wall, without
 // introducing a tall cabinet or furniture across the public circulation.
 box('Wall account-book shelf',9,1.58,8.67,2.30,.07,.25,wood);
 for(const x of[7.95,10.05])box('Shelf bracket',x,1.43,8.69,.09,.27,.13,endgrain);
 for(let i=0;i<4;i++){
  box('Thread-bound account book',8.11+i*.21,1.80,8.66,.16,.36,.19,[indigo,0x887a64][i%2]);
  box('Book paper title strip',8.11+i*.21,1.80,8.557,.067,.23,.016,paper);
 }
 box('Local exchange sign',9,2.47,8.71,2.28,.83,.10,wood);
 for(const x of[7.89,10.11])box('Sign end batten',x,2.47,8.645,.075,.89,.05,endgrain);
 const sign=new THREE.Group();sign.name='両替 exchange sign';sign.position.set(9,2.78,8.645);sign.rotation.y=Math.PI;q.add(sign);
 for(const [i,glyph]of GLYPHS.entries())for(const stroke of glyph)for(let j=1;j<stroke.length;j++){
  const a=stroke[j-1],b=stroke[j],s=.62,dx=(b[0]-a[0])*s,dy=-(b[1]-a[1])*s;
  const m=G.box(sign,(i-.5)*.83+(a[0]+b[0]-1)*s/2,-(a[1]+b[1])*s/2,0,Math.hypot(dx,dy)+.018,.025,.018,ink);m.rotation.z=Math.atan2(dy,dx);
 }
 // Thread-bound ledger, inkstone and a resting brush form one writing place.
 box('Open stitched ledger',8.68,1.163,7.49,.64,.026,.43,indigo);
 for(const x of[8.52,8.85])box('Ledger cream page',x,1.182,7.49,.30,.012,.40,paper);
 for(let i=0;i<5;i++)for(const x of[8.52,8.85])box('Ledger ink row',x,1.190,7.34+i*.068,.24,.004,.009,0x887e67);
 for(let i=0;i<4;i++)box('Book binding stitch',8.68,1.193,7.36+i*.085,.035,.007,.014,paper);
 box('Inkstone',8.15,1.168,7.58,.22,.042,.15,ink);
 box('Resting writing brush',8.26,1.169,7.35,.022,.023,.34,endgrain);
 box('Brush ink tip',8.26,1.169,7.17,.022,.023,.05,ink);
 // Shallow timber compartments hold original fictional game-ticket stacks.
 box('Divided counting tray',9.43,1.17,7.49,.64,.045,.43,endgrain);
 for(const x of[9.12,9.43,9.74])box('Counting tray divider',x,1.21,7.49,.026,.06,.43,wood);
 for(const z of[7.285,7.695])box('Counting tray rim',9.43,1.21,z,.64,.06,.026,wood);
 for(const x of[9.28,9.58])for(let i=0;i<3;i++){
  box('Stacked Japanese game tickets',x,1.203+i*.012,7.49,.23,.01,.29,0xd9c593);
  box('Ticket indigo seal',x,1.210+i*.012,7.49,.105,.003,.11,indigo);
  box('Ticket paper center',x,1.212+i*.012,7.49,.058,.002,.065,paper);
 }
 return c;
}
