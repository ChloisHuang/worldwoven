import {appendOfficialPromotionPanel,appendOfficialCareerHistory} from './official-career-panel.js';
import {appendClinicPhysicianPanel,CLINIC_PHYSICIAN_PANEL_STYLE} from './china-clinic-physician-panel.js';
import {appendSalonCareerPanel} from './china-salon-career-panel.js';
import {FORMAL_CAREER_ROLES} from './formal-careers.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {CAREER_CARD_STYLE,careerRoleMark,careerWorkplaceMark} from './career-registration-cards.js';
import {GAME_CURRENCIES} from './currency-ledger.js';

// The shared catalogue only reads career state. Applications and work still
// travel through the live country's physical intent and visibility checks.
const CLERK='cn-court-clerk',TAVERN='cn-tavern-steward',GARDEN='fr-garden-assistant',TEA='fr-tea-server',PASTRY='fr-tea-pastry',GUARD='cn-palace-guard',ROYAL='cn-royal-kitchen-cook',RECEPTION='jp-reception-apprentice',BATH_DELIVERY='jp-bath-delivery',WOMEN_BATH_DELIVERY='jp-women-bath-delivery',BATH_MIXING='jp-bath-mixing',KITCHEN='jp-kitchen-cook',TABLE_SERVICE='jp-table-service',EGYPT_KITCHEN='eg-kitchen-cook',EGYPT_TABLE='eg-table-service';
const PLACES={
  [CLERK]:{country:'china',currency:'copper',workplace:'承务官署',employer:'沈叙（礼仪官）',destination:'承务官署 · 铨录登记案'},
  [TAVERN]:{country:'china',currency:'copper',workplace:'云来酒楼',employer:'许安',destination:'云来酒楼 · 许安的招工登记案'},
  [GARDEN]:{country:'france',currency:'france',workplace:'西苑',employer:'埃米尔',destination:'西苑工具架 · 埃米尔的园艺登记簿'},
  [TEA]:{country:'france',currency:'france',workplace:'宫苑茶廊 · 侍茶登记',employer:'玛农',destination:'宫苑茶廊 · 侍茶登记'},
};
const WORKPLACES={'cn-court-clerk':'bureau','cn-tavern-steward':'tavern','cn-tavern-chef':'tavern','fr-garden-assistant':'garden','cn-pharmacy-apprentice':'clinic','cn-clinic-physician':'clinic','cn-salon-poet':'salon',[TEA]:'tea',[PASTRY]:'pastry',[GUARD]:'guard',[ROYAL]:'royal-kitchen',[RECEPTION]:'bathhouse',[BATH_DELIVERY]:'bath-delivery',[WOMEN_BATH_DELIVERY]:'women-bath-delivery',[BATH_MIXING]:'bath-mixing',[KITCHEN]:'kitchen',[TABLE_SERVICE]:'table-service',[EGYPT_TABLE]:'egypt-table-service',[EGYPT_KITCHEN]:'egypt-kitchen'},WORKPLACE_NAMES={bureau:'承务官署',tavern:'云来酒楼',garden:'西苑工具架',clinic:'安和医馆',salon:'云来楼三层雅集',tea:'宫苑茶廊',pastry:'宫苑糕点房',guard:'射圃巡值登记','royal-kitchen':'御膳备餐间',bathhouse:'霞汤屋接待台','bath-delivery':'霞汤屋男汤配送处','women-bath-delivery':'霞汤屋二层门厅女汤配送处','bath-mixing':'霞汤屋四层浴包配制处',kitchen:'霞汤屋一层厨房','table-service':'霞汤屋一层餐桌服务处','egypt-table-service':'尼罗餐厅服务登记处','egypt-kitchen':'尼罗厨房供膳登记处'};
const WORKPLACE_ROLES={bureau:'沈叙 · 礼务录事',tavern:'许安 · 服务助理、厨师',garden:'埃米尔 · 园艺助理',clinic:'许宁 · 医师、药铺助手',salon:'温晚 · 诗词艺者',tea:'玛农 · 侍茶员',pastry:'卡米耶 · 茶点制作员',guard:'陆衡 · 锦衣卫巡值','royal-kitchen':'Jia · 御膳厨役',bathhouse:'Koharu · 汤馆接待见习','bath-delivery':'Sora · 男汤浴包配送员','women-bath-delivery':'Mei · 女汤浴包配送员','bath-mixing':'Itsuki · 浴包配制员',kitchen:'Haru · 厨房制作员','table-service':'Daichi · 餐桌服务员','egypt-table-service':'达娜 · 餐桌服务员','egypt-kitchen':'赫特 · 厨房制作员'};
const workplaceKey=role=>WORKPLACES[role?.id]||role?.id;
const COUNTRIES={china:'中国',france:'法国',japan:'日本',egypt:'埃及'},SKILLS={ritual:'礼仪',writing:'文书',gardening:'园艺',art:'艺术',cooking:'烹饪',martial:'武艺',care:'照护'};
const place=role=>({...PLACES[role?.id],...role});
const unit=role=>{const id=place(role).currency;return id==='copper'?'铜文':id==='france'?'法国券':id==='japan'?'日本券':GAME_CURRENCIES[id]?.unit||'';};
const wageRange=role=>{const bonus=role.preparationBonus??(role.id===CLERK?2:0);return `${role.wage}${bonus?'–'+(role.wage+bonus):''}${unit(role)}`;};
const requirements=role=>role.skillRequirements||role.requirements||{};
const employer=role=>place(role).employer||'岗位主管';
const isBathDelivery=role=>[BATH_DELIVERY,WOMEN_BATH_DELIVERY].includes(role?.id);
const bathSideName=role=>role.id===WOMEN_BATH_DELIVERY?'女汤':'男汤';
const isClerk=role=>role?.id===CLERK;
const registryKind=role=>isClerk(role)?'view':'formal-view';
const dutySummary=role=>role.duties|| (isClerk(role)?'11:30朝仪听记 · 官署归档':role.id===TAVERN?'06:00–18:00 · 持续送餐、清洁脏桌、打扫退房客房；提前交班按工时计薪':'06:00–18:00 · 原壶浇两畦、归还与验收');
const resultReason=code=>({'already-applied-today':'本岗位今日已提交，下一模拟日可再申请','interview-rejected':'硬门槛已满足，本次面谈未获录用','hiring-context-unavailable':'招聘信息暂不可用，请稍后重试','adult-required':'年龄未达要求','age-range-required':'台班招募年龄为18–40岁','ritual-required':'礼仪未达要求','writing-required':'文书未达要求','gardening-required':'园艺未达要求','art-required':'艺术未达要求','cooking-required':'烹饪未达要求，可在藏书处学习','martial-required':'武艺未达要求，请在射圃完成安全习射','care-required':'照护未达要求，可读虚构照护书并完成原助手服务','tavern-chef-days-required':'须在三个不同模拟日完成正式酒楼厨师原客单','clinic-experience-required':'须先完成一单药铺助手原单与本人交付，作为入门履历','already-employed':'已有正式职位，请先在原岗位办理离职','political-title-held':'已有宫廷名位，须先明确辞去名位','political-state-unavailable':'宫廷身份暂不可核验','no-vacancy':'当前没有空缺','save-failed':'登记未能保存，请重试','async-save-unsupported':'登记未能保存，请重试','invalid-clock':'世界时钟暂不可用','invalid-career-state':'职业存档暂时无法核对'}[code]||'本次登记未完成，请稍后重试');


export function createCareerHandbook({careers,copperLedger,getClock,getService,getCountry=()=>null,getPlayer=()=>null,
  onIntent=()=>{},onOpen=()=>{},walletFactory=null,getPoliticalTitle=()=>null,onPoliticalTitleOpen=null,document:doc=globalThis.document}) {
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
  style.textContent+=CLINIC_PHYSICIAN_PANEL_STYLE;
  (doc.head||doc.body).append(style);doc.body.append(slot,dialog,feedback);
  let registrationRoleId=null,registrationScope='role',signature='',generation=0;
  const initialWork=careers.workState();
  let reviewId=initialWork.lastEvaluation?.id||null,customerReviewId=initialWork.lastCustomerReview?.id||null,feedbackUntil=-1;
  const roles=()=>careers.catalogue?.()||FORMAL_CAREER_ROLES;
  const currentRole=(s,list)=>careers.currentRole?.()||list.find(r=>r.id===s.tenure?.roleId)||null;
  const localService=role=>{
    const country=getCountry();
    if(!role||country&&country!==place(role).country)return null;
    return getService?.(role.id)||null;
  };
  const atRegistration=role=>{
    const service=localService(role);if(service?.atRegistration)return !!service.atRegistration();
    const point=service?.intent(registryKind(role)),p=getPlayer()?.root?.position;
    return !!(p&&point?.position&&Math.abs(p.y-point.position[1])<.3&&Math.hypot(p.x-point.position[0],p.z-point.position[2])<=(point.executionRadius??.18));
  };
  const nearbyRegistries=()=>{
    const p=getPlayer()?.root?.position;if(!p)return [];
    return roles().filter(role=>place(role).country===getCountry()).map(role=>({role,intent:localService(role)?.intent(registryKind(role))})).filter(({intent})=>intent?.position).sort((a,b)=>Math.hypot(p.x-a.intent.position[0],p.z-a.intent.position[2])-Math.hypot(p.x-b.intent.position[0],p.z-b.intent.position[2]));
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
    const focusedResult=registrationRoleId&&careers.applicationResult?.(registrationRoleId),showWorkplace=registrationScope==='catalogue'||focusedResult?.saved!==false&&focusedResult?.ok===false&&['rejected',undefined].includes(focusedResult?.status)&&localRoles.length>1;
    const role=held||localRoles.find(r=>r.id===registrationRoleId)||localRoles[0]||null,displayRoles=showWorkplace?localRoles:localRoles.filter(r=>r.id===registrationRoleId);
    const belongsToTenure=row=>row&&held&&row.roleId===held.id&&(row.day>s.tenure.sinceDay||row.day===s.tenure.sinceDay&&(row.arrivalHour??24)>=s.tenure.sinceHour);
    const hired=!!held,d=belongsToTenure(s.lastDuty)?s.lastDuty:null;
    const pendingDuty=d&&d.day<c.day&&['inspection','ready'].includes(d.stage);
    const service=localService(role),tableChoices=[TABLE_SERVICE,GARDEN].includes(held?.id)&&d?.stage==='working'?service?.taskChoices?.()||[]:[],key=[s.revision,registrationRoleId,registrationScope,held?.id,country,c.day,Math.floor(c.hour*60),!!service,service?.intent()?.intentKey,held?.paymentKind==='commission'?Math.floor(service?.state?.().progressSeconds||0):null,ageYears,JSON.stringify(careers.applicationResult?.()),
      JSON.stringify(tableChoices.map(choice=>[choice.kind,choice.action,choice.detail])),...localRoles.map(r=>`${r.id}:${r.vacancy}:${atRegistration(r)}`)].join(':');
    if(!force&&key===signature)return;signature=key;generation++;
    dialog.replaceChildren();const x=buttonFor('×',close);x.className='career-close';x.setAttribute('aria-label','关闭职业手册');
    const heading=registrationMode?!showWorkplace?displayRoles[0]?.name||'岗位登记':`${WORKPLACE_NAMES[workplaceKey(registeredPlace)]||place(registeredPlace).workplace||'附近'} · 招工`:held?held.name:`${COUNTRIES[country]||'当地'} · 求职场所`;
    dialog.setAttribute('aria-label',heading);
    const panel=createAiryPanelParts(doc);dialog.append(x,panel.header,panel.body,panel.actions);
    panel.header.append(make('h2',heading),make('p',registrationMode?!showWorkplace?'岗位柜台 · 任职登记':'本处岗位 · 当面申请':held?`${COUNTRIES[place(held).country]||place(held).country} · ${place(held).workplace}`:'先选场所，到负责人面前查看和申请岗位。'));
    const text=(title,content)=>panel.body.append(make('h3',title),make('p',content));
    const skillLine=r=>Object.entries(requirements(r)).map(([id,need])=>`${SKILLS[id]||id} ${s.skills[id]??0}/${need}`).join(' · ');
    const eligibility=r=>careers.eligibility?.(r.id,{ageYears})||{ok:false,code:'unavailable'};
    const applicationCheck=r=>careers.applicationAvailability?.(r.id,{ageYears})||eligibility(r);
    const showRequirements=(root,r)=>{
      const box=make('div',null,'career-requirements');
      for(const[name,value,need,unit]of [['年龄',Number.isFinite(ageYears)?ageYears:null,r.minimumAgeYears,'岁'],...Object.entries(requirements(r)).filter(([,need])=>need>0).map(([id,need])=>[SKILLS[id]||id,s.skills[id]??0,need,'点'])]){
        const pass=value!==null&&value>=need&&!(name==='年龄'&&r.maximumAgeYears!==undefined&&value>r.maximumAgeYears),row=make('div',null,'career-requirement');row.append(make('span',name),make('span',`${value===null?'待核对':value}${unit} / ${need}${name==='年龄'&&r.maximumAgeYears!==undefined?'–'+r.maximumAgeYears:''}${unit}`),make('strong',pass?'✓':'未达',pass?'career-positive':'career-negative'));box.append(row);
      }if(r.id===RECEPTION)box.append(make('p','无技能前置；原客单的登记与归牌是入门培训，不授官品。'));root.append(box);
    };
    const receiptTitle=r=>r.saved===false?'申请未保存':r.status==='pending'?({submitted:'申请已提交 · 待面谈','document-ready':'审核已完成 · 待领文','document-held':'文书已领取 · 待宣读'})[r.stage]:r.status==='cancelled'?'申请已撤回':r.ok?r.employmentStatus==='active'?'录用通过':'历史录用 · 已离职':'申请未通过';
    const showReceipt=(root,r,role)=>{
      const box=make('section',null,'career-application-result '+(r.ok?r.employmentStatus==='active'?'career-positive':'career-history':r.status==='pending'?'career-pending':'career-negative'));box.setAttribute('role','status');box.append(make('strong',receiptTitle(r)));
      if(r.status==='pending'){
        if(r.stage==='submitted')box.append(make('p',isClerk(role)?'沈叙：请当面呈上履历。听记朝议、礼仪与文书，均须核验。':role.paymentKind==='commission'?'温晚：诗词台班仅一席，须成年且不超过40岁。每次邀约由你自主接受或谢绝；选诗、实际诵读并回应题意，完成后按场入银行。普通茶叙不含亲密安排。你愿意按这份职责任职吗？':role.id===GARDEN?'埃米尔：当班后按原花畦和黄杨篱的实际待做状态选择维护，领取原壶或原剪、亲手浇护或修齐新梢并归还。班次持续计时，另行交班按实际工时结薪，你愿意吗？':role.id===GUARD?'陆衡：安全接班后逐点巡查门廊、殿阶及东西巷，检查盲角并驻察；我继续照看射圃。你可持续轮巡，回圃交班按实际巡行与驻察工时结薪，愿意吗？':role.id===PASTRY?'卡米耶：在糕点房候班，核对玛农的原单，分切蛋糕、备热茶并核对装盘，把原茶盘交给玛农。原杯碟收洗后记评价，另行交班按实际工时结薪，你愿意吗？':role.id===TEA?'玛农：记下客人的原单，去糕点房传单，接取茶盘送到原座，用毕再收回杯碟。06:00–18:00持续当班，按实际工时结薪，你愿意吗？':role.id===TABLE_SERVICE?'Daichi：你愿意按原客号、菜品和桌位送餐，等客人用毕后亲手收洗原盘吗？错桌拒收后须取回原盘改正，工资按实际在岗工时结算。':role.id===EGYPT_TABLE?'达娜：须满18岁、礼仪1级。录用后另行接班，向萨米拉本人记原单并报给赫特，接同一原盘送本人，用毕收回厨房亲手洗净。06–18现场候单和服务连续计工时，完整班14埃及券存银行，真实收洗才记评价和经验。当前只有萨米拉一客一菜、24份有限储备，无每日补货，访客餐仍另付5券，不授官品。你愿意吗？':role.id===EGYPT_KITCHEN?'赫特：需满18岁、烹饪1级、礼仪1级。录用后另行接班，核对萨米拉的原单、制作陶锅蔬食与面包并交同一份原盘，原居民实际用毕后才有评价与经验。06:00–18:00真实安全交接后按现场职责覆盖工时计薪，正常候单计薪，完整日班18埃及券。居民供膳仅有一次性24份开局储备，无每日补货，完整财政未接；玩家访客餐仍为5埃及券。这是架空技术服务，不授官品，你愿意吗？':role.id===KITCHEN?'Haru：需满18岁、烹饪1级、礼仪1级。接班后核对来客号与菜名，制作寿司拼盘或热汤拉面，再将同号餐点放回原传菜位，由Daichi取盘送餐。06:00–18:00按实际在岗工时结薪，完整日班18日本券。你愿意接这份制作工作吗？':role.id===BATH_MIXING?'Itsuki：需满18岁、照护1级、文书1级。开班后核对原来客号、浴牌、汤区与虚构配方，把配好的同号浴包放回原配送队列。06:00–18:00按实际现场工时计薪，评价不增扣工资；工作不授免费泡汤或用餐资格。你愿意吗？':isBathDelivery(role)?`${employer(role)}：需满18岁、礼仪1级。开班后在馆候单，去四层取原来客的同号浴包，送回原客服务交接点核对浴牌与本人。06:00–18:00按实际现场工时计薪，评价不增扣工资；泡汤与点餐另按原服务办理，值班须先交接。你愿意吗？`:role.id===RECEPTION?'Koharu：先看清店规，按来客号登记客簿、发同号浴牌，离店时核号收回。18岁起可申请，无技能前置；录用后另行开班，06:00–18:00现场候单按实际工时计薪，评价不增扣工资。你愿意吗？':role.id===ROYAL?'Jia：我会核验你三个不同模拟日的酒楼厨师原单履历。御膳厨役不授官品；06:00–18:00按原单备餐、送达并核验用膳完成，交班按实际工时计薪，你愿意吗？':role.id==='cn-clinic-physician'?'许宁：需先有药铺原单服务履历。开班后当面问询原来客，按症状记录选择虚构照护单，再交苏禾；现场候诊与实际工作持续计时，交班按工时结薪。选单不符须更正，原患者领取后才记评价，你愿意吗？':role.id==='cn-pharmacy-apprentice'?'许宁：在医馆候班，接原单、按同号折包并交给本人。持续当班，交班按实际工时结薪，你愿意吗？':role.id==='cn-tavern-chef'?'许安：后厨需要按客单备料、烹制并核对出菜。你愿意按这份职责当班吗？':'许安：送餐要看清客人和餐点，脏桌、退房客房也要及时清理。你愿意照此当班吗？'));
        else box.append(make('p',r.appointment?.text||'请继续办理任命文书'));
      }else if(r.ok){const hour=r.tenure.sinceHour,minutes=Math.floor(hour*60);box.append(make('p',`第${r.tenure.sinceDay+1}日 ${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}${r.employmentStatus==='active'?'受职':'的录用记录'}`));}
      else box.append(make('p',r.saved===false?'本次结果未保存，也未占用今日申请次数。请重试。':`${(r.reasons||[r.code]).map(code=>code==='withdrawn'?'已撤回，未建立正式任职':resultReason(code)).join('；')} · ${c.day===r.day?`今日次数已用，第${r.day+2}日可再申请`:'今日可重新申请'}`));
      root.append(box);
    };
    const cardFor=item=>{
      const own=s.tenure?.roleId===item.id,check=applicationCheck(item),receipt=careers.applicationResult?.(item.id),past=careers.applicationHistory?.(item.id)||[],pending=receipt?.status==='pending',isLocal=!showWorkplace,p=place(item);
      const card=make('section',null,'career-role-card');if(pending&&isLocal)card.setAttribute('data-pending','true');const head=make('div',null,'career-card-heading'),mark=make('span',null,'career-role-mark');mark.innerHTML=careerRoleMark(item.id);mark.setAttribute('aria-hidden','true');
      const title=make('div');title.append(make('h3',item.name),make('p',`${p.workplace} · ${employer(item)}`,'career-role-place'));head.append(mark,title);card.append(head);
      const facts=make('div',null,'career-card-facts');facts.append(make('strong',`${item.paymentKind==='commission'?localService(item)?.state?.().quote??item.wage:item.wage}${unit(item)}`, 'career-card-wage'),make('span',item.paymentKind==='commission'?'/ 场':'/ 日'),make('span',own?'任职中':`空缺 ${item.vacancy??1}`,own?'career-vacancy held':'career-vacancy'));card.append(facts);
      if(item.id===ROYAL){const supply=localService(item)?.state?.().supply;if(supply)card.append(make('p',`开局库存余${supply.remaining}/120 · 损耗${supply.wasted}（不会每日补充）`,'career-card-status'));}
      const skills=make('div',null,'career-skill-chips');for(const[id,need]of Object.entries(requirements(item)).filter(([,need])=>need>0)){const value=s.skills[id]??0,pass=value>=need,chip=make('span',`${pass?'✓':'○'} ${SKILLS[id]||id} ${value}/${need}`,pass?'career-skill-met':'career-skill-missing');chip.setAttribute('aria-label',`${SKILLS[id]||id} 当前${value}级，要求${need}级，${pass?'已达标':'未达标'}`);skills.append(chip);}if(item.id===RECEPTION)skills.append(make('span','18岁起 · 无技能前置','career-skill-met'));if(item.id===ROYAL){const days=careers.royalKitchenQualification?.().qualifiedDays??s.workExperience?.tavernChef?.length??0;skills.append(make('span',`${days>=3?'✓':'○'} 酒楼原单 ${days}/3日`,days>=3?'career-skill-met':'career-skill-missing'));}card.append(skills);
      if(pending&&isLocal)showReceipt(card,receipt,item);
      else if(pending)card.append(make('p',receiptTitle(receipt),'career-card-status'));
      else{
        const reason=code=>code==='already-applied-today'?'本岗位今日次数已用':code==='application-pending'?'本岗位待面谈':code==='adult-required'?`需满${item.minimumAgeYears}岁`:(code.endsWith('-required')&&code.replace('-required','') in requirements(item))?`${SKILLS[code.replace('-required','')]}需${requirements(item)[code.replace('-required','')]}级（当前${s.skills[code.replace('-required','')]??0}）`:resultReason(code);
        const status=!check.ok?(check.reasons||[check.code]).map(reason).join('；'):'条件已满足 · 可申请';
        card.append(make('p',`${receipt?.day===c.day&&receipt.status==='rejected'?'申请未通过 · ':''}${status}`,'career-card-status '+(check.ok?'career-positive':'career-negative')));
      }
      const details=make('details',null,'career-card-details');details.append(make('summary',(receipt?.ok&&receipt.employmentStatus==='ended'||past.length)?'岗位详情与录用历史':'岗位详情'));details.append(make('p',dutySummary(item)));if(item.paymentKind==='commission')details.append(make('p','长期台班仅一席；你开班时柳清弦歇场，未开班由她明确代管，另外三专长不变。'));else if(item.vacancyKind==='exclusive')details.append(make('p',item.id===TABLE_SERVICE?'本岗位仅一席；Daichi负责面谈与交班。录用后须主动接班，你接替原餐桌送餐与收洗；休班时由Daichi代班，Haru继续按原单制作。':item.id===EGYPT_TABLE?'本岗位仅一席；达娜本人面谈并安全交班，你负责记单、报厨、接送原盘与收洗，赫特继续原厨房制作。休班由原达娜代管，接班后她在餐厅旁歇脚，显式交班才接回。':item.id===EGYPT_KITCHEN?'本岗位仅一席；赫特负责面谈与交班。录用后须主动接班，负责萨米拉的原居民餐单；休班时由赫特照料原厨房。':item.id===KITCHEN?'本岗位仅一席；Haru负责面谈与交班，你主动接班后负责厨房制作，Daichi继续取盘送餐。休班时由Haru代班。':item.id===BATH_MIXING?'本岗位仅一席；录用与开班分开。Itsuki当面审核与交班，开班后你接替原浴包配制，休班时由Itsuki代班。':isBathDelivery(item)?`本岗位仅一席；录用与开班分开。${employer(item)}当面审核与交班，开班后你接替${bathSideName(item)}原客浴包配送，休班时由${item.incumbentName}代班。`:item.id===RECEPTION?'本岗位仅一席；录用与开班分开。Koharu负责面谈与交班，开班后由你接待原来客，Tomo继续后备代班。':item.id===GUARD?`本岗位仅一席；${own?'你已任职，':''}主动开班后沈砚当面交出巡线去歇脚，未开班时明确代巡。陆衡继续照看射场。`:own?`本岗位由你任职，${item.incumbentName}已卸任。`:`本岗位仅一席；录用后${item.incumbentName}卸任。`));showRequirements(details,item);if(item.id===ROYAL)details.append(make('p','须在三个不同模拟日以正式酒楼厨师身份完成原单备料、烹制与出菜；履历离职后保留，阅读与成长不能代替。技术岗位，不授官品。正餐供皇家本人，工作不授用膳资格；开局库存120份，不会每日补充。'));if(item.id===TABLE_SERVICE)details.append(make('p','完整日班14日本券；寿司拼盘仍为8券，热汤拉面仍为6券。原客用毕且你亲手洗净原盘后，每单获得10点礼仪经验，与读书共用每日4次成长。120秒内为及时参考；错客、错桌或错菜被拒记差评−1，改正后原单仍可完成，重复操作不重复成长。评价不扣工资。虚构普通服务岗位，不授官品；工作不包含泡汤或餐食。'));if(item.id===EGYPT_TABLE)details.append(make('p','完整日班14埃及券，候单计工时，一单不封班；上岗前、离岗和无效挂靠不计薪。萨米拉原单实际送达、本人用毕且亲手洗净同盘才有礼仪10点经验，共用每日4次成长；120秒及时参考，评价不增扣工资。当前只一名原居民、一种餐点，不虚构错菜或客桌；多客错误交付仍待扩展。一次性24份储备，无每日补货，玩家访客餐另付5券。'));if(item.id===EGYPT_KITCHEN)details.append(make('p','完整日班18埃及券，真实安全交接后按现场职责覆盖工时折算，正常候单也计薪；上岗前、离岗与无效挂靠不计时。原居民实际用毕后，每单10点烹饪经验，与读书共用每日4次成长；90秒内为及时参考，迟做与未完交班只记评价，不增扣工资。一次性24份开局居民供膳储备，无每日补货，完整财政未接。架空技术服务岗位，不授官品；任职不包含玩家用餐，访客餐仍为5埃及券。'));if(item.id===KITCHEN)details.append(make('p','完整日班18日本券；寿司拼盘仍为8券，热汤拉面仍为6券。同号餐点准确放回原传菜位后获得10点烹饪经验，无须等待用餐；每日与读书共用4次成长。90秒内出品记及时，迟做与未完交班只记评价，不扣工资。工作不包含泡汤或餐食。'));if(item.id===BATH_MIXING)details.append(make('p','完整日班16日本券；仅配制云叶与灯花两种虚构浴包，适用原男汤或女汤客单。原同号成品放回配送队列即积累照护经验，无须等待使用；90秒内为及时参考，迟配与交回只记评价。技术服务，不授官品；任职不改变泡汤与独立点餐店规。'));if(isBathDelivery(item))details.append(make('p',`完整日班14日本券；原${bathSideName(item)}同号浴包交给原客后才积累照护经验。四层取包往返以180秒为及时参考，迟送与交回只记评价。技术服务，不授官品；任职不改变泡汤店规；独立点餐按原价支付。`));if(item.id===RECEPTION)details.append(make('p','本店幻想学徒制：工资12日本券/完整日班；现有拉面6券、寿司8券。登记和归牌准确完成才学习文书与礼仪；及时、迟办和交接分别记评价，工资只按现场工时。'));if(item.id==='cn-clinic-physician')details.append(make('p',`药铺助手原单履历：${s.lowerWork?.['cn-pharmacy-labor']?'已有可核验的本人交付':'未完成'} · 入门经历，不授官品`));
      if(receipt&&!pending)showReceipt(details,receipt,item);for(const old of past.slice().reverse())showReceipt(details,old,item);
      details.append(make('p',item.paymentKind==='commission'?'完成诗词茶叙后，原客款按场存银行；无客不生薪，任职不会随一场结束。每个岗位每天提交一次。':`完成职责后，日薪 ${wageRange(item)} 存银行。每个岗位每天提交一次。`));
      if(pending){const cancel=buttonFor('撤回这份申请',()=>{careers.cancelApplication(item.id,receipt.id);render(true);});cancel.className='career-withdraw';details.append(cancel);}
      let primary;
      if(!atRegistration(item)&&!pending||!isLocal&&(own||pending)){primary=action(item,registryKind(item),own?'查看职位':pending?'继续审核':receipt&&receipt.day===c.day?'查看申请结果':'前往申请',{scope:'role',roleId:item.id});}
      else if(pending){const kind=isClerk(item)?({submitted:'review','document-ready':'receive-document','document-held':'appointment'})[receipt.stage]:'formal-review';primary=action(item,kind);}
      else if(receipt&&receipt.saved!==false&&receipt.day===c.day){primary=buttonFor('查看申请结果',()=>{details.open=!details.open;});}
      else{primary=action(item,isClerk(item)?'apply':'formal-apply',check.ok?'提交职位申请':'查看申请条件');if(primary&&!check.ok){primary.onclick=()=>{details.open=!details.open;};}}
      if(!primary){primary=buttonFor(pending?'待招聘人到场':own?'查看职位':'查看申请条件',()=>{details.open=!details.open;});}
      primary.className='career-card-primary ww-airy-action';card.append(primary,details);return card;
    };
    const result=careers.applicationResult?.(held&&!registrationMode?held.id:registrationScope==='role'&&registrationRoleId?registrationRoleId:undefined),appliedRole=result&&list.find(r=>r.id===result.roleId);

    if(!registrationMode&&!held){
      const seen=new Set(),cards=make('div',null,'career-card-grid career-venue-grid');
      for(const {role:item}of nearbyRegistries()){
        const site=workplaceKey(item);if(seen.has(site))continue;seen.add(site);
        const here=countryRoles.filter(r=>workplaceKey(r)===site),card=make('section',null,'career-role-card career-venue-card');card.setAttribute('data-workplace',site);
        const art=make('div',null,'career-venue-art');art.innerHTML=careerWorkplaceMark(site);art.setAttribute('aria-hidden','true');
        card.append(art,make('h3',WORKPLACE_NAMES[site]||place(item).workplace),make('p',WORKPLACE_ROLES[site]||employer(item),'career-venue-roles'));
        if(here.some(r=>careers.applicationResult?.(r.id)?.status==='pending'))card.append(make('span','有待面谈申请','career-venue-pending'));
        const go=action(item,registryKind(item),`前往${WORKPLACE_NAMES[site]||place(item).workplace}`,{scope:'catalogue',roleId:item.id});if(go){go.className='career-card-primary ww-airy-action';card.append(go);}cards.append(card);
      }
      panel.body.append(cards);
      if(country==='china')panel.body.append(make('p','帝位与后宫身份路径尚未开放。','career-venue-note'));
      if(!seen.size)panel.body.append(make('p','这里暂未开放可申请的工作场所。'));
    }else if(registrationMode){
      const cards=make('div',null,'career-card-grid');for(const item of displayRoles)cards.append(cardFor(item));panel.body.append(cards);
      if(!displayRoles.length)panel.body.append(make('p','当地暂未开放正式职业登记。'));
    }else if(held?.paymentKind==='commission'){
      appendSalonCareerPanel({panel,role:held,service:localService(held),make,action});
      if(appliedRole){const history=make('details',null,'career-card-details');history.append(make('summary','录用记录'));showReceipt(history,result,appliedRole);panel.body.append(history);}
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
        else if(isClerk(held)&&careers.promotionSummary?.().application?.status==='pending'&&careers.promotionSummary?.().eligible)next=service.intent();
        else if(availability.ok)next=service.intent(isClerk(held)?'attend':'accept');
      }
      if(next&&!['view','formal-view'].includes(next.kind)&&!(held.id==='cn-clinic-physician'&&next.work?.kind==='choose')){
        const primary=action(held,next.kind,availability.unchanged&&!job?'继续当前班次':next.action);if(primary){primary.className='career-current-action ww-airy-action';panel.actions.append(primary);}
      }
      if([TABLE_SERVICE,GARDEN].includes(held.id)&&job?.stage==='working'&&tableChoices.length){
        const choices=make('section',null,'career-table-orders');choices.append(make('h3',held.id===GARDEN?'当前待做维护':'原客餐桌服务'));
        for(const choice of tableChoices){const pick=action(held,choice.kind,choice.action);if(!pick){if(held.id===GARDEN)choices.append(make('p',`${choice.action} · ${choice.detail||'暂不可做'}`,'career-status-note'));continue;}pick.classList.add('ww-airy-action');choices.append(pick);if(choice.detail)choices.append(make('p',choice.detail,'career-status-note'));}
        panel.body.append(choices);
      }
      if(held.id===ROYAL&&live?.supply)panel.body.append(make('p',`开局库存余${live.supply.remaining}/120 · 损耗${live.supply.wasted}（不会每日补充）`,'career-status-note'));
      if(held.id==='cn-clinic-physician')appendClinicPhysicianPanel({panel,role:held,service,make,action});
      const rows=make('dl',null,'career-metrics');
      const metric=(label,value,detail='')=>{const row=make('div',null,'career-metric'),valueCell=make('dd');valueCell.append(make('strong',value));if(detail)valueCell.append(make('small',detail));row.append(make('dt',label),valueCell);rows.append(row);};
      const progress=job?.formalRoleId===held.id?job.shiftKind==='continuous'||current?.shiftKind==='continuous'?`${((job.coveredSeconds||0)*.7/60).toFixed(2)} 小时 · 已完成 ${job.completedTasks??0} 项`:Number.isInteger(job.completedOrders)?`${job.completedOrders} / ${job.requiredOrders??2} 单`:held.id===TAVERN?`${job.completedTables??0} / 2 桌`:held.id===GARDEN?`${job.completedBeds??0} / 2 畦`:current?.stage||'进行中':current?({arrived:'已报到',attending:'朝会进行中',archive:'待归档',inspection:'完成 · 待验收',ready:'完成',paid:'完成',missed:'未完成'}[current.stage]||'进行中'):'未开始';
      metric('◷ 进度',progress,pendingDuty?`第${d.day+1}日未结班次`:current?.stage==='working'&&job&&next?next.action:'');
      const patientReview=['cn-pharmacy-apprentice','cn-clinic-physician'].includes(held.id)?live?.latestReview:null;
      const review=s.lastEvaluation?.roleId===held.id&&d&&s.lastEvaluation.day===d.day?s.lastEvaluation:null,customer=d?.customerReviews?.at(-1),penalty=(d?.customerReviews||[]).reduce((sum,r)=>sum-(['tea-completed','royal-kitchen-completed','japan-reception-completed','japan-bath-delivery-completed','japan-bath-mixing-completed','japan-kitchen-completed','japan-table-service-completed','egypt-kitchen-completed','garden-maintenance-completed'].includes(r.reasonCode)?0:r.score),0);
      metric('✓ 评价',customer?.reasonCode==='garden-maintenance-completed'?'✓ 园艺维护合格 +1':customer?.tableServiceReceipt?.kind==='complaint'?'👎 来客拒收 −1':['japan-reception-completed','japan-bath-delivery-completed','japan-bath-mixing-completed','japan-kitchen-completed','japan-table-service-completed','egypt-kitchen-completed'].includes(customer?.reasonCode)?customer.score>0?'✓ 准确及时 +1':customer.score===0?'○ 准确完成 · 等候较久':'↪ 未完成交接 −1':customer?`${customer.positive?['tea-completed','royal-kitchen-completed'].includes(customer.reasonCode)?'👍 顾客好评 +1':'👍 已纠正 +1':'👎 顾客差评 −2'}`:review?`${review.positive?review.score===0?'交班已验收':'好评 +1':'差评 −1'} · 第${review.day+1}日`:patientReview?'✓ 来客确认同号交付':'暂无当班评价',customer?`${customer.customerName} · ${customer.reason}${penalty?` · 当班扣薪${penalty}${unit(held)}`:''}`:review?`${employer(held)} · ${review.reason}`:patientReview?`${patientReview.recipientName} · 第${patientReview.number}号原单与纸包已当面核对`:`主管 ${employer(held)}`);
      const salary=current?.wage!=null?`${current.wage}${unit(held)} · ${current.stage==='paid'?'已入账':'待入账'}`:current?.stage==='inspection'?'已完成 · 待核薪':current?.stage==='working'?'当班未结薪':'本日未产生工资';
      metric('¤ 银行薪资',salary,`日薪 ${wageRange(held)}${d?.shiftKind==='continuous'?' · 06–18完整班，按实际工时核算':''}${penalty?' · 顾客评价扣薪'+penalty+unit(held):''} · ${unit(held)}账户${pendingDuty?' · 第'+(d.day+1)+'日待结':''}`);
      if(isClerk(held))appendOfficialPromotionPanel({careers,role:held,panel,metric,make,action,buttonFor});
      else if(held.id===GARDEN)metric('↗ 园艺成长',`园艺 ${s.skills.gardening}级`,`园艺经验 ${s.skillXP?.gardening??0}；原维护完成且归还工具，每项10点，与读书共用每日4次成长`);
      else if(held.id===TABLE_SERVICE)metric('↗ 服务成长',`礼仪 ${s.skills.ritual}级`,`礼仪经验 ${s.skillXP?.ritual??0}；原客用毕并亲手收洗原盘，每单10点，与读书共用每日4次成长；错桌拒收不获经验`);
      else if(held.id===EGYPT_TABLE)metric('↗ 服务成长',`礼仪 ${s.skills.ritual}级`,`礼仪经验 ${s.skillXP?.ritual??0}；萨米拉同单同盘实际用毕且亲手收洗，每单10点，共用每日4次成长；未完交回不获经验`);
      else if(held.id===EGYPT_KITCHEN)metric('↗ 制作成长',`烹饪 ${s.skills.cooking}级`,`烹饪经验 ${s.skillXP?.cooking??0}；萨米拉同单同盘实际用毕，每单10点，与读书共用每日4次成长；未完交回不获经验`);
      else if(held.id===KITCHEN)metric('↗ 制作成长',`烹饪 ${s.skills.cooking}级`,`烹饪经验 ${s.skillXP?.cooking??0}；寿司或拉面准确交回传菜位，每单10点，与读书共用每日4次成长`);
      else if(held.id===BATH_MIXING)metric('↗ 配制成长',`照护 ${s.skills.care}级`,`照护经验 ${s.skillXP?.care??0}；原同号成品放回队列，共用照护每日最多4次有效成长，不授官品`);
      else if(isBathDelivery(held))metric('↗ 服务成长',`照护 ${s.skills.care}级`,`照护经验 ${s.skillXP?.care??0}；原客同号交付，每日最多4次有效成长，不授官品`);
      else if(held.id===RECEPTION)metric('↗ 学徒成长',`文书 ${s.skills.writing}级 · 礼仪 ${s.skills.ritual}级`,`文书经验 ${s.skillXP?.writing??0} · 礼仪经验 ${s.skillXP?.ritual??0}；真实原单培训，不授官品`);
      else metric('↗ 晋升','尚未开放',`${skillLine(held)} · 成长 ${s.promotionProgress??0}`);
      panel.body.append(rows);
      if(!current&&availability.code==='already-paid-today')panel.body.append(make('p','今日已在另一班次结薪；此岗位可于下一模拟日开始。','career-status-note'));
      if(appliedRole){const history=make('details',null,'career-card-details career-employment-history');history.append(make('summary','录用记录'));showReceipt(history,result,appliedRole);for(const old of (careers.applicationHistory?.(held.id)||[]).slice().reverse())showReceipt(history,old,held);panel.body.append(history);}
      if(!service)panel.body.append(make('p',`工作地点：${COUNTRIES[place(held).country]||place(held).country} · ${place(held).workplace}`,'career-status-note'));
      if(['cn-pharmacy-apprentice','cn-clinic-physician',GARDEN,TEA,PASTRY,GUARD,ROYAL,RECEPTION,BATH_DELIVERY,WOMEN_BATH_DELIVERY,BATH_MIXING,KITCHEN,TABLE_SERVICE,EGYPT_KITCHEN,EGYPT_TABLE].includes(held.id)&&job?.stage==='working'){const end=action(held,'end-shift');if(end){end.classList.add('ww-airy-action');panel.actions.append(end);}}
      if(registrationRoleId===held.id&&registrationScope==='role'){
        const resign=action(held,isClerk(held)?'resign':'formal-resign');if(resign)panel.body.append(resign);const cancel=['cn-pharmacy-apprentice','cn-clinic-physician',GARDEN,TEA,PASTRY,GUARD,ROYAL,RECEPTION,BATH_DELIVERY,WOMEN_BATH_DELIVERY,BATH_MIXING,KITCHEN,TABLE_SERVICE,EGYPT_KITCHEN,EGYPT_TABLE].includes(held.id)?action(held,'cancel'):null;if(cancel)panel.body.append(cancel);
      }
    }
    appendOfficialCareerHistory({careers,panel,make});
    if(s.loadError)panel.body.append(make('p','职业存档暂时无法核对，请保留当前存档后再试。','career-negative'));
  }
  function open(options=false){
    wallet?.close();
    registrationRoleId=options===true?CLERK:options&&typeof options==='object'?options.roleId||null:null;
    registrationScope=options===true||options?.scope==='catalogue'?'catalogue':'role';
    onOpen();render(true);if(!dialog.open)dialog.showModal();
  }
  button.onclick=()=>{if(!careers.workState().tenure&&getPoliticalTitle()?.active&&onPoliticalTitleOpen){close();onPoliticalTitleOpen();}else open(false);};dialog.addEventListener('cancel',()=>close());dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  return {open,close,isOpen:()=>!!dialog.open,
    update(mode){const s=careers.workState(),r=s.lastEvaluation,c=getClock();slot.hidden=mode!=='lot';if(!wallet){money.textContent=`${copperLedger.state().cash} 铜文`;money.setAttribute('aria-label',`手头${copperLedger.state().cash}铜文`);}const employed=!!s.tenure&&!s.loadError,titled=!employed&&!!getPoliticalTitle()?.active&&!!onPoliticalTitleOpen;button.hidden=!employed&&!titled&&!nearbyRegistries().length;button.setAttribute('aria-label',titled?'查看宫廷名位':employed?'打开当前职业手册':'选择本国求职场所');
      const customer=s.lastCustomerReview;
      if(customer&&customer.id!==customerReviewId){customerReviewId=customer.id;feedback.textContent=`${customer.score===0?'○':customer.positive?'👍':'👎'} ${customer.customerName}：${customer.reason}`;feedback.className='career-review-pop '+(customer.score===0?'':customer.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      else if(r&&r.id!==reviewId){reviewId=r.id;const role=roles().find(item=>item.id===r.roleId);feedback.textContent=`${r.positive?'👍':'👎'} ${employer(role)}：${r.reason}`;feedback.className='career-review-pop '+(r.positive?'career-positive':'career-negative');feedbackUntil=c.seconds+6;feedback.hidden=false;}
      if(c.seconds>=feedbackUntil||mode!=='lot')feedback.hidden=true;if(dialog.open)render();},
    dispose(){close();wallet?.dispose();slot.remove();dialog.remove();feedback.remove();style.remove();},
  };
}
