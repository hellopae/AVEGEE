# Z1-V5-FLUIDS — ชั้นเฟรมวาดของเหลวบนแผนที่ v5

ส่งงานวาดและชุดตรวจวันที่ 5 พ.ย. 2569 ใช้ **built-in ImageGen 6 ครั้งจากเพดาน 12 ครั้ง** ไม่ใช้ Shado ไม่มี DOF, parallax, bloom หรือการปรับสีทั้งภาพ เปลี่ยนเฉพาะโฟลเดอร์ review นี้ ไม่มีการประกอบในเกมหรือรับรอง QA

## วาดแล้ว

- `master-v5.webp` ประกอบจาก tile v5 เดิม 20 ภาพ เก็บ lossless; ตรวจเทียบกับพิกเซลที่ decode จากต้นฉบับทุก tile
- `masks/` มี 6 ช่อง: `lava`, `lavafall`, `spirit-river`, `ice-stream`, `waterfall`, `fog` ช่องละ PNG 1× **4915×3277** และ 2× **9830×6554**
- `regions.json` มี 39 บริเวณ: ลาวาผิว 6, ลาวาตก 8, แม่น้ำม่วง 2, ลำธารฟ้า 5, น้ำตกฟ้า 11, หมอกหุบ 7 พร้อม polygonWorld, รูปทรงย่อย/ช่องว่าง, flowDir และ rectWorld; PNG เป็นขอบเขตหลัก ส่วน polygon ลดจุดด้วยระยะคลาดเคลื่อนไม่เกิน 1 source pixel
- `sheets/` มี 25 sheets: ชิ้นใหม่ 23 sheets และใช้ซ้ำเฉพาะ `spirit-river`, `lava-surface` จาก FX-ART-Z1 ซึ่งปรากฏในพรีวิวจริง
- ชิ้นใหม่ประกอบด้วย ice-stream 1, น้ำตกฟ้าตาม mask 11 จุด, ลาวาตกตาม mask 8 จุด, fog-bank สำหรับหุบ 1 ชุดที่ใช้ใน 7 บริเวณ, ฟองตลิ่งม่วง/ฟ้า 2 ชุด ทุก sheet มี 8 เฟรม ความละเอียดส่งออก **≥2.56 px/world unit**
- น้ำตกแต่ละจุดใช้เฟรมวาดต้นแบบของชนิดนั้นร่วมกัน แล้วตัดด้วยรูปทรงของแต่ละจุด ไม่ได้อ้างว่า ImageGen วาดน้ำตกใหม่ 19 ครั้ง
- `fx-layout.json` มี 46 ตำแหน่ง แต่ละชิ้นมี regionId, mask, sheet/frame dimensions, fps, blend และ rectWorld หรือ tileInRegion

โลกขนาด 3840×2560; สเกลจริงคือ 4915/3840 และ 3277/2560 ซึ่งต่างจากค่า nominal 1.28 เล็กน้อย น้ำตกจึงปัดขนาดเฟรมขึ้นตาม world units เพื่อไม่ต่ำกว่าเกณฑ์ 2.56 แนวนอน

## วิธีเล่นและขอบเขต

เปิด `index.html` ผ่าน HTTP ภายในเครื่องจากราก repo:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

ไปที่ `http://127.0.0.1:8765/docs/art-reviews/2026-11-05-z1-v5-fluids/` มีปุ่ม 3 มุม/ทั้งแผนที่ เล่น–หยุด เปิด–ปิด 6 ชั้น ลากเลื่อน และหมุนล้อซูม การโหลด JSON ต้องใช้ HTTP

ทุกตำแหน่งอยู่คงที่ เวลาใช้เลือก **เฟรมที่วาดคนละเฟรม** เท่านั้น ไม่เลื่อน ไม่เฟดภาพนิ่ง ไม่มี temporal interpolation หรือสร้าง in-between ด้วยโค้ด ค่า opacity คงที่ ไม่เปลี่ยนตามเวลา `scrollDir` เป็น metadata ทิศไหลสำหรับผู้ประกอบเกม และ `scrollSpeed=0` ทุกชิ้น

ขั้นส่งออกมีการตัด cell/ย่อขยาย/clip และเฉลี่ยแถบขอบ spatial tile ให้ขอบตรงข้ามเท่ากัน ไม่ได้เฉลี่ยหรือเลื่อนเฟรมตามเวลา ฟองตลิ่งถูก clip ซ้ำให้เหลือแถบด้านในของเหลวระยะ 2–7 source pixels จึงไม่เป็นก้อนกลมกลางน้ำหรือบนลาน หมอกใช้เฟรมม้วนตัวอยู่ใน recess mask; ไม่ใช้กับเมฆบนฟ้า ไอร้อนและขี้เถ้าไม่ได้วางเพิ่มเพื่อหลีกเลี่ยงภาพขุ่น

PNG mask เก็บ coverage แบบ grayscale 0–255; พรีวิวแปลง coverage เป็น alpha ก่อนใช้ destination-in ผู้ประกอบเกมต้องทำเช่นเดียวกัน หรือใช้ mask เป็นค่า coverage โดยตรง ห้ามอ่านสีดำที่มี alpha ทึบว่าเป็นพื้นที่วางเอฟเฟกต์

ใช้ master เดิมเป็นพื้นอ้างอิงรวมภาพของเหลวเดิมอยู่ใต้เฟรมวาด จึงยังไม่ใช่ terrain alpha สำหรับเสียบเข้าเกม

## ตรวจภาพแล้วและหลักฐาน

- ดูภาพย่อ sources ทั้ง 6 ชุด, `masks-overlay.jpg`, strip ชิ้นใหม่ และภาพตัวอย่างจากคลิป 3 มุมแล้ว ตัวเลขและการดูภาพนี้ไม่ใช่การอนุมัติงานศิลป์
- `preview-clip.mp4` ยาว **12.000 วินาที / 1280×720 / 12 fps / 144 เฟรม**: 0–4 วินาทีลาวาซ้าย, 4–8 สะพานกลาง/แม่น้ำม่วง, 8–12 น้ำตกฟ้าขวา
- `preview-lava.jpg`, `preview-river.jpg`, `preview-ice.jpg` และ `clip-review-strip.jpg` เป็นภาพที่สุ่มจากเวลาเดียวกับคลิป
- `frame-strip.jpg` รวมชิ้นใหม่ทั้งหมด; `strips/*-frame-strip.jpg` แยกชิ้น; `loop-review.json` มีค่าเปลี่ยนผ่านทุกคู่รวม 8→1 ทุก sheet พร้อมจำนวนเฟรมไม่ซ้ำ เกณฑ์ตัวเลขคือรอยต่อไม่เกิน 1.5 เท่าค่ากลางภายในลูป ไม่ใช่คำรับรองว่าศิลปินเห็นว่าลื่นแล้ว
- `contrast-check.json` เปรียบเทียบ 15 เวลากับ master ด้วย weighted RGB luma standard deviation และค่าเฉลี่ย HSV saturation ทั้งภาพ อัตราส่วนต้อง ≥1.0 ทั้งคู่ ไม่มีการเกรดสีชดเชย ตัวเลขระดับภาพรวมไม่ยืนยันว่าไม่มี haze เฉพาะจุด
- `render-check.json` มีผลตรวจพิกเซลนอก mask และผล ffprobe; `verification.json` บันทึกการตรวจจริงและข้อทดสอบที่ยังรันไม่ได้
- `generation-prompts.json` เก็บ prompt เต็มทั้ง 6 ครั้ง ขนาด/กริดภาพต้นทาง และ SHA256; `sources/*.webp` เก็บภาพเฟรมวาดต้นทางแบบ lossless

**คลิปและ contrast check ใช้ตัวเรนเดอร์ออฟไลน์อ้างอิง** ซึ่งอ่าน sheets/masks/layout เดียวกับ HTML และใช้สูตร overlay, opacity, กล้อง และ frame index เดียวกัน ไม่ได้อ้างว่าเป็นการอัดจากเบราว์เซอร์ หรือพิสูจน์ความเท่ากันของ rasterizer ทั้งสอง

## ข้อที่ยังค้าง

1. Chromium ที่เปิดจาก shell ถูก macOS sandbox ปฏิเสธด้วย `bootstrap_check_in … Permission denied (1100)`; browser pane ตอบว่า `browser access host is unavailable` จึงตรวจได้เฉพาะ syntax ของ JavaScript **ยังไม่ได้เล่น/ทดสอบปุ่มและการซูมเลื่อนในเบราว์เซอร์จริง**
2. ต้องให้ผู้ตรวจงานศิลป์ดู mask overlay และคลิปเพื่อยืนยันความครบของร่องน้ำ/ขอบหุบ ทิศการไหล ความลื่นจริง และความขุ่นเฉพาะจุด เกณฑ์ตัวเลขไม่ได้แทนการตัดสินนี้
3. เว้นบริเวณสีขาวที่ชิดลานและแยกจากหิมะไม่ได้ชัด, เมฆฟ้า/เมฆไกล และจุด pale บนพื้นที่เดิน รายการอยู่ใน `regions.json.omitted` ไม่ฝืนวางหมอกเพื่อให้เต็มภาพ
4. ยังไม่ประกอบเข้าเกม ไม่แก้ `src/`, `tests/`, `img/` เดิม และไม่ได้ commit/push/merge

## รันทวนหลักฐาน

ต้องมี Pillow, NumPy, OpenCV และ FFmpeg/ffprobe; script อยู่ภายใน review นี้ทั้งหมด

```sh
python3 docs/art-reviews/2026-11-05-z1-v5-fluids/scripts/build-masks.py
python3 docs/art-reviews/2026-11-05-z1-v5-fluids/scripts/export-assets.py
python3 docs/art-reviews/2026-11-05-z1-v5-fluids/scripts/render-offline.py
python3 docs/art-reviews/2026-11-05-z1-v5-fluids/scripts/verify-artifacts.py
```

`export-assets.py` อ่าน sheet เดิม 2 ชิ้นจาก worktree FX-ART-Z1 แบบอ่านอย่างเดียว สำหรับส่งต่อชุดสำเร็จให้ใช้ sheets ที่คัดลอกมาแล้วได้ทันที ไม่ต้องเข้าถึง worktree เก่า ส่วน `scripts/review-render.py` เก็บตัวตรวจเบราว์เซอร์ไว้รันซ้ำเมื่อสภาพแวดล้อมอนุญาต (ต้องมี Playwright)

ขนาดรวมสุดท้ายดู `verification.json.outputBytesAtCheck`; เป้าหมายไม่เกิน 80,000,000 bytes
