const copy=x=>JSON.parse(JSON.stringify(x));
const phases={preparing:'准备拟稿',drafting:'拟稿', 'await-pickup':'待取稿','scribe-handoff':'交接原稿','to-approval':'呈准途中',approval:'阅批','to-seal':'回案用印途中','seal-place':'置于印案',sealing:'用印','seal-pickup':'取回原令','to-recipient':'送达途中','await-recipient':'等候听令',reading:'宣读',response:'受令答复','recipient-handoff':'交令','to-work':'前往留档', 'file-receipt':'留存回执','to-sweep':'前往清扫',sweeping:'清扫',returning:'办结返岗'};

// One real bounded source: CN09's numbered order / completion ledger. A report
// never turns a personal wallet into public finance or invents goods/cases.
export function edictReportSource(state){
 const l=state?.ledger;if(!Number.isInteger(l?.lastDay)||l.lastDay<0||l.lastReceipt!==`cn-morning-audience:${l.lastDay}`)return null;
 const documentId=`cn-edict-east-shore:${l.lastDay}`,outcome=l.outcome;
 if(!['active','completed','interrupted'].includes(outcome))return null;
 if(outcome==='completed'&&l.completedReceipt!==l.lastReceipt)return null;
 return {eventId:`${documentId}:${outcome}`,documentId,audienceId:l.lastReceipt,outcome,stage:state.order?.id===documentId?state.order.stage:null,workProgress:Number.isFinite(state.props?.workProgress)?state.props.workProgress:null};
}

export function createCourtReports({readEdict=()=>null,saved={},saveState=()=>{}}={}){
 let cases=Array.isArray(saved.cases)?copy(saved.cases).slice(-8):[],sequence=Math.max(0,saved.sequence||0);
 const snapshot=()=>({version:1,sequence,cases:copy(cases)}),save=()=>saveState(snapshot());
 function live(){return edictReportSource(readEdict());}
 function pending(){return cases.find(c=>c.response&&c.response!=='defer'&&!c.result&&!c.retired)||null;}
 return {
  report(role,day){
   if(role==='granary'){
    const jobs=cases.filter(c=>c.response&&c.response!=='defer'&&!c.result&&!c.retired);
    return {sourceEventId:jobs.length?`court-inspection-queue:${sequence}`:null,issueId:null,text:jobs.length?`禀陛下，承务案上尚有${jobs.length}件奉准核验未回报，待实查后入册。`:'禀陛下，今日未收到可核验的仓务新文书，候有实据再奏。',response:'依实据登记，未办结的事不可写作已办。'};
   }
   const result=cases.find(c=>c.result&&c.result.reportedDay===undefined);
   if(result){result.result.reportedDay=day;save();return {sourceEventId:result.result.source.eventId,issueId:null,text:`禀陛下，已奉命亲到${result.result.place}核验${result.source.documentId}。${result.result.source.outcome==='completed'?'清扫办结回执与现场落叶入筐相符。':result.result.source.outcome==='interrupted'?'文书仍记中断，尚未取得办结回执。':'文书仍在执行，未冒记办结。'}`,response:'核验结果收入承务案，后续仍据实回报。'};}
   const source=live();if(!source)return {sourceEventId:null,issueId:null,text:'禀陛下，尚未收到有编号的工务执行回执，候实据再奏。',response:'无据之事暂缓，有编号回执再报。'};
   let issue=cases.find(c=>c.source.eventId===source.eventId||c.result?.source.eventId===source.eventId);
   if(issue?.response)return {sourceEventId:source.eventId,issueId:null,text:`禀陛下，${source.documentId}${source.outcome==='active'?'仍在'+(phases[source.stage]||'执行'):source.outcome==='completed'?'已有办结回执':'仍记中断'}，前次批示${issue.result?'已核验入册':'尚待核验结果'}。`,response:'仍按前次批示据实核验。'};
   if(!issue){issue={id:'court-issue-'+(++sequence),source,createdDay:day,response:null,result:null};cases.push(issue);cases=cases.slice(-8);save();}
   const action=source.outcome==='completed'?'approve':source.outcome==='interrupted'?'inquire':'defer';
   return {sourceEventId:source.eventId,issueId:issue.id,action,text:`禀陛下，${source.documentId}${source.outcome==='completed'?'已有清扫办结回执，请准到东岸核对后入册。':source.outcome==='interrupted'?'的文书记为中断，未有办结回执，请旨查问。':'尚在'+(phases[source.stage]||'执行')+'，未收到办结回执。'}`,response:action==='approve'?'准。到东岸核对实作与回执，再将结果带回。':action==='inquire'?'到传令案核对这份中断文书，据实回报，不可冒记办结。':'先让在途事务继续，待有结果再去核对，暂缓作办结论。'};
  },
  decide(issueId,action,actorId='cn-emperor'){
   const c=cases.find(c=>c.id===issueId);if(!c||c.response||actorId!=='cn-emperor'||!['approve','inquire','defer'].includes(action))return false;
   c.response=action;c.decidedBy=actorId;save();return true;
  },
  inspection(){
   for(const c of cases)if(c.response==='defer'&&!c.result){const s=live();if(s?.documentId===c.source.documentId&&s.outcome!=='active'){c.response='inquire';c.resumedFrom='defer';save();}}
   const c=pending();if(!c)return null;const source=live();if(source&&source.documentId!==c.source.documentId){c.retired={reason:'new-numbered-order',sourceEventId:source.eventId};save();return null;}const east=source?.outcome==='completed';return {id:c.id,documentId:c.source.documentId,point:east?[11.9,.145,-15.7]:[5.35,1.415,-4.05],look:east?[11.2,.145,-15.3]:[4.2,2.33,-4.84],place:east?'荷庭东岸':'传令案',label:`奉旨核验${c.source.documentId} · ${east?'前往东岸竹筐':'到传令案核对'}`};
  },
  inspected(issueId,{actorId,position,place}){
   const c=cases.find(c=>c.id===issueId),job=this.inspection(),source=live();if(!c||c.result||job?.id!==issueId||actorId!=='cn-minister-works'||!position||Math.hypot(position[0]-job.point[0],position[2]-job.point[2])>.3||Math.abs(position[1]-job.point[1])>.3||source?.documentId!==c.source.documentId)return false;
   // Completed means the live controller's visible work actually reached its
   // terminal state, not merely that time passed or a report was spoken.
   if(source.outcome==='completed'&&source.workProgress!==1)return false;
   c.result={id:`court-inspection:${c.id}`,actorId,position:position.slice(),place:job.place,source};save();return true;
  },snapshot,state:snapshot
 };
}
