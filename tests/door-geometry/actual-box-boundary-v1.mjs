// China-specific source-reviewed BoxGeometry reconstruction from EXISTING
// rendered triangles. Never creates, snaps or substitutes a geometric face.
import * as K from './triangle-kernel-v3.mjs';
export function selectActualBoxBoundary({box,rows,eps}){
 const groups=new Map(),ids=p=>{let id=0;for(let axis=0;axis<3;axis++){const low=Math.abs(p[axis]-box.min[axis])<=eps,high=Math.abs(p[axis]-box.max[axis])<=eps;if(low===high)return null;if(high)id|=1<<axis;}return id;};
 for(const row of rows){const cs=row.t.map(ids);if(cs.some(c=>c===null)||new Set(cs).size!==3)continue;
  let face=null;for(let axis=0;axis<3;axis++)if(cs.every(c=>(c&(1<<axis))===(cs[0]&(1<<axis)))){if(face!==null){face=null;break;}face={axis,high:!!(cs[0]&(1<<axis))};}
  if(!face)continue;const n=K.cross(K.sub(row.t[1],row.t[0]),K.sub(row.t[2],row.t[0])),length=K.len(n);if(length<=eps*eps)continue;
  const outward=face.high?1:-1;if(n[face.axis]*outward/length<1-1e-7)continue;
  const groupKey=row.mesh+':'+(row.instance??'none');if(!groups.has(groupKey))groups.set(groupKey,{mesh:row.mesh,instance:row.instance??null,faces:new Map()});const g=groups.get(groupKey),fk=face.axis+':'+Number(face.high);if(!g.faces.has(fk))g.faces.set(fk,new Map());const key=[...cs].sort((a,b)=>a-b).join(',');
  // Identical corner triples with the same outward normal represent the same
  // face triangle; retaining one actual instance does not invent a surface.
  if(!g.faces.get(fk).has(key))g.faces.get(fk).set(key,{row,corners:cs});
 }
 const rejected=[];
 for(const [groupKey,g] of groups){const selected=[],faces=[];let complete=true;
  for(let axis=0;axis<3;axis++)for(const high of[0,1]){const choices=[...(g.faces.get(axis+':'+high)?.values()??[])];let pair=null;
   for(let i=0;i<choices.length&&!pair;i++)for(let j=i+1;j<choices.length;j++){const a=choices[i],b=choices[j],common=a.corners.filter(c=>b.corners.includes(c)),all=new Set([...a.corners,...b.corners]);if(all.size===4&&common.length===2&&(common[0]^common[1])===(7^(1<<axis))){pair=[a,b];break;}}
   if(!pair){complete=false;faces.push({axis,high,complete:false,cornerTriangles:choices.length});continue;}selected.push(...pair.map(p=>p.row));faces.push({axis,high,complete:true,triangleIds:pair.map(p=>p.row.triangle),cornerIds:pair.map(p=>p.corners)});
  }
  if(!complete||selected.length!==12){rejected.push({groupKey,faces});continue;}
  // Six complete rectangles, each split along its actual shared diagonal,
  // give the exact closed cuboid boundary known to be emitted by G.box.
  return {accepted:true,rows:selected,proof:{method:'Twelve existing outward rendered corner triangles, six complete rectangle faces, one mesh/instance; no synthetic triangles or EPS enlargement',mesh:g.mesh,instance:g.instance,faces,worldTriangles:selected.map(r=>({staticPath:r.path,staticTriangle:r.triangle,t:r.t,normal:r.normal})),selectedTriangles:12}};
 }
 return {accepted:false,rows:[],proof:{method:'Complete actual 12-triangle box boundary required',reason:'No single mesh/instance supplied all six complete outward corner faces',rejectedGroups:rejected}};
}
