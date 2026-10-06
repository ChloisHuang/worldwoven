# Male facial range

Responds to the three-official screenshot from 2026-10-06 15:44 UTC. The actual screenshot was inspected. The resident generator already supplies independent saved six-trait identities through `courtOfficialAppearance` to the production actor. No seed, generator bound, score, migration or official role override is changed.

The local male-only rendering response expands the smaller-eye endpoint by 1.5×, socket depth by 1.6×, nose width by 1.8× and each alar wing's local size by 1.75×. High-eye response retains the reviewed upper limit: expanding it further caused an upper-orbital/brow contact regression in an initial candidate, which was rejected. The accepted narrow/high jaw, broad low chin and neutral sculpt remain exact. Central nose projection and bridge support are independent. The authored lip region is excluded from additional nasal response. Deeper male sockets add at most 0.41 mm brow clearance to protect triangle interiors.

## Evidence

- `node tests/actor-male-face-range.mjs`: independent control gains, exact mouth/neck preservation against legacy response, combined endpoint brow contact, six-field resident identity persistence.
- Existing `actor-nose-profile.mjs`, `actor-male-jaw-profile.mjs`, `actor-shape-independence.mjs`, `actor-retained-hair.mjs`, `actor-model-preview.mjs` pass. A targeted one-time baseline comparison confirms female and neutral position/normal arrays remain byte-identical to R16.145; lip and neck positions remain exact.
- Clean build passes. No shared save/rig/sleep/navigation code changes; their existing evidence is reused.
- Existing `development/nose-brow-profile/export.mjs` exports actual production live-entry meshes with evaluated skeleton; `render.py` renders source triangles, normals and vertex colors under fixed approximate diffuse lighting. Evidence is in ignored `qa/male-face-range/`.
- `final-low`, `after-middle`, `final-high` show low/neutral/high controls, same hair/color/lighting, front/profile/three-quarter. `same-score-a` (`eyeSize:.82,noseWidth:.8`) and `same-score-b` (`eyeSize:1.2,noseWidth:1.18`) both score 46 under unchanged v1 but have distinct faces. Attractiveness is not an identity index.

The review is of actual game geometry in offline lighting, not the Three cel shader, browser/iOS screenshots or the user's recovered save. Browser localhost restrictions were respected. Visual acceptance remains with the user.

## Ordinary generated cohort and remaining limitation

The screenshot positively identifies the rites official only; its saved world seed and other two labels are not available. `cohort-front.jpg`, `cohort-threequarter.jpg`, and `cohort-profile.jpg` compare the rites, records and justice officials from the existing v1 generator with representative seed 1, before/after, same hair/color/lighting. Their scores stay 64/57/43 and their traits are not rewritten. This is an identified official cohort, not a recovered screenshot save.

For 2,298 anterior face vertices, pairwise RMS difference grows from 1.66→2.06, 3.50→5.47 and 2.49→4.07 mm. The front-view nasal/orbital distinctions improve; overall face types and side profiles remain relatively alike. This bounded patch is a partial range improvement, not proof that the original same-face complaint is resolved. FA01 stays open. Further identity-range work would require a separately scoped decision rather than silently changing v1 score semantics or repurposing a single score as a face identity.
