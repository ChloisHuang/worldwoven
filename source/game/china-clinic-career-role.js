// One professional clinic seat; holding it grants no official court rank.
export const CLINIC_PHYSICIAN_ROLE=Object.freeze({
 id:'cn-clinic-physician',name:'安和医馆医师',slotId:'cn-clinic-physician-1',country:'china',currency:'copper',
 employer:'许宁',workplace:'安和医馆 · 二层问诊案',supervisorId:'cn-clinic-physician',incumbentId:'cn-clinic-physician',incumbentName:'许宁',
 vacancyKind:'exclusive',careerKind:'professional',workSource:'cn-clinic-physician-labor',wage:30,minimumAgeYears:18,
 skillRequirements:Object.freeze({care:2,writing:2,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须有一次药铺助手原单交付经历。06:00–18:00主动开班，问询虚构不适、书写并交接同号原单，由助手备包，核验原来客收到同号云纹包后登记服务。现场候诊、问询、书写与交接计入实际工时，政府拨付基础日薪30文，患者评分按80%–120%浮动后按工时结薪，无评分按中性；仅原患者同号领取后记本人责任阶段的及时性，一单一次；单号完成登记服务评价与履历，不结束当班；未开班由许宁代管。专业岗位不授官品，不提供真实诊疗。',
});
