/** Prototype female court-gown fit. Call after createApprovedSurfaces, before
 * batching. Existing colors, body preset, skirt, hands and skeleton are kept.
 */
import * as THREE from 'three';
import {armWidthAtHeight,createRelaxedArmOffset} from '../../source/game/approved-surfaces.js';
import {addFemaleHair} from './female-hair.mjs';
export {addFemaleHair} from './female-hair.mjs';
const mix=(a,b,t)=>a+(b-a)*t,clamp=x=>Math.max(0,Math.min(1,x));
const BODY={'feminine-balanced':{hip:1.055,waist:.925,chest:1,shoulder:.90,depth:1.01},'feminine-slender':{hip:1.015,waist:.875,chest:.965,shoulder:.87,depth:.955}};
const BODICE=[[1.066,.140,.084,0,-.001],[1.12,.143,.085,0,-.003],[1.20,.160,.091,0,-.009],[1.28,.174,.079,0,-.012],[1.323,.171,.071,0,-.010],[1.350,.148,.059,0,-.007],[1.377,.102,.047,0,-.003],[1.398,.044,.035,0,-.001],[1.403,.038,.032,0,-.002]];
const SLEEVE=[[1.158,.046,.051,.265,-.005],[1.220,.058,.063,.243,-.006],[1.280,.060,.066,.207,-.011],[1.316,.044,.057,.177,-.010],[1.340,.025,.035,.152,-.008],[1.357,.002,.004,.121,-.006]];
function spline(rows,t){const j=Math.min(rows.length-2,Math.floor(t)),u=t-j,a=rows[Math.max(0,j-1)],b=rows[j],c=rows[j+1],d=rows[Math.min(rows.length-1,j+2)];return b.map((x,k)=>.5*(2*x+(-a[k]+c[k])*u+(2*a[k]-5*x+4*c[k]-d[k])*u*u+(-a[k]+3*x-3*c[k]+d[k])*u*u*u));}
function section(y){let lo=0,hi=BODICE.length-1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(spline(BODICE,t)[0]<y)lo=t;else hi=t;}return spline(BODICE,(lo+hi)/2);}
function frontAt(x,y){const r=section(y);return r[4]+r[2]*Math.sqrt(Math.max(.002,1-(x/r[1])**2));}
function shaped([x,y,z],opts,arm){const d=BODY[opts.bodyPreset],f=arm?armWidthAtHeight(y,opts.bodyPreset):y<1.075?mix(d.hip,d.waist,(y-.85)/.225):y<1.23?mix(d.waist,d.chest,(y-1.075)/.155):y<1.335?mix(d.chest,d.shoulder,(y-1.23)/.105):mix(d.shoulder,1,clamp((y-1.335)/.09)),o=arm?opts.offset(y):[0,0,0];return[x*f+Math.sign(x)*o[0],y+o[1],z*(y<1.38?d.depth:1)+o[2]];}
function grid(nu,nv,fn,opts,arm=false,closed=false){const p=[],sy=[],ix=[];for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){const q=fn(u/nu,v/nv);sy.push(q[1]);p.push(...shaped(q,opts,arm));}for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){const a=v*(nu+1)+u,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('sourceY',new THREE.Float32BufferAttribute(sy,1));g.setIndex(ix);g.computeVertexNormals();if(closed){const n=g.attributes.normal;for(let v=0;v<=nv;v++){const a=v*(nu+1),b=a+nu,t=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize();n.setXYZ(a,t.x,t.y,t.z);n.setXYZ(b,t.x,t.y,t.z);}}g.computeBoundingBox();g.computeBoundingSphere();return g;}
function loft(rows,opts,side=0){return grid(32,28,(u,v)=>{const r=spline(rows,v*(rows.length-1)),a=u*Math.PI*2;return[side*r[3]+r[1]*Math.sin(a),r[0],r[4]+r[2]*Math.cos(a)];},opts,side!==0,true);}
function trim(points,width,opts,raise=.003){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],p[1],0)));return grid(2,24,(u,v)=>{const p=curve.getPoint(v),t=curve.getTangent(v),x=p.x+(u-.5)*width*t.y,y=p.y-(u-.5)*width*t.x;return[x,y,frontAt(x,y)+raise];},opts);}
export function applyFemaleSilhouette(root,options={}){
 const opts={culture:'france',bodyPreset:'feminine-slender',wardrobePreset:'court-gown',...options};
 if(!BODY[opts.bodyPreset])return null;
 const head=root.getObjectByName('sculpted-head');if(head)addFemaleHair(head,opts.hair??0x44342f,opts.hairFit??{});
 if(opts.culture!=='france'||!['court-gown','court-overgown'].includes(opts.wardrobePreset)||(opts.shapeTraits?.legLength??1)!==1)return{hair:head?.userData.femaleHair,garment:false};
 opts.offset=createRelaxedArmOffset(opts.bodyPreset,opts.wardrobePreset,1);const changed=[];
 const replace=(name,g)=>{const m=root.getObjectByName(name);if(!m){g.dispose();return;}m.geometry.dispose();m.geometry=g;m.userData.femaleGarmentFit=true;changed.push(name);};
 replace('fitted-court-bodice',loft(BODICE,opts));
 for(const side of[-1,1]){
  // The inherited short shirt sleeve sits inside the gown puff and makes a
  // second hard shoulder contour. The replacement puff is the complete sleeve.
  const old=root.getObjectByName('short-sleeve-'+side);if(old){old.removeFromParent();old.geometry.dispose();}
  replace('court-puffed-sleeve-'+side,loft(SLEEVE,opts,side));
  replace('court-square-neckline-'+side,trim([[side*.030,1.400],[side*.061,1.373],[side*.079,1.332],[side*.065,1.294],[0,1.290]],.011,opts));
 }
 replace('court-lace-front',trim([[0,1.287],[0,1.184],[0,1.090]],.016,opts,.0035));
 root.userData.femaleSilhouette={prototypeOnly:true,garment:'court-gown',changed,hair:head?.userData.femaleHair};return root.userData.femaleSilhouette;
}
