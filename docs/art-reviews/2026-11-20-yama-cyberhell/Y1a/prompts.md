# คำสั่ง ImageGen — Y1a

ใช้ built-in `image_gen` เท่านั้น รวม 10 ครั้ง `transparent_background=true` ยกเว้น profile ซึ่งเป็น `false` ภาพแนบที่ 1 คือต้นฉบับของไฟล์นั้น ภาพแนบที่ 2 ทุกครั้งคือ `docs/art-reviews/2026-11-20-design-approval/yama-cyberhell-costume-v1.webp` ภาพส่งมอบผ่านการประกอบเฉพาะชุดและการส่งออกทางเทคนิคตาม README

## 1. ตัวหลัก

```text
Use case: precise-object-edit. Edit target: image 1, 512x512 transparent game sprite. Costume reference only: image 2. Redraw ONLY the existing hat and coat of image 1 with image 2 approved black/dark purple fabric, angular purple silver edging, cyan neon circuit kanok ornament, cyan luminous hat band and cyan front gemstone. Preserve image 1 pixel-art rendering exactly, existing face, expression, red skin, horns, hair, hands, closed book, pants, shoes, pose, silhouette, character scale, placement, and every foot pixel. Do not add sword; keep the book. Keep full exact 512x512 canvas with original character bounds x144..366 y0..511. No recentering, no pose change, no zoom. True transparent background. No text, no blood. Output only the edited image 1, no montage.
```

## 2. profile

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET; image 2 is ONLY the approved costume reference. Output ONLY edited image 1. 512x512 RGB square portrait, original intricate icy blue room background, face, red skin, horns, expression, hair, hands and closed book completely unchanged. No feet visible. Keep all pixel positions, crop, original pixel art style and scale. Change ONLY the existing coat and hat into the approved reference's black/dark purple costume, angular purple and silver edging, bright cyan neon circuit kanok ornament on coat, cyan glowing hat band and cyan front gemstone. Adapt ornament to target's existing rendering style. Absolutely preserve identity and pose. Keep original book; do NOT add sword or weapons. Keep all original pixels outside hat and coat unchanged. No text, no blood, no watermark. Transparent background remains truly transparent, RGB portrait background remains unchanged. Preserve exact original canvas and exact arrangement, no new characters.
```

## 3. walk

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET; image 2 is ONLY the approved costume reference. Output ONLY edited image 1. 768x256 RGBA sprite sheet, EXACT four columns by one row, 192x256 each. Preserve each original pose, face, red skin, horns, hair, hands, book, shoes, legs, feet contact positions and silhouette. Keep pixel art style. Four feet baselines approximately y245,249,245,249; don't move them. Change ONLY the existing coat and hat into the approved reference's black/dark purple costume, angular purple and silver edging, bright cyan neon circuit kanok ornament on coat, cyan glowing hat band and cyan front gemstone. Adapt ornament to target's existing rendering style. Absolutely preserve identity and pose. Keep original book; do NOT add sword or weapons. Keep all original pixels outside hat and coat unchanged. No text, no blood, no watermark. Transparent background remains truly transparent, RGB portrait background remains unchanged. Preserve exact original canvas and exact arrangement, no new characters.
```

## 4. walk4

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET; image 2 is ONLY the approved costume reference. Output ONLY edited image 1. 1254x1254 RGBA irregularly packed sprite atlas of EXACT 16 poses, 4 columns x 4 direction rows (front,left,right,back). Preserve every character pose, position, scale and silhouette. Preserve red faces, horns, hair, hands, book, legs and shoes exactly. Keep each row and column at exact original coordinates, no recentering and no grids or added borders. Change ONLY the existing coat and hat into the approved reference's black/dark purple costume, angular purple and silver edging, bright cyan neon circuit kanok ornament on coat, cyan glowing hat band and cyan front gemstone. Adapt ornament to target's existing rendering style. Absolutely preserve identity and pose. Keep original book; do NOT add sword or weapons. Keep all original pixels outside hat and coat unchanged. No text, no blood, no watermark. Transparent background remains truly transparent, RGB portrait background remains unchanged. Preserve exact original canvas and exact arrangement, no new characters.
```

## 5. idle

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET; image 2 is ONLY the approved costume reference. Output ONLY edited image 1. 1280x1920 RGBA sprite sheet EXACT 4 columns x 4 direction rows: front,left,right,back, cells 320x480. Only blinking changes between columns: retain open eye, open eye, CLOSED eyes, open eye. Preserve every original face and emotion, red skin, horns, hair, hands, closed book, poses, legs and shoes. Feet stay at original pixel positions, each cell baseline y440, head approx y132. Keep each sprite original height and position. Do not fill transparent margins. Change ONLY the existing coat and hat into the approved reference's black/dark purple costume, angular purple and silver edging, bright cyan neon circuit kanok ornament on coat, cyan glowing hat band and cyan front gemstone. Adapt ornament to target's existing rendering style. Absolutely preserve identity and pose. Keep original book; do NOT add sword or weapons. Keep all original pixels outside hat and coat unchanged. No text, no blood, no watermark. Transparent background remains truly transparent, RGB portrait background remains unchanged. Preserve exact original canvas and exact arrangement, no new characters.
```

## 6. bookwalk (รอบเต็ม sheet ไม่ใช้ในไฟล์สุดท้าย)

```text
Use case: precise-object-edit. Image 1 is the EDIT TARGET; image 2 is ONLY the approved costume reference. Output ONLY edited image 1. 2560x1920 RGBA sprite sheet EXACT 8 columns x 4 direction rows: front,left,right,back, cells 320x480. Preserve all 32 distinct original walking poses and each character face, red skin, horns, hair, hands, book, legs, shoes, position, scale, silhouette and feet coordinates. Original sprite height approx 320px in each 320x480 cell, feet approx y440. Keep transparent margins. Do not simplify or duplicate poses. Change ONLY the existing coat and hat into the approved reference's black/dark purple costume, angular purple and silver edging, bright cyan neon circuit kanok ornament on coat, cyan glowing hat band and cyan front gemstone. Adapt ornament to target's existing rendering style. Absolutely preserve identity and pose. Keep original book; do NOT add sword or weapons. Keep all original pixels outside hat and coat unchanged. No text, no blood, no watermark. Transparent background remains truly transparent, RGB portrait background remains unchanged. Preserve exact original canvas and exact arrangement, no new characters.
```

## 7. book-walk ส่วน 1

ภาพแนบที่ 1: crop จากต้นฉบับ `book-walk.webp` ที่ (0, 0) ขนาด 1280×960 ไม่เปลี่ยนรายละเอียดก่อนสร้าง

```text
Use case: precise-object-edit. Image 1 EDIT TARGET is a 1280x960 transparent sprite sheet, 4 columns x 2 rows, cells 320x480, EXACTLY EIGHT original walking poses. Image 2 is the approved COSTUME ONLY reference. Output only edited image 1, full 1280x960 canvas, keep all margins, preserve all 8 poses without rearranging. Change ONLY hat and long coat to approved black dark purple costume with angular purple/silver edging, bright cyan neon circuit lines and angular kanok circuit patterns on coat, cyan glowing hat band and cyan front gemstone. Sharp detailed pixel-art-like game illustration, crisp cyan circuit lines and edges, no blurring. Preserve original faces, red skin, horns, hair, expressions, closed books and hands, trousers, feet, legs, silhouette, pose, feet positions and character scale. Do not add sword. True transparent background, no text, no blood, no new objects. Sprite silhouettes and positions must stay pixel-perfect to image 1. First row faces front, second row faces left.
```

## 8. book-walk ส่วน 2

ภาพแนบที่ 1: crop จากต้นฉบับ `book-walk.webp` ที่ (1280, 0) ขนาด 1280×960 ไม่เปลี่ยนรายละเอียดก่อนสร้าง

```text
Use case: precise-object-edit. Image 1 EDIT TARGET is a 1280x960 transparent sprite sheet, 4 columns x 2 rows, cells 320x480, EXACTLY EIGHT original walking poses. Image 2 is the approved COSTUME ONLY reference. Output only edited image 1, full 1280x960 canvas, keep all margins, preserve all 8 poses without rearranging. Change ONLY hat and long coat to approved black dark purple costume with angular purple/silver edging, bright cyan neon circuit lines and angular kanok circuit patterns on coat, cyan glowing hat band and cyan front gemstone. Sharp detailed pixel-art-like game illustration, crisp cyan circuit lines and edges, no blurring. Preserve original faces, red skin, horns, hair, expressions, closed books and hands, trousers, feet, legs, silhouette, pose, feet positions and character scale. Do not add sword. True transparent background, no text, no blood, no new objects. Sprite silhouettes and positions must stay pixel-perfect to image 1. First row faces front, second row faces left.
```

## 9. book-walk ส่วน 3

ภาพแนบที่ 1: crop จากต้นฉบับ `book-walk.webp` ที่ (0, 960) ขนาด 1280×960 ไม่เปลี่ยนรายละเอียดก่อนสร้าง

```text
Use case: precise-object-edit. Image 1 EDIT TARGET is a 1280x960 transparent sprite sheet, 4 columns x 2 rows, cells 320x480, EXACTLY EIGHT original walking poses. Image 2 is the approved COSTUME ONLY reference. Output only edited image 1, full 1280x960 canvas, keep all margins, preserve all 8 poses without rearranging. Change ONLY hat and long coat to approved black dark purple costume with angular purple/silver edging, bright cyan neon circuit lines and angular kanok circuit patterns on coat, cyan glowing hat band and cyan front gemstone. Sharp detailed pixel-art-like game illustration, crisp cyan circuit lines and edges, no blurring. Preserve original faces, red skin, horns, hair, expressions, closed books and hands, trousers, feet, legs, silhouette, pose, feet positions and character scale. Do not add sword. True transparent background, no text, no blood, no new objects. Sprite silhouettes and positions must stay pixel-perfect to image 1. First row faces right, second row faces back.
```

## 10. book-walk ส่วน 4

ภาพแนบที่ 1: crop จากต้นฉบับ `book-walk.webp` ที่ (1280, 960) ขนาด 1280×960 ไม่เปลี่ยนรายละเอียดก่อนสร้าง

```text
Use case: precise-object-edit. Image 1 EDIT TARGET is a 1280x960 transparent sprite sheet, 4 columns x 2 rows, cells 320x480, EXACTLY EIGHT original walking poses. Image 2 is the approved COSTUME ONLY reference. Output only edited image 1, full 1280x960 canvas, keep all margins, preserve all 8 poses without rearranging. Change ONLY hat and long coat to approved black dark purple costume with angular purple/silver edging, bright cyan neon circuit lines and angular kanok circuit patterns on coat, cyan glowing hat band and cyan front gemstone. Sharp detailed pixel-art-like game illustration, crisp cyan circuit lines and edges, no blurring. Preserve original faces, red skin, horns, hair, expressions, closed books and hands, trousers, feet, legs, silhouette, pose, feet positions and character scale. Do not add sword. True transparent background, no text, no blood, no new objects. Sprite silhouettes and positions must stay pixel-perfect to image 1. First row faces right, second row faces back.
```
