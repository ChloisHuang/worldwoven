import {THREE, material} from './geometry.js?rev=R7-20261002';

// Hand-scale, original code-modelled cloth charms. Front is +Z; origin is the cord's hook.
// White teru-teru-bozu is a Japanese wish for fair weather. The blue rain counterpart
// is Worldwoven fiction, not a claim of a universal Japanese rain-doll tradition.
export const WEATHER_CHARM_REFERENCES = Object.freeze([
  'https://www.japansociety.org.uk/rsn/lessons/resources/RSN-Resources-TeruTeruBozu.pdf',
  'https://www.nippon.com/en/guide-to-japan/cs00083/',
]);
const TAU = Math.PI * 2;
const COLORS = {fair: 0xf4f0df, rain: 0x8eacba, ink: 0x424751, thread: 0xa39270,
  rainThread: 0x426777, raindrop: 0x496f8d, hem: 0xc1d7d9, wood: 0x976f4d, brass: 0xb69a64};
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));

// One connected surface runs over the padded head, through the pinched neck and
// down the four draping corners. Folds broaden toward the free, uneven cloth edge.
const headRings = [
  [-.104,.0007],[-.107,.017],[-.115,.028],[-.127,.036],[-.141,.039],
  [-.154,.037],[-.167,.030],[-.176,.020],[-.183,.011],[-.190,.009],
];
function skirtPoint(t, a, offset = 0) {
  const folds = .10*Math.cos(4*a+.35) + .07*Math.sin(7*a-.4) + .045*Math.cos(11*a);
  const r = .009 + .051*Math.pow(t,.78)*(1+folds*t) + offset;
  const hem = .013*Math.cos(4*a+.35) + .004*Math.sin(3*a+.7);
  return new THREE.Vector3(Math.sin(a)*r - .003*t*t,
    -.190 - .105*t + hem*Math.pow(t,2.6), Math.cos(a)*r*.87);
}
function clothGeometry() {
  const p=[], ind=[], sides=40, rows=headRings.length+8;
  for (let row=0;row<rows;row++) for(let i=0;i<sides;i++) {
    const a=i/sides*TAU;
    if(row<headRings.length) {
      const [y,r]=headRings[row], crease=1+.012*Math.cos(5*a+.3)+.008*Math.sin(9*a);
      p.push(Math.sin(a)*r*crease,y+.0007*Math.sin(a*3),Math.cos(a)*r*crease*.94);
    } else p.push(...skirtPoint((row-headRings.length+1)/8,a).toArray());
  }
  for(let row=0;row<rows-1;row++) for(let i=0;i<sides;i++) {
    const a=row*sides+i,b=row*sides+(i+1)%sides,d=a+sides,e=b+sides;
    ind.push(a,d,b,b,d,e);
  }
  const top=p.length/3;p.push(0,-.1038,0);
  for(let i=0;i<sides;i++) ind.push(top,i,(i+1)%sides);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  geo.setIndex(ind);geo.computeVertexNormals();return geo;
}
function tube(points,r=.0011,segments=12,sides=4,closed=false) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:new THREE.Vector3(...p)),closed),segments,r,sides,closed);
}
// Merge tiny marks, thread and pattern into one coloured detail mesh per doll.
function detailsBuilder() {
  const p=[],n=[],c=[];
  return {
    add(geometry,color) {
      const flat=geometry.index?geometry.toNonIndexed():geometry, col=new THREE.Color(color);
      for(let i=0;i<flat.attributes.position.count;i++) {
        p.push(flat.attributes.position.getX(i),flat.attributes.position.getY(i),flat.attributes.position.getZ(i));
        n.push(flat.attributes.normal.getX(i),flat.attributes.normal.getY(i),flat.attributes.normal.getZ(i));
        c.push(col.r,col.g,col.b);
      }
      if(flat!==geometry)flat.dispose();geometry.dispose();
    },
    mesh() {
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
      geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));
      return new THREE.Mesh(geo,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}));
    },
  };
}
function rainDrop(t,a,size) {
  // Each drop follows the folded cloth surface, avoiding flat floating decals.
  const shape=[[0,-1.3],[-.62,-.3],[-.72,.35],[-.43,.76],[0,.88],[.44,.73],[.7,.30],[.57,-.35]];
  const positions=[];
  for(const [x,y] of [[0,0],...shape]) positions.push(...skirtPoint(t+y*size/.105,a+x*size/.053,.00065).toArray());
  const indices=[];for(let i=0;i<shape.length;i++)indices.push(0,1+i,1+(i+1)%shape.length);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setIndex(indices);geo.computeVertexNormals();return geo;
}

export function createWeatherCharm({kind='fair',phase=0}={}) {
  if(!['fair','rain'].includes(kind))throw new RangeError('Weather charm kind must be fair or rain');
  const group=new THREE.Group(),sway=new THREE.Group();group.add(sway);
  group.name=kind==='fair'?'White teru-teru-bozu · fair-weather wish':'Blue rain-wish doll · Worldwoven original';
  group.userData.noStaticBatch=true;
  const cloth=new THREE.Mesh(clothGeometry(),material(COLORS[kind],{side:THREE.DoubleSide}));
  cloth.name='Continuous soft cloth head, tied neck and uneven drape';cloth.castShadow=true;cloth.receiveShadow=true;sway.add(cloth);
  const d=detailsBuilder(),thread=kind==='fair'?COLORS.thread:COLORS.rainThread;
  d.add(tube([[0,0,0],[-.001,-.030,0],[.001,-.071,-.001],[0,-.104,0]],.0008,8),thread);
  // The narrow neck tie follows the cloth. Its tails rest on the shoulder folds.
  const neck=Array.from({length:20},(_,i)=>{const a=i/20*TAU;return [Math.sin(a)*.0104,-.187+Math.sin(a)*.001,Math.cos(a)*.0101];});
  d.add(tube(neck,.0011,20,4,true),thread);
  d.add(tube([[.007,-.189,.008],[.017,-.193,.012],[.020,-.209,.019]],.0011,8),thread);
  d.add(tube([[.008,-.189,.007],[.022,-.194,.003],[.026,-.202,.005]],.001,7),thread);
  const faceZ=(x,y)=>.94*Math.sqrt(Math.max(.00001,.039**2-x*x-(y+.141)**2))+.00065;
  if(kind==='fair') {
    for(const [x,y] of [[-.012,-.139],[.0125,-.140]])
      d.add(tube([[x-.0005,y+.0017,faceZ(x,y)],[x,y,faceZ(x,y)],[x+.0002,y-.0017,faceZ(x,y)]],.00135,5),COLORS.ink);
    const smile=Array.from({length:9},(_,i)=>{const x=-.010+i*.0025,y=-.153-.0045*(1-(x/.010)**2);return[x,y,faceZ(x,y)];});
    d.add(tube(smile,.001,10),COLORS.ink);
  } else {
    for(const x of [-.013,.012]) {
      const eye=Array.from({length:6},(_,i)=>{const xx=x-.004+i*.0016,y=-.142-.0018*Math.sin(i/5*Math.PI);return[xx,y,faceZ(xx,y)];});
      d.add(tube(eye,.0011,7),COLORS.ink);
    }
    d.add(tube([[-.004,-.156,faceZ(-.004,-.156)],[0,-.157,faceZ(0,-.157)],[.004,-.1556,faceZ(.004,-.1556)]],.0009,7),COLORS.ink);
    for(const [t,a,size] of [[.43,-.47,.0038],[.66,.15,.0045],[.81,-.62,.0045],[.80,.77,.0038],[.61,2.35,.0045],[.77,-2.5,.004]])
      d.add(rainDrop(t,a,size),COLORS.raindrop);
    const hem=Array.from({length:40},(_,i)=>skirtPoint(.947,i/40*TAU,.0003));
    d.add(tube(hem,.00085,40,3,true),COLORS.hem);
  }
  const detail=d.mesh();detail.name='Thin cord, neck thread, hand-drawn face and original cloth pattern';sway.add(detail);
  let hanging=true;
  const metadata={kind,clothHeightMetres:.205,cordLengthMetres:.104,drawCalls:2,
    culturalNote:kind==='fair'?'Japanese cloth doll hung as a wish for fine weather.':
      'Original Worldwoven blue-gray rain-wish companion; not presented as traditional Japanese iconography.',
    sourceReferences:WEATHER_CHARM_REFERENCES,changesWeather:false};
  group.userData.weatherCharm=metadata;
  return {group,metadata,
    setHanging(value){hanging=Boolean(value);sway.rotation.set(0,0,0);},
    update(timeSeconds,wind=1){const t=Number.isFinite(timeSeconds)?timeSeconds:0,force=clamp(Number.isFinite(wind)?wind:0,0,1);
      sway.rotation.z=hanging?.038*force*Math.sin(t*1.45+phase):0;
      sway.rotation.x=hanging?.014*force*Math.sin(t*1.12+phase+.7):0;},
    dispose(){cloth.geometry.dispose();detail.geometry.dispose();},
  };
}

// Prototype only: call take(handAnchor, actorFeet) / hang(actorFeet) from a future
// player action. No inventory, NPC desire, persistence or weather-system mutation.
export function createWeatherCharmHook({kind='fair',height=1.78,phase=0}={}) {
  if(!Number.isFinite(height)||height<.65||height>1.9)throw new RangeError('Use a human-reachable hook height (0.65–1.9 m)');
  const group=new THREE.Group(),mount=new THREE.Group(),charm=createWeatherCharm({kind,phase});
  group.name='Reachable weather charm hook';mount.position.set(0,height,.031);group.add(mount);mount.add(charm.group);
  const d=detailsBuilder();
  const back=new THREE.BoxGeometry(.036,.067,.013);back.translate(0,height+.008,-.009);d.add(back,COLORS.wood);
  d.add(tube([[0,height+.018,-.002],[0,height+.008,.018],[0,height-.005,.030],[0,height+.003,.039]],.0027,12,5),COLORS.brass);
  const hook=d.mesh();hook.name='Small cedar-backed brass hook';group.add(hook);
  let state='hanging';
  const point=new THREE.Vector3();
  function canReach(actorFeet) {
    const a=Array.isArray(actorFeet)?actorFeet:[actorFeet?.x,actorFeet?.y,actorFeet?.z];
    if(!a.every(Number.isFinite))return false;
    mount.getWorldPosition(point);
    const dy=point.y-a[1];return Math.hypot(point.x-a[0],point.z-a[2])<=.85&&dy>=.4&&dy<=1.95;
  }
  return {group,charm,mount,canReach,
    get state(){return state;},
    take(handAnchor,actorFeet){if(state!=='hanging'||!handAnchor?.isObject3D||handAnchor===charm.group||!canReach(actorFeet))return false;
      // Reject cycles before parenting; the caller supplies an independent hand grip.
      for(let p=handAnchor;p;p=p.parent)if(p===charm.group)return false;
      handAnchor.add(charm.group);charm.group.position.set(0,0,0);charm.group.quaternion.identity();charm.setHanging(false);state='carried';return true;},
    hang(actorFeet){if(state!=='carried'||!canReach(actorFeet))return false;mount.add(charm.group);
      charm.group.position.set(0,0,0);charm.group.quaternion.identity();charm.setHanging(true);state='hanging';return true;},
    update:charm.update,
    dispose(){charm.group.removeFromParent();charm.dispose();hook.geometry.dispose();},
  };
}
