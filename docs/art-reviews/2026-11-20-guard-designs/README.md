# E4 — แบบ Guard ใหม่ 3 ตัว รอคุณเป้อนุมัติ · 20 พ.ย. 2569

ส่งภาพแบบเดี่ยว 3 ภาพ และภาพเทียบยามา 3 ภาพ รวม 6 ไฟล์ WebP ขนาด **1024×1536 พิกเซลต่อภาพ** ทุกภาพเป็นภาพนิ่งเต็มตัว มุม 3/4 หันขวา พื้นหลังเทาเข้มเรียบ ไม่มีป้ายข้อความในภาพ ภาพเทียบวาง **Guard ซ้าย | ยามาขวา** และเท้าอยู่บนแนวเดียวกัน

## ไฟล์ส่งมอบ

| โซน / ตัวละคร | แบบหลัก | เทียบความสูงกับยามา |
| --- | --- | --- |
| 2 · asia · กวนอู | [guard-guanyu-asia-v1.webp](guard-guanyu-asia-v1.webp) | [guard-guanyu-asia-v1-with-yama.webp](guard-guanyu-asia-v1-with-yama.webp) |
| 3 · west · แวน เฮลซิง | [guard-vanhelsing-west-v1.webp](guard-vanhelsing-west-v1.webp) | [guard-vanhelsing-west-v1-with-yama.webp](guard-vanhelsing-west-v1-with-yama.webp) |
| 4 · cyberhell · WATSON-03 | [guard-watson03-cyberhell-v1.webp](guard-watson03-cyberhell-v1.webp) | [guard-watson03-cyberhell-v1-with-yama.webp](guard-watson03-cyberhell-v1-with-yama.webp) |

## แนวคิด

- **กวนอู:** ร่างใหญ่ในสัดส่วน chibi หน้าแดงเข้ม ตาเรียวนิ่ง เคราดำยาวถึงอก เกราะกับเสื้อคลุมเขียวเข้มประดับมังกร ถือง้าวมังกรเขียวใบจันทร์เสี้ยวตั้งตรง ใช้บุคลิกสงบสง่าและองค์ประกอบตามภาพกวนอูในศิลปะจีนด้วยความเคารพ ไม่ทำท่าตลก ไม่อ้างแบบเกมหรือการ์ตูน
- **แวน เฮลซิง:** แพทย์ผู้เฒ่าผมหงอก หนวดตัดเป็นทรง สีหน้าเคร่งละเอียด ไหล่ตกเล็กน้อย เสื้อคลุมเทาเข้ม มือซ้ายถือตะเกียงขาวเย็น กระเป๋าหนังเก่า ซองไม้แหลมสั้น และขี้ผึ้งที่เผยเนื้อออกจากผ้าห่อเก่าห้อยแยกกันที่เข็มขัด ตะเกียงใช้ซี่แนวตั้ง ไม่มีไม้กางเขนหรือเครื่องหมายศาสนา ไม่อ้างฉบับภาพยนตร์
- **WATSON-03:** หุ่นเงินเทาร่างเพรียว หัวใหญ่แบบทีม ดวงตาคู่เป็นเลนส์วงซ้อนสองชั้น ยืนตรงแต่หัวไหล่ผ่อน แขนซ้ายรองแผ่นบันทึกบางพร้อมเส้นแสงไซแอนลอยขึ้น ไม่มีข้อความ หมวกนักสืบ หรือไปป์ ใช้ม่วง–ไซแอนและขอบโลหะให้เข้าชุดยามาโซน 4 ที่อนุมัติแล้ว

ยึดหัวใหญ่ ลำตัวกระชับ เส้นขอบเข้ม และกลุ่มเงาที่อ่านง่ายจากทีมเดิม ภาพรอบนี้เป็นภาพแนวคิด chibi สำหรับอนุมัติ รายละเอียดพื้นผิวละเอียดกว่าสไปรต์ขนาดใช้งานจริง ยังไม่ใช่ pixel sprite พร้อมลงเกม

## ต้นแบบและวิธีสร้าง

ใช้ **ImageGen ในตัวเท่านั้น 6 ครั้ง**: ภาพเดี่ยวและภาพเทียบอย่างละหนึ่งครั้งต่อตัว ไม่มีภาพคัดทิ้งหรือการสร้างเพิ่มเติม ใช้เวลาทำงานน้อยกว่าเพดาน 25 นาที

แนบสองไฟล์นี้ทุกครั้ง โดยระบุให้ดูเซลล์แรก:

1. [Guard ไทย](../../../img/crew-combat-v1/th/guard.webp) — สัดส่วน Guard และรูปแบบเส้น/เงาของทีม
2. [ยามาถือดาบไทย](../../../img/yama-animation-v1/th/sword-idle.webp) — อัตราหัวต่อตัว และตัวเทียบมาตรฐานในภาพกวนอู/แวน เฮลซิง

WATSON-03 ทั้งสองภาพแนบ [ชุดยามาโซน 4 ที่อนุมัติแล้ว](../2026-11-20-design-approval/yama-cyberhell-costume-v1.webp) เพิ่มเติม ภาพเทียบทั้งสามแนบแบบเดี่ยวที่เพิ่งสร้างเพิ่มด้วย เพื่อรักษาตัวละครและอุปกรณ์

ใช้ Pillow เฉพาะแปลง PNG จาก ImageGen เป็น WebP แบบ lossless ไม่วาดเพิ่ม ไม่ครอป ไม่ปรับขนาด ไม่ใช้ Shado หรือ API ภายนอก คำสั่งที่ใช้จริงทั้ง 6 ครั้งอยู่ท้ายไฟล์นี้

## ผลตรวจและขอบเขต

- เปิดอ่าน WebP ที่ส่งมอบครบ 6 ไฟล์ด้วย Pillow: ขนาด 1024×1536, ภาพละ 1 เฟรม และพิกเซล RGBA ที่ถอดรหัสตรงกับ PNG ต้นทางทุกไฟล์
- เปิดดูไฟล์ WebP ที่บันทึกจริงครบ 6 ภาพ: เห็นตัวเต็มและอุปกรณ์ ไม่พบตัวอักษรอ่านได้ เลือด หรือสัญลักษณ์ศาสนาจากการดูภาพ ไม่ได้ตรวจด้วย OCR
- ภาพเทียบใช้การวาดซ้ำผ่าน ImageGen จึงมีรายละเอียดและสัดส่วนคลาดเคลื่อนเล็กน้อย ให้ยึดภาพเดี่ยวเป็นแบบหลัก ภาพเทียบใช้พิจารณาความสูงโดยประมาณ ยังไม่ใช่แผ่นกำหนดขนาดสำหรับ rig
- ตรวจขอบเขต Git ให้มีเพียงโฟลเดอร์ส่งมอบนี้ ไม่แก้ `src/`, `tests/`, hooks, `status.json` หรือ `worklog.json` และใช้ worktree/branch เดิม
- ไม่รันชุดทดสอบแอป เพราะเป็นงานภาพและเอกสารล้วน ผลข้างต้นเป็นการตรวจไฟล์และดูภาพ ไม่ใช่การอนุมัติงานศิลป์

## ตรวจตามเกณฑ์รับงาน

1. **3 แบบพร้อมภาพเทียบ:** ครบ 3 คู่ ขนาดตามกำหนด ไม่มีตัวอักษรที่พบจากการดูภาพ
2. **สไตล์ทีมและไม่มีสัญลักษณ์ศาสนา:** ใช้ต้นแบบทีมทุกครั้ง คงหัวใหญ่และเส้นขอบเข้ม ไม่พบเครื่องหมายศาสนาจากการดูภาพ ทั้งนี้ความเข้าชุดขั้นสุดท้ายรอคุณเป้พิจารณา
3. **README ภาษาไทย:** มีแนวคิด ต้นแบบ รายการไฟล์ วิธีสร้าง ผลตรวจ และข้อจำกัดในไฟล์นี้

**สถานะ: รอคุณเป้อนุมัติทั้งสามตัว** ไฟล์ตามรายการรอบนี้ครบแล้ว งานถัดไปหลังอนุมัติคือ sprite ต่อสู้ ท่านอนสลบ cutscene และปรับภาพรวมพลกองหนุนให้ใช้ตัวละครใหม่ ยังไม่ได้วาดงานเหล่านั้นหรือเปลี่ยนภาพที่เกมใช้อยู่ และไม่ได้ commit, push, merge หรือ deploy

## คำสั่ง ImageGen ที่ใช้จริง

คำสั่งภาษาอังกฤษต่อไปนี้เป็นบันทึกเพื่อทำซ้ำ ไม่ใช่ข้อความในภาพ อาร์กิวเมนต์ทุกครั้งกำหนด `transparent_background: false`

### 1 · กวนอู — แบบเดี่ยว

ไฟล์แนบตามลำดับ: `img/crew-combat-v1/th/guard.webp`, `img/yama-animation-v1/th/sword-idle.webp`

```text
Use case: stylized-concept. Create one original character approval illustration for AVEGEE, portrait exactly 1024x1536.
Attached reference 1: use ONLY its first top-left cell for Guard's broad chibi proportions and outlined pixel-art game-team style, NOT its identity. Reference 2: use first Yama frame for large head/body ratio and rendering language.
Subject: Guan Yu as the respectful classical Chinese art figure, a tall broad powerful man in chibi proportions, deep red face, calm narrow eyes, long straight black beard reaching almost his chest. Dark forest-green armor and long dark green cloak with restrained Chinese dragon ornamentation. Holds an upright long-shaft Green Dragon crescent-bladed guandao, entire weapon visible. Dignified quiet stance, no comedy, no grin, no action pose.
Full body head to boots and entire upright weapon, three-quarter view facing screen RIGHT. Single character centered, generous margin above weapon and below feet. Plain uniform dark charcoal gray background. Match thick clean dark outlines, big expressive head, short sturdy limbs, compact readable costume shapes, pixel-art-like clustered shading from references; no realistic human proportions, no smooth 3D render.
Respectful depiction of Guan Yu; original design based on traditional art, no copied game/cartoon design. No religious icons or devotional symbols, no halos, no cross motifs, no text, no letters, no numbers, no labels, no watermark, no blood. This is a single approval concept illustration, NOT a sprite sheet.
```

### 2 · กวนอู — ภาพเทียบ

ไฟล์แนบตามลำดับ: `docs/art-reviews/2026-11-20-guard-designs/guard-guanyu-asia-v1.webp`, `img/crew-combat-v1/th/guard.webp`, `img/yama-animation-v1/th/sword-idle.webp`

```text
Use case: stylized-concept. Character HEIGHT COMPARISON approval plate for AVEGEE, exactly 1024x1536 portrait.
Attached image 1: Guan Yu design EDIT TARGET, preserve his face, black chest-length beard, dark green dragon armor and cloak, upright crescent Green Dragon guandao, colors, original respectful quiet dignity.
Attached image 2: Guard sprite sheet first top-left cell is STYLE/proportions only.
Attached image 3: Yama sprite sheet FIRST FRAME is Yama IDENTITY, face, red skin, two small red horns, gold Thai crown, black/red/gold costume, golden sword, large chibi head and bare red feet.
Compose exactly TWO characters side by side: Guan Yu on LEFT and Yama on RIGHT, both complete full bodies three-quarter facing screen RIGHT, feet touching the same horizontal baseline. Guan Yu body from sole to cap top about 1.18x Yama sole-to-crown height; guandao taller than both, entirely visible. Preserve Guan Yu's approved design as closely as possible while scaling him to fit. Yama must be faithfully redrawn from the first frame, no new costume, no added props, no duplicate poses. No dividers or labels.
Match outlined chibi game-team illustration style and clustered shading from original sprite references, big heads and compact limbs, dark outlines. Uniform plain dark charcoal gray background. Center the pair with room around weapon. No text, letters, digits, numbers, logos, watermark, blood, religious symbols, crosses, halos. This is a static concept approval plate, not a combat sprite sheet.
```

### 3 · แวน เฮลซิง — แบบเดี่ยว

ไฟล์แนบตามลำดับ: `img/crew-combat-v1/th/guard.webp`, `img/yama-animation-v1/th/sword-idle.webp`

```text
Use case: stylized-concept. One original AVEGEE character approval illustration, exactly 1024x1536 portrait.
Input reference 1: use ONLY first top-left Guard cell for compact chibi proportions, strong dark outlines and game-team rendering. Do not copy its monster identity. Input reference 2: first Yama frame for big head/body ratio. Match that team.
Subject: Abraham Van Helsing as an elderly scholarly physician from the original literary concept, original design, NOT any film depiction. Elderly man with silver gray hair, neatly trimmed gray mustache, small observant detailed eyes, solemn unsmiling expression. Tall within CHIBI proportions, large head, short readable limbs, modest slight shoulder droop, standing upright. Long dark charcoal-gray physician's coat, plain dark waistcoat and trousers, old dark brown leather boots. NO HAT.
His anatomical LEFT hand holds an old metal lantern visibly lit with cold white light; pose the left arm slightly forward so hand and lantern are readable near the viewer's RIGHT side. His other hand rests relaxed.
At the waist: one worn brown leather medical bag; a separate narrow leather sheath carrying several SHORT pointed wooden stakes, no crosspiece; a small irregular pale beige lump of wax partially wrapped in frayed old cloth hangs separately from belt, wax clearly visible. These three belt details must be distinguishable.
Full body including boots and lantern, three-quarter view facing screen RIGHT, centered, generous margins. Uniform plain dark charcoal gray background.
Hand-drawn outlined CHIBI game concept art with pixel-art-inspired clustered shading and compact readable shapes matching supplied team references, no realistic proportions, no photorealism or smooth 3D render.
No crosses, crucifixes or ANY religious symbols anywhere including lantern and clothing. No cross-shaped window bars on lantern: vertical bars only. No film costume, no vampire hunter action pose, no guns, no huge weapons. No blood, text, letters, digits, writing, logos or watermarks. NOT a sprite sheet.
```

### 4 · แวน เฮลซิง — ภาพเทียบ

ไฟล์แนบตามลำดับ: `docs/art-reviews/2026-11-20-guard-designs/guard-vanhelsing-west-v1.webp`, `img/crew-combat-v1/th/guard.webp`, `img/yama-animation-v1/th/sword-idle.webp`

```text
Use case: stylized-concept. AVEGEE HEIGHT COMPARISON approval plate, exactly 1024x1536 portrait.
Input image 1: EDIT TARGET Van Helsing approved concept. Keep exactly the elderly physician identity, silver-gray hair, neat mustache, careful eyes, unsmiling face, long dark-gray coat, slightly dropped shoulders, worn medical bag, leather sheath of short pointed stakes, wax lump partly wrapped in frayed cloth, and cold-white lantern held in his anatomical LEFT hand (towards viewer's RIGHT). Preserve his colors and costume design.
Input image 2: first top-left Guard cell, team chibi style and compact proportions only.
Input image 3: Yama identity from FIRST FRAME only. Faithful red skin, black hair, two little red horns, pointed ears, golden Thai crown, black/red/gold robe, golden sword held as shown, bare red feet. No new costume.
Exactly TWO complete full-body characters: Van Helsing on LEFT, Yama on RIGHT; both three-quarter facing screen RIGHT; feet on the SAME horizontal baseline. Van Helsing sole-to-hair height approximately 1.2x Yama sole-to-crown height, large chibi heads and short readable limbs. Keep a gap so lantern and sword do not overlap faces. Entire boots, crown, lantern, sword and belt objects visible.
Uniform plain dark charcoal-gray background. Outlined chibi game illustration matching original sprites, clustered shading, strong dark contours. No dividers, ground grid or labels.
No crosses or religious symbols in costume, lantern or accessories. Lantern window bars vertical only. No blood, text, letters, numbers, readable marks, watermark, logos or film likeness. Static concept plate, NOT a sprite sheet.
```

### 5 · WATSON-03 — แบบเดี่ยว

ไฟล์แนบตามลำดับ: `img/crew-combat-v1/th/guard.webp`, `img/yama-animation-v1/th/sword-idle.webp`, `docs/art-reviews/2026-11-20-design-approval/yama-cyberhell-costume-v1.webp`

```text
Use case: stylized-concept. One original AVEGEE character approval concept, exactly 1024x1536 portrait.
Input reference 1: ONLY first top-left Guard cell, compact game-team CHIBI proportions, dark outlined rendering, do not copy identity. Input reference 2: first Yama frame, big head/body ratio. Input reference 3: APPROVED Yama cyberhell costume, match zone 4 palette and material language: dark violet, silver edging, cyan neon in restrained thin circuits. Do not copy Yama's silhouette, crown, horns, sword or patterns literally.
Subject: WATSON-03 (this name must NOT appear as text). An original tall slender SILVER-GRAY humanoid robot, still strongly chibi: oversized head and compact limbs, slender compared with broad Guard. Calm analytical presence, upright with relaxed gently sloping shoulders. Distinct original smooth mechanical face, TWO round optical eyes, EACH eye made from TWO nested concentric glass lens layers, cyan optical centers, clear two-level lens rims. No human face or mustache, no screen displaying text. Bare robot head with simple original plated dome.
Slim segmented silver-gray torso, long slim arms and legs within chibi proportions; dark graphite joints; small muted violet inserts and fine cyan light lines that match the supplied approved zone 4 outfit. Full robot feet.
His anatomical LEFT forearm supports a thin transparent rectangular recording slate, held slightly forward and visible near viewer's RIGHT, clearly readable as a thin device. Several short cyan vertical luminous lines streaming UPWARD above the slate, no letterlike glyphs, no numbers or text, no arrows. Right arm relaxed.
Full body at three-quarter angle facing screen RIGHT, centered, ample margin, uniform plain dark charcoal gray background. Dark outlines, compact readable game shapes, chibi illustrated pixel-art-inspired clustered shading consistent with team. Not photorealistic, no realistic adult human proportions.
Absolutely NO detective hat, NO deerstalker, NO pipe, NO trench coat, no copied robot or detective franchise design. No blood, crosses, religious symbols, logos, watermarks, letters, digits, writing, typography or readable text. Single static approval image, not a sprite sheet.
```

### 6 · WATSON-03 — ภาพเทียบ

ไฟล์แนบตามลำดับ: `docs/art-reviews/2026-11-20-guard-designs/guard-watson03-cyberhell-v1.webp`, `img/crew-combat-v1/th/guard.webp`, `img/yama-animation-v1/th/sword-idle.webp`, `docs/art-reviews/2026-11-20-design-approval/yama-cyberhell-costume-v1.webp`

```text
Use case: stylized-concept. AVEGEE HEIGHT COMPARISON approval plate, exactly 1024x1536 portrait.
Input image 1: WATSON robot concept EDIT TARGET. Preserve that EXACT original design: large silver-gray mechanical head, two double-layer concentric glass lens eyes with cyan centers, slim silver-gray segmented body, graphite joints, violet inserts, thin cyan circuitry, bare plated dome (not a hat). Anatomical LEFT hand and forearm support thin clear recording slate with several short cyan vertical light streaks streaming upward, without any writing. Relaxed right arm, gently sloping shoulders, upright calm stance.
Input image 2: first top-left Guard cell is game-team chibi STYLE only.
Input image 3: first Yama sprite frame for chibi face, red skin, short red horns, ears and head/body relationship.
Input image 4: APPROVED CYBERHELL YAMA COSTUME and Yama identity for this comparison. Reproduce this specific Yama outfit faithfully: red face and hands, little red horns, black hair, wide dark-violet crown with cyan band and central cyan gem, layered black-violet-silver long coat and armor, cyan circuit lines, dark boots, silver sword with cyan line held in both hands. Do not substitute his Thai gold outfit.
Exactly TWO full-body characters, WATSON on LEFT and approved CYBERHELL YAMA on RIGHT, both three-quarter facing screen RIGHT; feet on precisely SAME baseline; WATSON sole-to-head height about 1.2x Yama sole-to-crown height. All feet, heads, device, light streaks, and sword in frame, clear gap between characters, no overlap or clipping.
Uniform plain dark charcoal-gray background. Match supplied outlined chibi team illustration, large heads and compact limbs, dark contours and clustered shading. Faithful WATSON design with no added detective motifs. No text anywhere, no labels, letters, numbers, readable glyphs, logos, watermarks, blood or religious symbols. NO hats on robot, NO pipe, no copied franchise robots. Static concept approval plate, NOT a sprite sheet.
```

