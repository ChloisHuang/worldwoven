import {CLINIC_PHYSICIAN_ROLE} from './china-clinic-career-role.js';
import {createChinaClinicEmployment} from './china-clinic-employment.js';

// The shared local registry/pay bridge receives a physician-specific view of
// the same clinic. Original assistant/patient work remains owned by that clinic.
export function createChinaClinicPhysicianEmployment({clinic,...options}){
 const service={doctorReady:clinic.doctorReady,requestDoctor:value=>clinic.requestDoctor(value,'physician'),
  beginWork:()=>true,workIntent:clinic.physicianIntent,executeWork:clinic.executePhysician,
  cancelWork:clinic.cancelPhysician,canEndWork:clinic.canEndPhysician,finishWork:()=>true,
  workReceipts:clinic.workReceipts,workLabel:clinic.workLabel,workPose:clinic.physicianPose,
  stopWorkAction:clinic.stopPhysicianAction,isActing:clinic.isPhysicianActing,patientDetails:clinic.physicianDetails};
 return createChinaClinicEmployment({...options,clinic:service,role:CLINIC_PHYSICIAN_ROLE});
}
