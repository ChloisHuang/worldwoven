import assert from 'node:assert/strict';
import {quoteSalonService as quote,validSalonFee} from '../source/game/china-salon-pricing.js';
const low=quote({appearanceScore:25}),middle=quote({appearanceScore:65}),high=quote({appearanceScore:95});
assert.deepEqual([low,middle,high],[35,115,360]);assert(high>middle&&middle>low);
assert.equal(quote({appearanceScore:0}),20);assert.equal(quote({appearanceScore:100,artLevel:1000,positiveReviews:1000}),500);
const profile={appearanceScore:65,artLevel:4,positiveReviews:3};assert.equal(quote(profile),quote(profile));assert(quote(profile)>=middle);
assert.equal(quote({...profile,skin:0xffffff,race:'a',gender:'female'}),quote({...profile,skin:0x000000,race:'b',gender:'male'}));
assert(validSalonFee(6));assert(validSalonFee(10));assert(validSalonFee(355,1));assert(!validSalonFee(355));assert(!validSalonFee(19,1));assert(!validSalonFee(505,1));
console.log('PASS deterministic shared 20–60 / 80–180 / 200–500 fees, bounded real progress, no skin/race/gender inputs, and explicit legacy fee migration');
