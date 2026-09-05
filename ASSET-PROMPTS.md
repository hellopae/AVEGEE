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

## ชุดที่ 0 — ฉาก (สำคัญที่สุดตอนนี้) 🔥

ตอนนี้เกมใช้ draft `Exam/Scene-test.jpg` เป็นฉากไปพลางก่อน **แต่มีตัวละครวาดติดมาในภาพ**
ทำให้เห็นตัวซ้อนกัน (ตัวที่วาดติดฉาก + ตัวที่โค้ดวางทับ) ต้อง gen ใหม่เป็น **ฉากเปล่า**

| key | ต้องมีอะไร |
|---|---|
| `scene` | ฉากเดิมเป๊ะ ๆ **แต่เอาตัวละครทุกตัวออก** ทั้งยมทูตหกคน ตัวเรา วิญญาณ และองค์พญายมบนบัลลังก์ — เหลือเฉพาะสถานที่ พื้น ลาวา สะพาน อาคาร ของประดับ **บัลลังก์ต้องว่าง** |

```
top-down 3/4 pixel art game map of a Thai buddhist hell, same layout and same style
as the reference, but COMPLETELY EMPTY OF CHARACTERS — no demons, no guards, no ghosts,
no king on the throne, the throne is empty. Only the environment: purple obsidian ground,
molten lava rivers, a frozen ice prison in the top left, a field of blades, a yard of
hanging hooks, a stone judgment platform in the centre, a long rope bridge leading down
to the bottom edge, a golden royal pavilion with an empty throne, a large red-and-gold
Thai temple, three bronze cauldrons on fire, a giant stone monster-mouth cave.
No text, no letters, no numbers, no UI, no characters of any kind.
```

**ทำไมต้องเปล่า** — ตัวละครทุกตัวต้องขยับตามเวร (ผู้คุมย้ายไปสถานีที่มีคดี วิญญาณเดินขึ้นสะพาน
ตัวเรายืนที่แท่นพิพากษา) ถ้าวาดติดฉากมาก็ขยับไม่ได้ ต้องเป็นไฟล์แยกให้โค้ดวางเอง

**ถ้าจะเพิ่มทีหลัง** — `prop-boat` เรือข้ามธารลาวา (ตอนนี้โค้ดวาดเองอยู่ พอใช้ได้แต่หยาบ)
ท่าเรือสองฝั่งธารลาวาก็ควรมีในฉากด้วย

---

## ชุดที่ 1 — สถานีทัณฑ์ (8 ชิ้น) 🔥 **gen ชุดนี้ก่อน — เปลี่ยนหน้าตาเกมมากที่สุด**

ทุกชิ้นเป็น "อาคาร/สิ่งปลูกสร้าง" ขนาดพอ ๆ กัน มองจากมุมเดียวกัน ฐานอยู่ล่างสุดของภาพ

| key | prompt (ต่อท้ายบล็อกสไตล์) |
|---|---|
| `st-sala` | a small ornate Thai temple pavilion used as a courthouse, multi-tiered red tile roof with gold chofa finials, carved gold gable, naga serpent balustrade on the front steps, a large brass balance scale and a thick rolled ledger on a black stone pedestal inside |
| `st-krata` | a giant bronze cauldron wok set on a black stone furnace, thick orange flames licking underneath, dark liquid bubbling inside, ornate Thai lotus motifs embossed on the bronze rim, cracked obsidian base |
| `st-ngiw` | a tall bare thorn tree with a thick crooked trunk covered in huge black iron-like spikes, twisted leafless branches, red glowing cracks in the ash ground around its roots |
| `st-raeng` | a circular cracked bone-white stone platform ringed with rusted iron perches, three large black vultures perched and watching, faint ember glow between the stones |
| `st-lin` | a small dark stone pavilion of silence, rows of hanging bronze temple bells with no clappers, a low black stone table with a pair of bronze tongs, dim purple light — ominous but not gory |
| `st-lohak` | a round sunken stone pit filled with boiling dark liquid, thick copper rim, heavy iron chains coiled around the edge, rising steam lit orange from below |
| `st-lan` | a hard-labor quarry yard, a raised black stone platform with huge rough boulders, an iron pushcart, pickaxes and shoulder poles leaning against a low wall |
| `st-tea` | a cozy small Thai sala rest pavilion, red tiled roof with gold trim, open wooden sides, a low table with a clay teapot and cups, two paper lanterns glowing warm |

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
--------------------
รวม             25   (เพดานทั้งเกม 40 · เหลือ 15 ไว้ให้ขุมต่อ ๆ ไป)
เฟรมอนิเมชัน      0
ตัวอักษรในรูป     0
```
