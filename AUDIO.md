# AUDIO — เพลงและเสียงเกมอเวจี

> เขียน 7 ก.ย. 2569 · เพลงทำที่ **Suno** · เสียงเอฟเฟกต์ทำด้วย **โค้ด (WebAudio)** ไม่ใช่ไฟล์

---

## ตอบก่อน: ควรมีเสียง action ไหม — **มี แต่ไม่ใช่ไฟล์เสียง**

กลัวว่าเกมจะหนัก เป็นห่วงถูกจุดครับ ตัวเลขจริง:

| ทาง | น้ำหนัก | ผล |
|---|---|---|
| ไฟล์ `.mp3`/`.wav` ต่อเสียง 1 อัน | 20–80 KB × ~15 เสียง = **0.5–1.2 MB** | โหลดนาน · ต้อง preload ไม่งั้นเสียงมาช้ากว่าภาพ |
| **สังเคราะห์ด้วย WebAudio ในโค้ด** | **0 KB** | ดังทันทีเฟรมนั้น ไม่มีดีเลย์ ไม่มีไฟล์ให้โหลด |

เสียง action ของเกมนี้เป็นเสียงสั้น ๆ ทั้งหมด (ฟาด · ตราประทับ · ลูกไฟ · ระฆัง · น้ำเดือด)
พวกนี้สังเคราะห์เอาได้หมดด้วย oscillator + noise + envelope ไม่กี่บรรทัด **ไม่ต้อง gen ไม่ต้องโหลด**

**สรุปที่ควรทำ**
- 🎵 **เพลง** = ไฟล์จริงจาก Suno · **2 เพลงพอ** (ลูปหน้าปก + ลูปในเกม) แล้วค่อยเพิ่มทีหลัง
  · `.ogg` 96 kbps ลูป 60–90 วินาที ≈ **0.7–1 MB ต่อเพลง**
- 🔊 **เสียง action** = โค้ดสังเคราะห์ **0 ไฟล์** — และต้องมีปุ่มปิดเสียงในหน้า ตั้งค่า เสมอ
- ❌ **ไม่ทำ**: เสียงพากย์ · เสียงเดินทุกก้าว · เสียงกดปุ่มทุกปุ่ม (รำคาญกว่าได้)

เพดานเสียงทั้งเกม: **≤ 6 MB** (เทียบกับรูปที่ตอนนี้ 7.9 MB)

---

## เพลง — prompt สำหรับ Suno

**วิธีใช้:** Suno ช่อง *Style of Music* ใส่บล็อกสไตล์ + ท่อนของเพลงนั้น · ช่อง *Lyrics* เว้นว่าง
แล้วติ๊ก **Instrumental** ทุกเพลง (เกมนี้ไม่ต้องมีเสียงร้อง เสียงร้องจะแย่งความสนใจกับสำนวน)

### บล็อกสไตล์ — แปะนำหน้าทุกเพลง
```
Thai traditional instruments (ranat ek xylophone, khim, saw u fiddle, klong that drums,
ching finger cymbals) fused with dark cinematic orchestral underscore, minor pentatonic,
slow ritual pulse, deep sub bass, temple gong accents, no vocals, instrumental only,
seamless loop, clean mix with space for dialogue on top
```

| ไฟล์ | ใช้ตอนไหน | prompt ต่อท้ายบล็อกสไตล์ | ความยาว |
|---|---|---|---|
| `bgm-title.ogg` | **หน้าปก** ⭐ ทำก่อน | grand and ominous main theme, opens with a single struck temple gong and a long ranat tremolo, slow build into a proud dark melody carried by saw u over sustained low strings, feels like a heavy door opening, ends able to loop back to the gong | 60–80 วิ |
| `bgm-zone.ogg` | **ลูปหลักตอนเล่น** ⭐ ทำก่อน | calm patient work loop, quiet repeating khim ostinato, soft klong that heartbeat every four bars, minimal melody so it never competes with reading, warm ember hum underneath, hypnotic and unhurried | 90–120 วิ |
| `bgm-trial.ogg` | เปิดหน้าต่างไต่สวน | tense interrogation cue, sparse ticking ching, muted plucked khim on off-beats, low drone rising very slowly, one dissonant saw u note held far too long, restrained and cold, no drums | 45–60 วิ |
| `bgm-battle.ogg` | ฉากต่อสู้กับวิญญาณที่ขัดขืน | fast aggressive battle theme, driving klong that toms, ranat ek playing rapid angular runs, distorted low brass stabs, urgent but still ritual and Thai, turn-based RPG energy | 60–75 วิ |
| `bgm-yama.ogg` | โดนพญายมลงโทษ (แพ้แน่นอน) | overwhelming dread, enormous slow gong hits with long decay, choir-like low drone, everything else stripped away, one ranat phrase far in the distance like a memory, crushing and final | 30–40 วิ |
| `bgm-heaven.ogg` | ส่งวิญญาณขึ้นประตูสวรรค์ | brief radiant release, bright khim arpeggio rising, high shimmering bells, warm major shift after all the minor, soft and short, feels like exhaling | 20–25 วิ (ไม่ลูป) |

> **หลังได้ไฟล์:** แปลงเป็น `.ogg` 96 kbps mono สำหรับคิว/เอฟเฟกต์ · 128 kbps stereo สำหรับ 2 เพลงหลัก
> ```
> ffmpeg -i bgm-title.mp3 -c:a libvorbis -b:a 128k -ac 2 audio/bgm-title.ogg
> ```
> วางที่ `audio/` แล้วโค้ดจะหยิบเอง — ไม่มีไฟล์ = เกมเงียบ ไม่พัง

---

## เสียง action — ตารางที่โค้ดสังเคราะห์ให้ (ไม่มีไฟล์)

| key | ตอนไหน | เสียงที่ได้ |
|---|---|---|
| `gong` | เปิดคดีใหม่ · ขึ้นหน้าปก | ระฆังใหญ่ ตีทีเดียว หางยาว |
| `stamp` | ออกหมาย | ตราประทับกระแทกโต๊ะ (noise สั้น + thud ต่ำ) |
| `hit` | ฟาดเปรต / โจมตีในฉากต่อสู้ | ตึบแห้ง ๆ + noise แตก |
| `fire` | ขว้างลูกไฟ | เสียงลมพุ่งกวาดความถี่ลง |
| `crack` | จี้คำให้การถูก | เสียงกระจกร้าวเบา ๆ |
| `deny` | จี้ผิด | โน้ตต่ำสั้น ๆ ตัวเดียว |
| `star` | ได้ห้าดาว | ระฆังเล็กสามใบไล่ขึ้น |
| `hurt` | บารมีถูกหัก | เสียงกดต่ำสั่น |
| `boil` | กระทะทองแดงทำงาน | เสียงฟองเดือดเบา ๆ วนไป (ลูปตลอด ดังเบามาก) |
| `heaven` | ส่งขึ้นสวรรค์ | ระฆังใสสองใบ |

ทั้งหมดนี้อยู่ที่ `src/sfx.js` — ปรับความดังรวมได้ที่หน้า **ตั้งค่า** บนหน้าปก
