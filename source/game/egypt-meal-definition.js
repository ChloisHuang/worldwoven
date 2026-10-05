// A fictional visitor meal inspired by bread, vegetables and pottery. It does
// not claim a historically exclusive recipe or confer a royal identity.
export const EGYPT_MEAL=Object.freeze({id:'visitor-bread-stew',name:'陶锅蔬食与面包',price:5,currency:'egypt',duration:12,
 cook:'egypt-royal-kitchen',host:'egypt-royal-dining',seatCenter:[15.15,0,-9.3],
 prep:[21.62,0,-17.1],prepTop:[22.10,1.035,-17.1],pot:[21.62,0,-15.78],potTop:[22.22,1.3,-15.78],
 report:[20.6,0,-17.1],pass:[21.58,0,-15.1],passTop:[22.08,1.025,-15.1],
 serve:[16.45,0,-10.75],table:[16.28,1.29,-9.86],hostHome:[19.2,0,-8.08]});
export function validEgyptMealReceipt(r){return r?.source==='egypt-visitor-meal'&&r.actorId==='player'&&r.completed===true&&Number.isSafeInteger(r.number)&&r.number>0&&r.orderId===`egypt-meal-${r.number}`&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-dish'&&r.dishId===EGYPT_MEAL.id&&r.paymentReceipt===r.orderId&&r.supplyReceipt===r.orderId+'-prepared';}
