# ภาพร่างแยกหงอคงและการ์ดท่ากวาด — 15 พฤศจิกายน 2569

ส่งมอบภาพวาดใหม่ 4 ภาพ ใช้ ImageGen ในตัว 4 ครั้งจากงบไม่เกิน 8 ครั้ง ภาพละ 1 ครั้ง ไม่มี retry ทั้งหมดอ้างอิงหงอคงของโปรเจกต์และฉากศึกบูรพา ไม่เปลี่ยนโค้ดเกม

## ไฟล์ส่งมอบ

| ไฟล์ใน img/z2-events/ | ขนาด | โหมด | การบันทึก |
| --- | --- | --- | --- |
| boss-wukong-clone-asia.webp | 512×512 | RGBA | WebP lossless |
| boss-wukong-clone-asia-profile.webp | 512×512 | RGB | WebP q86 |
| cut-wukong-sweep-asia.webp | 1672×941 | RGB | WebP q86 |
| cut-wukong-clones-asia.webp | 1672×941 | RGB | WebP q86 |

สามไฟล์แรกเขียนทับ placeholder ตามชื่อและขนาดเดิม ไฟล์สุดท้ายเป็นภาพเสริมที่เพิ่มใหม่

**ถึง Claudy:** `img/z2-events/cut-wukong-clones-asia.webp` ยังไม่มีจุดเรียกใช้ในเกม ภาพพร้อมสำหรับนำไปผูกกับท่าถอนขนสร้างร่างแยกในงานถัดไป รายงานนี้ไม่ได้ส่งข้อความหา Claudy และไม่ได้เพิ่มจุดเรียกใช้เอง

## ภาพรวมสำหรับตรวจงาน

[เปิด contact sheet](contact-sheet.jpg) — JPEG 1600×2208 ไม่มีข้อความวาดทับภาพ

- แถวบน ซ้ายไปขวา: ตัวจริงอ้างอิงบนพื้นเข้ม, ร่างแยกบนพื้นเข้ม, ร่างแยกบนพื้นสว่าง, ภาพครึ่งตัวร่างแยก
- แถวกลาง: กระบองกวาดสิบทิศ
- แถวล่าง: เป่าขนกลายเป็นร่างแยก

## แหล่งอ้างอิงและวิธีส่งออก

- `img/z2-events/boss-wukong-asia.webp`: หน้า สัดส่วนลิงแบบ chibi ห่วงทอง เกราะแดงทอง ผ้าพันคอ หาง และกระบอง
- `img/z2-events/boss-wukong-asia-profile.webp`: การจัดภาพครึ่งตัวและฉากวัดสีเขียวเข้ม
- `img/z2-events/cut-wukong-arrives-asia.webp`: ลายเส้น การลงสี และแสงของฉากเหตุการณ์
- `img/theme-v4/arena-asia.webp`: ลานศึกบูรพาที่ระบบ `battleBackground` เลือกใช้สำหรับศึกโซน asia

ร่างแยกและความโปร่งแสงวาดโดย ImageGen พร้อมเส้นขนปลิว ไม่ใช้โค้ดย้อมสี ตัวสไปรต์ต้นฉบับ 1254×1254 RGBA ย่อแบบ premultiplied alpha ด้วย Lanczos เป็น 460×460 แล้ววางกลางผืนโปร่งใส 512×512 เพื่อให้เล็กกว่าตัวจริง ภาพครึ่งตัวย่อจาก 1254×1254 เป็น 512×512 ฉากกว้างได้ 1672×941 จากเครื่องมืออยู่แล้ว จึงไม่ต้องย่อหรือครอป

ใช้ Pillow บันทึก RGB ด้วย `quality=86, method=6` และ RGBA ด้วย `lossless=True, quality=100, method=6, exact=True` ล้างเพียง alpha noise ที่ค่า ≤2/255 และ RGB ของพิกเซลโปร่งใสสนิทให้เป็นศูนย์ ไม่ลดอัลฟาทั้งภาพหรือเปลี่ยนสีส่วนที่เห็น

## ผลตรวจที่ทำจริง

เรียกจากราก repo:

```sh
python3 docs/art-reviews/2026-11-15-wukong-clone-art/check-assets.py
node --test tests/boss-skills.test.mjs tests/z2-events-order.test.mjs tests/battle-background.test.mjs
git diff --check
```

- ตัวตรวจภาพเปิดและ decode ครบทั้ง 4 ไฟล์ ตรวจชื่อ ขนาด โหมดสี และชนิด WebP: RGBA เป็น VP8L; RGB เป็น VP8
- สไปรต์มีกรอบอัลฟาสงวนโปร่งใสอย่างน้อย 24 px ทุกด้าน; bounding box ส่วนที่เห็นคือ `(47, 56, 471, 462)`; มีพิกเซลโปร่งแสง 77,535 พิกเซล
- ไม่เหลือสี matte ซ่อนอยู่ในพิกเซล alpha=0 หลังแก้ รอบตรวจแรกพบ 3,213 พิกเซลที่มี RGB ค้างอยู่ จึงล้างค่าและเรียกตัวตรวจซ้ำ ผลตรวจสุดท้ายครบตาม assertion
- ตรวจ contact sheet จากไฟล์ WebP ที่ส่งออกจริง ทั้งพื้นสว่างและพื้นเข้ม: ไม่พบขอบพื้นหลังทึบ เส้นขนและความโปร่งแสงยังเห็นต่อเนื่อง
- Node tests ทั้งสามไฟล์: 30 รายการสำเร็จ, 0 ล้มเหลว มี ExperimentalWarning ของ Node เรื่อง localStorage จากชุดทดสอบเดิม
- ตรวจภาพด้วยสายตา: ไม่พบตัวอักษรในภาพทั้งสี่ หน้าตาและชุดยึดแบบเดิม การ์ดกวาดมีหงอคงเพียงตัวเดียวพร้อมวงกระบอง ลม และเศษหิน ส่วนภาพเสริมมีตัวจริงกำลังเป่าขนและร่างแยกสีทองหลายตน
- ไม่ได้เปิดเกมทดสอบการแสดงผลจริง ผล Node เป็นการตรวจระบบและจุดอ้างอิงเดิม ไม่ใช่ผลตรวจภาพในเกม

ค่าคุณภาพ q86 เป็นพารามิเตอร์ตอนบันทึก ส่วนตัวตรวจยืนยันได้เฉพาะชนิด codec ไม่ได้อนุมานค่า q จากไฟล์ที่เข้ารหัสแล้ว การตรวจด้วยสายตาไม่ได้ใช้ OCR ยืนยันว่าไม่มีข้อความ

## ตรวจตนเองตามเกณฑ์รับงาน

| เกณฑ์ | หลักฐาน / ขอบเขต |
| --- | --- |
| สไปรต์ร่างแยก 512×512 RGBA เล็กกว่าตัวจริง ถือกระบองพร้อมสู้ โปร่งแสงทองและขนปลิว | ภาพใหม่มีท่าและเส้นขนเฉพาะ; ขนาด โหมด อัลฟา และความสูงที่เล็กกว่าตัวจริงตรวจโดยสคริปต์ |
| ครึ่งตัวร่างแยก 512×512 RGB ตามแบบ profile | ใช้สไปรต์ร่างแยกใหม่และ profile ตัวจริงเป็น reference; ตรวจเทียบใน contact sheet |
| การ์ดกวาด 1672×941 RGB วงกระบอง ลม เศษหิน ไม่มีทีม | ตรวจโครงสร้างโดยสคริปต์และองค์ประกอบด้วยสายตา |
| ภาพถอนขนเพิ่มเมื่อมีงบ พร้อมบอก Claudy | สร้างเพิ่มเป็นไฟล์ใหม่ในงบ; มีข้อความส่งต่องานถึง Claudy ด้านบน ยังไม่ผูกกับเกม |
| รูปลักษณ์และฉากตาม reference ไม่มีตัวอักษร | ตรวจภาพส่งออกเทียบ reference ด้วยสายตา |
| WebP q86 สำหรับ RGB และ lossless สำหรับ RGBA; ขอบอัลฟาสะอาด | พารามิเตอร์บันทึกและการตรวจ codec; กรอบโปร่งใส, ไม่มี RGB ซ่อน, ตรวจบนพื้นสว่าง/เข้ม |
| งบ ≤8 ครั้ง และ retry ≤2 ครั้งต่อภาพ | ใช้ 4 ครั้ง ภาพละ 1 ครั้ง; retry 0 |
| มี contact sheet JPG และ README ไทยในโฟลเดอร์ที่กำหนด | ทั้งสองไฟล์อยู่โฟลเดอร์เดียวกับรายงานนี้ พร้อมสคริปต์ตรวจซ้ำ |
| จำกัดขอบเขตงานใน worktree / branch เดิม | แก้เฉพาะภาพส่งมอบและรายงาน; ไม่แก้ source เกม hooks status.json หรือ worklog.json; ไม่สร้าง worktree/branch ไม่ commit/push/merge และไม่ deploy |

## พรอมป์ต์ที่ใช้จริง

ใช้เครื่องมือ ImageGen ในตัวทั้งหมด ไม่ใช้ CLI/API fallback ภาพที่ 1 เปิด `transparent_background=true` อีกสามภาพใช้ `false` Reference ของภาพที่ 2 และ 4 ใช้ร่างแยกจากภาพที่ 1 เพื่อคุมหน้าตาให้ตรงกัน

### ภาพที่ 1

```text
Use case: stylized-concept. Create ONE finished square game sprite, a hair-born magical clone of the exact Wukong in reference image 1. Reference 1 is identity and hand-painted chibi fantasy art style, not an edit target. Keep his recognizable youthful monkey face, spiky swept-up fur, curled gold forehead circlet, red scarf and flowing red tabard, ornate red and gold armor with dark scale panels, monkey-tail, boots and long red-shaft staff with elaborate golden ends. New pose: full body in a compact ready-to-fight stance, holding the staff diagonally across his body in both hands. The clone should occupy about 82% of the square height, slightly smaller than the reference original, entire tail and both staff ends inside frame with padding. CRUCIAL: design the clone as a pale honey-gold translucent apparition with readable armor details and faint translucent muted red accents, a semi-transparent luminous body, and actual wispy individual golden monkey hairs breaking away from the silhouette, hair strands trailing from shoulders, arms and tail. This is hand-drawn clone-specific art, not a simple recolor of the original. Strong coherent silhouette and clear face at 512px game size, nuanced ink outlines and painted shading matching reference. True transparent background with alpha, no scenery, no ground plane, no hard aura disc, no opaque backdrop, no cast shadow. Do not draw any text, glyphs, letters, numbers, logos, borders, or watermark. Only ONE clone, no other characters. Output square with actual transparency.
```

### ภาพที่ 2

```text
Use case: stylized-concept. Make ONE finished square half-body game portrait. Reference image 1 is the ORIGINAL Wukong profile: copy its square waist-up framing, dark teal misty eastern temple setting, dense painted chibi fantasy illustration style. Reference image 2 is the GOLDEN HAIR CLONE whose exact character identity and ghostly material you must preserve. Paint a close waist-up portrait of that same hair-born clone: youthful monkey face, sharp golden eyes, swept-up spiky monkey fur with wispy hairs peeling off at edges, curled gold circlet, ornate red-gold armor with dark scale panels, round gold belt clasp and red scarf. He holds the elaborate golden-ended red staff diagonally ready for combat, as the clone reference. Pale honey-gold translucent apparition with muted red fabric still readable and delicate luminous hair strands trailing from head, shoulders and arms; faint scenery can be seen through some outer shoulder/scarf wisps. Render the phantom quality in the drawing, no flat global recolor, keep crisp eyes and recognizable face. Opaque full-bleed RGB scene with the same atmospheric dark teal pine/temple/lantern backdrop as the original profile; NO other people or creatures. Artwork only, absolutely NO text, letters, numbers, glyphs, logo, watermark or frame. One square portrait, high visual consistency with both references.
```

### ภาพที่ 3

```text
Use case: illustration-story. Create ONE finished wide 16:9 fantasy game battle skill illustration, a dramatic horizontal staff sweep attack. Input reference 1: exact ORIGINAL Wukong identity and outfit. Input reference 2: cinematic painted chibi/anime art style of his arrival. Input reference 3: actual eastern battle arena environment, use this courtyard as the location. Draw the ORIGINAL opaque Wukong, with the same youthful monkey face, spiky brown-golden hair, curled golden head circlet, bright red scarf, ornate red-and-gold armor, dark scale panels, gold lion belt clasp, monkey tail, boots, and long red-shaft staff with elaborate golden ends. Wukong is the ONLY character, centered in a dynamic low full-body pivot stance, gripping ONE long staff with two hands, spinning it horizontally around himself. Clearly show a sweeping complete elliptical circular golden motion arc surrounding him at waist height, with wind spirals and broken stone fragments exploding radially in ALL directions from the powerful sweep. Anatomically coherent two arms/two legs, solid readable staff, energetic perspective. The sweep must read as 360-degree area attack, not a single forward strike. Set on cracked grey-green geometric stone paving of the eastern temple arena, red pillars, gold-trimmed railings, teal tiled temples, red maples, misty karst mountains, lantern light. Match arrival's rich hand-painted outlines, warm gold action lighting and polished illustrated detail. Wide cinematic composition intended for final 1672x941 crop, keep Wukong and staff tips within safe margins. No Yama, no teammates, no enemies, no clones, no spectators. NO text anywhere, no writing on architecture, no letters, symbols resembling writing, numbers, UI, frame, watermark or logo. Full-bleed landscape illustration, opaque background.
```

### ภาพที่ 4

```text
Use case: illustration-story. Create ONE finished wide 16:9 fantasy game skill illustration of Wukong blowing plucked monkey hairs into magical clones. Input 1: exact original Wukong character identity/outfit. Input 2: exact hair-born golden clone design, use for clones only. Input 3: painted cinematic fantasy illustration style. Input 4: actual eastern battle courtyard setting. ORIGINAL opaque Wukong in left foreground, recognizably same youthful monkey face, spiky brown-gold fur, curled golden circlet, ornate red-gold armor with dark scale panels, red scarf, gold lion belt buckle, monkey tail and golden-ended red staff held upright in his left hand. His right hand is held just in front of pursed lips; fingers show several fine newly plucked golden monkey hairs on his palm, which he is blowing toward the right. Clear visual story left to right: a few long fine floating hairs leave his mouth/hand, curl into small golden monkey-shaped hair silhouettes in midair, then become THREE distinct complete smaller hair clones in ready-to-fight poses on the right, each holding the same golden-ended staff. Clones are pale honey-gold translucent apparitions with muted red armor and fabric detail, wispy hair edges, same face/circlet/costume as original and clone reference, gold light passing through their outlines. Arrange three complete clones at different depths on the right, read clearly as separate figures, no overlap confusion. Richly illustrated chibi/anime fantasy, inked painted shading and warm gold magical lighting matching reference 3. Courtyard has grey-green patterned stone paving, distant red pillars, teal-roofed eastern temples, gold-trimmed rails, lanterns, red maples and misty mountain peaks as reference 4. Scene is an orderly summoning moment, no sweep circle, no explosion. Full-bleed wide opaque landscape for final 1672x941. No Yama, teammates, enemies or spectators, only Wukong plus the three clones. Absolutely NO text, glyphs, letters, numbers, calligraphy, logos, UI, watermark or border anywhere.
```

