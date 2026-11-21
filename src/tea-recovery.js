// Shared rules for all four tea pavilions and all four wearable outfits.
export const TEA_SLEEP_MS = 5000;
export const TEA_BLACKOUT_MS = 0;
export const TEA_WAKE_MS = 600;
export const TEA_REST_TOTAL_MS = TEA_SLEEP_MS + TEA_BLACKOUT_MS + TEA_WAKE_MS;
// T5'/0 (owner 19 Nov): after a LOST fight Yama wakes on the tea-house bed like this - lies a moment (RECOVERY_LIE_MS), Nira runs in (RECOVERY_NIRA_RUN_MS) and
// says one line (RECOVERY_NIRA_SAY_MS), then Yama and the fallen teammates stand up together (TEA_WAKE_MS). The ordinary nap on the bed keeps TEA_SLEEP_MS.
export const RECOVERY_LIE_MS = 1800;
export const RECOVERY_NIRA_RUN_MS = 1300;
export const RECOVERY_NIRA_SAY_MS = 2000;
export const RECOVERY_SLEEP_MS = RECOVERY_LIE_MS + RECOVERY_NIRA_RUN_MS + RECOVERY_NIRA_SAY_MS;   // "sleep" span of the defeat wake-up = Yama still lying
export const RECOVERY_TOTAL_MS = RECOVERY_SLEEP_MS + TEA_WAKE_MS;
export const teaSleepPhase = (elapsed, sleepMs = TEA_SLEEP_MS) => elapsed < sleepMs ? 'sleep'
  : elapsed < sleepMs + TEA_WAKE_MS ? 'wake' : 'done';
export const teaRecoveredHp = (start, max, elapsed, sleepMs = TEA_SLEEP_MS) => Math.min(max, Math.round(start + (max-start) * Math.min(1, Math.max(0,elapsed) / sleepMs)));
/** The defeat wake-up in five beats: 'lie' (Yama alone) -> 'run' (Nira runs in) -> 'say' (Nira's line) -> 'wake' (everyone stands up) -> 'done'. */
export const recoveryPhase = elapsed => elapsed < RECOVERY_LIE_MS ? 'lie'
  : elapsed < RECOVERY_LIE_MS + RECOVERY_NIRA_RUN_MS ? 'run'
  : elapsed < RECOVERY_SLEEP_MS ? 'say'
  : elapsed < RECOVERY_TOTAL_MS ? 'wake' : 'done';
/** Where Nira stands beside the bed while she wakes Yama (fractions of the room picture), and the door she runs in from. */
export const NIRA_DOOR = [0.50, 0.86];
export const niraBedside = room => [room.wake[0] - 0.05, room.wake[1] + 0.09];
/** Nira's pose at `elapsed` ms after the lie phase ended: running in a straight line from the door to the bedside, then standing facing the bed. `distance` feeds the walk-cycle. */
export function niraRunPose(elapsed, room) {
  const to = niraBedside(room), f = Math.min(1, Math.max(0, elapsed) / RECOVERY_NIRA_RUN_MS);
  const point = [NIRA_DOOR[0] + (to[0] - NIRA_DOOR[0]) * f, NIRA_DOOR[1] + (to[1] - NIRA_DOOR[1]) * f];
  return { point, face: room.bed[0] < point[0] ? -1 : 1, running: f < 1,
    distance: Math.hypot(point[0] - NIRA_DOOR[0], point[1] - NIRA_DOOR[1]) };
}
/** Nira's one line (owner 19 Nov); wording by Rae, EN corrected by Reese (T9) */
export const NIRA_WAKE_LINE = Object.freeze({
  th: 'นิรา: ท่านคะ ตื่นได้แล้วค่ะ ดิฉันอยู่ตรงนี้ ทุกคนลุกได้แล้วนะคะ',
  en: 'Nira: Sir, it is time to wake. I am right here. Everyone, you may rise now.',
});
export const DEFEAT_SCENE_MS = 1600;
export const yamaDownImage = outfit => `img/hero-yama-${outfit || 'th'}-unconscious.webp`;
export const teaBackground = (zone = 'th') => !zone || zone === 'th'
  ? 'img/tea-th-recovery-v2.webp'
  : `img/tea-${zone}-recovery.webp`;
export function teaRoom(zone = 'th') {
  // H2 (10 ต.ค. 2569) คุณเป้: "yama นั่งไม่ตรงเบาะ" / "นอนจะตกเตียง ขยับเข้าไปหน่อย"
  // seats = ก้นของยมบาทวางบนเบาะรองนั่งหน้าโต๊ะชา (ฝั่งซ้ายล่างของโต๊ะ) · beds = กึ่งกลางฟูก ไม่ใช่ขอบหน้าเตียง
  // วัดจากตารางพิกัดบนภาพ img/tea-<zone>-recovery.png จริง (สัดส่วน 0-1 ของภาพ) แล้วเทียบภาพจริงในเบราว์เซอร์ทั้ง 4 โซน
  const seats={th:[0.228,0.49],asia:[0.274,0.50],west:[0.236,0.485],cyberhell:[0.353,0.525]};
  const beds={th:[0.736,0.418],asia:[0.664,0.37],west:[0.678,0.343],cyberhell:[0.678,0.334]};
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
