# Representative French frock coat

Development-only module: `applyNaturalClothing(source, opts)` from `natural-clothing.mjs`, called immediately after `createApprovedSurfaces(opts)` and before `mergeSurfaces(source)`. Source geometry has already received the production body and relaxed arm transforms. Replacement surfaces reproduce those transforms and retain anatomical `sourceY` for the existing weights. No rig, hands, wrists, head, neck or root dimensions are changed.

The prototype selects male France `court-frock-coat` at neutral leg proportions only. The checked representative is `masculine-lean`; other cuts return without change. Masculine-broad shape coefficients are retained but that preset is not visually accepted. Color objects are retained on each named mesh. The `royal-frock-bodice`, `court-long-sleeve-*`, `shirt-collar-*`, `royal-cravat`, `royal-gold-facing-*`, shirt opening/placket/buttons and two subdued shirt seams are the only modified surfaces. Tail, trousers, footwear and all skin surfaces stay unchanged.

The closed sleeve cap replaces the previous horizontal open top ring. It overlaps the real shoulder beneath the torso, with its top tucked inside the shoulder envelope. The short collar consists of two seated cloth planes; its top remains y1.405, close to the original 1.407, with no raised neck concealment.

Checked once with `node development/complete-character/check-clothing.mjs`: finite geometry, valid anatomical sourceY, unchanged 14 hand/wrist meshes, idempotence, and unrelated outfit no-op.

Isolated visual command (generated QA output is ignored):

    HEAD_STUDY=/absolute/path/to/complete-character/load_character.mjs OUT_DIR=/absolute/worktree/qa/natural-clothing/candidate02 timeout 120 node --max-old-space-size=380 development/complete-character/render-clothing.mjs

The head study is used directly from its owner’s worktree; there is no copied source snapshot. Candidate02 was actually viewed in front/three-quarter/profile and full figure idle/one moving arm phase. It removes the square shoulder ledges and leaf-shaped collar while keeping the original green/cream/gold French identity. Both normal-distance frames show attached hands and a closed sleeve/body silhouette. The full combined rendering was 33,508 triangles and 2 draw calls. This does not constitute gameplay, broad-body, all-garment, or final character aesthetic acceptance. The head owner performs the final combined render with the current skin finish.
