import { createPuzzle, ROWS, COLS, COLORS, GOALS } from './document-puzzle.js';
export default {
 name:'จัดเอกสาร', icon:'',
 tip:'เลื่อนทั้งแถวหรือคอลัมน์ จัดหนังสือสีเดียวกันครบ 5 เล่มในแนวตั้ง ให้ได้แดง 1 หมวด เหลือง 3 หมวด ม่วง 2 หมวด และฟ้า 0 หมวด · ชนะได้ระเบียบ +8',
 run(host,{alive,onWin}) {
  const game=createPuzzle(Date.now()),root=document.createElement('div');root.className='doc-puzzle';
  root.innerHTML='<div class="doc-goals" aria-live="polite"></div><p class="doc-rule">สีเดียวกันครบคอลัมน์ = 1 หมวด · แตะหนังสือแล้วใช้ลูกศร หรือลากแถว/คอลัมน์</p><div class="doc-scroll"><div class="doc-board" role="group" aria-label="กระดานจัดเอกสาร"></div></div><div class="doc-tools"><button data-direction="left" aria-label="เลื่อนแถวซ้าย">←</button><button data-direction="right" aria-label="เลื่อนแถวขวา">→</button><button data-direction="up" aria-label="เลื่อนคอลัมน์ขึ้น">↑</button><button data-direction="down" aria-label="เลื่อนคอลัมน์ลง">↓</button><button data-undo>ย้อนกลับ</button><button data-reset>เริ่มใหม่</button><span class="doc-moves"></span></div><p class="doc-status" role="status"></p>';
  host.replaceChildren(root);const board=root.querySelector('.doc-board'),status=root.querySelector('.doc-status');let selected=0,drag=null,done=false;
  const tiles=Array.from({length:ROWS*COLS},(_,i)=>{const b=document.createElement('button');b.type='button';b.className='doc-book';board.append(b);
   b.onclick=()=>{selected=i;paint();};
   b.onpointerdown=e=>{if(done)return;selected=i;drag={id:e.pointerId,x:e.clientX,y:e.clientY,index:i};b.setPointerCapture?.(e.pointerId);paint();};
   b.onpointerup=e=>{if(!drag || drag.id!==e.pointerId)return;const d=drag;drag=null;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;e.preventDefault();selected=d.index;move(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');};
   b.onpointercancel=()=>{drag=null;};b.onkeydown=e=>{const dir={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];if(dir){e.preventDefault();selected=i;move(dir);}};return b;});
  function paint(){const counts=game.counts();root.querySelector('.doc-goals').innerHTML=COLORS.map((name,i)=>`<span class="doc-goal c${i} ${counts[i]===GOALS[i]?'complete':''}"><i></i>${name} <b>${counts[i]} / ${GOALS[i]}</b></span>`).join('');
   tiles.forEach((b,i)=>{b.className=`doc-book c${game.board[i]}${i%COLS===selected%COLS?' selected-col':''}${Math.floor(i/COLS)===Math.floor(selected/COLS)?' selected-row':''}${i===selected?' selected':''}`;b.setAttribute('aria-label',`${COLORS[game.board[i]]} แถว ${Math.floor(i/COLS)+1} คอลัมน์ ${i%COLS+1}`);b.setAttribute('aria-pressed',String(i===selected));b.disabled=done;});
   root.querySelector('.doc-moves').textContent=`เลื่อน ${game.moves()} ครั้ง`;root.querySelector('[data-undo]').disabled=!game.moves();
  }
  function move(direction){if(done || !alive())return;const horizontal=direction==='left'||direction==='right';game.move(horizontal?'row':'column',horizontal?Math.floor(selected/COLS):selected%COLS,direction==='left'||direction==='up'?-1:1);paint();if(game.won()){done=true;onWin();}}
  root.querySelectorAll('[data-direction]').forEach(b=>b.onclick=()=>move(b.dataset.direction));
  root.querySelector('[data-undo]').onclick=()=>{if(!done && alive()){game.undo();paint();}};
  root.querySelector('[data-reset]').onclick=()=>{if(!done && alive()){game.reset();paint();}};
  status.textContent='จัดให้ตรงจำนวนทุกสี ไม่มีเวลาจำกัด';paint();
  return ()=>{done=true;drag=null;root.remove();};
 }
};
