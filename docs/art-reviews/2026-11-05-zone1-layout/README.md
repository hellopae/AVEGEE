# AVEGEE โซน 1 · ผังใหม่ของคุณเป้ → ฉากแยกชั้น (Z1-LAYOUT-A)

ขั้น "ตรวจตำแหน่ง" ก่อนทำ walkmask/collision/ต่อเข้าเกม (รอบ B) · ยังไม่ได้แตะ `src/`, ไม่ใช่การเดินในเกมจริง

## ได้อะไร
- **`layout.json`** — วัตถุ **93 ชิ้น** พิกัดบนภาพ `ok.jpg` (2500×1758): id, source (ไฟล์ AI + Im), `sourceFile` (PNG ต้นฉบับของคุณเป้), sprite, x/y/w/h, matrix (sprite px → ok px), flipX, rotationDeg, clip, authorOrder, footY, category, area
  + `baseLayerExtras` เมฆ 3 ก้อน (ไม่นับเป็นวัตถุ) + `excludedNotInOk` + `exactDuplicatesDropped`
- **`sprites/`** — 43 ไฟล์ WebP RGBA (3.5 MB) ตัดขอบโปร่งใส ด้านยาว ≤ 2× ขนาดที่วางจริง ไม่ upscale · พิกเซลมาจาก **PNG ต้นฉบับ** `New Pic Map Zone1` (จับคู่ด้วยขนาด+thumbnail 48×48 ทุกชิ้นผ่าน ต่างสุด 9.6 vs อันดับสองอย่างน้อย 32) ใช้ AI เฉพาะตำแหน่ง/flip/clip · เสาไฟ 3 ต้นมาจาก layer PSD โดยตรง (`sourceFile: null`)
- **`terrain/` + `terrain-registration.json`** — ไฟล์ terrain-seamless ของ Codex เฉพาะที่ใช้ (20 tile, ฟ้า, ภูเขา, ลาวา, แม่น้ำ, น้ำตก — ไม่คัดลอก flows 12 เฟรม) + เมทริกซ์ลงทะเบียนเข้ากรอบ ok
- **`proof-composite.jpg`** (ฟ้า→ภูเขา→เมฆ→ของเหลว→พื้น→วัตถุตาม authorOrder, 1250 กว้าง), **`proof-diff.jpg`** (heatmap), `proof-terrain-only.jpg`
- **`object-check.json`**, **`art-gaps.md`** (+ `gap-candidates.json`, `gap-crops/`), `base-layers-reference.json`
- **`index.html`** — หน้า review: ภาพ ok.jpg / ฉากประกอบ / ซ้อนทับ (slider), เปิด-ปิดชั้นฉากและกลุ่มวัตถุ, กรอบวัตถุทั้งหมด, แตะวัตถุดู id+พิกัด · หลักฐาน `evidence/` + `browser-review.json`

## จำนวนวัตถุ
ดิบใน AI: 3.ai = 46, 4.ai = 37, 5.ai = 20 (รวม 103; ไม่นับชั้นฐาน Im0–Im10) + เสาไฟ PSD 3 → 106
หักซ้ำ 7 (ภาพเดียวกันตำแหน่งเดียวกัน ≤ 6 px), หักสำเนาที่คุณเป้ย้ายระหว่างไฟล์ 4 (เก็บตัวที่ตรง ok.jpg), หักที่ไม่มีใน ok.jpg 2 (`exclusions.json`) = **93**

| ไฟล์ที่ถูกเก็บ | 3.ai | 4.ai | 5.ai | PSD เสาไฟ |
|---|---|---|---|---|
| วัตถุ | 36 | 35 | 19 | 3 |

| หมวด | tree | shrub | building | station | other | fence | lamp | gate | dock |
|---|---|---|---|---|---|---|---|---|---|
| จำนวน | 54 | 14 | 6 | 6 | 4 | 3 | 3 | 2 | 1 |

| พื้นที่ | plaza | lava | bottom | ice | upper |
|---|---|---|---|---|---|
| จำนวน | 25 | 22 | 18 | 15 | 13 |

หมวดตั้งด้วยตาจาก contact sheet (`categories.json`) · area คำนวณจากกฎตำแหน่งใน `area_of()` (footY>1300 = bottom, footY<700 และ x 640–1580 = upper, x<700 = lava, x>1780 = ice, ที่เหลือ plaza) — ขอบเขตเป็นการประมาณ

## ค่าคลาดเคลื่อน (วัดกับ ok.jpg จริง)
- Normalize ด้วย `/Im7` อย่างเดียว แล้วพบว่าแต่ละไฟล์ AI เหลือคลาดคงที่ต่อไฟล์ (3.ai ≈ 1.3 px, 4.ai ≈ 1.9 px, 5.ai ≈ 1 px + สเกลแกน x −0.14% เพราะคุณเป้วาง 5.ai ใน PSD กว้าง 2497 px) → ฟิตส่วนต่างเป็น translation+สเกลแกนต่อไฟล์ใน `registration-correction.json` (วัดจากวัตถุที่ไม่ซ้ำ 71 ชิ้น) แล้วใช้ตอนสร้าง layout
- หลังแก้: วัตถุ 93 ชิ้น เลื่อนเทียบ ok.jpg **มัธยฐาน 0.32 px, p90 0.77 px, สูงสุด 0.96 px** (≤ 1 px ทุกชิ้น, ≤ 3 px ทุกชิ้น) · เสาไฟ PSD เลื่อน 0.0 px · ไม่มีชิ้นถูกแฟล็ก
- วิธีวัด: เรนเดอร์ทีละชิ้น แล้ว template match (masked SQDIFF, ±14 px, sub-pixel) กับ ok.jpg เฉพาะพิกเซลที่ชิ้นนั้นอยู่บนสุด → `object-check.json` (ค่าต่างสีเฉลี่ย median 11.3 = ผลปรับสีของ ok.jpg ไม่ใช่ตำแหน่ง)
- Terrain-seamless: similarity transform (scale 1.086775, หมุน 0.011°, ตรงกับ 2500/2300 = 1.0870) จาก SIFT 637 จุดตรง (inliers) ความคลาดเฉลี่ย 0.79 px, มัธยฐาน 0.60, p95 1.85, สูงสุด 2.9 px · ทุกช่อง 3×3 มีจุดตรงและมัธยฐาน ≤ 1.9 px

## ที่ตัดสินใจเอง (ตรวจได้)
- สำเนา 3.ai↔4.ai ที่คุณเป้ขยับ/ย่อ (4 ชิ้น: 3.ai Im12/13/16/18 vs 4.ai Im27/47/32/22) เก็บชิ้นที่ตรง ok.jpg กว่า (diff 17–23 vs 40–50) · รายละเอียดใน `conflictResolved`
- **ตัดออก 2 ชิ้นที่ไม่อยู่ใน ok.jpg** (`exclusions.json`): 4.ai Im20 (ต้นสนซ้ำ ที่ 5.ai Im17 ย้ายไปแล้ว) และ 4.ai Im21 (พุ่ม) — ใน ok.jpg ตำแหน่งนั้นไม่มี (diff 46–51, best match ห่าง 22–52 px) · ถ้าคุณเป้ต้องการให้อยู่ ลบรายการใน exclusions.json แล้วรัน run-zone1-layout.sh ใหม่
- authorOrder ข้ามไฟล์: ใช้ลำดับไฟล์ 3 → 4 → 5 → PSD แล้วตามลำดับใน content stream ของแต่ละไฟล์ (ข้ามไฟล์ไม่มีข้อมูลลำดับจริง) — หน้า review วาดตามนี้ และตรงกับ ok.jpg ในจุดที่ซ้อนกัน (ดู diff)
- วัตถุ 3 ชิ้นเอียง (−1.43°, −1.43°, −3.34°: z1-022 และ z1-027 = ราว balustrade, z1-035 = รั้วไม้) 26 ชิ้นกลับซ้าย-ขวา · 9 ชิ้นถูกตัดขอบตามกรอบ ok (clip ฝังใน sprite และเก็บใน layout.json)

## วิธีรันซ้ำ
```
cd <worktree>
PYTHONPATH=/private/tmp/avegee-pdf-lib ./scripts/run-zone1-layout.sh      # pypdf อยู่ที่นั่น หรือ pip install pypdf
cd docs/art-reviews/2026-11-05-zone1-layout && python3 -m http.server 8931 --bind 127.0.0.1
python3 scripts/verify-zone1-layout-review.py 8931                         # Playwright desktop + 390px
```
เปิด http://127.0.0.1:8931/index.html · เปิดจาก file:// ไม่ได้ (ใช้ fetch)
ต้องมี: python3, numpy, opencv-python, Pillow, pypdf, playwright · ไฟล์ต้นทางอ่านอย่างเดียว ไม่เขียนทับ

## ยังไม่ได้ทำ (รอบ B)
walkmask/collision/navmesh, ต่อเข้าเกม, ระบบ depth runtime, รายการ gap ของเหลว/ภูเขาตาม `art-gaps.md` (รอตัดสิน), เทียบ sprite ที่หมวด `other` กับ footprint จริง
