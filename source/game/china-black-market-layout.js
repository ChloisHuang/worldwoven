// CR05: the original market keeps its goods, room identity and furnishings,
// but now lives below the civilian Yunlai dining room, off its west-side lane.
export const BLACK_MARKET_OFFSET=Object.freeze([29,0,-17]);
export const marketPoint=([x,y,z])=>[x+29,y,z-17];
export const marketBounds=b=>({...b,minX:b.minX+29,maxX:b.maxX+29,minZ:b.minZ-17,maxZ:b.maxZ-17});
export const BLACK_MARKET_STAIRS=Object.freeze({
 hole:{minX:13.1,maxX:15.5,minZ:11.7,maxZ:20},
 entrance:[14.3,.115,11],top:[14.3,.115,11.7],bottom:[14.3,-4.1,18.7],
 landing:[14.3,-4.1,19.15],roomEntry:[16.65,-4.1,19.15]
});
export function blackMarketGroundPieces(bounds){
 const cut=BLACK_MARKET_STAIRS.hole,l=Math.max(bounds.minX,cut.minX),r=Math.min(bounds.maxX,cut.maxX),n=Math.max(bounds.minZ,cut.minZ),b=Math.min(bounds.maxZ,cut.maxZ);
 if(l>=r||n>=b)return [{...bounds}];
 const pieces=[];
 if(bounds.minX<l)pieces.push({...bounds,maxX:l});
 if(r<bounds.maxX)pieces.push({...bounds,minX:r});
 if(bounds.minZ<n)pieces.push({...bounds,minX:l,maxX:r,maxZ:n});
 if(b<bounds.maxZ)pieces.push({...bounds,minX:l,maxX:r,minZ:b});
 return pieces;
}
const oldMarketPoint=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)&&p[0]>=-12.7&&p[0]<=-3.27&&p[2]>=29.27&&p[2]<=37.13&&p[1]>=-4.6&&p[1]<-1;
// Only live continuation coordinates move. Historical crime locations, custody,
// stock ownership, receipts and every other region remain byte-for-byte intact.
// The old and new volumes do not overlap, so a repeated load is idempotent.
export function migrateChinaBlackMarketSave(saved){
 if(!saved||typeof saved!=='object')return false;
 let changed=false;
 const field=(row,key)=>{if(row&&oldMarketPoint(row[key])){row[key]=marketPoint(row[key]);changed=true;}};
 const objectPoint=(row,key)=>{const p=row?.[key];if(p&&oldMarketPoint([p.x,p.y,p.z])){const [x,y,z]=marketPoint([p.x,p.y,p.z]);row[key]={...p,x,y,z};changed=true;}};
 const region=saved.worldContinuity?.version===1?saved.worldContinuity.regions?.china:null;
 if(region?.version===1&&region.region==='china'){
  for(const actor of [region.player,...Object.values(region.actors||{})]){field(actor,'position');field(actor,'target');}
  field(region.activity,'destination');
 }
 objectPoint(saved.undergroundMarketSession?.session,'origin');
 objectPoint(saved.undergroundMarketSession?.action,'origin');
 return changed;
}
