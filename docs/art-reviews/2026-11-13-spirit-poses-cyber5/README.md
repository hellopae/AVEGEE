# ท่าวิญญาณ Cyberhell เพิ่ม 5 ภาพ

ชุดรีวิวประจำวันที่ 13 พฤศจิกายน 2569 จัดทำใน worktree ของ run นี้เมื่อ 14 พฤศจิกายน 2569 บน branch `codex/20261114T080932Z-99f18dda`

## สถานะส่งมอบ

มีไฟล์ครบ 5 ภาพ ขนาดผืนตรงต้นฉบับทุกภาพ เข้ารหัส WebP lossless RGBA แล้ว พร้อม contact sheet ชุดนี้ยังมีข้อค้างด้านภาพตามรายการด้านล่าง โดยเฉพาะมือของ elder-woman และความตรงของหางกับต้นฉบับทุกพิกเซล

| ไฟล์ | กว้าง×สูง พิกเซล | ไบต์ | เท่าของต้นฉบับ |
|---|---|---|---|
| business-cyberhell-scared-v1.webp | 1208×1302 | 852,086 | 1.112 |
| clerk-cyberhell-scared-v1.webp | 1254×1254 | 549,860 | 1.067 |
| elder-woman-cyberhell-scared-v1.webp | 1145×1374 | 640,646 | 1.112 |
| business-cyberhell-cry-v1.webp | 1208×1302 | 880,424 | 1.149 |
| clerk-cyberhell-cry-v1.webp | 1254×1254 | 561,646 | 1.090 |

[เปิด contact sheet](contact-sheet.png)

Contact sheet มี 2 คอลัมน์ ซ้ายเป็นต้นฉบับ ขวาเป็นภาพแก้ พื้นตารางใช้แสดงความโปร่งใส ภาพพรีวิวใน sheet ถูกย่อด้วย nearest-neighbour เฉพาะเพื่อจัดหน้า ไฟล์ WebP ทั้ง 5 คงขนาดที่ ImageGen ส่งมา

ลำดับแถวจากบนลงล่าง

1. business scared
2. clerk scared
3. elder-woman scared
4. business cry
5. clerk cry

## ต้นทางและวิธีสร้าง

ใช้ built-in ImageGen แบบ image edit แนบ `img/CyberHell/spirit-<ชนิด>-cyberhell-v2.webp` ทุกครั้ง ภาพ scared แนบ `img/soul-poses/worker-cyberhell-scared-v1.webp` เป็นตัวอย่างอารมณ์ ภาพ cry แนบ `img/soul-poses/officer-cyberhell-cry-v1.webp` และ business cry แนบ business-th/asia/west-cry ที่มีในรีโปเพิ่มด้วย

อ้างอิงสเปก Vera หัวข้อ 6 และตาราง “ที่ไม่ได้เสียบ 5 ภาพ” ของ Toby จากเส้นทางที่ระบุใน brief คำสั่งล่าสุดของผู้ใช้ยอมรับ business cry ที่ยิ้มทั้งน้ำตา จึงใช้แนวอารมณ์นั้น

ใช้ ImageGen รวม **7 ครั้ง** จากงบ 12 ครั้ง เริ่มต้น 5 ครั้ง และ retry รวม 2 ครั้งให้ elder-woman โดยตีความเพดาน retry เป็นยอดรวมของงาน

| ครั้ง | งาน | ผลที่วัดได้ | การเลือก |
|---|---|---|---|
| 1 | business scared | 1208×1302 | ส่งในชุดรีวิว |
| 2 | clerk scared | 1254×1254 | ส่งในชุดรีวิว |
| 3 | elder-woman scared | 1145×1374 แต่มือหนึ่งข้างยกออกจากผ้า | ส่งในชุดรีวิวพร้อมข้อค้าง |
| 4 | business cry | 1208×1302 | ส่งในชุดรีวิว |
| 5 | clerk cry | 1254×1254 | ส่งในชุดรีวิว |
| 6 | elder-woman retry 1 | 1083×1453 จับผ้าสองมือ | ตัดออกจากชุดส่งมอบเพราะขนาดผิด |
| 7 | elder-woman retry 2 | 1083×1453 จับผ้าสองมือ | ตัดออกจากชุดส่งมอบเพราะขนาดผิด |

แปลง PNG ที่เลือกเป็น WebP ด้วย Pillow โดยใช้ `lossless=True, exact=True, method=6` ตรวจขนาดก่อนเข้ารหัส และเทียบพิกเซล RGBA หลังถอดรหัสกับ PNG ที่ ImageGen สร้าง

## ผลตรวจไฟล์ที่รันจริง

ตรวจด้วย Python และ Pillow ครบทั้ง 5 ไฟล์

- ชื่อไฟล์ที่ขอครบ 5/5
- ขนาดตรงไฟล์ต้นฉบับ 5/5
- โหมด RGBA 5/5
- มุมทั้ง 4 มี alpha เท่ากับ 0 ครบ 5/5
- อ่านโครงสร้าง RIFF/WebP พบ chunk `VP8L` ครบ 5/5
- พิกเซล RGBA หลังถอดรหัส WebP เท่ากับ PNG ที่เลือกทุกพิกเซล 5/5
- น้ำหนักไฟล์อยู่ที่ 1.067–1.149 เท่าของต้นฉบับ อยู่ภายในเป้าหมาย 1.5 เท่า
- เปิดดู contact sheet แล้ว ทั้ง scared และ cry มีสีหน้าตามท่าที่ขอ ม่านตาของ clerk ยังปรากฏทั้งสองภาพ และ clerk cry ยกมือข้างว่างปาดน้ำตา
- ดูภาพแล้วพบแถบสีบนป้ายเดิมของชุด โดยไม่มีข้อความหรือตัวเลขที่อ่านได้ในภาพ

การตรวจนี้ครอบคลุมไฟล์อาร์ตในโฟลเดอร์รีวิว ยังไม่มีผลทดสอบในเกมสำหรับชุดนี้

## ข้อค้างจากการเทียบภาพกับสเปก

- **elder-woman scared** ภาพที่ขนาดถูกต้องยกมือหนึ่งข้างไปแตะอก เหลืออีกมือจับผ้าเช็ดหน้า จึงยังขาดเงื่อนไขจับผ้าทั้งสองมือ retry ทั้งสองครั้งแก้มือได้แต่ขนาดผิด การเลือกครั้งที่ 3 ทำเพื่อเก็บไฟล์ตรงขนาดตาม check ใน brief
- **หางและส่วนที่ควรล็อก** ImageGen วาดรายละเอียดใหม่บางส่วน การเปรียบเทียบ RGBA ในพื้นที่ล่าง 20% พบพิกเซลต่างจากต้นฉบับทุกภาพ ดังนั้นเงื่อนไขคงหางทุกพิกเซลยังค้าง
- **business scared และ cry** ขอบขวาของตัวละครเลื่อนเข้าเพราะเปลี่ยนท่าแขน หากตีความเกณฑ์ bounding box ด้วยขอบทุกด้าน ขอบขวาเปลี่ยน 107 และ 82 พิกเซลตามลำดับ เกิน 4% ของความกว้างผืนที่ 48.32 พิกเซล
- **ขอบว่าง business** เมื่อวัดตัวละครที่ alpha ≥128 ภาพ scared มีขอบบน 27 และล่าง 25 พิกเซล ภาพ cry มีขอบบน 25 และล่าง 18 พิกเซล จึงยังต่ำกว่าเป้าขอบว่าง 4% ทุกด้าน
- **แสงและสี** business cry และ clerk cry มีแสงขอบสีอุ่นเพิ่มจากต้นฉบับ รายละเอียดเส้นและสีที่ ImageGen วาดใหม่ยังมีความต่าง ม่านตา clerk คงลักษณะสีเทาอมฟ้าเมื่อดูด้วยตา แต่ยังขาดการยืนยันว่าสีตรงทุกพิกเซล

| ภาพ | bbox ต้นฉบับที่ alpha ≥128 | bbox ภาพแก้ที่ alpha ≥128 | จำนวนพิกเซล RGBA ที่ต่างในพื้นที่ล่าง 20% |
|---|---|---|---|
| business scared | 93,25,1130,1284 | 124,27,1023,1277 | 89,418 |
| clerk scared | 342,7,935,1247 | 338,8,922,1245 | 74,107 |
| elder-woman scared | 299,48,891,1327 | 284,48,877,1329 | 72,068 |
| business cry | 93,25,1130,1284 | 104,25,1048,1284 | 91,115 |
| clerk cry | 342,7,935,1247 | 342,7,923,1247 | 68,572 |

bbox ใช้พิกัดซ้าย บน ขวา ล่าง โดยขวาและล่างเป็นขอบ exclusive ใช้ threshold alpha ≥128 เพื่อตรวจขอบที่มองเห็นแยกจากพิกเซล alpha ต่ำ

## ตรวจเทียบ acceptance criteria

| เงื่อนไข | หลักฐานและสถานะ |
|---|---|
| ภาพครบ 5 ชื่อตาม brief | มีครบในโฟลเดอร์นี้ |
| business 1208×1302, elder-woman 1145×1374, clerk เท่าต้นฉบับ | วัดจากไฟล์ที่ส่งแล้วตรงทั้ง 5 ภาพ clerk คือ 1254×1254 |
| ห้ามย่อหรือขยายไฟล์ภาพส่งมอบ | PNG ที่เลือกและ WebP ขนาดเท่ากัน พิกเซลหลังถอดรหัสเท่ากัน |
| WebP lossless RGBA และโปร่งใส | ตรวจ VP8L, RGBA และ alpha มุมครบ |
| แก้จากต้นฉบับ Cyberhell | แนบต้นฉบับทุกครั้ง รายการ prompt อยู่ท้าย README |
| บรรทัดแรกของทุก prompt ระบุขนาด | เก็บ prompt ที่ใช้ทั้ง 7 ครั้งด้านล่าง |
| ห้ามตัวอักษร | ตรวจดูภาพและ contact sheet แล้ว ไม่มีข้อความที่อ่านได้ |
| clerk คงม่านตา และ cry ยกมือขวาปาดน้ำตา | เห็นม่านตาและมือปาดน้ำตาในภาพ ข้อค้างเรื่องค่าสีทุกพิกเซลระบุข้างต้น |
| cry ซึ้งที่รู้ความจริง อ่อนโยน business ยิ้มทั้งน้ำตาได้ | ตรวจดูภาพแล้วเป็นน้ำตาคู่สีหน้าอ่อนโยน |
| คงชุด ของถือ หางและกรอบตามสเปก | ยังมีข้อค้างด้านมือ elder-woman หาง ขอบ business และแสงอุ่นตามรายการข้างต้น |
| งบ ≤12 และ retry ≤2 | เรียก 7 ครั้ง รวม retry 2 ครั้ง |
| contact sheet และ README ไทย | มีทั้งสองไฟล์ |
| ทำงานใน worktree/branch ที่ให้และแก้เฉพาะ brief | ไฟล์ส่งมอบอยู่ใต้โฟลเดอร์รีวิวนี้ |

## Prompt ที่ใช้จริง

แต่ละบล็อกด้านล่างเป็นข้อความที่ส่งให้ built-in ImageGen โดยตรง ตั้งค่า `transparent_background=true` ทุกครั้ง รายการภาพแนบเรียงตามลำดับที่ระบุ

### ครั้งที่ 1 business-cyberhell-scared-v1

ภาพแนบ

- `img/CyberHell/spirit-business-cyberhell-v2.webp`
- `img/soul-poses/worker-cyberhell-scared-v1.webp`

```text
Output canvas MUST be EXACTLY 1208×1302 pixels (1208x1302), same as attached edit target. Do not resize, crop, pad, or recompose.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: startled and caught out. Eyebrows raised high with inner ends up, eyes wide open,
mouth open in a small round "o", two or three small pale-blue sweat drops at the temple,
face slightly paler. Body leaning back about 5 degrees, shoulders lifted. The free hand
rises to the chest in a flinch. Expression is shock at being exposed, not screaming and not
anger. Remove any smirk or smile from the reference.

Reference to edit: img/CyberHell/spirit-business-cyberhell-v2.webp
Expression style references only: img/soul-poses/worker-cyberhell-scared-v1.webp
Output asset: business-cyberhell-scared-v1.webp, lossless WebP RGBA.
Character-specific note: Fat man with a sly sideways smirk, one hand on suit lapel, other wrist with gold watch and ring. REMOVE the smirk entirely. Keep watch and ring unchanged. Do not recompose, do not enlarge the figure, keep >= 4 percent empty margin at every edge. Second image is expression reference only. Keep ALL identity, costume, props, tail and rendering from first image.
```

### ครั้งที่ 2 clerk-cyberhell-scared-v1

ภาพแนบ

- `img/CyberHell/spirit-clerk-cyberhell-v2.webp`
- `img/soul-poses/worker-cyberhell-scared-v1.webp`

```text
Output canvas MUST be EXACTLY 1254×1254 pixels (1254x1254), same as attached edit target. Do not resize, crop, pad, or recompose.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: startled and caught out. Eyebrows raised high with inner ends up, eyes wide open,
mouth open in a small round "o", two or three small pale-blue sweat drops at the temple,
face slightly paler. Body leaning back about 5 degrees, shoulders lifted. The free hand
rises to the chest in a flinch. Expression is shock at being exposed, not screaming and not
anger. Remove any smirk or smile from the reference.

Reference to edit: img/CyberHell/spirit-clerk-cyberhell-v2.webp
Expression style references only: img/soul-poses/worker-cyberhell-scared-v1.webp
Output asset: clerk-cyberhell-scared-v1.webp, lossless WebP RGBA.
Character-specific note: KEEP the original irises and eye colour exactly, do not turn the eyes white. Bun hair, neck badge, glowing folder held to the chest in the original holding hand (called left hand in brief), right free hand rises to the chest. Wide eyes, small round open mouth, sweat drops. Second image is expression reference only, do not copy its blank white eyes.
```

### ครั้งที่ 3 elder-woman-cyberhell-scared-v1

ภาพแนบ

- `img/CyberHell/spirit-elder-woman-cyberhell-v2.webp`
- `img/soul-poses/worker-cyberhell-scared-v1.webp`

```text
Output canvas MUST be EXACTLY 1145×1374 pixels (1145x1374), same as attached edit target. Do not resize, crop, pad, or recompose.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: startled and caught out. Eyebrows raised high with inner ends up, eyes wide open,
mouth open in a small round "o", two or three small pale-blue sweat drops at the temple,
face slightly paler. Body leaning back about 5 degrees, shoulders lifted. The free hand
rises to the chest in a flinch. Expression is shock at being exposed, not screaming and not
anger. Remove any smirk or smile from the reference.

Reference to edit: img/CyberHell/spirit-elder-woman-cyberhell-v2.webp
Expression style references only: img/soul-poses/worker-cyberhell-scared-v1.webp
Output asset: elder-woman-cyberhell-scared-v1.webp, lossless WebP RGBA.
Character-specific note: Handkerchief held in both hands stays exactly in place, eyes wide keeping the original blue irises, mouth open, sweat drops. Second image is expression reference only.
```

### ครั้งที่ 4 business-cyberhell-cry-v1

ภาพแนบ

- `img/CyberHell/spirit-business-cyberhell-v2.webp`
- `img/soul-poses/officer-cyberhell-cry-v1.webp`
- `img/soul-poses/business-th-cry-v1.webp`
- `img/soul-poses/business-asia-cry-v1.webp`
- `img/soul-poses/business-west-cry-v1.webp`

```text
Output canvas MUST be EXACTLY 1208×1302 pixels (1208x1302), same as attached edit target. Do not resize, crop, pad, or recompose.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: quietly weeping with relief that someone finally listened, moved by learning the truth.
Eyebrows with inner ends raised and drawn together, eyes half closed and glistening,
two streams of pale white-blue tears running down both cheeks with small highlights,
one or two drops falling, mouth slightly parted like a sigh. Head bowed about 6 degrees,
shoulders dropped. The free hand may lift to wipe a tear.
Dignified, respectful and gentle, quietly moved, no wailing or cruelty.

Reference to edit: img/CyberHell/spirit-business-cyberhell-v2.webp
Expression style references only: img/soul-poses/officer-cyberhell-cry-v1.webp, img/soul-poses/business-th-cry-v1.webp, img/soul-poses/business-asia-cry-v1.webp, img/soul-poses/business-west-cry-v1.webp
Output asset: business-cyberhell-cry-v1.webp, lossless WebP RGBA.
Character-specific note: Fat man, one hand on suit lapel, gold watch and ring remain unchanged. Do not recompose or enlarge figure, keep >= 4 percent empty margin at every edge. Reference images 2-5 show only gentle relieved crying expression. User accepts a gentle smile through tears like the business TH/Asia/West references, if needed. The emotion is moved by truth, tender and relieved. Preserve the first reference's Cyberhell suit, purple trim, identity, white eyes, tail and framing.
```

### ครั้งที่ 5 clerk-cyberhell-cry-v1

ภาพแนบ

- `img/CyberHell/spirit-clerk-cyberhell-v2.webp`
- `img/soul-poses/officer-cyberhell-cry-v1.webp`

```text
Output canvas MUST be EXACTLY 1254×1254 pixels (1254x1254), same as attached edit target. Do not resize, crop, pad, or recompose.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: quietly weeping with relief that someone finally listened, moved by learning the truth.
Eyebrows with inner ends raised and drawn together, eyes half closed and glistening,
two streams of pale white-blue tears running down both cheeks with small highlights,
one or two drops falling, mouth slightly parted like a sigh. Head bowed about 6 degrees,
shoulders dropped. The free hand may lift to wipe a tear.
Dignified, respectful and gentle, quietly moved, no wailing or cruelty.

Reference to edit: img/CyberHell/spirit-clerk-cyberhell-v2.webp
Expression style references only: img/soul-poses/officer-cyberhell-cry-v1.webp
Output asset: clerk-cyberhell-cry-v1.webp, lossless WebP RGBA.
Character-specific note: KEEP original irises and eye colour exactly, do not turn eyes blank white. Two streams of tears, raise the right free hand to wipe tears at cheek. Glowing folder remains held to chest in the original left holding hand and position. Keep bun hair, neck badge, all costume unchanged. Second image is gentle crying expression reference only, do not copy blank white eyes.
```

### ครั้งที่ 6 elder-woman retry 1

ภาพแนบ

- `img/CyberHell/spirit-elder-woman-cyberhell-v2.webp`
- `img/soul-poses/worker-cyberhell-scared-v1.webp`

```text
Output canvas MUST be EXACTLY 1145×1374 pixels (1145x1374), same as attached edit target. Do not resize, crop, pad, or recompose.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: startled and caught out. Eyebrows raised high with inner ends up, eyes wide open,
mouth open in a small round "o", two or three small pale-blue sweat drops at the temple,
face slightly paler. Body leaning back about 5 degrees, shoulders lifted. The free hand
rises to the chest in a flinch. Expression is shock at being exposed, not screaming and not
anger. Remove any smirk or smile from the reference.

Reference to edit: img/CyberHell/spirit-elder-woman-cyberhell-v2.webp
Expression style references only: img/soul-poses/worker-cyberhell-scared-v1.webp
Output asset: elder-woman-cyberhell-scared-v1.webp, lossless WebP RGBA.
Character-specific note: Handkerchief held in both hands stays exactly in place, eyes wide keeping the original blue irises, mouth open, sweat drops. Second image is expression reference only.
CRITICAL FINAL OVERRIDE FOR THIS EDIT: This elderly woman has NO free hand. BOTH hands must remain clasped on the same handkerchief, identical to image 1. Do not raise either hand to chest or release the cloth. Edit ONLY eyebrows, eyes, mouth, and 2-3 small temple sweat drops. Preserve every pixel of the body, BOTH hands, cloth, outfit, original cool blue-purple colours, hair and lower ghost tail as closely as possible. Keep tail tip at the ORIGINAL coordinate and same silhouette and scale. Preserve original canvas 1145x1374 exactly, transparent corners, no new warm orange lighting. Image 2 is facial emotion reference ONLY.
```

### ครั้งที่ 7 elder-woman retry 2

ภาพแนบ

- `img/CyberHell/spirit-elder-woman-cyberhell-v2.webp`

```text
Output canvas MUST be EXACTLY 1145×1374 pixels (1145x1374), identical to the attached original image. Preserve that exact canvas and aspect ratio.
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim

EDIT the first attached reference image of a standing ghost. The first reference image overrides
the COLOR THEME and the "square canvas" above: output canvas = EXACT same pixel width and
height as the first reference, same palette, same outline weight, same pixel density.
Keep EXACTLY as in the first reference: the character's identity, hair, outfit, every prop and its
colors, the lower ghost tail (same shape and same position of the tail tip), the overall
silhouette position. Move the figure no more than 4 percent of the canvas width.
Change ONLY: facial expression, head tilt (max 6 degrees), and the pose of the free hand
(the hand that is not holding a prop). A held prop stays in the same hand and place.
If the reference character has blank white eyes or white glasses lenses, keep them blank
white and express emotion with eyebrows, mouth, sweat or tears at the eye edge.
Fully transparent background, no ground shadow.
Forbidden: any text, letters, numbers, speech bubbles, emote symbols, motion lines, extra
effects, blood, gore, suggestive posing, a second character, costume changes.

POSE: startled and caught out. Edit the face ONLY: raised inner eyebrows, wide eyes retaining original blue irises, a small round open mouth, 2 or 3 small pale blue sweat drops on temple. Remove no clothing or accessories.

Reference to edit: img/CyberHell/spirit-elder-woman-cyberhell-v2.webp
Output asset: elder-woman-cyberhell-scared-v1.webp (lossless WebP RGBA).
Character-specific override: BOTH hands are holding a handkerchief and MUST keep holding it in exactly the original position, both hands together. There is NO free hand. Keep original body and head scale, tail shape and tail-tip coordinates, hair, jewellery, purple-cyan costume and cool colours. Facial expression edit only. No warm orange rim light.
Exact required output dimensions are 1145 pixels wide by 1374 pixels high. Do not deliver 1083x1453 or another canvas. Do not enlarge, resize, crop, pad or recompose the character.
```

## คำสั่งตรวจไฟล์ซ้ำ

รันจากราก worktree คำสั่งนี้อ่านไฟล์และตรวจเงื่อนไขเชิงไฟล์

```bash
python3 - <<'PY'
from pathlib import Path
from PIL import Image
import struct

folder = Path('docs/art-reviews/2026-11-13-spirit-poses-cyber5')
expected = {
    'business-cyberhell-scared-v1.webp': 'business',
    'clerk-cyberhell-scared-v1.webp': 'clerk',
    'elder-woman-cyberhell-scared-v1.webp': 'elder-woman',
    'business-cyberhell-cry-v1.webp': 'business',
    'clerk-cyberhell-cry-v1.webp': 'clerk',
}
assert {p.name for p in folder.glob('*.webp')} == set(expected)

for name, kind in expected.items():
    path = folder / name
    original = Path('img/CyberHell') / f'spirit-{kind}-cyberhell-v2.webp'
    image = Image.open(path)
    assert image.size == Image.open(original).size
    assert image.mode == 'RGBA'
    width, height = image.size
    corners = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    assert all(image.getpixel(point)[3] == 0 for point in corners)
    data = path.read_bytes()
    assert data[:4] == b'RIFF' and data[8:12] == b'WEBP'
    position = 12
    chunks = []
    while position + 8 <= len(data):
        chunks.append(data[position:position + 4])
        length = struct.unpack_from('<I', data, position + 4)[0]
        position += 8 + length + length % 2
    assert b'VP8L' in chunks and b'VP8 ' not in chunks
    assert path.stat().st_size <= original.stat().st_size * 1.5
    print(name, image.size, image.mode, 'VP8L', path.stat().st_size)

assert Image.open(folder / 'contact-sheet.png').size == (680, 1850)
print('ตรวจเงื่อนไขเชิงไฟล์ครบ 5 ภาพ')
PY
```

การเทียบพิกเซลกับ PNG ที่ ImageGen ส่งมาได้รันเพิ่มตอนเข้ารหัส ผลเป็นตรงกันทุกพิกเซลทั้ง 5 ภาพ PNG ต้นทางอยู่ในพื้นที่เก็บผลของ ImageGen ตามค่าเริ่มต้นของเครื่องมือ


