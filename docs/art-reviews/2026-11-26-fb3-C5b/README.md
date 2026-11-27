# FB3-C5b ปรับภาพคัตซีนโซน 2–3

ส่งภาพใหม่ **7/7 ภาพ** ใช้ ImageGen ในตัว 7 ครั้ง ภาพเดิมอยู่ฝั่งซ้ายพร้อมแถบดำตามต้นฉบับ ภาพใหม่อยู่ฝั่งขวา [compare.jpg](compare.jpg)

ใช้ภาพเดิมคุมจังหวะและองค์ประกอบ ใช้ภาพของขุนแผน ตะเกียงสีดา และประตูกวนอูคุมเส้นคม สัดส่วน chibi แสงอุ่น และรายละเอียดฉาก ใช้ภาพชุดและบอสประจำโซน 2–3 คุมสีผิว เขา หมวก ลายผ้าและเกราะ แล้วให้ ImageGen วาดเต็มกรอบ 16:9 ตามเหตุการณ์ในตาราง โดยเว้นข้อความและ UI ออกจากภาพ

ขนาดไฟล์คิดที่ 1 KB = 1,000 ไบต์ เทียบกับไฟล์เดิมจาก HEAD เพดานของภาพใหม่แต่ละไฟล์คือค่าที่ต่ำกว่าระหว่าง 450 KB กับ 115% ของขนาดเดิม

| ไฟล์ | พิกเซล เดิม → ใหม่ | KB เดิม → ใหม่ | เปลี่ยน | รายละเอียด |
| --- | --- | ---: | ---: | --- |
| `img/story-asia-01.webp` | 1280×720 → 1672×941 | 189.68 → 217.98 | +14.92% | เหลียนกังเหวี่ยงตราโซ่ในจังหวะที่ยมบาทน้อยเผลอ นิราอยู่ด้านขวา |
| `img/story-asia-02.webp` | 1280×715 → 1672×941 | 215.71 → 246.91 | +14.46% | นิราก้าวเข้าขวางพลังสีฟ้าและรับแรงโจมตีแทนยมบาทน้อย |
| `img/story-asia-03.webp` | 1664×936 → 1672×941 | 481.38 → 435.41 | -9.55% | ยมบาทน้อยลุกขึ้นบังนิรา ขณะพลัง Rage ปะทุรอบตัว |
| `img/story-asia-04.webp` | 1024×1024 → 1672×941 | 197.37 → 226.51 | +14.76% | ยมบาทน้อยพุ่งชนเกราะเหลียนกังด้วย Rage ปีศาจสองตนล้มอยู่ข้างลาน |
| `img/story-asia-05-v2.webp` | 1280×720 → 1672×941 | 194.91 → 223.93 | +14.89% | ยมบาทน้อยนำชามาเยี่ยมนิราที่พักฟื้นในศาลา ใช้ภาพเดียวกับหน้าต่างเยี่ยมนิรา |
| `img/story-west-01.webp` | 1280×715 → 1672×941 | 201.64 → 229.78 | +13.96% | เซเวอรินคุกเข่ายอมรับชัยชนะของยมบาทน้อยท่ามกลางลานน้ำแข็ง |
| `img/story-west-02.webp` | 1280×720 → 1672×941 | 239.75 → 272.12 | +13.50% | เกล็ดน้ำแข็งรวมตัวเหนือฝ่ามือยมบาทน้อย โดยมีเซเวอรินยืนมอง |

ขนาดรวมคัตซีนชุดนี้ 1,720.45 → 1,852.65 KB

## งานครอปที่ต้องทำตอนนำภาพเข้าเกม

ลบค่าครอปเดิมของไฟล์ด้านล่างออกจาก `CONTENT_ROWS` เพื่อให้คัตซีนแสดงครบทั้งเฟรม 1672×941 [src/cutscene-presentation.js](../../../src/cutscene-presentation.js#L5)

- `story-asia-01.webp` `[123,595]`
- `story-asia-02.webp` `[100,615]`
- `story-asia-04.webp` `[222,802]`
- `story-asia-05-v2.webp` `[112,594]`
- `story-west-01.webp` `[118,594]`
- `story-west-02.webp` `[102,620]`

`story-asia-03.webp` ใช้ขนาดเต็มตามค่าเริ่มต้นอยู่แล้ว

`story-asia-05-v2.webp` ยังถูกโหลดตรงจากหน้าต่างเยี่ยมนิราที่ศาลาน้ำชา จึงใช้ภาพใหม่เต็มกรอบในหน้าต่างนั้นด้วย

ชุดนี้เป็นงานภาพ การลบค่าครอป 6 รายการเป็นงานติดตามในโค้ด

<details>
<summary>พรอมป์ ImageGen ที่ใช้วาดภาพ</summary>

แต่ละคำขอใช้พรอมป์ร่วม ตามด้วยรายละเอียดชุดประจำโซนและเหตุการณ์ของภาพนั้น

**พรอมป์ร่วมทั้ง 7 ภาพ**

> Redraw this original AVEGEE story cutscene as one finished high-detail chibi anime game illustration. Image 1 is the old panel, for screen direction, location, cast, action and staging. Ignore any old black borders and pixel rendering. Image 2 is the visual target: match all three current AVEGEE scenes in crisp hand-inked contours, engaging expressive big eyes, super-deformed character proportions, fine embroidery and ornament, rich painterly environments, warmly lit cinematic anime cel shading, clean silhouettes and grounded scale. Image 3 is the character/costume reference sheet; follow only character costume/identity, ignore the labels, multiple sprite poses, image backgrounds and the fire attack in that reference. Keep the panel's faithful game character designs. Render as one single horizontal 16:9 illustration edge to edge; the art touches all four edges, no letterbox, no framing, no gutters, no text or UI, no pixels or brush block mosaic, no photorealism, no gore. Reserve 4% safe space for an aspect ratio trim.

**ฉากและชุดโซน 2**

> Yama is a red-skinned small chibi demon with exactly two short red forehead horns and pointy ears, wearing an upright black East Asian judge cap with gold piping and black-and-gold crosspin and a dark red embroidered golden-flower robe with navy lining and loose navy trousers. Nira is a small lavender-skinned demon woman, pointed ears, short pale horn pair, gray-lilac hair in a single round high bun, an indigo East Asian robe with delicate gold blossoms and red inner fabric. Lian Kang wears teal-black lamellar armor with red piping, a dark tall cap and bronze circular seals, with a square talisman weight on a chain. The cavern is the East Asian underworld court in the old scene, glowing orange lava channels and lanterns, red maple leaves, Chinese gates, cool teal mineral cave silhouettes and a distant throne.

**ฉากและชุดโซน 3**

> Yama is the chibi red-skinned demon boy in the Zone 3 design: two small crimson forehead horns, rounded bronze Norse helmet with two larger curved tan horns, green quilted tunic with red/gold edging, wide leather belt, fluffy ivory-gray fur cape, brown leather boots. Severin is the much larger red-maroon-skinned demon lord with gruff gray beard, cyan eyes, dark silver engraved plate armor and glowing cyan chest runes, tall ridged bronze-black crown with blue jewel and wine-red cape. Preserve the West ice court from the old image: snowy Gothic ruins, crystalline cave, slate causeway and throne stairs. Warm amber lanterns and cutscene-style reflected gold rim light balance the ice blue.

**`story-asia-01.webp`**

> Beat: the exhausted but cunning Lian Kang on the left behind Yama springs a surprise finishing move. Lian Kang's chained square talisman sweeps in from the left with strong electric-blue spirit flames, the chain drawn taut and readable. Center foreground Yama is startled mid-turn, still vulnerable, with gaze toward the threat and hand lifted too late. Nira is to his right, alarmed and beginning to react, she has yet to make contact. Wide three-character shot with eye-level foreground staging like the old image. Pose each character with their own distinct silhouette.

**`story-asia-02.webp`**

> Beat: from the right, Lian Kang attacks with the chained talisman and sends a vivid ghostly blue wave converging on Nira in the foreground. Nira has just leapt across the attack line and is on one knee taking the blow in the shoulder, eyes squeezed shut and clutching her shoulder, shielding a startled Yama immediately behind her to the left. Pages from Nira's records fly around the impact. Show Nira is hurt through posture and expression without wounds or blood. Show Yama looking at her with concern. Match the old image's foreground pair and distant Lian Kang on the right.

**`story-asia-03.webp`**

> Beat: Yama's Rage awakens. The small hero is rising into a protective crouched stance with fists clenched in the left-center foreground, looking resolutely toward the threat ahead. Nira, her eyes closed and shoulder injured, is low on the ground just behind him to the right, propped up on her hands. His supernaturally red-orange Rage takes the shape of curling arcs and glassy embers around his body, with cracking incandescent basalt beneath his feet. No fireball in his hands. Wide shot with both characters and the old rocky court perspective. Only these two characters.

**`story-asia-04.webp`**

> Beat: Yama dashes from the left and lands his decisive Rage strike on Lian Kang on the right, along the old image's screen direction. Show small clearly visible Yama in a high-speed low lunge, pressing his leading palm against the chest armor with a tight fiery contact spark and a red-orange ribbon of Rage curling around his moving body. Lian Kang is knocked backwards and drops to a knee, one open hand flared and chained talisman fallen onto the floor. Two already defeated lesser demons lie separately on the left and right sides of the midground, discernible but secondary. Match the cool teal rock and warmly lit lava court. Yama's red face, embroidered judge robe and upright black cap remain readable. No Nira in this panel.

**`story-asia-05-v2.webp`**

> Beat: a gentle visit in the tea pavilion. Nira at left is awake, sitting up among burgundy floral bedding, a clean small cream cloth wrap on her forearm, her shoulders relaxed, and Yama sits close on her right with a small cup of tea and a concerned, reassuring expression. Stacked paper case files on the low wooden table at left and rich gold floral stitching on her indigo robe. Both look at each other. A red pavilion post frames them, with lantern light and red maple leaves. To the right in the background through the open pavilion are cave formations, a lantern-lit bridge, tea garden water and the distant underworld gate. Medium-wide with clear faces for the tea-pavilion modal thumbnail. No spirit attack and no boss.

**`story-west-01.webp`**

> Beat: after his loss, Severin kneels with one knee on the ice path on the left; he sincerely accepts Yama's victory and his right to govern, looking toward him, with his open empty armored palm extended downward in a peaceful gesture. Yama stands on the right facing him, listening with calm composure, clearly dwarfed by the boss. Background snow-covered throne steps between them, defeated armored followers low in the outside foreground corners as in the old scene. Peaceful warmth on their faces amid a winter palette. This panel's focus is the concession; no energy blast, no floating magic crystal.

**`story-west-02.webp`**

> Beat: ice power coalesces now in little Yama's upturned open palm. Foreground Yama in the center, framed waist-up to three quarters with his face and both hands within the frame, gazes with gentle surprise at a small luminous blue-white icy snowflake crystal forming just above his fingers. A short, subtle spiral of tiny frosty particles follows into it. Severin in the left midground watches quietly with a concession and mentoring expression, hands lowered. Preserve the snow-covered stairs, Gothic arches, frozen water and two warm lanterns in the old scene. The palm, ice, and Yama's face are the focal points. No weapon, no fire, no other characters.

</details>
