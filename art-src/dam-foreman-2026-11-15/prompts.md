# Dam foreman art — ImageGen prompt set

5 sequential built-in ImageGen calls, transparent_background=true. Shado status
was unavailable because its MCP call was rejected by the session approval policy
(`never`); no Studio provider settings were accessed. No API keys used in scripts.
The source files below are read-only references, not edit destinations.

## 1 — carry-generated.png

References: img/crew-dam.webp (identity/body), img/crew-dam-walk-v2.webp (walk
rendering), img/crew-dam-work.webp (effort expression).

Create a production 2D game sprite sheet of DAM, exactly the same character as these read-only reference images. Reference 1 identity/body, reference 2 walking pixel-art rendering, reference 3 effort expression. Preserve charcoal gray purple fur, enormous pointed bat ears with muted reddish interiors, tiny brown pig snout, heavy sleepy yellow eyes, small lower fang, small bat wings with red membranes, bare torso, patched black shorts, barefoot three-toed feet, exact chibi proportions. Ears are NOT horns. Do not turn him into a red worker, human or goblin, no hat, no new clothing. NEW ACTION: carrying a rough brown sack containing jagged rubble stones high on one shoulder, arm gripping sack; other arm balances while walking. No bucket. True transparent RGBA background, no ground shadow, no white border, no text or grid lines. SHEET: wide 2:1 aspect, 8 equal columns and 4 equal rows, 32 complete isolated sprites. Each row is 8 sequential phases of one smoothly looping walk, alternating contact, down, passing, up for each foot, small natural bob under 3 percent body height, no sliding whole body. Row 1 facing RIGHT full profile or slight three-quarter right; row 2 facing LEFT; row 3 facing camera DOWN; row 4 back to camera UP showing backs of ears and wings, sack visible over shoulder. Maintain the exact same character size ALL 32 frames, same oversized head and ears, same sack shape. Feet ground registration center-bottom of each equal cell, keep all ears and sack within cell and clear empty gutters. Aim output 2560x1280 with each cell 320 square, foot anchor x160 y316 within each cell, ear tips near y20. Hard clean pixel-art edges with the same illustrated pixel-art shading and dark outline as input. No decorative elements, no floor, no background.

## 2 — supervise-generated.png

References: img/crew-dam.webp, img/crew-dam-work.webp.

Create one transparent 512x512 production pixel-art game sprite: DAM the kitchen foreman standing with arms crossed and a calm stern supervisory expression. Exact same character as reference 1 (identity, original scale and silhouette) and reference 2 (effort expression only). Charcoal gray-purple fur, very large pointed bat ears with muted burgundy inner ears, short messy tuft, heavy half-closed yellow eyes, small brown pig snout, tiny lower fang, same large head small bare torso proportions, red-membrane bat wings extended behind shoulders, same patched black shorts, three-toed bare feet. No horns; do not reinterpret large ears as horns. Remove bucket entirely and fold both arms across his chest, holding nothing. Add only a small muted brown waist-tied kitchen towel on his hip, do not change clothing otherwise. The sprite must occupy same height and placement as original 512 square reference, top ear tip near y3, soles bottom at y509, body centered x256, both feet planted, full entire silhouette visible including ears and wings. Crisp deliberately pixelated outlines and clusters of original, no smoothing into vector art. No background, true transparent RGBA, no ground plane, no drop shadow, no text, no icon, no white border. Single full-body character only.

## 3 — rice-generated.png

References: img/crew-dam.webp, img/crew-dam-walk-v2.webp, carry-generated.png.

Create a production transparent 2D pixel-art sprite sheet for DAM carrying rice meals in BOTH hands. Identity MUST be exactly DAM from reference 1: charcoal gray-purple furry bat creature with huge reddish inside pointed ears (NOT horns), tiny brown pig snout, half-closed yellow eyes, little lower fang, red membrane wings, no shirt, patched black shorts, bare three-toed feet; preserve exact original big head and small body. Reference 2 walk rendering; reference 3 shows previously generated directional sheet layout and identity consistency only, DO NOT keep sack. NEW ACTION holding a shallow brown wooden tray in both hands before waist, with 3 white triangular rice balls having small dark seaweed patches. No sack, no bucket, no hat. Sheet is wide 2:1 aspect ratio, EXACTLY 8 equal columns by 4 equal rows, 32 complete sprites. Row1 eight phases RIGHT-facing walk, row2 eight phases LEFT-facing walk, row3 eight phases FRONT/down walking toward camera, row4 eight phases BACK/up walking away with tray edges visible at sides. Eight DISTINCT gait phases in every row: right-leg contact, recoil, passing, high, left-leg contact, recoil, passing, high, loop back to first, do NOT repeat same leg 8 times. Upper head and tray stable, feet alternate, subtle bounce under 3% of body height. All sprites same height with ear tips near top and feet at center-bottom of each equal cell, leave safe transparent gutters around every character. Size target 2560x1280, cells320, foot x160 y316. Same pixel-art clusters, dark outlines, colors and proportions as reference, no extra detail that changes character. True transparent alpha background, no ground shadow, no checkerboard or background image, no grid lines, no letters, no numbers, no text. Complete ears and feet in every frame.

## 4 — carry-loopfix-generated.png (not selected; output discarded)

References: carry-generated.png, img/crew-dam.webp.

EDIT reference 1's 8-column x 4-row sprite sheet, same DAM character and same rubble sack, exact same pixel-art style and colors. Reference 2 confirms identity, no redesign. Fix the LOOP CLOSURE: edit ONLY the 8th/rightmost frame of EACH row; preserve the other seven frames as closely as possible. Each 8th frame is the pose BETWEEN the 7th frame and the 1st frame when walking at 8fps, so the knee must be lowering and leg extending toward the first contact pose, not still raised sharply. The eighth head, ear tips, face, wings, sack, torso shape and upper-body position should closely MATCH the FIRST frame of that row, with the legs in the preceding late-swing position. Do not rotate the head or change its size. Subtle natural gait, not hopping. Row1 RIGHT, row2 LEFT, row3 FRONT/down, row4 BACK/up; all4 carry the same sack high on same shoulder with one hand steadying it. Keep exact 8x4 grid, complete sprites, blank gutters, all feet at bottom-center of cells. Clean dark pixel outlines with warm highlights matching original character, remove any red/magenta transparency fringe outside actual outline, NO floor shadow, no text, no grid, true transparent RGBA. Wide 2:1 sheet, same framing and proportions as reference1.

## 5 — rice-loopfix-generated.png (not selected; output discarded)

References: rice-generated.png, img/crew-dam.webp.

EDIT reference1 sprite sheet only to improve WALK LOOP CLOSURE. Keep exact 8 columns x 4 rows, same DAM pixel-art character, same both hands holding wooden tray of three triangular rice balls, no sack, no bucket, no costume changes. Reference2 identity only. Edit only the EIGHTH/RIGHTMOST pose of each of four rows, preserve other poses as closely as possible. Eighth pose should transition smoothly FROM frame7 INTO frame1: knee lowering, foot extending toward first foot-contact position. The eighth pose's head/ears/face/wings/torso/tray shape, SIZE and POSITION should closely match frame1 of same row, with the legs in late swing just before the first contact. No big high knee in eighth pose, no new direction or rotated head, no bob over3%. Row1 right, row2 left, row3 front/down, row4 back/up; tray held level with BOTH hands. All complete ears and feet with blank gutters. Exact original fur color charcoal gray purple, heavy sleepy yellow eyes, brown pig snout, red membrane wings, patched black shorts, huge ears NOT horns. Crisp clean dark pixel outline, no red or magenta pixels floating outside outline, no white fringe, no ground shadow, true transparent RGBA, no text, no grid, wide2:1 sheet.

## Final assembly decision

The two attempted closure edits did not consistently reduce both adjacent transitions.
Final sheets use the first five drawn poses from calls 1 and 3, played as
1,2,3,4,5,4,3,2. Call 2 supplies the supervisor. Generated alpha is thresholded,
RGB is preserved, silhouettes are nearest-scaled and foot-registered. This is
five unique drawn poses and eight baked playback frames per direction.
