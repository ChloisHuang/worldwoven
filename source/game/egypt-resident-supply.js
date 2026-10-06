import {EGYPT_MEAL} from './egypt-meal-definition.js';

// A finite game-opening reserve, not historical revenue or daily procurement.
// The service commits preparation and its inventory debit in the same write.
const OPENING_SUPPLY=24,RESIDENT='egypt-papyrus';
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const receiptFields=['source','id','number','actorId','orderId','mealId','dishId','supplyReceipt','completed','eatingSeconds','day'];
const validPrepared=r=>object(r)&&integer(r.number)&&r.number>0&&r.orderId===`egypt-meal-${r.number}`&&r.actorId===RESIDENT&&r.supplyReceipt===r.orderId+'-prepared';

export function initialEgyptResidentSupply(){return {version:1,source:'egypt-resident-opening-v1',initial:OPENING_SUPPLY,remaining:OPENING_SUPPLY,prepared:[],consumed:[],wasted:[]};}

export function validEgyptResidentMealReceipt(r){
 return validPrepared(r)&&r.source==='egypt-resident-meal'&&r.id===r.orderId+'-consumed'&&r.mealId===r.orderId+'-dish'&&r.dishId===EGYPT_MEAL.id&&r.completed===true&&r.eatingSeconds===EGYPT_MEAL.duration&&integer(r.day);
}

export function sameEgyptResidentMealReceipt(a,b){return validEgyptResidentMealReceipt(a)&&validEgyptResidentMealReceipt(b)&&receiptFields.every(key=>a[key]===b[key]);}

export function validEgyptResidentSupply(s){
 if(!object(s)||s.version!==1||s.source!=='egypt-resident-opening-v1'||s.initial!==OPENING_SUPPLY||!integer(s.remaining)||!Array.isArray(s.prepared)||!Array.isArray(s.consumed)||!Array.isArray(s.wasted)||s.remaining+s.prepared.length!==OPENING_SUPPLY||s.consumed.length+s.wasted.length>s.prepared.length)return false;
 const prepared=new Map(),finished=new Set();
 for(const r of s.prepared){if(!validPrepared(r)||prepared.has(r.orderId))return false;prepared.set(r.orderId,r);}
 for(const r of s.consumed){
  if(!validEgyptResidentMealReceipt(r))return false;
  const original=prepared.get(r.orderId);
  if(!original||finished.has(r.orderId)||original.number!==r.number||original.actorId!==r.actorId||original.supplyReceipt!==r.supplyReceipt)return false;
  finished.add(r.orderId);
 }
 for(const orderId of s.wasted){if(!prepared.has(orderId)||finished.has(orderId))return false;finished.add(orderId);}
 return true;
}
