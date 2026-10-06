/** Explicit optional albedo finish. No texture, geometry, exposure or light changes. */
export function applyNaturalMakeup(material){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.fragmentShader=shader.fragmentShader.replace('diffuseColor.rgb*=1.0-.13*oralCorner;',`diffuseColor.rgb*=1.0-.13*oralCorner;
 // Optional matte taupe contour follows each formed nasal side wall; its
 // broad feather ends above the nostril rather than drawing a dark stripe.
 float noseSide=featureBell(x,.135,.065)*featureSpan(f.y,6.91,7.38,.13)*smoothstep(1.32,1.43,f.z);
 diffuseColor.rgb*=mix(vec3(1.0),vec3(.86,.81,.77),.46*noseSide);
 // Soft rose-taupe on the moving upper lid and a restrained outer lash root.
 float eyeShadow=featureBell(f.y-upper,.047,.055)*eyeSpan;
 float lashRoot=featureBell(f.y-upper,.004,.016)*eyeSpan*smoothstep(.20,.32,x);
 diffuseColor.rgb*=mix(vec3(1.0),vec3(.89,.73,.69),.66*eyeShadow);
 diffuseColor.rgb*=1.0-.22*lashRoot;
 // Dusty rose pigment changes albedo only; baked lip contact, normals and
 // the same cel light response continue to describe the vermilion turn.
 float rose=featureSpan(f.y,6.475,6.722,.049)*featureBell(f.x,0.0,.225)*smoothstep(1.445,1.54,f.z);
 diffuseColor.rgb*=mix(vec3(1.0),vec3(.99,.61,.62),.82*rose);
`);
 };
 const oldKey=material.customProgramCacheKey.bind(material);
 material.customProgramCacheKey=()=>oldKey()+'-natural-makeup-v1';
 material.needsUpdate=true;
}
