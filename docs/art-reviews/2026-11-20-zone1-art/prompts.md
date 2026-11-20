# บันทึก ImageGen ในตัว

เรียงตามการเรียกจริง รวม 9 ครั้ง ภาพแต่ละรอบแนบด้วย `referenced_image_paths` ชื่อผลลัพธ์ด้านล่างใช้ระบุภาพอ้างอิงระหว่างรอบ ไม่ใช่ชื่อไฟล์ที่เกมโหลด ไฟล์ส่งออกสุดท้ายใช้ชื่อตาม README เท่านั้น

## 1 — e2 รอบแรก

ภาพแนบ: `img/z1-events/cut-hanuman-yields-th.webp`, `img/yama-animation-v1/th/sword-idle.webp` · พื้นหลังไม่โปร่งใส

```text
Use case: illustration-story. Redraw this Thai fantasy game cutscene, wide 1672x941 target, no text or watermarks. Image 1 is scene/style reference; image 2 is mandatory Zone 1 Yama costume reference (sprite sheet: use a single character, NOT sword pose). Keep the red-and-gold judicial throne hall of image 1, red/gold stairs and red throne, two gold fire braziers flanking hall, ceiling sunbeams, circular red-gold floor motif. Exactly four characters LEFT TO RIGHT: (1) Yama far left, RED skin, Thai pointed GOLD CROWN as sprite 2, dark red and BLACK robe with GOLD trim, NO floral kimono, NO tall black Japanese hat, no sakura; standing 3/4 facing right, calm slightly surprised, both hands holding a closed ledger against chest, NO sword. (2) Nira behind the ornate desk/podium, purple skin, small horns, purple hair bun, black robe with gold trim, hands clasped low. (3) Sita ahead of Nira one step forward, white-gold Thai dress, small gold crown, calm determined, her RIGHT hand lifted shoulder height palm facing Hanuman in a gentle STOP gesture. (4) Hanuman far RIGHT, white monkey fur, gold crown, red/gold Thai armor, curled WHITE tail; facing left toward Yama, head BOWED LOW, eyes CLOSED, ears DROOPED, palms pressed together at chest in a clearly apologetic respectful Thai wai. Hanuman has empty hands, absolutely no fighting stance. Match the reference's rich detailed polished chibi illustration, warm fire glow. Keep all four full figures visible and clearly separate. No other characters. No writing anywhere including ledger.
```

## 2 — e2 แก้แขนขวา/ระดับมือไหว้/เขานิรา

ภาพแนบ: ผลรอบ 1, sprite ยามาโซน 1 · พื้นหลังไม่โปร่งใส

```text
Precise-object-edit of image 1. Keep composition, background, four character identities, costumes, colors, rendering and their positions exactly. Image 2 is mandatory Zone 1 Yama costume reference, keep Yama as currently correct. Make just these corrections: Sita must raise HER ANATOMICAL RIGHT HAND (the arm attached to her shoulder on the viewer's LEFT side) across her body toward Hanuman, palm outward at shoulder height; her anatomical LEFT arm (viewer right shoulder) should hang lowered gently. Make the hand gesture anatomically clear with correct shoulders/elbows: right arm crosses in front of her white-gold dress and extends toward Hanuman on image right, not from the image-right shoulder. Hanuman keeps low bowed head closed eyes drooping ears but LOWER his pressed-together palms to his CHEST / sternum, away from mouth, clear humble wai. Give Nira two subtle small purple horn tips visible beside the hairline. Keep everything else exactly unchanged. No lettering or watermarks. Wide 1672x941.
```

## 3 — e3 เปลี่ยนชุดยามา

ภาพแนบ: `img/z1-events/cut-sita-phantom-ledger-th.webp`, sprite ยามาโซน 1 · พื้นหลังไม่โปร่งใส

```text
Use case: precise-object-edit. Edit IMAGE 1 with one localized change only: replace Yama's COSTUME in the bottom-left corner using the Zone 1 Yama sprite reference IMAGE 2. Keep his original red face, small horns, expression, exact body pose, position and size: hand against chin, furrowed worried brows, slightly clenched visible teeth, leaning down looking at the ink trail, other hand on desk. Replace the tall black Japanese hat with a pointed THAI GOLD CROWN from sprite reference. Replace floral sakura kimono with dark RED and BLACK robe with bold GOLD trim matching sprite 2. No flowers on Yama, no kimono, no sword. Every other object and character must remain EXACTLY the same as image 1: enormous open ledger on podium occupies foreground, same black winding ink line ending at the same glowing red circular seal, Nira pointing at precisely the same ink trail with same pose/finger/face/purple bun and horns, Sita and Hanuman standing in background at the same location, throne/stairs/fire/light all preserved. This is a surgical wardrobe correction, NOT a new composition. NO letters, numbers, legible writing, text or watermark anywhere; preserve abstract ink marks. Wide illustration output 1672x941.
```

## 4 — ฉากตะเกียง

ภาพแนบ: `img/z1-events/cut-sita-lamp-th.webp`, ผล e2 รอบ 2, sprite ยามาโซน 1 · พื้นหลังไม่โปร่งใส

```text
Use case: illustration-story. Create replacement Thai fantasy game cutscene 1672x941 landscape. Reference image 1 is original scene, image 2 established corrected hall/character design, image 3 mandatory Zone 1 Yama costume reference. Use the SAME red/gold judgment hall, stairway, red throne, gold fire braziers left and right, ceiling beams, glossy circular red-gold floor design. Four characters only, NO RAMA. On the LEFT stand Yama and Nira watching respectfully with calm reverence. Yama RED skin, small red horns, pointed THAI GOLD crown exactly sprite 3, BLACK and dark RED robe with gold trim, hands holding closed ledger near chest. NO sakura or kimono or black Japanese hat, no sword. Nira purple skin small horns purple hair bun black-gold outfit hands respectfully clasped. At center-right Sita in white-gold Thai dress and small gold crown, standing and extending BOTH hands forward supporting a SMALL GOLD THAI oil lamp: shallow lotus-petal pedestal bowl, single CENTRAL wick, delicate curved carrying handle, no spout. On far right Hanuman, WHITE fur, gold crown red-gold Thai armor curled white tail, KNEELING ON ONE KNEE facing left toward Sita, palms pressed together ABOVE THE LAMP'S CENTRAL WICK. A thin graceful GOLDEN FLAME flows DOWNWARD from between his pressed palms directly into the wick. The flame and lamp are focal point; maintain clear anatomy, both hands of Sita visible supporting bowl, Hanuman hands above wick without touching Sita's hands. Rich polished chibi fantasy illustration matching references. No Aladdin lamp, no spout, no smoke jet, no extra characters. No lettering, no text, no watermarks.
```

## 5 — ไอคอนตะเกียงดับ

ภาพแนบ: ผลฉากตะเกียงรอบ 4, `img/ui/icon-defend-shield.webp` · โปร่งใส

```text
Use case: stylized-concept. Single game inventory ICON, target square 512x512 RGBA true TRANSPARENT background. Reference 1: extract/reinterpret ONLY the small gold THAI lotus pedestal oil lamp held by Sita in the scene, no characters or scene. Reference 2: match crisp gold fantasy UI material rendering and readable silhouette. The lamp is a small shallow circular gold oil bowl on an ornate layered LOTUS PETAL pedestal, with a slender semicircular CURVED CARRYING HANDLE arching above, attached symmetrically to the two sides of bowl. A single small dark unlit wick at the CENTER of the bowl. Version UNLIT: NO FLAME at all, no glow, no smoke. No spout, not an Aladdin/genie lamp, no teapot shape. Front three-quarter view, fully contained centered object, comfortable transparent padding, polished gold and amber, clean readable silhouette, no floor, no shadow backdrop. No letters, text, runes, watermark, borders or extra objects. Real transparent alpha around object and inside handle opening.
```

## 6 — ไอคอนตะเกียงติด

ภาพแนบ: ผลไอคอนดับรอบ 5 · โปร่งใส

```text
Use case: precise-object-edit. Create LIT variant of this exact gold Thai lotus-pedestal oil lamp inventory icon. Keep the lamp design, scale, silhouette, handle, pedestal, bowl, framing and transparent background exactly unchanged. Add just ONE small steady upright GOLDEN FLAME on the CENTRAL wick inside the curved handle arch. Flame clean teardrop golden yellow with a pale warm core, subtle local light on bowl. NO smoke, NO stream or jet, no genies, no other objects, no text or watermark. Transparent alpha everywhere outside lamp/flame and inside handle arch. Square 512x512 target RGBA.
```

## 7 — ปุ่มเรียก

ภาพแนบ: `img/ui/power-heal-lotus.webp`, `img/ui/icon-defend-shield.webp`, ผลไอคอนติดรอบ 6 · โปร่งใส

```text
Use case: stylized-concept. Create one square 512x512 RGBA game COMMAND icon, true transparent background outside a CIRCULAR FRAME. Reference 1 is an existing circular command icon from the game: use same straightforward centered composition, clear single readable emblem, softly shaded muted green circular field, generous padding, no words. Reference 2 supports existing game's gold UI metal finish. Reference 3 shows the actual gold Thai lamp design to depict. Inside a simple polished GOLD CIRCULAR RIM with muted dark green circular field: an OPEN UPWARD FACING PALM at bottom, above palm levitates the SMALL GOLD THAI LOTUS PEDESTAL OIL LAMP with curved arch HANDLE and ONE steady GOLD FLAME on central wick. Clearly visible small air gap between palm and lamp to communicate summoning. Reduce tiny ornament so symbol reads at game button size. Lamp must have lotus bowl and central wick, NO pouring spout, no genie/Aladdin teapot, NO smoke or smoke trail, no extra hands. Elegant warm ivory hand; gold lamp, gold frame. Fully contained circle with transparent corners, crisp edges. No text, no letters, numbers, runes, watermark or label.
```

## 8 — ต้นทอง

ภาพแนบ: `img/theme-v4/town-tree-th-v1.webp`, `img/map-zone1/v7r/sprites/pilot-gold-tree-00.webp` · โปร่งใส

```text
Use case: precise-object-edit. Create GOLDEN version of the Thai BANYAN TREE game scenery sprite in IMAGE 1, target 1199x1312 RGBA true transparent. Image 1 is strict geometry/camera/silhouette reference. Image 2 is supporting warm canopy/tree palette used in the same map. Keep the SAME massive banyan tree, same front three-quarter view, broad triangular tiered canopy, same twisted multi-trunk structure and thick exposed roots at bottom, same many long HANGING AERIAL ROOTS descending from branches on left, middle and right, same framing and proportion filling the portrait frame. Change foliage color from green to luminous rich GOLD and AMBER YELLOW, golden ochre shadows, warm honey leaves and pale gold sunlit tips, abundant dense clearly shaped gold leaves on all canopy tiers, matching a Thai heavenly gate district. Keep bark natural warm brown with golden warm light. Do not add any scenery, people, buildings, props or base platform. NO SNOW, no white coating, no frost, no winter, no white glitter piles. No letters, symbols, text or watermark. Preserve generous transparent holes between aerial roots/branches and fully transparent outside tree. Detailed painterly game cutout matching image 1's established rendering. Do not substitute a bonsai or a different tree shape. Entire trunk roots and canopy contained within same frame.
```

## 9 — e2 แก้หูตก (ฉบับส่งออก)

หลังทำรายการ 1–5 ครบแล้ว ทบทวนภาพและแก้รายละเอียดหูหนุมานใน e2 โดยแนบผล e2 รอบ 2 และ sprite ยามาโซน 1 · พื้นหลังไม่โปร่งใส

```text
Use case: precise-object-edit. IMAGE 1 is the edit target. IMAGE 2 is mandatory Zone 1 Yama reference; keep Yama exactly as in image 1, no costume changes. Change ONLY Hanuman's visible EAR at image right: his monkey ear currently points upward; make it visibly DROOP DOWNWARD, relaxed folded down alongside his cheek, the tip hanging down, to reinforce humble apology. Keep Hanuman's gold crown, white fur, closed eyes, deeply bowed head and chest-level pressed palms EXACTLY unchanged. Keep every other detail including Yama holding ledger, Nira horns and clasped hands, Sita's RIGHT arm crossing body with palm-out STOP gesture, all positions, poses, hall, throne, fire, floor, lighting and framing unchanged. No writing, text, letters or watermark. Output same wide 1672x941.
```
