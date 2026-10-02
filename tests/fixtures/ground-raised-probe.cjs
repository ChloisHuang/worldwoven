// Initialize a historical test probe on the actual raised support at its same XZ.
// No runtime motion, collider, body radius or route is modified. Upper storeys
// outside the nearest floor band are excluded, while its rug top is retained.
module.exports=function groundRaisedProbe(lot,p){
 const heights=[...(lot.walkableSurfaces||[]),...(lot.group?.userData?.rugSurfaces||[])].filter(s=>p[0]>=s.minX-1e-6&&p[0]<=s.maxX+1e-6&&p[2]>=s.minZ-1e-6&&p[2]<=s.maxZ+1e-6).map(s=>s.axis&&Number.isFinite(s.endY)?s.y+(s.endY-s.y)*((s.axis==='x'?p[0]-s.minX:p[2]-s.minZ)/(s.axis==='x'?s.maxX-s.minX:s.maxZ-s.minZ)):s.y);
 if(!heights.length)throw Error('Raised doorway probe has no authored support: '+JSON.stringify(p));
 const nearest=heights.reduce((a,b)=>Math.abs(a-p[1])<=Math.abs(b-p[1])?a:b),y=Math.max(...heights.filter(h=>Math.abs(h-nearest)<=.4));return[p[0],y,p[2]];
};
