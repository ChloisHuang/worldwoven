/**
 * Hand props for the approved adult character rig.
 *
 * All shapes reproduce the existing activity props at 80% of their former size.
 * Each hidden prop group owns one mesh. Geometry, its vertex colors, the single
 * toon material, and its four-band ramp are immutable module-lifetime resources.
 * Instances own only their groups/meshes/transforms/visibility. Generic character
 * disposal must skip resources with userData.characterShared === true.
 * No imports are needed: the rig supplies its existing THREE namespace.
 */
const PROP_SCALE = 0.8;
let cache = null;

function buildTemplates(THREE) {
  const gradient = new THREE.DataTexture(
    new Uint8Array([100, 166, 220, 255]), 4, 1, THREE.RedFormat
  );
  gradient.name = 'character-props-gradient4';
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  gradient.userData.characterShared = true;
  const material = new THREE.MeshToonMaterial({
    color: 0xffffff, vertexColors: true, gradientMap: gradient
  });
  material.name = 'character-props-toon';
  material.userData.characterShared = true;
  const drafts = [];
  function prop(name, left = false) {
    const group = new THREE.Group();
    group.name = name;
    drafts.push({ name, left, group });
    return group;
  }
  function part(group, geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.userData.propColor = color;
    group.add(mesh);
    return mesh;
  }
  const G = {
    box(g, x, y, z, w, h, d, c, ry = 0) {
      const m = part(g, new THREE.BoxGeometry(w, h, d), c, x, y, z);
      m.rotation.y = ry;
      return m;
    },
    cyl(g, x, y, z, rt, rb, h, c, segments = 12) {
      return part(g, new THREE.CylinderGeometry(rt, rb, h, segments), c, x, y, z);
    },
    sphere(g, x, y, z, r, c, sx = 1, sy = 1, sz = 1) {
      const m = part(g, new THREE.SphereGeometry(r, 12, 8), c, x, y, z);
      m.scale.set(sx, sy, sz);
      return m;
    },
    cone(g, x, y, z, r, h, c, segments = 4, ry = Math.PI / 4) {
      const m = part(g, new THREE.ConeGeometry(r, h, segments), c, x, y, z);
      m.rotation.y = ry;
      return m;
    },
    torus(g, x, y, z, r, tube, c, rx = Math.PI / 2) {
      const m = part(g, new THREE.TorusGeometry(r, tube, 6, 24), c, x, y, z);
      m.rotation.x = rx;
      return m;
    }
  };
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

  const templates = drafts.map(({ name, left, group }) => {
    const geometry = mergeParts(THREE, group.children);
    geometry.name = `character-prop-${name}`;
    geometry.userData.characterShared = true;
    geometry.userData.characterImmutable = true;
    const position = group.position.clone().multiplyScalar(PROP_SCALE);
    const quaternion = group.quaternion.clone();
    return Object.freeze({ name, left, geometry, position, quaternion });
  });
  return Object.freeze({ THREE, templates: Object.freeze(templates), material });
}

/** Merge local component transforms, colors, and normals into one indexed mesh. */
function mergeParts(THREE, parts) {
  const vertexCount = parts.reduce((n, p) => n + p.geometry.attributes.position.count, 0);
  const indexCount = parts.reduce((n, p) => n + (p.geometry.index?.count ?? p.geometry.attributes.position.count), 0);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const indices = vertexCount <= 65536 ? new Uint16Array(indexCount) : new Uint32Array(indexCount);
  const color = new THREE.Color();
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const mesh of parts) {
    mesh.updateMatrix();
    // Draft component geometry has no other owners and is released after copying.
    const source = mesh.geometry;
    source.applyMatrix4(mesh.matrix);
    source.scale(PROP_SCALE, PROP_SCALE, PROP_SCALE);
    const p = source.attributes.position;
    const n = source.attributes.normal;
    color.setHex(mesh.userData.propColor);
    for (let i = 0; i < p.count; i++) {
      const j = (vertexOffset + i) * 3;
      positions[j] = p.getX(i); positions[j + 1] = p.getY(i); positions[j + 2] = p.getZ(i);
      normals[j] = n.getX(i); normals[j + 1] = n.getY(i); normals[j + 2] = n.getZ(i);
      colors[j] = color.r; colors[j + 1] = color.g; colors[j + 2] = color.b;
    }
    const count = source.index?.count ?? p.count;
    for (let i = 0; i < count; i++) {
      indices[indexOffset++] = vertexOffset + (source.index ? source.index.getX(i) : i);
    }
    vertexOffset += p.count;
    source.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * @param {object} THREE The same Three.js namespace used by the character rig.
 * @returns {{right: object, left: object, tools: Object<string, object>}}
 * Attach right to hands[1], left to hands[0]. Set tools[name].visible per action.
 * Right/left remain independently rotatable to counter-rotate upright vessels.
 */
export function createHandProps(THREE) {
  if (!cache) cache = buildTemplates(THREE);
  if (cache.THREE !== THREE) {
    throw new Error('createHandProps requires one shared THREE namespace per module');
  }
  const right = new THREE.Group();
  const left = new THREE.Group();
  right.name = 'character-right-hand-props';
  left.name = 'character-left-hand-props';
  const tools = {};
  for (const template of cache.templates) {
    const group = new THREE.Group();
    group.name = template.name;
    group.visible = false;
    group.position.copy(template.position);
    group.quaternion.copy(template.quaternion);
    const mesh = new THREE.Mesh(template.geometry, cache.material);
    mesh.name = `${template.name}-mesh`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    (template.left ? left : right).add(group);
    tools[template.name] = group;
  }
  return { right, left, tools };
}

/**
 * Intentional no-op for instance disposal: all GPU resources are shared for the
 * lifetime of this module. The owning rig may detach/discard its right/left groups.
 * Never dispose their geometry, material, or gradient texture per character.
 */
export function disposeHandProps(_instance) {}
