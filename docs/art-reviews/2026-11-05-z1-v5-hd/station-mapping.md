# จับคู่ภาพใหม่กับที่ตั้งเดิม (ข้อเสนอ ไม่ย้ายผัง)

ขนาดเป็น world units; ยึดความกว้างเดิม แล้วคำนวณสูงจากสัดส่วน alpha crop ต้นฉบับเต็ม ข้อมูล v6 ใช้ระบุชื่อชิ้นเท่านั้น ไม่ใช้ตำแหน่ง v6

| id เดิม | ภาพต้นฉบับเต็ม / sprite ชุดใหม่ | foot เดิม | ขนาดเสนอ กว้าง×สูง | สถานะ |
|---|---|---|---|---|
| krata | ChatGPT Image Nov 4, 2026, 11_27_22 AM.png / img/map-zone1/v6/sprites/spr-791056d272.webp | 470,565 | 258×218.5 | เสนอใช้ |
| dab | ไม่มีชัดเจน / — | 465,1038 | 255×255.0 | รอคุณเป้ |
| ngiw | ไม่มีชัดเจน / — | 551,1496 | 286×286.0 | รอคุณเป้ |
| tarang | ChatGPT Image Nov 4, 2026, 11_23_56 AM.png / img/map-zone1/v6/sprites/spr-8a956edd23.webp | 1651,449 | 292×294.3 | เสนอใช้ |
| sawan | ChatGPT Image Nov 4, 2026, 11_24_04 AM.png / img/map-zone1/v6/sprites/spr-c85351e870.webp | 2536,412 | 237×339.8 | เสนอใช้ |
| lokan | ChatGPT Image Nov 4, 2026, 11_28_16 AM.png / img/map-zone1/v6/sprites/spr-42289178cb.webp | 3534,507 | 267×229.0 | เสนอใช้ |
| lan | ChatGPT Image Nov 4, 2026, 11_28_32 AM.png / img/map-zone1/v6/sprites/spr-3d882e7929.webp | 3232,912 | 283×196.7 | เสนอใช้ |
| krajok | ChatGPT Image Nov 4, 2026, 11_23_48 AM.png / img/map-zone1/v6/sprites/spr-ba31127909.webp | 3482,1499 | 255×344.7 | เสนอใช้ |
| tea | ChatGPT Image Nov 4, 2026, 11_23_28 AM.png / img/map-zone1/v6/sprites/spr-11a67992b9.webp | 1527,1398 | 215×238.0 | เสนอใช้ |
| sala | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png / img/map-zone1/v6/sprites/spr-d4d0211ba8.webp | 2252,1382 | 209×192.0 | เสนอใช้ |
| canteen (house[3]) | ไม่มีชัดเจน | 1572,646 | 118×94.4 (slot เดิม) | รอคุณเป้ |
| house[0] left-two | ChatGPT Image Nov 4, 2026, 11_28_47 AM.png | 1945,699 | 119×174.4 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[1] front-one | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png | 2118,766 | 129×103.2 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[2] front-one | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png | 1546,1073 | 129×103.2 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[4] right-one | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png | 2239,1014 | 147×111.8 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[5] front-one | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png | 2010,1294 | 138×110.4 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[6] right-two | ChatGPT Image Nov 4, 2026, 11_28_47 AM.png | 1551,1661 | 120×175.8 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[7] right-two | ChatGPT Image Nov 4, 2026, 11_28_47 AM.png | 2283,1588 | 114×167.0 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[8] front-one | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png | 639,751 | 142×113.6 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| house[9] right-one | ChatGPT Image Nov 4, 2026, 11_27_52 AM.png | 710,1204 | 149×113.4 (กรอบเดิม) | รอคุณเป้: หน้าบ้าน/flip |
| TOWN_DAIS | ChatGPT Image Nov 4, 2026, 11_27_58 AM.png | 1862,1057 | 307×ประมาณ 206 | เสนอใช้; ไม่รวมบันไดพื้นเดิม |
| TOWN_FRONTIER | ChatGPT Image Nov 4, 2026, 11_29_05 AM.png | 1917,2510 | 292×ประมาณ 164 | รอคุณเป้: ประตูใหม่ใหญ่กว่าเดิมมาก |
| hell-pillar-0 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 1710,1080 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-1 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 2100,1080 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-2 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 1788,1405 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-3 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 2050,1405 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-4 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 1790,1560 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-5 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 2050,1560 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-6 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 1770,2080 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-7 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 2070,2080 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-8 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 1770,2250 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| hell-pillar-9 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 2070,2250 | 34×112 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-0 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2356,397 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-1 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2398,349 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-2 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2388,474 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-3 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2429,509 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-4 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2490,497 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-5 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2605,522 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-6 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2678,518 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-7 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2726,490 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-8 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2723,409 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| lamp-9 (lamp) | ChatGPT Image Nov 4, 2026, 11_25_48 AM.png | 2675,365 | 34×74 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-0 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 470,359 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-1 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 557,378 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-2 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 305,403 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-3 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 261,455 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-4 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 300,518 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-5 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 349,566 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-6 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 417,599 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-7 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 492,614 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-8 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 605,422 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-9 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 662,436 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-10 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 712,484 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-11 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 733,541 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-12 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 599,618 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |
| torch-13 (torch) | ChatGPT Image Nov 4, 2026, 11_25_55 AM.png | 664,599 | 34×70 | รอคุณเป้: torch ใช้เสาไฟไม่ใช่เปลวไฟ |

ป่าดาบ `dab`, ต้นงิ้ว `ngiw`, โรงอาหาร `canteen`: **รอคุณเป้** ไม่แทนด้วยต้นไม้หรืออาคารที่เดาเอง

ไฟล์ในตารางอ่านจากต้นฉบับเต็ม; งานนี้ไม่คัดลอกอาคารทั้งชุด ไม่ได้ประกอบเข้าเกม