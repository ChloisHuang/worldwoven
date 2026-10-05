import {FORMAL_CAREER_ROLES} from './formal-careers.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {CAREER_CARD_STYLE,careerRoleMark} from './career-registration-cards.js';
import {GAME_CURRENCIES} from './currency-ledger.js';

// The shared catalogue only reads career state. Applications and work still
// travel through the live country's physical intent and visibility checks.
const CLERK='cn-court-clerk',TAVERN='cn-tavern-steward',GARDEN='fr-garden-assistant';
const PLACES={
  [CLERK]:{country:'china',currency:'copper',workplace:'承务官署',employer:'沈叙（礼仪官）',destination:'承务官署 · 铨录登记案'},
  [TAVERN]:{country:'china',currency:'copper',workplace:'云来酒楼',employer:'许安',destination:'云来酒楼 · 许安的招工登记案'},
  [GARDEN]:{country:'france',currency:'france',workplace:'西苑',employer:'埃米尔',destination:'西苑工具架 · 埃米尔的园艺登记簿'},
};
const WORKPLACES={'cn-court-clerk':'bureau','cn-tavern-steward':'tavern','cn-tavern-chef':'tavern','fr-garden-assistant':'garden'},WORKPLACE_NAMES={bureau:'承务官署',tavern:'云来酒楼',garden:'西苑工具架'};
const workplaceKey=role=>WORKPLACES[role?.id]||role?.id;
const COUNTRIES={china:'中国',france:'法国'},SKILLS={ritual:'礼仪',writing:'文书',gardening:'园艺',art:'艺术',cooking:'烹饪'};
const place=role=>({...PLACES[role?.id],...role});
const unit=role=>{const id=place(role).currency;return id==='copper'?'铜文':id==='france'?'法国券':GAME_CURRENCIES[id]?.unit||'';};
const wageRange=role=>`${role.wage}–${role.wage+(role.preparationBonus??(role.id===CLERK?2:0))}${unit(role)}`;
const requirements=role=>role.skillRequirements||role.requirements||{};
const employer=role=>place(role).employer||'岗位主管';
const isClerk=role=>role?.id===CLERK;
const registryKind=role=>isClerk(role)?'view':'formal-view';
const dutySummary=role=>role.duties|| (isClerk(role)?'11:30朝仪听记 · 官署归档':role.id===TAVERN?'06:00–18:00 · 持续送餐、清洁脏桌、打扫退房客房；提前交班按工时计薪':'06:00–18:00 · 原壶浇两畦、归还与验收');
const resultReason=code=>({'already-applied-today':'本岗位今日已提交，下一模拟日可再申请','interview-rejected':'硬门槛已满足，本次面谈未获录用','hiring-context-unavailable':'招聘信息暂不可用，请稍后重试','adult-required':'年龄未达要求','ritual-required':'礼仪未达要求','writing-required':'文书未达要求','gardening-required':'园艺未达要求','art-required':'艺术未达要求','cooking-required':'烹饪未达要求，可在藏书处学习','already-employed':'已有正式职位，请先在原岗位办理离职','no-vacancy':'当前没有空缺','save-failed':'登记未能保存，请重试','async-save-unsupported':'登记未能保存，请重试','invalid-clock':'世界时钟暂不可用','invalid-career-state':'职业存档暂时无法核对'}[code]||'本次登记未完成，请稍后重试');


export function createCareerHandbook({careers,copperLedger,getClock,getService,getCountry=()=>null,getPlayer=()=>null,
  onIntent=()=>{},onOpen=()=>{},walletFactory=null,document:doc=globalThis.document}) {
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const slot=make('div',null,'career-wallet-slot'),money=make('span',null,'career-money'),button=make('button',null,'career-open');
  // Original guild-knot emblem: a mint star, open gold yoke and lavender ties.
  // Artwork floats directly on the HUD; the transparent touch target stays 44px.
  const icon=make('span',null,'career-icon');icon.setAttribute('aria-hidden','true');
  icon.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44" fill="none" focusable="false"><path d="m16 25-3 14 7-4 3 4 2-14" fill="#c3cdee"/><path d="m23 26 5 11 3-6 6 1-9-11" fill="#aad9cd"/><path d="M12 20 8 12l8-4m12 0 8 4-4 8" stroke="#eee0b9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="m22 7 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z" fill="#b7ded2" stroke="#f5f5dd" stroke-width="1.25" stroke-linejoin="round"/><path d="m22 13 3 7 7 2-7 3-3 7-3-7-7-3 7-2Z" fill="#80b6b2"/><path d="m22 16 3 6-3 6-3-6Z" fill="#f6efcf"/><path d="m5 26 2 2m30-22 1-3" stroke="#d3d9ee" stroke-width="1.2" stroke-linecap="round"/></svg>';
  button.append(icon);
  button.type='button';button.setAttribute('aria-label','打开职业手册');const wallet=walletFactory?.({mount:slot})||null;if(!wallet)slot.append(money);slot.append(button);
  const dialog=make('dialog',null,'career-dialog ww-airy-theme ww-airy-panel'),feedback=make('div',null,'career-review-pop'),style=make('style');
  dialog.setAttribute('aria-label','职业手册与正式职位登记');feedback.setAttribute('role','status');feedback.hidden=true;
  style.textContent='.career-wallet-slot{display:flex;align-items:center;gap:7px}.career-dialog{position:fixed;inset:0;margin:auto;width:min(520px,calc(100vw - max(28px,env(safe-area-inset-left)) - max(28px,env(safe-area-inset-right))));max-height:calc(100dvh - max(16px,env(safe-area-inset-top)) - max(16px,env(safe-area-inset-bottom)));overflow:auto;overscroll-behavior:contain;border:1px solid #baa476;border-radius:16px;padding:20px;background:#f5efde;color:#3e4d44}.career-dialog::backdrop{background:#253d3866}.career-dialog h2{margin:0 35px 6px 0;font-size:21px}.career-dialog h3{font-size:15px;margin:16px 0 8px}.career-dialog p{font-size:13px;line-height:1.65;margin:8px 0}.career-dialog button{min-height:44px;border-radius:9px;padding:9px 12px;background:#dedcc8;color:#344d44}.career-dialog button:focus-visible{outline:3px solid #3e7763;outline-offset:2px}.career-dialog .career-close{position:absolute;right:9px;top:8px;background:transparent;font-size:24px}.career-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px}.career-positive{color:#256742!important}.career-negative{color:#a13e36!important}.career-review-pop{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:24;max-width:calc(100vw - 56px);padding:12px 18px;border-radius:12px;background:#fff7e8;box-shadow:0 5px 25px #20372933;font-size:13px;pointer-events:none}@media(max-height:500px){.career-dialog{padding:14px 18px}.career-dialog h2{font-size:18px}.career-dialog p{margin:6px 0}.career-dialog h3{margin:10px 0 6px}}';
  style.textContent+='.career-wallet-slot .career-open{display:grid;place-items:center;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;border:0;border-radius:0;background:transparent;box-shadow:none;outline-offset:2px}.career-wallet-slot .career-open:hover,.career-wallet-slot .career-open:active{background:transparent;box-shadow:none}.career-icon{display:block;width:38px;height:38px;pointer-events:none}.career-icon svg{display:block;width:100%;height:100%}.career-role-card{padding:16px;margin:14px 0;border:1px solid #cbbd9d;border-radius:12px;background:#fffaf0}.career-role-card h3{margin:0 0 5px;font-size:18px}.career-role-place{color:#626a5c}.career-role-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.career-role-fact{padding:9px;border-radius:8px;background:#ecebdc}.career-role-fact span{display:block;font-size:12px;color:#656b5e}.career-role-fact strong{display:block;margin-top:4px;font-size:15px}.career-requirements{padding:10px 0;border-top:1px solid #d8cdb4;border-bottom:1px solid #d8cdb4}.career-requirement{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr) auto;gap:8px;align-items:center;padding:5px 0;font-size:13px}.career-requirements h4{margin:0 0 6px;font-size:14px}.career-application-result{padding:10px 12px;border-radius:8px;background:#e9ecdb;font-weight:600}.career-dialog button:disabled{opacity:.55;cursor:not-allowed}.career-dialog .career-primary{background:#3d6659;color:#fff9e7}.career-role-card .career-actions{margin-top:12px}.career-empty{padding:14px;background:#ecebdc;border-radius:10px}';
  style.textContent+='.career-dialog{padding:16px;color:#594833;border-color:#b49665}.career-dialog h2{font-size:17px;margin-bottom:4px}.career-dialog h3{font-size:13px;margin:10px 0 5px}.career-dialog p{font-size:12px;line-height:1.45;margin:6px 0}.career-shift-status{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:5px;margin:10px 0}.career-shift-status strong{font-size:13px;color:#815829}.career-shift-status span{font-size:11px;color:#786c58}.career-dialog .career-primary{background:#8c6237;color:#fff5da}.career-current-action{width:100%;margin:2px 0 8px}.career-metrics{margin:8px 0 0}.career-metric{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;align-items:start;border-top:1px solid #d7c9aa;padding:9px 0;font-size:12px}.career-metric dt{color:#837259;padding-top:2px}.career-metric dd{margin:0}.career-metric strong{font-size:13px;font-weight:600}.career-metric small{display:block;font-size:11px;line-height:1.35;color:#84725c;margin-top:3px}.career-status-note{color:#84725c}.career-role-card h3{font-size:15px}.career-role-card{padding:12px;margin:10px 0}.career-role-facts{margin:8px 0}.career-role-fact strong{font-size:13px}.career-role-fact span{font-size:11px}.career-requirement{font-size:12px;padding:3px 0}';
  style.textContent+='@media(max-height:500px) and (min-width:640px){.career-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:18px;margin-top:6px}.career-metric{grid-template-columns:70px minmax(0,1fr);gap:7px;padding:8px 0}}';
  style.textContent+=AIRY_UI_THEME+CAREER_CARD_STYLE+AIRY_PANEL_STYLE;
  (doc.head||doc.body).append(style);doc.body.append(slot,dialog,feedback);
  let registrationRoleId=null,registrationScope='role',signature='',generation=0;
  let reviewId=careers.state().lastEvaluation?.id||null,customerReviewId=careers.state().lastDuty?.customerReviews?.at(-1)?.id||null,feedbackUntil=-1;
  const roles=()=>careers.catalogue?.()||FORMAL_CAREER_ROLES;
  const currentRole=(s,list)=>careers.currentRole?.()||list.find(r=>r.id===s.tenure?.roleId)||null;
  const localService=role=>{
    const country=getCountry();
    if(!role||country&&country!==place(role).country)return null;
    return getService?.(role.id)||null;
  };
  const nearbyRegistries=()=>{
    const p=getPlayer()?.root?.position;if(!p)return [];
    return roles().filter(role=>place(role).country===getCountry()).map(role=>({role,intent:localService(role)?.intent(registryKind(role))})).filter(({intent})=>intent?.position&&Math.abs(p.y-intent.position[1])<1&&Math.hypot(p.x-intent.position[0],p.z-intent.position[2])<=8).sort((a,b)=>Math.hypot(p.x-a.intent.position[0],p.z-a.intent.position[2])-Math.hypot(p.x-b.intent.position[0],p.z-b.intent.position[2]));
  };
  const close=()=>{generation++;if(dialog.open)dialog.close();};
  const buttonFor=(title,run)=>{const b=make('button',title),token=generation;b.type='button';b.onclick=()=>{if(dialog.open&&token===generation)run();};return b;};
  const action=(role,kind,label,registration=null)=>{
    const intent=localService(role)?.intent(kind);if(!intent)return null;
    const token=generation;
    return buttonFor(label||intent.action,()=>{
      if(!dialog.open||token!==generation)return;
      const service=localService(role),next=service?.intent(kind);
      if(!next||next.id!==intent.id||next.intentKey!==intent.intentKey)return;
      close();onIntent(registration?{...next,registration:{...registration}}:next);
    });
  };
  function render(force=false) {
    const s=careers.state(),c=getClock(),list=roles(),held=currentRole(s,list),ageYears=getPlayer()?.ageYears;
    const registrationMode=!!registrationRoleId&&!(registrationScope==='role'&&held?.id===registrationRoleId);
    const country=getCountry(),countryRoles=list.filter(r=>place(r).country===country),registeredPlace=countryRoles.find(r=>r.id===registrationRoleId),localRoles=registeredPlace?countryRoles.filter(r=>workplaceKey(r)===workplaceKey(registeredPlace)):[];
    const role=held||localRoles.find(r=>r.id===registrationRoleId)||localRoles[0]||null,displayRoles=registrationScope==='role'?localRoles.filter(r=>r.id===registrationRoleId):localRoles;
    const belongsToTenure=row=>row&&held&&row.roleId===held.id&&(row.day>s.tenure.sinceDay||row.day===s.tenure.sinceDay&&(row.arrivalHour??24)>=s.tenure.sinceHour);
    const hired=!!held,d=belongsToTenure(s.lastDuty)?s.lastDuty:null;
    const pendingDuty=d&&d.day<c.day&&['inspection','ready'].includes(d.stage);
    const service=localService(role),key=[s.revision,registrationRoleId,registrationScope,held?.id,country,c.day,Math.floor(c.hour*60),!!service,service?.intent()?.intentKey,ageYears,JSON.stringify(careers.applicationResult?.()),
      ...localRoles.map(r=>`${r.id}:${r.vacancy}`)].join(':');
    if(!force&&key===signature)return;signature=key;generation++;
    dialog.replaceChildren();const x=buttonFor('×',close);x.className='career-close';x.setAttribute('aria-label','关闭职业手册');
    const heading=registrationMode?registrationScope==='role'?displayRoles[0]?.name||'岗位登记':`${WORKPLACE_NAMES[workplaceKey(registeredPlace)]||place(registeredPlace).workplace||'附近'} · 招工`:held?held.name:'职业登记处';
    dialog.setAttribute('aria-label',heading);
    const panel=createAiryPanelParts(doc);dialog.append(x,panel.header,panel.body,panel.actions);
    panel.header.append(make('h2',heading),make('p',registrationMode?registrationScope==='role'?'岗位柜台 · 任职登记':'本处岗位 · 当面申请':held?`${COUNTRIES[place(held).country]||place(held).country} · ${place(held).workplace}`:localRoles.length?'先到当地登记处了解岗位与申请条件。':'当地暂未开放正式职业登记。'));
    const text=(title,content)=>panel.body.append(make('h3',title),make('p',content));
    const skillLine=r=>Object.entries(requirements(r)).map(([id,need])=>`${SKILLS[id]||id} ${s.skills[id]??0}/${need}`).join(' · ');
    const eligibility=r=>careers.eligibility?.(r.id,{ageYears})||{ok:false,code:'unavailable'};
    const applicationCheck=r=>careers.applicationAvailability?.(r.id,{ageYears})||eligibility(r);
    const showRequirements=(root,r)=>{
      const box=make('div',null,'career-requirements');
      for(const[name,value,need,unit]of [['年龄',Number.isFinite(ageYears)?ageYears:null,r.minimumAgeYears,'岁'],...Object.entries(requirements(r)).map(([id,need])=>[SKILLS[id]||id,s.skills[id]??0,need,'点'])]){
        const pass=value!==null&&value>=need,row=make('div',null,'career-requirement');row.append(make('span',name),make('span',`${value===null?'待核对':value}${unit} / ${need}${unit}`),make('strong',pass?'✓':'未达',pass?'career-positive':'career-negative'));box.append(row);
      }root.append(box);
    };
    const receiptTitle=r=>r.saved===false?'申请未保存':r.status==='pending'?({submitted:'申请已提交 · 待面谈','document-ready':'审核已完成 · 待领文','document-held':'文书已领取 · 待宣读'})[r.stage]:r.status==='cancelled'?'申请已撤回':r.ok?'录用通过':'申请未通过';
    const showReceipt=(root,r,role)=>{
      const box=make('section',null,'career-application-result '+(r.ok?'career-positive':r.status==='pending'?'career-pending':'career-negative'));box.setAttribute('role','status');box.append(make('strong',receiptTitle(r)));
      if(r.status==='pending'){
        if(r.stage==='submitted')box.append(make('p',isClerk(role)?'沈叙：请当面呈上履历。听记朝议、礼仪与文书，均须核验。':role.id===GARDEN?'埃米尔：你愿意亲手浇护两畦玫瑰、归还原壶，再找我验收吗？':role.id==='cn-tavern-chef'?'许安：后厨需要按客单备料、烹制并核对出菜。你愿意按这份职责当班吗？':'许安：送餐要看清客人和餐点，脏桌、退房客房也要及时清理。你愿意照此当班吗？'));
        else box.append(make('p',r.appointment?.text||'请继续办理任命文书'));
      }else if(r.ok){const hour=r.tenure.sinceHour,minutes=Math.floor(hour*60);box.append(make('p',`第${r.tenure.sinceDay+1}日 ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}受职`));}
      else box.append(make('p',r.saved===false?'本次结果未保存，也未占用今日申请次数。请重试。':`${(r.reasons||[r.code]).map(code=>code==='withdrawn'?'已撤回，未建立正式任职':resultReason(code)).join('；')} · ${c.day===r.day?`今日次数已用，第${r.day+2}日可再申请`:'今日可重新申请'}`));
      root.append(box);
    };
    const cardFor=item=>{
      const own=s.tenure?.roleId===item.id,check=applicationCheck(item),receipt=careers.applicationResult?.(item.id),pending=receipt?.status==='pending',isLocal=registrationScope==='role',p=place(item);
      const card=make('section',null,'career-role-card');if(pending&&isLocal)card.setAttribute('data-pending','true');const head=make('div',null,'career-card-heading'),mark=make('span',null,'career-role-mark');mark.innerHTML=careerRoleMark(item.id);mark.setAttribute('aria-hidden','true');
      const title=make('div');title.append(make('h3',item.name),make('p',`${p.workplace} · ${employer(item)}`,'career-role-place'));head.append(mark,title);card.append(head);
      const facts=make('div',null,'career-card-facts');facts.append(make('strong',`${item.wage}${unit(item)}`, 'career-card-wage'),make('span','/ 日'),make('span',own?'任职中':`空缺 ${item.vacancy??1}`,own?'career-vacancy held':'career-vacancy'));card.append(facts);
      const skills=make('div',null,'career-skill-chips');for(const[id,need]of Object.entries(requirements(item))){const value=s.skills[id]??0,pass=value>=need,chip=make('span',`${pass?'✓':'○'} ${SKILLS[id]||id} ${value}/${need}`,pass?'career-skill-met':'career-skill-missing');chip.setAttribute('aria-label',`${SKILLS[id]||id} 当前${value}级，要求${need}级，${pass?'已达标':'未达标'}`);skills.append(chip);}card.append(skills);
      if(pending&&isLocal)showReceipt(card,receipt,item);
      else if(receipt)card.append(make('p',receiptTitle(receipt),'career-card-status'));
      const details=make('details',null,'career-card-details');details.append(make('summary','岗位详情'));details.append(make('p',dutySummary(item)));showRequirements(details,item);
      if(receipt&&!pending)showReceipt(details,receipt,item);
      details.append(make('p',`完成职责后，日薪 ${wageRange(item)} 存银行。每个岗位每天提交一次。`));
      if(pending){const cancel=buttonFor('撤回这份申请',()=>{careers.cancelApplication(item.id,receipt.id);render(true);});cancel.className='career-withdraw';details.append(cancel);}
      let primary;
      if(!isLocal){primary=action(item,registryKind(item),own?'查看职位':pending?'继续审核':receipt&&receipt.day===c.day?'查看申请结果':'前往申请',{scope:'role',roleId:item.id});}
      else if(pending){const kind=isClerk(item)?({submitted:'review','document-ready':'receive-document','document-held':'appointment'})[receipt.stage]:'formal-review';primary=action(item,kind);}
      else if(receipt&&receipt.saved!==false&&receipt.day===c.day){primary=buttonFor('查看申请结果',()=>{details.open=!details.open;});}
      else{primary=action(item,isClerk(item)?'apply':'formal-apply',check.ok?'提交职位申请':'查看申请条件');if(primary&&!check.ok){primary.onclick=()=>{details.open=!details.open;};}}
      if(!primary){primary=buttonFor(pending?'待招聘人到场':own?'查看职位':'查看申请条件',()=>{details.open=!details.open;});}
      primary.className='career-card-primary ww-airy-action';card.append(primary,details);return card;
    };
    const result=careers.applicationResult?.(held&&!registrationMode?held.id:registrationScope==='role'&&registrationRoleId?registrationRoleId:undefined),appliedRole=result&&list.find(r=>r.id===result.roleId);

    if(!registrationMode&&!held){
      const seen=new Set();for(const {role:item}of nearbyRegistries()){if(seen.has(workplaceKey(item)))continue;seen.add(workplaceKey(item));const go=action(item,registryKind(item),`前往${WORKPLACE_NAMES[workplaceKey(item)]||place(item).workplace}`,{scope:'catalogue',roleId:item.id});if(go)panel.body.append(go);}if(!seen.size)panel.body.append(make('p','走近场所负责人，即可查看这里的招工。'));
    }else if(registrationMode){
      const cards=make('div',null,'career-card-grid');for(const item of displayRoles)cards.append(cardFor(item));panel.body.append(cards);
      if(!displayRoles.length)panel.body.append(make('p','当地暂未开放正式职业登记。'));
    }else if(held){
      const live=service?.state?.(),job=live?.job?.formalRoleId===held.id&&d?.workReceiptId===live.job.receiptId?live.job:null,availability=service?.formal?.beginAvailability?.()||careers.beginDutyAvailability(held.id);
      const current=d&&(d.day===c.day||pendingDuty)?d:null;
      const window=held.dutyWindow,stamp=hour=>`${String(Math.floor(hour)).padStart(2,'0')}:${String(Math.round(hour%1*60)).padStart(2,'0')}`;
      const status=current?({arrived:'已报到 · 候班',attending:'当班中',archive:'待归档',working:'当班中',inspection:'待验收',ready:'工资待入账',paid:'今日已结薪',missed:d.reason==='court-postponed'?'本班延期':'本班未完成'}[d.stage]||'已任职'):availability.ok?'已任职 · 未报到':availability.code==='outside-arrival-window'?'休班 · 未报到':availability.code==='already-paid-today'?'本岗位未开班':'已任职 · 暂不可开班';
      const banner=make('div',null,'career-shift-status');banner.append(make('strong',status),make('span',`第${c.day+1}日 ${stamp(c.hour)} · 开班 ${stamp(window.startHour)}–${stamp(window.endHour)}`));panel.body.append(banner);
      // An unstarted shift offers only explicit admission. Once admitted the
      // one current physical step replaces it; no future task list is created.
      let next=null;
      if(service){
        if(job)next=service.intent();
        else if(isClerk(held)&&current&&['archive','ready'].includes(current.stage))next=service.intent(current.stage==='archive'?'archive':'settle');
        else if(availability.ok)next=service.intent(isClerk(held)?'attend':'accept');
      }
      if(next&&!['view','formal-view'].includes(next.kind)){
        const primary=action(held,next.kind,availability.unchanged&&!job?'继续当前班次':next.action);if(primary){primary.className='career-current-action ww-airy-action';panel.actions.append(primary);}
      }
      const rows=make('dl',null,'career-metrics');
      const metric=(label,value,detail='')=>{const row=make('div',null,'career-metric'),valueCell=make('dd');valueCell.append(make('strong',value));if(detail)valueCell.append(make('small',detail));row.append(make('dt',label),valueCell);rows.append(row);};
      const progress=job?.formalRoleId===held.id?job.shiftKind==='continuous'||current?.shiftKind==='continuous'?`${((job.coveredSeconds||0)*.7/60).toFixed(2)} 小时 · 已完成 ${job.completedTasks??0} 项`:Number.isInteger(job.completedOrders)?`${job.completedOrders} / ${job.requiredOrders??2} 单`:held.id===TAVERN?`${job.completedTables??0} / 2 桌`:held.id===GARDEN?`${job.completedBeds??0} / 2 畦`:current?.stage||'进行中':current?({arrived:'已报到',attending:'朝会进行中',archive:'待归档',inspection:'完成 · 待验收',ready:'完成',paid:'完成',missed:'未完成'}[current.stage]||'进行中'):'未开始';
      metric('◷ 进度',progress,pendingDuty?`第${d.day+1}日未结班次`:current?.stage==='working'&&job&&next?next.action:'');
      const review=s.lastEvaluation?.roleId===held.id&&d&&s.lastEvaluation.day===d.day?s.lastEvaluation:null,customer=d?.customerReviews?.at(-1),penalty=(d?.customerReviews||[]).reduce((sum,r)=>sum-r.score,0);
      metric('✓ 评价',customer?`${customer.positive?'👍 已纠正 +1':'👎 顾客差评 −2'}`:review?`${review.positive?review.score===0?'交班已验收':'好评 +1':'差评 −1'} · 第${review.day+1}日`:'暂无当班评价',customer?`${customer.customerName} · ${customer.reason}${penalty?` · 当班扣薪${penalty}铜文`:''}`:review?`${employer(held)} · ${review.reason}`:`主管 ${employer(held)}`);
      const salary=current?.wage!=null?`${current.wage}${unit(held)} · ${current.stage==='paid'?'已入账':'待入账'}`:current?.stage==='inspection'?'已完成 · 待核薪':current?.stage==='working'?'当班未结薪':'本日未产生工资';
      metric('¤ 银行薪资',salary,`日薪 ${wageRange(held)}${d?.shiftKind==='continuous'?' · 06–18完整班，按实际工时核算':''}${penalty?' · 顾客评价扣薪'+penalty+'铜文':''} · ${held.currency==='france'?'法国券':'铜文'}账户${pendingDuty?' · 第'+(d.day+1)+'日待结':''}`);
      metric('↗ 晋升','尚未开放',`${skillLine(held)} · 成长 ${s.promotionProgress??0}`);
      panel.body.append(rows);
      if(!current&&availability.code==='already-paid-today')panel.body.append(make('p','今日已在另一班次结薪；此岗位可于下一模拟日开始。','career-status-note'));
      if(appliedRole){const history=make('details',null,'career-card-details career-employment-history');history.append(make('summary','录用记录'));showReceipt(history,result,appliedRole);panel.body.append(history);}
      if(!service)panel.body.append(make('p',`工作地点：${COUNTRIES[place(held).country]||place(held).country} · ${place(held).workplace}`,'career-status-note'));
      if(registrationRoleId===held.id&&registrationScope==='role'){
        const resign=action(held,isClerk(held)?'resign':'formal-resign');if(resign)panel.body.append(resign);
      }
    }
    if(s.loadError)panel.body.append(make('p','职业存档暂时无法核对，请保留当前存档后再试。','career-negative'));
  }
  function open(options=false){
    wallet?.close();
    registrationRoleId=options===true?CLERK:options&&typeof options==='object'?options.roleId||null:null;
    registrationScope=options===true||options?.scope==='catalogue'?'catalogue':'role';
    onOpen();render(true);if(!dialog.open)dialog.showModal();
  }
  button.onclick=()=>{
    const s=careers.state(),list=roles();if(currentRole(s,list))return open(false);
    const nearby=nearbyRegistries()[0],local=nearby?.role,next=nearby?.intent;
    if(!next)return open(false);wallet?.close();close();onOpen();onIntent({...next,registration:{scope:'catalogue',roleId:local.id}});
  };dialog.addEventListener('cancel',()=>close());dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  return {open,close,isOpen:()=>!!dialog.open,
    update(mode){const s=careers.state(),r=s.lastEvaluation,c=getClock();slot.hidden=mode!=='lot';if(!wallet){money.textContent=`${copperLedger.state().cash} 铜文`;money.setAttribute('aria-label',`手头${copperLedger.state().cash}铜文`);}const employed=!!s.tenure&&!s.loadError;button.hidden=!employed&&!nearbyRegistries().length;button.setAttribute('aria-label',employed?'打开当前职业手册':'查看附近场所招工');
      const customer=s.lastDuty?.customerReviews?.at(-1);
      if(customer&&customer.id!==customerReviewId){customerReviewId=customer.id;feedback.textContent=`${customer.positive?'👍':'👎'} ${customer.customerName}：${customer.reason}`;feedback.className='career-review-pop '+(customer.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      else if(r&&r.id!==reviewId){reviewId=r.id;const role=roles().find(item=>item.id===r.roleId);feedback.textContent=`${r.positive?'👍':'👎'} ${employer(role)}：${r.reason}`;feedback.className='career-review-pop '+(r.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      if(c.seconds>=feedbackUntil||mode!=='lot')feedback.hidden=true;if(dialog.open)render();},
    dispose(){close();wallet?.dispose();slot.remove();dialog.remove();feedback.remove();style.remove();},
  };
}
