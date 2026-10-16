// Outside the town, Nira accompanies Yama independently of the selected office team.
export const isFrontierDuoBattle = battle => !!battle &&
  (!!battle.dungeonToken || battle.kind === 'frontier' ||
    !!battle.challenge && battle.sceneBiome === 'cave');

export const niraCombatSheet = zone => `img/nira-combat/nira-${['th','asia','west','cyberhell'].includes(zone) ? zone : 'th'}-sheet-v1.webp`;
export const niraCombatFrame = (pose = 'idle', elapsed = 0) => ({
  row:({idle:0,attack:1,hurt:2,heal:3})[pose] ?? 0,
  column:Math.floor(Math.max(0,elapsed) / 150) % 4,
});
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
      for(let row=0;row<4;row++) {
        frames[row] = [];
        for(let col=0;col<4;col++) {
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(image,col*canvas.width,row*canvas.height,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
          frames[row].push(canvas.toDataURL());
        }
      }
      resolve(frames);
    };
    image.onerror = () => resolve(null); image.src = source;
  }));
  return sheetCache.get(source);
}

export function mountNiraCombatSprite(stage, zone, battle, phase, refit) {
  if (!isFrontierDuoBattle(battle)) return;
  const image = stage.querySelector('.battle-squad [data-crew-pick="nira"] img, .battle-squad [data-crew-pick="global:nira"] img');
  if (!image) return;
  const niraActing = phase === 'you' && battle.helper?.k === 'nira';
  const hurt = phase === 'foe' && (battle.dmg?.hitActors || []).some(actor => actor.k === 'nira');
  const pose = niraActing ? battle.helper.pose || 'attack' : hurt ? 'hurt' : 'idle';
  const start = Date.now(), reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  loadSheet(zone).then(frames => {
    if (!frames || !image.isConnected) return;
    image.classList.add('face-native'); image.dataset.niraPose = pose;
    let previous = -1;
    const tick = () => {
      if (!image.isConnected) return;
      const frame = niraCombatFrame(pose,reduced ? 0 : Date.now()-start);
      if (frame.column !== previous) {
        const first = previous < 0; previous = frame.column;
        if(first) image.addEventListener('load',() => refit?.(),{once:true});
        image.src = frames[frame.row][frame.column];
      }
      if (!reduced) requestAnimationFrame(tick);
    };
    tick();
  });
}

export function playNiraHealingCutscene(dialog, zone, fallback, duration = 1300) {
  if (!dialog?.open) return;
  dialog.querySelector('.action-cutscene')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'action-cutscene right-facing nira-healing-cutscene';
  overlay.setAttribute('role','status'); overlay.setAttribute('aria-label','นิรา — แสงฟื้นบารมี');
  Object.assign(overlay.style,{display:'grid',placeItems:'center',background:'radial-gradient(ellipse at center,rgba(71,153,123,.88),rgba(12,24,34,.97))'});
  const image = document.createElement('img'); image.src = fallback; image.alt = 'นิราร่ายแสงฟื้นบารมี';
  Object.assign(image.style,{position:'relative',width:'min(48vh,400px)',height:'min(48vh,400px)',objectFit:'contain',filter:'drop-shadow(0 0 24px #adffce)',transform:'none',animation:'none'});
  const title = document.createElement('strong'); title.textContent = 'นิรา · แสงฟื้นบารมี';
  Object.assign(title.style,{position:'absolute',bottom:'12%',color:'#f5ffdb',fontSize:'clamp(20px,3vw,40px)',textShadow:'0 2px 12px #0b3221',zIndex:'3'});
  const skip = document.createElement('button'); skip.type='button';skip.textContent='ข้าม / Skip';
  Object.assign(skip.style,{position:'absolute',right:'5%',bottom:'5%',zIndex:'4'});
  overlay.append(image,title,skip); dialog.appendChild(overlay);
  let timer,done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);overlay.remove();};
  overlay.onclick=finish; timer=setTimeout(finish,duration);
  const started=Date.now(),reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  loadSheet(zone).then(frames=>{
    if(!frames||done)return;
    const tick=()=>{
      if(done||!overlay.isConnected)return;
      const frame=niraCombatFrame('heal',reduced?0:Date.now()-started);
      image.src=frames[frame.row][frame.column];
      if(!reduced)requestAnimationFrame(tick);
    };tick();
  });
}
