/** One original side-part study: lifted roots and free, tapered front bundles. */
import * as THREE from 'three';
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function bundle(head,name,points,width,depth,color){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),p=[],ix=[],nu=12,nv=26;
 const origin=new THREE.Vector3(0,1.601,-.017),radii=new THREE.Vector3(.093,.119,.113);
 const onScalp=v=>v.clone().sub(origin).divide(radii).normalize().multiply(radii).add(origin);
 for(let j=0;j<=nv;j++){
  const t=j/nv,c=curve.getPoint(t),foot=onScalp(c),out=foot.clone().sub(origin).divide(radii).divide(radii).normalize(),tangent=curve.getTangent(t).normalize();
  const side=new THREE.Vector3().crossVectors(tangent,out).normalize();
  const taper=t<.22?mix(.50,1,smooth(t/.22)):mix(1,.008,smooth((t-.45)/.55));
  const height=Math.max(.006,c.clone().sub(foot).dot(out)+depth*.35),tip=smooth((t-.76)/.24);
  for(let i=0;i<=nu;i++){
   const a=i/nu*Math.PI*2,v=onScalp(foot.clone().addScaledVector(side,Math.cos(a)*width*.5*taper));
   const n=v.clone().sub(origin).divide(radii).divide(radii).normalize();
   v.addScaledVector(n,(.5+.5*Math.sin(a))*height*taper-.0015).lerp(c,tip*.22);p.push(v.x,v.y,v.z);
  }
 }
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();
 const n=g.attributes.normal;for(let j=0;j<=nv;j++){const a=j*(nu+1),b=a+nu,v=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}
 const m=new THREE.Mesh(g,{color:new THREE.Color(color),isMaterial:false});m.name='hair-framing-'+name;head.add(m);
}
export function reframePrototypeHair(head,hair){
 for(const m of [...head.children])if(m.name.startsWith('hair-')&&m.name!=='hair-fitted-underlayer'){m.removeFromParent();m.geometry.dispose();}
 const under=head.getObjectByName('hair-fitted-underlayer');if(under){const p=under.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*.96,p.getY(i),-.015+(p.getZ(i)+.015)*.94);under.geometry.computeVertexNormals();}
 const color=f=>new THREE.Color(hair).multiplyScalar(f).getHex();
 const strands=[
 ['front-left',[[.027,1.698,.068],[.003,1.731,.085],[-.034,1.721,.098],[-.063,1.680,.097],[-.065,1.620,.083]],.034,.021,1.06],
 ['front-inner',[[.027,1.695,.073],[.010,1.719,.100],[-.015,1.700,.118],[-.037,1.659,.112],[-.028,1.627,.096]],.022,.016,1.11],
 ['front-fine',[[.017,1.709,.091],[-.010,1.710,.117],[-.028,1.677,.126],[-.038,1.643,.111],[-.031,1.617,.092]],.010,.008,1.02],
 ['left-crown',[[.029,1.711,.030],[-.010,1.739,.032],[-.055,1.718,.047],[-.090,1.670,.054],[-.091,1.599,.026]],.040,.026,1.01],
 ['left-temple',[[.010,1.714,.067],[-.043,1.722,.072],[-.080,1.680,.082],[-.093,1.625,.057],[-.083,1.576,.021]],.025,.019,.97],
 ['right-front',[[.027,1.697,.070],[.049,1.724,.069],[.075,1.700,.080],[.083,1.661,.084],[.065,1.629,.092]],.029,.021,1.055],
 ['right-fine',[[.033,1.704,.083],[.052,1.706,.104],[.068,1.675,.107],[.070,1.642,.095],[.055,1.617,.090]],.013,.011,1.10],
 ['right-crown',[[.030,1.712,.020],[.066,1.728,.020],[.096,1.683,.032],[.104,1.625,.018],[.085,1.579,-.009]],.038,.026,1.00],
 ['back-left',[[.011,1.722,-.026],[-.038,1.730,-.041],[-.079,1.697,-.076],[-.096,1.636,-.093],[-.069,1.565,-.087]],.043,.023,.98],
 ['back-right',[[.032,1.710,-.026],[.073,1.710,-.045],[.105,1.652,-.063],[.091,1.595,-.090],[.059,1.554,-.093]],.038,.022,.96],
 ['back-center',[[0,1.726,-.030],[-.010,1.725,-.084],[-.015,1.673,-.125],[-.004,1.611,-.131],[.003,1.550,-.111]],.053,.025,.98]
 ];
 for(const [name,points,w,d,f]of strands)bundle(head,name,points,w,d,color(f));
}
