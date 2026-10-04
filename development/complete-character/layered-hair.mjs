/** Original loose side-part sculpt. Y-up, face +Z, dimensions in metres.
 * No textures, transparent cards, copied meshes or per-frame construction.
 * Broad overlapping forms share a continuous root mass; small locks occur only
 * at the silhouette. The module returns one indexed, vertex-coloured mesh.
 */
import * as THREE from 'three';
const BASE_CENTER=[0,1.600,-.017], BASE_RADII=[.090,.117,.105];
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gaussian=(x,c,w)=>Math.exp(-(((x-c)/w)**2));
const V=p=>new THREE.Vector3(...p);

// Each path is a deliberately authored flow from the off-centre part/crown.
// Width and thickness are independent: these are flattened locks, not tubes.
const LOCKS=[
 ['sweep-outer',[[.026,1.718,.036],[.000,1.733,.061],[-.045,1.714,.086],[-.079,1.666,.076],[-.078,1.603,.049]],.040,.0060,1.00],
 ['sweep-main',[[.027,1.716,.052],[.009,1.738,.078],[-.025,1.720,.103],[-.053,1.675,.110],[-.052,1.624,.092]],.033,.0064,1.035],
 ['sweep-front',[[.028,1.710,.066],[.014,1.732,.098],[-.010,1.704,.121],[-.022,1.664,.117],[-.017,1.628,.101]],.023,.0045,1.07],
 ['loose-front',[[.005,1.721,.091],[-.014,1.696,.122],[-.026,1.659,.121],[-.026,1.635,.108],[-.015,1.616,.093]],.010,.0025,1.03],
 ['part-short',[[.032,1.712,.056],[.058,1.726,.070],[.080,1.696,.083],[.089,1.656,.076],[.076,1.618,.068]],.029,.0053,1.02],
 ['part-fringe',[[.033,1.708,.072],[.052,1.716,.094],[.066,1.686,.107],[.067,1.654,.099],[.057,1.634,.090]],.015,.0033,1.055],
 ['left-temple',[[.009,1.726,.022],[-.043,1.727,.033],[-.083,1.689,.053],[-.099,1.632,.035],[-.090,1.579,.011]],.033,.0048,.99],
 ['left-ear-front',[[ -.041,1.707,.061],[-.077,1.682,.072],[-.094,1.641,.055],[-.096,1.609,.032],[-.088,1.592,.019]],.017,.0036,1.03],
 ['right-temple',[[.031,1.722,.004],[.070,1.722,.018],[.097,1.683,.029],[.104,1.633,.008],[.093,1.605,-.005]],.030,.0049,.99],
 ['right-ear-front',[[.066,1.700,.063],[.090,1.677,.066],[.102,1.639,.045],[.102,1.617,.024],[.094,1.586,.011]],.017,.0030,1.025],
 ['crown-left',[[.024,1.728,-.012],[-.028,1.736,-.023],[-.075,1.705,-.044],[-.101,1.660,-.055],[-.098,1.616,-.067]],.044,.0055,1.01],
 ['crown-right',[[.031,1.718,-.022],[.067,1.723,-.039],[.094,1.685,-.058],[.101,1.635,-.072],[.081,1.585,-.082]],.038,.0048,1.00],
 ['back-left',[[.004,1.725,-.041],[-.039,1.716,-.081],[-.071,1.675,-.108],[-.075,1.614,-.115],[-.053,1.561,-.097]],.041,.0050,.985],
 ['back-middle',[[.019,1.722,-.038],[.007,1.706,-.098],[-.013,1.664,-.129],[-.018,1.608,-.131],[-.003,1.547,-.105]],.044,.0048,1.005],
 ['back-right',[[.034,1.715,-.045],[.054,1.690,-.099],[.064,1.646,-.122],[.049,1.593,-.126],[.030,1.550,-.100]],.035,.0043,.995],
 ['left-nape-tip',[[-.083,1.665,-.075],[-.102,1.635,-.091],[-.101,1.605,-.103],[-.083,1.574,-.108],[-.076,1.552,-.093]],.020,.0030,.99]
];

export function createLayeredHairGeometry({center=BASE_CENTER,radii=BASE_RADII,color=0x44342f}={}){
 const positions=[],indices=[],colors=[],flow=[],root=V(BASE_CENTER),r=V(BASE_RADII),baseColor=new THREE.Color(color);
 function add(p,value=1,u=0,v=0){positions.push(...p);const c=baseColor.clone().multiplyScalar(value);colors.push(c.r,c.g,c.b);flow.push(u,v,1);return positions.length/3-1;}
 // A close scalp envelope, completely covered at the forehead by the swept
 // fringe. The ear edge is an arch with asymmetric sideburn/nape termination.
 const columns=48,rows=14;
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  const a=i/columns*Math.PI*2,signed=a>Math.PI?a-Math.PI*2:a,abs=Math.abs(signed);
  const ear=gaussian(abs,1.63,.30),front=gaussian(signed,0,.75);
  let edge=1.565+.087*front+.047*ear;
  edge+=.0035*Math.sin(a*5+.5)+.002*Math.sin(a*9);
  // No straight side cut: sweep the temple into an irregular ear opening.
  const phiMax=Math.acos(Math.max(-.99,Math.min(.99,(edge-BASE_CENTER[1])/BASE_RADII[1]))),phi=phiMax*j/rows;
  const q=new THREE.Vector3(Math.sin(phi)*Math.sin(a),Math.cos(phi),Math.sin(phi)*Math.cos(a));
  const direction=q.clone().divide(r).normalize();
  const crown=smooth(.26,.84,q.y),part=gaussian(q.x,.27,.085)*gaussian(q.z,.17,.64)*crown;
  const lift=.0035+.0065*crown-.0030*part;
  const p=q.multiply(r).add(root).addScaledVector(direction,lift);
  add(p.toArray(),.975, j/rows, i/columns);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);
 }
 for(const [name,points,width,depth,value] of LOCKS){
  const curve=new THREE.CatmullRomCurve3(points.map(V),false,'centripetal'),start=positions.length/3,steps=16,sides=8;
  for(let j=0;j<=steps;j++){
   const t=j/steps,p=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
   const radial=p.clone().sub(root).divide(r).divide(r).normalize();
   const side=new THREE.Vector3().crossVectors(tangent,radial).normalize(),out=new THREE.Vector3().crossVectors(side,tangent).normalize();
   const taper=(.67+.33*smooth(0,.18,t))*(1-.995*smooth(.39,1,t));
   const thickness=depth*(.60+.40*Math.sin(Math.PI*t))*(1-.98*smooth(.69,1,t));
   for(let k=0;k<=sides;k++){
    const a=k/sides*Math.PI*2,across=Math.cos(a),round=Math.sin(a);
    const point=p.clone().addScaledVector(side,across*width*.5*taper).addScaledVector(out,round*thickness);
    // Small continuous longitudinal planes catch the cel light. No incised
    // dark lines or independently extruded strand ridges are required.
    add(point.toArray(),value,t,k/sides);
   }
  }
  for(let j=0;j<steps;j++)for(let k=0;k<sides;k++){
   const a=start+j*(sides+1)+k,b=a+1,c=a+sides+1,d=c+1;indices.push(a,b,c,b,d,c);
  }
 }
 // One fit transform, allowing the complete head owner to tune width, height,
 // depth and location without maintaining a second version of the hairstyle.
 for(let i=0;i<positions.length;i+=3)for(let k=0;k<3;k++)positions[i+k]=center[k]+(positions[i+k]-BASE_CENTER[k])*radii[k]/BASE_RADII[k];
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('featureCoord',new THREE.Float32BufferAttribute(flow,3));g.setIndex(indices);g.computeVertexNormals();
 // Average the duplicated seams so all locks read as flattened solid forms.
 const n=g.attributes.normal;let offset=(columns+1)*(rows+1);
 for(let j=0;j<=rows;j++){const a=j*(columns+1),b=a+columns,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
 for(const lock of LOCKS){for(let j=0;j<=16;j++){const a=offset+j*9,b=a+8,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}offset+=17*9;}
 g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:'loose-asymmetrical-side-part',triangles:indices.length/3,locks:LOCKS.length};return g;
}

/** Replace only head hair. The placeholder matches Worldwoven's mesh batcher. */
export function addLayeredHair(head,color=0x44342f,fit={}){
 for(const child of [...head.children])if(child.isMesh&&/^(hair-|fringe|combed|side-lock|side-flow)/.test(child.name)){child.removeFromParent();child.geometry.dispose();}
 const geometry=createLayeredHairGeometry({...fit,color});
 const material=fit.material??{color:new THREE.Color(color),isMaterial:false};
 const mesh=new THREE.Mesh(geometry,material);mesh.name='hair-layered-loose-side-part';mesh.userData.softSkin=true;mesh.userData.layeredHair=true;head.add(mesh);head.userData.layeredHair={...geometry.userData,center:fit.center??BASE_CENTER,radii:fit.radii??BASE_RADII};return mesh;
}
