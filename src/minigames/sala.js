import { createPuzzle, ROWS, COLS, COLORS, GOALS } from './document-puzzle.js';

// Viewports select the user's four books without altering the supplied artwork.
const BOOK_X = [84, 457, 830, 1203];
function bookArt(color) {
 const gold = color === 'gold';
 return `<svg viewBox="${gold ? '83 69 226 292' : `${BOOK_X[color]} 68 226 293`}" aria-hidden="true" focusable="false"><image href="img/minigames/sala-${gold ? 'book-gold' : 'books'}.png" width="${gold ? 390 : 1500}" height="438"/></svg>`;
}

export default {
 name:'จัดเอกสาร', icon:'',
 tip:'สลับหนังสือข้างกัน เรียงสีเดียวกัน 3 เล่มขึ้นไป เพื่อรวบรวมหมวดเอกสาร · ชนะได้ระเบียบ +8',
 run(host, { alive = () => true, paused = () => false, onWin, reward = () => 8, seed = Date.now() }) {
  const game = createPuzzle(seed), root = document.createElement('div');
  root.className = 'doc-puzzle';
  root.innerHTML = `
   <div class="doc-summary"><div class="doc-goals" aria-label="เป้าหมายหมวดเอกสาร"></div><div class="doc-reward">ระเบียบ <b>+8</b><small>เมื่อจัดครบทุกหมวด · สูงสุด 100</small></div></div>
   <p class="doc-rule">สลับเล่มข้างกัน · เรียงสีเดียวกัน <b>3 เล่มขึ้นไป</b> = 1 หมวด · รวมต่อเนื่องได้คอมโบ</p>
   <div class="doc-playfield"><div class="doc-scroll"><div class="doc-board" role="group" aria-label="กระดานจัดเอกสาร 5 แถว 14 คอลัมน์"></div></div>
    <div class="doc-paused" hidden><b>พักจัดเอกสาร</b><span>กด “เล่นต่อ” เพื่อกลับมาที่กระดานเดิม</span></div>
    <div class="doc-victory" hidden role="status"><div class="doc-trophy">${bookArt('gold')}</div><h3>จัดเอกสารสำเร็จ</h3><p>ครบทุกหมวดแล้ว!</p><button class="gold" data-claim type="button">รับระเบียบ</button></div>
   </div>
   <div class="doc-footer"><p class="doc-status" role="status">แตะหนังสือ 2 เล่มที่ติดกัน หรือลากสลับได้เลย</p><div class="doc-tools"><span class="doc-moves">0 ครั้ง</span><button data-hint type="button">คำใบ้</button><button data-reset type="button">เริ่มใหม่</button></div></div>`;
  host.replaceChildren(root);
  const board = root.querySelector('.doc-board'), status = root.querySelector('.doc-status');
  const goals = root.querySelector('.doc-goals'), victory = root.querySelector('.doc-victory');
  const hintButton = root.querySelector('[data-hint]'), resetButton = root.querySelector('[data-reset]');
  let selected = null, drag = null, busy = false, disposed = false, claimed = false;
  let pending = null, raf = 0, previous = performance.now(), swallowClick = false;
  const usable = () => !disposed && alive() && !paused();
  const adjacent = (a,b) => Math.abs(Math.floor(a/COLS)-Math.floor(b/COLS)) + Math.abs(a%COLS-b%COLS) === 1;
  const tiles = Array.from({length:ROWS*COLS}, (_,i) => {
   const button = document.createElement('button');
   button.className = 'doc-book'; button.type = 'button'; board.append(button);
   button.onclick = () => {
    if (swallowClick) { swallowClick = false; return; }
    if (!usable() || busy || game.view().won) return;
    if (selected !== null && adjacent(selected,i)) { void swap(selected,i); return; }
    selected = selected === i ? null : i; selection();
   };
   button.onpointerdown = e => {
    if (!usable() || busy || game.view().won || (e.button !== undefined && e.button !== 0)) return;
    swallowClick = false;
    drag = { id:e.pointerId, x:e.clientX, y:e.clientY, index:i };
    button.setPointerCapture?.(e.pointerId);
   };
   button.onpointerup = e => {
    if (!drag || drag.id !== e.pointerId) return;
    const start = drag; drag = null;
    const dx = e.clientX-start.x, dy = e.clientY-start.y;
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 15) return;
    swallowClick = true; e.preventDefault();
    const target = neighbor(start.index, Math.abs(dx)>Math.abs(dy) ? dx>0?'right':'left' : dy>0?'down':'up');
    if (target !== null) void swap(start.index,target);
   };
   button.onpointercancel = () => { drag = null; };
   button.onkeydown = e => {
    const direction = {ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];
    if (!direction || !usable() || busy || game.view().won) return;
    e.preventDefault();
    const target = neighbor(i,direction);
    if (target === null) return;
    if (selected === i) void swap(i,target);
    else tiles[target].focus();
   };
   return button;
  });
  function neighbor(i,direction) {
   const row = Math.floor(i/COLS), col = i%COLS;
   if (direction === 'left') return col>0 ? i-1 : null;
   if (direction === 'right') return col<COLS-1 ? i+1 : null;
   if (direction === 'up') return row>0 ? i-COLS : null;
   return row<ROWS-1 ? i+COLS : null;
  }
  function selection() {
   tiles.forEach((b,i) => { b.classList.toggle('selected',i===selected); b.classList.remove('hint'); b.setAttribute('aria-pressed',String(i===selected)); });
  }
  function paintBoard(values) {
   tiles.forEach((b,i) => {
    b.className = `doc-book c${values[i]}`;
    b.style.removeProperty('transform'); b.style.removeProperty('--merge-x'); b.style.removeProperty('--merge-y');
    b.innerHTML = bookArt(values[i]);
    b.setAttribute('aria-label',`หนังสือ${COLORS[values[i]]} แถว ${Math.floor(i/COLS)+1} คอลัมน์ ${i%COLS+1}`);
   });
   selection();
  }
  function counters(collected) {
   goals.innerHTML = COLORS.map((name,i) => `<div class="doc-goal c${i}${GOALS[i]>0 && collected[i]>=GOALS[i]?' complete':''}"><span class="doc-goal-book">${bookArt(i)}</span><span><small>${name}${GOALS[i]?'':' · โบนัส'}</small><b>${GOALS[i]?`${Math.min(collected[i],GOALS[i])}<em> / ${GOALS[i]}</em>`:collected[i]}</b></span>${GOALS[i]>0 && collected[i]>=GOALS[i]?'<i aria-label="ครบแล้ว">✓</i>':''}</div>`).join('');
  }
  function controls() {
   hintButton.disabled = resetButton.disabled = busy || game.view().won;
   board.setAttribute('aria-busy',String(busy));
   root.querySelector('.doc-moves').textContent = `สลับ ${game.view().moves} ครั้ง`;
  }
  function wait(ms) {
   if (disposed || !alive()) return Promise.resolve(false);
   return new Promise(resolve => { pending = {remaining:ms,resolve}; });
  }
  async function swap(a,b) {
   if (!usable() || busy || game.view().won || !adjacent(a,b)) return;
   busy = true; selected = null; selection(); controls();
   const before = game.view(), result = game.swap(a,b);
   const ar = tiles[a].getBoundingClientRect(), br = tiles[b].getBoundingClientRect();
   tiles[a].style.transform = `translate(${br.x-ar.x}px,${br.y-ar.y}px)`;
   tiles[b].style.transform = `translate(${ar.x-br.x}px,${ar.y-br.y}px)`;
   if (!await wait(170)) return;
   if (!result.ok) {
    tiles[a].style.removeProperty('transform'); tiles[b].style.removeProperty('transform');
    status.textContent = 'ลองสลับคู่อื่น ให้สีเดียวกันเรียง 3 เล่มขึ้นไป · ไม่เสียจำนวนครั้ง';
    if (!await wait(170)) return;
    paintBoard(before.board); busy = false; controls(); return;
   }
   let combo = 0;
   for (const frame of result.frames) {
    paintBoard(frame.board); combo++;
    status.textContent = combo>1 ? `คอมโบ ×${combo} · เอกสารเรียงต่อกัน!` : 'รวมเอกสารเป็นหมวด';
    for (const group of frame.groups) {
     const anchor = group.anchor ?? group.cells[Math.floor(group.cells.length/2)];
     const target = tiles[anchor].getBoundingClientRect();
     for (const index of group.cells) {
      const tile = tiles[index], rect = tile.getBoundingClientRect();
      tile.classList.add('matching');
      if (index === anchor) { tile.innerHTML = bookArt('gold'); tile.classList.add('golden'); }
      else { tile.style.setProperty('--merge-x',`${target.x-rect.x}px`); tile.style.setProperty('--merge-y',`${target.y-rect.y}px`); }
     }
    }
    if (!await wait(480)) return;
    counters(frame.collected);
   }
   const state = game.view();
   paintBoard(state.board); counters(state.collected);
   tiles.forEach(b => b.classList.add('settling'));
   if (!await wait(240)) return;
   tiles.forEach(b => b.classList.remove('settling'));
   busy = false; controls();
   if (state.won) {
    victory.hidden = false;
    root.querySelector('[data-claim]').textContent = `รับระเบียบ +${Math.max(0,Math.min(8,reward()))}`;
    status.textContent = 'จัดครบทุกหมวดแล้ว รับรางวัลเพื่อกลับหอทะเบียนกรรม';
   } else {
    status.textContent = result.reshuffled ? 'จัดกระดานใหม่ให้แล้ว · หมวดที่รวบรวมไว้ยังอยู่ครบ' : 'เก็บหมวดที่ยังไม่ครบต่อได้เลย · สีฟ้ารวมเป็นโบนัส';
   }
  }
  hintButton.onclick = () => {
   if (!usable() || busy || game.view().won) return;
   selected = null; selection();
   const pair = game.hint();
   pair?.forEach(i => tiles[i].classList.add('hint'));
   status.textContent = pair ? 'ลองสลับหนังสือ 2 เล่มที่มีขอบสว่าง' : 'ครบทุกหมวดแล้ว';
  };
  resetButton.onclick = () => {
   if (!usable() || busy || game.view().won) return;
   selected = null; drag = null; const state = game.reset();
   paintBoard(state.board); counters(state.collected); controls();
   status.textContent = 'เริ่มกระดานใหม่แล้ว · ไม่มีเวลาจำกัด';
  };
  root.querySelector('[data-claim]').onclick = () => {
   if (!usable() || busy || claimed || !game.view().won) return;
   claimed = true;
   if (onWin() === false && !disposed) {
    claimed = false; status.textContent = 'ยังบันทึกรางวัลไม่ได้ กรุณาลองรับอีกครั้ง';
   }
  };
  function dispose() {
   if (disposed) return;
   disposed = true; drag = null; cancelAnimationFrame(raf);
   if (pending) { pending.resolve(false); pending = null; }
   root.remove();
  }
  function tick(now) {
   if (disposed) return;
   if (!alive()) { dispose(); return; }
   const dt = Math.max(0,now-previous); previous = now;
   const isPaused = paused(); root.classList.toggle('is-paused',isPaused);
   root.querySelector('.doc-paused').hidden = !isPaused;
   if (!isPaused && pending) {
    pending.remaining -= dt;
    if (pending.remaining <= 0) { const task = pending; pending = null; task.resolve(true); }
   }
   raf = requestAnimationFrame(tick);
  }
  const state = game.view(); paintBoard(state.board); counters(state.collected); controls();
  raf = requestAnimationFrame(tick);
  return dispose;
 }
};
