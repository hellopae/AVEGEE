# ImageGen prompt set — P1

Built-in `image_gen.imagegen` เท่านั้น; `transparent_background=true` ทุกครั้ง; 9 calls รวม retry 1 ครั้ง ไม่มี batch และไม่ได้ส่งทั้ง sheet เข้า ImageGen

Input 1: เฟรมเดิมที่ตัดตามกริดจาก path ใน validation.json (index เริ่ม 0)
Input 2: `docs/art-reviews/2026-11-20-design-approval/yama-cyberhell-costume-v1.webp` ทุกครั้ง

## 1 — idle frame 0 (นำรายละเอียดชุดไปประกอบ idle 1–5)

Use case: identity-preserve. Edit image 1, one single game animation frame, NOT a sheet. Image 2 is ONLY the approved costume reference. Change ONLY the uniform and hat of image 1 to the black charcoal coat/armor with silver-purple trim, cyan luminous circuit lines, cyan hat band and cyan jewel from image 2. Keep the exact image 1 pose, anatomy, red face, eye expression, red horns, ears, red hands, original sword and sword glow pixel-aligned, and same silhouette proportions. Do not replace image 1 with image 2's pose. Keep frame 1's clothing silhouette and feet placement, render reference costume details onto those garments. Full single character at same framing and scale with ample original transparent margins. True transparent background, no shadow, no added objects, no text. Maintain original sprite style; not a redesign of the face or blade.

## 2 — atk frame 0

Use case: identity-preserve. EDIT ONLY image 1 single pixel-art attack frame. Image 2 is costume reference ONLY. Keep exact image 1 pose: one red fist behind head on LEFT, other open red hand extended to RIGHT, legs in the exact same wide stance. NO SWORD in this frame. Keep pixel art aesthetic, same red face, eyes, expression, horns, ears, red skin, body proportions, silhouette and facing direction. Change ONLY coat armor boots and hat details to approved costume: charcoal black uniform, silver-purple trim, cyan circuit lines and cyan band/jewel on hat, silver shoulder plates. Do NOT copy image 2's pose, face or sword. Preserve original pose rigorously. Transparent background, single full character, no text or new objects. Match original framing.

## 3 — atk-L frame 0

Use case: identity-preserve. Edit image 1 only, SINGLE pixel-art attack frame facing LEFT, left hand stretched toward LEFT and coat tails flowing toward RIGHT. Image 2 is only approved costume. Change ONLY uniform, boots and hat to black charcoal cyber armor, purple-silver edging, cyan circuit line pattern, cyan hat band and cyan gemstone. Preserve image 1's exact pose, left-facing direction, red face and facial expression, eyes, horns, ears, red hands, anatomy, proportions, silhouette including flowing coat tails, arm angle and feet positions. NO sword in image 1; do NOT add a sword or copy image 2 pose. Keep pixel art sprite rendering. Transparent background, no shadows, one character, no text. Retain original image composition.

## 4 — atk-R frame 0

Use case: identity-preserve. Edit image 1 only, SINGLE pixel-art attack frame facing RIGHT, red hand stretched toward RIGHT and coat tails flowing toward LEFT. Image 2 is only approved costume. Change ONLY uniform, boots and hat to black charcoal cyber armor, purple-silver edging, cyan circuit line pattern, cyan hat band and cyan gemstone. Preserve image 1's exact pose, right-facing direction, red face and facial expression, eyes, horns, ears, red hands, anatomy, proportions, silhouette including flowing coat tails, arm angle and feet positions. NO sword in image 1; do NOT add a sword or copy image 2 pose. Keep pixel art sprite rendering. Transparent background, no shadows, one character, no text. Retain original image composition.

## 5 — hurt frame 0

Use case: identity-preserve. EDIT image 1 single hurt animation frame ONLY. Image 2 is approved COSTUME reference, NOT a pose reference. Keep exact image 1 hunched hurt pose, closed squeezed eyes, clenched mouth, red face horns ears and hands, exact body proportions, sword position/angle/shape and original blade colors, feet placement. Change ONLY uniform and hat to reference costume: charcoal-black cyber coat, silver and purple armor edging, cyan circuitry lines, cyan hat band/jewel and armored boots. Preserve image 1 silhouette and all limb angles, especially sword pointing UP RIGHT. Do not copy reference pose or facial expression. Single full character, true transparent background, no shadow, no added objects or text. Same sprite illustration style and composition as image 1.

## 6 — hurt frame 1

Use case: identity-preserve. EDIT image 1 single hurt animation frame ONLY. Image 2 is approved COSTUME reference, NOT pose. Keep exact image 1 leaning backward hurt pose, head tilting back to RIGHT, squeezed shut eyes and open clenched mouth, red face horns ears and hands. Sword MUST remain pointing diagonally DOWN RIGHT across waist, exactly same angle and shape as image 1. Keep all limb angles and feet placement. Change ONLY uniform and hat: charcoal-black cyber coat with silver-purple armor edges, cyan circuit lines, cyan hat band/jewel and armored boots. Keep silhouette, proportions, original face and blade colors; do NOT copy reference sword or neutral face or upright pose. True transparent background; one single full character, no shadow, no text, no red horizontal line/background artifacts. Same sprite illustration style as image 1.

## 7 — hurt frame 2

Use case: identity-preserve. EDIT image 1 single animation sprite, image 2 COSTUME reference only. Keep EXACT image 1 pose, face, red horns ears hands, serious open eyes expression, proportions, sword diagonal UP RIGHT at same angle, silhouette and foot positions. Replace ONLY uniform boots and hat details with approved black charcoal cyber armor coat, purple-silver edging, cyan circuit lines, cyan hat band/gem. Do NOT use reference pose or face, do not modify blade or add cyan to sword. Keep sprite illustration style of image 1. True transparent background, no shadow, one character, no text, original image framing.

## 8 — hurt frame 3, ไม่ใช้ผลนี้ (ลาย cyan เสื้อไม่ครบ)

Use case: identity-preserve. EDIT image 1 single animation sprite ONLY; image 2 COSTUME reference only. Keep EXACT image 1 pose, left-shifted body, wide stance, face, red horns ears hands, serious open eyes expression, proportions, long sword diagonal UP RIGHT at same steep angle, silhouette and foot positions. Replace ONLY uniform boots and hat details with approved black charcoal cyber armor coat, purple-silver edging, cyan circuit lines, cyan hat band/gem. Do NOT use reference pose or face, do not modify blade or add cyan to sword. Keep sprite illustration style of image 1. True transparent background, no shadow, one character, no text, no lines outside character, original image framing.

## 9 — hurt frame 3 retry, ใช้ผลนี้

Use case: identity-preserve. Repaint only CLOTHING AND HAT of image 1 into exactly approved cyber costume image 2. MUST include bright cyan circuit traces on BOTH front coat tails, cyan lines on BOTH sleeve cuffs, layered silver shoulder armor and purple trim, cyan chest jewel, black/charcoal coat. Hat with cyan band and central cyan gem. Image 1 pose MUST stay the same: left-shifted character, long blade steeply diagonal UP RIGHT, wide feet, serious open eyes. Keep ORIGINAL image 1 red face, horns, hands, sword, proportions, limb positions, clothing silhouette and composition. Image 2 only costume guide, not pose. Do not leave original plain grey coat! True transparent background, single character, no shadows, no text. Preserve sprite illustration style.
