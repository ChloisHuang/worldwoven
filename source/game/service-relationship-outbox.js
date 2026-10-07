// The business save owns delivery. A relationship-store failure cannot erase
// its source event; retries use the same ID and acknowledge only durable saves.
export function createServiceRelationshipOutbox(onRelationshipEvent=()=>({ok:false})){
 const acknowledged=new Set();
 return {
  merge(saved=[],events=[]){return [...new Map([...events,...saved].filter(e=>e&&!acknowledged.has(e.id)).map(e=>[e.id,e])).values()];},
  deliver(events=[]){for(const event of events){if(!event||acknowledged.has(event.id))continue;try{if(onRelationshipEvent(JSON.parse(JSON.stringify(event)))?.ok===true)acknowledged.add(event.id);}catch{/* retry from the durable business record */}}},
 };
}
export function serviceRelationshipEvent(source,orderId,outcome,actorId,customerId,at,extra={}){
 if(!actorId||!customerId||actorId===customerId)return null;
 return {id:`${source}:${orderId}:${actorId}:${outcome}`,source,outcome,actorId,participants:[actorId,customerId],kind:'service',at:Number.isFinite(at)?at:0,...extra};
}
