# Female anatomical reconstruction

The earlier `0ac344e` female trial is retained in Git but was rejected visually. The reconstruction replaces its frontal RBF constraint pile with one continuous native CC0 topology in a uniform anatomical frame. The original photos are private visual references; they are neither stored here nor sampled as textures. The following nominal dimensions are authored construction choices, not measurements recovered from a single photograph. They are not exact exported-vertex values: the local source-space blending can change a nominal centerline value. The sampled export values below are authoritative for that candidate.

Coordinates are metres, Y up, +Z forward. Native source scale is 0.105 and offset is `[0, 0.798, -0.085]`. The whole cranium, eye aperture, cheek, muzzle and jaw share this frame. Only the lower cervical transition uses the existing anchored neck solve.

| Surface | Approximate forward Z (mm) | Relationship |
| --- | ---: | --- |
| Globe center | 45.8 | One spherical eye frame per side |
| Corneal front | 63.0 | Spherical normal field, no flat eye insert |
| Upper orbital rim | 69.8 | Projects over the globe |
| Upper orbital fold | 61–62 | Recedes between rim and lid roll |
| Nasal root | 70.0 | Recessed below glabella |
| Bony bridge | 82.5 | Straight rising dorsum |
| Rounded tip | 94.0 | Native lobule and columella loops retained |
| Nasal wing | 75–77 | Behind the tip and distinct from its bulb |
| Upper vermilion | 79.7 | In front of cheek, behind the tip |
| Chin front | 72.0 | Below lips with a continuous labial turn |

The source lid contact and the exported globe use the same anatomical transform. The upper contact covers approximately 1.3 mm of the projected iris upper edge. The old form-specific orbital loop offsets are bypassed for this reconstruction. The nasal centerline is one continuous curve from glabella through nasion, ridge, supratip, tip and columella. The alar and nostril topology is not replaced by separate geometry.

`render-sculpt.mjs` is the strict geometry diagnostic: one opaque grey Standard material on skin and globes, no vertex color, no feature/toon shader, no brow ribbon, no hair, and broad white key/fill lighting. `render.mjs` separately renders the same asset through the real `createCharacter` path with its unchanged chosen palette, existing hair/clothing and production toon material. `CLAY=1` on the game renderer is only a palette comparison, not the strict geometry diagnostic.

This is an original work in progress, not an accepted likeness or a claim that the visual target has been reached.

The lip-contact correction follows actual connected source rim vertices and piecewise-linear upper rim edges. It avoids the old jump onto an adjacent lower vermilion roll and the high lateral upper-roll samples that produced saw teeth. Only contact-loop positions change; the rest of the reconstructed geometry is frozen for material review.

The combined candidate retains the new character cel response. A single ocular frame moves the globe and surrounding contact loops together, with a wider relaxed aperture and no added canthal tilt. The frontal cheek/jaw frame is 4% narrower while the cranium is not enlarged. The nasal curve and whole mouth barrel are balanced together. The cervical handoff now occurs above the throat; submental, throat-corner and front-neck targets form one downward curve rather than a long horizontal shelf and a V-shaped neck notch. Standard comparison frames retain the same palette, light and camera, including one v2=90 example.

## Actual exported center profile (6e07f64)

The nasion is the center-profile local depth minimum, not the lateral brow support point. Actual source-matched mesh coordinates (+Z forward, mm) are: glabella `(0, 1577.793, 74.631)`; nasion `(0, 1563.618, 71.478)`; upper bridge `(0, 1553.612, 76.466)`; bony bridge `(0, 1543.983, 82.478)`; dorsum `(0, 1536.570, 87.909)`; tip `(0, 1523.445, 93.367)`. The actual center nasion is recessed 3.153 mm behind the glabella.

The measured lateral brow support is `(31.330, 1577.460, 68.643)` and its upper orbital fold is `(32.814, 1573.813, 63.769)`. These are lateral points, so their depths should not be substituted for the central glabella when assessing the center nasal profile. The nominal 70 mm nasal target becomes 71.478 mm after the source-space influence mask; it was incorrect to describe that nominal number as an exact mesh coordinate. This audit did not change geometry.

## Final local oval pass

A private front-view comparison aligned the photo's two pupil centers to the actual rendered 111.23 px pupil span and removed about 3.8 degrees of image tilt. The visible contour supports a mid-cheek width reduction of roughly 6–10%, a 4–6 mm longer lower face, and a 5–8% longer horizontal opening; the partly occluded/photo-projected contour does not justify exact biometric dimensions. The local contour function narrows the mid-cheek, retains the lower mandibular arc, and extends the chin by up to 5.5 mm. It explicitly excludes the nasal root, vermilion, eye spacing and scalp. The upper lid covers more of the iris; the iris chart compensates for the shared convex eye frame so pupil/iris rings remain round in front projection. No canthal tilt was added. Standard candidate views remain on the same skin, lighting and toon response.

The elongated chin at `chinLength=1.12` reaches Y=1.434127 m. Its 93 sampled source-chin vertices remain fully assigned to the head: cervical blending now checks native source anatomy rather than treating any skin below 1.435 m as neck. The lower neck and 46 collar anchors retain their existing blend.


## Bounded original hm08 target comparison (2026-10-04)

This independent candidate starts from the exact restored `61aa3a4` tree
(local recovery baseline `a6733c3`), not the later rejected stacked/RBF jaw
experiments. It imports only three numeric CC0 target files from the same
pinned MPFB2 commit as the existing hm08 base mesh. The pinned `LICENSE.md`
section C explicitly includes targets and modifiers; section D covers output.
Original compressed/uncompressed hashes and source URLs are recorded in the
upstream and shipped provenance records. No MPFB plugin logic or MOD asset is
imported.

The comparison removes the previous lower-face Y extension (nominally up to
5.5 mm), retains the transverse contour, and applies `chin-height-decr` at
0.65 and each side's `cheek-volume-incr` at 0.60. The data supplies 257 nonzero
retained chin displacements and 210 on each cheek. All delta rows are matched
by the original zero-based OBJ vertex index before the head subset is selected.
Deltas use the current uniform 0.105 native XYZ frame; no Blender add-on axis
conversion is copied. Raw source/feature coordinates remain immutable. The
existing vermilion guard preserves the accepted actual mouth rim while the
sublabial transition can follow the chin. The cervical boundary is still fixed.
No new chin curve, RBF solve, added supporting mesh, or subdivision is used.

Against the restored baseline, measured maximum upward chin displacement is
12.822 mm including removal of the earlier extension; maximum local cheek
forward displacement is 4.410 mm and outward displacement 5.229 mm. These are
actual exported-coordinate differences, not a claim that these dimensions
establish visual quality. Raw feature coordinates and skin indices are exactly
identical; eyes/brows including their normals, protected vermilion, scalp and
collar positions, and the masculine asset hash are unchanged. The head remains
14,726 triangles and the dressed character uses two material batches.

One neutral front/side/35-degree three-quarter plus dressed view was rendered
with the same dark skin palette, lighting and eye-distance framing as the
private reference study. Visual inspection finds a coherent chin volume
without the previous local upper-chin reversal, a shorter face and fuller
anterior-lateral cheek. The side underjaw still reads relatively thick and the
upper-neck turn remains visible; likeness and the complete aesthetic target
are not established. This finite comparison is a review candidate, not user
acceptance or authorization to replace the default model. No coefficient
iteration or older pose/appearance matrix was run.

The four-view capture and build completed in the existing process-tree guard
in 3.33 seconds at approximately 316 MiB peak, below 768 MiB/90-second bounds.
Cgroup OOM counters were unavailable and were not interpreted as zero. Render
and coordinate-check evidence is local under `qa/native-targets/candidate/`;
private photographs remain outside the repository.


## One intermediate proportion candidate after 7ea rejection

The user rejected `7ea06a1` as having a chin that looked too short. The restored
61aa, a538 and 7ea versions remain unchanged in Git. Before editing, a local
four-panel study put the photograph and those three versions at the same pupil
spacing and approximately the same 35-degree turn. Existing a538 and 7ea
images were reused; only the missing 61aa 35-degree frame was rendered.

The photo's visible mouth-to-anterior-chin interval reads approximately 61 px,
a538 about 83 px and 7ea about 66 px, with approximately 3–5 px manual edge
uncertainty. Thus the photo alone does not prove that 7ea has a smaller vertical
interval. Its broad lower-chin arc and compressed convex chin section also
contribute to the short appearance. Pupil alignment corrects image scale and
roll, but cannot recover camera pitch, focal length or exact 3D landmarks.
Neither these pixels nor a single photo establish an exact likeness.

Native-correspondence geometry under the actual game camera separates the
convex chin surface from the lower-neck silhouette. At this fixed camera,
a538's anterior chin/round-turn vertices project to Y=502.889/525.117 px;
7ea's same vertices project to 489.683/508.897 px. The bounded authored target
was Y=496±3 and 515±3: restore roughly half of that local interval difference,
while reducing part of the earlier local transverse mandibular expansion.
These are explicit modeling choices informed by the visual comparison and
user feedback, not measurements claimed to be recovered from the photograph.

Solving that displacement against the existing native target gives chin
weight 0.20. Both cheek weights remain 0.60; the old 5.5 mm elongation remains
removed. Lower-contour width factors at native Y=6.20/6.35 change from
1.08/1.07 to 1.035/1.03. No whole-head scale or eye/nose/lip-frame change is used.
The resulting actual anterior chin/round-turn projection is
495.413/516.775 px. Maximum downward restoration relative to 7ea is 4.678 mm;
maximum local inward change is 1.672 mm per side.

Only one new front/side/three-quarter set was rendered and visually inspected.
The chin is intermediate in length and keeps a continuous surface, with less
local transverse expansion. The side mandibular underside still reads thick;
this candidate does not establish final similarity or user acceptance. Raw
feature coordinates and topology, eyes/brows including normals, protected
vermilion, scalp and collar coordinates, and masculine asset hash remain
unchanged. The head still has 14,726 triangles and the character two batches.

The comparison renderer can select a local immutable asset commit and a subset
of views, and records actual skinned landmark projections. The final three-view
build/capture ran in 3.23 seconds at approximately 260 MiB whole-process-tree
peak, under the existing 768 MiB/90-second guard. Cgroup OOM counters remain
unavailable. Private aligned comparison images and measurement data stay under
ignored `qa/native-targets/midpoint-study/` and `midpoint-candidate/`; reference
pixels are not included in the repository or runtime. This pass stops at that
one candidate and does not publish or replace the default model.


## Multi-angle perioral placement

The latest user feedback identified mouth placement rather than chin length.
The original three-quarter photo plus the agency standing-front, oblique and
close-front photographs were inspected locally. The latter poses are not
orthographic and there is no verified 90-degree Savanna reference. Manual
readings put mouth position within the nasal-base-to-chin interval near
0.30–0.32 in the photographs and 0.32–0.33 in the model, with overlapping
uncertainty. A more consistent difference is upper vermilion thickness:
upper-to-lower visible midline height is roughly 0.27–0.41 in the photographs
versus 0.56–0.58 in the model. These support a mild placement/upper-lip change,
not a large translation or another chin correction.

An original graph-supported field moves the already closed contact loops,
lower vermilion, corners and adjacent oral return upward by 2.2 mm (3.71 px in
the fixed front view). The upper bow follows by only 0.462 mm, reducing upper
lip vertical thickness while retaining its actual forward roll. Transitions
run through the philtrum, cheeks and labial fold to the actual nasal return
and anterior chin. The old low upper-chin ring is not used as a fixed boundary.
The field covers 870 original vertices with 531 free scalar weights, and all
contact vertices share the same displacement. It is applied after native
targets and closure; immutable feature coordinates and all skin X/Z values
remain unchanged. Chin coefficients and the nasal/chin anchors stay fixed.
The source sampler now labels the actual nasal return (source vertex 317),
correcting the earlier misleading `noseBase` sample from the philtrum.

One same-material front/side/three-quarter set was inspected. The shifted mouth
stays closed and the surrounding surface continuous, with no eye/nose/chin
rebuild. Source indices/feature coordinates, eyes/brows, collar and masculine
asset are unchanged. Contact displacement discrepancy from rounding is below
0.00012 mm. The guarded build and three views completed in 3.33 seconds at
approximately 245 MiB; cgroup OOM counters were unavailable. Overall individual
similarity remains unaccepted, so this is a development candidate only. All
private photo alignments remain in ignored `qa/perioral-study/`.


## Coordinated eyelid and iris comparison

The inspected multi-angle eye crops show a flatter model aperture, long lateral
scleral wedges and less readable upper-lid support. Reference iris coverage is
larger, with the upper lid over the iris and a rounder lower supporting arc.
This single candidate preserves globe size/centers and both canthal columns,
while redistributing the complete eyelid thickness band angularly in the
current common ellipsoid frame. The lower band travels farther down around
the globe than the upper band. It does not equate one source vertex loop with
the globe intersection: the visible contact traverses different layers around
the aperture. The angular map preserves each point's current radial distance;
additional tarsal support is restricted to skin outside the intersection band.
The upper fold is slightly softened, without a painted dark eye ring.

Iris-boundary latitude changes from 0.405 to 0.470 radians and the pupil follows
the same linear ratio, approximately 1.1494. This changes colored regions on
the unchanged globe ellipsoid; it does not scale the eyeballs. The projected
iris remains circular. Source skin topology/features, exact inner/outer canthal
positions across the four thickness/return layers, nasal/mouth/chin anchors,
and masculine asset remain unchanged. Globe sample radius error is below
0.000005 in normalized ellipsoid units, due to export rounding. Head triangles
remain 14,726 and the character uses two material batches.

One complete front/side/three-quarter game-material set was inspected. The
iris occupies more of the aperture, lateral white wedges are shorter, and the
lower lid reads rounder while upper-iris coverage remains. No new visible lid
gap or protruding globe was observed in these views. This is still an artistic
candidate, not accepted individual likeness or default replacement. The guarded
build/capture took 3.33 seconds and approximately 248 MiB; cgroup OOM counters
were unavailable. Evidence is in ignored `qa/ocular-study/candidate/`; private
reference comparisons are not shipped.
