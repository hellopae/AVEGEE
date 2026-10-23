// The traveling party is explicit: ordinary border patrols retain their selected team.
// Retain the export name for existing Nira animation callers; expeditions also include the guide.
export const isFrontierDuoBattle = battle => battle?.expeditionParty === true;

/** P9: the four v2 combat sheets (23 Oct Codex round): every row is drawn facing RIGHT and every pose keeps >= 8 px of clear margin
 *  inside its cell. A zone listed here draws `...-sheet-v2.webp`, needs no ally mirror in any pose and no neighbour-leak strip.
 *  A zone that is not listed (a future redraw that fails inspection) keeps the v1 sheet with the old mirror / strip behaviour. */
export const NIRA_SHEETS_V2 = Object.freeze(['th','asia','west','cyberhell']);
const niraZone = zone => ['th','asia','west','cyberhell'].includes(zone) ? zone : 'th';
export const niraSheetIsV2 = zone => NIRA_SHEETS_V2.includes(niraZone(zone));
export const niraCombatSheet = zone => `img/nira-combat/nira-${niraZone(zone)}-sheet-${niraSheetIsV2(zone) ? 'v2' : 'v1'}.webp`;
/** True when the pose is drawn facing the enemy (right) and must opt out of the squad's ally mirror (.face-native).
 *  v2: every pose. v1: only attack/heal (idle and hurt were drawn looking left, so the ally mirror turns them to the enemy). */
export const niraPoseFacesRight = (zone, pose) => niraSheetIsV2(zone) || pose === 'attack' || pose === 'heal';
export const niraHealingCutscene = zone => `img/nira-combat/nira-${['th','asia','west','cyberhell'].includes(zone) ? zone : 'th'}-heal-cutscene-v1.webp`;
export const niraCombatFrame = (pose = 'idle', elapsed = 0) => ({
  row:({idle:0,attack:1,hurt:2,heal:3})[pose] ?? 0,
  column:Math.floor(Math.max(0,elapsed) / 150) % 4,
});
/** O2 I: the 4x4 sheets were cut from one strip, so a pose wider than its cell leaks into the NEXT cell: frame 7 carries the tip of
 *  frame 6's beam on its left edge, hurt-row papers land in the following frame, and so on (seen as a ghost diamond beside Nira).
 *  Pure function over an RGBA buffer (whole sheet, alpha channel only is touched): in every cell, a piece that is not the main
 *  figure, touches the LEFT edge, and continues the previous cell's RIGHT edge (same rows, within 2px) is erased. The previous
 *  cell keeps its own (clipped) piece — only a redraw can restore that — and the art file itself is never modified.
 *  Returns the number of erased pieces. */
export function stripNeighbourLeaks(data, width, height, cols = 4, rows = 4, threshold = 8) {
  const cw = width / cols, ch = height / rows, alphaAt = (x, y) => data[(y * width + x) * 4 + 3];
  let erased = 0;
  for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) {
    const x0 = c * cw, y0 = r * ch, seen = new Uint8Array(cw * ch), pieces = [];
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (seen[y * cw + x] || alphaAt(x0 + x, y0 + y) <= threshold) continue;
      const stack = [[x, y]], px = []; seen[y * cw + x] = 1;
      let touchesLeft = false, minY = ch, maxY = 0;
      while (stack.length) {
        const [cx, cy] = stack.pop(); px.push(cx, cy);
        if (cx === 0) touchesLeft = true;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch || seen[ny * cw + nx] || alphaAt(x0 + nx, y0 + ny) <= threshold) continue;
          seen[ny * cw + nx] = 1; stack.push([nx, ny]);
        }
      }
      pieces.push({ px, touchesLeft, minY, maxY, area: px.length / 2 });
    }
    if (pieces.length < 2) continue;
    const main = pieces.reduce((a, b) => b.area > a.area ? b : a);
    for (const piece of pieces) {
      if (piece === main || !piece.touchesLeft) continue;
      let continues = false;
      for (let y = Math.max(0, piece.minY - 2); y <= Math.min(ch - 1, piece.maxY + 2) && !continues; y++)
        if (alphaAt(x0 - 1, y0 + y) > threshold) continues = true;
      if (!continues) continue;
      for (let i = 0; i < piece.px.length; i += 2) data[((y0 + piece.px[i + 1]) * width + x0 + piece.px[i]) * 4 + 3] = 0;
      erased++;
    }
  }
  return erased;
}
const sheetCache = new Map();
function loadSheet(zone) {
  const source = niraCombatSheet(zone);
  if (!sheetCache.has(source)) sheetCache.set(source,new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      if (!image.naturalWidth || image.naturalWidth % 4 || image.naturalHeight % 4) return resolve(null);
      // Runtime frame extraction keeps the formation's alpha measurement and
      // portrait sizing working with the same single-frame <img> contract.
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth / 4; canvas.height = image.naturalHeight / 4;
      const ctx = canvas.getContext('2d'), frames = [];
      // O2 I: drop the neighbour-cell leaks (see stripNeighbourLeaks) from an in-memory copy; unreadable canvas = use the sheet as is.
      let source = image;
      try {
        const whole = document.createElement('canvas'); whole.width = image.naturalWidth; whole.height = image.naturalHeight;
        const wctx = whole.getContext('2d'); wctx.drawImage(image,0,0);
        const pixels = wctx.getImageData(0,0,whole.width,whole.height);
        if (!niraSheetIsV2(zone) && stripNeighbourLeaks(pixels.data,whole.width,whole.height)) { wctx.putImageData(pixels,0,0); source = whole; }
      } catch {}
      for(let row=0;row<4;row++) {
        frames[row] = [];
        for(let col=0;col<4;col++) {
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(source,col*canvas.width,row*canvas.height,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
          frames[row].push(canvas.toDataURL());
        }
      }
      resolve(frames);
    };
    image.onerror = () => resolve(null); image.src = source;
  }));
  return sheetCache.get(source);
}

/** holdUntil (optional) = () => epoch ms before which the hurt row must not start (a full-screen cutscene card is covering the arena). */
export function mountNiraCombatSprite(stage, zone, battle, phase, refit, holdUntil = null) {
  if (!isFrontierDuoBattle(battle)) return;
  const image = stage.querySelector('.battle-squad [data-crew-pick="nira"] img, .battle-squad [data-crew-pick="global:nira"] img');
  if (!image) return;
  const niraActing = phase === 'you' && battle.helper?.k === 'nira';
  const hurtIds=new Set([...(battle.dmg?.hitActors||[]).map(actor=>actor.id),battle.dmg?.hitActor?.id,battle.dmg?.targetActorId].filter(Boolean));
  const hurt = phase === 'foe' && (hurtIds.has('nira')||hurtIds.has('global:nira')||(battle.dmg?.crew>0&&battle.dmg?.hitActor?.k==='nira'));
  const pose = niraActing ? battle.helper.pose || 'attack' : hurt ? 'hurt' : 'idle';
  const start = Date.now(), reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  loadSheet(zone).then(frames => {
    if (!frames || !image.isConnected) return;
    // O2/P9: facing. v2 sheets are drawn facing RIGHT, toward the enemies, in every row, so every pose opts out of the squad's ally mirror
    // (.face-native). A v1 sheet only had attack/heal facing right; its idle and hurt rows look LEFT, so they keep the ally mirror.
    image.classList.toggle('face-native', niraPoseFacesRight(zone,pose)); image.dataset.niraPose = pose;
    let previous = -1;
    const hold = pose === 'hurt' && typeof holdUntil === 'function' ? Number(holdUntil()) || 0 : 0;
    const tick = () => {
      if (!image.isConnected) return;
      const now = Date.now(), waiting = now < hold;
      const frame = waiting ? niraCombatFrame('idle',reduced ? 0 : now-start) : niraCombatFrame(pose,reduced ? 0 : now-(hold || start));
      const cell = frame.row * 4 + frame.column;
      if (cell !== previous) {
        const first = previous < 0; previous = cell;
        if(first) image.addEventListener('load',() => refit?.(),{once:true});
        image.src = frames[frame.row][frame.column];
      }
      if (!reduced) requestAnimationFrame(tick);
    };
    tick();
  });
}

export function playNiraHealingCutscene(dialog, zone, fallback, duration = 1300, onDone = null) {
  if (!dialog?.open) return;
  dialog.querySelector('.action-cutscene')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'action-cutscene right-facing nira-healing-cutscene';
  overlay.setAttribute('role','status'); overlay.setAttribute('aria-label','นิรา — แสงฟื้นบารมี');
  Object.assign(overlay.style,{display:'grid',placeItems:'center',background:'#10151a'});
  const image = document.createElement('img'); image.src = niraHealingCutscene(zone); image.alt = 'นิราร่ายแสงฟื้นบารมี';
  image.onerror = () => { image.onerror = null; image.src = fallback; };
  Object.assign(image.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',transform:'none',animation:'none'});
  const title = document.createElement('strong'); title.textContent = 'นิรา · แสงฟื้นบารมี';
  Object.assign(title.style,{position:'absolute',bottom:'12%',color:'#f5ffdb',fontSize:'clamp(20px,3vw,40px)',textShadow:'0 2px 12px #0b3221',zIndex:'3'});
  const skip = document.createElement('button'); skip.type='button';skip.textContent='ข้าม / Skip';
  Object.assign(skip.style,{position:'absolute',right:'5%',bottom:'5%',zIndex:'4'});
  overlay.append(image,title,skip); dialog.appendChild(overlay);
  let timer,done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);overlay.remove();onDone?.();};
  overlay.onclick=finish; timer=setTimeout(finish,duration);
  // Keep the full cutscene artwork. Replacing it with a square sprite frame
  // enlarged Nira to fill the screen after the opening frame.
}
