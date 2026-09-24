// src/minigames/sala.js — หอทะเบียนกรรม: "เรียงสำนวน" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 1A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
// โทนสงบ — ไม่มีเอฟเฟกต์กระแทก/สั่นจอ แค่แถบเวลาไหลกับสีถูก-ผิดธรรมดา
import { SINS } from '../data.js';
import { el, shuffle, lerpByLevel, rafLoop } from './util.js';

const CATS = Object.keys(SINS);
const NEED = 5;

export default {
  name: 'เรียงสำนวน',
  icon: '📜',
  tip: 'ม้วนสำนวนลอยขึ้นมาทีละชุด — แตะม้วนที่ตรงกับ "หมวดที่เรียกหา" ก่อนหมดเวลาแถบ ให้ครบ 5 ม้วน',
  run(host, { level, alive, onWin, onLose }) {
    const per = lerpByLevel(level, 3200, 2000); // ms ต่อรอบ — ขั้นสูงเวลาต่อรอบสั้นลง
    let correct = 0, target = null, startAt = 0, done = false;

    const wrap = el('div', 'mg-sala');
    const head = el('div', 'mg-sala-head');
    const barWrap = el('div', 'mg-bar'); const bar = el('div', 'mg-bar-fill'); barWrap.appendChild(bar);
    const row = el('div', 'mg-sala-row');
    const count = el('div', 'mg-sala-count');
    wrap.append(head, barWrap, row, count);
    host.appendChild(wrap);

    function newRound() {
      target = CATS[Math.floor(Math.random() * CATS.length)];
      head.innerHTML = `เรียกหา: <b style="color:${SINS[target].color}">${SINS[target].name}</b>`;
      head.dataset.target = target;   // ไว้ให้ QA/ทดสอบอ่านค่าปัจจุบันได้ตรง ๆ ไม่ต้องเทียบสี
      const others = shuffle(CATS.filter(c => c !== target)).slice(0, 3);
      const opts = shuffle([target, ...others]);
      row.innerHTML = '';
      opts.forEach(c => {
        const b = el('button', 'mg-scroll', `📜<span>${SINS[c].name}</span>`);
        b.style.setProperty('--c', SINS[c].color);
        b.dataset.cat = c;
        b.onclick = () => pick(c);
        row.appendChild(b);
      });
      count.textContent = `เก็บแล้ว ${correct}/${NEED}`;
      startAt = performance.now();
    }

    function pick(c) {
      if (done) return;
      if (c === target) {
        correct++;
        if (correct >= NEED) { finish(true); return; }
        newRound();
      } else finish(false);
    }

    function finish(won) {
      if (done) return;
      done = true; stop();
      won ? onWin() : onLose();
    }

    newRound();
    const stop = rafLoop(now => {
      const p = Math.min(1, (now - startAt) / per);
      bar.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
