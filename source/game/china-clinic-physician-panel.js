// Read-only live choices; selecting one still goes through the same physical
// task intent as manual arrival or explicit automatic navigation.
export function appendClinicPhysicianPanel({panel,role,service,make,action}){
 const patient=service?.state().patient;if(!patient)return;
 const section=make('section',null,'clinic-physician-record');section.append(make('strong',`第 ${patient.number} 号 · ${patient.recipientName}`));
 section.append(make('p',patient.symptoms.length?`问询记录：${patient.symptoms.join('；')}`:'请先到原患者面前问询，记录其当前游戏症状'));
 if(patient.mismatch)section.append(make('p','刚才的照护单与记录不符，尚未发单；请更正选择','career-negative'));
 if(patient.plans.length){const choices=make('div',null,'career-actions');for(const plan of patient.plans){const button=action(role,'plan:'+plan.id,plan.name);if(button)choices.append(button);}section.append(choices,make('p','仅为虚构故事照护记录；编号单不符须更正，苏禾交给原患者后才记照护效果与评价'));}
 panel.body.append(section);
}
