export const CLINIC_PHYSICIAN_PANEL_STYLE='.career-dialog .clinic-physician-record .ww-airy-action{font-size:14px;letter-spacing:.02em;padding:9px 12px}';
// Read-only live choices; selecting one still goes through the same physical
// task intent as manual arrival or explicit automatic navigation.
export function appendClinicPhysicianPanel({panel,role,service,make,action}){
 const patient=service?.state().patient;if(!patient)return;
 const section=make('section',null,'clinic-physician-record');section.append(make('strong',`第 ${patient.number} 号 · ${patient.recipientName}`));
 section.append(make('p',patient.symptoms.length?patient.symptoms.join(' · '):'待问询'));
 if(patient.mismatch)section.append(make('p','照护单不匹配 · 请重新选择','career-negative'));
 if(patient.selectedPlanId)section.append(make('p',`${patient.acting?'正在书写':'已写'} · ${patient.plans.find(p=>p.id===patient.selectedPlanId)?.name||'同号照护单'}`,'career-positive'));
 if(patient.plans.length&&!patient.acting){const choices=make('div',null,'career-actions');for(const plan of patient.plans){const button=action(role,'plan:'+plan.id,plan.name);if(button){button.className='ww-airy-action';choices.append(button);}}section.append(choices);}
 panel.body.append(section);
}
