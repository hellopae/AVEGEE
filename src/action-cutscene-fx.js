// M5 — light-weight motion for the full-screen special-move card.
// One canvas, viewport-capped particles, no filters or shadow blur.
const THEMES = Object.freeze({
  fire:   { a:'#ff6a22', b:'#ffd36a', glyph:'火' },
  ice:    { a:'#79dfff', b:'#e8fbff', glyph:'❄' },
  hypno:  { a:'#a86cff', b:'#f0b7ff', glyph:'◉' },
  heal:   { a:'#61e0a5', b:'#f7e9a5', glyph:'✦' },
  wind:   { a:'#8de6c4', b:'#ecfff8', glyph:'〰' },
  gold:   { a:'#e8b84d', b:'#fff0ae', glyph:'✧' },
  slash:  { a:'#e65c68', b:'#fff3dc', glyph:'╱' },
  club:   { a:'#d18b57', b:'#ffe0a4', glyph:'◆' },
});

const textTheme = s => {
  const v = String(s || '').toLowerCase();
  if (/ice|frost|น้ำแข็ง/.test(v)) return 'ice';
  if (/hyp|mirror|สะกด|กระจก/.test(v)) return 'hypno';
  if (/heal|health|rescue|ฟื้น|รักษา|เติมเลือด/.test(v)) return 'heal';
  if (/wind|ลม|พัด/.test(v)) return 'wind';
  if (/spear|clock|gold|หอก|เวลา/.test(v)) return 'gold';
  if (/club|guard|taan|กระบอง|ทัณฑ์/.test(v)) return 'club';
  if (/slash|dam|sword|ดาบ|ฟัน/.test(v)) return 'slash';
  return 'fire';
};

export function actionCutsceneTheme(key, ultimate = null, crewKind = '') {
  if (ultimate?.name) return textTheme(`${key} ${ultimate.name}`);
  if (crewKind) {
    if (crewKind === 'kan') return 'hypno';
    if (crewKind === 'boon' || crewKind === 'nira') return 'heal';
    if (crewKind === 'plerng') return 'fire';
    if (crewKind === 'taan' || crewKind === 'guard') return 'club';
    return 'slash';
  }
  return textTheme(key);
}

export function actionCutsceneLabel(key, ultimate = null) {
  if (ultimate?.name) return ultimate.name;
  return ({
    fire:'อัคคีพิพากษา', flameCharge:'เพลิงชำระ', ice:'พลังน้ำแข็ง', hypno:'พลังสะกดจิต',
    mirror:'กระจกวิเศษ', windFan:'พัดสายลม', valkyrieSpear:'หอกวาลคีรี',
    cooldownClock:'นาฬิกาหยุดเวลา', guard:'กระบองพิทักษ์', boss:'พลังบอส',
  })[key] || 'ท่าพิเศษ';
}

const raf = fn => typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 16);
const caf = id => typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame(id) : clearTimeout(id);

/** Mount the moving elemental layer. Returns a cleanup function. */
export function mountActionCutsceneFx(host, themeName, { duration = 1300, reduced = false } = {}) {
  const theme = THEMES[themeName] || THEMES.fire;
  host.dataset.cutTheme = themeName in THEMES ? themeName : 'fire';
  host.style.setProperty('--cut-a', theme.a);
  host.style.setProperty('--cut-b', theme.b);
  if (reduced || !host?.appendChild) { host.classList?.add('cutscene-reduced'); return () => {}; }

  const canvas = document.createElement('canvas');
  canvas.className = 'cutscene-fx'; canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha:true });
  let frame = 0, stopped = false, start = 0, w = 0, h = 0, dpr = 1;
  const particles = Array.from({ length:42 }, (_, i) => ({
    x:((i * 47) % 101) / 101, y:((i * 29) % 97) / 97,
    s:1.2 + (i % 5) * .55, v:.035 + (i % 7) * .008, p:i * .73,
  }));

  const size = () => {
    const r = host.getBoundingClientRect?.() || { width:960, height:540 };
    dpr = Math.min(1.5, globalThis.devicePixelRatio || 1);
    w = Math.max(1, Math.min(960, Math.round(r.width * dpr)));
    h = Math.max(1, Math.min(540, Math.round(r.height * dpr)));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  const draw = now => {
    if (stopped || !host.isConnected) return;
    if (!start) start = now;
    const t = Math.min(1, (now - start) / duration), phase = t * Math.PI * 2;
    size(); ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .16 + Math.sin(Math.min(1, t * 3) * Math.PI) * .12;
    ctx.fillStyle = theme.a;
    for (let i = -2; i < 8; i++) {
      const x = ((i / 7 + t * .48) % 1.35) * w - w * .18;
      ctx.save(); ctx.translate(x, h * .5); ctx.rotate(-.24);
      ctx.fillRect(-w * .012, -h, w * .018, h * 2); ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      const drift = themeName === 'ice' ? -p.v : p.v;
      const x = ((p.x + drift * (now - start) / 16) % 1.08) * w;
      const y = (p.y + Math.sin(phase + p.p) * .035) * h;
      ctx.globalAlpha = .22 + .42 * Math.abs(Math.sin(phase * .5 + p.p));
      ctx.fillStyle = (Math.round(p.p) & 1) ? theme.a : theme.b;
      if (themeName === 'slash' || themeName === 'wind') ctx.fillRect(x, y, p.s * 5, Math.max(1, p.s * .55));
      else { ctx.beginPath(); ctx.arc(x, y, p.s, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = .28 * Math.sin(Math.min(1, t * 2) * Math.PI);
    ctx.strokeStyle = theme.b; ctx.lineWidth = Math.max(1, w / 700);
    ctx.beginPath(); ctx.arc(w * .5, h * .52, Math.min(w, h) * (.12 + t * .28), 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (t < 1) frame = raf(draw);
  };
  frame = raf(draw);
  return () => { stopped = true; caf(frame); canvas.remove(); };
}
