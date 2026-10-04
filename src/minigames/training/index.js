import * as mirror from './mirror.js';
import * as breath from './breath.js';
import * as documents from './documents.js';
// B4 engine shared by lan/lokan; 30 seconds of active, unpaused play. B8 games carry create()/ui() instead of a kind.
export const TRAINING_GAMES = Object.freeze({
  dab:{ name:'ฝึกฟันดาบ / Sword training', tip:'แตะเป้าดาบตอนสีเขียว เลี่ยงเป้าหลอก × · 12 เป้า / Tap green sword targets; avoid × decoys (12 targets)', kind:'sword' },
  lan:{ name:'ยกก้อนหิน / Stone lifting', tip:'กดค้างเพื่อยก ปล่อยที่ 55–75 · 10 ครั้ง / Hold to lift; release at 55–75 (10 lifts)', kind:'stone' },
  lokan:{ name:'ยกก้อนหิน / Stone lifting', tip:'กดค้างเพื่อยก ปล่อยที่ 55–75 · 10 ครั้ง / Hold to lift; release at 55–75 (10 lifts)', kind:'stone' },
  krajok:{ name:'ฝึกหอส่องกรรม / Mirror training', tip:'แตะกระจกแล้วลากหรือกด ±15° ให้แสงถึงทางออก ⛩ ค้าง 2 วิ · 45 วิ / Tap a mirror, drag or press ±15° so the light reaches the exit ⛩ and holds 2 s (45 s)', kind:'mirror', seconds:45, create:mirror.create, ui:mirror.mount },
  sawan:{ name:'ฝึกกำหนดลมหายใจ / Breath training', tip:'กดค้างตอนหายใจเข้า ปล่อยตอนหายใจออก ให้ตรงจังหวะ ≥6 จาก 8 รอบ · 32 วิ / Hold while breathing in, release while breathing out; 6 of 8 breaths on the beat (32 s)', kind:'breath', seconds:32, create:breath.create, ui:breath.mount },
  sala:{ name:'ฝึกเรียงเอกสาร / Document sorting', tip:'แตะเอกสารสองใบที่ติดกันเพื่อสลับ เรียงเลข แล้วเรียงหมวด ครบ 2 ชุด · 45 วิ / Tap two neighbouring documents to swap: sort by number, then by category (2 sets, 45 s)', kind:'documents', seconds:45, create:documents.create, ui:documents.mount },
  krata:{ name:'เร่งไฟ / Fire control', tip:'พัดไฟ + หรือลดไฟ − ให้อยู่ 40–60 อย่างน้อย 60% / Keep heat at 40–60 for at least 60% of the time', kind:'fire' },
});
export function createTrainingGame(station, seed = 1) {
  if (TRAINING_GAMES[station].create) return TRAINING_GAMES[station].create(seed);
  const kind = TRAINING_GAMES[station].kind, rounds = kind === 'sword' ? 12 : 10;
  let time = 0, round = 0, successes = 0, mistakes = 0, used = false, holding = false, lift = 0, heat = 50, goodTime = 0;
  const width = 30 / rounds;
  const decoy = () => kind === 'sword' && ((round + seed % 12) % 6 === 0);
  const green = () => kind === 'sword' ? time % width >= .65 && time % width <= 1.9 : lift >= 55 && lift <= 75;
  return {
    step(dt) {
      if (time >= 30 || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, 30 - time);
      if (kind === 'fire') { heat = Math.max(0, heat - dt * (5 + 2 * Math.sin(time))); if (heat >= 40 && heat <= 60) goodTime += dt; }
      if (holding) lift = Math.min(100, lift + dt * 45);
      time += dt;
      const next = Math.min(rounds - 1, Math.floor(time / width));
      if (next !== round) { round = next; used = false; holding = false; lift = 0; }
    },
    input(action) {
      if (time >= 30) return;
      if (kind === 'fire') {
        if (action === 'hit' || action === 'cool') heat = Math.max(0, Math.min(100, heat + (action === 'cool' ? -8 : 8)));
        return;
      }
      if (kind === 'stone') {
        if (action === 'cancel' && holding) { holding = false; used = true; }
        if (action === 'hold' && !used) holding = true;
        if (action === 'release' && holding) { holding = false; used = true; if (green()) successes++; else mistakes++; }
      } else if (action === 'hit' && !used) { used = true; if (green() && !decoy()) successes++; else mistakes++; }
    },
    view() { return { kind, time, round:round + 1, rounds, green:green(), decoy:decoy(), lift, heat, successes, done:time >= 30 }; },
    score() { return kind === 'fire' ? Math.round(goodTime / 30 * 100) : Math.max(0, Math.round((successes - (kind === 'sword' ? mistakes * .25 : 0)) / (kind === 'sword' ? 10 : 10) * 100)); },
  };
}
