import * as THREE from 'three';

// r186 replaces legacy PCFSoftShadowMap with a screen-noise-rotated 5-tap PCF.
// Use the native, nearest depth texture of BasicShadowMap, then do deterministic
// fixed-kernel PCF ourselves. Compare each texel against the receiver's depth at THAT
// texel, rather than one constant depth across an inclined surface.
const FILTER_MARKER = 'FOURFANG_WORLD_FIXED_PCF_V2';
const BASIC_SIGNATURE = 'float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {';
const EXPECTED_BASIC_FUNCTION = "float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n\t\t\tfloat shadow = 1.0;\n\t\t\tshadowCoord.xyz /= shadowCoord.w;\n\t\t\t#ifdef USE_REVERSED_DEPTH_BUFFER\n\t\t\t\tshadowCoord.z -= shadowBias;\n\t\t\t#else\n\t\t\t\tshadowCoord.z += shadowBias;\n\t\t\t#endif\n\t\t\tbool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n\t\t\tbool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n\t\t\tif ( frustumTest ) {\n\t\t\t\tfloat depth = texture2D( shadowMap, shadowCoord.xy ).r;\n\t\t\t\t#ifdef USE_REVERSED_DEPTH_BUFFER\n\t\t\t\t\tshadow = step( depth, shadowCoord.z );\n\t\t\t\t#else\n\t\t\t\t\tshadow = step( shadowCoord.z, depth );\n\t\t\t\t#endif\n\t\t\t}\n\t\t\treturn mix( 1.0, shadow, shadowIntensity );\n\t\t}";
const STABLE_FILTER = `
// ${FILTER_MARKER}
float fourfangShadowTap( sampler2D shadowMap, vec2 uv, vec3 receiver, vec2 gradient, float maxOffset ) {
 // Bounded at grazing silhouettes, where extrapolation can otherwise sample
 // the receiver plane metres outside the actual triangle.
 float receiverDepth = receiver.z + clamp( dot( gradient, uv - receiver.xy ), -maxOffset, maxOffset );
 float depth = texture2D( shadowMap, uv ).r;
 #ifdef USE_REVERSED_DEPTH_BUFFER
  return step( depth, receiverDepth );
 #else
  return step( receiverDepth, depth );
 #endif
}
${BASIC_SIGNATURE}
 shadowCoord.xyz /= shadowCoord.w;
 // Normalize by screen-derivative magnitude BEFORE testing the determinant.
 // The old absolute 1e-10 test changed branches on zoom and camera rotation.
 vec3 dx = dFdx( shadowCoord.xyz );
 vec3 dy = dFdy( shadowCoord.xyz );
 float scale = max( max( length( dx.xy ), length( dy.xy ) ), 1e-20 );
 dx /= scale; dy /= scale;
 float determinant = dx.x * dy.y - dx.y * dy.x;
 vec2 gradient = vec2( 0.0 );
 if ( abs( determinant ) > 1e-5 * length( dx.xy ) * length( dy.xy ) ) {
  gradient = vec2( dx.z * dy.y - dy.z * dx.y, dy.z * dx.x - dx.z * dy.x ) / determinant;
 }
 #ifdef USE_REVERSED_DEPTH_BUFFER
  shadowCoord.z -= shadowBias;
 #else
  shadowCoord.z += shadowBias;
 #endif
 bool inFrustum = all( greaterThanEqual( shadowCoord.xyz, vec3( 0.0 ) ) ) && all( lessThanEqual( shadowCoord.xyz, vec3( 1.0 ) ) );
 if ( ! inFrustum ) return 1.0;
 vec2 texel = 1.0 / shadowMapSize;
 vec2 grid = shadowCoord.xy * shadowMapSize - 0.5;
 vec2 blend = fract( grid );
 vec2 origin = ( floor( grid ) - 0.5 ) * texel;
 vec2 lo = 0.5 * texel, hi = 1.0 - lo;
 // Bilinearly filtered 3x3 box PCF, evaluated at sixteen exact texel centres.
 // Stable world-space kernel, continuous sub-texel weights, no screen noise.
 vec4 wx = vec4( 1.0 - blend.x, 1.0, 1.0, blend.x ) / 3.0;
 vec4 wy = vec4( 1.0 - blend.y, 1.0, 1.0, blend.y ) / 3.0;
 float shadow = 0.0;
 float maxOffset = abs( shadowBias ) * 16.0;
 for ( int y = 0; y < 4; y ++ ) {
  for ( int x = 0; x < 4; x ++ ) {
   vec2 uv = clamp( origin + vec2( float( x ), float( y ) ) * texel, lo, hi );
   shadow += wx[ x ] * wy[ y ] * fourfangShadowTap( shadowMap, uv, shadowCoord.xyz, gradient, maxOffset );
  }
 }
 return mix( 1.0, shadow, shadowIntensity );
}`;

export function installStableShadowFilter() {
 const key = 'shadowmap_pars_fragment', original = THREE.ShaderChunk[key];
 if (original.includes(FILTER_MARKER)) return true;
 // Guard against silently applying an incompatible sampler patch after upgrades.
 if (THREE.REVISION !== '186') return false;
 const start = original.lastIndexOf(BASIC_SIGNATURE);
 const vsm = original.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )');
 if (start < 0 || start < vsm || !original.slice(0,start).trimEnd().endsWith('#else')) return false;
 let brace = original.indexOf('{',start), depth = 1, end = brace + 1;
 for (; end < original.length && depth; end++) {
  if (original[end] === '{') depth++;
  else if (original[end] === '}') depth--;
 }
 if (depth !== 0 || original.slice(start,end) !== EXPECTED_BASIC_FUNCTION) return false;
 THREE.ShaderChunk[key] = original.slice(0,start) + STABLE_FILTER + original.slice(end);
 return true;
}

const DIRECTION = new THREE.Vector3(-14,26,15).normalize();
const RIGHT = new THREE.Vector3(15,0,14).normalize();
const UP = DIRECTION.clone().cross(RIGHT).normalize();
export const WORLD_SHADOW_POLICY = Object.freeze({mapSize:2048,depthBiasMetres:.012,normalBiasMetres:.025,paddingMetres:3});

export function configureStableShadows(renderer,sun) {
 const installed = installStableShadowFilter();
 renderer.shadowMap.enabled = true;
 renderer.shadowMap.type = installed ? THREE.BasicShadowMap : THREE.PCFShadowMap;
 const maxSize=renderer.capabilities?.maxTextureSize||WORLD_SHADOW_POLICY.mapSize;
 sun.castShadow = true;
 sun.shadow.mapSize.set(Math.min(WORLD_SHADOW_POLICY.mapSize,maxSize),Math.min(WORLD_SHADOW_POLICY.mapSize,maxSize));
 sun.shadow.radius = 0;
 sun.shadow.normalBias = WORLD_SHADOW_POLICY.normalBiasMetres;
 sun.userData.fourfangStableShadows = {version:2,receiverPlaneFilter:installed,worldFixed:true,mapSize:sun.shadow.mapSize.x,depthBiasMetres:WORLD_SHADOW_POLICY.depthBiasMetres,normalBiasMetres:WORLD_SHADOW_POLICY.normalBiasMetres};
 setStableShadowBounds(sun,new THREE.Box3(new THREE.Vector3(-12,-12,-12),new THREE.Vector3(12,12,12)));
 return installed;
}

/** Only call when entering a region or returning to the globe. Never use player
 * or camera position here. One fixed, tightly fitted volume covers all views. */
export function setStableShadowBounds(sun,bounds) {
 if(!bounds?.isBox3||bounds.isEmpty())throw Error('Stable shadows require finite scene bounds');
 if(![...bounds.min,...bounds.max].every(Number.isFinite))throw Error('Stable shadow bounds must be finite');
 const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
 const extent=axis=>Math.abs(axis.x)*size.x+Math.abs(axis.y)*size.y+Math.abs(axis.z)*size.z+WORLD_SHADOW_POLICY.paddingMetres;
 const halfX=Math.ceil(extent(RIGHT)*2)/2,halfY=Math.ceil(extent(UP)*2)/2,halfDepth=Math.ceil(extent(DIRECTION)*2)/2;
 const lightDistance=halfDepth+1,near=1,far=halfDepth*2+1;
 sun.target.position.copy(center);sun.position.copy(center).addScaledVector(DIRECTION,lightDistance);
 Object.assign(sun.shadow.camera,{left:-halfX,right:halfX,top:halfY,bottom:-halfY,near,far});
 sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.bias=-WORLD_SHADOW_POLICY.depthBiasMetres/(far-near);
 const state=sun.userData.fourfangStableShadows;
 if(state)Object.assign(state,{bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},target:center.toArray(),texelMetres:[2*halfX/sun.shadow.mapSize.x,2*halfY/sun.shadow.mapSize.y],depthSpanMetres:far-near});
}

/** Kept for old callers; camera/player updates must never move the light. */
export function updateStableShadowFrame(sun,_position,{mode}={}) {
 if(mode==='globe')setStableShadowBounds(sun,new THREE.Box3(new THREE.Vector3(-12,-12,-12),new THREE.Vector3(12,12,12)));
}

/** Toon ramps retain an away-facing sunlight band. Use the near surface of a
 * closed mesh as its caster, rather than r186's implicit back-face inversion,
 * which compares the visible back surface to itself. Thin DoubleSide sheets
 * keep both faces. No cast/receive/depth-testing switch is disabled. */
export function applyWorldShadowPolicy(root) {
 const seen=new Set();
 root.traverse(object=>{if(!object.isMesh)return;for(const material of(Array.isArray(object.material)?object.material:[object.material])){
  if(!material||seen.has(material))continue;seen.add(material);
  if(material.shadowSide===null)material.shadowSide=material.side;
 }});
}

// Use on the completed human root, including newly attached outfits/props.
// Mesh lighting, depth tests, cast shadows and ground contact are preserved.
// Do not force castShadow on: thin/transparent detail may deliberately opt out.
export function applyCharacterShadowPolicy(root) {
 root.traverse(object=>{if(object.isMesh)object.receiveShadow=false;});
}
