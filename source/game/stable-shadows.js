import * as THREE from 'three';

// r186 replaces legacy PCFSoftShadowMap with a screen-noise-rotated 5-tap PCF.
// Use the native, nearest depth texture of BasicShadowMap, then do deterministic
// 2x2 PCF ourselves. Compare each texel against the receiver's depth at THAT
// texel, rather than one constant depth across an inclined surface.
const FILTER_MARKER = 'FOURFANG_STABLE_RECEIVER_PCF_V1';
const BASIC_SIGNATURE = 'float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {';
const EXPECTED_BASIC_FUNCTION = "float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {\n\t\t\tfloat shadow = 1.0;\n\t\t\tshadowCoord.xyz /= shadowCoord.w;\n\t\t\t#ifdef USE_REVERSED_DEPTH_BUFFER\n\t\t\t\tshadowCoord.z -= shadowBias;\n\t\t\t#else\n\t\t\t\tshadowCoord.z += shadowBias;\n\t\t\t#endif\n\t\t\tbool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;\n\t\t\tbool frustumTest = inFrustum && shadowCoord.z <= 1.0;\n\t\t\tif ( frustumTest ) {\n\t\t\t\tfloat depth = texture2D( shadowMap, shadowCoord.xy ).r;\n\t\t\t\t#ifdef USE_REVERSED_DEPTH_BUFFER\n\t\t\t\t\tshadow = step( depth, shadowCoord.z );\n\t\t\t\t#else\n\t\t\t\t\tshadow = step( shadowCoord.z, depth );\n\t\t\t\t#endif\n\t\t\t}\n\t\t\treturn mix( 1.0, shadow, shadowIntensity );\n\t\t}";
const STABLE_FILTER = `
// ${FILTER_MARKER}
float fourfangShadowTap( sampler2D shadowMap, vec2 uv, vec3 receiver, vec2 gradient ) {
 float receiverDepth = receiver.z + dot( gradient, uv - receiver.xy );
 float depth = texture2D( shadowMap, uv ).r;
 #ifdef USE_REVERSED_DEPTH_BUFFER
  return step( depth, receiverDepth );
 #else
  return step( receiverDepth, depth );
 #endif
}
${BASIC_SIGNATURE}
 shadowCoord.xyz /= shadowCoord.w;
 // Derivatives must be evaluated before the per-fragment frustum branch.
 vec3 dx = dFdx( shadowCoord.xyz );
 vec3 dy = dFdy( shadowCoord.xyz );
 float determinant = dx.x * dy.y - dx.y * dy.x;
 vec2 gradient = vec2( 0.0 );
 bool validPlane = abs( determinant ) > 1e-10;
 if ( validPlane ) {
  gradient = vec2( dx.z * dy.y - dy.z * dx.y, dy.z * dx.x - dx.z * dy.x ) / determinant;
 }
 #ifdef USE_REVERSED_DEPTH_BUFFER
  shadowCoord.z -= shadowBias;
 #else
  shadowCoord.z += shadowBias;
 #endif
 bool inFrustum = all( greaterThanEqual( shadowCoord.xyz, vec3( 0.0 ) ) ) && all( lessThanEqual( shadowCoord.xyz, vec3( 1.0 ) ) );
 if ( ! inFrustum ) return 1.0;
 // A degenerate projected receiver has no reliable plane. Keep a deterministic
 // center sample instead of manufacturing a huge grazing-angle offset.
 if ( ! validPlane ) {
  return mix( 1.0, fourfangShadowTap( shadowMap, shadowCoord.xy, shadowCoord.xyz, vec2( 0.0 ) ), shadowIntensity );
 }
 vec2 texel = 1.0 / shadowMapSize;
 vec2 grid = shadowCoord.xy * shadowMapSize - 0.5;
 vec2 blend = fract( grid );
 vec2 uv00 = ( floor( grid ) + 0.5 ) * texel;
 vec2 lo = 0.5 * texel, hi = 1.0 - lo;
 vec2 uv10 = clamp( uv00 + vec2( texel.x, 0.0 ), lo, hi );
 vec2 uv01 = clamp( uv00 + vec2( 0.0, texel.y ), lo, hi );
 vec2 uv11 = clamp( uv00 + texel, lo, hi );
 uv00 = clamp( uv00, lo, hi );
 float a = fourfangShadowTap( shadowMap, uv00, shadowCoord.xyz, gradient );
 float b = fourfangShadowTap( shadowMap, uv10, shadowCoord.xyz, gradient );
 float c = fourfangShadowTap( shadowMap, uv01, shadowCoord.xyz, gradient );
 float d = fourfangShadowTap( shadowMap, uv11, shadowCoord.xyz, gradient );
 float shadow = mix( mix( a, b, blend.x ), mix( c, d, blend.x ), blend.y );
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
const frameTarget = new THREE.Vector3();

export function configureStableShadows(renderer,sun) {
 const installed = installStableShadowFilter();
 renderer.shadowMap.enabled = true;
 // If the guarded patch cannot apply, radius zero removes the stochastic PCF
 // footprint. This is a fallback, not equivalent acne correction.
 renderer.shadowMap.type = installed ? THREE.BasicShadowMap : THREE.PCFShadowMap;
 sun.castShadow = true;
 sun.shadow.mapSize.set(1024,1024); // Preserve the existing mobile memory budget.
 sun.shadow.radius = 0;
 sun.shadow.normalBias = installed ? .003 : .035;
 sun.userData.fourfangStableShadows = {version:1,receiverPlaneFilter:installed};
 updateStableShadowFrame(sun,new THREE.Vector3(),{mode:'globe'});
 return installed;
}

export function updateStableShadowFrame(sun,position,{mode='follow',overviewRadius=55}={}) {
 const overview = mode === 'overview';
 const halfExtent = overview ? Math.max(55,Math.ceil(overviewRadius)) : mode === 'globe' ? 25 : 18;
 // Moving a directional light along its fixed direction does not change light
 // direction. It prevents tall/off-center casters crossing the old near plane.
 const lightDistance = overview ? Math.max(80,overviewRadius+12) : 70;
 const near = 1, far = lightDistance * 2 + 1;
 const resolution = sun.shadow.mapSize.x, step = 2*halfExtent/resolution;
 frameTarget.copy(position);
 for (const axis of [RIGHT,UP]) {
  const n = frameTarget.dot(axis);
  frameTarget.addScaledVector(axis,Math.round(n/step)*step-n);
 }
 sun.target.position.copy(frameTarget);
 sun.position.copy(frameTarget).addScaledVector(DIRECTION,lightDistance);
 const camera = sun.shadow.camera;
 if (camera.right !== halfExtent || camera.near !== near || camera.far !== far) {
  Object.assign(camera,{left:-halfExtent,right:halfExtent,top:halfExtent,bottom:-halfExtent,near,far});
  camera.updateProjectionMatrix();
 }
 // Bias is specified in world metres and converted to orthographic depth units.
 // 2 mm is much smaller than the previous follow-mode 40 mm constant bias.
 sun.shadow.bias = sun.userData.fourfangStableShadows?.receiverPlaneFilter ? -.002/(far-near) : -.04/(far-near);
}

// Use on the completed human root, including newly attached outfits/props.
// Mesh lighting, depth tests, cast shadows and ground contact are preserved.
// Do not force castShadow on: thin/transparent detail may deliberately opt out.
export function applyCharacterShadowPolicy(root) {
 root.traverse(object=>{if(object.isMesh)object.receiveShadow=false;});
}
