# ทดลอง SPA กับ Yama — 15 ตุลาคม 2026

## สถานะส่งงาน

ชุดทดลองนี้แยกจากแผนที่/UI ของ Claude และยังไม่เชื่อมกับเกมจริง ผู้ใช้อนุญาตให้ push ชุดทดลองที่มีอยู่แล้ว จากนั้นให้ทำต่อเพื่อเก็บเฟรมยกขาและส่วนเกินข้างเขา ดู map-book-v1/lift-v4/README.md สำหรับรุ่นล่าสุดและการสร้างซ้ำ

ไม่เก็บ .venv ใน Git หากต้องสร้างเครื่องมือใหม่ ใช้ Python3.13+ สร้าง environment แยกและติดตั้งจาก requirements.txt แล้วเปิดเซิร์ฟเวอร์เฉพาะโฟลเดอร์นี้ พรีวิวหลักคือ index.html และ map-book-v1/index.html

## อัปเดตท่ายืนพักวาดใหม่

ผู้ใช้ไม่ต้องการการยืด–หดภาพเดิม จึงเลิกใช้ strip deformation ทั้งหมดในพรีวิวปัจจุบัน ใช้ภาพวาดใหม่ด้วย built-in ImageGen จำนวน 6 เฟรมแทน: ยืนพัก ยกไหล่/ปรับแขนและมุมดาบ หรี่ตา กะพริบตา และกลับท่าพัก ภาพอ้างอิงคือ idle.png เดิม

ต้นฉบับโปร่งใสอยู่ idle-v2/generated-sheet.png; prompt ฉบับเต็มอยู่ idle-v2/prompt.txt; sprite sheet พร้อมใช้ในพรีวิวอยู่ idle-v2/idle-sheet.png; GIF อยู่ idle-v2/idle-preview.gif

prepare.py ตัดเฟรมและใช้สเกลเดียวกันทุกเฟรม รักษาสัดส่วนและจัดจุดกึ่งกลางเท้าไว้ที่ (240,570) ไม่บีบ/ยืดแต่ละท่า ตัวเล่นวาดเฟรมเต็มโดยไม่มี scale หรือ warp การวาดใหม่มีรายละเอียดต่างระหว่างเฟรมเล็กน้อย ควรตรวจความต่อเนื่องก่อนนำเข้าตัวเกมจริง

ท่าฟันดาบยังเป็นภาพเดิม ไม่ได้ทดสอบ SPA native เพิ่ม และไม่ได้แก้แผนที่ UI หรือไฟล์นอกโฟลเดอร์ทดลองนี้

ข้อมูลด้านล่างเป็นบันทึกการทดลองเวอร์ชันแรกก่อนวาดใหม่

โฟลเดอร์ทดลองแยกจากเกมจริง ไม่มีการแก้แผนที่ UI เซฟ src หรือภาพต้นฉบับ และไม่มี commit/push

## ดูผล

เปิด index.html ได้โดยตรง หรือเปิด http://127.0.0.1:8793 ขณะเซิร์ฟเวอร์พรีวิวทำงาน

- ยืนหายใจ: Canvas ขยับภาพเฟรมแรกเป็นแถบแนวนอน: อกขยาย ไหล่/ศีรษะยกสูงสุด 18 px และโยกสูงสุด 9 px ในรอบ 2.4 วินาที ตรึงขา/เท้าตั้งแต่ y=515 ลงไป ไม่ได้วาดท่าหายใจใหม่
- ฟันดาบ: ภาพเดิม 8 เฟรม 640×640 จังหวะเดิม [85,80,60,35,40,80,100,100] รวม 580 ms
- ประกายดาบ: procedural Canvas overlay แยกจากรูป ไม่มีการแก้ไฟล์ต้นฉบับ
- ปุ่มหยุด เล่นใหม่ ความเร็ว จุดเท้า และเอฟเฟกต์ สำหรับเปรียบเทียบผล
- GIF พักเฟรมแรกนานขึ้นเพื่อให้ดูง่าย จึงไม่ได้มีเวลา loop เท่าท่าโจมตี 580 ms

## สิ่งที่ทดสอบได้จริง

ติดตั้ง aseprite-automation 0.4.0 และ Pillow 12.3.0 ลง .venv ภายในโฟลเดอร์นี้ ไม่ติดตั้ง CLI หรือ skill แบบ global และไม่แก้ MCP settings

spa version ผ่าน แต่ spa info ได้ executable_not_found เพราะยังไม่มี Aseprite ใน PATH/ตำแหน่งติดตั้งที่ตรวจ ดู spa-info.json

ไฟล์ PNG, GIF, JSON และ native candidate สร้างด้วย Python/Pillow ไม่ได้ส่งออกด้วย SPA การทดลองนี้จึงยังไม่พิสูจน์คุณภาพ ความเร็ว หรือความเสถียรของ SPA กับงานจริง

build.py ตัดเฟรมจาก img/yama-sword-v3/hero-yama-th-sword.webp ซึ่งเกมมีอยู่แล้ว ดู hash ใน metadata.json ไม่ใช่ภาพท่าใหม่จาก AI

ไฟล์ yama-attack-candidate.aseprite เป็น candidate ตามสเปก Aseprite ตรวจโครงสร้าง binary, zlib pixels และเวลาแล้ว แต่ยังไม่ได้เปิดหรือ save/reopen ด้วย Aseprite

## ทดสอบต่อเมื่อมี Aseprite

จากโฟลเดอร์นี้:

```sh
.venv/bin/python run_native.py /Applications/Aseprite.app/Contents/MacOS/aseprite
```

สคริปต์ใช้ CLI schema ของเวอร์ชันที่ติดตั้ง บันทึก log แยก ตรวจ valid:true ก่อนส่งออก native-sheet.png และ native-sheet.json และไม่เขียนทับไฟล์เดิม ยังต้องเทียบภาพ เวลา alpha และ foot anchor จาก native output ก่อนถือว่าผ่าน

## ข้อประเมิน

อเวจีมี sprite sheet และตัวเล่นท่าโจมตีอยู่แล้ว จึงไม่ควรเปลี่ยนระบบเกมเพื่อทดลอง SPA ประโยชน์ที่ยังควรพิสูจน์คือการแก้เฟรม/เวลา/เลเยอร์และส่งออกซ้ำหลายตัวอย่างสม่ำเสมอ การขยับหายใจและประกายเล็กน้อยทำใน Canvas เดิมได้ ผลรอบนี้เป็น baseline สำหรับเปรียบเทียบ SPA ภายหลัง

แหล่งข้อมูล: https://github.com/aigengame/aseprite-automation และ https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md


## Zone 2–4 animation suite and final ear cleanup

`outfits/index.html` previews all four zones and four animation types. Asia, West and CyberHell each include 16 book-idle + 32 book-walk + 6 sword-idle + 8 reused sword-attack frames, atlases, GIFs and metadata. See `outfits/README.md` and `outfits/verification.json`. Thai walking now uses ear-v6 cleanup, which protects the real ear ridge and all existing body/leg pixels; evidence is in `map-book-v1/ear-v6/`. These are isolated pilot assets and do not change the production game.
