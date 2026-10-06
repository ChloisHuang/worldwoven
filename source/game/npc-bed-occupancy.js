// Life controllers choose the same authored bed/private room as before, then
// reserve one real sleeping place. Looking at candidates must not claim them.
export function bedAvailable(furniture,bed,actor,playerFacilityId=null){
 if(!bed||bed.kind!=='bed')return false;
 const f=(furniture.facilities?.state?.()||[]).find(f=>f.id===(bed.bedId||bed.id));
 if(f?.reservations.some(r=>r.actor===actor))return true;
 if(f?.player||f?.queue.length&&f.queue[0]!==actor)return false;
 const slots=bed.berths?.map(b=>b.berthId)||f?.slots||[bed.id];
 if(slots.length===1&&playerFacilityId===bed.id)return false;
 return slots.some(id=>!f?.reservations.some(r=>r.seatId===id));
}

export function reserveNpcBed(furniture,bed,actor,berthId=bed?.berthId){
 if(!bed||bed.kind!=='bed')return null;
 if(furniture.resolveBed)return furniture.resolveBed(bed,actor,b=>!berthId||b.berthId===berthId);
 // Older reduced scenes have only a parent descriptor and one queue slot.
 if(berthId||bed.berths)return null;
 return furniture.facilities?.reserve?.(bed.id,actor,{purpose:'rest'})?bed:null;
}

export function occupyNpcBed(furniture,bed,actor){
 if(furniture.occupyBed)return furniture.occupyBed(bed,actor);
 return !bed.berthId&&!bed.berths&&!!furniture.facilities?.occupy?.(bed.id,actor);
}
