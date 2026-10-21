# ตรวจ UI รับของบอสนำทาง — 21 ตุลาคม 2026

ฐาน runtime: `93d1c7d` / `20261021-worker-supplies` บน main ไม่มีการแก้ gameplay ในชุดตรวจนี้

## ตรวจผ่าน

ตรวจด้วยเบราว์เซอร์ 1280×720 ผ่าน production UI จริง ชุดทดสอบใช้เซฟในหน่วยความจำและ seed ว่าผ่านสาม checkpoint แล้ว ตั้งทีม following ใกล้ประตู จึงเป็นหลักฐานเฉพาะช่วงประตู–ฝากฝัง–ของฝาก–ใบรับรางวัล–เข้าเมือง ไม่ใช่หลักฐานเดินสู้ครบทุกเส้นทาง

| เส้นทาง | คัตซีน / เงินบอส | ชุดที่ได้ | ปลายทาง |
|---|---|---|---|
| th→asia | ยมทัต 2 หน้า / 500 | asia | แนะนำบูรพาและจ้าวเหวิน แล้วเริ่มงานได้ |
| asia→west | เหลียนกัง 2 หน้า / 800 | west | แนะนำปัจฉิมและฮาลวาร์ แล้วเริ่มงานได้ |
| west→cyberhell | เซเวอริน 2 หน้า / 1200 | cyberhell | แนะนำไซเบอร์ เน็กซาร และฉากลูเมน แล้วกลับแผนที่ได้ |

- เปิดภาพมอบชุดตรวจด้วยตาครบสามเส้นทาง ปุ่มหน้าถัดไป/ดำเนินเรื่องต่อ/รับรางวัลทำงาน
- โซน 1 ตั้งตัวอยู่ก่อนระยะประตู ปุ่มเข้าประตู disabled จากนั้นคลิกเดินช่วงสุดท้ายแล้วปุ่ม enabled
- รับของแล้วสถานะ farewell=true, following=false, grantPaid=true, grantNotice=false, outfitGranted=true ไม่วนเปิดใบรับของ
- งบเปิดสาขาครั้งแรกใน moveZone เป็นเงินอีกส่วนหนึ่ง: asia +400, west +800, cyberhell +1200 จึงอย่าใช้ผลต่างยอดหลังเข้าเมืองแทนยอดเงินบอส
- Browser console ไม่มี error/warn หลังตรวจครบสามเส้นทาง
- ทดสอบ Node ที่เกี่ยวข้อง 40 ผ่าน: boss-guides, zone-travel, zone-travel-game, regional-story-acceptance รวมการจ่ายครั้งเดียว/restore และเส้นเรื่องถึง ending02 ระดับ state machine

ภาพหลักฐาน:
- `20261021-guide-th-gift-checked.png`
- `20261021-guide-asia-gift-checked.png`
- `20261021-guide-west-gift-checked.png`

สร้าง fixture ซ้ำ: `node scripts/build-guide-exit-review.mjs` แล้วเปิด `/output/guide-exit-review/index.html` ผ่าน local server ห้ามใช้ fixture นี้เป็นเซฟผู้เล่นจริง

## ยังไม่ปิด

- เดินสู้จริงตลอดเส้นทั้งสาม / ทุก patrol / หนีแล้วกลับ / โหลดเซฟระหว่างทาง
- ภาพทุกจุดทุกโซนและ viewport แคบ
- final boss court–กระจก–หมาย–ฉากลงทัณฑ์–ending02 ผ่าน UI ตลอดลำดับ
- ภาพและท่าโจมตีอาวุธทุกบอส / นิราสี่โซน / ทดลอง Shado และ Hunyuan ตามลำดับเดิม
