// game.js — สถานะเกม · วาระ (tick) · สูตรตัดสิน
import { SINS, DEEDS, MERITS, WHO, STATIONS, CREW, BAL, EVENTS } from './data.js';

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const pick = a => a[Math.floor(Math.random() * a.length)];
let SEQ = 1;

export function createGame() {
  const g = {
    tick: 0, coin: BAL.startCoin, fuel: BAL.startFuel,
    order: 72, karma: 0,
    queue: [], logs: [], over: null,
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
function mkSoul() {
  const n = 1 + (Math.random() < 0.45 ? 1 : 0) + (Math.random() < 0.15 ? 1 : 0);
  const deeds = [];
  while (deeds.length < n) {
    const d = pick(DEEDS);
    if (!deeds.some(x => x.t === d.t)) deeds.push(d);
  }
  const merits = Math.random() < 0.55 ? [pick(MERITS)] : [];
  const ws = deeds.map(d => d.w).sort((a, b) => b - a);
  const raw = ws[0] + ws.slice(1).reduce((s, w) => s + w * 0.4, 0);
  const meritSum = merits.reduce((s, m) => s + m.v, 0);
  return {
    id: SEQ++, who: pick(WHO), deeds, merits,
    deserved: clamp(Math.round(raw - meritSum), 1, 5),
    waited: 0,
  };
}

const API = {
  log(text, kind = '') {
    this.logs.unshift({ t: this.tick, text, kind });
    if (this.logs.length > 90) this.logs.pop();
  },

  spawnSoul() {
    if (this.queue.length >= 14) return;
    const s = mkSoul();
    this.queue.push(s);
    this.log(`วิญญาณเข้าคิว — ${s.who} (สำนวน #${String(s.id).padStart(3, '0')})`);
  },

  crewOf(k) { return this.crew.find(c => c.k === k); },
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
    st.progress = 0;
    st.need = 18 + soul.deserved * 8 + st.intensity * 7;
    c.at = st.def.k;
    this.log(`${c.name} รับสำนวน #${String(soul.id).padStart(3, '0')} เข้า${st.def.name} · วาระ ${st.intensity}`, 'act');
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
    const ked = clamp(100 - short * 30 - over * 4, 0, 100);
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

  finish(st) {
    const soul = st.soul, c = this.crewOf(st.crewK);
    const r = this.judge(st);
    this.coin += r.coin;
    this.karma = clamp(this.karma + r.karma, 0, 100);
    this.order = clamp(this.order + (r.score - 55) / 12, 0, 100);
    this.casesDone++; this.scoreSum += r.score;

    const tag = r.score >= 78 ? 'good' : r.score >= 50 ? '' : 'bad';
    this.log(`สำนวน #${String(soul.id).padStart(3, '0')} จบ — ธรรม ${r.tham} · เข็ด ${r.ked} · รวม ${r.score} · +${r.coin} เบี้ย`, tag);
    if (r.over > 0) this.log(`  ↳ เกินกรรมไป ${r.over} วาระ · กรรมตกที่ท่าน +${r.karma}`, 'bad');
    if (r.short > 0) this.log('  ↳ เบาไป วิญญาณยังไม่สำนึก จดไว้ในทะเบียนกลับมาใหม่', 'bad');
    if (r.tham < 40) this.log(`  ↳ ${st.def.name} ไม่ตรงกรรมของเขา`, 'bad');

    st.soul = null; st.progress = 0; st.crewK = null;
    if (c) c.at = null;
    this.lastResult = { ...r, who: soul.who, id: soul.id };
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

    // ระเบียบ
    const over = Math.max(0, this.queue.length - BAL.queueMax);
    if (over > 0) this.order = clamp(this.order - BAL.orderDrainPerOver * over, 0, 100);
    else if (hasSala) this.order = clamp(this.order + BAL.orderGainSala, 0, 100);

    // ค่าแรง
    if (--this.nextPay <= 0) {
      const total = this.crew.reduce((s, c) => s + c.pay, 0);
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
    if (this.karma >= 100) this.over = {
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
    else if (this.kpiPassed >= 3) this.over =
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

export { SINS, clamp };
