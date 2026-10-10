// Shared rules for all four tea pavilions and all four wearable outfits.
export const TEA_BED_COST = 180;
export const TEA_SLEEP_MS = 5000;
export const TEA_BLACKOUT_MS = 0;
export const TEA_WAKE_MS = 600;
export const TEA_REST_TOTAL_MS = TEA_SLEEP_MS + TEA_BLACKOUT_MS + TEA_WAKE_MS;
export const teaSleepPhase = elapsed => elapsed < TEA_SLEEP_MS ? 'sleep'
  : elapsed < TEA_REST_TOTAL_MS ? 'wake' : 'done';
export const teaRecoveredHp = (start, max, elapsed) => Math.min(max, Math.round(start + (max-start) * Math.min(1, Math.max(0,elapsed) / TEA_SLEEP_MS)));
export const DEFEAT_SCENE_MS = 1600;
export const yamaDownImage = outfit => `img/hero-yama-${outfit || 'th'}-unconscious.png`;
export const teaBackground = zone => `img/tea-${zone || 'th'}-recovery.png`;
export function teaRoom(zone = 'th') {
  // H2 (10 ต.ค. 2569) คุณเป้: "yama นั่งไม่ตรงเบาะ" / "นอนจะตกเตียง ขยับเข้าไปหน่อย"
  // seats = ก้นของยมบาทวางบนเบาะรองนั่งหน้าโต๊ะชา (ฝั่งซ้ายล่างของโต๊ะ) · beds = กึ่งกลางฟูก ไม่ใช่ขอบหน้าเตียง
  // วัดจากตารางพิกัดบนภาพ img/tea-<zone>-recovery.png จริง (สัดส่วน 0-1 ของภาพ) แล้วเทียบภาพจริงในเบราว์เซอร์ทั้ง 4 โซน
  const seats={th:[0.227,0.505],asia:[0.274,0.50],west:[0.236,0.485],cyberhell:[0.353,0.525]};
  const beds={th:[0.736,0.386],asia:[0.664,0.37],west:[0.678,0.343],cyberhell:[0.678,0.334]};
  // I1-A (คุณเป้ 10 ต.ค. 2569): "ตื่นแล้วไปยืนบนขอบเตียง" — wakes = พื้นไม้หน้าเตียงที่เท้าพ้นขอบหน้าเตียงแล้ว (อ่านจากภาพ tea-<zone>-recovery.png
  // ขอบหน้าเตียงต่ำสุดราว th .50 · asia .49 · west .53 · cyberhell .50 → จุดตื่นอยู่ต่ำกว่าอีก ~.04-.06) ทุกจุดอยู่ในพื้นที่เดินได้ของห้อง
  const wakes={th:[0.736,0.56],asia:[0.664,0.54],west:[0.678,0.575],cyberhell:[0.678,0.56]};
  return { crop:null, mirror:false, bright:1, light:null, noCup:true,
    souls:[], crew:null, me:[0.50,0.86], act:seats[zone] || seats.th, bed:beds[zone] || beds.th, wake:wakes[zone] || wakes.th,
    item:[0.40,0.59], actions:[[0.30,0.27],[0.69,0.23]],
    walk:[0.21,0.49,0.83,0.91] };
}
export function roomImageBox(W, H, sw, sh, cover = false) {
  const s = (cover ? Math.max : Math.min)(W / sw, H / sh);
  return { ox:(W-sw*s)/2, oy:(H-sh*s)/2, w:sw*s, h:sh*s };
}

/** I1-A (คุณเป้ 10 ต.ค. 2569): "ท่านอนตัวใหญ่กว่าท่ายืน" — ภาพท่านอน (hero-yama-<ชุด>-unconscious.png) ถูกวาดกว้าง 0.24U ตายตัว
 *  ขณะที่ท่ายืนสูง HERO_H×U (กรอบจัตุรัส 512) ตัวนอนจึงใหญ่กว่าตัวยืนราว 1.37 เท่า (วัดจากพื้นที่ซิลูเอตต์จริง alpha>200)
 *  แก้: ปรับความกว้างท่านอนให้ "พื้นที่ซิลูเอตต์ของตัว" เท่ากับท่ายืน — วัดจากพิกเซลของสไปรต์ทั้งสองใบตอนรันไทม์ (ไม่กะด้วยตา)
 *  ภาพนอนใหม่ที่วาดทับจะถูกวัดใหม่เอง ไม่ต้องแก้โค้ด
 *  standFrac/lieFrac = สัดส่วนพิกเซลทึบของภาพ (0-1 ของพื้นที่ภาพทั้งใบ) · lieAspect = สูง÷กว้างของภาพนอน · heroH = HERO_H */
export function sleepSpriteWidth(standFrac, lieFrac, lieAspect, heroH = 0.15) {
  if (!(standFrac > 0 && lieFrac > 0 && lieAspect > 0)) return null;
  return heroH * Math.sqrt(standFrac / (lieFrac * lieAspect));
}
