import * as THREE from 'three';
import { box, cyl, sphere, cone, torus } from '/assets/geometry.accd26d9fe1820ba.js';

// The globe's local front is 70°E. +Y is north; all decoration is a child of group.
const R = 5.8;
const RAD = Math.PI / 180;
const point = (lat, lon, radius = R) => new THREE.Vector3(
  radius * Math.cos(lat * RAD) * Math.sin((lon - 70) * RAD),
  radius * Math.sin(lat * RAD),
  radius * Math.cos(lat * RAD) * Math.cos((lon - 70) * RAD)
);
const up = new THREE.Vector3(0, 1, 0);
const colors = {
  sea: 0x5bbfcc, seaLight: 0x7bd5da, coast: 0xf5dda1,
  meadow: 0xa8c776, cream: 0xfff2cf, ink: 0x405858,
  red: 0xbf4946, gold: 0xe3b459, teal: 0x4e9290,
};
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, ...extra });
const local = (parent, lat, lon, elevation = .02) => {
  const g = new THREE.Group();
  g.position.copy(point(lat, lon, R + elevation));
  g.quaternion.setFromUnitVectors(up, g.position.clone().normalize());
  parent.add(g);
  return g;
};
function beam(g, a, b, width, color, sides = 5) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), direction = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(width, width, direction.length(), sides), toon(color));
  m.position.copy(A).add(B).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(up, direction.normalize());
  m.castShadow = true;
  g.add(m);
  return m;
}
function path(g, points, color, width = .014, opacity = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => p.isVector3 ? p : new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length * 4), width, 4, false), toon(color, { transparent: opacity < 1, opacity }));
  g.add(m);
  return m;
}

// Keep the tiny details, but submit compatible static surfaces in one draw call.
// Each moving/selectable branch is packed in its own local coordinate system.
function packStatic(root, excluded = new Set()) {
  root.updateMatrixWorld(true);
  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const visit = object => {
    if (excluded.has(object)) return;
    // Lines and invisible picking meshes retain their original geometry/behavior.
    if (object.isMesh && !Array.isArray(object.material) && object.material.isMeshToonMaterial) {
      const mat = object.material;
      const settings = mat.toJSON();
      // Bake only diffuse color; every other material setting must still match.
      delete settings.uuid; delete settings.metadata; delete settings.name;
      delete settings.color; delete settings.vertexColors;
      const key = JSON.stringify([settings, object.castShadow, object.receiveShadow,
        object.visible, object.layers.mask, object.renderOrder]);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  let batchIndex = 0;
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const parts = [];
    let count = 0;
    for (const mesh of meshes) {
      let geo = mesh.geometry.clone();
      geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      if (geo.index) {
        const unindexed = geo.toNonIndexed();
        geo.dispose(); geo = unindexed;
      }
      if (!geo.attributes.normal) geo.computeVertexNormals();
      const colors = new Float32Array(geo.attributes.position.count * 3);
      const old = mesh.material.vertexColors ? geo.attributes.color : null;
      const color = mesh.material.color;
      for (let i = 0; i < geo.attributes.position.count; i++) {
        colors[i * 3] = color.r * (old ? old.getX(i) : 1);
        colors[i * 3 + 1] = color.g * (old ? old.getY(i) : 1);
        colors[i * 3 + 2] = color.b * (old ? old.getZ(i) : 1);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      parts.push(geo); count += geo.attributes.position.count;
    }
    const position = new Float32Array(count * 3), normal = new Float32Array(count * 3);
    const color = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let offset = 0;
    for (const geo of parts) {
      position.set(geo.attributes.position.array, offset * 3);
      normal.set(geo.attributes.normal.array, offset * 3);
      color.set(geo.attributes.color.array, offset * 3);
      if (geo.attributes.uv) uv.set(geo.attributes.uv.array, offset * 2);
      offset += geo.attributes.position.count;
      geo.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const first = meshes[0], material = first.material.clone();
    material.color.set(0xffffff); material.vertexColors = true;
    const batch = new THREE.Mesh(geometry, material);
    batch.name = `${root.name || 'Globe'} static ${++batchIndex}`;
    batch.castShadow = first.castShadow; batch.receiveShadow = first.receiveShadow;
    batch.visible = first.visible; batch.layers.mask = first.layers.mask;
    batch.renderOrder = first.renderOrder;
    for (const mesh of meshes) { mesh.parent.remove(mesh); mesh.geometry.dispose(); }
    root.add(batch);
  }
}

// Original, deliberately simplified coastlines in [longitude, latitude].
const continents = [
  { name: 'Eurasia', color: 0xaec877, points: [
    [-10,36],[-9,43],[-2,44],[-5,48],[-1,49],[2,51],[6,53],[8,55],[8,58],[5,59],[7,62],[13,67],[20,70],[28,71],[31,69],[36,69],[40,67],[49,68],[56,71],[67,70],[73,73],[88,76],[102,77],[112,74],[125,73],[139,72],[154,70],[169,66],[179,66],[179,60],[169,60],[162,57],[157,51],[155,50],[155,56],[148,59],[141,57],[139,52],[141,46],[136,43],[132,43],[130,40],[129,35],[126,34],[125,39],[120,40],[121,34],[122,30],[120,27],[117,24],[114,22],[109,21],[108,17],[106,12],[104,10],[101,13],[100,18],[98,17],[99,11],[103,3],[101,1],[98,5],[96,13],[93,17],[91,22],[87,22],[83,18],[80,13],[78,8],[76,9],[73,17],[69,23],[66,25],[61,25],[58,24],[56,20],[52,16],[47,13],[43,13],[40,19],[37,26],[35,29],[33,31],[35,35],[32,36],[28,36],[26,38],[23,39],[24,35],[22,36],[20,40],[17,41],[16,38],[13,38],[12,42],[9,44],[7,43],[4,43],[2,41],[0,40],[-1,37],[-6,36]
  ]},
  { name: 'Africa', color: 0xc5cd86, points: [
    [-17,21],[-16,27],[-10,31],[-5,35],[2,36],[10,37],[12,33],[19,30],[25,32],[32,31],[34,27],[37,22],[40,16],[43,12],[50,12],[51,9],[46,5],[43,0],[40,-4],[40,-11],[36,-18],[35,-23],[32,-26],[31,-30],[27,-34],[19,-35],[17,-29],[15,-23],[12,-18],[12,-11],[9,-4],[9,3],[4,5],[-1,5],[-5,4],[-9,5],[-13,9],[-16,13],[-17,17]
  ]},
  { name: 'North America', color: 0xa8c882, points: [
    [-168,66],[-163,70],[-150,71],[-140,69],[-132,70],[-124,73],[-116,74],[-109,70],[-99,72],[-91,73],[-82,69],[-84,65],[-92,63],[-94,58],[-87,55],[-82,55],[-79,60],[-73,62],[-64,60],[-61,55],[-55,52],[-53,48],[-60,47],[-65,44],[-70,43],[-72,40],[-75,37],[-76,34],[-80,31],[-80,26],[-82,25],[-84,30],[-91,29],[-96,26],[-98,22],[-97,18],[-92,18],[-89,21],[-86,21],[-87,17],[-84,15],[-83,10],[-78,9],[-77,8],[-80,8],[-85,10],[-88,14],[-94,16],[-99,17],[-105,20],[-108,25],[-111,30],[-114,31],[-112,26],[-110,23],[-112,23],[-116,29],[-117,33],[-121,37],[-124,42],[-125,48],[-130,53],[-137,58],[-146,61],[-153,59],[-160,56],[-164,55],[-161,59],[-166,61]
  ]},
  { name: 'South America', color: 0x9fc583, points: [
    [-81,12],[-75,11],[-72,12],[-66,10],[-62,8],[-58,6],[-53,3],[-50,0],[-45,-2],[-40,-3],[-35,-6],[-35,-10],[-38,-15],[-40,-20],[-45,-24],[-48,-28],[-50,-32],[-54,-35],[-58,-38],[-61,-42],[-64,-47],[-68,-55],[-73,-54],[-75,-48],[-74,-42],[-73,-36],[-71,-30],[-71,-24],[-74,-18],[-77,-12],[-80,-7],[-81,-2],[-78,2],[-78,7]
  ]},
  { name: 'Australia', color: 0xd6cb8d, points: [
    [113,-22],[114,-26],[115,-32],[120,-34],[125,-33],[130,-32],[135,-35],[138,-35],[140,-38],[146,-39],[150,-36],[153,-28],[151,-23],[147,-18],[143,-11],[140,-16],[136,-14],[132,-12],[129,-15],[124,-14],[121,-18],[116,-20]
  ]},
  { name: 'Greenland', color: 0xf1f0dc, points: [[-55,60],[-49,61],[-43,65],[-39,70],[-22,75],[-20,80],[-30,83],[-45,83],[-60,80],[-67,76],[-60,70]] },
  { name: 'Britain', color: 0xb1ce86, points: [[-5,50],[-6,54],[-4,55],[-5,58],[-3,59],[-1,57],[-2,54],[1,52],[0,51]] },
  { name: 'Ireland', color: 0xaac777, points: [[-10,51],[-10,54],[-7,55],[-6,53],[-7,51]] },
  { name: 'Madagascar', color: 0xb6c985, points: [[44,-25],[44,-20],[48,-13],[50,-15],[49,-20],[46,-25]] },
  { name: 'Japan', color: 0xb5ce8a, points: [[130,31],[129,33],[132,35],[135,35],[138,37],[140,41],[142,43],[145,44],[144,41],[141,40],[141,37],[138,35],[134,33]] },
  { name: 'Sri Lanka', color: 0xb1cc86, points: [[80,6],[79,8],[80,10],[82,7]] },
  { name: 'Sumatra', color: 0x9fc587, points: [[95,6],[99,3],[103,-2],[106,-5],[104,-6],[100,-2],[97,1]] },
  { name: 'Java', color: 0xa8c785, points: [[105,-6],[113,-7],[115,-8],[111,-9],[106,-8]] },
  { name: 'Borneo', color: 0x98c17f, points: [[109,2],[112,4],[116,7],[119,4],[117,0],[114,-4],[110,-2]] },
  { name: 'New Guinea', color: 0xa7c785, points: [[131,-1],[137,-2],[141,-4],[146,-5],[151,-10],[145,-10],[140,-8],[136,-5],[133,-4]] },
  { name: 'New Zealand North', color: 0xb1c780, points: [[173,-35],[176,-38],[179,-38],[177,-41],[175,-40]] },
  { name: 'New Zealand South', color: 0xb1c780, points: [[172,-40],[174,-42],[169,-47],[167,-46],[170,-43]] },
  { name: 'Cuba', color: 0xb9ce89, points: [[-85,22],[-81,23],[-76,21],[-74,20],[-78,20],[-82,22]] },
  { name: 'Iceland', color: 0xcadba5, points: [[-24,64],[-23,66],[-18,67],[-13,65],[-18,63]] },
];

function land(parent, feature) {
  const vertices = feature.points.map(p => new THREE.Vector2(p[0], p[1]));
  const triangles = THREE.ShapeUtils.triangulateShape(vertices, []);
  const positions = [], shades = [];
  const base = new THREE.Color(feature.color);
  let index = 0;
  function triangle(a, b, c, depth) {
    const max = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
    if (max > 5 && depth < 7) {
      const ab = a.clone().add(b).multiplyScalar(.5), bc = b.clone().add(c).multiplyScalar(.5), ca = c.clone().add(a).multiplyScalar(.5);
      triangle(a, ab, ca, depth + 1); triangle(ab, b, bc, depth + 1); triangle(ca, bc, c, depth + 1); triangle(ab, bc, ca, depth + 1);
      return;
    }
    const lat = (a.y + b.y + c.y) / 3, lon = (a.x + b.x + c.x) / 3;
    const col = base.clone();
    if ((feature.name === 'Africa' && lat > 12 && lat < 31) || (feature.name === 'Eurasia' && lon > 35 && lon < 65 && lat < 33)) col.set(0xe1cf90);
    if (feature.name === 'Eurasia' && lon > 75 && lon < 115 && lat > 38 && lat < 48) col.lerp(new THREE.Color(0xdcc590), .42);
    if (feature.name === 'South America' && lat > -15) col.lerp(new THREE.Color(0x78b687), .35);
    if (lat > 62 && feature.name !== 'Greenland') col.lerp(new THREE.Color(0xc8d8a6), .55);
    col.multiplyScalar(1 + Math.sin(index++ * 8.912) * .013);
    const A = point(a.y, a.x, R + .065), B = point(b.y, b.x, R + .065), C = point(c.y, c.x, R + .065);
    // Geographic longitude/latitude triangulation may wind either way. Always face out.
    const normal = B.clone().sub(A).cross(C.clone().sub(A));
    const face = normal.dot(A) >= 0 ? [A,B,C] : [A,C,B];
    for (const p of face) { positions.push(p.x,p.y,p.z); shades.push(col.r,col.g,col.b); }
  }
  triangles.forEach(t => triangle(vertices[t[0]], vertices[t[1]], vertices[t[2]], 0));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 3));
  geometry.computeVertexNormals();
  const m = new THREE.Mesh(geometry, toon(0xffffff, { vertexColors: true }));
  m.name = feature.name; m.receiveShadow = true; parent.add(m);
  // A fine sandy rim gives the coast the feel of a cut-paper relief.
  const coast = [];
  feature.points.forEach((p, i) => {
    const q = feature.points[(i + 1) % feature.points.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1]) / 2));
    for(let j=0;j<steps;j++) { const t=j/steps; coast.push(point(p[1]+(q[1]-p[1])*t,p[0]+(q[0]-p[0])*t,R+.074)); }
  });
  coast.push(coast[0].clone());
  path(parent, coast, colors.coast, .018);
}

function tree(g, x, z, size=.35, color=0x6fa477, blossom=false) {
  cyl(g,x,.42*size,z,.065*size,.085*size,.84*size,0x7c6350,7);
  for (const [dx,y,dz,r] of [[0,1.05,0,.58],[-.38,.91,.03,.39],[.35,.96,.13,.41],[0,1.13,-.28,.35]]) {
    sphere(g,x+dx*size,y*size,z+dz*size,r*size,color,1,.78,1);
  }
  if(blossom) for(let i=0;i<5;i++) sphere(g,x+Math.sin(i*2.4)*size*.36,(1.12+Math.sin(i)*.17)*size,z+Math.cos(i*2.4)*size*.36,.085*size,0xfff2dc);
}
function roof(g, x, y, z, width, depth, color) {
  const v = [
    -width*.55,0,-depth*.55, width*.55,0,-depth*.55, width*.55,0,depth*.55, -width*.55,0,depth*.55,
    -width*.31,.28,-depth*.16, width*.31,.28,-depth*.16, width*.31,.28,depth*.16, -width*.31,.28,depth*.16
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
  geo.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5]);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo,toon(color,{side:THREE.DoubleSide})); m.position.set(x,y,z);m.castShadow=true;g.add(m);
  for(const zz of [-1,1]) path(g,[[x-width*.57,y+.08,z+zz*depth*.56],[x-width*.35,y-.01,z+zz*depth*.53],[x+width*.35,y-.01,z+zz*depth*.53],[x+width*.57,y+.08,z+zz*depth*.56]],color,.028);
  return m;
}
function flag(g,x,y,z,country) {
  cyl(g,x,y/2,z,.018,.018,y,colors.cream,5);
  if(country==='france') {
    [0x4979a0,0xfff6df,0xd85b53].forEach((c,i)=>box(g,x+.06+i*.09,y-.12,z,.09,.2,.018,c));
  } else {
    box(g,x+.17,y-.12,z,.32,.21,.022,country==='japan'?0xfff8e7:0xc64c42);
    if(country==='japan') { const disc=cyl(g,x+.17,y-.12,z+.019,.055,.055,.012,0xca5754,16);disc.rotation.x=Math.PI/2; }
    if(country==='china') sphere(g,x+.075,y-.08,z+.025,.031,0xffe3a2,1,1,.3);
  }
}
function japan(g) {
  // Original fantasy bathhouse miniature: four glowing tiers, huge jade eaves,
  // a copper steam crown and a red arrival bridge. It mirrors the explorable lot.
  box(g,0,.19,-.08,1.35,.28,1.02,0x94533f);
  for(let level=0;level<4;level++) {
    const w=1.18-level*.13,d=.83-level*.075,y=.42+level*.31;
    box(g,0,y,-.14,w,.27,d,level<2?0xb84937:0xefcf91);
    for(let i=0;i<Math.ceil(w/.14);i++) {
      const x=-w*.42+i*(w*.84/(Math.ceil(w/.14)-1));
      box(g,x,y,-.14+d*.505,.084,.17,.025,0xffd68e);
      box(g,x,y+.012,-.14+d*.525,.013,.185,.014,0x6f4534);
    }
    box(g,0,y-.12,-.14+d*.60,w+.10,.035,.17,0xb95b3c);
    for(let x=-w/2;x<=w/2+.01;x+=.12)cyl(g,x,y-.055,-.14+d*.68,.013,.013,.14,0xcc6242,5);
    box(g,0,y+.017,-.14+d*.68,w+.1,.018,.023,0xdda958);
    roof(g,0,y+.15,-.14,w+.32,d+.24,level===3?0x47776c:0x477f70);
  }
  // A small mismatched service tower and copper flues give a lived-in silhouette.
  box(g,.65,.55,-.32,.30,.85,.41,0xc57b48);roof(g,.65,1.0,-.32,.44,.54,0x46766a);
  for(const [x,y,z,r] of [[.63,1.23,-.45,.065],[.79,1.08,-.31,.045]]){
    cyl(g,x,y,z,r,r*.95,.43,0xae7551,8);cyl(g,x,y+.23,z,r*1.2,r*1.2,.055,0xdbad73,8);
    for(let i=0;i<3;i++)sphere(g,x-.015*i,y+.34+i*.12,z,.075+i*.018,0xf0e5cb,1,.70,1);
  }
  box(g,-.46,1.56,-.33,.26,.36,.29,0xa94a35);roof(g,-.46,1.76,-.33,.47,.49,0x508873);
  for(const x of [-.52,-.40])box(g,x,1.57,-.175,.063,.19,.012,0xffd78c);
  sphere(g,-.46,2.02,-.33,.046,0xedbd69);
  sphere(g,0,.10,.55,.57,0x5ea99c,1,.13,.59);
  for(let i=0;i<7;i++){const z=.30+i*.088,y=.16+Math.sin(i*Math.PI/6)*.13;box(g,0,y,z,.40,.065,.078,0xc64e39);for(const x of [-.24,.24])cyl(g,x,y+.12,z,.014,.017,.22,0xd55e43,5);}
  for(const x of [-.24,.24])path(g,[[x,.27,.29],[x,.42,.56],[x,.27,.84]],0xe18151,.022);
  tree(g,-.82,.18,.36,0xefabb0,true);tree(g,.84,.39,.29,0xf1c0b6,true);
  for(const x of [-.44,.44]){cyl(g,x,.29,.31,.025,.030,.36,0x694638,5);sphere(g,x,.51,.31,.065,0xf4bb6c,1,1.25,1);}
  flag(g,.90,.67,-.43,'japan');
}
function china(g) {
  // An imperial palace ensemble: axial marble terraces, gold-roofed halls,
  // paired side pavilions and a monumental red gate, rather than a single house.
  box(g,0,.12,-.10,1.76,.17,1.66,0xc5b58c);
  box(g,0,.24,-.25,1.47,.12,1.16,0xf0e2bc);
  box(g,0,.32,-.46,1.10,.09,.69,0xffedce);
  function hall(x,z,w,d,y,h,grand=false) {
    box(g,x,y+h/2,z,w,h,d,0xb64c3e);
    for(const dx of [-.36,0,.36]) {
      box(g,x+dx*w,y+h*.48,z+d*.505,w*.19,h*.64,.02,0x753c35);
      box(g,x+dx*w,y+h*.58,z+d*.52,w*.14,.025,.022,0xe7bd70);
    }
    for(const dx of [-.45,.45])cyl(g,x+dx*w,y+h/2,z+d*.55,.031,.034,h,0xd45b42,6);
    box(g,x,y+h-.025,z,w+.08,.075,d+.07,0x548a92);
    roof(g,x,y+h,z,w+.22,d+.19,0xe1ad43);
    box(g,x,y+h+.285,z,w*.61,.043,.055,0xf8d279);
    for(const dx of [-.37,.37])sphere(g,x+dx*w,y+h+.33,z,.035,0xf3cc69);
    if(grand) {
      box(g,x,y+h+.31,z,w*.58,.22,d*.57,0xc35740);
      roof(g,x,y+h+.43,z,w*.80,d*.84,0xeec054);
      box(g,x,y+h+.717,z,w*.48,.043,.052,0xffdc85);
    }
  }
  hall(0,-.47,.91,.52,.37,.52,true);
  for(const x of [-.67,.67])hall(x,-.10,.37,.53,.23,.39);
  // Broad front gate with three open, dark doorways and flanking watch pavilions.
  hall(0,.57,.82,.32,.12,.31);
  for(const x of [-.69,.69])hall(x,.56,.33,.34,.12,.35);
  box(g,0,.255,.13,.31,.035,.81,0xe9d7aa);
  for(let i=0;i<3;i++)box(g,0,.12+i*.047,.92-i*.084,.53-i*.04,.05,.16,0xf4e4bf);
  for(const x of [-.47,.47])for(let i=0;i<5;i++) {
    const z=-.59+i*.18;
    cyl(g,x,.34,z,.02,.023,.16,0xffeccc,5);sphere(g,x,.43,z,.031,0xffedce);
  }
  for(const x of [-.47,.47])box(g,x,.39,-.23,.033,.025,.85,0xf5e3bc);
  for(const x of [-.30,.30]) {
    box(g,x,.18,.32,.13,.10,.13,0xd5c59e);
    sphere(g,x,.28,.31,.083,0xe6cf9b,1,1.2,.8);
    sphere(g,x,.37,.32,.05,0xf2daad);
  }
  tree(g,-.83,-.61,.24,0x709869);tree(g,.83,-.61,.24,0x749f6a);
  flag(g,.98,.85,.15,'china');
}
function palm(g,x,z,s=.55) {
  beam(g,[x,0,z],[x+.045*s,.60*s,z],.046*s,0xa78050);
  beam(g,[x+.045*s,.60*s,z],[x-.08*s,1.2*s,z],.034*s,0xae8654);
  const tip = new THREE.Vector3(x-.08*s,1.2*s,z);
  for(let i=0;i<7;i++) {
    const angle=i*Math.PI*2/7, dx=Math.cos(angle),dz=Math.sin(angle);
    const vertices = [tip.x,tip.y,tip.z, tip.x+dx*.38*s-dz*.09*s,tip.y+.13*s,tip.z+dz*.38*s+dx*.09*s, tip.x+dx*.76*s,tip.y-.12*s,tip.z+dz*.76*s, tip.x+dx*.38*s+dz*.09*s,tip.y+.13*s,tip.z+dz*.38*s-dx*.09*s];
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo,toon(i%2?0x8dba76:0x6f9f6c,{side:THREE.DoubleSide})));
  }
  sphere(g,tip.x,tip.y-.03*s,tip.z,.07*s,0xb69761);
}
function egypt(g) {
  cyl(g,0,.07,0,.76,.72,.11,0xe9cf91,28);
  cone(g,-.16,.61,-.03,.68,1.12,0xd5ad67,4,Math.PI/4);
  cone(g,.43,.36,.22,.4,.66,0xe2bc77,4,Math.PI/4);
  cone(g,-.61,.27,-.40,.28,.49,0xc5a568,4,Math.PI/4);
  // The capstones and tiny stone courses catch the warm directional light.
  cone(g,-.16,1.08,-.03,.09,.15,0xf4d995,4,Math.PI/4);
  for(const x of [-.48,-.32,-.16,0,.16])box(g,x,.14,.5,.12,.05,.10,0xc7a76e);
  sphere(g,.47,.12,-.38,.25,0x69b4ad,1,.15,.6);
  palm(g,.58,-.30,.65);palm(g,.36,-.51,.52);
  for(const x of [-.66,.65])sphere(g,x,.13,.13,.085,0xccaa70,1.3,.55,1);
  // A human-headed reclining lion guards the pyramid causeway.
  const sphinx=new THREE.Group();sphinx.position.set(-.55,.12,.64);sphinx.rotation.y=Math.PI/2;g.add(sphinx);
  box(sphinx,0,.035,0,.69,.07,.36,0xddbd7e);
  sphere(sphinx,.09,.17,0,.22,0xd6ad64,1.30,.64,.65);
  for(const z of [-.105,.105])box(sphinx,-.19,.105,z,.39,.105,.10,0xe2bc76);
  sphere(sphinx,-.13,.26,0,.135,0xd7ae66,.76,1.18,.85);
  // Broad striped nemes headdress, projecting face and little ceremonial beard.
  sphere(sphinx,-.22,.43,0,.137,0xe9c67c,.81,1.13,1.09);
  box(sphinx,-.32,.42,0,.065,.16,.125,0xf0cf88);
  for(const z of [-.118,.118])box(sphinx,-.22,.34,z,.10,.24,.067,0xcfa658);
  for(const y of [.29,.34,.39,.44,.49])for(const z of [-.157,.157])box(sphinx,-.22,y,z,.103,.012,.012,0x4e7d89);
  box(sphinx,-.365,.43,0,.022,.065,.035,0xc79d58);
  box(sphinx,-.345,.33,0,.027,.10,.036,0xa77c46);
  for(const z of [-.045,.045])sphere(sphinx,-.359,.46,z,.013,0x5f5140);
  // A sandstone temple wing frames the scene with pylons and an open colonnade.
  const temple=new THREE.Group();temple.position.set(.79,.12,-.09);temple.rotation.y=-.25;g.add(temple);
  box(temple,0,.035,0,.47,.07,1.01,0xe5c88d);
  for(const z of [-.35,-.04,.27])for(const x of [-.15,.15]) {
    cyl(temple,x,.25,z,.041,.049,.42,0xeed39b,7);
    cyl(temple,x,.44,z,.071,.063,.09,0xc29a59,7);
  }
  for(const x of [-.16,.16])box(temple,x,.51,-.045,.12,.08,.91,0xd9b477);
  for(const x of [-.16,.16]) {
    box(temple,x,.33,.43,.21,.59,.15,0xd3ae6b);
    box(temple,x,.64,.43,.25,.065,.19,0xf1ce88);
    // Raised falcon-wing silhouette on each front pylon, picked out in old teal.
    sphere(temple,x,.42,.513,.046,0x79968a,.54,1.7,.21);
    for(const sign of [-1,1])for(let k=0;k<3;k++) {
      const feather=box(temple,x+sign*(.035+k*.015),.44-k*.018,.518,.078-k*.010,.020,.014,0x7d9487);
      feather.rotation.z=sign*(.35+k*.18);
    }
    sphere(temple,x,.505,.519,.025,0xd9bf73,1,.85,.25);
  }
  palm(g,-.78,-.25,.63);
}
function france(g) {
  // An ivory-and-sage royal palace, central portico and symmetrical garden wings.
  // Eiffel remains a small regional landmark rather than dominating the palace.
  const ivory=0xf3efdb,white=0xfff8e6,green=0x557968,gold=0xd4b16b;
  box(g,0,.12,-.08,1.64,.10,1.32,0xdfd2ad);
  for(const [x,w,h,z,d] of [[0,.68,.80,-.23,.56],[-.57,.46,.60,-.14,.47],[.57,.46,.60,-.14,.47]]){
    box(g,x,.18+h/2,z,w,h,d,ivory);
    box(g,x,h+.20,z,w+.06,.06,d+.065,white);
    box(g,x,h+.255,z,w,.06,d,green);
    for(const dx of [-.31,0,.31])for(const row of [0,1]){
      const xx=x+dx*w,yy=.32+row*.25;
      box(g,xx,yy,z+d*.505,w*.17,.17,.020,green);
      box(g,xx,yy,z+d*.53,.015,.17,.01,gold);
      box(g,xx,yy+.10,z+d*.52,w*.21,.025,.025,white);
    }
    for(let xx=x-w/2;xx<=x+w/2+.015;xx+=w/6)cyl(g,xx,h+.34,z+d*.43,.015,.018,.12,white,5);
    box(g,x,h+.4,z+d*.43,w+.055,.027,.04,white);
  }
  // Projecting four-column portico, a triangular pediment and a gilded crest.
  box(g,0,.20,.23,.65,.08,.32,0xe9dfc4);
  for(const x of [-.27,-.09,.09,.27]){cyl(g,x,.52,.30,.027,.033,.57,white,8);box(g,x,.80,.30,.085,.045,.082,white);}
  box(g,0,.86,.28,.74,.085,.23,white);
  const ped=new THREE.Shape();ped.moveTo(-.38,0);ped.lineTo(0,.23);ped.lineTo(.38,0);ped.closePath();
  const pg=new THREE.ExtrudeGeometry(ped,{depth:.07,bevelEnabled:false});const pm=new THREE.Mesh(pg,toon(ivory));pm.position.set(0,.90,.345);g.add(pm);
  sphere(g,0,1.04,.423,.048,gold,1,1.1,.24);
  for(let i=0;i<3;i++)box(g,0,.10+i*.03,.44-i*.06,.79-i*.045,.035,.12,white);
  // Clipped parterres around a basin, not a scatter of rural cottages.
  for(const x of [-.49,.49])for(const z of [.49,.78]){
    box(g,x,.14,z,.37,.11,.22,0x668d63);box(g,x,.18,z,.24,.07,.105,0xb0bb83);
    sphere(g,x,.21,z,.043,0xe8d8a6,1,.55,1);
  }
  cyl(g,0,.135,.76,.14,.16,.07,white,16);cyl(g,0,.178,.76,.12,.12,.016,0x77afb1,16);
  cyl(g,0,.23,.76,.019,.029,.11,white,6);sphere(g,0,.30,.76,.04,white);
  // Lattice Eiffel marker sits discreetly at the back-left of the royal ensemble.
  const tower=new THREE.Group();tower.position.set(-.83,.14,-.57);tower.scale.setScalar(.40);g.add(tower);
  const levels=[[.32,0],[.15,.61],[.06,1.03],[.018,1.38]];
  for(const sx of [-1,1])for(const sz of [-1,1])for(let i=0;i<3;i++)beam(tower,[sx*levels[i][0],levels[i][1],sz*levels[i][0]],[sx*levels[i+1][0],levels[i+1][1],sz*levels[i+1][0]],.025,0x776b54);
  box(tower,0,.61,0,.44,.07,.44,gold);box(tower,0,1.03,0,.24,.05,.24,gold);beam(tower,[0,1.35,0],[0,1.61,0],.016,gold);
  tree(g,.86,-.49,.25,0x6d9261);flag(g,.91,.59,.17,'france');
}

export function createGlobe() {
  const group = new THREE.Group();group.name='The little world';
  const sea = new THREE.Mesh(new THREE.SphereGeometry(R,96,64),toon(colors.sea));
  sea.receiveShadow=true;group.add(sea);
  // Soft rim, intentionally subtle so the silhouette still feels like a physical toy.
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R+.11,64,48),toon(0xb3f1e8,{transparent:true,opacity:.09,side:THREE.BackSide,depthWrite:false}));group.add(halo);
  continents.forEach(feature=>land(group,feature));
  // A softly scalloped polar cap completes the view when the player rotates the globe.
  const cap=new THREE.Mesh(new THREE.SphereGeometry(R+.047,64,8,0,Math.PI*2,Math.PI*.925,Math.PI*.075),toon(0xe8f1dd));group.add(cap);
  const northCap=new THREE.Mesh(new THREE.SphereGeometry(R+.03,64,5,0,Math.PI*2,0,Math.PI*.055),toon(0xe4eee0));group.add(northCap);

  // Miniature mountain chains, evergreen woods and desert dunes add tactile relief.
  [[28,82],[29,87],[31,93],[33,98],[45,8],[46,12],[-14,-73],[-21,-70],[-29,-70],[53,-121],[59,-130]].forEach(([lat,lon],i)=>{
    const g=local(group,lat,lon,.06);const h=.18+(i%3)*.055;
    cone(g,0,h*.48,0,.14,h,0x9fafa0,5,0);
    cone(g,0,h*.82,0,.061,h*.37,0xf4edcd,5,0);
  });
  [[60,31],[61,40],[59,50],[59,61],[57,78],[-3,-62],[-7,-57],[-9,-65],[7,23],[-4,29],[-23,146],[45,-77],[54,-108]].forEach(([lat,lon],i)=>{
    const g=local(group,lat,lon,.06);tree(g,0,0,.14,i%2?0x719b70:0x83ad76);
  });
  [[24,5],[23,13],[20,19],[25,24],[23,44],[-23,132],[-26,124]].forEach(([lat,lon],i)=>{
    const g=local(group,lat,lon,.06);sphere(g,0,.025,0,.2,0xddc388,1,.25,.46);sphere(g,.13,.02,.13,.13,0xe6cf97,1,.22,.5);
  });

  // Foam-blue brushstrokes live only on ocean: no latitude grid or generic map texture.
  const oceanSpots=[[0,-25],[10,-39],[-18,-23],[-34,-12],[31,-32],[44,-27],[12,62],[-11,66],[-25,79],[-36,53],[-4,89],[16,153],[-6,162],[-22,170],[35,-158],[9,-141],[-15,-120],[-38,-101],[47,-146],[24,-70],[-48,89],[-43,151],[7,132],[-3,48]];
  oceanSpots.forEach(([lat,lon],i)=>{
    const g=local(group,lat,lon,.025);g.rotateY((i%3-.5)*.3);
    const w=.20+(i%3)*.06;
    for(let row=0;row<2;row++)path(g,[[-w,.002,row*.095],[-w*.45,.005,row*.095-.035],[w*.1,.005,row*.095-.04],[w*.72,.002,row*.095]],i%4===0?0xc1ece0:0x98dcd9,.012,.82);
  });
  // Tiny sailing boat in the Indian Ocean.
  const boat=local(group,-15,54,.045);boat.rotateY(.45);
  const boatOrientation=boat.quaternion.clone();
  sphere(boat,0,.035,0,.15,0x426e77,.7,.5,1.8);
  beam(boat,[0,.06,0],[0,.59,0],.012,0xe4d1a8);
  const sailgeo=new THREE.BufferGeometry();sailgeo.setAttribute('position',new THREE.Float32BufferAttribute([0,.56,0,0,.12,-.22,0,.12,0],3));sailgeo.computeVertexNormals();boat.add(new THREE.Mesh(sailgeo,toon(0xfff1ce,{side:THREE.DoubleSide})));

  const clouds=[];
  [[56,-12,.52],[3,-10,.42],[-30,34,.46],[49,86,.45],[5,171,.52],[-26,-41,.45],[44,-98,.48],[-44,114,.42]].forEach(([lat,lon,s],i)=>{
    const g=local(group,lat,lon,.45+(i%3)*.1);g.rotateY(i*.6);
    sphere(g,0,0,0,s,0xfff4da,1,.30,.50);
    sphere(g,-s*.4,s*.11,0,s*.56,0xfff6e2,1,.52,.69);
    sphere(g,s*.2,s*.14,0,s*.65,0xfff8e7,1,.49,.66);
    clouds.push({object:g,origin:g.position.clone(),phase:i*1.7});
  });

  const definitions=[
    {id:'japan',lat:36.2,lon:139.5,color:0xe79aab,builder:japan,rotation:-.15},
    {id:'china',lat:35.8,lon:110.5,color:0xd8aa64,builder:china,rotation:.12},
    {id:'egypt',lat:26.7,lon:30.8,color:0xe6c383,builder:egypt,rotation:-.30},
    {id:'france',lat:47.5,lon:2.4,color:0xa6c993,builder:france,rotation:.1},
  ];
  const markers=definitions.map(def=>{
    const g=local(group,def.lat,def.lon,.11);g.name=`Visit ${def.id}`;g.rotateY(def.rotation);
    cyl(g,0,-.018,0,1.03,.94,.10,colors.cream,40);
    cyl(g,0,.036,0,.99,1.00,.065,def.color,40);
    torus(g,0,.07,0,1.00,.021,0xfff2cf);
    def.builder(g);
    packStatic(g);
    const target=new THREE.Mesh(new THREE.SphereGeometry(1.12,14,10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    target.position.y=.55;target.name=`country-hit-${def.id}`;target.userData.country=def.id;g.add(target);
    g.traverse(child=>{child.userData.country=def.id;});
    return {id:def.id,object:g,anchor:point(def.lat,def.lon,R+.17)};
  });
  // Clouds and the sailboat keep their own transforms for the update loop; country
  // groups keep their anchors, country IDs, and untouched transparent hit spheres.
  clouds.forEach(({object})=>packStatic(object));
  packStatic(boat);
  packStatic(group,new Set([boat,...clouds.map(({object})=>object),...markers.map(({object})=>object)]));
  let elapsed=0;
  return {
    group,markers,
    update(dt,time) {
      elapsed=Number.isFinite(time)?time:elapsed+(Number.isFinite(dt)?dt:0);
      clouds.forEach(({object,origin,phase})=>{object.position.copy(origin).multiplyScalar(1+Math.sin(elapsed*.55+phase)*.0028);});
      boat.quaternion.copy(boatOrientation).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.sin(elapsed*.75)*.06));
    }
  };
}
