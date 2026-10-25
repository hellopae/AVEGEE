// P3/A5 — every verdict has an authority scene; five-star praise and red-streak rebukes retain their original lines
// (the same condition that counts toward DAD.redsToCome, so a rebuke scene always precedes the escalating punishment).
// Pure data/logic: no DOM. The scene object is built once in game.applyVerdict and saved, so a reload shows the same words.
import { VERDICT_LINES, authorityOf } from './data.js';

/** Stable art slots. All four zones now have their own praise/rebuke pair (zone 1: Codex 22 Oct, zones 2-4: Codex 23 Oct round two,
 *  inspected in P9). The files keep Codex's `scold` name; the scene kind is `blame`. A future redraw only overwrites the file. */
export const VERDICT_ART = {
  th:{ praise:'img/head-th-praise-cutscene-v1.png', blame:'img/head-th-scold-cutscene-v1.png' },
  asia:{ praise:'img/head-asia-praise-cutscene-v1.png', blame:'img/head-asia-scold-cutscene-v1.png' },
  west:{ praise:'img/head-west-praise-cutscene-v1.png', blame:'img/head-west-scold-cutscene-v1.png' },
  cyberhell:{ praise:'img/head-cyberhell-praise-cutscene-v1.png', blame:'img/head-cyberhell-scold-cutscene-v1.png' },
};
export const verdictSceneImage = (zone, kind) => (VERDICT_ART[zone] || VERDICT_ART.th)[kind];

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const needs = (text, vars) => [...text.matchAll(/\{(\w+)\}/g)].every(m => vars[m[1]]);

/** Chooses lines whose variables can all be filled; lines with no variables are always eligible. */
function chooseLine(pool, vars, rng) {
  const ok = pool.filter(l => needs(l, vars));
  const list = ok.length ? ok : pool.filter(l => !/\{\w+\}/.test(l));
  return fill(list[Math.floor(rng() * list.length)] || '', vars);
}

/** step = 1..3: how many red verdicts in a row this one made (3 = the head comes down himself). Ignored for praise. */
export function buildVerdictScene({ kind, zone, step = 1, who = '', station = '', reward = '', stars = 0, score = 0,
  tham = 0, ked = 0, id = null, rng = Math.random }) {
  const L = VERDICT_LINES[zone] || VERDICT_LINES.th;
  const vars = { soul:who || '', station:station || '', reward:reward || '' };
  const s = Math.min(3, Math.max(1, step | 0 || 1));
  let title, pool;
  if (kind === 'praise') { title = L.title.praise; pool = L.praise; }
  else {
    title = Array.isArray(L.title.blame) ? L.title.blame[s - 1] : L.title.blame;
    pool = Array.isArray(L.blame[0]) ? L.blame[s - 1] : L.blame;   // th has one pool per step, other zones a single pool
  }
  return {
    kind, zone, step:kind === 'praise' ? 0 : s, id, title,
    speaker:authorityOf(zone).title,
    line:chooseLine(pool, vars, rng),
    reward:kind === 'praise' && reward ? fill(L.reward, vars) : null,
    stars, score, tham, ked,
  };
}

/** Fill the ordinary grades P3 did not cover. Presentation only: all effects
 * have already been applied by game.applyVerdict. No red-streak escalation. */
export function buildVerdictReview({zone,verdict:v,who='',station='',id=null}) {
  const critical=['cruel','bad','terrible'].includes(v.boss);
  const lines={
    great:'"เจ้าพิจารณาได้ดีแล้ว รักษาความรอบคอบนี้ไว้ในคดีต่อไป"',
    ok:'"พอใช้ได้ แต่ยังต้องชั่งกรรมให้รอบคอบกว่านี้"',
    cruel:'"เจ้าให้ทัณฑ์เกินกรรม ส่วนเกินนั้นตกอยู่ที่ตัวเจ้าเอง"',
    bad:'"กลับไปอ่านสำนวนให้ครบ ก่อนประทับตราคดีต่อไป"',
    terrible:'"คำตัดสินนี้ทำให้ผู้ที่เจ็บมาแล้วต้องเจ็บซ้ำ"',
  };
  return {kind:critical?'blame':'praise',zone,step:0,id,
    title:`${authorityOf(zone).title}ให้ความเห็น`,speaker:authorityOf(zone).title,
    line:lines[v.boss]||lines.ok,reason:v.reason||null,
    reward:v.stars===4?'ได้รับ เบี้ยกรรม +25':null,
    stars:v.stars,score:v.score,tham:v.tham,ked:v.ked};
}
