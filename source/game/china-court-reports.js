import {PALACE_EDICT} from './china-palace-edict-place.js';
const copy=x=>JSON.parse(JSON.stringify(x));
const REPORTER='cn-minister-works',RECIPIENT='cn-emperor';
// The office ledger is the only live authority source. Historical receipts
// validate their own frozen term; they never get rewritten to today's holder.
export const validCourtAuthority=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&['cn-emperor','player'].includes(value.holderId)&&Number.isSafeInteger(value.revision)&&value.revision>=0&&Object.keys(value).length===2;
export const sameCourtAuthority=(a,b)=>validCourtAuthority(a)&&validCourtAuthority(b)&&a.holderId===b.holderId&&a.revision===b.revision;
export function readCourtAuthority(reader=null){
 if(reader===null||reader===undefined)return {holderId:RECIPIENT,revision:0};
 try{const value=reader();if(!value||value.suspended===true||value.suspended!==undefined&&value.suspended!==false)return null;const term={holderId:value.holderId,revision:value.revision};return validCourtAuthority(term)?term:null;}catch{return null;}
}
export const validCourtRecipientProof=proof=>!!proof&&(Object.hasOwn(proof,'authority')?validCourtAuthority(proof.authority)&&proof.recipientId===proof.authority.holderId:proof.recipientId===RECIPIENT);
export function sameCourtReceiptAuthority(receipt,proof,reader=null){
 if(receipt.recipientId!==proof.recipientId)return false;
 if(Object.hasOwn(receipt,'authority'))return sameCourtAuthority(receipt.authority,proof.authority);
 if(!Object.hasOwn(proof,'authority'))return true;
 // A legacy save can contain the received ledger and the still-speaking
 // audience checkpoint. The new controller names the same original term on
 // replay; accepting that replay must not manufacture or rewrite old proof.
 return reader!==null&&receipt.recipientId===RECIPIENT&&sameCourtAuthority(proof.authority,{holderId:RECIPIENT,revision:0})&&sameCourtAuthority(proof.authority,readCourtAuthority(reader));
}
const reportKeys=['caseId','inspectionId','sourceEventId','reporterId','day'];
const sameReport=(a,b)=>!!a&&!!b&&reportKeys.every(key=>a[key]===b[key]);
const completeProof=p=>p?.reporterId===REPORTER&&validCourtRecipientProof(p)&&p.reportSeconds===6&&p.responseSeconds===4;
const freezeTree=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeTree(child);Object.freeze(value);}return value;};
const reportFor=(c,day)=>({caseId:c.id,inspectionId:c.result.id,sourceEventId:c.result.source.eventId,reporterId:REPORTER,day});
function matchesResult(c,ref){
 const result=c?.result,source=result?.source;
 return !!ref&&Number.isInteger(ref.day)&&ref.day>=0&&typeof c?.id==='string'&&!!c.id&&
  result?.id===`court-inspection:${c.id}`&&result.actorId===REPORTER&&
  typeof source?.documentId==='string'&&source.documentId===c.source?.documentId&&
  ['active','completed','interrupted'].includes(source.outcome)&&source.eventId===`${source.documentId}:${source.outcome}`&&
  sameReport(ref,reportFor(c,ref.day));
}
const validReceipt=(c,receipt)=>receipt?.version===1&&completeProof(receipt)&&matchesResult(c,receipt)&&c.result.reportedDay===receipt.day;
const phases={preparing:'准备拟稿',drafting:'拟稿', 'await-pickup':'待取稿','scribe-handoff':'交接原稿','to-approval':'呈准途中',approval:'阅批','to-seal':'回案用印途中','seal-place':'置于印案',sealing:'用印','seal-pickup':'取回原令','to-recipient':'送达途中','await-recipient':'等候听令',reading:'宣读',response:'受令答复','recipient-handoff':'交令','to-work':'前往留档', 'file-receipt':'留存回执','to-sweep':'前往清扫',sweeping:'清扫',returning:'办结返岗'};
const title=source=>formatCourtEdictText(source.documentId);
// Also applies at speech/label boundaries, so an already-saved court speech or
// inspection route from an older build cannot expose an internal document ID.
export const formatCourtEdictText=text=>typeof text==='string'?text.replace(/cn-edict-east-shore:(\d+)/g,(_,day)=>`第${Number(day)+1}日《${PALACE_EDICT.title}》`):text;

// One real bounded source: CN09's numbered order / completion ledger. A report
// never turns a personal wallet into public finance or invents goods/cases.
export function edictReportSource(state){
 const l=state?.ledger;if(!Number.isInteger(l?.lastDay)||l.lastDay<0||l.lastReceipt!==`cn-morning-audience:${l.lastDay}`)return null;
 const documentId=`cn-edict-east-shore:${l.lastDay}`,outcome=l.outcome;
 if(!['active','completed','interrupted'].includes(outcome))return null;
 if(outcome==='completed'&&l.completedReceipt!==l.lastReceipt)return null;
 return {eventId:`${documentId}:${outcome}`,documentId,audienceId:l.lastReceipt,outcome,stage:state.order?.id===documentId?state.order.stage:null,workProgress:Number.isFinite(state.props?.workProgress)?state.props.workProgress:null};
}

export function createCourtReports({readEdict=()=>null,reissueEdict=()=>false,readAuthority=null,saved={},savedReport=null,saveState=()=>{}}={}){
 let cases=Array.isArray(saved.cases)?copy(saved.cases).slice(-8):[],sequence=Math.max(0,saved.sequence||0),savingReceipt=false;
 const preparedReports=new Map();
 // Only the new receipt shape is checked here. A legacy reportedDay remains
 // historical; a malformed new receipt must not turn a result into a closed one.
 for(const c of cases)if(c.result&&Object.hasOwn(c.result,'received')){
  if(validReceipt(c,c.result.received))Object.freeze(c.result.received);
  else{delete c.result.received;delete c.result.reportedDay;}
 }
 // Older inquiries ended with an unrepairable interrupted result. Retain the
 // finding and the emperor's instruction, but require a fresh visit to reissue.
 for(const c of cases)if(!c.retired&&c.response==='inquire'&&c.result?.source?.outcome==='interrupted'&&!c.result.recoveryRequested){c.previousResult=c.result;c.result=null;}
 const snapshot=()=>({version:1,sequence,cases:copy(cases)}),save=()=>saveState(snapshot());
 function live(){return edictReportSource(readEdict());}
 function pending(){return cases.find(c=>c.response&&c.response!=='defer'&&!c.result&&!c.retired)||null;}
 function restoreReport(ref){
  if(savingReceipt)return false;
  const c=cases.find(c=>c.id===ref?.caseId);if(!matchesResult(c,ref))return false;
  if(c.result.received)return validReceipt(c,c.result.received)&&sameReport(ref,c.result.received);
  if(c.result.reportedDay!==undefined)return false;
  preparedReports.set(c.result.id,Object.freeze(reportFor(c,ref.day)));return true;
 }
 if(savedReport)restoreReport(savedReport);
 return {
  restoreReport,
  report(role,day){
   if(savingReceipt)return {ok:false,code:'busy'};
   if(role==='granary'){
    const jobs=cases.filter(c=>c.response&&c.response!=='defer'&&!c.result&&!c.retired);
    return {sourceEventId:jobs.length?`court-inspection-queue:${sequence}`:null,issueId:null,text:jobs.length?`禀陛下，承务案上尚有${jobs.length}件奉准核验未回报，待实查后入册。`:'禀陛下，今日未收到可核验的仓务新文书，候有实据再奏。',response:'依实据登记，未办结的事不可写作已办。'};
   }
   const result=cases.find(c=>c.result&&c.result.reportedDay===undefined);
   if(result){
    const current=live(),reissued=result.result.recoveryRequested&&current?.documentId===result.source.documentId;
    const ref=reportFor(result,day),report={sourceEventId:result.result.source.eventId,issueId:null,text:`禀陛下，已奉命亲到${result.result.place}核验${title(result.source)}。${reissued?(current.outcome==='completed'?'原令已补办并取得清扫回执，请准亲到东岸核对实作。':current.outcome==='active'?'原令已交回补办，现正'+(phases[current.stage]||'执行')+'，待实作完成再验收。':'补办尚未办结，仍待查问。'):result.result.source.outcome==='completed'?'清扫办结回执与现场落叶入筐相符。':result.result.source.outcome==='interrupted'?'旧令尚未办结，已查得缺少执行记录，须补办后再验收。':'文书仍在执行，未冒记办结。'}`,response:'核验结果收入承务案，后续仍据实回报。'};
    if(role==='works'&&restoreReport(ref))report.resultReport=Object.freeze({...ref});
    // This same audience must leave an actionable verification, or its next
    // new order could replace the repaired receipt before the east-shore visit.
    if(reissued&&['active','completed'].includes(current.outcome)){
     let followup=cases.find(c=>c!==result&&!c.retired&&(c.source.eventId===current.eventId||!c.result&&c.source.documentId===current.documentId));
     if(!followup){followup={id:'court-issue-'+(++sequence),source:current,createdDay:day,response:null,result:null};cases.push(followup);cases=cases.slice(-8);save();}
     if(!followup.response)Object.assign(report,{sourceEventId:current.eventId,issueId:followup.id,action:current.outcome==='completed'?'approve':'defer',response:current.outcome==='completed'?'准。到东岸核对实作与回执，再将结果带回。':'先候这份补办清扫令实作办结，再到东岸核对回执。'});
    }
    return report;
   }
   const source=live();if(!source)return {sourceEventId:null,issueId:null,text:'禀陛下，尚未收到有编号的工务执行回执，候实据再奏。',response:'无据之事暂缓，有编号回执再报。'};
   let issue=cases.find(c=>c.source.eventId===source.eventId||c.result?.source.eventId===source.eventId);
   if(issue?.response)return {sourceEventId:source.eventId,issueId:null,text:`禀陛下，${title(source)}${source.outcome==='active'?'仍在'+(phases[source.stage]||'执行'):source.outcome==='completed'?'已有办结回执':'尚未办结'}，前次批示${issue.result?'已核验入册':'尚待核验结果'}。`,response:'仍按前次批示据实核验。'};
   if(!issue){issue={id:'court-issue-'+(++sequence),source,createdDay:day,response:null,result:null};cases.push(issue);cases=cases.slice(-8);save();}
   const action=source.outcome==='completed'?'approve':source.outcome==='interrupted'?'inquire':'defer';
   return {sourceEventId:source.eventId,issueId:issue.id,action,text:`禀陛下，${title(source)}${source.outcome==='completed'?'已有清扫办结回执，请准到东岸核对后入册。':source.outcome==='interrupted'?'尚未办结，未有办结回执，请旨查问并补办。':'尚在'+(phases[source.stage]||'执行')+'，未收到办结回执。'}`,response:action==='approve'?'准。到东岸核对实作与回执，再将结果带回。':action==='inquire'?'到传令案核对旧令；若缺少办结回执，交沈序补办，待清扫完成再验收。':'先让在途事务继续，待有结果再去核对，暂缓作办结论。'};
  },
  acknowledgeReport(ref,proof){
   if(savingReceipt)return {ok:false,code:'busy'};
   const c=cases.find(c=>c.id===ref?.caseId);
   if(!matchesResult(c,ref))return {ok:false,code:'invalid-report'};
   if(!completeProof(proof)||proof.reporterId!==ref.reporterId)return {ok:false,code:'invalid-proof'};
   if(c.result.received)return validReceipt(c,c.result.received)&&sameReport(ref,c.result.received)
    &&sameCourtReceiptAuthority(c.result.received,proof,readAuthority)?{ok:true,replayed:true}:{ok:false,code:'receipt-conflict'};
   if(readAuthority!==null&&!sameCourtAuthority(proof.authority,readCourtAuthority(readAuthority)))return {ok:false,code:'authority-changed'};
   if(readAuthority===null&&Object.hasOwn(proof,'authority'))return {ok:false,code:'invalid-proof'};
   if(c.result.reportedDay!==undefined)return {ok:false,code:'historical-report'};
   if(!sameReport(ref,preparedReports.get(c.result.id)))return {ok:false,code:'report-not-prepared'};
   const candidate=snapshot(),result=candidate.cases.find(item=>item.id===c.id).result;
   result.received=freezeTree({version:1,...reportFor(c,ref.day),recipientId:proof.recipientId,...(readAuthority!==null?{authority:{...proof.authority}}:{}),reportSeconds:6,responseSeconds:4});
   result.reportedDay=ref.day;
   // The bridge saves this exact candidate together with audience continuity.
   // Until that succeeds, reentrant observers still see the pending old state.
   savingReceipt=true;
   try{
    const stored=saveState(freezeTree(copy(candidate)));
    if(stored?.then){Promise.resolve(stored).catch(()=>{});return {ok:false,code:'async-save-unsupported'};}
    if(stored===false||stored?.ok===false)return {ok:false,code:'save-failed'};
    cases=candidate.cases;preparedReports.delete(c.result.id);return {ok:true,replayed:false};
   }catch{return {ok:false,code:'save-failed'};}finally{savingReceipt=false;}
  },
  decide(issueId,action,actorId='cn-emperor',authority=null){
   if(savingReceipt)return false;
   const live=readCourtAuthority(readAuthority),c=cases.find(c=>c.id===issueId);if(!c||!live||actorId!==live.holderId||readAuthority!==null&&!sameCourtAuthority(authority,live)||!['approve','inquire','defer'].includes(action))return false;
   if(c.response)return readAuthority!==null&&c.response===action&&c.decidedBy===actorId&&sameCourtAuthority(c.decidedAuthority,authority);
   if(readAuthority===null){c.response=action;c.decidedBy=actorId;save();return true;}
   const candidate=snapshot(),target=candidate.cases.find(item=>item.id===issueId);target.response=action;target.decidedBy=actorId;target.decidedAuthority={...authority};
   savingReceipt=true;
   try{const stored=saveState(freezeTree(copy(candidate)));if(stored?.then){Promise.resolve(stored).catch(()=>{});return false;}if(stored===false||stored?.ok===false)return false;cases=candidate.cases;return true;}catch{return false;}finally{savingReceipt=false;}
  },
  inspection(){
   if(savingReceipt)return null;
   const current=live();
   for(const c of cases)if(!c.retired&&c.result?.recoveryRequested&&current?.documentId===c.source.documentId&&current.outcome==='interrupted'){c.previousResult=c.result;c.result=null;save();}
   for(const c of cases)if(c.response==='defer'&&!c.result){const s=live();if(s?.documentId===c.source.documentId&&s.outcome!=='active'){c.response='inquire';c.resumedFrom='defer';save();}}
   const c=pending();if(!c)return null;const source=live();if(source&&source.documentId!==c.source.documentId){c.retired={reason:'new-numbered-order',sourceEventId:source.eventId};save();return null;}if(source?.outcome==='active')return null;const east=(source?.outcome||c.source.outcome)==='completed';return {id:c.id,documentId:c.source.documentId,point:east?[11.9,.145,-15.7]:[5.35,1.415,-4.05],look:east?[11.2,.145,-15.3]:[4.2,2.33,-4.84],place:east?'荷庭东岸':'传令案',label:`奉旨核验${title(c.source)} · ${east?'前往东岸竹筐':'到传令案核对补办'}`};
  },
  inspected(issueId,{actorId,position,place}){
   if(savingReceipt)return false;
   const c=cases.find(c=>c.id===issueId),job=this.inspection(),source=live();if(!c||c.result||job?.id!==issueId||actorId!=='cn-minister-works'||!position||Math.hypot(position[0]-job.point[0],position[2]-job.point[2])>.3||Math.abs(position[1]-job.point[1])>.3||source?.documentId!==c.source.documentId)return false;
   // Completed means the live controller's visible work actually reached its
   // terminal state, not merely that time passed or a report was spoken.
   if(source.outcome==='completed'&&source.workProgress!==1)return false;
   const result={id:`court-inspection:${c.id}`,actorId,position:position.slice(),place:job.place,source,recoveryRequested:source.outcome==='interrupted'};
   // A rejected original reissue is still unfinished business. Keep this same
   // authorized case pending for another real visit; never bypass the edict's
   // identity, contract, actor or active-order guards to manufacture success.
   if(result.recoveryRequested&&reissueEdict(source.documentId)!==true)return false;
   c.result=result;save();return true;
  },hasPending:()=>cases.some(c=>c.response&&!c.result&&!c.retired),snapshot,state:snapshot
 };
}
