# Separate facial volume plan — no implementation in the short-hair correction

Status: design only. The v2 short-hair correction changes cap/locks and posterior skull; it does not implement the facial work below. Visual review identified these remaining problems from actual v1 images. Existing traits and score do not constitute art acceptance.

## Current visible issue and source cause

- Eye whites are thin almond patches conformed to the face surface. They do not have a common curved eyeball volume beneath the upper/lower lids. The current lid tubes follow that same face surface, so the face reads as a mask at side and three-quarter views.
- The nose is mostly a localized Gaussian projection. Tiny nostril curves provide marks but little alar/sidewall volume.
- Cheeks, sockets and chin share a narrow frontal cos(angle)^8 gate in the baseline. This suppresses much of their form away from straight-on. The current prototype adds a broad continuous warp but does not redesign these anatomical planes.
- Lips are shallow conformal patches. The seam and color are more visible than the upper/lower lip thickness in profile.

## Bounded original modeling approach for a later independent pass

1. Keep the existing neutral eye size and spacing. Place a small convex scleral section inside each socket, with only a few millimetres of visible front relief. Upper and lower lids must wrap that same surface, rather than float as separate lines. Preserve a little visible upper-lid thickness and a softer lower edge. Do not enlarge eyes or deepen crease lines as a shortcut.
2. Separate the nose bridge, tip, alar wings and transition to the upper lip in the continuous head surface. Sidewall shading should come from the connected shape. Keep nostril marks subordinate; do not use dark drawn loops to fake depth.
3. Broaden cheek mass into the temple and jaw with smooth angular falloff. Preserve a gentle indentation between lower lip and chin. Avoid hard triangular cheek cuts or sharp jaw corners added solely for stronger contrast.
4. Give upper and lower lips their own shallow thickness around the unchanged mouth width/seam. A small side-profile projection is enough; avoid a projecting beak or oversized cosmetic outline.
5. Drive skin, eye/lid attachments, nostrils and lips from one shared neutral surface function. Each of the six existing bounded traits must retain its intended effect. Preserve colors, score formula, random identity/save logic, body, neck and rig.

## Evidence needed before accepting such a pass

- One masculine and one feminine neutral face, same colors/camera/lighting as baseline
- True side, front and three-quarter, both with hair removed and the accepted short hair
- Eye/lid conformity at the current eye-size range; nose-tip/alar continuity at existing nose-size/width limits
- Cheek/jaw silhouettes at current jaw width range, without changing the semantics of the controls
- Actual close third-person view: facial planes should remain readable while fine details disappear naturally
- No texture, pore, transparent hair-card or creator asset reuse; no appearance score used as aesthetic proof

This is held until the one short-hair silhouette and bald posterior skull have been reviewed. It is not permission to replace the whole character or change the current release.
