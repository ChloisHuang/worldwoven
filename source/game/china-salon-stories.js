import {SALON_ARTISTS} from './china-tavern-salon-artists.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const byId=new Map(SALON_ARTISTS.map(a=>[a.id,a]));
const whole=n=>Number.isSafeInteger(n)&&n>=0;
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const choice=(id,label,outcome,extra={})=>({id,label,outcome,...extra});
// Every line concerns the existing artist's current work. These are authored
// alternatives, never claims about a generated past, debt, patron or journey.
export const SALON_STORY_DEFINITIONS=freeze({
 'cn-tavern-reciter':{
  title:'柳清弦 · 半阕与留白',initial:'柳清弦读出正在推敲的词句，停下来听你的想法。',
  stages:[
   {title:'半阕该怎样续',text:'上次的茶叙留下了半阕未定的词。柳清弦说：“下一次，你想同我续一两句，还是先听我细细磨过的定稿？”',choices:[
    choice('liu-leave-space','留一处空白，下回一起续句','柳清弦在词页留出空行。下回她会先听你续句，再与你比较用字。',{art:1,relation:.25,repertoire:'留白续句',preference:'愿先听你的续句，再一同炼字',content:'柳清弦展开留有空行的半阕，请你续句；她逐字比较两种写法，保留意思不同的两稿。'}),
    choice('liu-polish-first','先把这一阕磨准，我来细听','柳清弦把推敲的重点放在转折与收句。下回先读定稿，再解释改字的缘由。',{art:2,relation:.1,repertoire:'炼字细读',preference:'与你茶叙时先完整诵读，再解释炼字',content:'柳清弦先完整诵读修过的半阕，再翻回转折处，解释一字之差怎样改变余味。'})]},
   {title:'词页上的回音',text:'这一回已经按上次选定的方式谈完。柳清弦把两稿并在一处：“哪一处真的说到了你心里？若有不顺，也直说。”',choices:[
    choice('liu-review-praise','记一条好评：字句的余味听明白了','你为这次实际茶叙留下好评。柳清弦保留两稿的对照，愿在下一回继续与你细读。',{review:'positive',relation:.2,contentSuffix:'她还把上回得到好评的收句与另一稿并读，让你听清余味。'}),
    choice('liu-review-revise','这次转折仍难懂，请再理顺','你留下“转折不清”的意见，未记好评。柳清弦把难处标出来，下回先说明句意，再读词。',{review:'critical',art:1,relation:.05,contentSuffix:'她先解释你上回没听清的转折，再把修改前后两句慢读一遍。'})]},
   {title:'留下哪一种读法',text:'又一次茶叙后，词稿已有了你们共同记得的读法。柳清弦问：“以后沿着这一稿细读，还是保留空处，让每回都有不同的答句？”',choices:[
    choice('liu-keep-version','固定这一稿，往后细读旧句的新意','这份词稿成为柳清弦与你茶叙时可沿用的篇目；她仍会先问你当天愿不愿听。',{art:1,relation:.25,repertoire:'半阕定稿细读',preference:'记得你偏爱有前后照应的细读',content:'柳清弦取出你们定下的半阕，先读熟悉的句子，再从不同的用字谈起新的理解。'}),
    choice('liu-keep-open','保留空白，每回试不同答句','柳清弦保留两稿，不把你的答句当作唯一结局。往后的茶叙会继续留出续句的余地。',{art:1,relation:.35,repertoire:'双稿留白续词',preference:'记得你愿意一起续句，也容得下不同读法',content:'柳清弦将两稿并放，留下一句空白，请你另作答句；她也提出不同读法，与你各自保留。'})]}
  ]},
 'cn-tavern-storyteller':{
  title:'沈砚舟 · 书稿中的山川',initial:'沈砚舟翻开读过的江行书稿，说起书中山川，也分清文字记载与自己的推想。',
  stages:[
   {title:'见闻还是说书',text:'提起上次谈过的江行见闻，沈砚舟指着一段未交代清楚的行程：“书上没有写的，我不能说成亲历。下回细辨原文，还是把推想明说成故事？”',choices:[
    choice('shen-trace-text','沿原文辨清行程，缺处就留疑','沈砚舟给原文与疑处分别作记。下回会逐段交代出处，不补成自己到过的地方。',{art:2,relation:.15,repertoire:'江行辨记',preference:'与你谈见闻时保留疑处，不把推想当亲历',content:'沈砚舟按江行书稿的先后次序叙述，遇到原文未写的渡口便留疑，与你比较两种可能。'}),
    choice('shen-mark-fiction','另讲一个故事，把虚构处说清','沈砚舟另起说书稿，开场便说明这是据文字生发的虚构。下回的趣味放在叙事，不冒充亲历。',{art:1,relation:.25,repertoire:'明示虚构的江行说书',preference:'愿与你听故事，但开场先说明哪些是虚构',content:'沈砚舟先说明这段江行是据书稿生发的虚构，再以水声与天色铺叙故事，讲完和你分辨创作与原文。'})]},
   {title:'听众记住了什么',text:'这一回按约定讲完，沈砚舟合起书稿：“原文和推想，你能分清么？我最怕讲得热闹，反叫人记错。”',choices:[
    choice('shen-review-clear','记一条好评：出处和推想分得清','你记录这次说书交代清楚。沈砚舟保留这套开场，下回沿它继续整理书稿。',{review:'positive',relation:.2,contentSuffix:'开场时他沿用你认可的简短说明，清楚划出原文和推想的边界。'}),
    choice('shen-review-dense','出处交代太密，先讲清主线','你指出这次主线难跟，未记好评。沈砚舟将长段注释拆开，下回先讲一段，再答一处疑问。',{review:'critical',art:1,relation:.05,contentSuffix:'他按你的意见拆开注释，先讲清一段主线，再停下回应疑处。'})]},
   {title:'书稿怎样留下',text:'再听一回后，沈砚舟拿出已改过的稿页：“这份稿子可以按行程归整，也可以按一个个疑问分段。往后你想怎样听？”',choices:[
    choice('shen-route-index','按行程收拢，每回接着一段','沈砚舟把现有稿页按行程归整。以后的茶叙先接上你熟悉的段落，不声称自己真的远行过。',{art:1,relation:.2,repertoire:'江行次第稿',preference:'记得你爱循着同一条叙事主线听下去',content:'沈砚舟翻到归整过的江行稿，从一段清楚的行程讲起；原文未明之处仍留疑，虚构部分仍先说明。'}),
    choice('shen-question-index','按疑问分段，随时停下来追问','沈砚舟把现有稿页按疑处分开。以后的茶叙会留出追问时间，而不是把悬念硬编成事实。',{art:1,relation:.3,repertoire:'山川问答稿',preference:'记得你喜欢追问，也愿意接受暂时无解',content:'沈砚舟挑出书稿中的一个疑问，先让你说出推想，再核对原文；查不到的地方便坦然留白。'})]}
  ]},
 'cn-tavern-songwriter':{
  title:'顾流萤 · 一阕的呼吸',initial:'顾流萤轻轻念出新填曲词的节拍，请你听韵脚怎样落下。',
  stages:[
   {title:'先听一阕还是拆句',text:'上次的茶叙里，顾流萤把同一句念了两遍：“字都放得下，却未必顺口。下回先听完整一阕，还是一拍一拍同我拆开？”',choices:[
    choice('gu-whole-song','先听完整一阕，再谈听感','顾流萤先保留曲词的起伏。下回她会完整念过，再让你指出最自然的停顿。',{art:1,relation:.2,repertoire:'整阕听韵',preference:'与你茶叙时先连贯念词，再谈停顿',content:'顾流萤连贯念完一阕，不在中途拆解；随后轻轻敲出节拍，问你哪一处停顿最自然。'}),
    choice('gu-scan-lines','逐句拆拍，一起找顺口的字','顾流萤在稿上分出节拍。下回会比较两种填字，遇到拗口处便停下来重念。',{art:2,relation:.15,repertoire:'拆拍填词',preference:'愿与你逐句拆拍，不急着完整演一遍',content:'顾流萤按稿上的节拍逐句念词，把两种填字放在同一拍里比较，与你改过拗口的停顿。'})]},
   {title:'韵脚是否落稳',text:'按上次约定的方式念完后，顾流萤没有急着收稿：“这次你跟得上节拍么？想夸哪一句，或哪一处仍赶，也请说清。”',choices:[
    choice('gu-review-flow','记一条好评：字与节拍相合','你为这次韵律茶叙留下好评。顾流萤把合拍的句式留下，下一回继续试它的变化。',{review:'positive',relation:.2,contentSuffix:'她把你称赞的合拍句式再念一遍，试着比较两种不同的轻重。'}),
    choice('gu-review-rushed','中段太赶，我没有跟上','你记录中段过急，未记好评。顾流萤减少那一拍的字，下回会放慢重念，让你核对变化。',{review:'critical',art:1,relation:.1,contentSuffix:'到你上回跟不上的中段，她删去赘字、放慢重念，让修改前后的节拍都听得清。'})]},
   {title:'为下回留下的节拍',text:'又一回茶叙验证了修改，顾流萤把旧字轻轻划去：“之后可以留成舒展的一阕，也能保留拆拍的过程，让你听见一首词如何改成。”',choices:[
    choice('gu-settle-melody','留下舒展的成阕，往后完整听','顾流萤将已试过的慢拍收进茶叙篇目。之后先完整念词，仍可由你提出停下或换个谈法。',{art:1,relation:.2,repertoire:'舒拍成阕',preference:'记得你偏爱舒展、连贯的曲词',content:'顾流萤按已试过的慢拍完整念词，在熟悉的韵脚稍作停顿，念完再与你谈起词意。'}),
    choice('gu-show-revision','保留改词过程，往后边听边推敲','顾流萤留下修改前后的字。之后的茶叙会把试拍和改词作为内容，让你继续参与。',{art:1,relation:.3,repertoire:'双稿试拍',preference:'记得你愿意参与改词，也接受暂未定稿',content:'顾流萤先念旧字，再换进新字，用同一节拍比较差别；你们仍可停在不满意的一处继续推敲。'})]}
  ]},
 'cn-tavern-chess-poet':{
  title:'陆怀川 · 一步之外',initial:'陆怀川谈起一局棋中的取舍，用手边棋理说明不同落子的后果。',
  stages:[
   {title:'求解还是问缘由',text:'茶叙谈到一处两难的落子，陆怀川没有替你定夺：“下一回，想先自己找一手，还是让我把两条路的得失摆明？”',choices:[
    choice('lu-find-move','先让我找一手，你再讲后果','陆怀川会把结论留到后面。下回先听你的落子想法，再比较它与另一手的后果。',{art:1,relation:.3,repertoire:'留手问解',preference:'愿先听你的判断，再讲不同后果',content:'陆怀川先说明局面的限制，留出一步让你判断；随后分别推演这一步与另一手，不以输赢替你下结论。'}),
    choice('lu-compare-roads','先比较两路得失，我再选','陆怀川把讲法改成两路并陈。下回先讲每一手舍去什么，再问你愿意保住哪一处。',{art:2,relation:.1,repertoire:'两路权衡',preference:'与你谈棋时先交代代价，再让你选择',content:'陆怀川把两种落子的得失逐一说清，分别推演下一步，然后请你选出更能接受的代价。'})]},
   {title:'听懂得失以后',text:'按约定谈完这一局，陆怀川问：“这回能自己说出取舍了么？若只是记住答案，我的讲法还要改。”',choices:[
    choice('lu-review-understood','记一条好评：我能说清这一步的代价','你为这次棋理茶叙留下好评。陆怀川保留两路对照，下一回再给你一个不同角度。',{review:'positive',relation:.2,contentSuffix:'他沿用你听明白的两路对照，再请你用自己的话说出舍与得。'}),
    choice('lu-review-too-many','分支太多，先只讲眼前一步','你指出这次讲得过密，未记好评。陆怀川收起远处的变化，下回先讲眼前一步，再逐层展开。',{review:'critical',art:1,relation:.1,contentSuffix:'他按上回的意见先收住远处变化，只讲眼前一步；待你说明理解后，才逐层展开。'})]},
   {title:'保留答案还是分歧',text:'又谈完一次，陆怀川把不同走法重新并起：“同一局未必只容一种取舍。以后是循着已讲清的变化温习，还是每回各持一说？”',choices:[
    choice('lu-keep-review','沿已讲清的变化温习','陆怀川把清楚的变化留作复盘篇目。以后的茶叙会从你记得的一步开始，再检查理由。',{art:1,relation:.2,repertoire:'一步复盘',preference:'记得你愿意温习同一局里的理由',content:'陆怀川从你已经听过的一步开始复盘，请你先说缘由；讲到分歧处，再比较另一手的代价。'}),
    choice('lu-keep-disagreement','各持一种走法，把分歧讲透','陆怀川愿把不同意见留在棋谈里。以后的茶叙会先说清各自要保住什么，意见不同也不必争胜。',{art:1,relation:.35,repertoire:'异着对谈',preference:'记得你容得下棋谈分歧，不以争胜逼人认同',content:'陆怀川与你各取一种走法，先讲各自想保住的局面，再交换得失；分歧可以留下，不必强求相同答案。'})]}
  ]}
});

const fresh=()=>({version:1,journal:[]});
const fingerprint=r=>JSON.stringify([r.id,r.sessionId,r.settlementId,r.actorId,r.customerId||'player',r.activity,r.gross,r.performerPaid,r.sequence]);
const offerId=(actorId,stage,receipt)=>`salon-story:${actorId}:${stage}:${receipt.sessionId}`;
// getReceipts MUST read the already-verified chinaSalonEconomy journal. Holds,
// UI history and actor balances are not completion evidence. Income never
// changes here. No imported legacy service is silently given a paid receipt.
export function createChinaSalonStories({saved,getReceipts=()=>[],saveState=()=>true,getRelationship=()=>0,getRevision=null}={}){
 let current=fresh(),loadError=null,saving=false,receiptCache=null,receiptRevision,validatedState=null,validatedReceipts=null;
 const profiles=new Map();
 function evidence(){
  const revision=getRevision?.();if(getRevision&&receiptCache&&revision===receiptRevision)return receiptCache;
  const values=getReceipts();if(!Array.isArray(values))throw Error('story-evidence-unavailable');
  const receipts=[],sessions=new Set(),sequences=new Set();
  for(const r of values){
   const artist=byId.get(r?.actorId);if(!artist)continue;
   if(r.id!=='salon-income:'+r.sessionId||typeof r.settlementId!=='string'||!r.settlementId||r.activity!==artist.activity||r.currency!=='copper'||!whole(r.gross)||!r.gross||!whole(r.performerPaid)||r.performerPaid>r.gross||!whole(r.sequence)||!r.sequence||!/^cn-salon-(?:npc-)?[1-9][0-9]*(?:-[1-9][0-9]*)?$/.test(r.sessionId||'')||sessions.has(r.sessionId)||sequences.has(r.sequence))throw Error('invalid-story-service');
   if(r.sourceProvider==='china-official-economy'?(!r.customerId||!/^cn-salon-npc-[1-9][0-9]*$/.test(r.sessionId)):!!r.customerId||r.sourceProvider!==undefined||!/^cn-salon-[1-9][0-9]*-[1-9][0-9]*$/.test(r.sessionId))throw Error('invalid-story-customer');
   sessions.add(r.sessionId);sequences.add(r.sequence);receipts.push(copy(r));
  }
  receiptCache=receipts.sort((a,b)=>a.sequence-b.sequence);receiptRevision=revision;return receiptCache;
 }
 function entries(actorId,state=current){return state.journal.filter(e=>e.actorId===actorId);}
 function validate(state,receipts){
  if(state?.version!==1||!Array.isArray(state.journal)||state.journal.length>12)throw Error('invalid-salon-stories');
  const seen=new Set(),checked=fresh(),map=new Map(receipts.map(r=>[r.sessionId,r]));let previousSequence=0;
  for(const event of state.journal){
   const definition=byId.has(event?.actorId)?SALON_STORY_DEFINITIONS[event.actorId]:null,past=entries(event?.actorId,checked),stage=past.length,r=map.get(event?.sessionId);
   if(!definition||stage>2||event.stage!==stage||!definition.stages[stage].choices.some(c=>c.id===event.choiceId)||!r||r.actorId!==event.actorId||r.customerId||event.evidence!==fingerprint(r)||event.offerId!==offerId(event.actorId,stage,r)||!whole(event.afterSequence)||event.afterSequence<r.sequence||event.afterSequence<previousSequence||event.afterSequence>(receipts.at(-1)?.sequence||0)||r.sequence<=(past.at(-1)?.afterSequence||0)||seen.has(r.sessionId))throw Error('unverified-story-choice');
   seen.add(r.sessionId);checked.journal.push(copy(event));previousSequence=event.afterSequence;
  }
  return checked;
 }
 try{current=validate(saved??fresh(),evidence());}catch(error){loadError=error.message;}
 function resolved(actorId,receipts){
  const definition=byId.has(actorId)?SALON_STORY_DEFINITIONS[actorId]:null;if(!definition)return null;
  const cached=profiles.get(actorId);if(cached?.state===current&&cached.receipts===receipts)return copy(cached.profile);
  const past=entries(actorId),paid=receipts.filter(r=>r.actorId===actorId);let art=0,contentWeight=paid.length ? .15 : 0,relation=0,positive=0,negative=0,preference='',repertoire=byId.get(actorId).specialty,content=definition.initial;
  for(const event of past){const c=definition.stages[event.stage].choices.find(c=>c.id===event.choiceId);if(paid.some(r=>!r.customerId&&r.sequence>event.afterSequence)){art+=c.art||0;contentWeight=Math.min(1,contentWeight+(c.art||0)*.12);}relation+=c.relation||0;if(c.review==='positive')positive++;if(c.review==='critical')negative++;if(c.preference)preference=c.preference;if(c.repertoire)repertoire=c.repertoire;if(c.content)content=c.content;if(c.contentSuffix)content+=' '+c.contentSuffix;}
  // Practice comes from real completed services, while praise comes ONLY from
  // an explicit player's review. A constructive criticism can improve art
  // without being mislabeled as a compliment or fabricating new supporters.
  const profile={artLevel:Math.min(10,Math.floor(paid.length/2)+art),contentWeight:+contentWeight.toFixed(3),positiveReviews:positive,negativeReviews:negative,reputation:positive-negative,relationshipDelta:+relation.toFixed(3),preference,repertoire,serviceContent:content,completedServices:paid.length,earned:paid.reduce((n,r)=>n+r.performerPaid,0)};profiles.set(actorId,{state:current,receipts,profile});return copy(profile);
 }
 function read(actorId,{customerId='player'}={}){
  const definition=byId.has(actorId)?SALON_STORY_DEFINITIONS[actorId]:null;if(!definition)return null;
  let receipts;try{receipts=evidence();if(!loadError&&(validatedState!==current||validatedReceipts!==receipts)){validate(current,receipts);validatedState=current;validatedReceipts=receipts;}}catch(error){return {actorId,title:definition.title,error:error.message,offer:null,profile:null};}
  if(loadError)return {actorId,title:definition.title,error:loadError,offer:null,profile:null};
  const past=entries(actorId),stage=past.length,profile=resolved(actorId,receipts),last=past.at(-1),receipt=receipts.filter(r=>r.actorId===actorId&&!r.customerId&&r.sequence>(last?.afterSequence||0)).at(-1);
  const relation=Number(getRelationship(actorId,customerId))||0,declined=relation< -.4,allowed=customerId==='player'&&!declined;
  const definitionStage=definition.stages[stage],offer=definitionStage&&receipt&&allowed?{id:offerId(actorId,stage,receipt),title:definitionStage.title,text:(stage>0?`上次选定的篇目是「${profile.repertoire}」。`:'')+definitionStage.text,evidence:{sessionId:receipt.sessionId,gross:receipt.gross,performerPaid:receipt.performerPaid},choices:definitionStage.choices.map(c=>({id:c.id,label:c.label,effect:c.outcome}))}:null;
  const history=past.map(event=>{const c=definition.stages[event.stage].choices.find(c=>c.id===event.choiceId);return {stage:event.stage,title:definition.stages[event.stage].title,choiceId:c.id,label:c.label,outcome:c.outcome,sessionId:event.sessionId};});
  return {actorId,title:definition.title,stage,completed:stage===3,waiting:stage<3&&!offer,need:stage===3?'':declined?'对方今日不愿继续这个话题。':customerId!=='player'?'本人经历与选择只由你记录。':stage===0?'先完成一次双方愿意的本门茶叙，再听本人谈起这份稿子。':'上次的选择会用于下一次茶叙；实际完成并结账后，再谈这次的回音。',offer,history,lastOutcome:history.at(-1)?.outcome||'',profile};
 }
 return {
  get loadError(){return loadError;},
  view:read,
  profile(actorId,options){const profile=read(actorId,options)?.profile||null;if(profile&&options?.customerId&&options.customerId!=='player'){profile.relationshipDelta=0;profile.preference='';profile.contentWeight=profile.completedServices>0?.15:0;profile.repertoire=byId.get(actorId).specialty;profile.serviceContent=SALON_STORY_DEFINITIONS[actorId].initial;}return profile;},
  choose(actorId,choiceId,options={}){
   if(loadError||saving)return {ok:false,code:loadError||'story-save-busy'};
   if((options.customerId||'player')!=='player')return {ok:false,code:'story-player-choice-only'};
   const old=current.journal.find(e=>e.actorId===actorId&&e.choiceId===choiceId);
   if(old)return !options.offerId||options.offerId===old.offerId?{ok:true,replayed:true,outcome:SALON_STORY_DEFINITIONS[actorId].stages[old.stage].choices.find(c=>c.id===choiceId).outcome}:{ok:false,code:'stale-story-offer'};
   const view=read(actorId,options),offer=view?.offer;if(view?.error)return {ok:false,code:view.error};
   if(!offer)return {ok:false,code:'story-not-ready'};
   if(options.offerId&&options.offerId!==offer.id)return {ok:false,code:'stale-story-offer'};
   const c=SALON_STORY_DEFINITIONS[actorId].stages[view.stage].choices.find(c=>c.id===choiceId);if(!c)return {ok:false,code:'invalid-story-choice'};
   let receipts;try{receipts=evidence();}catch(error){return {ok:false,code:error.message};}
   const receipt=receipts.find(r=>r.sessionId===offer.evidence.sessionId);if(!receipt)return {ok:false,code:'story-evidence-unavailable'};
   const next=copy(current);next.journal.push({actorId,stage:view.stage,choiceId,sessionId:receipt.sessionId,evidence:fingerprint(receipt),offerId:offer.id,afterSequence:receipts.at(-1).sequence});
   saving=true;
   try{const result=saveState(copy(next));if(result?.then){Promise.resolve(result).catch(()=>{});return {ok:false,code:'async-story-save-unsupported'};}if(result===false||result?.ok===false)return {ok:false,code:'story-save-failed'};current=next;return {ok:true,outcome:c.outcome,profile:resolved(actorId,receipts)};}
   catch{return {ok:false,code:'story-save-failed'};}finally{saving=false;}
  },
  snapshot:()=>copy(loadError?saved??fresh():current)
 };
}
