// TR03: one durable journey owns its ordered checkpoints and passport marks.
// Legacy visits are deliberately absent: only a trusted current country can
// seed a new ledger, and only newly committed events can produce dated marks.
export const TRAVEL_REGIONS = Object.freeze(['japan','china','egypt','france']);
export const TRAVEL_STAGES = Object.freeze(['planned','departure-cleared','flying','entry-pending','entry-cleared','arrived','cancelled']);
const ACTIONS = Object.freeze(['begin','departure','board','land','entry','arrive']);
const copy = value => structuredClone(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const region = value => TRAVEL_REGIONS.includes(value);
const origin = value => value === null || region(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value,names) => record(value) && Object.keys(value).length === names.length && names.every(k=>Object.hasOwn(value,k));
const validClock = value => record(value) && integer(value.day) && Number.isFinite(value.hour) && value.hour >= 0 && value.hour < 24;
const freeze = value => { Object.freeze(value); for (const part of Object.values(value)) if (part && typeof part === 'object') freeze(part); return value; };
const blank = initialRegion => ({version:1,revision:0,serial:0,initialRegion,currentRegion:initialRegion,activeId:null,journeys:[]});
const terminal = stage => stage === 'arrived' || stage === 'cancelled';
const stageFor = action => action === 'cancel' ? 'cancelled' : TRAVEL_STAGES[ACTIONS.indexOf(action)];

function restore(saved,initialRegion=null) {
  if (saved == null) return blank(initialRegion);
  if (!keys(saved,['version','revision','serial','initialRegion','currentRegion','activeId','journeys']) || saved.version !== 1 ||
      !integer(saved.revision) || !integer(saved.serial) || !origin(saved.initialRegion) || !origin(saved.currentRegion) ||
      !Array.isArray(saved.journeys) || saved.serial !== saved.journeys.length) throw Error('invalid-travel-journey');
  let currentRegion=saved.initialRegion,activeId=null,revision=0;
  for (const [index,j] of saved.journeys.entries()) {
    if (activeId || !keys(j,['id','from','to','stage','events']) || j.id !== `travel-journey-${index+1}` ||
        j.from !== currentRegion || !region(j.to) || j.from === j.to || !TRAVEL_STAGES.includes(j.stage) ||
        !Array.isArray(j.events) || !j.events.length || j.events.length > ACTIONS.length) throw Error('invalid-travel-journey');
    let stage=null;
    for (const [step,event] of j.events.entries()) {
      const action=event?.action;
      if (!keys(event,['id','journeyId','action','from','to','day','hour']) || !validClock(event) ||
          event.id !== `${j.id}:${action}` || event.journeyId !== j.id || event.from !== j.from || event.to !== j.to ||
          !(action === ACTIONS[step] || step === 1 && j.events.length === 2 && action === 'cancel')) throw Error('invalid-travel-journey');
      stage=stageFor(action);revision++;
    }
    if (j.stage !== stage) throw Error('invalid-travel-journey');
    if (j.stage === 'arrived') currentRegion=j.to;
    else if (!terminal(j.stage)) activeId=j.id;
  }
  if (saved.revision !== revision || saved.currentRegion !== currentRegion || saved.activeId !== activeId) throw Error('invalid-travel-journey');
  return copy(saved);
}

function projection(current,loadError=null,lastError=null) {
  const journeys=copy(current.journeys),stamps=[];
  for (const j of journeys) for (const e of j.events) {
    const kind=e.action === 'entry' ? 'entry' : e.action === 'departure' && j.from !== null ? 'exit' : null;
    if (kind) stamps.push({id:`${j.id}:${kind}`,journeyId:j.id,kind,regionId:kind === 'exit' ? j.from : j.to,from:j.from,to:j.to,day:e.day,hour:e.hour});
  }
  return {revision:current.revision,currentRegion:current.currentRegion,active:journeys.find(j=>j.id === current.activeId)||null,journeys,stamps,loadError,lastError};
}

// The passport may project a cold save without opening a writable controller.
// A malformed ledger produces no partial or guessed records and stays locked.
export function travelJourneyView(saved) {
  try { return projection(restore(saved)); }
  catch { return projection(blank(null),'invalid-travel-journey'); }
}

/**
 * saveState(next, {action,journey,event}) must synchronously persist the complete
 * candidate and return exactly true. Arguments are detached and deeply frozen.
 * The arrive candidate lets the host add its visit and world snapshot in that
 * same save; render/scene side effects follow only a successful result.
 */
export function createTravelJourney({saved=null,initialRegion=null,getClock,saveState}={}) {
  if (!origin(initialRegion)) throw TypeError('initialRegion must be a known country or null');
  if (getClock !== undefined && typeof getClock !== 'function') throw TypeError('getClock must be a function');
  if (saveState !== undefined && typeof saveState !== 'function') throw TypeError('saveState must be a function');
  let current,loadError=null,lastError=null,busy=false;
  try { current=restore(saved,initialRegion); }
  catch { current=blank(null);loadError='invalid-travel-journey'; }
  const view = () => projection(current,loadError,lastError);
  const failure = code => { lastError=code;return {ok:false,code,view:view()}; };
  const success = (journey,event,replayed=false,extra={}) => { lastError=null;return {ok:true,replayed,journey:journey ? copy(journey) : null,event:event ? copy(event) : null,...extra,view:view()}; };
  const run = operation => {
    if (loadError) return failure(loadError);
    if (busy) return failure('journey-busy');
    busy=true;
    try { return operation(); }
    finally { busy=false; }
  };
  function persist(next,journey,event) {
    if (!saveState) return failure('persistence-unavailable');
    try {
      const result=saveState(freeze(copy(next)),freeze(copy({action:event.action,journey,event})));
      if (result !== true) {
        if (result && typeof result.then === 'function') { Promise.resolve(result).catch(()=>{});return failure('async-save-unsupported'); }
        return failure('save-failed');
      }
      current=next;return success(journey,event);
    } catch { return failure('save-failed'); }
  }
  function eventFor(journey,action) {
    try {
      const clock=getClock?.(),day=clock?.day,hour=clock?.hour;
      if (!validClock({day,hour})) return null;
      return {id:`${journey.id}:${action}`,journeyId:journey.id,action,from:journey.from,to:journey.to,day,hour};
    } catch { return null; }
  }
  function begin(to) { return run(()=>{
    if (!region(to)) return failure('invalid-region');
    const active=current.journeys.find(j=>j.id === current.activeId);
    if (active) return active.to === to ? success(active,active.events[0],true) : failure('journey-conflict');
    if (current.currentRegion === to) return success(null,null,false,{sameRegion:true});
    if (!Number.isSafeInteger(current.serial+1) || !Number.isSafeInteger(current.revision+1)) return failure('journey-limit');
    const j={id:`travel-journey-${current.serial+1}`,from:current.currentRegion,to,stage:'planned',events:[]},event=eventFor(j,'begin');
    if (!event) return failure('invalid-clock');
    j.events.push(event);
    return persist({...copy(current),revision:current.revision+1,serial:current.serial+1,activeId:j.id,journeys:[...copy(current.journeys),j]},j,event);
  }); }
  function apply(journeyId,action,cancelling=false) { return run(()=>{
    if (typeof journeyId !== 'string' || !/^travel-journey-[1-9]\d*$/.test(journeyId)) return failure('invalid-journey-id');
    if (!(ACTIONS.slice(1).includes(action) || cancelling && action === 'cancel')) return failure('invalid-action');
    const j=current.journeys.find(item=>item.id === journeyId);
    if (!j) return failure('journey-not-found');
    const replay=j.events.find(e=>e.action === action);
    if (replay) return success(j,replay,true);
    if (j.id !== current.activeId || terminal(j.stage)) return failure('journey-closed');
    if (action === 'cancel' ? j.stage !== 'planned' : action !== ACTIONS[j.events.length]) return failure('invalid-stage');
    if (!Number.isSafeInteger(current.revision+1)) return failure('journey-limit');
    const event=eventFor(j,action);
    if (!event) return failure('invalid-clock');
    const journey={...copy(j),stage:stageFor(action),events:[...copy(j.events),event]},next={...copy(current),revision:current.revision+1};
    next.journeys[next.journeys.findIndex(item=>item.id === journeyId)]=journey;
    if (terminal(journey.stage)) next.activeId=null;
    if (journey.stage === 'arrived') next.currentRegion=journey.to;
    return persist(next,journey,event);
  }); }
  return Object.freeze({snapshot:()=>loadError ? null : copy(current),view,begin,advance:(id,action)=>apply(id,action),cancel:id=>apply(id,'cancel',true)});
}
