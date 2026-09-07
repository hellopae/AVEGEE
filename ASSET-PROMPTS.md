# ASSET-PROMPTS — prompt สำหรับ gen รูปเกมอเวจี

**วิธีใช้**
1. copy **บล็อกสไตล์** ข้างล่างไปแปะ **นำหน้าทุก prompt** (อย่าข้าม — นี่คือตัวที่ทำให้ทุกชิ้นเป็นชุดเดียวกัน)
2. gen แล้วเซฟไฟล์ชื่อตาม `key` ลงที่ `img/raw/<key>.png`
3. รัน `python3 scripts/prep-art.py` (ตัดขอบใส · จัดขนาด 512 · ลด palette)
4. รีเฟรชหน้าเกม — โค้ดจะเลิกวาด placeholder แล้วใช้รูปจริงทันที **ไม่ต้องแก้โค้ด**

**กฎเหล็ก 3 ข้อ** (จาก `AGAPAE Agent/Output/Toby/2026-09-05-game-feasibility-v2.md`)
- ❌ **ห้ามมีตัวอักษรในรูป** ทั้งไทยและอังกฤษ — AI สะกดผิดเกือบทุกครั้ง ป้ายทุกป้ายให้โค้ดวาดทับเอง
- ❌ **ห้าม gen เฟรมอนิเมชัน** — การเคลื่อนไหวทั้งหมดเป็นโค้ด (แสงวูบ เด้ง สั่น เรืองแสง)
- ✅ **1 ชิ้น = 1 ไฟล์ พื้นหลังใส จัตุรัส มุมมองเดียวกันทั้งเกม**

---

## ✅ สิ่งที่ได้จากรูปชุดแรก (5 ก.ย. 2569) — อ่านก่อน gen ชุดถัดไป

ทดสอบด้วย `crew-taan` และ `tile-rock` แล้ว **สไตล์ที่เป้ gen มาใช้ได้เลย ไม่ต้องเปลี่ยน prompt**
สองข้อที่ปรับจากของจริง:

1. **ขนาดลายของพื้นสำคัญกว่าที่คิด** — `tile-rock` ที่ส่งมา ก้อนหินก้อนหนึ่งกว้างราว 1/12 ของภาพ
   ซึ่ง **พอดี** โค้ดปูเป็น pattern ขนาด 256px ทั้งแผนที่ (ไม่ได้ยัดลงช่องละใบ)
   ก้อนหินบนจอเลยประมาณ 20px = อ่านออกและไม่ยิบตา · **พื้นที่เหลือให้ gen ที่ความละเอียดเดียวกันนี้**
2. **พื้นหลังใสมาถูกแล้ว** — ที่เห็นเป็นสีขาวคือพื้นของโปรแกรมดูรูป ไฟล์จริง alpha = 0 เรียบร้อย

ขนาดสัมพัทธ์บนจอที่โค้ดใช้จริง — ใช้กะสัดส่วนตอนวาด:
```
สถานี      96px  (3 ช่อง)     ← ใหญ่สุด
ยมทูต      34px  (1 ช่อง)     ← ทัณฑ์ยืนสูงราวหนึ่งในสามของอาคาร
ของประดับ  32-51px
วิญญาณ     12px
```

---

## บล็อกสไตล์ — แปะนำหน้าทุก prompt

```
top-down 3/4 isometric-ish view game asset, high-detail modern pixel art in the style of
a beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, rich saturated palette, clean crisp pixel edges,
single object centered on a fully transparent background, square canvas, no ground shadow baked in,
no text, no letters, no numbers, no watermark, no UI
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold trim
```

---

## ชุดที่ 0 — ฉากฐาน "ที่โล่ง" 🔥

ตอนนี้สถานีทุกหลังวาดติดมาในฉาก เลยเห็นครบตั้งแต่วินาทีแรกทั้งที่ยังไม่ได้สร้าง
ต้องแยกเป็น **ฉากฐานที่โล่ง** + **อาคารไฟล์ละหลัง** เพื่อให้ "ขยายนรก" มีน้ำหนักจริง

**ใช้โหมดแก้ภาพ (edit) กับฉากปัจจุบัน** เพื่อรักษาเลย์เอาต์และพิกัดในโค้ดไว้

| key | prompt |
|---|---|
| `scene` | ดูข้างล่าง |

```
Edit this image. Keep the exact same layout, camera angle, palette and pixel art style.

REMOVE these seven structures and replace each with plain empty ground that matches the
area around it, as if nothing was ever built there:
1. the whole frozen ice prison in the top left
2. the field of upright blades on the left
3. the wooden Thai pavilion with the red roof on the lower left
4. the big red-and-gold Thai temple in the top right
5. the three bronze cauldrons on the right
6. the grove of bare thorn trees on the right
7. the small stone pit on the lower middle

KEEP exactly as they are: the border of dark mountains, all the lava rivers, the river of
souls along the bottom with its two wooden docks, the rope bridge, the central stone
judgment platform with the gold throne, and the small golden pavilion at the top middle.

The cleared areas should read as flat open ground — cracked purple obsidian rock with a
little ash, some small stones and bones, nothing man-made.
No text, no letters, no numbers, no characters.
```

---

## ชุดที่ 1 — อาคารสถานีทัณฑ์ แยกไฟล์ละหลัง

**แปะบล็อกนี้นำหน้าทุกอัน:**

```
top-down 3/4 view pixel art game asset, high-detail modern pixel art in the style of a
beautifully drawn Pokemon-style overworld map, chunky readable silhouette, soft dithered
shading with warm rim light, clean crisp pixel edges, single structure centered on a fully
transparent background, square canvas, viewed from the same angle as a top-down game map,
no ground plate under it beyond its own footprint,
no text, no letters, no numbers, no watermark, no characters, no people, no creatures
COLOR THEME: Thai buddhist underworld — obsidian black-purple stone, blood-red lacquer,
molten orange lava glow, antique temple gold
```

| key | prompt ต่อท้าย | สัดส่วนที่ต้องได้ |
|---|---|---|
| `st-lokan` | a frozen prison of the cold hell: a pale blue ice temple with a dark doorway, standing on a thick floating slab of ice, heavy frost chains draped across its front, a huge ice cube beside it, icicles hanging from every edge | **กว้างกว่าสูง** — เตี้ยและกว้างมาก |
| `st-dab` | the blade forest of Asipattana: a row of eight huge curved swords and spears standing upright driven into cracked dark soil, blades stained dark red near the tips, a low broken stone fence behind them | **กว้างมาก เตี้ยมาก** (แถวเดียว) |
| `st-tea` | a cosy small Thai sala rest pavilion built on a raised wooden deck, red clay tiled roof with gold trim and a chofa finial, open wooden sides with carved railings, two glowing orange paper lanterns hanging at the front corners | **เกือบจัตุรัส** |
| `st-sala` | a grand Thai temple hall used as a hall of records, deep red walls with gold window frames, a tall multi-tiered roof with gold chofa finials, a wide staircase at the front with naga balustrades, closed gold double doors | **กว้างกว่าสูงเล็กน้อย** |
| `st-krata` | three huge bronze cauldrons of different sizes on black stone furnaces, thick orange flames underneath, dark liquid bubbling and steaming inside, Thai lotus patterns embossed on the bronze rims | **กว้างมาก เตี้ย** (เรียงสามใบ) |
| `st-ngiw` | a grove of four tall bare thorn trees, thick crooked trunks completely covered in huge black iron spikes, twisted leafless branches, cracked red-glowing soil around the roots | **สูงกว่ากว้าง** |
| `st-lan` | a small hard-labour yard: a sunken square stone pit with two heavy rough boulders inside, a shoulder pole and a pickaxe leaning on the rim, scattered bone fragments | **เล็ก เกือบจัตุรัส** |
| `st-tarang` | a holding gaol for waiting souls: a low dark stone blockhouse with three barred iron cage doors across the front, thick rusted iron bars, a heavy padlock and chains on the middle door, faint pale ghost light leaking between the bars, a small tiled Thai roof with a plain gold ridge trim | **กว้างกว่าสูงราวสองเท่า** — เตี้ย ทรงยาวแนวนอน |
| `st-krajok` | a tall narrow shrine tower of mirrors beside a river of souls: dark carved teak frame in Thai style, seven tall oval mirrors set into its faces catching cold silver light, a gold multi-tiered spire on top, a low stone base with a small offering tray and burning incense sticks | **สูงกว่ากว้างราวสองเท่า** — ทรงสูงชะลูด |

> **สัดส่วนสำคัญกว่าที่คิด** — โค้ดวางอาคารโดยยึด **ฐานกลางล่าง** แล้วขยายให้เต็มความกว้างของโซน
> ถ้าอันไหน gen ออกมาสูงเกินไป มันจะทะลุขึ้นไปทับโซนข้างบน บอกสัดส่วนไว้ใน prompt แล้วทุกอัน

---

## ชุดที่ 2 — ยมทูตและตัวละคร (8 ชิ้น)

**เพิ่มท้าย prompt ทุกตัว:** `cute chibi proportions about 3 heads tall, standing idle facing slightly toward the viewer, full body with feet visible at the bottom edge`

| key | prompt (ต่อท้ายบล็อกสไตล์) |
|---|---|
| `crew-taan` | a veteran yaksha hell-guard, stocky old demon with dark red skin, small tusks, grey topknot, worn bronze shoulder armor over a traditional Thai wrap-cloth, resting a heavy iron club on his shoulder, tired grumpy expression |
| `crew-nira` | a female demon clerk of the underworld, lavender-grey skin, neat bun, small horns, dark formal Thai-collar blouse, carrying a tall stack of palm-leaf documents and a bronze seal stamp, sharp no-nonsense expression |
| `crew-plerng` | an eager young fire demon, bright orange skin, hair made of living flame, minimal armored wrap, cracked glowing lines on arms, cocky grin, small flames at the feet |
| `crew-kan` | a calm scholarly demon, deep indigo skin, long dark hair tied back, round spectacle-less eyes, simple dark robe with gold trim, holding a Thai amulet with a blue eye motif, thoughtful expression |
| `crew-boon` | a gentle demon monk-attendant, pale jade skin, soft round face, small blunt horns, plain ochre wrap-robe, holding a single pink lotus with both hands, serene sad smile |
| `crew-dam` | a small scruffy bat-winged imp, charcoal skin, oversized ears, patched black shorts, carrying a bucket of coal, sleepy half-lidded eyes |
| `hero-yama` | **(รอบ 3 — ผสมสองเวอร์ชัน ดูหมายเหตุใต้ตาราง)** the player character, a boy prince of the underworld: chibi demon boy about twelve, **the same height and build as the crew sprites, roughly 3 heads tall, with a slightly wide sturdy stance — not a narrow vertical figure**, big round eyes with soft worried eyebrows and faint blush on the cheeks, small blunt horns, dark red skin, **a neat compact Thai gold mongkut crown, only slightly too big so it tips a little forward — NOT a tall pointed cone**, black and crimson Thai royal robe with clean gold trim and slightly over-long sleeves, hugging a thick ledger against his chest with both arms, nervous but trying-hard expression, **outline weight matching the other crew sprites — not a heavy black cartoon outline** |
| `hero-boss` | ✅ **ผ่านแล้ว ไม่ต้อง gen ใหม่** — the King of Death seated on a tall black throne, huge imposing crowned demon king, dark maroon skin, elaborate Thai royal regalia in gold and black, holding a long staff, face half in shadow — **ภาพนี้เป็นฉาก ไม่ต้องพื้นใส วาดเป็นภาพจัตุรัสเต็มใบได้** |

> **ทำไมต้อง gen รอบ 3** — เวอร์ชัน "น่ารัก" (Gemini) กับเวอร์ชัน "สุขุม" เก็บไว้ที่
> `img/raw/hero-yama.png` และ `img/raw/_hero-yama-calm.png` ตามลำดับ
> เอาจากน่ารัก: หน้ากลม ตาโต คิ้วกังวล แก้มแดง ท่ากอดแฟ้มด้วยสองแขน
> เอาจากสุขุม: ทรงมงกุฎไทยที่ถูกต้อง การตัดเย็บเสื้อคลุมและตำแหน่งขลิบทอง น้ำหนักเส้นขอบ
> ทิ้งทั้งคู่: มงกุฎทรงกรวยสูงเกินครึ่งหัว (จากน่ารัก) · หน้าผู้ใหญ่ไร้อารมณ์และตัวผอมสูง (จากสุขุม)
>
> **เหตุผลเรื่องรูปทรงตัว** — ย่อทั้งสองเวอร์ชันลงขนาดจริงในเกม (34px) เทียบกับทัณฑ์แล้ว
> ทัณฑ์อ่านออกชัดเพราะเงาตัวกว้างและมีชิ้นส่วนใหญ่ ๆ ส่วน hero ทั้งสองเวอร์ชันเป็นแท่งแคบ ๆ
> เลยจมหายทั้งคู่ — เวอร์ชันใหม่ต้อง**ยืนกว้างขึ้น** ไม่ใช่แค่เตี้ยลง

---

## ชุดที่ 3 — พื้นและของประดับ (9 ชิ้น) — ทำทีหลังได้

**พื้น 3 ชิ้นนี้ต้อง _seamless tileable_** เพิ่มท้าย prompt: `seamless tileable texture, flat top-down view straight from above, no perspective, no objects sticking out, fills the entire square edge to edge, opaque background`

| key | prompt |
|---|---|
| `tile-rock` | cracked black-purple obsidian ground with thin dull-red glowing veins, scattered grey ash |
| `tile-path` | packed grey ash walkway with fine gravel and faint scuff marks, slightly warmer tone than the surrounding rock |
| `tile-lava` | slow-moving molten lava with a thin dark crust breaking into bright orange rivers |

ของประดับ (พื้นใส เหมือนชุดที่ 1):

| key | prompt |
|---|---|
| `prop-lantern` | a tall iron post lantern with a red paper shade glowing warm, small gold Thai ornament on top |
| `prop-firewood` | a neat stacked pile of dark firewood logs bound with rope, a few embers still glowing at the base |
| `prop-pillar` | a broken ancient stone pillar carved with Thai temple patterns, gold leaf flaking off, ash gathered at the base |
| `prop-bones` | a small tidy pile of pale bones and cracked clay urns |
| `prop-ngiw-small` | a young thorn tree sapling with black spikes, half the height of a person |
| `prop-sign` | an empty dark wooden signpost with a blank plank and gold-trimmed frame, no writing on it at all |

> ⚠️ `prop-sign` ต้อง **ว่างเปล่าจริง ๆ** ตัวหนังสือทุกป้ายในเกมโค้ดวาดทับเอง

---

## ชุดที่ 4 — ท่าทางที่โค้ดรออยู่แล้ว (6 ก.ย. 2569) ⭐ ทำชุดนี้ก่อน

เป้ถามว่า "ควร gen อะไรต่อ" — คำตอบคือ **ท่าที่สองของตัวละครที่มีอยู่แล้ว** ไม่ใช่ตัวละครใหม่
เพราะโค้ดมองหาไฟล์พวกนี้อยู่แล้ว **ดรอปลง `img/raw/` แล้วรัน prep-art เห็นผลทันที ไม่ต้องแก้โค้ด**
(ยังไม่มีไฟล์ = ใช้ท่ายืนเดิม เกมไม่พัง)

> ⚠️ นี่ไม่ใช่เฟรมอนิเมชัน — เป็น **ท่าที่สองแบบภาพนิ่ง 1 ไฟล์** โค้ดสลับรูปตอนเกิดเหตุการณ์
> ยังอยู่ในกฎ "0 เฟรมอนิเมชัน" · ทุกท่าต้องยืนบนพื้นระดับเดียวกับท่ายืนเดิม (ฐานชิดขอบล่าง)

### ✅ สถานะ (6 ก.ย. 2569 ค่ำ) — เข้าเกมแล้ว 13 ไฟล์

`hero-yama-atk` · `crew-taan-work` · `crew-plerng-work` · `crew-nira-work` · `crew-dam-work` ·
`mob-pret2` · `mob-werewolf` · `item-fuel` · `fx-ice` · `spirit4-7` — ต่อสายในโค้ดครบแล้ว

**สองอย่างที่ต้องซ่อมด้วยมือหลัง gen — ครั้งหน้าใส่ไว้ใน prompt เลย:**

1. **ท่าโจมตีต้องหันขวา** — สไปรท์ทุกตัวในเกม "หันขวา" เป็นทิศตั้งต้น (`face = 1` วาดตรง ๆ,
   `face = -1` พลิกกระจก) `hero-yama-atk` รอบแรกขว้างไปทางซ้าย พอตัวเราหันขวาจะขว้างสวนทาง
   → ต้องพลิกภาพ · **เขียนในprompt ว่า `facing to the RIGHT side of the canvas`**
2. **ห้ามวาดลูกไฟ/กระสุนติดมาในรูป** — โค้ดวาด `fx-fireball` ให้เองอยู่แล้ว
   และลูกไฟที่ยื่นออกไปไกลทำให้กรอบภาพกว้างขึ้น พอ prep-art จัดกึ่งกลาง **ตัวละครจะเบี้ยวไปข้างหนึ่ง
   และเล็กลง** เห็นชัดตอนสลับท่า → prompt ต้องบอก `no projectile, just the throwing motion`
   (ต้นฉบับที่มีลูกไฟเก็บไว้ที่ `img/raw/_hero-yama-atk-orig.png` แล้ว)

> **เพดานงบรูปเปลี่ยนแล้ว (เจ้าของตัดสิน 7 ก.ย. 2569): นับเป็นน้ำหนักไฟล์ ไม่ใช่จำนวนชิ้น — ≤ 50 MB**
> เพดาน "40 ชิ้น" เดิมมาจากข้อจำกัดกำลังผลิตงานวาด ไม่ใช่ข้อจำกัดทางเทคนิค — ยกเลิกแล้ว
>
> **ตัวเลขจริงตอนนี้:** ที่เกมโหลด (`img/*.png` 43 ไฟล์) รวม **7.9 MB** — นี่คือตัวที่ต้องคุมให้อยู่ใน 50 MB
> ส่วน `img/raw/` (ต้นฉบับก่อน prep) อีก **33 MB** ผู้เล่นไม่เคยโหลด แต่ถ่วง repo
> ถ้าวันหนึ่ง repo อืดค่อยย้าย `img/raw/` ออกไปเก็บที่อื่น — ตอนนี้ยังไม่ต้อง

### 🚨 กฎเหล็กของชุดนี้ — gen จาก prompt เปล่า ๆ ไม่ได้

รอบแรกที่ลอง `hero-yama-atk` ท่าออกมาดีมาก แต่ **ชุดกับสัดส่วนเป็นคนละตัว** —
ได้เกราะทองเต็มตัว + ผ้าคลุมแดง + หัวเล็กลงเป็นสัดส่วนผู้ใหญ่ ทั้งที่ตัวเดิมเป็นชิบิใส่ชุดคลุมยาว
พอโค้ดสลับรูปตอนฟาด มันจะเหมือน**ตัวละครเปลี่ยนคนไปเลย** ซึ่งแย่กว่าไม่มีท่าฟาด

**วิธีที่ต้องใช้กับทุกชิ้นในชุดนี้:**

1. เปิด**โหมดแก้ภาพ (edit / image-to-image)** แล้วแนบไฟล์ตัวเดิม `img/<key>.png` เข้าไปด้วยเสมอ
   — อย่า gen จาก prompt เปล่า
2. ขึ้นต้น prompt ด้วยประโยคล็อกตัวละคร:
   `keep the exact same character, same outfit, same colors and the same chibi head-to-body
   proportions as the reference image — change ONLY the pose`
3. แล้วค่อยต่อด้วยคำอธิบายท่าจากตารางข้างล่าง
4. ได้มาแล้ว **วางเทียบกับตัวเดิมก่อนเสมอ** — หัวต้องโตเท่ากัน ชุดต้องชิ้นเดียวกัน
   ถ้าชุดเพี้ยนแม้แต่นิดเดียว gen ใหม่ อย่าใช้

### สเปกหน้าตาตัวละคร (ของจริงในไฟล์ปัจจุบัน — ใช้เช็กว่าที่ gen มาตรงไหม)

| key | หน้าตาที่ถูกต้อง |
|---|---|
| `hero-yama` | ชิบิหัวโต สูงราว 2.5 หัว · ผิวแดงอมน้ำตาล · เขาสั้นสีแดงเข้ม 2 อัน · หูแหลมยาว · **ชฎาทองยอดแหลมสูง** · **ชุดคลุมยาวสีกรม-ดำ แผงหน้าอกสีแดงเลือดหมู ขลิบทองเส้นบาง** แขนยาว · **เท้าเปล่า** · สีหน้ากังวลอ่อนโยน · **ไม่มีผ้าคลุมหลัง ไม่มีเกราะแผ่น ไม่มีลายทองเต็มตัว** |
| `crew-taan` | ยักษ์อ้วนล่ำ ผิวแดงเข้ม · มวยผมสีเทา · เขี้ยวล่างยื่น · **เปลือยอก** มีสร้อยคอทองแบน · **เกราะไหล่หนังสีแทนข้างเดียว** · กางเกงน้ำตาลพันผ้าคาดเอว · ถือกระบองเหล็กพาดบ่า · เท้าเปล่า |
| `crew-nira` | ร่างบาง ผิวม่วงอ่อน · เขาเล็ก · ผมมวยกลม · **เสื้อแจ็กเก็ตดำแขนยาว** · **ผ้าถุงยาวสีแดงเลือดหมูขลิบทอง** · รองเท้าเทาเข้ม · ถือปึกสำนวนกับตราประทับไม้ |
| `crew-plerng` | ชิบิ ผิวส้มแดง มี**รอยแตกเรืองแสงเหมือนลาวาที่แขน** · **ผมเป็นเปลวไฟจริง ๆ** · ตาทอง ยิ้มเห็นเขี้ยว · เสื้อผ้าคาดเฉียงบ่าเดียวสีแดงเข้มขลิบทอง · กางเกงม่วงเข้ม · เท้าเปล่ามีเปลวไฟเล็ก ๆ |
| `crew-dam` | ชิบิอ้วนกลม ผิวเทาอมม่วง · **หูค้างคาวใหญ่มาก** · ปีกเล็กที่หลัง · ตาปรือง่วง · **เปลือยอก** · กางเกงขาสั้นดำมีแป๊ะปะ · หิ้วถังถ่าน |

| ลำดับ | key | โผล่ตอนไหน | prompt (ต่อท้ายบล็อกสไตล์) |
|---|---|---|---|
| 1 | `hero-yama-atk` | ตอนกดฟาดเปรต (0.5 วิ) | **แนบ `img/hero-yama.png`** · mid-throw attack pose: one arm thrown forward hurling a small molten fireball, the other arm pulled back, torso twisted with weight behind the throw, one foot forward, **his tall gold Thai crown, dark navy-black long robe with crimson front panel and thin gold trim, and bare feet all stay exactly as in the reference**, expression turns from worried to determined, **no cape, no armor plates, no full-body gold ornament** |
| 2 | `crew-taan-work` | ทัณฑ์ประจำสถานี | **แนบ `img/crew-taan.png`** · working pose: both hands gripping his iron club and jabbing it downward into a fire pit, leaning into the push, ember sparks around it · same bare chest, same single tan shoulder plate, same grey topknot, same brown wrap trousers |
| 3 | `crew-plerng-work` | เพลิงประจำสถานี | **แนบ `img/crew-plerng.png`** · working pose: crouching low, fanning flames under a cauldron with a bamboo fan, flame hair streaming sideways · same glowing lava cracks on the arms, same one-shoulder dark red wrap, same purple trousers, same bare feet |
| 4 | `crew-dam-work` | ดำประจำสถานี | **แนบ `img/crew-dam.png`** · working pose: hauling the coal bucket with both hands, back bent, knees buckling, tongue out from the effort · same oversized bat ears, same small wings, same bare torso and patched black shorts |
| 5 | `crew-nira-work` | นิราประจำสถานี | **แนบ `img/crew-nira.png`** · working pose: pressing her wooden seal stamp down onto an open scroll, other hand steadying the paper, leaning forward slightly · same black long-sleeve jacket, same dark red gold-trimmed long skirt, same hair bun |
| 6 | `mob-pret2` | เปรตแบบที่สอง | emaciated Thai hungry ghost (pret), extremely tall and thin with pinhole mouth and swollen belly, hunched forward reaching with long clawed fingers, pale grey-green skin, tattered loincloth |
| 7 | `item-fuel` | กองฟืนตกบนแผนที่ | bundle of dark charcoal logs tied with rough rope, faint orange embers glowing between the pieces, small pile resting on the ground |
| 7.5 | `fx-flame` | ไฟที่กระทะทองแดง (ทางเลือก) | ตอนนี้โค้ดเอา `fx-fireball` (ทรงลูกอุกกาบาตพุ่งนอน) มาใช้แทนไปก่อน ดูโอเคแต่ไม่พอดีนัก · ถ้าอยากให้สวยขึ้น gen ทรงไฟลุกตั้งขึ้น: a single tall vertical tongue of orange fire licking upward, narrow base widening then tapering to a wisp at the top, bright yellow-white core, no fuel or logs, no ground, effect only |
| 8 | `fx-ice` | ทัณฑ์โลกันตนรก | burst of jagged pale-blue ice shards radiating outward from a center point, frost mist, cold rim light, no ground, effect only |
| 9 | `spirit4` `spirit5` | วิญญาณในคิว (ตอนนี้มี 3 แบบ) | translucent pale ghost of a dead Thai commoner standing with head bowed and hands together in a wai, lower body fading into wisps |

**ที่ยังไม่ต้องทำ** — ยมทูตท่าอื่น (กานต์/บุญ ไม่ได้คุมสถานีบ่อย) · พญายมท่าอื่น (โผล่แค่ 7 วิ ต่อคดี) ·
ตัวละครใหม่ทั้งตัว (จ้างครบแล้วยังไม่มีที่ใช้)

> ชิ้นที่ 6-9 (เปรตแบบสอง · กองฟืน · เอฟเฟกต์น้ำแข็ง · วิญญาณเพิ่ม) เป็นของใหม่ ไม่ใช่ท่าที่สอง
> gen จาก prompt เปล่าได้ตามปกติ ไม่ต้องแนบไฟล์อ้างอิง

**ถ้าอยากได้ผลเยอะที่สุดด้วยชิ้นเดียว: `hero-yama-atk`** — เป็นชิ้นที่ผู้เล่นเห็นบ่อยที่สุด
และแก้ปัญหาที่ตอนนี้กดฟาดแล้วตัวเราไม่ขยับเลย เห็นแค่ลูกไฟเด้ง

---

## เช็กก่อนส่งเข้าเกม

- [ ] พื้นหลังใสจริง (ไม่ใช่สีขาว/เช็กเกอร์บอร์ดที่ gen ติดมา)
- [ ] ไม่มีตัวอักษรหลุดมาแม้แต่ตัวเดียว
- [ ] มุมมองเดียวกับชิ้นอื่นในชุด (เอียงเท่ากัน ไม่ใช่บางชิ้นมองจากด้านหน้าตรง)
- [ ] วางเรียงข้างกันแล้ว **ขนาดสัมพัทธ์สมเหตุสมผล** — ต้นงิ้วต้องสูงกว่ากระทะ ยมทูตต้องเล็กกว่าอาคาร

---

## งบรวม

```
ชุด 1 สถานี      8
ชุด 2 ตัวละคร     8
ชุด 3 พื้น+ของ    9
ชุด 4 ท่าที่สอง   10
--------------------
รวม             35   (เพดานทั้งเกม 40 · เหลือ 5 ไว้ให้ขุมต่อ ๆ ไป)
เฟรมอนิเมชัน      0
ตัวอักษรในรูป     0
```

---

## ชุดที่ 5 — หน้าปก · ตัวละครในสำนวน · ผีไทย · ด่าน 2-3 (7 ก.ย. 2569)

### 5.0 หน้าปกเกม ⭐ ทำก่อนทั้งชุด

`img/cover.png` — ภาพเดียวที่ **ไม่ใช้บล็อกสไตล์พิกเซล** เพราะเป็นภาพโปสเตอร์ ไม่ใช่ asset ในเกม
ต้องเป็น **แนวนอน 16:9** และ **เว้นที่ว่างครึ่งขวาไว้ให้ปุ่มเมนู** (New Game / Resume / ตั้งค่า)

```
Cinematic game cover key art, painted in the style of a high-end 2D Thai animated film,
rich hand-painted illustration with crisp linework and glowing atmospheric lighting,
16:9 wide landscape composition.

SUBJECT: a small boy prince of the Thai underworld standing at the very front of a colossal
black stone judgment platform, seen from behind and slightly to the side, three quarters view.
He is tiny against the scene — chibi proportions, about 3 heads tall, dark red skin, small
blunt horns, a neat Thai gold mongkut crown slightly too big for him, a black and crimson
Thai royal robe with thin gold trim and over-long sleeves, hugging a thick ledger against his
chest with both arms, bare feet. His posture is nervous but planted.

BEHIND HIM, towering and mostly in shadow: the enormous silhouette of the King of Death
seated on a black throne, only his gold crown, one huge hand and the glint of his eyes
catching light. He fills the upper background. He is looking down at the boy.

BELOW AND IN FRONT: an endless queue of translucent pale ghosts winding up a stone bridge
out of a river of souls, heads bowed, hands together in a wai, their lower bodies fading
into wisps. Rivers of molten lava thread between black obsidian cliffs. Bronze cauldrons,
a grove of black iron thorn trees and a frozen blue ice temple are visible far off in the haze.

COMPOSITION: the boy and the throne occupy the LEFT and CENTER of the frame.
The RIGHT THIRD of the image must stay visually calm and uncluttered — just lava haze,
drifting embers and dark sky — so menu buttons can sit on top of it and stay readable.

LIGHTING: deep obsidian black-purple base, molten orange lava glow from below lighting the
boy's face and the ghosts' edges, cold pale blue rim light from the river of souls,
antique temple gold accents, thick volumetric haze, floating ash and embers.

MOOD: heavy, sacred, lonely, a child given a job far too large for him. Not gory, not evil —
solemn and beautiful.

NEGATIVE: no text, no letters, no numbers, no title, no logo, no watermark, no UI elements,
no signature, no borders, no frame, no blood, no gore.
```

> **เช็กก่อนใช้:** ครึ่งขวา "ว่างจริง" ไหม (เอาสี่เหลี่ยมทึบทาบดูว่ายังอ่านปุ่มออก) ·
> ตัวเด็กต้องเล็กเมื่อเทียบกับบัลลังก์ ถ้า gen มาแล้วเด็กใหญ่เท่าพญายม = ผิดอารมณ์ทั้งภาพ gen ใหม่
>
> **ถ้าอยากได้เวอร์ชันมือถือด้วย** gen ซ้ำอีกใบเป็น 9:16 แล้วเซฟเป็น `img/cover-tall.png`
> ย้าย "ที่ว่าง" จากครึ่งขวาไปเป็น **ครึ่งล่าง** แทน (แก้แค่ย่อหน้า COMPOSITION)

---

### 5.1 วิญญาณในสำนวนที่มีชื่อ — 10 ชิ้น

**ใช้บล็อกสไตล์พิกเซลปกติ** + เพิ่มท้ายทุกอัน:

```
translucent pale ghost of a dead Thai person, feet and lower body fading away into soft
wisps of mist, faint cold blue-white inner glow, hollow tired eyes,
cute chibi proportions about 3 heads tall, standing facing slightly toward the viewer,
full body, clothing and silhouette must read instantly at very small size
```

> ⚠️ **เพศกับวัยต้องตรงกับสำนวน** — โค้ดเลือกสรรพนามจากเพศในไฟล์ `src/cases.js`
> ถ้า gen ผิดเพศ ตัวละครจะพูด "ผม" ทั้งที่เป็นผู้หญิง ซึ่งเป็นบั๊กที่เจ้าของเจอมาแล้ว

| key | ใคร | prompt ต่อท้าย |
|---|---|---|
| `soul-pol` | นักการเมืองชายชรา | elderly Thai man, heavy jowls, slicked grey hair, expensive dark suit with a wide silk tie and a gold lapel pin, one hand raised in a practiced politician's wai, oily confident smile that does not reach the eyes |
| `soul-gen` | นายพลแก่อ้วน | fat elderly Thai man, buzz-cut grey hair, thick neck, olive-green military dress uniform heavy with medal ribbons and gold braid on the shoulders, arms folded, chin up, blank stubborn stare |
| `soul-nun` | หญิงสาวสวยเข้าวัด | beautiful young Thai woman, long straight black hair, pristine white lay-devotee outfit (white blouse and white long skirt), a string of prayer beads wound around one wrist, hands together in a perfect demure wai, eyes lowered too modestly |
| `soul-recruit` | พลทหารหนุ่ม | young Thai man barely twenty, shaved head, plain olive army fatigues with the sleeves rolled, dark bruises on both forearms, standing rigidly at attention, thousand-yard stare |
| `soul-star` | ดาราหนุ่มหล่อ | very handsome young Thai man, styled hair, crisp white designer shirt half unbuttoned, a thin gold chain, hand lifted in a charming wave, camera-ready smile |
| `soul-lord` | ชายแก่ชนชั้นสูงร่ำรวย | imposing elderly Thai aristocrat, silver hair swept back, heavy gold rings on every finger, formal white Thai royal-court jacket with a high collar and gold buttons, a jade-topped cane, cold amused expression |
| `soul-girl` | เด็กสาวฆ่าพ่อเลี้ยง | thin Thai girl about sixteen, school uniform white blouse and navy pleated skirt, hair in a short ponytail, both hands hanging limp at her sides, one sleeve darker than the other, hollow exhausted eyes with no tears left |
| `soul-boy` | เด็กหนุ่มยิงกราดโรงเรียน | Thai boy about fifteen, oversized school uniform shirt untucked, thick glasses with one cracked lens, backpack hanging off one shoulder, shoulders hunched inward, eyes darting to the side, not looking at the viewer |
| `soul-deva` | เทวดาปลอมตัวเป็นขอทาน | frail old Thai beggar in a patched brown wrap-cloth holding a chipped alms bowl — **but** a very faint gold halo ring and two almost-invisible gold celestial ribbons trail behind him, so subtle you only notice on a second look, serene knowing eyes |
| `soul-nurse` | พยาบาลสาวที่ถูกคัดกรรมผิด | young Thai nurse, neat white uniform and folded white cap, a small watch pinned to the chest, hands clasped in front of her, confused and frightened but standing politely, no guilt in her face at all |

---

### 5.2 ประตูสวรรค์ — สถานีใหม่ 1 ชิ้น

ใช้บล็อกสไตล์ **อาคารสถานี** (ชุดที่ 1)

| key | prompt ต่อท้าย | สัดส่วน |
|---|---|---|
| `st-sawan` | a gate back to the heavens standing at the edge of hell: a tall white-and-gold Thai temple archway with a multi-tiered roof and gold chofa finials, warm white light pouring out of the opening instead of darkness, a short flight of pale marble steps up to it, lotus carvings on the posts, thin gold ribbons drifting upward from the top, **it must look clean and bright — the only structure in the zone that is not black or burning** | **สูงกว่ากว้างเล็กน้อย** |

---

### 5.3 ผีไทยด่าน 1 — เพิ่มพันธุ์ตัวก่อกวน 4 ชิ้น

โค้ดสุ่มจากลิสต์ `MOB.kinds` อยู่แล้ว **ดรอปไฟล์ลง `img/` แล้วเพิ่มบรรทัดใน data.js อันเดียว**

| key | prompt (ต่อท้ายบล็อกสไตล์ ไม่ต้องใส่ chibi) |
|---|---|
| `mob-krasue` | Thai krasue ghost: a floating severed woman's head with long black hair and a beautiful pale face, glowing internal organs — heart, lungs and a long trailing intestine — hanging beneath the neck, the whole mass lit from inside with a sickly green-orange glow, floating above the ground, **no body, no legs** |
| `mob-krahang` | Thai krahang ghost: a shirtless dark-skinned man in a red loincloth crouched low in a flying posture, arms spread wide gripping two enormous woven bamboo winnowing baskets used as wings, a wooden rice pestle held between his knees, wild matted hair, mad grin |
| `mob-pop` | Thai phi pop: a gaunt villager possessed by a spirit, dull grey skin stretched tight over the ribs, mouth smeared dark, crouched on all fours like an animal, head twisted up toward the viewer, eyes solid white with no pupils, torn farmer's clothes |
| `mob-tanee` | Thai phi tani: a beautiful pale woman in a traditional green-and-gold Thai sabai dress standing half-merged with the trunk of a banana tree, long black hair, green ghostly glow, her lower half becoming the trunk and roots, banana leaves framing her |

---

### 5.4 ด่าน 2-3 — ฉากโซนใหม่ (ทำทีหลัง ไม่รีบ)

เกมจะเปิด "ย้ายโซน" ให้ตอนเลื่อนขั้นถึงระดับที่กำหนด **ยังไม่มีไฟล์ = เล่นด่าน 2-3 ด้วยฉากเดิมไปก่อน**
(โค้ดถอยไปใช้ `img/scene.png` เอง เกมไม่พัง)

ทั้งสองใบต้องเป็น **ภาพฉากเต็มใบ 1527×704 พื้นทึบ** และ **วางผังให้เหมือนโซนไทยเป๊ะ ๆ**
— แท่นพิพากษากลางจอ · แม่น้ำวิญญาณขอบล่าง · ท่าเรือสองฝั่ง · ที่ว่างตรงตำแหน่งเดิมทุกจุด
เพราะพิกัดทุกค่าใน `src/data.js` อ้างผังนี้ ถ้าผังเปลี่ยน ตัวละครจะไปยืนกลางลาวา

| key | prompt |
|---|---|
| `scene-asia` | ดูข้างล่าง |
| `scene-west` | ดูข้างล่าง |

```
[scene-asia]
Edit this image. Keep the EXACT same layout, camera angle, composition and pixel art style —
same central stone judgment platform with the gold throne, same rope bridge, same river of
souls along the bottom with two wooden docks, same lava rivers in the same places, same
empty build plots in the same positions.

CHANGE ONLY THE CULTURAL DRESSING of the surrounding architecture and rock, from Thai to a
blend of East and South Asian underworlds: Chinese Diyu with red lacquer pillars and curved
green-tiled eaves and hanging red paper lanterns, Japanese Jigoku with weathered stone jizo
statues and a torii gate half-swallowed by lava, Korean roof tiles with painted dancheong
patterns, Indian Naraka with carved sandstone pillars and a many-armed stone guardian relief.
The mountains become jagged snow-dusted peaks instead of thorn ridges.
Palette shifts from black-purple to deep jade green, cinnabar red and cold iron grey,
lava stays molten orange.
No text, no letters, no numbers, no characters, no people.
```

```
[scene-west]
Edit this image. Keep the EXACT same layout, camera angle, composition and pixel art style —
same central stone judgment platform with the gold throne, same rope bridge, same river of
souls along the bottom with two wooden docks, same lava rivers in the same places, same
empty build plots in the same positions.

CHANGE ONLY THE CULTURAL DRESSING of the surrounding architecture and rock, from Thai to a
blend of European and Slavic underworlds: gothic cathedral ribs and pointed arches in
blackened stone, broken flying buttresses, Greek marble columns cracked and toppled, an
Orthodox onion dome with tarnished copper, wrought-iron fences and gargoyles on the ledges,
a frozen Russian birch grove at the far edge. The river of souls becomes the Styx with an
empty wooden ferry boat.
Palette shifts from black-purple to charcoal grey, verdigris copper green and bone white,
lava stays molten orange.
No text, no letters, no numbers, no characters, no people.
```

---

### 5.5 งบรูปหลังชุดนี้

```
เดิม (ในเกม)         43 ไฟล์  7.9 MB
+ หน้าปก              1        ~1.2 MB   (ภาพวาดเต็มใบ ไม่ใช่พิกเซล)
+ วิญญาณมีชื่อ        10       ~0.9 MB
+ ประตูสวรรค์          1       ~0.1 MB
+ ผีไทย                4       ~0.4 MB
+ ฉากด่าน 2-3          2       ~1.6 MB
------------------------------------------
รวม                  61 ไฟล์  ~12.1 MB   (เพดาน 50 MB — ยังเหลือเยอะ)
```
