// game.js — สถานะเกม · วาระ (tick) · สูตรตัดสิน
import { SINS, DEEDS, MERITS, WHO, STATIONS, CREW, BAL, EVENTS, SCENE, SPOTS,
         POWERS, DENIALS, CONFESS, PANIC, HARD_CASES, ITEMS, ITEM_SPOTS,
         MOB, GUARD, LEVELS, starsOf } from './data.js';
import { canWalk, stepTo, nearestWalk, findPath } from './walk.js';

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const pick = a => a[Math.floor(Math.random() * a.length)];
let SEQ = 1;

export function createGame() {
  const g = {
    tick: 0, coin: BAL.startCoin, fuel: BAL.startFuel,
    order: 72, karma: 0, hp: BAL.startHp,
    powers: POWERS.map(p => ({ ...p, cd: 0, ammo: p.k === 'roar' ? 3 : p.k === 'mirror' ? 2 : 0, max: p.k === 'roar' ? 3 : 2 })),
    star5: 0, level: 1, hits: 0, hpMax: BAL.startHp,
    player: { x: SPOTS.bench.x + 60, y: SPOTS.bench.y, tx: null, ty: null, face: 1, path: null },
    items: [], mobs: [], guard: null, fxHits: [],
    queue: [], logs: [], closed: [], over: null,
    paused: true, speed: 1,
    nextArrive: 4, nextEvent: BAL.eventEvery, nextPay: BAL.payEvery, nextKpi: BAL.kpiEvery,
    kpiPassed: 0, casesDone: 0, scoreSum: 0,
    crew: CREW.filter(c => c.hire === 0).map(mkCrew),
    stations: [],
    onChange: () => {},
  };

  // สถานีตั้งต้น: หอทะเบียน + กระทะทองแดง (ที่เหลือสร้างเอาเอง)
  g.stations = [mkStation('sala'), mkStation('krata')];

  Object.assign(g, API);
  g.log('พญายม: "โซนนี้เละมาสามร้อยปีแล้ว จัดการซะ" แล้วท่านก็หายไป', 'boss');
  g.spawnSoul();
  return g;
}

function mkCrew(def) {
  return { ...def, morale: 92, at: null, tired: false };
}

function mkStation(k) {
  const def = STATIONS.find(s => s.k === k);
  return { def, soul: null, crewK: null, intensity: 3, progress: 0, need: 0 };
}

// ---------- สร้างสำนวนคดี ----------
/** คดีที่ถูกกับผิดปนกัน — ด้านที่ทำให้เห็นใจถูกซ่อนไว้ ต้องใช้พลังถึงจะเจอ */
function mkHardSoul() {
  const c = pick(HARD_CASES);
  const soul = {
    id: SEQ++, who: c.who, hard: true, waited: 0, said: [],
    deeds: [{ ...c.seen, known: true }, { ...c.hidden, known: false }],
    merits: [{ ...c.merit, fake: false, hiddenMerit: true }],
    denied: null,
  };
  soul.deserved = deservedOf(soul);
  soul.said.push({ kind: 'deny', text: c.line });
  return soul;
}

function mkSoul() {
  const n = 1 + (Math.random() < 0.5 ? 1 : 0) + (Math.random() < 0.2 ? 1 : 0);
  const deeds = [];
  while (deeds.length < n) {
    const d = pick(DEEDS);
    if (!deeds.some(x => x.t === d.t)) deeds.push({ ...d, known: true });
  }
  // เรื่องที่สำนวนไม่ได้เขียนไว้ — ต้องใช้พลังถึงจะเจอ
  if (Math.random() < BAL.hiddenChance) {
    const h = pick(DEEDS);
    if (!deeds.some(x => x.t === h.t)) deeds.push({ ...h, known: false });
  }
  // บุญ: บางอันเป็นของจริง บางอันเขากุขึ้นเอง
  const merits = [];
  if (Math.random() < 0.65) merits.push({ ...pick(MERITS), fake: false });
  if (Math.random() < BAL.fakeMeritChance) {
    const f = pick(MERITS);
    if (!merits.some(m => m.t === f.t)) merits.push({ ...f, fake: true });
  }

  const soul = {
    id: SEQ++, who: pick(WHO), deeds, merits, waited: 0,
    said: [],          // สิ่งที่ปรากฏบนโต๊ะแล้ว (คำแก้ตัว/คำสารภาพ/ผลของพลัง)
    denied: null,      // เรื่องที่เขาปฏิเสธ
  };
  soul.deserved = deservedOf(soul);

  // คำแก้ตัวตั้งต้น — ปฏิเสธเรื่องที่หนักที่สุดในสำนวน
  const worst = [...deeds].filter(d => d.known).sort((a, b) => b.w - a.w)[0];
  if (worst && Math.random() < 0.6) {
    soul.denied = worst.t;
    soul.said.push({ kind: 'deny', text: `"${pick(DENIALS)}" — เรื่อง${worst.t}` });
  }
  for (const m of merits) soul.said.push({ kind: 'claim', text: `"${m.t}" (เขาอ้างเอง ยังไม่มีใครยืนยัน)` });
  return soul;
}

/** วาระที่สมควรได้รับ คิดจาก "ความจริงทั้งหมด" ไม่ใช่จากที่ผู้เล่นเห็น */
function deservedOf(soul) {
  const ws = soul.deeds.map(d => d.w).sort((a, b) => b - a);
  const raw = ws[0] + ws.slice(1).reduce((s, w) => s + w * 0.4, 0);
  const merit = soul.merits.filter(m => !m.fake).reduce((s, m) => s + m.v, 0);
  return clamp(Math.round(raw - merit), 1, 5);
}

const API = {
  log(text, kind = '') {
    this.logs.unshift({ t: this.tick, text, kind });
    if (this.logs.length > 90) this.logs.pop();
  },

  spawnSoul() {
    if (this.queue.length >= 14) return;
    // ทุก ๆ ราวหนึ่งในห้า จะเป็นคดีที่ตัดสินยาก
    const s = (this.casesDone >= 2 && Math.random() < 0.22) ? mkHardSoul() : mkSoul();
    if (s.hard) this.log(`⚖️ สำนวน #${String(s.id).padStart(3, '0')} หนา​ผิดปกติ — นิราวางไว้แล้วไม่พูดอะไร`, 'event');
    this.queue.push(s);
    if (!s.hard) this.log(`วิญญาณเข้าคิว — ${s.who} (สำนวน #${String(s.id).padStart(3, '0')})`);
  },

  crewOf(k) { return this.crew.find(c => c.k === k); },

  powerOf(k) { return this.powers.find(p => p.k === k); },
  powerReady(k) {
    const p = this.powerOf(k);
    return p && p.cd === 0 && p.ammo > 0 && this.casesDone >= p.unlock;
  },

  /** ใช้พลังกับวิญญาณที่ยืนอยู่หน้าแท่น — คืนข้อความที่จะขึ้นบนโต๊ะ */
  usePower(k, soul) {
    if (!this.powerReady(k) || !soul) return null;
    const p = this.powerOf(k);
    p.cd = POWERS.find(x => x.k === k).cd;      // เริ่มนับ cooldown
    p.ammo--;                                    // และกินกระสุนไปหนึ่ง — เดินไปเก็บของมาเติมได้
    this.karma = clamp(this.karma + p.karma, 0, 100);

    const hidden = soul.deeds.filter(d => !d.known);
    const fakes = soul.merits.filter(m => m.fake && !m.exposed);
    let out = [];

    if (k === 'mirror') {                        // ความจริงเสมอ ทีละเรื่อง
      if (hidden.length) {
        hidden[0].known = true;
        out.push({ kind: 'truth', text: `🪞 กระจกส่องเห็น: ${hidden[0].t}` });
      } else if (fakes.length) {
        fakes[0].exposed = true;
        out.push({ kind: 'truth', text: `🪞 กระจกส่องเห็น: "${fakes[0].t}" ไม่เคยเกิดขึ้นเลย` });
      } else if (soul.denied) {
        out.push({ kind: 'truth', text: `🪞 กระจกส่องเห็น: ที่เขาปฏิเสธเรื่อง${soul.denied} — เขาทำจริง` });
      } else {
        out.push({ kind: 'truth', text: '🪞 กระจกส่องแล้วไม่พบอะไรที่ยังไม่รู้ สำนวนนี้ตรงไปตรงมา' });
      }

    } else if (k === 'roar') {                   // เร็วกว่า แต่คนกลัวพูดมั่วได้
      if (Math.random() < 0.65 && hidden.length) {
        hidden[0].known = true;
        out.push({ kind: 'confess', text: `💢 "${pick(CONFESS)}" — ${hidden[0].t}` });
      } else {
        const f = pick(DEEDS);
        out.push({ kind: 'false', text: `💢 "${pick(PANIC)}" — เขาสารภาพว่า${f.t}` });
        out.push({ kind: 'hint', text: 'คำสารภาพนี้ออกมาตอนกำลังกลัว จะเชื่อหรือไม่เชื่อก็ได้' });
      }

    } else if (k === 'hypno') {                  // เห็นหมด แต่กรรมตกที่เรา
      hidden.forEach(d => { d.known = true; out.push({ kind: 'truth', text: `🌀 ในใจเขามี: ${d.t}` }); });
      fakes.forEach(m => { m.exposed = true; out.push({ kind: 'truth', text: `🌀 "${m.t}" เป็นเรื่องที่เขาแต่งขึ้น` }); });
      if (!out.length) out.push({ kind: 'truth', text: '🌀 ในใจเขาไม่มีอะไรมากไปกว่าที่พูดออกมาแล้ว' });
      out.push({ kind: 'hint', text: `การรื้อใจคนเป็นกรรมของเราด้วย — กรรมท่าน +${p.karma}` });
    }

    soul.said.push(...out);
    return out;
  },
  freeCrew() { return this.crew.filter(c => !c.at); },

  // ---------- มอบหมายคดี ----------
  assign(soulId, stKey, crewK, intensity) {
    const st = this.stations.find(s => s.def.k === stKey);
    const c = this.crewOf(crewK);
    const si = this.queue.findIndex(s => s.id === soulId);
    if (!st || !c || si < 0 || st.soul || c.at) return false;
    const soul = this.queue.splice(si, 1)[0];
    st.soul = soul;
    st.crewK = crewK;
    st.intensity = clamp(intensity, 1, 5);
    c.path = null;                       // ทิ้งเส้นทางเดินเล่นเดิม แล้วเดินไปประจำสถานีใหม่
    st.progress = 0;
    st.need = 18 + soul.deserved * 8 + st.intensity * 7;
    c.at = st.def.k;
    this.log(`${c.name} รับสำนวน #${String(soul.id).padStart(3, '0')} เข้า${st.def.name} · วาระ ${st.intensity}`, 'act');
    st.verdict = this.judge(st);        // คำตัดสินให้คะแนนทันทีที่ออกหมาย ไม่ใช่ตอนทัณฑ์จบ
    this.applyVerdict(st.verdict, soul);
    return true;
  },

  // ---------- สูตรตัดสิน ----------
  judge(st) {
    const soul = st.soul, c = this.crewOf(st.crewK);
    const tags = st.def.tags;
    const totalW = soul.deeds.reduce((s, d) => s + d.w, 0);
    const hitW = soul.deeds.filter(d => tags.includes(d.s)).reduce((s, d) => s + d.w, 0);
    let tham = tags.length === 0 ? 42 : Math.round(100 * hitW / totalW);
    if (c.panya >= 7) tham = Math.min(100, tham + 6);

    const short = Math.max(0, soul.deserved - st.intensity);
    const over = Math.max(0, st.intensity - soul.deserved);
    // เบาไปกับหนักเกิน ต้องเจ็บพอ ๆ กัน ไม่งั้นซัดวาระ 5 ทุกคดีจะเป็นวิธีเล่นที่ดีที่สุด
    // ซึ่งขัดกับแกนของเกมทั้งเกม
    const ked = clamp(100 - short * 26 - over * 17, 0, 100);
    const rab = clamp(48 + c.rabiab * 5 - this.queue.length * 4, 0, 100);

    const score = Math.round(0.50 * tham + 0.33 * ked + 0.17 * rab);

    // บาปตกที่ยมบาท — กลไกหลักของเกม
    let karma = 0;
    if (over > 0) karma += over * Math.max(1.2, 5 * (1 - c.metta / 25));
    if (tham < 40) karma += 4;                       // ลงทัณฑ์ผิดฝาผิดตัว
    if (c.k === 'plerng' && Math.random() < 0.35) {  // เพลิงชอบบวกเอง
      karma += 3; this.log('เพลิงบวกวาระให้เองอีกนิด "เดี๋ยวมันไม่จำ"', 'bad');
    }
    karma = Math.round(karma * 10) / 10;

    const coin = Math.round(BAL.coinPerCase * (score / 100) * (0.7 + soul.deserved * 0.12));
    return { tham, ked, rab, score, karma, coin, short, over };
  },

  /** ผลของคำตัดสิน — คะแนน กรรม บารมี และเสียงจากพ่อ (เกิดทันทีที่ออกหมาย) */
  applyVerdict(r, soul) {
    this.karma = clamp(this.karma + r.karma, 0, 100);
    this.order = clamp(this.order + (r.score - 55) / 12, 0, 100);
    this.casesDone++; this.scoreSum += r.score;
    if (this.casesDone % MOB.spawnEvery === 0) this.spawnMob();
    this.powers.forEach(p => { if (p.cd > 0) p.cd--; });

    const tag = r.score >= 78 ? 'good' : r.score >= 50 ? '' : 'bad';
    this.log(`คำตัดสิน #${String(soul.id).padStart(3, '0')} — ธรรม ${r.tham} · เข็ด ${r.ked} · รวม ${r.score}`, tag);
    if (r.over > 0) this.log(`  ↳ เกินกรรมไป ${r.over} วาระ · กรรมตกที่ท่าน +${r.karma}`, 'bad');
    if (r.short > 0) this.log('  ↳ เบาไป วิญญาณยังไม่สำนึก จดไว้ในทะเบียนกลับมาใหม่', 'bad');
    if (r.tham < 40) this.log('  ↳ ทัณฑ์ไม่ตรงชนิดกรรมของเขา', 'bad');

    // ลงทัณฑ์เกินกรรมตั้งแต่สองวาระขึ้นไป = พ่อหักบารมีเสมอ ต่อให้คะแนนรวมยังสวย
    // นี่คือข้อเดียวที่ท่านสั่งไว้ตั้งแต่วันแรก
    r.stars = starsOf(r.score);
    // ลงทัณฑ์เกินกรรมตั้งแต่สองวาระ = พ่อหักบารมีเสมอ ต่อให้คะแนนรวมยังสวย
    if (r.over >= 2 && r.score >= 50) { r.boss = 'cruel'; r.stars = Math.min(r.stars, 2); }
    else if (r.score < 35)  r.boss = 'terrible';
    else if (r.score < 50)  r.boss = 'bad';
    else if (r.score >= 82) r.boss = 'great';
    else                    r.boss = 'ok';

    if (r.stars === 0) this.fireball('คำตัดสินนี้ไม่มีดาวสักดวง');
    else if (r.boss === 'cruel') this.fireball('เกินกรรมไปสองวาระ');
    else if (r.stars <= 1) { this.hp -= 10; this.log('พญายมส่ายหน้า — บารมีหายไป 10', 'bad'); }
    else if (r.stars === 5) {
      this.star5++;
      this.hp = Math.min(this.hpMax, this.hp + BAL.hpGoodHeal);
      this.coin += 60;
      this.log(`⭐⭐⭐⭐⭐ ห้าดาว! (${this.star5} ครั้งแล้ว) +60 เบี้ยกรรม`, 'good');
      this.checkLevel();
    } else if (r.stars === 4) this.coin += 25;

    this.hp = clamp(this.hp, 0, this.hpMax);
    this.pendingVerdict = { ...r, who: soul.who, id: soul.id };
    this.checkEnd();
  },

  finish(st) {
    const soul = st.soul, c = this.crewOf(st.crewK);
    const r = st.verdict || this.judge(st);
    this.coin += r.coin;
    this.log(`ทัณฑ์ของ ${soul.who} ครบวาระแล้ว · +${r.coin} เบี้ยกรรม`, 'good');
    // เก็บสำนวนที่ปิดแล้วไว้ให้กดดูเฉลยย้อนหลังได้ในแผงข้อมูล (เก็บ 12 คดีล่าสุดพอ)
    this.closed.unshift({ soul, verdict: r, stK: st.def.k, crewK: st.crewK,
                          intensity: st.intensity, tick: this.tick });
    if (this.closed.length > 12) this.closed.pop();
    st.soul = null; st.progress = 0; st.crewK = null; st.verdict = null;
    if (c) { c.at = null; c.path = null; }   // ออกเวรแล้วกลับไปเดินเล่นที่จุดประจำของตัวเอง
  },

  // ---------- หนึ่งวาระ ----------
  step() {
    if (this.over) return;
    this.tick++;

    // วิญญาณมาใหม่
    if (--this.nextArrive <= 0) { this.spawnSoul(); this.nextArrive = BAL.arriveEvery; }
    this.queue.forEach(s => s.waited++);

    // สถานีทำงาน
    let hasSala = false;
    for (const st of this.stations) {
      if (st.def.k === 'sala') hasSala = true;
      if (!st.soul) continue;
      const c = this.crewOf(st.crewK);
      if (this.fuel < st.def.fuel) {
        if (this.tick % 6 === 0) this.log(`🔥 ฟืนหมด ${st.def.name} หยุดทำงาน`, 'bad');
        continue;
      }
      this.fuel = Math.max(0, this.fuel - st.def.fuel);
      const mf = 0.55 + 0.45 * (c.morale / 100);
      st.progress += (c.raeng * 0.55 + st.def.pow * 0.9) * mf;
      c.morale = Math.max(0, c.morale - BAL.moraleDrain);
      if (st.progress >= st.need) this.finish(st);
    }

    // พักฟื้นกำลังใจ
    const tea = this.stations.some(s => s.def.k === 'tea');
    for (const c of this.crew) {
      if (!c.at) c.morale = Math.min(100, c.morale + (tea ? BAL.moraleRest * 1.0 + BAL.moraleRestTea * 0.5 : BAL.moraleRest));
    }

    // เปรตกัดกินระเบียบไปเรื่อย ๆ ถ้าไม่ไปปราบ
    if (this.mobs.length) {
      this.order = clamp(this.order - MOB.drain * this.mobs.length, 0, 100);
      // วาล์วกันตาย: มีเปรตอยู่ · ลูกไฟหมด · บนแผนที่ก็ไม่มี → หย่อนให้หนึ่งลูก
      if (this.powerOf('roar').ammo === 0 && !this.items.some(it => it.k === 'fire')) this.dropItem('fire');
    }

    // ของตกบนแผนที่เป็นระยะ (ไม่ให้เกินสามชิ้น จะได้ต้องเลือกว่าจะเดินไปเก็บอันไหนก่อน)
    if (this.tick % 18 === 0 && this.items.length < 3) {
      const need = this.hp < this.hpMax * 0.55 ? 'health'
                 : this.fuel < 18 ? 'fuel'
                 : pick(['fire', 'fire', 'mirror', 'health', 'fuel', this.powerOf('hypno').max ? 'hypno' : 'fire']);
      this.dropItem(need);
    }

    // ระเบียบ
    const over = Math.max(0, this.queue.length - BAL.queueMax);
    if (over > 0) this.order = clamp(this.order - BAL.orderDrainPerOver * over, 0, 100);
    else if (hasSala) this.order = clamp(this.order + BAL.orderGainSala, 0, 100);

    // ค่าแรง
    if (--this.nextPay <= 0) {
      const total = this.crew.reduce((s, c) => s + c.pay, 0) + (this.guard ? GUARD.pay : 0);
      this.coin -= total;
      this.log(`💸 จ่ายค่าแรงยมทูต ${this.crew.length} คน — ${total} เบี้ยกรรม`);
      this.nextPay = BAL.payEvery;
    }

    // เหตุการณ์
    if (--this.nextEvent <= 0) {
      const ev = pick(EVENTS);
      this.log(`【${ev.title}】${ev.text}`, 'event');
      ev.apply(this);
      this.pendingEvent = ev;
      this.nextEvent = BAL.eventEvery;
    }

    // พ่อตรวจ
    if (--this.nextKpi <= 0) { this.kpi(); this.nextKpi = BAL.kpiEvery; }

    this.checkEnd();
    this.onChange();
  },

  kpi() {
    const avg = this.casesDone ? Math.round(this.scoreSum / this.casesDone) : 0;
    const pass = this.order >= 55 && avg >= 62;
    if (pass) {
      this.kpiPassed++;
      this.coin += 150;
      this.log(`📜 ตรวจการรอบที่ ${this.kpiPassed} — ผ่าน (ระเบียบ ${Math.round(this.order)} · คะแนนเฉลี่ย ${avg}) +150 เบี้ย`, 'good');
    } else {
      this.order = clamp(this.order - 10, 0, 100);
      this.log(`📜 ตรวจการ — ไม่ผ่าน (ระเบียบ ${Math.round(this.order)} · คะแนนเฉลี่ย ${avg}) ระเบียบถูกหัก 10`, 'bad');
    }
    this.pendingKpi = { pass, avg };
  },

  checkEnd() {
    if (this.hp <= 0) this.over = {
      k: 'hp', title: 'พ่อไม่ให้โอกาสอีกแล้ว',
      text: 'คำตัดสินที่พลาดสะสมจนพญายมไม่เหลืออะไรจะพูด ท่านเรียกนิรามารับตราคืนจากมือเจ้าต่อหน้าทุกคน โดยไม่มองหน้าเจ้าเลยสักครั้ง',
    };
    else if (this.karma >= 100) this.over = {
      k: 'karma', title: 'บาปตกที่ยมบาท',
      text: 'กรรมที่ท่านลงเกินไปทีละนิด สะสมจนเต็มบัญชีของท่านเอง เช้าวันหนึ่งชื่อของท่านไปโผล่อยู่ในคิว — สำนวนที่หนาที่สุดที่โซนนี้เคยรับ',
    };
    else if (this.order <= 0) this.over = {
      k: 'order', title: 'ถูกเรียกกลับ',
      text: 'คิวล้นจนวิญญาณเดินกลับขึ้นไปเองได้ พญายมส่งคนมารับตำแหน่งคืนโดยไม่พูดอะไรสักคำ',
    };
    else if (this.coin <= -300) this.over = {
      k: 'coin', title: 'นรกล้มละลาย',
      text: 'ยมทูตไม่ได้ค่าแรงสามวาระติด ทุกคนวางเครื่องมือแล้วเดินออกไปพร้อมกัน',
    };
    // เดิมจบที่ 3 รอบ ซึ่งสั้นเกินกว่าที่ระบบเลเวล/เปรต/ของสะสมจะได้ทำงาน
    // (จำลองแล้วผู้เล่นเก่งจบเกมที่เลเวล 1.4 โดยแทบไม่ได้เลื่อนขั้นเลย)
    else if (this.kpiPassed >= BAL.kpiWin) this.over =
      this.karma < 25 ? {
        k: 'win', title: 'ทายาทบัลลังก์',
        text: 'สามรอบตรวจผ่านหมด กรรมของท่านยังใส พญายมยื่นตราประจำตำแหน่งให้แล้วพูดสั้น ๆ ว่า "ทำต่อไป"',
      } : this.karma < 60 ? {
        k: 'win2', title: 'ผู้คุมที่เก่งเกินไป',
        text: 'โซนนี้เป็นระเบียบที่สุดในนรก ตัวเลขทุกช่องสวยงาม — แต่กรรมในบัญชีของท่านหนากว่าตอนมาถึงมาก พ่อเลื่อนตำแหน่งให้ โดยไม่มองหน้า',
      } : {
        k: 'win3', title: 'ผู้พิพากษาที่มีสำนวนของตัวเอง',
        text: 'ท่านผ่านการตรวจทุกรอบ โซนนี้เดินได้เองแล้ว — คืนนั้นนิราวางแฟ้มบางเล่มหนึ่งไว้บนโต๊ะโดยไม่พูดอะไร ชื่อบนปกคือชื่อของท่าน และมันหนากว่าที่คิดไว้มาก',
      };
  },

  /** ลูกไฟจากพญายม — โดนห้าครั้งบารมีหมด */
  fireball(why) {
    this.hits++;
    this.hp -= this.hpMax / 5;
    this.fxHits.push({ t: Date.now(), x: this.player.x, y: this.player.y });
    this.log(`🔥 ลูกไฟจากบัลลังก์ — ${why} · บารมีเหลือ ${Math.max(0, Math.round(this.hp))} (โดนแล้ว ${this.hits}/5)`, 'bad');
    this.checkEnd();
  },

  checkLevel() {
    const nx = LEVELS[this.level];              // เลเวลถัดไป (index = level เพราะ level เริ่มที่ 1)
    if (!nx || this.star5 < nx.star5) return;
    this.level++;
    if (this.level >= 2) this.powers.forEach(p => { p.max++; p.ammo = p.max; });
    if (this.level >= 3) this.coin += 300;
    if (this.level >= 4) { this.hpMax = 120; this.hp = this.hpMax; this.coin += 500; }
    if (this.level >= 5) this.powers.forEach(p => { p.ammo = p.max; });
    this.log(`🎖️ เลื่อนขั้นเป็น "${nx.name}" — ${nx.bonus}`, 'good');
    this.pendingLevel = nx;
  },

  // ---------- โลกที่เดินได้ ----------
  /** เดินตัวละครทุกตัว เก็บของ ชนเปรต — เดินตามเวลาจริง ไม่ผูกกับวาระ */
  stepWorld(dt) {
    // เดินได้เฉพาะพื้นที่เหยียบได้ — ลาวากับแม่น้ำวิญญาณกันไว้ที่ src/walk.js
    const P = this.player, SP = 0.19 * dt;
    // เซฟเก่า (หรือฉากที่วาดใหม่) อาจทำให้ยืนค้างกลางลาวา — ดันขึ้นฝั่งให้เอง
    if (!canWalk(P.x, P.y)) {
      const p = nearestWalk(P.x, P.y);
      if (p) { P.x = p[0]; P.y = p[1]; P.tx = null; P.path = null; }
    }
    // เดินตามเส้นทางที่ findPath วางไว้ — อ้อมลาวาเองได้ ไม่ไปยืนจ่อกำแพงแล้วค้าง
    if (P.path && P.path.length) {
      const w = P.path[0];
      const dx = w[0] - P.x, dy = w[1] - P.y, d = Math.hypot(dx, dy);
      if (d < 5) {
        P.path.shift();
        if (!P.path.length) { P.path = null; P.tx = null; }
      } else {
        if (!stepTo(P, dx / d * SP, dy / d * SP)) { P.path = null; P.tx = null; }
        P.face = dx < 0 ? -1 : 1;
      }
    } else if (P.tx != null) {
      P.tx = null;
    }
    P.x = clamp(P.x, 40, SCENE.w - 40);
    P.y = clamp(P.y, 60, SCENE.h - 40);

    // ยมทูตเดินเตร็ดเตร่รอบจุดประจำ แล้วพูดตามนิสัยเป็นระยะ
    for (const c of this.crew) {
      const post = c.at ? STATIONS.find(d => d.k === c.at) : null;
      const hx = post ? post.x : c.hx, hy = post ? post.y : c.hy;
      if (c.x == null) { c.x = hx; c.y = hy; c.face = 1; }

      // เดินตามเส้นทางเหมือนตัวเรา — เดิมเดินตรงเข้าหาจุดหมาย พอมีลาวาขวางก็ค้างอยู่ขอบไฟ
      // (เห็นชัดตอนสั่งไปประจำสถานีที่อยู่คนละฝั่งแผนที่ — ยืนนิ่งกันเป็นกอง)
      const onDuty = !!post;
      const roam = onDuty ? 46 : (c.roam ?? 140);       // ว่างงานเดินเล่นกว้าง · เข้าเวรอยู่ติดที่
      const far = Math.hypot(hx - c.x, hy - c.y) > roam * 1.6;
      const sp = (far ? 0.11 : 0.05) * dt;              // กลับเข้าที่เร็วกว่าเดินเล่น

      if (c.path && c.path.length) {
        const w = c.path[0];
        const dx = w[0] - c.x, dy = w[1] - c.y, d = Math.hypot(dx, dy);
        if (d < 5) c.path.shift();
        else {
          if (!stepTo(c, dx / d * sp, dy / d * sp)) c.path = null;
          if (Math.abs(dx) > 1) c.face = dx < 0 ? -1 : 1;
        }
      } else if (c.wait > 0) {
        c.wait -= dt;
      } else {
        // อยู่ไกลบ้าน = กลับเข้าที่ก่อน · อยู่แถวบ้านแล้ว = เดินเล่นรอบ ๆ
        const tx = far ? hx : hx + (Math.random() - 0.5) * roam * 2;
        const ty = far ? hy : hy + (Math.random() - 0.5) * roam;
        const ok = canWalk(tx, ty) ? [tx, ty] : nearestWalk(tx, ty);
        if (ok) c.path = findPath(c.x, c.y, ok[0], ok[1]);
        c.wait = far ? 200 : 700 + Math.random() * 2600;
      }
      if (!c.sayUntil || Date.now() > c.sayUntil + 9000) {
        if (Math.random() < 0.0006 * dt) {
          c.say = pick(c.says); c.sayUntil = Date.now() + 4200;
        }
      }
    }

    // ของบนพื้น — เดินทับแล้วเก็บ
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (Math.hypot(it.x - P.x, it.y - P.y) > 42) continue;
      const def = ITEMS[it.k];
      if (def.hp) this.hp = clamp(this.hp + def.hp, 0, this.hpMax);
      if (def.fuel) this.fuel += def.fuel;
      if (def.power) {
        const p = this.powerOf(def.power);
        p.ammo = Math.min(p.max, p.ammo + 1); p.cd = 0;
      }
      this.log(`🎁 เก็บ${def.name} — ${def.say}`, 'good');
      this.items.splice(i, 1);
    }

    // เปรต — เดินเข้าไปใกล้แล้วปราบด้วยลูกไฟ (ต้องมีกระสุนตวาด)
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (m.wx == null || Math.hypot(m.wx - m.x, m.wy - m.y) < 6) {
        const tx = clamp(m.x + (Math.random() - 0.5) * 300, 60, SCENE.w - 60);
        const ty = clamp(m.y + (Math.random() - 0.5) * 200, 90, SCENE.h - 60);
        const ok = canWalk(tx, ty) ? [tx, ty] : nearestWalk(tx, ty);
        m.wx = ok ? ok[0] : m.x; m.wy = ok ? ok[1] : m.y;
      }
      const dx = m.wx - m.x, dy = m.wy - m.y, d = Math.hypot(dx, dy) || 1;
      if (!stepTo(m, dx / d * 0.035 * dt, dy / d * 0.035 * dt)) m.wx = null;

      if (Math.hypot(m.x - P.x, m.y - P.y) < MOB.reach) this.strike(i, 'ท่าน');
    }

    // ยักษ์ทวารบาลไล่ปราบเอง
    if (this.guard && this.mobs.length) {
      const G = this.guard, m = this.mobs[0];
      const dx = m.x - G.x, dy = m.y - G.y, d = Math.hypot(dx, dy) || 1;
      stepTo(G, dx / d * 0.075 * dt, dy / d * 0.075 * dt);
      if (d < MOB.reach) this.strike(0, GUARD.name);
    } else if (this.guard) {
      const G = this.guard;                     // ว่างงาน → เดินกลับไปเฝ้าท่าเรือฝั่งขวา
      stepTo(G, (SPOTS.ferry.to[0] - G.x) * 0.0008 * dt, (SPOTS.ferry.to[1] - 90 - G.y) * 0.0008 * dt);
    }
  },

  /** สั่งเดินไปที่จุดหนึ่ง — วางเส้นทางอ้อมลาวา/แม่น้ำให้เอง */
  walkTo(x, y) {
    const P = this.player;
    const t = canWalk(x, y) ? [x, y] : nearestWalk(x, y);
    if (!t) return false;
    const path = findPath(P.x, P.y, t[0], t[1]);
    if (!path || !path.length) return false;
    P.tx = t[0]; P.ty = t[1]; P.path = path;
    return true;
  },

  /** เปรตที่อยู่ใกล้ตัวเราที่สุด */
  nearestMob() {
    const P = this.player;
    let bi = -1, bd = Infinity;
    this.mobs.forEach((m, i) => {
      const d = Math.hypot(m.x - P.x, m.y - P.y);
      if (d < bd) { bd = d; bi = i; }
    });
    return bi < 0 ? null : { i: bi, m: this.mobs[bi], d: bd };
  },

  /** ปุ่มฟาด (และปุ่มเว้นวรรค) — อยู่ในระยะก็ฟาดเลย ไกลก็เดินเข้าไปหาก่อน */
  attack() {
    const n = this.nearestMob();
    if (!n) { this.log('ยังไม่มีเปรตในโซนตอนนี้', 'event'); return false; }
    if (n.d <= MOB.reach) return this.strike(n.i, 'ท่าน');
    if (this.walkTo(n.m.x, n.m.y)) {
      this.log('เดินเข้าไปหาเปรต — ถึงตัวแล้วจะฟาดให้เอง', 'act');
      return true;
    }
    this.log('เปรตตนนั้นอยู่ฝั่งที่เดินไปไม่ถึง — รอให้มันเดินเข้ามาก่อน', 'bad');
    return false;
  },

  /** ฟาดเปรตตนที่ i — คืน true เมื่อฟาดออกจริง */
  strike(i, by) {
    const m = this.mobs[i];
    if (!m) return false;
    if (m.cool && Date.now() < m.cool) return false;
    const fire = this.powerOf('roar');
    if (by === 'ท่าน') {
      if (fire.ammo <= 0) {
        // เตือนซ้ำได้ทุก 4 วินาที — เดิมเตือนครั้งเดียวต่อเปรตหนึ่งตน เลยดูเหมือนเกมไม่ตอบสนอง
        if (!this.noAmmoAt || Date.now() - this.noAmmoAt > 4000) {
          this.noAmmoAt = Date.now();
          this.log('🔥 ลูกไฟหมด ฟาดไม่ออก — เดินไปเก็บลูกไฟที่ตกอยู่บนแผนที่ก่อน', 'bad');
        }
        return false;
      }
      fire.ammo--;
    }
    m.hp--; m.cool = Date.now() + 600;
    if (by === 'ท่าน') {
      this.swingUntil = Date.now() + 480;                   // ให้ scene.js สลับไปท่าฟาด
      this.player.face = m.x < this.player.x ? -1 : 1;      // หันหน้าไปทางที่ขว้าง
    }
    this.fxHits.push({ t: Date.now(), x: m.x, y: m.y });
    if (m.hp > 0) { this.log(`⚔️ ${by}ฟาดเปรตเข้าเต็ม ๆ — มันยังไม่ล้ม`, 'act'); return true; }
    this.mobs.splice(i, 1);
    this.coin += MOB.bounty;
    this.order = clamp(this.order + 3, 0, 100);
    this.log(`💥 ${by}ปราบ${MOB.kinds[m.kind ?? 0].name}ได้หนึ่งตน +${MOB.bounty} เบี้ยกรรม · ระเบียบ +3`, 'good');
    return true;
  },

  dropItem(k) {
    const spot = pick(ITEM_SPOTS);
    if (this.items.some(it => it.x === spot[0] && it.y === spot[1])) return;
    this.items.push({ k, x: spot[0], y: spot[1] });
  },

  spawnMob() {
    const side = Math.random() < 0.5 ? 130 : SCENE.w - 130;
    const y = 200 + Math.random() * 300;
    // ต้องโผล่บนพื้นที่เดินถึง ไม่งั้นท่านเดินไปฟาดไม่ได้ ระเบียบก็ตกไปเรื่อย ๆ
    const p = nearestWalk(side, y) || [side, y];
    const kind = Math.floor(Math.random() * MOB.kinds.length);
    this.mobs.push({ x: p[0], y: p[1], hp: MOB.hp, kind });
    // ทิ้งลูกไฟให้ด้วยหนึ่งลูกเสมอ — มีเปรตแต่ไม่มีอะไรฟาดคือทางตัน ไม่ใช่ความยาก
    if (!this.items.some(it => it.k === 'fire')) this.dropItem('fire');
    this.log(`👹 ${MOB.kinds[kind].name}ขึ้นมาจากรอยแยก — ปล่อยไว้ระเบียบจะตกเรื่อย ๆ`, 'event');
  },

  hireGuard() {
    if (this.guard || this.coin < GUARD.hire) return false;
    this.coin -= GUARD.hire;
    this.guard = { x: SPOTS.ferry.to[0], y: SPOTS.ferry.to[1] - 90 };
    this.log(`🛡️ จ้าง${GUARD.name}แล้ว ${GUARD.line}`, 'good');
    return true;
  },

  buy(kind, n = 1) {
    if (kind === 'fuel') {
      const cost = BAL.fuelPrice * n * 10;
      if (this.coin < cost) return false;
      this.coin -= cost; this.fuel += n * 10;
      this.log(`ซื้อฟืน ${n * 10} ดุ้น — ${cost} เบี้ยกรรม`);
      return true;
    }
    return false;
  },

  build(k) {
    const def = STATIONS.find(s => s.k === k);
    if (!def || this.coin < def.cost) return false;
    if (this.stations.some(s => s.def.k === k)) return false;
    this.coin -= def.cost;
    this.stations.push(mkStation(k));
    this.log(`🏗️ สร้าง${def.name}เสร็จ`, 'good');
    return true;
  },

  hire(k) {
    const def = CREW.find(c => c.k === k);
    if (!def || this.crew.some(c => c.k === k) || this.coin < def.hire) return false;
    this.coin -= def.hire;
    this.crew.push(mkCrew(def));
    this.log(`🤝 ${def.name} เข้าประจำการ ${def.line}`, 'good');
    return true;
  },
};

/** ---------- เซฟลงเครื่อง ----------
 *  เก็บเฉพาะ "สิ่งที่เปลี่ยนได้" ไม่เก็บค่านิยามจาก data.js
 *  ตอนโหลดจึงเอาค่านิยามล่าสุดมาประกอบใหม่ — แก้สมดุลใน data.js แล้วเซฟเก่ายังใช้ได้ */
const SAVE_KEY = 'avegee.save.v1';

API.snapshot = function () {
  return {
    v: 1, at: Date.now(),
    tick: this.tick, coin: this.coin, fuel: this.fuel, order: this.order,
    karma: this.karma, hp: this.hp, hpMax: this.hpMax, hits: this.hits,
    star5: this.star5, level: this.level, casesDone: this.casesDone, scoreSum: this.scoreSum,
    kpiPassed: this.kpiPassed, nextArrive: this.nextArrive, nextEvent: this.nextEvent,
    nextPay: this.nextPay, nextKpi: this.nextKpi,
    seq: SEQ,
    powers: this.powers.map(p => ({ k: p.k, cd: p.cd, ammo: p.ammo, max: p.max })),
    crew: this.crew.map(c => ({ k: c.k, morale: c.morale, at: c.at, x: c.x, y: c.y })),
    stations: this.stations.map(st => ({
      k: st.def.k, crewK: st.crewK, intensity: st.intensity,
      progress: st.progress, need: st.need, soul: st.soul, verdict: st.verdict,
    })),
    queue: this.queue, items: this.items, mobs: this.mobs,
    guard: this.guard, player: this.player, closed: this.closed,
    logs: this.logs.slice(0, 40),
  };
};

API.save = function () {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.snapshot())); return true; }
  catch { return false; }
};

API.restore = function (d) {
  if (!d || d.v !== 1) return false;
  const keep = ['tick','coin','fuel','order','karma','hp','hpMax','hits','star5','level',
                'casesDone','scoreSum','kpiPassed','nextArrive','nextEvent','nextPay','nextKpi'];
  keep.forEach(k => { if (d[k] != null) this[k] = d[k]; });
  SEQ = d.seq || SEQ;

  this.powers = POWERS.map(p => {
    const sv = (d.powers || []).find(x => x.k === p.k) || {};
    return { ...p, cd: sv.cd || 0, ammo: sv.ammo ?? 0, max: sv.max ?? 2 };
  });
  this.crew = (d.crew || []).map(sv => {
    const def = CREW.find(c => c.k === sv.k);
    return def ? { ...mkCrew(def), ...sv } : null;
  }).filter(Boolean);
  this.stations = (d.stations || []).map(sv => {
    const st = mkStation(sv.k);
    if (!st.def) return null;
    Object.assign(st, { crewK: sv.crewK, intensity: sv.intensity, progress: sv.progress,
                        need: sv.need, soul: sv.soul, verdict: sv.verdict });
    return st;
  }).filter(Boolean);
  this.queue = d.queue || [];
  this.items = d.items || [];
  this.mobs = d.mobs || [];
  this.guard = d.guard || null;
  if (d.player) this.player = d.player;
  this.logs = d.logs || [];
  this.closed = d.closed || [];
  this.over = null;
  this.log(`💾 โหลดเกมที่บันทึกไว้ — วาระที่ ${this.tick} · ปิดคดีแล้ว ${this.casesDone}`, 'event');
  return true;
};

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch { return null; }
}
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch {}
}

export { SINS, clamp };
