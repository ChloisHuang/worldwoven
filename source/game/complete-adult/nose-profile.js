/** Local art direction on the existing continuous head. Distances are metres;
 * semantics remain pinned to the raw hm08 feature coordinates. No X/Y scale,
 * eye movement, new surface, painted contour, or whole-forehead expansion. */
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
// Smooth profile corrections: support the nasal base, reduce the isolated bulb,
// then carry projection through the entire dorsum/root into the glabella.
const STATIONS=[
 [6.735,0],[6.750,.0034],[6.775,.0048],[6.800,.0048],
 [6.827,.0025],[6.855,.0004],[6.885,-.0020],[6.920,-.0030],
 [6.950,-.0030],[6.990,-.0020],[7.035,-.0008],[7.105,.0035],
 [7.200,.0048],[7.290,.0048],[7.350,.0042],[7.425,.0030],
 [7.500,.0015],[7.570,0]
];
function profile(y){
 if(y<=STATIONS[0][0]||y>=STATIONS.at(-1)[0])return 0;
 for(let i=0;i<STATIONS.length-1;i++){
  const a=STATIONS[i],b=STATIONS[i+1];if(y>b[0])continue;
  const previous=STATIONS[Math.max(0,i-1)],next=STATIONS[Math.min(STATIONS.length-1,i+2)],d=b[0]-a[0],t=(y-a[0])/d;
  const m0=i===0?0:(b[1]-previous[1])/(b[0]-previous[0]),m1=i===STATIONS.length-2?0:(next[1]-a[1])/(next[0]-a[0]);
  return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*d*m0+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*d*m1;
 }
 return 0;
}
function masks([x,y,z]){
 const root=smooth(7.14,7.36,y),center=(1-smooth(.035,.22-.05*root,Math.abs(x)))*smooth(1.38,1.50,z);
 const brow=smooth(7.34,7.39,y)*(1-smooth(7.47,7.61,y))*(1-smooth(.37,.57,Math.abs(x)))*smooth(1.20,1.40,z);
 return{center,brow};
}
export function neutralNoseProfileOffset(raw,form){
 const {center,brow}=masks(raw);
 // max avoids stacking the nasal-root and orbital supports at the inner brow.
 let nasal=profile(raw[1])*center;
 // The saved female sculpt already has an open nasal-base transition. Retain
 // that distinction instead of forcing the male correction onto both forms.
 if(form==='female'&&raw[1]<6.90&&nasal>0)nasal*=.35;
 return Math.max(nasal,.0024*brow)+Math.min(nasal,0);
}
export function noseHeightProfileOffset(raw,height,form){
 const {center,brow}=masks(raw),y=raw[1];
 // Height means the complete bridge. Neither endpoint advances the central
 // bulb. The base/columella and brow receive smaller coordinated support.
 const ridge=smooth(6.995,7.11,y)*(1-smooth(7.35,7.53,y))*center;
 const base=smooth(6.735,6.775,y)*(1-smooth(6.82,6.89,y))*center;
 return (height-1)*Math.max(.018*ridge,.0065*brow,.006*base*(form==='female'?.35:1));
}
