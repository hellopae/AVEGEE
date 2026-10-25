import {teaStaff,STAFF_TEA_REST_MS} from './tea-staff-rest.js';
import {traitForKeeper} from './interrogation.js';
import {teamHudHtml,teamManageHtml} from './team-hud.js';
import {canteenActive,canteenPoint} from './canteen.js';
import {beginMapTravel,advanceMapTravel,finishMapTravel,cancelMapTravel,KAN_HANDOFF} from './map-travel.js';
import { rewardView, startRewardCount, selectedLivingFoeId, battleStatuses, specialMoveKey } from './battle-result.js';
import { isMeleeAction, planDash, dashTiming, createDashSequence } from './battle-dash.js';
import {pendingBossGuideGrant,acknowledgeBossGuideGrant} from './boss-guides.js';
import {bossJusticeCase,bossJusticeActors,bossJusticeActive,bossJusticeStations,bossJusticeCrew,bossJusticeAnswer,interrogateBoss,mirrorBoss,sentenceBoss,releaseBoss} from './boss-justice.js';
import {workersPanelHtml,workerSuppliesHtml,workerSupplyBlocked,bindWorkersPanel} from './worker-ui.js';
import {BUILD_PLAN,hireRank,recommendedHire,unlockedAtLevel} from './unlocks.js';
import {mountInterrogationStyles,spiritNameHtml,keeperCurrentJob,pressReaction,kanOrbHtml,bindKanClue,teamReportsHtml,bindTeamReports,onceFeedbackDismiss} from './interrogation-ui.js';
mountInterrogationStyles();
import { mountCombatSprites, bossSpriteKey } from './combat-sprites.js?v=night-v1';
import { mountYamaTrialIdle } from './yama-trial-idle.js?v=n2';
import { bindCommandPress } from './command-press.js?v=20261015-k2';
import { drawTownTerrain } from './town-terrain.js?v=k1d';
import {openDungeonRoutes,dungeonStatus,harbourDestinations} from './zone-travel.js';
import {routeBossCave} from './route-geometry.js';
import {mountDungeonView} from './dungeon-view.js?v=l5';
import { isTownZone, townZoomLevels, townDefaultZoom, townTitle, townSites, townNearbyAction } from './town-map.js?v=l1';
import { runKrataQte } from './minigames/krata-qte.js?v=minigame-review-20261011-fire-theme-v2';
import { gateKarma, archiveRecord, archiveCard, GATE_EFFECT_MS, GATE_EFFECT_REDUCED_MS } from './h4-location-ui.js';
import { mountDiagnosis } from './diagnosis-ui.js';
import { powerBadgeHtml, powerSheetHtml, powerName } from './crew-power-ui.js';
import { diagnosisSubjects, subjectKey } from './diagnosis.js';
import { mountMirrorCharge, MIRROR_ROOM_LAYOUT, nearMirror } from './mirror-charge.js?v=minigame-review-20261011-j4';
import { westRescuePending, WEST_RESCUE } from './west-events.js';
import { wideStationRoom } from './room-art-assets.js?v=minigame-review-20261011-j4-n1';
import { isYamaSwordAttack, mountBattleSword, mountBattleSwordIdle, swordImage, SWORD_FRAME_MS, SWORD_DURATION_MS } from './yama-sword.js?v=20261009-f2-merge-f3-f4-sala-books-mirror-art-book-art-oriverse-25d-g1-g3b';
import { themeBackground } from './theme-assets.js';
import { battleBackground } from './battle-background.js';
import { sentenceColor } from './sentence-colors.js';
import { authorityPunishmentCutscene } from './narrative-cutscenes.js';
import { sentencingChapters, clockGuide, firstTrialLesson, firstInterrogationLesson } from './sentencing-guide.js';
import { actorStanding, specialCooldown } from './actor-recovery.js';
import { trainingProgress, HERO_TRAINING_ID } from './training.js?v=minigame-review-20261011';
import { TRAINING_GAMES } from './minigames/training/index.js?v=minigame-review-20261011-fire-theme-v2';
import { runTraining } from './minigames/training/host.js?v=minigame-review-20261011-fire-theme-v2';
import { devaMapActors, DEVA_DESCENT_MS, DEVA_MAP } from './deva-map.js';
import { nextFinalEncounter, finalEventActors, finalPreparationTargets } from './final-event.js';
import { punishmentScene } from './punishment-scene.js';
import { merchantStock, medicineResult, medicineHp } from './progression.js';
import { DEFEAT_SCENE_MS, teaBackground, teaRoom, yamaDownImage } from './tea-recovery.js';
import { INTERACTION_REACH, ROOM_EXIT_REACH, nearestInteraction, mapInteractions, roomExit, nearRoomExit, talkInteractions } from './proximity.js';
import { talkTargets, findTalkTarget, talkDistance, pickTalk, TALK_REACH, TALK_DISMISS, TALK_MS, TALK_MAX_LINES } from './talk.js';
import { exitStep } from './exit-marker.js';
import { commandWheel, bindCommandWheel, crewAbility as describeCrewAbility, crewCooldown, cooldownText } from './command-wheel.js';
import { vitalsOf, vitalGains, healFxHtml } from './heal-fx.js?v=20261015-l2';
import { camera, strikeTime } from './battle-camera.js?v=20261016-m1';
import { fitBattleSprites, fitCutsceneImage, battleSpriteRect, setBattleRectMapper } from './battle-scale.js?v=battle-anchor-20261012-k2-l2';
setBattleRectMapper((el, mode) => camera.rectOf(el, mode));
import { attachBattleFx, playBattleFx, stopBattleFx, fxIdle, hasBattleCamera, cameraRectOf, poseDurations, setBattleCamera } from './battle-fx.js?v=m2';
import { recipeFor, foeTier, cueKindFor, cueImpactAt, poseContactMs, swordContactMs, leadInMs } from './battle-fx-map.js?v=m2';
import { actionCutsceneLabel } from './action-cutscene-fx.js?v=m5';
setBattleCamera(camera);   // M2: effects draw in the camera's fx layer and let its cues own shake/dim/flash
import { planPlacement } from './battle-menu-layout.js?v=20261015-k5';
import { placeWheel, placeFinButton, WHEEL_ART } from './wheel-place.js?v=battle-anchor-20261012';
import { yamaSkillRemaining, immediateSelfSkill } from './yama-cooldown.js?v=j1';
import { teamFaceClass, foeFaceClass, ragePoseSrc, rageArtSrc, figYouAtkClass } from './battle-facing.js?v=i1b-westhit-skillatk-j1';
// ui.js — แผงควบคุม · โมดัล · ลูปวาด
import { SINS, STATIONS, CREW, BAL, POWERS, SCENE, SPOTS, QUEUE_LINE,
         GUARD, LEVELS, MOB, TUTOR, ORDER_TIERS, KARMA_TIERS, ITEMS,
         KARMA_RELIEF, BATTLE, ZONES, ZONE_EVENTS, TARANG, FX_OF, ROOMS, ROOM_DEFAULT,
         ORDER_WARN, crewName, FRONTIER, returnsToFrontier, MERCHANT, BOON_SHOP, UPGRADES, INTENSITY_NAME,
         CREW_HELP_LV, authorityOf, WEAPONS, BOSS_NAMES, CHALLENGE_STAND, CHALLENGE_REST_WAVE, CREW_POWER, REMORSE_PASS } from './data.js';
import { weaponEffectLines, weaponNoteText, weaponIconSrc, weaponCooldownState, baseSwordIconSrc, baseSwordAttack } from './weapons.js?v=i1b';
import { BAG_SECTIONS, PROFILE_SECTIONS, carriedItems, weaponBonusComparison, bindMenuTabs } from './menu-ui.js';
import { AUDIO, saveAudio, unlock, sfx, powerSfx, isUltimatePower, playUltimate, bgm, syncBgm, primeAudio } from './sfx.js';
import { preloadZone } from './preload.js?v=h1-g5-h4-h5b-cane-trojan-zoom-intro-v3-sword-schools-skillatk-minigame-review-20261011-m2-layered-battle9-20261015-r1-k3m';
import { createGame, loadSave, clearSave, sameLabel } from './game.js?v=minigame-review-20261011-j-k1d-l3-l1-l2-l5';
import { setMapViewport, mapViewport, render, toScene, hitStation, hitActor, afterlifeWalkPosition, nearBuild, hitFrontier, hitBuildPrompt, CHAR_SCALE_MAP, mapCharK } from './scene.js?v=mapfx-m1-l1';
import { makeRoom } from './room.js?v=minigame-review-20261011';
import { stepTo, nearestWalk } from './walk.js?v=k1d';
import { soulKey, artUrl, img, zoneImg, bindZone, bindHeroStyle, warmZone, drawCrewWalk, drawStandee, drawHeroWalk, drawBoat } from './art.js';
import { MINIGAMES } from './minigames/index.js?v=20261009-book-art-g5-h4';   // มินิเกม "เร่งการทำงาน" — ชุดที่ 9 คุณเป้ 24 ก.ย. 2569
import { makeFrontierWalk, maxOnScreen, removeSessionEnemy } from './frontier.js';   // แผนที่ชายแดน — ข้อ A ชุด 14
import { t, getLang, setLang, onLangChange, applyI18n } from './i18n.js';   // ข้อ C ชุด 15 — ชั้นแปล TH/ENG
import { ZONE_MAP, zoneMapRoute } from './zone-map.js';
import { STORY, ABILITY_REWARDS, storyOf } from './story.js';
import { zoneIntroduction, regionalCrewCutscene, travelPath } from './zone-introductions.js';
import { walkDirection } from './walk-direction.js';
import { powerCutsceneImage } from './power-cutscene-assets.js';
import { mountNiraCombatSprite, playNiraHealingCutscene } from './nira-combat.js';
import { mountFinalBossCourt } from './boss-court-view.js';
import { prepareComicImages, bossArrivalScene, ACTION_CUTSCENE_PRESENTATION } from './cutscene-presentation.js';
import { frontierIntroduction } from './narrative-cutscenes.js';
import { verdictSceneImage } from './verdict-scene.js';

const $ = s => document.querySelector(s);
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** ชื่อตัวผู้เล่น — "Yama" คือชื่อฝรั่งของพญายมซึ่งเป็น "พ่อ" ของเรา ไม่ใช่ตัวเรา
 *  ตัวเราคือยมบาทมือใหม่ ลูกของท่าน จึงใช้ "ยมบาทน้อย" ให้ต่างจากพ่อชัด ๆ
 *  (เจ้าของถามว่าเขียนไทยว่าอะไรดี 8 ก.ย. 2569 — เปลี่ยนที่นี่ที่เดียวได้ทั้งเกม) */
const HERO_NAME = 'ยามา';
const HERO_TITLE = 'ยมบาทน้อย';
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
const HEAL_GLOW_MS = 1000;   // L2: เอฟเฟกต์ได้เติมเลือด/พลังเวท ~1 วินาที (ทุกตัวที่ได้รับ — ดู src/heal-fx.js; ค่าเดียวกับ HEAL_FX_MS)
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

/** H2 (คุณเป้ 10 ต.ค.): "กล้องตามตัวละครอย่างนุ่มนวลในหน้าแผนที่เวลา zoom ด้วย"
 *  ซูมแผนที่โซน = ขยายกล่อง .scene-box ด้วย CSS transform (พิกัดคลิกอ่านจาก getBoundingClientRect อยู่แล้ว จึงไม่เพี้ยน)
 *  กล้องตามยมบาทด้วยสูตรเดียวกับกล้องชายแดน (scene-style.followCamera: exponential 130ms, ไม่เกินขอบภาพ)
 *  ซูมออก (1×) = มุมมองภาพรวมเหมือนเดิมทุกประการ · ปรับระยะ/กลับภาพรวมจาก minimap (− / ทั้งแผนที่ / +) เท่านั้น (K4: ตัดปุ่ม #hud-zoom มุมขวาล่างที่ไอคอนหายแล้ว) */
let cameraZone = g.zone;
let MAP_ZOOM_LEVELS = townZoomLevels(g.zone);
const mapCam = { level: townDefaultZoom(g.zone), z: 1, x: SCENE.w / 2, y: SCENE.h / 2, at: performance.now(), init: false };
function setMapZoom(level) {
  mapCam.level = Math.max(0, Math.min(MAP_ZOOM_LEVELS.length - 1, level));
  const less=document.getElementById('town-zoom-less'),more=document.getElementById('town-zoom-more');
  if(less)less.disabled=mapCam.level===0;
  if(more)more.disabled=mapCam.level===MAP_ZOOM_LEVELS.length-1;
}
setMapZoom(mapCam.level);
document.getElementById('town-zoom-less')?.addEventListener('click',()=>setMapZoom(mapCam.level-1));
document.getElementById('town-zoom-more')?.addEventListener('click',()=>setMapZoom(mapCam.level+1));
document.getElementById('town-overview')?.addEventListener('click',()=>setMapZoom(0));
function updateMapCamera(now) {
  if (cameraZone !== g.zone) {
    cameraZone = g.zone; MAP_ZOOM_LEVELS = townZoomLevels(g.zone);
    mapCam.init = false; setMapZoom(townDefaultZoom(g.zone));
  }
  const stage = document.querySelector('.stage'), box = document.querySelector('.scene-box');
  if (!stage || !box) return;
  stage.classList.toggle('town-view',isTownZone(g.zone));
  const dt = Math.max(0, Math.min(250, now - mapCam.at)); mapCam.at = now;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target = MAP_ZOOM_LEVELS[mapCam.level];
  const blend = !mapCam.init || reduced ? 1 : 1 - Math.exp(-dt / 130);
  mapCam.init = true;
  mapCam.z += (target - mapCam.z) * blend;
  // ซูมออกเต็มที่แล้ว (1×) กล้องกลับกลางภาพ · ซูมเข้า = ตามยมบาท
  const court=bossJusticeCase(g),escortView=court&&['escort','punishment','return','sentenceScene'].includes(court.phase)?bossJusticeActors(g).find(a=>a.id==='justice-boss'):null;
  const focus=g.mapTravel?.focus||escortView||g.player;
  const wantX = mapCam.level > 0 ? focus.x : SCENE.w / 2, wantY = mapCam.level > 0 ? focus.y : SCENE.h / 2;
  mapCam.x += (wantX - mapCam.x) * blend; mapCam.y += (wantY - mapCam.y) * blend;
  if (Math.abs(mapCam.z - 1) < 0.002 && target === 1) mapCam.z = 1;
  const cw = stage.clientWidth, ch = stage.clientHeight, bw = box.offsetWidth, bh = box.offsetHeight;
  if (!cw || !ch || !bw || !bh) return;
  // fractional offsets (not offsetLeft/Top, which round) so canvas pixels line up with the DOM overlay
  const sRect = stage.getBoundingClientRect(), bRect = box.getBoundingClientRect();
  const L = bRect.left - sRect.left, T = bRect.top - sRect.top;
  const view = mapViewport(cw, ch, bw, bh, mapCam);
  setMapViewport(cv, view);
  mapCam.viewport = view;
  mapCam.view = {cx:(cw/2-view.tx)/view.sx,cy:(ch/2-view.ty)/view.sy,zoom:mapCam.z};
  box.style.setProperty('--map-label-scale',(1/mapCam.z).toFixed(4));
  // The canvas covers the stage; only DOM labels retain the old world-space scale.
  cv.style.left = `${-L}px`; cv.style.top = `${-T}px`;
  cv.style.width = `${cw}px`; cv.style.height = `${ch}px`;
  const overlay = document.getElementById('ov');
  overlay.style.transformOrigin = '0 0';
  overlay.style.transform = `translate(${view.tx - L}px,${view.ty - T}px) scale(${mapCam.z})`;
  const fabs = box.querySelector('.fabs');
  if (fabs) {
    fabs.style.transformOrigin = '0 0';
    fabs.style.transform = `translate(${view.tx - L + (mapCam.z - 1) * fabs.offsetLeft}px,${view.ty - T + (mapCam.z - 1) * fabs.offsetTop}px) scale(${mapCam.z})`;
  }
}

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
  if (started && g.zone === 'asia' && g.devaVisits?.asia?.phase === 'descending' && !dlg.open && !g.battle) {
    g.devaDescentStartedAt ||= Date.now();
    if (Date.now() - g.devaDescentStartedAt >= DEVA_DESCENT_MS) {
      g.devaDescentStartedAt = null; g.finishDevaDescent();
    }
  }
  releaseDlgPause();       // กล่องปิดไปแล้วแต่ยังไม่ได้คืนค่าพัก — ดูหมายเหตุที่ pauseForDlg()
  showAutoPause();
  if (battleUI && g.battle && !g.battle.over && !dlg.open) battleUI();
  updateTrialBtn();        // ปุ่มสอบสวนต้องตามการเดินให้ทันแม้ลูปเฟรมจะหยุด (แท็บอยู่หลังจอ)
  updateMobFab();          // ปุ่มสู้เหนือหัวผีก็ต้องเก็บกวาดตัวเองได้แม้ลูปเฟรมจะหยุด
  updateBossFab();
  updateFrontierFab();
  updateRepairFabs();
  updateTalk();
  // พ่อลงมาตบเพราะตัดสินพลาดติดกันสามสำนวน — รอจนกว่าโมดัลอื่นจะปิดก่อน
  // startDadFight() เรียก this.onChange() เองอยู่แล้ว ซึ่งเปิดฉากต่อสู้ให้เองในตัว (ดู g.onChange ท้ายไฟล์)
  // ห้ามเรียก openBattle() ซ้ำตรงนี้ — เจอ 17 ก.ย. 2569 ว่าเรียกซ้ำทำให้มี onClose สองชุดค้างอยู่บน dlg
  // ชุดเก่าจะมาปิดกล่องกระทะทองแดงทิ้งทันทีที่ฉากต่อสู้จบ (ดู CONCEPT §22.6)
  if (started && g.pendingVerdictScene && !g.battle && !g.over && !dlg.open && !storyPlaying && !g.assetsLoading) g.onChange();
  if (g.dadFight && !g.pendingWarn && !g.pendingVerdictScene && !g.battle && !g.over && !dlg.open && !fx && Date.now() - lastBattleEnd > 1600) {
    g.startDadFight();
  }
  if (started && g.prisonBreakStatus() === 'pending' && !prisonAlertSeen && !g.battle && !g.over &&
      !dlg.open && !fx && !g.pendingVerdict && !g.pendingRecovery && !g.pendingLevel && !g.pendingZone &&
      !g.dadFight && Date.now() - lastBattleEnd > 1600) {
    prisonAlertSeen = true;
    openPrisonAlert();
  }
  if (started && g.frontierBreachStatus() === 'pending' && g.devaTestStatus() === 'cleared' &&
      !breachAlertSeen && !g.battle && !g.over && !dlg.open && !fx && !g.pendingVerdict && !g.pendingRecovery &&
      !g.pendingLevel && !g.pendingZone && !g.dadFight && Date.now() - lastBattleEnd > 1600) {
    breachAlertSeen = true;
    openBreachAlert();
  }
  if (started && g.devaTestStatus() === 'pending' && g.prisonBreakStatus() === 'cleared' &&
      !g.storyQueue.some(s => s.key.startsWith('deva-th-')) && !devaAlertSeen && !g.battle && !g.over && !dlg.open && !fx && !g.pendingVerdict && !g.pendingRecovery &&
      !g.pendingLevel && !g.pendingZone && !g.dadFight && Date.now() - lastBattleEnd > 1600) {
    devaAlertSeen = true;
    openDevaAlert();
  }
  // ชุด 29C ข้อ 9 — ยมบาทเดินถึงประตูชายแดนขณะ event ปีศาจบุกรออยู่ → เปิดหน้าต่างเตรียมทีมครั้งเดียวต่อรอบที่เดินเข้าไป
  // (ปิดหน้าต่างแล้วยืนต่อไม่เด้งซ้ำ · ออกห่างแล้วกลับมาถึงจะเด้งอีก · กดปุ่ม "เข้าด่านชายแดน" เปิดเองได้ตลอด)
  const march = started && g.breachMarch();
  if (march && g.nearFrontierGate()) {
    if (!breachPrepOffered && !dlg.open && !fx && !g.pendingVerdict && !g.pendingRecovery && !g.pendingLevel && !g.pendingZone &&
        !g.dadFight && !storyPlaying && !g.storyQueue.length && Date.now() - lastBattleEnd > 1600) {
      breachPrepOffered = true;
      openFrontier(false, march.key);
    }
  } else if (!g.nearFrontierGate(70)) breachPrepOffered = false;
  if (started && westRescuePending(g) && !g.battle && !dlg.open && !fx && !g.storyQueue.length &&
      Math.hypot(g.player.x-WEST_RESCUE.x,g.player.y-WEST_RESCUE.y) <= INTERACTION_REACH) {
    if (g.startZoneEvent('westHypnotized')) openBattle(afterBreachBattle);
  }
  drawTeamHud();
  updatePrisonFab();
  updateBreachFab();
  updateDevaFab();
  if (started && !g.battle && !dlg.open && g.storyQueue.length) { g.onChange(); return; }
  if (started && !g.battle && !g.over && !dlg.open && g.finalEventOnMap()) { g.onChange(); return; }
  const nextEvent = pendingZoneEvents().find(ev => !zoneEventAlertSeen.has(`${g.zone}:${ev.k}`));
  if (started && nextEvent && !g.battle && !g.over && !dlg.open && !fx &&
      !g.pendingVerdict && !g.pendingRecovery && !g.pendingLevel && !g.pendingZone && !g.dadFight &&
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
  updateMapCamera(now);
  render(ctx, g, now, hover, sel, mapCam.view);
  updateTownHud(now);
  followMarks(); drawAtk(); updateTrialBtn(); updateMobFab(); updateBossFab(); updateFrontierFab(); updateRepairFabs(); updateTalk(); drawPauseTag();
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
    <span class="chip tap" data-ex="order"><img src="img/ui/icon-justice.png" alt=""><b>${Math.round(g.order)}</b></span>
    <span class="chip tap" data-ex="karma"><img src="img/ui/icon-skull.png" alt=""><b>${g.karma.toFixed(1)}</b></span>
    ${g.mobs.length ? `<span class="chip mob-warn">👹 <b>${g.mobs.length}</b></span>` : ''}`;
  $('#res').querySelectorAll('[data-ex]').forEach(el => el.onclick = () => explainBar(el.dataset.ex));
  drawTeamHud();
  $('#tickinfo').textContent = `วาระที่ ${g.tick} · ตรวจการรอบหน้าอีก ${g.nextKpi} วาระ · ผ่านแล้ว ${g.kpiPassed}/${BAL.kpiWin}`;
}

/** ข้อ D.4 — การ์ดยมบาทน้อยมุมซ้ายล่าง: รูป + ยศ(ดาว) + แถบบารมี + ชื่อ
 *  ข้อ 2 ชุดที่ 15b (28 ก.ย. 2569) — คุณเป้ยืนยันแล้ว: ดาวคือระดับ (g.level) ไม่ใช่ star5
 *  "เวลาพ่อเลื่อนขั้นให้ ก็จะ 1 ดาว" — ดวงเต็ม = ถึงขั้นนั้นแล้ว (ฝึกหัด 1 · ประจำโซน 2 · ผู้ตัดสิน 3)
 *  ขั้นสูงกว่า 3 (เจ้าโซนขึ้นไป) ยังโชว์เต็มสามดวงเท่าเดิม (ม็อกอัปมีแค่สามช่อง) · star5 (จำนวนคำตัดสิน
 *  5 ดาวสะสม) ยังนับอยู่เหมือนเดิม ไปโผล่ที่แท็บข้อมูลยมทูต/แฟ้มแทน (ดู stat cards ที่อื่นในไฟล์นี้) */
function drawTeamHud(){
  const root=$('#team-hud');if(!root)return;
  const html=teamHudHtml(g,c=>crewArt(c,'-profile'));
  if(root._teamHtml===html||root.matches(':active'))return;
  const focused=root.contains(document.activeElement)?document.activeElement?.dataset.teamActor:null;
  root._teamHtml=html;root.innerHTML=html;
  if(focused)root.querySelector(`[data-team-actor="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
  root.querySelector('[data-team-food]')?.addEventListener('click',()=>explainBar('food'));
  root.querySelectorAll('[data-team-manage]').forEach(b=>b.onclick=()=>openTeamManage());
  root.querySelectorAll('[data-team-actor]').forEach(b=>b.onclick=()=>openTeamManage(b.dataset.teamActor));
}
function openTeamManage(selected=''){
  pauseForDlg();
  const paint=()=>{
    const scroll=dlg.scrollTop;dlg.innerHTML=teamManageHtml(g,c=>crewArt(c,'-profile'),selected);dlg.scrollTop=scroll;
    const worker=id=>g.workers().some(w=>w.id===id);
    const done=ok=>{if(ok){sfx('coin');paint();refresh();}};
    dlg.querySelectorAll('[data-team-feed]').forEach(b=>b.onclick=()=>done(worker(b.dataset.teamFeed)?g.feedWorker(b.dataset.teamFeed):g.giveCrewItem(b.dataset.food,b.dataset.teamFeed)));
    dlg.querySelectorAll('[data-team-rest]').forEach(b=>b.onclick=()=>done(worker(b.dataset.teamRest)?g.restWorkerAtTea(b.dataset.teamRest):g.restActor(b.dataset.teamRest)));
    dlg.querySelectorAll('[data-team-party]').forEach(b=>b.onclick=()=>done(g.toggleParty(b.dataset.teamParty)));
    dlg.querySelectorAll('[data-team-mode]').forEach(b=>b.onchange=()=>done(g.setWorkerMode(b.dataset.teamMode,b.value)));
  };
  paint();openDlg('team-manage');
  if(selected)dlg.querySelector(`[data-team-card="${CSS.escape(selected)}"]`)?.scrollIntoView({block:'nearest'});
}

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
    <div class="tline"><b>หายเมื่อไหร่</b><div>ลงทัณฑ์เกินกรรมตั้งแต่ 2 ระดับ ทั้งที่คะแนนยังไม่ต่ำกว่า 50 = โดนลูกไฟ บารมีหาย 1 ใน 5 ·
      คำตัดสินแดง (ต่ำกว่า 50) ติดกัน ครั้งที่ 2 ลูกไฟเตือน บารมีหาย 1 ใน 4 (ไม่ต่ำกว่า 15% ของสูงสุด) ครั้งที่ 3 พญายมลงมาเอง ·
      และบารมีที่เสียไปในฉากต่อสู้</div></div>
    <div class="tline"><b>ได้คืนเมื่อไหร่</b><div>ตัดสินได้ห้าดาว (พ่อคืนให้นิดหน่อย — และคืนน้อยลงถ้ากรรมท่านสูง) ·
      ฟื้นเองช้า ๆ จนถึงราว 60% ของสูงสุด · นอนพักที่ศาลาน้ำชาเพื่อฟื้นเต็ม ·
      ${esc(itemText('health', 'desc'))} ซื้อได้จากพ่อค้านรก</div></div>
    <div class="tline bad"><b>ถ้าหมด</b><div>พญายมลงมาเอง ท่านถูกส่งลงกระทะทองแดง แล้วกลับมาด้วยบารมี 1 — ไม่จบเกม แต่ต้องพักฟื้นก่อนทำงานต่อ</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'order') return modal(`<h2>⚖️ ระเบียบ — ${Math.round(g.order)} (${esc(g.orderTier().name)})</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      โซนนี้เดินเป็นระบบแค่ไหน <b>เป็นตัวคูณรายได้ของท่านทุกคดี</b> และเป็นตัวเลขที่พญายมใช้ตรวจการ</p>
    <div class="tline"><b>ขึ้นเมื่อ</b><div>ปิดคดีได้คะแนนดี · ปราบเปรต (+2 ถ้าท่านสู้เอง · +3 ถ้ายักษ์ทวารบาลปราบให้) · มีหอทะเบียนกรรมที่ไม่พังและคิวไม่ล้น (+${BAL.orderGainSala}/วาระ)</div></div>
    <div class="tline"><b>ลงเมื่อ</b><div>คิวเกิน ${g.queueCap()} ดวง (ยิ่งล้นยิ่งตกเร็ว — ขังดวงที่ยังตัดสินไม่ได้ไว้ในตะรางเพื่อลดคิว) · ปล่อยเปรตไว้ · คำตัดสินคะแนนต่ำ ·
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
      มอบ<b>ดอกบัวบูชา</b>ให้บุญที่ประตูสวรรค์ (ได้เป็นของรางวัลเมื่อปราบเปรตหรือศัตรู หรือซื้อจากพ่อค้านรก) ·
      บูชาดอกบัวที่<b>ศาลาน้ำชา</b> ${KARMA_RELIEF.lotusCost} เบี้ย −${KARMA_RELIEF.lotusCut} (แท็บก่อสร้าง)</div></div>
    ${tiers(KARMA_TIERS, g.karmaTier(), t => '≤' + t.max)}
    <div class="tline bad"><b>ถ้าเต็ม (100)</b><div>พญายมลงมาปราบด้วยตัวเอง แพ้แล้วถูกส่งลงกระทะทองแดง บารมีเหลือ 1 และกรรมลดลงหลังชดใช้บางส่วน</div></div>
    <div class="row"><button class="gold" data-close>เข้าใจแล้ว</button></div>`);

  if (k === 'food') {
    modal(`<h2>🍙 เสบียง — ${Math.round(g.food)} ห่อ${g.workingCrew?.size
      ? (g.fed ? ' · <span style="color:var(--success)">อิ่ม ทำงานไว</span>' : ' · <span style="color:var(--destructive)">หิว ทำงานช้า</span>') : ''}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">
      ค่าจ้างยมทูต — ไม่ใช่ของสถานีอีกต่อไป <b>ยมทูตที่กำลังคุมสถานี/ออกรับดวง</b>กินเสบียงทุกวาระเหมือนกันหมด</p>
    <div class="tline bad"><b>ถ้าหมด</b><div>ยมทูตที่กำลังทำงานอยู่<b>ทำงานช้าลง</b> ส่วน<b>คนงานหยุดรอเสบียง</b> รวมถึงการไปรับวิญญาณที่ท่าเรือ · เติมเสบียงได้ในโต๊ะนิรา</div></div>
    <div class="tline good"><b>ถ้ามีพอ</b><div>ยมทูตที่กำลังทำงานอยู่ทำงาน<b>ไวขึ้น</b></div></div>
    <div class="tline"><b>เติมยังไง</b><div>${getLang() === 'en' ? `Buy 10 food packs in Build for ${BAL.foodPrice * 10} coins, or win food packs as random loot from defeated ghosts and foes` : `ซื้อที่แท็บก่อสร้าง (${BAL.foodPrice * 10} เบี้ย/10 ห่อ) หรือรับ<b>ห่อเสบียง</b>ที่สุ่มได้เป็นของรางวัลเมื่อปราบเปรตหรือศัตรู`}</div></div>
    ${workerSuppliesHtml(g)}
    <div class="row"><button class="gold" data-close>กลับไปทำงาน</button></div>`);
    bindWorkersPanel(dlg,g,()=>explainBar('food'));
    return;
  }

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
  return `<span class="tag" style="background:${SINS[d.s].color}22;color:${SINS[d.s].color}">${SINS[d.s].name}</span><span style="color:${sentenceColor(d.w).color}">${esc(d.t)}${d.w < 0 ? ' · บรรเทาโทษ' : ''}</span>`;
}

/** สิ่งที่นิราอ่านได้ก่อนสอบสวน: ภาพลักษณ์ + บุญที่อ้างเท่านั้น
 *  ไม่ติดป้ายว่าบุญไหนจริง/ปลอม เพราะนั่นคือคำตอบของคดี */
function publicMeritLine(m, cls = 'deed') {
  return `<div class="${cls}" style="color:${sentenceColor(m.v).color}">🪷 ${esc(m.t)}`
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
        ${s.case ? '' : s.merits.filter(m => !m.exposed).map(m => publicMeritLine(m)).join('')}
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
    const nextHireTab = recommendedHire(g);
    const canHire = CREW.filter(c => !g.crew.some(x => x.k === c.k)).sort((a, b) => hireRank(a.k) - hireRank(b.k));   // P1: ตามลำดับแนะนำจ้าง
    b.innerHTML = g.crew.map(c => `
      <div class="crew">
        <span class="pw-av">${face('crew-' + c.k, c.glyph)}${powerBadgeHtml(c.k, { zone: g.zone, actor: c })}</span>
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
        <span class="pw-av">${face('crew-' + c.k, c.glyph)}${powerBadgeHtml(c.k, { zone: g.zone })}</span>
        <span class="n"><b>${crewName(c, g.zone)}</b> <span class="st" style="display:inline">— ${esc(c.duty)}</span>${hireRank(c.k) ? ` <span class="tag hire-rank">${esc(t('hire.rank', { n: hireRank(c.k) }))}${nextHireTab === c.k ? ` · ★ ${esc(t('hire.recommend'))}` : ''}</span>` : ''}
          <div class="st">แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</div>
          <div class="st">${esc(c.line)}</div></span>
        <button class="sm" data-hire="${c.k}" ${g.coin < c.hire ? 'disabled' : ''}>จ้าง ${c.hire}</button>
      </div>`).join('') : '<div class="empty">จ้างครบทุกคนแล้ว</div>')
      // ยักษ์ทวารบาลอยู่ในแท็บนี้ด้วย — เป็นคน ไม่ใช่สิ่งก่อสร้าง
      // (เดิมตัวจัดการปุ่มไปรออยู่แท็บก่อสร้าง แต่ไม่เคยมีใครวาดปุ่มให้ เลยจ้างไม่ได้เลย)
      + `<div style="font-size:var(--text-xs);color:var(--muted-foreground);margin:12px 0 6px">ยามประจำโซน</div>
      <div class="crew">
        <span class="pw-av">${face(GUARD.img, '🛡️')}${powerBadgeHtml('guard', { zone: g.zone })}</span>
        <span class="n"><b>${GUARD.name}</b>${!g.guard ? ` <span class="tag hire-rank">${esc(t('hire.rank', { n: hireRank('guard') }))}${nextHireTab === 'guard' ? ` · ★ ${esc(t('hire.recommend'))}` : ''}</span>` : ''}
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
      + [...STATIONS.filter(s => s.cost > 0)].sort((a, b) => g.buildUnlockLv(a.k) - g.buildUnlockLv(b.k) || BUILD_PLAN.findIndex(p => p.k === a.k) - BUILD_PLAN.findIndex(p => p.k === b.k)).map(s => {
        const built = g.stations.some(x => x.def.k === s.k);
        const bt = g.availableBuilder(), builderBusy = !bt&&!g.workers().length;
        const lockedS = !built && g.buildLocked(s.k), recS = !built && g.recommendedBuild() === s.k;
        const open = s.tags.filter(t => !g.activeTags().includes(t)).map(t => SINS[t].name);
        return `<div class="shop${lockedS ? ' build-locked' : ''}${recS ? ' build-recommended' : ''}" ${lockedS ? 'style="opacity:.62"' : ''}><span class="g">${s.glyph}</span>
          <span class="n"><b>${s.name}</b>${recS ? ` <span class="tag" style="background:#d4a35533;color:var(--gold)">★ ${esc(t('unlock.recommend'))}</span>` : ''}${lockedS ? ` <span class="tag">🔒 ${esc(t('unlock.lockedAt', { n: g.buildUnlockLv(s.k) }))}</span>` : ''}<div>${esc(s.desc)}</div>
            ${s.use ? `<div style="color:var(--gold)">${esc(s.use)}</div>` : ''}
            <div>${s.tags.length ? 'ตรงกรรม: ' + s.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}</div>
            ${!built && open.length ? `<div style="color:var(--gold)">สร้างแล้วจะเริ่มมีสำนวน "${open.join(' · ')}" ส่งเข้าคิว</div>` : ''}</span>
          <button class="sm" data-build="${s.k}" ${built || lockedS || g.coin < s.cost || builderBusy ? 'disabled' : ''}
            ${!built && !lockedS && builderBusy ? `title="${esc(g.builders().length ? 'ช่างทุกคนติดงานอื่นอยู่' : 'ต้องจ้างช่างก่อน')}"` : ''}>${built ? 'สร้างแล้ว' : lockedS ? '🔒 ' + t('unlock.lockShort', { n: g.buildUnlockLv(s.k) }) : builderBusy ? 'ช่างไม่ว่าง' : 'สร้าง ' + s.cost}</button>
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
function profile(imgKey, name, duty, now, badge = '') {
  // ไม่มีทั้งรูปโปรไฟล์และรูป standee ก็ซ่อนกรอบไปเลย อย่าปล่อยไอคอนรูปแตกไว้
  const std = artUrl(imgKey);
  const fallback = `this.onerror=function(){this.style.visibility='hidden'};`
                 + `this.src='${std}';this.classList.remove('full')`;
  const picture = `<img class="full" src="${artUrl(imgKey + '-profile') || std}" alt=""
         onerror="${fallback}" onload="if(!this.src.includes('-profile'))this.classList.remove('full')">`;
  return `<div class="prof">
    ${badge ? `<span class="pw-av">${picture}${badge}</span>` : picture}
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
  if (g.star5 >= 3) return '"ห้าดาวมาสามครั้งแล้ว ตัดสินให้ตรงกรรมต่อไป EXP ถึงเกณฑ์ก็เลื่อนขั้นเอง"';
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
    `<div class="row-truth ${d.known ? '' : 'hid'}" style="color:${sentenceColor(d.w).color}">${SINS[d.s].name} · ${esc(d.t)} (น้ำหนัก ${d.w})${d.known ? '' : ' ← เรื่องที่สำนวนไม่ได้เขียนไว้'}</div>`).join('')
    || '<div class="row-truth">สำนวนว่างเปล่า</div>';
  const shownMerits = closed ? soul.merits : soul.merits.filter(m => !m.fake || m.exposed);
  const merit = shownMerits.map(m =>
    `<div class="row-truth ${m.fake ? 'fake' : ''}" style="color:${sentenceColor(m.v).color}">🪷 ${esc(m.t)}${m.fake ? ' ← บุญปลอม เขากุขึ้นเอง' : ` (ลด ${m.v} วาระ)`}</div>`).join('')
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
    ${kv([`ธรรม ${r.tham}`, `เข็ด ${r.ked}`, `รวม ${r.score}`,
          '★'.repeat(r.stars ?? 0) + '☆'.repeat(5 - (r.stars ?? 0))])}`;
}

function drawSide() {
  const box = $('#side');
  $('#side-info').setAttribute('aria-selected', side === 'info' ? 'true' : 'false');
  $('#side-log').setAttribute('aria-selected', side === 'log' ? 'true' : 'false');

  if (side === 'log') {
    box.className = 'log';
    box.innerHTML = teamReportsHtml(g)+g.logs.map(l =>
      `<div class="${l.kind}"><span style="opacity:.45">[${String(l.t).padStart(3, '0')}]</span> ${esc(l.text)}</div>`).join('');
    bindTeamReports(box,g,refresh);
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
  html += teamReportsHtml(g);
  box.innerHTML = html;
  bindTeamReports(box,g,refresh);
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
      const state = g.powerLocked(p) ? (p.k === 'hypno' ? 'ล็อก (ชนะบอสชายแดนโซน 3)' : `ล็อก (ขั้น ${p.lv})`)
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
            `🪙 ${Math.round(g.coin)}`, `🍙 เสบียง ${Math.round(g.food)}`, `🔹 ${t('battle.mp')} ${Math.round(g.mp)}/${g.mpMax}`, `✨ EXP ${g.exp}/${LEVELS[g.level]?.exp || 'MAX'}`])
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
    const strong = [['แรง', c.raeng], ['ระเบียบ', c.reader ? g.allyStats(c).order : c.rabiab], ['ปัญญา', c.panya], ['เมตตา', c.metta]]
      .sort((a, b) => b[1] - a[1]);
    // ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — โชว์ท่าสู้/ตัวเลขจริงตรงกับโต๊ะนิรา (ดึงจาก CREW_POWER ที่เดียวกัน)
    const battleLine = !c.reader
      ? `<div class="row-truth">⚔️ ท่าสู้: <b>${crewAbility(c)}</b> · คูลดาวน์ ${BATTLE.crewCd} วินาที</div>` : `<div class="row-truth">${crewAbility(c)}</div>`;
    return profile('crew-' + c.k, c.name, c.duty, now, powerBadgeHtml(c.k, { zone: g.zone, actor: c }))
      + think(c.say && Date.now() < c.sayUntil ? c.say : pickStable(c.says, c.k))
      + kv([`แรง ${c.raeng}`, `ระเบียบ ${c.reader ? g.allyStats(c).order : c.rabiab}`, `ปัญญา ${c.panya}`, `เมตตา ${c.metta}`,
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
  if (c.panya >= 8) return 'ปัญญาสูง — ไม่เปลี่ยนคะแนนคำตัดสิน กระจกวิเศษใช้ค่านี้จัดอันดับผู้คุมที่แนะนำ';
  if (c.metta >= 8) return 'เมตตาสูง — ไม่เปลี่ยนคะแนน และไม่ลดกรรมที่ตกจากการลงทัณฑ์เกิน';
  if (c.raeng >= 8) return 'แรงสูง — ทัณฑ์เสร็จเร็ว ไม่เปลี่ยนคะแนนคำตัดสิน';
  if (c.rabiab >= 8) return 'ระเบียบสูง — ไม่เปลี่ยนคะแนนคำตัดสิน กระจกวิเศษใช้ค่านี้จัดอันดับผู้คุมที่แนะนำ';
  return 'สเตตัสกลาง ๆ ใช้ได้ทั่วไป';
}

/** แถบหิว + ปุ่มป้อนข้าวปั้น (ข้อ D ชุด 13 คุณเป้ 26 ก.ย. 2569) — ใช้ร่วมกัน 3 จุดตามที่ขอ:
 *  โต๊ะนิรา (openNiraOffice) · หน้าต่างสถานีที่มียมทูตคุม (openStation) · คุยกับยมทูตบนแผนที่ (talkCrew)
 *  c = ออบเจ็กต์ยมทูตจริงใน g.crew (มี .hunger) ไม่ใช่ CREW def เฉย ๆ
 *  ปุ่มมี data-feed="<k>" ให้ผู้เรียกไป bind onclick เอง (แต่ละที่ paint()/refresh() ไม่เหมือนกัน) */
function guardRestWidget(c, showName = false) {
  if (!c) return '';
  const rest = c.teaRest, ready = g.stations.some(st => st.def.k === 'tea' && !st.build);
  const progress = rest?.phase === 'rest' ? Math.max(0, Math.min(100, 100*(Date.now()-rest.startedAt)/(rest.until-rest.startedAt))) : 0;
  return `<div class="hunger-line" data-guard-status="${esc(c.id)}">
    ${showName ? `<b class="rest-name">${esc(c.name || (c.k === 'guard' ? GUARD.name : c.k))}</b>` : ''}<span class="bar hp"><i style="width:${Math.max(0,c.morale)}%"></i></span><small>HP ${Math.round(c.morale)}/100</small>
    ${rest ? `<small>${esc(t(rest.phase === 'travel' ? 'g1.travel' : 'g1.resting'))}</small><span class="bar"><i style="width:${progress}%"></i></span><small>${rest.phase === 'rest' ? esc(t('g1.seconds', {n:Math.max(0,Math.ceil((rest.until-Date.now())/1000))})) : ''}</small>`
      : (() => {
        // L3: ปุ่มพักมีทุกคนที่ไม่ใช่ผู้อ่าน — จางพร้อมบอกเหตุผลเมื่อ HP เต็ม / ยังไม่มีศาลาน้ำชา / ล้มอยู่ / อยู่ในศึก
        const full = c.morale >= 100, why = full ? t('g1.full') : !ready ? t('g1.needTea') : g.battle ? t('g1.inBattle') : !actorStanding(c) ? t('g1.down') : '';
        const inTeam = c.k !== 'guard' && (g.party?.members || []).includes(c.k);
        return `<button class="sm" data-guard-rest="${esc(c.id)}" ${why ? 'disabled' : ''}>${esc(t('g1.rest'))}</button>${why ? `<small data-rest-why>${esc(why)}</small>` : inTeam ? `<small data-rest-team>${esc(t('g1.inTeam'))}</small>` : ''}`;
      })()}
    </div>`;
}
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
  root.querySelectorAll('[data-guard-rest]').forEach(b => b.onclick = () => { if (g.restGuard(b.dataset.guardRest)) after(); });
  root.querySelectorAll('[data-feed]').forEach(b => b.onclick = () => {
    if (g.feedCrew(b.dataset.feed)) { sfx('coin'); after(); }
  });
}

/** ป้ายบนหัวแท็บ — บอกว่ามีอะไรให้กดบ้าง ไม่ต้องเปิดดูเอง */
function drawTabHeads() {
  const hire = CREW.filter(c => !g.crew.some(x => x.k === c.k)).length + (g.guard ? 0 : 1);
  const build = STATIONS.filter(s => s.cost > 0 && !g.stations.some(x => x.def.k === s.k) && !g.buildLocked(s.k)).length;   // P1: ที่ล็อกอยู่ไม่นับว่า 'สร้างได้'
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
  if (g.over || g.battle || dlg.open || g.guardActive()) return;
  const n = g.nearestMob();
  if (n && n.d <= MOB.fabReach) { fightMob(n); return; }
  g.attack(); refresh();
}

/** ปุ่มปีศาจบนแผนที่มีทางเดียวคือเข้าฉากต่อสู้ */
let atkSig = '';
function drawAtk() {
  const btn = $('#atk'), fab = $('#fab-atk');
  const n = g.over || g.guardActive() ? null : g.nearestMob();
  const near = n && n.d <= MOB.fabReach;
  const sig = `${g.mobs.length}/${g.over ? 1 : 0}/${g.guard ? 1 : 0}/${near ? 1 : 0}`;
  if (sig === atkSig) return;
  atkSig = sig;
  btn.hidden = !!g.over || g.guardActive() || !g.mobs.length;
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
  if (!g.queue[0] || !g.caseReady(g.queue[0]) || g.over || g.battle) return;
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

const CH_BASE = 82;                             // ความสูงตัวละครบนฉาก ต้องตรงกับ CREW_H ใน scene.js
const charH = () => CH_BASE * mapCharK();      // L1: ตัวละครในเมืองโซน 1 ย่อลง หมุดตามลงด้วย
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

// ---------- P4 §4 · กดคุยตัวละครบนแผนที่ (บรรยากาศล้วน — ไม่ให้ทรัพยากร/เบาะแส ไม่หยุดเกม) ----------
const talkHelpers = { walkPosition: afterlifeWalkPosition };
let talkSess = null;        // { id, n, until } บับเบิลที่เปิดอยู่
let pendingTalk = null;     // { id, at } แตะตัวละครไกล → เดินเข้าหา แล้วเปิดเองเมื่อถึง (D9) · ผู้เล่นเดินเอง/แตะที่อื่น = ยกเลิก
function closeTalk() { ov.querySelectorAll('.mark.talk').forEach(e => e.remove()); talkSess = null; }
function showTalkLine() {
  const tg = talkSess && findTalkTarget(g, talkSess.id, talkHelpers);
  const line = tg && pickTalk(g, tg, { heroName: HERO_NAME, heroTitle: HERO_TITLE });
  if (!line) return closeTalk();
  talkSess.n++; talkSess.until = Date.now() + TALK_MS;
  const more = talkSess.n < TALK_MAX_LINES;
  ov.querySelectorAll('.mark.talk').forEach(e => e.remove());
  const pin = line.first ? 'pin-talk-new' : more ? 'pin-talk-more' : 'pin-talk';
  const el = mark('talk', tg.x, tg.y - charH() * tg.top - 8, `<img class="talk-pin" src="img/ui/${pin}.webp" alt="" width="32" height="32">`,
    `<span class="who">${esc(line.who)}</span><span class="talk-text" role="status">${esc(line.text)}</span><button type="button" class="talk-next">${esc(t(more ? 'talk.next' : 'talk.close'))}</button>`, true);
  el.dataset.talkId = tg.id;
  clampTalk(el);
  const next = ev => { ev.stopPropagation(); if (more) showTalkLine(); else closeTalk(); };
  el.querySelector('.talk-next').onclick = next;
  el.querySelector('.bub').onclick = next;       // แตะบับเบิลเองก็ไปบทถัดไป
}
/** บับเบิลคุยต้องอยู่ในจอเสมอ: เลื่อนซ้ายขวาด้วย --bshift · ชนแถบทรัพยากรด้านบน (84px) → พลิกลงใต้หัว */
function clampTalk(d) {
  const bub = d.querySelector('.bub'); if (!bub) return;
  const m = 8, shift = parseFloat(d.style.getPropertyValue('--bshift')) || 0, r = bub.getBoundingClientRect();
  if (!r.width) return;
  const left = r.left - shift, right = r.right - shift;
  const next = left < m ? m - left : right > innerWidth - m ? innerWidth - m - right : 0;
  if (Math.abs(next - shift) > .5) d.style.setProperty('--bshift', `${next}px`);
  const flipped = d.classList.contains('below'), pinTop = d.getBoundingClientRect().top;
  const needH = bub.offsetHeight + 46;
  d.classList.toggle('below', flipped ? pinTop - needH - 0 < 84 + 40 : pinTop - needH < 84);
}
function advanceTalk() {
  if (!talkSess) return;
  if (talkSess.n < TALK_MAX_LINES) showTalkLine(); else closeTalk();
}
function openTalk(id) { pendingTalk = null; talkSess = { id, n: 0, until: 0 }; showTalkLine(); }
/** แตะ/กดคุย: ใกล้ (≤ INTERACTION_REACH) เปิดทันที · ไกล เดินเข้าหาแล้วเปิดเองเมื่อถึง
 *  @param {boolean} fromButton ปุ่ม 💬/E อยู่ในระยะคุยแล้วเสมอ */
function talkTo(id, fromButton = false) {
  const tg = findTalkTarget(g, id, talkHelpers);
  if (!tg) return false;
  if (fromButton || talkDistance(g, tg) <= INTERACTION_REACH) { openTalk(id); return true; }
  if (g.walkTo(tg.x, tg.y)) pendingTalk = { id, at: Date.now() };
  return true;
}
function updateTalk() {
  const now = Date.now();
  if (pendingTalk) {
    const tg = findTalkTarget(g, pendingTalk.id, talkHelpers);
    if (!tg || now - pendingTalk.at > 15000 || dlg.open || g.over || g.battle) pendingTalk = null;
    else {
      const d = talkDistance(g, tg), moving = g.player.tx != null || !!g.player.path?.length;
      if (d <= 80 || (!moving && d <= 140)) openTalk(pendingTalk.id);
      else if (!moving && now - pendingTalk.at > 800) pendingTalk = null;
    }
  }
  if (!talkSess) return;
  const tg = findTalkTarget(g, talkSess.id, talkHelpers);
  if (!tg || now > talkSess.until || talkDistance(g, tg) > TALK_DISMISS || dlg.open || g.over || g.battle) closeTalk();
}
/** บรรทัดทักบนหัวโต๊ะนิรา / ร้านพ่อค้า (ชุดบทของ Rae) — เลือกครั้งเดียวตอนเปิดกล่อง ไม่เปลี่ยนตามการวาดซ้ำ */
function greetLine(target, extra) {
  const line = pickTalk(g, target, { heroName: HERO_NAME, heroTitle: HERO_TITLE, ...extra });
  return line ? `<p class="talk-greet"><b>${esc(line.who)}</b> “${esc(line.text)}”</p>` : '';
}

/** หมุดที่ผูกกับตัวละครที่เดินได้ — อัปเดตพิกัดทุกเฟรม ไม่ต้องรอ refresh */
function followMarks() {
  for (const d of ov.children) {
    if (d.dataset.talkId) {                      // P4: บับเบิลคุยตามตัวที่คุยด้วย (ยมทูต/คนงาน/วิญญาณเดินได้)
      const tg = findTalkTarget(g, d.dataset.talkId, talkHelpers);
      if (tg) { d.dataset.sx = tg.x; d.dataset.sy = tg.y - charH() * tg.top - 8; place(d); clampTalk(d); }
      continue;
    }
    if (!d.dataset.follow) continue;
    const c = g.crewOf(d.dataset.follow);
    if (!c || c.x == null) continue;
    d.dataset.sx = c.x + Number(d.dataset.followDx || 0);
    d.dataset.sy = c.y - charH() - 8;
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
  const keepTalk = ov.querySelector('.mark.talk');   // P4: บับเบิลคุยตัวละครต้องรอดการล้างชั้นซ้อน (เหมือนปุ่มสู้)
  ov.innerHTML = '';
  if (keepFab) ov.appendChild(keepFab);
  if (keepBossFab) ov.appendChild(keepBossFab);
  if (keepFrontierFab) ov.appendChild(keepFrontierFab);
  for (const f of keepRepairFabs) ov.appendChild(f);
  if (keepPrisonFab) ov.appendChild(keepPrisonFab);
  if (keepBreachFab) ov.appendChild(keepBreachFab);
  if (keepDevaFab) ov.appendChild(keepDevaFab);
  for (const f of keepZoneEventFabs) ov.appendChild(f);
  if (keepTalk) ov.appendChild(keepTalk);
  if (g.over) return;
  const s = g.caseReady(g.queue[0]) ? g.queue[0] : null;

  if (fx && !fx.quiet) {     // P3: praise/rebuke verdicts show their stars and score inside the head's scene instead
    const col = fx.score >= 78 ? 'var(--success)' : fx.score >= 50 ? 'var(--gold)' : 'var(--destructive)';
    const d = document.createElement('div');
    d.className = 'score';
    d.dataset.sx = SPOTS.bench.x; d.dataset.sy = SPOTS.bench.y - 104;
    const st = '★'.repeat(fx.stars) + '☆'.repeat(5 - fx.stars);
    d.innerHTML = `<span style="color:${col};font-size:2rem;letter-spacing:2px">${st}</span>` +
      `<small style="color:${col}">${fx.score} คะแนน · ธรรม ${fx.tham} · เข็ด ${fx.ked}</small>`;
    ov.appendChild(d); place(d);
    const feedback=mark('boss speech-side', SPOTS.throne.x, SPOTS.throne.y - charH() - 8, '👑',
      `<span class="who">${esc(authorityOf(g.zone).title)}</span>${esc(fx.line)}<button type="button" class="verdict-dismiss" data-dismiss-verdict>รับทราบ · ข้ามข้อความ</button>`, true);
    feedback.querySelector('[data-dismiss-verdict]').onclick=()=>showVerdict.dismiss?.();
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
  const nm = mark('case speech-side', nx, ny - charH() - 8, '📜',
    `<span class="who">นิรา · สำนวน #${String(s.id).padStart(3, '0')}</span>ผู้ตายเป็น<b>${esc(s.name || s.who)}</b>${rec}`);
  if (nira) nm.dataset.follow = 'nira';        // เธอเดินเตร็ดเตร่ หมุดต้องตามหัวไปทุกเฟรม

  const said = s.said.slice(-6).map(x =>
    `<div class="line ${SAID_STYLE[x.kind] || ''}">${SAID_ICON[x.kind] || ''} ${esc(x.text)}</div>`).join('')
    || '<div class="line">...เขาก้มหน้าไม่พูดอะไร</div>';
  const hasNew = s.said.some(x => x.kind === 'truth' || x.kind === 'confess' || x.kind === 'false');
  mark('soul speech-side', QUEUE_LINE[0][0], QUEUE_LINE[0][1] - charH() - 8, hasNew ? '❗' : '💬',
    `<span class="who">${esc(s.who)}</span>${said}`);
}

/** อัปเดตทางเข้าศาลตามคิววิญญาณทุกเฟรม */
function updateTrialBtn() {
  const awaiting=!!g.queue[0]&&!g.caseReady(g.queue[0]);
  const s = g.caseReady(g.queue[0]) ? g.queue[0] : null;
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
    trial.title = trial.disabled ? t(awaiting?'trial.soulArriving':'hud.noCourt') : t('hud.trialBegins');
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
  if (g.over || g.battle || dlg.open || g.guardActive() || !g.mobs.length) return gone();
  const n = g.nearestMob();
  if (!n || n.d > MOB.fabReach) return gone();
  let f = ov.querySelector('.mobfab');
  if (!f) {
    f = document.createElement('button');
    f.className = 'mobfab';
    f.textContent = '⚔️ กดเพื่อเข้าสู้';
    f.onclick = ev => {
      ev.stopPropagation();
      if (g.over || g.battle || dlg.open || g.guardActive()) return;
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
  if (g.zone==='th'&&g.bossCleared.th || g.over || g.battle || dlg.open || (!g.bossCanChallenge() && !pier)) return gone();
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
  // N1: ขอบล่างปุ่ม (translate -100%) ชิดเหนือหัวบอส — ตำแหน่งเดียวกับที่ป้ายดำเดิมเคยอยู่ (ความสูงบอส = 92*1.12 เท่าของยมบาท ดู scene.js)
  f.dataset.sx = SPOTS.bossPier.x;
  f.dataset.sy = SPOTS.bossPier.y - 92 * 1.12 * CHAR_SCALE_MAP - 12;
  place(f);
}

/** ประตูชายแดนเปิดได้เมื่อเดินมาถึงเท่านั้น เหมือนสถานที่อื่นในฉาก */
let borderGateLatched=false;
function updateFrontierFab() {
  const gone = () => { const e = ov.querySelector('.frontierfab'); if (e) e.remove(); };
  const near = Math.hypot(g.player.x - FRONTIER.x, g.player.y - FRONTIER.y) <= FRONTIER.reach;
  gone();
  if(!near){borderGateLatched=false;return;}
  if(!started||g.over||g.battle||dlg.open||borderGateLatched)return;
  borderGateLatched=true;
  openBorder();
}

/** เรียกช่างที่ว่างจากแผนที่ได้เมื่ออาคารพัง
 *  P4: ปุ่มคุยตัวละคร (kind 'talk') มีสิทธิ์ต่ำสุด — โผล่เมื่อไม่มี interaction อื่นในระยะ และไม่ได้ยืนที่จุดสร้าง/ประตูชายแดน */
function baseMapInteraction() {
  if (g.over || g.battle || dlg.open) return null;
  const point=g.harbourPoint(),mealPoint=canteenPoint(g);
  return nearestInteraction(g.player,[...mapInteractions(g, MERCHANT),...(canteenActive(g)?[{id:'canteen',kind:'canteen',x:mealPoint[0],y:mealPoint[1],bx:mealPoint[0],by:mealPoint[1]+25,label:'โรงอาหาร · จัดอาหารและคนงาน'}]:[]),
    // N1 (คุณเป้ 16 ต.ค. ภาพ 7 ลูกศรชี้ไปที่เท้ายมบาทปลายท่า): ปุ่มกึ่งกลางอยู่ที่ปลายท่าใต้เท้า (หน้าหินหัวท่า) ไม่ลอยกลางน้ำ
    // และไม่ทับป้ายบอสที่อยู่เหนือท่า (ท่าอยู่ห่างบอสแค่ ~100 หน่วย — วางเหนือหัวแล้วปุ่มสองอันซ้อนกันบนจอแคบ)
    {id:'harbour',kind:'harbour',x:point.x,y:point.y,bx:point.x,by:point.y+26,label:'ท่าเรือ · Fast Travel'}]);
}
function talkInteraction() {
  if (g.over || g.battle || dlg.open || !started || talkSess) return null;   // บับเบิลเปิดอยู่ → ซ่อนปุ่ม 💬 (E/Enter = บทถัดไป · Esc = ปิด)
  if (nearBuild(g, g.player.x, g.player.y) || Math.hypot(g.player.x-FRONTIER.x,g.player.y-FRONTIER.y) <= 105) return null;
  return nearestInteraction(g.player, talkInteractions(talkTargets(g, talkHelpers), charH()), TALK_REACH);
}
function currentMapInteraction() { return baseMapInteraction() || talkInteraction(); }


function activateMapInteraction(now) {
      if (now.kind === 'repair') {
        if (g.repairStation(now.key)) { sfx('crack'); refresh(); }
      } else if (now.kind === 'harbour') openHarbour();
      else if(now.kind==='canteen')modal('<h2>🍲 โรงอาหาร</h2>'+workersPanelHtml(g),d=>{d.querySelector('[data-hire-worker]')?.remove();bindWorkersPanel(d,g,()=>{dlg.close();activateMapInteraction(now);});});
      else if (now.kind === 'talk') talkTo(now.key, true);
      else if (now.kind === 'nira') openNiraOffice();
      else if (now.kind === 'merchant') openMerchant();
      else if (now.kind === 'challenge') openChallenge();
      else if (now.kind === 'zoneEvent') openZoneEventAlert(ZONE_EVENTS[g.zone].find(ev => ev.k === now.key));
      else if (now.kind === 'devaEncounter') openDevaEncounter(now.key);
      else if (now.kind === 'finalEncounter') openFinalEncounter(now.key);
      else if (now.kind === 'finalRest') openStation('tea', true);
      else openStation(now.key);
}

const townPanel = document.getElementById('town-map-panel');
const townMapCanvas = document.getElementById('town-minimap');
const townActionButton = document.getElementById('town-action');
let townHudAt = 0;
function currentTownAction() {
  if (!started || dlg.open || !heroProfile.hidden) return null;
  const act = townNearbyAction(g, baseMapInteraction(), nearBuild(g,g.player.x,g.player.y));
  if (act) return act;
  const talk = isTownZone(g.zone) ? talkInteraction() : null;
  return talk ? { kind:'interaction', target:talk } : null;
}
function activateTownAction() {
  if (talkSess) return advanceTalk();
  const action=currentTownAction();
  if (!action) return;
  if (action.kind === 'build') openBuild(action.target);
  else if (action.kind === 'frontier') openBorder();
  else activateMapInteraction(action.target);
}
townActionButton.onclick = activateTownAction;
function updateTownHud(now) {
  const show=started && isTownZone(g.zone) && !g.over && !g.battle;
  townPanel.hidden=!show;
  const title=townTitle(g.zone, g.zoneDef().name);
  const summary=townPanel.querySelector('summary');
  if (summary.textContent!==title) summary.textContent=title;
  const action=show ? currentTownAction() : null;
  townActionButton.hidden=!action;
  if (action) {
    const label=action.kind==='build' ? (g.buildLocked(action.target.k) ? `🔒 ${action.target.name} · ${t('unlock.lockedAt',{n:g.buildUnlockLv(action.target.k)})}` : `${g.recommendedBuild()===action.target.k ? '★ ' : ''}${t('town.build')} · ${action.target.name}`)
      : action.kind==='frontier' ? t('town.frontier')
      : [action.target.label,STATIONS.find(s=>s.k===action.target.key)?.name].filter(Boolean).join(' · ');
    townActionButton.innerHTML=`<kbd>E</kbd>${esc(label)}`;
  }
  if (!show || !townPanel.open || now-townHudAt<100) return;
  townHudAt=now;
  const c=townMapCanvas.getContext('2d'), w=townMapCanvas.width,h=townMapCanvas.height;
  c.clearRect(0,0,w,h);
  c.fillStyle='#271923';c.fillRect(0,0,w,h);
  c.save();c.scale(w/SCENE.w,h/SCENE.h);c.globalAlpha=.65;drawTownTerrain(c,key=>img(key));c.restore();
  for(const site of townSites(g)) {
    c.fillStyle=site.state==='built'?'#e9c789':site.state==='building'?'#ee9260':'#9b8d80';
    c.fillRect(site.x/SCENE.w*w-2,site.y/SCENE.h*h-2,4,4);
  }
  // Canvas covers the stage; invert the shared viewport projection for the world frame.
  const view=mapCam.viewport;
  if(view?.sx&&view?.sy) {
    const clamp=n=>Math.max(0,Math.min(1,n));
    const x=clamp(-view.tx/view.sx/SCENE.w),y=clamp(-view.ty/view.sy/SCENE.h);
    const right=clamp((view.width-view.tx)/view.sx/SCENE.w),bottom=clamp((view.height-view.ty)/view.sy/SCENE.h);
    c.strokeStyle='#f3d4a788';c.lineWidth=1;c.strokeRect(x*w,y*h,(right-x)*w,(bottom-y)*h);
  }
  c.fillStyle='#fff4d2';c.beginPath();c.arc(g.player.x/SCENE.w*w,g.player.y/SCENE.h*h,3,0,Math.PI*2);c.fill();
}

/** NPC actions stay on the actual head; nearby building actions stay at the building centre. */
function updateRepairFabs() {
  const active=started&&!g.over&&!g.battle&&!dlg.open;
  const near=active?currentMapInteraction():null;
  const targets=active?mapInteractions(g,MERCHANT).filter(t=>t.kind==='nira'||t.kind==='merchant'):[];
  if(near&&!targets.some(t=>t.id===near.id))targets.push(near);
  for(const f of ov.querySelectorAll('.repairfab'))if(!targets.some(t=>t.id===f.dataset.target))f.remove();
  for(const target of targets){
    let f=[...ov.querySelectorAll('.repairfab')].find(e=>e.dataset.target===target.id);
    if(!f){
      f=document.createElement('button');f.className='repairfab';f.dataset.target=target.id;
      f.onclick=ev=>{
        ev.stopPropagation();
        const now=mapInteractions(g,MERCHANT).find(t=>t.id===f.dataset.target)||currentMapInteraction();
        if(!now)return;
        if(Math.hypot(g.player.x-now.x,g.player.y-now.y)>(now.reach||INTERACTION_REACH)){g.walkTo(now.x,now.y);return;}
        activateMapInteraction(now);
      };
      ov.appendChild(f);
    }
    if(target.kind==='talk')f.innerHTML=`<img class="talk-ico" src="img/ui/icon-talk.webp" alt="" width="20" height="20">${esc(target.label)}`;else f.textContent=target.label;
    f.disabled=target.kind==='repair'&&!g.canRepair(target.key);
    f.dataset.sx=target.bx;f.dataset.sy=target.by;f.classList.toggle('anchor-top', target.anchor === 'top');
    place(f);
    const v=mapCam.viewport;
    if(v?.sx&&v?.sy){const x=target.bx*v.sx+v.tx,y=target.by*v.sy+v.ty;f.hidden=x<0||x>v.width||y<0||y>v.height;}
  }
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
  const merchantOpen = g.zoneCaptivesFree();   // พ่อค้าโซน 4 ยังถูกขังจนกว่าจะช่วย (cyberRescue)
  modal(`${eventAlertMainHtml(title, description, art,
    `${ackOnly ? '' : `<button data-close>${esc(t('common.close'))}</button>`}
      <button class="gold event-alert-go" data-event-go${ackOnly ? ' data-close' : ''}>${esc(action)}</button>`)}
    <div class="event-alert-prep"><p>${esc(t('event.prep.title'))}</p><div class="event-alert-cards">
      ${prep('merchant', t('event.prep.merchant'), merchantOpen ? t('event.prep.merchantLine') : t('event.prep.merchantLocked'), 'img/merchant-profile.jpeg', !merchantOpen)}
      ${prep('nira', t('event.prep.nira'), t('event.prep.niraLine'), artUrl('crew-nira-profile'))}
      ${prepItemsHtml('bag')}
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
    bindPrepItems(d, 'bag', reopen);
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
/** I2-C — แสดงไอเท็มกระเป๋าแบบเดียวกันทั้งแจ้งเตือนและเตรียมศึก */
function prepItemKeys() {
  return ['tea', 'health', 'holyWater', ...Object.keys(g.inventory).filter(k =>
    !['tea', 'health', 'holyWater'].includes(k) && g.inventory[k] > 0 && ITEMS[k]?.consumable)];
}
function prepItemReady(k, context) {
  return g.inventory[k] > 0 && !!medicineResult(k, g.battle ? g.battle.youHp : g.hp,
    g.battle ? g.battle.youMax : g.hpMax, g.mp, g.mpMax, context);
}
function prepItemsHtml(context) {
  const keys = prepItemKeys();
  const canFill = keys.some(k => ITEMS[k]?.hp && prepItemReady(k, context));
  return `<div class="prep-box"><div class="prep-items">${keys.map(k => {
    const n = g.inventory[k] || 0;
    return `<button class="prep-item" data-prep-use="${k}" ${prepItemReady(k, context) ? '' : 'disabled'}
      aria-label="${esc(itemName(k))} x ${n}" title="${esc(itemText(k, 'desc'))}">
      ${itemImg(k)}<span class="prep-item-count">x ${n}</span></button>`;
  }).join('')}</div><button class="prep-fill" data-prep-fill ${canFill ? '' : 'disabled'}>${esc(t('event.prep.medicineLine'))}</button></div>`;
}
function bindPrepItems(root, context, repaint) {
  root.querySelectorAll('[data-prep-use]').forEach(button => button.onclick = () => {
    if (g.useMedicine(button.dataset.prepUse, context)) { sfx('star'); repaint(); }
  });
  root.querySelector('[data-prep-fill]')?.addEventListener('click', () => {
    let used = false;
    // ใช้อัตราฟื้นฟู/จำนวนต่อชิ้นเดิม จนเต็มหรือของฟื้น HP หมด
    for (const k of ['health', ...prepItemKeys().filter(k => k !== 'health' && ITEMS[k]?.hp)]) {
      while (prepItemReady(k, context) && g.useMedicine(k, context)) used = true;
    }
    if (used) { sfx('star'); repaint(); }
  });
}
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
    g.zoneEventStatus?.(ev.k) === 'pending' && ev.k !== DEVA_MAP[g.zone]?.key).sort((a, b) => a.atCases - b.atCases);
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
function openDevaEncounter(key) {
  const a = devaMapActors(g).find(a => a.key === key && a.enabled);
  if (!a) return;
  if (Math.hypot(g.player.x-a.x, g.player.y-a.y) > INTERACTION_REACH) { g.walkTo(a.x,a.y); return; }
  openZoneEventAlert(ZONE_EVENTS[g.zone].find(ev => ev.k === key));
}
function openFinalEncounter(id) {
  const a = finalEventActors(g).find(a => a.id === id);
  if (!a?.enabled || nextFinalEncounter(g.finalEventState()) !== id) return;
  if (Math.hypot(g.player.x-a.x,g.player.y-a.y) > INTERACTION_REACH) { g.walkTo(a.x,a.y); return; }
  openFinalPreparation(id);
}
function openFinalPreparation(id = null) {
  const targets = finalPreparationTargets(g);
  modal(`<h2>${esc(t('final.prep.title'))}</h2><p>${esc(t('final.map.prepare'))}</p>
    <div class="row">${Object.keys(targets).map(key => `<button data-final-prep="${key}" ${targets[key] ? '' : 'disabled'}>${esc(t('final.prep.' + key))}</button>`).join('')}</div>
    <div class="row"><button data-close>${esc(t('common.close'))}</button>${id ? `<button class="gold" data-final-go>${esc(t('event.prep.fight'))}</button>` : ''}</div>`, d => {
    d.querySelectorAll('[data-final-prep]').forEach(b => b.onclick = () => {
      const target = finalPreparationTargets(g)[b.dataset.finalPrep];
      if (target && g.walkTo(target.x, target.y)) { g.dismissFinalPreparation(); dlg.close(); }
    });
    d.querySelector('[data-final-go]')?.addEventListener('click', () => {
      g.dismissFinalPreparation(); if (g.startFinalEncounter(id)) openBattle(afterBreachBattle);
    });
  });
  onDlgClose(() => g.dismissFinalPreparation());
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
  if (ev.k === 'westHypnotized' && Math.hypot(g.player.x-WEST_RESCUE.x,g.player.y-WEST_RESCUE.y) > INTERACTION_REACH) {
    openEventAlert(ev.k, zoneEventText(ev.title), zoneEventText(ev.alert), zoneEventMarkerArt(ev), t('west.rescue.approach'), () => {
      dlg.close(); g.walkTo(WEST_RESCUE.x, WEST_RESCUE.y);
    }, false, true);
    return;
  }
  const title = zoneEventText(ev.title);
  const foe = ev.foe || ev.foes?.[0] || ev.waves?.[0]?.[0];
  const foeArt = foe?.sp && foe.sp !== 'spirit' ? storyFoeArt(foe.sp)
    : foe?.kind != null ? artUrl(MOB.kinds[foe.kind].img) : 'img/spirit7.png';
  if(ev.k==='thBorderBoss') {
    openEventAlert(ev.k,title,'บอสโซน 1 รออยู่ในถ้ำนอกชายแดน — เดินผ่านป่า น้ำตก หุบเขา และเหวเพื่อไปพบ',foeArt,'เดินไปด่านชายแดน',()=>{dlg.close();g.walkTo(FRONTIER.x,FRONTIER.y);},false,true);
    return;
  }
  if (ev.team === 'frontier') {              // ชุด 29C ข้อ 9 — ระลอกชายแดนของโซน 2–4: แจ้งเตือน → เดินไปชายแดนเอง → เตรียมทีม → สู้
    openEventAlert(ev.k, title, ev.k === 'westVampireBreach' ? zoneEventText(ev.alert) : t('event.frontierBreach.march'), foeArt, t('event.frontierBreach.ack'), () => dlg.close(), false, true);
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
  const awaiting=!!g.queue[0]&&!g.caseReady(g.queue[0]);
  const s = g.caseReady(g.queue[0]) ? g.queue[0] : null;
  if (!s || g.over || g.battle) {
    deckBar.innerHTML = `<div class="idle">${esc(t(awaiting?'trial.soulArriving':'hud.noCourt'))}</div>`;
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
  great:    '"นี่แหละที่เรียกว่าตรงกรรม" — หัวหน้าชมคำตัดสินของท่าน',
  ok:       'ท่านอ่านคำตัดสินจนจบ วางลง แล้วมองไปทางอื่น — ใช้ได้ ไม่ถึงกับดี',
  cruel:    '"ถูกฝาถูกตัว แต่เจ้าใส่เกินไปสองวาระ ส่วนเกินนั้นไม่ได้หายไปไหน มันมาอยู่ที่เจ้า"',
  bad:      '"เจ้าอ่านสำนวน หรือเจ้าเดา" — บารมีถูกหักต่อหน้าทุกคน',
  terrible: '"คำตัดสินแบบนี้ ทำให้คนที่เขาเจ็บมาแล้ว เจ็บซ้ำอีกครั้ง" — บารมีถูกหักหนัก',
};

// The praise grade starts below five stars; only five stars can heal, and high karma may prevent that heal.
// Report the existing star bonus without promising a restoration the verdict did not grant.
function verdictComment(v) {
  const bonus = v.stars === 5 ? 60 : v.stars === 4 ? 25 : 0;
  return (v.reason || BOSS_LINE[v.boss] || BOSS_LINE.ok) + (bonus ? ` · เบี้ยพิเศษ +${bonus}` : '');
}

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
  fx = { ...v, line: verdictComment(v), quiet: !!g.pendingVerdictScene };
  g.bossUntil = performance.now() + 7000;      // พ่อมานั่งบัลลังก์ให้เห็นชั่วครู่
  clearTimeout(showVerdict.t);
  const current=fx;
  showVerdict.dismiss=onceFeedbackDismiss(() => {
    if(fx!==current)return;
    clearTimeout(showVerdict.t);g.bossUntil=0;fx = null; drawOverlay();
    if (g.over && (g.over.k !== 'finalWin' || (!g.pendingReward?.encounter && !g.storyQueue.length))) { g.paused = true; updatePlay(); openEnding(g.over); }
  });
  showVerdict.t = setTimeout(showVerdict.dismiss, 7000);
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
function openAuthorityWarning() {
  const w=g.pendingWarn; if(!w)return;
  g.pendingWarn=null; g.save();
  const auth=authorityOf(g.zone);
  bossModal(`คำตัดสินแดง ${w.n}/${w.of} · ${auth.full}`,
    `${w.text ? `${w.text}\n\n` : ''}${w.n===w.of ? 'หัวหน้าจะตรวจและลงโทษท่านด้วยตนเอง' : `อีก ${w.of-w.n} คำตัดสินแดงติดกัน หัวหน้าจะลงมาด้วยตนเอง`}\nตัดสินได้สีเขียวจะล้างคำตัดสินแดงที่สะสม`, 'รับทราบ');
  if(w.fireball) {
    const hit=document.createElement('div');hit.className='warning-yama';
    hit.innerHTML=`<img src="${heroCry()}" alt="Yama ถูกลูกไฟ"><img class="warning-fireball" src="img/fx-fireball.png" alt="ลูกไฟ"><p>HP ${Math.round(g.hp)}/${g.hpMax}</p>`;
    dlg.querySelector('.boss').after(hit);
    playActionCutscene('boss',{image:authorityPunishmentCutscene(g.zone),name:'ลูกไฟตักเตือน'});
    sfx('fire');
  }
  onDlgClose(()=>g.onChange());
}

/** P3 — the zone head reacts to the verdict: praise (five stars, shows what was granted) or rebuke (red verdict).
 *  Queued ahead of the red-streak warning / Yama fight so the words come first; skippable; consumed on open (nothing is granted here). */
function openVerdictScene() {
  const sc = g.pendingVerdictScene; if (!sc) return;
  g.pendingVerdictScene = null; g.save();
  pauseForDlg();
  const col = sc.score >= 78 ? 'var(--success)' : sc.score >= 50 ? 'var(--gold)' : 'var(--destructive)';
  const stars = '★'.repeat(sc.stars) + '☆'.repeat(Math.max(0, 5 - sc.stars));
  dlg.innerHTML = `<div class="intro-comic zone-arrival verdict-scene is-${sc.kind}" role="region" aria-label="${esc(sc.title)}">
    <div class="intro-comic-frame">
      <img src="${esc(verdictSceneImage(sc.zone, sc.kind))}" alt="${esc(sc.speaker)}" onerror="this.onerror=null;this.src='${artUrl('hero-boss')}'">
      <div class="intro-comic-head"><span>${esc(sc.title)}</span></div>
    </div>
    <div class="zone-arrival-band">
      <div class="intro-comic-caption"><h2>${esc(sc.speaker)}</h2><p class="verdict-line">${esc(sc.line)}</p>
        <div class="verdict-stats" style="color:${col}"><span class="verdict-stars">${stars}</span><small>${esc(sc.score)} คะแนน · ธรรม ${esc(sc.tham)} · เข็ด ${esc(sc.ked)}</small></div>
        ${sc.reward ? `<div class="verdict-reward">${esc(sc.reward)}</div>` : ''}</div>
      <div class="intro-comic-controls"><button class="gold" data-verdict-scene-done>รับทราบ · ข้าม</button></div>
    </div>
  </div>`;
  openDlg('intro-comic-dialog verdict-dialog');
  prepareComicImages(dlg);
  dlg.querySelector('[data-verdict-scene-done]').onclick = () => dlg.close();
  onDlgClose(() => g.onChange());
}

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
      const generation=dlgGen;
      setTimeout(() => { if (dlgGen===generation && b?.isConnected) { dlg.close(); } }, 2400);
      onDlgClose(()=>g.onChange());
    });
}

function guideCards(html) {
  const template = document.createElement('template'); template.innerHTML = html;
  const title = template.content.querySelector('h3');
  const heading = title?.textContent || 'สิ่งที่ควรรู้'; title?.remove();
  for (const p of template.content.querySelectorAll('p')) {
    const tile=document.createElement('div');tile.className='guide-tile';tile.innerHTML=p.innerHTML;p.replaceWith(tile);
  }
  // P2: keeper-team page — each article carries a slot for that keeper's drawn profile (assets/crew-<k>-profile.png)
  for (const slot of template.content.querySelectorAll('[data-profile-slot]')) {
    const src = artUrl(`crew-${slot.dataset.profileSlot}-profile`);
    if (src) slot.innerHTML = `<img class="guide-portrait" src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()">`;
  }
  const content = template.innerHTML;
  return `<section class="guide-card"><h3>${esc(heading)}</h3>${content}</section>`;
}
function openHelp() {
  modal(`<div class="help-source" hidden><h2>วิธีเล่น</h2>
    <p style="line-height:var(--leading-body);font-size:var(--text-sm)">
    ท่านคือยมบาทมือใหม่ที่พ่อส่งมาคุมนรกโซนไทย งานคือ <b>พิพากษาให้ตรงกรรม</b> ไม่ใช่ลงโทษให้แรงที่สุด<br>
    <span style="color:var(--muted-foreground);font-size:var(--text-xs)">
    ${esc(t('hud.bookTip'))}</span></p>

    <div class="tline"><b>สามแถบที่ต้องดูตลอด</b><div>
      ❤️ <b>บารมี</b> = ชีวิตของท่าน หมดแล้วพญายมลงมาเอง ·
      ⚖️ <b>ระเบียบ</b> = คูณรายได้ทุกคดี แตะ 0 หลังโดนเตือนครบสามครั้ง พญายมลงมาเอง ·
      ☠️ <b>กรรมท่าน</b> = บาปที่ตกใส่ตัวเอง เต็ม 100 พญายมลงมาเอง<br>
      <b>กดที่แถบไหนก็ได้บนหัวเรื่อง</b> เพื่อดูว่ามันขึ้นลงเพราะอะไร และหมดแล้วเกิดอะไร</div></div>

    <ol style="line-height:var(--leading-body);font-size:var(--text-sm);padding-left:1.2em">
      <li><b>ทีมของท่าน</b> — <b>นิรา</b> อ่านสำนวนให้ฟังอย่างเดียว (ไม่รับเวรลงทัณฑ์) ·
          <b>ทัณฑ์</b> คือผู้คุมคนเดียวที่มีตอนเริ่ม · ถ้าคนไม่พอให้จ้างยมทูตเพิ่ม</li>
      <li><b>เดิน</b> — คลิกที่พื้น หรือกด WASD / ลูกศร ·
          ลงธารลาวาหรือแม่น้ำวิญญาณไม่ได้</li>
      <li>อ่านสำนวนจากหมุด 📜 เหนือหัว<b>นิรา</b> และคำแก้ตัวจากหมุด 💬 เหนือหัววิญญาณ (ชี้เมาส์ หรือแตะ)</li>
      <li><b>ไต่สวนก่อนตัดสิน</b> — คดีทั่วไปให้มองหาคำที่ขัดกับสำนวน ส่วนคดีมีชื่อจะเริ่มจาก
          <b>ภาพลักษณ์ภายนอก</b>เท่านั้น ให้เลือกประเด็นที่น่าสงสัยเพื่อค่อย ๆ เปิดรายการกรรม
          จี้ถูก = เขาสารภาพเรื่องที่ยังไม่เปิดให้<b>ฟรี</b> · จี้ผิด = เสียจังหวะไปเปล่า ๆ
          (จี้ได้ 2 ครั้งต่อคดี) · ใช้<b>ตวาดข่มขู่</b>เพื่อชี้ข้อหลักฐานที่ควรสอบสวน แล้วกดข้อที่มี 💢 · คูลดาวน์ 2 นาที</li>
      <li><b>กระจกวิเศษมีจำนวนจำกัด</b> — ใช้แล้วหมดไป ชนะเทวดาทดสอบได้เพิ่ม 1 บาน เลื่อนขั้นแล้วมีเติมให้ (ตั้งแต่ขั้น 5 เติมเต็ม)
          และเติมเพิ่มได้ที่<b>หอส่องกรรม</b> (สร้างได้เมื่อถึงขั้น 5) ด้วยมินิเกมสะท้อนแสง: วางกระจกแล้วหมุนองศาให้แสงไปถึงกระจกวิเศษบนแท่น
          ค้างไว้จนได้ครั้งละ 1 บาน ต้องรอ 5 วาระก่อนเติมครั้งถัดไป ไม่ใช่เติมได้ไม่จำกัด</li>
      <li><b>คำตัดสินไม่จบที่คดีนั้น</b> — ตัดสินเบาไป เขาไม่เข็ด ปล่อยไปแล้วไปก่อเรื่องต่อ
          แล้ว<b>กลับมายืนหน้าแท่นอีกครั้ง</b>พร้อมสำนวนที่หนากว่าเดิม (มีป้าย ↩️ ในคิว)</li>
      <li>จบเกมแล้วนิราจะวาง<b>แฟ้มชื่อของท่านเอง</b>ไว้ — เปิดอ่านได้จริง
          ข้างในคือทุกคดีที่ท่านลงเกินกรรม และทุกคนที่กลับมาเพราะท่านปล่อยเบา</li>
      <li>เลือก <b>สถานีที่ตรงชนิดกรรม</b> + <b>ระดับวาระให้พอดี</b> แล้วออกหมาย</li>
      <li><b>สถานีที่มี = สำนวนที่จะได้รับ</b> — โซนนี้รับได้เฉพาะกรรมที่ท่านมีที่ลง
          มีแต่กระทะทองแดง ก็มีแต่คดีฉ้อโกงกับมัวเมา · สร้างป่าดาบเพิ่ม คดีฆ่า/ทำร้ายกับวจีทุจริตถึงจะเริ่มเข้าคิว
          · ที่ลงใหม่<b>ปลดล็อกทีละขั้น</b> แนะนำเริ่มจากศาลาน้ำชา → ป่าดาบ (ขั้น 2) → ประตูสวรรค์ (ขั้น 3) ·
          ที่ยังล็อกจะเห็นเป็นเงาพร้อมบอกว่าปลดล็อกที่ขั้นไหน
          (แท็บ <b>ก่อสร้าง</b> บอกไว้ทุกหลังว่าสร้างแล้วเปิดแนวไหน)</li>
      <li><b>เลื่อนขั้นด้วย EXP</b> — พญายมให้ดาว 0–5 ดวงทุกคดี ทุกคำตัดสินได้ EXP ตามคะแนน
          ทุกศึกที่ชนะก็ได้ EXP สะสมถึงเกณฑ์แล้วเลื่อนขั้น · ห้าดาวยัง<b>ลดกรรมของท่าน</b>ให้ด้วยครั้งละ ${KARMA_RELIEF.star5}</li>
      <li><b>ลงทัณฑ์เกินกรรม = โดนลูกไฟ</b> — เกินตั้งแต่สองระดับขึ้นไปทั้งที่คะแนนรวมยังไม่ต่ำกว่า 50 บารมีหาย 1 ใน 5
          (ถ้าคะแนนต่ำกว่า 50 จะนับเป็นคำตัดสินแดงแทน) · บารมีหมดแล้วพญายมลงมาเอง
          ส่งท่านลงกระทะทองแดง กลับมาด้วยบารมี 1 (ไม่จบเกม) ·
          เติมบารมีด้วย<b>กล่องยา</b>ที่ซื้อได้จากพ่อค้านรก หรือนอนพักที่ศาลาน้ำชา</li>
      <li><b>กรรมท่านลดได้</b> — ห้าดาว · มอบ<b>ดอกบัว</b>ให้บุญที่ประตูสวรรค์
          (ได้เป็นของรางวัลเมื่อปราบเปรตหรือศัตรู หรือซื้อจากพ่อค้านรก) ·
          หรือสร้าง<b>ศาลาน้ำชา</b>แล้วบูชาดอกบัวที่แท็บก่อสร้าง (${KARMA_RELIEF.lotusCost} เบี้ย ลด ${KARMA_RELIEF.lotusCut})</li>
      <li>ทุก ๆ ไม่กี่คดีจะมี <b>เปรต</b> ขึ้นมาก่อกวน (กรรมท่านยิ่งสูงยิ่งมาถี่) ปล่อยไว้ระเบียบตกเรื่อย ๆ —
          <b>ต้องกดเข้าไปสู้ในฉากต่อสู้ทุกครั้ง</b> — ใช้ปุ่ม <b>⚔️</b> ที่แถบล่าง · กด <b>เว้นวรรค</b> · หรือคลิกที่ตัวมัน<br>
          ไม่มีการฟาดฟรีหรือขว้างลูกไฟบนแผนที่ · อีกทางคือจ้าง<b>ยักษ์ทวารบาล</b>ให้ไล่ปราบแทน</li>
      <li><b>เร่งทัณฑ์ด้วยมินิเกม</b> — เปิดห้องสถานีแล้วกดปุ่มมินิเกมของสถานีนั้น ·
          กระทะ "เร่งไฟ" (ต้องมีวิญญาณกำลังรับทัณฑ์ในกระทะ) ชนะแล้วเวลาโทษที่เหลือลด 20% พักปุ่ม 20 วินาที ·
          โลกันตนรก "เพิ่มความเย็น" และลานตรากตรำ "วัดพละกำลัง" ชนะแล้วสถานีเร็วขึ้นขั้นละ 12% สูงสุด 5 ขั้น แล้วต้องรอก่อนเล่นซ้ำ</li>
      <li><b>กดตัวละครหรือวิญญาณบนฉาก</b> แล้วดูรายละเอียดที่แผง <b>ข้อมูล</b> ด้านขวา —
          <b>คดีที่ปิดแล้วจะเฉลยความจริงทั้งหมด</b>ว่าเราตัดสินถูกหรือพลาดตรงไหน</li>
      <li>บางคดี<b>ถูกกับผิดปนกัน</b> จนสำนวนด้านเดียวตัดสินไม่ได้ — พวกนี้ต้องใช้พลังก่อน</li>
      <li><b>ยมทูตแต่ละคนหิวได้</b> (แถบ 🍙 แยกจากเสบียงกองกลาง) ดูและป้อนข้าวปั้นได้ 3 ทาง:
          ที่<b>โต๊ะนิรา</b> · ที่<b>หน้าต่างสถานี</b>ที่เขาประจำอยู่ · หรือกด<b>ตัวเขาบนแผนที่</b>โดยตรง
          หิวจนหมดแถบ (0) จะ<b>ทำงานช้าลงอีกชั้นหนึ่ง</b> — ป้อนข้าวปั้นหักจากเสบียงกองกลางครั้งละ 1 ห่อ
          ไม่มีเสบียงเหลือก็ป้อนไม่ได้ ต้องซื้อเพิ่มที่แท็บก่อสร้างก่อน</li>
      ${sentencingChapters.map(ch => `<li>${ch}</li>`).join('')}<li>${clockGuide}</li>
    </ol>
    <p style="font-size:var(--text-xs);color:var(--muted-foreground)">เกมบันทึกเองอัตโนมัติทุกไม่กี่วินาที ปิดแล้วเปิดใหม่เล่นต่อได้</p></div>
    <div class="help-reader"></div>`, d => {
      const source = d.querySelector('.help-source');
      const items = [...source.querySelectorAll('li')].map(li => li.innerHTML);
      const intro = `<h2>วิธีเล่น</h2>${source.querySelector('h2 + p').outerHTML}
        ${source.querySelector('.tline').outerHTML}${source.querySelector('ol + p').outerHTML}`;
      const reader = d.querySelector('.help-reader');
      reader.innerHTML = `${intro}<div class="guide-card-grid">${items.map((html, i) =>
        guideCards(`<h3>${i + 1}. ${html.includes('<h3>') ? html.match(/<h3>(.*?)<\/h3>/s)[1].replace(/^\d+\.\s*/, '') : (html.match(/<b>(.*?)<\/b>/s)?.[1] || 'วิธีเล่น')}</h3>${html.replace(/<h3>.*?<\/h3>/s, '')}`)).join('')}</div>`;
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
  if (g.assetsLoading || dlg.open || pauseDlg.open || g.bossWalk || g.over || g.paused === userPaused) return;
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
const crewArt = (c, pose = '') => c.k==='guide'
  ? artUrl('zone-boss','png',c.homeZone)
  : artUrl('crew-' + c.k + pose, 'png', c.homeZone) || artUrl('crew-' + c.k, 'png', c.homeZone);
function battleTurnOrderHtml(b) {
  if(!b.turnQueue||b.over)return '';
  const units=g.battleTimeline(),currentRound=b.turnQueue.round;
  const portrait = u => {
    const c=g.battleActors().find(a=>a.id===u.id);
    return u.side==='foe' ? (bossProfileOverride(u.k,g.zone)||storyFoeArt(u.k)) : u.id==='you'?artUrl('hero-yama-profile'):u.k==='guard'?artUrl('crew-guard-profile'):crewArt(c,'-profile');
  };
  const render=(list,next)=>`<section class="${next?'timeline-next':'timeline-active'}"><small>${next?'ลำดับถัดไป / Next':'รอบ '+currentRound+' / Turn'}</small><ol class="battle-turn-queue" aria-label="${next?'ลำดับถัดไป':'ผู้ที่กำลังลงมือ'}">${list.map(u=>`<li class="${u.side} ${next?'':'current'}" title="${esc(u.name)}"><img src="${esc(portrait(u))}" alt="${esc(u.name)}"><b>${esc(u.name)}</b></li>`).join('')}</ol></section>`;
  return `<div class="battle-timeline">${render(units.slice(0,1),false)}${render(units.slice(1,6),true)}</div>`;
}

/** L2: "หนีจากการต่อสู้" confirmation — markup, wiring and a stand-alone opener so any screen (battle, frontier walk ...) asks the same way.
 *  kind: battle kind (frontier -> "back to the frontier", anything else -> "back to the map"). */
export function fleeConfirmHtml(kind = 'mob') {
  return `<div class="flee-layer" data-flee-layer><div class="flee-card" role="alertdialog" aria-modal="true" aria-labelledby="flee-title">
    <h3 id="flee-title">${esc(t('battle.flee.title'))}</h3>
    <p>${esc(t(kind === 'frontier' ? 'battle.flee.textFrontier' : 'battle.flee.textMap'))}</p>
    <div class="flee-actions"><button data-flee-cancel>${esc(t('battle.flee.cancel'))}</button><button class="gold" data-flee-ok>${esc(t('battle.flee.ok'))}</button></div></div></div>`;
}
export function bindFleeConfirm(layer, { onConfirm, onCancel }) {
  layer.addEventListener('click', e => { if (e.target === layer) onCancel?.(); });
  layer.querySelector('[data-flee-cancel]').onclick = () => onCancel?.();
  layer.querySelector('[data-flee-ok]').onclick = () => onConfirm?.();
  layer.querySelector('[data-flee-cancel]').focus();
}
/** Opens the flee confirmation on top of `container` (default: the page). Returns close(). onConfirm / onCancel are called after it closes. */
export function openFleeConfirm({ container = document.body, kind = 'mob', onConfirm, onCancel } = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = fleeConfirmHtml(kind);
  const layer = wrap.firstElementChild;
  layer.style.position = container === document.body ? 'fixed' : 'absolute';
  const close = () => { layer.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); onCancel?.(); } };
  document.addEventListener('keydown', onKey, true);
  bindFleeConfirm(layer, { onConfirm:() => { close(); onConfirm?.(); }, onCancel:() => { close(); onCancel?.(); } });
  container.appendChild(layer);
  layer.querySelector('[data-flee-cancel]').focus();
  return close;
}

/** L2: shield over the head / on the portrait of whoever is in the defend stance.
 *  Real art goes in img/ui/icon-defend-shield.png (see Output/Toby note); until it exists the CSS shield underneath shows. */
function defendShieldHtml() {
  // No <img> inside: fitBattleSprites() treats every <img> in the squad/fig as a sprite. Art swap is CSS-only (class set below).
  return `<span class="defend-shield" role="img" aria-label="${esc(t('battle.defend.on'))}" title="${esc(t('battle.defend.on'))}"></span>`;
}
{ const im = new Image(); im.onload = () => document.documentElement.classList.add('defend-shield-art'); im.src = 'img/ui/icon-defend-shield.png'; }

function battleStatusHtml(actor, options = {}) {
  const states = battleStatuses(actor, options);
  return states.length ? `<span class="battle-state-tags">${states.map(s => `<em data-battle-status="${s.key}">${esc(t('battle.status.' + s.key, {n:s.n}))}</em>`).join('')}</span>` : '';
}
function arena(title, foe, hp, act, closable, fx, helper, controls = '', squad = []) {
  const selectedId = selectedLivingFoeId(hp);
  // act = { lunge:'you'|'foe', struck:'you'|'foe' } — ใครพุ่ง ใครโดน ในจังหวะนี้
  const cls = side => (act && act.lunge === side ? ' lunge' : '') + (act && act.struck === side ? ' struck' : '');
  // fx = { key, side } เอฟเฟกต์ตอนลงมือ · hp.dmg = เลขความเสียหายรอบล่าสุด
  const fxAt = side => {
    if (!fx || fx.side !== side || fx.key === 'defend') return '';
    if(side==='you'&&fx.key==='health'&&fx.recipient&&fx.recipient!=='you')return '';    // L2: defending is a stance, not an attack — no slash/claw effect
    const d = FX_OF[fx.key] || FX_OF.atk;
    return `<img class="fx" src="img/${d.img}.png" alt=""
      onerror="this.onerror=null;this.outerHTML='<span class=&quot;fx glyph&quot;>${d.glyph}</span>'">`;
  };
  const shieldAt = id => hp?.defending?.[id] ? defendShieldHtml() : '';
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
  // I1-B ข้อ 3 — ต้นเหตุ "ยมฯ หันซ้ายหลังโจมตีธรรมดา": class .atk ตัดการพลิก scaleX(-1) ของท่ายืน (index.html: .fig.you.atk img{transform:scaleX(1)})
  // ซึ่งตั้งไว้สำหรับรูปท่าฟาด hero-yama-atk ที่วาดหันขวา — แต่ตอนฟันดาบธรรมดา youImg คือ "ท่ายืน" (แอนิเมชันดาบวาดบน canvas ทับ 580ms)
  // พอ canvas หายท่ายืนโผล่กลับมาโดยไม่ถูกพลิกค้างจนจบเทิร์น (~2 วิ) = หันซ้าย · ฟันดาบธรรมดาจึงห้ามใส่ .atk (ดู tests/i1b-yama-facing.test.mjs)
  const youImg = hurtNow ? heroCry() : usingAtk ? (isYamaSwordAttack(fx) ? heroFace() : heroAtk())
    : showRage ? (rageArtSrc(g.outfit || g.zone) || ragePoseSrc(g.outfit || g.zone) || heroAtk()) : heroFace();
  const foeSrc = storyFoeArt(foe.sp);
  const bossFallback = artUrl(MOB.kinds[0].img);
  // ข้อ K คุณเป้เจอ 25 ก.ย. 2569 — ฉากต่อสู้สำรอง (ไม่มี bg เฉพาะทาง) ใช้ Turn-Base ตามโซนแล้ว
  const bg = hp ? battleBackground(g.zone, hp, g.player) : artUrl('BG-Turn-Base', 'webp');
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
  // M1: in a fight the background + sprites live in .cam-world (the only thing the camera zooms); HUD / menus stay outside it
  return `<div class="arena${hp ? ' combat-arena battle9-arena' : ''}${g.isFinalBattle(hp) ? ' final-team' : ''}"${hp ? '' : ` style="background-image:url('${esc(bg)}')"`}>
    <span class="corner-tick tl"></span><span class="corner-tick tr"></span>
    <span class="corner-tick bl"></span><span class="corner-tick br"></span>
    ${closable ? '<button class="x" data-close title="ปิดห้องสอบสวน">✕</button>' : ''}
    <button class="icon-settings-mini" data-arena-settings title="ตั้งค่า"
      style="right:${closable ? '50px' : '8px'}"><img src="img/ui/icon-setting2.png" alt=""></button>
    <div class="ttl">${esc(title)}</div>
    ${hp ? `<div class="cam-world" style="background-image:url('${esc(bg)}')">` : ''}
    ${helper && !squad.length ? `<div class="fig helper${act && act.lunge === 'you' && helper.lunge !== false ? ' lunge' : ''}">
      <img src="${crewArt(helper)}" class="${teamFaceClass(crewArt(helper))}" alt=""
           onerror="this.onerror=null;this.src='${crewArt(helper, '-profile') || crewArt(helper)}'">
      <span class="plate"><b>${esc(helper.name)}</b><span class="sub">เข้ามาช่วย</span></span>
    </div>` : ''}
    ${squad.length ? `<div class="battle-squad${squad.some(c => c.k === 'guard') ? ' trio' : ''}">${squad.map(c => `<span${c.k === 'guard' ? ' class="guard"' : ''} role="button" tabindex="0" data-crew-pick="${esc(crewBattleKey(c))}" aria-label="เลือก / Select ${esc(c.name)}" style="${(hp?.dmg?.enemyHits?.some(h => h.id === c.id) || hp?.dmg?.targetActorId === c.id) ? 'filter:brightness(1.5);outline:3px solid #ff8050' : ''}">
      <img src="${crewArt(c)}" class="${teamFaceClass(crewArt(c))}" alt="${esc(c.name)}"><b>${esc(c.name)}</b>${shieldAt(c.id)}${battleStatusHtml(c, {defending:hp?.defending?.[c.id]})}${(hp?.dmg?.enemyHits?.some(h => h.id === c.id) || hp?.dmg?.targetActorId === c.id) ? `<span style="color:#ff8050">▼ −${hp.dmg.crew} HP${hp.dmg.enemyHits?.find(h => h.id === c.id)?.reduced ? ' 🛡️' : ''}</span>` : ''}${
        c.k === 'guard' ? crewCooldown(c, g.guardCooldown(), GUARD.helpCdMs / 1000) : crewCooldown({ ...c, k:crewBattleKey(c) }, g.crewCooldown(c), specialCooldown(c))
      }</span>`).join('')}</div>` : ''}
    <div ${hp ? 'data-crew-pick="you" role="button" tabindex="0"' : ''} class="fig you${cls('you')}${figYouAtkClass({ usingAtk, sword:isYamaSwordAttack(fx), showRage, standing:youImg === heroFace() }) ? ' atk' : ''}${raging ? ' raging' : ''}">
      ${fxAt('you')}${dmgAt('you', hp && hp.dmg ? hp.dmg.you : 0)}${shieldAt('you')}${hp ? battleStatusHtml({hp:hp.youHp}, {defending:hp.defending?.you,rage:hp.rageTurns}) : ''}
      <img src="${youImg}" class="${teamFaceClass(youImg)}" alt="" onerror="this.onerror=null;this.src='${showRage ? (ragePoseSrc(g.outfit || g.zone) || heroAtk()) : (artUrl('hero-yama-profile') || artUrl('hero-yama'))}'">
      <span class="plate"><b>${esc(HERO_NAME)}</b><span class="sub">${esc(HERO_TITLE)} · ประจำ${esc(g.zoneDef().name)}</span>
        ${bar(hp ? hp.youHp : 0, hp ? hp.youMax : 1, '', 'บารมี')}</span>
    </div>
    ${hp?.foes?.length > 1 ? `<div class="foe-group">${hp.foes.map(f => {
      const src = storyFoeArt(f.sp);
      const hits = hp.dmg?.confuseSelf > 0 ? hp.dmg?.confuseHits : hp.dmg?.foeHits;
      const damage = hits?.filter(h => h.id === f.id).reduce((sum,h) => sum+h.damage,0);
      const hit = act?.struck === 'foe' && (hits ? damage > 0 :
        (hp.dmg?.confuseSelf > 0 ? hp.dmg?.counterFoeId === f.id : hp.dmg?.foeId === f.id));
      const counterHit = hp.dmg?.counterFoeId === f.id && act?.lunge === 'foe';
      return `<button type="button" class="fig foe${f.boss ? ' boss-foe' : ''}${f.hp <= 0 ? ' down' : ''}${selectedId === f.id ? ' selected is-target' : ''}${hit ? ' struck' : ''}${counterHit ? ' lunge' : ''}"
        data-foe-id="${esc(f.id)}" ${f.hp <= 0 ? 'disabled' : ''} aria-current="${selectedId === f.id}" aria-label="${esc(f.who)} ${Math.round(f.hp)}/${f.maxHp}">
        ${hit ? fxAt('foe') + dmgAt('foe', damage ?? hp.dmg?.confuseSelf ?? hp.dmg?.foe ?? 0) : ''}
        ${selectedId === f.id && f.hp > 0 ? `<span class="target-arrow">▼ ${t('event.prisonBreak.target')}</span>` : ''}
        <img src="${esc(src)}" class="${foeFaceClass(src)}" alt="" onerror="this.onerror=null;this.src='${f.boss ? bossFallback : 'img/spirit7.png'}'">
        ${battleStatusHtml(f)}<span class="plate"><b>${esc(f.who)}</b><span class="sub">${f.hp <= 0 ? t('event.prisonBreak.down') : esc(f.sub || '')}</span>
          ${bar(f.hp, f.maxHp, 'foe', 'กำลังใจ')}</span>
      </button>`;
    }).join('')}</div>` : `<div ${hp ? `data-foe-id="${esc(hp.foes?.[0]?.id)}" role="button" tabindex="0" aria-current="${!!selectedId}"` : ''} class="fig foe${hp?.foes?.[0]?.boss ? ' boss-foe' : ''}${cls('foe')}${selectedId ? ' selected is-target' : ''}">
      ${selectedId ? `<span class="target-arrow">▼ ${esc(t('event.prisonBreak.target'))}</span>` : ''}
      ${fxAt('foe')}${dmgAt('foe', hp && hp.dmg ? hp.dmg.foe : 0)}
      <img src="${foeSrc}" class="${foeFaceClass(foeSrc)}" alt="" onerror="this.onerror=null;this.src='${hp?.foes?.[0]?.boss ? bossFallback : 'img/spirit7.png'}'">
      ${hp ? battleStatusHtml(hp.foes?.[0]) : ''}<span class="plate"><b>${esc(foe.name)}</b><span class="sub">${esc(foe.sub || '')}</span>
        ${bar(hp ? hp.foes?.[0]?.hp : 0, hp ? hp.foes?.[0]?.maxHp : 1, 'foe', 'กำลังใจ')}</span>
    </div>`}
    ${hp ? '</div>' : ''}
    ${controls}
  </div>`;
}

/** ภาพคั่นสั้น ๆ ตอนใช้ท่าพิเศษ ชุดไหนยังไม่มีภาพให้ข้ามอย่างเงียบ ๆ */
function actionCutsceneSrc(k) {
  const style = g.outfit || g.zone;
  const powerArt = powerCutsceneImage(k, style, g.abilities);
  if (powerArt) return powerArt;
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
  if(k==='guide')return null;
  const actor = g.roster[k] || (k === 'guard' ? g.guard : null), kind = actor?.kind || k, zone = actor?.homeZone || g.zone;
  const scene = regionalCrewCutscene(kind, zone);
  return { src:scene.src, fallback:scene.regional ? artUrl(`crew-${kind}`, 'png', zone) : null };
}

// ข้อ E คุณเป้ 24 ก.ย. 2569: 580ms เร็วเกินจะทันเห็น (ภาพขึ้นจริงแต่กระพริบผ่านไป)
// ยืดเป็น 1.3 วิ (อยู่ในช่วง 1.2–1.5 ที่ขอ) ให้ตรงกับ CSS .action-cutscene ใน index.html
// (คีย์เฟรม actionCut/actionRush/speedLines ต้องยืดเวลาให้เท่ากันที่นั่นด้วย — ดูคอมเมนต์ที่นั่น)
const ACTION_CUT_MS = 1300;
const DEFEND_STANCE_MS = 700;     // L2: how long the shield pop-in plays before the turn passes
/** เสียงตอนลงมือ — ท่าไม้ตายที่ขึ้นคัตซีนใช้เสียงชาร์จ→ระเบิดยาวเท่าคัตซีน (F2 ข้อ 6) · ท่าอื่นใช้เสียงสั้นเดิม */
function powerSound(k) {
  if (isUltimatePower(k) && actionCutsceneSrc(k)) playUltimate(k);
  else sfx(powerSfx(k, g.abilities));
}
function playActionCutscene(k, ultimate = null) {   // M1: returns true when a full-screen cutscene was mounted (undefined/false otherwise)
  if (k === 'rage') return;
  // ข้อ A ชุด 13 — 'crew:<k>' และ 'guard' ขึ้นคัตซีนของยมทูต/ยักษ์เอง ไม่ใช่ของยมบาทน้อย
  const crewKey = k.startsWith('crew:') ? k.slice(5) : k === 'guard' ? 'guard' : null;
  const cs = crewKey ? crewCutsceneSrc(crewKey) : null;
  const src = ultimate?.image || (cs ? cs.src : actionCutsceneSrc(k));
  if (!src || !dlg.open) return false;
  dlg.querySelector('.action-cutscene')?.remove();
  const cut = document.createElement('div');
  // คัตซีนพลังใหม่วาดให้หันขวาตามตำแหน่งศัตรูอยู่แล้ว
  cut.className = ultimate ? 'action-cutscene enemy-facing'
    : ['hypno', 'mirror', 'roar', 'ice', 'flameCharge', 'rage', 'windFan', 'valkyrieSpear', 'cooldownClock'].includes(k)
      ? 'action-cutscene right-facing' : 'action-cutscene';
  // ชุด 29C ข้อ 8 — คัตซีนยมทูต/ยักษ์: ภาพของโซน 2–4 เป็นผืนสี่เหลี่ยมจัตุรัส 512×512 พอ object-fit:cover บนฉากกว้าง
  // ถูกตัดเหลือแถบกลางภาพ (ตัวละครอยู่ล่างภาพจึงเห็นแต่ส่วนบนของหัวกับพื้นดำ) → ให้เห็นทั้งภาพ (contain) เฉพาะคัตซีนของยมทูต
  if (crewKey) cut.classList.add('crew-cut');
  if (!ultimate && ACTION_CUTSCENE_PRESENTATION[src]?.flip === false) cut.classList.add('right-facing');
  const actorName = crewKey ? (g.roster[crewKey]?.name || (crewKey === 'guard' ? GUARD.name : CREW[crewKey]?.name || 'ยมทูต')) : ultimate ? 'ศัตรู' : 'ยมบาทน้อย';
  const crewMove = crewKey && crewKey !== 'nira' ? CREW_POWER[crewKey]?.name : undefined;   // P4: ชื่อท่าอยู่ที่ CREW_POWER ที่เดียว
  const moveName = ultimate?.name || crewMove || actionCutsceneLabel(k, ultimate);
  cut.innerHTML = `<img src="${src}" alt="ภาพคั่นท่าพิเศษ — แตะเพื่อข้าม"><strong class="cutscene-title"><small>${esc(actorName)}</small>${esc(moveName)}</strong>`;
  const img = cut.querySelector('img');
  const fallback = cs && cs.fallback;
  img.onerror = () => {
    if (fallback) { img.onerror = () => cut.remove(); img.src = fallback; }
    else cut.remove();
  };
  let done = false;
  const finish = () => { if (done) return; done = true; cut.remove(); camera.cue('idle'); };
  cut.onclick = finish;              // กดข้ามได้ทันที (ข้อ E)
  dlg.appendChild(cut);
  fitCutsceneImage(cut, img); // ทุกภาพรักษาสัดส่วน และแสดงกรอบส่วนที่มีภาพครบ
  setTimeout(finish, ACTION_CUT_MS);
  return true;
}

// ---------- ห้องสอบสวน (HUD แบบเกม Turn-based RPG) ----------
// เจ้าของออกแบบเลย์เอาต์มาเอง 8 ก.ย. 2569 โดยอ้างอิงเกมแนว tactics:
//   ฉากเป็นพื้นหลังเต็มจอ · HUD ลอยทับเป็นชั้น ๆ ไม่ใช่แผงเรียงลงมา
//   บน = แถบสถานะ · ซ้าย = แถวคำสั่งแนวตั้ง · ขวาบน = สำนวน+คำให้การ
//   ล่างซ้าย = โปรไฟล์ยมบาทน้อย + ของ · ล่างขวา = โปรไฟล์วิญญาณ
// เปิดได้จากแท่นพิพากษาเท่านั้น (ดู drawDeck) — แท็บ "ไต่สวน" เดิมถูกถอดออกแล้ว
const FEAR_BEAT_MS = 1100, FEAR_AFTER_MS = 650;   // P2: close-in + fright before the confession lands · then the camera stays a beat and relaxes
let trialCmd = 'ask';        // แผงขวาเป็นการไต่สวนเสมอ; ตัวเลือกคำตัดสินอยู่ในวงคำสั่งบนเวที

function openTrial(initialError = '') {
  if(g.bossJustice?.active && bossJusticeActive(g)){openBossJustice();return;}
  if (g.over || g.battle) return;
  const s = g.queue[0];
  if (!s || !g.caseReady(s)) return;
  pauseForDlg();
  bgm('bgm-trial');
  trialCmd = 'ask';
  let trialError = initialError, courtPanel = null, kanClueResult = '', traitLessonPage = 0, fearUntil = 0, fearBusy = false, reaction = 'fear', trialClosed = false;
  const reactionTimers=[];
  // P2: the three-page "read the name colour" lesson, once per save (after the first-warrant lesson)
  const traitLessonHtml = page => {
    const n = firstInterrogationLesson.length, step = firstInterrogationLesson[page];
    return `<div class="trial-first-lesson trait-lesson" role="dialog" aria-modal="true" aria-label="สีของวิญญาณ" data-trait-lesson="${page}">
      <h3>${esc(step.title)}</h3><p>${esc(step.body)}</p>
      <div class="trait-lesson-nav"><span class="trait-lesson-count" aria-label="หน้า ${page + 1} จาก ${n}">${page + 1}/${n}</span>
      <button class="gold" data-trait-lesson-next>${esc(step.next)}</button></div></div>`;
  };
  const blockText = block => block ? block.text || t('trial.' + block.key) + (block.station ? block.station : '') : '';

  const paint = () => {
    // เปลี่ยนแท็บแล้ววาดเนื้อหาห้องสอบสวนใหม่ แต่บนมือถืออย่ากระโดดกลับไปหัวกล่อง
    const scrollAt = dlg.querySelector('.hud')?.scrollTop || 0;
    const dossierScroll = dlg.querySelector('.hud-right')?.scrollTop || 0;
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
      <span class="chip">🔹 ${t('battle.mp')} <b>${Math.round(g.mp)}/${g.mpMax}</b></span>
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
      // ข้อ A-2/A-3 คุณเป้ 24 ก.ย. 2569 — บอกแหล่งของให้ตรงจริงต่อพลัง (mirror ได้สองทาง · hypno L3: ปลดด้วยชนะบอสชายแดนโซน 3)
      const outOfAmmoHint = p.k === 'mirror' ? 'หมดแล้ว — เลื่อนขั้นแล้วได้เติมให้ หรือเติมที่หอส่องกรรม (ขั้น 5)'
                           : 'หมดแล้ว';
      const mpPower = p.k === 'hypno' || p.k === 'ice';
      const why = noIssue || (locked ? (p.k === 'hypno' ? 'ล็อก · ชนะบอสชายแดนโซน 3 ก่อน' : `ล็อก · ต้องเป็น${LEVELS[p.lv - 1].name}ก่อน`)
                : p.realtime ? (ok ? 'พร้อมใช้ — ไม่ต้องใช้ item' : `รออีก ${fmtCountdown(pw.readyAt)}`)
                : mpPower && g.mp < BATTLE.mpCost[p.k] ? `${t('battle.mp')}ไม่พอ · ใช้ ${BATTLE.mpCost[p.k]}`
                : !mpPower && ammo <= 0 ? outOfAmmoHint
                : pw.cd > 0 ? `รออีก ${pw.cd} คดี`
                : p.k === 'mirror' || p.k === 'hypno' ? t(`power.${p.k}Desc`) : p.desc);
      const badge = locked ? '×0' : p.realtime ? (ok ? '✓' : fmtCountdown(pw.readyAt)) : mpPower ? `${BATTLE.mpCost[p.k]} ${t('battle.mp')}` : `×${ammo}`;
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
    const candidates=g.crew.filter(c=>!c.reader);
    const shownCrew = answer?.crew&&!candidates.some(c=>c.k===answer.crew.k)?[...candidates,answer.crew]:candidates;
    const crewChoices = shownCrew.length ? shownCrew.map(c => {
      const revealed = !!answer?.crew && c.k === answer.crew.k;
      const role=g.keeperTrialInfo?.(s,c,pick.st);
      const unavailable = revealed && (answer.unavailable || !available.some(x => x.k === c.k) && { key:'chooseRevealedStation' })
        || role?.available===false&&{text:role.why||'ยังรับหมายนี้ไม่ได้'};
      const blockedCrew=unavailable||(!available.some(x=>x.k===c.k)&&{text:keeperCurrentJob(g,c)});
      const why = blockedCrew ? blockText(blockedCrew) : '';
      const suit=traitForKeeper(c.k);
      return `<button class="orb-choice${revealed ? ' is-revealed' : ''}${role?.matching?' is-trait-match':''}" data-k="${c.k}" data-pickkey="cr" ${suit?`style="--trait-color:${suit.color}"`:''} ${blockedCrew ? 'disabled' : ''} ${c.k === pick.cr ? 'aria-pressed="true"' : ''}
        title="${esc(c.name + ' · กำลังทำงาน ' + c.raeng + ' · ระเบียบ ' + c.rabiab + ' · ปัญญา ' + c.panya + ' · เมตตา ' + c.metta + (role?' · '+role.benefit+' · ภาระ: '+role.cost:'') + (revealed ? ' · ' + t('trial.revealedCrew') : '') + (why ? ' · ' + why : ''))}">
        ${orbImg(artUrl(c.self ? 'hero-yama-profile' : `crew-${c.k}-profile`) || artUrl(c.self ? 'hero-yama' : `crew-${c.k}`), c.name)}
        <b>${suit?`<span class="keeper-suit" aria-hidden="true">${suit.icon}</span> `:''}${esc(c.name)}</b><small>${why?esc(why):esc(keeperCurrentJob(g,c))}<br>แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}</small>${revealed ? '<span class="reveal-mark" aria-hidden="true">✓</span>' : ''}</button>`;
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
    const missing = trialError || blockText(blocked) || [missingParts.length ? `${t('trial.missing')} ${missingParts.join(' · ')}` : '', stationNotes].filter(Boolean).join(' · ');
    const courtGroups = [
      {id:'power',label:'พลัง / Power',choices:powerChoices},
      {id:'where',label:'ที่ไหน / Where',choices:destinationChoices,selected:pick.st},
      {id:'keeper',label:'ใครคุม / Keeper',choices:crewChoices+`<details class="keeper-menu-info"><summary>พลังและต้นทุนผู้คุม</summary>${shownCrew.map(c=>{const r=g.keeperTrialInfo?.(s,c,pick.st);return `<p><b>${esc(c.name)}</b><br>${esc(r?.benefit||'')}<br>ภาระ: ${esc(r?.cost||'ไม่มี')}</p>`;}).join('')}</details>`,selected:pick.cr},
      {id:'force',label:'ระดับทัณฑ์ / Intensity',choices:forceChoices,selected:pick.inten||heaven,disabled:heaven},
    ];
    // L2: what is chosen under Where / Keeper / Intensity shows as a thumbnail + name to the right of that command until it changes or the warrant goes out
    const forceNow = heaven || answer?.intensity === 0 ? null : pick.inten;
    const pickedChip = {
      where: stDef ? `<img src="${esc(stBg(stDef.k))}" alt=""><b>${esc(stDef.name)}</b>` : '',
      keeper: crewNow ? `<img src="${esc(artUrl(crewNow.self ? 'hero-yama-profile' : `crew-${crewNow.k}-profile`) || artUrl(crewNow.self ? 'hero-yama' : `crew-${crewNow.k}`))}" alt=""><b>${esc(crewNow.name)}</b>` : '',
      force: forceNow ? `<img src="${esc(forceIcon(forceNow))}" alt=""><b>${esc(INTENSITY[forceNow])}</b>`
        : (heaven || answer?.intensity === 0) ? `<strong aria-hidden="true">🕊️</strong><b>${esc(t('trial.noPunishment'))}</b>` : '',
    };
    const trialWheel = `<section class="comment8-menu" aria-label="คำสั่งออกหมาย">
      <div class="comment8-commands">${courtGroups.map((v,i)=>`<button type="button" class="court-command ${v.selected?'has-selection':''}" data-court-panel="${v.id}" style="--command-index:${i}" aria-expanded="${courtPanel===v.id}" ${v.disabled?'disabled':''}><span>${esc(v.label.split(' / ')[getLang()==='en'?1:0])}</span>${pickedChip[v.id]?`<span class="court-picked" data-picked="${v.id}">${pickedChip[v.id]}</span>`:''}</button>`).join('')}
        <button type="button" id="t-go" class="court-command court-issue ${ready?'ready':''}" style="--command-index:4" ${ready?'':'disabled'}><span>${esc(t('trial.warrant'))}</span></button>
      </div>
      ${courtGroups.map(v=>`<div class="court-options ${courtPanel===v.id?'is-open':''}" data-court-options="${v.id}" ${courtPanel===v.id?'':'inert'} aria-label="${esc(v.label)}">${v.choices}</div>`).join('')}
      ${missing?`<small class="court-missing" role="status">${esc(missing)}</small>`:''}
    </section>`;


    // ข้อความไต่สวนอยู่ขวาตลอดเวลา ส่วนตัวเลือกคำตัดสินย้ายไปเป็นวงไอคอนแล้ว
    const roarHint = s.roarHint != null ? g.roarTarget(s)?.i : null;
    const opt = `<h4>${s.case ? esc(t('trial.chooseIssue')) : 'ข้ออ้างของเขา — เลือกข้อที่ขัดกับสำนวน'}</h4>` + s.lines.map(l => {
      const cls = !l.used ? '' : l.kind === 'solid' ? 'miss' : 'hit';
      return `<button class="say ${cls}${roarHint === l.i && !l.used ? ' roar-hint' : ''}" style="${roarHint === l.i && !l.used ? 'outline:3px solid #e9b448' : ''}" data-line="${l.i}" ${l.used || s.presses <= 0 ? 'disabled' : ''}
        >${roarHint === l.i && !l.used ? '💢 ' : ''}${l.used ? (l.kind === 'solid' ? '✗ ' : '✓ ') : ''}“${esc(l.t)}”</button>`;
    }).join('');

    const foeSrc = typeof s.sp === 'string' ? artUrl(s.sp) || `img/${s.sp}.png` : `img/spirit${s.sp || 7}.png`;
    // P2: a menu click repaints the whole room — carry Yama's live idle <img> across so the sprite never falls back to the painting
    const keepYama = dlg.querySelector('.trial-hud .hud-stage .fig.you img[data-yama-idle]');
    dlg.innerHTML = `
    <div class="hud trial-hud trial-comment8${Date.now() < fearUntil ? ' is-fear-zoom' : ''}" style="background-image:url('${artUrl('BG-Turn-Base', 'webp')}')">
      <div class="cam-world" style="background-image:url('${artUrl('BG-Turn-Base', 'webp')}')"><div class="hud-stage cam-stage-box">
        <div class="fig you" data-cam="you"><img src="${heroFace()}" alt=""
               onerror="this.onerror=null;this.src='${artUrl('hero-yama')}'">
          <span class="nm">${esc(HERO_NAME)}</span></div>
        <div class="fig foe${Date.now() < fearUntil ? reaction==='relief'?' is-relieved':' is-frightened' : ''}" data-cam="suspect"><img src="${esc(foeSrc)}" alt=""
               onerror="this.onerror=null;this.src='img/spirit7.png'">
          ${spiritNameHtml(g.spiritTrait?.(s), s.name || s.who)}
          <div class="soul-relief" aria-hidden="true"><i class="relief-tear left"></i><i class="relief-tear right"></i></div><span class="relief-label" role="status">น้ำตาแห่งความโล่งใจ · มีผู้รับฟังความจริงแล้ว</span>
          <div class="soul-fear" aria-hidden="true"><i class="fear-gloom"></i><i class="fear-burst"></i><i class="fear-sweat s1"></i><i class="fear-sweat s2"></i><i class="fear-sweat s3"></i><i class="fear-tremble l"></i><i class="fear-tremble r"></i></div></div>
      </div></div>
      <div class="hud-scrim"></div>
      <span class="corner-tick tl"></span><span class="corner-tick tr"></span>
      <span class="corner-tick bl"></span><span class="corner-tick br"></span>
      <div class="top-left-icons">
        <button class="trial-pause" data-trial-pause aria-label="${esc(t('trial.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>
        <button class="icon-settings-mini" data-arena-settings title="${esc(t('trial.settings'))}"><img src="img/ui/icon-setting2.png" alt=""></button>
      </div>
      <button class="trial-close" data-close aria-label="${esc(t('trial.close'))}"><img src="img/ui/icon-close.png" alt=""></button>

      ${!g.taught.includes('trial-calculation') ? `<div class="trial-first-lesson" role="dialog" aria-label="วิธีออกหมายครั้งแรก">${firstTrialLesson}<button class="gold" data-lesson-done>เข้าใจแล้ว เริ่มสอบสวน</button></div>`
        : !g.taught.includes('interrogation-traits') ? traitLessonHtml(traitLessonPage) : ''}
      <div class="hud-body">
        <div class="hud-stage">
          <span class="trial-case-no">${esc(t('trial.caseNo'))} : ${String(s.id).padStart(3, '0')}</span>
          ${trialWheel}
        </div>

        <div class="hud-right">
          <div class="trial-top-actions" aria-label="คำสั่งคดี">${topActions}</div>
          <div class="hud-card hud-rec">
            <h4>${esc(t('trial.readAloud'))}</h4>
            ${s.face ? `<div class="deed allegation">${esc(s.face)}</div>` : ''}
            ${claimed.map(m => publicMeritLine(m, 'deed merit')).join('')}
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
        ${kanOrbHtml(g, s, artUrl('crew-kan-profile'), kanClueResult)}
        <div class="port you">
          <img src="${artUrl('hero-yama-profile') || artUrl('hero-yama')}" alt=""
               onerror="this.onerror=null;this.src='${artUrl('hero-yama')}'">
          <span class="who2"><b>${esc(HERO_NAME)}</b><small>${esc(t('trial.hp'))} ${Math.round(g.hp)}/${g.hpMax}</small><small>${esc(t('battle.mp'))} ${Math.round(g.mp)}/${g.mpMax}</small><span class="trial-mpbar"><i style="width:${Math.max(0,Math.min(100,100*g.mp/g.mpMax))}%"></i></span><span class="trial-hpbar"><i style="width:${Math.max(0,Math.min(100,100*g.hp/g.hpMax))}%"></i></span></span>
        </div>
        <!-- การ์ดรูป+ชื่อวิญญาณ (.port.foe) เอาออก 18 ก.ย. 2569 (ข้อ A ของคุณเป้) — บนจอแคบมันทับ
             .hud-log ด้านบน และข้อมูลตัวตนซ้ำกับ .fig.foe ที่อยู่บนเวทีอยู่แล้ว (รูป+ชื่อเดียวกัน)
             เอาออกทุกจอ ไม่ใช่แค่จอแคบ — ดูสะอาดกว่าและไม่เสียข้อมูลอะไรไป การ์ดยมบาทน้อยฝั่งซ้ายคงไว้ -->
      </div>
    </div>`;

    // N2: Yama stands (map idle pose) instead of bobbing — the suspect keeps floating
    const yamaImg = dlg.querySelector('.trial-hud .hud-stage .fig.you img');
    if (keepYama && yamaImg) { yamaImg.replaceWith(keepYama); mountYamaTrialIdle(keepYama, g.outfit || g.zone); }
    else mountYamaTrialIdle(yamaImg, g.outfit || g.zone);
    if (scrollAt) dlg.querySelector('.hud').scrollTop = scrollAt;
    if(dossierScroll)dlg.querySelector('.hud-right').scrollTop=dossierScroll;

    // Keep flying lists inside the interrogation half, including narrow portrait screens.
    requestAnimationFrame(()=>{
      const stage=dlg.querySelector('.trial-comment8 .hud-body > .hud-stage'),menu=stage?.querySelector('.comment8-menu'),pane=menu?.querySelector('.court-options.is-open');
      if(!stage?.isConnected||!pane)return;
      const command=menu.querySelector(`[data-court-panel="${pane.dataset.courtOptions}"]`);
      const gap=-12+command.offsetLeft;
      const left=Math.max(0,Math.min(menu.offsetWidth+gap,stage.clientWidth-menu.offsetLeft-pane.offsetWidth-8));
      pane.style.left=`${left}px`;
      pane.style.top=`${command.offsetTop}px`;
      const initialTop=pane.offsetTop;
      const remaining=Math.max(90,stage.clientHeight-menu.offsetTop-initialTop-18);
      pane.style.maxHeight=`${Math.max(90,Math.min(remaining,dlg.getBoundingClientRect().bottom-pane.getBoundingClientRect().top-18))}px`;
    });

    bindCommandPress(dlg.querySelector('.trial-comment8'));
    trialCameraAttach();
    // ---- ผูกปุ่ม ----
    dlg.querySelectorAll('[data-court-panel]').forEach(button=>button.onclick=()=>{courtPanel=courtPanel===button.dataset.courtPanel?null:button.dataset.courtPanel;camera.cue('idle');paint();});   // M1: picking a menu goes back to the wide shot
    dlg.querySelectorAll('.court-options').forEach(pane=>pane.querySelectorAll('.orb-choice').forEach((button,i)=>button.style.setProperty('--choice-index',i)));
    dlg.querySelector('.comment8-menu')?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();courtPanel=null;paint();}});
    dlg.querySelector('[data-lesson-done]')?.addEventListener('click', () => { g.taught.push('trial-calculation'); g.save(); paint(); });
    dlg.querySelector('[data-trait-lesson-next]')?.addEventListener('click', () => {
      if (traitLessonPage < firstInterrogationLesson.length - 1) traitLessonPage++;
      else { g.taught.push('interrogation-traits'); g.save(); }
      paint();
    });
    dlg.querySelector('[data-trial-pause]').onclick = () => openPause(true);
    dlg.querySelector('[data-cmd="ask"]').onclick = () => dlg.querySelector('[data-line]:not(:disabled)')?.focus();
    bindKanClue(dlg,g,s,clue=>{kanClueResult=clue.text;sfx('crack');g.save();paint();refresh();});
    dlg.querySelector('#t-guide').onclick = () => {
      const guide = document.createElement('dialog');
      guide.className = 'court-guide';
      guide.innerHTML = `<button class="guide-close" aria-label="${esc(t('common.close'))}"><img src="img/ui/icon-close.png" alt=""></button><h2>คู่มือนรก</h2>
        <p>กติกาของอเวจี · อ่านสำนวน → ไต่สวน → เลือกสถานที่ ผู้คุม และความแรง → ออกหมาย</p>
        <div class="guide-card-grid">${sentencingChapters.map(guideCards).join('')}</div>
        <table><thead><tr><th>กรรม</th><th>สถานที่</th></tr></thead><tbody>${STATIONS.filter(x=>x.tags.length).map(x=>`<tr><td>${x.tags.map(k=>SINS[k]?.name||k).join(' / ')}</td><td>${x.name}</td></tr>`).join('')}</tbody></table>
        <div class="guide-card-grid">${guideCards(clockGuide)}</div>
        ${CREW.filter(c=>!c.reader).map(c=>`<section class="guide-card guide-crew"><img class="guide-portrait" src="${esc(crewArt(c))}" alt="" loading="lazy" onerror="this.remove()"><div><h3>${esc(crewName(c, g.zone))}</h3><p> — ${c.duty}<br>แรง ${c.raeng} · ระเบียบ ${c.rabiab} · ปัญญา ${c.panya} · เมตตา ${c.metta}<br>ในสนามรบ: ${crewAbility(c.k)}</p></div></section>`).join('')}
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
      if (fearBusy) return;
      const hit = s.lines[+el.dataset.line]?.kind !== 'solid';   // the ✓ lines: deny / boast / plea — a "solid" line is the wrong one to press
      reaction=pressReaction(g,s,s.lines[+el.dataset.line])||'fear';
      const r = g.press(s, +el.dataset.line);
      const revealed = !!r?.some(x => x.kind === 'truth' || x.kind === 'confess');
      if (r) sfx(revealed ? 'crack' : 'deny');
      if (!r) return;
      if (!hit) { paint(); refresh(); return; }   // a wrong press never moves the camera
      // P2: a correct press = camera closes in on the SPIRIT (Yama steps out of frame), the spirit panics, then the confession appears and the camera relaxes
      fearBusy = true; fearUntil = Date.now() + FEAR_BEAT_MS + FEAR_AFTER_MS;
      // portrait: the ✓ lines sit below the fold, so bring the stage into view for the beat and put the reader back afterwards
      const backTo = dlg.scrollTop; if (backTo > 40) dlg.scrollTo({ top:0, behavior:'smooth' });
      const hud = dlg.querySelector('.trial-comment8');
      hud?.classList.add('is-fear-zoom'); dlg.querySelector('.fig.foe')?.classList.add(reaction==='relief'?'is-relieved':'is-frightened');
      camera.cue('interrogate-reveal', { targets:'suspect' });
      reactionTimers.push(setTimeout(() => { if (trialClosed || !dlg.open || !dlg.querySelector('.trial-hud')) return; paint(); refresh(); }, FEAR_BEAT_MS));
      reactionTimers.push(setTimeout(() => { if (trialClosed || !dlg.open || !dlg.querySelector('.trial-hud')) return; camera.cue('idle'); fearUntil = 0; fearBusy=false;
        dlg.querySelector('.trial-comment8')?.classList.remove('is-fear-zoom'); dlg.querySelector('.fig.foe')?.classList.remove('is-frightened','is-relieved');
        if (backTo > 40) dlg.scrollTo({ top:backTo, behavior:'smooth' }); }, FEAR_BEAT_MS + FEAR_AFTER_MS));
    });
    // M2: a repaint replaces the stage — keep an effect that is still playing (interrogation hypnosis / mirror) on the new one
    if (!fxIdle()) attachBattleFx(dlg.querySelector('.hud-stage'));
    const trialFx = async k => {
      try {
        if (k !== 'hypno' && k !== 'mirror') return;
        const stage = dlg.querySelector('.hud-stage'); if (!stage) return;
        attachBattleFx(stage);
        const sr = stage.getBoundingClientRect(), kk = sr.width / (stage.offsetWidth || sr.width) || 1;
        const cam = hasBattleCamera();   // M1 camera: battleSpriteRect / rectOf already return stage-local, un-zoomed px
        const rectOf = async sel => { const im = stage.querySelector(sel); if (!im) return null; let r = null; try { r = await battleSpriteRect(im); } catch (e) { r = null; }
          if (!r || !(r.r > r.l)) { if (cam) return cameraRectOf(im); const e = im.getBoundingClientRect(); r = { l:e.left, t:e.top, r:e.right, b:e.bottom }; }
          return cam ? { l:r.l, t:r.t, r:r.r, b:r.b } : { l:(r.l - sr.left) / kk, t:(r.t - sr.top) / kk, r:(r.r - sr.left) / kk, b:(r.b - sr.top) / kk }; };
        const you = await rectOf('.fig.you img'), foe = await rectOf('.fig.foe img');
        if (!you) return;
        const delay = dlg.querySelector('.action-cutscene') ? ACTION_CUT_MS - 120 : 0;
        playBattleFx(k === 'hypno' && foe ? { recipe:'hypno', src:you, targets:[{ rect:foe, dmg:0 }], side:'foe', delay } : { recipe:'mirror', src:you, targets:[{ rect:you, dmg:0 }], side:'foe', delay });
      } catch (e) { /* effect only */ }
    };
    dlg.querySelectorAll('[data-pw]').forEach(el => el.onclick = () => {
      const k = el.dataset.pw;
      if (!g.usePower(k, s)) return;
      if(k==='flee')sfx('step');else powerSound(k); paint(); refresh(); playActionCutscene(k); trialFx(k);
      camera.cue('interrogate-reveal', { targets:'suspect', action:k });   // M1: hypnosis / mirror / roar = the big lean-in
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
    const kan=dlg.querySelector('[data-kan-clue]');
    if(kan){
      const why=g.kanClueWhy(s),note=dlg.querySelector('[data-kan-clue-why]');kan.disabled=!!why;kan.closest('[data-kan-orb]')?.classList.toggle('is-off',!!why);
      if(note){note.textContent=why;note.hidden=!why;}
    }
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
  onDlgClose(() => { trialClosed=true;reactionTimers.forEach(clearTimeout);clearInterval(roarTick); camera.detach(); bgm('bgm-zone'); refresh(); });
}

/** M1: bind the camera to the interrogation scene. The world is the whole .trial-comment8 (behind the panels); the two figures live in a
 *  stage-sized box inside it that is placed over the real .hud-stage, so every % position in the CSS stays valid. Only the scene zooms —
 *  the right-hand panels, menu, cards and bottom bar are above the world. */
function trialCameraAttach() {
  const hud = dlg.querySelector('.trial-comment8');
  const box = hud?.querySelector('.cam-stage-box'), real = hud?.querySelector('.hud-body > .hud-stage');
  if (!hud || !box || !real) return;
  const place = () => {
    if (!hud.isConnected) return;
    const h = hud.getBoundingClientRect(), r = real.getBoundingClientRect();
    if (camera.stageEl() !== hud) return;
    const z = camera.applied().z, o = { x:h.left + hud.clientLeft, y:h.top + hud.clientTop };
    // the real stage is not transformed, so its rect is already "at rest"; the world is positioned at the hud origin with identity layout
    void z;
    for (const [k, v] of Object.entries({ left:r.left - o.x, top:r.top - o.y, width:r.width, height:r.height }))
      box.style.setProperty(k, `${v}px`, 'important');
    box.style.setProperty('min-height', '0', 'important');
  };
  camera.attach(hud);
  place(); requestAnimationFrame(place);
  if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => { if (hud.isConnected) place(); else ro.disconnect(); }); ro.observe(hud); ro.observe(real); }
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
function niraItemWidget(c) {
  const h = Math.round(c.hunger ?? 100);
  return `<div class="hunger-line"><small>🍙 หิว ${h}/100</small>${['food', 'health'].map(kind => {
    const keys = Object.keys(ITEMS).filter(k => kind === 'food' ? /^food(Z[234])?$/.test(k) : /^health(Z[234]|Large)?$/.test(k));
    const count = keys.reduce((n,k) => n + (g.inventory[k] || 0), 0), item = keys.find(k => g.inventory[k] > 0) || kind;
    const ready = count > 0 && actorStanding(c) && (kind === 'food' ? h < 100 : c.morale < 100);
    return `<button class="sm" data-nira-item="${item}" data-actor-id="${esc(c.id)}" ${ready ? '' : 'disabled'}>${kind === 'food' ? '🍙 ให้ข้าวปั้น' : '💊 ให้กล่องยา'} · มี ${count}</button>`;
  }).join('')}</div>`;
}

/** P4 §3.3 — แผ่นรายละเอียดพลัง · เปิดทับกล่องที่เปิดอยู่ (โต๊ะนิรา/ทีมชายแดน) เป็นชั้นเล็ก ๆ ไม่แทนกล่อง จึงกลับมาที่เดิมเสมอ
 *  ไม่มีกล่องเปิดอยู่ (โปรไฟล์/แท็บ/แผงข้อมูล) → ใช้ modal() ปกติ */
let afterPowerSheet = null;
function openPowerSheet(k) {
  const html = powerSheetHtml(g, k);
  if (!html) return;
  const bind = (root, close) => {
    root.querySelectorAll('[data-power-close]').forEach(b => b.onclick = close);
    const done = ok => { close(); if (ok) { sfx('coin'); afterPowerSheet?.(); refresh(); } };
    root.querySelectorAll('[data-power-hire]').forEach(b => b.onclick = () => done(b.dataset.powerHire === 'guard' ? g.hireGuard() : g.hire(b.dataset.powerHire)));
    root.querySelectorAll('[data-power-party]').forEach(b => b.onclick = () => { const ok = g.toggleParty(b.dataset.powerParty); if (ok) sfx('crack'); done(ok); });
    root.querySelector('button:not(:disabled)')?.focus();
  };
  if (dlg.open) {
    dlg.querySelector('.power-sheet-layer')?.remove();
    const layer = document.createElement('div'); layer.className = 'power-sheet-layer'; layer.innerHTML = html;
    const close = () => { layer.remove(); };
    layer.addEventListener('click', e => { if (e.target === layer) close(); });
    layer.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } });
    dlg.append(layer); bind(layer, close);
  } else modal(`<div class="power-sheet-wrap">${html}</div>`, d => bind(d, () => d.close()), 'power-dialog');
}
// ป้ายไอคอนพลังอยู่ในปุ่ม/การ์ดหลายแบบ — ดักตอน capture เพื่อไม่ให้ปุ่มแม่ (เลือกเข้าทีมชายแดน ฯลฯ) ทำงานไปด้วย
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-power]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation(); openPowerSheet(b.dataset.power);
}, true);
document.addEventListener('keydown', e => {
  if(g.mapTravel)return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const b = e.target.closest?.('[data-power]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation(); openPowerSheet(b.dataset.power);
}, true);

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
  const niraGreet = greetLine({ kind: 'nira', name: g.crewOf('nira')?.name || 'นิรา' });   // P4: บรรทัดทักจากชุดบทของ Rae (ไม่มีผลต่อเกม)
  const paint = () => {
    const final = g.finalTeamSelection(), max = final ? g.teamLimits.finalTeamMax : g.teamLimits.normalTeamMax;
    const party = (final ? g.party?.finalMembers : g.party?.members) || [];
    const candidates = final ? g.finalTeamCandidates() : CREW.filter(c => !c.reader);
    // P1: การ์ดเรียงตามลำดับแนะนำจ้าง (unlocks.js HIRE_PLAN) — ป้าย "ลำดับจ้าง N" + "★ แนะนำ" ที่ตัวถัดไป
    // ลำดับ 0 (ทัณฑ์ที่มีตั้งแต่เริ่ม / ทีมศึกสุดท้าย) ขึ้นก่อน · sort เสถียร จึงไม่สลับกันเอง
    const nextHire = recommendedHire(g);
    const hireTag = (id, hired) => {
      const rank = hireRank(id);
      return rank && !hired ? `<small class="hire-rank">${esc(t('hire.rank', { n: rank }))}${nextHire === id ? ` · <b>★ ${esc(t('hire.recommend'))}</b>` : ''}</small>` : '';
    };
    const cardList = candidates.map(def => {
      const c = final ? def : g.crew.find(x => x.k === def.k), key = c && (final ? c.id : c.k), on = c && party.includes(key);
      const why = final ? g.finalTeamWhy(c) : '';
      const rank = final ? 0 : hireRank(def.k);
      return { rank, html: `<article class="shop-card${!final && !c && nextHire === def.k ? ' hire-recommended' : ''}"><span class="pw-av"><img src="${crewArt(c || def, '-profile')}" alt="">${powerBadgeHtml(def.k, { zone: g.zone, actor: c })}</span>
          <span><b>${esc(c?.name || crewName(def, g.zone))}</b><small>${esc(c?.cook?'พ่อครัวโรงอาหาร · ทำอาหารให้ทุกคน':def.duty)}</small>${final ? `<small>${esc(ZONES.find(z => z.k === c.homeZone)?.name || c.homeZone)} · กำลังใจ ${Math.round(c.morale)}</small><small>${esc(why)}</small>` : ''}
          ${!final ? hireTag(def.k, !!c) : ''}
          ${c ? `<small>แรง ${c.raeng} · ระเบียบ ${c.rabiab}</small><small>ท่าสู้: ${crewAbility(c)} · คูลดาวน์ ${BATTLE.crewCd} วินาที</small>` : `<small>ค่าจ้าง ${def.hire} เบี้ยกรรม · ท่าสู้: ${crewAbility(def.k)}</small>`}
          ${c ? niraItemWidget(c) + guardRestWidget(c) : ''}</span>
          ${c ? `<button data-party="${key}" class="sm" title="${esc(why)}" ${!on && (party.length >= max || why) ? 'disabled' : ''}>${on ? '✓ อยู่ในทีมสู้' : 'เข้าทีมสู้'}</button>`
              : `<button data-hire="${def.k}" class="sm gold" ${g.coin < def.hire ? 'disabled' : ''}>จ้าง</button>`}
        </article>` };
    });
    // ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — การ์ดยักษ์ทวารบาลในหน้าต่างเดียวกับยมทูต แทนย่อหน้ายาวด้านล่างเดิม
    // (ยักษ์ไม่ต้องจัดเข้าทีม 2 คน แต่ยังอยากเห็นแรง/ท่าสู้/คูลดาวน์/สถานะแบบเดียวกัน)
    cardList.push({ rank: hireRank('guard'), html: `<article class="shop-card${nextHire === 'guard' ? ' hire-recommended' : ''}">
        <span class="pw-av"><img src="${artUrl('crew-guard-profile') || artUrl('crew-guard')}" alt="">${powerBadgeHtml('guard', { zone: g.zone, actor: g.guard })}</span>
        <span><b>${esc(GUARD.name)}</b><small>ยามประจำโซน — ไม่ต้องจัดเข้าทีม</small>
        ${hireTag('guard', !!g.guard)}
        <small>ท่าสู้: ${crewAbility('guard')} · คูลดาวน์ ${GUARD.helpCdMs / 1000} วินาที</small>${g.guard ? niraItemWidget(g.guard) : ''}${guardRestWidget(g.guard)}</span>
        ${g.guard
          ? `<button class="sm" disabled title="พร้อมช่วยรบอัตโนมัติเมื่อไม่ได้เดินไปพักหรือพักฟื้น ไม่กินโควตาทีม ${max} คนของยมทูต">${g.guardActive() ? '✓ พร้อมช่วยรบ' : 'พักฟื้น — ไม่ร่วมต่อสู้'}<small>(ไม่นับโควตา ${max} คน)</small></button>`
          : `<button data-hire-guard class="sm gold" ${g.coin < GUARD.hire ? 'disabled' : ''} title="จ้างแล้วช่วยรบทุกฉากต่อสู้ให้เองอัตโนมัติ ไม่ต้องจัดเข้าทีม">จ้าง ${GUARD.hire}</button>`}
      </article>` });
    const cards = cardList.map((x, i) => ({ ...x, i })).sort((a, b) => a.rank - b.rank || a.i - b.i).map(x => x.html);
    dlg.innerHTML = `<h2>📋 โต๊ะนิรา — บุคลากรและทีมต่อสู้</h2>${final ? '' : niraGreet}
      <p class="hint">เลือกยมทูตเข้าทีม${final ? 'ศึกสุดท้ายข้ามโซน' : 'ต่อสู้'}ได้ ${max} คน เมื่อเข้าสนามรบจะมาช่วยยมบาทน้อย ${final ? 'ช่วงศึกสุดท้ายงานประจำหยุดพัก เตรียมทีมได้เต็มที่' : 'ระหว่างอยู่บนแผนที่ยังทำงานประจำต่อ ไม่ต้องเดินตาม'}</p>
      <div class="market-grid">${cards.join('')}</div>
      ${workersPanelHtml(g)}
      ${teamReportsHtml(g)}
      <div class="row"><button class="gold" data-close>เสร็จแล้ว</button></div>`;
    bindWorkersPanel(dlg,g,() => { paint();refresh(); });
    bindTeamReports(dlg,g,() => { paint();refresh(); });
    dlg.querySelectorAll('[data-hire]').forEach(b => b.onclick = () => { if (g.hire(b.dataset.hire)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-party]').forEach(b => b.onclick = () => { if (g.toggleParty(b.dataset.party)) { sfx('crack'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-nira-item]').forEach(b => b.onclick = () => { if (g.giveCrewItem(b.dataset.niraItem, b.dataset.actorId)) { sfx('coin'); paint(); refresh(); } });
    bindHungerWidgets(dlg, () => { paint(); refresh(); });
    const hireGuardBtn = dlg.querySelector('[data-hire-guard]');
    if (hireGuardBtn) hireGuardBtn.onclick = () => { if (g.hireGuard()) { sfx('coin'); paint(); refresh(); } };
  };
  paint(); openDlg('nira-office');
  const generation = dlgGen;
  afterPowerSheet = () => { if (dlg.open && dlgGen === generation) paint(); };
  const restState = () => Object.values(g.roster).map(c => `${c.id}:${c.teaRest?.phase || ''}`).join(',');
  let paintedRestState = restState();
  const restTimer = setInterval(() => {
    if (!dlg.open || dlgGen !== generation) { clearInterval(restTimer); return; }
    g.updateActorRecovery();
    const state = restState();
    if (state !== paintedRestState) { paintedRestState = state; paint(); return; }
    const statuses = [...dlg.querySelectorAll('[data-guard-status]')];
    if (statuses.length) {
      for (const status of statuses) { const a = g.roster[status.dataset.guardStatus]; if (a) status.outerHTML = guardRestWidget(a); }
      bindHungerWidgets(dlg, () => { paint(); refresh(); });
    }
  }, 250);
}

function openMerchant() {
  if (!g.zoneCaptivesFree()) return;
  pauseForDlg();
  const stock0 = merchantStock(g.zone);
  const merchantGreet = greetLine({ kind: 'merchant', name: MERCHANT.name }, { merchant: { poor: g.coin < Math.min(...stock0.map(x => x.cost)), anyLocked: stock0.some(x => g.level < x.lv) } });
  const paint = () => {
    const mats = Object.entries(g.inventory || {}).filter(([k,n]) => n > 0 && ITEMS[k]?.material);
    dlg.innerHTML = `<div class="merchant-heading"><img src="img/merchant-profile.jpeg" alt="พ่อค้าควันทอง"><div><h2>🧳 ${esc(MERCHANT.name)}</h2><p class="hint">${esc(MERCHANT.line)} · มี ${Math.round(g.coin)} เบี้ยกรรม</p></div></div>
      ${merchantGreet}
      <h3>ขายของจากชายแดน</h3><div class="market-grid">${mats.length ? mats.map(([k,n]) => {
        const d = ITEMS[k]; return `<article class="shop-card">${itemImg(k, 'class="shop-item-img"')}<span><b>${esc(d.name)} ×${n}</b><small>${d.sell} เบี้ยกรรมต่อชิ้น</small></span>
          <button data-sell="${k}">ขาย 1</button><button data-sell-all="${k}" class="gold">ขายทั้งหมด</button></article>`;
      }).join('') : '<div class="hint">ยังไม่มีของสนามรบในกระเป๋า</div>'}</div>
      <h3>สินค้า</h3><div class="market-grid">${merchantStock(g.zone).map(s => {
        const d = ITEMS[s.k], lock = g.level < s.lv;
        return `<article class="shop-card">${itemImg(s.k, 'class="shop-item-img"')}<span><b>${esc(itemName(s.k))}${s.qty ? ` ×${s.qty}` : ''}</b><small>${lock ? `ปลดล็อกที่ขั้น ${LEVELS[s.lv - 1].name}` : `${s.cost} เบี้ยกรรม`}${d.consumable ? ` · ${esc(itemText(s.k, 'desc'))}` : ''}</small></span>
          <button data-buy="${s.k}" class="gold" ${lock || g.coin < s.cost ? 'disabled' : ''}>ซื้อ</button></article>`;
      }).join('')}</div>
      <div class="row"><button class="gold" data-close>กลับแผนที่</button></div>`;
    dlg.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { if (g.sellMaterial(b.dataset.sell)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-sell-all]').forEach(b => b.onclick = () => { if (g.sellMaterial(b.dataset.sellAll, true)) { sfx('coin'); paint(); refresh(); } });
    dlg.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { if (g.buyMerchant(b.dataset.buy)) { sfx('coin'); paint(); refresh(); } });
  };
  paint(); openDlg('merchant');
}

/** G3b — คุยกับบอสในฉากชายแดน: บทพูด (ตอนคุย + ชวน) · รางวัล · ปุ่มประลอง 10 ระลอก / ประลองต่อ / ประลองซ้ำ */
function runBossGuideStory(beat,onDone) {
  const queued=beat==='farewell'?g.farewellBossGuide():g.inviteBossGuide();
  if(!queued){onDone?.();return;}
  if(dlg.open)dlg.close();g.save();g.onChange();
  const resume=()=>{
    if(g.over||g.battle)return;
    if(dlg.open||storyPlaying||g.storyQueue.length||g.pendingReward||rewardOpen){setTimeout(resume,200);return;}
    onDone?.();
  };
  setTimeout(resume,200);
}

function openChallenge(onReturn) {
  const back = () => {
    if (dlg.open) return;
    dlg.removeEventListener('close', back);
    if (!g.over && !g.battle) onReturn?.();
  };
  const zone = g.zone, ev = g.challengeEvent(zone);
  if (!ev || !g.challengeUnlocked(zone) || g.battle) return;
  const w = ev.reward.weapon, name = BOSS_NAMES[zone].frontier, done = g.challengeDone(zone), wave = g.challengeStartWave(zone);
  const go = done ? t('challenge.rematch') : wave > 1 ? t('challenge.resume', { wave }) : t('challenge.start');
  const info = done ? t('challenge.info.replay') : wave > 1 ? t('challenge.info.checkpoint', { wave }) : '';
  pauseForDlg();
  modal(`<div class="challenge-talk">
    <img class="challenge-boss" src="${esc(storyFoeArt(`boss-frontier-${zone}`))}" alt="${esc(name)}">
    <h2>${esc(name)}</h2>
    <p class="challenge-line">“${esc(t(`challenge.${zone}.talk`))}”</p>
    <p class="challenge-line">“${esc(t(`challenge.${zone}.invite`))}”</p>
    <div class="challenge-weapon">${weaponImg(w)}<span><small>${esc(t('challenge.info.reward', { weapon:t(`weapon.${w}.name`) }))}</small>
      ${weaponEffectLines(w).map(l => `<small>${esc(l)}</small>`).join('')}<small>${esc(t('weapon.only'))}</small></span></div>
    ${info ? `<p class="hint">${esc(info)}</p>` : ''}
    <div class="row"><button data-close>${esc(t('challenge.later'))}</button><button class="gold" data-challenge-go>${go}</button></div></div>`, d => {
      d.querySelector('[data-challenge-go]').onclick = () => { if (g.startChallenge()) { dlg.removeEventListener('close', back); dlg.close(); openBattle(onReturn); } };
    }, 'challenge-dialog');
  dlg.addEventListener('close', back);
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
function openFrontier(fromWalk = false, breachArg = null, introSeen = false, approachReached = false) {
  // ชุด 29C ข้อ 9 — มี event ปีศาจบุกรออยู่ (รับทราบแล้ว) → หน้าต่างนี้คือหน้าเตรียมทีมของ event นั้น · ไม่มี = หน้าเตรียมทีมชายแดนปกติ
  const breachKey = fromWalk ? null : (typeof breachArg === 'string' ? breachArg : g.breachMarch()?.key || null);
  const bev = breachKey ? (ZONE_EVENTS[g.zone] || []).find(e => e.k === breachKey) : null;
  const breach = !!bev, thBreach = breachKey === 'frontierBreach';
  if (['frontierBreach','asiaRageBreach','westVampireBreach','cyberBreach'].includes(breachKey) && !approachReached) { openFrontierWalk(breachKey); return; }
  // An invasion requires walking to the boss in the frontier scene. He speaks on arrival,
  // before team preparation; acknowledging this scene never starts a fight.
  const intro = breach && !introSeen && frontierIntroduction(g.zone, getLang());
  if (intro) {
    const zone = g.zone;
    const proceed = () => {
      if (g.zone === zone && g.zoneEventStatus(breachKey) === 'pending') openFrontier(false, breachKey, true, true);
      else dlg.close();
    };
    modal(`<div class="intro-comic frontier-introduction" role="region" aria-label="${esc(intro.speaker)}">
      <div class="intro-comic-frame"><img src="${esc(intro.image)}" alt="${esc(intro.speaker)}"></div>
      <div class="intro-comic-caption"><h2>${esc(intro.speaker)}</h2><p>“${esc(intro.line)}”</p></div>
      <div class="intro-comic-controls"><button data-frontier-intro-skip>${getLang() === 'en' ? 'Skip scene' : 'ข้ามฉาก'}</button>
        <button class="gold" data-frontier-intro-next>${getLang() === 'en' ? 'Prepare the team' : 'เตรียมทีมรับศึก'}</button></div>
      </div>`, d => {
        prepareComicImages(d);
        d.querySelector('[data-frontier-intro-skip]').onclick = proceed;
        d.querySelector('[data-frontier-intro-next]').onclick = proceed;
      }, 'intro-comic-dialog');
    return;
  }
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
    const frontierBg = themeBackground(g.zone, 'frontier');
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
              <span class="pw-av"><img src="${artUrl('crew-' + c.k + '-profile') || artUrl('crew-' + c.k)}" alt="">${powerBadgeHtml(c.k, { zone: g.zone, actor: c })}</span>
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
function openFrontierWalk(invasionKey = null) {
  pauseForDlg();
  let myGen = -1;
  const mine = () => myGen < 0 || (dlg.open && dlgGen === myGen);
  const state = g.frontierOf();
  const wave = (state.clears || 0) + 1;
  const kinds = g.zoneDef().mobs || [];
  const frontierBg = themeBackground(g.zone, 'frontier');
  const chosen = state.team || [];
  const zoneName = g.zoneDef().name;
  const gateName = zoneName.startsWith('โซน') ? zoneName : `โซน${zoneName}`;

  dlg.innerHTML = `
    <div class="frw-fullscreen">
      <div class="frw-map"><canvas id="frw-cv" width="1376" height="768"></canvas>
        <button class="frw-fab" id="frw-fab" type="button" hidden>⚔️ เริ่มต่อสู้</button>
        <button class="frw-fab" id="frw-guide" type="button" hidden>คุยกับผู้ตรวจการ · ไปดินแดนใหม่</button>
        <button class="frw-fab" id="frw-challenge" type="button" hidden></button>
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
  const nira = dlg.querySelector('#frw-nira');
  const challenge = dlg.querySelector('#frw-challenge');
  const guide=dlg.querySelector('#frw-guide');
  // P5: ไม่มีปุ่ม "กลับเข้าโซน" / "ออกนอกชายแดน" — เดินถึงลูกศรบนพื้น (ประตูบน / ทางล่าง) แล้วออกเอง (src/frontier.js)
  // ป้ายบนพื้นใช้ข้อความเดิมของปุ่มทุกคำ
  const routeOpen = () => openDungeonRoutes(g).length > 0;
  const exitLabel = !routeOpen() ? 'ทางนอกชายแดน · ยังไม่เปิด' : g.zone !== 'th' ? 'ออกนอกชายแดน · ดินแดนถัดไป' : 'ออกนอกชายแดน · เส้นทางโซน 2';
  const cv2 = dlg.querySelector('#frw-cv');

  let FW = null;
  const leaveToZone = () => { FW.destroy(); dlg.close(); };
  const leaveToRoute = () => {
    if(g.bossGuideWaiting?.()){askGuide();return;}
    const route=openDungeonRoutes(g)[0];
    if(!route){
      FW.destroy();
      modal('<h2>ทางนอกชายแดนยังไม่เปิด</h2><p>ผ่านภารกิจประจำโซนและการทดสอบเทวดาก่อน แล้วจึงออกไปตามหาบอสในถ้ำได้</p><button data-close>กลับด่านชายแดน</button>');
      const back=()=>{if(dlg.open)return;dlg.removeEventListener('close',back);openFrontierWalk();};dlg.addEventListener('close',back);
      return;
    }
    if(dungeonStatus(g)||g.beginBorderDungeon(route.to)){FW.destroy();openDungeon();}
  };
  FW = makeFrontierWalk(cv2, g, { bg: frontierBg, kinds, wave, alive: mine, fab, nira, challenge, guide, invasionKey,
    onGate: leaveToZone, onExit: leaveToRoute, gateLabel: `กลับเข้า${gateName}`, exitLabel, exitOpen: routeOpen });
  FW.start();
  const menu = fn => {
    const zone=g.zone;
    FW.destroy();
    fn();
    const back = () => {
      if(dlg.open) return; // Ignore the asynchronous close from replacing the map.
      dlg.removeEventListener('close',back);
      if(started && !g.over && !g.battle && g.zone===zone) openFrontierWalk(invasionKey);
    };
    dlg.addEventListener('close',back);
  };
  const guidedDeparture=()=>{
    const route=openDungeonRoutes(g)[0];
    if(!route){openFrontierWalk();return;}
    runBossGuideStory('welcome',()=>{if(dungeonStatus(g)||g.beginBorderDungeon(route.to))openDungeon();else openFrontierWalk();});
  };
  const askGuide=()=>{
    FW.destroy();
    modal(`<h2>${esc(g.zoneDef().bossName)}</h2><p>จะออกนอกเขตชายแดนไหม? ข้าจะนำทางและร่วมต่อสู้กับยามาและนิรา จนถึงประตูดินแดนใหม่</p><div class="row"><button class="gold" data-guide-depart>ตกลง · ออกเดินทางด้วยกัน</button><button data-guide-stay>ไว้ก่อน</button></div>`,d=>{
      d.querySelector('[data-guide-depart]').onclick=guidedDeparture;
      d.querySelector('[data-guide-stay]').onclick=()=>openFrontierWalk();
    });
  };
  guide.onclick=()=>{if(FW.canTalkGuide())askGuide();};
  challenge.onclick = () => {
    if (!FW.canTalkChallenge()) return;
    FW.destroy();
    openChallenge(() => openFrontierWalk());
  };
  dlg.querySelector('#frw-pause').onclick = () => menu(() => openPause(true));
  dlg.querySelector('#frw-settings').onclick = () => menu(openSettings);
  dlg.querySelector('#frw-book').onclick = () => menu(openHelp);
  dlg.querySelector('#frw-bag').onclick = () => menu(openBag);


  fab.onclick = () => {
    const id = FW.nearId();
    const en = id != null && FW.getEnemy(id);
    if (!en) return;
    if (invasionKey) { FW.destroy(); openFrontier(false, invasionKey, false, true); return; }
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

  // P5: เดินออกประตูบน = ปิดกล่องกลับแผนที่โซน แค่ปิดกล่อง ไม่ล้างสนามรบ — ออกไปทำธุระอื่นแล้วกลับมาสู้ต่อได้ ตัวที่ปราบไปแล้วไม่ฟื้น
  // (ข้อ 8 ในใบงานเดิมอนุญาตแค่ "ออกจากเกมกลางชายแดนแล้วกลับมา = เริ่มใหม่ได้" เป็นข้อยกเว้นตอนโหลดหน้าใหม่ ไม่ใช่ทุกครั้งที่ออก)
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
    if (dlg.open || storyPlaying || g.storyQueue.length || g.pendingLevel || g.pendingZone || g.bossJustice?.active) { setTimeout(go, 400); return; }
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
  let dash = null;
  let moveName = null, moveNameTimer = 0;
  const clearMoveName = () => { clearTimeout(moveNameTimer); moveName = null; dlg.querySelectorAll('.battle-move-name').forEach(el => el.remove()); };
  const renderMoveName = () => {
    dlg.querySelectorAll('.battle-move-name').forEach(el => el.remove());
    if (!moveName || !phase || Date.now() >= moveName.until) return;
    const stage = dlg.querySelector('.combat-arena');
    if (!stage) return;
    const el = document.createElement('div'); el.className = 'battle-move-name'; el.setAttribute('role','status'); el.textContent = moveName.label; stage.append(el);
  };
  const setMoveName = (action, ultimate = null, cutMs = 0) => {
    clearMoveName();
    const key = specialMoveKey(action, ultimate); if (!key) return;
    const crew = key.startsWith('crew:') ? key.slice(5) : key === 'guard' ? 'guard' : null;
    const label = crew ? powerName(crew) : key === 'enemy' ? t('battle.move.enemy', {name:ultimate.name || ''}) : t('battle.move.' + key);
    moveName = {label, until:Date.now() + cutMs + 1200}; renderMoveName();
    moveNameTimer = setTimeout(clearMoveName, cutMs + 1200);
  };

  let commandPanel = null, commandPanelActor = null;
  let commandMenuOpen = true, authorityAttackScheduled = false, enemyScheduled = false;
  let fleeConfirm = false;      // L2: "หนีจากการต่อสู้" confirmation layer is showing
  const formationMotion = {activeKey:null,previousKey:null,changedAt:0};
  // L2: เอฟเฟกต์ตอนได้เติมเลือด/พลังเวท (ไอเท็ม พลัง การดูดเลือด ฯลฯ) ทุกตัวที่ได้รับพร้อมกัน — เก็บเวลาไว้วาดซ้ำได้ถ้าฉากถูกวาดใหม่กลางทาง (innerHTML ถูกแทนที่ทุก paint)
  // ---- M2: battle effects (src/battle-fx.js). Rects are measured after the paint that follows, in stage-local px. ----
  let fxHandled = false;       // true while an effect owns damage numbers + the old static .fx image for the current phase
  const keyOfActor = id => { const c = id === 'you' ? null : g.battleActors().find(a => a.id === id); return id === 'you' ? 'you' : c ? (c.k === 'guard' ? 'guard' : crewBattleKey(c)) : id; };
  const allyImg = key => dlg.querySelector(`[data-crew-pick="${key}"]:not(.battle-portrait) img:not(.fx)`);
  const foeImg = id => (id && dlg.querySelector(`.fig.foe[data-foe-id="${id}"] img:not(.fx)`)) || dlg.querySelector('.fig.foe img:not(.fx)');
  const fxRect = async img => {
    const stage = dlg.querySelector('.combat-arena');
    if (!stage || !img) return null;
    const cam = hasBattleCamera();   // M1 camera: battleSpriteRect / rectOf already return stage-local, un-zoomed px
    const sr = stage.getBoundingClientRect(), k = sr.width / (stage.offsetWidth || sr.width) || 1;
    let r = null;
    try { r = await battleSpriteRect(img); } catch (e) { r = null; }
    if (!r || !(r.r > r.l)) { if (cam) return cameraRectOf(img); const e = img.getBoundingClientRect(); r = { l:e.left, t:e.top, r:e.right, b:e.bottom }; }
    return cam ? { l:r.l, t:r.t, r:r.r, b:r.b } : { l:(r.l - sr.left) / k, t:(r.t - sr.top) / k, r:(r.r - sr.left) / k, b:(r.b - sr.top) / k };
  };
  const stopFxHandled = () => { fxHandled = false; dlg.querySelector('.combat-arena')?.classList.remove('fx-handled'); };
  /** one move's effect. phase 'you' = our action (k = command key), 'foe' = their turn. Never throws: on any trouble the old numbers come back. */
  const startMoveFx = async (phaseKind, k, extraDelay = 0, cutMs = 0) => {
    const camHit = cueImpactAtMs;   // read before any await: the cue just started by startActionCue (null = no cue / camera parked)
    const impactIn = (fallbackKind) => camHit != null ? Math.max(0, (camHit - performance.now()) * (camera.timeScale || 1)) : cueImpactAt(fallbackKind, cutMs);
    try {
      const b = g.battle; if (!b || !dlg.querySelector('.combat-arena')) { stopFxHandled(); return; }
      const d = b.dmg || {}, plays = [];
      if (phaseKind === 'you') {
        const replay = b.weaponNote?.k === 'replay' ? b.weaponNote.n : 0;
        const recipe = recipeFor(k, { dmg:d.foe, crit:d.crit, replay });
        if (!recipe) { stopFxHandled(); return; }
        if (recipe === 'heal') return;      // heals are drawn from showHeals (knows who gained what); fxHandled stays on so the old static heal image stays hidden
        const src = await fxRect(allyImg(dash?.side === 'you' ? dash.key : keyOfActor(b.actorId || 'you')));
        const self = ['rage', 'clock', 'mirror'].includes(recipe);
        const hits = self ? [] : (d.foeHits?.length ? d.foeHits : [{ id:d.foeId, damage:d.foe }]);
        const targets = self ? [{ rect:src, dmg:0 }] : (await Promise.all(hits.map(async h => ({ rect:await fxRect(foeImg(h.id)), dmg:h.damage || 0, label:d.crit && recipe.startsWith('slash') ? t('battle.fx.crit') : '' })))).filter(x => x.rect);
        if (!src || !targets.length) { stopFxHandled(); return; }
        // timing from the attacker's own animation: Yama's sword frames, or the Codex pose atlas of the crew member (contact frame)
        const actor = g.battleActors().find(a => a.id === (b.actorId || 'you'));
        const contact = !actor || actor.id === 'you' ? (isYamaSwordAttack({ action:k }) ? swordContactMs(SWORD_FRAME_MS) : 0)
          : poseContactMs(poseDurations(`crew:${actor.homeZone || g.zone}:${actor.k}`));
        const hitDelay = leadInMs(recipe, contact);
        plays.push({ recipe, src, targets, side:'foe', opts:{ weapon:k === 'atk' ? g.weapons?.equipped : null, crit:d.crit }, ...(dash ? {numberDelay:0} : {}), delay:dash ? 0 : extraDelay + hitDelay, impactAt:impactIn(cueKindFor('you', k)) });
      } else {
        const delay = extraDelay;
        if (d.confuseSelf > 0 || (d.burnSelf > 0 && !(d.you > 0 || d.crew > 0))) {
          const list = d.confuseHits?.length ? d.confuseHits : [{ attackerId:d.counterFoeId, id:d.counterFoeId, damage:d.confuseSelf || d.burnSelf }];
          for (const h of list) {
            const src = await fxRect(foeImg(h.attackerId || h.id)), tg = await fxRect(foeImg(h.id));
            if (src && tg) plays.push({ recipe:d.confuseSelf > 0 ? 'slash' : 'burn', src, targets:[{ rect:tg, dmg:h.damage || 0 }], side:'foe', delay:delay + 110 });
          }
        } else {
          const hits = d.enemyHits?.length ? d.enemyHits : [{ id:'you', damage:d.you || d.crew || 0 }];
          const src = await fxRect(foeImg(d.counterFoeId));
          const targets = (await Promise.all(hits.map(async h => ({ rect:await fxRect(allyImg(keyOfActor(h.id))), dmg:h.damage || 0 })))).filter(x => x.rect);
          const fi = foeImg(d.counterFoeId), fk = fi && bossSpriteKey(fi.getAttribute('src') || '', b.zone || g.zone);
          const fc = fk ? poseContactMs(poseDurations(fk)) : 0;   // the foe's own attack-pose contact frame (Codex atlas), if it has one
          if (src && targets.length) plays.push({ recipe:b.ultimate ? 'foe_ult' : foeTier(Math.max(...hits.map(h => h.damage || 0))), src, targets, side:'you', ...(dash ? {numberDelay:-120} : {}), delay:dash ? 0 : delay + (b.ultimate ? 0 : fc > 0 ? Math.max(0, fc - 170) : 60), impactAt:impactIn('foe-attack') });
        }
      }
      if (!plays.length) { stopFxHandled(); return; }
      for (const p of plays) playBattleFx(p);
    } catch (e) { stopFxHandled(); }
  };
  /** healing: one soft ring around the team + flowers/petals per healed actor (the L2 CSS glow stays) */
  const playHealBattleFx = async (gains, delayMs) => {
    try {
      const targets = (await Promise.all(gains.map(async gn => ({ rect:await fxRect(allyImg(keyOfActor(gn.id))), dmg:0 })))).filter(x => x.rect);
      if (!targets.length) return;
      const mpOnly = gains.every(gn => !(gn.hp > 0));
      const src = targets[0].rect;
      playBattleFx({ recipe:'heal', src, targets, side:'you', numbers:false, opts:{ mp:mpOnly }, delay:delayMs });
    } catch (e) { /* the L2 glow already shows */ }
  };
  let healFx = [], healTimers = [];
  const healRoot = key => key === 'you' ? dlg.querySelector('.fig.you')
    : dlg.querySelector(`.battle-squad [data-crew-pick="${key}"], .formation-member[data-crew-pick="${key}"]`);
  const applyHealFx = () => {
    const now = Date.now();
    healFx = healFx.filter(h => now < h.start + h.ms);
    for (const h of healFx) {
      const root = healRoot(h.key);
      if (!root) continue;
      root.querySelector(':scope > .heal-fx')?.remove();
      if (now >= h.start) root.insertAdjacentHTML('beforeend', healFxHtml(h, now - h.start, t('battle.mp')));
    }
  };
  const scheduleHealFx = () => {
    healTimers.forEach(clearTimeout); healTimers = [];
    for (const h of healFx) {
      healTimers.push(setTimeout(applyHealFx, Math.max(0, h.start - Date.now())));
      healTimers.push(setTimeout(() => {      // ครบเวลา — เก็บออก (กรณีไม่มีการวาดใหม่มาเก็บให้)
        healRoot(h.key)?.querySelector(':scope > .heal-fx')?.remove();
        healFx = healFx.filter(x => x !== h);
      }, Math.max(0, h.start + h.ms - Date.now())));
    }
  };
  /** after a command / enemy turn changed our side's vitals: show the effect on everyone who gained HP or MP */
  const showHeals = (before, delayMs = 120) => {
    const keyOf = keyOfActor;
    const gains = vitalGains(before, vitalsOf(g));
    const healed=g.battle?.dmg;
    if(healed?.healAmount>0&&!gains.some(a=>a.id===healed.healActorId))gains.push({id:healed.healActorId,hp:healed.healAmount,mp:0});
    if (!gains.length) return;
    const start = Date.now() + delayMs;
    for (const gn of gains) healFx.push({ ...gn, key: keyOf(gn.id), start, ms: HEAL_GLOW_MS });
    scheduleHealFx();
    playHealBattleFx(gains, delayMs);   // M2: ring of light + sparkles on top of the L2 glow
  };
  // ---- M1: camera hooks (see src/battle-camera.js · docs/battle-camera-api.md) ----
  // The camera never changes game rules or timers: it only reacts to the same phase changes the fight already has.
  // Codex's drawn combat animations (img/combat-animation-v1): read-only — only used to time the camera impact to the attack's contact frame.
  let animSprites = null;
  if (typeof fetch === 'function') fetch('img/combat-animation-v1/manifest.json?v=night-v1-p9').then(r => r.ok ? r.json() : null).then(j => { animSprites = j?.sprites || null; }).catch(() => {});
  const strikeOf = key => { const rec = animSprites && key && (animSprites[`${key}:attack`] || animSprites[key]); return strikeTime(rec?.modes?.attack?.durations); };
  const impactLead = key => { const t = strikeOf(key); return t == null ? undefined : Math.max(150, t - (Date.now() - phaseAt)); };
  const actorKeyOf = a => !a ? 'you' : a.id === 'you' ? 'you' : crewBattleKey(a);
  const actorKeyById = id => actorKeyOf(g.battleActors().find(a => a.id === id) || { id });
  const livingFoeIds = () => (g.battle?.foes || []).filter(f => f.hp > 0).map(f => f.id);
  /** weight of the hit that just landed: 1 light · 2 heavy · 3 crit-sized (share of the target's max morale) */
  const hitPower = (b, floor = 1) => {
    const id = b.dmg?.foeId ?? b.selectedFoeId, f = b.foes?.find(x => x.id === id) || b.foes?.[0];
    const share = f?.maxHp ? (b.dmg?.foe || 0) / f.maxHp : 0;
    return Math.max(floor, share >= .3 ? 3 : share >= .15 ? 2 : 1);
  };
  /** start the action choreography for the phase that was just entered (called right after paint(), once per phase) */
  let cueImpactAtMs = null;   // M-merge: wall-clock time (performance.now) the running action cue's impact lands — M2's canvas effect starts so its own hit moment meets it
  const cue = (kind, ctx) => {
    const d = g.battle?.dmg;
    if (moveName && (d?.foe > 0 || d?.you > 0 || d?.crew > 0)) ctx = {...ctx, flash:{alpha:.3}};
    const c = camera.cue(kind, ctx); cueImpactAtMs = performance.now() + (c.impactAt || 0) / (camera.timeScale || 1); return c;
  };
  const startActionCue = (cutMs = 0) => {
    const b = g.battle;
    cueImpactAtMs = null;
    if (!b || !camera.stageEl()) return;
    setMoveName(phase === 'you' ? fxNow?.action : null, phase === 'foe' ? b.ultimate : null, cutMs);
    if (phase === 'you') {
      const a = fxNow?.action || '', userKey = actorKeyById(b.actorId || 'you');
      if (fxNow?.key === 'defend') return;
      const hitIds = (b.dmg?.foeHits || []).filter(h => h.damage > 0).map(h => h.id);
      const foeIds = hitIds.length ? hitIds : [b.dmg?.foeId ?? b.selectedFoeId ?? livingFoeIds()[0]].filter(Boolean);
      const targets = foeIds.map(id => `foe:${id}`);
      const scope = foeIds.length > 1 ? 'all' : 'single';
      if (fxNow?.key === 'rage') cue('skill', { user:userKey, targets:userKey, action:a, power:1, scope:'single', cutMs });
      else if (fxNow?.key === 'health') cue('heal', { user:userKey, targets:actorKeyById(fxNow.recipient || 'you'), action:a });
      else if (a === 'atk' || a === 'strike') {
        const who = g.battleActors().find(x => x.id === (b.actorId || 'you')), atlas = who && who.id !== 'you' ? `crew:${who.homeZone || g.zone}:${who.k}` : `yama:${g.outfit || g.zone}`;
        cue('attack', { user:userKey, targets, action:a, power:hitPower(b), scope, impactAt:impactLead(atlas) });
      }
      else cue('skill', { user:userKey, targets, action:a, power:hitPower(b, 2), scope, cutMs });
    } else if (phase === 'foe') {
      if (b.dmg?.confuseSelf > 0) return;
      const attacker = b.dmg?.counterFoeId || g.currentBattleTurn()?.id || livingFoeIds()[0];
      const hit = [...(b.dmg?.you > 0 ? ['you'] : []), ...(b.dmg?.hitActors || (b.dmg?.hitActor ? [b.dmg.hitActor] : [])).map(a => actorKeyOf(a))];
      const targets = hit.length ? [...new Set(hit)] : ['you'];
      const atkRoot = camera.stageEl()?.querySelector(`[data-foe-id="${attacker}"]`), atkImg = atkRoot?.querySelector('img:not(.fx)');
      const atkKey = atkImg && bossSpriteKey(atkImg.getAttribute('src') || '', b.zone || g.zone);
      cue('foe-attack', { impactAt:impactLead(atkKey), user:`foe:${attacker}`, targets, action:'foe', power:b.ultimate ? 3 : (b.dmg?.you || b.dmg?.crew || 0) >= (b.youMax || 100) * .2 ? 2 : 1, scope:targets.length > 1 ? 'all' : 'single', cutMs });
    }
  };
  /** after every paint: park the camera for the state the fight is in (action cues are started by executeCommand / enemy turn) */
  const cameraSync = (b, parked, activeKey) => {
    if (!camera.stageEl()) return;
    if (parked) { if (camera.currentCue !== 'idle') camera.cue('idle'); return; }
    if (phase) return;
    if (activeKey) { if (camera.currentCue !== `select:${JSON.stringify(activeKey)}`) camera.cue('select', { user:activeKey }); }
    else if (camera.currentCue !== 'idle') camera.cue('idle');
  };
  let prepHidden = false;   // ชุด 30B — ผู้เล่นพับหน้าต่างเตรียมศึกเพื่อดูฉากต่อสู้ (เปิดกลับได้ก่อนกดเข้าสู้)

  const dashRoot = () => dash && (dash.side === 'you'
    ? allyImg(dash.key)?.closest('[data-crew-pick]') : foeImg(dash.key)?.closest('.fig.foe'));
  const applyDashPosition = () => {
    const root = dashRoot(); if (!root) return;
    root.classList.add('battle-dashing');
    root.dataset.dashPhase = dash.returning ? 'return' : dash.hit ? 'hit' : dash.posed ? 'attack' : 'outbound';
    root.style.setProperty('translate', `${dash.position.x}px ${dash.position.y}px`, 'important');
    // The foot determines occlusion while crossing the formation (HUD remains above the world).
    const stage = dlg.querySelector('.combat-arena');
    const depth = foot => String(5 + Math.round(20 * foot / (stage?.offsetHeight || 1)));
    for (const item of dash.depths) {
      const el = item.side === 'you' ? allyImg(item.key)?.closest('[data-crew-pick]') : foeImg(item.key)?.closest('.fig.foe');
      el?.style.setProperty('z-index', depth(item.foot), 'important');
    }
    root.style.setProperty('z-index', depth(dash.source.b + dash.position.y), 'important');
  };
  const runDash = async ({ side = 'you', key, targetImage, contact, pose, onHit, onFinish, action, crew }) => {
    const b = g.battle, stage = dlg.querySelector('.combat-arena');
    if (!b || !stage) return;
    phase = side; phaseAt = Date.now(); commandMenuOpen = false;
    setMoveName(side === 'you' ? action : null, side === 'foe' ? b.ultimate : null);
    // Lock synchronously before the asynchronous opaque-bound measurement.
    b.commandBusy = true;
    dash = { side, key, source:{ b:0 }, depths:[], position:{ x:0, y:0 }, posed:false, hit:false };
    const bounded = (promise, fallback) => new Promise(resolve => {
      const timer = setTimeout(() => resolve(fallback()), 1500);
      Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(fallback()); });
    });
    await bounded(stage._battleSpriteFit, () => false);
    const initialRoot = dashRoot();
    await bounded(Promise.all((initialRoot?.getAnimations({subtree:true}) || [])
      .filter(a => Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), () => []);
    const measureDash = image => image ? bounded(fxRect(image), () => cameraRectOf(image)) : Promise.resolve(null);
    const source = await measureDash(side === 'you' ? allyImg(key) : foeImg(key));
    const target = await measureDash(targetImage);
    if (g.battle !== b || !dlg.open) { b.commandBusy = false; dash = null; phase = null; return; }
    const reduced = !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const delta = source && target && !reduced ? planDash(source, target) : { x:0, y:0 };
    const depths = (await Promise.all([
      ...g.battleActors().map(a => ({ side:'you', key:keyOfActor(a.id), image:allyImg(keyOfActor(a.id)) })),
      ...b.foes.map(f => ({ side:'foe', key:f.id, image:foeImg(f.id) }))
    ].map(async item => { const rect = await measureDash(item.image); return rect ? { ...item, image:undefined, foot:rect.b } : null; }))).filter(Boolean);
    dash = { side, key, depths, actor:side === 'you' ? g.battleActors().find(a => keyOfActor(a.id) === key) : null, source:source || { b:0 }, position:{ x:0, y:0 }, posed:false, hit:false };
    fxNow = null; fxHandled = true; b.dmg = {}; b.mid = null; b.helper = null; paint();
    // Guard also takes the melee path: show his own cutscene before launching, then pay/hit only at contact.
    const leadIn = side === 'you' && action === 'guard' && playActionCutscene('guard') ? ACTION_CUT_MS : 0;
    const timing = dashTiming({ contact, pose, reduced, leadIn });
    let clockAt = performance.now(), elapsed = 0;
    const advance = createDashSequence({ timing, delta,
      onPosition:position => { dash.position = position; applyDashPosition(); },
      onPose:() => {
        dash.posed = true; phaseAt = Date.now(); dash.poseAt = phaseAt;
        if (crew === 'nira') b.helper = { k:'nira', pose:'attack' };
        fxNow = side === 'you' ? { key:'atk', action, side:'foe', crew } : { key:'foe', side:'you' };
        paint();
      },
      onHit:() => {
        dash.hit = true; phaseAt = Date.now(); b.commandBusy = false;
        if (!onHit()) { clearMoveName(); dash = null; phase = null; fxNow = null; commandMenuOpen = true; paint(); return false; }
        // Asia's deva interlude removes the battle at contact; close this UI before returning to the story.
        if (g.battle !== b) { b.commandBusy = false; dash = null; phase = null; fxNow = null; finish(); return false; }
        powerSound(side === 'you' ? action : 'foe');
        paint();
        // Use the actual contact instant; the recipe's own delay must not add a second hit delay.
        cueImpactAtMs = performance.now();
        if (moveName && b.dmg?.foe > 0) camera.flash({alpha:.3});
        startMoveFx(side, action, 0, 0);
      },
      onReturn:() => { if (dash) { dash.returning = true; applyDashPosition(); } },
      onFinish:() => {
        dash = null; phase = null; fxNow = null;
        clearMoveName(); onFinish(); g.finishBattleCommand(); commandMenuOpen = true;
        // Preserve the original boss-finale flow after the attacker has returned home.
        if (b.storyFinale) { sfx('win'); finish(); return; }
        if (g.battle) { finishWaveAfterDash(); paint(); if (b.over) sfx(b.over === 'win' ? 'win' : 'lose'); }
      }
    });
    const tick = () => {
      if (!dash || g.battle !== b || !dlg.open) return;
      const now = performance.now();
      if (!userPaused && !pauseDlg.open) elapsed += now - clockAt;
      clockAt = now; advance(elapsed);
      if (dash) phaseTimer = setTimeout(tick, 16);
    };
    clearTimeout(phaseTimer); tick();
  };
  const finishWaveAfterDash = () => {
    if (!g.battle?.pendingWave) return;
    if (g.battle.kind === 'zoneEvent') g.advanceZoneEventWave();
    else g.advanceFrontierBreachWave();
  };
  const paint = () => {
    const b = g.battle;
    if (!b || storyActive) return;
    if (b.storyInterlude) {
      const key = b.storyInterlude;
      storyActive = true;
      const overlay = document.createElement('div');
      overlay.className = 'story-battle-overlay'; dlg.replaceChildren(overlay);
      renderStoryComic(overlay, STORY[key], () => {
        if (key === 'west-hypnosis') g.completeBattleInterlude(); else { b.storyInterlude = null; g.save(); }
        overlay.remove(); storyActive = false; phase = null; fxNow = null; paint();
      });
      return;
    }
    // ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — สะกดจิต (กานต์): ตา "เขา" ที่ถูกสะกด ฟาดเข้าตัวเอง
    // ไม่ใช่พุ่งเข้าใส่ยมบาทน้อย ต้อง flash ที่ตัวศัตรูเอง ไม่ใช่ที่ยมบาทน้อย (ดู B.dmg.confuseSelf ใน game.js)
    const confuseHit = !!(b.dmg && (b.dmg.confuseSelf > 0 || b.dmg.burnSelf > 0 && !(b.dmg.you > 0 || b.dmg.crew > 0)));
    // ระหว่างจังหวะ "ตาเรา" ให้โชว์ภาพนิ่งตอนที่เขายังไม่สวน เลือดฝั่งเราจึงยังไม่ลด
    const view = phase === 'you' && b.mid
        ? { ...b, foes:b.mid.foes, selectedFoeId:b.mid.selectedFoeId,
            youHp: b.mid.youHp, talk: b.mid.talk,
            dmg: { foe: b.dmg ? b.dmg.foe : 0, you: 0, foeId: b.dmg?.foeId, foeHits:b.dmg?.foeHits } }
      : phase === 'foe'
        // foeId/counterFoeId/confuseSelf ต้องส่งต่อให้ arena() ใช้เลือกว่าศัตรูตัวไหนโดนตี/พุ่งเข้าใส่ (ฉากหลายศัตรู)
        ? { ...b, dmg: confuseHit ? { foe: b.dmg.confuseSelf || b.dmg.burnSelf, you: 0, confuseSelf: b.dmg.confuseSelf, counterFoeId: b.dmg.counterFoeId, confuseHits:b.dmg.confuseHits }
                                  : { ...b.dmg, foe:0 } }
        : { ...b, dmg: { foe: 0, you: 0 } };
    // พลังบ้าคลั่งไม่ใช่การโจมตี — ยมบาทน้อยไม่พุ่ง ศัตรูไม่สะดุ้ง (ดู arena(): raging)
    const act = dash && !dash.hit ? null : phase === 'you' && fxNow?.key === 'rage' ? null
              : phase === 'you' && fxNow?.key === 'defend' ? null      // L2: defending is not an attack — nobody lunges or flinches
              : phase === 'you' ? { lunge: 'you', struck: 'foe' }
              : phase === 'foe' ? (confuseHit ? { struck: 'foe' } : { lunge: 'foe', struck: 'you' }) : null;
    const mp = g.mp;
    const battleHelpers = g.battleCrew();
    // ข้อ C คุณเป้ 25 ก.ย. 2569 — ยักษ์ทวารบาลเข้าร่วมทุกฉากต่อสู้ให้เองถ้าจ้างไว้แล้ว ไม่กินโควตา
    // ใช้ลำดับยักษ์ → ยมทูต → ยมบาทน้อย ให้ตรงกับการ์ด (การ์ดคูลดาวน์ใช้ระบบเดียวกับยมทูตใน arena() ด้านล่าง
    // แค่แยกแหล่งเวลา/ระยะคูลดาวน์เป็น GUARD.battleCd ผ่าน c.k==='guard')
    let squadMembers = g.guardActive() && !(b.absentActors || []).includes(g.guard.id) ? [{ ...g.guard, name: GUARD.name }, ...battleHelpers] : [...battleHelpers];
    if (dash?.actor && dash.actor.id !== 'you' && !squadMembers.some(c => c.id === dash.actor.id)) squadMembers.push(dash.actor);
    if (phase === 'foe') for (const c of b.dmg?.hitActors || (b.dmg?.hitActor ? [b.dmg.hitActor] : [])) {
      if (!squadMembers.some(s => s.id === c.id)) squadMembers.push({...c,name:c.name || GUARD.name});
    }
    // แก้รอบ 1 ข้อ C ชุด 13 คุณเป้ 26 ก.ย. 2569 — 3 ปุ่มตามใบงานเป๊ะ: พ่อค้านรก/นิรา/กินหีบยา
    // กดได้ทุกปุ่ม ลำดับไหนก็ได้ หลายครั้งก็ได้ (ไม่ใช่ครั้งเดียวเหมือนของเดิม) เปิดหน้าต่างเดิมที่มีอยู่แล้ว
    // (openMerchant/openNiraOffice ใช้ <dialog> ใบเดียวกับฉากต่อสู้ — ปิดแล้วตัวเฝ้า battleUI ที่ท้ายไฟล์
    // เปิดฉากเตรียมศึกกลับให้เองอัตโนมัติภายใน 400ms ไม่ต้องเขียน callback พิเศษ ดูคอมเมนต์ตรง
    // setInterval บนสุดของไฟล์ "ถึงปิดไป ตัวเฝ้าก็เปิดกลับให้อยู่ดีถ้าฉากยังไม่จบ")
    const rest = g.zoneEventRestReady() && !phase;
    // ชุด 30B ข้อ 1 — เตรียมศึก (บอสโซน 2–4 · พักก่อนระลอก 4/8 โซน 4) ใช้หน้าตาเดียวกับหน้าต่างแจ้งเตือนอีเวนต์:
    // กล่องบน = หัวข้อ + คำอธิบาย + ภาพศัตรู + ปุ่ม "เข้าสู้" · กล่องล่าง = 3 ช่อง พ่อค้า / นิรา / กล่องยา
    // วางเป็นชั้นทับในกล่องต่อสู้ — กด ✕ แล้วเห็นฉากต่อสู้ข้างหลังเต็ม และกด "เตรียมศึก" เปิดกลับได้ก่อนเข้าสู้
    const prepOn = rest || b.kind === 'zoneBoss' && !b.prepStarted && !b.over;
    const goLabel = rest ? b.challenge ? t('challenge.rest.go', { wave:b.pendingWave }) : b.pendingWave === 4 ? 'เข้าสู้หัวหน้าทั้ง 4 โซน' : 'เข้าสู้บอสใหญ่' : t('event.prep.fight');
    const prepFoeArt = () => {
      if (!rest) return storyFoeArt(b.sp);
      const ev = ZONE_EVENTS[b.zone]?.find(e => e.k === b.eventKey);
      const next = ev?.waves?.[b.pendingWave - 1]?.[0];
      return next?.sp ? storyFoeArt(next.sp) : next?.kind != null && MOB.kinds[next.kind] ? artUrl(MOB.kinds[next.kind].img) : storyFoeArt(b.sp);
    };
    const prepLayer = prepOn ? `<div class="prep-layer" data-prep-layer ${prepHidden ? 'hidden' : ''}><div class="prep-layer-card">
      ${eventAlertMainHtml(rest ? zoneEventText(ZONE_EVENTS[b.zone]?.find(e => e.k === b.eventKey)?.title) : t('battle.prep.title'),
        rest ? (b.challenge ? t('challenge.rest.text', { wave:b.pendingWave }) : b.pendingWave === 4 ? t('battle.prep.rest4') : t('battle.prep.rest8')) : t('battle.prep.sub'),
        prepFoeArt(), `<button class="gold event-alert-go" data-prep-go>⚔️ ${esc(goLabel)}</button>`,
        { note: b.proofBonus ? `<div class="prep-note good">✓ ${esc(t('battle.prep.proof'))} ${b.proofBonus}</div>` : '',
          extraTop: `<div class="prep-top-actions"><button data-prep-pause aria-label="${esc(t('battle.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>
            <button data-prep-hide aria-label="${esc(t('common.close'))}">✕</button></div>` })}
      <div class="event-alert-prep"><p>${esc(t('event.prep.title'))}</p><div class="event-alert-cards">
        ${prepCardHtml('merchant', t('event.prep.merchant'), g.zoneCaptivesFree() ? t('event.prep.merchantLine') : t('event.prep.merchantLocked'), 'img/merchant-profile.jpeg', !g.zoneCaptivesFree())}
        ${prepCardHtml('nira', t('event.prep.nira'), t('event.prep.niraLine'), artUrl('crew-nira-profile'))}
        ${prepItemsHtml('prep')}
      </div></div></div></div>` : '';
    const prep = prepHidden && prepOn ? `<div class="boss-prep-actions"><button data-prep-show>${esc(t('battle.prep.show'))}</button>
      <button class="gold" data-prep-go>⚔️ ${esc(goLabel)}</button></div>` : '';
    const battleChoice = (k, icon, label, ok, note = '') => {
      const remaining = yamaSkillRemaining(b, k);
      const baseReady = ok;
      ok = ok && !remaining;
      return `<button class="orb-choice" data-base-ready="${baseReady}" data-act="${k}" ${ok ? '' : 'disabled'}
      title="${esc(label + (note ? ' · ' + note : ''))}">${icon.startsWith('<') ? icon : `<img src="${icon}" alt="">`}<b>${esc(label)}</b>${note ? `<i>${esc(note)}</i>` : ''}${remaining ? `<em class="skill-cooldown" role="status">${remaining}s</em>` : ''}</button>`;
    };
    const battleItem = k => BATTLE.items.find(x => x.k === k);
    const itemChoice = (k, icon) => {
      const it = battleItem(k), pw = it?.power ? g.powerOf(it.power) : null;
      const consumable = !!ITEMS[k]?.consumable;
      // น้ำมนต์ (28E): ต้องมีของ + MP ยังไม่เต็ม · โชว์จำนวนคงเหลือ ×N ใต้ปุ่ม
      const ok = !!it && (consumable ? (g.inventory[k] || 0) > 0 && !!medicineResult(k,b.youHp,b.youMax,mp,g.mpMax,'battle')
        : !!((g.abilities?.[it.power] || (pw && !g.powerLocked(pw))) && mp >= BATTLE.mpCost[it.power]));
      const note = consumable ? `×${g.inventory[k] || 0} · ${itemText(k, 'desc')}` : `${t('battle.mp')} ${BATTLE.mpCost[it?.power] || 0}`;
      return battleChoice(k, icon, (consumable ? itemName(k) : (it?.name || k)) + (['ice','hypno'].includes(k)?' · ทุกเป้าหมาย':''), ok, note);
    };
    const bigFire = !!g.abilities?.bigFire;
    const powerChoices = battleChoice('fire', bigFire ? 'img/fx-fireball-big.png' : 'img/fx-fireball.png', bigFire ? 'ลูกไฟใหญ่' : 'ลูกไฟ', mp >= BATTLE.mpCost.fire, `${t('battle.mp')} ${BATTLE.mpCost.fire}`)
      + (g.abilities?.flameCharge ? battleChoice('flameCharge', 'img/fx-flame-charge.png', 'พุ่งชนเพลิง', mp >= BATTLE.mpCost.charge, `${t('battle.mp')} ${BATTLE.mpCost.charge}`) : '')
      + (g.abilities?.windFan ? battleChoice('windFan', 'img/fx-fan-wind.png', 'พัดสายลม · ทุกเป้าหมาย', mp >= BATTLE.mpCost.wind, `${t('battle.mp')} ${BATTLE.mpCost.wind}`) : '')
      + (g.abilities?.rage ? battleChoice('rage', 'img/fx-rage.png', 'พลังบ้าคลั่ง', mp >= BATTLE.mpCost.rage && !b.rageTurns, `${t('battle.mp')} ${BATTLE.mpCost.rage}`) : '')
      + (g.abilities?.valkyrieSpear ? battleChoice('valkyrieSpear', 'img/fx-valkyrie-spear.png', 'หอกวาลคีรี · ทุกเป้าหมาย', mp >= BATTLE.mpCost.spear, `${t('battle.mp')} ${BATTLE.mpCost.spear}`) : '')
      + (g.abilities?.ice ? itemChoice('ice', 'img/fx-ice.png') : '')
      + (g.abilities?.hypno ? itemChoice('hypno', 'img/fx-hypno.png') : '');
    const currentTurn = !prepOn ? g.beginBattleTurns() : null;
    const actor = g.battleActors().find(c => c.id === (b.actorId || 'you')) || g.battleActors()[0];
    if (!phase && b.actorId && b.actorId !== actor.id) { b.actorId = actor.id; b.command = null; }
    const isYama = actor.id === 'you';
    const itemChoices = [...new Set(['tea','health','holyWater','food', ...Object.keys(g.inventory).filter(k => ITEMS[k]?.consumable)])].map(k =>
      battleChoice(k, itemImg(k), k === 'food' ? 'ข้าวปั้น / Rice Ball' : itemName(k), g.inventory[k] > 0,
        g.inventory[k] > 0 ? `×${g.inventory[k]}` : 'ไม่มีของ / No stock')).join('')
      + (g.abilities.cooldownClock || g.inventory.cooldownClock ? battleChoice('cooldownClock', 'img/fx-clock-reset.png', 'นาฬิกาย้อนเวลา', !b.clockUsed, b.clockUsed ? 'ใช้แล้ว · รอชุดการต่อสู้ใหม่' : `1 ครั้งต่อชุด · ไม่ใช้${t('battle.mp')}`) : '');
    const special = actor.k === 'guard' ? 'guard' : `crew:${crewBattleKey(actor)}`;
    const why = isYama ? '' : actor.k === 'guard' ? g.guardHelpWhy() : g.crewHelpWhy(actor);
    const weaponCd = weaponCooldownState(b, g.weapons?.equipped);
    const attackIcon = weaponCd?.cd ? `<span class="wcd-ico"><img src="img/fx-slash.png" alt=""><em>${weaponCd.cd}</em></span>` : 'img/fx-slash.png';
    const specialChoice = battleChoice(special, crewArt(actor, '-profile'), actor.k === 'nira' ? `แสงฟื้นบารมี / Healing light +${g.allyStats(actor).heal}` : crewAbility(actor), !why, why ? `${why} / Cooldown or low morale` : 'ท่าพิเศษ / Special').replace('<button', `<button data-crew-action="${esc(crewBattleKey(actor))}"`);
    const attacks = isYama ? battleChoice('atk', attackIcon, 'ฟันดาบ / Sword slash', true, g.weapons?.equipped ? t(`weapon.${g.weapons.equipped}.name`) + (weaponCd?.cd ? ` · ⏳${weaponCd.cd}` : '') : '')
      : battleChoice('strike', 'img/fx-slash.png', 'โจมตี / Attack', true) + (actor.k === 'nira' ? '' : specialChoice);
    const pending = b.command;
    const needsReceiver = pending && (pending === 'food' || ITEMS[pending]?.consumable || (!isYama && ['boon','nira'].includes(actor.k) && pending === special));
    const selfCommand=['defend','flee','rage','cooldownClock'].includes(pending);
    const choosingTarget = !!(pending && !selfCommand && !needsReceiver && !phase && !b.over);
    // L2: choosing a target — enemy OR teammate (items / healing powers) — shows no text box at all.
    // Enemies / eligible teammates carry the "เลือกเป้าหมาย" tag and highlight; the tab stays pressed.
    // Cancel = press the same tab again / Esc / right-click.
    const selection = '';
    if (commandPanelActor !== actor.id) { commandPanel = null; commandPanelActor = actor.id; }
    const battle9Label = text => String(text).split(' / ')[getLang()==='en'?1:0] || String(text).split(' / ')[0];
    // L2: only plain fights can be fled (matches battleAct); bosses and story/event fights say why the button is dim.
    const fleeCode = g.fleeWhy(b.kind), fleeWhy = fleeCode ? t('battle.flee.' + fleeCode) : '';
    const segments = [
      {id:'attack',label:'โจมตี / Attack',action:isYama?'atk':'strike'},
      {id:'power',label:'พลัง / Power',choices:isYama?powerChoices:specialChoice},
      {id:'item',label:'ไอเท็ม / Items',choices:itemChoices},
      {id:'defense',label:'ป้องกัน / Defend',action:'defend'},
      {id:'escape',label:'หนี / Flee',action:'flee',disabled:!!fleeWhy,reason:fleeWhy},
    ];
    const acts = currentTurn?.side==='foe' || (!commandMenuOpen && !phase) || rest || (b.kind === 'zoneBoss' && !b.prepStarted) || b.over ? '' :
      `<section class="command-wheel actor-wheel battle-command-dock battle9-menu ${phase?'busy':''} ${pending?'targeting':''}" aria-label="${esc(actor.name)} — คำสั่งต่อสู้">
        <div class="battle-command-heading"><b>${esc(actor.name)}</b></div>
        <div class="battle-command-tabs">${segments.map((v,i)=>`<button class="actor-segment" style="--command-index:${i}" data-command="${v.id}" ${v.action?`data-primary-action="${v.action}"`:''} aria-expanded="${commandPanel===v.id}" aria-pressed="${commandPanel===v.id||!!(v.action&&pending===v.action)}" ${v.disabled?`aria-disabled="true" title="${esc(v.reason)}"`:''} ${phase||v.disabled?'disabled':''}><span>${esc(battle9Label(v.label))}${v.disabled?`<em class="segment-reason">${esc(v.reason)}</em>`:''}</span></button>`).join('')}</div>
        ${segments.filter(v=>v.choices).map(v=>`<div class="command-options ${commandPanel===v.id&&!pending?'is-open':''}" data-options="${v.id}" ${commandPanel===v.id&&!pending?'':'inert'} aria-label="${esc(battle9Label(v.label))}">${v.choices}</div>`).join('')}
        <div class="battle9-confirm" ${selection?'':'hidden'}>${selection}</div>
      </section>`;

    const finLabel = b.over==='win' && b.dungeonToken ? 'เก็บไอเท็มที่ตก' : b.over==='flee'?'กลับไปตั้งหลัก':b.kind === 'zoneEvent' ? (b.over === 'win' ? t('battle.reward') : 'กลับไปพักแล้วท้าใหม่')
      : b.kind === 'devaTest' ? t('event.devaTest.return') : b.kind === 'frontierBreach' ? t('event.frontierBreach.return') : b.kind === 'prisonBreak'
      ? t('event.prisonBreak.return') :
        // ข้อ F คุณเป้ 24 ก.ย. 2569: เปลี่ยนคำเท่านั้น กลไกรางวัลเดิมทั้งหมด (ดู endBattle kind:'frontier')
        b.over === 'win'  ? (b.dungeonToken || b.kind === 'frontier' || b.kind === 'mob' ? 'เก็บไอเท็มที่ตก' : b.kind === 'zoneBoss' ? 'เปิดทางไปโซนถัดไป' : 'ลากเข้าสถานี')
      : b.over === 'lose' ? (b.kind === 'yama' ? t('battle.verdict')
                          : b.kind === 'dad'  ? t('battle.verdict')
                          : b.kind === 'zoneBoss' ? 'กลับไปตั้งหลักที่สะพาน'
                          : b.kind === 'frontier' ? 'ถอยกลับเข้าประตู'
                          : b.kind === 'mob'  ? 'ถอยกลับไปตั้งหลัก'
                                              : 'ปล่อยเขากลับเข้าคิว') : '';
    // เดิมมีเงื่อนไข `&& !phase` ด้วย — พอจังหวะอนิเมชันค้าง (เจ้าของเจอ 8 ก.ย. 2569)
    // กล่องจะไม่มีปุ่มอะไรเลยสักปุ่ม: ปุ่มโจมตีถูกล็อกเพราะ busy ปุ่มจบก็ไม่ถูกวาด
    // = ทางตัน ปิดกล่องไม่ได้ · ฉากจบแล้วต้องมีทางออกเสมอ ไม่ว่าอนิเมชันจะค้างหรือไม่
    // G3b — การประลองชายแดน: บอสพูดบทแพ้/ชนะหลังจบ (ชนะครั้งแรกเท่านั้น — ประลองซ้ำไม่มีบทใหม่) · ศึกบอสตัวเดียวไม่มีกล่องบทพูดกลางจอ จึงแสดงตรงนี้
    const challengeLine = b.challenge && b.over && (b.over === 'lose' || !b.rematch)
      ? `<p class="challenge-boss-line"><b>${esc(BOSS_NAMES[b.zone].frontier)}</b> “${esc(t(`challenge.${b.zone}.${b.over === 'win' ? 'win' : 'lose'}`))}”${b.over === 'lose' ? `<small>${esc(t('challenge.lose.note'))}</small>` : ''}</p>` : '';
    const done = b.over
      ? `${challengeLine}<div class="row"><button class="${b.over === 'win' ? 'gold' : ''}" data-fin>${finLabel}</button></div>` : '';

    if (fleeConfirm && (b.over || phase || prepOn || fleeWhy)) fleeConfirm = false;
    const fleeLayer = fleeConfirm ? fleeConfirmHtml(b.kind) : '';
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
            '', squadMembers) +
      `<div class="pad">
        ${b.rageTurns > 0 ? `<div class="battle-buff" role="status">🔥 พลังบ้าคลั่ง · โจมตีแรงขึ้นอีก ${b.rageTurns} ครั้ง</div>` : ''}
        ${b.weaponNote && !b.over ? `<div class="battle-buff weapon-note" role="status">${esc(weaponNoteText(b.weaponNote))}</div>` : ''}
        ${weaponCd && !b.over ? `<div class="battle-buff weapon-cd${weaponCd.cd ? ' cooling' : ''}" role="status" data-weapon-cd="${weaponCd.cd}"><span class="wcd-ico">${weaponImg(weaponCd.id)}${weaponCd.cd ? `<em>${weaponCd.cd}</em>` : ''}</span>${esc(weaponCd.cd ? t('battle.weapon.cooling', { name:t(`weapon.${weaponCd.id}.name`), n:weaponCd.cd }) : t('battle.weapon.ready', { name:t(`weapon.${weaponCd.id}.name`) }))}</div>` : ''}
        ${phase ? `<div class="turnhint">${phase === 'you' ? (fxNow?.key === 'defend' ? '🛡️ ' + t('battle.defend.on') : '⚔️ ตาของท่าน') : '↩️ เขาสวนกลับ'}</div>` : ''}
        ${done}
      </div>${prep}${prepLayer}${fleeLayer}`;

    const stage = dlg.querySelector('.combat-arena');
    camera.attach(stage);          // M1: the camera keeps its own state across repaints; re-bind it to the fresh scene before anything measures (camera first, then the fx canvas)
    applyDashPosition();
    if (!phase) clearMoveName(); else renderMoveName();
    attachBattleFx(stage); stage.classList.toggle('fx-handled', fxHandled && !!phase);
    stage.insertAdjacentHTML('beforeend', acts);
    swordImage(g.outfit || g.zone, g.weapons?.equipped);
    if (phase === 'you' && isYamaSwordAttack(fxNow)) mountBattleSword(stage, g.outfit || g.zone, dash?.poseAt || phaseAt, g.weapons?.equipped);
    else if (!phase && !b.over) mountBattleSwordIdle(stage, g.outfit || g.zone);
    // ชื่อฉากตัวทองล้วน ตามแบบ — ตัดอีโมจิ/สัญลักษณ์นำหน้าออก (⚠️ ฯลฯ)
    const sceneTitle = stage.querySelector('.ttl');
    if (sceneTitle) sceneTitle.textContent = sceneTitle.textContent.replace(/^[^\p{L}\p{N}]+/u, '');
    const meter = (value, max, type, label = '') => `<span class="battle-meter ${type}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.max(0, Math.round(value))}"><i style="width:${Math.max(0, Math.min(100, 100 * value / (max || 1)))}%"></i></span>`;
    // Same stable back-to-front order as the visible squad; Yama is the last/front slot.
    const team = squadMembers;
    stage.insertAdjacentHTML('beforeend', `${b.over ? '' : `<button class="battle-pause" data-battle-pause aria-label="${esc(t('battle.pause'))}"><img src="img/ui/icon-pause.png" alt=""></button>`}
      ${battleTurnOrderHtml(b)}
      <div class="battle-team-hud">
        ${team.map(c => {
          const remaining = c.k === 'guard' ? g.guardCooldown() : g.crewCooldown(c);
          const duration = specialCooldown(c);
          return `<button class="battle-portrait${view.defending?.[c.id] ? ' is-defending' : ''}" data-crew-pick="${esc(crewBattleKey(c))}" aria-label="${esc(c.name)}">
            ${view.defending?.[c.id] ? defendShieldHtml() : ''}<img src="${esc(crewArt(c, '-profile'))}" alt=""><b>${esc(c.name)}</b>
            <div class="battle-numbered-meter">${meter(c.morale, 100, 'health', t('battle.hp'))}<small>${Math.round(c.morale)}/100</small></div><span data-crew-ready="${esc(crewBattleKey(c))}">${meter(duration - remaining, duration, 'ready', c.name)}</span>${g.isFinalBattle() && c.k !== 'guard' ? `<small>กำลังใจ ${Math.round(c.morale)} · ฝึก ${c.upLv || 0}</small>` : ''}
          </button>`;
        }).join('')}
        <button class="battle-portrait hero${view.defending?.you ? ' is-defending' : ''}" data-crew-pick="you">${view.defending?.you ? defendShieldHtml() : ''}<img src="${esc(artUrl('hero-yama-profile') || artUrl('hero-yama'))}" alt=""><b>${esc(HERO_NAME)}</b>
          <div class="battle-numbered-meter">${meter(view.youHp, view.youMax, 'health', t('battle.hp'))}<small>${Math.round(view.youHp)}/${view.youMax}</small></div>
          <div class="battle-numbered-meter">${meter(mp, g.mpMax, 'mana', t('battle.mp'))}<small>${Math.round(mp)}/${g.mpMax}</small></div>
        </button>
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
      // H2 (คุณเป้ 10 ต.ค.): "เก็บไอเท็มที่ตกอยู่" ของศึกชายแดนเดิมค้างอยู่ขวาล่างข้างการ์ดศัตรู → ยกขึ้นเหนือแถวการ์ด
      // อยู่ในพื้นว่างระหว่างยมบาทกับศัตรู (ตำแหน่งดู .fin-above-cards ใน flow29c.css) ไม่บังตัวละคร
      // I1-B ข้อ 4 — ย่อปุ่มลง ~78% และย้ายไป "กลางด้านล่างของสนาม" (ช่องว่างระหว่างการ์ดทีมซ้ายกับการ์ดศัตรูขวา) ไม่ทับการ์ดตัวละคร/ศัตรู
      else if (b.kind === 'frontier') {
        finRow.classList.add('fin-float', 'fin-center', 'fin-main', 'fin-above-cards'); stage.appendChild(finRow);
        // CSS วางกลางล่างเป็นค่าตั้งต้น · วัดการ์ด HUD ที่อยู่แถวเดียวกับปุ่มจริง แล้วจัดกลางในช่องว่างระหว่างกัน (จำนวนทีม/ขนาดจอเปลี่ยนการ์ดกว้างไม่เท่ากัน)
        const placeFin = () => {
          if (!finRow.isConnected) return;
          const area = stage.getBoundingClientRect(), fr = finRow.getBoundingClientRect();
          if (!area.width || !fr.width) return;
          const rel = r => ({ l:r.left - area.left, r:r.right - area.left, t:r.top - area.top, b:r.bottom - area.top });
          const cards = [...stage.querySelectorAll('.battle-team-hud .battle-portrait, .battle-boss-hud, .battle-scene-talk')].map(e => rel(e.getBoundingClientRect()));
          // ตัวละครบนสนามก็ไม่ควรโดนทับ — ใช้กรอบรูปที่หดเข้า 15% ข้างละด้าน (img มีขอบโปร่งใส) เป็นสิ่งกีดขวางด้วย
          const sprites = [...stage.querySelectorAll('.fig img:not(.fx), .battle-squad img')].map(e => rel(camera.rectOf(e, 'settled')))
            .map(r => ({ l:r.l + (r.r - r.l) * 0.15, r:r.r - (r.r - r.l) * 0.15, t:r.t, b:r.b }));
          const obstacles = [...cards, ...sprites].filter(r => r.r > r.l);
          const best = placeFinButton({ area:{ w:area.width, h:area.height }, btn:{ w:fr.width, h:fr.height }, obstacles });
          finRow.style.left = `${best.x}px`; finRow.style.bottom = `${area.height - best.y}px`; finRow.style.top = 'auto';
        };
        placeFin(); requestAnimationFrame(placeFin); setTimeout(placeFin, 260);
        if (typeof ResizeObserver === 'function') new ResizeObserver(placeFin).observe(stage);
      }
    }
    // ชุด 29C ข้อ 7 — ยมทูตฝ่ายเราสูงใกล้เคียงยมบาทน้อย (วัดจากความสูงตัวจริงของภาพ ไม่ใช่ค่าตายตัว) · ทุกโซน ทุกยมทูตรวมยักษ์ทวารบาล
    applyHealFx();
    const formationTurn = !b.over && !prepOn ? g.currentBattleTurn() : null;
    const currentActor = formationTurn?.side==='ally' ? g.battleActors().find(a=>a.id===formationTurn.id) : null;
    const activeKey = dash?.side === 'you' ? dash.key : currentActor ? (currentActor.id==='you'?'you':crewBattleKey(currentActor)) : null;
    if(activeKey!==formationMotion.activeKey){
      formationMotion.previousKey=formationMotion.activeKey;
      formationMotion.activeKey=activeKey;formationMotion.changedAt=Date.now();
    }
    // O2: Yama's own melee (sword slash / flame charge) lunges at the enemy too. Only the crew branch used to set attackKey,
    // and the old .fig.lunge keyframes are overridden by the formation-member rules, so Yama never moved toward the target.
    formationMotion.attackKey=phase==='you'&&fxNow?.crew&&fxNow?.key!=='health'&&fxNow?.key!=='defend'
      ? crewBattleKey(g.battleActors().find(c=>c.id===b.actorId)||b.helper||{})
      : phase==='you'&&!fxNow?.crew&&fxNow?.side==='foe'&&['atk','flameCharge'].includes(fxNow?.action) ? 'you' : null;
    if (dash) formationMotion.attackKey = null;
    const fitTeam = () => stage._battleSpriteFit = fitBattleSprites(stage, heroFace(), 0, formationMotion).then(result => { stage._combatResize?.(); applyDashPosition(); return result; });
    fitTeam();
    mountNiraCombatSprite(stage,g.zone,b,phase,fitTeam,()=>{const cut=dlg.querySelector('.action-cutscene');return cut?Date.now()+Math.max(0,Math.round(ACTION_CUT_MS*.88)-(Date.now()-phaseAt)):0;});
    if (dash) stage.querySelectorAll('.lunge').forEach(el => el.classList.remove('lunge'));
    cameraSync(b, !!(b.over || prepOn), activeKey);
    stage._battleSpriteFit.then(() => {
      if(!stage.isConnected)return;
      // O2 A/E: when a full-screen cutscene card covers the arena (boss ultimate, Yama's/crew's special), the hurt poses used to play
      // underneath it and were over by the time the card faded. Hold them until the card is nearly gone (it fades from ~88%).
      const hurtHold=dlg.querySelector('.action-cutscene')?Math.max(0,Math.round(ACTION_CUT_MS*.88)-(Date.now()-phaseAt)):0;
      const hurtStart=()=>hurtHold>0?Date.now()+hurtHold:phaseAt;
      const entries=[], hits=new Set([
        ...(b.dmg?.enemyHits||[]).filter(h=>h.damage>0).map(h=>h.id),
        ...(b.dmg?.hitActors||[]).map(a=>a.id),b.dmg?.hitActor?.id,
        ...(b.dmg?.crew>0?[b.dmg?.targetActorId]:[])
      ].filter(Boolean));
      const poseActors = g.battleActors();
      if (dash?.actor && !poseActors.some(c => c.id === dash.actor.id)) poseActors.push(dash.actor);
      for(const c of poseActors){
        if(c.id==='you'||c.k==='nira')continue;
        const key=crewBattleKey(c),root=stage.querySelector(`.battle-squad [data-crew-pick="${key}"], .fig.helper[data-crew-pick="${key}"]`);
        const attacking=(!dash||dash.posed)&&phase==='you'&&fxNow?.crew===c.k&&(b.actorId===c.id||b.helper?.id===c.id)&&fxNow?.key!=='defend';
        const mode=phase==='foe'&&hits.has(c.id)?'hurt':attacking?'attack':'idle';
        entries.push({root,key:c.guestGuide?`boss:${c.homeZone}:zone-boss`:`crew:${c.homeZone||g.zone}:${c.k}`,face:c.guestGuide?-1:1,mode,startedAt:mode==='idle'?key.length*271:mode==='hurt'?hurtStart():(dash?.poseAt||phaseAt)});
      }
      if(phase==='foe'&&b.dmg?.you>0)entries.push({root:stage.querySelector('.fig.you'),key:`yama:${g.outfit||g.zone}`,mode:'hurt',startedAt:hurtStart()});
      const attacker=b.dmg?.counterFoeId||(currentTurn?.side==='foe'?currentTurn.id:null);
      for(const root of stage.querySelectorAll('.fig.foe')){
        if(root.classList.contains('down'))continue;
        const image=root.querySelector('img:not(.fx)'),key=image&&bossSpriteKey(image.getAttribute('src'),b.zone||g.zone);
        if(!key)continue;
        const id=root.dataset.foeId,mode=root.classList.contains('struck')?'hurt':phase==='foe'&&(!dash||dash.posed)&&(!attacker||id===attacker)?'attack':'idle';
        entries.push({root,key,mode,startedAt:mode==='idle'?key.length*331:mode==='hurt'?hurtStart():(dash?.poseAt||phaseAt)});
      }
      // combat-sprites.js (Codex, read-only) measures roots with getBoundingClientRect(); while the camera is zoomed that rect is scaled, so hand it
      // roots whose rect is the un-zoomed one (everything else passes straight through to the real element)
      const camRoot=el=>el&&new Proxy(el,{get:(t,k)=>k==='getBoundingClientRect'?()=>camera.rectOf(t):typeof t[k]==='function'?t[k].bind(t):t[k],set:(t,k,v)=>{t[k]=v;return true;}});
      mountCombatSprites(stage,entries.map(e=>({...e,root:camRoot(e.root)})));
    });
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(() => { if (stage.isConnected) fitTeam(); else ro.disconnect(); }); ro.observe(stage); }
    stage.querySelector('[data-battle-pause]')?.addEventListener('click', () => openPause(true));
    stage.querySelector('[data-arena-settings]').title = t('battle.settings');
    stage.querySelector('[data-arena-settings]').setAttribute('aria-label', t('battle.settings'));

    // แก้รอบ 1 ข้อ C ชุด 13 — เปิดหน้าต่างเดิม (พ่อค้า/นิรา) ตรง ๆ ไม่ต้องมี callback "กลับมาหน้าเตรียมศึก"
    // เพราะ battle ยังไม่จบ (b.over ยังเป็น null) ตัวเฝ้า battleUI ที่ท้ายไฟล์เปิดฉากนี้กลับให้เองอัตโนมัติ
    // ทันทีที่ merchant/nira ปิด (เหมือนที่คอมเมนต์บนสุดของไฟล์อธิบายไว้แล้วสำหรับกรณีทั่วไป)
    dlg.querySelector('[data-event-prep="merchant"]')?.addEventListener('click', () => openMerchant());
    dlg.querySelector('[data-event-prep="nira"]')?.addEventListener('click', () => openNiraOffice());
    bindPrepItems(dlg, 'prep', () => { paint(); refresh(); });
    dlg.querySelector('[data-prep-pause]')?.addEventListener('click', () => openPause(true));
    dlg.querySelector('[data-prep-hide]')?.addEventListener('click', () => { prepHidden = true; paint(); });
    dlg.querySelector('[data-prep-show]')?.addEventListener('click', () => { prepHidden = false; paint(); });
    dlg.querySelectorAll('[data-prep-go]').forEach(prepGo => prepGo.onclick = () => { if (rest ? g.advanceZoneEventWave(true) : g.startBossFight()) { prepHidden = false; sfx('gong'); paint(); refresh(); } });
    bindCommandPress(stage);
    if (!dlg.querySelector('.battle9-menu')) bindCommandWheel(dlg);
    dlg.querySelectorAll('[data-crew-pick]').forEach(el => {
      el.setAttribute('aria-pressed', String(el.dataset.crewPick === (isYama ? 'you' : crewBattleKey(actor))));
      el.setAttribute('aria-disabled', String(!!phase));
      if (el.tagName === 'BUTTON') el.disabled = !!phase;
      const activate = () => {
        if (phase) return;
        const key = el.dataset.crewPick;
        const chosen = g.battleActors().find(c => c.id === key || (c.k === 'guard' ? 'guard' : crewBattleKey(c)) === key);
        if (needsReceiver && chosen) {
          const reason = pending === special ? ((chosen.id === 'you' ? b.youHp >= b.youMax : chosen.morale >= 100) ? 'Full' : '') : g.battleRecipientWhy(pending, chosen.id);
          if (!reason) {b.commandRecipient=chosen.id;executeCommand(pending,chosen.id);}
          return;
        }
        if (chosen && g.selectBattleActor(chosen.id)) { commandMenuOpen = true; paint(); }
      };
      // L2: only teammates who can actually receive it light up (same "เลือกเป้าหมาย" tag as the enemy side); the others dim
      const recipient = needsReceiver && !phase ? g.battleActors().find(c => c.id === el.dataset.crewPick || (c.k === 'guard' ? 'guard' : crewBattleKey(c)) === el.dataset.crewPick) : null;
      const why = recipient ? (pending === special ? ((recipient.id === 'you' ? b.youHp >= b.youMax : recipient.morale >= 100) ? 'Full' : '') : g.battleRecipientWhy(pending, recipient.id)) : '';
      el.classList.toggle('choose-recipient', !!recipient && !why);
      el.classList.toggle('recipient-off', !!recipient && !!why);
      if (recipient && !why && !el.classList.contains('battle-portrait')) el.insertAdjacentHTML('beforeend', `<span class="target-prompt">${getLang() === 'en' ? 'Choose target' : 'เลือกเป้าหมาย'}</span>`);
      el.onclick = activate;
      el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } };
    });
    dlg.querySelectorAll('[data-foe-id]').forEach(el => {
      const foe = b.foes.find(f => f.id === el.dataset.foeId);
      const available = !!(foe && foe.hp > 0 && !b.over && !phase);
      el.classList.toggle('choose-target', choosingTarget && available);
      el.setAttribute('aria-disabled', String(!available));
      if (choosingTarget && available) {
        el.querySelector('.target-arrow')?.remove();
        el.insertAdjacentHTML('beforeend', `<span class="target-prompt">${getLang() === 'en' ? 'Choose target' : 'เลือกเป้าหมาย'}</span>`);
      }
      const activate = () => {
        if (!available || phase || !g.selectFoe(el.dataset.foeId)) return;
        if (choosingTarget) {b.commandTarget=el.dataset.foeId;executeCommand(pending,'you');}
        else paint();
      };
      el.onclick = activate;
      if (el.tagName !== 'BUTTON') el.onkeydown = e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      };
    });

    const wheel = dlg.querySelector('.actor-wheel');
    const anchor = stage.querySelector(`.fig[data-crew-pick="${isYama ? 'you' : crewBattleKey(actor)}"], .battle-squad [data-crew-pick="${isYama ? 'you' : crewBattleKey(actor)}"]`);
    wheel?.addEventListener('keydown', e => { if (e.key === 'Escape' && !phase && g.cancelBattleCommand()) {commandPanel=null;paint();} });
    if (wheel?.classList.contains('battle9-menu')) {
      const setCommand = (action,label) => { b.command=action;b.commandLabel=label;b.commandTarget=null;b.commandRecipient=null;paint(); };
      wheel.querySelectorAll('[data-command]').forEach(button => button.onclick = () => {
        if(phase||button.disabled)return;
        if(button.dataset.primaryAction){commandPanel=null;
          const action=button.dataset.primaryAction;
          if(action==='flee'){fleeConfirm=true;paint();}                      // L2: ask first, never an attack
          else if(action==='defend')executeCommand(action,'you');
          else if(b.command===action){g.cancelBattleCommand();paint();}       // L2: same button again = cancel
          else setCommand(action,button.textContent.trim());}
        else {g.cancelBattleCommand();commandPanel=commandPanel===button.dataset.command?null:button.dataset.command;paint();}
      });
      wheel.querySelectorAll('.command-options').forEach(pane=>pane.querySelectorAll('.orb-choice').forEach((button,i)=>button.style.setProperty('--choice-index',i)));
      const placeMenu = async () => {
        await stage._battleSpriteFit;
        if(!wheel.isConnected||!anchor)return;
        const area=stage.getBoundingClientRect(),sprite=anchor.querySelector('img:not(.fx)');
        // K5: measure what must stay readable (enemies, their name/HP plates, boss HUD) and what we would rather not cover.
        const loc=r=>({l:r.l-area.left,t:r.t-area.top,r:r.r-area.left,b:r.b-area.top});
        const box=el=>{const r=camera.rectOf(el,'settled');return r.width&&r.height?loc({l:r.left,t:r.top,r:r.right,b:r.bottom}):null;};   // M1: where it will be once the camera settles
        // Opaque-pixel bounds when measurable; the <img> box when the measure fails or collapses (zone-boss art did once).
        const sprites=async sel=>(await Promise.all([...stage.querySelectorAll(sel)].map(async img=>{
          const r=await battleSpriteRect(img,'settled').catch(()=>null);
          return r&&r.r-r.l>=4&&r.b-r.t>=4?loc(r):box(img);
        }))).filter(Boolean);
        // L2: the actor's own teammates are obstacles too (hard) — the menu opens beside the actor but never on top of another ally.
        const allyEls=[...new Set(stage.querySelectorAll('.fig.you img:not(.fx), .battle-squad img:not(.fx), .formation-member img:not(.fx)'))].filter(img=>img!==sprite);
        await Promise.all(anchor.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));   // measure the stepped-out position, not mid-animation
        const rect=await battleSpriteRect(sprite,'settled');if(!wheel.isConnected)return;
        const [foeSprites,allySprites]=await Promise.all([sprites('.fig.foe img:not(.fx)'),Promise.all(allyEls.map(async img=>{const r=await battleSpriteRect(img,'settled').catch(()=>null);return r&&r.r-r.l>=4&&r.b-r.t>=4?loc(r):box(img);})).then(a=>a.filter(Boolean))]);
        if(!wheel.isConnected)return;
        const hard=[...foeSprites,...allySprites,...[...stage.querySelectorAll('.fig.foe .plate, .battle-boss-hud')].map(box)].filter(Boolean);
        const soft=[...[...stage.querySelectorAll('.battle-team-hud, .battle-scene-talk, .battle-timeline')].map(box)].filter(Boolean);
        wheel.style.removeProperty('width');
        const pane=wheel.querySelector('.command-options.is-open');
        const confirm=wheel.querySelector('.battle9-confirm:not([hidden])');
        if(pane){pane.style.removeProperty('top');pane.style.removeProperty('left');pane.style.removeProperty('max-height');pane.style.removeProperty('width');}
        if(confirm){confirm.style.removeProperty('top');confirm.style.removeProperty('left');confirm.style.removeProperty('right');confirm.style.removeProperty('width');}
        const naturalW=wheel.offsetWidth,menuHeight=wheel.offsetHeight;
        // The skewed first-level rows extend left of their layout box. Leave a
        // full sprite-safe gutter so the menu never covers Yama/Nira.
        const left0=Math.min(Math.max(8,area.width-naturalW-8),Math.max(8,rect.r-area.left+44));
        let left=left0;
        const bounds={l:6,t:6,r:area.width-6,b:area.height-12};
        const maxY=Math.max(12,area.height*.83-menuHeight);
        const top0=Math.max(Math.min(area.height*.36,maxY),Math.min(maxY,rect.t-area.top+12));
        // K5: the stepped rows reach ~36px past the column width. Keep them clear of enemy sprites/plates/HP bars:
        // narrow the column first, then drop it below the enemy row if the actor is hemmed in.
        const widths=[...new Set([naturalW,Math.min(naturalW,168),Math.min(naturalW,132)])];
        // O2: on a phone the gap between the squad and the enemy is narrower than the menu, so the column used to land on top of the
        // enemy (hard obstacle, but nowhere else to go). Also offer "under the squad, at the left edge".
        const narrowStage=area.width<=520;
        const ys=[top0,...hard.map(r=>r.b+6),...(narrowStage?allySprites.map(r=>Math.round(r.b+6)):[]),bounds.b-menuHeight];
        let menuPlan=null;
        // L2: besides "right of the actor", try "right of each teammate" so the menu clears the whole squad.
        const lefts=[...new Set([left0,...allySprites.map(r=>Math.round(r.r+44))])].filter(x=>x>=left0-0.5&&x<=Math.max(8,area.width-naturalW-8));
        if(narrowStage&&!lefts.includes(8))lefts.push(8);
        for(const w of widths)for(const x of lefts){
          const plan=planPlacement({size:{w:w+36,h:menuHeight},bounds,hard,soft,minH:menuHeight,
            candidates:ys.map(y=>({key:w,x,y,penalty:Math.abs(y-top0)*3+(naturalW-w)*40+Math.abs(x-left0)*1.5}))});
          if(plan&&(!menuPlan||plan.cost<menuPlan.cost))menuPlan=plan;
        }
        if(menuPlan)left=menuPlan.x;
        const menuWidth=menuPlan?menuPlan.key:naturalW,top=menuPlan?menuPlan.y:top0;
        if(menuWidth!==naturalW)wheel.style.setProperty('width',`${menuWidth}px`,'important');
        wheel.style.setProperty('--menu-x',`${left}px`);wheel.style.setProperty('--menu-y',`${top}px`);
        wheel.classList.remove('submenu-left');
        const apply=(el,plan)=>{el.style.left=`${plan.x-left}px`;el.style.top=`${plan.y-top}px`;el.style.right='auto';};
        if(pane){
          const command=wheel.querySelector(`[data-command="${pane.dataset.options}"]`);
          const natW=pane.offsetWidth,h=pane.offsetHeight,cmdTop=top+command.offsetTop;
          const preferredTop=pane.dataset.options==='item'?Math.min(bounds.b-h,Math.max(cmdTop,area.height*.48)):cmdTop;
          const ys=[preferredTop,bounds.b-h,...hard.flatMap(r=>[r.b+10,r.t-h-10])];
          // Narrower widths (names ellipsize) before moving away from the tab it belongs to.
          let best=null;
          const minW=Math.min(natW,pane.dataset.options==='power'?215:265);   // item rows carry a wide stock note, keep names readable
          for(const w of [...new Set([natW,minW])]){
            const candidates=ys.flatMap(y=>[
              {key:'right',x:left+menuWidth-12+command.offsetLeft,y,penalty:Math.abs(y-preferredTop)*3+(natW-w)*2},
              {key:'left',x:left+command.offsetLeft+12-w,y,penalty:Math.abs(y-preferredTop)*3+400+(natW-w)*2}]);
            const plan=planPlacement({size:{w,h},candidates,hard,soft,bounds});
            if(plan&&(!best||plan.cost<best.plan.cost))best={plan,w};
          }
          if(best){apply(pane,best.plan);pane.style.setProperty('max-height',`${Math.floor(best.plan.h)}px`);pane.style.width=`${best.w}px`;pane.dataset.place=best.plan.key;}
        }
        if(confirm){
          // Thin hint strip: below the menu if it fits, else beside it; narrower on phones.
          const rowsR=left+menuWidth+40,ownRows={l:left,t:top,r:rowsR,b:top+menuHeight};
          let best=null;
          for(const w of [...new Set([Math.max(menuWidth,200),170])]){
            confirm.style.width=`${w}px`;
            const h=confirm.offsetHeight,belowY=top+menuHeight+6;
            const candidates=[{key:'below',x:left,y:belowY},{key:'above',x:left,y:top-h-6,penalty:300},
              ...[top,...hard.map(r=>r.b+10)].map(y=>({key:'right',x:rowsR+6,y,penalty:600+Math.abs(y-top)*3})),
              {key:'left',x:left-w-8,y:top,penalty:900}].map(c=>({...c,penalty:(c.penalty||0)+(200-w>0?(200-w)*10:0)}));
            const plan=planPlacement({size:{w,h},candidates,hard:[...hard,ownRows],soft,bounds});
            if(plan&&(!best||plan.cost<best.plan.cost))best={plan,w};
          }
          if(best){confirm.style.width=`${best.w}px`;apply(confirm,best.plan);confirm.dataset.place=best.plan.key;}
        }
      };
      placeMenu();requestAnimationFrame(placeMenu);setTimeout(placeMenu,500);   // K5: re-measure once pop-in animations have settled
      if(typeof ResizeObserver==='function'){const ro=new ResizeObserver(()=>{if(wheel.isConnected)placeMenu();else ro.disconnect();});ro.observe(stage);}
    }
    if (wheel && anchor && !wheel.classList.contains('battle-command-dock')) {
      wheel.style.visibility = 'hidden'; // Do not flash the old fixed CSS position while sprites load.
      // I1-B ข้อ 2 — วงคำสั่งอยู่ "ขวาบนของตัวละครที่ถึงตา" ใกล้พอให้รู้ว่าเป็นของตัวนั้น แต่ไม่ทับตัว (H2 เคยย้ายไปชิดคนขวาสุดทุกคน = ไกลจากตัวที่ถึงตา)
      // กรอบภาพวงในแคนวาส 900×1100: ลายวงกินพื้นที่ x 9.4%–95% · y 5.8%–95% (ดูตาราง petals ใน command-wheel.js) — วัดซ้ำหลังกล่องเปิดจริง
      // เพราะ paint() รอบแรกรันก่อน openDlg() (กล่องยังไม่มีขนาด)
      const place = async () => {
        await stage._battleSpriteFit;
        const im = anchor.querySelector('img:not(.fx)');
        const teamImages = [...stage.querySelectorAll('.fig.you img:not(.fx), .battle-squad img, .fig.helper img, .fig.guard img')];
        const foeImages = [...stage.querySelectorAll('.fig.foe img:not(.fx)')];
        const [actorRect, teamRects, foeRects] = await Promise.all([
          battleSpriteRect(im), Promise.all(teamImages.map(battleSpriteRect)), Promise.all(foeImages.map(battleSpriteRect))
        ]);
        if (!wheel.isConnected) return;
        const area = stage.getBoundingClientRect();
        if (!area.width || actorRect.r <= actorRect.l) return;
        wheel.classList.toggle('ally-wheel', !isYama);
        const w = wheel.offsetWidth, h = wheel.offsetHeight;
        const local = r => ({ l:r.l-area.left, r:r.r-area.left, t:r.t-area.top, b:r.b-area.top });
        const me = local(actorRect);
        const { left, top } = placeWheel({ area:{ w:area.width, h:area.height }, wheel:{ w, h }, me,
          team:teamRects.map(local), foes:foeRects.map(local),
          artBounds:isYama ? WHEEL_ART : { ...WHEEL_ART, y1:850/1100 } });
        wheel.style.left = `${left}px`; wheel.style.top = `${top}px`; wheel.style.right = 'auto'; wheel.style.bottom = 'auto'; wheel.style.visibility = 'visible';
      };
      place(); requestAnimationFrame(place); setTimeout(place, 260);
      if (typeof ResizeObserver === 'function') new ResizeObserver(place).observe(stage);   // หมุนจอ/ย่อขยายกลางศึก วงตามตัวละคร
    }
    dlg.querySelector('[data-command-cancel]')?.addEventListener('click', () => { if (!phase && g.cancelBattleCommand()) paint(); });
    // L2: flee confirmation — confirm leaves the fight (no reward), cancel / backdrop just closes the layer
    const fleeLayerEl = dlg.querySelector('[data-flee-layer]');
    if (fleeLayerEl) bindFleeConfirm(fleeLayerEl, { onCancel:() => { fleeConfirm = false; paint(); }, onConfirm:() => { fleeConfirm = false; performFlee(); } });
    dlg.querySelectorAll('[data-act]').forEach(el => el.onclick = () => {
      if (phase || el.disabled) return;
      if (el.dataset.act === 'cooldownClock' || immediateSelfSkill(el.dataset.act)) { executeCommand(el.dataset.act, 'you'); return; }
      b.command = el.dataset.act;b.commandLabel=(el.querySelector("b")?.textContent||el.textContent).trim();b.commandTarget=null;b.commandRecipient=null;paint();
    });
    const finishWave = () => {
      if (!g.battle?.pendingWave) return;
      if (g.battle.kind === 'zoneEvent') g.advanceZoneEventWave();
      else g.advanceFrontierBreachWave();
    };
    /** L2: leave the fight right now (no reward) — the single place the Flee result is applied. Call after the player confirmed. */
    const performFlee = () => {
      if (phase || !g.fleeBattle()) { paint(); return; }
      sfx('step'); clearTimeout(phaseTimer); finish();
    };
    const executeCommand = (action, recipient = 'you') => {
      if (phase) return;                       // กำลังเล่นจังหวะอยู่ ห้ามกดซ้อน
      fxHandled = false;
      const actor = action.startsWith('crew:') ? g.battleCrew().find(c => crewBattleKey(c) === action.slice(5)) : null;
      const k = actor ? 'crew:' + actor.k : action;
      const vitalsBefore = vitalsOf(g);
      if (action === 'flee') { performFlee(); return; }
      if (isMeleeAction(k) && g.battle.turnQueue && !['dad','yama'].includes(g.battle.kind)) {
        const who = g.battleActors().find(a => a.id === (g.battle.actorId || 'you'));
        if (!who || g.battle.commandBusy || g.currentBattleTurn()?.side !== 'ally') return;
        const atlas = `crew:${who.homeZone || g.zone}:${who.k}`;
        const contact = who.id === 'you' ? swordContactMs(SWORD_FRAME_MS) : poseContactMs(poseDurations(atlas)) || 260;
        const durations = poseDurations(atlas);
        runDash({ key:keyOfActor(who.id), targetImage:foeImg(g.battle.selectedFoeId), action:k,
          crew:who.id === 'you' ? null : who.k, contact,
          pose:who.id === 'you' ? SWORD_DURATION_MS : durations?.reduce((a,b)=>a+b,0) || 580,
          onHit:() => g.confirmBattleCommand(action, recipient),
          onFinish:() => showHeals(vitalsBefore, 0) });
        return;
      }
      if (!g.confirmBattleCommand(action, recipient)) { paint(); return; }
      if (!g.battle && g.devaVisits?.asia?.phase === 'descending') { finish(); return; }
      commandMenuOpen = false;
      // L2: flee and defend are not attacks — no lunge, no slash effect, no counter-attack cutscene
      if (action === 'defend') {
        sfx('item'); phase = 'you'; phaseAt = Date.now(); fxNow = { key:'defend', action:'defend', side:'you' }; paint();
        clearTimeout(phaseTimer);
        phaseTimer = setTimeout(() => {
          if (!g.battle) return;
          phase = null; fxNow = null; g.finishBattleCommand(); commandMenuOpen = true; finishWave(); paint();
        }, DEFEND_STANCE_MS);
        return;
      }
      // L2 (ต่อจากชุด 30B ข้อ 9) — ใครได้เติมเลือด/พลังเวทจากคำสั่งนี้ (ไอเท็ม พลังของบุญ ดาบดูดเลือด ...) ขึ้นประกาย+วงแสง+ตัวเลข
      // ท่าที่มีภาพคั่น (ยมทูต/ยักษ์) เริ่มตอนภาพคั่นจางลงพอดี ไม่งั้นอยู่ใต้ภาพที่ทับเต็มกรอบ
      showHeals(vitalsBefore, (k.startsWith('crew:') || k === 'guard') ? ACTION_CUT_MS + 80 : 120);
      if(k==='flee')sfx('step');else powerSound(k);                            // ท่าไม้ตายทุกท่ามีเสียงของตัวเอง (28C) · ท่าอื่น = 'hit' · F2: ท่าไม้ตายที่มีคัตซีน = เสียงชาร์จ→ระเบิด ~1.3 วิ
      if (k.startsWith('crew:')) refresh();     // กำลังใจของเขาลด แผงข้างล่างต้องอัปเดตด้วย
      const nb = g.battle;
      if (nb.storyFinale) { sfx('win'); finish(); return; }
      if (nb.kind === 'dad') {
        phase='foe'; phaseAt=Date.now(); fxNow={key:'foe',side:'you'}; paint();
        startActionCue(playActionCutscene('boss',nb.ultimate) ? ACTION_CUT_MS : 0); sfx('hurt');
        phaseTimer=setTimeout(()=>{phase=null;fxNow=null;g.finishBattleCommand();finish();},ACTION_CUT_MS+400);
        return;
      }

      // ---- จังหวะที่ 1: ตาของท่าน ----
      phase = 'you'; phaseAt = Date.now();
      const effect = ITEMS[k]?.consumable ? 'health' : ({'crew:plerng':'fire','crew:kan':'hypno','crew:boon':'health','crew:nira':'health','holyWater':'health'})[k] || k;
      // crew = คีย์ยมทูต/ยักษ์ที่กำลังลงมือ ใช้กันไม่ให้ยมบาทน้อยสลับเป็นท่าโจมตีของตัวเอง (ดู usingAtk ใน arena())
      const crewNow = g.battle.actorId && g.battle.actorId !== 'you' ? g.battleActors().find(c => c.id === g.battle.actorId)?.k || nb.helper?.k : null;
      fxNow = { key: FX_OF[effect] ? effect : 'atk', action:k, side: (effect === 'health' || effect === 'tea' || effect === 'rage') ? 'you' : 'foe', crew: crewNow, recipient };
      fxHandled = true;                         // M2: the canvas effect owns the numbers + old static image from this paint on
      paint();
      let cutMs = 0;
      if (k === 'crew:nira') { playNiraHealingCutscene(dlg,g.zone,artUrl('crew-nira','png',g.zone),ACTION_CUT_MS,()=>camera.cue('idle')); cutMs = ACTION_CUT_MS; }
      else cutMs = playActionCutscene(action) ? ACTION_CUT_MS : 0;
      startActionCue(cutMs); startMoveFx('you', k, cutMs ? ACTION_CUT_MS - 120 : 0, cutMs);

      clearTimeout(phaseTimer);
      phaseTimer = setTimeout(() => {
        if (!g.battle) return;
        // เขาตายคาที่ หรือไม่ได้สวนกลับ (โดนสตัน/ท่านแพ้ไปแล้ว) → ไม่ต้องมีจังหวะที่ 2
        // ข้อ B ชุด 13 — ถูกสะกดจิตแล้วฟาดใส่ตัวเอง (confuseSelf) ก็ต้องมีจังหวะที่ 2 ให้เห็นด้วย
        const counter = (nb.dmg && (nb.dmg.you > 0 || nb.dmg.crew > 0 || nb.dmg.confuseSelf > 0));
        if (!counter) { phase = null; fxNow = null; g.finishBattleCommand(); commandMenuOpen=true; finishWave(); paint(); if (nb.over) sfx(nb.over === 'win' ? 'win' : 'lose'); return; }

        // ข้อ C คุณเป้ 24 ก.ย. 2569 — เดิมตีสวนต่อทันทีที่อนิเมชันเราเล่นจบ (780ms) รู้สึกโดนตีสวนทันที
        // หน่วงเพิ่มอีก ~2 วิ ก่อนเริ่มจังหวะเขาสวนกลับ ผู้เล่นต้องเห็นดาเมจ/แถบเลือดของตัวเองนิ่งอยู่ก่อน
        // phase ยังเป็น 'you' ต่อระหว่างรอ (ปุ่มล็อกอยู่ผ่าน busy:!!phase) กันกดโจมตีซ้อนจนพัง
        phaseTimer = setTimeout(() => {
          if (!g.battle) return;
          // ---- จังหวะที่ 2: เขาสวนกลับ (หรือถูกสะกดจิตแล้วฟาดใส่ตัวเอง) ----
          phase = 'foe'; phaseAt = Date.now();
          fxNow = nb.dmg && nb.dmg.confuseSelf > 0 ? { key: 'atk', side: 'foe' } : { key: 'foe', side: 'you' };
          sfx('hurt');
          fxHandled = true;
          paint();
          { const cutMs = nb.ultimate && playActionCutscene('boss', nb.ultimate) ? ACTION_CUT_MS : 0; startActionCue(cutMs); startMoveFx('foe', null, cutMs ? ACTION_CUT_MS - 120 : 0, cutMs); }
          phaseTimer = setTimeout(() => {
            phase = null; fxNow = null; g.finishBattleCommand();
            if (g.battle) { finishWave(); paint(); if (g.battle.over) sfx(g.battle.over === 'win' ? 'win' : 'lose'); }
          }, nb.ultimate ? ACTION_CUT_MS + 120 : 780);
        }, COUNTER_WAIT_MS);
      }, ACTION_CUT_MS + 120);
    };
    dlg.querySelectorAll('[data-execute]').forEach(el => el.onclick = () => executeCommand(el.dataset.execute, el.dataset.recipient || 'you'));
    const fin = dlg.querySelector('[data-fin]');
    if (fin) fin.onclick = () => { if (!phase) finish(); };
    if(currentTurn?.side==='foe'&&!phase&&!b.over&&!b.commandBusy&&!enemyScheduled&&!userPaused&&!pauseDlg.open){
      enemyScheduled=true;
      phaseTimer=setTimeout(()=>{
        enemyScheduled=false;
        if(g.battle!==b||phase||userPaused||pauseDlg.open||!dlg.open)return;
        const attacker = b.foes.find(f => f.id === currentTurn.id);
        // A solo receiver is known without drawing an extra random target. Boss ultimates,
        // confusion, burns and skipped turns retain their existing choreography.
        if (g.battleActors().length === 1 && attacker && !attacker.boss && !attacker.stun && !attacker.confuse && !attacker.burn) {
          const image = foeImg(attacker.id), atlas = image && bossSpriteKey(image.getAttribute('src') || '', b.zone || g.zone);
          const durations = atlas && poseDurations(atlas), vitalsBeforeDash = vitalsOf(g);
          runDash({ side:'foe', key:attacker.id, targetImage:allyImg('you'),
            contact:poseContactMs(durations) || 260, pose:durations?.reduce((a,b)=>a+b,0) || 580,
            onHit:() => g.runEnemyTurn(), onFinish:() => showHeals(vitalsBeforeDash, 0) });
          return;
        }
        phase='foe';phaseAt=Date.now();
        const vitalsBeforeFoe=vitalsOf(g);
        if(!g.runEnemyTurn()){phase=null;paint();return;}
        showHeals(vitalsBeforeFoe,400);   // L2: e.g. a spare heart bringing Yama back
        fxNow=b.dmg?.confuseSelf?{key:'atk',side:'foe'}:{key:'foe',side:'you'};
        fxHandled=true;
        sfx('hurt');paint();{const cutMs=b.ultimate&&playActionCutscene('boss',b.ultimate)?ACTION_CUT_MS:0;startActionCue(cutMs);startMoveFx('foe',null,cutMs?ACTION_CUT_MS-120:0,cutMs);}
        phaseTimer=setTimeout(()=>{phase=null;fxNow=null;g.finishBattleCommand();commandMenuOpen=true;finishWave();paint();},b.ultimate?ACTION_CUT_MS+120:900);
      },600);
    }
    if (b.kind === 'dad' && !b.over && !authorityAttackScheduled) {
      authorityAttackScheduled=true;
      phaseTimer=setTimeout(()=>{if(g.battle!==b)return;b.actorId='you';b.command='atk';executeCommand('atk');},900);
    }
  };

  // ---- ฉากต่อสู้ "ปิดไม่ได้จนกว่าจะจบ" ----
  // พบ 8 ก.ย. 2569 ว่ามี event close หลุดเข้ามาได้โดยไม่มี cancel นำหน้าและไม่มีใครกดอะไร
  // ผลคือผู้เล่น "แพ้ฟรี" กลางฉาก เลยไม่ผูกการจบฉากไว้กับ event close อีกต่อไป
  let reopen = 0, finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    clearMoveName();
    camera.detach();
    battleUI = null;
    lastBattleEnd = Date.now();
    clearTimeout(phaseTimer);
    healTimers.forEach(clearTimeout);
    stopBattleFx();
    clearInterval(phaseGuard);
    clearInterval(crewTimer);
    dlg.removeEventListener('cancel', noEsc);
    dlg.removeEventListener('keydown', cancelGesture);
    dlg.removeEventListener('contextmenu', cancelGesture);
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

  const noEsc = e => {
    if (storyActive || (g.battle && !g.battle.over)) e.preventDefault();
    if (fleeConfirm) { fleeConfirm = false; paint(); return; }
    if (!phase && g.battle?.command && g.cancelBattleCommand()) paint();
  };
  // L2: cancel a chosen command with Esc or right-click (keydown first so the browser's own dialog-close never races us)
  const cancelGesture = e => {
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    if (!g.battle || g.battle.over || phase) return;
    if (fleeConfirm) { e.preventDefault(); fleeConfirm = false; paint(); return; }
    if (g.battle.command && g.cancelBattleCommand()) { e.preventDefault(); paint(); }
  };
  dlg.addEventListener('keydown', cancelGesture);
  dlg.addEventListener('contextmenu', cancelGesture);
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
    if (dash || storyActive || !phase || Date.now() - phaseAt < PHASE_GUARD_MS) return;
    clearTimeout(phaseTimer);
    phase = null; fxNow = null; g.finishBattleCommand();
    if (g.battle) { if (g.battle.pendingWave) {
      if (g.battle.kind === 'zoneEvent') g.advanceZoneEventWave();
      else g.advanceFrontierBreachWave();
    } paint(); }
  }, 600);

  let crewClockAt = performance.now();
  const crewTimer = setInterval(() => {
    const now = performance.now(), elapsed = now - crewClockAt; crewClockAt = now;
    g.advanceBattleTime(elapsed <= 1500 ? elapsed : 0, !userPaused && !pauseDlg.open && !storyActive && dlg.open);
    g.updateActorRecovery();
    dlg.querySelectorAll('[data-act][data-base-ready]').forEach(button => {
      const remaining = yamaSkillRemaining(g.battle, button.dataset.act);
      button.disabled = !!phase || !!g.battle?.over || button.dataset.baseReady !== 'true' || !!remaining;
      let badge = button.querySelector('.skill-cooldown');
      if (remaining && !badge) { badge = document.createElement('em'); badge.className = 'skill-cooldown'; badge.setAttribute('role', 'status'); button.append(badge); }
      if (badge) { if (remaining) badge.textContent = `${remaining}s`; else badge.remove(); }
    });
    if(!phase&&!enemyScheduled&&!userPaused&&!pauseDlg.open&&dlg.open&&g.currentBattleTurn()?.side==='foe')paint();
    for (const c of g.battleCrew()) {
      const remaining=g.crewCooldown(c), progress=100*(1-remaining/specialCooldown(c));
      const ready=dlg.querySelector(`[data-crew-ready="${crewBattleKey(c)}"] .battle-meter`);
      if(ready){ready.setAttribute('aria-valuenow',Math.round(specialCooldown(c)-remaining));ready.querySelector('i').style.width=progress+'%';}
      const bar=dlg.querySelector(`[data-cooldown="${crewBattleKey(c)}"]`);
      if(bar){bar.setAttribute('aria-valuenow',Math.round(progress));bar.querySelector('i').style.width=progress+'%';}
      const label=dlg.querySelector(`[data-cooldown-label="${crewBattleKey(c)}"]`);
      if(label)label.textContent=remaining?cooldownText(remaining):'พร้อม';
      const button=dlg.querySelector(`[data-crew-action="${crewBattleKey(c)}"]`);
      if(button){button.disabled=!!phase||!!g.battle?.over||!!g.crewHelpWhy(c);button.title=g.crewHelpWhy(c)||crewAbility(c);
        const note=button.querySelector('i');if(note)note.textContent=g.crewHelpWhy(c) ? `${g.crewHelpWhy(c)} / Cooldown or low morale` : 'ท่าพิเศษ / Special';}
    }
    // ข้อ C คุณเป้ 25 ก.ย. 2569 — ยักษ์ทวารบาลมีคูลดาวน์ของตัวเอง (GUARD.helpCdMs · ค่าที่ battleAct ตั้งจริง) แยกจากยมทูต
    if (g.guard) {
      const cdSec=GUARD.helpCdMs/1000, remaining=g.guardCooldown(), progress=100*(1-remaining/cdSec);
      const ready=dlg.querySelector('[data-crew-ready="guard"] .battle-meter');
      if(ready){ready.setAttribute('aria-valuenow',Math.round(cdSec-remaining));ready.querySelector('i').style.width=progress+'%';}
      const bar=dlg.querySelector('[data-cooldown="guard"]');
      if(bar){bar.setAttribute('aria-valuenow',Math.round(progress));bar.querySelector('i').style.width=progress+'%';}
      const label=dlg.querySelector('[data-cooldown-label="guard"]');
      if(label)label.textContent=remaining?cooldownText(remaining):'พร้อม';
      const button=dlg.querySelector('[data-crew-action="guard"]');
      if(button){button.disabled=!!phase||!!g.battle?.over||!!g.guardHelpWhy();button.title=g.guardHelpWhy()||crewAbility(g.guard);
        const note=button.querySelector('i');if(note)note.textContent=g.guardHelpWhy() ? `${g.guardHelpWhy()} / Cooldown or low morale` : 'ท่าพิเศษ / Special';}
    }
  },1000);
  battleUI = () => { paint(); openDlg('rpg'); };
  battleUI();
  dlg.addEventListener('cancel', noEsc);
  dlg.addEventListener('close', onClose);
}

// ---------- ย้ายโซน: แผนที่ด้านนอกและทางเดินข้ามสะพาน ----------
function openZone() {
  const routes=openDungeonRoutes(g),ports=harbourDestinations(g);
  modal(`<h2>แผนที่อเวจี</h2><img src="img/zone-world-map.webp" alt="สี่ดินแดนอเวจี" style="width:100%;border-radius:12px">
    <p>ชนะบอส → เดินออกชายแดน → ผ่านดันเจี้ยน → ถึงเมืองใหม่ → เปิดท่าเรือ</p>
    <div class="row">${ZONES.map(z=>`<span>${esc(z.name)} · ${g.zoneTravel.visited[z.k]?'ค้นพบแล้ว':'ยังไม่ถึง'}${g.zoneTravel.ports[z.k]?' · ท่าเรือเปิด':''}</span>`).join('')}</div>
    <div class="row"><button id="walk-border" ${routes.length?'':'disabled'}>เดินไปชายแดน</button><button id="walk-port">เดินไปท่าเรือ</button><button data-close>ปิด</button></div>
    <p>${ports.length?'เดินทางเรือได้ '+ports.map(k=>ZONES.find(z=>z.k===k).name).map(esc).join(' · '):'Fast Travel เปิดได้เมื่อค้นพบและเปิดท่าเรือปลายทางแล้ว'}</p>`,d=>{
      d.querySelector('#walk-border').onclick=()=>{dlg.close();g.walkTo(FRONTIER.x,FRONTIER.y);};
      d.querySelector('#walk-port').onclick=()=>{const p=g.harbourPoint();dlg.close();g.walkTo(p.x,p.y);};
    },'zonepick');
}
function openBorder() {
  if(Math.hypot(g.player.x-FRONTIER.x,g.player.y-FRONTIER.y)>FRONTIER.reach)return;
  borderGateLatched=true;
  openFrontierWalk();
}
function openDungeon() {
  if(!dungeonStatus(g)||g.battle||g.pendingRecovery)return;
  let destroy=null;
  modal('<div id="dungeon-root"></div>',d=>{
    destroy=mountDungeonView(d.querySelector('#dungeon-root'),g,{
      onGuide:()=>{destroy?.();destroy=null;runBossGuideStory('welcome',()=>openDungeon());},
      onChallenge:()=>{destroy?.();destroy=null;openChallenge(()=>{if(!g.pendingRecovery)openDungeon();});},
      onEncounter:(location,opts)=>{
        destroy?.();destroy=null;
        if(g.startDungeonEncounter(opts?.chased?opts:location?.patrol?{patrol:location.patrol}:location?.checkpoint))openBattle(()=>{if(!g.pendingRecovery)openDungeon();});
        else{g.dungeonChaseCooldown=true;openDungeon();}
      },
      onArrival:to=>{
        destroy?.();destroy=null;
        const arrive=()=>startMapJourney(to,'dungeon');
        if(g.bossGuideFollowing?.())runBossGuideStory('farewell',arrive);
        else if(g.bossGuideWaiting?.()){
          const place=routeBossCave(dungeonStatus(g)?.route.id)?'ถ้ำ':'ทางเข้าเส้นทางชายแดน';
          modal(`<h2>ผู้ตรวจการรอที่${place}</h2><p>ย้อนกลับไปคุยกับผู้ตรวจการที่${place} เพื่อให้เขาพาเดินทางไปยังดินแดนใหม่</p><button data-return-guide>กลับไปตามหา</button>`,d=>{d.querySelector('[data-return-guide]').onclick=()=>openDungeon();});
        }
        else arrive();
      },
      onLeave:()=>{destroy?.();destroy=null;if(g.leaveBorderDungeon())openFrontierWalk();},
      onMenu:()=>{destroy?.();destroy=null;openBag();
        const back=()=>{if(dlg.open)return;dlg.removeEventListener('close',back);if(dungeonStatus(g)&&!g.battle&&!g.pendingRecovery)openDungeon();};
        dlg.addEventListener('close',back);
      },
    });
    const generation=dlgGen;
    const close=()=>{if(d.open&&generation===dlgGen)return;destroy?.();destroy=null;d.removeEventListener('close',close);};d.addEventListener('close',close);
  },'dungeon-dialog');
}
function openHarbour() {
  if(!g.atHarbour()||g.battle)return;
  if(!g.zoneTravel.ports[g.zone])g.activatePort();
  const destinations=harbourDestinations(g);
  modal(`<h2>ท่าเรือรับวิญญาณ</h2><p>Yama และ Nira เดินทางด้วยเรือไปเมืองที่เปิดท่าเรือแล้ว</p>
    <div class="row">${destinations.map(k=>`<button class="gold" data-sail="${k}">${esc(ZONES.find(z=>z.k===k).name)}</button>`).join('')||'<p>ยังไม่มีท่าเรือปลายทาง — ผ่านดันเจี้ยนไปค้นพบเมืองใหม่ก่อน</p>'}
    <button data-close>ปิด</button></div>`,d=>{
      d.querySelectorAll('[data-sail]').forEach(btn=>btn.onclick=()=>sailTo(btn.dataset.sail));
    });
}
function sailTo(to) { startMapJourney(to,'boat'); }
async function startMapJourney(to,mode='boat') {
 if(g.mapTravel||g.travelLoading)return;
 const travelGeneration=dlgGen;g.travelLoading=true;try{await preloadZone(to,g.outfit||to);}catch{g.log('โหลดภาพปลายทางไม่สำเร็จ กรุณาลองใหม่','bad');return;}finally{g.travelLoading=false;}
 if(!dlg.open||travelGeneration!==dlgGen)return;
 if(!beginMapTravel(g,to,{mode,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}))return;
 dlg.close();g.paused=false;setMapZoom(Math.min(1,MAP_ZOOM_LEVELS.length-1));
 const panel=document.createElement('section');panel.id='map-travel-panel';panel.setAttribute('role','status');
 panel.style='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:10010;width:min(560px,92vw);box-sizing:border-box;background:var(--panel,#281d22);color:var(--text,#ffe7c4);border:1px solid var(--gold,#d4a355);border-radius:12px;padding:12px;text-align:center;line-height:1.65';
 const blocker=document.createElement('div');blocker.style='position:fixed;inset:0;z-index:10000';blocker.setAttribute('aria-label','กำลังเดินทาง');document.body.append(blocker);
 const text=document.createElement('p');text.style.margin='0 0 8px';panel.append(text);
 const skip=document.createElement('button');skip.textContent='ข้ามฉากเดินทาง';panel.append(skip);
 const cancel=document.createElement('button');cancel.textContent='ยกเลิก';panel.append(cancel);document.body.append(panel);
 let last=performance.now(),frame=0,done=false;
 const keyguard=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(!g.mapTravel?.committed&&cancelMapTravel(g))close();}else if(e.key!=='Tab'&&!panel.contains(document.activeElement)){e.preventDefault();e.stopImmediatePropagation();}};document.addEventListener('keydown',keyguard,true);skip.focus();
 const close=()=>{if(done)return;done=true;cancelAnimationFrame(frame);panel.remove();blocker.remove();document.removeEventListener('keydown',keyguard,true);refresh();g.onChange();};
 skip.onclick=()=>{if(finishMapTravel(g))close();else{close();g.log('เดินทางไม่ได้ กรุณาลองใหม่','bad');}};
 cancel.onclick=()=>{if(cancelMapTravel(g))close();};
 const animate=now=>{
  if(done)return;
  if(!g.mapTravel){close();return;}
  advanceMapTravel(g,now-last);last=now;
  const a=g.mapTravel;if(!a){close();return;}
  const phase={approach:mode==='boat'?'เรือกำลังเข้าเทียบท่า · นิราและกาญกำลังเดินมา':'กาญกำลังมาส่งที่ชายแดน',handoff:KAN_HANDOFF,board:'ยามาและนิรากำลังขึ้นเรือ',depart:'ออกเดินทางไปทางขวา',arrive:'ถึงปลายทาง · เรือเข้าจากแม่น้ำทางซ้าย',land:'ยามาและนิราขึ้นท่าเรือ'};
  text.textContent=phase[a.phase];cancel.hidden=a.committed;frame=requestAnimationFrame(animate);
 };frame=requestAnimationFrame(animate);
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
const crewAbility = actor => {
  const c=typeof actor==='string'?(actor==='guard'?g.guard||actor:g.battleCrew().find(c=>c.k===actor)||g.crew.find(c=>c.k===actor)||actor):actor;
  return c?.guestGuide?`พลังผู้ตรวจการ · โจมตี ${g.allyStats(c).dmg}`:describeCrewAbility(c,g.zone,g.training);
};
const itemText = (k, field) => ITEMS[k]?.[field+'Key'] ? t(ITEMS[k][field+'Key']) : getLang() === 'en' && ITEMS[k]?.[field+'En'] ? ITEMS[k][field+'En'] : ITEMS[k]?.[field];
// นับยาทุกระดับ (หีบยา/น้ำมนต์/น้ำชา ของทุกโซน) — ใช้บอกว่ากล่องยาเตรียมศึก "มีของ" หรือไม่
const itemName = k => ITEMS[k]?.nameKey ? t(ITEMS[k].nameKey) : (itemText(k, 'name') || k);
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

  if (k === 'lotus') return 'นำไปมอบให้บุญที่ประตูสวรรค์';
  if (d.material) return `สินค้า · พ่อค้านรกรับซื้อ ${d.sell} เบี้ยกรรม`;
  if (d.hp && g.hp >= g.hpMax && !(d.mp && g.mp < g.mpMax)) return 'บารมีเต็มแล้ว';
  if (d.mp && !d.hp && g.mp >= g.mpMax) return t('bag.mpFull');
  if (d.battleOnly) return `ใช้จากเมนูไอเท็มในสนามรบ · ไม่ใช้${t('battle.mp')}`;
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

/** ไอคอนอาวุธ — ไฟล์ยังไม่มี = ภาพแทน (กรอบประ + glyph) · วางไฟล์ img/weapons/weapon-icon-<id>.png จริงแล้วขึ้นเอง */
const weaponImg = (id, attrs = '') =>
  `<img src="${weaponIconSrc(id)}" alt="${esc(t(`weapon.${id}.name`))}" ${attrs} onerror="this.onerror=null;this.src='${placeholderSrc('🗡️')}'">`;
/** การ์ดอาวุธในกระเป๋า — หน้าตาเดียวกับการ์ดชุด: ล็อก/เก็บอยู่/กำลังถือ + ปุ่มสวม·ถอด */
function weaponCards() {
  const eq = g.weapons?.equipped || null;
  const comparison = id => {
    if (id === eq) return '';
    const { current, next, delta } = weaponBonusComparison(WEAPONS, eq, id);
    return `<small class="weapon-compare ${delta > 0 ? 'gain' : delta < 0 ? 'loss' : ''}">${esc(t('menu.bonusCompare', { current, next }))}<br>${esc(t('menu.bonusChange', { delta:delta > 0 ? `+${delta}` : delta }))}</small>`;
  };
  const folders = { asia:'Asia', west:'West', cyberhell:'CyberHell' }, style = g.outfit || g.zone;
  const face = style === 'th' ? 'img/hero-yama.png' : `img/${folders[style]}/hero-yama-${style}.png`;   // ภาพยมบาทชุดที่สวมอยู่ = ถือดาบเดิมของชุดนั้น
  const base = `<div class="outfit-card weapon-card${eq ? '' : ' selected'}">
    <img src="${baseSwordIconSrc}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${face}'">
    <span class="outfit-info"><b>${esc(t('weapon.base'))}</b><small>${esc(t('weapon.baseNote', { n:baseSwordAttack(b => g.normalAttack(b)) }))}</small>${comparison(null)}</span>
    ${eq ? `<button class="sm" data-bag-weapon="">${esc(t('weapon.unequip'))}</button>` : `<button class="sm" disabled>${esc(t('weapon.on'))}</button>`}</div>`;
  return base + Object.keys(WEAPONS).map(id => {
    const owned = !!g.weapons?.owned?.[id], on = eq === id, zone = ZONES.find(z => z.k === WEAPONS[id].zone);
    return `<div class="outfit-card weapon-card${on ? ' selected' : ''}${owned ? '' : ' locked'}">
      ${weaponImg(id, 'loading="lazy"')}
      <span class="outfit-info"><b>${esc(t(`weapon.${id}.name`))}</b>
        ${weaponEffectLines(id).map(l => `<small>${esc(l)}</small>`).join('')}
        ${owned ? comparison(id) : ''}
        <span>${owned ? esc(on ? t('weapon.on') : t('weapon.stored')) : esc(t('weapon.locked', { zone:zone.name.replace(/^โซน/, '') }))}</span></span>
      ${on ? `<button class="sm" data-bag-weapon="">${esc(t('weapon.unequip'))}</button>`
           : `<button class="sm" data-bag-weapon="${id}" ${owned ? '' : 'disabled'}>${owned ? esc(t('weapon.equip')) : '🔒'}</button>`}
    </div>`;
  }).join('');
}

let bagSection = 'items', bagFilter = 'all';
function openBag() {
  pauseForDlg();
  const allCarried = carriedItems(g.inventory, ITEMS);
  const carried = carriedItems(g.inventory, ITEMS, bagFilter);
  const itemCards = carried.length ? carried.map(([k, n]) => {
    const d = ITEMS[k], recovery = !!d.hpRatio || !!d.mpRatio, why = bagUseWhy(k);
    const line = why || (recovery ? itemText(k, 'desc') : itemText(k, 'say'));
    return `<div class="bag-item">
      ${itemImg(k, 'loading="lazy"')}
      <span class="n"><b>${esc(itemName(k))} ×${n}</b>
        <small>${esc(line)}</small></span>
      <button class="gold" data-use-item="${k}" title="${esc(line)}" ${why ? 'disabled' : ''}>${d.material ? 'รอขาย' : esc(t('g1.use'))}</button>
    </div>`;
  }).join('') : `<div class="bag-empty">${esc(allCarried.length ? t('menu.emptyFilter') : t('profile.emptyBag'))}</div>`;
  const counts = { items:allCarried.reduce((sum, [, n]) => sum + n, 0), outfits:g.outfitsOpen().length,
    weapons:Object.values(g.weapons?.owned || {}).filter(Boolean).length };

  modal(`<div class="menu-heading"><img src="img/ui/icon-bag.png" alt=""><div><h2>${esc(t('menu.bagTitle'))}</h2><p>${esc(t('menu.bagHint'))}</p></div></div>
    <nav class="menu-tabs" role="tablist" aria-label="${esc(t('menu.bagTitle'))}">${BAG_SECTIONS.map(key => `<button id="bag-tab-${key}" role="tab" data-menu-tab="${key}" aria-controls="bag-panel-${key}" aria-selected="${key === bagSection}" tabindex="${key === bagSection ? 0 : -1}">${esc(t('menu.' + key))}<small>${counts[key]}</small></button>`).join('')}</nav>
    <section id="bag-panel-items" class="menu-panel" role="tabpanel" aria-labelledby="bag-tab-items" ${bagSection === 'items' ? '' : 'hidden'}>
      <div class="bag-filters" role="group" aria-label="${esc(t('menu.items'))}">${['all','recovery','material','other'].map(key => `<button data-bag-filter="${key}" aria-pressed="${bagFilter === key}">${esc(t('menu.' + key))}</button>`).join('')}</div>
      <div class="bag-list">${itemCards}</div>
    </section>
    <section id="bag-panel-outfits" class="menu-panel" role="tabpanel" aria-labelledby="bag-tab-outfits" ${bagSection === 'outfits' ? '' : 'hidden'}><div class="outfit-list">${outfitCards()}</div></section>
    <section id="bag-panel-weapons" class="menu-panel" role="tabpanel" aria-labelledby="bag-tab-weapons" ${bagSection === 'weapons' ? '' : 'hidden'}><div class="outfit-list weapon-list">${weaponCards()}</div></section>
    <div class="menu-footer"><button class="gold" data-close>${esc(t('menu.closeBag'))}</button></div>`, d => {
      const selectSection = key => {
        if (!BAG_SECTIONS.includes(key)) return;
        bagSection = key;
        d.querySelectorAll('[data-menu-tab]').forEach(button => {
          const active = button.dataset.menuTab === key;
          button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
        });
        BAG_SECTIONS.forEach(section => { d.querySelector('#bag-panel-' + section).hidden = section !== key; });
      };
      bindMenuTabs(d, '[data-menu-tab]', selectSection);
      d.querySelectorAll('[data-bag-filter]').forEach(button => button.onclick = () => {
        bagFilter = button.dataset.bagFilter; openBag();
        dlg.querySelector(`[data-bag-filter="${bagFilter}"]`).focus();
      });
      d.querySelectorAll('[data-bag-weapon]').forEach(b => b.onclick = () => {
        if (!g.equipWeapon(b.dataset.bagWeapon || null)) return;
        sfx('gong'); openBag(); refresh();
      });
      d.querySelectorAll('[data-use-item]').forEach(b => b.onclick = () => {
        if (!g.useBag(b.dataset.useItem)) return;
        sfx('gong'); openBag(); refresh();
      });
      d.querySelectorAll('[data-bag-outfit]').forEach(b => b.onclick = () => {
        if (!g.setOutfit(b.dataset.bagOutfit)) return;
        warmZone(b.dataset.bagOutfit); sfx('gong'); openBag(); refresh();
      });
    }, 'bag');
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
  if(!g.courtClosed){if(!g.queue.length)g.spawnSoul();else g.startCourtArrival(g.queue[0]);}
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
let profileSection = 'status';
function selectProfileSection(key) {
  if (!PROFILE_SECTIONS.includes(key)) return;
  profileSection = key;
  heroProfile.querySelectorAll('[data-menu-tab]').forEach(button => {
    const active = button.dataset.menuTab === key;
    button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
  });
  heroProfile.querySelectorAll('[data-profile-section]').forEach(panel => {
    panel.hidden = panel.dataset.profileSection !== key;
  });
}
function drawHeroProfile() {
  const face = artUrl('hero-yama-profile') || artUrl('hero-yama');
  $('#hero-profile-face').src = face;
  $('#hero-profile-standee').src = artUrl('hero-yama');
  $('#hero-profile-intro').innerHTML = `<h2>${esc(HERO_NAME)}</h2><p class="hero-title">${esc(HERO_TITLE)}</p>
    <div class="profile-stars" aria-label="${esc(t('profile.rank'))}">${'★'.repeat(g.level)}${'☆'.repeat(Math.max(0, LEVELS.length - g.level))}</div>
    <strong>${esc(t('profile.rank'))} ${g.level}/${LEVELS.length} - ${esc(LEVELS[g.level - 1].name)}</strong>
    <p>${esc(t('profile.story'))}${esc(g.zoneDef().name)}</p><p>${esc(t('profile.duty'))}</p>`;
  // help = ชื่อแถบที่ explainBar() รู้จัก → ปุ่ม "?" ท้ายแถว (P4: บารมีเปิดกล่องอธิบายที่ P8 แก้ข้อความแล้ว)
  const row = (img, value, label, extra = '', help = '') => `<div class="hero-profile-row">${img.startsWith('<') ? img : `<img src="${img}" alt="">`}<span class="profile-row-text"><b>${esc(value)}</b><small>${esc(label)}</small>${extra}</span>${help ? `<button type="button" class="profile-help" data-profile-help="${help}" aria-label="${esc(t('profile.help.' + help))}" title="${esc(t('profile.help.' + help))}">?</button>` : ''}</div>`;
  const hpBar = `<span class="hero-profile-hp"><i style="width:${Math.max(0, Math.min(100, 100 * g.hp / g.hpMax))}%"></i></span>`;
  // P1: ยังไม่มีศาลาน้ำชา = ยังไม่มีที่นอน — บอกทางไปที่นอนตรงบรรทัดบารมี (หายเองเมื่อสร้างเสร็จ หรือเมื่อบารมีเต็ม)
  const sleepHint = !g.teaBedReady() && g.hp < g.hpMax ? `<small class="profile-hint">${esc(t('sleep.needTea'))}</small>` : '';
  const status = row('<span class="profile-emoji">❤️</span>', `${Math.round(g.hp)}/${g.hpMax}`, t('profile.hp'), hpBar + sleepHint, 'hp')
    + row('<span class="profile-emoji">🔹</span>', `${Math.round(g.mp)}/${g.mpMax}`, t('battle.mp'), `<span class="hero-profile-hp profile-mp"><i style="width:${Math.max(0, Math.min(100, 100 * g.mp / g.mpMax))}%"></i></span>`)
    + row('img/ui/icon-coin.png', Math.round(g.coin), t('profile.coin'))
    + row('img/item-food.png', Math.round(g.food), t('profile.food'))
    + row('img/ui/icon-justice.png', Math.round(g.order), t('profile.order'))
    + row('img/ui/icon-skull.png', g.karma.toFixed(1), t('profile.karma'))
    + row('img/ui/icon-book.png', g.casesDone, t('profile.cases'));
  const attack = `${BATTLE.atk[0] + (g.level - 1) * 2}–${BATTLE.atk[1] + (g.level - 1) * 2}`;
  const lvBonus = (g.level - 1) * 2;
  const fireDmg = g.controlledFireDamage(BATTLE.fireDmg + (g.abilities.bigFire ? 20 : 0) + lvBonus);
  const powerIcon = { roar:'img/icon-fang.png', mirror:'img/item-mirror.png', ice:'img/fx-ice.png', hypno:'img/fx-hypno.png' };
  const abilityRows = [
    ['flameCharge', 'img/fx-flame-charge.png', `${65 + (g.level - 1) * 3}`, 'charge'],
    ['windFan', 'img/fx-fan-wind.png', t('battle.mp') + ' ' + BATTLE.mpCost.wind, 'wind'],
    ['rage', 'img/fx-rage.png', t('battle.mp') + ' ' + BATTLE.mpCost.rage, 'rage'],
    ['valkyrieSpear', 'img/fx-valkyrie-spear.png', t('battle.mp') + ' ' + BATTLE.mpCost.spear, 'spear'],
  ].filter(([k]) => g.abilities[k]).map(([, img, v, key]) => row(img, v, t('profile.ab.' + key)));
  const powers = row('img/icon-sword.png', `${g.normalAttack(BATTLE.atk[0])}–${g.normalAttack(BATTLE.atk[1])}`, t('profile.attack'))
    + row('img/fx-fireball.png', fireDmg, `${t('profile.fire')} ×${g.fireAmmo} · ${t('g5.level')} ${g.fireControlState().level}/3`)
    + abilityRows.join('')
    + POWERS.filter(p => !g.powerLocked(p)).map(p => row(powerIcon[p.k], p.name, t('profile.power.' + p.k))).join('');
  const carried = Object.entries(g.inventory || {}).filter(([k, n]) => n > 0 && ITEMS[k]);
  const bag = carried.length ? carried.map(([k, n]) => row(itemImg(k), `×${n}`, itemName(k))).join('') : `<small>${esc(t('profile.emptyBag'))}</small>`;
  const crew = g.crew.map(c => `<div class="hero-profile-row crew"><span class="pw-av"><img src="${artUrl(`crew-${c.k}-profile`) || artUrl(`crew-${c.k}`)}" alt="">${powerBadgeHtml(c.k, { zone: g.zone, actor: c })}</span><span class="profile-row-text"><b>${esc(crewName(c, g.zone))}</b><small>${esc(crewAbility(c))}</small>${c.k === 'plerng' ? `<small>${esc(t('g5.level'))} ${g.fireControlState(c).level}/3</small>` : ''}<small>${esc(t('profile.wage'))} ${c.pay} · ${esc(t('profile.order'))} ${c.reader ? g.allyStats(c).order : c.rabiab} · ${esc(t('profile.training'))} ${g.allyStats(c).level}</small></span></div>`).join('');
  const guard = `<div class="hero-profile-row crew"><span class="pw-av"><img src="${artUrl('crew-guard-profile') || artUrl('crew-guard')}" alt="">${powerBadgeHtml('guard', { zone: g.zone, actor: g.guard })}</span><span class="profile-row-text"><b>${esc(GUARD.name)}</b><small>${esc(t('profile.guardTeam'))}</small><small>${esc(t('profile.attack'))} ${g.allyStats(g.guard || 'guard').dmg} · ${esc(t('profile.wage'))} ${GUARD.pay}</small></span></div>`;
  $('#hero-profile-columns').innerHTML = [
    [t('profile.status'), status], [t('profile.powers'), powers],
    [t('profile.bag'), bag], [t('profile.crew'), crew + guard]
  ].map(([title, content], index) => `<section id="profile-panel-${PROFILE_SECTIONS[index]}" data-profile-section="${PROFILE_SECTIONS[index]}" class="hero-profile-column" role="tabpanel" aria-labelledby="profile-tab-${PROFILE_SECTIONS[index]}" ${profileSection === PROFILE_SECTIONS[index] ? '' : 'hidden'}><h3>${esc(title)}</h3>${content}</section>`).join('');
  const tabs = $('#hero-profile-tabs');
  if (tabs.dataset.lang !== getLang()) {
    tabs.dataset.lang = getLang();
    tabs.innerHTML = PROFILE_SECTIONS.map(key => `<button id="profile-tab-${key}" role="tab" data-menu-tab="${key}" aria-controls="profile-panel-${key}" aria-selected="${key === profileSection}" tabindex="${key === profileSection ? 0 : -1}">${esc(t('profile.' + key))}</button>`).join('');
    bindMenuTabs(tabs, '[data-menu-tab]', selectProfileSection);
  }
  // กล่องอธิบายเป็น <dialog> โมดัล → ขึ้นทับโปรไฟล์ได้เสมอ ปิดแล้วกลับมาที่โปรไฟล์เดิม (ไม่ต้องปิดโปรไฟล์ก่อน จึงไม่ค้าง)
  heroProfile.querySelectorAll('[data-profile-help]').forEach(b => b.onclick = () => explainBar(b.dataset.profileHelp));
  applyI18n(heroProfile);
}
function openHeroProfile() { drawHeroProfile(); heroProfile.hidden = false; heroProfile.querySelector('[aria-selected=true]').focus(); }
function closeHeroProfile() { heroProfile.hidden = true; $('#hud-avatar').focus({ preventScroll:true }); }
$('#hud-avatar').onclick = openHeroProfile;
$('#hero-profile-close').onclick = closeHeroProfile;
$('#hero-profile-pause').onclick = () => { closeHeroProfile(); openPause(); };
$('#hero-profile-bag').onclick = () => { closeHeroProfile(); openBag(); };
heroProfile.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeHeroProfile(); }
  if (event.key !== 'Tab') return;
  const buttons = [...heroProfile.querySelectorAll('button:not([disabled])')].filter(button => button.tabIndex >= 0);
  const first = buttons[0], last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
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

/** ปุ่มปิด/เปิดเสียงด่วน — สลับได้ทันทีโดยไม่ต้องเข้าหน้าตั้งค่า (I1-B ข้อ 5: ใช้รูป icon-sound / icon-sound-close ไม่ใช้อีโมจิ)
 *  โมเดลเสียงเหลือสวิตช์เดียวต่อชนิด: AUDIO.bgmOn (เพลง) · AUDIO.sfxOn (เอฟเฟกต์) — ปุ่มด่วนปิด/เปิดทั้งคู่พร้อมกัน
 *  สวิตช์รวม AUDIO.on คงไว้ true เสมอ (ดู normalizeMasterMute) จึงไม่มีกรณี "ปิดรวมอยู่แต่ไอคอนบอกว่าเปิด" */
const allMuted = () => AUDIO.bgmOn === false && AUDIO.sfxOn === false;
/** เซฟเก่าที่ปิดเสียงรวม (on=false) ย้ายมาเป็นปิดเพลง+เอฟเฟกต์ — พฤติกรรมเงียบเท่าเดิม แต่ไอคอนทุกที่ตรงกัน */
function normalizeMasterMute() {
  if (AUDIO.on === false) { AUDIO.on = true; AUDIO.bgmOn = false; AUDIO.sfxOn = false; saveAudio(); }
}
normalizeMasterMute();
function drawMute() {
  const b = $('#mute');
  if (!b) return;
  const off = allMuted();
  const img = b.querySelector('img');
  if (img) img.src = `img/ui/${off ? 'icon-sound-close' : 'icon-sound'}.png`;
  b.setAttribute('aria-pressed', String(off));
  const label = off ? 'เปิดเสียง / Unmute' : 'ปิดเสียง / Mute';
  b.title = label; b.setAttribute('aria-label', label);
}
$('#mute').onclick = () => {
  const turnOn = allMuted();
  AUDIO.on = true; AUDIO.bgmOn = turnOn; AUDIO.sfxOn = turnOn;
  syncBgm(); saveAudio(); drawMute();
  if (turnOn) { unlock(); bgm(g.battle ? 'bgm-battle' : 'bgm-zone'); sfx('crack'); }
};
drawMute();

// M1: the canvas now covers the whole stage (letterbox included) — only points inside the map count
const insideScene = (sx, sy) => sx >= 0 && sy >= 0 && sx <= SCENE.w && sy <= SCENE.h;
cv.onmousemove = e => {
  const [sx, sy] = toScene(cv, e);
  if (!insideScene(sx, sy)) { hover = null; cv.style.cursor = 'default'; return; }
  const def = hitStation(sx, sy);
  const frontier = hitFrontier(g, sx, sy);
  const actor = hitActor(g, sx, sy);
  hover = frontier ? FRONTIER.k : def ? def.k : null;
  cv.style.cursor = (def || frontier || actor) ? 'pointer' : 'default';
};
cv.onmouseleave = () => { hover = null; };
cv.onclick = e => {
  if(g.bossJustice?.active && bossJusticeActive(g))return;
  const [sx, sy] = toScene(cv, e);
  if (!insideScene(sx, sy)) return;
  onSceneClick(sx, sy);
};

/** คลิกโซนบนฉาก — ใช้ร่วมกันทั้งสองมุมมอง */
function onSceneClick(sx, sy) {
  pendingTalk = null;                         // แตะที่อื่น = ยกเลิกการเดินเข้าหาตัวละครที่จะคุย
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
    if (fa?.kind === 'devaEncounter') return openDevaEncounter(fa.key);
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
  if (buildSpot && (!def || def.k !== buildSpot.k) && hitBuildPrompt(ctx, buildSpot, sx, sy, g)) return openBuild(buildSpot);

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
    if (a.kind === 'worker') { talkTo(`worker:${a.key}`); return; }   // P4: คนงานคลิกได้แล้ว (เดิมไม่มี hit-test)
    select(a);
    if (a.kind === 'crew') talkTo(`crew:${a.key}`);
    else if (a.kind === 'guard') talkTo('guard:0');
    else if (a.kind === 'soul') talkTo(`soul:${a.key}`);     // หัวคิว (กำลังไต่สวน) ไม่อยู่ในรายการคุย → talkTo คืน false เฉย ๆ
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
  if(g.mapTravel)return;
  if (dlg.open || !heroProfile.hidden || /input|textarea|select/i.test(e.target.tagName)) return;
  if (talkSess && !e.repeat) {                       // P4: บับเบิลคุยเปิดอยู่ — Esc ปิด · Enter/E บทถัดไป
    if (e.key === 'Escape') { closeTalk(); e.preventDefault(); return; }
    if (e.key === 'Enter' || e.key.toLowerCase() === 'e') { advanceTalk(); e.preventDefault(); return; }
  }
  if (e.key.toLowerCase() === 'e' && isTownZone(g.zone)) {
    if (!e.repeat) activateTownAction();
    e.preventDefault(); return;
  }
  KEY[e.key.toLowerCase()] = true;
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
  if (e.key === ' ' && !g.over && !document.querySelector('#mg-ov:not([hidden]), .st-diag:not([hidden])')) { tryFight(); }        // เว้นวรรค = สู้กับเปรตตนที่ใกล้ที่สุด
});
addEventListener('keyup', e => { KEY[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const key in KEY) KEY[key] = false; });

function keyWalk(dt) {
  if(bossJusticeActive(g))return;
  const P = g.player, sp = 0.32 * dt;
  let dx = 0, dy = 0;
  if (KEY.a || KEY.arrowleft) dx -= 1;
  if (KEY.d || KEY.arrowright) dx += 1;
  if (KEY.w || KEY.arrowup) dy -= 1;
  if (KEY.s || KEY.arrowdown) dy += 1;
  if (!dx && !dy) return;
  pendingTalk = null;                              // เดินเอง = ยกเลิกการเดินเข้าหาตัวละครที่จะคุย
  const d = Math.hypot(dx, dy);
  stepTo(P, dx / d * sp, dy / d * sp, true);    // ลาวา/แม่น้ำ/ตัวยมทูตที่ยืนอยู่กันไว้ ชนแล้วไถลไปตามขอบ
  P.tx = null; P.path = null; g.huntMob = false; // กดปุ่มแล้วยกเลิกจุดหมายที่คลิกไว้ (รวมคำสั่งไล่เปรต)
  if (dx) P.face = dx < 0 ? -1 : 1;
}

/** ---------- หน้าของสถานีหนึ่งหลัง (9 ก.ย. 2569) ----------
 *  เจ้าของสั่ง: กดสถานีแล้วต้องเห็น "ฉากของหลังนั้น" พร้อมรายละเอียดว่ามันมีไว้ทำอะไร
 *  และมีอะไรให้กดจริง ๆ ตรงนั้น — ไม่ใช่กล่องข้อความสองบรรทัดเหมือนเดิม
 *  ฉากหลังคือ img/BG-<ชื่อคีย์>.jpeg ที่เจ้าของวาดมาเอง ไม่มีไฟล์ก็ถอยไปใช้เวทีกลาง */
const stBg = k => k === 'tea' ? teaBackground(g.zone) : wideStationRoom(g.zone, k)?.image || artUrl(`BG-${k[0].toUpperCase()}${k.slice(1)}`, 'webp');   // โซนอื่นมีฉากห้องของตัวเองได้

/** จุดยึดของห้อง — ฉากห้องของโซนที่องค์ประกอบต่างจากโซน 1 มีชุดจุดยึดของตัวเองใน ROOMS[k].zones
 *  ใช้เฉพาะตอนที่ฉากของโซนนั้นมีจริง (ยังไม่มีไฟล์ = ใช้ฉากโซน 1 ก็ต้องใช้จุดยึดโซน 1) */
function roomFor(k) {
  if (k === 'tea') return teaRoom(g.zone);
  const wide = wideStationRoom(g.zone, k);
  if (wide) return wide;
  const base = ROOMS[k] || ROOM_DEFAULT;
  const cap = `BG-${k[0].toUpperCase()}${k.slice(1)}`;
  const own = base.zones && base.zones[g.zone];
  return own && stBg(k) !== `img/${cap}.webp` ? { ...base, ...own }
    : g.zone === 'th' && base.ui4 ? { ...base, ...base.ui4 } : base;
}

function openStation(k, emergency = false) {
  const def = STATIONS.find(d => d.k === k);
  const room = roomFor(k);
  // Only krajok gains access to the new stand; other rooms keep their paths.
  if(k === 'krajok')room.walk=[{poly:[[.17,.51],[.81,.51],[.81,.81],[.68,.81],[.68,.83],[.59,.83],[.59,1],[.41,1],[.41,.83],[.23,.83],[.17,.72]]}];
  const emergencyStation = emergency ? { def, slots:[], fire:0, build:0 } : null;
  const stationHere = () => g.stations.find(x => x.def.k === k) || emergencyStation;
  let myGen = -1;                       // รุ่นของกล่องที่หน้านี้เป็นเจ้าของ (ตั้งค่าหลัง openDlg)
  let R = null;                         // ตัวคุมฉากในห้อง (src/room.js)
  let trainingQuit = null, minigameQuit = null, mirrorCharge = null;
  let diag = null;                      // P4: ใบวินิจฉัยวิญญาณ (เฉพาะตะราง/ประตูสวรรค์) — mountDiagnosis() ตอนสร้างห้องเสร็จ
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
    // P4: แถวรายชื่อตะราง/ประตูสวรรค์ — กดชื่อหรือปุ่ม "วินิจฉัย" เปิดใบวินิจฉัย · ปุ่มเดิม (ตรวจ/ส่ง) อยู่ข้างกัน
    const drow = (key, name, label, btn) => `<div class="st-row"><span class="st-row-name" role="button" tabindex="0" data-diag="${key}">${label}</span>
      <span class="st-row-diag"><button type="button" class="btn-diag" data-diag="${key}" aria-label="${esc(t('diag.openAria', { name }))}">🔍 ${esc(t('diag.open'))}</button>${btn}</span></div>`;
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
    const mgWhy = k === 'krata' ? mgOpen ? t('room.mgBusy') : t(g.stokeWhy(st) || 'g5.stokeHint') : k === 'sala' ? mgOpen ? t('room.mgBusy') : (st.documentCd || 0)>g.tick ? `พักอีก ${st.documentCd-g.tick} วาระ` : '' : !mgOn ? ''
      : mgOpen ? t('room.mgBusy')
      : (st.speedLv || 0) >= UPGRADES.max ? t('room.mgMaxed')
      : g.level < g.mgLevelNeed(st.speedLv || 0) ? t('room.mgLevel').replace('{n}', g.mgLevelNeed(st.speedLv || 0))
      : (st.mgCd || 0) > g.tick ? t('room.mgWait').replace('{n}', st.mgCd - g.tick) : '';
    const mgReady = k === 'krata' ? !mgOpen && !g.stokeWhy(st) : k === 'sala' ? !mgWhy && g.documentPuzzleReady(st) : mgOn && !mgWhy && g.mgReady(st);

    // ---- แผงด้านขวา (เปิดจากปุ่มในฉาก) ----
    let drawer = '';
    if (k === 'tarang') {
      const sentenced = g.sentences.filter(x => x.zone === g.zone && x.stage === 'prison');
      // ตรวจและส่งตัวจากรายชื่อได้ โดยไม่ต้องเดินไปหานิรา
      const rows = sentenced.map(x => {
        const name = esc(x.soul.name || x.soul.who), ready = g.tick >= (x.readyAt ?? x.until ?? 0);
        const needSawan = x.repentant && !g.stations.some(s => s.def.k === 'sawan' && !s.build);
        const status = x.inspected ? t(x.repentant ? 'room.repentant' : 'room.notRepentant')
          : ready ? '' : t('room.wait').replace('{n}', (x.readyAt ?? x.until) - g.tick);
        const label = `#${String(x.soul.id).padStart(3, '0')} ${name}${status ? ` · ${esc(status)}` : ''}${needSawan ? ` · ${esc(t('room.needSawan'))}${g.buildLocked('sawan') ? ` (${esc(t('unlock.lockedAt', { n: g.buildUnlockLv('sawan') }))})` : ''}` : ''}`;
        return drow(`prison:${x.soul.id}`, name, label, x.inspected
          ? `<button class="btn-gold" data-prison-send="${x.soul.id}" ${!R?.prisonEscorting(x.soul.id) && (!x.repentant || !needSawan) ? '' : 'disabled'}>${esc(t(x.repentant ? 'room.toGate' : 'room.toQueue'))}</button>`
          : `<button class="btn-gold" data-prison-check="${x.soul.id}" ${ready ? '' : 'disabled'}>${esc(t('room.niraCheck'))}</button>`);
      }).join('');
      const heldHtml = g.held.length
        ? `<div class="st-pane-title">${esc(t('room.heldTitle').replace('{n}', g.held.length))}</div>`
          + g.held.map(h => drow(`held:${h.id}`, esc(h.name || h.who), esc(h.who), `<button class="btn-gold" data-rel="${h.id}">${esc(t('room.release'))}</button>`)).join('')
        : '';
      // 29C: ปุ่ม "ตรวจความเข็ดหลาบ" ถูกตัด — งานตรวจ/ส่งไปประตูสวรรค์ย้ายมารวมในหน้าต่างเดียวกับรายชื่อ
      drawer = `<div class="st-pane" data-pane="roster">
          <button class="st-drawer-x" type="button" data-drawer-close aria-label="${esc(t('room.close'))}">✕</button>
          ${heldHtml}
          <div class="st-pane-title">${esc(t('room.roster').replace('{n}', sentenced.length))}</div>
          ${rows}
          ${!sentenced.length && !g.held.length ? note(t('room.noneHeld')) : ''}
        </div>`;
    }
    if (k === 'sawan') {
      const arrivals = g.sentences.filter(x => x.zone === g.zone && x.stage === 'gate');
      const rows = arrivals.map(x => {
        const name = esc(x.soul.name || x.soul.who);
        const label = `#${String(x.soul.id).padStart(3, '0')} ${name} · ${esc(x.checked ? t('room.karmaLeft').replace('{n}', x.karmaLeft) : t('room.gateWait'))}`;
        return drow(`gate:${x.soul.id}`, name, label, x.checked
          ? `<button class="btn-gold" data-gate-send="${x.soul.id}">${esc(t(x.karmaLeft > 0 ? 'room.toReborn' : 'room.toSky'))}</button>`
          : `<button class="btn-gold" data-gate-check="${x.soul.id}">${esc(t('room.gateCheck'))}</button>`);
      }).join('');
      // ปุ่มของเกมที่แบบไม่มี: ดอกบัว + มินิเกมเร่งประตู — คงไว้ในแผงเดียวกัน
      // 29C: แถว "ให้ดอกบัว" แยกออกไปเป็นปุ่มลอยข้างบุญ (ดู npcTags ด้านล่าง) — หน้าต่างนี้เหลือรายการรอตรวจ + มินิเกม
      drawer = `<div class="st-pane" data-pane="inspect">
          <button class="st-drawer-x" type="button" data-drawer-close aria-label="${esc(t('room.close'))}">✕</button>
          <div class="st-pane-title">${esc(t('room.gateTitle').replace('{n}', arrivals.length))}</div>
          ${rows}
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
      <p>${esc(t(`room.${k}.desc`))}</p>${k === 'tea' ? '<div data-tea-rest-panel></div>' : ''}
      ${def.tags.length ? `<p>${esc(t('room.karma').replace('{sins}', t(`room.${k}.sins`)))}</p>` : ''}
      ${def.tags.length ? `<p>${esc(t('room.capacity').replace('{n}', cap))}</p>` : ''}
      `);
    // F2 ข้อ 1 (คุณเป้ 9 ต.ค.): ตัดปุ่ม "ฝึกตัวละคร" ออกจากการ์ดทุกห้อง/ทุกโซน — ระบบฝึกยังอยู่ (จุดฝึกบนพื้น → openTraining)
    // ภายหลังจะมีปุ่มมินิเกมมาแทนตรงนี้

    // ---- ปุ่มทองกลางฉาก (ตำแหน่ง = room.actions สัดส่วน 0-1 ของกรอบ) ----
    // spec = [ป้ายปุ่ม, คำใต้ปุ่ม, handler, กดไม่ได้?, คำแทนคำใต้ปุ่มตอนกดไม่ได้เพราะเงื่อนไขของเกม]
    if (A) {
      const toggle = mode => () => { drawerMode = drawerMode === mode ? null : mode; panels(); };
      const mp = k === 'krajok' ? g.powerOf('mirror') : null;

      const specs = ['ngiw','dab'].includes(k) ? [] : k === 'tarang' ? [      // 29C: ปุ่มจัดการรายชื่อย้ายไปลอยบนหัวนิรา (npcTags) — กลางฉากไม่มีปุ่มแล้ว
      ] : k === 'sala' ? [
        ['room.sala.action', null, () => { showArchive(true); sfx('stamp'); }, !inside, !inside ? t('room.nearArch') : ''],
        ['room.sala.action2', null, () => openMinigame(k), !mgReady, mgWhy],
      ] : k === 'krata' ? [
        ['g5.stoke', 'g5.stokeHint', () => openKrata(false), !mgReady, mgWhy],
      ] : k === 'sawan' ? [
        ['room.sawan.action', 'room.sawan.hint', toggle('inspect')],
      ] : k === 'tea' ? [
        [R?.sitting() ? 'room.tea.rise' : 'room.tea.action', 'room.tea.hint', () => { R.setSit(!R.sitting()); panels(); },
          !R?.sitting() && (!inside || g.mp >= g.mpMax),
          !R?.sitting() ? (g.mp >= g.mpMax ? `${t('battle.mp')}เต็มแล้ว / MP full` : !inside ? t('room.nearTea') : '') : ''],
      ] : k === 'krajok' ? [
        ['room.krajok.adjust', null, () => mirrorCharge?.adjust(), !mirrorCharge?.placed() || !nearMirror(R?.pos() || [0,0]),
          mirrorCharge?.placed() && !nearMirror(R?.pos() || [0,0]) ? t('h4.mirrorNear') : ''],
        ['room.krajok.place', null, () => { mirrorCharge?.place(); panels(); }, g.powerLocked(mp) || !!mirrorCharge?.placed(),
          g.powerLocked(mp) ? t('room.krajok.needMirror') : ''],
      ] : [[`room.${k}.action`, `room.${k}.hint`, () => openMinigame(k), !mgReady, mgWhy]];
      if (k === 'tea') {
        // P1 (22 ต.ค. 2569): ไม่มีปุ่มซื้อที่นอนแล้ว — สร้างศาลาน้ำชาเสร็จก็นอนได้เลย (ปุ่มนี้อยู่ในห้องศาลา จึงมีเฉพาะหลังสร้างเสร็จ)
        const asleep = R?.sleeping();
        specs[0][3] ||= !!asleep;
        specs.push([asleep ? 'กำลังนอนพัก…' : 'นอนพัก',
          null, () => { R.setSleep(); panels(); },
          !!asleep || !!R?.sitting() || !R?.nearBed() || g.hp >= g.hpMax,
          asleep ? 'HP ค่อย ๆ ฟื้นระหว่างนอน' : g.hp >= g.hpMax ? 'บารมีเต็มแล้ว' : R?.nearBed() ? 'HP ค่อย ๆ ฟื้นระหว่างนอน 5 วินาที' : 'เดินไปที่นอนก่อน']);
      }
      const resourceLine = i => k !== 'tea' ? '' : i === 1
        ? `<span class="st-hpbar"><i id="st-hp-fill" style="width:${100*g.hp/g.hpMax}%"></i></span><span class="st-hp">HP <span id="st-hp-value">${Math.round(g.hp)}/${g.hpMax}</span></span>`
        : `<span class="st-hpbar"><i id="st-mp-fill" style="background:#28b9db;width:${100*g.mp/g.mpMax}%"></i></span><span class="st-hp">${t('battle.mp')} <span id="st-mp-value">${Math.round(g.mp)}/${g.mpMax}</span></span>`;
      put(A, specs.map(([label, hint, , disabled, why], i) => {
        const [u, v] = k === 'krajok' ? (i === 0 ? [MIRROR_ROOM_LAYOUT.pivot[0], MIRROR_ROOM_LAYOUT.pivot[1]-.15] : [MIRROR_ROOM_LAYOUT.target[0], MIRROR_ROOM_LAYOUT.target[1]-.07]) : room.actions?.[i] || [0.5, 0.5];
        const [ax, ay] = (k === 'tea' || k === 'krajok' || k === 'sala' || k === 'krata') && R ? R.anchor(u, v) : [u*100,v*100];
        const x = Math.max(12, Math.min(88, ax))/100, y = Math.max(15, Math.min(80, ay))/100;
        const sub = k === 'tea' ? '' : why || (hint ? t(hint) : '');
        return `<div class="st-action" style="--action-x:${x * 100}%;--action-y:${y * 100}%">
          <button class="btn-gold" data-room-action="${i}" ${disabled ? 'disabled' : ''}>${esc(t(label))}</button>
          ${sub ? `<small>${esc(sub)}</small>` : ''}${resourceLine(i)}
        </div>`;
      }).join(''));
      A.querySelectorAll('[data-room-action]').forEach(b => b.onclick = specs[+b.dataset.roomAction][2]);
    }

    // ---- ปุ่มลอยข้างตัวละครประจำห้อง (ชุด 29C) — ตะราง: "จัดการรายชื่อ" บนหัวนิรา · ประตูสวรรค์: "ให้ดอกบัว" ข้างบุญ ----
    // ตำแหน่งคิดจากจุดยืนของตัวละครในฉากจริง (R.anchor) จึงตามไปทุกขนาดจอ · วางในชั้น .st-npc ที่ทับบน canvas
    const restPanel = dlg.querySelector('[data-tea-rest-panel]');
    if (restPanel) {
      const resters=teaStaff(g).filter(c => c.teaRest?.zone === g.zone), expanded=!!restPanel.querySelector('details')?.open;
      restPanel.innerHTML = resters.length ? `<details class="tea-rest-list" ${expanded?'open':''}><summary>พักศาลาน้ำชา ${resters.length} คน · คนละ ${STAFF_TEA_REST_MS/60000} นาที</summary><div>${resters.map(c => guardRestWidget(c, true)).join('')}</div></details>` : '';
    }
    const N = dlg.querySelector('#st-npc');
    if (N && R) {
      const tags = [];
      if (['ngiw','dab'].includes(k) && room.crew) {
        const at = st.crewK === 'dam' ? room.guard || [room.crew[0]+.13,room.crew[1]] : room.crew;
        const [ax,ay] = R.anchor(...at,R.crewHeight+.025);
        tags.push({id:'sword-training',ax,ay,pos:'above',label:k==='ngiw'?'ฝึกฟันดาบ':'ฝึกวิชาดาบ',hint:'คุยกับดำ · เพิ่มพลังดาบ',keep:true,disabled:mgOpen});
      }
      if (k === 'krata' && g.crew.some(c => c.k === 'plerng')) {
        const [ax,ay] = R.anchor(...room.crew,R.crewHeight+.025);
        tags.push({id:'fire-training',ax,ay,pos:'above',label:t('g5.train'),hint:t('g5.trainHint'),keep:true,disabled:mgOpen});
      }
      if (k === 'tarang' && room.crew) {
        const [ax, ay] = R.anchor(room.crew[0], room.crew[1], R.crewHeight + 0.012);
        tags.push({ id:'manage', ax, ay, pos:'above', label:t('room.manage'), hint:t('room.manageHint'), pressed:drawerMode === 'roster' });
      }
      if (k === 'sawan' && room.crew) {
        const lotus = g.inventory.lotus || 0;
        const why = lotus <= 0 ? t('room.lotusNone') : !(g.karma > 0) ? t('room.lotusNoKarma') : '';
        const boonAt = st.crewK === 'boon' ? room.guard || [room.crew[0] + .13, room.crew[1]] : room.crew;
        const [ax, ay] = R.anchor(...boonAt, R.crewHeight + 0.025);
        tags.push({ id:'lotus', ax, ay, pos:'above', label:t('room.lotus'), hint:t('room.lotusWhy'), keep:true, karma:Math.round(g.karma*10)/10, disabled:!!why });
      }
      // P4: ปุ่ม "ใบวินิจฉัย" ลอยเหนือหัววิญญาณที่ยืนรออยู่บนจอ (สูงสุด 3 ดวง — เกินนั้นใช้แผงรายชื่อ)
      if (diag) for (const sub of diagnosisSubjects(g, k)) {
        const at = R.soulAnchor(sub.soul.id);
        if (at) tags.push({ diag: subjectKey(sub), name: sub.soul.name || sub.soul.who, ax: at[0], ay: at[1] });
      }
      put(N, tags.map(x => x.diag ? `<div class="st-npc-tag above" style="left:${x.ax.toFixed(2)}%;top:${x.ay.toFixed(2)}%"><button type="button" class="btn-diag" data-diag="${x.diag}" aria-label="${esc(t('diag.openAria', { name: x.name }))}">🔍 ${esc(t('diag.openTag'))}</button></div>`
        : `<div class="st-npc-tag ${x.pos}" style="left:${x.ax.toFixed(2)}%;top:${x.ay.toFixed(2)}%">
          <button class="btn-gold" type="button" data-npc="${x.id}" ${x.disabled ? 'disabled' : ''} ${x.pressed ? 'aria-pressed="true"' : ''}>${esc(x.label)}</button>
          ${x.hint ? `<small class="${[x.disabled && x.id !== 'lotus' ? 'reason' : '', x.keep ? 'keep' : ''].join(' ').trim()}">${esc(x.hint)}</small>` : ''}${x.karma !== undefined ? `<small class="gate-total-karma keep" role="status">${esc(t('h4.yamaKarma').replace('{n}',x.karma))}</small>` : ''}</div>`).join(''));
      const swordTrainingBtn = N.querySelector('[data-npc="sword-training"]');
      if (swordTrainingBtn) swordTrainingBtn.onclick = () => openTraining(k,true);
      const fireTrainingBtn = N.querySelector('[data-npc="fire-training"]');
      if (fireTrainingBtn) fireTrainingBtn.onclick = () => openKrata(true);
      const manageBtn = N.querySelector('[data-npc="manage"]'), lotusBtn = N.querySelector('[data-npc="lotus"]');
      if (manageBtn) manageBtn.onclick = () => { drawerMode = drawerMode === 'roster' ? null : 'roster'; panels(); if (drawerMode) dlg.querySelector('#st-right')?.scrollIntoView?.({ block:'nearest' }); };
      if (lotusBtn) lotusBtn.onclick = () => {
        if(g.offerLotusBoon()){ sfx('gong');panels();refresh(); }
      };
    }
    dlg.querySelectorAll('[data-drawer-close]').forEach(b => b.onclick = () => { drawerMode = null; panels(); });
    dlg.querySelectorAll('[data-diag]').forEach(el => {
      const open = () => diag?.show(el.dataset.diag, el);
      el.onclick = open;
      if (el.getAttribute('role') === 'button') el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    });
    const on = (id, fn) => { const b = dlg.querySelector(id); if (b) b.onclick = fn; };
    dlg.querySelectorAll('[data-rel]').forEach(b => b.onclick = () => {
      if (g.release(+b.dataset.rel)) { sfx('stamp'); panels(); refresh(); }
    });
    const afterCheck = ok => { if (ok) { sfx('stamp'); if(mine()) panels(); refresh(); } };
    dlg.querySelectorAll('[data-prison-check]').forEach(b => b.onclick = () => afterCheck(g.inspectPrison(+b.dataset.prisonCheck)));
    dlg.querySelectorAll('[data-prison-send]').forEach(b => b.onclick = () => { const id=+b.dataset.prisonSend; if(R.prisonEscort(id, () => afterCheck(g.moveFromPrison(id)))) panels(); });
    dlg.querySelectorAll('[data-gate-check]').forEach(b => b.onclick = () => {
      const id=+b.dataset.gateCheck;if(g.inspectGate(id)){R.gateEffect(id,'scan');sfx('gateScan');panels();refresh();}
    });
    dlg.querySelectorAll('[data-gate-send]').forEach(b => b.onclick = () => {
      const id=+b.dataset.gateSend,entry=g.sentenceOf(id,'gate');if(!entry?.checked)return;
      const kind=gateKarma(entry)>0?'reborn':'sky';R.gateEffect(id,kind);
      if(g.resolveGate(id)){sfx(kind==='sky'?'gateSky':'gateReborn');panels();refresh();}
    });
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
  let archiveFocus=null;
  function showArchive(on) {
    const box=dlg.querySelector('#st-arch'),hud=dlg.querySelector('.st-hud');if(!box)return;
    box.hidden=!on;hud?.classList.toggle('archive-open',on);R?.lock(on);
    // Remove obscured HUD controls from keyboard navigation while the modal owns focus.
    const covered=dlg.querySelectorAll('#st-left,#st-actions,#st-alert,#st-npc,#st-right,.st-bottom-left,.st-controls');
    covered.forEach(el=>el.inert=on);
    if(!on){archiveFocus?.focus();return;}
    archiveFocus=document.activeElement;
    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',t('h4.archive'));
    const records=[...g.ledger].reverse().map(x=>archiveRecord(x,x.archiveSoul || g.closed.find(c=>c.soul.id===x.id)?.soul));
    const list=records.map((x,i)=>archiveCard(x,i,artUrl(typeof x.portrait==='number'?'spirit'+x.portrait:x.portrait))).join('');
    box.innerHTML=`<div class="arch-head"><b>${esc(t('h4.archive'))}</b><button type="button" data-archive-close>${t('room.close')}</button></div>
      <div class="arch-sum">${esc(t('h4.archiveSummary').replace('{n}',records.length).replace('{five}',records.filter(x=>x.stars===5).length).replace('{over}',records.filter(x=>x.over>0).length).replace('{short}',records.filter(x=>x.short>0).length))}</div>
      <div class="arch-card-grid">${list || `<p>${t('h4.emptyArchive')}</p>`}</div><div class="arch-detail" hidden></div>`;
    const close=box.querySelector('[data-archive-close]');close.onclick=()=>showArchive(false);close.focus();
    const grid=box.querySelector('.arch-card-grid'),detail=box.querySelector('.arch-detail');
    box.querySelectorAll('[data-archive-card]').forEach(button=>button.onclick=()=>{
      const x=records[+button.dataset.archiveCard],tag=DAD_TAG[dadGrade(x)] || DAD_TAG.ok;
      grid.hidden=true;detail.hidden=false;
      detail.innerHTML=`<button type="button" data-archive-back>${t('h4.backCards')}</button><h3>${esc(x.name)}</h3><p>${t('h4.deserved')}: ${x.deserved} · ${t('h4.given')}: ${x.given} · ${esc(t('h4.'+x.verdict))}</p><p>${'★'.repeat(Math.max(0,Math.min(5,x.stars || 0)))} · ${t('h4.points')}: ${x.score ?? 0} · ${t('h4.turn')}: ${x.tick}</p><p>${t('h4.over')}: ${x.over || 0} · ${t('h4.short')}: ${x.short || 0} · ${t('h4.playerKarma')}: +${x.karma || 0}${x.back ? ' · '+t('h4.returned') : ''}</p><h4>${t('h4.deeds')}</h4><p>${esc(x.deeds)}</p><h4>${t('h4.father')}</h4><p style="color:${tag.c}">${esc(tag.t)}</p><p>${esc(BOSS_LINE[dadGrade(x)] || BOSS_LINE.ok)}</p>`;
      const back=detail.querySelector('[data-archive-back]');back.onclick=()=>{detail.hidden=true;grid.hidden=false;button.focus();};back.focus();
    });
    box.onkeydown=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();showArchive(false);return;}
      if(e.key==='Tab'){
        const buttons=[...box.querySelectorAll('button')].filter(b=>!b.closest('[hidden]'));
        const first=buttons[0],last=buttons[buttons.length-1];
        if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
  }

  function openTraining(sk, fromDam = false) {
    const ov = dlg.querySelector('#mg-ov'), game = TRAINING_GAMES[sk];
    if (!ov || !game || mgOpen || (!R?.inTrainingReach() && !(fromDam && ['dab','ngiw'].includes(sk)))) return;
    mgOpen = true;
    R.lock(true);
    ov.hidden = false; ov.classList.add('mg-train');
    let stop = null, session = null, closed = false;
    let pauseOwned = false;
    const releasePause = () => { if (pauseOwned) { g.paused = false; pauseOwned = false; } };
    const teardown = () => {
      if (closed) return;
      closed = true; stop?.(); releasePause();
      if (session) g.cancelTraining(session.id);
      R?.lock(false); mgOpen = false; trainingQuit = null;
      ov.classList.remove('mg-train');
      if (mine()) { ov.hidden = true; ov.replaceChildren(); panels(); refresh(); }
    };
    trainingQuit = teardown;
    ov.innerHTML = `<div class="mg-head"><b>${esc(game.name)}</b><button class="mg-x" type="button">✕ ปิด / Close</button></div>
      <div class="mg-intro"><p>${esc(game.tip)}</p>
        <p>2 ครั้ง / 100 วาระ · พัก 30 วาระ · ปิดหลังเริ่มเสียครั้ง / 2 attempts per 100 ticks; 30 tick cooldown; quitting consumes attempt</p>
        <label>ผู้ฝึก / Trainee <select class="training-target"></select></label>
        <p class="training-why" role="status"></p>
        <button class="gold mg-start" type="button">▶ เริ่ม / Start</button></div>
      <button class="training-pause" type="button" hidden>พัก / Pause</button><div class="mg-stage" hidden></div>`;
    const select = ov.querySelector('select');
    for (const actor of g.trainingTargets(sk)) {
      const option = document.createElement('option'); option.value = actor.id;
      option.textContent = actor.kind === 'guard' ? GUARD.name : actor.name || actor.kind; select.append(option);
    }
    const reason = ov.querySelector('.training-why'), start = ov.querySelector('.mg-start');
    const check = () => {
      const why = g.trainingWhy(sk, select.value);
      const pr = trainingProgress(g, select.value);
      const progress = `Lv ${pr.level}/${pr.cap} · EXP ${pr.exp}`;
      reason.textContent = `${progress} · ${why || (['dab','ngiw'].includes(sk) ? 'เพิ่มเฉพาะโจมตีปกติ / Normal attack only' : 'เพิ่มพลังผู้ฝึกคนที่เลือก / Selected trainee only')}`;
      start.disabled = !!why;
    };
    select.onchange = check; check();
    if (['dab','ngiw'].includes(sk)) {
      const intro=ov.querySelector('.mg-intro');intro.classList.add('sword-intro');
      const targets=g.trainingTargets(sk);
      intro.innerHTML=`<div class="training-guide"><article><h3>1 · เลือกดาบ</h3><p>ใช้ดาบที่มีในกระเป๋า · ได้ดาบใหม่จากการประลองชายแดน</p><div class="training-weapons"></div></article><article><h3>2 · เลือกผู้ฝึก</h3><p>ฝึกสำเร็จเพิ่ม EXP พลังโจมตีปกติ</p><div class="training-actors"></div></article><article><h3>3 · วิธีเล่น</h3><p>${sk==='ngiw'?'กดเมาส์ค้างแล้วลากผ่านท่อนไม้ที่ลอยขึ้นมา':'คลิกปุ่มสีหรือช่องบนลาน เมื่อโน้ตเข้าแถบทอง'}</p><div class="training-rule"><b>⚔ โดน 10 ครั้ง</b><span>ก่อนพลาด 10 ครั้ง</span></div><p>ฝึกได้ 2 ครั้งใน 100 วาระ · พัก 30 วาระหลังฝึก<br>เริ่มแล้วปิดเกมจะใช้สิทธิ์ 1 ครั้ง</p></article></div>`;
      const weaponGrid=intro.querySelector('.training-weapons');
      for(const id of [null,...Object.keys(g.weapons?.owned || {}).filter(id=>g.weapons.owned[id])]){
        const b=document.createElement('button');b.type='button';b.className='training-choice';b.dataset.weapon=id || '';
        b.innerHTML=`<img src="${id?weaponIconSrc(id):baseSwordIconSrc}" alt=""><b>${id?esc(t(`weapon.${id}.name`)):'ดาบเริ่มต้น'}</b>`;
        const mark=()=>{for(const x of weaponGrid.querySelectorAll('button')){const on=x.dataset.weapon===(g.weapons?.equipped || '');x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));}};
        b.onclick=()=>{g.equipWeapon(id);mark();};weaponGrid.append(b);mark();
      }
      const actorGrid=intro.querySelector('.training-actors');
      for(const actor of targets){
        const b=document.createElement('button');b.type='button';b.className='training-choice';b.dataset.actor=actor.id;
        const source=actor.id===HERO_TRAINING_ID?artUrl('hero-yama-profile'):artUrl(`crew-${actor.kind==='guard'?'guard':actor.k || actor.kind}-profile`);
        b.innerHTML=`<img src="${source || artUrl('hero-yama')}" alt=""><b>${esc(actor.name || 'ยมบาทน้อย')}</b><small>เลือกใช้ฝึก</small>`;
        b.onclick=()=>{select.value=actor.id;check();for(const x of actorGrid.querySelectorAll('button')){const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));}};
        actorGrid.append(b);if(actor.id===select.value){b.classList.add('selected');b.setAttribute('aria-pressed','true');}
      }
      select.hidden=true;intro.append(select,reason,start);check();
    }
    ov.querySelector('.mg-x').onclick = teardown;
    const pauseButton = ov.querySelector('.training-pause');
    pauseButton.onclick = () => {
      if (g.paused && !pauseOwned) return;
      pauseOwned = !pauseOwned; g.paused = pauseOwned;
      pauseButton.textContent = pauseOwned ? 'เล่นต่อ / Resume' : 'พัก / Pause';
    };
    start.onclick = () => {
      if (session || closed) return;
      session = g.startTraining(sk, select.value);
      if (!session) { check(); reason.textContent = g.trainingWhy(sk, select.value) || 'เซฟไม่ได้ / Could not save'; return; }
      ov.querySelector('.mg-intro').hidden = true;
      const stage = ov.querySelector('.mg-stage'); stage.hidden = false; pauseButton.hidden = false;
      try {
        stop = runTraining(stage, { station:sk, session, alive:mine, paused:() => g.paused,
          zone:g.zone, weapon:()=>g.weapons?.equipped,
          heroStyle:session.actorId === HERO_TRAINING_ID ? g.outfit || g.zone : null,
          onSword:() => { g.swingUntil = Date.now() + SWORD_DURATION_MS; },
          onAbandon:teardown, onResult:result => {
            const receipt = g.finishTraining(result);
            stop?.(); releasePause(); pauseButton.hidden = true;
            if (!receipt) { teardown(); return; }
            session = null;
            const next = receipt.next == null ? 'MAX' : receipt.next;
            stage.textContent = `${receipt.score} / 100 · EXP +${receipt.exp} (${receipt.total}/${next}) · Lv ${receipt.before} → ${receipt.level} · พลัง / Power ×${receipt.multiplierBefore.toFixed(2)} → ×${receipt.multiplierAfter.toFixed(2)}`;
            refresh();
          } });
      } catch (error) { teardown(); throw error; }
    };
  }

  /** มินิเกม "เร่งการทำงาน" — ทับอยู่บนฉากในกล่องเดียวกัน ไม่ใช่กล่องใหม่ (แนวเดียวกับ showArchive ด้านบน)
   *  ชุดที่ 9 คุณเป้ 24 ก.ย. 2569: มีคำอธิบาย 1 บรรทัด + ปุ่ม "เริ่มเลย" ก่อนตัวจับเวลาในเกมเริ่มนับ
   *  ปิดได้ทุกเมื่อไม่มีบทลงโทษ — cooldown ตั้งเฉพาะตอน "เล่นจบจริง" (ชนะ/แพ้) เท่านั้น ดู g.finishMinigame()
   *  ระหว่างเล่น: ห้องล็อกอินพุต (R.lock) กันเว้นวรรค/ลูกศรชนกับปุ่มมินิเกม — ส่วนเกมหลัก (g.step()) เดินต่อ
   *  ตามปกติไม่พัก (หน้าสถานีนี้ไม่เคยเรียก pauseForDlg() อยู่แล้วตั้งแต่ต้น) เลือกแบบนี้เพราะปลอดภัยสุด
   *  ไม่ต้องแตะ pauseForDlg/releaseDlgPause ที่เคยมีบั๊กเกมค้างมาก่อน (ดูคอมเมนต์ยาวเหนือฟังก์ชันนั้น) */
  function openKrata(training) {
    const st=stationHere(), ov=dlg.querySelector('#mg-ov');
    if (mgOpen || !st || !ov || (training ? !g.crew.some(c=>c.k==='plerng') : !!g.stokeWhy(st))) return;
    mgOpen=true; R.lock(true); ov.hidden=false;
    dlg.querySelector('#st-cv')?.scrollIntoView?.({block:'center'});   // จอเตี้ย (844×390) ห้องสูงกว่าจอ — เลื่อนให้เห็นยมบาทกับกระทะระหว่างเล่น
    ov.classList.add('g5-overlay');
    ov.classList.toggle('g5-stoke',!training);
    const close=()=>{ minigameQuit?.(); minigameQuit=null; ov.hidden=true; ov.classList.remove('g5-overlay','g5-stoke'); R.walkTo(...R.pos().slice(0,2)); R.lock(false); mgOpen=false; if (mine()) panels(); };
    minigameQuit=runKrataQte(ov,{g,st,room:R,training,alive:()=>mine() && g.stations.includes(st),onClose:close});
    panels();
  }

  function openMinigame(sk) {
    if (['dab','ngiw'].includes(sk)) { openTraining(sk,true); return; }
    if (sk === 'krata') { openKrata(false); return; }
    const stx = g.stations.find(x => x.def.k === sk);
    const game = MINIGAMES[sk];
    const ov = dlg.querySelector('#mg-ov');
    if (!stx || !game || !ov || mgOpen || !(sk === 'sala' ? g.documentPuzzleReady(stx) : g.mgReady(stx))) return;

    mgOpen = true;
    let cleanup = null, closed = false, started = false, pauseOwned = false;
    const zone = g.zone;
    const active = () => mine() && g.zone === zone && g.stations.includes(stx);
    const teardown = () => {
      cleanup?.(); cleanup = null;
      if (pauseOwned) { if (mine() || !dlg.open) g.paused = false; pauseOwned = false; }
      R?.lock?.(false);
      ov.hidden = true; ov.innerHTML = ''; ov.classList.remove('mg-documents');
      mgOpen = false; minigameQuit = null;
    };
    const finish = won => {
      if (closed || !active() || (sk === 'sala' && g.paused)) return false;
      if (sk === 'sala') {
        if (!g.finishDocumentPuzzle(won)) return false;
      } else g.finishMinigame(sk, won);
      closed = true; teardown();
      sfx(won ? 'coin' : 'crack');
      if (mine()) panels(); refresh();
      return true;
    };
    const quit = () => {
      if (closed) return; closed = true;
      teardown();
      if (mine()) panels();
    };
    minigameQuit = quit;

    R?.lock?.(true);
    dlg.querySelector('.st-hud')?.scrollTo?.(0, 0);
    ov.hidden = false;
    ov.classList.toggle('mg-documents',sk === 'sala');
    ov.innerHTML = `
      <div class="mg-head"><b>${sk === 'sala' ? '' : game.icon || '🎮'} ${esc(game.name)}</b>${sk === 'sala' ? `<button class="doc-pause" type="button" aria-pressed="false">${esc(t('doc.pause'))}</button>` : ''}<button class="mg-x" type="button">✕ ปิด</button></div>
      <div class="mg-intro">
        <p class="mg-tip">${esc(game.tip)}</p>
        <button class="gold mg-start" type="button">▶ เริ่มเลย</button>
      </div>
      <div class="mg-stage" hidden></div>`;
    ov.querySelector('.mg-x').onclick = quit;
    const pauseButton = ov.querySelector('.doc-pause');
    if (pauseButton) pauseButton.onclick = () => {
      if (g.paused && !pauseOwned) return;
      pauseOwned = !pauseOwned; g.paused = pauseOwned;
      pauseButton.textContent = pauseOwned ? t('doc.resume') : t('doc.pause');
      pauseButton.setAttribute('aria-pressed',String(pauseOwned));
    };
    const start = () => {
      if (closed || started) return;
      started = true;
      ov.querySelector('.mg-intro').hidden = true;
      const stage = ov.querySelector('.mg-stage'); stage.hidden = false;
      try {
        cleanup = game.run(stage, {
          level: stx.speedLv || 0, alive: () => !closed && active(), paused: () => g.paused,
          reward: () => Math.max(0,Math.min(8,100-g.order)),
          onWin: () => finish(true), onLose: () => finish(false),
        });
      } catch (error) { quit(); throw error; }
    };
    ov.querySelector('.mg-start').onclick = start;
    if (sk === 'sala') start();
  }

  // ---- โครงของหน้า วาดครั้งเดียว: canvas ของฉากต้องไม่ถูกสร้างใหม่ ----
  dlg.innerHTML = `
    <div class="hud st-hud zone1-room" data-room="${k}">
      <div class="st-room"><canvas id="st-cv" width="900" height="620"></canvas>
        <div class="st-arch" id="st-arch" hidden></div>
        <div class="st-diag" id="st-diag" hidden></div>
        <div class="mg-ov" id="mg-ov" hidden></div>
        <div class="st-npc" id="st-npc"></div>${k === 'krata' ? '<div id="st-actions"></div>' : ''}</div>
      <div class="st-card" id="st-left"></div>
      ${k !== 'krata' ? '<div id="st-actions"></div>' : ''}
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
  dlg.querySelector('#st-pause').onclick = () => {
    if (trainingQuit) { dlg.querySelector('.training-pause')?.click(); return; }
    if (k === 'sala' && mgOpen) { dlg.querySelector('.doc-pause')?.click(); return; }
    dlg.close(); openPause();
  };
  dlg.querySelector('#st-book').onclick = () => { dlg.close(); openHelp(); };
  dlg.querySelector('#st-bag').onclick = () => { dlg.close(); openBag(); };

  const cv2 = dlg.querySelector('#st-cv');
  R = makeRoom(cv2, g, def, room, stBg(k), artUrl('BG-Turn-Base', 'webp'), mine);
  R.st = stationHere();
  R.onAct = () => {
    if (k === 'krata') { openKrata(false); return; }
    if (k === 'sala' && R.inTrainingReach()) { openMinigame(k); return; }
    if (k !== 'krata' && room.training && R.inTrainingReach() && TRAINING_GAMES[k]) { openTraining(k); return; }
    // ศาลาน้ำชา: เว้นวรรค/ปุ่มขวาที่จุดนั่งสลับนั่ง-ลุกได้เลย ไม่ต้องไล่กดปุ่มในแผงขวา (ข้อ A 24 ก.ย. 2569)
    if (R.sleeping()) return;
    if (R.canSit && R.nearBed()) { R.setSleep(); panels(); return; }
    if (R.canSit) { R.setSit(!R.sitting()); panels(); return; }
    panels();           // เว้นวรรคในห้องเปิดข้อมูลล่าสุด; การส่งวิญญาณต้องกดเลือกชื่อ
  };
  R.onCollect = () => { panels(); refresh(); };
  if (k === 'tarang' || k === 'sawan') {
    // P4 ใบวินิจฉัยวิญญาณ — ปุ่มหลักเรียกฟังก์ชันเดิมทั้งหมด (release / inspectPrison / moveFromPrison / inspectGate / resolveGate)
    // พร้อมแอนิเมชันห้องเดิม · เปิดใบ = พักเกม (ปล่อยคืนตอนปิดใบ ผ่าน userPaused เหมือนกล่องอื่น)
    const sheet = dlg.querySelector('#st-diag'), hud = dlg.querySelector('.st-hud');
    const covered = () => dlg.querySelectorAll('#st-left,#st-actions,#st-alert,#st-npc,#st-right,.st-bottom-left,.st-controls');
    const after = ok => { if (ok) { sfx('stamp'); if (mine()) panels(); refresh(); } return ok; };
    diag = mountDiagnosis({
      g, roomK: k, box: sheet,
      portrait: m => artUrl(soulKey(m.sp || 7)) || 'img/spirit7.png',
      escorting: id => !!R?.prisonEscorting(id),
      onOpen: () => { pauseForDlg(); hud?.classList.add('diag-open'); R.lock(true); covered().forEach(el => el.inert = true); },
      onClose: () => {
        hud?.classList.remove('diag-open'); covered().forEach(el => el.inert = false);
        if (mine()) { R.lock(false); panels(); }
        if (!userPaused && !g.bossWalk && !g.over) { g.paused = false; updatePlay(); }
      },
      onAct: (m, api) => {
        const id = m.id;
        switch (m.action.kind) {
          case 'release': return g.release(id) ? (after(true), { result: 'close', next: 'now' }) : null;
          case 'inspectPrison': return after(g.inspectPrison(id)) ? { result: 'stay' } : null;
          case 'moveFromPrison':
            return R.prisonEscort(id, () => { after(g.moveFromPrison(id)); api.openNext(); }) ? (panels(), { result: 'close', next: 'manual' }) : null;
          case 'inspectGate':
            if (!g.inspectGate(id)) return null;
            R.gateEffect(id, 'scan'); sfx('gateScan'); panels(); refresh(); return { result: 'stay' };
          case 'resolveGate': {
            const entry = g.sentenceOf(id, 'gate'); if (!entry?.checked) return null;
            const kind = gateKarma(entry) > 0 ? 'reborn' : 'sky'; R.gateEffect(id, kind);
            if (!g.resolveGate(id)) return null;
            sfx(kind === 'sky' ? 'gateSky' : 'gateReborn'); panels(); refresh();
            const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
            return { result: 'close', next: reduced ? GATE_EFFECT_REDUCED_MS : GATE_EFFECT_MS[kind] };
          }
        }
        return null;
      },
    });
    onDlgClose(() => diag?.close(true));
  }
  if (emergency) R.setSleep(true);
  let wasNear = null, wasTrainingNear = null, wasSitting = false, wasSleeping = R.sleeping();
  const exit = roomExit(k, g.zone, room);
  // P5: ไม่มีปุ่ม "ออกไปแผนที่" แล้ว — เดินถึงวงทางออกบนพื้น (บันไดล่างของห้อง) = ออกเลย
  // latch: เข้าห้องแล้วยืนตรงทางออกอยู่ (ห้องส่วนใหญ่เกิดที่ทางออกเอง) ไม่เด้งออก ต้องเดินออกจากวงก่อน
  // ไม่ออกระหว่าง: มินิเกม/หอทะเบียน (R.isLocked) · ฝึก · หลับ · ต่อสู้
  R.exitSpot = { x: exit.x, y: exit.y, reach: exit.reach ?? ROOM_EXIT_REACH, label: 'ออกไปแผนที่' };
  let exitLatched = true;
  let wasMirrorNear=false;
  R.onFrame = near => {
    const leave = exitStep({ at: nearRoomExit(R.pos(), exit), latched: exitLatched,
      blocked: mgOpen || R.isLocked() || R.sleeping() || !!g.battle || !!trainingQuit || !!minigameQuit });
    exitLatched = leave.latched;
    if (leave.fire) { dlg.close(); return; }
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
    if (g.pendingRecovery?.stage === 'wake' && !dlg.querySelector('.nira-wakeup')) {
      const wake = document.createElement('div'); wake.className = 'nira-wakeup';
      wake.style.cssText = 'position:absolute;inset:20% 25%;z-index:20;text-align:center;pointer-events:none;background:#201326dd;border-radius:20px;padding:1rem';
      wake.innerHTML = `<img src="${artUrl('crew-nira')}" alt="" style="height:180px"><p>นิรา: ตื่นได้แล้วค่ะ ไปทำงานกัน / Nira: Wake up. Time to get back to work.</p>`;
      (dlg.querySelector('.st-main') || dlg).append(wake);
    }
    if (!g.pendingRecovery) dlg.querySelector('.nira-wakeup')?.remove();
    if (R.sleeping() !== wasSleeping) { wasSleeping = R.sleeping(); panels(); refresh(); }
    if (R.sitting() !== wasSitting) { wasSitting = R.sitting(); panels(); }  // เต็มแล้วลุกเอง → วาดปุ่มใหม่
    if (k === 'tea') {
      const val = dlg.querySelector('#st-mp-value'); if (val) val.textContent = `${Math.round(g.mp)}/${g.mpMax}`;
      const fill = dlg.querySelector('#st-mp-fill'); if (fill) fill.style.width = `${100*g.mp/g.mpMax}%`;
    }
    if(k === 'krajok') { const nearStand=nearMirror(R.pos()); if(nearStand!==wasMirrorNear){wasMirrorNear=nearStand;panels();} }
    const trainingNear = R.inTrainingReach();
    if (near === wasNear && trainingNear === wasTrainingNear) return;     // แตะ DOM เฉพาะตอนสถานะเปลี่ยนจริง
    wasNear = near; wasTrainingNear = trainingNear; panels();
  };
  if (k === 'krajok') {
    mirrorCharge = mountMirrorCharge(dlg.querySelector('.st-room'), {
      anchor:(...p) => R.anchor(...p), alive:mine, paused:() => g.paused,
      onState:() => { if(mine())panels(); },
      canAdjust:()=>nearMirror(R.pos()),
      canPlace:() => !g.powerLocked(g.powerOf('mirror')),
      canCharge:() => { const st=stationHere(), p=g.powerOf('mirror'); return !!st && !g.powerLocked(p) && p.ammo<p.max && g.tick >= (st.kanCd || 0); },
      onCharge:(angle,aspect) => { const ok=g.chargeMirror(angle,aspect); if(ok) {sfx('item');panels();refresh();} return ok; },
    });
    R.mirrorPlaced=()=>!!mirrorCharge?.placed();
    R.mirrorState=()=>({placed:!!mirrorCharge?.placed(), angle:mirrorCharge?.angle() || 0, adjusting:!!mirrorCharge?.panelOpen()});
    onDlgClose(() => mirrorCharge.destroy());
  }
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
    if (!mine()) { trainingQuit?.(); minigameQuit?.(); clearInterval(tm); return; }
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
  const locked = g.buildLocked(def.k), recommended = g.recommendedBuild() === def.k;
  const afford = g.coin >= def.cost && !!worker && !zoneBlock && !locked;
  const builderNames = ['taan', 'dam'].map(k => crewName(CREW.find(c => c.k === k), g.zone)).join(' / ');
  const builderHint = worker ? `${worker.name}จะเดินมาสร้างให้`
    : g.builders().length ? 'ช่างทุกคนติดงานอื่นอยู่ — รอคนใดคนหนึ่งว่างก่อน'
    : `ต้องจ้าง${builderNames}ที่โต๊ะนิราก่อน`;
  modal(`<h2>${def.glyph} ${esc(def.name)}</h2>
    <p style="font-size:var(--text-sm);line-height:var(--leading-body)">${esc(def.desc)}</p>
    <div class="hint">${def.tags.length ? 'ตรงกรรม: ' + def.tags.map(t => SINS[t].name).join(' · ') : 'ไม่ใช้ลงทัณฑ์'}
      · แรง ${def.pow} · ${esc(builderHint)}</div>
    ${zoneBlock ? `<div class="hint" style="color:var(--gold)">${esc(zoneBlock)}</div>` : ''}
    ${locked ? `<div class="hint build-lock" style="color:var(--gold)">🔒 ${esc(t('unlock.lockedAt', { n: g.buildUnlockLv(def.k) }))} — ${esc(t('unlock.why.' + def.k))}</div>`
      : recommended ? `<div class="hint build-recommend" style="color:var(--gold)">★ ${esc(t('unlock.recommend'))} — ${esc(t('unlock.why.' + def.k))}</div>` : ''}
    <div class="row"><button data-close>ยังไม่สร้าง</button>
      <button class="gold" id="bd" ${afford ? '' : 'disabled'}>${locked ? esc(t('unlock.lockedAt', { n: g.buildUnlockLv(def.k) })) : `สร้าง ${def.cost} เบี้ยกรรม`}</button></div>`,
    d => { const b = d.querySelector('#bd'); if (b) b.onclick = () => { g.build(def.k); dlg.close(); refresh(); }; });
}

/** หน้าต่างเลื่อนขั้น — บอกเป็นรายการว่าได้ความสามารถอะไรเพิ่ม (ข้อ 1 ของเจ้าของ 11 ก.ย. 2569)
 *  รายการมาจาก LEVELS[].gains ซึ่งต้องตรงกับที่ checkLevel() ใน game.js ทำจริง
 *  โซนที่เพิ่งเปิดอ่านจาก ZONES ตอนนี้เลย ไม่ hardcode — เพิ่มโซนใหม่แล้วบรรทัดนี้ตามเอง
 *  (g.level ถูกบวกไปแล้วตอนเรียกถึงตรงนี้ ขั้นก่อนหน้าจึงเป็น g.level - 2) */
function openLevelUp(lv) {
  pauseForDlg();
  sfx('levelup');
  const prev = LEVELS[g.level - 2];
  const zonesNew = g.pendingZoneOpen || [];
  g.pendingZoneOpen = null;                 // บอกในกล่องนี้แล้ว ไม่ต้องเด้งซ้ำอีกกล่อง
  // P1: สถานที่ลงทัณฑ์ที่เพิ่งปลดล็อก — แจ้งในกล่องเลื่อนขั้นนี้ครั้งเดียว + ชี้ว่าแนะนำสร้างอะไรถัดไป
  const unlockRows = unlockedAtLevel(g.level).map(k => {
    const d = STATIONS.find(x => x.k === k);
    return { g: '🔓', t: t('unlock.levelRow', { name: d.name }), d: t('unlock.levelRowDesc', { why: t('unlock.why.' + k) }) };
  });
  const nextBuild = STATIONS.find(x => x.k === g.recommendedBuild());
  if (nextBuild) unlockRows.push({ g: '★', t: t('unlock.next', { name: nextBuild.name }), d: t('unlock.why.' + nextBuild.k) });
  const rows = [
    ...(lv.gains || []),
    ...unlockRows,
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
  // ภาพแทนคัตซีน 16:9 ที่ยังไม่มีไฟล์จริง (p.fallback = glyph) — สีเท่า token --muted/--gold · มีแค่ glyph ไม่มีตัวอักษร
  const placeholder = glyph => ('data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1375 768"><rect width="1375" height="768" fill="#1d1016"/><rect x="40" y="40" width="1295" height="688" rx="28" fill="none" stroke="#d4a355" stroke-width="6" stroke-dasharray="22 14"/><text x="687" y="470" font-size="300" text-anchor="middle">${glyph}</text></svg>`)).replace(/'/g, '%27');
  const stopVideo = () => root.querySelector('video')?.pause?.();
  // Battle interludes use a plain <div> overlay inside the battle <dialog>: 'close' never fires on the overlay, so also watch the host dialog.
  const hosts = new Set([root, root.closest?.('dialog')].filter(Boolean));
  const finish = () => { if (!done) { done = true; stopVideo(); hosts.forEach(h => h.removeEventListener?.('close', stopVideo)); onDone(); } };
  hosts.forEach(h => h.addEventListener?.('close', stopVideo, { once:true }));
  const paint = () => {
    stopVideo();
    const p = story.pages[page];
    const playVideo = p.video;
    const media = playVideo
      ? `<video src="${esc(p.video)}" poster="${esc(p.poster || p.image)}" autoplay muted playsinline controls preload="auto" aria-label="${esc(p.title)}"></video>`
      : `<img src="${p.image}" alt="${esc(p.title)}"${p.fallback ? ` onerror="this.onerror=null;this.src='${placeholder(p.fallback)}'"` : ''}>`;
    root.innerHTML = `<div class="intro-comic" role="region" aria-label="${esc(story.title)} หน้า ${page + 1} จาก ${story.pages.length}">
      <div class="intro-comic-frame">${media}
        <div class="intro-comic-head"><span>${esc(story.title)}</span><span>${page + 1} / ${story.pages.length}</span></div>
      </div><div class="intro-comic-caption"><h2>${esc(p.title)}</h2><p style="white-space:pre-line">${esc(p.line)}</p></div>
      <div class="intro-comic-controls"><button data-story-skip>ข้ามฉาก</button>
        <button data-story-back ${page ? '' : 'disabled'}>← ย้อนกลับ</button>
        <button class="gold" data-story-next>${page + 1 === story.pages.length ? 'ดำเนินเรื่องต่อ' : 'หน้าถัดไป →'}</button></div></div>`;
    prepareComicImages(root);
    if (playVideo) {
      const video = root.querySelector('video');
      const frame = root.querySelector('.intro-comic-frame');
      if (frame.style) frame.style.aspectRatio = String(p.videoAspect || 16/9);
      video.onerror = () => {
        video.outerHTML = `<img src="${esc(p.image)}" alt="${esc(p.title)}">`;
        prepareComicImages(root);
      };
    }
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
  rewardOpen = true; sfx('star');
  const model = rewardView(r), totals = [], rows = [];
  if (model.coin > 0) totals.push(`<div class="reward-row"><img src="img/ui/icon-coin.png" alt=""><span><b>${esc(t('reward.coin'))}</b></span><span class="amt" aria-hidden="true" data-reward-coin>+${model.coin}</span></div>`);
  if (model.exp > 0) totals.push(`<div class="reward-row"><span class="badge">EXP</span><span><b>${esc(t('reward.exp'))}</b></span><span class="amt" aria-hidden="true" data-reward-exp>+${model.exp}</span></div>`);
  for (const it of model.items) if (ITEMS[it.k]) rows.push(`<div class="reward-row">${itemImg(it.k)}<span><b>${esc(itemName(it.k))}</b></span><span class="amt">×${it.n}</span></div>`);
  for (const id of model.weapons) rows.push(`<div class="reward-row power">${weaponImg(id)}<span><b>${esc(t(`weapon.${id}.name`))}</b><small>${esc(t('weapon.reward.hint'))}</small></span></div>`);
  for (const k of model.abilities) rows.push(`<div class="reward-row power">${ABILITY_FX[k] ? `<img src="${ABILITY_FX[k]}" alt="">` : '<span class="badge">+</span>'}<span><b>${esc(t('power.' + k))}</b><small>${esc(t('reward.power'))}</small></span></div>`);
  if (!r.guideZone && !rows.length) rows.push(`<div class="reward-none">${esc(t('reward.noDrop'))}</div>`);
  modal(`${r.background ? `<img class="reward-world-image" src="${esc(r.background)}" alt="${esc(t('reward.background'))}">` : ''}<section class="reward-world-panel">
    <header class="reward-heading"><img class="reward-glow" src="img/ui/result-glow-v1.webp" alt="" aria-hidden="true" onerror="this.remove()"><div class="reward-title"><img class="reward-banner" src="img/ui/result-banner-v1.webp" alt="" aria-hidden="true" onerror="this.remove()"><h2>${esc(r.title || t('reward.title'))}</h2></div>
    <p class="reward-who">${esc(r.who || '')}</p>${r.description ? `<p class="reward-description">${esc(r.description)}</p>` : ''}</header>
    <div class="reward-content"><section class="reward-totals"><h3>${esc(t('reward.summary'))}</h3><div class="reward-list">${totals.join('') || `<p class="reward-none">${esc(t('reward.noGain'))}</p>`}</div></section>
      <section class="reward-loot"><h3>${esc(t('reward.loot'))}</h3><div class="reward-list">${rows.join('')}</div></section></div>
    <p class="b3-sr-only" role="status" aria-live="polite" aria-atomic="true" data-reward-live></p>
    <footer class="reward-actions"><button type="button" class="gold" data-reward-next>${esc(t('reward.showTotals'))}</button></footer></section>`, null, r.background ? 'battle-reward reward-world' : 'battle-reward');
  const gen = dlgGen, button = dlg.querySelector('[data-reward-next]');
  const counter = startRewardCount({ ...model, reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,
    isCurrent:() => dlg.open && gen === dlgGen && g.pendingReward === r,
    onUpdate:values => { for (const key of ['coin','exp']) { const el = dlg.querySelector(`[data-reward-${key}]`); if (el) el.textContent = '+' + values[key]; } },
    onDone:values => { button.textContent = t('reward.continue'); dlg.querySelector('[data-reward-live]').textContent = t('reward.totalsAnnounce', values); }
  });
  button.onclick = () => { if (!counter.skip()) dlg.close(); };
  // Ignore the asynchronous close event of the preceding battle while this generation is open.
  const closed = () => {
    if (dlg.open && gen === dlgGen) return;
    counter.cancel(); dlg.removeEventListener('close', closed); rewardOpen = false;
    // A replacement receipt owns its own acknowledgement and must not be cleared by this close.
    if (g.pendingReward !== r) { g.onChange(); return; }
    if (r.encounter) { if (!g.acknowledgeFinalReward()) { g.onChange(); return; } }
    else { if (r.guideZone) { acknowledgeBossGuideGrant(g,r.guideZone); g.save(); } g.pendingReward = null; }
    const next = rewardAfter; rewardAfter = null;
    g.onChange();
    if (next) { if (dlg.open) onDlgClose(next); else next(); }
  };
  dlg.addEventListener('close', closed);
}

function openBossJustice() {
  const c=bossJusticeCase(g);if(!c||!['dais','trial','sentenceScene'].includes(c.phase))return;
  const persist=()=>{g.save();};
  if(c.phase==='sentenceScene') {
    modal(`<div class="intro-comic"><div class="intro-comic-frame"><img src="img/boss-justice/final-sentence-v1.webp" alt="ผู้คุมพาบอสโซน 4 ไปรับโทษ"></div><div class="intro-comic-caption"><h2>คำตัดสินสุดท้าย</h2><p>ผู้คุมรับหมายและพาบอสโซน 4 ไปรับโทษตามคำตัดสินของยมบาทน้อย นิราบันทึกคดีเรียบร้อยแล้ว</p></div><button class="gold" id="justice-end">ดำเนินเรื่องต่อ</button></div>`,d=>{
      d.querySelector('#justice-end').onclick=()=>{if(releaseBoss(g)){persist();d.close();setTimeout(()=>g.onChange(),0);}};
    },'intro-comic-dialog');return;
  }
  if(c.final){
    pauseForDlg();bgm('bgm-trial');openDlg('hudwrap');
    mountFinalBossCourt(dlg,g,{
      assets:{background:artUrl('BG-Turn-Base','webp'),hero:heroFace(),portrait:artUrl('hero-yama-profile')||heroFace(),
        station:stBg,crew:k=>artUrl(`crew-${k}-profile`)||artUrl(`crew-${k}`)},
      onPaint:()=>{
        mountYamaTrialIdle(dlg.querySelector('.fig.you img'),g.outfit||g.zone);
        bindCommandPress(dlg.querySelector('.trial-comment8'));trialCameraAttach();
        requestAnimationFrame(()=>{
          const stage=dlg.querySelector('.hud-body>.hud-stage'),menu=stage?.querySelector('.comment8-menu'),pane=menu?.querySelector('.court-options.is-open');
          if(!stage?.isConnected||!pane)return;
          const command=menu.querySelector(`[data-court-panel="${pane.dataset.courtOptions}"]`);
          pane.style.left=`${Math.max(0,Math.min(menu.offsetWidth-12+command.offsetLeft,stage.clientWidth-menu.offsetLeft-pane.offsetWidth-8))}px`;
          pane.style.top=`${command.offsetTop}px`;
          pane.style.maxHeight=`${Math.max(90,stage.clientHeight-menu.offsetTop-command.offsetTop-18)}px`;
        });
      },
      onPause:()=>openPause(true),
      onMirror:()=>{powerSound('mirror');playActionCutscene('mirror');},
      onSentence:()=>{sfx('stamp');dlg.close();setTimeout(()=>g.onChange(),0);},
    });
    return;
  }
  const paint=()=>{
    const dests=bossJusticeStations(g),crew=bossJusticeCrew(g),a=bossJusticeAnswer(g),p=c.pick;
    const image=c.final?'img/boss-justice/final-bound-v1.webp':artUrl('BG-Turn-Base','webp');
    const selected=(value,current)=>value===current?'selected':'';
    const valid=p.station&&p.crew&&Number.isInteger(p.intensity)&&c.asked&&(!c.final||c.mirror&&p.station===a.station&&p.crew===a.crew&&p.intensity===5);
    const choices=c.phase==='dais'?`<p>นิรา: จับกุม ${esc(c.name)} มาถึงแท่นตัดสินแล้ว ขอให้ท่านสอบสวนและเลือกบทลงโทษ</p><button id="justice-enter" class="gold">เริ่มสอบสวน</button>`:`<div class="row"><button id="justice-ask">${c.asked?'ถามเพิ่มเติม':'สอบสวนข้อกล่าวหา'}</button><button id="justice-mirror" ${c.asked?'':'disabled'}>ใช้กระจกวิเศษ${c.final?' · จำเป็น':''}</button></div>
      ${c.asked?`<p>นิราอ่านสำนวน: ใช้อำนาจข่มเหงวิญญาณ ปิดกั้นเส้นทางชายแดน และก่อความเดือดร้อน บอสยอมรับต่อหน้าศาลแล้ว</p>`:'<p>สอบสวนก่อนออกหมายลงทัณฑ์</p>'}
      ${c.mirror?`<p class="hint" data-justice-answer>กระจกวิเศษเฉลย: ${esc(dests.find(s=>s.def.k===a.station)?.def.name||'')} · ผู้คุม ${esc(crew.find(v=>v.k===a.crew)?.name||'')} · ความแรงสูงสุด ${INTENSITY[5]}</p>`:''}
      <div class="row"><label>สถานที่ลงทัณฑ์ <select data-justice-pick="station"><option value="">เลือกสถานที่</option>${dests.map(s=>`<option value="${s.def.k}" ${selected(s.def.k,p.station)}>${esc(s.def.name)}</option>`).join('')}</select></label>
      <label>ผู้คุม <select data-justice-pick="crew"><option value="">เลือกผู้คุม</option>${crew.map(v=>`<option value="${v.k}" ${selected(v.k,p.crew)}>${esc(v.name)}</option>`).join('')}</select></label>
      <label>ความแรง <select data-justice-pick="intensity"><option value="">เลือกความแรง</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${selected(n,p.intensity)}>${INTENSITY[n]}</option>`).join('')}</select></label></div>
      ${c.final?'<p>คดีสุดท้ายต้องใช้กระจกวิเศษ แล้วเลือกสถานที่ ผู้คุม และความแรงสูงสุดตามที่กระจกเฉลย</p>':''}
      <button id="justice-sentence" class="gold" ${valid?'':'disabled'}>ออกหมาย · ให้ผู้คุมพาไปลงทัณฑ์</button>`;
    dlg.innerHTML=`<div class="boss-justice-court" data-justice-phase="${c.phase}"><h2>แท่นตัดสิน · ${esc(c.name)}</h2><div style="position:relative;min-height:240px;background:linear-gradient(transparent,#160d13),url('${image}') center/cover;border:1px solid #a78143;border-radius:12px;display:flex;align-items:flex-end;justify-content:center;gap:65px;padding:24px">${c.final?'':`<img style="height:140px" src="${artUrl('hero-yama')}" alt="ยมบาทน้อย"><div style="position:relative"><img style="height:140px" src="${artUrl(c.art)}" alt="${esc(c.name)} ถูกจับมัด"><span style="position:absolute;left:10%;right:10%;top:55%;border-top:9px double #d1b798;transform:rotate(-15deg)" aria-hidden="true"></span></div><img style="height:140px" src="${artUrl('crew-nira')}" alt="นิรา">`}</div>${choices}</div>`;
    dlg.querySelector('#justice-enter')?.addEventListener('click',()=>{c.phase='trial';persist();paint();});
    dlg.querySelector('#justice-ask')?.addEventListener('click',()=>{interrogateBoss(g);persist();paint();});
    dlg.querySelector('#justice-mirror')?.addEventListener('click',()=>{mirrorBoss(g);persist();paint();});
    dlg.querySelectorAll('[data-justice-pick]').forEach(el=>el.onchange=()=>{c.pick[el.dataset.justicePick]=el.dataset.justicePick==='intensity'?Number(el.value)||null:el.value||null;persist();paint();});
    dlg.querySelector('#justice-sentence')?.addEventListener('click',()=>{if(sentenceBoss(g,c.pick)){persist();dlg.close();setTimeout(()=>g.onChange(),0);}});
  };
  pauseForDlg();openDlg('boss-justice-dialog');paint();
}
function showBossJusticeMapStatus() {
  const c=bossJusticeCase(g);let el=ov.querySelector('[data-justice-status]');
  if(!c||!['escort','punishment','return'].includes(c.phase)){el?.remove();return false;}
  if(!el){el=document.createElement('div');el.dataset.justiceStatus='';el.className='final-continue';el.style.cssText='position:absolute;bottom:100px;left:50%;transform:translateX(-50%);padding:12px 22px;background:#27171f;border:1px solid #bc9250;border-radius:12px;color:#ffe0a4;pointer-events:none';ov.appendChild(el);}
  el.textContent=c.phase==='escort'?`ผู้คุมกำลังพา ${c.name} ไปลงทัณฑ์`:c.phase==='punishment'?`${c.name} กำลังรับทัณฑ์ · ความแรง ${INTENSITY[c.pick.intensity]}`:`ผู้คุมกำลังปล่อย ${c.name} กลับชายแดน`;
  return true;
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
  if (pending.stage === 'comic' && storyOf(pending.key)) {
    pauseForDlg(); openDlg('intro-comic-dialog');
    renderStoryComic(dlg, storyOf(pending.key), () => dlg.close());
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
  sfx('item');
  const icon = kind === 'item' ? itemImg(k, 'style="width:96px;height:96px;object-fit:contain"')
    : `<img src="${def.image || (def.glyph.startsWith('img/') ? def.glyph : k === 'mirror' ? 'img/item-mirror.png' : `img/fx-${k}.png`)}" alt="" style="width:96px;height:96px;object-fit:contain" onerror="this.onerror=null;this.src='${placeholderSrc('พลัง')}'">`;
  modal(`<h2>✨ ได้${kind === 'item' ? 'ไอเท็ม' : 'พลัง'}ใหม่ · ${esc(kind === 'item' ? itemName(k) : def.name)}</h2>
    ${icon}<p><b>ใช้ทำอะไร:</b> ${esc(kind === 'item' ? itemText(k, 'desc') : def.desc || def.text || def.say)}</p>
    <p><b>วิธีใช้:</b> ${esc(kind === 'item' ? itemText(k, 'howTo') : def.howTo)}</p>
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
  if (['sleep','wake'].includes(recovery.stage)) { openStation('tea', true); return; }
  modal(`<div style="position:relative;min-height:60vh;display:grid;place-items:center;overflow:hidden;background:#160c20">
    <img src="${esc(recovery.bg || teaBackground(recovery.zone))}" alt="" style="position:absolute;width:100%;height:100%;object-fit:cover;opacity:.35">
    <img src="${yamaDownImage(recovery.outfit)}" alt="ยมบาทน้อยนอนสลบ" style="position:relative;width:50%;max-height:45vh;object-fit:contain">
    <p style="position:absolute;bottom:1rem;text-align:center">ยมบาทน้อยหมดแรง… กำลังพากลับศาลาน้ำชา / Exhausted… returning to tea pavilion</p></div>`, null, 'defeat-recovery');
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
  if(g.mapTravel)return;
  if (g.assetsLoading) return;
  // Hold the world before story/boss handlers can show any art from the new branch.
  if (g.pendingZone) {
    const z = g.pendingZone;
    g.assetsLoading = true; g.paused = true;
    preloadZone(z.k, g.outfit || z.k).then(() => {
      g.pendingZone = null; g.assetsLoading = false;
      refresh();
      if (!z.back || (zoneIntroduction(z.k) && !g.zoneIntroSeen[z.k])) openZoneArrival(z);
      else bossModal(`กลับมาที่${z.name}`,
        `${z.sub ? `${z.sub}\n\n` : ''}สถานี ยมทูต และคิวที่ท่านทิ้งไว้ที่สาขานี้ยังอยู่ครบเหมือนวันที่ท่านจากไป`, 'เริ่มงาน');
    });
    return;
  }
  g.syncDiscoveries();
  if(!g.pendingReward)g.pendingReward=pendingBossGuideGrant(g);
  refresh();
  if (g.battle?.kind === 'devaTest' && g.devaVisits?.th?.phase === 'fighting' && !dlg.open) { openBattle(); return; }
  if (storyPlaying) return;
  if (g.pendingRecovery && !g.battle && !g.pendingDadPunish) {
    if (!dlg.open) openDefeatRecovery();
    return;
  }
  if (g.pendingVerdictScene && !g.battle && !dlg.open) { openVerdictScene(); return; }
  if (g.pendingWarn && !g.battle && !dlg.open) { openAuthorityWarning(); return; }
  // ฉากพญายมลงมาเอง (บารมีหมด/ตัดสินแดงครบสาม) เปิดอัตโนมัติ
  // ฉากต่อสู้กับวิญญาณเปิดจากปุ่มออกหมาย · ฉากต่อสู้กับผีเปิดจากปุ่มบนแผนที่เท่านั้น
  if (g.battle && (g.battle.kind === 'yama' || g.battle.kind === 'dad') && !dlg.open) { openBattle(); return; }
  // startDadFight() เรียก this.onChange() เองข้างในอยู่แล้ว ซึ่งเข้าเงื่อนไข if แรกด้านบนให้เปิดฉากสู้ให้เอง
  // ห้ามเรียก openBattle() ซ้ำตรงนี้ — เรียกซ้ำแล้วมี onClose ของฉากสู้สองชุดค้างอยู่บน dlg element เดียวกัน
  // ชุดเก่าที่ไม่มีใครเคลียร์จะมาเรียก dlg.close() ทับกล่องถัดไป (กระทะทองแดง) ทิ้งทันที (เจอ 17 ก.ย. 2569)
  if (g.dadFight && !g.battle && !dlg.open) { g.startDadFight(); return; }
  if (g.over && (g.over.k !== 'finalWin' || (!g.pendingReward?.encounter && !g.storyQueue.length))) { g.paused = true; updatePlay(); openEnding(g.over); return; }
  // แพ้พ่อครบสามครั้งเตือน — โชว์กระทะทองแดงแล้วเล่นต่อ (ไม่ใช่ Game Over อีกต่อไป)
  if (g.pendingDadPunish && !dlg.open) {
    const p = g.pendingDadPunish; g.pendingDadPunish = null;
    openDadPunish(p); return;
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
  if (!g.battle && !dlg.open && g.bossJustice?.active && bossJusticeActive(g)) {
    const c=bossJusticeCase(g);
    if (['dais','trial','sentenceScene'].includes(c.phase)) { openBossJustice(); return; }
    if (showBossJusticeMapStatus()) return;
  } else if (g.bossJustice && !bossJusticeActive(g)) ov.querySelector('[data-justice-status]')?.remove();
  if (!g.battle && !dlg.open && g.finalEventOnMap()) {
    if (g.beginFinalArrival()) { refresh(); return; }
    const s = g.finalEventState();
    if (s.presentation === 'prepare') { openFinalPreparation(); return; }
    if (s.presentation === 'reinforcementMap') {
      let button = ov.querySelector('.final-continue');
      if (!button) {
        button = document.createElement('button'); button.className = 'final-continue zone-eventfab';
        button.textContent = t('final.map.continue'); button.style.cssText = 'position:absolute;bottom:90px;left:50%;transform:translateX(-50%)';
        button.onclick = () => { button.remove(); g.continueFinalMapScene(); }; ov.appendChild(button);
      }
      return;
    }
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
const coverArtEl = $('#cover-art');
let started = false;
let splashDone = false;
let coverSettled = false;

// ---- อินโทร v3: intro-opening-v3.mp4 (~19 วิ: โลโก้ไฟ → มืด → ค่อยสว่าง → ยมบาทน้อยหันหลังเดินขึ้นบัลลังก์) เล่นจนจบครั้งเดียว ----
// เฟรมสุดท้ายของวิดีโอคือองค์ประกอบเดียวกับภาพปก cover-v4 (#cover-art อยู่ใต้สแปลชอยู่แล้ว) → ค้างเฟรมสุดท้ายแล้ว dissolve เข้าปกนิ่ง
// ปุ่มข้าม/error/reduced-motion/timeout สำรอง = dissolve เร็วเข้าปกเลย · เมนู/โลโก้ค่อยๆ โผล่หลังสแปลชหาย · H5b เริ่มเมื่อปกนิ่ง
// (เลิกใช้วิดีโอปก H5a แล้ว — ยมฯ ในนั้นหันหน้า ขัดกับปก v4 ที่หันหลัง)

/** ปกนิ่งพร้อมแล้ว — โชว์เมนู/โลโก้ (.ready) และแจ้ง H5b เริ่มเอฟเฟกต์ไฟ/ลาวา (.cover-settled) */
function settleCover() {
  if (coverSettled) return;
  coverSettled = true;
  titleEl.classList.add('ready', 'cover-settled');
  document.dispatchEvent(new CustomEvent('avegee:cover-settled'));
}

/** เฟรมสุดท้ายของวิดีโอ = ปก v4 ที่ครอปบน/ล่างข้างละ ~1.2% (1300×708 เทียบ 1376×768) → บนจอสูง/จอ 16:9 วิดีโอซูมกว่าภาพปกนิ่ง ~2.5%
 *  คืนค่า k = สเกลวิดีโอ ÷ สเกลปกนิ่ง (ตาม object-fit:cover ทั้งคู่) ให้ปกเริ่มที่ k แล้วค่อยถอยเป็น 1 ระหว่าง dissolve = ต่อภาพตรงเป๊ะ ไม่สะดุด */
function coverMatchScale() {
  const vw = splashEl.clientWidth, vh = splashEl.clientHeight;
  const { videoWidth: w, videoHeight: h } = splashVideo;
  if (!vw || !vh || !w || !h) return 1;
  const COVER_W = 1376, COVER_H = 768;                      // อัตราส่วนปก v4 (1678×937 ≈ 1376×768)
  const seenH = h * COVER_W / w;                            // ความสูงของปก (หน่วยพิกเซลปก) ที่เห็นในวิดีโอ
  const k = Math.max(vw / COVER_W, vh / seenH) / Math.max(vw / COVER_W, vh / COVER_H);
  return Number.isFinite(k) ? Math.min(1.06, Math.max(1, k)) : 1;
}

/** slow = วิดีโอเล่นจบ (dissolve ช้า + ปกถอยซูมเข้าที่) · ไม่ slow = ข้าม/ผิดพลาด/หมดเวลา */
function hideSplash(slow = false) {
  if (splashEl.hidden) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { splashEl.hidden = true; return settleCover(); }
  if (slow && coverArtEl) {
    coverArtEl.style.transition = 'none';
    coverArtEl.style.transform = `scale(${coverMatchScale()})`;
    void coverArtEl.offsetWidth;                            // บังคับ reflow ให้เริ่มจาก k จริง
    coverArtEl.style.transition = 'transform .9s ease-in-out';
    coverArtEl.style.transform = 'scale(1)';
  }
  splashEl.classList.toggle('slow', slow);
  splashEl.classList.add('leaving');
  setTimeout(() => { splashEl.hidden = true; if (!started) settleCover(); }, slow ? 900 : 380);
}

/** วิดีโอจบ/ข้าม/ผิดพลาด/หมดเวลา → ปกนิ่ง (เรียกซ้ำได้ ทำครั้งเดียว) */
function revealTitle(slow = false) {
  if (splashDone) return;
  splashDone = true;
  splashVideo.pause();
  hideSplash(slow);
}

/** เริ่มเล่นจริง — เรียกได้ครั้งเดียว */
function startPlay(fresh) {
  if (started) return;
  started = true;
  unlock();                                  // เบราว์เซอร์ยอมให้เล่นเสียงได้หลังการกดครั้งแรกเท่านั้น
  splashDone = true;
  splashVideo.pause();
  splashEl.hidden = true;
  titleEl.classList.add('gone');
  resume();                                  // ต้องมาก่อนกล่องฉากเปิด — ดูหมายเหตุที่ resume()
  g.courtClosed = true;                     // เมื่อเข้าแผนที่ครั้งแรก ให้ผู้เล่นกดเปิดศาลเอง
  if(fresh&&g.queue[0])g.startCourtArrival(g.queue[0]); // เรือรออยู่นอกฉากจนกดเปิดศาล
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
  // G2: ปกใหม่ใช้สัดส่วนตัวละครปัจจุบัน; เก็บปกเดิมไว้เป็น fallback
  const art = $('#cover-art');
  (function probeCover(list) {
    if (!list.length) return;
    const [url, ...rest] = list;
    const probe = new Image();
    probe.onload = () => { art.style.backgroundImage = `url('${url}')`; art.classList.add('has'); };
    probe.onerror = () => probeCover(rest);
    probe.src = url;
  })(['img/cover-v4.webp', 'img/cover-v3.webp', 'img/cover.webp', 'img/cover.png']);   // v4 = ยมฯ หันหลัง ตรงกับเฟรมสุดท้ายของ intro-opening-v3 (cover-v5 ยมฯ หันหน้า ไม่ใช้แล้ว)

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

    <div class="settings-row" data-off="${AUDIO.bgmOn === false}">
      <button type="button" id="s-bgm-toggle" class="settings-row-icon settings-row-toggle" aria-pressed="${AUDIO.bgmOn === false}"
        aria-label="${esc(t('settings.musicToggle'))}" title="${esc(t('settings.musicToggle'))}"><img src="img/ui/${AUDIO.bgmOn === false ? 'icon-music-close' : 'icon-music'}.png" alt=""></button>
      <div class="settings-row-body">
        <label for="s-bgm"><span data-t="settings.music"></span><output for="s-bgm" id="s-bgm-value">${Math.round(AUDIO.bgm * 100)}%</output></label>
        <input type="range" id="s-bgm" min="0" max="100" value="${Math.round(AUDIO.bgm * 100)}">
      </div>
    </div>
    <div class="settings-row" data-off="${AUDIO.sfxOn === false}">
      <button type="button" id="s-sfx-toggle" class="settings-row-icon settings-row-toggle" aria-pressed="${AUDIO.sfxOn === false}"
        aria-label="${esc(t('settings.soundsToggle'))}" title="${esc(t('settings.soundsToggle'))}"><img src="img/ui/${AUDIO.sfxOn === false ? 'icon-sound-close' : 'icon-sound'}.png" alt=""></button>
      <div class="settings-row-body">
        <label for="s-sfx"><span data-t="settings.sounds"></span><output for="s-sfx" id="s-sfx-value">${Math.round(AUDIO.sfx * 100)}%</output></label>
        <input type="range" id="s-sfx" min="0" max="100" value="${Math.round(AUDIO.sfx * 100)}">
      </div>
    </div>
    <div class="hint" data-t="settings.audioHint"></div>

    <label class="settings-row cam-row" for="s-cam">
      <span data-t="settings.camera"></span>
      <input type="checkbox" id="s-cam" ${camera.enabled ? 'checked' : ''}>
    </label>
    <div class="hint" data-t="settings.cameraHint"></div>

    <div class="settings-lang">
      <label data-t="settings.language"></label>
      <button id="s-lang-toggle" class="lang-toggle" aria-label="เปลี่ยนภาษา / change language">
        <img id="s-lang-img" src="img/ui/icon-change-th.png" alt="">
      </button>
    </div>

    <div class="settings-actions">
      ${inGame ? `<div class="settings-action-wrap"><button id="s-home" class="settings-square" data-t-title="settings.home" data-t-aria="settings.home" aria-label="home">
          <img src="img/ui/icon-home.png" alt=""></button><small data-t="settings.home"></small></div>
        <div class="settings-action-wrap"><button id="s-restart" class="settings-square" data-t-title="settings.restart" data-t-aria="settings.restart" aria-label="restart">
          <img src="img/ui/icon-restart.png" alt=""></button><small data-t="settings.restart"></small></div>` : ''}
      <div class="settings-action-wrap"><button id="s-save" class="settings-square settings-square--save" data-t-aria="settings.save" aria-label="save">
        <img id="s-save-img" src="img/ui/icon-save-th.png" alt="">
      </button><small data-t="settings.save"></small></div>
    </div>
    <div class="hint" id="s-saved-hint" style="text-align:center;min-height:1.4em"></div>`,
    d => {
      applyI18n(d);
      paintSettingsLangAssets(d);

      const bind = (id, key) => {
        const r = d.querySelector(id);
        r.oninput = () => { AUDIO[key] = r.value / 100; d.querySelector(id + '-value').textContent = r.value + '%'; syncBgm(); };
        r.onchange = () => { saveAudio(); if (key === 'sfx') sfx('stamp'); };
      };
      bind('#s-bgm', 'bgm'); bind('#s-sfx', 'sfx');
      // F2 ข้อ 7 — ไอคอนหน้าแถบเลื่อนเป็นปุ่มปิด/เปิดเสียงเพลงและเสียงเอฟเฟกต์แยกกัน (เก็บใน AUDIO → localStorage 'avegee.audio')
      const bindToggle = (id, key, onIcon, offIcon) => {
        const b = d.querySelector(id), img = b.querySelector('img'), row = b.closest('.settings-row');
        b.onclick = () => {
          AUDIO[key] = AUDIO[key] === false;           // เปิด↔ปิด
          const off = AUDIO[key] === false;
          img.src = `img/ui/${off ? offIcon : onIcon}.png`; b.setAttribute('aria-pressed', String(off)); row.dataset.off = String(off);
          syncBgm(); saveAudio(); drawMute();
          if (!off && key === 'sfxOn') { unlock(); sfx('stamp'); }
        };
      };
      d.querySelector('#s-cam').onchange = e => { camera.setEnabled(e.currentTarget.checked); sfx('stamp'); };   // M1: battle / interrogation camera effects
      bindToggle('#s-bgm-toggle', 'bgmOn', 'icon-music', 'icon-music-close');
      bindToggle('#s-sfx-toggle', 'sfxOn', 'icon-sound', 'icon-sound-close');
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
// preload.js downloads the music completely before boot-ready, including on iOS.
const FRESH = sessionStorage.getItem('avegee.fresh');
sessionStorage.removeItem('avegee.fresh');
const enterGate = $('#enter-gate');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
$('#splash-skip').onclick = () => revealTitle();
splashVideo.addEventListener('ended', () => revealTitle(true), { once:true });   // เล่นจบ = dissolve ช้า เข้าปก v4
splashVideo.addEventListener('error', () => revealTitle(), { once:true });
function playSplash() {
  if (splashDone) return;
  if (reducedMotion) return revealTitle();
  splashEl.classList.add('playing');
  if (splashVideo.error) revealTitle();
  else splashVideo.play().catch(() => revealTitle());
  setTimeout(() => revealTitle(), 25000); // วิดีโอ 19 วิ เล่นจนจบเอง · 25 วิ = สำรองถ้าค้าง (ยังมีปุ่มข้ามด้วย)
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
  if (document.hidden) pauseWhenLeaving();
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
    const p = pages[page], image = `img/intro-panel-0${page + 1}-v2.webp`;
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
window.__sceneToClient = (x, y) => {   // Playwright: จุดบนฉาก → พิกัดหน้าจอ (ตรงข้ามกับ toScene)
  const v = mapCam.viewport, r = cv.getBoundingClientRect();
  return v?.sx ? [r.left + (x * v.sx + v.tx) / v.width * r.width, r.top + (y * v.sy + v.ty) / v.height * r.height]
    : [r.left + x / SCENE.w * r.width, r.top + y / SCENE.h * r.height];
};
window.__camera = camera;     // M1: debug / Playwright handle (like window.G)

// Review pages use the same production dialogs with isolated in-memory saves.
export {openBattle,openDungeon,openHarbour,openBorder,openTrial,openNiraOffice,startPlay};
