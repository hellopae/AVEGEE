import { createPuzzle, ROWS, COLS, GOALS } from './document-puzzle.js';
import { t } from '../i18n.js';

// Viewports select the user's four books without altering the supplied artwork.
const BOOK_X = [84, 457, 830, 1203];
function bookArt(color) {
 const gold = color === 'gold';
 return `<svg viewBox="${gold ? '83 69 226 292' : `${BOOK_X[color]} 68 226 293`}" aria-hidden="true" focusable="false"><image href="img/minigames/sala-${gold ? 'book-gold' : 'books'}.png" width="${gold ? 390 : 1500}" height="438"/></svg>`;
}

export default {
 get name() { return t('room.sala.action2'); }, icon:'',
 get tip() { return t('mg.sala.tip'); },
 run(host, { alive = () => true, paused = () => false, onWin, reward = () => 8, seed = Date.now() }) {
  const COLORS = ['red','yellow','blue','purple'].map(k => t(`doc.${k}`));
  const game = createPuzzle(seed), root = document.createElement('div');
  root.className = 'doc-puzzle';
  root.innerHTML = `
   <div class="doc-summary"><div class="doc-goals" aria-label="${t('doc.goals')}"></div><div class="doc-reward">${t('doc.order')} <b>+8</b><small>${t('doc.cap')}</small></div></div>
   <p class="doc-rule">${t('doc.rule')}</p>
   <div class="doc-playfield"><div class="doc-scroll"><div class="doc-board" role="group" aria-label="${t('doc.board')}"></div></div>
    <div class="doc-paused" hidden><b>${t('doc.pauseTitle')}</b><span>${t('doc.pauseHint')}</span></div>
    <div class="doc-victory" hidden role="status"><div class="doc-trophy">${bookArt('gold')}</div><h3>${t('doc.success')}</h3><p>${t('doc.successHint')}</p><button class="gold" data-claim type="button">${t('doc.claim')}</button></div>
   </div>
   <div class="doc-footer"><p class="doc-status" role="status">${t('doc.initial')}</p><div class="doc-tools"><span class="doc-moves">${t('doc.moves').replace('{n}',0)}</span><button data-hint type="button">${t('doc.hint')}</button><button data-reset type="button">${t('doc.restart')}</button></div></div>`;
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
    b.setAttribute('aria-label',t('doc.bookTile').replace('{color}',COLORS[values[i]]).replace('{row}',Math.floor(i/COLS)+1).replace('{col}',i%COLS+1));
   });
   selection();
  }
  function counters(collected) {
   goals.innerHTML = COLORS.map((name,i) => `<div class="doc-goal c${i}${GOALS[i]>0 && collected[i]>=GOALS[i]?' complete':''}"><span class="doc-goal-book">${bookArt(i)}</span><span><small>${name}${GOALS[i]?'':` · ${t('doc.bonus')}`}</small><b>${GOALS[i]?`${Math.min(collected[i],GOALS[i])}<em> / ${GOALS[i]}</em>`:collected[i]}</b></span>${GOALS[i]>0 && collected[i]>=GOALS[i]?`<i aria-label="${t('doc.complete')}">✓</i>`:''}</div>`).join('');
  }
  function controls() {
   hintButton.disabled = resetButton.disabled = busy || game.view().won;
   board.setAttribute('aria-busy',String(busy));
   root.querySelector('.doc-moves').textContent = t('doc.moves').replace('{n}',game.view().moves);
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
    status.textContent = t('doc.invalid');
    if (!await wait(170)) return;
    paintBoard(before.board); busy = false; controls(); return;
   }
   let combo = 0;
   for (const frame of result.frames) {
    paintBoard(frame.board); combo++;
    status.textContent = combo>1 ? t('doc.combo').replace('{n}',combo) : t('doc.match');
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
    root.querySelector('[data-claim]').textContent = `${t('doc.claim')} +${Math.max(0,Math.min(8,reward()))}`;
    status.textContent = t('doc.winStatus');
   } else {
    status.textContent = result.reshuffled ? t('doc.reshuffled') : t('doc.continue');
   }
  }
  hintButton.onclick = () => {
   if (!usable() || busy || game.view().won) return;
   selected = null; selection();
   const pair = game.hint();
   pair?.forEach(i => tiles[i].classList.add('hint'));
   status.textContent = pair ? t('doc.hintStatus') : t('doc.successHint');
  };
  resetButton.onclick = () => {
   if (!usable() || busy || game.view().won) return;
   selected = null; drag = null; const state = game.reset();
   paintBoard(state.board); counters(state.collected); controls();
   status.textContent = t('doc.restartStatus');
  };
  root.querySelector('[data-claim]').onclick = () => {
   if (!usable() || busy || claimed || !game.view().won) return;
   claimed = true;
   if (onWin() === false && !disposed) {
    claimed = false; status.textContent = t('doc.saveFailed');
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
