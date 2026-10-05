// A small working bureau in the existing music reception, not a new bank
// building. It uses the same persisted multi-currency account as every counter.
export const FRANCE_EXCHANGE_COUNTER=Object.freeze({
 id:'france-exchange-counter',name:'宫苑银行与兑换柜台',floorY:.23,
 stationId:'france-exchange-teller',defaultCurrency:'france',exchangeTo:'copper',tellerYaw:Math.PI,
 points:{counter:[23.35,.23,.12],teller:[23.35,.23,2.23],ledger:[23.12,1.36,1.58],counting:[23.91,1.38,1.58]},
 role:{id:'france-exchange-teller',npcName:'克莱尔 · 柜台出纳',ageYears:38},
 countingLabel:'清点票券 · 核对收支',approachMessage:'请走到音乐接待厅的银行柜台前，再办理存取与兑换',
});

export function franceExchangeStation(){const c=FRANCE_EXCHANGE_COUNTER;return {...c.role,name:c.name,action:'办理存取、兑换与查账',position:c.points.counter,npcPosition:c.points.teller,npcAction:'money-house-duty',npcRotation:c.tellerYaw,npcLabel:'核对账簿 · 清点票券',color:'#729582',interactionRadius:1.4,priority:30,dialogue:'正式岗位工钱已记入同一本银行账。你可以在这里取出法国券，也可以先查看报价，再兑换其他游戏币种。'};}

export function franceExchangeAppearance(region,id,look){return region==='france'&&id===FRANCE_EXCHANGE_COUNTER.stationId?{...look,bodyPreset:'feminine-lean',hairStyle:'low-bun',wardrobePreset:'court-overgown',clothes:0x466e61,accent:0xc7aa61}:look;}

// Original line lettering, built as solid strokes so no canvas/font download
// is required. CHANGE is the local exchange sign on the joined cabinet crown.
const LETTERS={C:[[[.85,1],[.2,1],[0,.8],[0,.2],[.2,0],[.85,0]]],H:[[[0,0],[0,1]],[[.85,0],[.85,1]],[[0,.5],[.85,.5]]],A:[[[0,0],[.42,1],[.85,0]],[[.2,.43],[.65,.43]]],N:[[[0,0],[0,1],[.85,0],[.85,1]]],G:[[[.85,1],[.2,1],[0,.8],[0,.2],[.2,0],[.85,0],[.85,.5],[.5,.5]]],E:[[[.85,1],[0,1],[0,0],[.85,0]],[[0,.5],[.65,.5]]]};

export function buildFranceExchangeCounter(G,{group,colliders,cameraColliders}){
 const {THREE}=G,c=FRANCE_EXCHANGE_COUNTER,q=new THREE.Group();q.name='French reception exchange bureau';group.add(q);
 const ivory=0xf4f2e9,green=0x3e7259,gold=0xc7aa61,wood=0x765d45;
 const box=(name,x,y,z,w,h,d,color,solid=false)=>{const m=G.box(q,x,y,z,w,h,d,color);m.name=name;if(solid){G.collider(colliders,x,z,w,d);cameraColliders.push({minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2});}return m;};
 // Low counter and east return bound the staff bay; the west end stays open
 // behind the counter. The central garden doorway and piano aisle stay clear.
 box('Paneled banking counter',23.38,.755,1.32,2.46,1.05,.64,green,true);
 box('Counter stone worktop',23.38,1.31,1.32,2.62,.10,.78,ivory);
 box('Counter lower plinth',23.38,.30,1.32,2.57,.14,.73,wood);
 for(const x of[22.60,23.38,24.16]){
  box('Ivory counter inset',x,.77,.987,.63,.65,.026,ivory);
  for(const y of[.43,1.11])box('Gilt panel molding',x,y,.961,.69,.035,.032,gold);
  for(const dx of[-.345,.345])box('Gilt panel stile',x+dx,.77,.961,.035,.70,.032,gold);
 }
 box('Joined east staff return',24.57,.755,2.12,.16,1.05,1.61,green,true);
 box('Staff return cap',24.57,1.31,2.12,.23,.10,1.69,ivory);
 // A shallow wall cabinet backs the desk with a continuous working shelf,
 // closed lower storage and an upper ledger pigeonhole rather than loose props.
 box('Bureau rear cabinet',23.44,1.20,3.04,2.31,1.94,.38,green,true);
 for(const x of[22.88,24.0]){
  box('Cabinet paneled door',x,.96,2.833,.98,1.26,.036,ivory);
  box('Cabinet brass handle',x+(x<23.44?.34:-.34),.99,2.79,.043,.16,.043,gold);
 }
 box('Cabinet shelf',23.44,1.73,2.99,2.39,.085,.48,wood);
 box('Cabinet crown',23.44,2.24,3.02,2.51,.14,.48,ivory);
 box('Exchange sign backing',23.44,2.59,3.11,2.37,.58,.16,green);
 for(const y of[2.30,2.88])box('Sign gilt frame',23.44,y,3.005,2.45,.035,.06,gold);
 for(const x of[22.235,24.645])box('Sign gilt frame',x,2.59,3.005,.035,.61,.06,gold);
 const sign=new THREE.Group();sign.name='CHANGE exchange sign';sign.position.set(23.44,2.44,3.005);sign.rotation.y=Math.PI;q.add(sign);
 for(const [i,ch]of [...'CHANGE'].entries())for(const stroke of LETTERS[ch])for(let j=1;j<stroke.length;j++){
  const a=stroke[j-1],b=stroke[j],dx=(b[0]-a[0])*.29,dy=(b[1]-a[1])*.29;
  const m=G.box(sign,(i-2.5)*.35+(a[0]+b[0]-.85)*.145,(a[1]+b[1])*.145,0,Math.hypot(dx,dy)+.016,.021,.018,gold);m.rotation.z=Math.atan2(dy,dx);
 }
 for(let i=0;i<6;i++){
  box('Bound account book',22.55+i*.27,1.95,2.92,.19,.34,.22,[0x6f7761,0xb0976d,0x687f77][i%3]);
  box('Book spine band',22.55+i*.27,2.04,2.799,.17,.025,.018,gold);
 }
 // Open register, pen and counted game vouchers sit on the real work surface.
 box('Open register cover',23.12,1.372,1.43,.67,.024,.40,wood);
 for(const x of[22.95,23.29])box('Register cream page',x,1.39,1.43,.32,.012,.37,0xf0e4c5);
 for(let i=0;i<5;i++)for(const x of[22.95,23.29])box('Written ledger row',x,1.398,1.29+i*.055,.25,.004,.007,0x9d8c68);
 G.box(q,22.67,1.385,1.47,.035,.025,.29,gold,.2);
 box('Voucher counting tray',23.91,1.382,1.43,.49,.045,.39,wood);
 for(let i=0;i<3;i++){box('Stacked French game vouchers',23.91,1.415+i*.013,1.43,.35,.01,.24,0xb6cbb5);box('Voucher face ornament',23.91,1.423+i*.013,1.43,.13,.002,.12,0xe3cb87);}
 return c;
}
