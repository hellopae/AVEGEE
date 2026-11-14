# การ์ด profile วิญญาณท่าตกใจ

งาน SPIRIT-CARD-SCARED ตาม brief วันที่ 13 พฤศจิกายน 2569 ดำเนินงานวันที่ 14 พฤศจิกายน 2569

ส่งออกภาพสำหรับรีวิว 24 ไฟล์ จากต้นฉบับที่เลือกใช้ในเส้นทางฉากสู้ได้ 42 ภาพ ใช้ ImageGen ในตัว 24 ครั้ง และ retry 0 ครั้ง ลำดับโซน TH 11 ภาพ → Asia 10 ภาพ → West 3 ภาพ ส่วนที่เหลือ 18 ภาพอยู่ในตารางงานค้าง

## หลักฐานจากโค้ด

- การ์ดศัตรูมุมขวาล่างอยู่ใน `.battle-boss-hud` เลือกภาพผ่าน `bossProfileOverride()` แล้วลอง `artUrl(f.sp + "-profile")` และ `storyFoeArt(f.sp)` ตามลำดับ การเลือกภาพตรงนี้ยังต้องเชื่อมกับสถานะแพ้จึงจะใช้ภาพชุดใหม่ในเกม [src/ui.js](../../../src/ui.js#L4274)
- ตัวบนสนามเลือก `soulPoseForScare()` เมื่อเป็นการสู้วิญญาณและ `battle.over === "win"` แล้ว [src/ui.js](../../../src/ui.js#L2524)
- `artUrl()` คืน `null` สำหรับ profile แยกของ spirit archetype, recruit และ graduate การ์ดจึงใช้สไปรท์เต็มตัวเป็นต้นฉบับ ภาพทั้ง 10 archetype มีเส้นทางประจำโซน ส่วน recruit ใช้ TH และ graduate ใช้ West [src/art.js](../../../src/art.js#L106) [src/regional-spirits.js](../../../src/regional-spirits.js)
- `startBattle()` เรียก `applySoulPortrait()` ก่อนสร้างคู่ต่อสู้ ทำให้ไฟล์ที่เกี่ยวข้องเป็น semantic spirit ทั้ง 40 ภาพ บวก recruit และ graduate [src/game.js](../../../src/game.js#L2637) [src/soul-portraits.js](../../../src/soul-portraits.js#L57)
- `soul-deva.webp` เป็นคดีเทวดาที่สงบ เงื่อนไข `needBattle()` ตัดวิญญาณบริสุทธิ์ออก จึงนับชุดสำหรับฉากขัดขืนเป็น 42 ภาพ [src/game.js](../../../src/game.js#L2630) [src/cases.js](../../../src/cases.js#L322)

ค้นหา `Output/Toby/2026-11-12-avegee-spirit-poses-code.md` และชื่อไฟล์เดียวกันภายใน worktree แล้วไม่พบ จึงใช้โค้ดปัจจุบันเป็นหลักฐานของเส้นทางภาพ

## วิธีส่งออกและขอบเขตการตรวจ

แต่ละภาพส่งต้นฉบับของตัวเองเป็น edit target ให้ ImageGen พร้อมคำสั่งรักษาตัวละคร กรอบ องค์ประกอบ สี เสื้อผ้า และอุปกรณ์ เปลี่ยนสีหน้าและมือให้ตกใจ ตาโต ปากอ้า และมีเหงื่อ พร้อมคำสั่งห้ามตัวอักษร

แปลงผล ImageGen เป็น RGBA และบันทึก WebP ด้วย Pillow โดยใช้ `lossless=True, quality=100, exact=True` เก็บช่อง alpha หากขนาดที่ได้ต่างจากต้นฉบับ จะปรับทั้ง canvas กลับเป็นขนาดต้นฉบับด้วย LANCZOS ก่อนส่งออก

ตรวจด้วย Python/Pillow เฉพาะการมีอยู่ของไฟล์และขนาดตาม brief ผลคือภาพ scared ครบ 24/24 ไฟล์ และขนาดตรงต้นฉบับ 24/24 คู่ พร้อม README และ contact-sheet รวม 26 ไฟล์ ผลนี้เป็นการตรวจไฟล์และขนาด ส่วนความเหมือนตัวละคร สีหน้า มือ กรอบ องค์ประกอบ และตัวอักษรยังต้องพิจารณาจากภาพ

## ข้อค้างที่ทราบ

- `spirit-business-asia-v2-scared.webp` มีลายอักษรจีนบนชุดที่สืบมาจากต้นฉบับ เกณฑ์ห้ามตัวอักษรยังค้างสำหรับไฟล์นี้
- ภาพ West อีก 8 ภาพ และ Cyberhell 10 ภาพยังอยู่ในตารางงานค้างตามงบ ImageGen 24 ครั้ง
- การนำภาพ review ไปเลือกใช้บนการ์ดเมื่อแพ้ยังเป็นจุดเชื่อมใน `src/ui.js` ตามหลักฐานข้างต้น

## Contact-sheet

ไฟล์ `contact-sheet.webp` ขนาด 1024 × 3600 พิกเซล แบ่ง 12 แถว แถวละ 2 คู่ แต่ละคู่เรียงต้นฉบับทางซ้ายและ scared ทางขวา อ่านคู่จากซ้ายไปขวาแล้วจากบนลงล่าง ตามลำดับในตารางด้านล่าง ช่องภาพใช้พื้นหลังโปร่งใสและไม่มีป้ายข้อความเพิ่ม

## ต้นฉบับ → ไฟล์ใหม่

ชื่อไฟล์ใหม่ทั้งหมดอยู่ในโฟลเดอร์เดียวกับ README นี้ ขนาดในตารางเป็นขนาดทั้งต้นฉบับและภาพใหม่

| ลำดับคู่ | ไฟล์ต้นฉบับ | ไฟล์ใหม่ | ขนาดพิกเซล |
| --- | --- | --- | --- |
| 1 | `img/Thai/spirit-worker-th-v2.webp` | [spirit-worker-th-v2-scared.webp](spirit-worker-th-v2-scared.webp) | 1254 × 1254 |
| 2 | `img/Thai/spirit-executive-th-v2.webp` | [spirit-executive-th-v2-scared.webp](spirit-executive-th-v2-scared.webp) | 1254 × 1254 |
| 3 | `img/Thai/spirit-officer-th-v2.webp` | [spirit-officer-th-v2-scared.webp](spirit-officer-th-v2-scared.webp) | 1254 × 1254 |
| 4 | `img/Thai/spirit-cleric-th-v2.webp` | [spirit-cleric-th-v2-scared.webp](spirit-cleric-th-v2-scared.webp) | 1145 × 1374 |
| 5 | `img/Thai/spirit-woman-th-v2.webp` | [spirit-woman-th-v2-scared.webp](spirit-woman-th-v2-scared.webp) | 1254 × 1254 |
| 6 | `img/Thai/spirit-clerk-th-v2.webp` | [spirit-clerk-th-v2-scared.webp](spirit-clerk-th-v2-scared.webp) | 1254 × 1254 |
| 7 | `img/Thai/spirit-boy-th-v2.webp` | [spirit-boy-th-v2-scared.webp](spirit-boy-th-v2-scared.webp) | 1254 × 1254 |
| 8 | `img/Thai/spirit-girl-th-v2.webp` | [spirit-girl-th-v2-scared.webp](spirit-girl-th-v2-scared.webp) | 1254 × 1254 |
| 9 | `img/Thai/spirit-business-th-v2.webp` | [spirit-business-th-v2-scared.webp](spirit-business-th-v2-scared.webp) | 1199 × 1312 |
| 10 | `img/Thai/spirit-elder-woman-th-v2.webp` | [spirit-elder-woman-th-v2-scared.webp](spirit-elder-woman-th-v2-scared.webp) | 1145 × 1374 |
| 11 | `img/Thai/spirit-recruit-th-v3.webp` | [spirit-recruit-th-v3-scared.webp](spirit-recruit-th-v3-scared.webp) | 1254 × 1254 |
| 12 | `img/Asia/spirit-worker-asia-v2.webp` | [spirit-worker-asia-v2-scared.webp](spirit-worker-asia-v2-scared.webp) | 1254 × 1254 |
| 13 | `img/Asia/spirit-executive-asia-v2.webp` | [spirit-executive-asia-v2-scared.webp](spirit-executive-asia-v2-scared.webp) | 1254 × 1254 |
| 14 | `img/Asia/spirit-officer-asia-v2.webp` | [spirit-officer-asia-v2-scared.webp](spirit-officer-asia-v2-scared.webp) | 1254 × 1254 |
| 15 | `img/Asia/spirit-cleric-asia-v2.webp` | [spirit-cleric-asia-v2-scared.webp](spirit-cleric-asia-v2-scared.webp) | 1254 × 1254 |
| 16 | `img/Asia/spirit-woman-asia-v2.webp` | [spirit-woman-asia-v2-scared.webp](spirit-woman-asia-v2-scared.webp) | 1254 × 1254 |
| 17 | `img/Asia/spirit-clerk-asia-v2.webp` | [spirit-clerk-asia-v2-scared.webp](spirit-clerk-asia-v2-scared.webp) | 1254 × 1254 |
| 18 | `img/Asia/spirit-boy-asia-v2.webp` | [spirit-boy-asia-v2-scared.webp](spirit-boy-asia-v2-scared.webp) | 1254 × 1254 |
| 19 | `img/Asia/spirit-girl-asia-v2.webp` | [spirit-girl-asia-v2-scared.webp](spirit-girl-asia-v2-scared.webp) | 1254 × 1254 |
| 20 | `img/Asia/spirit-business-asia-v2.webp` | [spirit-business-asia-v2-scared.webp](spirit-business-asia-v2-scared.webp) | 1199 × 1312 |
| 21 | `img/Asia/spirit-elder-woman-asia-v2.webp` | [spirit-elder-woman-asia-v2-scared.webp](spirit-elder-woman-asia-v2-scared.webp) | 1145 × 1374 |
| 22 | `img/West/spirit-worker-west-v2.webp` | [spirit-worker-west-v2-scared.webp](spirit-worker-west-v2-scared.webp) | 1254 × 1254 |
| 23 | `img/West/spirit-executive-west-v2.webp` | [spirit-executive-west-v2-scared.webp](spirit-executive-west-v2-scared.webp) | 1254 × 1254 |
| 24 | `img/West/spirit-officer-west-v2.webp` | [spirit-officer-west-v2-scared.webp](spirit-officer-west-v2-scared.webp) | 1254 × 1254 |

## งานค้างตามลำดับโซน

| ไฟล์ต้นฉบับ | ขนาดพิกเซล |
| --- | --- |
| `img/West/spirit-cleric-west-v2.webp` | 1254 × 1254 |
| `img/West/spirit-woman-west-v2.webp` | 1254 × 1254 |
| `img/West/spirit-clerk-west-v2.webp` | 1254 × 1254 |
| `img/West/spirit-boy-west-v2.webp` | 1254 × 1254 |
| `img/West/spirit-girl-west-v2.webp` | 1254 × 1254 |
| `img/West/spirit-business-west-v2.webp` | 1199 × 1312 |
| `img/West/spirit-elder-woman-west-v2.webp` | 1157 × 1359 |
| `img/West/spirit-graduate-west-v3.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-worker-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-executive-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-officer-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-cleric-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-woman-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-clerk-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-boy-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-girl-cyberhell-v2.webp` | 1254 × 1254 |
| `img/CyberHell/spirit-business-cyberhell-v2.webp` | 1208 × 1302 |
| `img/CyberHell/spirit-elder-woman-cyberhell-v2.webp` | 1145 × 1374 |

## Prompt ที่ใช้

ใช้ ImageGen ในตัว โดยส่งไฟล์ต้นฉบับตามตารางเป็น `referenced_image_paths` ครั้งละหนึ่งภาพ และตั้ง `transparent_background=True` ทุกครั้ง Prompt จริงประกอบด้วยข้อความร่วมต่อไปนี้ ตามด้วยข้อความเฉพาะภาพในตาราง

```text
Use case: precise-object-edit. Edit target: the referenced original AVEGEE spirit artwork. Produce its scared/defeated expression variant for the bottom-right battle profile card. Preserve this exact character's identity, facial structure, age, hairstyle, clothing, accessories, colors, linework, rendering style, body shape, ghost tail, camera, composition, canvas aspect ratio, margins, and placement. Change ONLY facial expression and hands: eyes wide open, mouth open in a startled gasp, a few small sweat drops, hands slightly raised with startled open palms close to the original hand positions. Cute mild fear, suitable for this game. Preserve original framing and all other elements. Keep the character the same scale and center as the original. Genuine transparent background with clean alpha, preserving translucent ghost areas. No text, letters, labels, numbers, border, watermark, or added props. Output a single character asset.
```

| ลำดับคู่ | ข้อความเฉพาะภาพที่ต่อท้าย prompt |
| --- | --- |
| 1 | Original canvas 1254x1254. Keep the cane exactly as in the source, with the holding hand still holding it. |
| 2 | Preserve the elderly man, white Thai jacket, gold buttons, gold chest badge and cane. The hand holding the cane must still hold it. |
| 3 | Preserve the elderly Thai officer, decorated white uniform, gold chains, epaulettes, belt, ceremonial sword/cane and curled ghost tail. The holding hand must retain its prop. |
| 4 | Preserve the elderly bald Thai monk, saffron robe, palm-leaf object and beads. Keep both props in their original hands, using startled fingers around the props. |
| 5 | Preserve the Thai woman, hairstyle, gold floral ornament, white blouse, patterned skirt and book. Keep the book in the same holding hand. |
| 6 | Preserve the Thai young woman, high bun with gold flowers, white blouse, patterned gold skirt and folder. Keep the folder in the same holding hand. |
| 7 | Preserve the Thai schoolboy, short dark hair, white shirt, grey shorts, school badge and backpack. Keep the hand on the backpack strap. |
| 8 | Preserve the Thai schoolgirl, dark hair with white ribbon, white shirt, navy bow and skirt, and backpack. Keep the hand on the backpack strap. |
| 9 | Preserve the heavyset Thai businessman, dark hairstyle, moustache, white jacket, gold necklaces, rings and patterned trousers. |
| 10 | Preserve the elderly Thai woman, grey bun, gold ornaments, yellow-gold clothing and white handkerchief. Keep the handkerchief held. |
| 11 | Preserve the young Thai recruit, buzzcut, olive uniform, pockets, rolled sleeves, worried facial structure and ghost tail. |
| 12 | Preserve the elderly East Asian man, grey topknot with red ribbon, red robe with dark green patterned trim and cane. Keep holding the cane. |
| 13 | Preserve the elderly East Asian man, grey topknot with black and gold cap, red and gold robe, green belt and cane. Keep holding the cane. |
| 14 | Preserve the elderly East Asian official, large black-red-gold ceremonial hat, red and gold embroidered robe and green cane. Keep holding the cane. |
| 15 | Preserve the elderly East Asian cleric, grey hair and beard, green ornament, red-gold-dark robe and the held object. Keep the object held. |
| 16 | Preserve the East Asian adult woman, tall bun, elaborate floral ornaments, red-green-cream robe and folded fan. Keep holding the fan. |
| 17 | Preserve the East Asian young woman, ornamented tall bun, cream-red-green robe, brush and book. Keep both props in the same hands, only adjust fingers around them. |
| 18 | Preserve the East Asian boy, short dark hair, red-green-cream robe and red hanging lantern. Keep holding the lantern. |
| 19 | Preserve the East Asian girl, dark bun with red ribbon and floral ornaments, red-cream robe and green sash. |
| 20 | Preserve the heavyset East Asian businessman, dark topknot, moustache and pointed beard, ornate red-gold robe, green jewelry and belt. |
| 21 | Preserve the elderly East Asian woman, grey bun, gentle facial structure, dark green-gold robe and light handkerchief. Keep holding the handkerchief. |
| 22 | Preserve the elderly Western man, grey swept-back hair, navy fur-collared coat, scarf, cane and curled translucent tail. Keep holding the cane. |
| 23 | Preserve the elderly Western gentleman, grey swept-back hair, navy suit, tie, gold watch chain and cane. Keep holding the cane. |
| 24 | Preserve the elderly Western officer, swept-back grey hair, navy uniform with fur collar, epaulettes, medals, blue sash, gold belt, ceremonial cane and translucent curled ghost tail. Keep holding the cane. |

## ตรวจตนเองตามเกณฑ์

- หาไฟล์ที่ใช้จริงแล้ว มีหลักฐานจากจุดวาดการ์ดและตัว resolver ส่วนรายงาน Toby ที่ระบุใน brief ขาดจาก worktree
- ส่งภาพ scared 24 ไฟล์ตามงบ จากทั้งหมด 42 ต้นฉบับ พร้อมรายชื่อ 18 ภาพที่ค้าง
- ส่งออกชื่อไฟล์เดิมต่อท้าย `-scared.webp` พร้อม alpha และการบันทึกแบบ lossless ขนาดตรงต้นฉบับทั้ง 24 คู่
- ตั้งข้อกำหนดตาโต ปากอ้า เหงื่อ ความตกใจระดับอ่อน และรักษาตัวละคร/องค์ประกอบใน prompt การรับรองด้านภาพยังรอผู้รีวิว
- เกณฑ์ห้ามตัวอักษรมีข้อค้างที่ business Asia ตามรายละเอียดข้างต้น
- ลำดับ TH → Asia → West → Cyberhell ใช้ ImageGen 24/24 ครั้ง และ retry 0/2 ครั้ง
- มี contact-sheet แบบต้นฉบับคู่ scared และ README ภาษาไทยพร้อม mapping ครบ 24 คู่
