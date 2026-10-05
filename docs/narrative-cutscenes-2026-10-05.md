# หัวหน้าลงโทษและอินโทรบอสชายแดน · 5 ตุลาคม 2569

วาดด้วย built-in image_gen ทั้งหมด 7 ภาพ โดยใช้ภาพตัวละครเดิมและฉากชายแดนประจำโซนเป็น reference ภาพพญายมโซน 1 ใช้ของเดิม `img/hero-boss-cutscene.jpeg` ส่วนภาพหัวหน้าที่ถูกควบคุมยังใช้ไฟล์เดิมของเรื่องศึกสุดท้าย

## ภาพที่บันทึกและใช้ในเกม

| ภาพ | ไฟล์ |
| --- | --- |
| หัวหน้าบูรพาลงโทษ | `img/head-asia-punish-cutscene-v1.png` |
| หัวหน้าปัจฉิมลงโทษ | `img/head-west-punish-cutscene-v1.png` |
| หัวหน้านรกเครือข่ายลงโทษ | `img/head-cyberhell-punish-cutscene-v1.png` |
| อินโทรยักษ์ชายแดนสุวรรณภูมิ | `img/frontier-th-intro-v1.png` |
| อินโทรโอนิชายแดนบูรพา | `img/frontier-asia-intro-v1.png` |
| อินโทรเจ้าแห่งแวมไพร์ชายแดนปัจฉิม | `img/frontier-west-intro-v1.png` |
| อินโทรม้าไม้ปีศาจชายแดนนรกเครือข่าย | `img/frontier-cyberhell-intro-v1.png` |

## Prompt set / ข้อกำหนดที่ใช้วาด

Shared: Use case illustration-story. One full-bleed 16:9 cinematic pixel-art game cutscene for AVEGEE. Preserve the exact identity in the supplied character reference. Use the existing Thai father punishment cutscene as the chunky square-pixel style reference, with crisp highlights and deep shadows. No baked-in text, speech bubbles, UI, watermark, borders or letterboxing. No blood. Dialogue is rendered by the game.

1. **Eastern head punishment:** stern red-faced Chinese underworld magistrate, black beard, tall rectangular black-and-gold hat, crimson ceremonial robes. Dramatic waist-up foreshortening; wooden judgment tablet raised, other hand casts a crimson-and-gold judgment seal toward the viewer. Eastern stone court with throne and red lanterns. Lawful supervisor with controlled anger, not possessed. Reference `img/Asia/hero-boss-asia.png`.
2. **Western head punishment:** elderly red-skinned Nordic judge, long white beard, horned silver helmet, steel scale armour and white fur cloak. Drive an icy spear into the foreground, releasing a blue-white wave of judicial power. Frozen stone courthouse and blue torches; small raven emblem. Lawful supervisor, not possessed. Reference `img/West/hero-boss-west-v2.png`.
3. **Network head punishment:** elderly red-skinned demon with white hair and beard, curved red horns, silver diadem with cyan diamond, black ceremonial coat with cyan circuits and purple trim. Holographic tablet in one hand; other palm projects a cyan-purple data seal toward viewer. Server columns, cables and neon throne. Lawful supervisor, not a robot or the hostile inspector. Reference `img/CyberHell/hero-boss-cyberhell-v2.png`.
4. **Thai frontier intro:** muscular red demon general with flame crown, dark horns, gold-filigree black armour, purple-gold skirt and spiked club on shoulder. Scornful challenge toward a new warden, low camera, visible gate and braziers of the burgundy stone frontier. References `img/boss-frontier-th.png`, `img/BG-frontier.jpeg`.
5. **Eastern frontier intro:** orange-red oni with wild white hair, cream horns, navy vest, tiger-skin waistcloth, rope belt, shackles and iron club. Challenge an outsider from the teal ruined stone gate with red torii and lanterns. References `img/Asia/boss-frontier-asia.png`, `img/Asia/BG-Frontier-asia.webp`.
6. **Western frontier intro:** elderly pale-grey vampire with swept white hair, drooping moustache, pointed ears, fangs, Victorian black coat with burgundy lining and cane. Extend one hand in a threat from the snowy stone gate with gargoyles and blue braziers; bats in mist. References `img/West/boss-frontier-west.png`, `img/West/BG-Frontier-west.webp`.
7. **Network frontier intro:** colossal wooden Trojan horse with riveted iron straps, wooden wheels, side compartment, cable mane and magenta glitch circuits. Roll through the ruined network frontier gate. Keep horse head, body and wheels visible. Stone walls, servers, cables, cyan flames and neon cracked paving. References `img/CyberHell/boss-frontier-cyberhell.png`, `img/CyberHell/BG-Frontier-cyberhell.webp`.

## จังหวะในเกม

- ผู้เล่นรับแจ้งเตือนปีศาจบุก → เดินถึงประตูชายแดน → อินโทรบอสประจำโซน → กดเตรียมทีม/ข้ามฉาก → หน้าเตรียมทีมเดิม → กดเข้าสู้
- การรับทราบอินโทรไม่เริ่มศึก ไม่ใช้ไอเทม และไม่เปลี่ยน event จาก pending
- หัวหน้าลงโทษใช้ภาพตามโซนปัจจุบันในจังหวะสวนกลับของฉาก `dad` แล้วเข้าสู่บทลงโทษและพักฟื้นตามระบบเดิม
- บทพูดไทยและอังกฤษอยู่ที่ `src/narrative-cutscenes.js`

## ตรวจสอบ

- `node --test tests/*.test.mjs`: 447 ผ่าน ไม่มีข้อผิดพลาด
- เบราว์เซอร์แยกที่ 1440×900 และ 390×844: 14 กรณีผ่าน (อินโทร 4 โซนก่อนเตรียมทีม และภาพลงโทษของหัวหน้าโซน 2–4)
- ปุ่มข้ามอินโทรและเตรียมทีมไปที่หน้าเตรียมทีมเดิม โดยยังไม่เริ่มศึก
- โหลดภาพใหม่ครบ ไม่มี page error หรือคำขอภาพใหม่ที่ล้มเหลว
