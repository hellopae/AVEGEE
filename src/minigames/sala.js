import { createPuzzle, ROWS, COLS, COLORS, GOALS } from './document-puzzle.js';
import { t } from '../i18n.js';
export default {
 get name() { return t('room.sala.action2'); }, icon:'',
 get tip() { return t('mg.sala.tip'); },
 run(host,{alive,onWin}) {
  const game=createPuzzle(Date.now()),root=document.createElement('div');root.className='doc-puzzle';
  root.innerHTML='<div class="doc-goals" aria-live="polite"></div><p class="doc-rule"></p><div class="doc-scroll"><div class="doc-board" role="group" aria-label=""></div></div><div class="doc-tools"><button data-direction="left" aria-label="">←</button><button data-direction="right" aria-label="">→</button><button data-direction="up" aria-label="">↑</button><button data-direction="down" aria-label="">↓</button><button data-undo></button><button data-reset></button><span class="doc-moves"></span></div><p class="doc-status" role="status"></p>';
  root.querySelector('.doc-rule').textContent=t('mg.sala.rule');root.querySelector('.doc-board').setAttribute('aria-label',t('mg.sala.board'));
  for(const d of ['left','right','up','down'])root.querySelector(`[data-direction="${d}"]`).setAttribute('aria-label',t('mg.sala.'+d));
  root.querySelector('[data-undo]').textContent=t('mg.sala.undo');root.querySelector('[data-reset]').textContent=t('mg.sala.reset');
  host.replaceChildren(root);const board=root.querySelector('.doc-board'),status=root.querySelector('.doc-status');let selected=0,drag=null,done=false;
  const tiles=Array.from({length:ROWS*COLS},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='doc-book';board.append(b);
   b.onclick=()=>{selected=i;paint();};
   b.onpointerdown=e=>{if(done)return;selected=i;drag={id:e.pointerId,x:e.clientX,y:e.clientY,index:i};b.setPointerCapture?.(e.pointerId);paint();};
   b.onpointerup=e=>{if(!drag || drag.id!==e.pointerId)return;const d=drag;drag=null;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;e.preventDefault();selected=d.index;move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');};
   b.onpointercancel=()=>{drag=null;};b.onkeydown=e=>{const dir={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(dir){e.preventDefault();selected=i;move(dir);}};return b;});
  function paint(){const counts=game.counts();root.querySelector('.doc-goals').innerHTML=COLORS.map((name,i)=>`<span class="doc-goal c${i} ${counts[i]===GOALS[i]?'complete':''}"><i></i>${t('mg.sala.color.'+i)} <b>${counts[i]} / ${GOALS[i]}</b></span>`).join('');
   tiles.forEach((b,i)=>{b.className=`doc-book c${game.board[i]}${i%COLS===selected%COLS?' selected-col':''}${Math.floor(i/COLS)===Math.floor(selected/COLS)?' selected-row':''}${i===selected?' selected':''}`;b.setAttribute('aria-label',t('mg.sala.cell',{color:t('mg.sala.color.'+game.board[i]),r:Math.floor(i/COLS)+1,c:i%COLS+1}));b.setAttribute('aria-pressed',String(i===selected));b.disabled=done;});
   root.querySelector('.doc-moves').textContent=t('mg.sala.moves',{n:game.moves()});root.querySelector('[data-undo]').disabled=!game.moves();
  }
  function move(direction){if(done || !alive())return;const horizontal=direction==='left'||direction==='right';game.move(horizontal?'row':'column',horizontal?Math.floor(selected/COLS):selected%COLS,direction==='left'||direction==='up'?-1:1);paint();if(game.won()){done=true;onWin();}}
  root.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>move(b.dataset.direction));
  root.querySelector('[data-undo]').onclick=()=>{if(!done && alive()){game.undo();paint();}};
  root.querySelector('[data-reset]').onclick=()=>{if(!done && alive()){game.reset();paint();}};
  status.textContent=t('mg.sala.status');paint();
  return ()=>{done=true;drag=null;root.remove();};
 }
};
