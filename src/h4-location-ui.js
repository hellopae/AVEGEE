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
export const GATE_EFFECT_MS = {scan:900,reborn:1150,sky:1400,relief:1000};
export function gateEffectPose(kind,elapsed) {
  const p=Math.max(0,Math.min(1,elapsed/GATE_EFFECT_MS[kind]));
  return {p,alpha:kind==='reborn'||kind==='sky'?1-p:1,rise:kind==='sky'?p*.22:0,done:p>=1};
}
// Native canvas light; audio companions are synthesised in sfx.js.
export function drawGateEffect(ctx,x,y,h,kind,pose,cut=0) {
  const {p}=pose;ctx.save();ctx.globalAlpha=1-p*.65;
  ctx.strokeStyle=kind==='reborn'?'#d9f5ff':'#ffe69d';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=Math.max(2,h*.025);ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=h*.16;
  if(kind==='scan'){const sy=y-h+p*h,bar=Math.max(3,h*.07),trail=ctx.createLinearGradient(0,sy-h*.35,0,sy);trail.addColorStop(0,'rgba(255,214,90,0)');trail.addColorStop(1,'rgba(255,214,90,.5)');ctx.fillRect(x-h*.38,sy,h*.76,bar);ctx.fillStyle=trail;ctx.fillRect(x-h*.38,Math.max(y-h,sy-h*.35),h*.76,Math.min(h*.35,sy-(y-h))+bar*.2);}
  if(kind==='reborn')for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(x,y-h*.5+(i-1)*h*.23,h*(.38+p*.2),h*.12,p*Math.PI*4+i,0,Math.PI*1.6);ctx.stroke();}
  if(kind==='sky'){const top=y-h*5;const gradient=ctx.createLinearGradient(x,top,x,y);gradient.addColorStop(0,'rgba(255,226,120,.9)');gradient.addColorStop(1,'rgba(255,176,40,.7)');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(x-h*.18,top);ctx.lineTo(x+h*.18,top);ctx.lineTo(x+h*.55,y);ctx.lineTo(x-h*.55,y);ctx.fill();ctx.fillStyle='rgba(255,255,240,.9)';ctx.fillRect(x-h*.07,top,h*.14,y-top);}
  if(kind==='relief'){ctx.font=`bold ${Math.max(15,h*.28)}px sans-serif`;ctx.textAlign='center';const ty=y-h*(1+p*.6);ctx.lineJoin='round';ctx.lineWidth=Math.max(3,h*.06);ctx.strokeStyle='rgba(60,25,0,.9)';ctx.strokeText(`−${cut}`,x,ty);ctx.fillStyle='#fff4c4';ctx.fillText(`−${cut}`,x,ty);}
  ctx.restore();
}
