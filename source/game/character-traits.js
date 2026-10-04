/** Bounded fictional character controls. These are the player's game preferences,
 * never a ranking of people, cultures, gender presentation or skin colours.
 * Dimensionless multipliers; every neutral value exactly preserves the R12 sculpt.
 */
export const SHAPE_RANGES=Object.freeze(Object.fromEntries(Object.entries({
 jawWidth:[.84,1.12],legLength:[.94,1.06],eyeSize:[.82,1.20],
 noseSize:[.80,1.18],noseWidth:[.80,1.18],socketDepth:[.65,1.65],
 chinLength:[.88,1.12],chinProjection:[.85,1.15],
 noseBridgeHeight:[.80,1.20],noseTipSize:[.80,1.20]
}).map(([key,[min,max]])=>[key,Object.freeze({min,max,default:1})])));
// The original six score terms remain the compatibility contract. New geometry
// controls do not silently create additional universal aesthetic preferences.
export const LEGACY_SHAPE_KEYS=Object.freeze(['jawWidth','legLength','eyeSize','noseSize','noseWidth','socketDepth']);
export const DEFAULT_SHAPE_TRAITS=Object.freeze(Object.fromEntries(Object.keys(SHAPE_RANGES).map(key=>[key,1])));
export function normalizeShapeTraits(input){
 const source=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
 return Object.fromEntries(Object.entries(SHAPE_RANGES).map(([key,{min,max}])=>[key,Number.isFinite(source[key])?Math.max(min,Math.min(max,source[key])):1]));
}
export function hasShapeTraits(input){return Object.keys(SHAPE_RANGES).some(key=>input[key]!==1);}
export function randomShapeTraits(rng=Math.random,ranges=SHAPE_RANGES){
 return Object.fromEntries(Object.entries(ranges).map(([key,{min,max}])=>{
  const n=rng(key),t=Number.isFinite(n)?Math.max(0,Math.min(1-Number.EPSILON,n)):0;
  return[key,Number((min+(max-min)*t).toFixed(4))];
 }));
}
export function shapePreferenceScore(input){
 const traits=normalizeShapeTraits(input);let score=0;
 for(const key of LEGACY_SHAPE_KEYS){const {min,max}=SHAPE_RANGES[key];
  const value=(traits[key]-min)/(max-min);score+=/^(jawWidth|noseSize|noseWidth)$/.test(key)?1-value:value;
 }
 return Math.round(score/LEGACY_SHAPE_KEYS.length*100);
}
/** Sole and head anchors are invariant. Change leg:torso ratio within a fixed
 * standing height; the same map is used for skin, clothes and anatomical joints.
 * This strictly increasing piecewise map has no jumps or inverted sections.
 */
export function shapeHeight(y,legLength=1){
 if(legLength===1||y<=.108||y>=1.455)return y;
 const offset=.857*(legLength-1);
 return y<=.965?.108+(y-.108)*legLength:y+offset*(1-(y-.965)/.49);
}
