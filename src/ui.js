import { nextFinalEncounter, finalEventActors } from './final-event.js';
import { punishmentScene } from './punishment-scene.js';
import { TEA_BED_COST, DEFEAT_SCENE_MS, teaBackground, teaRoom, yamaDownImage } from './tea-recovery.js';
import { INTERACTION_REACH, nearestInteraction, mapInteractions, roomExit, nearRoomExit } from './proximity.js';
import { commandWheel, bindCommandWheel, crewAbility, crewCooldown, cooldownText } from './command-wheel.js';
import { fitBattleSprites, fitCutsceneImage } from './battle-scale.js';
import { teamFaceClass, foeFaceClass, ragePoseSrc } from './battle-facing.js';
// ui.js — แผงควบคุม · โมดัล · ลูปวาด
import { SINS, STATIONS, CREW, BAL, POWERS, SCENE, SPOTS, QUEUE_LINE,
         GUARD, LEVELS, MOB, TUTOR, ORDER_TIERS, KARMA_TIERS, ITEMS,
         KARMA_RELIEF, BATTLE, ZONES, ZONE_EVENTS, TARANG, FX_OF, ROOMS, ROOM_DEFAULT,
         ORDER_WARN, crewName, FRONTIER, returnsToFrontier, MERCHANT, BOON_SHOP, UPGRADES, INTENSITY_NAME,
         CREW_HELP_LV, authorityOf } from './data.js';
import { AUDIO, saveAudio, unlock, sfx, powerSfx, bgm, syncBgm, primeAudio, warmBgmFile } from './sfx.js';
import { createGame, loadSave, clearSave, sameLabel } from './game.js';
import { render, toScene, hitStation, hitActor, nearBuild, hitFrontier, hitBuildPrompt, CHAR_SCALE_MAP } from './scene.js';
import { makeRoom } from './room.js';
import { stepTo, nearestWalk } from './walk.js';
import { soulKey, artUrl, zoneImg, bindZone, bindHeroStyle, warmZone, drawCrewWalk, drawStandee, drawHeroWalk } from './art.js';
import { MINIGAMES } from './minigames/index.js';   // มินิเกม "เร่งการทำงาน" — ชุดที่ 9 คุณเป้ 24 ก.ย. 2569
import { makeFrontierWalk, maxOnScreen, removeSessionEnemy } from './frontier.js';   // แผนที่ชายแดน — ข้อ A ชุด 14
import { t, getLang, setLang, onLangChange, applyI18n } from './i18n.js';   // ข้อ C ชุด 15 — ชั้นแปล TH/ENG
import { ZONE_MAP, zoneMapRoute } from './zone-map.js';
import { STORY, ABILITY_REWARDS } from './story.js';
import { zoneIntroduction, regionalCrewCutscene, travelPath } from './zone-introductions.js';
import { walkDirection } from './walk-direction.js';
import { prepareComicImages, bossArrivalScene, ACTION_CUTSCENE_PRESENTATION } from './cutscene-presentation.js';

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** ชื่อตัวผู้เล่น — "Yama" คือชื่อฝรั่งของพญายมซึ่งเป็น "พ่อ" ของเรา ไม่ใช่ตัวเรา
 *  ตัวเราคือยมบาทมือใหม่ ลูกของท่าน จึงใช้ "ยมบาทน้อย" ให้ต่างจากพ่อชัด ๆ
 *  (เจ้าของถามว่าเขียนไทยว่าอะไรดี 8 ก.ย. 2569 — เปลี่ยนที่นี่ที่เดียวได้ทั้งเกม) */
const HERO_NAME = 'ยมบาทน้อย';
let storyPlaying = false, storyScheduled = false;

/** รูปยมบาทบนเวที — ใช้ท่าเฉียง img/hero-yama-side.png ถ้ามีไฟล์ ไม่มีก็ท่ายืนตรงตามเดิม
 *  (ท่ายืนตรงหันหน้าเข้ากล้อง จึงไม่มีทางหันเข้าหาคู่กรณีได้จนกว่าจะมีรูปท่าเฉียง)
 *  ทุก path ของรูปตัวละครใน ui.js ผ่าน artUrl() — อยู่โซนไหนได้รูปของโซนนั้นก่อน (art.js) */
const heroFace = () => (heroFace.ok && artUrl('hero-yama-side')) || artUrl('hero-yama');
{ const im = new Image(); im.onload = () => { heroFace.ok = true; }; im.src = 'img/hero-yama-side.png'; }

/** ท่าลงทัณฑ์บนเวทีต่อสู้ (ข้อ 5 ของเจ้าของ 11 ก.ย. 2569)
 *  จังหวะที่ท่านลงมือใส่คู่กรณี ให้เปลี่ยนเป็น hero-yama-atk · จังหวะอื่นกลับไปท่ายืนเดิม
 *  artUrl คืน null = "โซนนี้มียมบาทแล้วแต่ยังไม่มีท่าฟาด" → ใช้ท่ายืนของโซน ไม่หยิบท่าโซน 1 มาปน
 *  (โซนปัจฉิมยังไม่มี hero-yama-west-atk — ตอนนี้จึงยืนนิ่งตอนฟาด ไม่ใช่หน้าเปลี่ยนเป็นคนละคน)
 *  โหลดไฟล์ไว้ล่วงหน้า ไม่งั้นเฟรมแรกที่สลับท่าจะว่างวูบหนึ่งระหว่างรอไฟล์ */
const heroAtk = () => artUrl('hero-yama-atk') || heroFace();

/** ชุด 30B ข้อ 7 — โปรไฟล์ครึ่งตัวของหัวหน้าโซน 3 ("ศึกพ่อ" โซน 3) แทนภาพตัวเต็มนั่งบัลลังก์ในกล่อง HUD ล่างขวา
 *  ไฟล์ต้องผ่าน prep() ใน scripts/prep-art.py ก่อน (img/West/hero-boss-west-profile.webp) — ยังไม่มีไฟล์ = ใช้ภาพเดิม ไม่พัง
 *  ตรวจว่ามีไฟล์จริงด้วยการโหลดลองครั้งเดียว (ไม่ยิง 404 ซ้ำทุกครั้งที่วาดฉาก) */
const BOSS_PROFILE_ART = { west:'img/West/hero-boss-west-profile.webp' };
const bossProfileOk = {};
for (const [z, src] of Object.entries(BOSS_PROFILE_ART)) { const im = new Image(); im.onload = () => { bossProfileOk[z] = true; }; im.src = src; }
const bossProfileOverride = (sp, zone) => sp === 'hero-boss' && bossProfileOk[zone] ? BOSS_PROFILE_ART[zone] : null;
const heroCry = () => artUrl('hero-yama-cry') || heroFace();
{ const u = artUrl('hero-yama-atk'); if (u) new Image().src = u; }

/** ข้อ A คุณเป้ 24 ก.ย. 2569 — ตวาดข่มขู่คูลดาวน์เป็นเวลาจริง ไม่ใช่นับเป็นคดี
 *  readyAt = epoch ms สัมบูรณ์ (ไม่ใช่นับถอยหลังสัมพัทธ์) เซฟ/รีโหลดแล้วยังนับถูกเองเพราะเทียบกับนาฬิกาเครื่องตรง ๆ */
const fmtCountdown = readyAt => {
  const s = Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const WEIGHT = ['', 'เล็กน้อย', 'ปานกลาง', 'หนัก', 'หนักมาก', 'มหันต์'];
// ระดับ 5 เปลี่ยนจาก "สาสม" เป็น "มหันต์" (ข้อ B.2 คุณเป้ 24 ก.ย. 2569) — ให้ตรงกับคำที่ WEIGHT ใช้อยู่แล้ว
// (WEIGHT[5] = "มหันต์" มาก่อนแล้ว แต่ INTENSITY[5] สะกดคนละคำ ผู้เล่นอ่านแล้วงงว่าเป็นคำเดียวกันไหม)
// ข้อ A คุณเป้ 24 ก.ย. 2569 — ย้ายไปเป็น INTENSITY_NAME ใน data.js ที่เดียว (game.js ต้องใช้ชื่อชุดนี้
// ในข้อความเฉลยของกระจกวิเศษด้วย) เก็บชื่อ local เดิมไว้กันไม่ต้องแก้ทุกจุดที่เรียก INTENSITY ในไฟล์นี้
const INTENSITY = INTENSITY_NAME;

// ข้อ C คุณเป้ 24 ก.ย. 2569 (ชุดที่ 6) — หน่วงก่อนศัตรูตีสวนในฉากต่อสู้ (openBattle) ผู้เล่นต้องเห็นผล
// การโจมตีของตัวเองก่อน (เดิมตีสวนทันทีที่อนิเมชันเราเล่นจบ รู้สึกโดนตีสวนทันที)
// ข้อ C ชุดที่ 7 (24 ก.ย. 2569 เย็น) — 2000ms (รวมกับอนิเมชัน 780ms ของเรา ≈2.8 วิ) ทำให้ดูค้างเกินไป
// ลดเหลือ 800ms (รวม ≈1.58 วิ) — ยังพอเห็นดาเมจ/แถบเลือดของเรานิ่งอยู่ก่อนโดนตีสวน แต่ไม่รู้สึกหยุดเกม
const COUNTER_WAIT_MS = 800;
const HEAL_GLOW_MS = 900;   // ชุด 30B ข้อ 9 — เรืองแสง 0.6–1 วินาที
const PHASE_GUARD_MS = 3000; // ต้องมากกว่า 780(อนิเมชันเรา) + COUNTER_WAIT_MS(800) + 780(อนิเมชันเขา) ≈2360 พอมีระยะปลอดภัย

const g = createGame();
const SAVED = loadSave();
if (SAVED) g.restore(SAVED);
bindZone(() => g.zone);          // รูปประจำโซน — art.js ต้องรู้ก่อนวาดเฟรมแรก
bindHeroStyle(() => g.outfit || g.zone); // ชุด Yama เป็นรางวัลสะสม เลือกข้ามโซนได้
const cv = $('#cv'), ctx = cv.getContext('2d');
let tab = 'queue', hover = null, acc = 0, last = performance.now();

/** ข้อ D ชุด 15 — .stage เต็มจอไม่มีกรอบแบบเดิม · .scene-box ต้องล็อกอัตราส่วน 1527:704 อยู่ข้างใน
 *  (letterbox บน/ล่างหรือซ้าย/ขวาแล้วแต่จอ แทนการครอป — ยังไม่ทำ D.1 พิกัดใหม่รอบนี้)
 *  ใช้ ResizeObserver วัดจริงเป็น px แทน CSS aspect-ratio ล้วนๆ เพราะ mix กับ flex-centering
 *  มีเคส max-width clamp แล้ว height ไม่ถูกรีเคลียร์ตามในบางเบราว์เซอร์ — พลาดแล้ว #ov/canvas
 *  จะเพี้ยนตำแหน่งกระทบการคลิกทั้งเกม (toScene() อิง cv.getBoundingClientRect() ตรงๆ) */
function fitSceneBox() {
  const stage = document.querySelector('.stage'), box = document.querySelector('.scene-box');
  if (!stage || !box) return;
  const cw = stage.clientWidth, ch = stage.clientHeight;
  if (!cw || !ch) return;
  const ratio = SCENE.w / SCENE.h;
  let w = cw, h = w / ratio;
  if (h > ch) { h = ch; w = h * ratio; }
  box.style.width = `${Math.round(w)}px`;
  box.style.height = `${Math.round(h)}px`;
}
addEventListener('resize', fitSceneBox);
addEventListener('resize', () => requestAnimationFrame(() => ov.querySelectorAll('.repairfab').forEach(place)));
addEventListener('orientationchange', () => setTimeout(fitSceneBox, 60));
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(fitSceneBox).observe(document.querySelector('.stage'));
} else {
  fitSceneBox();
}
fitSceneBox();

/** ตัววาดฉากต่อสู้ซ้ำ — openBattle ตั้งค่าไว้ ปิดฉากแล้วเคลียร์เป็น null
 *  ลูปเฟรมใช้ตัวนี้เปิดกล่องกลับให้ ถ้าฉากยังไม่จบแต่กล่องหายไป
 *  (มี close หลุดเข้ามาได้หลายทาง — โมดัลอื่นมาแทรก, Esc, เบราว์เซอร์เอง)
 *  ผู้เล่นต้องไม่มีทาง "ค้างอยู่กับฉากต่อสู้ที่มองไม่เห็น" เด็ดขาด */
let battleUI = null;
let lastBattleEnd = 0;      // เวลาที่ฉากต่อสู้ล่าสุดปิดลง — ใช้เว้นจังหวะก่อนเปิดฉากใหม่
let prisonAlertSeen = !!g.eventMapClosed['th:prisonBreak'];
let prisonTried = false;   // เคยกด "ออกไปปราบ" แล้วในรอบนี้ — ป้ายมุมจอถึงเปลี่ยนเป็น "ท้าอีกครั้ง"
let breachAlertSeen = !!g.eventMapClosed['th:frontierBreach'];
let breachTried = false;
let breachPrepOffered = false;   // เปิดหน้าต่างเตรียมทีมที่ชายแดนให้รอบนี้แล้ว (ดู setInterval ด้านบน)
let devaAlertSeen = !!g.eventMapClosed['th:devaTest'];
let devaTried = false;
const zoneEventAlertSeen = new Set(Object.keys(g.eventMapClosed).filter(k => g.eventMapClosed[k]));
const zoneEventTried = new Set();

// เฝ้าด้วย timer ไม่ใช่ลูปเฟรม — requestAnimationFrame หยุดสนิทเมื่อแท็บอยู่หลังจอ
// (เจอตอนทดสอบ 8 ก.ย. 2569: สลับแท็บกลางฉากต่อสู้แล้วกล่องหาย ไม่มีอะไรเปิดกลับให้)
setInterval(() => {
  releaseDlgPause();       // กล่องปิดไปแล้วแต่ยังไม่ได้คืนค่าพัก — ดูหมายเหตุที่ pauseForDlg()
  showAutoPause();
  if (battleUI && g.battle && !g.battle.over && !dlg.open) battleUI();
  updateTrialBtn();        // ปุ่มสอบสวนต้องตามการเดินให้ทันแม้ลูปเฟรมจะหยุด (แท็บอยู่หลังจอ)
  updateMobFab();          // ปุ่มสู้เหนือหัวผีก็ต้องเก็บกวาดตัวเองได้แม้ลูปเฟรมจะหยุด
  updateBossFab();
  updateFrontierFab();
  updateRepairFabs();
  // พ่อลงมาตบเพราะตัดสินพลาดติดกันสามสำนวน — รอจนกว่าโมดัลอื่นจะปิดก่อน
  // startDadFight() เรียก this.onChange() เองอยู่แล้ว ซึ่งเปิดฉากต่อสู้ให้เองในตัว (ดู g.onChange ท้ายไฟล์)
  // ห้ามเรียก openBattle() ซ้ำตรงนี้ — เจอ 17 ก.ย. 2569 ว่าเรียกซ้ำทำให้มี onClose สองชุดค้างอยู่บน dlg
  // ชุดเก่าจะมาปิดกล่องกระทะทองแดงทิ้งทันทีที่ฉากต่อสู้จบ (ดู CONCEPT §22.6)
  if (g.dadFight && !g.battle && !g.over && !dlg.open && !fx && Date.now() - lastBattleEnd > 1600) {
    g.startDadFight();
  }
  if (started && g.prisonBreakStatus() === 'pending' && !prisonAlertSeen && !g.battle && !g.over &&
      !dlg.open && !fx && !g.pendingVerdict && !g.pendingLevel && !g.pendingZone &&
      !g.dadFight && Date.now() - lastBattleEnd > 1600) {
    prisonAlertSeen = true;
    openPrisonAlert();
  }
  if (started && g.frontierBreachStatus() === 'pending' && g.devaTestStatus() === 'cleared' &&
      !breachAlertSeen && !g.battle && !g.over && !dlg.open && !fx && !g.pendingVerdict &&
      !g.pendingLevel && !g.pendingZone && !g.dadFight && Date.now() - lastBattleEnd > 1600) {
    breachAlertSeen = true;
    openBreachAlert();
  }
  if (started && g.devaTestStatus() === 'pending' && g.prisonBreakStatus() === 'cleared' &&
      !devaAlertSeen && !g.battle && !g.over && !dlg.open && !fx && !g.pendingVerdict &&
      !g.pendingLevel && !g.pendingZone && !g.dadFight && Date.now() - lastBattleEnd > 1600) {
    devaAlertSeen = true;
    openDevaAlert();
  }
  // ชุด 29C ข้อ 9 — ยมบาทเดินถึงประตูชายแดนขณะ event ปีศาจบุกรออยู่ → เปิดหน้าต่างเตรียมทีมครั้งเดียวต่อรอบที่เดินเข้าไป
  // (ปิดหน้าต่างแล้วยืนต่อไม่เด้งซ้ำ · ออกห่างแล้วกลับมาถึงจะเด้งอีก · กดปุ่ม "เข้าด่านชายแดน" เปิดเองได้ตลอด)
  const march = started && g.breachMarch();
  if (march && g.nearFrontierGate()) {
    if (!breachPrepOffered && !dlg.open && !fx && !g.pendingVerdict && !g.pendingLevel && !g.pendingZone &&
        !g.dadFight && !storyPlaying && !g.storyQueue.length && Date.now() - lastBattleEnd > 1600) {
      breachPrepOffered = true;
      openFrontier(false, march.key);
    }
  } else if (!g.nearFrontierGate(70)) breachPrepOffered = false;
  updatePrisonFab();
  updateBreachFab();
  updateDevaFab();
  if (started && !g.battle && !dlg.open && g.storyQueue.length) { g.onChange(); return; }
  const nextEvent = pendingZoneEvents().find(ev => !zoneEventAlertSeen.has(`${g.zone}:${ev.k}`));
  if (started && nextEvent && !g.battle && !g.over && !dlg.open && !fx &&
      !g.pendingVerdict && !g.pendingLevel && !g.pendingZone && !g.dadFight &&
      Date.now() - lastBattleEnd > 1600) {
    zoneEventAlertSeen.add(`${g.zone}:${nextEvent.k}`);
    openZoneEventAlert(nextEvent);
  }
  updateZoneEventFabs();
}, 400);

// ---------- ลูป ----------
let saveAt = 0;
function frame(now) {
  const dt = Math.min(120, now - last); last = now;
  if (!g.paused && !g.over) { keyWalk(dt); g.stepWorld(dt); }   // ตัวละครเดินตามเวลาจริง ไม่ผูกกับวาระ
  if (!g.paused && !g.over) g.advanceAfterlife(dt);
  if (now > saveAt) { saveAt = now + 4000; g.save(); }
  if (!g.paused && !g.over) {
    acc += dt;
    const step = BAL.tickMs;
    while (acc >= step) { acc -= step; g.step(); if (g.over || g.paused) break; }
  }
  render(ctx, g, now, hover, sel);
  followMarks(); drawAtk(); updateTrialBtn(); updateMobFab(); updateBossFab(); updateFrontierFab(); updateRepairFabs(); drawPauseTag();
  requestAnimationFrame(frame);
}

/** ป้าย "พักอยู่" ทับฉาก — เกมที่พักอยู่กับเกมที่กำลังเล่นเคยหน้าตาเหมือนกันเป๊ะ
 *  ต่างกันแค่ตัวหนังสือบนปุ่มเล็ก ๆ ใต้ฉาก ผู้เล่นจึงนั่งรอทัณฑ์ที่ไม่มีวันเดิน
 *  ไม่ขึ้นตอนเปิดกล่องข้อความ เพราะกล่องพักเกมให้อยู่แล้วโดยตั้งใจ */
let pauseTagOn = null;
function drawPauseTag() {
  const on = g.paused && !g.over && !dlg.open && !g.bossWalk;
  if (on === pauseTagOn) return;
  pauseTagOn = on;
  document.querySelector('.stage').classList.toggle('resting', on);
}

// ---------- แถบทรัพยากร ----------
function bar(v, cls = '') { return `<span class="bar ${cls}"><i style="width:${Math.round(v)}%"></i></span>`; }

/** ข้อ D.2 ชุด 15 — ชิปมุมซ้ายบน 4 อัน map ตรงค่าเดิมในเกม (ตรวจจากโค้ดจริง ไม่ได้เดา):
 *    เหรียญ  = g.coin   (เบี้ยกรรม — สกุลเงินซื้อของ/สร้างสถานี)
 *    ข้าวปั้น = g.food   (เสบียงกองกลาง ป้อนให้ยมทูตหาย/หิว)
 *    ตาชั่ง  = g.order  (ระเบียบ — ตัวคูณรายได้ + ค่าที่พญายมใช้ตรวจการ)
 *    กะโหลก = g.karma  (กรรมท่าน — ยิ่งสูงยิ่งเสี่ยงพ่อลงมาเอง)
 *  บารมี (g.hp) ไม่ได้อยู่แถวนี้แล้วในม็อกอัป — ย้ายไปเป็นแถบเขียวใต้รูปยมบาทน้อย (drawHudAvatar) */
function drawRes() {
  $('#res').innerHTML = `
    <span class="chip tap" data-ex="coin"><img src="img/ui/icon-coin.png" alt=""><b>${Math.round(g.coin)}</b></span>
    <span class="chip tap" data-ex="food"><img src="img/item-food.png" alt=""><b>${Math.round(g.food)}</b></span>
    <span class="chip tap" data-ex="order"><img src="img/ui/icon-justice.png" alt=""><b>${Math.round(g.order)}</b></span>
    <span class="chip tap" data-ex="karma"><img src="img/ui/icon-skull.png" alt=""><b>${g.karma.toFixed(1)}</b></span>
    ${g.mobs.length ? `<span class="chip mob-warn">👹 <b>${g.mobs.length}</b></span>` : ''}`;
  $('#res').querySelectorAll('[data-ex]').forEach(el => el.onclick = () => explainBar(el.dataset.ex));
  $('#tickinfo').textContent = `วาระที่ ${g.tick} · ตรวจการรอบหน้าอีก ${g.nextKpi} วาระ · ผ่านแล้ว ${g.kpiPassed}/${BAL.kpiWin}`;
}

/** ข้อ D.4 — การ์ดยมบาทน้อยมุมซ้ายล่าง: รูป + ยศ(ดาว) + แถบบารมี + ชื่อ
 *  ข้อ 2 ชุดที่ 15b (28 ก.ย. 2569) — คุณเป้ยืนยันแล้ว: ดาวคือระดับ (g.level) ไม่ใช่ star5
 *  "เวลาพ่อเลื่อนขั้นให้ ก็จะ 1 ดาว" — ดวงเต็ม = ถึงขั้นนั้นแล้ว (ฝึกหัด 1 · ประจำโซน 2 · ผู้ตัดสิน 3)
 *  ขั้นสูงกว่า 3 (เจ้าโซนขึ้นไป) ยังโชว์เต็มสามดวงเท่าเดิม (ม็อกอัปมีแค่สามช่อง) · star5 (จำนวนคำตัดสิน
 *  5 ดาวสะสม) ยังนับอยู่เหมือนเดิม ไปโผล่ที่แท็บข้อมูลยมทูต/แฟ้มแทน (ดู stat cards ที่อื่นในไฟล์นี้) */
function drawHudAvatar() {
  const stars = $('#hud-rank-stars');
  if (stars) {
    const lv = Math.min(3, Math.max(0, g.level || 1));
    stars.querySelectorAll('.rk-star').forEach(el => el.classList.toggle('on', Number(el.dataset.lv) <= lv));
  }
  const fill = $('#hud-hp-fill'); if (fill) fill.style.width = `${Math.max(0, Math.min(100, 100 * g.hp / g.hpMax))}%`;
  const mpFill = $('#hud-mp-fill'); if (mpFill) mpFill.style.width = `${Math.max(0, Math.min(100, 100 * g.mp / g.mpMax))}%`;
  const name = $('#hud-ava-name'); if (name) name.textContent = HERO_NAME;
  const img = $('#hud-ava-img');
  if (img) {
    const want = artUrl('hero-yama-profile') || artUrl('hero-yama');
    if (img.dataset.want !== want) {
      img.dataset.want = want;
      img.onerror = function () { this.onerror = () => this.remove(); this.src = artUrl('hero-yama'); };
      img.src = want;
    }
  }
}

/** กดที่แถบไหนก็บอกได้ว่ามันมีไว้ทำอะไร ตอนนี้อยู่ขั้นไหน และหมด/เต็มแล้วเกิดอะไร
 *  (เจ้าของอ่านแล้วไม่รู้ว่าระเบียบกับกรรมท่านมีไว้ทำไม — 7 ก.ย. 2569) */
function explainBar(k) {
  const tiers = (list, now, fmt) => list.map(t =>
    `<div class="tline${t === now ? ' on' : ''}"><b>${esc(fmt(t))}</b> · ${esc(t.name)}<div>${esc(t.eff)}</div></div>`).join('');

  if (k === 'hp') return modal(`<h2>❤️ บารมี — ${Math.round(g.hp)}/${g.hpMax}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      ความน่าเชื่อถือที่พญายมมีให้ท่าน <b>คือชีวิตของท่านในเกมนี้</b></p>
    <div class="tline"><b>หายเมื่อไหร่</b><div>คำตัดสินได้ 0 ดาว หรือลงทัณฑ์เกินกรรมสองวาระขึ้นไป = โดนลูกไฟ บารมีหาย 1 ใน 5 ·
      ได้ 1 ดาว = หาย 10</div></div>
    <div class="tline"><b>ได้คืนเมื่อไหร่</b><div>ตัดสินได้ห้าดาว (พ่อคืนให้นิดหน่อย — และคืนน้อยลงถ้ากรรมท่านสูง) ·
      ${getLang() === 'en' ? `Pick up a <b>medicine chest</b> on the map for +${ITEMS.health.hp} authority` : `เดินไปเก็บ<b>หีบยาอายุวัฒนะ</b>ที่ตกอยู่บนแผนที่ +${ITEMS.health.hp}`}</div></div>
    <div class="tline bad"><b>ถ้าหมด</b><div>จบเกมทันที — พญายมเรียกตราคืนจากมือท่านต่อหน้าทุกคน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'order') return modal(`<h2>⚖️ ระเบียบ — ${Math.round(g.order)} (${esc(g.orderTier().name)})</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      โซนนี้เดินเป็นระบบแค่ไหน <b>เป็นตัวคูณรายได้ของท่านทุกคดี</b> และเป็นตัวเลขที่พญายมใช้ตรวจการ</p>
    <div class="tline"><b>ขึ้นเมื่อ</b><div>ปิดคดีได้คะแนนดี · ปราบเปรต (+3) · มีหอทะเบียนกรรม (+${BAL.orderGainSala}/วาระ)</div></div>
    <div class="tline"><b>ลงเมื่อ</b><div>คิวเกิน ${g.queueCap()} ดวง (ยิ่งล้นยิ่งตกเร็ว${g.has('tarang') ? ' · ตะรางขยายให้แล้ว' : ' — สร้างตะรางรอวาระขยายได้'}) · ปล่อยเปรตไว้ · คำตัดสินคะแนนต่ำ ·
      ตรวจการไม่ผ่าน (−10) · กรรมท่านสูงเกิน 75</div></div>
    ${tiers(ORDER_TIERS, g.orderTier(), t => t.min + '+')}
    <div class="tline bad"><b>ถ้าหมด (0)</b><div>พญายมเตือนให้ตั้งหลักได้สามครั้ง หลังจากนั้นท่านจะลงมาปราบและส่งยมบาทไปรับโทษในกระทะทองแดง</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'karma') return modal(`<h2>☠️ กรรมท่าน — ${g.karma.toFixed(1)} (${esc(g.karmaTier().name)})</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      บาปที่ <b>ตกใส่ตัวท่านเอง</b> ไม่ใช่ของวิญญาณ — แกนของเกมทั้งเกมคือ
      "ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน มันมาอยู่ที่ผู้ตัดสิน"</p>
    <div class="tline"><b>ขึ้นเมื่อ</b><div>ลงทัณฑ์เกินกรรมที่เขาก่อ (ยิ่งเกินยิ่งหนัก) · ส่งผิดชนิดกรรม (+4) ·
      ใช้สะกดจิต (+4) · ตวาดข่มขู่ (+0.5)</div></div>
    <div class="tline good"><b>ลดได้ยังไง</b><div>ตัดสินได้ห้าดาว −${KARMA_RELIEF.star5} ·
      เก็บ<b>ดอกบัวบูชา</b>ที่ตกบนแผนที่ (ตกให้เมื่อกรรมเกิน 40) −4 ·
      บูชาดอกบัวที่<b>ศาลาน้ำชา</b> ${KARMA_RELIEF.lotusCost} เบี้ย −${KARMA_RELIEF.lotusCut} (แท็บก่อสร้าง)</div></div>
    ${tiers(KARMA_TIERS, g.karmaTier(), t => '≤' + t.max)}
    <div class="tline bad"><b>ถ้าเต็ม (100)</b><div>พญายมลงมาปราบด้วยตัวเอง แพ้แล้วถูกส่งลงกระทะทองแดง บารมีเหลือ 1 และกรรมลดลงหลังชดใช้บางส่วน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'food') return modal(`<h2>🍙 เสบียง — ${Math.round(g.food)} ห่อ${g.workingCrew?.size
      ? (g.fed ? ' · <span style="color:var(--success)">อิ่ม ทำงานไว</span>' : ' · <span style="color:var(--destructive)">หิว ทำงานช้า</span>') : ''}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      ค่าจ้างยมทูต — ไม่ใช่ของสถานีอีกต่อไป <b>ยมทูตที่กำลังคุมสถานี/ออกรับดวง</b>กินเสบียงทุกวาระเหมือนกันหมด</p>
    <div class="tline bad"><b>ถ้าหมด</b><div>ยมทูตที่กำลังทำงานอยู่<b>ทำงานช้าลง</b> — ไม่หยุดสนิท แค่คดีคืบหน้าช้าลง</div></div>
    <div class="tline good"><b>ถ้ามีพอ</b><div>ยมทูตที่กำลังทำงานอยู่ทำงาน<b>ไวขึ้น</b></div></div>
    <div class="tline"><b>เติมยังไง</b><div>${getLang() === 'en' ? `Buy 10 food packs in Build for ${BAL.foodPrice * 10} coins, or pick up food packs on the map` : `ซื้อที่แท็บก่อสร้าง (${BAL.foodPrice * 10} เบี้ย/10 ห่อ) หรือเดินไปเก็บ<b>ห่อเสบียง</b>บนแผนที่`}</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  return modal(`<h2>🪙 เบี้ยกรรม — ${Math.round(g.coin)}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      เงินของโซน ใช้สร้างสถานี จ้างยมทูต ซื้อเสบียง และบูชาดอกบัว</p>
    <div class="tline"><b>ได้จาก</b><div>ปิดคดี (คูณด้วยระเบียบของโซน) · สี่ดาว +25 · ห้าดาว +60 ·
      ${getLang() === 'en' ? `Defeat a demon +${MOB.bounty} coins · Pass inspection +150` : `ปราบเปรต +${MOB.bounty} · ตรวจการผ่าน +150`}</div></div>
    <div class="tline"><b>เสียไปกับ</b><div>ค่าแรงยักษ์ทวารบาลทุก ${BAL.payEvery} วาระ · ค่าสร้าง · ค่าจ้างแรกเข้า · ค่าเสบียง</div></div>
    <div class="tline bad"><b>ถ้าติดลบถึง −300</b><div>จบเกม — ยมทูตวางเครื่องมือแล้วเดินออกไปพร้อมกัน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);
}

// ---------- แผงข้าง ----------
/** น้ำหนักติดลบ = ข้อเท็จจริงที่ "ลดกรรม" ของคดีนั้น (เช่น เหตุที่ทำให้เห็นใจ)
 *  เดิมเอาไปเปิดตาราง WEIGHT ตรง ๆ แล้วได้คำว่า undefined ห้อยท้ายสำนวน
 *  (เจ้าของเจอ 10 ก.ย. 2569 ในคดีของน้องแพรวา) */
const weightLabel = w => w < 0 ? 'บรรเทาโทษ' : (WEIGHT[w] || '');
function deedLine(d) {
  const w = weightLabel(d.w);
  return `<span class="tag" style="background:${SINS[d.s].color}22;color:${SINS[d.s].color}">${SINS[d.s].name}</span>${esc(d.t)}`
    + (w ? ` <b style="color:var(--${d.w < 0 ? 'success' : 'warning'})">· ${w}</b>` : '');
}

/** สิ่งที่นิราอ่านได้ก่อนสอบสวน: ภาพลักษณ์ + บุญที่อ้างเท่านั้น
 *  ไม่ติดป้ายว่าบุญไหนจริง/ปลอม เพราะนั่นคือคำตอบของคดี */
function publicMeritLine(m, cls = 'deed') {
  return `<div class="${cls}" style="color:var(--success)">🪷 ${esc(m.t)}`
    + (m.note ? ` <i style="color:var(--warning)">— ${esc(m.note)}</i>` : '') + '</div>';
}
function publicDossier(s, cls = 'deed') {
  const faceLine = s.face ? `<div class="${cls}" style="color:var(--accent-foreground)">${esc(s.face)}</div>` : '';
  const merits = s.merits.filter(m => !m.exposed).map(m => publicMeritLine(m, cls)).join('');
  const found = s.deeds.filter(d => d.known && d.visible !== false)
    .map(d => `<div class="${cls}">${deedLine(d)}</div>`).join('');
  return faceLine + merits + found;
}

/** รูปหน้าเล็กในรายชื่อ — ไม่มีไฟล์โปรไฟล์ก็ถอยไปเป็นอีโมจิตัวเดิม */
function face(key, glyph) {
  return `<span class="g"><img src="${artUrl(key + '-profile') || artUrl(key)}" alt=""
    onerror="this.parentNode.textContent='${glyph}'"></span>`;
}

function drawTab() {
  const b = $('#tabbody');
  if (tab === 'queue') {
    const sentenced = g.sentences.filter(x => x.zone === g.zone);
    if (!g.queue.length && !g.held.length && !sentenced.length) { b.innerHTML = '<div class="empty">คิวว่าง — โซนนี้สงบผิดปกติ</div>'; return; }
    const cap = g.queueCap(), over = g.queue.length - cap;
    b.innerHTML = `<div style="font-size:var(--text-xs);margin-bottom:8px;color:${over > 0 ? 'var(--destructive)' : 'var(--muted-foreground)'}">
        คิว ${g.queue.length}/${cap} ดวง${over > 0 ? ` · <b>ล้น ${over} ดวง ระเบียบกำลังตก</b>`
          : ' · เกินความจุแล้วระเบียบจะเริ่มตก'}${g.has('tarang')
            ? ` · 🔒 ตะราง ${g.held.length}/${TARANG.hold}` : ''}</div>`;
    b.innerHTML += g.queue.map(s => `
      <div class="soul" data-soul="${s.id}">
        <div class="top"><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.who)}${s.back ? ' <span style="color:var(--destructive);font-size:var(--text-xs)">↩️ ยังไม่สำนึก · กลับเข้าคิวก่อนเกิดใหม่</span>' : ''}</b><span class="id ${s.waited > 40 ? 'wait' : ''}">#${String(s.id).padStart(3, '0')} · รอ ${s.waited} วาระ</span></div>
        ${s.case ? publicDossier(s) : s.deeds.filter(d => d.known).map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
        ${s.case ? '' : s.merits.filter(m => !m.exposed).map(publicMeritLine).join('')}
      </div>`).join('');
    // คนที่ถูกขังอยู่ — ไม่นับในคิว ไม่กัดระเบียบ แต่กินค่าข้าวทุกวาระ เบิกตัวขึ้นแท่นได้ตลอด
    if (g.held.length) {
      b.innerHTML += `<div class="sec">🔒 อยู่ในตะราง — ค่าข้าว ${(TARANG.feed * g.held.length).toFixed(1)} เบี้ยต่อวาระ</div>`
        + g.held.map(s => `
        <div class="soul" style="border-color:var(--input)">
          <div class="top"><b>${s.name ? esc(s.name) + ' · ' : ''}${esc(s.who)}</b>
            <span class="id">#${String(s.id).padStart(3, '0')} · ขังมา ${s.waited} วาระ</span></div>
          ${s.case ? publicDossier(s) : s.deeds.filter(d => d.known).map(d => `<div class="deed">${deedLine(d)}</div>`).join('')}
          <button class="sm" data-free="${s.id}" style="margin-top:6px">🔓 เบิกตัวขึ้นแท่น</button>
        </div>`).join('');
      b.querySelectorAll('[data-free]').forEach(x =>
        x.onclick = e => { e.stopPropagation(); g.release(+x.dataset.free); refresh(); });
    }
    if (sentenced.length) b.innerHTML += `<div class="sec">🔒 หลังรับทัณฑ์ — ${sentenced.length} ดวง</div>`
      + sentenced.map(x => `<div class="soul"><div class="top"><b>${esc(x.soul.name || x.soul.who)}</b>
        <span class="id">#${String(x.soul.id).padStart(3, '0')}</span></div>
        <div class="deed">${x.stage === 'prison'
          ? x.inspected ? (x.repentant ? 'นิราตรวจแล้ว: เข็ดแล้ว · รอส่งไปประตูสวรรค์' : 'นิราตรวจแล้ว: ยังไม่เข็ด · รอส่งกลับคิว')
            : g.tick < (x.readyAt ?? x.until ?? 0) ? `อยู่ในตะราง · ตรวจได้อีก ${Math.max(0, (x.readyAt ?? x.until) - g.tick)} วาระ` : 'อยู่ในตะราง · รอนิราตรวจ'
          : x.checked ? `บุญตรวจแล้ว: กรรมคงเหลือ ${x.karmaLeft} · รอส่ง${x.karmaLeft > 0 ? 'ไปเกิดใหม่' : 'ขึ้นสวรรค์'}` : 'อยู่ที่ประตูสวรรค์ · รอบุญตรวจ'}</div></div>`).join('');
    b.querySelectorAll('[data-soul]').forEach(x =>
      x.onclick = () => {                       // เรียกคดีนี้ขึ้นมาที่แท่นก่อน
        const i = g.queue.findIndex(s => s.id === +x.dataset.soul);
        if (i > 0) g.queue.unshift(g.queue.splice(i, 1)[0]);
        pick = { st: null, cr: null, inten: null };
        refresh();
      });

  } else if (tab === 'crew') {
    const canHire = CREW.filter(c => !g.crew.some(x => x.k === c.k));
    b.innerHTML = g.crew.map(c => `
      <div class="crew">
        ${face('crew-' + c.k, c.glyph)}
        <span class="n"><b>${c.name}</b>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">กำลังใจ ${Math.round(c.morale)} · ${c.reader ? '<b style="color:var(--gold)">อ่านสำนวนให้ท่าน — ไม่รับเวรลงทัณฑ์</b>' : c.at ? 'ประจำ' + (STATIONS.find(s => s.k === c.at)?.name ?? '') : 'ว่าง — รอรับเวร'}${g.workingCrew?.has(c.k)
            ? (g.fed ? ' · <b style="color:var(--success)">🍙 อิ่ม ทำงานไว</b>' : ' · <b style="color:var(--destructive)">🍙 หิว ทำงานช้า</b>') : ''}</div>
        </span>
      </div>`).join('')
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">
           ยังจ้างได้ · เบี้ยกรรมของท่านตอนนี้ ${Math.round(g.coin)}</div>`
      + (canHire.length ? canHire.map(c => `
      <div class="crew">
        ${face('crew-' + c.k, c.glyph)}
        <span class="n"><b>${crewName(c, g.zone)}</b> <span class="st" style="display:inline">— ${esc(c.duty)}</span>
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">${esc(c.line)}</div></span>
        <button class="sm" data-hire="${c.k}" ${g.coin < c.hire ? 'disabled' : ''}>จ้าง ${c.hire}</button>
      </div>`).join('') : '<div class="empty">จ้างครบทุกคนแล้ว</div>')
      // ยักษ์ทวารบาลอยู่ในแท็บนี้ด้วย — เป็นคน ไม่ใช่สิ่งก่อสร้าง
      // (เดิมตัวจัดการปุ่มไปรออยู่แท็บก่อสร้าง แต่ไม่เคยมีใครวาดปุ่มให้ เลยจ้างไม่ได้เลย)
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">ยามประจำโซน</div>
      <div class="crew">
        ${face(GUARD.img, '🛡️')}
        <span class="n"><b>${GUARD.name}</b>
          <div class="st">${esc(GUARD.desc)} · ค่าแรง ${GUARD.pay}</div>
          <div class="st">${esc(GUARD.line)}</div></span>
        ${g.guard ? '<button class="sm" disabled>จ้างแล้ว</button>'
                  : `<button class="sm" id="hireg" ${g.coin < GUARD.hire ? 'disabled' : ''}>จ้าง ${GUARD.hire}</button>`}
      </div>`;
    b.querySelectorAll('[data-hire]').forEach(el =>
      el.onclick = () => { g.hire(el.dataset.hire); refresh(); });
    const hg2 = b.querySelector('#hireg');
    if (hg2) hg2.onclick = () => { g.hireGuard(); refresh(); };

  } else {
    b.innerHTML = `
      <div class="shop"><span class="g">🍙</span>
        <span class="n"><b>${getLang() === 'en' ? '10 food packs' : 'เสบียง 10 ห่อ'}</b><div>ค่าจ้างยมทูตที่กำลังทำงาน — หมดแล้วยังทำงานได้ แค่ช้าลง</div></span>
        <button class="sm" id="buyfood" ${g.coin < BAL.foodPrice * 10 ? 'disabled' : ''}>${getLang() === 'en' ? 'Buy' : 'ซื้อ'} ${BAL.foodPrice * 10}</button>
      </div>
      `
      + (g.stations.some(x => x.def.k === 'tea') ? `
      <div class="shop"><span class="g">🪷</span>
        <span class="n"><b>ดอกบัวบูชา</b><div>วางที่ศาลาน้ำชา — ลดกรรมของท่านเอง ${KARMA_RELIEF.lotusCut}
          (ตอนนี้กรรมท่าน ${g.karma.toFixed(1)})</div></span>
        <button class="sm" id="buylotus" ${g.karma <= 0 || g.coin < KARMA_RELIEF.lotusCost ? 'disabled' : ''}>บูชา ${KARMA_RELIEF.lotusCost}</button>
      </div>` : '')
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">
           สถานีทัณฑ์ — <b>สร้างแนวไหน สำนวนแนวนั้นถึงจะถูกส่งเข้าคิว</b><br>
           ตอนนี้โซนนี้รับได้: ${g.activeTags().map(t => `<span class="tag" style="background:${SINS[t].color}22;color:${SINS[t].color}">${SINS[t].name}</span>`).join(' ') || 'ยังไม่มีเลย'}</div>`
      + STATIONS.filter(s => s.cost > 0).map(s => {
        const built = g.stations.some(x => x.def.k === s.k);
        const bt = g.availableBuilder(), builderBusy = !bt;
        const open = s.tags.filter(t => !g.activeTags().includes(t)).map(t => SINS[t].name);
        return `<div class="shop"><span class="g">${s.glyph}</span>
          <span class="n"><b>${s.name}</b><div>${esc(s.desc)}</div>
            ${s.use ? `<div style="color:var(--gold)">${esc(s.use)}</div>` : ''}
            <div>${s.tags.length ? 'ตรงกรรม: ' + s.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}</div>
            ${!built && open.length ? `<div style="color:var(--gold)">สร้างแล้วจะเริ่มมีสำนวน "${open.join(' · ')}" ส่งเข้าคิว</div>` : ''}</span>
          <button class="sm" data-build="${s.k}" ${built || g.coin < s.cost || builderBusy ? 'disabled' : ''}
            ${!built && builderBusy ? `title="${esc(g.builders().length ? 'ช่างทุกคนติดงานอื่นอยู่' : 'ต้องจ้างช่างก่อน')}"` : ''}>${built ? 'สร้างแล้ว' : builderBusy ? 'ช่างไม่ว่าง' : 'สร้าง ' + s.cost}</button>
        </div>`;
      }).join('');
    const bf = $('#buyfood'); if (bf) bf.onclick = () => { g.buy('food', 1); refresh(); };
    const bl = $('#buylotus'); if (bl) bl.onclick = () => { g.buy('lotus'); refresh(); };
    b.querySelectorAll('[data-build]').forEach(el =>
      el.onclick = () => { g.build(el.dataset.build); refresh(); });
  }
}

// ---------- แผงข้อมูล (dashboard) ----------
// แทนที่แถบบันทึกเดิม — กดตัวละคร/วิญญาณบนฉากแล้วดูรายละเอียดตรงนี้
// บันทึกยังอยู่ ย้ายไปเป็นแท็บที่สองของแผงเดียวกัน
let side = 'info';                  // 'info' | 'log'
let sel = { kind: 'me', key: 0 };   // ตัวที่กำลังดูอยู่

/** ตั้งตัวที่กำลังดู แล้ววาดใหม่ทันที (สลับมาแท็บข้อมูลให้ด้วย) */
function select(s) { sel = s; side = 'info'; refresh(); }

const nameOfSt = k => STATIONS.find(d => d.k === k)?.name ?? '—';

/** หัวโปรไฟล์: รูป + ชื่อ + หน้าที่ + กำลังทำอะไรอยู่
 *  ลองรูปโปรไฟล์เต็มใบก่อน (img/<key>-profile.png) ไม่มีค่อยถอยไปใช้รูป standee เดิม
 *  → gen รูปโปรไฟล์ตัวไหนมาใหม่ ก็แค่วางไว้ img/raw/<key>-profile.jpeg แล้วรัน scripts/prep-art.py
 *    ไม่ต้องแตะโค้ดสักบรรทัด (7 ก.ย. 2569) */
function profile(imgKey, name, duty, now) {
  // ไม่มีทั้งรูปโปรไฟล์และรูป standee ก็ซ่อนกรอบไปเลย อย่าปล่อยไอคอนรูปแตกไว้
  const std = artUrl(imgKey);
  const fallback = `this.onerror=function(){this.style.visibility='hidden'};`
                 + `this.src='${std}';this.classList.remove('full')`;
  return `<div class="prof">
    <img class="full" src="${artUrl(imgKey + '-profile') || std}" alt=""
         onerror="${fallback}" onload="if(!this.src.includes('-profile'))this.classList.remove('full')">
    <div class="hd"><b>${esc(name)}</b>
      <div class="duty">${esc(duty)}</div>
      <div class="now">${now}</div></div></div>`;
}
const think = t => `<div class="think">${esc(t)}</div>`;
const kv = arr => `<div class="kv">${arr.map(x => `<span>${x}</span>`).join('')}</div>`;

/** ความคิดของยมบาท — เปลี่ยนตามสถานะจริง ไม่ใช่ประโยคตายตัว */
function meThought() {
  if (g.hp <= g.hpMax * 0.35) return '"บารมีเหลือเท่านี้ ถ้าหมดพ่อคงลงมาจัดการข้าเอง"';
  if (g.karma >= 45) return '"บัญชีของข้าหนาขึ้นทุกคดี... ทัณฑ์ที่เกินกรรมมันมาอยู่ที่ข้าจริง ๆ"';
  if (g.queue.length > g.queueCap()) return '"คิวล้นขนาดนี้ ระเบียบไม่มีทางขึ้น ต้องรีบปิดคดี"';
  if (g.mobs.length) return '"เปรตขึ้นมาอีกแล้ว ปล่อยไว้ระเบียบตกไปเรื่อย ๆ"';
  if (g.food < 12) return '"เสบียงใกล้หมด ยมทูตที่กำลังทำงานอยู่จะเริ่มช้าลง"';
  if (g.star5 >= 3) return '"ห้าดาวมาสามครั้งแล้ว อีกสองครั้งก็เลื่อนขั้น"';
  return '"พิพากษาให้ตรงกรรม ไม่ใช่ให้แรงที่สุด — พ่อพูดไว้แบบนั้น"';
}

/** เฉลยคดี: ความจริงทั้งหมด vs สิ่งที่เราสั่งไป
 *  17 ก.ย. 2569 — คุณเป้สั่ง: hidden/reveal เปิดได้แค่หลังสอบสวนหรือใช้พลังเท่านั้น
 *  ก่อนหน้านี้ฟังก์ชันนี้โชว์ soul.deeds/merits "ทั้งชุด" ไม่กรองเลย ไม่ว่า closed จะเป็นอะไร
 *  พอถูกเรียกตอนวิญญาณ "กำลังรับทัณฑ์" (stx ใน infoOf, closed=false) — คือแค่ลากไปส่งสถานี
 *  ยังไม่ทันสอบสวน/ใช้พลังสักครั้ง — เรื่องที่ซ่อนไว้กับบุญปลอมก็โชว์เต็มอยู่ดี ทั้งที่ข้อความ
 *  hint ก่อนหน้านั้นบอกผู้เล่นไว้เองว่า "เฉลยจะขึ้นตรงนี้หลังปิดคดีแล้ว" (ui.js บรรทัด ~489)
 *  ตอนนี้: ระหว่างรับทัณฑ์ (!closed) กรองเหลือเฉพาะที่ known/exposed จริงแล้วเท่านั้น
 *  ปิดคดีแล้ว (closed) ถึงโชว์เต็มชุด — ตรงกับ hint เดิมทุกตัวอักษร ไม่ได้แก้ข้อความอะไร */
function verdictCard(soul, r, stK, crewK, intensity, closed) {
  const st = STATIONS.find(d => d.k === stK);
  const shownDeeds = closed ? soul.deeds : soul.deeds.filter(d => d.known);
  // "ตรงชนิดกรรม" ต้องเทียบกับเรื่องที่เห็นแล้วเท่านั้นด้วย — ไม่งั้นสถานีจะขึ้น "ตรงชนิดกรรม"
  // เพราะเรื่องที่ซ่อนไว้ (ยังไม่สอบสวน) บังเอิญตรง ทั้งที่ผู้เล่นไม่เคยเห็นเรื่องนั้นเลย
  const hit = st && shownDeeds.some(d => st.tags.includes(d.s));
  const truth = shownDeeds.map(d =>
    `<div class="row-truth ${d.known ? '' : 'hid'}">${SINS[d.s].name} · ${esc(d.t)} (น้ำหนัก ${d.w})${d.known ? '' : ' ← เรื่องที่สำนวนไม่ได้เขียนไว้'}</div>`).join('')
    || '<div class="row-truth">สำนวนว่างเปล่า</div>';
  const shownMerits = closed ? soul.merits : soul.merits.filter(m => !m.fake || m.exposed);
  const merit = shownMerits.map(m =>
    `<div class="row-truth ${m.fake ? 'fake' : ''}">🪷 ${esc(m.t)}${m.fake ? ' ← บุญปลอม เขากุขึ้นเอง' : ` (ลด ${m.v} วาระ)`}</div>`).join('')
    || '<div class="row-truth">ไม่มีบุญถ่วงเลย</div>';

  const diff = intensity - soul.deserved;
  const judgement = diff === 0 ? '<b style="color:var(--success)">พอดีกรรมเป๊ะ</b>'
    : diff > 0 ? `<b style="color:var(--destructive)">หนักเกินไป ${diff} วาระ</b> — ส่วนเกินกลายเป็นกรรมของท่าน +${r.karma}`
               : `<b style="color:var(--warning)">เบาไป ${-diff} วาระ</b> — เขายังไม่สำนึก`;

  return `<div class="sec">ความจริงทั้งหมด (ตอนนี้เห็นได้แล้ว)</div>${truth}
    <div class="sec">บุญที่อ้าง</div>${merit}
    <div class="sec">${closed ? 'ท่านตัดสินไปว่า' : 'ท่านสั่งไปว่า'}</div>
    <div class="row-truth">ส่ง<b>${esc(st?.name ?? '—')}</b> ${hit ? '<span style="color:var(--success)">ตรงชนิดกรรม</span>' : '<span style="color:var(--destructive)">ไม่ตรงชนิดกรรม</span>'}
      · ผู้คุม ${esc(g.crewOf(crewK)?.name ?? crewName(CREW.find(c => c.k === crewK), g.zone))}</div>
    <div class="row-truth">ระดับวาระ <b>${intensity} ${INTENSITY[intensity]}</b> · สมควรได้รับ <b>${soul.deserved}</b> → ${judgement}</div>
    ${kv([`ธรรม ${r.tham}`, `เข็ด ${r.ked}`, `ระเบียบ ${r.rab}`, `รวม ${r.score}`,
          '★'.repeat(r.stars ?? 0) + '☆'.repeat(5 - (r.stars ?? 0))])}`;
}

function drawSide() {
  const box = $('#side');
  $('#side-info').setAttribute('aria-selected', side === 'info' ? 'true' : 'false');
  $('#side-log').setAttribute('aria-selected', side === 'log' ? 'true' : 'false');

  if (side === 'log') {
    box.className = 'log';
    box.innerHTML = g.logs.map(l =>
      `<div class="${l.kind}"><span style="opacity:.45">[${String(l.t).padStart(3, '0')}]</span> ${esc(l.text)}</div>`).join('');
    return;
  }
  box.className = 'sidebody';

  // แถวปุ่มเลือกตัว — กดบนฉากก็ได้ กดตรงนี้ก็ได้
  const chips = [`<button data-sel="me:0" ${sel.kind === 'me' ? 'aria-pressed="true"' : ''}>👑 ตัวท่าน</button>`]
    .concat(g.crew.map(c => `<button data-sel="crew:${c.k}" ${sel.kind === 'crew' && sel.key === c.k ? 'aria-pressed="true"' : ''}>${c.glyph} ${esc(c.name)}</button>`))
    .concat(g.guard ? [`<button data-sel="guard:0" ${sel.kind === 'guard' ? 'aria-pressed="true"' : ''}>🛡️ ยักษ์</button>`] : [])
    .concat(g.mobs.map((m, i) => `<button data-sel="mob:${i}" ${sel.kind === 'mob' && sel.key === i ? 'aria-pressed="true"' : ''}>👹 เปรต</button>`))
    .concat(g.closed.length ? [`<button data-sel="closed:0" ${sel.kind === 'closed' ? 'aria-pressed="true"' : ''}>📁 คดีที่ปิดแล้ว</button>`] : []);
  let html = `<div class="picker">${chips.join('')}</div>`;

  html += sideBody();
  box.innerHTML = html;
  box.querySelectorAll('[data-sel]').forEach(el => el.onclick = () => {
    const [kind, key] = el.dataset.sel.split(':');
    select({ kind, key: /^\d+$/.test(key) ? +key : key });
  });
  const office = box.querySelector('#open-nira-office');
  if (office) office.onclick = openNiraOffice;
  bindHungerWidgets(box, () => refresh());
}

/** เนื้อของแผงข้อมูลตามตัวที่เลือก */
function sideBody() {
  // ---- ตัวเรา ----
  if (sel.kind === 'me') {
    const pw = POWERS.map(p => {
      const q = g.powerOf(p.k), ready = g.powerReady(p.k);
      const ammo = q.ammo + (p.k === 'mirror' ? g.inventory.mirror || 0 : 0);
      const state = g.powerLocked(p) ? `ล็อก (ขั้น ${p.lv})`
                  : p.realtime ? (ready ? 'พร้อม — ไม่ต้องใช้ item' : `รออีก ${fmtCountdown(q.readyAt)}`)
                  : ammo <= 0 ? 'หมด' : q.cd > 0 ? `รอ ${q.cd} คดี` : `พร้อม ×${ammo}`;
      return `<div class="row-truth">${p.glyph.startsWith('img/') ? `<img class="power-glyph" src="${p.glyph}" alt="">` : esc(p.glyph)} <b>${esc(p.name)}</b> — ${esc(p.desc)} <span style="color:var(--gold)">[${state}]</span></div>`;
    }).join('');
    // ข้อ L คุณเป้เจอ 25 ก.ย. 2569 (รูป 17) — แผงข้อมูลเดิมไม่บอกเลขขั้นตรง ๆ (มีแต่ชื่อขั้น) และไม่บอก
    // พลังโจมตีเลย ต่อให้เดาไม่ได้ว่าตัวเองแรงแค่ไหน — ดึงจาก BATTLE.atk ตรง ๆ (ค่าจริงที่ใช้ตอนฟาด
    // ไม่ใช่เลขคิดเอง) ไม่แตะระบบต่อสู้ตามข้อห้ามใบงาน แค่โชว์ค่าที่มีอยู่แล้ว
    // ตารางปลดล็อก: รวมพลัง (POWERS.lv) + เรียกยมทูตช่วยรบ (CREW_HELP_LV) + โซนที่เปิดตามขั้น
    // (ZONES.level) — ดึงจากข้อมูลจริงทั้งหมด ไม่พิมพ์เลขซ้ำด้วยมือ ที่ยังไม่ถึงขั้นแสดงล็อกพร้อมบอก
    // ขั้นที่ต้องใช้ตามที่คุณเป้ขอ
    const unlockRows = [
      ...POWERS.map(p => ({ lv: p.lv, glyph: p.glyph, name: p.name, place: 'พลังไต่สวน/ต่อสู้' })),
      { lv: CREW_HELP_LV, glyph: '🤝', name: 'เรียกยมทูตช่วยในฉากต่อสู้', place: 'ฉากต่อสู้ทุกโซน' },
      ...ZONES.filter(z => z.k !== 'th').map(z => ({ lv: z.level, glyph: '🗺️', name: `ย้ายไป${z.name}`, place: z.sub })),
    ].sort((a, b) => a.lv - b.lv);
    const unlockTable = unlockRows.map(r => {
      const locked = g.level < r.lv;
      return `<div class="row-truth">${r.glyph.startsWith('img/') ? `<img class="power-glyph" src="${r.glyph}" alt="">` : esc(r.glyph)} <b>${esc(r.name)}</b>${r.place ? ` — ${esc(r.place)}` : ''}
        <span style="color:${locked ? 'var(--muted-foreground)' : 'var(--gold)'}">[${locked ? `ล็อก · ต้องขั้น ${r.lv}` : `ปลดล็อกแล้ว · ขั้น ${r.lv}`}]</span></div>`;
    }).join('');
    return profile('hero-yama', 'ยมบาท (ตัวท่าน)', `ขั้น ${g.level}/${LEVELS.length} · ${LEVELS[g.level - 1].name}`,
        `ลูกของพญายม ถูกส่งมาคุมโซนสุวรรณภูมิ · ปิดคดีแล้ว ${g.casesDone} เรื่อง`)
      + think(meThought())
      + kv([`❤️ บารมี ${Math.round(g.hp)}/${g.hpMax}`, `☠️ กรรม ${g.karma.toFixed(1)}`,
            `⚔️ พลังโจมตี ${BATTLE.atk[0]}-${BATTLE.atk[1]}`,
            `⭐ ห้าดาว ${g.star5}`, `📁 เฉลี่ย ${g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0}`,
            `🪙 ${Math.round(g.coin)}`, `🍙 เสบียง ${Math.round(g.food)}`, `🔹 MP ${Math.round(g.mp)}/${g.mpMax}`, `✨ EXP ${g.exp}/${LEVELS[g.level]?.exp || 'MAX'}`])
      + `<div class="sec">หน้าที่</div>
         <div class="row-truth">พิพากษาให้ <b>ตรงกรรม</b> — ตรงชนิดบาป และหนักพอดี ไม่ใช่หนักที่สุด</div>
         <div class="sec">ความสามารถ</div>${pw}
         <div class="sec">ปลดล็อกที่ขั้นไหน</div>${unlockTable}
         <div class="hintline">กดตัวละครหรือวิญญาณบนฉากเพื่อดูข้อมูลของเขา</div>`;
  }

  // ---- ยมทูต ----
  if (sel.kind === 'crew') {
    const c = g.crewOf(sel.key);
    if (!c) return '<div class="empty">ยมทูตคนนี้ไม่ได้อยู่ในสังกัดแล้ว</div>';
    const st = c.at ? g.stations.find(s => s.def.k === c.at) : null;
    const now = st && st.slots.length
      ? `กำลังคุม <b>${st.slots.map(sl => esc(sl.soul.who)).join(' · ')}</b> ที่${esc(st.def.name)}
         · ${st.slots.length}/${g.stCap(st)} ดวง
         · คืบหน้าดวงแรก ${Math.round(100 * st.slots[0].progress / st.slots[0].need)}%`
      : c.reader ? `ยืนอ่านสำนวนอยู่ข้างแท่นพิพากษา — คิวตอนนี้ ${g.queue.length} ดวง`
      : c.at ? `ประจำ${esc(nameOfSt(c.at))} รอสำนวนถัดไป` : 'ว่าง — รอรับเวร';
    const strong = [['แรง', c.raeng], ['ระเบียบ', c.rabiab], ['ปัญญา', c.panya], ['เมตตา', c.metta]]
      .sort((a, b) => b[1] - a[1]);
    // ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — โชว์ท่าสู้/ตัวเลขจริงตรงกับโต๊ะนิรา (ดึงจาก CREW_POWER ที่เดียวกัน)
    const battleLine = !c.reader
      ? `<div class="row-truth">⚔️ ท่าสู้: <b>${crewAbility(c.k)}</b> · คูลดาวน์ ${BATTLE.crewCd} วินาที</div>` : '';
    return profile('crew-' + c.k, c.name, c.duty, now)
      + think(c.say && Date.now() < c.sayUntil ? c.say : pickStable(c.says, c.k))
      + kv([`แรง ${c.raeng}`, `ระเบียบ ${c.rabiab}`, `ปัญญา ${c.panya}`, `เมตตา ${c.metta}`,
            `กำลังใจ ${Math.round(c.morale)}`,
            ...(g.workingCrew?.has(c.k) ? [g.fed ? '🍙 อิ่ม ทำงานไว' : '🍙 หิว ทำงานช้า'] : [])])
      + `<div class="sec">ถนัดอะไร</div>
         <div class="row-truth">เด่นที่ <b>${strong[0][0]} ${strong[0][1]}</b> · อ่อนที่ ${strong[3][0]} ${strong[3][1]}</div>
         <div class="row-truth">${crewNote(c)}</div>
         ${battleLine}
         ${!c.reader ? `<div class="sec">คุยกับ${esc(c.name)}</div>${hungerWidget(c)}` : ''}
         ${c.morale < 40 ? '<div class="row-truth hid">กำลังใจต่ำ — ทำงานช้าลง ควรให้พักที่ศาลาน้ำชา</div>' : ''}
         ${c.k === 'nira' ? '<button class="gold" id="open-nira-office">📋 จ้างยมทูต · จัดทีม</button>' : ''}`;
  }

  // ---- ยักษ์ทวารบาล ----
  if (sel.kind === 'guard') {
    if (!g.guard) return '<div class="empty">ยังไม่ได้จ้างยักษ์ทวารบาล</div>';
    return profile(GUARD.img, GUARD.name, 'ยามประจำโซน',
        g.mobs.length ? `กำลังไล่เปรต ${g.mobs.length} ตน` : 'ไม่มีเปรต — เฝ้าท่าเรือฝั่งขวาอยู่')
      + think(GUARD.line)
      + kv([`ค่าแรง ${GUARD.pay}/งวด`])
      + `<div class="sec">หน้าที่</div><div class="row-truth">${esc(GUARD.desc)}</div>`;
  }

  // ---- เปรต ----
  if (sel.kind === 'mob') {
    const m = g.mobs[sel.key];
    if (!m) return '<div class="empty">เปรตตนนั้นถูกปราบไปแล้ว</div>';
    const kd = MOB.kinds[m.kind ?? 0] || { name: MOB.name, img: MOB.img, line: '"หิว... หิว..."' };
    return profile(kd.img, kd.nameKey ? t(kd.nameKey) : kd.name, 'วิญญาณที่หลุดออกมาก่อกวน',
        getLang() === 'en' ? `Drains ${(MOB.drain).toFixed(2)} order per term while present`
          : `กัดระเบียบไป ${(MOB.drain).toFixed(2)} ต่อวาระ ตราบใดที่ยังอยู่`)
      + (kd.line ? think(kd.line) : '')
      + kv([`เลือด ${m.hp}/${MOB.hp}`, getLang() === 'en' ? `Defeat for +${MOB.bounty} coins` : `ปราบได้ +${MOB.bounty} เบี้ยกรรม`, `ระเบียบ +3`])
      + `<div class="sec">ปราบยังไง</div>
         <div class="row-truth">เดินเข้าใกล้แล้วกดปุ่ม ⚔️ เหนือหัว กดเว้นวรรค หรือคลิกตัวมันเพื่อเข้าสู้</div>`;
  }

  // ---- วิญญาณ ----
  if (sel.kind === 'soul') {
    const walking = g.afterlifeWalks.find(w => w.soul.id === sel.key && w.zone === g.zone);
    if (walking) {
      const label = { prison:'กำลังไปตะราง', gate:'กำลังไปประตูสวรรค์',
        queue:'กำลังกลับคิว', exit:'กำลังออกจากประตูสวรรค์' }[walking.destination];
      const cl = g.closed.find(x => x.soul.id === walking.soul.id);
      if (cl) return `<div class="hintline">${label}</div>` + closedCard(cl);
      return profile(soulKey(walking.soul.sp || 7), walking.soul.who,
        `สำนวน #${String(walking.soul.id).padStart(3, '0')} · ${label}`,
        walking.soul.back ? 'กลับมาตัดสินใหม่หลังรับทัณฑ์' : 'กำลังเดินบนฉาก')
        + `<div class="sec">สำนวนที่นิราอ่านได้</div>${publicDossier(walking.soul, 'row-truth')}`;
    }
    const q = g.queue.find(s => s.id === sel.key);
    if (q) {                                        // ยังไม่ลงทัณฑ์ — เห็นแค่ที่เขาพูด
      const rec = q.case ? publicDossier(q, 'row-truth') : q.deeds.filter(d => d.known)
        .map(d => `<div class="row-truth">${SINS[d.s].name} · ${esc(d.t)} · ${weightLabel(d.w)}</div>`).join('')
        || '<div class="row-truth">สำนวนว่างเปล่า</div>';
      const said = q.said.map(x => `<div class="row-truth ${SAID_STYLE[x.kind] || ''}">${esc(x.text)}</div>`).join('')
        || '<div class="row-truth">...เขาก้มหน้าไม่พูดอะไร</div>';
      return profile(soulKey(q.sp || 7), q.who, `สำนวน #${String(q.id).padStart(3, '0')} · รอคิว ${q.waited} วาระ`,
          q.hard ? 'สำนวนหนาผิดปกติ — คดีนี้ถูกกับผิดปนกัน' : 'รอขึ้นแท่นพิพากษา')
        + `<div class="sec">สำนวนที่นิราอ่านได้</div>${rec}
           <div class="sec">เขาพูดว่า</div>${said}
           <div class="hintline">ยังไม่ลงทัณฑ์ — ความจริงที่เหลือต้องใช้พลังขุดเอา
             เฉลยจะขึ้นตรงนี้หลังปิดคดีแล้ว</div>`;
    }
    let stx = null, slotx = null;
    for (const st0 of g.stations) {
      const sl = st0.slots.find(x => x.soul.id === sel.key);
      if (sl) { stx = st0; slotx = sl; break; }
    }
    if (stx) return profile(soulKey(slotx.soul.sp || 7), slotx.soul.who,
        `สำนวน #${String(slotx.soul.id).padStart(3, '0')} · กำลังรับทัณฑ์`,
        `${esc(stx.def.name)} · คืบหน้า ${Math.round(100 * slotx.progress / slotx.need)}%`)
      + verdictCard(slotx.soul, slotx.verdict || g.judge(stx, slotx), stx.def.k, stx.crewK, slotx.intensity, false);
    const cl = g.closed.find(x => x.soul.id === sel.key);
    if (cl) return closedCard(cl);
    return '<div class="empty">ไม่พบวิญญาณดวงนี้แล้ว</div>';
  }

  // ---- รายการคดีที่ปิดแล้ว ----
  if (sel.kind === 'closed') {
    if (!g.closed.length) return '<div class="empty">ยังไม่มีคดีที่ปิดครบวาระ</div>';
    return `<div class="sec" style="border:0;margin-top:0">คดีที่ปิดแล้ว — กดเพื่อดูเฉลย</div>`
      + g.closed.map(x => `<div class="soul" data-sel="soul:${x.soul.id}">
          <div class="top"><b>${esc(x.soul.who)}</b>
            <span class="id">#${String(x.soul.id).padStart(3, '0')} · ${'★'.repeat(x.verdict.stars ?? 0)}${'☆'.repeat(5 - (x.verdict.stars ?? 0))}</span></div>
          <div class="deed">${esc(nameOfSt(x.stK))} · วาระ ${x.intensity} · รวม ${x.verdict.score} คะแนน</div>
        </div>`).join('');
  }
  return '<div class="empty">เลือกตัวละครหรือวิญญาณเพื่อดูข้อมูล</div>';
}

function closedCard(cl) {
  const r = cl.verdict;
  return profile(soulKey(cl.soul.sp || 7), cl.soul.who, `สำนวน #${String(cl.soul.id).padStart(3, '0')} · ปิดคดีแล้ว`,
      `ปิดที่วาระ ${cl.tick} · พญายมให้ ${'★'.repeat(r.stars ?? 0)}${'☆'.repeat(5 - (r.stars ?? 0))}`)
    + verdictCard(cl.soul, r, cl.stK, cl.crewK, cl.intensity, true);
}

/** ประโยคประจำตัว — เลือกแบบคงที่ต่อคน จะได้ไม่กระพริบเปลี่ยนทุกครั้งที่ refresh */
function pickStable(arr, key) {
  let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return arr[Math.abs(h) % arr.length];
}

/** ข้อสังเกตว่าคนนี้เหมาะกับงานแบบไหน — อ่านจากสเตตัสจริง */
function crewNote(c) {
  if (c.panya >= 8) return 'ปัญญาสูง — ส่งไปคุมคดีที่สำนวนคลุมเครือ จะได้คะแนนธรรมเพิ่ม';
  if (c.metta >= 8) return 'เมตตาสูง — ถึงเผลอสั่งเกินกรรม กรรมที่ตกใส่ท่านก็เบากว่าคนอื่น';
  if (c.raeng >= 8) return 'แรงเยอะ — ทัณฑ์เสร็จเร็ว แต่เมตตาต่ำ เผลอสั่งเกินแล้วกรรมตกหนัก';
  if (c.rabiab >= 8) return 'ระเบียบสูง — คะแนนแกนระเบียบดีขึ้นทุกคดีที่เขาคุม';
  return 'สเตตัสกลาง ๆ ใช้ได้ทั่วไป';
}

/** แถบหิว + ปุ่มป้อนข้าวปั้น (ข้อ D ชุด 13 คุณเป้ 26 ก.ย. 2569) — ใช้ร่วมกัน 3 จุดตามที่ขอ:
 *  โต๊ะนิรา (openNiraOffice) · หน้าต่างสถานีที่มียมทูตคุม (openStation) · คุยกับยมทูตบนแผนที่ (talkCrew)
 *  c = ออบเจ็กต์ยมทูตจริงใน g.crew (มี .hunger) ไม่ใช่ CREW def เฉย ๆ
 *  ปุ่มมี data-feed="<k>" ให้ผู้เรียกไป bind onclick เอง (แต่ละที่ paint()/refresh() ไม่เหมือนกัน) */
function hungerWidget(c) {
  const h = Math.round(c.hunger ?? 100);
  const empty = h <= 0;
  // โทนสี: หิวหมด (0) = แดง · ต่ำกว่า 40 = สีทองเตือน · เหลือมาก = เขียว
  const tone = empty ? 'karma' : h < 40 ? '' : 'hp';
  const canFeed = g.food >= BAL.feedFoodCost;
  return `<div class="hunger-line">
    <span class="bar ${tone}" title="หิว ${h}/100"><i style="width:${h}%"></i></span>
    <small>🍙 หิว ${h}/100${empty ? ` — ทำงานช้าลงอีก ${Math.round((1 - BAL.hungerPenalty) * 100)}%` : ''}</small>
    <button data-feed="${esc(c.k)}" class="sm" ${canFeed ? '' : 'disabled'}
      title="${canFeed ? `หัก ${BAL.feedFoodCost} ห่อจากเสบียงกลาง (เหลือ ${Math.round(g.food)} ห่อ)` : 'เสบียงกลางหมด — ซื้อเพิ่มที่แท็บก่อสร้าง'}">🍙 ให้ข้าวปั้น</button>
  </div>`;
}
/** bind ปุ่ม data-feed ทั้งหมดในกล่อง — เรียกซ้ำได้ (ปุ่มถูกวาดใหม่ทุก paint()) */
function bindHungerWidgets(root, after) {
  root.querySelectorAll('[data-feed]').forEach(b => b.onclick = () => {
    if (g.feedCrew(b.dataset.feed)) { sfx('coin'); after(); }
  });
}

/** ป้ายบนหัวแท็บ — บอกว่ามีอะไรให้กดบ้าง ไม่ต้องเปิดดูเอง */
function drawTabHeads() {
  const hire = CREW.filter(c => !g.crew.some(x => x.k === c.k)).length + (g.guard ? 0 : 1);
  const build = STATIONS.filter(s => s.cost > 0 && !g.stations.some(x => x.def.k === s.k)).length;
  $('#tab-queue').textContent = `คิววิญญาณ${g.queue.length ? ` (${g.queue.length})` : ''}`
    + (g.held.length ? ` · 🔒${g.held.length}` : '');
  $('#tab-crew').textContent  = `ยมทูต${hire ? ` · จ้างได้ ${hire}` : ''}`;
  $('#tab-build').textContent = `ก่อสร้าง${build ? ` · สร้างได้ ${build}` : ''}`;
  for (const el of document.querySelectorAll('.tabs [data-tab]'))
    el.setAttribute('aria-selected', el.dataset.tab === tab ? 'true' : 'false');
}

/** ตัวบุกของ event (eventKey) ไม่เข้าฉากสู้ธรรมดา — เปิดหน้าต่าง event ของมันแทน (เหมือนกดที่ตัวมันบนแผนที่) */
function openRaiderAlert(key) {
  const ev = (ZONE_EVENTS[g.zone] || []).find(e => e.k === key);
  if (key === 'prisonBreak') openPrisonAlert();
  else if (key === 'frontierBreach') openBreachAlert();
  else if (ev) openZoneEventAlert(ev);
}
function fightMob(n) {
  if (n.m.eventKey) { openRaiderAlert(n.m.eventKey); return; }
  g.startMobBattle(n.i); openBattle();
}

/** กดสู้เมื่ออยู่ในระยะปุ่ม หรือเดินเข้าไปให้ถึงระยะนั้น */
function tryFight() {
  if (g.over || g.battle || dlg.open || g.guard) return;
  const n = g.nearestMob();
  if (n && n.d <= MOB.fabReach) { fightMob(n); return; }
  g.attack(); refresh();
}

/** ปุ่มปีศาจบนแผนที่มีทางเดียวคือเข้าฉากต่อสู้ */
let atkSig = '';
function drawAtk() {
  const btn = $('#atk'), fab = $('#fab-atk');
  const n = g.over || g.guard ? null : g.nearestMob();
  const near = n && n.d <= MOB.fabReach;
  const sig = `${g.mobs.length}/${g.over ? 1 : 0}/${g.guard ? 1 : 0}/${near ? 1 : 0}`;
  if (sig === atkSig) return;
  atkSig = sig;
  btn.hidden = !!g.over || !!g.guard || !g.mobs.length;
  fab.hidden = btn.hidden;
  if (btn.hidden) return;
  const [label, color] = near
    ? [`⚔️ กดเพื่อเข้าสู้ (${g.mobs.length})`, 'var(--destructive)']
    : [`🏃 เดินไปหาเปรต (${g.mobs.length}) แล้วกดเข้าสู้`, 'var(--muted-foreground)'];
  btn.textContent = label;
  btn.style.color = color;
  fab.textContent = near ? '⚔️ กดเพื่อเข้าสู้' : '🏃 ไปหาเปรต';
  fab.classList.toggle('hot', !!near);
  fab.classList.remove('gold');
}

function refresh() { drawRes(); drawHudAvatar(); drawTabHeads(); drawTab(); drawSide(); drawOverlay(); drawDeck(); drawAtk(); drawCoach(); if (!$('#hero-profile').hidden) drawHeroProfile(); syncAva(); syncTitle(); updatePlay(); }

function miniGoalText() {
  const goal = g.miniGoals[g.zone] || { truth:0, earned:false };
  return goal.earned
    ? t('coach.goalDone').replace('{boss}', g.zoneDef().bossName)
    : t('coach.goalOpen').replace('{n}', goal.truth);
}

/** บรรทัดใต้ชื่อเกม — เดิมเขียน "นรกโซนสุวรรณภูมิ · ยมบาทฝึกหัด" ไว้ตายตัวใน index.html
 *  ย้ายโซนหรือเลื่อนขั้นแล้วมันยังบอกโซนแรกกับขั้นแรกอยู่ทั้งเกม (เจอตอนทดสอบข้อ 7) */
function syncTitle() {
  const el = $('#hdr-sub');
  if (!el) return;
  const want = `นรก${g.zoneDef().name} · ${LEVELS[g.level - 1].name}`;
  if (el.textContent !== want) el.textContent = want;
}

/** รูปหน้าตัวเรามุมซ้ายบน — เปลี่ยนตามโซน (ใน index.html เขียนของโซน 1 ไว้ตายตัว)
 *  จำค่าที่ตั้งไว้เอง ไม่เทียบกับ src จริง ไม่งั้นพอ onerror สลับไปรูปสำรอง จะตั้งกลับวนไม่จบ */
function syncAva() {
  warmZone();
  const a = $('#ava');
  if (!a) return;
  const want = artUrl('hero-yama-profile') || artUrl('hero-yama');
  if ((a.dataset.want || 'img/hero-yama-profile.png') === want) return;
  a.dataset.want = want;
  a.onerror = function () { this.onerror = () => this.remove(); this.src = artUrl('hero-yama'); };
  a.src = want;
}

document.querySelectorAll('.tabs [data-side]').forEach(el =>
  el.onclick = () => { side = el.dataset.side; drawSide(); });

document.querySelectorAll('.tabs [data-tab]').forEach(el =>
  el.onclick = () => { tab = el.dataset.tab; refresh(); });   // เดิมไม่มีตัวจัดการเลย กดแท็บไม่ติดทั้งเกม

$('#atk').onclick = tryFight;
$('#fab-atk').onclick = tryFight;
function goTrial() {
  if (!g.queue[0] || g.over || g.battle) return;
  openTrial();
}

// ---------- โมดัล ----------
const dlg = $('#dlg');
// Keep the active scene and its listeners intact while the player is away.
const pauseDlg = document.createElement('dialog');
pauseDlg.id = 'pause-dlg';
pauseDlg.className = 'pause-modal';
document.body.append(pauseDlg);
pauseDlg.addEventListener('cancel', e => { e.preventDefault(); finishPause(); });
dlg.addEventListener('close', () => { setTimeout(() => { if (!dlg.open) g.onChange(); }, 0); });
// กล่องทั่วไปถูกสร้างจากหลายจุด; วางปุ่มปิดทองไว้ขวาบนทุกครั้งที่วาดใหม่
new MutationObserver(() => {
  if (!dlg.open || dlg.classList.contains('defeat-recovery') || dlg.classList.contains('pause-modal') ||
      dlg.querySelector('.st-hud') || dlg.classList.contains('event-alert') || dlg.classList.contains('frontier-map-dialog') || dlg.querySelector(':scope > .modal-corner-close') ||
      dlg.querySelector('.settings-close,.trial-close') ||
      (dlg.classList.contains('rpg') && dlg.querySelector('.combat-wheel'))) return;
  const close = document.createElement('button');
  close.className = 'modal-corner-close';
  close.setAttribute('aria-label', t('common.close'));
  close.innerHTML = '<img src="img/ui/icon-close.png" alt="">';
  close.onclick = () => dlg.close();
  dlg.append(close);
}).observe(dlg, {childList:true, subtree:false, attributes:true, attributeFilter:['open']});

// ตัวจับกลางสำหรับปุ่มปิดทุกปุ่มในทุกโมดัล — ผูกครั้งเดียวตอนโหลดหน้า
// เดิมแต่ละโมดัลผูก onclick ให้ปุ่มของตัวเองตอน render ซึ่งพลาดได้หลายทาง
// (render ใหม่แล้วผูกไม่ทัน · onclick ถูกทับ · ตัวล็อกภายในค้าง)
// เจ้าของเจอ 8 ก.ย. 2569: กด "ปิดห้องสอบสวน" แล้วป๊อปอัปไม่ยอมปิด
// event delegation แบบนี้ไม่มีทางหลุด เพราะไม่ได้ผูกกับปุ่มตัวไหนเลย
//   ⚠️ ฉากต่อสู้ไม่ได้รับผลกระทบ — ปุ่มในนั้นใช้ data-fin ไม่ใช่ data-close
//      และถึงปิดไป ตัวเฝ้าก็เปิดกลับให้อยู่ดีถ้าฉากยังไม่จบ
dlg.addEventListener('click', e => {
  if (e.target.closest('[data-close]') && dlg.open) dlg.close();
});
// ข้อ E.1/F.1 ชุด 15 — ไอคอนตั้งค่าจิ๋วในห้องสอบสวน/ฉากต่อสู้ เรียก openSettings() ตัวเดียวกับ HUD หลัก
// (ปิดกล่องตั้งค่าแล้วไม่ได้เด้งกลับเข้าห้องสอบสวนอัตโนมัติ — เหมือนกดปิดห้องสอบสวนตรงๆ เดิมทุกประการ
//  ส่วนฉากต่อสู้มีตัวเฝ้า battleUI ที่เปิดฉากกลับให้เองอยู่แล้วถ้าสู้ยังไม่จบ ดูคอมเมนต์บนสุดของไฟล์)
dlg.addEventListener('click', e => {
  if (e.target.closest('[data-arena-settings]')) openSettings();
});

function modal(html, onOpen, cls = '') {
  pauseForDlg();
  dlg.innerHTML = html;
  openDlg(cls);
  dlg.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
  if (onOpen) onOpen(dlg);
}

const SAID_STYLE = { deny:'', claim:'', truth:'truth', confess:'confess', false:'false', hint:'' };
const SAID_ICON  = { deny:'🗣️', claim:'🪷', truth:'', confess:'', false:'', hint:'↳' };

// ---------- ชั้นซ้อนบนฉาก + แถบบัญชาการ ----------
const ov = $('#ov'), deckBar = $('#deck');
let pick = { st: null, cr: null, inten: null }; // ต้องเลือกสถานที่ ผู้คุม และความแรงก่อนออกหมาย
let fx = null;                                  // คะแนน + เสียงพญายม (โชว์ชั่วคราว)

const CH = 82;                                  // ความสูงตัวละครบนฉาก ต้องตรงกับ CREW_H ใน scene.js
const pctX = x => (x / SCENE.w * 100) + '%';
const pctY = y => (y / SCENE.h * 100) + '%';

/** หมุดเหนือหัวตัวละคร — ชี้เมาส์ถึงจะกางบับเบิล */
function mark(cls, x, y, pin, html, show = false) {
  const side = x < SCENE.w * 0.26 ? 'aL' : x > SCENE.w * 0.74 ? 'aR' : '';
  const d = document.createElement('div');
  d.className = `mark ${cls} ${side} ${show ? 'show' : ''}`;
  d.dataset.sx = x; d.dataset.sy = y;
  d.innerHTML = `<div class="pin">${pin}</div><div class="bub">${html}</div>`;
  // มือถือไม่มี hover — แตะหมุดเพื่อเปิด/ปิด และปิดอันอื่นที่ค้างอยู่
  d.querySelector('.pin').onclick = ev => {
    ev.stopPropagation();
    const on = d.classList.contains('show');
    ov.querySelectorAll('.mark.show').forEach(m => m.classList.remove('show'));
    if (!on) d.classList.add('show');
  };
  ov.appendChild(d);
  place(d);
  return d;
}

/** วางตำแหน่ง element ที่ผูกพิกัดฉากไว้ */
function place(d) {
  const sx = +d.dataset.sx, sy = +d.dataset.sy;
  d.style.left = pctX(sx); d.style.top = pctY(sy);
  d.style.visibility = '';
  if (d.classList.contains('repairfab')) clampInView(d);
}

/** 28A: ปุ่มลอยที่กึ่งกลางตัวเองผูกกับพิกัดฉาก (translate -50%) ต้องไม่ล้นขอบจอ — ปุ่มซ่อมสถานีริมซ้าย/ขวา
 *  เคยโดนตัดครึ่ง · เลื่อนจุดกึ่งกลางเข้ามาให้ทั้งปุ่มอยู่ในส่วนของ #ov ที่เห็นบนจอ (เว้น 8px) */
function clampInView(d) {
  const o = ov.getBoundingClientRect(), w = d.offsetWidth;
  if (!o.width || !w) return;
  const m = 8, lo = Math.max(o.left, 0) + m + w / 2, hi = Math.min(o.right, innerWidth) - m - w / 2;
  if (hi < lo) { d.style.left = ((lo + hi) / 2 - o.left) / o.width * 100 + '%'; return; }
  const cx = o.left + parseFloat(d.style.left) / 100 * o.width;
  const nx = Math.min(hi, Math.max(lo, cx));
  if (nx !== cx) d.style.left = (nx - o.left) / o.width * 100 + '%';
  // 29M: สถานีแถวบนสุด (โลกันตนรก) ทำให้ปุ่มลอยไปทับแถบทรัพยากรบน HUD — ดันลงมาให้พ้นแถบนั้น (บนจอ ~84px)
  // (คำนวณจากค่า top ที่ตั้งไว้ ไม่อ่านตำแหน่งจริง เพราะปุ่มมี transition ตำแหน่งอยู่)
  const topMin = 84;
  if (o.height) {
    // ปุ่มที่ยึดขอบล่าง (anchor-top) ขอบบนอยู่สูงกว่าจุดยึดเต็มความสูงปุ่ม + ช่องไฟ 6px
    const lift = d.classList.contains('anchor-top') ? d.offsetHeight + 6 : d.offsetHeight / 2;
    const edge = o.top + parseFloat(d.style.top) / 100 * o.height - lift;
    if (edge < topMin) d.style.top = parseFloat(d.style.top) + (topMin - edge) / o.height * 100 + '%';
  }
}

/** หมุดที่ผูกกับตัวละครที่เดินได้ — อัปเดตพิกัดทุกเฟรม ไม่ต้องรอ refresh */
function followMarks() {
  for (const d of ov.children) {
    if (!d.dataset.follow) continue;
    const c = g.crewOf(d.dataset.follow);
    if (!c || c.x == null) continue;
    d.dataset.sx = c.x + Number(d.dataset.followDx || 0);
    d.dataset.sy = c.y - CH - 8;
    place(d);
  }
}

function drawOverlay() {
  // ปุ่มสู้เหนือหัวผีต้องรอดจากการล้างชั้นซ้อน — ทดสอบ 12 ก.ย. 2569 เจอว่าถ้าปล่อยให้
  // ถูกล้างแล้วสร้างใหม่ทุกรอบ refresh (ราว 0.7 วินาทีครั้ง) ผู้เล่นที่กดคาบเกี่ยวจังหวะนั้น
  // จะ "กดแล้วไม่ติด" เพราะปุ่มที่รับ mousedown ถูกถอดออกไปก่อน mouseup
  const keepFab = ov.querySelector('.mobfab');
  const keepBossFab = ov.querySelector('.bossfab');
  const keepFrontierFab = ov.querySelector('.frontierfab');
  const keepRepairFabs = [...ov.querySelectorAll('.repairfab')];
  const keepPrisonFab = ov.querySelector('.prisonfab');
  const keepBreachFab = ov.querySelector('.breachfab');
  const keepDevaFab = ov.querySelector('.devafab');
  const keepZoneEventFabs = [...ov.querySelectorAll('.zone-eventfab')];
  ov.innerHTML = '';
  if (keepFab) ov.appendChild(keepFab);
  if (keepBossFab) ov.appendChild(keepBossFab);
  if (keepFrontierFab) ov.appendChild(keepFrontierFab);
  for (const f of keepRepairFabs) ov.appendChild(f);
  if (keepPrisonFab) ov.appendChild(keepPrisonFab);
  if (keepBreachFab) ov.appendChild(keepBreachFab);
  if (keepDevaFab) ov.appendChild(keepDevaFab);
  for (const f of keepZoneEventFabs) ov.appendChild(f);
  if (g.over) return;
  const s = g.queue[0];

  if (fx) {
    const col = fx.score >= 78 ? 'var(--success)' : fx.score >= 50 ? 'var(--gold)' : 'var(--destructive)';
    const d = document.createElement('div');
    d.className = 'score';
    d.dataset.sx = SPOTS.bench.x; d.dataset.sy = SPOTS.bench.y - 104;
    const st = '★'.repeat(fx.stars) + '☆'.repeat(5 - fx.stars);
    d.innerHTML = `<span style="color:${col};font-size:2rem;letter-spacing:2px">${st}</span>` +
      `<small style="color:${col}">${fx.score} คะแนน · ธรรม ${fx.tham} · เข็ด ${fx.ked}</small>`;
    ov.appendChild(d); place(d);
    mark('boss', SPOTS.throne.x, SPOTS.throne.y - CH - 8, '👑',
      `<span class="who">พญายม</span>${esc(fx.line)}`, true);
  }
  const nira = g.crewOf('nira');
  const post = nira?.at ? STATIONS.find(d => d.k === nira.at) : null;
  const nx = nira?.x ?? (post ? post.x : (nira ? nira.hx : 660));
  const ny = nira?.y ?? (post ? post.y : (nira ? nira.hy : 400));
  if (!s) return;

  const rec = s.case ? publicDossier(s, 'line') : s.deeds.filter(d => d.known)
    .map(d => `<div class="line">${deedLine(d)}</div>`).join('')
    || '<div class="line">สำนวนว่างเปล่า ดิฉันเองก็ยังไม่รู้ว่าเขาทำอะไรมา</div>';
  // หมุดของนิราต้องตามตัวจริงไปด้วย — เธอเดินเตร็ดเตร่ และย้ายที่ถ้าไปรับเวรที่สถานี
  const nm = mark('', nx, ny - CH - 8, '📜',
    `<span class="who">นิรา · สำนวน #${String(s.id).padStart(3, '0')}</span>ผู้ตายเป็น<b>${esc(s.name || s.who)}</b>${rec}`);
  if (nira) nm.dataset.follow = 'nira';        // เธอเดินเตร็ดเตร่ หมุดต้องตามหัวไปทุกเฟรม

  const said = s.said.slice(-6).map(x =>
    `<div class="line ${SAID_STYLE[x.kind] || ''}">${SAID_ICON[x.kind] || ''} ${esc(x.text)}</div>`).join('')
    || '<div class="line">...เขาก้มหน้าไม่พูดอะไร</div>';
  const hasNew = s.said.some(x => x.kind === 'truth' || x.kind === 'confess' || x.kind === 'false');
  mark('soul', QUEUE_LINE[0][0], QUEUE_LINE[0][1] - CH - 8, hasNew ? '❗' : '💬',
    `<span class="who">${esc(s.who)}</span>${said}`);
}

/** อัปเดตทางเข้าศาลตามคิววิญญาณทุกเฟรม */
function updateTrialBtn() {
  const s = g.queue[0];
  const b = deckBar.querySelector('#d-trial');
  if (b) {
    b.disabled = !s || !!g.over || !!g.battle;
    b.className = !b.disabled ? 'gold' : '';
    b.textContent = !b.disabled ? t('hud.trialBegins') : t('hud.trialRecess');
  }
  // ทางเข้าหลักอยู่ล่างกลาง; เก็บปุ่มลอยเก่าที่อาจค้างจากการวาดก่อนหน้า
  const f = ov.querySelector('.trialfab');
  if (f) f.remove();
  const trial = $('#hud-trial');
  if (trial) {
    trial.disabled = !s || !!g.over || !!g.battle;
    trial.textContent = t(trial.disabled ? 'hud.trialRecess' : 'hud.trialBegins');
    trial.title = trial.disabled ? t('hud.noCourt') : t('hud.trialBegins');
    trial.setAttribute('aria-label', trial.disabled ? `${trial.textContent} — ${trial.title}` : trial.title);
  }
}

/** ปุ่มสู้ลอยเหนือหัวผี (ข้อ 3 ของเจ้าของ 11 ก.ย. 2569)
 *  เดินเข้าไปในระยะ MOB.fabReach ของผีตนไหน ปุ่มโผล่เหนือหัวตนนั้น
 *  กดแล้วเข้าฉากต่อสู้กับ "ตนนั้น" ทันที ไม่ต้องขยับเข้าไปให้ประชิดอีก
 *  สร้างใหม่ทุกครั้งที่หาย เพราะ drawOverlay() ล้าง #ov ทิ้งทุกรอบ refresh
 *  ตำแหน่งอัปเดตทุกเฟรม — ผีเดินตลอดเวลา ปุ่มต้องติดหัวมันไปด้วย */
function updateMobFab() {
  const gone = () => { const e = ov.querySelector('.mobfab'); if (e) e.remove(); };
  if (g.over || g.battle || dlg.open || g.guard || !g.mobs.length) return gone();
  const n = g.nearestMob();
  if (!n || n.d > MOB.fabReach) return gone();
  let f = ov.querySelector('.mobfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'mobfab';
    f.textContent = '⚔️ กดเพื่อเข้าสู้';
    f.onclick = ev => {
      ev.stopPropagation();
      if (g.over || g.battle || dlg.open || g.guard) return;
      const m = g.nearestMob();
      if (!m || m.d > MOB.fabReach) return;
      fightMob(m);
    };
    ov.appendChild(f);
  }
  f.dataset.sx = n.m.x; f.dataset.sy = n.m.y - MOB.h * CHAR_SCALE_MAP - 8;
  place(f);
}

/** บอสที่แพ้แล้วเฝ้าสะพาน ไม่กลับมาเองตามวาระ — เดินเข้าไปใกล้จึงเลือกท้าสู้ได้ */
function updateBossFab() {
  const gone = () => { const e = ov.querySelector('.bossfab'); if (e) e.remove(); };
  const pier = g.bossPierCanTalk();
  if (g.over || g.battle || dlg.open || (!g.bossCanChallenge() && !pier)) return gone();
  let f = ov.querySelector('.bossfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'bossfab';
    f.onclick = ev => {
      ev.stopPropagation();
      if (dlg.open) return;
      if (g.bossPierCanTalk()) return openBossPier();
      if (g.bossCanChallenge()) openBossAlert();
    };
    ov.appendChild(f);
  }
  f.textContent = pier ? `💬 คุยกับ${g.zoneDef().bossName}` : `⚔️ ท้าสู้${g.zoneDef().bossName}`;
  f.dataset.sx = SPOTS.bossPier.x;
  f.dataset.sy = SPOTS.bossPier.y - 115;
  place(f);
}

/** ประตูชายแดนเปิดได้เมื่อเดินมาถึงเท่านั้น เหมือนสถานที่อื่นในฉาก */
function updateFrontierFab() {
  const gone = () => { const e = ov.querySelector('.frontierfab'); if (e) e.remove(); };
  const near = Math.hypot(g.player.x - FRONTIER.x, g.player.y - FRONTIER.y) <= FRONTIER.reach;
  if (!near || g.over || g.battle || dlg.open) return gone();
  let f = ov.querySelector('.frontierfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'frontierfab';
    f.textContent = '🏯 เข้าด่านชายแดน';
    f.onclick = ev => { ev.stopPropagation(); if (!g.battle && !dlg.open) openFrontier(); };
    ov.appendChild(f);
  }
  f.dataset.sx = FRONTIER.bx; f.dataset.sy = FRONTIER.by - FRONTIER.bw + 18;
  place(f);
}

/** เรียกช่างที่ว่างจากแผนที่ได้เมื่ออาคารพัง */
function currentMapInteraction() {
  if (g.over || g.battle || dlg.open) return null;
  return nearestInteraction(g.player, mapInteractions(g, MERCHANT));
}

/** One nearby action, including repairs, survives refresh while the player taps. */
function updateRepairFabs() {
  const target = currentMapInteraction();
  for (const f of ov.querySelectorAll('.repairfab'))
    if (!target || f.dataset.target !== target.id) f.remove();
  if (!target) return;
  let f = ov.querySelector('.repairfab');
  if (!f) {
    f = document.createElement('button'); f.className = 'repairfab';
    f.dataset.target = target.id;
    f.onclick = ev => {
      ev.stopPropagation();
      const now = currentMapInteraction();
      if (!now || now.id !== f.dataset.target) return;
      if (now.kind === 'repair') {
        if (g.repairStation(now.key)) { sfx('crack'); refresh(); }
      } else if (now.kind === 'nira') openNiraOffice();
      else if (now.kind === 'merchant') openMerchant();
      else if (now.kind === 'finalEncounter') openFinalEncounter(now.key);
      else if (now.kind === 'finalRest') openStation('tea', true);
      else openStation(now.key);
    };
    ov.appendChild(f);
  }
  f.textContent = target.label;
  f.disabled = target.kind === 'repair' && !g.canRepair(target.key);
  f.dataset.sx = target.bx; f.dataset.sy = target.by;
  f.classList.toggle('anchor-top', target.anchor === 'top');   // 30D: ปุ่มของอาคารยึดขอบล่างไว้ที่ยอดหลังคา
  place(f);
}

// ackOnly = ปุ่มหลักแค่ "รับทราบ" (ปิดหน้าต่าง) อยู่แล้ว → ไม่ต้องมีปุ่ม "ปิด" ซ้ำอีกอัน
function openEventAlert(key, title, description, art, action, start, raider = false, ackOnly = false) {
  const reopen = () => {
    if (key === 'prisonBreak') openPrisonAlert();
    else if (key === 'frontierBreach') openBreachAlert();
    else if (key === 'devaTest') openDevaAlert();
    else if (key === 'zoneBoss') openBossAlert();
    else {
      const ev = (ZONE_EVENTS[g.zone] || []).find(e => e.k === key);
      if (ev) openZoneEventAlert(ev);
    }
  };
  const prep = prepCardHtml;
  const medicine = g.inventory.health || 0;
  const merchantOpen = g.zoneCaptivesFree();   // พ่อค้าโซน 4 ยังถูกขังจนกว่าจะช่วย (cyberRescue)
  modal(`${eventAlertMainHtml(title, description, art,
    `${ackOnly ? '' : `<button data-close>${esc(t('common.close'))}</button>`}
      <button class="gold event-alert-go" data-event-go${ackOnly ? ' data-close' : ''}>${esc(action)}</button>`)}
    <div class="event-alert-prep"><p>${esc(t('event.prep.title'))}</p><div class="event-alert-cards">
      ${prep('merchant', t('event.prep.merchant'), merchantOpen ? t('event.prep.merchantLine') : t('event.prep.merchantLocked'), 'img/merchant-profile.jpeg', !merchantOpen)}
      ${prep('nira', t('event.prep.nira'), t('event.prep.niraLine'), artUrl('crew-nira-profile'))}
      ${prep('medicine', t('event.prep.medicine'), medicine ? t('event.prep.medicineLine') : t('event.prep.none'), artUrl(ITEMS.health.img), !medicine)}
    </div></div>`, d => {
    d.querySelector('[data-event-go]').onclick = start;
    // เปิดกล่องร้าน/ห้องนิราแทนหน้าต่างนี้ แล้วกลับมาที่หน้าต่างนี้ตอนปิดกล่องนั้น
    // ระวัง: openDlg ปิดกล่องเก่าแล้ว showModal ทันที — 'close' ของกล่องเก่ายิงทีหลังแบบ async ขณะ dlg.open เป็น true
    // ถ้าถือว่านั่นคือ "ผู้เล่นปิดแล้ว" จะเด้งกลับหน้าต่างนี้ทับร้านทันที (เจอตอนรีวิวชุด 27) — จึงรอ close ที่ dlg.open เป็น false จริง
    const visit = open => {
      open();
      const gen = dlgGen;
      const h = () => {
        if (dlg.open) return;
        dlg.removeEventListener('close', h);
        if (gen === dlgGen) setTimeout(reopen, 0);
      };
      dlg.addEventListener('close', h);
    };
    d.querySelector('[data-event-prep="merchant"]')?.addEventListener('click', () => visit(openMerchant));
    d.querySelector('[data-event-prep="nira"]')?.addEventListener('click', () => visit(openNiraOffice));
    d.querySelector('[data-event-prep="medicine"]')?.addEventListener('click', () => {
      if (g.useBag('health')) reopen();
    });
  }, 'event-alert');
  onDlgClose(() => {
    if (key === 'zoneBoss') {
      g.bossGuarding[g.zone] = true; g.bossPending = false; g.save();
    } else if (g.zoneEventStatus(key) === 'pending') g.dismissEventAlert(key, raider);
  });
}

/** ชุด 30B ข้อ 1 — ชิ้นส่วนหน้าตา "หน้าต่างเตรียมตัวก่อนเข้าไปสู้" ใช้ร่วมกันสองที่:
 *  แจ้งเตือนอีเวนต์ (openEventAlert) และหน้าเตรียมศึกในฉากต่อสู้ (openBattle) — แก้หน้าตาที่นี่ที่เดียว */
const prepCardHtml = (which, label, line, image, disabled = false) => `<button class="event-prep-card" data-event-prep="${which}" ${disabled ? 'disabled' : ''}>
    <img src="${esc(image)}" alt=""><span class="event-prep-speech">${esc(line)}</span><b>${esc(label)}</b></button>`;
/** กล่องบน: หัวข้อทอง ⚠ · คำอธิบาย · (หมายเหตุ) · ภาพศัตรู · แถวปุ่ม (actionsHtml) · extraTop = ปุ่มมุมขวาบน */
const eventAlertMainHtml = (title, description, art, actionsHtml, { note = '', extraTop = '' } = {}) => `<div class="event-alert-main">
    ${extraTop}<h2>⚠ ${esc(title.replace(/^⚠️?\s*/, ''))}</h2><p>${esc(description)}</p>${note}
    <img class="event-alert-foe" src="${esc(art)}" alt="${esc(title)}">
    <div class="event-alert-actions">${actionsHtml}</div></div>`;

function openPrisonAlert() {
  openEventAlert('prisonBreak', t('event.prisonBreak.title'), t('event.prisonBreak.alert'),
    'img/spirit7.png', t('event.prisonBreak.go'), () => {
      if (g.startPrisonBreak()) { prisonTried = true; openBattle(); }
    }, true);
}

function updatePrisonFab() {
  let f = ov.querySelector('.prisonfab');
  if (!started || g.prisonBreakStatus() !== 'pending' || !prisonAlertSeen || g.zone !== 'th' || g.battle || g.over) {
    if (f) f.remove();
    return;
  }
  if (!f) {
    f = document.createElement('button');
    f.className = 'prisonfab';
    f.onclick = ev => {
      ev.stopPropagation();
      if (!dlg.open && !g.battle) openPrisonAlert();
    };
    ov.appendChild(f);
  }
  f.textContent = `⚠️ ${prisonTried ? t('event.prisonBreak.retry') : t('event.prisonBreak.title')}`;
}

// ชุด 29C ข้อ 9 — event ปีศาจชายแดนบุก: หน้าต่างนี้แค่แจ้งเตือน (รับทราบ) ไม่ตัดเข้าหน้าต่างเตรียมทีมทันทีอีกแล้ว
// ผู้เล่นเดินยมบาทไปชายแดนเอง ถึงแล้ว watcher ใน setInterval ด้านบนจึงเปิดหน้าต่างเตรียมทีม (openFrontier)
// ปิดหน้าต่างด้วยทางไหนก็ตามนับเป็นรับทราบ (onDlgClose → dismissEventAlert ตั้ง eventMapClosed ซึ่งเซฟอยู่แล้ว)
function openBreachAlert() {
  openEventAlert('frontierBreach', t('event.frontierBreach.title'), t('event.frontierBreach.march'),
    artUrl(MOB.kinds[0].img), t('event.frontierBreach.ack'), () => dlg.close(), false, true);
}

function updateBreachFab() {
  let f = ov.querySelector('.breachfab');
  if (!started || g.frontierBreachStatus() !== 'pending' || !breachAlertSeen ||
      g.zone !== 'th' || g.battle || g.over) { if (f) f.remove(); return; }
  if (!f) {
    f = document.createElement('button');
    f.className = 'breachfab';
    f.onclick = ev => { ev.stopPropagation(); if (!dlg.open && !g.battle) openBreachAlert(); };
    ov.appendChild(f);
  }
  f.textContent = `⚠️ ${breachTried ? t('event.frontierBreach.retry') : t('event.frontierBreach.title')}`;
}

function openDevaAlert() {
  openEventAlert('devaTest', t('event.devaTest.title'), t('event.devaTest.alert'),
    artUrl('boss-tester-th'), t('event.devaTest.go'), () => {
      if (g.startDevaTest()) { devaTried = true; openBattle(); }
    });
}

function updateDevaFab() {
  let f = ov.querySelector('.devafab');
  if (!started || g.devaTestStatus() !== 'pending' || !devaAlertSeen ||
      g.zone !== 'th' || g.battle || g.over) { if (f) f.remove(); return; }
  if (!f) {
    f = document.createElement('button');
    f.className = 'devafab';
    f.onclick = ev => { ev.stopPropagation(); if (!dlg.open && !g.battle) openDevaAlert(); };
    ov.appendChild(f);
  }
  f.textContent = `⚠️ ${devaTried ? t('event.devaTest.retry') : t('event.devaTest.title')}`;
}

const LEGACY_ZONE_EVENTS = new Set(['prisonBreak', 'frontierBreach', 'devaTest']);
function storyFoeArt(sp) {
  if (typeof sp !== 'string') return `img/spirit${sp || 7}.png`;
  // Possessed rulers keep their home-zone identity in the CyberHell arena.
  if (/^leader-(th|asia|west|cyberhell)-possessed$/.test(sp)) return `img/${sp}.png`;
  const z = sp.match(/-(asia|west|cyberhell)$/)?.[1];
  if (z) return `img/${{asia:'Asia', west:'West', cyberhell:'CyberHell'}[z]}/${sp}.png`;
  return artUrl(sp) || `img/${sp}.png`;
}
function pendingZoneEvents() {
  return (ZONE_EVENTS[g.zone] || []).filter(ev => !LEGACY_ZONE_EVENTS.has(ev.k) &&
    g.zoneEventStatus?.(ev.k) === 'pending').sort((a, b) => a.atCases - b.atCases);
}
function zoneEventText(value) { return value?.[getLang()] || value?.th || ''; }
/** 30D ข้อ 5 — รูปบนป้ายแจ้งเตือนอีเวนต์: ตัวที่บุกมาจริง (ไม่ใช่วิญญาณขาวสำรอง)
 *  ระลอกชายแดน → หัวหน้าปีศาจท้ายระลอก (แวมไพร ฯลฯ) · อื่น ๆ → ตัวแรกของอีเวนต์ ถ้าเป็นปีศาจทั่วไป (kind) ใช้รูปของ kind นั้น */
function zoneEventMarkerArt(ev) {
  const boss = ev.team === 'frontier' && ev.waves ? ev.waves.flat().find(f => f.boss && f.sp) : null;
  const foe = boss || ev.foe || ev.foes?.[0] || ev.waves?.[0]?.[0];
  if (foe?.sp && foe.sp !== 'spirit') return storyFoeArt(foe.sp);
  if (foe?.kind != null && MOB.kinds[foe.kind]) return artUrl(MOB.kinds[foe.kind].img);
  return storyFoeArt(foe?.sp);
}
function openFinalEncounter(id) {
  const a = finalEventActors(g).find(a => a.id === id);
  if (!a?.enabled || nextFinalEncounter(g.finalEventState()) !== id) return;
  if (Math.hypot(g.player.x-a.x,g.player.y-a.y) > INTERACTION_REACH) { g.walkTo(a.x,a.y); return; }
  modal(`<h2>${esc(a.name)}</h2><p>${esc(t('final.map.prepare'))}</p><div class="row"><button data-close>${esc(t('common.close'))}</button><button class="gold" data-final-go>${esc(t('event.prep.fight'))}</button></div>`, d => {
    d.querySelector('[data-final-go]').onclick = () => { if (g.startFinalEncounter(id)) openBattle(afterBreachBattle); };
  });
}
function openZoneEventAlert(ev) {
  if (ev.k === 'cyberFinal') {
    const id = nextFinalEncounter(g.finalEventState());
    const a = finalEventActors(g).find(a => a.id === id);
    modal(`<h2>${esc(zoneEventText(ev.title))}</h2><p>${esc(zoneEventText(ev.alert))}</p><p>${esc(t('final.map.walk'))}</p><button class="gold" data-final-map>${esc(t('common.close'))}</button>`, d => {
      d.querySelector('[data-final-map]').onclick = () => { g.eventMapClosed['cyberhell:cyberFinal'] = true; dlg.close(); if (a) g.walkTo(a.x,a.y); g.save(); };
    });
    return;
  }
  const title = zoneEventText(ev.title);
  const foe = ev.foe || ev.foes?.[0] || ev.waves?.[0]?.[0];
  const foeArt = foe?.sp && foe.sp !== 'spirit' ? storyFoeArt(foe.sp)
    : foe?.kind != null ? artUrl(MOB.kinds[foe.kind].img) : 'img/spirit7.png';
  if (ev.team === 'frontier') {              // ชุด 29C ข้อ 9 — ระลอกชายแดนของโซน 2–4: แจ้งเตือน → เดินไปชายแดนเอง → เตรียมทีม → สู้
    openEventAlert(ev.k, title, t('event.frontierBreach.march'), foeArt, t('event.frontierBreach.ack'), () => dlg.close(), false, true);
    return;
  }
  openEventAlert(ev.k, title, zoneEventText(ev.alert), foeArt,
    zoneEventTried.has(`${g.zone}:${ev.k}`) ? t('event.prep.retry') : t('event.prep.fight'), () => {
      const startFight = () => {
        if (g.startZoneEvent(ev.k)) { zoneEventTried.add(`${g.zone}:${ev.k}`); openBattle(afterBreachBattle); }
      };
      if (ev.k === 'thBorderBoss' && !g.bossArriveSeen.th) {
        openBossArrive(g.zoneDef(), () => {
          g.bossArriveSeen.th = true; g.save(); startFight();
        });
      } else startFight();
    }, ev.mode === 'waves' || /prison/i.test(ev.k));
}
function updateZoneEventFabs() {
  const pending = started && !g.battle && !g.over ? pendingZoneEvents()
    .filter(ev => zoneEventAlertSeen.has(`${g.zone}:${ev.k}`)) : [];
  const keys = new Set(pending.map(ev => `${g.zone}:${ev.k}`));
  ov.querySelectorAll('.zone-eventfab').forEach(el => {
    if (!keys.has(el.dataset.event)) el.remove();
  });
  pending.forEach((ev, i) => {
    const key = `${g.zone}:${ev.k}`;
    let f = [...ov.querySelectorAll('.zone-eventfab')].find(el => el.dataset.event === key);
    if (!f) {
      f = document.createElement('button');
      f.className = 'zone-eventfab'; f.dataset.event = key;
      f.onclick = e => { e.stopPropagation(); if (!dlg.open && !g.battle) openZoneEventAlert(ev); };
      ov.appendChild(f);
    }
    const title = `${zoneEventTried.has(key) ? 'ท้าอีกครั้ง · ' : ''}${zoneEventText(ev.title)}`;
    f.innerHTML = `<img src="${esc(zoneEventMarkerArt(ev))}" alt="" onerror="this.remove()"><span>⚔️ ${esc(title)}</span>`;
    f.setAttribute('aria-label', title);
    f.dataset.sx = 690 + i * 155;
    f.dataset.sy = 560;
    place(f);
  });
}

/** แถบบัญชาการเหนือฉาก — เหลือ "ทางเข้าห้องสอบสวน" อย่างเดียว
 *  เดิมแถบนี้มีครบชุด: พลังของท่าน · ส่งไปที่ไหน · ใครคุม · หนักแค่ไหน ·
 *  พักคดีนี้ไว้ · ขังไว้ก่อน · ออกหมาย — ซ้ำกับหน้า "เริ่มการสอบสวน" ทุกตัว
 *  (เจ้าของสั่งตัด 12 ก.ย. 2569) ตัวไหนไปอยู่ที่ไหนในหน้านั้น:
 *    พลังของท่าน            → .hud-items แถบล่าง (ไอคอน + จำนวนกระสุน + เหตุผลที่กดไม่ได้)
 *    ส่งไปที่ไหน/ใครคุม/หนักแค่ไหน → ปุ่มคำสั่ง cmd('st'|'cr'|'inten') + แผงตัวเลือกฝั่งขวา
 *    พักคดีนี้ไว้            → #t-skip
 *    ขังไว้ก่อน             → #t-jail (โผล่เมื่อมีตะราง — ในแถบเดิมเป็นปุ่มกดไม่ได้เปล่า ๆ)
 *    ออกหมาย/ประทับตรา      → #t-go (เส้นทางตัดสินจริงคือ doVerdict ที่เดียวกันอยู่แล้ว)
 *  ทางเข้าหลักอยู่ที่ปุ่มเริ่มพิจารณาคดีล่างกลาง; ปุ่มนี้เป็นทางเข้าเดียวกันจากแผงเดิม */
function drawDeck() {
  const s = g.queue[0];
  if (!s || g.over || g.battle) {
    deckBar.innerHTML = `<div class="idle">${esc(t('hud.noCourt'))}</div>`;
    return;
  }
  deckBar.innerHTML = `
    <div class="grp"><span class="lb">แท่นพิพากษา</span>
      <div class="row2"><button class="gold" id="d-trial">${esc(t('hud.trialBegins'))}</button></div></div>`;
  const tr = deckBar.querySelector('#d-trial');
  if (tr) tr.onclick = goTrial;
  updateTrialBtn();
}

/** คำตัดสินของพ่อต่อคำตัดสินของเรา — ป้ายสั้นสำหรับแฟ้มทะเบียนกรรม (ข้อ 2 ของเจ้าของ 11 ก.ย. 2569)
 *  ข้อความยาวเต็มอยู่ที่ BOSS_LINE ซึ่งเป็นบทเดียวกับที่พ่อพูดตอนปิดคดี — ในแฟ้มจึงไม่มีคำใหม่
 *  คีย์ตรงกับ r.boss ที่ judge() ตั้ง (game.js) เป๊ะ */
const DAD_TAG = {
  great:    { t:'พ่อว่าตรงกรรม',      c:'var(--success)' },
  ok:       { t:'พ่อว่าใช้ได้',        c:'var(--gold)' },
  cruel:    { t:'พ่อว่าลงเกินกรรม',    c:'var(--destructive)' },
  bad:      { t:'พ่อว่าเดา ไม่ได้อ่าน', c:'var(--destructive)' },
  terrible: { t:'พ่อตีกลับทั้งเรื่อง',  c:'var(--destructive)' },
};

/** เซฟเก่าไม่มี boss ในแฟ้ม — เดาย้อนจากคะแนนด้วยเกณฑ์เดียวกับ judge() ใน game.js
 *  (เรื่องที่ตัดสินไว้ก่อน 12 ก.ย. 2569 จึงยังอ่านคำตัดสินของพ่อได้ ไม่ต้องเริ่มเกมใหม่)
 *  แก้เกณฑ์ใน judge() เมื่อไหร่ ต้องแก้ตรงนี้ด้วย */
function dadGrade(x) {
  if (x.boss) return x.boss;
  if (x.over >= 2 && x.score >= 50) return 'cruel';
  if (x.score < 35) return 'terrible';
  if (x.score < 50) return 'bad';
  if (x.score >= 82) return 'great';
  return 'ok';
}

const BOSS_LINE = {
  great:    '"นี่แหละที่เรียกว่าตรงกรรม" — ท่านคืนบารมีให้ส่วนหนึ่ง และสั่งจ่ายเบี้ยพิเศษ 40',
  ok:       'ท่านอ่านคำตัดสินจนจบ วางลง แล้วมองไปทางอื่น — ใช้ได้ ไม่ถึงกับดี',
  cruel:    '"ถูกฝาถูกตัว แต่เจ้าใส่เกินไปสองวาระ ส่วนเกินนั้นไม่ได้หายไปไหน มันมาอยู่ที่เจ้า"',
  bad:      '"เจ้าอ่านสำนวน หรือเจ้าเดา" — บารมีถูกหักต่อหน้าทุกคน',
  terrible: '"คำตัดสินแบบนี้ ทำให้คนที่เขาเจ็บมาแล้ว เจ็บซ้ำอีกครั้ง" — บารมีถูกหักหนัก',
};

let bossBridgeTimer = 0;
function beginBossBridgeWalk() {
  if (g.bossWalk || bossBridgeTimer || !g.bossReady()) return;
  g.bossGuarding.th = false;
  g.bossWalk = {
    started: Date.now(), duration: 2600,
    from: [770, 620], to: [800, 430],
  };
  pauseForDlg();
  sfx('gong');
  const finishWalk = () => {
    if (g.over || !g.bossReady()) { g.bossWalk = null; bossBridgeTimer = 0; return; }
    if (dlg.open) { bossBridgeTimer = setTimeout(finishWalk, 300); return; }
    bossBridgeTimer = 0;
    if (g.startZoneBoss()) openBattle();
  };
  bossBridgeTimer = setTimeout(finishWalk, 2600);
}

/** ฉากมาถึงของบอสประจำโซน — 3-4 บรรทัดสลับผู้พูด ก่อนสู้ครั้งแรกเท่านั้น (17 ก.ย. 2569)
 *  รีแมตช์ (bossArriveSeen ติดไปแล้ว) ข้ามตรงไปสู้เลย · ใช้ภาพ Intro-Boss-Zone<N> เป็นพื้นหลังถ้ามี
 *  บทมาจาก Rae ผ่าน Reese fact-check แล้ว (ดู ZONES[].bossArrive ใน data.js) ห้ามแก้ถ้อยคำ */
function openBossArrive(z, onDone) {
  const lines = z.bossArrive || [];
  if (!lines.length) { onDone(); return; }
  const zn = ZONES.findIndex(x => x.k === z.k) + 1;
  // 30A: โซน 2–4 ใช้ฉากมาถึงตรง path ที่มีจริง ไม่รอ manifest/ภาพ closeup (closeup จตุรัสทำให้กรอบสูงจนข้อความตกขอบจอ)
  // โซน 1 คงการเลือกภาพเดิม (artUrl คืน path แม้ไฟล์ยังไม่โหลด)
  const bossProfile = z.k !== 'th' && zoneImg(`Boss Zone${zn}-profile`);
  const bg = bossArrivalScene(z.k) || (bossProfile && bossProfile.src) || artUrl(`Intro-Boss-Zone${zn}`) || artUrl('hero-boss');
  pauseForDlg();
  let i = 0;
  const paint = () => {
    const line = lines[i];
    const m = line.match(/^([^:]{1,14}):\s*(.+)$/);
    const speaker = m ? m[1] : z.bossName;
    const text = (m ? m[2] : line).replace(/^"|"$/g, '');
    dlg.innerHTML = `<div class="intro-comic" role="region" aria-label="ฉากมาถึง ${esc(z.bossName)} หน้า ${i + 1} จาก ${lines.length}">
      <div class="intro-comic-frame">
        <img src="${bg}" alt="" onerror="this.onerror=null;this.src='${artUrl('hero-boss')}'">
        <div class="intro-comic-head"><span>👑 ${esc(z.bossName)}มาถึงแล้ว</span><span>${i + 1} / ${lines.length}</span></div>
      </div>
      <div class="intro-comic-caption"><h2>${esc(speaker)}</h2><p>${esc(text)}</p></div>
      <div class="intro-comic-controls"><button class="gold" id="arrive-next">${i + 1 === lines.length ? '⚔️ สู้เลย' : 'หน้าถัดไป →'}</button></div>
    </div>`;
    prepareComicImages(dlg);
    dlg.querySelector('#arrive-next').onclick = () => { if (++i >= lines.length) dlg.close(); else paint(); };
  };
  openDlg('intro-comic-dialog');
  // Replacing the preparation dialog queues an old close event. Wait for
  // this introduction to close, rather than starting combat on that event.
  const gen = dlgGen;
  const finish = () => {
    if (gen !== dlgGen) { dlg.removeEventListener('close', finish); return; }
    if (dlg.open) return;
    dlg.removeEventListener('close', finish); onDone();
  };
  dlg.addEventListener('close', finish);
  paint();
}

/** การ์ตูนแนะนำสาขาใหม่ — ใช้ภาพ intro-zone<N> ที่เจ้าของวาดไว้หนึ่งภาพต่อโซน
 *  แสดงเฉพาะครั้งแรกที่ย้ายเข้า ส่วนการกลับสาขาเดิมใช้กล่องสรุปสั้น ๆ เพื่อไม่ขัดจังหวะซ้ำ */
function openBossAlert() {
  const z = g.zoneDef();
  openEventAlert('zoneBoss', z.bossName, z.bossSub, artUrl('zone-boss'),
    t('event.prep.fight'), () => { if (g.startZoneBoss('alert')) openBattle(); });
}

function openZoneArrival(z) {
  const zn = ZONES.findIndex(x => x.k === z.k) + 1;
  const intro = zoneIntroduction(z.k);
  const pages = [{ image:artUrl(`intro-zone${zn}`), speaker:z.name,
    line:intro?.welcome || `${z.intro}${z.sub ? ` · ${z.sub}` : ''}`,
    hint:'นิราตามท่านมา · จัดสถานีและทีมยมทูตประจำสาขาให้พร้อม' }];
  if (intro) pages.push({ image:intro.image, speaker:intro.speaker, line:intro.guidance,
    hint:'หัวหน้าประจำศาลจะช่วยท่านพิจารณาคดีของสาขานี้' });
  let page = 0;
  pauseForDlg();
  const paint = () => {
    const current = pages[page];
    dlg.innerHTML = `<div class="intro-comic zone-arrival" role="region" aria-label="แนะนำ ${esc(z.name)} หน้า ${page + 1} จาก ${pages.length}">
      <div class="intro-comic-frame">
        <img src="${esc(current.image)}" alt="${esc(page ? intro.speaker : z.name)}" onerror="this.onerror=null;this.src='${artUrl('scene')}'">
        <div class="intro-comic-head"><span>อเวจี · ${z.back ? 'กลับมาที่สาขา' : 'เปิดสาขาใหม่'}</span><span>โซน ${zn} · ${page + 1} / ${pages.length}</span></div>
      </div>
      <div class="zone-arrival-band">
        <div class="intro-comic-caption"><h2>${esc(current.speaker)}</h2><p>${esc(current.line)}</p></div>
        <div class="intro-comic-controls"><span class="hint">${esc(current.hint)}</span>
          <button class="gold" data-arrival-next>${page + 1 < pages.length ? 'พบหัวหน้าสาขา →' : 'เริ่มงาน'}</button></div>
      </div>
    </div>`;
    prepareComicImages(dlg);
    dlg.querySelector('[data-arrival-next]').onclick = () => { if (++page < pages.length) paint(); else { g.zoneIntroSeen[z.k] = true; g.save(); dlg.close(); } };
  };
  openDlg('intro-comic-dialog');
  paint();
}

function showVerdict(v) {
  g.pendingVerdict = null;
  sfx(v.stars >= 5 ? 'star' : v.stars <= 1 ? 'hurt' : 'gong');
  fx = { ...v, line: BOSS_LINE[v.boss] || BOSS_LINE.ok };
  g.bossUntil = performance.now() + 7000;      // พ่อมานั่งบัลลังก์ให้เห็นชั่วครู่
  clearTimeout(showVerdict.t);
  showVerdict.t = setTimeout(() => {
    fx = null; drawOverlay();
    if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); }
  }, 7000);
}

function openEnding(o) {
  if (o.k === 'finalWin') {
    modal(`<h2>👑 ${esc(o.title)}</h2>
      <div class="boss"><div class="ending-thumbnail"><img src="img/story-ending-02-v3.png" alt="สันติสุขทั้ง 4 โซน"
        onerror="this.remove()"></div><p style="line-height:var(--leading-body)">${esc(o.text)}</p></div>
      <div class="hint">ปิดคดี ${g.casesDone} เรื่อง · ปราบบอสครบทั้งสี่สาขา · กลับไปท้าบอสเก่าที่รออยู่ในแต่ละโซนได้</div>
      <div class="row"><button id="final-continue" class="gold">เล่นต่อ</button>
        <button id="final-new">เริ่มเกมใหม่</button></div>`, d => {
      prepareComicImages(d);
      d.querySelector('#final-continue').onclick = () => {
        g.over = null;
        userPaused = false;
        d.close();
        setTimeout(() => { releaseDlgPause(); g.save(); refresh(); }, 0);
      };
      d.querySelector('#final-new').onclick = restart;
    }, 'final-ending');
    return;
  }
  if (o.k === 'dad') {
    pauseForDlg();
    const z = g.zoneDef();
    modal(`<h2>👑 Game Over</h2>
      <div class="boss"><img class="standee" src="${artUrl('hero-boss')}" alt="พญายมบาท"
        onerror="this.remove()">
        <p style="line-height:var(--leading-body);margin:0">${esc(o.text)}</p></div>
      <div class="hint">${esc(z.name)} · ${g.zone === 'th'
        ? 'เริ่มเกมใหม่จากโซนแรก' : 'เริ่มโซนนี้ใหม่ โดยเก็บสาขาที่ผ่านมาก่อนหน้าไว้'}</div>
      <div class="row"><button class="gold" id="again">${g.zone === 'th' ? 'เริ่มเกมใหม่' : 'เริ่มโซนนี้ใหม่'}</button></div>`,
      d => d.querySelector('#again').onclick = restartCurrentZone);
    return;
  }
  modal(`<h2>${esc(o.title)}</h2>
    <p style="line-height:var(--leading-body)">${esc(o.text)}</p>
    <div class="hint">ปิดคดีทั้งหมด ${g.casesDone} เรื่อง · คะแนนเฉลี่ย ${g.casesDone ? Math.round(g.scoreSum / g.casesDone) : 0} ·
      กรรมที่ท่านสะสมเอง ${g.karma.toFixed(1)}</div>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body);color:var(--muted-foreground)">
      คืนนั้นนิราวางแฟ้มเล่มหนึ่งไว้บนโต๊ะโดยไม่พูดอะไร ชื่อบนปกคือชื่อของท่าน</p>
    <div class="row"><button id="mine">📕 เปิดแฟ้มของท่าน</button>
      <button class="gold" id="again">เริ่มใหม่</button></div>`,
    d => {
      d.querySelector('#again').onclick = restart;
      d.querySelector('#mine').onclick = () => openLedger(o);
    });
}

/** แฟ้มของท่านเอง — ทุกคดีที่ลงเกินกรรม กับทุกคดีที่ปล่อยเบาจนเขากลับมา
 *  นี่คือ "คำตัดสินของเกมที่มีต่อผู้เล่น" ตัวเลขทุกตัวมาจากที่ผู้เล่นทำเองจริง ๆ */
function openLedger(o) {
  const L = g.ledger;
  const over  = L.filter(x => x.over > 0).sort((a, b) => b.over - a.over || b.karma - a.karma);
  const short = L.filter(x => x.short > 0);
  const wrong = L.filter(x => x.tham < 40);
  const five  = L.filter(x => x.stars === 5).length;
  const sumK  = Math.round(over.reduce((s, x) => s + x.karma, 0) * 10) / 10;

  const row = x => `<div class="row-truth">
    #${String(x.id).padStart(3, '0')} · ${esc(x.who)}${x.back ? ' <span style="color:var(--destructive)">(กลับมารอบสอง)</span>' : ''}
    — สมควร ${x.deserved} วาระ แต่ท่านให้ไป ${x.deserved + x.over}
    <b style="color:var(--destructive)">เกิน ${x.over}</b> · กรรมตกมา +${x.karma}</div>`;

  const verdict =
      !L.length            ? 'แฟ้มยังว่างเปล่า ท่านยังไม่ได้ตัดสินอะไรเลย'
    : !over.length         ? 'ทั้งเล่มไม่มีคดีไหนที่ท่านลงเกินกรรมเลยสักคดี — หน้าสุดท้ายว่างเปล่า และนั่นคือคำชมที่พ่อไม่เคยพูดออกมา'
    : sumK >= 40           ? 'แฟ้มของท่านหนากว่าสำนวนของคนส่วนใหญ่ที่ท่านตัดสินไปทั้งวัน'
                           : 'ไม่หนามาก แต่ก็ไม่ใช่แฟ้มเปล่า — ทุกบรรทัดในนี้ท่านเขียนเอง';

  modal(`<h2>📕 สำนวนของ ${esc('ยมบาทประจำโซนสุวรรณภูมิ')}</h2>
    <div class="hint">ปิดคดี ${g.casesDone} เรื่อง · ห้าดาว ${five} ครั้ง ·
      ลงเกินกรรม ${over.length} คดี · เบาไป ${short.length} คดี · ส่งผิดที่ ${wrong.length} คดี ·
      คดีที่เขากลับมาเพราะท่านปล่อยเบา ${g.returned} คดี</div>

    <div class="sec">คดีที่ท่านลงเกินกรรม — กรรมส่วนเกินรวม ${sumK}</div>
    ${over.length ? over.slice(0, 14).map(row).join('') +
      (over.length > 14 ? `<div class="row-truth" style="color:var(--muted-foreground)">…และอีก ${over.length - 14} คดี</div>` : '')
      : '<div class="row-truth" style="color:var(--success)">ไม่มีเลยสักคดี</div>'}

    <div class="sec">คดีที่ท่านปล่อยเบาไป</div>
    ${short.length ? `<div class="row-truth">${short.length} คดี — ในนั้น <b>${g.returned} คน</b>กลับมายืนหน้าแท่นอีกครั้ง
        พร้อมเรื่องที่เขาไปทำต่อหลังท่านปล่อยไป</div>`
      : '<div class="row-truth" style="color:var(--success)">ไม่มีเลยสักคดี</div>'}

    <p style="font-size:var(--text-sm);line-height:var(--leading-body);border-top:1px solid var(--border);padding-top:10px;margin-top:14px">
      <b style="color:var(--gold)">นิรา:</b> "${esc(verdict)}ค่ะ"</p>
    <div class="row"><button id="backend">ย้อนกลับ</button>
      <button class="gold" id="again2">เริ่มใหม่</button></div>`,
    d => {
      d.querySelector('#again2').onclick = restart;
      d.querySelector('#backend').onclick = () => openEnding(o);
    });
}

/** เริ่มใหม่จริง ๆ — หยุดบันทึกอัตโนมัติก่อน ไม่งั้นลูปเฟรมอาจเขียนเซฟทับตอนกำลังรีโหลด */
function restart() {
  saveAt = Infinity; clearSave();
  sessionStorage.setItem('avegee.fresh', '1');   // เริ่มใหม่แล้วเข้าเกมเลย ไม่ต้องผ่านหน้าปกอีกรอบ
  location.reload();
}

function restartCurrentZone() {
  if (g.zone === 'th' || !g.zoneEntry) return restart();
  const entry = JSON.parse(JSON.stringify(g.zoneEntry));
  saveAt = Infinity;
  if (!g.restore(entry)) { saveAt = 0; return; }
  g.zoneEntry = entry;
  g.hp = g.hpMax; g.order = Math.max(72, g.order);
  g.reds = 0; g.yamaDone = false; g.over = null;
  if (!g.save()) { saveAt = 0; return; }
  sessionStorage.setItem('avegee.fresh', '1');
  location.reload();
}

/** โมดัลที่มีพญายมนั่งบัลลังก์อยู่ข้าง ๆ (รูปหายก็ยังอ่านได้) */
function bossModal(title, text, btn = 'รับทราบ') {
  pauseForDlg();
  modal(`<h2>${esc(title)}</h2>
    <div class="boss">
      ${artUrl('hero-boss-profile') ? `<img src="${artUrl('hero-boss-profile')}" alt=""
           onerror="this.onerror=function(){this.remove()};this.src='${artUrl('hero-boss')}';this.classList.add('standee')">`
        : `<img class="standee" src="${artUrl('hero-boss')}" alt="" onerror="this.remove()">`}
      <p style="line-height:var(--leading-body);margin:0;white-space:pre-line">${esc(text)}</p>
    </div>
    <div class="row"><button class="gold" data-close>${esc(btn)}</button></div>`);
}

/** กระทะทองแดง — แพ้พ่อครบสามครั้งเตือนแล้ว ไม่ใช่ Game Over อีกต่อไป (17 ก.ย. 2569)
 *  แค่โชว์ภาพลงทัณฑ์ + บอกให้ไปพักที่ศาลาน้ำชา แล้วปล่อยเล่นต่อทันที ไม่รีเซ็ตโซน */
function openDadPunish(p) {
  pauseForDlg();
  const scene = punishmentScene(g.zone, stBg('krata'));
  modal(`<div class="punish-stage" data-effect="${scene.effect}" style="--stage-ratio:${scene.ratio > 1 ? scene.ratio : '16/8.7'};--punish-bg:url('${esc(scene.background)}');--scene-ratio:${scene.ratio};--pot-x:${scene.x * 100}%;--pot-y:${scene.rim * 100}%;--hero-width:${scene.width * 100}%;--hero-height:${scene.height * 100}%">
      <div class="punish-room">
        <div class="punish-yama"><img src="${heroCry()}" alt="${esc(t('punish.heroAlt'))}"></div>
        <div class="punish-pot-front" aria-hidden="true"></div>
        <div class="punish-flames" aria-hidden="true"><i></i><i></i><i></i></div>
      </div>
      <div class="punish-vignette"></div>
      <div class="punish-title"><small>${esc(t('punish.heading'))}</small><b>${esc(getLang() === 'th' ? p.title : t('punish.title'))}</b></div>
      <div class="punish-dad"><img src="${artUrl('hero-boss')}" alt="${esc(g.zone === 'th' ? 'พญายม' : authorityOf(g.zone).title)}"><span>${esc(t('punish.quote'))}</span></div>
    </div>
    <div class="punish-copy"><p>${esc(getLang() === 'th' ? p.text : t('punish.explanation'))}</p>
      <div class="hint">${esc(t('punish.recover').replace('{hp}', Math.max(0, Math.round(g.hp))))}</div>
      <div class="row"><button class="gold" data-close data-punish-done disabled>${esc(t('punish.serving'))}</button></div>
    </div>`, d => {
      d.classList.add('punish-scene');
      const b = d.querySelector('[data-punish-done]');
      setTimeout(() => { if (b?.isConnected) { b.disabled = false; b.textContent = t('punish.return'); } }, 1700);
    });
}

let helpPage = 0;
function openHelp() {
  modal(`<div class="help-source" hidden><h2>วิธีเล่น</h2>
    <p style="line-height:var(--leading-body);font-size:var(--text-sm)">
    ท่านคือยมบาทมือใหม่ที่พ่อส่งมาคุมนรกโซนไทย งานคือ <b>พิพากษาให้ตรงกรรม</b> ไม่ใช่ลงโทษให้แรงที่สุด<br>
    <span style="color:var(--muted-foreground);font-size:var(--text-xs)">
    ${esc(t('hud.bookTip'))}</span></p>

    <div class="tline"><b>สามแถบที่ต้องดูตลอด</b><div>
      ❤️ <b>บารมี</b> = ชีวิตของท่าน หมดแล้วจบเกม ·
      ⚖️ <b>ระเบียบ</b> = คูณรายได้ทุกคดี แตะ 0 แล้วโดนเรียกกลับ ·
      ☠️ <b>กรรมท่าน</b> = บาปที่ตกใส่ตัวเอง เต็ม 100 แล้วชื่อท่านไปอยู่ในคิว<br>
      <b>กดที่แถบไหนก็ได้บนหัวเรื่อง</b> เพื่อดูว่ามันขึ้นลงเพราะอะไร และหมดแล้วเกิดอะไร</div></div>

    <ol style="line-height:var(--leading-body);font-size:var(--text-sm);padding-left:1.2em">
      <li><b>ทีมของท่าน</b> — <b>นิรา</b> อ่านสำนวนให้ฟังอย่างเดียว (ไม่รับเวรลงทัณฑ์) ·
          <b>ทัณฑ์</b> คือผู้คุมคนเดียวที่มีตอนเริ่ม · ถ้าคนไม่พอให้จ้างยมทูตเพิ่ม
          แต่สถานีจะเดินเฉพาะตอนท่านยืนอยู่ตรงนั้น และช้ากว่ายมทูต</li>
      <li><b>เดิน</b> — คลิกที่พื้น หรือกด WASD / ลูกศร ·
          ลงธารลาวาหรือแม่น้ำวิญญาณไม่ได้</li>
      <li>อ่านสำนวนจากหมุด 📜 เหนือหัว<b>นิรา</b> และคำแก้ตัวจากหมุด 💬 เหนือหัววิญญาณ (ชี้เมาส์ หรือแตะ)</li>
      <li><b>ไต่สวนก่อนตัดสิน</b> — คดีทั่วไปให้มองหาคำที่ขัดกับสำนวน ส่วนคดีมีชื่อจะเริ่มจาก
          <b>ภาพลักษณ์ภายนอก</b>เท่านั้น ให้เลือกประเด็นที่น่าสงสัยเพื่อค่อย ๆ เปิดรายการกรรม
          จี้ถูก = เขาสารภาพเรื่องที่ยังไม่เปิดให้<b>ฟรี</b> · จี้ผิด = เสียจังหวะไปเปล่า ๆ
          (จี้ได้ 2 ครั้งต่อคดี) · ใช้<b>ตวาดข่มขู่</b>เพื่อชี้ข้อหลักฐานที่ควรสอบสวน แล้วกดข้อที่มี 💢 · คูลดาวน์ 2 นาที</li>
      <li>ใช้พลังขุดความจริง — <b>มีจำนวนจำกัด</b> ใช้แล้วต้องเข้าไปในสถานีที่เกี่ยวข้อง
          และ<b>เดินไปเก็บไอเท็มในฉาก</b>มาเติม</li>
      <li><b>คำตัดสินไม่จบที่คดีนั้น</b> — ตัดสินเบาไป เขาไม่เข็ด ปล่อยไปแล้วไปก่อเรื่องต่อ
          แล้ว<b>กลับมายืนหน้าแท่นอีกครั้ง</b>พร้อมสำนวนที่หนากว่าเดิม (มีป้าย ↩️ ในคิว)</li>
      <li>จบเกมแล้วนิราจะวาง<b>แฟ้มชื่อของท่านเอง</b>ไว้ — เปิดอ่านได้จริง
          ข้างในคือทุกคดีที่ท่านลงเกินกรรม และทุกคนที่กลับมาเพราะท่านปล่อยเบา</li>
      <li>เลือก <b>สถานีที่ตรงชนิดกรรม</b> + <b>ระดับวาระให้พอดี</b> แล้วออกหมาย</li>
      <li><b>สถานีที่มี = สำนวนที่จะได้รับ</b> — โซนนี้รับได้เฉพาะกรรมที่ท่านมีที่ลง
          มีแต่กระทะทองแดง ก็มีแต่คดีฉ้อโกงกับมัวเมา · สร้างป่าดาบเพิ่ม คดีฆ่า/ทำร้ายกับวจีทุจริตถึงจะเริ่มเข้าคิว
          (แท็บ <b>ก่อสร้าง</b> บอกไว้ทุกหลังว่าสร้างแล้วเปิดแนวไหน)</li>
      <li>พญายมให้ดาว 0–5 ดวงทุกคดี · <b>ห้าดาวครบห้าครั้ง = เลื่อนขั้น</b> ·
          ห้าดาวยัง<b>ลดกรรมของท่าน</b>ให้ด้วยครั้งละ ${KARMA_RELIEF.star5}</li>
      <li><b>ศูนย์ดาว = โดนลูกไฟ</b> บารมีหาย 1 ใน 5 · โดนครบห้าครั้งจบเกม
          เดินไปเก็บ<b>หีบยา</b>เติมบารมีได้</li>
      <li><b>กรรมท่านลดได้</b> — ห้าดาว · เก็บ<b>ดอกบัว</b>ที่ตกบนแผนที่ตอนกรรมเกิน 40 ·
          หรือสร้าง<b>ศาลาน้ำชา</b>แล้วบูชาดอกบัวที่แท็บก่อสร้าง (${KARMA_RELIEF.lotusCost} เบี้ย ลด ${KARMA_RELIEF.lotusCut})</li>
      <li>ทุก ๆ ไม่กี่คดีจะมี <b>เปรต</b> ขึ้นมาก่อกวน (กรรมท่านยิ่งสูงยิ่งมาถี่) ปล่อยไว้ระเบียบตกเรื่อย ๆ —
          <b>ต้องกดเข้าไปสู้ในฉากต่อสู้ทุกครั้ง</b> — ใช้ปุ่ม <b>⚔️</b> ที่แถบล่าง · กด <b>เว้นวรรค</b> · หรือคลิกที่ตัวมัน<br>
          ไม่มีการฟาดฟรีหรือขว้างลูกไฟบนแผนที่ · อีกทางคือจ้าง<b>ยักษ์ทวารบาล</b>ให้ไล่ปราบแทน</li>
      <li><b>เร่งทัณฑ์เอง</b> — ไปยืนที่สถานีที่กำลังลงทัณฑ์ แล้วกด <b>เว้นวรรค</b>
          — แต่<b>ลงมือเองก็เป็นกรรมของท่าน</b> ครั้งละนิดหน่อย
          ส่งคนเมตตาสูงอย่างบุญไปคุม กรรมจะตกใส่ท่านครึ่งเดียว</li>
      <li><b>กดตัวละครหรือวิญญาณบนฉาก</b> แล้วดูรายละเอียดที่แผง <b>ข้อมูล</b> ด้านขวา —
          <b>คดีที่ปิดแล้วจะเฉลยความจริงทั้งหมด</b>ว่าเราตัดสินถูกหรือพลาดตรงไหน</li>
      <li>บางคดี<b>ถูกกับผิดปนกัน</b> จนสำนวนด้านเดียวตัดสินไม่ได้ — พวกนี้ต้องใช้พลังก่อน</li>
      <li><b>ยมทูตแต่ละคนหิวได้</b> (แถบ 🍙 แยกจากเสบียงกองกลาง) ดูและป้อนข้าวปั้นได้ 3 ทาง:
          ที่<b>โต๊ะนิรา</b> · ที่<b>หน้าต่างสถานี</b>ที่เขาประจำอยู่ · หรือกด<b>ตัวเขาบนแผนที่</b>โดยตรง
          หิวจนหมดแถบ (0) จะ<b>ทำงานช้าลงอีกชั้นหนึ่ง</b> — ป้อนข้าวปั้นหักจากเสบียงกองกลางครั้งละ 1 ห่อ
          ไม่มีเสบียงเหลือก็ป้อนไม่ได้ ต้องซื้อเพิ่มที่แท็บก่อสร้างก่อน</li>
    </ol>
    <p style="font-size:var(--text-xs);color:var(--muted-foreground)">เกมบันทึกเองอัตโนมัติทุกไม่กี่วินาที ปิดแล้วเปิดใหม่เล่นต่อได้</p></div>
    <div class="help-reader"></div>`, d => {
      const source = d.querySelector('.help-source');
      const items = [...source.querySelectorAll('li')].map(li => li.innerHTML);
      const intro = `<h2>วิธีเล่น</h2>${source.querySelector('h2 + p').outerHTML}
        ${source.querySelector('.tline').outerHTML}${source.querySelector('ol + p').outerHTML}`;
      const reader = d.querySelector('.help-reader');
      const total = items.length + 1;
      const show = next => {
        helpPage = Math.max(0, Math.min(total - 1, next));
        reader.innerHTML = `
          <article class="help-page">${helpPage === 0 ? intro
          : `<p class="help-chapter">ข้อ ${helpPage}</p><div class="help-item">${items[helpPage - 1]}</div>`}</article>
          <nav class="help-nav" aria-label="หน้าคู่มือ">
            <button type="button" data-help-prev ${helpPage === 0 ? 'disabled' : ''}>◀ ก่อนหน้า</button>
            <span class="help-count" aria-live="polite">${helpPage + 1} / ${total}</span>
            <button type="button" data-help-next ${helpPage === total - 1 ? 'disabled' : ''}>ถัดไป ▶</button>
          </nav><div class="help-dots" aria-label="เลือกหน้าคู่มือ">${Array.from({length:total}, (_, i) =>
            `<button type="button" data-help-page="${i}" aria-label="หน้า ${i + 1}" ${helpPage === i ? 'aria-current="page"' : ''}></button>`).join('')}</div>`;
        reader.querySelector('[data-help-prev]').onclick = () => show(helpPage - 1);
        reader.querySelector('[data-help-next]').onclick = () => show(helpPage + 1);
        reader.querySelectorAll('[data-help-page]').forEach(b => b.onclick = () => show(+b.dataset.helpPage));
        d.scrollTop = 0;
        // Dale — รีวิว batch18B: คลิกปุ่ม ◀/▶/จุดหน้าด้วยเมาส์ย้ายโฟกัสไปที่ปุ่มนั้น แต่ reader.innerHTML
        // ข้างบนลบปุ่มเดิมทิ้งทุกครั้งที่เปลี่ยนหน้า ปุ่มที่โฟกัสอยู่เลยหลุดจาก DOM แล้วโฟกัสเด้งไป <body>
        // คีย์ลูกศรที่ผูกกับ dlg (bubble phase) เลยไม่ได้ยินอีกต่อไปเพราะ body ไม่ใช่ลูกของ dlg (เจอด้วย
        // Playwright: คลิก "ถัดไป" หนึ่งครั้งแล้วกด ArrowRight ไม่ขยับหน้าเลย) — ดึงโฟกัสกลับมาที่ dlg เอง
        // (element เดียวที่ไม่เคยถูกแทนที่) ทุกครั้งหลัง render ให้คีย์ลูกศรใช้ได้ต่อเนื่องไม่ว่าจะเพิ่งคลิกมาก่อนไหม
        d.focus({ preventScroll: true });
      };
      let touchX = null;
      reader.addEventListener('touchstart', e => { touchX = e.changedTouches[0]?.clientX ?? null; }, { passive: true });
      reader.addEventListener('touchend', e => {
        if (touchX === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
        touchX = null;
        if (Math.abs(dx) > 45) show(helpPage + (dx < 0 ? 1 : -1));
      }, { passive: true });
      const keys = e => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault(); e.stopPropagation(); show(helpPage + (e.key === 'ArrowRight' ? 1 : -1));
        }
      };
      d.addEventListener('keydown', keys);
      onDlgClose(() => d.removeEventListener('keydown', keys));
      show(helpPage);
    }, 'help-modal');
}

// ---------- Phase 3 · หน้าต่างมินิเกม ----------
// เจ้าของสั่งไว้ 7 ก.ย. 2569 ว่าทั้งไต่สวนและต่อสู้ต้องเป็น "หน้าต่างเด้งขึ้นมา
// เหมือนเกม Turn-based RPG มีโปรไฟล์ทั้งสองฝ่าย และมีตัว SD ยืนอยู่"
// สองหน้าต่างจึงใช้แถบ .duel ตัวเดียวกัน ต่างกันแค่ของที่อยู่ข้างล่าง

/** เปิดกล่องโมดัลแบบ "ชนกับของเดิมไม่ได้"
 *  <dialog>.showModal() บนกล่องที่เปิดอยู่แล้วจะโยน InvalidStateError แล้วเงียบไปเลย
 *  ผลคือหน้าต่างมินิเกมเปิดไม่ติดและปุ่มข้างในไม่ผูก handler — ตัวที่ชนบ่อยที่สุดคือ
 *  โมดัลบทเรียนของพญายม ซึ่งเด้งพอดีตอน g.fights ขยับจาก 0 เป็น 1 (เจอ 8 ก.ย. 2569) */
let dlgGen = 0;
function openDlg(cls = '') {
  // event 'close' ของ <dialog> ยิงแบบ async — ปิดกล่องเก่าแล้วเปิดกล่องใหม่ทันที
  // ตัว handler ของกล่องเก่าจะมาทำงาน "หลัง" กล่องใหม่เปิดไปแล้ว แล้วไปลบ class
  // และคืนค่า paused ของกล่องใหม่ทิ้ง (เจอ 8 ก.ย. 2569: ห้องสอบสวนเปิดมาแต่หน้าตาเป็นกล่องธรรมดา)
  // ตัวนับรุ่นแก้ตรงนี้ — handler เก่าเช็คแล้วรู้ว่าไม่ใช่รุ่นตัวเอง ก็ถอยออกไปเงียบ ๆ
  dlgGen++;
  if (dlg.open) dlg.close();
  dlg.className = cls;
  try { dlg.showModal(); return true; }
  catch (e) { console.error('[อเวจี] เปิดกล่องไม่ได้', e); return false; }
}

/** พักเกมไว้ระหว่างมีกล่องเปิดอยู่ — ตัวจัดการตัวเดียวของทั้งไฟล์
 *
 *  ของเดิมแต่ละกล่องจำ `was = g.paused` ของตัวเอง แล้วคืนค่านั้นตอนปิด ซึ่งพังเมื่อ
 *  กล่องถูก "แทนที่" ด้วยกล่องใหม่ (openDlg เขียนทับ innerHTML ไม่ได้ยิง close):
 *  กล่องใหม่จะจำค่าที่กล่องเก่าตั้งไว้ = พัก แล้วคืนค่า "พัก" ให้ตอนปิด
 *  เกมจึงค้างถาวรโดยหน้าตาเหมือนกำลังเล่นอยู่ — ทัณฑ์ 0% ยมทูตยืนนิ่ง
 *  (เจ้าของเจอ 8 ก.ย. 2569 · ก่อนหน้านั้นไม่มีใครสังเกตเพราะเกมเริ่มมาแบบพักอยู่แล้ว)
 *
 *  ตอนนี้จำค่าไว้ที่เดียวตอนกล่อง "ใบแรก" เปิด แล้วคืนตอน <dialog> ปิดจริง ๆ
 *  กล่องจะสลับกันกี่ใบระหว่างนั้นก็ไม่กระทบ */
let userPaused = false;      // ผู้เล่นกดปุ่มพักเอง — อย่างเดียวที่ทำให้เกมพักค้างได้
let autoPausePending = false;
function pauseForDlg() { if (!g.paused) { g.paused = true; updatePlay(); } }

/** ไม่มีกล่องเปิดค้างแล้ว = กลับไปเป็นไปตามที่ผู้เล่นสั่งไว้
 *
 *  **ห้ามกลับไปใช้วิธี "จำค่า paused ตอนเปิดแล้วคืนตอนปิด"** — พลาดครั้งเดียวเกมค้างถาวร
 *  เพราะกล่องใบถัดไปจะไปจำค่าที่ค้างนั้นต่อ แล้วคืนค่าค้างให้ตลอดไป
 *  (ไล่จับกันมาสามรอบวันที่ 8 ก.ย. 2569) ตอนนี้ความจริงมีแหล่งเดียวคือ userPaused
 *
 *  **และห้ามผูกกับ event 'close' ของ <dialog>** — เบราว์เซอร์ไม่ยิง close เลยตลอดเวลาที่
 *  แท็บไม่ได้อยู่หน้าจอ ผูกไว้เมื่อไหร่ = สลับแท็บกลางกล่องแล้วเกมค้างพัก
 *  เช็คจากตัวจับเวลาแทน · ได้ผลพลอยได้: ตอนกล่องแค่ "ถูกแทนที่" ด้วยใบใหม่
 *  (openDlg close แล้ว showModal ในจังหวะเดียวกัน) dlg.open ยังเป็น true อยู่ จึงไม่คืนผิดจังหวะ */
function releaseDlgPause() {
  if (dlg.open || pauseDlg.open || g.bossWalk || g.over || g.paused === userPaused) return;
  g.paused = userPaused; updatePlay();
}
dlg.addEventListener('close', () => setTimeout(releaseDlgPause, 0));   // ทางลัดให้ไวขึ้นเฉย ๆ

/** ผูก handler ตอนปิด ที่จะทำงานเฉพาะกล่อง "รุ่นปัจจุบัน" เท่านั้น */
function onDlgClose(fn) {
  const gen = dlgGen;
  const h = () => {
    if (dlg.open && gen === dlgGen) return; // queued close from the dialog we just replaced
    dlg.removeEventListener('close', h);
    if (gen !== dlgGen) return;         // กล่องถูกแทนที่ไปแล้ว — ไม่ใช่เรื่องของ handler ตัวนี้
    fn();
  };
  dlg.addEventListener('close', h);
}

/** เวที Turn-based RPG — ใช้ร่วมกันทั้งห้องสอบสวนและฉากต่อสู้
 *  ฉากหลังคือ img/BG-Turn-Base.webp (เจ้าของวาดมาให้ 8 ก.ย. 2569)
 *  ไม่มีไฟล์ก็ยังใช้ได้ พื้นหลังจะเป็นสีทึบตาม token แทน
 *  hp = null → โหมดสอบสวน (ไม่มีหลอดเลือด) · hp = ออบเจ็กต์ฉากต่อสู้ → โชว์หลอด */
const crewBattleKey = c => c.k === 'guard' ? 'guard' : g.isFinalBattle() ? c.id : c.k;
const crewArt = (c, pose = '') => artUrl('crew-' + c.k + pose, 'png', c.homeZone) || artUrl('crew-' + c.k, 'png', c.homeZone);
function arena(title, foe, hp, act, closable, fx, helper, controls = '', squad = []) {
  // act = { lunge:'you'|'foe', struck:'you'|'foe' } — ใครพุ่ง ใครโดน ในจังหวะนี้
  const cls = side => (act && act.lunge === side ? ' lunge' : '') + (act && act.struck === side ? ' struck' : '');
  // fx = { key, side } เอฟเฟกต์ตอนลงมือ · hp.dmg = เลขความเสียหายรอบล่าสุด
  const fxAt = side => {
    if (!fx || fx.side !== side) return '';
    const d = FX_OF[fx.key] || FX_OF.atk;
    return `<img class="fx" src="img/${d.img}.png" alt=""
      onerror="this.onerror=null;this.outerHTML='<span class=&quot;fx glyph&quot;>${d.glyph}</span>'">`;
  };
  const dmgAt = (side, v) => v > 0
    ? `<span class="dmg ${side}">−${v > 900 ? '∞' : v}</span>` : '';
  const bar = (v, max, cls, label) => hp === null ? '' : `
    <span class="hpbar ${cls}"><i style="width:${Math.max(0, Math.min(100, 100 * v / max))}%"></i></span>
    <span class="hpn">${label} ${Math.round(v)} / ${max}</span>`;
  // ท่าลงทัณฑ์เฉพาะจังหวะที่เราลงมือใส่เขา — ใช้ของบำรุง (fx ลงที่ตัวเอง) ยังยืนท่าเดิม
  // ข้อ C คุณเป้ 24 ก.ย. 2569 — img/hero-yama-atk.png วาดหันขวา (ยื่นมือ/ชกไปทางขวา) มาแต่ต้นอยู่แล้ว
  // ต่างจากท่ายืน hero-yama.png ที่หันหน้าเข้ากล้องตรง ๆ (สมมาตร ไม่มีทิศ) ซึ่งเป็นภาพที่กฎ
  // .fig.you img{transform:scaleX(-1)} ถูกตั้งไว้รองรับแต่แรก (คอมเมนต์ heroFace ด้านบน) — กฎเดียวกันนั้น
  // ไปพลิกท่าโจมตีที่หันขวาอยู่แล้วให้กลับไปหันซ้ายโดยไม่ตั้งใจ ต้องแยกกันคนละเงื่อนไข ไม่ใช่ flip รวด
  // ข้อ A ชุด 13 คุณเป้ 26 ก.ย. 2569 — ยมทูตโจมตี ไม่ใช่ยมบาทน้อย: ตอนก่อนหน้านี้ท่านฟาดของยมทูต
  // ก็ยังสลับไปใช้ท่าโจมตีของยมบาทน้อยเองเหมือนยมบาทน้อยเป็นคนตี (fx.crew ไม่เคยถูกเช็ค) ดูเหมือนยมบาทน้อย
  // ทำท่าโจมตีแทนทุกครั้ง แก้โดยกันไว้ว่าถ้าเป็นตาของยมทูต/ยักษ์ (fx.crew มีค่า) ยมบาทน้อยไม่สลับท่า
  const usingAtk = act && act.lunge === 'you' && (!fx || fx.side === 'foe') && !(fx && fx.crew);
  // ชุด 30B ข้อ 4 — พลังบ้าคลั่ง: ยมบาทน้อยเปลี่ยนเป็นท่าชาร์จที่ตัวเอง + ไฟรอบตัว (fx ลงฝั่งเรา ไม่ขึ้นที่ศัตรู)
  // ท่าชาร์จค้างไว้ตลอดช่วงที่บัฟยังอยู่ (hp.rageTurns > 0) ให้เห็นว่าพลังทำงาน · โดนตี/ฟาดอยู่ใช้ท่าของมันก่อน
  const hurtNow = !!(hp && act?.struck === 'you' && hp.dmg?.you > 0);
  const charged = (fx?.key === 'rage' && fx.side === 'you') || hp?.rageTurns > 0;
  const showRage = charged && !hurtNow && !usingAtk;
  const raging = charged && !hurtNow;
  const youImg = hurtNow ? heroCry() : usingAtk ? heroAtk()
    : showRage ? (ragePoseSrc(g.outfit || g.zone) || heroAtk()) : heroFace();
  const foeSrc = storyFoeArt(foe.sp);
  const bossFallback = artUrl(MOB.kinds[0].img);
  // ข้อ K คุณเป้เจอ 25 ก.ย. 2569 — ฉากต่อสู้สำรอง (ไม่มี bg เฉพาะทาง) ใช้ Turn-Base ตามโซนแล้ว
  const bg = hp?.bg || artUrl('BG-Turn-Base', 'webp');
  // ข้อ E คุณเป้เจอ 25 ก.ย. 2569 — ยักษ์ทวารบาลเคย "อยู่ในทีม" จริง (อยู่ท้ายแถว squad มาตั้งแต่ข้อ C
  // ชุดที่ 10) แต่แถว .battle-squad เป็น column-reverse ซ้อนขึ้นจากล่าง ที่ขนาดภาพเดิม (clamp สูงสุด 165px)
  // พอมี 3 คน (ยมทูต 2 + ยักษ์) ตัวที่ 3 ถูกดันสูงจน y ติดลบ (ทดสอบจริงด้วย Playwright:
  // getBoundingClientRect().y = -32 ที่ 1440px) หลุดพ้นกรอบ .arena ที่ overflow ปิดไว้ ยักษ์เลยหายไป
  // ทั้งตัว ทั้งที่ค่า/รูปถูกต้องทุกอย่างในโค้ด — ลองแยกยักษ์ไปยืนเป็นฟิกเกอร์ต่างหาก "ด้านบนของยมบาทน้อย"
  // แล้วแต่พื้นที่แนวตั้งในกรอบ .arena (aspect-ratio 16/8 เตี้ยมาก) ไม่พอจริง ๆ ไม่ว่าจะวางตรงไหนก็ชน
  // อย่างใดอย่างหนึ่งเสมอ (คอลัมน์ยมทูต/ยมบาทน้อย/วงคำสั่ง/ผู้กระทำผิด กินพื้นที่เกือบเต็มทุกด้านอยู่แล้ว)
  // ทดสอบแล้วด้วย Playwright วัดพิกัดจริงหลายรอบ — ทางที่เหลือพื้นที่พอจริงคือ "อยู่ในคอลัมน์เดียวกับ
  // ยมทูต" (ซึ่งก็คือ "ยืนร่วมกับยมทูตในทีม" ตามที่คุณเป้ขอเป๊ะ ๆ อีกความหมายหนึ่ง) แค่ย่อขนาดทั้งคอลัมน์
  // ลงให้พอ 3 คนไม่ล้น แล้วให้ยักษ์ตัวใหญ่กว่ายมทูตสองคนนั้นนิดหน่อยตามที่ขอ (ดู .battle-squad .guard
  // ใน command-wheel.css)
  return `<div class="arena${hp ? ' combat-arena' : ''}${g.isFinalBattle(hp) ? ' final-team' : ''}" style="background-image:url('${esc(bg)}')">
    <span class="corner-tick tl"></span><span class="corner-tick tr"></span>
    <span class="corner-tick bl"></span><span class="corner-tick br"></span>
    ${closable ? '<button class="x" data-close title="ปิดห้องสอบสวน">✕</button>' : ''}
    <button class="icon-settings-mini" data-arena-settings title="ตั้งค่า"
      style="right:${closable ? '50px' : '8px'}"><img src="img/ui/icon-setting2.png" alt=""></button>
    <div class="ttl">${esc(title)}</div>
    ${helper && !squad.length ? `<div class="fig helper${act && act.lunge === 'you' && helper.lunge !== false ? ' lunge' : ''}">
      <img src="${crewArt(helper)}" class="${teamFaceClass(crewArt(helper))}" alt=""
           onerror="this.onerror=null;this.src='${crewArt(helper, '-profile') || crewArt(helper)}'">
      <span class="plate"><b>${esc(helper.name)}</b><span class="sub">เข้ามาช่วย</span></span>
    </div>` : ''}
    ${squad.length ? `<div class="battle-squad${squad.some(c => c.k === 'guard') ? ' trio' : ''}">${squad.map(c => `<span${c.k === 'guard' ? ' class="guard"' : ''} role="button" tabindex="0" data-crew-pick="${esc(crewBattleKey(c))}" aria-label="ให้${esc(c.name)}ใช้ท่าพิเศษ">
      <img src="${crewArt(c)}" class="${teamFaceClass(crewArt(c))}" alt="${esc(c.name)}"><b>${esc(c.name)}</b>${
        c.k === 'guard' ? crewCooldown(c, g.guardCooldown(), GUARD.battleCd) : crewCooldown({ ...c, k:crewBattleKey(c) }, g.crewCooldown(c), BATTLE.crewCd)
      }</span>`).join('')}</div>` : ''}
    <div class="fig you${cls('you')}${usingAtk || showRage ? ' atk' : ''}${raging ? ' raging' : ''}">
      ${fxAt('you')}${dmgAt('you', hp && hp.dmg ? hp.dmg.you : 0)}
      <img src="${youImg}" alt="" onerror="this.onerror=null;this.src='${artUrl('hero-yama-profile') || artUrl('hero-yama')}'">
      <span class="plate"><b>${esc(HERO_NAME)}</b><span class="sub">ยมบาทประจำ${esc(g.zoneDef().name)}</span>
        ${bar(hp ? hp.youHp : 0, hp ? hp.youMax : 1, '', 'บารมี')}</span>
    </div>
    ${hp?.foes?.length > 1 ? `<div class="foe-group">${hp.foes.map(f => {
      const src = storyFoeArt(f.sp);
      const hits = hp.dmg?.confuseSelf > 0 ? hp.dmg?.confuseHits : hp.dmg?.foeHits;
      const damage = hits?.filter(h => h.id === f.id).reduce((sum,h) => sum+h.damage,0);
      const hit = act?.struck === 'foe' && (hits ? damage > 0 :
        (hp.dmg?.confuseSelf > 0 ? hp.dmg?.counterFoeId === f.id : hp.dmg?.foeId === f.id));
      const counterHit = hp.dmg?.counterFoeId === f.id && act?.lunge === 'foe';
      return `<button type="button" class="fig foe${f.boss ? ' boss-foe' : ''}${f.hp <= 0 ? ' down' : ''}${hp.selectedFoeId === f.id ? ' selected' : ''}${hit ? ' struck' : ''}${counterHit ? ' lunge' : ''}"
        data-foe-id="${esc(f.id)}" ${f.hp <= 0 ? 'disabled' : ''} aria-label="${esc(f.who)} ${Math.round(f.hp)}/${f.maxHp}">
        ${hit ? fxAt('foe') + dmgAt('foe', damage ?? hp.dmg?.confuseSelf ?? hp.dmg?.foe ?? 0) : ''}
        ${hp.selectedFoeId === f.id && f.hp > 0 ? `<span class="target-arrow">▼ ${t('event.prisonBreak.target')}</span>` : ''}
        <img src="${esc(src)}" class="${foeFaceClass(src)}" alt="" onerror="this.onerror=null;this.src='${f.boss ? bossFallback : 'img/spirit7.png'}'">
        <span class="plate"><b>${esc(f.who)}</b><span class="sub">${f.hp <= 0 ? t('event.prisonBreak.down') : esc(f.sub || '')}</span>
          ${bar(f.hp, f.maxHp, 'foe', 'กำลังใจ')}</span>
      </button>`;
    }).join('')}</div>` : `<div class="fig foe${hp?.foes?.[0]?.boss ? ' boss-foe' : ''}${cls('foe')}">
      ${fxAt('foe')}${dmgAt('foe', hp && hp.dmg ? hp.dmg.foe : 0)}
      <img src="${foeSrc}" class="${foeFaceClass(foeSrc)}" alt="" onerror="this.onerror=null;this.src='${hp?.foes?.[0]?.boss ? bossFallback : 'img/spirit7.png'}'">
      <span class="plate"><b>${esc(foe.name)}</b><span class="sub">${esc(foe.sub || '')}</span>
        ${bar(hp ? hp.foes?.[0]?.hp : 0, hp ? hp.foes?.[0]?.maxHp : 1, 'foe', 'กำลังใจ')}</span>
    </div>`}
    ${controls}
  </div>`;
}

/** ภาพคั่นสั้น ๆ ตอนใช้ท่าพิเศษ ชุดไหนยังไม่มีภาพให้ข้ามอย่างเงียบ ๆ */
function actionCutsceneSrc(k) {
  if (k === 'roar') return null;
  const style = g.outfit || g.zone;
  if (k === 'ice') return `img/hero-yama-${style}-ice-cutscene-v2.png`;
  const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
  // ภาพท่าที่ปลดล็อกจากบอสชายแดน
  const unlockedPose = k === 'fire' && g.abilities?.bigFire ? 'fire'
             : k === 'flameCharge' && g.abilities?.flameCharge ? 'flame-charge'
             : k === 'windFan' && g.abilities?.windFan ? 'wind'
             : k === 'rage' && g.abilities?.rage ? 'rage'
             : k === 'valkyrieSpear' && g.abilities?.valkyrieSpear ? 'valkyrie-spear'
             : k === 'cooldownClock' && g.abilities?.cooldownClock ? 'clock-reset' : null;
  if (unlockedPose) {
    if (style === 'th') return `img/hero-yama-${unlockedPose}-cutscene.jpeg`;
    if (folders[style]) return `img/${folders[style]}/hero-yama-${style}-${unlockedPose}-cutscene.jpeg`;
  }
  const pose = k === 'hypno' ? 'hyp' : k === 'mirror' ? 'mi'
             : k === 'ice' ? 'ice'
             : k === 'fire' ? 'atk' : null;
  if (!pose) return null;
  if (style === 'th') return `img/hero-yama-${pose}-cutscene.jpeg`;
  return folders[style] ? `img/${folders[style]}/hero-yama-${style}-${pose}-cutscene.jpeg` : null;
}

/** Crew and Guard use their branch's action art, regardless of Yama's outfit. */
function crewCutsceneSrc(k) {
  const actor = g.roster[k], kind = actor?.kind || k, zone = actor?.homeZone || g.zone;
  const scene = regionalCrewCutscene(kind, zone);
  return { src:scene.src, fallback:scene.regional ? artUrl(`crew-${kind}`, 'png', zone) : null };
}

// ข้อ E คุณเป้ 24 ก.ย. 2569: 580ms เร็วเกินจะทันเห็น (ภาพขึ้นจริงแต่กระพริบผ่านไป)
// ยืดเป็น 1.3 วิ (อยู่ในช่วง 1.2–1.5 ที่ขอ) ให้ตรงกับ CSS .action-cutscene ใน index.html
// (คีย์เฟรม actionCut/actionRush/speedLines ต้องยืดเวลาให้เท่ากันที่นั่นด้วย — ดูคอมเมนต์ที่นั่น)
const ACTION_CUT_MS = 1300;
function playActionCutscene(k, ultimate = null) {
  // ข้อ A ชุด 13 — 'crew:<k>' และ 'guard' ขึ้นคัตซีนของยมทูต/ยักษ์เอง ไม่ใช่ของยมบาทน้อย
  const crewKey = k.startsWith('crew:') ? k.slice(5) : k === 'guard' ? 'guard' : null;
  const cs = crewKey ? crewCutsceneSrc(crewKey) : null;
  const src = ultimate?.image || (cs ? cs.src : actionCutsceneSrc(k));
  if (!src || !dlg.open) return;
  dlg.querySelector('.action-cutscene')?.remove();
  const cut = document.createElement('div');
  // คัตซีนพลังใหม่วาดให้หันขวาตามตำแหน่งศัตรูอยู่แล้ว
  cut.className = ultimate ? 'action-cutscene enemy-facing'
    : ['ice', 'flameCharge', 'rage', 'windFan', 'valkyrieSpear', 'cooldownClock'].includes(k)
      ? 'action-cutscene right-facing' : 'action-cutscene';
  // ชุด 29C ข้อ 8 — คัตซีนยมทูต/ยักษ์: ภาพของโซน 2–4 เป็นผืนสี่เหลี่ยมจัตุรัส 512×512 พอ object-fit:cover บนฉากกว้าง
  // ถูกตัดเหลือแถบกลางภาพ (ตัวละครอยู่ล่างภาพจึงเห็นแต่ส่วนบนของหัวกับพื้นดำ) → ให้เห็นทั้งภาพ (contain) เฉพาะคัตซีนของยมทูต
  if (crewKey) cut.classList.add('crew-cut');
  if (!ultimate && ACTION_CUTSCENE_PRESENTATION[src]?.flip === false) cut.classList.add('right-facing');
  cut.innerHTML = `<img src="${src}" alt="ภาพคั่นท่าพิเศษ — แตะเพื่อข้าม">${ultimate ? `<strong style="position:absolute;bottom:8%;left:50%;transform:translateX(-50%);z-index:3;color:#fff;text-shadow:0 3px 8px #000;font-size:clamp(22px,4vw,48px)">${esc(ultimate.name)}</strong>` : ''}`;
  const img = cut.querySelector('img');
  const fallback = cs && cs.fallback;
  img.onerror = () => {
    if (fallback) { img.onerror = () => cut.remove(); img.src = fallback; }
    else cut.remove();
  };
  let done = false;
  const finish = () => { if (done) return; done = true; cut.remove(); };
  cut.onclick = finish;              // กดข้ามได้ทันที (ข้อ E)
  dlg.appendChild(cut);
  fitCutsceneImage(cut, img); // ทุกภาพรักษาสัดส่วน และแสดงกรอบส่วนที่มีภาพครบ
  setTimeout(finish, ACTION_CUT_MS);
}

// ---------- ห้องสอบสวน (HUD แบบเกม Turn-based RPG) ----------
// เจ้าของออกแบบเลย์เอาต์มาเอง 8 ก.ย. 2569 โดยอ้างอิงเกมแนว tactics:
//   ฉากเป็นพื้นหลังเต็มจอ · HUD ลอยทับเป็นชั้น ๆ ไม่ใช่แผงเรียงลงมา
//   บน = แถบสถานะ · ซ้าย = แถวคำสั่งแนวตั้ง · ขวาบน = สำนวน+คำให้การ
//   ล่างซ้าย = โปรไฟล์ยมบาทน้อย + ของ · ล่างขวา = โปรไฟล์วิญญาณ
// เปิดได้จากแท่นพิพากษาเท่านั้น (ดู drawDeck) — แท็บ "ไต่สวน" เดิมถูกถอดออกแล้ว
let trialCmd = 'ask';        // แผงขวาเป็นการไต่สวนเสมอ; ตัวเลือกคำตัดสินอยู่ในวงคำสั่งบนเวที

function openTrial(initialError = '') {
  if (g.over || g.battle) return;
  const s = g.queue[0];
  if (!s) return;
  pauseForDlg();
  bgm('bgm-trial');
  trialCmd = 'ask';
  let trialError = initialError;
  const blockText = block => block ? t('trial.' + block.key) + (block.station ? block.station : '') : '';

  const paint = () => {
    // เปลี่ยนแท็บแล้ววาดเนื้อหาห้องสอบสวนใหม่ แต่บนมือถืออย่ากระโดดกลับไปหัวกล่อง
    const scrollAt = dlg.querySelector('.hud')?.scrollTop || 0;
    const known   = s.deeds.filter(d => d.known && d.visible !== false);
    const claimed = s.merits.filter(m => !m.exposed);
    const dests   = g.trialDestinations();       // 29C: ไม่รวมหอทะเบียนกรรม (ส่งไปแล้วไม่มีอะไรเกิด)
    const idle    = g.freeCrew();
    const answer  = g.trialAnswer(s);
    const selectedSt = dests.find(x => x.def.k === pick.st);
    const keeper = selectedSt?.slots.length ? g.crewOf(selectedSt.crewK) : null;
    const available = keeper ? [keeper] : idle;
    if (pick.st && !dests.some(x => x.def.k === pick.st && g.stFree(x) > 0)) pick.st = null;
    if (pick.cr && !available.some(c => c.k === pick.cr)) pick.cr = null;
    const stDef  = pick.st && STATIONS.find(d => d.k === pick.st);
    const heaven = !!(stDef && stDef.heaven);
    const blocked = pick.st && pick.cr ? g.assignBlock(s.id, pick.st, pick.cr) : null;
    const ready  = !!(pick.st && pick.cr && (heaven || pick.inten) && !blocked);
    // ปุ่มออกหมายกด disabled แล้วเงียบ ไม่มีทางรู้ว่าขาดอะไร (ข้อ B คุณเป้ 24 ก.ย. 2569)
    // — ต้องมีข้อความบนจอเสมอ ไม่ใช่แค่ title ที่ disabled button ไม่โชว์บนจอสัมผัส
    const missingParts = ready ? [] : [
      !pick.st && t('trial.where'), !pick.cr && t('trial.who'), !(heaven || pick.inten) && t('trial.force'),
    ].filter(Boolean);

    // ---- แถบสถานะบนสุด ----
    const ot = g.orderTier(), kt = g.karmaTier();
    const top = `
      <span class="chip">🪙 <b>${Math.round(g.coin)}</b></span>
      <span class="chip">🍙 <b>${Math.round(g.food)}</b></span>
      <span class="chip">❤️ บารมี ${bar(100 * g.hp / g.hpMax, 'hp')} <b>${Math.round(g.hp)}</b></span>
      <span class="chip">🔹 MP <b>${Math.round(g.mp)}/${g.mpMax}</b></span>
      <span class="chip">⚖️ ระเบียบ ${bar(g.order)} <b>${Math.round(g.order)}</b></span>
      <span class="chip">☠️ กรรม ${bar(g.karma, 'karma')} <b>${g.karma.toFixed(1)}</b></span>
      <span class="ttl">${esc(t('trial.caseNo'))} #${String(s.id).padStart(3, '0')}</span>`;

    // ---- ปุ่มด้านบน + วงคำสั่งข้างยมบาทน้อย ----
    // ไอคอนปุ่มสอบสวนใช้ไฟล์ที่เตรียมไว้ใน img/
    const topActions =
      `<button data-cmd="ask">${esc(t('trial.interrogateLeft'))}<br>${s.presses} ${esc(t('trial.times'))}</button>
       <button id="t-guide"><img class="tab-ico" src="img/ui/icon-book.png" alt="">${esc(t('trial.guideBook'))}</button>
       <button id="t-jail" ${g.has('tarang') && g.jailFree() > 0 ? '' : 'disabled'} title="${g.has('tarang') ? 'ต้องมีที่ว่างในตะราง' : 'สร้างตะรางรอวาระก่อน'}"><img class="tab-ico" src="img/icon-lock.png" alt="">${esc(t('trial.lockCase'))}</button>
       <button id="t-skip" ${g.queue.length > 1 ? '' : 'disabled'}><img class="tab-ico" src="img/icon-skip.png" alt="">${esc(t('trial.skipCase'))}</button>`;
    const orbImg = (src, alt = '') => `<img src="${src}" alt="${esc(alt)}">`;
    const powerDefs = POWERS.filter(p => ['roar', 'mirror', 'hypno'].includes(p.k));
    const powerImg = { roar:'img/icon-fang.png', mirror:'img/item-mirror.png', hypno:'img/fx-hypno.png' };
    // ข้อ A คุณเป้ 24 ก.ย. 2569 — ตวาดข่มขู่เปลี่ยนเป็นคูลดาวน์เวลาจริง (p.realtime) ไม่ใช้ ammo/item อีกแล้ว
    // แยกป้ายกำกับปุ่มเป็นสองแบบ: roar โชว์เวลานับถอยหลัง mm:ss · มิเรอร์/สะกดจิตยังโชว์จำนวนที่เหลือแบบเดิม
    const powerChoices = powerDefs.map(p => {
      const pw = g.powerOf(p.k), noIssue = p.k === 'roar' && g.roarWhy(s), ok = g.powerReady(p.k) && !noIssue;
      const ammo = pw.ammo + (p.k === 'mirror' ? g.inventory.mirror || 0 : 0);
      const locked = g.powerLocked(p);
      // ข้อ A-2/A-3 คุณเป้ 24 ก.ย. 2569 — บอกแหล่งของให้ตรงจริงต่อพลัง (mirror ได้สองทาง · hypno ซื้ออย่างเดียว)
      const outOfAmmoHint = p.k === 'mirror' ? 'หมดแล้ว — เดินเก็บบนแผนที่ หรือคุยกับกานต์ที่หอส่องกรรม'
                           : 'หมดแล้ว — เดินไปเก็บบนแผนที่';
      const mpPower = p.k === 'hypno' || p.k === 'ice';
      const why = noIssue || (locked ? `ล็อก · ต้องเป็น${LEVELS[p.lv - 1].name}ก่อน`
                : p.realtime ? (ok ? 'พร้อมใช้ — ไม่ต้องใช้ item' : `รออีก ${fmtCountdown(pw.readyAt)}`)
                : mpPower && g.mp < BATTLE.mpCost[p.k] ? `MP ไม่พอ · ใช้ ${BATTLE.mpCost[p.k]}`
                : !mpPower && ammo <= 0 ? outOfAmmoHint
                : pw.cd > 0 ? `รออีก ${pw.cd} คดี`
                : p.k === 'mirror' || p.k === 'hypno' ? t(`power.${p.k}Desc`) : p.desc);
      const badge = locked ? '×0' : p.realtime ? (ok ? '✓' : fmtCountdown(pw.readyAt)) : mpPower ? `${BATTLE.mpCost[p.k]} MP` : `×${ammo}`;
      return `<button class="orb-choice" data-pw="${p.k}" ${ok ? '' : 'disabled'} title="${esc(p.name + ' — ' + why)}">
        ${orbImg(powerImg[p.k], p.name)}<b>${esc(p.name)}</b><i>${noIssue ? esc(noIssue) : badge}</i></button>`;
    }).join('');
    const destinationChoices = (dests.length ? dests.map(x => {
      const block = x.slots.length ? g.assignBlock(s.id, x.def.k, x.crewK)
        : g.stFree(x) <= 0 ? { key:'stationFull' } : null;
      const busy = !!block, bg = stBg(x.def.k), why = blockText(block);
      const revealed = x.def.k === answer?.station?.k;
      return `<button class="orb-choice${revealed ? ' is-revealed' : ''}" data-k="${x.def.k}" data-pickkey="st" ${busy ? 'disabled' : ''}
        ${x.def.k === pick.st ? 'aria-pressed="true"' : ''} title="${esc(x.def.name + (revealed ? ' · ' + t('trial.revealedWhere') : '') + (why ? ' · ' + why : ''))}">
        ${orbImg(bg, x.def.name)}<b>${esc(x.def.name)}</b>${revealed ? '<span class="reveal-mark" aria-hidden="true">✓</span>' : why ? `<small>${esc(why)}</small>` : ''}</button>`;
    }).join('') : `<span class="idle trial-empty-hint">${esc(t('trial.noDestinations'))}</span>`) + (answer?.station && !dests.some(x => x.def.k === answer.station.k && !x.build)
      ? `<span class="idle trial-empty-hint trial-revealed-destination">✓ ${esc(t('trial.revealedWhere'))}: ${esc(answer.station.name)}</span>` : '');
    const shownCrew = answer?.crew && !available.some(c => c.k === answer.crew.k)
      ? [...available, answer.crew] : available;
    const crewChoices = shownCrew.length ? shownCrew.map(c => {
      const revealed = !!answer?.crew && c.k === answer.crew.k;
      const unavailable = revealed && (answer.unavailable || !available.some(x => x.k === c.k) && { key:'chooseRevealedStation' });
      const why = unavailable ? blockText(unavailable) : '';
      return `<button class="orb-choice${revealed ? ' is-revealed' : ''}" data-k="${c.k}" data-pickkey="cr" ${unavailable ? 'disabled' : ''} ${c.k === pick.cr ? 'aria-pressed="true"' : ''}
        title="${esc(c.name + ' · แรง ' + c.raeng + ' · ระเบียบ ' + c.rabiab + ' · ปัญญา ' + c.panya + ' · เมตตา ' + c.metta + (revealed ? ' · ' + t('trial.revealedCrew') : '') + (why ? ' · ' + why : ''))}">
        ${orbImg(artUrl(c.self ? 'hero-yama-profile' : `crew-${c.k}-profile`) || artUrl(c.self ? 'hero-yama' : `crew-${c.k}`), c.name)}
        <b>${esc(c.name)}</b><small>${unavailable ? esc(t('trial.unavailable') + ' · ' + why) : `แรง ${c.raeng} · ระเบียบ ${c.rabiab}`}</small>${revealed ? '<span class="reveal-mark" aria-hidden="true">✓</span>' : ''}</button>`;
    }).join('') : '<span class="idle">ไม่มีใครว่าง</span>';
    // ไอคอนวงกลม 5 สีจาก img/raw/icon.jpeg (ข้อ B.4 คุณเป้ 24 ก.ย. 2569) — ตัดเฉพาะวงกลมด้วย
    // scripts อ่านที่ AGAPAE Agent/Output/Toby/ ไม่มีตัวหนังสือฝังในรูป ใช้ป้ายชื่อ HTML เดิม (<b>) ต่อท้าย
    const forceIcon = i => `img/icon-force-${i}.png`;
    const forceChoices = answer?.intensity === 0
      ? `<button class="orb-choice is-revealed" disabled title="${esc(t('trial.noPunishment'))}"><span class="force-none">🕊️</span><b>${esc(t('trial.noPunishment'))}</b><span class="reveal-mark" aria-hidden="true">✓</span></button>`
      : heaven ? '' : [1, 2, 3, 4, 5].map(i => {
      const revealed = i === answer?.intensity;
      return `<button class="orb-choice${revealed ? ' is-revealed' : ''}" data-v="${i}" data-pickkey="inten" ${i === pick.inten ? 'aria-pressed="true"' : ''}
        title="ระดับ ${i} ${esc(INTENSITY[i])}${revealed ? ' · ' + esc(t('trial.revealedForce')) : ''}">${orbImg(forceIcon(i), INTENSITY[i])}<b>${esc(INTENSITY[i])}</b>${revealed ? '<span class="reveal-mark" aria-hidden="true">✓</span>' : ''}</button>`;
    }).join('');
    const crewNow = pick.cr && g.crewOf(pick.cr);
    const selected = [
      stDef && `<span class="command-selected selected-place">${orbImg(stBg(stDef.k))}<b>${esc(stDef.name)}</b></span>`,
      crewNow && `<span class="command-selected selected-crew">${orbImg(artUrl(crewNow.self ? 'hero-yama-profile' : `crew-${crewNow.k}-profile`))}<b>${esc(crewNow.name)}</b></span>`,
      (pick.inten || heaven || answer?.intensity === 0) && `<span class="command-selected selected-force${answer?.intensity === 0 ? ' is-revealed' : ''}">${heaven || answer?.intensity === 0 ? '<strong>🕊️</strong>' : orbImg(forceIcon(pick.inten), INTENSITY[pick.inten])}<b>${answer?.intensity === 0 ? esc(t('trial.noPunishment')) : heaven ? 'อัตโนมัติ' : INTENSITY[pick.inten]}</b></span>`
    ].filter(Boolean).join('');
    // สถานีที่ผู้คุมประจำส่งไม่ได้ตอนนี้ — บอกเหตุผลในบรรทัดสถานะ (จอแคบไม่มีที่พอสำหรับป้ายเล็กใต้ไอคอน)
    const stationNotes = dests.filter(x => x.slots.length && g.stFree(x) > 0).map(x => [x, g.assignBlock(s.id, x.def.k, x.crewK)])
      .filter(([, bk]) => bk).map(([x, bk]) => `${x.def.name}: ${blockText(bk)}`).join(' · ');
    const trialWheel = commandWheel({ready, selected,
      missing: trialError || blockText(blocked) || [missingParts.length ? `${t('trial.missing')} ${missingParts.join(' · ')}` : '', stationNotes].filter(Boolean).join(' · '), groups:[
      {choices:powerChoices},{choices:destinationChoices},{choices:crewChoices},{choices:forceChoices,disabled:heaven}
    ]});

    // ข้อความไต่สวนอยู่ขวาตลอดเวลา ส่วนตัวเลือกคำตัดสินย้ายไปเป็นวงไอคอนแล้ว
    const roarHint = s.roarHint != null ? g.roarTarget(s)?.i : null;
    const opt = `<h4>${s.case ? esc(t('trial.chooseIssue')) : 'ข้ออ้างของเขา — เลือกข้อที่ขัดกับสำนวน'}</h4>` + s.lines.map(l => {
      const cls = !l.used ? '' : l.kind === 'solid' ? 'miss' : 'hit';
      return `<button class="say ${cls}${roarHint === l.i && !l.used ? ' roar-hint' : ''}" style="${roarHint === l.i && !l.used ? 'outline:3px solid #e9b448' : ''}" data-line="${l.i}" ${l.used || s.presses <= 0 ? 'disabled' : ''}
        >${roarHint === l.i && !l.used ? '💢 ' : ''}${l.used ? (l.kind === 'solid' ? '✗ ' : '✓ ') : ''}“${esc(l.t)}”</button>`;
    }).join('');

    const foeSrc = typeof s.sp === 'string' ? artUrl(s.sp) || `img/${s.sp}.png` : `img/spirit${s.sp || 7}.png`;
    dlg.innerHTML = `
    <div class="hud trial-hud" style="background-image:url('${artUrl('BG-Turn-Base', 'webp')}')">
      <div class="hud-scrim"></div>
      <span class="corner-tick tl"></span><span class="corner-tick tr"></span>
      <span class="corner-tick bl"></span><span class="corner-tick br"></span>
      <div class="top-left-icons">
        <button class="trial-pause" data-trial-pause aria-label="${esc(t('trial.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>
        <button class="icon-settings-mini" data-arena-settings title="${esc(t('trial.settings'))}"><img src="img/ui/icon-setting2.png" alt=""></button>
      </div>
      <button class="trial-close" data-close aria-label="${esc(t('trial.close'))}"><img src="img/ui/icon-close.png" alt=""></button>

      <div class="hud-body">
        <div class="hud-stage">
          <span class="trial-case-no">${esc(t('trial.caseNo'))} : ${String(s.id).padStart(3, '0')}</span>
          <div class="fig you"><img src="${heroFace()}" alt=""
                 onerror="this.onerror=null;this.src='${artUrl('hero-yama')}'">
            <span class="nm">${esc(HERO_NAME)}</span></div>
          <div class="fig foe"><img src="${esc(foeSrc)}" alt=""
                 onerror="this.onerror=null;this.src='img/spirit7.png'">
            <span class="nm">${esc(s.name || s.who)}</span></div>
          ${trialWheel}
        </div>

        <div class="hud-right">
          <div class="trial-top-actions" aria-label="คำสั่งคดี">${topActions}</div>
          <div class="hud-card hud-rec">
            <h4>${esc(t('trial.readAloud'))}</h4>
            ${s.face ? `<div class="deed allegation">${esc(s.face)}</div>` : ''}
            ${claimed.map(m => `<div class="deed merit">🪷 ${esc(m.t)}
              ${m.note ? `<i class="observation">— ${esc(m.note)}</i>` : ''}</div>`).join('')}
            ${known.map(d => `<div class="deed allegation">${deedLine(d)}</div>`).join('')}
            ${!s.face && !claimed.length && !known.length ? '<div class="deed">สำนวนว่างเปล่า</div>' : ''}
            ${s.back ? `<div class="deed" style="color:var(--destructive)">↩️ ลงทัณฑ์ ${s.back.gave} วาระแล้วยังไม่สำนึก · ถูกส่งกลับเข้าคิวก่อนเกิดใหม่</div>` : ''}
          </div>

          <div class="hud-card hud-opt">${opt}</div>

          <div class="hud-card">
            <h4>${esc(t('trial.saveRecord'))}</h4>
            <div class="hud-log">${s.said.slice(-6).map(x =>
              `<div class="${x.kind === 'truth' || x.kind === 'confess' ? 'hi' : ''}">${esc(x.text)}</div>`).join('')
              || '<div>ยังไม่มีอะไร — เขายืนก้มหน้าอยู่เฉย ๆ</div>'}</div>
          </div>
        </div>
      </div>

      <div class="hud-bottom">
        <div class="port you">
          <img src="${artUrl('hero-yama-profile') || artUrl('hero-yama')}" alt=""
               onerror="this.onerror=null;this.src='${artUrl('hero-yama')}'">
          <span class="who2"><b>${esc(HERO_NAME)}</b><small>${esc(t('trial.hp'))} ${Math.round(g.hp)}/${g.hpMax}</small><span class="trial-hpbar"><i style="width:${Math.max(0,Math.min(100,100*g.hp/g.hpMax))}%"></i></span></span>
        </div>
        <!-- การ์ดรูป+ชื่อวิญญาณ (.port.foe) เอาออก 18 ก.ย. 2569 (ข้อ A ของคุณเป้) — บนจอแคบมันทับ
             .hud-log ด้านบน และข้อมูลตัวตนซ้ำกับ .fig.foe ที่อยู่บนเวทีอยู่แล้ว (รูป+ชื่อเดียวกัน)
             เอาออกทุกจอ ไม่ใช่แค่จอแคบ — ดูสะอาดกว่าและไม่เสียข้อมูลอะไรไป การ์ดยมบาทน้อยฝั่งซ้ายคงไว้ -->
      </div>
    </div>`;

    if (scrollAt) dlg.querySelector('.hud').scrollTop = scrollAt;

    // ---- ผูกปุ่ม ----
    bindCommandWheel(dlg);
    dlg.querySelector('[data-trial-pause]').onclick = () => openPause(true);
    dlg.querySelector('[data-cmd="ask"]').onclick = () => dlg.querySelector('[data-line]:not(:disabled)')?.focus();
    dlg.querySelector('#t-guide').onclick = () => {
      const guide = document.createElement('dialog');
      guide.className = 'court-guide';
      guide.innerHTML = `<button class="guide-close" aria-label="${esc(t('common.close'))}"><img src="img/ui/icon-close.png" alt=""></button><h2>คู่มือนรก</h2>
        <p>กติกาของอเวจี · อ่านสำนวน → ไต่สวน → เลือกสถานที่ ผู้คุม และความแรง → ออกหมาย</p>
        <h3>ส่งคดีไปที่ไหน</h3><p>เลือกสถานที่ให้ตรงกับกรรมหลักที่พบในสำนวน ต้องสร้างสถานที่และมีที่ว่างก่อน</p>
        <table><thead><tr><th>คดี</th><th>สถานที่</th></tr></thead><tbody>${STATIONS.filter(x=>x.tags.length).map(x=>`<tr><td>${x.tags.map(k=>SINS[k]?.name||k).join(' / ')}</td><td>${x.name}</td></tr>`).join('')}</tbody></table>
        <p>ผู้บริสุทธิ์ใช้ประตูสวรรค์ ซึ่งไม่ต้องเลือกความแรง หอทะเบียนกรรมรับงานทั่วไปได้ แต่ควรเลือกสถานที่เฉพาะกรรมเมื่อมีพร้อม</p>
        <h3>เลือกระดับความแรงและบรรเทาโทษ</h3><p>ระดับ 1 ว่ากล่าว · 2 เบา · 3 ปานกลาง · 4 หนัก · 5 มหันต์ ใช้ความหนักของการกระทำทั้งหมดประกอบกัน อย่าเลือกสูงสุดทุกคดี</p>
        <p>ไต่สวนเพื่อเปิดเผยข้อเท็จจริงและตรวจบุญที่อ้าง บุญที่เป็นจริงช่วยลดโทษ ส่วนคำอ้างเท็จไม่นับ การลงโทษเกินเพิ่มกรรมของท่าน ลงโทษเบาเกินอาจไม่ทำให้สำนึก หากยังไม่พร้อมให้พักคดี หรือขังรอเมื่อมีตะรางและที่ว่าง</p>
        <p>เมื่อรับทัณฑ์ครบ วิญญาณจะไปตะราง ตรวจรายชื่อกับนิรา: เข็ดแล้วส่งต่อไปประตูสวรรค์ ยังไม่เข็ดส่งกลับคิว ที่ประตูสวรรค์ให้บุญตรวจกรรมคงเหลือ: ยังมีกรรมส่งไปเกิดใหม่ หมดกรรมส่งขึ้นสวรรค์และรับรางวัลจากพ่อ</p>
        <h3>เลือกผู้คุม</h3><p>แรงช่วยให้งานเร็ว ระเบียบช่วยคุณภาพงาน ปัญญาสูงช่วยให้สำนึก เมตตาช่วยลดกรรมจากโทษที่เกิน แต่ไม่ทำให้คำตัดสินผิดกลายเป็นถูก</p>
        ${CREW.filter(c=>!c.reader).map(c=>`<p><b>${esc(crewName(c, g.zone))}</b> — ${c.duty}<br>แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}<br>ในสนามรบ: ${crewAbility(c.k)}</p>`).join('')}
        <h3>ทีมต่อสู้</h3><p>จัดทีมยมทูตได้ 2 คนก่อนเข้าสู้ ใช้ความสามารถของแต่ละคนผ่านเมนูยมทูต คูลดาวน์คนละ ${BATTLE.crewCd} วินาที และใช้กำลังใจ ${BATTLE.crewMorale} หน่วย แถบสีเหลืองเต็มจึงพร้อมใช้ใหม่</p>`;
      dlg.append(guide); guide.showModal();
      guide.querySelector('button').onclick=()=>guide.close();
      guide.addEventListener('close',()=>guide.remove());
    };
    dlg.querySelectorAll('[data-pickkey]').forEach(el => el.onclick = () => {
      pick[el.dataset.pickkey] = el.dataset.k ?? +el.dataset.v;
      if (el.dataset.pickkey === 'st') {
        const station = g.stations.find(x => x.def.k === pick.st);
        pick.cr = station?.slots.length ? station.crewK : null;
      }
      trialError = '';
      paint();
    });
    dlg.querySelectorAll('[data-line]').forEach(el => el.onclick = () => {
      const r = g.press(s, +el.dataset.line);
      if (r) sfx(r.some(x => x.kind === 'truth' || x.kind === 'confess') ? 'crack' : 'deny');
      paint(); refresh();
    });
    dlg.querySelectorAll('[data-pw]').forEach(el => el.onclick = () => {
      const k = el.dataset.pw;
      if (!g.usePower(k, s)) return;
      sfx(powerSfx(k, g.abilities)); paint(); refresh(); playActionCutscene(k);
    });

    const sk = dlg.querySelector('#t-skip');
    if (sk) sk.onclick = () => { if (g.defer()) { sfx('deny'); dlg.close(); } };
    const jl = dlg.querySelector('#t-jail');
    if (jl) jl.onclick = () => { if (g.jail(s.id)) { sfx('stamp'); dlg.close(); } };

    const go = dlg.querySelector('#t-go');
    if (go) go.onclick = () => {
      const st = pick.st, cr = pick.cr, inten = pick.inten;
      const reason = g.assignBlock(s.id, st, cr);
      if (reason) { trialError = blockText(reason); paint(); return; }
      if (g.needBattle(s)) {                     // เปิดฉากใหม่ทับกล่องเดิมผ่าน openDlg รุ่นเดียว ลด race จาก close event
        if (!g.startBattle(s)) { trialError = t('trial.failed'); paint(); return; }
        openBattle(res => { if (res === 'win' && !doVerdict(s, st, cr, inten)) openTrial(blockText(g.assignBlock(s.id, st, cr)) || t('trial.failed')); else refresh(); });
        return;
      }
      if (doVerdict(s, st, cr, inten)) dlg.close();
      else { trialError = blockText(g.assignBlock(s.id, st, cr)) || t('trial.failed'); paint(); }
    };
  };

  paint();
  openDlg('hudwrap');
  // ข้อ A คุณเป้ 24 ก.ย. 2569 — ตวาดข่มขู่โชว์เวลานับถอยหลังบนปุ่ม ต้องรีเฟรชเองเป็นระยะ
  // (paint() ปกติวาดใหม่แค่ตอนมีการกดปุ่ม ไม่ใช่ทุกวินาที) — อัปเดตแค่ปุ่มเดียวตรง ๆ ไม่เรียก paint() เต็ม
  // ทุกวินาที เพราะจะรื้อ DOM ทั้งกล่องทิ้งโดยไม่จำเป็น (เจอปัญหาอิลิเมนต์อื่นเด้งหาย/โฟกัสหลุดตอนทดสอบจริง)
  // เคลียร์ทิ้งตอนปิดกล่อง ไม่งั้น interval ค้างวิ่งทั้งเกม
  const roarTick = setInterval(() => {
    if (!dlg.open || !dlg.querySelector('.trial-hud')) { clearInterval(roarTick); return; }
    const b = dlg.querySelector('[data-pw="roar"]');
    if (!b) return;
    const why = g.roarWhy(s);
    if (why) { b.disabled = true; b.title = why; const badge = b.querySelector('i'); if (badge) badge.textContent = why; return; }
    const ok = g.powerReady('roar');
    if (ok && !b.disabled) return;               // พร้อมอยู่แล้ว ไม่ต้องอัปเดตซ้ำทุกวิ
    if (ok) { b.disabled = false; }               // เพิ่งครบเวลา — ปลดล็อกปุ่ม (ผู้เล่นกดได้ทันทีไม่ต้องรอ action อื่น)
    const badge = b.querySelector('i');
    if (badge) badge.textContent = ok ? '✓' : fmtCountdown(g.powerOf('roar').readyAt);
    b.title = ok ? 'ตวาดข่มขู่ — พร้อมใช้ — ไม่ต้องใช้ item' : `ตวาดข่มขู่ — รออีก ${fmtCountdown(g.powerOf('roar').readyAt)}`;
  }, 1000);
  onDlgClose(() => { clearInterval(roarTick); bgm('bgm-zone'); refresh(); });
}

/** ออกหมายจริง — ใช้ร่วมกันระหว่างแถบบัญชาการกับห้องสอบสวน */
function doVerdict(soul, stK, crK, inten) {
  const heaven = !!STATIONS.find(d => d.k === stK)?.heaven;
  if (!g.assign(soul.id, stK, crK, heaven ? 1 : inten)) return false;
  sfx(heaven ? 'heaven' : 'stamp');
  pick = { st: null, cr: null, inten: null };
  if (g.pendingVerdict) showVerdict(g.pendingVerdict);
  refresh();
  return true;
}

// ---------- ศูนย์จัดทีม / ร้านค้า / ผู้ตรวจการ ----------
function openNiraOffice() {
  if (g.niraRest) {
    const site = STATIONS.find(d => d.k === (g.stations.some(st => st.def.k === 'tea' && !st.build) ? 'tea' : 'sala'));
    const near = Math.hypot(g.player.x - site.x, g.player.y - site.y) <= 150;
    modal(`<h2>🍵 เยี่ยมนิราที่ศาลาน้ำชา</h2><img src="img/story-asia-05-v2.png" alt="นิราพักฟื้น" style="width:100%;border-radius:12px">
      <p>นิรากำลังพักฟื้น อีก ${g.niraRest.remaining} วาระจะกลับมาช่วยงาน</p>
      <div class="row"><button id="visit-nira" class="gold" ${g.niraRest.visited ? 'disabled' : ''}>${g.niraRest.visited ? 'เยี่ยมแล้ว · ให้นิราพักต่อ' : near ? 'แวะเยี่ยมและส่งกำลังใจ' : 'เดินไปเยี่ยมที่ศาลาน้ำชา'}</button><button data-close>ให้นิราพักก่อน</button></div>`,
      d => d.querySelector('#visit-nira').onclick = () => { if (!near) { d.close(); g.walkTo(site.x, site.y); } else if (g.visitNira()) { d.close(); refresh(); } });
    return;
  }
  pauseForDlg();
  const paint = () => {
    const final = g.finalTeamSelection(), max = final ? g.teamLimits.finalTeamMax : g.teamLimits.normalTeamMax;
    const party = (final ? g.party?.finalMembers : g.party?.members) || [];
    const candidates = final ? g.finalTeamCandidates() : CREW.filter(c => !c.reader);
    dlg.innerHTML = `<h2>📋 โต๊ะนิรา — บุคลากรและทีมต่อสู้</h2>
      <p class="hint">เลือกยมทูตเข้าทีม${final ? 'ศึกสุดท้ายข้ามโซน' : 'ต่อสู้'}ได้ ${max} คน เมื่อเข้าสนามรบจะมาช่วยยมบาทน้อย ระหว่างอยู่บนแผนที่ยังทำงานประจำต่อ ไม่ต้องเดินตาม</p>
      <div class="row"><button data-gift-nira ${g.inventory.food > 0 ? '' : 'disabled'}>🍙 ส่งข้าวปั้นให้นิราแจกทีม · มี ${g.inventory.food || 0}</button></div>
      <div class="market-grid">${candidates.map(def => {
        const c = final ? def : g.crew.find(x => x.k === def.k), key = c && (final ? c.id : c.k), on = c && party.includes(key);
        const why = final ? g.finalTeamWhy(c) : '';
        return `<article class="shop-card"><img src="${crewArt(c || def, '-profile')}" alt="">
          <span><b>${esc(c?.name || crewName(def, g.zone))}</b><small>${esc(def.duty)}</small>${final ? `<small>${esc(ZONES.find(z => z.k === c.homeZone)?.name || c.homeZone)} · กำลังใจ ${Math.round(c.morale)}</small><small>${esc(why)}</small>` : ''}
          ${c ? `<small>แรง ${c.raeng} · ระเบียบ ${c.rabiab}</small><small>ท่าสู้: ${crewAbility(c.k)} · คูลดาวน์ ${BATTLE.crewCd} วินาที</small>` : `<small>ค่าจ้าง ${def.hire} เบี้ยกรรม · ท่าสู้: ${crewAbility(def.k)}</small>`}
          ${c ? hungerWidget(c) : ''}</span>
          ${c ? `<button data-party="${key}" class="sm" title="${esc(why)}" ${!on && (party.length >= max || why) ? 'disabled' : ''}>${on ? '✓ อยู่ในทีมสู้' : 'เข้าทีมสู้'}</button>`
              : `<button data-hire="${def.k}" class="sm gold" ${g.coin < def.hire ? 'disabled' : ''}>จ้าง</button>`}
        </article>`;
      }).join('')}
      <!-- ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — การ์ดยักษ์ทวารบาลในหน้าต่างเดียวกับยมทูต แทนย่อหน้ายาว
           ด้านล่างเดิม (ยักษ์ไม่ต้องจัดเข้าทีม 2 คน แต่ยังอยากเห็นแรง/ท่าสู้/คูลดาวน์/สถานะแบบเดียวกัน) -->
      <article class="shop-card">
        <img src="${artUrl('crew-guard-profile') || artUrl('crew-guard')}" alt="">
        <span><b>${esc(GUARD.name)}</b><small>ยามประจำโซน — ไม่ต้องจัดเข้าทีม</small>
        <small>ท่าสู้: ${crewAbility('guard')} · คูลดาวน์ ${GUARD.battleCd} วินาที</small></span>
        ${g.guard
          ? `<button class="sm" disabled title="เข้าช่วยรบทุกฉากต่อสู้ให้เองอัตโนมัติ ไม่กินโควตาทีม ${max} คนของยมทูต">✓ อยู่ในทีมเสมอ<small>(ไม่นับโควตา ${max} คน)</small></button>`
          : `<button data-hire-guard class="sm gold" ${g.coin < GUARD.hire ? 'disabled' : ''} title="จ้างแล้วช่วยรบทุกฉากต่อสู้ให้เองอัตโนมัติ ไม่ต้องจัดเข้าทีม">จ้าง ${GUARD.hire}</button>`}
      </article></div>
      <div class="row"><button class="gold" data-close>เสร็จแล้ว</button></div>`;
    dlg.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { if (g.hire(b.dataset.hire)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-party]').forEach(b => b.onclick = () => { if (g.toggleParty(b.dataset.party)) { sfx('crack'); paint(); refresh(); } });
    dlg.querySelector('[data-gift-nira]')?.addEventListener('click', () => { if (g.giveOnigiriNira()) { sfx('coin'); paint(); refresh(); } });
    bindHungerWidgets(dlg, () => { paint(); refresh(); });
    const hireGuardBtn = dlg.querySelector('[data-hire-guard]');
    if (hireGuardBtn) hireGuardBtn.onclick = () => { if (g.hireGuard()) { sfx('coin'); paint(); refresh(); } };
  };
  paint(); openDlg('nira-office');
}

function openMerchant() {
  if (!g.zoneCaptivesFree()) return;
  pauseForDlg();
  const paint = () => {
    const mats = Object.entries(g.inventory || {}).filter(([k,n]) => n > 0 && ITEMS[k]?.material);
    dlg.innerHTML = `<div class="merchant-heading"><img src="img/merchant-profile.jpeg" alt="พ่อค้าควันทอง"><div><h2>🧳 ${esc(MERCHANT.name)}</h2><p class="hint">${esc(MERCHANT.line)} · มี ${Math.round(g.coin)} เบี้ยกรรม</p></div></div>
      <h3>ขายของจากชายแดน</h3><div class="market-grid">${mats.length ? mats.map(([k,n]) => {
        const d = ITEMS[k]; return `<article class="shop-card">${itemImg(k, 'class="shop-item-img"')}<span><b>${esc(d.name)} ×${n}</b><small>${d.sell} เบี้ยกรรมต่อชิ้น</small></span>
          <button data-sell="${k}">ขาย 1</button><button data-sell-all="${k}" class="gold">ขายทั้งหมด</button></article>`;
      }).join('') : '<div class="hint">ยังไม่มีของสนามรบในกระเป๋า</div>'}</div>
      <h3>สินค้า</h3><div class="market-grid">${MERCHANT.stock.map(s => {
        const d = ITEMS[s.k], lock = g.level < s.lv;
        return `<article class="shop-card">${itemImg(s.k, 'class="shop-item-img"')}<span><b>${esc(itemName(s.k))}${s.qty ? ` ×${s.qty}` : ''}</b><small>${lock ? `ปลดล็อกที่ขั้น ${LEVELS[s.lv - 1].name}` : `${s.cost} เบี้ยกรรม`}${d.mp && !d.hp ? ` · ${esc(t('item.mpGain'))} ${d.mp}` : ''}</small></span>
          <button data-buy="${s.k}" class="gold" ${lock || g.coin < s.cost ? 'disabled' : ''}>ซื้อ</button></article>`;
      }).join('')}</div>
      ${g.zone !== 'th' && !g.outfitsOwned?.includes(g.zone) ? `<h3>ชุดประจำโซน</h3><div class="market-grid"><article class="shop-card"><span class="shop-glyph">👘</span><span><b>ชุด${esc(g.zoneDef().name.replace(/^โซน/, ''))}</b><small>180 เบี้ยกรรม · ซื้อได้ที่โซนนี้</small></span><button data-buy-outfit class="gold" ${g.coin < 180 ? 'disabled' : ''}>ซื้อ</button></article></div>` : ''}
      <div class="row"><button class="gold" data-close>กลับแผนที่</button></div>`;
    dlg.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { if (g.sellMaterial(b.dataset.sell)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-sell-all]').forEach(b => b.onclick = () => { if (g.sellMaterial(b.dataset.sellAll, true)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (g.buyMerchant(b.dataset.buy)) { sfx('coin'); paint(); refresh(); } });
    const outfitBuy = dlg.querySelector('[data-buy-outfit]');
    if (outfitBuy) outfitBuy.onclick = () => { if (g.buyZoneOutfit()) { sfx('coin'); paint(); refresh(); } };
  };
  paint(); openDlg('merchant');
}

function openBossPier() {
  const z = g.zoneDef();
  pauseForDlg();
  modal(`<h2>👑 ${esc(z.bossName)}</h2><p class="hint">${esc(z.bossWin?.[1] || 'เขายืนดูแลท่าเรืออยู่')}</p>
    <div class="row"><button data-rematch>⚔️ ประลองใหม่</button><button data-zone-menu>🗺️ เปลี่ยนโซน</button><button class="gold" data-close>ไว้คราวหน้า</button></div>`, d => {
      d.querySelector('[data-rematch]').onclick = () => { if (g.startZoneBoss('rematch')) { dlg.close(); openBattle(); } };
      d.querySelector('[data-zone-menu]').onclick = () => { dlg.close(); openZone(); };
    });
}

// ---------- ด่านชายแดนนรก ----------
function openFrontier(fromWalk = false, breachArg = null) {
  // ชุด 29C ข้อ 9 — มี event ปีศาจบุกรออยู่ (รับทราบแล้ว) → หน้าต่างนี้คือหน้าเตรียมทีมของ event นั้น · ไม่มี = หน้าเตรียมทีมชายแดนปกติ
  const breachKey = fromWalk ? null : (typeof breachArg === 'string' ? breachArg : g.breachMarch()?.key || null);
  const bev = breachKey ? (ZONE_EVENTS[g.zone] || []).find(e => e.k === breachKey) : null;
  const breach = !!bev, thBreach = breachKey === 'frontierBreach';
  const waveN = bev?.waves?.length || 2;
  const breachTitle = thBreach ? t('event.frontierBreach.title') : zoneEventText(bev?.title);
  const breachText = thBreach ? t('event.frontierBreach.alert') : zoneEventText(bev?.alert);
  const breachLoot = thBreach ? t('event.frontierBreach.win') : `รางวัล: ${bev?.reward?.coin || 0} เบี้ยกรรม + ของสนามรบ`;
  pauseForDlg();
  const helpers = g.crewHelpers();
  const state = g.frontierOf();
  state.team = (state.team || []).filter(k => helpers.some(c => c.k === k));
  if (!state.team.length && helpers[0]) state.team = [helpers[0].k];
  g.save();

  const paint = () => {
    const chosen = state.team || [];
    const wave = (state.clears || 0) + 1;
    // ข้อ K คุณเป้เจอ 25 ก.ย. 2569 — ภาพชายแดนตามโซน (BG-Frontier-<zone>) พร้อมใช้แล้ว
    // zone1 ยังใช้ FRONTIER.bg ('img/BG-frontier.jpeg' ตัวเล็ก) เดิมเป๊ะ ไม่แตะ
    const frontierBg = g.zone === 'th' ? FRONTIER.bg : (artUrl('BG-Frontier', 'jpeg') || FRONTIER.bg);
    dlg.innerHTML = `<div class="frontier-screen" style="background-image:url('${frontierBg}')">
      <div class="frontier-shade"></div>
      <button class="x" ${fromWalk ? 'data-frontier-back title="กลับชายแดน"' : 'data-close title="กลับแผนที่"'}>✕</button>
      <header><small>${breach ? `ระลอก 1/${waveN}` : 'กิจกรรมต่อสู้ประจำโซน'}</small><h2>🏯 ${breach ? esc(breachTitle) : esc(FRONTIER.name)}</h2>
        <p>${breach ? esc(breachText) : `ผีและปีศาจกำลังรวมตัวหลังประตู จัดทีมยมทูตไม่เกิน ${FRONTIER.teamMax} คน แล้วต้านพวกมันเป็นระลอก`}</p></header>
      <div class="frontier-party">
        <div class="frontier-hero"><img src="${heroFace()}" alt=""><b>${esc(HERO_NAME)}</b></div>
        ${chosen.map(k => {
          const c = helpers.find(x => x.k === k); if (!c) return '';
          return `<div class="frontier-hero mate"><img src="${artUrl('crew-' + c.k)}" alt=""><b>${esc(c.name)}</b></div>`;
        }).join('')}
      </div>
      <section class="frontier-panel">
        <div class="frontier-head"><span><b>${breach ? `ระลอก 1/${waveN}` : `ระลอกที่ ${wave}`}</b><small>${breach ? esc(g.zoneDef().name) : `${esc(g.zoneDef().name)} · ผ่านแล้ว ${state.clears || 0} ระลอก`}</small></span>
          <span class="frontier-loot">${breach ? esc(breachLoot) : 'รางวัล: เบี้ยกรรม + ของสนามรบ'}</span></div>
        <div class="frontier-team"><h3>จัดทีมยมทูต <small>${chosen.length}/${FRONTIER.teamMax}</small></h3>
          <div class="frontier-cards">${helpers.length ? helpers.map(c => {
            const on = chosen.includes(c.k), full = !on && chosen.length >= FRONTIER.teamMax;
            return `<button data-frontier-crew="${c.k}" class="frontier-card${on ? ' selected' : ''}" ${full ? 'disabled' : ''}>
              <img src="${artUrl('crew-' + c.k + '-profile') || artUrl('crew-' + c.k)}" alt="">
              <span><b>${esc(c.name)}</b><small>แรง ${c.raeng} · กำลังใจ ${Math.round(c.morale)}</small></span>
              <i>${on ? '✓ เข้าทีม' : 'เลือก'}</i></button>`;
          }).join('') : '<div class="hint">ยังไม่มียมทูตสายต่อสู้ — จ้างได้ที่นิรา</div>'}</div>
        </div>
        <div class="frontier-actions"><button ${fromWalk ? 'data-frontier-back' : 'data-close'}>${fromWalk ? 'กลับชายแดน' : 'กลับแผนที่'}</button>
          <button class="gold" data-frontier-start ${chosen.length || fromWalk || (breach && !thBreach) ? '' : 'disabled'}>${breach ? esc(t('event.frontierBreach.start')) : fromWalk ? 'กลับไปป้องกันชายแดน' : '⚔️ เริ่มป้องกันชายแดน'}</button></div>
      </section>
    </div>`;
    dlg.querySelectorAll('[data-frontier-crew]').forEach(b => b.onclick = () => {
      if (g.setFrontierTeam(b.dataset.frontierCrew)) { sfx('crack'); paint(); }
    });
    dlg.querySelectorAll('[data-frontier-back]').forEach(b => b.onclick = () => {
      dlg.close(); openFrontierWalk();
    });
    const start = dlg.querySelector('[data-frontier-start]');
    // ข้อ A ชุด 14 คุณเป้ 26 ก.ย. 2569 — เดิมกดปุ่มนี้แล้วตัดเข้าฉากสู้ทันที (สุ่มศัตรู)
    // ตอนนี้เข้า "แผนที่ชายแดน" ก่อน ให้เดินเลือกเองว่าจะสู้กับตัวไหน (src/frontier.js)
    if (start) start.onclick = () => {
      if (thBreach) {
        if (g.startFrontierBreach()) { breachTried = true; openBattle(afterBreachBattle); }
        return;
      }
      if (breach) {                               // ระลอกชายแดนของโซน 2–4 — ศึกเดียวกับที่เคยเริ่มจากหน้าต่างแจ้งเตือน
        if (g.startZoneEvent(breachKey)) { zoneEventTried.add(`${g.zone}:${breachKey}`); openBattle(afterBreachBattle); }
        return;
      }
      dlg.close();
      openFrontierWalk();
    };
  };
  paint();
  openDlg('frontier');
}

/** แผนที่ชายแดน — เดินสำรวจ + เลือกศัตรูเข้าสู้เอง (ข้อ A ชุด 14)
 *  ทีมที่จัดไว้จาก openFrontier() ใช้ต่อเนื่องทั้งเซสชัน ไม่ต้องกลับไปจัดใหม่ทุกครั้งที่ชนะ/แพ้หนึ่งตัว
 *  ชนะ/แพ้แต่ละครั้ง → กลับมาหน้านี้ต่อ (ไม่ใช่แผนที่โซน) จนกว่าจะกด "กลับแผนที่โซน" เอง */
function openFrontierWalk() {
  pauseForDlg();
  let myGen = -1;
  const mine = () => myGen < 0 || (dlg.open && dlgGen === myGen);
  const state = g.frontierOf();
  const wave = (state.clears || 0) + 1;
  const kinds = g.zoneDef().mobs || [];
  const frontierBg = g.zone === 'th' ? FRONTIER.bg : (artUrl('BG-Frontier', 'jpeg') || FRONTIER.bg);
  const chosen = state.team || [];
  const zoneName = g.zoneDef().name;
  const gateName = zoneName.startsWith('โซน') ? zoneName : `โซน${zoneName}`;

  dlg.innerHTML = `
    <div class="frw-fullscreen">
      <div class="frw-map"><canvas id="frw-cv" width="1376" height="768"></canvas>
        <button class="frw-fab" id="frw-fab" type="button" hidden>⚔️ เริ่มต่อสู้</button>
        <button class="frw-fab frw-gate" id="frw-gate" type="button" hidden>กลับเข้า${esc(gateName)}</button>
        <button class="frw-fab" id="frw-nira" type="button" hidden>📋 คุยกับนิรา</button></div>
      <div class="frw-res" aria-label="ทรัพยากร">
        ${[['img/ui/icon-coin.png',Math.round(g.coin),'เบี้ยกรรม'],['img/item-food.png',Math.round(g.food),'เสบียง'],['img/ui/icon-justice.png',Math.round(g.order),'ระเบียบ'],['img/ui/icon-skull.png',g.karma.toFixed(1),'กรรม']].map(([src,value,name])=>`<span title="${name}"><img src="${src}" alt="${name}"><b>${value}</b></span>`).join('')}
      </div>
      <div class="frw-controls">
        <button id="frw-pause" class="st-icon-btn" aria-label="${esc(t('hud.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>
        <button id="frw-settings" class="st-icon-btn" aria-label="${esc(t('pause.settings'))}"><img src="img/ui/icon-setting2.png" alt=""></button>
      </div>
      <div class="frw-bottom">
        <div class="frw-avatar"><div><img src="${artUrl('hero-yama-profile') || heroFace()}" alt="${esc(HERO_NAME)}"><span>${[1,2,3].map(l=>`<i class="${g.level>=l?'on':''}">★</i>`).join('')}</span></div>
          <span class="hud-hpbar"><i style="width:${Math.max(0,Math.min(100,g.hp/g.hpMax*100))}%"></i></span><b>YAMA</b></div>
        <button id="frw-book" class="st-hud-item" aria-label="${esc(t('room.hud.book'))}"><img src="img/ui/icon-book.png" alt=""><span>GUIDE<br>BOOK</span></button>
        <button id="frw-bag" class="st-hud-item" aria-label="${esc(t('hud.bag'))}"><img src="img/ui/icon-bag.png" alt=""><span>BAG</span></button>
      </div>
      <small class="frw-status">ระลอก ${wave} · ศัตรู <b id="frw-count">0</b>/${maxOnScreen(wave)}</small>
    </div>`;
  openDlg('frontier-map-dialog');
  myGen = dlgGen;
  const fab = dlg.querySelector('#frw-fab');
  const gate = dlg.querySelector('#frw-gate');
  const nira = dlg.querySelector('#frw-nira');
  const cv2 = dlg.querySelector('#frw-cv');

  const FW = makeFrontierWalk(cv2, g, { bg: frontierBg, kinds, wave, alive: mine, fab, gate, nira });
  FW.start();
  const menu = fn => {
    const zone=g.zone;
    FW.destroy();
    fn();
    const back = () => {
      if(dlg.open) return; // Ignore the asynchronous close from replacing the map.
      dlg.removeEventListener('close',back);
      if(started && !g.over && !g.battle && g.zone===zone) openFrontierWalk();
    };
    dlg.addEventListener('close',back);
  };
  dlg.querySelector('#frw-pause').onclick = () => menu(() => openPause(true));
  dlg.querySelector('#frw-settings').onclick = () => menu(openSettings);
  dlg.querySelector('#frw-book').onclick = () => menu(openHelp);
  dlg.querySelector('#frw-bag').onclick = () => menu(openBag);


  fab.onclick = () => {
    const id = FW.nearId();
    const en = id != null && FW.getEnemy(id);
    if (!en) return;
    if (!g.startFrontierBattle({ kindIdx: en.kindIdx, id: en.id, level: en.level })) return;
    FW.destroy();
    dlg.close();
    openBattle((_, done) => {
      if (done?.kind === 'frontier' && done.over === 'win' && done.frontierMobId != null) {
        removeSessionEnemy(g.zone, done.frontierMobId);
      }
      openFrontierWalk();
    });
  };

  // กด "กลับแผนที่โซน" แค่ปิดกล่อง ไม่ล้างสนามรบ — เดินออกไปทำธุระอื่น (ป้อนข้าวปั้น/ซื้อของ)
  // แล้วกลับมาสู้ต่อได้โดยไม่ต้องเริ่มใหม่ ตัวที่ปราบไปแล้วก็ไม่ฟื้นคืนชีพ (ข้อ 8 ในใบงานอนุญาตแค่
  // "ออกจากเกมกลางชายแดนแล้วกลับมา = เริ่มใหม่ได้" เป็นข้อยกเว้นตอนโหลดหน้าใหม่ ไม่ใช่ทุกครั้งที่กดปุ่มนี้)
  gate.onclick = () => {
    FW.destroy();
    dlg.close();
  };
  nira.onclick = () => {
    FW.destroy();
    dlg.close();
    openFrontier(true);
  };

  const cm = setInterval(() => {
    if (!mine()) { clearInterval(cm); return; }
    const el = dlg.querySelector('#frw-count');
    if (el) el.textContent = String(FW.enemyCount());
  }, 500);
}

/** 28A — ชนะศึกปีศาจฝ่าชายแดน (frontierBreach / zoneEvent ทีมชายแดน): ยมบาทอยู่ที่ "แผนที่ชายแดน" ต่อ
 *  ไม่กลับลานศาล · รอให้กล่องเนื้อเรื่อง/รางวัล/เลื่อนขั้นที่เด้งหลังศึกปิดก่อน แล้วค่อยเปิดแผนที่ชายแดน
 *  (เปิดทับทันทีจะดันกล่องพวกนั้นไปค้างจนกว่าจะออกจากชายแดน) · แพ้ → ไม่ทำอะไร กลับแผนที่โซนตามเดิม */
function afterBreachBattle(_, done) {
  if (!returnsToFrontier(done)) return;
  const zone = g.zone;
  const go = () => {
    if (g.over || g.battle || g.zone !== zone) return;
    if (dlg.open || storyPlaying || g.storyQueue.length || g.pendingLevel || g.pendingZone) { setTimeout(go, 400); return; }
    openFrontierWalk();
  };
  setTimeout(go, 0);
}

// ---------- ฉากต่อสู้ ----------
// ใช้ทั้งกับวิญญาณที่ขัดขืน และกับพญายมตอนบารมีหมด (ฉากหลังไม่มีทางชนะ ตั้งใจให้แพ้)
function openBattle(after) {
  const B = g.battle;
  if (!B) return;
  pauseForDlg();     // ฉากต่อสู้ก็คือกล่องใบหนึ่ง — คืนค่าพักตอนปิดเหมือนกล่องอื่นทุกใบ
  // เพลง bgm-yama ไม่เคยมีไฟล์จริงเลย (audio/ มีแค่ bgm-title, bgm-zone) — ยิง HEAD 404 สามนามสกุล
  // ทุกครั้งที่สู้บอส/พ่อ ไม่มีประโยชน์ ใช้ bgm-battle ทุกฉากต่อสู้เหมือนกันหมด (คุณเป้สั่ง 17 ก.ย. 2569)
  // ระบบ FALLBACK ใน sfx.js จะถอยไปเล่น bgm-zone เองอัตโนมัติถ้ายังไม่มีไฟล์ bgm-battle จริง
  bgm('bgm-battle');
  sfx('gong');
  // phase = null (นิ่ง) · 'you' (ตาเรา) · 'foe' (ตาเขา) — ระหว่างเล่นจังหวะ ปุ่มถูกล็อก
  // phaseAt = เวลาที่เริ่มจังหวะ ใช้กู้เมื่อจังหวะค้าง (ดู phaseGuard ท้ายฟังก์ชัน)
  let phase = null, fxNow = null, phaseTimer = 0, phaseAt = 0, storyActive = false;
  // เอฟเฟกต์เติมบารมีของบุญ — เก็บเวลาไว้ให้วาดซ้ำได้ถ้าฉากถูกวาดใหม่กลางทาง (innerHTML ถูกแทนที่ทุก paint)
  let healFx = null, healTimer = 0;
  const applyHealFx = () => {
    const h = healFx, fig = dlg.querySelector('.fig.you');
    if (!h || !fig) return;
    const el = Date.now() - h.start;
    if (el < 0 || el >= h.ms) { if (el >= h.ms) healFx = null; return; }
    fig.classList.add('healing');
    fig.style.setProperty('--heal-delay', `${-el}ms`);
    if (!fig.querySelector('.heal-num')) fig.insertAdjacentHTML('beforeend', `<span class="heal-num" style="animation-delay:${-el}ms">+${h.amount}</span>`);
  };
  const scheduleHealFx = () => {
    clearTimeout(healTimer);
    healTimer = setTimeout(() => {
      applyHealFx();
      healTimer = setTimeout(() => {          // ครบเวลา — เก็บ class/ตัวเลขออก (กรณีไม่มีการวาดใหม่มาเก็บให้)
        healFx = null;
        const fig = dlg.querySelector('.fig.you');
        fig?.classList.remove('healing'); fig?.querySelector('.heal-num')?.remove();
      }, healFx ? healFx.ms : 0);
    }, Math.max(0, healFx.start - Date.now()));
  };
  let prepHidden = false;   // ชุด 30B — ผู้เล่นพับหน้าต่างเตรียมศึกเพื่อดูฉากต่อสู้ (เปิดกลับได้ก่อนกดเข้าสู้)

  const paint = () => {
    const b = g.battle;
    if (!b || storyActive) return;
    if (b.storyInterlude) {
      const key = b.storyInterlude; b.storyInterlude = null;
      storyActive = true;
      const overlay = document.createElement('div');
      overlay.className = 'story-battle-overlay'; dlg.replaceChildren(overlay);
      renderStoryComic(overlay, STORY[key], () => {
        overlay.remove(); storyActive = false; phase = null; fxNow = null; paint();
      });
      return;
    }
    // ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — สะกดจิต (กานต์): ตา "เขา" ที่ถูกสะกด ฟาดเข้าตัวเอง
    // ไม่ใช่พุ่งเข้าใส่ยมบาทน้อย ต้อง flash ที่ตัวศัตรูเอง ไม่ใช่ที่ยมบาทน้อย (ดู B.dmg.confuseSelf ใน game.js)
    const confuseHit = !!(b.dmg && b.dmg.confuseSelf > 0);
    // ระหว่างจังหวะ "ตาเรา" ให้โชว์ภาพนิ่งตอนที่เขายังไม่สวน เลือดฝั่งเราจึงยังไม่ลด
    const view = phase === 'you' && b.mid
        ? { ...b, foes:b.mid.foes, selectedFoeId:b.mid.selectedFoeId,
            youHp: b.mid.youHp, talk: b.mid.talk,
            dmg: { foe: b.dmg ? b.dmg.foe : 0, you: 0, foeId: b.dmg?.foeId, foeHits:b.dmg?.foeHits } }
      : phase === 'foe'
        // foeId/counterFoeId/confuseSelf ต้องส่งต่อให้ arena() ใช้เลือกว่าศัตรูตัวไหนโดนตี/พุ่งเข้าใส่ (ฉากหลายศัตรู)
        ? { ...b, dmg: confuseHit ? { foe: b.dmg.confuseSelf, you: 0, confuseSelf: b.dmg.confuseSelf, counterFoeId: b.dmg.counterFoeId, confuseHits:b.dmg.confuseHits }
                                  : { foe: 0, you: b.dmg ? b.dmg.you : 0, counterFoeId: b.dmg?.counterFoeId } }
        : { ...b, dmg: { foe: 0, you: 0 } };
    // พลังบ้าคลั่งไม่ใช่การโจมตี — ยมบาทน้อยไม่พุ่ง ศัตรูไม่สะดุ้ง (ดู arena(): raging)
    const act = phase === 'you' && fxNow?.key === 'rage' ? null
              : phase === 'you' ? { lunge: 'you', struck: 'foe' }
              : phase === 'foe' ? (confuseHit ? { struck: 'foe' } : { lunge: 'foe', struck: 'you' }) : null;
    const mp = g.mp;
    const battleHelpers = g.battleCrew();
    // ข้อ C คุณเป้ 25 ก.ย. 2569 — ยักษ์ทวารบาลเข้าร่วมทุกฉากต่อสู้ให้เองถ้าจ้างไว้แล้ว ไม่กินโควตา
    // ทีมยมทูต 2 คน ต่อท้ายแถว squad เสมอ (การ์ดคูลดาวน์ใช้ระบบเดียวกับยมทูตใน arena() ด้านล่าง
    // แค่แยกแหล่งเวลา/ระยะคูลดาวน์เป็น GUARD.battleCd ผ่าน c.k==='guard')
    const squadMembers = g.guard ? [...battleHelpers, { k: 'guard', name: GUARD.name }] : battleHelpers;
    // แก้รอบ 1 ข้อ C ชุด 13 คุณเป้ 26 ก.ย. 2569 — 3 ปุ่มตามใบงานเป๊ะ: พ่อค้านรก/นิรา/กินหีบยา
    // กดได้ทุกปุ่ม ลำดับไหนก็ได้ หลายครั้งก็ได้ (ไม่ใช่ครั้งเดียวเหมือนของเดิม) เปิดหน้าต่างเดิมที่มีอยู่แล้ว
    // (openMerchant/openNiraOffice ใช้ <dialog> ใบเดียวกับฉากต่อสู้ — ปิดแล้วตัวเฝ้า battleUI ที่ท้ายไฟล์
    // เปิดฉากเตรียมศึกกลับให้เองอัตโนมัติภายใน 400ms ไม่ต้องเขียน callback พิเศษ ดูคอมเมนต์ตรง
    // setInterval บนสุดของไฟล์ "ถึงปิดไป ตัวเฝ้าก็เปิดกลับให้อยู่ดีถ้าฉากยังไม่จบ")
    const medN = g.inventory.health || 0;
    const medFull = b.youHp >= b.youMax;
    const canMed = medN > 0 && !medFull;
    const waterN = g.inventory.holyWater || 0;           // ชุด 28B — น้ำมนต์เติม MP ที่จุดพัก/เตรียมศึก
    const waterFull = g.mp >= g.mpMax;
    const canWater = waterN > 0 && !waterFull;
    const rest = g.zoneEventRestReady() && !phase;
    // ชุด 30B ข้อ 1 — เตรียมศึก (บอสโซน 2–4 · พักก่อนระลอก 4/8 โซน 4) ใช้หน้าตาเดียวกับหน้าต่างแจ้งเตือนอีเวนต์:
    // กล่องบน = หัวข้อ + คำอธิบาย + ภาพศัตรู + ปุ่ม "เข้าสู้" · กล่องล่าง = 3 ช่อง พ่อค้า / นิรา / กล่องยา
    // วางเป็นชั้นทับในกล่องต่อสู้ — กด ✕ แล้วเห็นฉากต่อสู้ข้างหลังเต็ม และกด "เตรียมศึก" เปิดกลับได้ก่อนเข้าสู้
    const prepOn = rest || b.kind === 'zoneBoss' && !b.prepStarted && !b.over;
    const goLabel = rest ? b.pendingWave === 4 ? 'เข้าสู้หัวหน้าทั้ง 4 โซน' : 'เข้าสู้บอสใหญ่' : t('event.prep.fight');
    const prepFoeArt = () => {
      if (!rest) return storyFoeArt(b.sp);
      const ev = ZONE_EVENTS[b.zone]?.find(e => e.k === b.eventKey);
      return storyFoeArt(ev?.waves?.[b.pendingWave - 1]?.[0]?.sp || b.sp);
    };
    const prepLayer = prepOn ? `<div class="prep-layer" data-prep-layer ${prepHidden ? 'hidden' : ''}><div class="prep-layer-card">
      ${eventAlertMainHtml(rest ? zoneEventText(ZONE_EVENTS[b.zone]?.find(e => e.k === b.eventKey)?.title) : t('battle.prep.title'),
        rest ? (b.pendingWave === 4 ? t('battle.prep.rest4') : t('battle.prep.rest8')) : t('battle.prep.sub'),
        prepFoeArt(), `<button class="gold event-alert-go" data-prep-go>⚔️ ${esc(goLabel)}</button>`,
        { note: b.proofBonus ? `<div class="prep-note good">✓ ${esc(t('battle.prep.proof'))} ${b.proofBonus}</div>` : '',
          extraTop: `<div class="prep-top-actions"><button data-prep-pause aria-label="${esc(t('battle.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>
            <button data-prep-hide aria-label="${esc(t('common.close'))}">✕</button></div>` })}
      <div class="event-alert-prep"><p>${esc(t('event.prep.title'))}</p><div class="event-alert-cards">
        ${prepCardHtml('merchant', t('event.prep.merchant'), g.zoneCaptivesFree() ? t('event.prep.merchantLine') : t('event.prep.merchantLocked'), 'img/merchant-profile.jpeg', !g.zoneCaptivesFree())}
        ${prepCardHtml('nira', t('event.prep.nira'), t('event.prep.niraLine'), artUrl('crew-nira-profile'))}
        <div class="event-prep-card prep-box"><img src="${esc(artUrl(ITEMS.health.img))}" alt="">
          <span class="event-prep-speech">${esc(medN || waterN ? t('event.prep.medicineLine') : t('event.prep.none'))}</span>
          <b>${esc(t('event.prep.medicine'))}</b>
          <span class="prep-chips">
            <button data-prep-med ${canMed ? '' : 'disabled'}
              title="${esc(medN < 1 ? t('prep.med.none') : medFull ? t('bag.hpFull') : `${t('prep.med.gain')} ${ITEMS.health.hp} · ×${medN}`)}">
              ${itemImg('health', 'class="prep-ico"')} ${esc(t('prep.med'))} ×${medN}</button>
            <button data-prep-water ${canWater ? '' : 'disabled'}
              title="${esc(waterN < 1 ? t('prep.water.none') : waterFull ? t('bag.mpFull') : `${t('item.mpGain')} ${ITEMS.holyWater.mp} · ×${waterN}`)}">
              ${itemImg('holyWater', 'class="prep-ico"')} ${esc(t('prep.water'))} ×${waterN}</button></span></div>
      </div></div></div></div>` : '';
    const prep = prepHidden && prepOn ? `<div class="boss-prep-actions"><button data-prep-show>${esc(t('battle.prep.show'))}</button>
      <button class="gold" data-prep-go>⚔️ ${esc(goLabel)}</button></div>` : '';
    const battleChoice = (k, icon, label, ok, note = '') => `<button class="orb-choice" data-act="${k}" ${ok ? '' : 'disabled'}
      title="${esc(label + (note ? ' · ' + note : ''))}">${icon.startsWith('<') ? icon : `<img src="${icon}" alt="">`}<b>${esc(label)}</b>${note ? `<i>${esc(note)}</i>` : ''}</button>`;
    const battleItem = k => BATTLE.items.find(x => x.k === k);
    const itemChoice = (k, icon) => {
      const it = battleItem(k), pw = it?.power ? g.powerOf(it.power) : null;
      const consumable = k === 'tea' || k === 'health' || k === 'holyWater';
      // น้ำมนต์ (28E): ต้องมีของ + MP ยังไม่เต็ม · โชว์จำนวนคงเหลือ ×N ใต้ปุ่ม
      const ok = !!it && (k === 'holyWater' ? (g.inventory.holyWater || 0) > 0 && mp < g.mpMax
        : consumable ? (g.inventory[k] || 0) > 0
        : !!((g.abilities?.[it.power] || (pw && !g.powerLocked(pw))) && mp >= BATTLE.mpCost[it.power]));
      const note = k === 'holyWater' ? `×${g.inventory.holyWater || 0}` : consumable ? '' : `MP ${BATTLE.mpCost[it?.power] || 0}`;
      return battleChoice(k, icon, ITEMS[k]?.nameKey ? itemName(k) : (it?.name || k), ok, note);
    };
    const bigFire = !!g.abilities?.bigFire;
    const powerChoices = battleChoice('fire', bigFire ? 'img/fx-fireball-big.png' : 'img/fx-fireball.png', bigFire ? 'ลูกไฟใหญ่' : 'ลูกไฟ', mp >= BATTLE.mpCost.fire, `MP ${BATTLE.mpCost.fire}`)
      + (g.abilities?.flameCharge ? battleChoice('flameCharge', 'img/fx-flame-charge.png', 'พุ่งชนเพลิง', mp >= BATTLE.mpCost.charge, `MP ${BATTLE.mpCost.charge}`) : '')
      + (g.abilities?.windFan ? battleChoice('windFan', 'img/fx-fan-wind.png', 'พัดสายลม', mp >= BATTLE.mpCost.wind, `MP ${BATTLE.mpCost.wind}`) : '')
      + (g.abilities?.rage ? battleChoice('rage', 'img/fx-rage.png', 'พลังบ้าคลั่ง', mp >= BATTLE.mpCost.rage && !b.rageTurns && !b.rageCooldown, b.rageCooldown ? `พักพลังอีก ${b.rageCooldown} เทิร์น` : `MP ${BATTLE.mpCost.rage}`) : '')
      + (g.abilities?.valkyrieSpear ? battleChoice('valkyrieSpear', 'img/fx-valkyrie-spear.png', 'หอกวาคิวรี', mp >= BATTLE.mpCost.spear, `MP ${BATTLE.mpCost.spear}`) : '')
      + (g.abilities?.cooldownClock ? battleChoice('cooldownClock', 'img/fx-clock-reset.png', 'นาฬิกาย้อนเวลา', mp >= BATTLE.mpCost.clock && !b.clockUsed, `MP ${BATTLE.mpCost.clock}`) : '')
      + (g.abilities?.ice ? itemChoice('ice', 'img/fx-ice.png') : '')
      + (g.abilities?.hypno ? itemChoice('hypno', 'img/fx-hypno.png') : '');
    const itemChoices = itemChoice('tea', 'img/item-tea.png') + itemChoice('health', 'img/item-health.png')
      + itemChoice('holyWater', itemImg('holyWater'));
    const guardBtn = g.guard ? (() => {
      const why = g.guardHelpWhy();
      return `<button class="orb-choice" data-act="guard" data-crew-action="guard" ${why ? 'disabled' : ''}
        title="${esc(why || `ฟาดแรง ${GUARD.battleAtk} หน่วย — ช่วยยมบาทน้อยสู้`)}">
        <img src="${artUrl('crew-guard-profile') || artUrl('crew-guard')}" alt=""><b>${esc(GUARD.name)}</b><small>ฟาดแรง</small></button>`;
    })() : '';
    const crewHelperBtns = battleHelpers.map(c => {
      const why=g.crewHelpWhy(c);
      return `<button class="orb-choice" data-act="crew:${crewBattleKey(c)}" data-crew-action="${crewBattleKey(c)}" ${why?'disabled':''} title="${esc(why || crewAbility(c.k))}"><img src="${crewArt(c, '-profile')}" alt=""><b>${esc(c.name)}</b><small>${crewAbility(c.k)}</small></button>`;
    }).join('');
    const crewActions = (crewHelperBtns + guardBtn) || '<span class="idle">ยังไม่มีทีม — จัดทีมยมทูตก่อนเข้าสู้ครั้งถัดไป</span>';
    const acts = rest || (b.kind === 'zoneBoss' && !b.prepStarted) || (b.over && !phase) ? '' : commandWheel({battle:true,busy:!!phase,groups:[
      {action:'atk'},{choices:powerChoices},{choices:crewActions},{choices:itemChoices}
    ]});

    const finLabel = b.kind === 'zoneEvent' ? (b.over === 'win' ? t('battle.reward') : 'กลับไปพักแล้วท้าใหม่')
      : b.kind === 'devaTest' ? t('event.devaTest.return') : b.kind === 'frontierBreach' ? t('event.frontierBreach.return') : b.kind === 'prisonBreak'
      ? t('event.prisonBreak.return') :
        // ข้อ F คุณเป้ 24 ก.ย. 2569: เปลี่ยนคำเท่านั้น กลไกรางวัลเดิมทั้งหมด (ดู endBattle kind:'frontier')
        b.over === 'win'  ? (b.kind === 'zoneBoss' ? 'เปิดทางไปโซนถัดไป' : b.kind === 'frontier' ? 'เก็บไอเท็มที่ตกอยู่' : b.kind === 'mob' ? 'กลับไปคุมโซน' : 'ลากเข้าสถานี')
      : b.over === 'lose' ? (b.kind === 'yama' ? t('battle.verdict')
                          : b.kind === 'dad'  ? t('battle.verdict')
                          : b.kind === 'zoneBoss' ? 'กลับไปตั้งหลักที่สะพาน'
                          : b.kind === 'frontier' ? 'ถอยกลับเข้าประตู'
                          : b.kind === 'mob'  ? 'ถอยกลับไปตั้งหลัก'
                                              : 'ปล่อยเขากลับเข้าคิว') : '';
    // เดิมมีเงื่อนไข `&& !phase` ด้วย — พอจังหวะอนิเมชันค้าง (เจ้าของเจอ 8 ก.ย. 2569)
    // กล่องจะไม่มีปุ่มอะไรเลยสักปุ่ม: ปุ่มโจมตีถูกล็อกเพราะ busy ปุ่มจบก็ไม่ถูกวาด
    // = ทางตัน ปิดกล่องไม่ได้ · ฉากจบแล้วต้องมีทางออกเสมอ ไม่ว่าอนิเมชันจะค้างหรือไม่
    const done = b.over
      ? `<div class="row"><button class="${b.over === 'win' ? 'gold' : ''}" data-fin>${finLabel}</button></div>` : '';

    dlg.innerHTML =
      arena(b.kind === 'yama' ? 'พญายมลงมาเอง'
          // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — โซน 2-4 เป็นหัวหน้าที่บัลลังก์ของโซนนั้นลงมาเอง ไม่ใช่ "พ่อ" ของโซน 1
          : b.kind === 'dad'   ? `${g.zone === 'th' ? 'พ่อ' : authorityOf(g.zone).title}ลงมาเอง — ตัดสินพลาดสามสำนวนติด`
          // ข้อ F.1 ชุด 15 — หัวข้อ "บอสโซน<ชื่อโซน>" ตามม็อกอัป Battle5.jpg — g.zoneDef().name
          // มีคำว่า "โซน" นำหน้าอยู่แล้ว (เช่น "โซนสุวรรณภูมิ") ต่อแค่ "บอส" ก็ได้ข้อความตรงม็อกอัปเป๊ะ
          : b.kind === 'zoneBoss' ? `บอส${g.zoneDef().name}`
          : b.kind === 'frontier' ? `ชายแดนนรก — ระลอกที่ ${b.wave}`
          // จำนวนระลอกอ่านจากข้อมูล event จริง ไม่ฮาร์ดโค้ด (frontierBreach โซน 1 มี 2 ระลอก)
          : b.kind === 'frontierBreach' ? `${t('event.frontierBreach.title')} · Wave ${b.wave}/${ZONE_EVENTS.th.find(x => x.k === 'frontierBreach').waves.length}`
          : b.kind === 'zoneEvent' ? (() => { const ev = ZONE_EVENTS[b.zone]?.find(x => x.k === b.eventKey); return g.isFinalBattle(b) ? `${zoneEventText(ev?.title)} · ${b.encounter.startsWith('minion:') ? `Wave ${b.wave}/4` : b.who}` : `${zoneEventText(ev?.title)}${ev?.waves ? ` · Wave ${b.wave}/${ev.waves.length}` : ''}`; })()
          : b.kind === 'devaTest' ? t('event.devaTest.title')
          : b.kind === 'prisonBreak' ? t('event.prisonBreak.title')
          : b.kind === 'mob'   ? 'ผีบุกเข้าโซน'
                               : 'วิญญาณขัดขืน',
            { name: b.who, sub: b.sub, sp: b.sp }, view, act, false, fxNow,
            b.helper && Date.now() - b.helper.at < 1400 ? b.helper : null,
            acts, squadMembers) +
      `<div class="pad">
        ${b.rageTurns > 0 ? `<div class="battle-buff" role="status">🔥 พลังบ้าคลั่ง · โจมตีแรงขึ้นอีก ${b.rageTurns} ครั้ง</div>` : ''}
        ${phase ? `<div class="turnhint">${phase === 'you' ? '⚔️ ตาของท่าน' : '↩️ เขาสวนกลับ'}</div>` : ''}
        ${done}
      </div>${prep}${prepLayer}`;

    const stage = dlg.querySelector('.combat-arena');
    // ชื่อฉากตัวทองล้วน ตามแบบ — ตัดอีโมจิ/สัญลักษณ์นำหน้าออก (⚠️ ฯลฯ)
    const sceneTitle = stage.querySelector('.ttl');
    if (sceneTitle) sceneTitle.textContent = sceneTitle.textContent.replace(/^[^\p{L}\p{N}]+/u, '');
    const meter = (value, max, type, label = '') => `<span class="battle-meter ${type}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.max(0, Math.round(value))}"><i style="width:${Math.max(0, Math.min(100, 100 * value / (max || 1)))}%"></i></span>`;
    const team = [
      ...(g.guard ? [{ k:'guard', name:GUARD.name }] : []),
      ...battleHelpers,
    ];
    stage.insertAdjacentHTML('beforeend', `${b.over ? '' : `<button class="battle-pause" data-battle-pause aria-label="${esc(t('battle.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>`}
      <div class="battle-team-hud">
        ${team.map(c => {
          const remaining = c.k === 'guard' ? g.guardCooldown() : g.crewCooldown(c);
          const duration = c.k === 'guard' ? GUARD.battleCd : BATTLE.crewCd;
          return `<button class="battle-portrait" data-crew-pick="${esc(crewBattleKey(c))}" aria-label="${esc(c.name)}">
            <img src="${esc(crewArt(c, '-profile'))}" alt=""><b>${esc(c.name)}</b>
            <span data-crew-ready="${esc(crewBattleKey(c))}">${meter(duration - remaining, duration, 'ready', c.name)}</span>${g.isFinalBattle() && c.k !== 'guard' ? `<small>กำลังใจ ${Math.round(c.morale)} · ฝึก ${c.upLv || 0}</small>` : ''}
          </button>`;
        }).join('')}
        <div class="battle-portrait hero"><img src="${esc(artUrl('hero-yama-profile') || artUrl('hero-yama'))}" alt=""><b>${esc(HERO_NAME)}</b>
          <div class="battle-numbered-meter">${meter(view.youHp, view.youMax, 'health', t('battle.hp'))}<small>${Math.round(view.youHp)}/${view.youMax}</small></div>
          <div class="battle-numbered-meter">${meter(mp, g.mpMax, 'mana', t('battle.mp'))}<small>${Math.round(mp)}/${g.mpMax}</small></div>
        </div>
      </div>
      ${view.foes?.length === 1 ? (() => { const f = view.foes[0]; return `<div class="battle-boss-hud">
        <img src="${esc(bossProfileOverride(f.sp, g.zone) || (String(f.sp ?? '').startsWith('leader-') ? storyFoeArt(f.sp) : artUrl(f.sp + '-profile') || storyFoeArt(f.sp)))}" alt="${esc(f.who)}" onerror="this.onerror=null;this.src='${esc(storyFoeArt(f.sp))}'">
        <div class="battle-boss-status"><b>${esc(f.who)}</b>${meter(f.hp, f.maxHp, 'health', t('battle.morale'))}<small>${esc(t('battle.morale'))} ${Math.round(f.hp)}/${f.maxHp}</small></div>
        ${f.sub ? `<p>${esc(f.sub)}</p>` : ''}
      </div>`; })() : `<div class="battle-scene-talk talkbox">${esc(view.talk || '')}</div>`}
    `);
    if (view.foes?.length > 1) {
      const counts = new Map(), seen = new Map();
      view.foes.forEach(f => counts.set(f.who, (counts.get(f.who) || 0) + 1));
      stage.querySelectorAll('.foe-group [data-foe-id]').forEach((el, i) => {
        const f = view.foes[i], number = (seen.get(f.who) || 0) + 1;
        seen.set(f.who, number);
        const name = counts.get(f.who) > 1 ? `${f.who} ${number}/${counts.get(f.who)}` : f.who;
        el.querySelector('.plate b').textContent = name;
        el.setAttribute('aria-label', `${name} ${Math.round(f.hp)}/${f.maxHp}`);
      });
    }
    // 28A: ปุ่มจบศึก (data-fin) ตอนชนะ ย้ายออกจากกล่อง .pad ตามภาพที่คุณเป้ชี้
    //  - วิญญาณขัดขืนตัวเดียว (ลากเข้าสถานี) → ลอยเหนือหัววิญญาณเป้าหมาย (ผูกกับ .fig.foe จึงตามตัวไปทุกขนาดจอ)
    //  - ศึกหลายตัว (วิญญาณแหกคุก/ระลอกชายแดน → กลับไปคุมโซน) → กลางล่างเหนือแถบ HUD ไม่ทับกล่องผลรางวัล
    // ปุ่มยังเป็น [data-fin] ตัวเดิม handler ด้านล่างผูกด้วย dlg.querySelector จึงทำงานเหมือนเดิม
    // ชุด 29C ข้อ 6 — ปุ่ม "กลับไปคุมโซน" ของศึกที่กลับสู่แผนที่ (ผีบุก · เทวดาทดสอบ · แหกคุก · ชายแดนบุก) ต้องอยู่กลางจอ
    // ใหญ่ระดับปุ่มหลัก ไม่ใช่ปุ่มเล็กมุมล่างที่ทับ/ชิดกล่องผลกับแถบ HUD (ภาพจากคุณเป้ 2 ต.ค. 2569)
    // ชุด 30B ข้อ 6 — ศึกอีเวนต์โซน 2–4 ที่ชนะ (ปุ่ม "รับรางวัล" ระลอกสุดท้าย) ก็อยู่กลางจอเหมือนกัน ไม่ทับป้ายมุมล่าง
    const returnsToZone = ['devaTest', 'frontierBreach', 'prisonBreak'].includes(b.kind) || (['mob', 'zoneEvent'].includes(b.kind) && b.over === 'win');
    const finRow = b.over === 'win' || (b.over && returnsToZone) ? dlg.querySelector('[data-fin]')?.closest('.row') : null;
    if (finRow) {
      const multi = view.foes?.length > 1;
      const foeFig = !multi && b.kind === 'soul' ? stage.querySelector('.fig.foe') : null;
      if (foeFig) { finRow.classList.add('fin-float', 'fin-foe'); foeFig.appendChild(finRow); }
      else if (multi || returnsToZone) { finRow.classList.add('fin-float', 'fin-center', 'fin-main'); stage.appendChild(finRow); }
    }
    // ชุด 29C ข้อ 7 — ยมทูตฝ่ายเราสูงใกล้เคียงยมบาทน้อย (วัดจากความสูงตัวจริงของภาพ ไม่ใช่ค่าตายตัว) · ทุกโซน ทุกยมทูตรวมยักษ์ทวารบาล
    applyHealFx();
    if (!g.isFinalBattle()) fitBattleSprites(stage, heroFace());
    if (!g.isFinalBattle() && typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => { if (stage.isConnected) fitBattleSprites(stage, heroFace()); else ro.disconnect(); }); ro.observe(stage); }
    stage.querySelector('[data-battle-pause]')?.addEventListener('click', () => openPause(true));
    stage.querySelector('[data-arena-settings]').title = t('battle.settings');
    stage.querySelector('[data-arena-settings]').setAttribute('aria-label', t('battle.settings'));

    // แก้รอบ 1 ข้อ C ชุด 13 — เปิดหน้าต่างเดิม (พ่อค้า/นิรา) ตรง ๆ ไม่ต้องมี callback "กลับมาหน้าเตรียมศึก"
    // เพราะ battle ยังไม่จบ (b.over ยังเป็น null) ตัวเฝ้า battleUI ที่ท้ายไฟล์เปิดฉากนี้กลับให้เองอัตโนมัติ
    // ทันทีที่ merchant/nira ปิด (เหมือนที่คอมเมนต์บนสุดของไฟล์อธิบายไว้แล้วสำหรับกรณีทั่วไป)
    dlg.querySelector('[data-event-prep="merchant"]')?.addEventListener('click', () => openMerchant());
    dlg.querySelector('[data-event-prep="nira"]')?.addEventListener('click', () => openNiraOffice());
    dlg.querySelector('[data-prep-med]')?.addEventListener('click', () => { if (g.useBossMedicine()) { sfx('star'); paint(); refresh(); } });
    dlg.querySelector('[data-prep-water]')?.addEventListener('click', () => { if (g.useHolyWater()) { sfx('star'); paint(); refresh(); } });
    dlg.querySelector('[data-prep-pause]')?.addEventListener('click', () => openPause(true));
    dlg.querySelector('[data-prep-hide]')?.addEventListener('click', () => { prepHidden = true; paint(); });
    dlg.querySelector('[data-prep-show]')?.addEventListener('click', () => { prepHidden = false; paint(); });
    dlg.querySelectorAll('[data-prep-go]').forEach(prepGo => prepGo.onclick = () => { if (rest ? g.advanceZoneEventWave(true) : g.startBossFight()) { prepHidden = false; sfx('gong'); paint(); refresh(); } });
    bindCommandWheel(dlg);
    dlg.querySelectorAll('[data-crew-pick]').forEach(el => {
      const activate = () => {
        if (phase) return;
        const action = dlg.querySelector(`[data-act="${el.dataset.crewPick === 'guard' ? 'guard' : 'crew:' + el.dataset.crewPick}"]`);
        if (action && !action.disabled) action.click();
      };
      el.onclick = activate;
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } };
    });
    dlg.querySelectorAll('[data-foe-id]').forEach(el => el.onclick = () => {
      if (!phase && g.selectFoe(el.dataset.foeId)) paint();
    });

    const finishWave = () => {
      if (!g.battle?.pendingWave) return;
      if (g.battle.kind === 'zoneEvent') g.advanceZoneEventWave();
      else g.advanceFrontierBreachWave();
    };
    dlg.querySelectorAll('[data-act]').forEach(el => el.onclick = () => {
      if (phase) return;                       // กำลังเล่นจังหวะอยู่ ห้ามกดซ้อน
      const action = el.dataset.act;
      const actor = action.startsWith('crew:') ? g.battleCrew().find(c => crewBattleKey(c) === action.slice(5)) : null;
      const k = actor ? 'crew:' + actor.k : action;
      const hpBefore = g.battle.youHp;
      if (!g.battleAct(action)) return;
      // ชุด 30B ข้อ 9 — บุญ (ยมทูตสายเติมเลือด) เติมบารมี: ยมบาทน้อยเรืองแสงเขียว-ทอง + เลข +HP ลอยขึ้น
      // เริ่มตอนภาพคั่นท่าพิเศษจางลงพอดี (ไม่งั้นอยู่ใต้ภาพคั่นที่ทับเต็มกรอบ)
      if (k === 'crew:boon' && g.battle.youHp > hpBefore) {
        healFx = { amount: Math.round(g.battle.youHp - hpBefore), start: Date.now() + ACTION_CUT_MS - 200, ms: HEAL_GLOW_MS };
        scheduleHealFx();
      }
      sfx(powerSfx(k, g.abilities));            // ท่าไม้ตายทุกท่ามีเสียงของตัวเอง (28C) · ท่าอื่น = 'hit'
      if (k.startsWith('crew:')) refresh();     // กำลังใจของเขาลด แผงข้างล่างต้องอัปเดตด้วย
      const nb = g.battle;
      if (nb.storyFinale) { sfx('win'); finish(); return; }

      // ---- จังหวะที่ 1: ตาของท่าน ----
      phase = 'you'; phaseAt = Date.now();
      const effect = ({'crew:plerng':'fire','crew:kan':'hypno','crew:boon':'health','holyWater':'health'})[k] || k;
      // crew = คีย์ยมทูต/ยักษ์ที่กำลังลงมือ ใช้กันไม่ให้ยมบาทน้อยสลับเป็นท่าโจมตีของตัวเอง (ดู usingAtk ใน arena())
      const crewNow = k.startsWith('crew:') ? k.slice(5) : k === 'guard' ? 'guard' : null;
      fxNow = { key: FX_OF[effect] ? effect : 'atk', side: (effect === 'health' || effect === 'tea' || effect === 'rage') ? 'you' : 'foe', crew: crewNow };
      paint();
      playActionCutscene(action);

      clearTimeout(phaseTimer);
      phaseTimer = setTimeout(() => {
        if (!g.battle) return;
        // เขาตายคาที่ หรือไม่ได้สวนกลับ (โดนสตัน/ท่านแพ้ไปแล้ว) → ไม่ต้องมีจังหวะที่ 2
        // ข้อ B ชุด 13 — ถูกสะกดจิตแล้วฟาดใส่ตัวเอง (confuseSelf) ก็ต้องมีจังหวะที่ 2 ให้เห็นด้วย
        const counter = (nb.dmg && (nb.dmg.you > 0 || nb.dmg.confuseSelf > 0));
        if (!counter) { phase = null; fxNow = null; finishWave(); paint(); if (nb.over) sfx(nb.over === 'win' ? 'win' : 'lose'); return; }

        // ข้อ C คุณเป้ 24 ก.ย. 2569 — เดิมตีสวนต่อทันทีที่อนิเมชันเราเล่นจบ (780ms) รู้สึกโดนตีสวนทันที
        // หน่วงเพิ่มอีก ~2 วิ ก่อนเริ่มจังหวะเขาสวนกลับ ผู้เล่นต้องเห็นดาเมจ/แถบเลือดของตัวเองนิ่งอยู่ก่อน
        // phase ยังเป็น 'you' ต่อระหว่างรอ (ปุ่มล็อกอยู่ผ่าน busy:!!phase) กันกดโจมตีซ้อนจนพัง
        phaseTimer = setTimeout(() => {
          if (!g.battle) return;
          // ---- จังหวะที่ 2: เขาสวนกลับ (หรือถูกสะกดจิตแล้วฟาดใส่ตัวเอง) ----
          phase = 'foe'; phaseAt = Date.now();
          fxNow = nb.dmg && nb.dmg.confuseSelf > 0 ? { key: 'atk', side: 'foe' } : { key: 'foe', side: 'you' };
          sfx('hurt');
          paint();
          if (nb.ultimate) playActionCutscene('boss', nb.ultimate);
          phaseTimer = setTimeout(() => {
            phase = null; fxNow = null;
            if (g.battle) { finishWave(); paint(); if (g.battle.over) sfx(g.battle.over === 'win' ? 'win' : 'lose'); }
          }, nb.ultimate ? ACTION_CUT_MS + 120 : 780);
        }, COUNTER_WAIT_MS);
      }, ACTION_CUT_MS + 120);
    });
    const fin = dlg.querySelector('[data-fin]');
    if (fin) fin.onclick = finish;
  };

  // ---- ฉากต่อสู้ "ปิดไม่ได้จนกว่าจะจบ" ----
  // พบ 8 ก.ย. 2569 ว่ามี event close หลุดเข้ามาได้โดยไม่มี cancel นำหน้าและไม่มีใครกดอะไร
  // ผลคือผู้เล่น "แพ้ฟรี" กลางฉาก เลยไม่ผูกการจบฉากไว้กับ event close อีกต่อไป
  let reopen = 0, finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    battleUI = null;
    lastBattleEnd = Date.now();
    clearTimeout(phaseTimer);
    clearInterval(phaseGuard);
    clearInterval(crewTimer);
    dlg.removeEventListener('cancel', noEsc);
    dlg.removeEventListener('close', onClose);
    if (dlg.open) dlg.close();
    const done = g.endBattle();
    // 'dad' ไม่ใช่ Game Over อีกต่อไป (17 ก.ย. 2569) — เกมเดินต่อ เพลงจึงต้องกลับมาเป็นเพลงโซนด้วย
    // 'yama' เท่านั้นที่ยังเป็นจบเกมจริง ไม่ต้องกลับเพลง
    if (done?.kind !== 'yama') bgm('bgm-zone');
    updatePlay();
    refresh();
    // ชุด 28B — ถ้ามีหน้าต่างรางวัลรออยู่ ให้ฟังก์ชันต่อท้าย (เช่นกลับแผนที่ชายแดน) รอจนปิดหน้าต่างรางวัลก่อน
    if (done?.over === 'lose') return;
    if (after) afterReward(() => after(done ? done.over : null, done));
  }

  const noEsc = e => { if (storyActive || (g.battle && !g.battle.over)) e.preventDefault(); };
  const onClose = () => {
    // ฉากยังไม่จบ = ไม่นับว่าปิด · ตัวเฝ้าจะเปิดกล่องกลับให้เองภายในเสี้ยววินาที
    if (g.battle && !g.battle.over && reopen++ < 200) return;
    finish();
  };

  // จังหวะอนิเมชันค้าง = ปุ่มถูกล็อกค้างไปด้วย ผู้เล่นทำอะไรไม่ได้เลย
  // (setTimeout พลาดได้หลายทาง — แท็บอยู่หลังจอ เครื่องหน่วง กล่องถูกวาดใหม่ระหว่างทาง)
  // เกิน PHASE_GUARD_MS เมื่อไหร่ ปลดล็อกแล้ววาดใหม่ ไม่ปล่อยให้ค้าง
  // (ยกจาก 4000 → 6000ms ข้อ C 24 ก.ย. 2569 — จังหวะ 'you' ตอนนี้กินเวลาเองถึง 780+COUNTER_WAIT_MS
  //  ก่อนสลับเป็น 'foe' ต้องเผื่อระยะปลอดภัยไม่ให้ guard ตัดตอนกลางจังหวะที่ตั้งใจหน่วงไว้)
  const phaseGuard = setInterval(() => {
    if (storyActive || !phase || Date.now() - phaseAt < PHASE_GUARD_MS) return;
    phase = null; fxNow = null;
    if (g.battle) { if (g.battle.pendingWave) {
      if (g.battle.kind === 'zoneEvent') g.advanceZoneEventWave();
      else g.advanceFrontierBreachWave();
    } paint(); }
  }, 600);

  const crewTimer = setInterval(() => {
    for (const c of g.battleCrew()) {
      const remaining=g.crewCooldown(c), progress=100*(1-remaining/BATTLE.crewCd);
      const ready=dlg.querySelector(`[data-crew-ready="${crewBattleKey(c)}"] .battle-meter`);
      if(ready){ready.setAttribute('aria-valuenow',Math.round(BATTLE.crewCd-remaining));ready.querySelector('i').style.width=progress+'%';}
      const bar=dlg.querySelector(`[data-cooldown="${crewBattleKey(c)}"]`);
      if(bar){bar.setAttribute('aria-valuenow',Math.round(progress));bar.querySelector('i').style.width=progress+'%';}
      const label=dlg.querySelector(`[data-cooldown-label="${crewBattleKey(c)}"]`);
      if(label)label.textContent=remaining?cooldownText(remaining):'พร้อม';
      const button=dlg.querySelector(`[data-crew-action="${crewBattleKey(c)}"]`);
      if(button){button.disabled=!!phase||!!g.battle?.over||!!g.crewHelpWhy(c);button.title=g.crewHelpWhy(c)||crewAbility(c.k);}
    }
    // ข้อ C คุณเป้ 25 ก.ย. 2569 — ยักษ์ทวารบาลมีคูลดาวน์ของตัวเอง (GUARD.battleCd) แยกจากยมทูต
    if (g.guard) {
      const remaining=g.guardCooldown(), progress=100*(1-remaining/GUARD.battleCd);
      const ready=dlg.querySelector('[data-crew-ready="guard"] .battle-meter');
      if(ready){ready.setAttribute('aria-valuenow',Math.round(GUARD.battleCd-remaining));ready.querySelector('i').style.width=progress+'%';}
      const bar=dlg.querySelector('[data-cooldown="guard"]');
      if(bar){bar.setAttribute('aria-valuenow',Math.round(progress));bar.querySelector('i').style.width=progress+'%';}
      const label=dlg.querySelector('[data-cooldown-label="guard"]');
      if(label)label.textContent=remaining?cooldownText(remaining):'พร้อม';
      const button=dlg.querySelector('[data-crew-action="guard"]');
      if(button){button.disabled=!!phase||!!g.battle?.over||!!g.guardHelpWhy();button.title=g.guardHelpWhy()||`ฟาดแรง ${GUARD.battleAtk} หน่วย — ช่วยยมบาทน้อยสู้`;}
    }
  },1000);
  battleUI = () => { paint(); openDlg('rpg'); };
  battleUI();
  dlg.addEventListener('cancel', noEsc);
  dlg.addEventListener('close', onClose);
}

// ---------- ย้ายโซน: แผนที่ด้านนอกและทางเดินข้ามสะพาน ----------
function openZone() {
  const cur = g.zoneDef();
  const markers = ZONES.map((z, i) => {
    const here = z.k === g.zone;
    const lock = !g.canMoveZone(z.k);
    const prev = ZONES[i - 1];
    const why = lock ? (z.k !== 'cyberhell' && g.level < z.level ? `ต้องเป็น ${LEVELS[z.level - 1].name}` : `ต้องชนะ${prev.bossName}ก่อน`)
      : (z.sub || 'กดเพื่อเดินทาง');
    const [x, y] = ZONE_MAP[z.k].marker;
    return `<button class="world-zone${here ? ' here' : ''}${lock ? ' locked' : ''}"
      style="left:${x}%;top:${y}%" data-zone="${z.k}" ${here || lock ? 'disabled' : ''}
      aria-label="${esc(z.name)} — ${esc(here ? 'อยู่ที่นี่' : lock ? why : 'กดเพื่อเดินทาง')}"
      title="${esc(here ? 'อยู่ที่นี่' : why)}">
      <b>${here ? '📍 ' : lock ? '🔒 ' : ''}${esc(z.name)}</b>
      <small>${esc(here ? 'อยู่ที่นี่' : lock ? why : 'กดเพื่อเดินทาง')}</small>
    </button>`;
  }).join('');
  const [startX, startY] = ZONE_MAP[g.zone].gate;
  modal(`<h2>🗺️ แผนที่อเวจี</h2>
    <div class="world-map-note">ตอนนี้อยู่ <b style="color:var(--gold)">${esc(cur.name)}</b> · กดชื่อโซนที่เปิดแล้วเพื่อให้ยมบาทน้อยกับนิราเดินทางข้ามไป
      <span class="world-pan-hint">· ปัดแผนที่ซ้าย–ขวาเพื่อดูทุกโซน</span></div>
    <div class="world-map-scroll"><div class="world-map" role="group" aria-label="แผนที่เลือกโซน">
      <img class="world-map-art" src="img/zone-world-map.webp" alt="เส้นทางเชื่อมสี่ดินแดนในอเวจี">
      ${markers}
      <div class="world-travelers" aria-hidden="true">
        <canvas class="yama" width="160" height="160" style="left:${startX}%;top:${startY}%;width:auto;animation:none;background:none"></canvas>
        <canvas class="nira" width="160" height="160" style="left:${startX}%;top:${startY}%;width:auto;animation:none"></canvas>
      </div>
    </div></div>
    <div class="world-map-note">ยมบาทน้อย นิรา เบี้ยกรรม และพลังติดตัวไป · สถานีและยมทูตประจำสาขาเดิมจะรออยู่เมื่อกลับมา</div>
    <div class="row"><button class="gold" data-close>อยู่ที่นี่ต่อ</button></div>`, d => {
    const map = d.querySelector('.world-map'), scroll = d.querySelector('.world-map-scroll');
    const yama = d.querySelector('.world-travelers .yama'), nira = d.querySelector('.world-travelers .nira');
    let traveling = false, frame = 0;
    const yamaCtx = yama.getContext('2d');
    yamaCtx.imageSmoothingEnabled = false;
    let yamaDirection = 'down', yamaLast = [startX, startY];
    const paintYama = (distance = 0) => {
      yamaCtx.clearRect(0, 0, 160, 160);
      if (!drawHeroWalk(yamaCtx, 80, 150, 135, distance, 1, yamaDirection))
        drawStandee(yamaCtx, 'hero-yama', 80, 150, 135, 0, '👑');
    };
    paintYama();
    const heroReady = new Image();
    heroReady.onload = () => { if (!traveling) paintYama(); };
    heroReady.src = artUrl('hero-yama-walk-4dir');
    const niraCtx = nira.getContext('2d');
    niraCtx.imageSmoothingEnabled = false;
    let niraFace = 1, niraLastX = startX;
    const paintNira = (distance = 0, moving = false) => {
      niraCtx.clearRect(0, 0, 160, 160);
      if (moving && drawCrewWalk(niraCtx, 'crew-nira', 80, 150, 135, distance, niraFace)) return;
      drawStandee(niraCtx, 'crew-nira', 80, 150, 135, 0, '📜', niraFace, false);
    };
    paintNira();
    const niraStill = new Image();
    niraStill.onload = () => { if (!traveling) paintNira(); };
    niraStill.src = artUrl('crew-nira');
    const niraWalk = new Image();
    niraWalk.src = artUrl('crew-nira-walk');
    const centerOn = x => { scroll.scrollLeft = map.clientWidth * x / 100 - scroll.clientWidth / 2; };
    centerOn(startX);
    onDlgClose(() => cancelAnimationFrame(frame));
    d.querySelectorAll('.world-zone:not(:disabled)').forEach(b => b.onclick = () => {
      if (traveling || !g.canMoveZone(b.dataset.zone)) return;
      const route = zoneMapRoute(g.zone, b.dataset.zone);
      if (route.length < 2) return;
      traveling = true;
      map.classList.add('traveling');
      d.querySelectorAll('.world-zone').forEach(btn => { btn.disabled = true; });
      const path = travelPath(route, map.clientWidth / map.clientHeight);
      const total = path.total;
      const followGap = Math.min(2.5, total / 4);
      const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 :
        Math.min(3600, Math.max(1500, total * 34));
      const started = performance.now();
      const step = now => {
        if (!d.open || !d.classList.contains('zonepick')) return;
        const done = duration === 0 ? total + followGap : Math.min(total + followGap, (now - started) / duration * (total + followGap));
        const [x, y] = path.at(done);
        const [nx, ny] = path.at(done - followGap);
        yama.style.left = `${x}%`; yama.style.top = `${y}%`;
        yamaDirection = walkDirection((x - yamaLast[0]) * map.clientWidth / 100,
          (y - yamaLast[1]) * map.clientHeight / 100, yamaDirection);
        yamaLast = [x, y];
        paintYama(done < total ? done * map.clientHeight / 100 : 0);
        nira.style.left = `${nx}%`; nira.style.top = `${ny}%`;
        if (Math.abs(nx - niraLastX) > .001) niraFace = nx > niraLastX ? 1 : -1;
        niraLastX = nx;
        paintNira(Math.max(0, done - followGap) * map.clientHeight / 100,
          done > followGap && done < total + followGap);
        centerOn(x);
        if (done < total + followGap) { frame = requestAnimationFrame(step); return; }
        map.classList.remove('traveling');
        // moveZone() เปิดฉากมาถึงผ่าน onChange() เอง; ปล่อยให้ฉากนั้นแทนแผนที่ทันที
        if (g.moveZone(b.dataset.zone)) { sfx('gong'); refresh(); }
      };
      frame = requestAnimationFrame(step);
    });
  }, 'zonepick');
}

function openOutfit() {
  pauseForDlg();
  modal(`<h2>👘 ห้องเครื่อง Yama</h2>
    <p class="outfit-note">เลือกชุดที่ได้รับแล้ว สวมได้ทุกสาขา</p>
    <div class="outfit-list">
    ${ZONES.map(z => {
      const lock = !g.outfitsOwned?.includes(z.k), here = (g.outfit || 'th') === z.k;
      const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
      const face = z.k === 'th' ? 'img/hero-yama.png' : `img/${folders[z.k]}/hero-yama-${z.k}.png`;
      return `<div class="outfit-card${here ? ' selected' : ''}${lock ? ' locked' : ''}">
        <img src="${face}" alt="ชุด${esc(z.name)}" loading="lazy">
        <span class="outfit-info"><b>ชุด${esc(z.name.replace(/^โซน/, ''))}</b>
          ${z.sub ? `<small>${esc(z.sub)}</small>` : ''}
          <span>${lock ? `🔒 ซื้อจากพ่อค้านรกใน${esc(z.name)}` : here ? '✓ กำลังสวม' : 'พร้อมสวม'}</span></span>
        ${here ? '<button class="sm" disabled>ชุดปัจจุบัน</button>'
               : `<button class="sm" data-outfit="${z.k}" ${lock ? 'disabled' : ''}>${lock ? '🔒 ยังสวมไม่ได้' : 'สวม'}</button>`}
      </div>`;
    }).join('')}
    </div>
    <div class="row"><button class="gold" data-close>เสร็จแล้ว</button></div>`,
    d => { d.classList.add('outfit'); d.querySelectorAll('[data-outfit]').forEach(b => b.onclick = () => {
      if (!g.setOutfit(b.dataset.outfit)) return;
      warmZone(b.dataset.outfit); sfx('gong'); dlg.close(); refresh();
    }); });
}

// ---------- ภาพ/ชื่อไอเท็ม (ชุด 28B) ----------
/** ชื่อไอเท็มตามภาษา — ไอเท็มที่มี nameKey ผ่าน i18n (น้ำมนต์) ที่เหลือใช้ชื่อไทยเดิมตามขอบเขตรอบ C2 */
const itemName = k => ITEMS[k]?.nameKey ? t(ITEMS[k].nameKey) : (ITEMS[k]?.name || k);
/** ภาพชั่วคราวของไอเท็มที่ยังไม่มีไฟล์จริง ใช้ placeholder/glyph/fallback จากข้อมูลไอเท็ม
 *  พอวางไฟล์ img/<ITEMS[k].img>.png จริง ภาพนี้จะไม่ถูกใช้อีกเอง ไม่ต้องแก้โค้ด
 *  สีเท่า token --gold (#d4a355) / --muted (#2a171d) ใน index.html — data-URI อ่านตัวแปร CSS ไม่ได้ */
const placeholderSrc = text => {
  const emoji = [...String(text)].length <= 2 && /\p{Extended_Pictographic}/u.test(String(text));   // glyph อีโมจิ (เช่น ❤️) ใหญ่เต็มกรอบ ไม่ใช่ตัวอักษรเล็ก
  return 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="10" fill="#2a171d" stroke="#d4a355" stroke-width="3" stroke-dasharray="6 4"/><text x="32" y="${emoji ? 43 : 40}" font-size="${emoji ? 32 : 20}" font-weight="700" text-anchor="middle" fill="#d4a355" font-family="sans-serif">${text}</text></svg>`
).replace(/'/g, '%27');
};
/** <img> ของไอเท็ม — ไฟล์หายใช้ fallback ที่แสดงได้แทนรูปแตก */
function itemImg(k, attrs = '') {
  const d = ITEMS[k]; if (!d) return '';
  const src = artUrl(d.img) || `img/${d.img}.png`;
  const ph = ` onerror="this.onerror=null;this.src='${placeholderSrc(d.placeholder || d.glyph || d.fallback)}'"`;
  return `<img src="${src}" alt="${esc(itemName(k))}" ${attrs}${ph}>`;
}

function bagUseWhy(k) {
  const d = ITEMS[k];
  if (!d) return 'ไม่รู้จักไอเทมนี้';
  // ข้อ H คุณเป้เจอ 25 ก.ย. 2569 — ลูกไฟ/คัมภีร์น้ำแข็งเป็นของใช้เฉพาะฉากต่อสู้ (มีปุ่มของตัวเองในวงคำสั่ง
  // ต่อสู้อยู่แล้ว) กดใช้จากกระเป๋าตอนไม่ได้ต่อสู้อยู่ไม่มีความหมาย — ปิดปุ่มถาวรพร้อมบอกว่าไปใช้ตรงไหน
  // (การเก็บของสองชิ้นนี้เปลี่ยนไปเติมกระสุน/พลังให้ทันทีตั้งแต่ตอนเก็บแล้ว ดู collectItem ใน game.js
  // จึงแทบไม่มีทางเห็นแถวนี้ในกระเป๋าอีก ยกเว้นเซฟเก่าที่ยังไมเกรตไม่ครบ — ปุ่มก็ยังต้องปิดเหมือนกัน)
  if (k === 'fire' || k === 'ice') return 'ใช้ในฉากต่อสู้';
  if (k === 'mirror') return 'ใช้ได้ในห้องสอบสวนเท่านั้น';
  if (k === 'food') return 'นำไปให้นิราบนแผนที่เพื่อแจกทีม';
  if (k === 'lotus') return 'นำไปมอบให้บุญที่ประตูสวรรค์';
  if (d.material) return `สินค้า · พ่อค้านรกรับซื้อ ${d.sell} เบี้ยกรรม`;
  if (d.hp && g.hp >= g.hpMax && !(k === 'tea' && g.mp < g.mpMax)) return 'บารมีเต็มแล้ว';
  if (d.mp && !d.hp && g.mp >= g.mpMax) return t('bag.mpFull');
  if (d.karma < 0 && g.karma <= 0) return 'ยังไม่มีกรรมให้ชำระ';
  if (d.power) {
    const p = g.powerOf(d.power);
    if (!p || g.powerLocked(p)) return 'พลังนี้ยังไม่ปลดล็อก';
    if (p.ammo >= p.max) return 'พลังเต็มแล้ว';
  }
  // ข้อ A คุณเป้ 24 ก.ย. 2569 — ลูกไฟแยกจากระบบ power แล้ว เช็ค g.fireAmmo ของตัวเอง
  if (d.fireAmmo && g.fireAmmo >= g.fireAmmoMax) return 'ลูกไฟเต็มแล้ว';
  return '';
}

function outfitCards() {
  return ZONES.map(z => {
    const why = g.outfitWhy(z.k), lock = !!why, here = (g.outfit || 'th') === z.k;
    const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' };
    const face = z.k === 'th' ? 'img/hero-yama.png' : `img/${folders[z.k]}/hero-yama-${z.k}.png`;
    return `<div class="outfit-card${here ? ' selected' : ''}${lock ? ' locked' : ''}">
      <img src="${face}" alt="ชุด${esc(z.name)}" loading="lazy">
      <span class="outfit-info"><b>ชุด${esc(z.name.replace(/^โซน/, ''))}</b>
        ${z.sub ? `<small>${esc(z.sub)}</small>` : ''}
        <span>${lock ? `🔒 ${esc(why)}` : here ? '✓ กำลังสวม' : 'เก็บอยู่ในกระเป๋า'}</span></span>
      ${here ? '<button class="sm" disabled>ชุดปัจจุบัน</button>'
             : `<button class="sm" data-bag-outfit="${z.k}" ${lock ? 'disabled' : ''}>${lock ? '🔒 ยังสวมไม่ได้' : 'สวม'}</button>`}
    </div>`;
  }).join('');
}

function openBag() {
  pauseForDlg();
  const carried = Object.entries(g.inventory || {}).filter(([k, n]) => ITEMS[k] && n > 0);
  const itemCards = carried.length ? carried.map(([k, n]) => {
    const d = ITEMS[k], why = bagUseWhy(k);
    return `<div class="bag-item">
      ${itemImg(k, 'loading="lazy"')}
      <span class="n"><b>${esc(itemName(k))} ×${n}</b>
        <small>${esc(why || d.say)}</small></span>
      <button class="gold" data-use-item="${k}" title="${esc(why || d.say)}" ${why ? 'disabled' : ''}>${d.material ? 'รอขาย' : 'ใช้'}</button>
    </div>`;
  }).join('') : '<div class="bag-empty">ยังไม่มีของในกระเป๋า<br><small>เดินเข้าใกล้ไอเทมตามฉากเพื่อเก็บ</small></div>';

  modal(`<h2>🎒 กระเป๋าของยมบาทน้อย</h2>
    <div class="hint">ของที่เก็บได้จะไม่ถูกใช้ทันที เลือกใช้เมื่อจำเป็น และติดตัวไปทุกโซน</div>
    <div class="bag-title">ของใช้ · ${carried.reduce((s, [, n]) => s + n, 0)} ชิ้น</div>
    <div class="bag-list">${itemCards}</div>
    <div class="bag-title">ชุดที่ได้รับ</div>
    <div class="outfit-list">${outfitCards()}</div>
    <div class="row"><button class="gold" data-close>ปิดกระเป๋า</button></div>`, d => {
      d.classList.add('bag');
      d.querySelectorAll('[data-use-item]').forEach(b => b.onclick = () => {
        if (!g.useBag(b.dataset.useItem)) return;
        sfx('gong'); openBag(); refresh();
      });
      d.querySelectorAll('[data-bag-outfit]').forEach(b => b.onclick = () => {
        if (!g.setOutfit(b.dataset.bagOutfit)) return;
        warmZone(b.dataset.bagOutfit); sfx('gong'); openBag(); refresh();
      });
    });
}

// ---------- บทเรียนทีละขั้น ----------
// เจ้าของบอก 7 ก.ย. 2569 ว่า "ดูยากไป ต้องค่อยสอนทีละอย่าง"
// กติกา: ทีละขั้นเท่านั้น และขั้นจะโผล่ตอนที่เรื่องนั้นเพิ่งมีความหมายจริง (เงื่อนไข when อยู่ใน data.js)
// ขั้นที่ boss:true พญายมมาพูดเองแล้วหยุดเกม · ที่เหลือขึ้นเป็นแถบโค้ชโดยไม่ขัดจังหวะ
const coachEl = $('#coach');
let coachStep = null;

function openCoachInbox() {
  const available = TUTOR.filter(st => g.taught.includes(st.k) || (!st.boss && st.when(g)));
  const unread = available.filter(st => !g.taught.includes(st.k));
  // รายการสุดท้ายในกล่องคือ "เป้าหมายสั้น ๆ" ของโซน (เดิมเป็นแถบกลางจอ) — ไม่มีบทไหนค้างอ่านก็เปิดที่นี่ก่อน
  const goalIndex = available.length;
  let index = unread.length ? available.indexOf(unread[unread.length - 1]) : goalIndex;
  unread.forEach(st => g.taught.push(st.k));
  coachStep = null;
  g.save();
  const paint = () => {
    const st = available[index];
    dlg.innerHTML = `<div class="coach-reader-head"><img src="img/ui/icon-bell.png" alt=""><h2>${esc(t('coach.notice'))}</h2></div>
      ${!st ? `<h3>📜 ${esc(t('coach.goal'))}</h3><p>${esc(miniGoalText())}</p>` : `
      <p class="coach-reader-count">${esc(t('coach.chapter'))} ${TUTOR.indexOf(st) + 1} / ${TUTOR.length}</p>
      <h3>${esc(st.title)}</h3><p>${esc(st.text)}</p>
      ${st.hint ? `<div class="coach-reader-hint">▸ ${esc(st.hint)}</div>` : ''}`}
      <div class="coach-reader-nav">
        <button id="coach-prev" ${index === 0 ? 'disabled' : ''}>← ${esc(t('coach.previous'))}</button>
        <button id="coach-next" ${index === goalIndex ? 'disabled' : ''}>${esc(t('coach.next'))} →</button>
      </div>`;
    dlg.querySelector('#coach-prev').onclick = () => { index--; paint(); };
    dlg.querySelector('#coach-next').onclick = () => { index++; paint(); };
  };
  modal('', paint, 'coach-modal');
}

function drawCoach() {
  // ยังอยู่หน้าปก — ห้ามสอนอะไรทั้งนั้น ไม่งั้นโมดัลบทที่ 1 จะเด้งทับปกตั้งแต่ยังไม่ได้กดเริ่ม
  if (!$('#title')?.classList.contains('gone')) { coachEl.hidden = true; return; }
  // มีฉากต่อสู้ค้างอยู่ = ห้ามสอนอะไรทั้งนั้น ไม่งั้นโมดัลบทเรียนจะไปเปิดชนกับฉากต่อสู้
  // แล้ว showModal ของฉากต่อสู้จะพังเงียบ ๆ (ปุ่มข้างในไม่ผูก handler)
  if (g.battle) { coachEl.hidden = true; return; }
  if (g.over) { coachEl.hidden = true; return; }
  if (dlg.open) return;              // มีโมดัลค้างอยู่ — รอปิดก่อน (dlg.showModal ซ้อนกันไม่ได้)
  if (!coachStep) coachStep = TUTOR.find(t => !g.taught.includes(t.k) && t.when(g)) || null;
  const available = TUTOR.filter(st => g.taught.includes(st.k) || (!st.boss && st.when(g)));

  // ขั้นของพญายมต้องเป็นโมดัล — ท่านพูดเองแล้วเกมหยุดฟัง
  if (coachStep?.boss) {
    const st = coachStep;
    coachEl.hidden = true;
    // ปิดขั้นนี้ตรงนี้เลย แล้วปล่อยให้ตัวจับ close ของ dlg เป็นคนเรียกขั้นถัดไป
    // (ห้ามเรียก markTaught ที่วน drawCoach ต่อ ไม่งั้นโมดัลของพญายมจะซ้อนกันแล้ว showModal พัง)
    if (!g.taught.includes(st.k)) g.taught.push(st.k);
    coachStep = null;
    g.save();
    bossModal(st.title, st.text + (st.hint ? `\n\n▸ ${st.hint}` : ''), 'รับทราบ');
    return;
  }
  const unread = available.filter(st => !g.taught.includes(st.k)).length;
  coachEl.hidden = false;
  coachEl.innerHTML = `<button class="coach-bell ${unread ? 'has-unread' : ''}" aria-label="${esc(t('coach.notice'))}">
    <img src="img/ui/icon-bell.png" alt="">${unread ? `<span class="coach-count">${unread}</span>` : ''}</button>`;
  coachEl.querySelector('button').onclick = openCoachInbox;
}

// ---------- ปุ่ม ----------
/** ปลดพักให้วาระเดิน — ต้องเรียก **ก่อน** เปิดกล่องฉากเปิด
 *  เพราะ pauseForDlg() จำค่า paused ตอนกล่องใบแรกเปิด แล้วคืนค่านั้นตอนปิด
 *  ถ้าเข้าเกมมาแบบพักอยู่ ค่าที่ถูกคืนก็คือ "พัก" ตลอดไป */
function resume() { userPaused = false; if (!g.over && g.paused) { g.paused = false; updatePlay(); } }

function finishPause() {
  autoPausePending = false;
  userPaused = false;
  if (pauseDlg.open) pauseDlg.close();
  releaseDlgPause();
  if (dlg.open) dlg.focus({ preventScroll:true });
}

function openPause(allowReplacing = false) {
  if (g.over || pauseDlg.open || (dlg.open && !allowReplacing)) return;
  autoPausePending = false;
  userPaused = true;
  pauseForDlg();
  pauseDlg.innerHTML = `<div class="pause-head">
      <strong>${esc(t('pause.title'))}</strong>
    </div>
    <nav class="pause-actions" aria-label="${esc(t('pause.title'))}">
      <button id="pause-home"><img src="img/ui/icon-home.png" alt=""><span>${esc(t('pause.home'))}</span></button>
      <button id="pause-resume"><img src="img/ui/icon-play.png" alt=""><span>${esc(t('pause.resume'))}</span></button>
      <button id="pause-settings"><img src="img/ui/icon-setting2.png" alt=""><span>${esc(t('pause.settings'))}</span></button>
      <button id="pause-more"><img src="img/ui/icon-book.png" alt=""><span>${esc(t('profile.more'))}</span></button>
    </nav>`;
  pauseDlg.querySelector('#pause-resume').onclick = finishPause;
  pauseDlg.querySelector('#pause-home').onclick = () => { finishPause(); goMenu(); };
  pauseDlg.querySelector('#pause-settings').onclick = () => { finishPause(); openSettings(); };
  pauseDlg.querySelector('#pause-more').onclick = () => { finishPause(); openLegacyDrawer(); };
  pauseDlg.showModal();
}

function pauseWhenLeaving() {
  if (!started || g.over || pauseDlg.open || autoPausePending) return;
  userPaused = true;
  autoPausePending = true;
  if (!g.paused) { g.paused = true; updatePlay(); }
}
function showAutoPause() {
  // visibilitychange can fire before the browser reports document focus again.
  // The tab being visible is enough to present the pause dialog on return.
  if (!autoPausePending || document.hidden || g.over) return;
  autoPausePending = false;
  openPause(dlg.open);
}
addEventListener('blur', pauseWhenLeaving);
addEventListener('focus', () => setTimeout(showAutoPause, 0));

function updatePlay() {
  const play = $('#play');
  play.textContent = t(g.courtClosed ? 'hud.openCourt' : 'hud.closeCourt');
  play.title = t(g.courtClosed ? 'hud.openCourtTip' : 'hud.closeCourtTip');
  // ปุ่มย้ายโซนโผล่เมื่อมีโซนอื่นเปิดให้จริง ๆ เท่านั้น — ไม่งั้นกดแล้วเจอแต่กุญแจ
  const z = $('#zone');
  if (z) {
    z.hidden = !g.zonesOpen().length;
    z.textContent = `🗺️ ย้ายโซน (${g.zoneDef().name})`;
  }
  const hudZone = $('#hud-zone');
  hudZone.hidden = !g.zonesOpen().length;
  hudZone.setAttribute('aria-label', t('hud.zone'));
  hudZone.title = t('hud.zone');
  const outfit = $('#outfit');
  if (outfit) outfit.hidden = g.outfitsOpen().length < 2;
  const bag = $('#bag');
  if (bag) {
    const n = Object.values(g.inventory || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    bag.textContent = `🎒 กระเป๋า${n ? ` (${n})` : ''}`;
  }
  // PAUSE ขวาบนเปิดหน้าต่างพักเสมอ; ปุ่มเปิด/ปิดศาลด้านล่างคุมเฉพาะคดีใหม่และการมาถึง
  const hp = $('#hud-pause-img');
  if (hp) hp.src = 'img/ui/icon-pause.png';
  const court = $('#hud-open-court');
  if (court) {
    court.textContent = t(g.courtClosed ? 'hud.openCourt' : 'hud.closeCourt');
    court.disabled = !!g.over;
    court.setAttribute('aria-pressed', String(!g.courtClosed));
    court.title = t(g.courtClosed ? 'hud.openCourtTip' : 'hud.closeCourtTip');
    court.setAttribute('aria-label', `${court.textContent} — ${court.title}`);
  }
}
function toggleCourt() {
  if (g.over) return;
  g.courtClosed = !g.courtClosed;
  updatePlay();
  refresh();
}
$('#play').onclick = toggleCourt;
$('#help').onclick = openHelp;
$('#zone').onclick = openZone;
const outfitButton = $('#outfit');
if (outfitButton) outfitButton.onclick = openOutfit;
$('#bag').onclick = openBag;
$('#settings').onclick = openSettings;
$('#menu').onclick = goMenu;

// ---------- ข้อ D ชุด 15 — ปุ่ม HUD ใหม่ (ไอคอนลอยบนแผนที่) ----------
// ปุ่มเดิม (#play/#help/#bag/#settings ฯลฯ) ยังอยู่ในโค้ด แค่ย้ายเข้า legacy-drawer (D.6)
// ปุ่มใหม่เรียกฟังก์ชันเดียวกันตรงๆ ไม่ได้สร้างกลไกซ้ำ
$('#hud-pause').onclick = openPause;
$('#hud-settings').onclick = () => openSettings();
$('#hud-book').onclick = () => openHelp();
$('#hud-bag').onclick = () => openBag();
$('#hud-zone').onclick = openZone;
$('#hud-open-court').onclick = toggleCourt;
$('#hud-trial').onclick = goTrial;

const legacyDrawer = $('#legacy-drawer');
function openLegacyDrawer() { legacyDrawer.hidden = false; }
function closeLegacyDrawer() { legacyDrawer.hidden = true; }
const heroProfile = $('#hero-profile');
function drawHeroProfile() {
  const face = artUrl('hero-yama-profile') || artUrl('hero-yama');
  $('#hero-profile-face').src = face;
  $('#hero-profile-standee').src = artUrl('hero-yama');
  $('#hero-profile-intro').innerHTML = `<h2>${esc(HERO_NAME)}</h2>
    <div class="profile-stars" aria-label="${esc(t('profile.rank'))}">${'★'.repeat(g.level)}${'☆'.repeat(Math.max(0, LEVELS.length - g.level))}</div>
    <strong>${esc(t('profile.rank'))} ${g.level}/${LEVELS.length} - ${esc(LEVELS[g.level - 1].name)}</strong>
    <p>${esc(t('profile.story'))}${esc(g.zoneDef().name)}</p><p>${esc(t('profile.duty'))}</p>`;
  const row = (img, value, label, extra = '') => `<div class="hero-profile-row">${img.startsWith('<') ? img : `<img src="${img}" alt="">`}<span class="profile-row-text"><b>${esc(value)}</b><small>${esc(label)}</small>${extra}</span></div>`;
  const hpBar = `<span class="hero-profile-hp"><i style="width:${Math.max(0, Math.min(100, 100 * g.hp / g.hpMax))}%"></i></span>`;
  const status = row('<span class="profile-emoji">❤️</span>', `${Math.round(g.hp)}/${g.hpMax}`, t('profile.hp'), hpBar)
    + row('img/ui/icon-coin.png', Math.round(g.coin), t('profile.coin'))
    + row('img/item-food.png', Math.round(g.food), t('profile.food'))
    + row('img/ui/icon-justice.png', Math.round(g.order), t('profile.order'))
    + row('img/ui/icon-skull.png', g.karma.toFixed(1), t('profile.karma'))
    + row('img/ui/icon-book.png', g.casesDone, t('profile.cases'));
  const attack = `${BATTLE.atk[0] + (g.level - 1) * 2}–${BATTLE.atk[1] + (g.level - 1) * 2}`;
  const lvBonus = (g.level - 1) * 2;
  const fireDmg = BATTLE.fireDmg + (g.abilities.bigFire ? 20 : 0) + lvBonus;
  const powerIcon = { roar:'img/icon-fang.png', mirror:'img/item-mirror.png', ice:'img/fx-ice.png', hypno:'img/fx-hypno.png' };
  const abilityRows = [
    ['flameCharge', 'img/fx-flame-charge.png', `${65 + (g.level - 1) * 3}`, 'charge'],
    ['windFan', 'img/fx-fan-wind.png', 'MP ' + BATTLE.mpCost.wind, 'wind'],
    ['rage', 'img/fx-rage.png', 'MP ' + BATTLE.mpCost.rage, 'rage'],
    ['valkyrieSpear', 'img/fx-valkyrie-spear.png', 'MP ' + BATTLE.mpCost.spear, 'spear'],
    ['cooldownClock', 'img/fx-clock-reset.png', 'MP ' + BATTLE.mpCost.clock, 'clock'],
  ].filter(([k]) => g.abilities[k]).map(([, img, v, key]) => row(img, v, t('profile.ab.' + key)));
  const powers = row('img/icon-sword.png', `${BATTLE.atk[0] + lvBonus}–${BATTLE.atk[1] + lvBonus}`, t('profile.attack'))
    + row('img/fx-fireball.png', fireDmg, `${t('profile.fire')} ×${g.fireAmmo}`)
    + abilityRows.join('')
    + POWERS.filter(p => !g.powerLocked(p)).map(p => row(powerIcon[p.k], p.name, t('profile.power.' + p.k))).join('');
  const carried = Object.entries(g.inventory || {}).filter(([k, n]) => n > 0 && ITEMS[k]);
  const bag = carried.length ? carried.map(([k, n]) => row(itemImg(k), `×${n}`, itemName(k))).join('') : `<small>${esc(t('profile.emptyBag'))}</small>`;
  const crew = g.crew.map(c => `<div class="hero-profile-row crew"><img src="${artUrl(`crew-${c.k}-profile`) || artUrl(`crew-${c.k}`)}" alt=""><span class="profile-row-text"><b>${esc(crewName(c, g.zone))}</b><small>${esc(c.reader ? c.duty : crewAbility(c.k))}</small><small>${esc(t('profile.wage'))} ${c.pay} · ${esc(t('profile.order'))} ${c.rabiab} · ${esc(t('profile.training'))} ${c.upLv || 0}</small></span></div>`).join('');
  const guard = `<div class="hero-profile-row crew"><img src="${artUrl('crew-guard-profile') || artUrl('crew-guard')}" alt=""><span class="profile-row-text"><b>${esc(GUARD.name)}</b><small>${esc(t('profile.guardTeam'))}</small><small>${esc(t('profile.attack'))} ${GUARD.battleAtk + (g.guard?.upLv || 0) * 2} · ${esc(t('profile.wage'))} ${GUARD.pay}</small></span></div>`;
  $('#hero-profile-columns').innerHTML = [
    [t('profile.status'), status], [t('profile.powers'), powers],
    [t('profile.bag'), bag], [t('profile.crew'), crew + guard]
  ].map(([title, content]) => `<section class="hero-profile-column"><h3>${esc(title)}</h3>${content}</section>`).join('');
}
function openHeroProfile() { drawHeroProfile(); heroProfile.hidden = false; }
function closeHeroProfile() { heroProfile.hidden = true; }
$('#hud-avatar').onclick = openHeroProfile;
$('#hero-profile-close').onclick = closeHeroProfile;
$('#hero-profile-pause').onclick = () => { closeHeroProfile(); openPause(); };
$('#legacy-drawer-close').onclick = closeLegacyDrawer;
legacyDrawer.addEventListener('click', e => { if (e.target === legacyDrawer) closeLegacyDrawer(); });

onLangChange(() => { updatePlay(); updateTrialBtn(); drawCoach(); if (!heroProfile.hidden) drawHeroProfile(); });

/** กลับไปหน้าเมนู — บันทึกก่อน แล้วโหลดใหม่โดยไม่ตั้งธง fresh
 *  หน้าปกจะขึ้นมาพร้อมปุ่ม "เล่นต่อ" (ต่างจากปุ่มเดิมที่ลบเซฟทิ้งเลย) */
function goMenu() {
  g.save();
  saveAt = Infinity;                       // กันลูปเฟรมเขียนเซฟทับตอนกำลังรีโหลด
  sessionStorage.removeItem('avegee.fresh');
  location.reload();
}

/** ปุ่มปิด/เปิดเสียงรวม — สลับได้ทันทีโดยไม่ต้องเข้าหน้าตั้งค่า */
function drawMute() {
  const b = $('#mute');
  if (!b) return;
  b.textContent = AUDIO.on ? '🔊 เสียง' : '🔇 ปิดเสียงอยู่';
  b.style.opacity = AUDIO.on ? '' : '.6';
}
$('#mute').onclick = () => {
  AUDIO.on = !AUDIO.on;
  syncBgm(); saveAudio(); drawMute();
  if (AUDIO.on) { unlock(); bgm(g.battle ? 'bgm-battle' : 'bgm-zone'); sfx('crack'); }
};
drawMute();

cv.onmousemove = e => {
  const [sx, sy] = toScene(cv, e);
  const def = hitStation(sx, sy);
  const frontier = hitFrontier(g, sx, sy);
  const actor = hitActor(g, sx, sy);
  hover = frontier ? FRONTIER.k : def ? def.k : null;
  cv.style.cursor = (def || frontier || actor) ? 'pointer' : 'default';
};
cv.onmouseleave = () => { hover = null; };
cv.onclick = e => {
  const [sx, sy] = toScene(cv, e);
  onSceneClick(sx, sy);
};

/** คลิกโซนบนฉาก — ใช้ร่วมกันทั้งสองมุมมอง */
function onSceneClick(sx, sy) {
  if (hitFrontier(g, sx, sy)) {
    const near = Math.hypot(g.player.x - FRONTIER.x, g.player.y - FRONTIER.y) <= FRONTIER.reach;
    if (near) return openFrontier();
    if (g.walkTo(FRONTIER.x, FRONTIER.y))
      g.log(`เดินไป${FRONTIER.name} — เข้าได้เมื่อยืนใกล้ซุ้มประตู`, 'act');
    else g.log(`${FRONTIER.name}อยู่ในจุดที่เดินไปไม่ถึง`, 'bad');
    return;
  }
  // B2b: ผู้ท้าชิง/ค่ายพักของศึกสุดท้ายมาก่อนป้ายสร้างอาคาร — ดงต้นงิ้วที่ยังไม่สร้างมีกรอบคลิกทับหัวหน้าโซน 3 อยู่
  if (g.finalEventOnMap()) {
    const fa = hitActor(g, sx, sy);
    if (fa?.kind === 'finalRest') {
      if (Math.hypot(g.player.x-fa.x,g.player.y-fa.y) <= INTERACTION_REACH) openStation('tea', true);
      else g.walkTo(fa.x,fa.y);
      return;
    }
    if (fa?.kind === 'finalEncounter') return openFinalEncounter(fa.key);
  }
  const def = hitStation(sx, sy);
  const st = def && g.stations.find(x => x.def.k === def.k);

  const enterStation = key => {
    const d = STATIONS.find(x => x.k === key);
    if (!d) return;
    const near = Math.hypot(g.player.x - d.x, g.player.y - d.y) <= INTERACTION_REACH;
    if (near) return openStation(key);
    if (g.walkTo(d.x, d.y))
      g.log(`เดินไปหา${d.name} — เข้าได้เมื่อยืนใกล้ทางเข้า`, 'act');
    else g.log(`${d.name}อยู่ในจุดที่เดินไปไม่ถึง`, 'bad');
  };

  // ป้าย "กดเพื่อสร้าง" มาก่อนทุกอย่าง — ตอนนั้นเรายืนอยู่ตรงจุดพอดี
  // ถ้าไปเช็คตัวละครก่อน คลิกยังไงก็โดนตัวเราเองเสมอ แล้วจะไม่มีทางกดสร้างได้เลย
  // ชุดที่ 10 (ข้อ E3) — เดิมเช็คแค่กรอบพื้น def.hit แต่ป้าย "กดตรงนี้เพื่อสร้าง" ลอยเหนือภาพสถานี
  // ซึ่งบางหลังลอยพ้นกรอบ def.hit ไปเลย ผู้เล่นกดตรงป้ายจริง ๆ แต่กรอบคลิก
  // อยู่คนละที่ กดเท่าไหร่ก็ไม่ติด (คุณเป้เจอที่หอส่องกรรมโซนบูรพา 25 ก.ย. 2569) — เพิ่ม hitBuildPrompt
  // เป็นทางเลือกที่สอง: ยืนใกล้พอ (nearBuild) แล้วคลิกโดนป้ายจริงที่วาดบนจอ ก็ให้เปิดกล่องสร้างได้เหมือนกัน
  if (def && !st && nearBuild(g, g.player.x, g.player.y)?.k === def.k) return openBuild(def);
  const buildSpot = nearBuild(g, g.player.x, g.player.y);
  if (buildSpot && (!def || def.k !== buildSpot.k) && hitBuildPrompt(ctx, buildSpot, sx, sy)) return openBuild(buildSpot);

  // คลิกโดนตัวไหนสักตัว = เอาขึ้นแผงข้อมูล (มาก่อนสถานี เพราะตัวละครยืนทับกรอบสถานีได้)
  const a = hitActor(g, sx, sy);
  if (a) {
    if (a.kind === 'station') { enterStation(a.key); return; }
    if (a.kind === 'zoneEvent') {
      if (a.key === 'devaTest') return openDevaAlert();
      const ev = (ZONE_EVENTS[g.zone] || []).find(e => e.k === a.key);
      if (ev) openZoneEventAlert(ev);
      return;
    }
    if (a.kind === 'merchant') {
      if (Math.hypot(g.player.x - MERCHANT.x, g.player.y - MERCHANT.y) <= INTERACTION_REACH) return openMerchant();
      g.walkTo(MERCHANT.x, MERCHANT.y); g.log(`เดินไปหา${MERCHANT.name} — ซื้อขายได้เมื่อยืนใกล้`, 'act'); return;
    }
    if (a.kind === 'bossPending') return openBossAlert();
    if (a.kind === 'eventRaider') {
      openRaiderAlert(a.key);
      return;
    }
    if (a.kind === 'boss') {
      if (g.bossPierCanTalk()) return openBossPier();
      g.walkTo(SPOTS.bossPier.x, SPOTS.bossPier.y); return;
    }
    if (a.kind === 'crew' && a.key === 'nira') {
      const c = g.crewOf('nira');
      if (c && Math.hypot(g.player.x - c.x, g.player.y - c.y) <= INTERACTION_REACH) return openNiraOffice();
      if (c) { g.walkTo(c.x, c.y); return; }
    }
    select(a);
    if (a.kind === 'mob') tryFight();      // เปรตนอกจากดูข้อมูลแล้วก็เข้าต่อสู้เลย
    refresh();
    return;
  }

  if (!def) {                                  // คลิกที่โล่ง = สั่งให้เดินไปตรงนั้น
    if (!g.walkTo(sx, sy))                     // อ้อมลาวาให้เอง · ไปไม่ได้จริงค่อยบอก
      g.log('ตรงนั้นเดินไปไม่ถึง — ต้องข้ามลาวาหรือแม่น้ำวิญญาณ', 'bad');
    return;
  }
  if (!st) {                                   // ยังไม่ได้สร้าง และยังยืนไม่ถึงจุด → เดินไปก่อน
    if (!g.walkTo(def.x, def.y)) g.log('ตรงนั้นเดินไปไม่ถึง', 'bad');
    return;
  }
  if (st.build) {
    return modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
      <p style="font-size:var(--text-sm);line-height:var(--leading-body)">กำลังก่อสร้างอยู่ — รออีกสักครู่</p>
      <div class="row"><button data-close>ปิด</button></div>`);
  }
  // อาคารที่สร้างแล้วต้องเดินไปถึงก่อน จึงเปิดฉากด้านในได้
  // คลิกจากไกล = สั่งเดินไปทางเข้า; เมื่อถึงแล้วคลิกอีกครั้งเพื่อเข้า
  return enterStation(def.k);
}

// เดินด้วยคีย์บอร์ดด้วยก็ได้
const KEY = {};
addEventListener('keydown', e => {
  if (dlg.open || /input|textarea/i.test(e.target.tagName)) return;
  KEY[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ' && !g.over) { tryFight(); }        // เว้นวรรค = สู้กับเปรตตนที่ใกล้ที่สุด
});
addEventListener('keyup', e => { KEY[e.key.toLowerCase()] = false; });

function keyWalk(dt) {
  const P = g.player, sp = 0.32 * dt;
  let dx = 0, dy = 0;
  if (KEY.a || KEY.arrowleft) dx -= 1;
  if (KEY.d || KEY.arrowright) dx += 1;
  if (KEY.w || KEY.arrowup) dy -= 1;
  if (KEY.s || KEY.arrowdown) dy += 1;
  if (!dx && !dy) return;
  const d = Math.hypot(dx, dy);
  stepTo(P, dx / d * sp, dy / d * sp, true);    // ลาวา/แม่น้ำ/ตัวยมทูตที่ยืนอยู่กันไว้ ชนแล้วไถลไปตามขอบ
  P.tx = null; P.path = null; g.huntMob = false; // กดปุ่มแล้วยกเลิกจุดหมายที่คลิกไว้ (รวมคำสั่งไล่เปรต)
  if (dx) P.face = dx < 0 ? -1 : 1;
}

/** ---------- หน้าของสถานีหนึ่งหลัง (9 ก.ย. 2569) ----------
 *  เจ้าของสั่ง: กดสถานีแล้วต้องเห็น "ฉากของหลังนั้น" พร้อมรายละเอียดว่ามันมีไว้ทำอะไร
 *  และมีอะไรให้กดจริง ๆ ตรงนั้น — ไม่ใช่กล่องข้อความสองบรรทัดเหมือนเดิม
 *  ฉากหลังคือ img/BG-<ชื่อคีย์>.jpeg ที่เจ้าของวาดมาเอง ไม่มีไฟล์ก็ถอยไปใช้เวทีกลาง */
const stBg = k => k === 'tea' ? teaBackground(g.zone) : artUrl(`BG-${k[0].toUpperCase()}${k.slice(1)}`, 'webp');   // โซนอื่นมีฉากห้องของตัวเองได้

/** จุดยึดของห้อง — ฉากห้องของโซนที่องค์ประกอบต่างจากโซน 1 มีชุดจุดยึดของตัวเองใน ROOMS[k].zones
 *  ใช้เฉพาะตอนที่ฉากของโซนนั้นมีจริง (ยังไม่มีไฟล์ = ใช้ฉากโซน 1 ก็ต้องใช้จุดยึดโซน 1) */
function roomFor(k) {
  if (k === 'tea') return teaRoom(g.zone);
  const base = ROOMS[k] || ROOM_DEFAULT;
  const cap = `BG-${k[0].toUpperCase()}${k.slice(1)}`;
  const own = base.zones && base.zones[g.zone];
  return own && stBg(k) !== `img/${cap}.webp` ? { ...base, ...own }
    : g.zone === 'th' && base.ui4 ? { ...base, ...base.ui4 } : base;
}

function openStation(k, emergency = false) {
  const def = STATIONS.find(d => d.k === k);
  const room = roomFor(k);
  const emergencyStation = emergency ? { def, slots:[], fire:0, build:0 } : null;
  const stationHere = () => g.stations.find(x => x.def.k === k) || emergencyStation;
  let myGen = -1;                       // รุ่นของกล่องที่หน้านี้เป็นเจ้าของ (ตั้งค่าหลัง openDlg)
  let R = null;                         // ตัวคุมฉากในห้อง (src/room.js)
  let mgOpen = false;                   // มินิเกม "เร่งการทำงาน" กำลังเปิดอยู่ไหม (ชุดที่ 9)
  let drawerMode = null;                // 29C: หน้าต่างรายชื่อ/ตรวจกรรมไม่ขึ้นเองตอนเข้าห้อง — ขึ้นเมื่อกดปุ่มเท่านั้น
                                         // กัน panels() ที่วาดใหม่ทุก 900ms เปิดปุ่มซ้ำจนเปิดเกมซ้อนกัน

  const mine = () => myGen < 0 || (dlg.open && dlgGen === myGen);
  // เขียน innerHTML เฉพาะตอนเนื้อหาเปลี่ยนจริง — panels() วาดซ้ำทุก 0.9 วินาที ปุ่มต้องไม่ถูกสร้างใหม่ใต้นิ้วผู้เล่น
  const put = (el, html) => { if (el._h === html) return; el._h = html; el.innerHTML = html; };

  /** เนื้อหาฝั่งซ้าย/ขวา — วาดใหม่ได้บ่อยโดยไม่แตะ canvas ของฉาก
   *  (ถ้าวาดทั้งกล่องใหม่ทุกครั้ง ตัวละครในห้องจะกระโดดกลับจุดเริ่มทุก 0.7 วินาที) */
  const panels = () => {
    const st = stationHere();
    if (!st) return;
    const cap = g.stCap(st);
    const inside = !!(R && R.inReach());

    // ---- ทุกอย่างในห้องวาดตามแบบ UI4: การ์ดหัวเรื่อง · ปุ่มทองกลางฉาก · แผงรายชื่อ (ตะราง/ประตูสวรรค์) ----
    const L = dlg.querySelector('#st-left'), Rg = dlg.querySelector('#st-right'),
          A = dlg.querySelector('#st-actions'), AL = dlg.querySelector('#st-alert');
    const row = (label, btn) => `<div class="st-row"><span>${label}</span>${btn}</div>`;
    const note = txt => `<div class="st-pane-note">${esc(txt)}</div>`;

    // 29M: ปุ่มซ่อมย้ายไปอยู่บนแผนที่ทุกสถานที่แล้ว (รวมตะราง/ประตูสวรรค์) — ในห้องเหลือแค่ปุ่มเยี่ยมนิรา
    if (AL) {
      if (g.niraRest && (k === 'tea' || (k === 'sala' && !g.stations.some(s => s.def.k === 'tea' && !s.build)))) {
        put(AL, `<button class="btn-gold" id="visit-nira-tea" ${g.niraRest.visited ? 'disabled' : ''}>🍵 ${g.niraRest.visited ? 'เยี่ยมนิราแล้ว' : 'เยี่ยมนิราที่กำลังพักฟื้น'}</button><small>พักอีก ${g.niraRest.remaining} วาระ</small>`);
        AL.querySelector('#visit-nira-tea').onclick = () => { g.visitNira(); panels(); };
      } else put(AL, '');
    }

    // ข้อมูลมินิเกม "เร่งการทำงาน" ของสถานีนี้ (เหตุผลที่กดไม่ได้ → ใช้แทนคำใต้ปุ่มชั่วคราว)
    const mgOn = !!(cap && MINIGAMES[k]);
    const mgWhy = !mgOn ? ''
      : mgOpen ? t('room.mgBusy')
      : (st.speedLv || 0) >= UPGRADES.max ? t('room.mgMaxed')
      : g.level < g.mgLevelNeed(st.speedLv || 0) ? t('room.mgLevel').replace('{n}', g.mgLevelNeed(st.speedLv || 0))
      : (st.mgCd || 0) > g.tick ? t('room.mgWait').replace('{n}', st.mgCd - g.tick) : '';
    const mgReady = mgOn && !mgWhy && g.mgReady(st);

    // ---- แผงด้านขวา (เปิดจากปุ่มในฉาก) ----
    let drawer = '';
    if (k === 'tarang') {
      const sentenced = g.sentences.filter(x => x.zone === g.zone && x.stage === 'prison');
      // ปุ่มตรวจ/ส่งตัวต้องยืนใกล้นิราในห้องก่อนถึงจะกดได้ (ดู room.js inReach)
      const rows = sentenced.map(x => {
        const name = esc(x.soul.name || x.soul.who), ready = g.tick >= (x.readyAt ?? x.until ?? 0);
        const needSawan = x.repentant && !g.stations.some(s => s.def.k === 'sawan' && !s.build);
        const status = x.inspected ? t(x.repentant ? 'room.repentant' : 'room.notRepentant')
          : ready ? '' : t('room.wait').replace('{n}', (x.readyAt ?? x.until) - g.tick);
        const label = `#${String(x.soul.id).padStart(3, '0')} ${name}${status ? ` · ${esc(status)}` : ''}${needSawan ? ` · ${esc(t('room.needSawan'))}` : ''}`;
        return row(label, x.inspected
          ? `<button class="btn-gold" data-prison-send="${x.soul.id}" ${inside && (!x.repentant || !needSawan) ? '' : 'disabled'}>${esc(t(x.repentant ? 'room.toGate' : 'room.toQueue'))}</button>`
          : `<button class="btn-gold" data-prison-check="${x.soul.id}" ${inside && ready ? '' : 'disabled'}>${esc(t('room.niraCheck'))}</button>`);
      }).join('');
      const heldHtml = g.held.length
        ? `<div class="st-pane-title">${esc(t('room.heldTitle').replace('{n}', g.held.length))}</div>`
          + g.held.map(h => row(esc(h.who), `<button class="btn-gold" data-rel="${h.id}">${esc(t('room.release'))}</button>`)).join('')
        : '';
      // 29C: ปุ่ม "ตรวจความเข็ดหลาบ" ถูกตัด — งานตรวจ/ส่งไปประตูสวรรค์ย้ายมารวมในหน้าต่างเดียวกับรายชื่อ
      drawer = `<div class="st-pane" data-pane="roster">
          <button class="st-drawer-x" type="button" data-drawer-close aria-label="${esc(t('room.close'))}">✕</button>
          ${heldHtml}
          <div class="st-pane-title">${esc(t('room.roster').replace('{n}', sentenced.length))}</div>
          ${sentenced.length && !inside ? note(t('room.nearNira')) : ''}${rows}
          ${!sentenced.length && !g.held.length ? note(t('room.noneHeld')) : ''}
        </div>`;
    }
    if (k === 'sawan') {
      const arrivals = g.sentences.filter(x => x.zone === g.zone && x.stage === 'gate');
      const rows = arrivals.map(x => {
        const name = esc(x.soul.name || x.soul.who);
        const label = `#${String(x.soul.id).padStart(3, '0')} ${name} · ${esc(x.checked ? t('room.karmaLeft').replace('{n}', x.karmaLeft) : t('room.gateWait'))}`;
        return row(label, x.checked
          ? `<button class="btn-gold" data-gate-send="${x.soul.id}" ${inside ? '' : 'disabled'}>${esc(t(x.karmaLeft > 0 ? 'room.toReborn' : 'room.toSky'))}</button>`
          : `<button class="btn-gold" data-gate-check="${x.soul.id}" ${inside ? '' : 'disabled'}>${esc(t('room.gateCheck'))}</button>`);
      }).join('');
      // ปุ่มของเกมที่แบบไม่มี: ดอกบัว + มินิเกมเร่งประตู — คงไว้ในแผงเดียวกัน
      // 29C: แถว "ให้ดอกบัว" แยกออกไปเป็นปุ่มลอยข้างบุญ (ดู npcTags ด้านล่าง) — หน้าต่างนี้เหลือรายการรอตรวจ + มินิเกม
      drawer = `<div class="st-pane" data-pane="inspect">
          <button class="st-drawer-x" type="button" data-drawer-close aria-label="${esc(t('room.close'))}">✕</button>
          <div class="st-pane-title">${esc(t('room.gateTitle').replace('{n}', arrivals.length))}</div>
          ${arrivals.length && !inside ? note(t('room.nearBoon')) : ''}${rows}
          ${mgOn ? row(esc(mgWhy || t('room.mgNote')),
            `<button class="btn-gold" data-mg="${k}" ${mgReady ? '' : 'disabled'}>${esc(t('room.mgBtn').replace('{n}', st.speedLv || 0))}</button>`) : ''}
        </div>`;
    }
    if (Rg) {
      put(Rg, drawer);
      Rg.hidden = !drawer || !drawerMode;
      Rg.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== drawerMode; });
    }

    // ---- การ์ดหัวเรื่อง (ซ้ายบน) ----
    if (L) L.dataset.room = k;
    if (L) put(L, `<h2>${esc(def.name)}</h2>
      <p>${esc(t(`room.${k}.desc`))}</p>
      ${def.tags.length ? `<p>${esc(t('room.karma').replace('{sins}', t(`room.${k}.sins`)))}</p>` : ''}
      ${def.tags.length ? `<p>${esc(t('room.capacity').replace('{n}', cap))}</p>` : ''}`);

    // ---- ปุ่มทองกลางฉาก (ตำแหน่ง = room.actions สัดส่วน 0-1 ของกรอบ) ----
    // spec = [ป้ายปุ่ม, คำใต้ปุ่ม, handler, กดไม่ได้?, คำแทนคำใต้ปุ่มตอนกดไม่ได้เพราะเงื่อนไขของเกม]
    if (A) {
      const toggle = mode => () => { drawerMode = drawerMode === mode ? null : mode; panels(); };
      const mp = k === 'krajok' ? g.powerOf('mirror') : null;
      const kanLeft = Math.max(0, (st.kanCd || 0) - g.tick);
      const specs = k === 'tarang' ? [      // 29C: ปุ่มจัดการรายชื่อย้ายไปลอยบนหัวนิรา (npcTags) — กลางฉากไม่มีปุ่มแล้ว
      ] : k === 'sala' ? [
        ['room.sala.action', null, () => { showArchive(true); sfx('stamp'); }, !inside, !inside ? t('room.nearArch') : ''],
        ['room.sala.action2', 'room.sala.hint2', () => openMinigame(k), !mgReady, mgWhy],
      ] : k === 'sawan' ? [
        ['room.sawan.action', 'room.sawan.hint', toggle('inspect')],
      ] : k === 'tea' ? [
        [R?.sitting() ? 'room.tea.rise' : 'room.tea.action', 'room.tea.hint', () => { R.setSit(!R.sitting()); panels(); },
          !R?.sitting() && (!inside || (g.hp >= g.hpMax && g.mp >= g.mpMax)),
          !R?.sitting() ? (g.hp >= g.hpMax && g.mp >= g.mpMax ? t('room.teaFull') : !inside ? t('room.nearTea') : '') : ''],
      ] : k === 'krajok' ? [
        ['room.krajok.action', 'room.krajok.hint', () => { if (g.talkKan()) { sfx('crack'); panels(); refresh(); } },
          !inside || g.powerLocked(mp) || mp.ammo >= mp.max || kanLeft > 0,
          g.powerLocked(mp) ? t('room.kanLocked').replace('{lv}', LEVELS[mp.lv - 1].name)
            : !inside ? t('room.nearKan') : mp.ammo >= mp.max ? t('room.kanFull')
            : kanLeft ? t('room.kanWait').replace('{n}', kanLeft) : ''],
      ] : [[`room.${k}.action`, `room.${k}.hint`, () => openMinigame(k), !mgReady, mgWhy]];
      if (k === 'tea') {
        const owned = !!g.teaBeds[g.zone], asleep = R?.sleeping();
        specs[0][3] ||= !!asleep;
        specs.push([asleep ? 'กำลังนอนพัก…' : owned ? 'นอนพัก' : `ซื้อที่นอน · ${TEA_BED_COST} เบี้ยกรรม`,
          null, () => { if (owned) R.setSleep(); else g.buyTeaBed(); panels(); },
          !!asleep || !!R?.sitting() || (owned ? !R?.nearBed() || g.hp >= g.hpMax
            : g.coin < TEA_BED_COST || !g.stations.some(st => st.def.k === 'tea' && !st.build)),
          asleep ? 'พักแป๊บเดียวแล้วเลือดเต็มทันที' : owned ? (R?.nearBed() ? 'นอนสั้น ๆ แล้วเลือดเต็ม' : 'เดินไปที่นอนก่อน')
            : 'อัปเกรดประจำโซน · นอนสั้น ๆ แล้วเลือดเต็ม']);
      }
      const hpLine = k === 'tea' ? `<span class="st-hpbar"><i id="st-hp-fill" style="width:${Math.max(0, Math.min(100, 100 * g.hp / g.hpMax))}%"></i></span>
          <span class="st-hp">${esc(t('trial.hp'))} <span id="st-hp-value">${Math.round(g.hp)}/${g.hpMax}</span></span>` : '';
      put(A, specs.map(([label, hint, , disabled, why], i) => {
        const [u, v] = room.actions?.[i] || [0.5, 0.5];
        const [ax, ay] = k === 'tea' && R ? R.anchor(u, v) : [u*100,v*100];
        const x = Math.max(12, Math.min(88, ax))/100, y = Math.max(15, Math.min(80, ay))/100;
        const sub = why || (hint ? t(hint) : '');
        return `<div class="st-action" style="--action-x:${x * 100}%;--action-y:${y * 100}%">
          <button class="btn-gold" data-room-action="${i}" ${disabled ? 'disabled' : ''}>${esc(t(label))}</button>
          ${sub ? `<small>${esc(sub)}</small>` : ''}${i === 0 ? hpLine : ''}
        </div>`;
      }).join(''));
      A.querySelectorAll('[data-room-action]').forEach(b => b.onclick = specs[+b.dataset.roomAction][2]);
    }

    // ---- ปุ่มลอยข้างตัวละครประจำห้อง (ชุด 29C) — ตะราง: "จัดการรายชื่อ" บนหัวนิรา · ประตูสวรรค์: "ให้ดอกบัว" ข้างบุญ ----
    // ตำแหน่งคิดจากจุดยืนของตัวละครในฉากจริง (R.anchor) จึงตามไปทุกขนาดจอ · วางในชั้น .st-npc ที่ทับบน canvas
    const N = dlg.querySelector('#st-npc');
    if (N && R) {
      const tags = [];
      if (k === 'tarang' && room.crew) {
        const [ax, ay] = R.anchor(room.crew[0], room.crew[1], R.crewHeight + 0.012);
        tags.push({ id:'manage', ax, ay, pos:'above', label:t('room.manage'), hint:t('room.manageHint'), pressed:drawerMode === 'roster' });
      }
      if (k === 'sawan' && room.crew) {
        const lotus = g.inventory.lotus || 0;
        const why = lotus <= 0 ? t('room.lotusNone') : g.karma <= 0 ? t('room.lotusNoKarma') : !inside ? t('room.nearBoon') : '';
        const boonX = room.crew[0] + (st.crewK === 'boon' ? 0.13 : 0);
        const [ax, ay] = R.anchor(boonX + 0.075, room.crew[1], R.crewHeight * 0.55);
        tags.push({ id:'lotus', ax, ay, pos:'side', label:t('room.lotus'), hint:why || t('room.lotusHint').replace('{n}', lotus), disabled:!!why });
      }
      put(N, tags.map(x => `<div class="st-npc-tag ${x.pos}" style="left:${x.ax.toFixed(2)}%;top:${x.ay.toFixed(2)}%">
          <button class="btn-gold" type="button" data-npc="${x.id}" ${x.disabled ? 'disabled' : ''} ${x.pressed ? 'aria-pressed="true"' : ''}>${esc(x.label)}</button>
          ${x.hint ? `<small${x.disabled ? ' class="reason"' : ''}>${esc(x.hint)}</small>` : ''}</div>`).join(''));
      const manageBtn = N.querySelector('[data-npc="manage"]'), lotusBtn = N.querySelector('[data-npc="lotus"]');
      if (manageBtn) manageBtn.onclick = () => { drawerMode = drawerMode === 'roster' ? null : 'roster'; panels(); if (drawerMode) dlg.querySelector('#st-right')?.scrollIntoView?.({ block:'nearest' }); };
      if (lotusBtn) lotusBtn.onclick = () => { if (g.offerLotusBoon()) { sfx('gong'); panels(); refresh(); } };
    }
    dlg.querySelectorAll('[data-drawer-close]').forEach(b => b.onclick = () => { drawerMode = null; panels(); });
    const on = (id, fn) => { const b = dlg.querySelector(id); if (b) b.onclick = fn; };
    dlg.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => {
      if (g.release(+b.dataset.rel)) { sfx('stamp'); panels(); refresh(); }
    });
    const afterCheck = ok => { if (ok) { sfx('stamp'); panels(); refresh(); } };
    dlg.querySelectorAll('[data-prison-check]').forEach(b => b.onclick = () => afterCheck(g.inspectPrison(+b.dataset.prisonCheck)));
    dlg.querySelectorAll('[data-prison-send]').forEach(b => b.onclick = () => afterCheck(g.moveFromPrison(+b.dataset.prisonSend)));
    dlg.querySelectorAll('[data-gate-check]').forEach(b => b.onclick = () => afterCheck(g.inspectGate(+b.dataset.gateCheck)));
    dlg.querySelectorAll('[data-gate-send]').forEach(b => b.onclick = () => afterCheck(g.resolveGate(+b.dataset.gateSend)));
    // ชุดที่ 9 — "เร่งการทำงาน" เป็นมินิเกม (data-mg) ไม่ใช่การจ่ายเบี้ย
    dlg.querySelectorAll('[data-mg]').forEach(b => b.onclick = () => openMinigame(b.dataset.mg));
    // แถบบารมี/ดาวยศใน HUD ล่างซ้าย
    const hpf = dlg.querySelector('#st-hud-hp');
    if (hpf) hpf.style.width = `${Math.max(0, Math.min(100, 100 * g.hp / g.hpMax))}%`;
    const lv = Math.min(3, Math.max(0, g.level || 1));
    dlg.querySelectorAll('#st-stars .rk-star').forEach(el => el.classList.toggle('on', Number(el.dataset.lv) <= lv));
  };

  /** แฟ้มทะเบียนกรรม — ประวัติทุกดวงที่เคยผ่านมือท่าน (เจ้าของสั่ง 10 ก.ย. 2569)
   *  ทับอยู่บนฉากในห้องเดียวกัน ไม่ใช่กล่องใหม่ — ปิดแล้วกลับมายืนที่เดิม */
  function showArchive(on) {
    const box = dlg.querySelector('#st-arch');
    if (!box) return;
    box.hidden = !on;
    if (!on) return;
    dlg.querySelector('.st-hud')?.scrollTo?.(0, 0);   // จอแคบ: แฟ้มเปิดทับทั้งจอ ต้องเลื่อนกลับบนสุดก่อน
    const L = [...g.ledger].reverse();               // ล่าสุดอยู่บนสุด
    const five = L.filter(x => x.stars === 5).length;
    const over = L.filter(x => x.over > 0).length;
    const short = L.filter(x => x.short > 0).length;
    const wrong = L.filter(x => x.tham < 40).length;
    // คำตัดสินของพ่อ — รวมทั้งแฟ้ม (ข้อ 2 ของเจ้าของ 11 ก.ย. 2569)
    const byDad = {};
    for (const x of L) { const k = dadGrade(x); byDad[k] = (byDad[k] || 0) + 1; }
    const overVaras = L.reduce((a, x) => a + (x.over || 0), 0);
    const shortVaras = L.reduce((a, x) => a + (x.short || 0), 0);
    const passed = (byDad.great || 0) + (byDad.ok || 0);
    const rows = L.map(x => {
      const cl = g.closed.find(c => c.soul.id === x.id);
      const stars = '★'.repeat(x.stars ?? 0) + '☆'.repeat(5 - (x.stars ?? 0));
      const col = x.stars >= 4 ? 'var(--success)' : x.stars <= 1 ? 'var(--destructive)' : 'var(--gold)';
      const deeds = cl ? cl.soul.deeds.map(d => esc(d.t)).join(' · ') : '';
      const gr = dadGrade(x), tag = DAD_TAG[gr] || DAD_TAG.ok;
      // คลาดไปกี่วาระ — เลขเดียวที่เจ้าของถามหาตรง ๆ ("เราตัดสินผิดไปเท่าไร")
      const miss = (x.over || 0) - (x.short || 0);
      const missTxt = miss > 0 ? `หนักเกินไป ${miss} วาระ`
                    : miss < 0 ? `เบาไป ${-miss} วาระ`
                    : 'จำนวนวาระตรงพอดี';
      return `<div class="arch-row">
        <div class="arch-top">
          <b>#${String(x.id).padStart(3, '0')} ${esc(x.who)}</b>
          <span style="color:${col}">${stars}</span>
          <span class="arch-meta">${x.score} คะแนน · วาระที่ ${x.tick}</span>
        </div>
        <div class="arch-meta">สมควร ${x.deserved} วาระ · ท่านให้ไป ${x.deserved + x.over - x.short}
          ${x.over > 0 ? `<b style="color:var(--destructive)">เกิน ${x.over} · กรรมตกมา +${x.karma}</b>` : ''}
          ${x.short > 0 ? `<b style="color:var(--warning)">เบาไป ${x.short}</b>` : ''}
          ${x.tham < 40 ? '<b style="color:var(--destructive)">ส่งผิดชนิดกรรม</b>' : ''}
          ${x.back ? '<b style="color:var(--destructive)">กลับมารอบสอง</b>' : ''}</div>
        ${deeds ? `<div class="arch-deed">${deeds}</div>` : ''}
        <div class="arch-dad" style="border-left-color:${tag.c}">
          <b style="color:${tag.c}">👑 ${tag.t}</b> · ${esc(missTxt)}
          <span>${esc((BOSS_LINE[gr] || BOSS_LINE.ok).replace(/\s+—\s+.*$/, ''))}</span>
        </div>
      </div>`;
    }).join('');
    box.innerHTML = `
      <div class="arch-head">
        <b>📜 แฟ้มทะเบียนกรรม — โซน${esc(g.zoneDef().name.replace(/^โซน/, ''))}</b>
        <button id="s-arch-x">✕ ปิดแฟ้ม</button>
      </div>
      <div class="arch-sum">ปิดคดีแล้ว ${g.casesDone} เรื่อง · ห้าดาว ${five} ·
        ลงเกินกรรม ${over} · เบาไป ${short} · ส่งผิดชนิดกรรม ${wrong} ·
        กลับมาใหม่ ${g.returned}</div>
      <div class="arch-dadsum">
        <b>👑 พ่อว่าอย่างไรบ้าง</b>
        ${L.length ? `ผ่านสายตาท่าน <b style="color:var(--success)">${passed}</b> จาก ${L.length} เรื่อง` +
          ` (ตรงกรรม ${byDad.great || 0} · ใช้ได้ ${byDad.ok || 0})` +
          ` · ท่านติงว่าลงเกินกรรม <b style="color:var(--destructive)">${byDad.cruel || 0}</b>` +
          ` · ตีกลับ <b style="color:var(--destructive)">${(byDad.bad || 0) + (byDad.terrible || 0)}</b>` +
          `<br>รวมแล้วท่านลงหนักเกินไป <b>${overVaras}</b> วาระ และเบาไป <b>${shortVaras}</b> วาระ`
          : 'ยังไม่มีเรื่องให้ท่านอ่าน'}
      </div>
      <div class="arch-list">${rows || '<div class="arch-meta">แฟ้มยังว่างเปล่า — ท่านยังไม่ได้ตัดสินใครเลย</div>'}</div>`;
    box.querySelector('#s-arch-x').onclick = () => showArchive(false);
  }

  /** มินิเกม "เร่งการทำงาน" — ทับอยู่บนฉากในกล่องเดียวกัน ไม่ใช่กล่องใหม่ (แนวเดียวกับ showArchive ด้านบน)
   *  ชุดที่ 9 คุณเป้ 24 ก.ย. 2569: มีคำอธิบาย 1 บรรทัด + ปุ่ม "เริ่มเลย" ก่อนตัวจับเวลาในเกมเริ่มนับ
   *  ปิดได้ทุกเมื่อไม่มีบทลงโทษ — cooldown ตั้งเฉพาะตอน "เล่นจบจริง" (ชนะ/แพ้) เท่านั้น ดู g.finishMinigame()
   *  ระหว่างเล่น: ห้องล็อกอินพุต (R.lock) กันเว้นวรรค/ลูกศรชนกับปุ่มมินิเกม — ส่วนเกมหลัก (g.step()) เดินต่อ
   *  ตามปกติไม่พัก (หน้าสถานีนี้ไม่เคยเรียก pauseForDlg() อยู่แล้วตั้งแต่ต้น) เลือกแบบนี้เพราะปลอดภัยสุด
   *  ไม่ต้องแตะ pauseForDlg/releaseDlgPause ที่เคยมีบั๊กเกมค้างมาก่อน (ดูคอมเมนต์ยาวเหนือฟังก์ชันนั้น) */
  function openMinigame(sk) {
    const stx = g.stations.find(x => x.def.k === sk);
    const game = MINIGAMES[sk];
    const ov = dlg.querySelector('#mg-ov');
    if (!stx || !game || !ov || mgOpen || !g.mgReady(stx)) return;

    mgOpen = true;
    let cleanup = null, closed = false;
    const teardown = () => {
      cleanup?.(); cleanup = null;
      R?.lock?.(false);
      ov.hidden = true; ov.innerHTML = '';
      mgOpen = false;
    };
    const finish = won => {
      if (closed) return; closed = true;
      teardown();
      g.finishMinigame(sk, won);
      sfx(won ? 'coin' : 'crack');
      panels(); refresh();
    };
    const quit = () => {
      if (closed) return; closed = true;
      teardown();
      panels();
    };

    R?.lock?.(true);
    dlg.querySelector('.st-hud')?.scrollTo?.(0, 0);   // จอแคบ: มินิเกมเปิดทับทั้งจอ ต้องเลื่อนกลับบนสุดก่อน
    ov.hidden = false;
    ov.innerHTML = `
      <div class="mg-head"><b>${game.icon || '🎮'} ${esc(game.name)}</b><button class="mg-x" type="button">✕ ปิด</button></div>
      <div class="mg-intro">
        <p class="mg-tip">${esc(game.tip)}</p>
        <button class="gold mg-start" type="button">▶ เริ่มเลย</button>
      </div>
      <div class="mg-stage" hidden></div>`;
    ov.querySelector('.mg-x').onclick = quit;
    ov.querySelector('.mg-start').onclick = () => {
      if (closed) return;
      ov.querySelector('.mg-intro').hidden = true;
      const stage = ov.querySelector('.mg-stage');
      stage.hidden = false;
      cleanup = game.run(stage, {
        level: stx.speedLv || 0, alive: mine,
        onWin: () => finish(true), onLose: () => finish(false),
      });
    };
  }

  // ---- โครงของหน้า วาดครั้งเดียว: canvas ของฉากต้องไม่ถูกสร้างใหม่ ----
  dlg.innerHTML = `
    <div class="hud st-hud zone1-room" data-room="${k}">
      <div class="st-room"><canvas id="st-cv" width="900" height="620"></canvas>
        <button id="st-exit" class="st-exit" hidden>ออกไปแผนที่</button>
        <div class="st-arch" id="st-arch" hidden></div>
        <div class="mg-ov" id="mg-ov" hidden></div>
        <div class="st-npc" id="st-npc"></div></div>
      <div class="st-card" id="st-left"></div>
      <div id="st-actions"></div>
      <div class="st-drawer" id="st-right" hidden></div>
      <div class="st-alert" id="st-alert"></div>
      <div class="st-controls">
        <button id="st-pause" class="st-icon-btn" aria-label="${esc(t('hud.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>
      </div>
      <div class="st-bottom-left">
        <div class="st-avatar"><span class="st-ava-row"><img src="img/hero-yama-profile.png" alt=""><span class="hud-rank-stars" id="st-stars"><i class="rk-star" data-lv="1">★</i><i class="rk-star" data-lv="2">★</i><i class="rk-star" data-lv="3">★</i></span></span>
          <span class="hud-hpbar"><i id="st-hud-hp"></i></span><small>${esc(HERO_NAME)}</small></div>
        <button id="st-book" class="st-hud-item" aria-label="${esc(t('room.hud.book'))}"><img src="img/ui/icon-book.png" alt=""><span>${esc(t('room.hud.book'))}</span></button>
        <button id="st-bag" class="st-hud-item" aria-label="${esc(t('hud.bag'))}"><img src="img/ui/icon-bag.png" alt=""><span>${esc(t('hud.bag'))}</span></button>
      </div>
    </div>`;
  openDlg('hudwrap');           // กรอบเดียวกับห้องสอบสวน — .hud ต้องการกรอบใสเต็มความกว้าง
  myGen = dlgGen;
  document.activeElement?.blur?.();     // กล่องโฟกัสปุ่มแรกให้เอง — ไม่ให้เห็นกรอบโฟกัสบนปุ่มพักตั้งแต่เปิด
  dlg.querySelector('#st-pause').onclick = () => { dlg.close(); openPause(); };
  dlg.querySelector('#st-book').onclick = () => { dlg.close(); openHelp(); };
  dlg.querySelector('#st-bag').onclick = () => { dlg.close(); openBag(); };

  const cv2 = dlg.querySelector('#st-cv');
  R = makeRoom(cv2, g, def, room, stBg(k), artUrl('BG-Turn-Base', 'webp'), mine);
  R.st = stationHere();
  R.onAct = () => {
    // ศาลาน้ำชา: เว้นวรรค/ปุ่มขวาที่จุดนั่งสลับนั่ง-ลุกได้เลย ไม่ต้องไล่กดปุ่มในแผงขวา (ข้อ A 24 ก.ย. 2569)
    if (R.sleeping()) return;
    if (R.canSit && R.nearBed() && g.teaBeds[g.zone]) { R.setSleep(); panels(); return; }
    if (R.canSit) { R.setSit(!R.sitting()); panels(); return; }
    panels();           // เว้นวรรคในห้องเปิดข้อมูลล่าสุด; การส่งวิญญาณต้องกดเลือกชื่อ
  };
  R.onCollect = () => { panels(); refresh(); };
  if (emergency) R.setSleep(true);
  let wasNear = null, wasSitting = false, wasSleeping = R.sleeping();
  const exit = roomExit(k, g.zone, room);
  const exitBtn = dlg.querySelector('#st-exit');
  if (exitBtn) exitBtn.onclick = () => {
    if (!mgOpen && nearRoomExit(R.pos(), exit)) dlg.close();
  };
  R.onFrame = near => {
    if (exitBtn) {
      exitBtn.hidden = mgOpen || R.sleeping() || !nearRoomExit(R.pos(), exit);
      const [left, top] = R.project(R.pos());
      const width = cv2.getBoundingClientRect().width;
      const half = exitBtn.offsetWidth / 2 + 8;
      exitBtn.style.left = `${Math.max(half, Math.min(width - half, left))}px`;
      exitBtn.style.top = `${Math.max(exitBtn.offsetHeight + 8, top - 42)}px`;
    }
    // นั่งอยู่ — บารมีขยับทุกเฟรมจริง (room.js เขียนตรงที่ g.hp โดยไม่ผ่าน onChange/refresh()
    // เพราะตั้งใจให้ฟื้นต่อได้แม้เกมพักอยู่กับกล่องโมดัล — ดู room.js setSit) อัปเดตเฉพาะตัวเลข
    // แบบเบา ๆ ไม่วาดทั้งแผงใหม่ทุกเฟรม แต่ต้องอัปเดต "ทั้งสองที่" พร้อมกัน:
    // ป้ายในหน้าต่างศาลา (#st-hp-chip) กับแถบหลักด้านหลัง (#res-hp-chip) — ไม่งั้นสองที่ไม่ตรงกัน
    // ระหว่างนั่ง (ข้อ C คุณเป้ 24 ก.ย. 2569 — ก่อนแก้ แถบหลักค้างค่าเก่าเพราะไม่มีอะไรเรียก refresh()
    // จนกว่าจะมี action อื่นที่ผ่าน g.onChange() บังเอิญเกิดขึ้น)
    if (R.sitting() || R.sleeping()) {
      const barHtml = bar(100 * g.hp / g.hpMax, 'hp'), num = Math.round(g.hp);
      const pct = Math.max(0, Math.min(100, 100 * g.hp / g.hpMax));
      const fill = dlg.querySelector('#st-hp-fill'); if (fill) fill.style.width = `${pct}%`;
      const val = dlg.querySelector('#st-hp-value'); if (val) val.textContent = `${num}/${g.hpMax}`;
      const hud = dlg.querySelector('#st-hud-hp'); if (hud) hud.style.width = `${pct}%`;
      const outer = document.querySelector('#res-hp-chip');
      if (outer) outer.innerHTML = `❤️ บารมี ${barHtml} <b>${num}</b>`;
    }
    if (R.sleeping() !== wasSleeping) { wasSleeping = R.sleeping(); panels(); refresh(); }
    if (R.sitting() !== wasSitting) { wasSitting = R.sitting(); panels(); }  // เต็มแล้วลุกเอง → วาดปุ่มใหม่
    if (near === wasNear) return;     // แตะ DOM เฉพาะตอนสถานะเปลี่ยนจริง
    wasNear = near; panels();
  };
  R.start();
  window.__room = R;            // ไว้ส่องตอนดีบักในเบราว์เซอร์ เหมือน window.G
  const noSleepExit = e => { if (R.sleeping()) e.preventDefault(); };
  dlg.addEventListener('cancel', noSleepExit);
  const controls = dlg.querySelectorAll('.st-controls button, .st-hud-item');
  for (const b of controls) { const action = b.onclick; b.onclick = e => { if (!R.sleeping()) action?.(e); }; }
  panels();
  // ปิดหน้าต่างศาลาแล้วแถบหลักต้องเห็นค่าล่าสุดแน่ ๆ ไม่ว่าจะนั่งพักหรือทำอะไรในนี้มา (ข้อ C)
  // refresh() วาดใหม่จาก g ปัจจุบันเฉย ๆ ไม่แตะ dlg เลย เรียกตอนปิดกี่ครั้ง/กล่องไหนก็ปลอดภัย
  dlg.addEventListener('close', () => { if (!mine()) dlg.removeEventListener('cancel', noSleepExit); refresh(); }, { once: true });

  // แผงข้อมูลอัปเดตตามวาระที่เดินอยู่ (ทัณฑ์คืบหน้า · ไฟไหม้ · คิว)
  const tm = setInterval(() => {
    if (!mine()) { clearInterval(tm); return; }
    const st = stationHere();
    if (!st) { dlg.close(); return; }
    R.st = st;
    panels();
  }, 900);
  // ไม่ผูกการเก็บกวาดไว้กับ event close — ทั้งลูปเฟรมและตัวจับเวลาเช็ค mine() เองอยู่แล้ว
  // (close ยิงแบบ async · ใบที่ปิดไปตอน openDlg จะมาถึงหลังกล่องใหม่เปิด แล้วเก็บของใหม่ทิ้ง)
}

function openBuild(def) {
  const worker = g.availableBuilder();
  const zoneBlock = g.zone === 'west' && g.zoneEventStatus('westHypnotized') !== 'cleared' ? t('build.westBlocked')
                  : !g.zoneCaptivesFree() ? t('build.captivesBlocked') : '';
  const afford = g.coin >= def.cost && !!worker && !zoneBlock;
  const builderNames = ['taan', 'dam'].map(k => crewName(CREW.find(c => c.k === k), g.zone)).join(' / ');
  const builderHint = worker ? `${worker.name}จะเดินมาสร้างให้`
    : g.builders().length ? 'ช่างทุกคนติดงานอื่นอยู่ — รอคนใดคนหนึ่งว่างก่อน'
    : `ต้องจ้าง${builderNames}ที่โต๊ะนิราก่อน`;
  modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">${esc(def.desc)}</p>
    <div class="hint">${def.tags.length ? 'ตรงกรรม: ' + def.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}
      · แรง ${def.pow} · ${esc(builderHint)}</div>
    ${zoneBlock ? `<div class="hint" style="color:var(--gold)">${esc(zoneBlock)}</div>` : ''}
    <div class="row"><button data-close>ยังไม่สร้าง</button>
      <button class="gold" id="bd" ${afford ? '' : 'disabled'}>สร้าง ${def.cost} เบี้ยกรรม</button></div>`,
    d => { const b = d.querySelector('#bd'); if (b) b.onclick = () => { g.build(def.k); dlg.close(); refresh(); }; });
}

/** หน้าต่างเลื่อนขั้น — บอกเป็นรายการว่าได้ความสามารถอะไรเพิ่ม (ข้อ 1 ของเจ้าของ 11 ก.ย. 2569)
 *  รายการมาจาก LEVELS[].gains ซึ่งต้องตรงกับที่ checkLevel() ใน game.js ทำจริง
 *  โซนที่เพิ่งเปิดอ่านจาก ZONES ตอนนี้เลย ไม่ hardcode — เพิ่มโซนใหม่แล้วบรรทัดนี้ตามเอง
 *  (g.level ถูกบวกไปแล้วตอนเรียกถึงตรงนี้ ขั้นก่อนหน้าจึงเป็น g.level - 2) */
function openLevelUp(lv) {
  pauseForDlg();
  sfx('star');
  const prev = LEVELS[g.level - 2];
  const zonesNew = g.pendingZoneOpen || [];
  g.pendingZoneOpen = null;                 // บอกในกล่องนี้แล้ว ไม่ต้องเด้งซ้ำอีกกล่อง
  const rows = [
    ...(lv.gains || []),
    ...zonesNew.map(z => ({ g: '🗺️', t: `เปิด${z.name}ให้ท่านคุม`,
                            d: `${z.sub ? `${z.sub} · ` : ''}กดปุ่ม 🗺️ ย้ายโซน ใต้ฉากเมื่อไหร่ก็ได้ ` +
                               'สาขาที่ทิ้งไว้ถูกเก็บไว้ให้ ย้ายกลับมาเมื่อไหร่ก็ยังอยู่' })),
  ];
  const face = artUrl('hero-yama-profile') || artUrl('hero-yama');
  modal(`<h2>🎖️ เลื่อนขั้น</h2>
    <div class="lvup">
      <img src="${face}" alt="" onerror="this.onerror=function(){this.remove()};this.src='${artUrl('hero-yama')}'">
      <div class="rank">
        ${prev ? `<div class="from">จาก ${esc(prev.name)}</div>` : ''}
        <div class="to">${esc(lv.name)}</div>
      </div>
    </div>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body);margin:0 0 var(--space-3)">
      "สำนวนที่เจ้าตัดสินถูก ข้านับอยู่ทุกเรื่อง" — พญายมยื่นของให้โดยไม่อธิบาย</p>
    <div style="font-size:var(--text-xs);color:var(--muted-foreground);margin-bottom:6px">ท่านได้เพิ่ม</div>
    ${rows.length
      ? rows.map(r => `<div class="gain"><span class="g">${esc(r.g)}</span>
          <span class="n"><b>${esc(r.t)}</b><span>${esc(r.d)}</span></span></div>`).join('')
      : '<div class="hint">ขั้นนี้ยังไม่มีของแถม — แต่ชื่อขั้นของท่านเปลี่ยนแล้ว</div>'}
    <div class="row"><button class="gold" data-close>รับไว้</button></div>`);
}

/** Reuses the intro's page layout for both battle interludes and victory scenes. */
function renderStoryComic(root, story, onDone) {
  let page = 0, done = false;
  const finish = () => { if (!done) { done = true; onDone(); } };
  const paint = () => {
    const p = story.pages[page];
    root.innerHTML = `<div class="intro-comic" role="region" aria-label="${esc(story.title)} หน้า ${page + 1} จาก ${story.pages.length}">
      <div class="intro-comic-frame"><img src="${p.image}" alt="${esc(p.title)}">
        <div class="intro-comic-head"><span>${esc(story.title)}</span><span>${page + 1} / ${story.pages.length}</span></div>
      </div><div class="intro-comic-caption"><h2>${esc(p.title)}</h2><p>${esc(p.line)}</p></div>
      <div class="intro-comic-controls"><button data-story-skip>ข้ามฉาก</button>
        <button data-story-back ${page ? '' : 'disabled'}>← ย้อนกลับ</button>
        <button class="gold" data-story-next>${page + 1 === story.pages.length ? 'ดำเนินเรื่องต่อ' : 'หน้าถัดไป →'}</button></div></div>`;
    prepareComicImages(root);
    root.querySelector('[data-story-skip]').onclick = finish;
    root.querySelector('[data-story-back]').onclick = () => { if (page) { page--; paint(); } };
    root.querySelector('[data-story-next]').onclick = () => { if (++page === story.pages.length) finish(); else paint(); };
  };
  paint();
}

// ---------- หน้าต่างรางวัลหลังชนะปีศาจ/บอส (ชุด 28B) ----------
// game.js ตั้ง g.pendingReward ตอน endBattle (ค่าจากส่วนต่างจริง ไม่ใช่เดา) → g.onChange เด้งกล่องนี้
// หลังเรื่องราวจบแล้วเสมอ (คิวเรื่องราวมาก่อน) จากนั้นหน้าต่างอธิบายของใหม่/เลื่อนขั้นค่อยตามมา
// ปิดกล่อง (ปุ่มรับรางวัล / ปุ่ม × มุมขวาบนที่ MutationObserver วางให้ทุกกล่อง / Esc) = เคลียร์ g.pendingReward แล้วปล่อยคิวถัดไป · ฟังก์ชันที่ค้างรอไว้ (rewardAfter) ทำงานหลังกล่องนี้
const ABILITY_FX = Object.fromEntries(Object.entries(ABILITY_REWARDS).map(([k, d]) => [k, d.image]));
let rewardAfter = null, rewardOpen = false;
function afterReward(fn) { if (g.pendingReward || rewardOpen) rewardAfter = fn; else fn(); }
function openBattleReward() {
  const r = g.pendingReward;
  if (!r || rewardOpen || dlg.open) return;
  rewardOpen = true;
  sfx('star');
  const rows = [];
  if (r.coin > 0) rows.push(`<div class="reward-row"><img src="img/ui/icon-coin.png" alt=""><span><b>${esc(t('reward.coin'))}</b></span><span class="amt">+${Math.round(r.coin)}</span></div>`);
  if (r.exp > 0) rows.push(`<div class="reward-row"><span class="badge">EXP</span><span><b>${esc(t('reward.exp'))}</b></span><span class="amt">+${r.exp}</span></div>`);
  for (const it of r.items) if (ITEMS[it.k]) rows.push(`<div class="reward-row">${itemImg(it.k)}<span><b>${esc(itemName(it.k))}</b></span><span class="amt">×${it.n}</span></div>`);
  for (const k of r.abilities) rows.push(`<div class="reward-row power">${ABILITY_FX[k] ? `<img src="${ABILITY_FX[k]}" alt="">` : '<span class="badge">+</span>'}<span><b>${esc(t('power.' + k))}</b><small>${esc(t('reward.power'))}</small></span></div>`);
  if (!r.items.length && !r.abilities.length) rows.push(`<div class="reward-none">${esc(t('reward.noDrop'))}</div>`);
  modal(`<h2>${esc(t('reward.title'))}</h2>
    <p class="reward-who">${esc(r.who || '')}</p>
    <div class="reward-list">${rows.join('')}</div>
    <div class="row"><button class="gold" data-close>${esc(t('reward.claim'))}</button></div>`, null, 'battle-reward');
  // ระวัง: event 'close' ของฉากต่อสู้ที่เพิ่งปิด (dlg.close() ใน finish) มาถึง "หลัง" กล่องนี้เปิดแล้ว (ยิงแบบ async)
  // onDlgClose ธรรมดาจึงตีความว่ากล่องรางวัลปิดทันที — ต้องข้ามเมื่อกล่องยังเปิดอยู่และเป็นรุ่นเดียวกัน (เหมือน showPendingStory)
  const gen = dlgGen;
  const closed = () => {
    if (dlg.open && gen === dlgGen) return;
    dlg.removeEventListener('close', closed);
    rewardOpen = false;
    if (r.encounter) { if (!g.acknowledgeFinalReward()) { g.onChange(); return; } }
    else g.pendingReward = null;
    const next = rewardAfter; rewardAfter = null;
    g.onChange();                                   // ปล่อยหน้าต่างถัดไปในคิว (เลื่อนขั้น/โซน/...)
    if (next) { if (dlg.open) onDlgClose(next); else next(); }
  };
  dlg.addEventListener('close', closed);
}

function showPendingStory() {
  const pending = g.storyQueue[0];
  if (!pending || storyPlaying || dlg.open || g.battle) return;
  storyPlaying = true;
  const closed = next => {
    const gen = dlgGen;
    const handler = () => {
      if (dlg.open || gen !== dlgGen) return;
      dlg.removeEventListener('close', handler);
      storyPlaying = false;
      next(); g.save();
      setTimeout(() => g.onChange(), 0);
    };
    dlg.addEventListener('close', handler);
  };
  if (pending.stage === 'comic' && STORY[pending.key]) {
    pauseForDlg(); openDlg('intro-comic-dialog');
    renderStoryComic(dlg, STORY[pending.key], () => dlg.close());
    closed(() => {
      g.completeStory();
    });
    return;
  }
  storyPlaying = false;
  g.completeStory();
  setTimeout(() => g.onChange(), 0);
}

function openDiscovery() {
  const id = g.discoveryQueue[0];
  if (!id || dlg.open || g.battle || g.pendingReward || rewardOpen) return;
  const [kind, k] = id.split(':');
  const def = kind === 'item' ? ITEMS[k] : kind === 'power' ? POWERS.find(p => p.k === k) : ABILITY_REWARDS[k];
  if (!def) { g.acknowledgeDiscovery(id); return; }
  pauseForDlg();
  const icon = kind === 'item' ? itemImg(k, 'style="width:96px;height:96px;object-fit:contain"')
    : `<img src="${def.image || (def.glyph.startsWith('img/') ? def.glyph : k === 'mirror' ? 'img/item-mirror.png' : `img/fx-${k}.png`)}" alt="" style="width:96px;height:96px;object-fit:contain" onerror="this.onerror=null;this.src='${placeholderSrc('พลัง')}'">`;
  modal(`<h2>✨ ได้${kind === 'item' ? 'ไอเท็ม' : 'พลัง'}ใหม่ · ${esc(def.name)}</h2>
    ${icon}<p><b>ใช้ทำอะไร:</b> ${esc(def.desc || def.text || def.say)}</p>
    <p><b>วิธีใช้:</b> ${esc(def.howTo)}</p>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`, null, 'discovery');
  const gen = dlgGen;
  const closed = () => {
    if (dlg.open || gen !== dlgGen) return;
    dlg.removeEventListener('close', closed);
    g.acknowledgeDiscovery(id);
    setTimeout(() => g.onChange(), 0);
  };
  dlg.addEventListener('close', closed);
}

function openDefeatRecovery() {
  const recovery = g.pendingRecovery;
  if (!recovery || dlg.open || g.battle) return;
  if (recovery.stage === 'sleep') { openStation('tea', true); return; }
  modal(`<div style="position:relative;min-height:60vh;display:grid;place-items:center;overflow:hidden;background:#160c20">
    <img src="${esc(recovery.bg || teaBackground(recovery.zone))}" alt="" style="position:absolute;width:100%;height:100%;object-fit:cover;opacity:.35">
    <img src="${yamaDownImage(recovery.outfit)}" alt="ยมบาทน้อยนอนสลบ" style="position:relative;width:50%;max-height:45vh;object-fit:contain">
    <p style="position:absolute;bottom:1rem;text-align:center">ยมบาทน้อยหมดแรง… กำลังพากลับศาลาน้ำชา</p></div>`, null, 'defeat-recovery');
  const gen = dlgGen;
  const noSkip = e => e.preventDefault();
  dlg.addEventListener('cancel', noSkip);
  setTimeout(() => {
    dlg.removeEventListener('cancel', noSkip);
    if (dlgGen !== gen || !g.pendingRecovery) return;
    recovery.stage = 'sleep'; g.save();
    const site = STATIONS.find(d => d.k === 'tea');
    if (site) { const [x,y] = nearestWalk(site.x, site.y + 90); g.player.x=x; g.player.y=y; }
    openStation('tea', true);
  }, DEFEAT_SCENE_MS);
}

// ---------- เหตุการณ์เด้ง ----------
g.onChange = () => {
  g.syncDiscoveries();
  refresh();
  if (storyPlaying) return;
  if (g.pendingRecovery && !g.battle && !g.pendingDadPunish) {
    if (!dlg.open) openDefeatRecovery();
    return;
  }
  if (g.pendingReward?.encounter && !g.battle) {
    if (!dlg.open && !rewardOpen) openBattleReward();
    return;
  }
  if (g.isFinalBattle() && !dlg.open) { openBattle(afterBreachBattle); return; }
  if (!g.battle && g.storyQueue.length) {
    if (!dlg.open && !storyScheduled) {
      storyScheduled = true;
      setTimeout(() => { storyScheduled = false; if (!dlg.open && !g.battle) showPendingStory(); }, 0);
    }
    return;
  }
  // หน้าต่างรางวัลหลังชนะ (ชุด 28B) — อยู่หลังคิวเรื่องราว/พลังใหม่ ก่อนหน้าต่างอื่นทั้งหมด · เปิดไม่ได้ตอนมีกล่องอื่นค้างอยู่
  if (g.pendingReward && !g.battle) {
    if (!dlg.open && !rewardOpen) openBattleReward();
    return;
  }
  if (!g.battle && dlg.open) return;
  if (!g.battle && !dlg.open && !g.pendingLevel && g.discoveryQueue.length) {
    openDiscovery(); return;
  }
  // ฉากพญายมลงมาเอง (บารมีหมด/ตัดสินแดงครบสาม) เปิดอัตโนมัติ
  // ฉากต่อสู้กับวิญญาณเปิดจากปุ่มออกหมาย · ฉากต่อสู้กับผีเปิดจากปุ่มบนแผนที่เท่านั้น
  if (g.battle && (g.battle.kind === 'yama' || g.battle.kind === 'dad') && !dlg.open) { openBattle(); return; }
  // startDadFight() เรียก this.onChange() เองข้างในอยู่แล้ว ซึ่งเข้าเงื่อนไข if แรกด้านบนให้เปิดฉากสู้ให้เอง
  // ห้ามเรียก openBattle() ซ้ำตรงนี้ — เรียกซ้ำแล้วมี onClose ของฉากสู้สองชุดค้างอยู่บน dlg element เดียวกัน
  // ชุดเก่าที่ไม่มีใครเคลียร์จะมาเรียก dlg.close() ทับกล่องถัดไป (กระทะทองแดง) ทิ้งทันที (เจอ 17 ก.ย. 2569)
  if (g.dadFight && !g.battle && !dlg.open) { g.startDadFight(); return; }
  if (g.over) { g.paused = true; updatePlay(); openEnding(g.over); return; }
  // แพ้พ่อครบสามครั้งเตือน — โชว์กระทะทองแดงแล้วเล่นต่อ (ไม่ใช่ Game Over อีกต่อไป)
  if (g.pendingDadPunish && !dlg.open) {
    const p = g.pendingDadPunish; g.pendingDadPunish = null;
    openDadPunish(p); return;
  }
  if (g.battle) return;   // รอฉากต่อสู้ปิดก่อนค่อยเด้งกล่องเลื่อนขั้น/โซน (endBattle เรียก onChange ซ้ำเอง)
  if (!g.battle && g.bossPending && !dlg.open && !g.pendingVerdict && !g.pendingLevel && !g.pendingZone) {
    const z = g.zoneDef();
    const proceed = () => {
      openBossAlert();
    };
    // ฉากมาถึงขึ้นก่อนครั้งแรกเท่านั้น — รีแมตช์ (ติดธงแล้ว) ข้ามตรงไปสู้เลยตามใบงาน
    // ชุดที่ 10 (ข้อ E1) — เดิมติดธง "เห็นแล้ว" + เซฟ ก่อนเปิดฉากด้วยซ้ำ ถ้าผู้เล่นรีเฟรช/ปิดแท็บ
    // กลางฉาก (เซฟไปแล้วตั้งแต่บรรทัดนี้) โหลดกลับมาจะข้ามฉากไปเลยทั้งที่ยังไม่เคยเห็นจริง — บอสเดินเข้ามา
    // สู้ทันทีไม่มีฉากเปิด (คุณเป้เจอ 25 ก.ย. 2569) ย้ายการติดธง/เซฟไปไว้ใน "onDone" แทน ให้ติดธงหลัง
    // ฉากปิดจริง (ไม่ว่าอ่านจบทุกหน้าหรือกดปิดกลางคัน) ไม่ใช่ก่อนเปิด
    if (!g.bossArriveSeen[g.zone]) {
      openBossArrive(z, () => {
        g.bossArriveSeen[g.zone] = true; g.save();
        proceed();
      });
    } else proceed();
    return;
  }
  if (g.pendingZone) {
    const z = g.pendingZone; g.pendingZone = null;
    if (!z.back || (zoneIntroduction(z.k) && !g.zoneIntroSeen[z.k])) openZoneArrival(z);
    else bossModal(`กลับมาที่${z.name}`,
      `${z.sub ? `${z.sub}\n\n` : ''}สถานี ยมทูต และคิวที่ท่านทิ้งไว้ที่สาขานี้ยังอยู่ครบเหมือนวันที่ท่านจากไป`, 'เริ่มงาน');
    return;
  }
  // สาขาใหม่เพิ่งปลดล็อก — เด้งเองเฉพาะตอนที่ไม่มีหน้าต่างเลื่อนขั้นตามมา
  // (pendingZoneOpen ถูกตั้งใน checkLevel เสมอ ซึ่งตั้ง pendingLevel ด้วยทุกครั้ง
  //  หน้าต่างเลื่อนขั้นมีบรรทัด "เปิดโซน..." อยู่แล้ว ถ้าเด้งทั้งคู่ = บอกเรื่องเดียวกันสองกล่องติด)
  if (g.pendingZoneOpen && !g.pendingLevel) {
    const zs = g.pendingZoneOpen; g.pendingZoneOpen = null;
    bossModal('เปิดสาขาใหม่ให้ท่านแล้ว',
      `ขั้น "${LEVELS[g.level - 1].name}" เปิด${zs.map(z => z.name).join(' และ ')}ให้ท่านคุมได้แล้ว\n\n` +
      'กดปุ่ม 🗺️ ย้ายโซน ใต้ฉากเมื่อไหร่ก็ได้', 'รับทราบ');
    return;
  }
  // คิวล้นจนระเบียบหมด — เตือนก่อนสามครั้ง พร้อมบอกวิธีแก้ให้ผู้เล่นใหม่
  if (g.pendingOrderWarn) {
    const w = g.pendingOrderWarn; g.pendingOrderWarn = null;
    bossModal(`ตักเตือนเรื่องคิวล้น ${w.n}/${w.of}`,
      `${w.text}\n\n${ORDER_WARN.how}\n\n` +
      (w.n < w.of ? `ระเบียบถูกยกให้ตั้งหลักใหม่แล้ว — เหลือโอกาสอีก ${w.of - w.n} ครั้ง`
                  : 'ครั้งหน้าไม่มีเตือนแล้ว พ่อจะลงมาเอง'), 'รับทราบ');
    return;
  }
  // เตือนก่อนพ่อลงมา — แดงหนึ่ง/สองครั้งขึ้นเตือน ครั้งที่สามคือของจริง
  if (g.pendingWarn) {
    const w = g.pendingWarn; g.pendingWarn = null;
    bossModal(`คำตัดสินแดง ${w.n}/${w.of}`,
      `${w.text}\n\n${w.fireball ? `🔥 ลูกไฟจากบัลลังก์ฟาดถูก — บารมีเหลือ ${Math.max(0, Math.round(g.hp))}\n\n` : ''}` +
      `อีก ${w.of - w.n} สำนวนที่ตัดสินพลาด พ่อจะลงมาเอง — ` +
      'ตัดสินให้ได้สีเขียวหนึ่งครั้งก็ล้างที่สะสมไว้แล้ว', 'รับทราบ');
    return;
  }
  if (g.pendingKpi) {
    const k = g.pendingKpi; g.pendingKpi = null;
    bossModal(k.pass ? 'ตรวจการ — ผ่าน' : 'ตรวจการ — ไม่ผ่าน',
      k.pass
        ? `"ระเบียบ ${Math.round(g.order)} คะแนนเฉลี่ย ${k.avg} ... พอใช้ได้" ท่านพูดแค่นั้นแล้วก็เงียบ — ผ่านแล้ว ${g.kpiPassed} จาก 3 รอบ`
        : `"ระเบียบ ${Math.round(g.order)} คะแนนเฉลี่ย ${k.avg}" ท่านอ่านตัวเลขออกเสียงช้า ๆ ทีละตัว แล้วไม่พูดอะไรต่อ`);
    return;
  }
  if (g.pendingLevel) {
    const lv = g.pendingLevel; g.pendingLevel = null;
    openLevelUp(lv);
    return;
  }
  if (g.pendingEvent) {
    const ev = g.pendingEvent; g.pendingEvent = null;
    pauseForDlg();
    modal(`<h2>【${esc(ev.title)}】</h2><p style="line-height:var(--leading-body)">${esc(ev.text)}</p>
      <div class="row"><button class="gold" data-close>รับทราบ</button></div>`);
    }
};

dlg.addEventListener('close', () => setTimeout(drawCoach, 0));   // ปิดโมดัลแล้วค่อยต่อบทเรียนขั้นถัดไป

addEventListener('pointerdown', e => {          // แตะที่อื่นแล้วปิดบับเบิลที่กางอยู่
  if (!e.target.closest('.mark')) ov.querySelectorAll('.mark.show').forEach(m => m.classList.remove('show'));
}, true);

// ---------- หน้าปก ----------
// เกมไม่เริ่มเดินจนกว่าจะกดจากหน้าปก — ลูปเฟรมจึงต้องรอ ไม่งั้นบันทึกอัตโนมัติ
// จะเขียนทับเซฟเก่าตั้งแต่ก่อนผู้เล่นจะได้เลือกว่าจะเล่นต่อหรือเริ่มใหม่
const titleEl = $('#title');
const splashEl = $('#splash');
const splashVideo = $('#splash-video');
const coverVfx = $('#cover-vfx');
let started = false;
let splashDone = false;

function revealTitle() {
  if (splashDone) return;
  splashDone = true;
  splashVideo.pause();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) splashEl.hidden = true;
  else {
    splashEl.classList.add('leaving');
    setTimeout(() => { splashEl.hidden = true; }, 380);
  }
  if (!reducedMotion) {
    coverVfx.play().catch(() => {}); // ภาพปกนิ่งยังแสดงได้ถ้าวิดีโอเล่นไม่ได้
  }
}

/** เริ่มเล่นจริง — เรียกได้ครั้งเดียว */
function startPlay(fresh) {
  if (started) return;
  started = true;
  unlock();                                  // เบราว์เซอร์ยอมให้เล่นเสียงได้หลังการกดครั้งแรกเท่านั้น
  splashDone = true;
  splashVideo.pause();
  splashEl.hidden = true;
  coverVfx.pause();
  titleEl.classList.add('gone');
  resume();                                  // ต้องมาก่อนกล่องฉากเปิด — ดูหมายเหตุที่ resume()
  g.courtClosed = true;                     // เมื่อเข้าแผนที่ครั้งแรก ให้ผู้เล่นกดเปิดศาลเอง
  updatePlay();
  if (fresh) {
    // เพลงชื่อเรื่องเริ่มตั้งแต่ splash และเล่นต่อคลุมฉากเปิดของพญายม
    // แล้วค่อยสลับเป็นเพลงโซนตอนท่านพูดจบ
    bgm('bgm-title');
    openIntro();
    onDlgClose(() => bgm('bgm-zone'));
  } else {
    bgm('bgm-zone');
  }
  refresh();
  // B2b: เซฟที่ค้างหน้าต่างรางวัล/ศึกสุดท้ายต้องเด้งกลับมาทันทีหลังกดเล่นต่อ (บนแผนที่ศึกสุดท้ายไม่มีวาระให้ onChange ทำงานเอง)
  if (g.pendingReward?.encounter || g.isFinalBattle()) g.onChange();
  last = performance.now();
  requestAnimationFrame(frame);
}

/** โลโก้หน้าปกมีสองไฟล์แยกภาษา (ข้อ A.1) — สลับ src ตรงๆ ไม่ต้องวาดใหม่ทั้งหน้า */
function applyTitleLang() {
  const logo = $('#title-logo');
  const src = getLang() === 'en' ? 'img/ui/logo-eng.png' : 'img/ui/logo-th.png';
  if (logo) logo.src = src;
  const splashLogo = $('#splash-logo');
  if (splashLogo) splashLogo.src = src;
  const enterLogo = $('#enter-logo');
  if (enterLogo) enterLogo.src = src;
}

/** ข้อ C1 — สลับภาษาแล้ว UI ทั้งจอ (ที่ทำ i18n ไว้) เปลี่ยนทันทีไม่ต้องรีโหลด
 *  สมัครครั้งเดียวตอนบูต ครอบคลุมทุกจอที่วาดอยู่ ณ ตอนนั้น (title/HUD) — โมดัลที่เปิดใหม่ทีหลัง
 *  ก็ถูก apply ตอนสร้างอยู่แล้วเพราะฟังก์ชันสร้างโมดัลเรียก applyI18n/t() ของตัวเอง */
onLangChange(() => { applyI18n(document); applyTitleLang(); });

function buildTitle() {
  // เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้แตะจอ — ปลุกเพลงหน้าปกตอนแตะครั้งแรกที่ไหนก็ได้บนปก
  const wake = () => { unlock(); bgm('bgm-title'); titleEl.removeEventListener('pointerdown', wake); };
  titleEl.addEventListener('pointerdown', wake);

  // หน้าปกเป็น webp ตั้งแต่ 8 ก.ย. 2569 — png เดิม 1.3 MB คือไฟล์ใหญ่สุดของทั้งเกม
  // และเป็นภาพแรกที่ต้องมาถึง (144 KB แล้ว) · ถ้าวันหลังดรอป cover.png กลับมาก็ยังใช้ได้
  // ไม่มีสักไฟล์ก็ยังสวยอยู่ได้ด้วยไล่สีใน CSS
  // cover-v3.webp = ปก version3 ที่เจ้าของอัปเดต 26 ก.ย. 2569 ~15:00 (ชุด 14 ข้อ D1)
  // ลอง v3 ก่อนเสมอ ไม่มีค่อยถอยไป cover.webp (v2 เดิม) แล้ว cover.png ตามลำดับเดิม
  const art = $('#cover-art');
  (function probeCover(list) {
    if (!list.length) return;
    const [url, ...rest] = list;
    const probe = new Image();
    probe.onload = () => { art.style.backgroundImage = `url('${url}')`; art.classList.add('has'); };
    probe.onerror = () => probeCover(rest);
    probe.src = url;
  })(['img/cover-v3.webp', 'img/cover.webp', 'img/cover.png']);

  // โลโก้/ปุ่ม เปลี่ยนภาษาทันทีไม่ต้องรีโหลด (ข้อ C1) — สลับจริงทำที่หน้าตั้งค่า (ข้อ B)
  applyTitleLang();
  applyI18n(titleEl);

  const rs = $('#t-resume');
  if (SAVED) {
    rs.hidden = false;
    const lv = LEVELS[Math.max(0, (SAVED.level || 1) - 1)];
    const z = ZONES.find(x => x.k === (SAVED.zone || 'th')) || ZONES[0];
    $('#t-resume-info').textContent =
      `${z.name} · วาระที่ ${SAVED.tick || 0} · ปิดคดีแล้ว ${SAVED.casesDone || 0} · ${lv.name} ⭐${SAVED.star5 || 0}`;
    rs.onclick = () => { sfx('gong'); startPlay(false); };
  }
  $('#t-new').onclick = () => {
    unlock(); sfx('gong');
    if (!SAVED) return startPlay(true);
    modal(`<h2>${esc(t('title.confirmNewGame.title'))}</h2>
      <p style="line-height:var(--leading-body);font-size:var(--text-sm)">${esc(t('title.confirmNewGame.body'))}</p>
      <div class="row"><button data-close>${esc(t('title.confirmNewGame.cancel'))}</button>
        <button class="gold" id="ngo">${esc(t('title.confirmNewGame.ok'))}</button></div>`,
      d => d.querySelector('#ngo').onclick = () => {
        clearSave();
        sessionStorage.setItem('avegee.fresh', '1');   // โหลดใหม่แล้วข้ามหน้าปกไปเลย
        location.reload();
      });
  };
  $('#t-intro')?.closest('.title-secondary')?.remove();
  $('#t-set').onclick = () => { unlock(); openSettings(); };
}

// ---------- ตั้งค่า ----------
/** ปุ่มบันทึก/สลับภาษามีภาพแยกไทย/อังกฤษ (ข้อ B) — เรียกทุกครั้งที่เปิดกล่องตั้งค่า
 *  และทุกครั้งที่ภาษาเปลี่ยนระหว่างกล่องเปิดอยู่ (ผูกกับ onLangChange ด้านล่าง) */
function paintSettingsLangAssets(d) {
  const en = getLang() === 'en';
  const save = d.querySelector('#s-save-img'); if (save) save.src = en ? 'img/ui/icon-save-eng.png' : 'img/ui/icon-save-th.png';
  const lg = d.querySelector('#s-lang-img'); if (lg) lg.src = en ? 'img/ui/icon-change-eng.png' : 'img/ui/icon-change-th.png';
}

/** ข้อ B ชุด 15 — กล่องมืดขอบทอง ตามม็อกอัป UI3-menu-*.jpg
 *  เปิดจากหน้าเมนูแรก (ยังไม่ started) = ปุ่มเดียวคือบันทึก · เปิดระหว่างเล่น = บ้าน/เริ่มใหม่/บันทึก (B.4) */
function openSettings() {
  const inGame = started;
  modal(`<div class="settings-head">
      <img class="settings-gear" src="img/ui/icon-setting2.png" alt="">
      <span class="settings-title-pill" data-t="settings.title"></span>
      <button class="settings-close" data-close aria-label="close"><img src="img/ui/icon-close.png" alt=""></button>
    </div>

    <div class="settings-row">
      <img class="settings-row-icon" src="img/ui/icon-music.png" alt="">
      <div class="settings-row-body">
        <label data-t="settings.music"></label>
        <input type="range" id="s-bgm" min="0" max="100" value="${Math.round(AUDIO.bgm * 100)}">
      </div>
    </div>
    <div class="settings-row">
      <img class="settings-row-icon" src="img/ui/icon-sound.png" alt="">
      <div class="settings-row-body">
        <label data-t="settings.sounds"></label>
        <input type="range" id="s-sfx" min="0" max="100" value="${Math.round(AUDIO.sfx * 100)}">
      </div>
    </div>
    <div class="hint" data-t="settings.audioHint"></div>

    <div class="settings-lang">
      <label data-t="settings.language"></label>
      <button id="s-lang-toggle" class="lang-toggle" aria-label="เปลี่ยนภาษา / change language">
        <img id="s-lang-img" src="img/ui/icon-change-th.png" alt="">
      </button>
    </div>

    <div class="settings-actions">
      ${inGame ? `<button id="s-home" class="settings-square" data-t-title="settings.home" aria-label="home">
          <img src="img/ui/icon-home.png" alt=""></button>
        <button id="s-restart" class="settings-square" data-t-title="settings.restart" aria-label="restart">
          <img src="img/ui/icon-restart.png" alt=""></button>` : ''}
      <button id="s-save" class="settings-square settings-square--save" aria-label="save">
        <img id="s-save-img" src="img/ui/icon-save-th.png" alt="">
      </button>
    </div>
    <div class="hint" id="s-saved-hint" style="text-align:center;min-height:1.4em"></div>`,
    d => {
      applyI18n(d);
      paintSettingsLangAssets(d);

      const bind = (id, key) => {
        const r = d.querySelector(id);
        r.oninput = () => { AUDIO[key] = r.value / 100; syncBgm(); };
        r.onchange = () => { saveAudio(); if (key === 'sfx') sfx('stamp'); };
      };
      bind('#s-bgm', 'bgm'); bind('#s-sfx', 'sfx');

      // ปุ่มสองช่อง ไทย/อังกฤษ ในภาพเดียว (icon_change-*.png) — คลิกครึ่งซ้าย/ขวาสลับภาษา (ข้อ B.3)
      d.querySelector('#s-lang-toggle').onclick = e => {
        const r = e.currentTarget.getBoundingClientRect();
        setLang((e.clientX - r.left) < r.width / 2 ? 'th' : 'en');
        paintSettingsLangAssets(d);
      };

      const savedHint = d.querySelector('#s-saved-hint');
      d.querySelector('#s-save').onclick = () => {
        g.save(); sfx('stamp');
        savedHint.textContent = t('settings.saved');
      };

      if (inGame) {
        d.querySelector('#s-home').onclick = () => goMenu();
        // เริ่มใหม่ระหว่างเล่น — ต้องมีกล่องยืนยันในเกม ห้ามใช้ confirm() ของเบราว์เซอร์ (ข้อ B.4)
        d.querySelector('#s-restart').onclick = () => {
          modal(`<h2>${esc(t('settings.restart.confirmTitle'))}</h2>
            <p style="line-height:var(--leading-body);font-size:var(--text-sm)">${esc(t('settings.restart.confirmBody'))}</p>
            <div class="row"><button data-close>${esc(t('settings.restart.confirmCancel'))}</button>
              <button class="gold" id="rgo" style="border-color:var(--destructive);background:var(--destructive)">${esc(t('settings.restart.confirmOk'))}</button></div>`,
            d2 => d2.querySelector('#rgo').onclick = () => {
              clearSave();
              sessionStorage.setItem('avegee.fresh', '1');
              location.reload();
            });
        };
      }
    }, 'settings-modal');
}
onLangChange(() => { const d = $('#dlg'); if (d && d.open) paintSettingsLangAssets(d); });

// ฉากเปิดต้องมาก่อน refresh() — ไม่งั้น drawCoach จะเปิดโมดัลบทที่ 1 ทับ แล้วบทที่ 1 หายไปเลย
const titleAudioReady = primeAudio(['bgm-title']); // ให้ path พร้อมก่อนจังหวะแตะ (สำคัญกับ Brave)
primeAudio(['bgm-zone', 'bgm-battle']);
// ดึงเนื้อไฟล์ bgm-battle เข้า cache ไว้เลย (ไม่ใช่แค่รู้ path) ตอนเข้าฉากต่อสู้ครั้งแรกจะได้เล่นติดทันที
// ไม่รอ splash/title โหลดเพลงหลักก่อน (warmBgmFile ใช้ requestIdleCallback รอจังหวะว่างเอง)
warmBgmFile('bgm-battle');
const FRESH = sessionStorage.getItem('avegee.fresh');
sessionStorage.removeItem('avegee.fresh');
const enterGate = $('#enter-gate');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#splash-skip').onclick = revealTitle;
splashVideo.addEventListener('ended', revealTitle, { once:true });
splashVideo.addEventListener('error', revealTitle, { once:true });
function playSplash() {
  if (splashDone) return;
  if (reducedMotion) return revealTitle();
  splashEl.classList.add('playing');
  if (splashVideo.error) revealTitle();
  else splashVideo.play().catch(revealTitle);
  setTimeout(revealTitle, 8000); // ไฟล์หายหรือโหลดช้า ต้องไม่ขวางเมนู
}
function enterFromTap() {
  enterGate.hidden = true;
  sessionStorage.setItem('avegee.audioUnlocked', '1');
  unlock();
  bgm('bgm-title');
  playSplash();
}
$('#enter-button').onclick = enterFromTap;
async function afterBoot() {
  if (FRESH) return;
  await titleAudioReady;
  if (navigator.userActivation?.hasBeenActive || sessionStorage.getItem('avegee.audioUnlocked') === '1') {
    unlock();
    if (await bgm('bgm-title')) return playSplash();
  }
  enterGate.hidden = false;
}
if (document.documentElement.dataset.bootReady === 'true' || !$('#boot')) afterBoot();
else addEventListener('avegee:boot-ready', afterBoot, { once:true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { coverVfx.pause(); pauseWhenLeaving(); }
  else if (splashDone && !started && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    coverVfx.play().catch(() => {});
  }
  if (!document.hidden) setTimeout(showAutoPause, 0);
});
updatePlay();
buildTitle();
applyI18n(document);                     // ข้อ C1 — ทา i18n ทั้งจอครั้งแรกตอนบูต (HUD/แผงต่างๆ)
if (FRESH) startPlay(true);              // เพิ่งกด "เริ่มใหม่" มา ไม่ต้องกลับไปหน้าปกอีกรอบ
else refresh();                          // วาดแผงไว้ใต้หน้าปก จะได้ไม่กระพริบตอนกดเริ่ม

/** ฉากเปิด — พญายมมาบ่น มอบหมายงาน แนะนำคนสองคนที่เหลือ แล้วยัดเบี้ยกรรมให้ก้อนหนึ่ง
 *  โผล่เฉพาะเกมใหม่ ไม่ใช่ทุกครั้งที่เปิดหน้าเว็บ (เดิมเด้งทุกครั้งแม้โหลดเซฟเก่า) */
function openIntro(fromTitle = false) {
  const pages = [
    { title:'สามร้อยปีที่ไม่มีใครอยากพูดถึง', art:'scene', line:'โซนสุวรรณภูมิเคยมีผู้คุมสิบสองคน ตอนนี้เหลือสองคน และสำนวนที่ยังไม่มีใครกล้าเปิดอ่าน' },
    { title:'งานแรกของลูกพญายม', art:'hero-boss', line:'“เจ้าจะไม่ตัดสินจากหน้าตา จากคำร่ำลือ หรือจากความโกรธของตัวเอง” พ่อวางตรายมบาทลงในมือยมบาทน้อย' },
    { title:'แฟ้มเล่มแรก', art:'crew-nira', line:'นิราอ่านเพียงสิ่งที่คนบนโลกเห็น บางวิญญาณดูดี บางวิญญาณดูร้าย แต่สิ่งที่ซ่อนอยู่จะปรากฏก็ต่อเมื่อเจ้าสอบสวน' },
    { title:'คำตัดสินเดินได้', art:'hero-yama', line:'เมื่อออกหมาย ยมทูตจะพาวิญญาณไปยังสถานที่ที่เจ้าสร้างไว้ ตัดสินให้ตรงกรรมและตรงวาระ เพราะทุกคำสั่งมีผลตามมา' },
    { title:'กฎข้อเดียวที่ห้ามลืม', art:'hero-boss', line:`“ทัณฑ์ที่เกินกรรมไม่ได้หายไปไหน มันกลับมาอยู่ในบัญชีของผู้ตัดสิน” พ่อให้ ${BAL.startCoin} เบี้ยกรรม แล้วปล่อยให้เจ้ารับสำนวนแรก` },
  ];
  let page = 0;
  const paint = () => {
    const p = pages[page], image = `img/intro-panel-0${page + 1}.webp`;
    dlg.innerHTML = `<div class="intro-comic" role="region" aria-label="เรื่องเปิดเกม หน้า ${page + 1} จาก ${pages.length}">
      <div class="intro-comic-frame">
        <img src="${image}" alt="" onerror="this.onerror=null;this.src='${artUrl(p.art)}'">
        <div class="intro-comic-head"><span>อเวจี · บทนำ</span><span>${page + 1} / ${pages.length}</span></div>
      </div>
      <div class="intro-comic-caption"><h2>${esc(p.title)}</h2><p>${esc(p.line)}</p></div>
      <div class="intro-comic-controls"><button id="intro-skip">${fromTitle ? 'ปิดบทนำ' : 'ข้ามบทนำ'}</button><button class="gold" id="intro-next">${page + 1 === pages.length ? (fromTitle ? 'กลับหน้าเมนู' : 'รับงาน') : 'หน้าถัดไป →'}</button></div>
    </div>`;
    prepareComicImages(dlg);
    dlg.querySelector('#intro-skip').onclick = () => dlg.close();
    dlg.querySelector('#intro-next').onclick = () => { if (++page === pages.length) dlg.close(); else paint(); };
  };
  if (!fromTitle) pauseForDlg();
  openDlg('intro-comic-dialog');
  paint();
}


window.G = g;
