/** Coarse geometric horizon occlusion, evaluated from the same front surface.
 * No photo texture, painted feature mask, pores, or skin-color substitution.
 */
import * as THREE from 'three';
import {coherentFaceSurface} from './face-sculpt.mjs';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export function shadeSurfaceConcavities(head,{masc,traits,skin}){
 const minX=-.095,maxX=.095,minY=1.452,maxY=1.670,step=.0018;
 const nx=Math.ceil((maxX-minX)/step)+1,ny=Math.ceil((maxY-minY)/step)+1,field=new Float32Array(nx*ny);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)field[j*nx+i]=coherentFaceSurface(minX+i*step,minY+j*step,masc,traits);
 const zAt=(x,y)=>{
  const xx=clamp((x-minX)/step,0,nx-1.001),yy=clamp((y-minY)/step,0,ny-1.001),i=Math.floor(xx),j=Math.floor(yy),u=xx-i,v=yy-j;
  return(field[j*nx+i]*(1-u)+field[j*nx+i+1]*u)*(1-v)+(field[(j+1)*nx+i]*(1-u)+field[(j+1)*nx+i+1]*u)*v;
 };
 const m=head.getObjectByName('continuous-head-jaw-cheeks-nose'),p=m.geometry.attributes.position,n=m.geometry.attributes.normal,colors=[],base=new THREE.Color(skin);
 const directions=Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6),Math.sin(i*Math.PI/6)]);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nz=n.getZ(i);let occlusion=0;
  if(z>.025&&nz>.15&&y>1.470&&y<1.633){
   for(const[dx,dy]of directions){let horizon=0;
    for(const radius of[.004,.010,.018]){const dz=zAt(x+dx*radius,y+dy*radius)-z,dot=(n.getX(i)*dx*radius+n.getY(i)*dy*radius+nz*dz)/Math.hypot(radius,dz);horizon=Math.max(horizon,dot);}
    occlusion+=horizon;
   }
   occlusion=clamp(occlusion/directions.length*.95,0,.16)*clamp((nz-.15)/.35);
  }
  const c=base.clone().multiplyScalar(1-occlusion);colors.push(c.r,c.g,c.b);
 }
 m.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
}
