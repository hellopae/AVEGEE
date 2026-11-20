# พรอมป์ต์ ImageGen — รอบ R

ใช้ ImageGen ในตัวเท่านั้น ไม่ใช้ Shado หรือ API ภายนอก
ทุกครั้งแนบภาพเดิมเป็น image 1 และแนบต้นแบบ image 2–5 ตามลำดับนี้:

- `docs/art-reviews/2026-11-20-design-approval/yama-cyberhell-costume-v1.webp`
- `docs/art-reviews/2026-11-20-guard-designs/guard-guanyu-asia-v1.webp`
- `docs/art-reviews/2026-11-20-guard-designs/guard-vanhelsing-west-v2.webp`
- `docs/art-reviews/2026-11-20-guard-designs/guard-watson03-cyberhell-v1.webp`

## ครั้งที่ 1 — story-cyberhell-01-v2.webp

```text
Use case: precise-object-edit.
Edit target: image 1, existing pixel-art Cyberhell story cutscene. Reference images 2,3,4,5 are respectively approved NEW Yama zone4 costume, Guan Yu, Van Helsing, WATSON-03. For THIS scene use only Yama costume reference; guard references are supplied for context, do not add them.
Change ONLY the outfit of the small back-facing red-skinned horned Yama at bottom center. His NEW outfit must match image 2: black/graphite segmented coat armor, angular SILVER and VIOLET borders, bright thin CYAN circuit traces on sleeves and split coat tails, silver shoulder armor, black boots with cyan sole accents, black angular cap with SILVER borders and cyan band. Adapt approved front reference naturally to this rear view. Retain original red skin, horns, hair, pose, silhouette scale, facing away, and held book (do NOT replace book with sword).
Preserve all other pixels and visual content as closely as possible: square 1024x1024 canvas, black letterbox bands, original pixel art style, purple neon cave/server hall, lava and cyan river, bridge, soldiers, seated figures and distant Archon. Do not fix or reinterpret original story staging. No extra characters, no new weapons, no text, lettering, captions, labels, logos or watermark. This is a localized wardrobe replacement, not a redraw of the scene. Keep EXACT original framing, character positions, lighting and palette outside Yama's costume. Output image only.
```

## ครั้งที่ 2 — story-cyberhell-02-v3.webp

```text
Use case: precise-object-edit. Asset: existing game cutscene, localized edit.
INPUT ROLES: Image 1 is the EDIT TARGET and absolute authority for composition, poses, camera, background, style and lighting. Image 2 is approved Yama zone4 COSTUME reference. Image 3 approved Guan Yu, image 4 approved Van Helsing, image 5 approved WATSON-03.
YAMA WARDROBE: black/graphite armored split-tail long coat, angular silver panels and violet trim, clearly bright thin CYAN CIRCUIT TRACES on sleeves and coat tails, silver shoulder armor, cyan chest gem if visible, matching black/silver angular cap with cyan band and central cyan gem if visible, armored black boots with cyan soles. Keep Yama's red skin, horns, black hair, proportions, original facial expression, gesture, scale, facing direction and BOOK. Do not add a sword where the source holds a book.
INVARIANTS: original pixel-art/chibi illustration style, exact original full canvas aspect and black letterboxing, original locations and scale of every character, perspective, camera, environment, purple crystals, server towers, lava, cyan spirit rivers, architectural details and lighting. Copy unchanged regions faithfully. Do not recompose or globally restyle. No words, lettering, captions, numbers, labels, logos or watermark. Keep decorative patterns abstract, not readable text.
THIS SCENE: edit ONLY the clothing of the back-facing small red Yama in LEFT FOREGROUND, with cap at x~196 y~410 on the original 1280x721 canvas. Change his costume to image 2 naturally adapted to rear view. Keep his pose and position exactly. The four seated possessed leaders, their purple chains, tall Archon behind them, all faces and all scenery MUST remain unchanged. Images 3-5 are context references only, do NOT insert new Guards here. Retain existing 1280x721 framing including letterbox bands.
```

## ครั้งที่ 3 — story-cyberhell-03-v4.webp

```text
Use case: precise-object-edit. Asset: existing game cutscene, localized edit.
INPUT ROLES: Image 1 is the EDIT TARGET and absolute authority for composition, poses, camera, background, style and lighting. Image 2 is approved Yama zone4 COSTUME reference. Image 3 approved Guan Yu, image 4 approved Van Helsing, image 5 approved WATSON-03.
YAMA WARDROBE: black/graphite armored split-tail long coat, angular silver panels and violet trim, clearly bright thin CYAN CIRCUIT TRACES on sleeves and coat tails, silver shoulder armor, cyan chest gem if visible, matching black/silver angular cap with cyan band and central cyan gem if visible, armored black boots with cyan soles. Keep Yama's red skin, horns, black hair, proportions, original facial expression, gesture, scale, facing direction and BOOK. Do not add a sword where the source holds a book.
INVARIANTS: original pixel-art/chibi illustration style, exact original full canvas aspect and black letterboxing, original locations and scale of every character, perspective, camera, environment, purple crystals, server towers, lava, cyan spirit rivers, architectural details and lighting. Copy unchanged regions faithfully. Do not recompose or globally restyle. No words, lettering, captions, numbers, labels, logos or watermark. Keep decorative patterns abstract, not readable text.
THIS SCENE: edit ONLY clothing of the small back-facing red Yama at center-left foreground, x~622 y~474 of original 1280x720 image. Give him the approved image2 NEW costume seen from behind. Keep his stance, turned profile, cap, hands, original silhouette scale. Keep giant Archon on right with book and raised hand, four leaders leaning over left railing, empty distant throne, all architecture, every background pixel as close as possible to original. Images 3-5 are context only: do NOT add Guards to this scene. Retain 1280x720 canvas and letterboxing.
```

## ครั้งที่ 4 — story-cyberhell-reinforcements-01.webp

```text
Use case: precise-object-edit. Asset: existing game cutscene, localized edit.
INPUT ROLES: Image 1 is the EDIT TARGET and absolute authority for composition, poses, camera, background, style and lighting. Image 2 is approved Yama zone4 COSTUME reference. Image 3 approved Guan Yu, image 4 approved Van Helsing, image 5 approved WATSON-03.
YAMA WARDROBE: black/graphite armored split-tail long coat, angular silver panels and violet trim, clearly bright thin CYAN CIRCUIT TRACES on sleeves and coat tails, silver shoulder armor, cyan chest gem if visible, matching black/silver angular cap with cyan band and central cyan gem if visible, armored black boots with cyan soles. Keep Yama's red skin, horns, black hair, proportions, original facial expression, gesture, scale, facing direction and BOOK. Do not add a sword where the source holds a book.
INVARIANTS: original pixel-art/chibi illustration style, exact original full canvas aspect and black letterboxing, original locations and scale of every character, perspective, camera, environment, purple crystals, server towers, lava, cyan spirit rivers, architectural details and lighting. Copy unchanged regions faithfully. Do not recompose or globally restyle. No words, lettering, captions, numbers, labels, logos or watermark. Keep decorative patterns abstract, not readable text.
FOUR LOCALIZED CHANGES ONLY:
A. Yama wardrobe to image2, same pose/expression and book.
B. Old horse/wolf-headed red-and-black SAMURAI Guard = replace with human GUAN YU from image3: stern RED FACE, long flowing BLACK BEARD, dark GREEN and GOLD dragon armor and green headdress, crescent GREEN DRAGON GLAIVE. Keep original Guard's location/scale/action and adapt new human design to it. Remove old animal samurai entirely.
C. Old BLACK BIRD/raven-headed axe-bearing armored Guard = replace with HUMAN elderly VAN HELSING from image4: gray hair, gray MUSTACHE, lined tan face, BROWN wide-brim buckled HAT, brown long hunter coat, leather satchel, wooden crossbow and blue-white lantern. No black bird remains at that location.
D. Old broad GREY dark-skinned horned crowned gold-and-black cyber Guard with huge ornate cyan hexagonal STAFF = replace at SAME location with WATSON-03 from image5: SLENDER SILVER-GRAY robot, large rounded plated head, TWO round CYAN CONCENTRIC LENS eyes, purple armor insets, cyan circuitry, thin transparent cyan holographic SLATE with light streaks (no writing). NO crown, tusks, horns or giant staff on this robot.
Keep the GREEN giant Kumbhanda in Thai gold pointed crown unchanged! Keep ALL other teammates unchanged: black bird replacement only affects axe Guard; preserve brown bull, red curly-haired club fighter, blue lotus monk, black-robed human with scroll, purple female clerk with paper stack, orange fire child, gray bat with metal bucket, blue horned book reader, and separate grey/red cyborg with CANNON. Those are NOT the Guards to replace. Keep same total characters, no duplicate replacements.
TARGET LOCATIONS in original 1672x941: Yama front center-left x~685 y~571 with book; old SAMURAI is mid-right x~1148 y~478; old BIRD is BACK LEFT x~404 y~220; old CYBER STAFF GUARD is upper center x~946 y~240. Keep GREEN giant front left x~420 y~475, and purple clerk front center-right x~947 y~590 untouched. The separate cannon cyborg upper-right x~1260 y~269 stays untouched. Preserve lively running/rally scene and all scenery exactly, no character rearrangement. Make replacements feel naturally painted into existing pixel illustration.
```

## ครั้งที่ 5 — story-cyberhell-reinforcements-02.webp

```text
Use case: precise-object-edit. Asset: existing game cutscene, localized edit.
INPUT ROLES: Image 1 is the EDIT TARGET and absolute authority for composition, poses, camera, background, style and lighting. Image 2 is approved Yama zone4 COSTUME reference. Image 3 approved Guan Yu, image 4 approved Van Helsing, image 5 approved WATSON-03.
YAMA WARDROBE: black/graphite armored split-tail long coat, angular silver panels and violet trim, clearly bright thin CYAN CIRCUIT TRACES on sleeves and coat tails, silver shoulder armor, cyan chest gem if visible, matching black/silver angular cap with cyan band and central cyan gem if visible, armored black boots with cyan soles. Keep Yama's red skin, horns, black hair, proportions, original facial expression, gesture, scale, facing direction and BOOK. Do not add a sword where the source holds a book.
INVARIANTS: original pixel-art/chibi illustration style, exact original full canvas aspect and black letterboxing, original locations and scale of every character, perspective, camera, environment, purple crystals, server towers, lava, cyan spirit rivers, architectural details and lighting. Copy unchanged regions faithfully. Do not recompose or globally restyle. No words, lettering, captions, numbers, labels, logos or watermark. Keep decorative patterns abstract, not readable text.
FOUR LOCALIZED CHANGES ONLY:
A. Yama wardrobe to image2, same pose/expression and book.
B. Old horse/wolf-headed red-and-black SAMURAI Guard = replace with human GUAN YU from image3: stern RED FACE, long flowing BLACK BEARD, dark GREEN and GOLD dragon armor and green headdress, crescent GREEN DRAGON GLAIVE. Keep original Guard's location/scale/action and adapt new human design to it. Remove old animal samurai entirely.
C. Old BLACK BIRD/raven-headed axe-bearing armored Guard = replace with HUMAN elderly VAN HELSING from image4: gray hair, gray MUSTACHE, lined tan face, BROWN wide-brim buckled HAT, brown long hunter coat, leather satchel, wooden crossbow and blue-white lantern. No black bird remains at that location.
D. Old broad GREY dark-skinned horned crowned gold-and-black cyber Guard with huge ornate cyan hexagonal STAFF = replace at SAME location with WATSON-03 from image5: SLENDER SILVER-GRAY robot, large rounded plated head, TWO round CYAN CONCENTRIC LENS eyes, purple armor insets, cyan circuitry, thin transparent cyan holographic SLATE with light streaks (no writing). NO crown, tusks, horns or giant staff on this robot.
Keep the GREEN giant Kumbhanda in Thai gold pointed crown unchanged! Keep ALL other teammates unchanged: black bird replacement only affects axe Guard; preserve brown bull, red curly-haired club fighter, blue lotus monk, black-robed human with scroll, purple female clerk with paper stack, orange fire child, gray bat with metal bucket, blue horned book reader, and separate grey/red cyborg with CANNON. Those are NOT the Guards to replace. Keep same total characters, no duplicate replacements.
TARGET LOCATIONS in original 1672x941: Yama back-facing at BOTTOM LEFT x~375 y~723 holding book, preserve exact back-view pose; old SAMURAI is center upper x~727 y~330 with long horizontal weapon; old BLACK BIRD axe Guard is center foreground x~843 y~635; old CYBER crowned STAFF GUARD is upper-center x~813 y~315, holding giant cyan hexagonal staff at x~967 y~225. These are distinct old characters, replace each exactly once. Keep GREEN giant attacking to the right x~969 y~431 unchanged, purple female clerk bottom-left unchanged, grey/red CANNON CYBORG at x~575 y~408 unchanged. Keep right-side ENEMY purple army and distant Archon on stairs unchanged. Maintain all battle motion and attack composition.
```

