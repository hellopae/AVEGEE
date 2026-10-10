import { t } from './i18n.js';
import { soulPortrait } from './soul-portraits.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const gateArrivals = g => (g.sentences || []).filter(x => x.zone === g.zone && x.stage === 'gate');
export function gateKarma(entry) {
  if (entry.checked && Number.isFinite(entry.karmaLeft)) return Math.max(0,entry.karmaLeft);
  const s=entry.soul;
  const sin=(s.deeds || []).reduce((n,d)=>n+(d.w || 0),0);
  const merit=(s.merits || []).filter(m=>!m.fake).reduce((n,m)=>n+(m.v || 0),0);
  return s.pure ? 0 : Math.max(0,Math.round((sin-merit-(entry.intensity || 0)-(entry.lotusRelief || 0))*10)/10);
}
export const gateTotalKarma = g => Math.round(gateArrivals(g).reduce((n,x)=>n+gateKarma(x),0)*10)/10;
export function relieveGateKarma(g, amount=8) {
  const cuts=[];
  for(const entry of gateArrivals(g)) {
    const cut=Math.min(amount,gateKarma(entry));
    if(cut<=0)continue;
    entry.lotusRelief=Math.round(((entry.lotusRelief || 0)+cut)*10)/10;
    if(entry.checked)entry.karmaLeft=Math.round((entry.karmaLeft-cut)*10)/10;
    cuts.push({id:entry.soul.id,cut});amount=Math.round((amount-cut)*10)/10;
    if(amount<=0)break;
  }
  return cuts;
}
export function archiveRecord(entry,soul) {
  const deserved=entry.deserved || 0, given=deserved+(entry.over || 0)-(entry.short || 0);
  const mismatch=(entry.tham ?? 40)<40 || (entry.heaven && entry.right===false);
  return { ...entry, name:soul?.name || entry.who, portrait:soul?.sp || soulPortrait(soul || {who:entry.who}), deserved,given,
    verdict:mismatch?'wrong':given>deserved?'heavy':given<deserved?'light':'correct',
    deeds:(soul?.deeds || []).map(d=>d.t).join(' · ') || t('h4.noDeeds') };
}
export function archiveCard(record,index,portraitUrl) {
  const stars=Math.max(0,Math.min(5,record.stars || 0));
  return `<button type="button" class="arch-soul-card ${record.verdict}" data-archive-card="${index}"><img src="${esc(portraitUrl)}" alt="${esc(record.name)}"><b>#${String(record.id).padStart(3,'0')} ${esc(record.name)}</b><span class="arch-stars">${'★'.repeat(stars)+ '☆'.repeat(5-stars)} · ${esc(record.score ?? 0)} ${t('h4.points')}</span><span>${t('h4.deserved')}: ${record.deserved} · ${t('h4.given')}: ${record.given}</span><strong>${t('h4.'+record.verdict)}</strong><span class="arch-sin-summary">${esc(record.deeds)}</span><small>${t('h4.details')}</small></button>`;
}
export const GATE_EFFECT_MS = {scan:900,reborn:1700,sky:1900,relief:1000};
/** reduced-motion: ไปสวรรค์/ไปเกิดใหม่ = วิญญาณจางหายธรรมดา ไม่มีแสง/อนุภาค/การเคลื่อนไหว */
export const GATE_EFFECT_REDUCED_MS = 700;
const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, p) => { const t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const departs = kind => kind === 'reborn' || kind === 'sky';
/** ท่าของวิญญาณระหว่างเอฟเฟกต์ — alpha/rise/scale ใช้วาดตัววิญญาณ (room.js), p ใช้วาดแสง
 *  sky: ยืนส่องแสงก่อน แล้วลอยขึ้นพร้อมจางหายช่วงกลาง · reborn: หดตัวเข้าเป็นดวงไฟ (scale) แล้วหายเมื่อดวงไฟก่อตัวเสร็จ */
export function gateEffectPose(kind,elapsed,reduced=false) {
  const reducedDeparture = reduced && departs(kind);
  const p=clamp01(elapsed/(reducedDeparture ? GATE_EFFECT_REDUCED_MS : GATE_EFFECT_MS[kind]));
  if (reducedDeparture) return {p,alpha:1-p,rise:0,scale:1,done:p>=1,reduced:true};
  if (kind==='sky') return {p,alpha:1-smooth(.2,.8,p),rise:.22*smooth(.08,.85,p),scale:1,done:p>=1};
  if (kind==='reborn') return {p,alpha:1-smooth(.36,.5,p),rise:.02*smooth(.04,.4,p),scale:1-.85*smooth(.14,.5,p),done:p>=1};
  return {p,alpha:1,rise:0,scale:1,done:p>=1};
}
const hash01 = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const glow = (ctx, x, y, r, rgb, a) => {
  if (!(r > 0) || !(a > 0)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(.35, `rgba(${rgb},${a * .45})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
};
const flatGlow = (ctx, x, y, rx, ry, rgb, a) => { ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); glow(ctx, 0, 0, rx, rgb, a); ctx.restore(); };
const bezier = (a, c, b, t) => [(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0], (1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]];
function drawSkyLight(ctx,x,y,h,p,seed) {
  const env = smooth(0,.2,p) * (1 - smooth(.7,1,p));
  const top = y - h * 5.2 * smooth(0,.6,p), hw = h * .95 * (.35 + .65 * smooth(0,.35,p)), span = y - top;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  flatGlow(ctx, x, y, h * 1.1, h * .34, '255,206,110', env * .75);
  // เสาแสง: ไล่ขอบนุ่มด้านข้างด้วย gradient แนวนอน และจางที่ปลายบนด้วยการไล่ alpha ทีละแถบ (ไม่มีขอบแข็ง ไม่ทึบ)
  const side = (w, a) => { const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
    g.addColorStop(0, 'rgba(255,205,105,0)'); g.addColorStop(.25, `rgba(255,214,120,${.3 * a})`);
    g.addColorStop(.5, `rgba(255,246,208,${a})`); g.addColorStop(.75, `rgba(255,214,120,${.3 * a})`); g.addColorStop(1, 'rgba(255,205,105,0)'); return g; };
  if (span > 2) {
    const wide = side(hw, 1), core = side(hw * .36, 1), rows = 40, rowH = span / rows;
    // ชั้นอำพันแบบทับปกติ (ไม่บวกแสง) ให้เสามี "เนื้อ" บนฉากที่สว่างอยู่แล้ว ไม่จมหาย
    const amber = ctx.createLinearGradient(x - hw, 0, x + hw, 0);
    amber.addColorStop(0, 'rgba(255,168,48,0)'); amber.addColorStop(.5, 'rgba(255,184,64,1)'); amber.addColorStop(1, 'rgba(255,168,48,0)');
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = amber;
    for (let i = 0; i < rows; i++) {
      const f = (i + .5) / rows;
      ctx.globalAlpha = env * smooth(0, .5, f) * .22; ctx.fillRect(x - hw, top + i * rowH, hw * 2, rowH + 1);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rows; i++) {
      const f = (i + .5) / rows, fade = smooth(0, .5, f) * (.55 + .45 * f);
      ctx.globalAlpha = env * fade * .5; ctx.fillStyle = wide; ctx.fillRect(x - hw, top + i * rowH, hw * 2, rowH + 1);
      ctx.globalAlpha = env * fade * .55; ctx.fillStyle = core; ctx.fillRect(x - hw * .36, top + i * rowH, hw * .72, rowH + 1);
    }
  }
  ctx.globalAlpha = 1;
  // ประกาย 4 แฉกลอยขึ้น
  for (let i = 0; i < 22; i++) {
    const ph = hash01(seed * 13 + i), u = (p * 1.2 + ph) % 1, r = h * (.022 + .03 * hash01(seed + i * 3.7)) * (1 - u * .5);
    const sx = x + (hash01(seed * 7 + i * 5.1) - .5) * hw * 1.6 + Math.sin(u * 6 + ph * 9) * h * .07, sy = y - u * span * .95;
    const a = env * Math.sin(u * Math.PI) * (.55 + .45 * Math.sin(p * 40 + i));
    glow(ctx, sx, sy, r * 3.2, '255,230,150', a * .6);
    ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#fff6d6';
    ctx.fillRect(sx - r * .14, sy - r, r * .28, r * 2); ctx.fillRect(sx - r, sy - r * .14, r * 2, r * .28);
  }
  ctx.restore();
  // กลีบบัวลอยขึ้นช้ากว่าประกาย
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const ph = hash01(seed * 5 + i * 2.3), u = (p * .95 + ph) % 1, a = env * Math.sin(u * Math.PI) * .85;
    if (a <= .02) continue;
    const px = x + (hash01(seed + i * 9.7) - .5) * hw * 1.9 + Math.sin(u * 5 + ph * 8) * h * .12, py = y - h * .15 - u * span * .8;
    ctx.globalAlpha = a; ctx.fillStyle = i % 2 ? '#ffd9df' : '#ffe9b8';
    ctx.beginPath(); ctx.ellipse(px, py, h * .05, h * .026, u * 5 + ph * 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
function drawRebirthLight(ctx,x,y,h,p,seed,to) {
  const env = smooth(0,.12,p) * (1 - smooth(.88,1,p));
  const start = [x, y - h * .5], end = to || [x, y - h * 5], ctrl = [(start[0] + end[0]) / 2 + (hash01(seed) - .5) * h * 1.2, Math.min(start[1], end[1]) - h * .6];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const ringA = smooth(0,.12,p) * (1 - smooth(.46,.6,p)), q = smooth(0,.5,p);
  flatGlow(ctx, x, y, h * .95, h * .3, '255,190,150', env * (1 - smooth(.5,.7,p)) * .55);
  if (ringA > .01) {
    // วงแหวนแสงอ่อนบนแท่น หมุนช้า ๆ แล้วหดและยกขึ้นเป็นดวงไฟ
    const cx = x, cy = y - h * .04 - q * h * .46, rx = h * (.72 - .46 * q), ry = rx * .32, beads = 14;
    ctx.globalAlpha = ringA * .4; ctx.strokeStyle = 'rgba(255,224,170,.9)'; ctx.lineWidth = Math.max(1, h * .02);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    for (let i = 0; i < beads; i++) {
      const ang = p * Math.PI * 2 * 1.1 + i * Math.PI * 2 / beads, bx = cx + Math.cos(ang) * rx, by = cy + Math.sin(ang) * ry, depth = .6 + .4 * Math.sin(ang);
      glow(ctx, bx, by, h * .11 * depth + 1, '255,226,170', ringA * depth * .95);
    }
  }
  const form = smooth(.1,.5,p), travel = smooth(.5,.98,p);
  const orbAt = t => bezier(start, ctrl, end, t), r0 = h * .42 * form * (1 - .72 * travel) * (1 + .06 * Math.sin(p * 55 + seed));
  if (travel > .02) for (let k = 5; k >= 1; k--) {
    const tt = travel - k * .06; if (tt < 0) continue;
    const [tx, ty] = orbAt(tt); glow(ctx, tx, ty, r0 * (2.1 - k * .22), '255,170,110', (1 - k / 6) * .5 * env);
  }
  if (r0 > .5) {
    const [ox, oy] = orbAt(travel), a = form * (1 - smooth(.9,1,p));
    glow(ctx, ox, oy, r0 * 2.7, '255,160,110', a * .55);
    glow(ctx, ox, oy, r0 * 1.5, '255,214,150', a * .85);
    glow(ctx, ox, oy, r0 * .75, '255,250,235', a);
  }
  ctx.restore();
}
// Native canvas light; audio companions are synthesised in sfx.js.
// opts = { seed (สุ่มประกายคงที่ต่อดวง), to:[x,y] จุดประตูกลางในหน่วยพิกเซล canvas (reborn) }
export function drawGateEffect(ctx,x,y,h,kind,pose,cut=0,opts={}) {
  if (pose.reduced) return;     // reduced-motion: ไม่วาดแสง — ตัววิญญาณจางหายอย่างเดียว
  if (kind==='sky') return drawSkyLight(ctx,x,y,h,pose.p,opts.seed || 1);
  if (kind==='reborn') return drawRebirthLight(ctx,x,y,h,pose.p,opts.seed || 1,opts.to);
  const {p}=pose;ctx.save();ctx.globalAlpha=1-p*.65;
  ctx.strokeStyle='#ffe69d';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(2,h*.025);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=h*.16;
  if(kind==='scan'){const sy=y-h+p*h,bar=Math.max(3,h*.07),trail=ctx.createLinearGradient(0,sy-h*.35,0,sy);trail.addColorStop(0,'rgba(255,214,90,0)');trail.addColorStop(1,'rgba(255,214,90,.5)');ctx.fillRect(x-h*.38,sy,h*.76,bar);ctx.fillStyle=trail;ctx.fillRect(x-h*.38,Math.max(y-h,sy-h*.35),h*.76,Math.min(h*.35,sy-(y-h))+bar*.2);}
  if(kind==='relief'){ctx.font=`bold ${Math.max(15,h*.28)}px sans-serif`;ctx.textAlign='center';const ty=y-h*(1+p*.6);ctx.lineJoin='round';ctx.lineWidth=Math.max(3,h*.06);ctx.strokeStyle='rgba(60,25,0,.9)';ctx.strokeText(`−${cut}`,x,ty);ctx.fillStyle='#fff4c4';ctx.fillText(`−${cut}`,x,ty);}
  ctx.restore();
}
