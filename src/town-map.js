// Zone 1 town presentation. Existing world coordinates, collision and save data stay authoritative.
import { SCENE, STATIONS, SPOTS, FRONTIER } from './data.js';
import { t } from './i18n.js';
import { TOWN_HOUSES, TOWN_HOUSE_SITES, TOWN_SIZE } from './town-layout.js?v=k1d';
import { drawContactAO, visibleBase } from './town-shade.js?v=l1';
import { isTownZone } from './zone-skin.js';

// M2: which zones use the painted-town map system is decided by the zone skin table (zone-skin.js), not by a zone name.
export { isTownZone };
export const townZoomLevels = zone => isTownZone(zone) ? [1, 3.5, 5, 6.5] : [1, 2.5];
// No zone-name i18n key exists yet: retain the existing zone label until copy is supplied.
export const townTitle = (zone, legacyName) => zone === 'th' ? t('town.title') : legacyName;
export const townDefaultZoom = zone => isTownZone(zone) ? 2 : 0;
/** Shared world rectangle for preview camera, click mapping and minimap frame. */
export function townCameraRect(x,y,zoom=1) {
  const z=Math.max(1,Number.isFinite(zoom)?zoom:1);
  const w=TOWN_SIZE.w/z,h=TOWN_SIZE.h/z;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  return {x:clamp(x-w/2,0,TOWN_SIZE.w-w),y:clamp(y-h/2,0,TOWN_SIZE.h-h),w,h};
}
// Small dark houses stand where the owner drew them (TOWN_HOUSE_SITES: foot centre, width, sprite, facing).
// Only their ground floor is solid (TOWN_HOUSES); roofs are drawn in the shared depth queue by foot y.
export const townHouseLots = () => TOWN_HOUSES;
export const townHouseSites = () => TOWN_HOUSE_SITES;
export function drawTownHouse(ctx, house, site = TOWN_HOUSE_SITES[0]) {
  if (!house) return;
  const w = site.w, h = w * house.naturalHeight/house.naturalWidth;
  ctx.save(); ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  { const b=visibleBase(house,site.x,site.y,w,h,!!site.flip); // L1: soft contact shade under the visible base; the cast shadow is town-shade.js
    drawContactAO(ctx,b.x+3,b.y-2,b.w*.58,Math.max(8,b.w*.1)); }
  if (site.flip) { ctx.translate(site.x*2,0); ctx.scale(-1,1); }
  ctx.drawImage(house,site.x-w/2,site.y-h,w,h);ctx.restore();
}
export const townHouseDepth = (site = TOWN_HOUSE_SITES[0]) => Array.isArray(site) ? site[3] : site.y;
// Three compositing passes from the aligned painting: distant roofs, walking floor,
// then edge walls/foliage over actors. World anchors do not drift with decoration.
export function drawTownBackdrop(ctx, painting) {
  ctx.drawImage(painting,0,0,SCENE.w,120,0,0,SCENE.w,120);
}
export function drawTownFloor(ctx, painting) { ctx.drawImage(painting,0,0); }
export function drawTownForeground(ctx, painting) {
  // The painted mountains remain behind actors; separate sprites own occlusion.
}
export const townHouseKey = index => 'town-residence-' + TOWN_HOUSE_SITES[index % TOWN_HOUSE_SITES.length].key;
export function townSites(g) {
  return STATIONS.map(def => {
    const station = g.stations.find(s => s.def.k === def.k);
    return { key:def.k, name:def.name, x:def.x, y:def.y,
      state:station ? station.build ? 'building' : 'built' : 'plot', def };
  });
}
export function townNearbyAction(g, interaction, build, reach = 105) {
  if (!isTownZone(g.zone) || g.over || g.battle) return null;
  // Existing NPC / event / repair selection has priority over ordinary construction.
  if (interaction) return { kind:'interaction', target:interaction };
  if (build) return { kind:'build', target:build };
  if (Math.hypot(g.player.x-FRONTIER.x,g.player.y-FRONTIER.y) <= reach)
    return { kind:'frontier', target:FRONTIER };
  return null;
}

// FB-UI 2 (owner 10 Nov): the "locked site" sign is a Thai-style plaque - gold double frame with a kranok crest, dark-red lacquer
// panel, a gold padlock and gold lettering with a dark outline (readable on every ground colour). Drawn with canvas paths only (no
// image to recolour); rendered once into a 4x offscreen canvas per text, then stamped with drawImage so the map loop stays cheap.
const PLAQUE_FONT='700 13px "IBM Plex Sans Thai","Noto Sans Thai",sans-serif', PLAQUE_K=4, PLAQUE_H=32, plaqueCache=new Map();
function paintLockPlaque(c,text,w,h) {
  const goldEdge=c.createLinearGradient(0,0,0,h);
  goldEdge.addColorStop(0,'#fbe3a0');goldEdge.addColorStop(.5,'#c8963a');goldEdge.addColorStop(1,'#8f6422');
  const panel=c.createLinearGradient(0,0,0,h);
  panel.addColorStop(0,'#5b1a16');panel.addColorStop(1,'#2a0b0d');
  const cx=w/2, top=7;                               // body starts below the crest
  const body=(x,y,ww,hh,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+ww,y,x+ww,y+hh,r);c.arcTo(x+ww,y+hh,x,y+hh,r);c.arcTo(x,y+hh,x,y,r);c.arcTo(x,y,x+ww,y,r);c.closePath();};
  // crest: a small flame (kranok) rising from the top edge
  c.beginPath();c.moveTo(cx-9,top+1);c.quadraticCurveTo(cx-3,top-1,cx,0);c.quadraticCurveTo(cx+3,top-1,cx+9,top+1);c.closePath();
  c.fillStyle=goldEdge;c.fill();c.strokeStyle='#6d4a18';c.lineWidth=.8;c.stroke();
  // outer gold frame + lacquer panel + inner hairline
  body(1.5,top,w-3,h-top-1.5,7);c.fillStyle=panel;c.fill();c.strokeStyle=goldEdge;c.lineWidth=2.6;c.stroke();
  body(4.6,top+3.1,w-9.2,h-top-7.7,4.5);c.strokeStyle='rgba(235,190,100,.55)';c.lineWidth=.8;c.stroke();
  // corner studs
  c.fillStyle='#f3d284';for(const [x,y] of [[6,top+5.5],[w-6,top+5.5],[6,h-6],[w-6,h-6]]){c.beginPath();c.moveTo(x,y-1.9);c.lineTo(x+1.9,y);c.lineTo(x,y+1.9);c.lineTo(x-1.9,y);c.closePath();c.fill();}
  // gold padlock (left)
  const lx=17, ly=top+(h-top)/2+1;
  c.strokeStyle='#e9bf62';c.lineWidth=2.3;c.beginPath();c.arc(lx,ly-3.3,4.1,Math.PI,0);c.lineTo(lx+4.1,ly-1);c.moveTo(lx-4.1,ly-3.3);c.lineTo(lx-4.1,ly-1);c.stroke();
  const lg=c.createLinearGradient(0,ly-2,0,ly+8);lg.addColorStop(0,'#fbe3a0');lg.addColorStop(1,'#b78529');
  body(lx-6.3,ly-1.4,12.6,9.6,2);c.fillStyle=lg;c.fill();c.strokeStyle='#5b3a10';c.lineWidth=.9;c.stroke();
  c.fillStyle='#3a1608';c.beginPath();c.arc(lx,ly+2.5,1.5,0,Math.PI*2);c.fill();c.fillRect(lx-.55,ly+2.5,1.1,3);
  // lettering
  c.font=PLAQUE_FONT;c.textAlign='left';c.textBaseline='middle';
  const tx=30, ty=top+(h-top)/2+.6;
  c.lineJoin='round';c.lineWidth=3.2;c.strokeStyle='rgba(18,4,4,.92)';c.strokeText(text,tx,ty);
  c.fillStyle='#ffe9b4';c.fillText(text,tx,ty);
}
function drawLockPlaque(ctx,x,bottom,text) {
  const h=PLAQUE_H;
  let cached=plaqueCache.get(text);
  if(cached){ctx.drawImage(cached.cv,x-cached.w/2,bottom-h,cached.w,h);return;}
  const make=typeof document!=='undefined'&&document.createElement;
  const fontsReady=!make||!document.fonts?.check||document.fonts.check(PLAQUE_FONT,text);
  const probe=make&&make.call(document,'canvas').getContext?.('2d');
  let w=text.length*8+44;
  if(probe){probe.font=PLAQUE_FONT;w=Math.ceil(probe.measureText(text).width)+44;}
  w=Math.max(96,w);
  if(make&&fontsReady) {
    const cv=document.createElement('canvas');cv.width=Math.ceil(w*PLAQUE_K);cv.height=Math.ceil(h*PLAQUE_K);
    const c=cv.getContext('2d');
    if(c&&c.scale){c.scale(PLAQUE_K,PLAQUE_K);paintLockPlaque(c,text,w,h);plaqueCache.set(text,cached={cv,w,h});ctx.drawImage(cv,x-w/2,bottom-h,w,h);return;}
  }
  ctx.save();ctx.translate(x-w/2,bottom-h);paintLockPlaque(ctx,text,w,h);ctx.restore();   // fonts not ready yet: paint straight, cache on a later frame
}

/** Construction sites are visible; roads and stairs are supplied by the new town painting.
 *  P1: a site whose unlock level is not reached yet is only a dark footprint ("shadow") with a lock + rank N;
 *  the next recommended site gets a brighter pulsing ring and a star. Buildings already built are never touched. */
export function drawTownGround(ctx,g,now=Date.now()) {
  if (!isTownZone(g.zone)) return;
  // Vacant construction pads help the player discover destinations before approaching.
  const rec = g.recommendedBuild?.();
  for(const site of townSites(g)) {
    if(site.state!=='plot' || site.def.cost<=0) continue;
    const d=site.def, locked=!!g.buildLocked?.(d.k), isRec=!locked && rec===d.k;
    const rx=Math.min(62,d.bw*.32), cy=d.by-14, q=.5+.5*Math.sin(now/420);
    ctx.save();
    if(locked) {
      ctx.fillStyle='rgba(6,3,6,.42)'; ctx.beginPath(); ctx.ellipse(d.bx,cy,rx+6,24,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(150,130,120,.42)'; ctx.lineWidth=2;
    } else {
      ctx.strokeStyle=isRec?`rgba(255,214,130,${.6+q*.4})`:'rgba(212,170,104,.55)'; ctx.lineWidth=isRec?3.5:2;
      if(isRec) { ctx.shadowColor='rgba(255,200,110,.9)'; ctx.shadowBlur=10+q*8; }
    }
    ctx.setLineDash([6,5]); ctx.beginPath(); ctx.ellipse(d.bx,cy,rx,20,0,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur=0;
    if(locked) { drawLockPlaque(ctx,d.x,d.y-4,t('unlock.lockedAt',{n:g.buildUnlockLv(d.k)})); ctx.restore(); continue; }
    ctx.fillStyle='rgba(33,16,23,.9)';
    const label=isRec?'★ +':'+';
    ctx.font=`600 ${isRec?13:12}px sans-serif`;
    const w=Math.max(20,ctx.measureText(label).width+10);
    ctx.fillRect(d.x-w/2,d.y-22,w,18);
    ctx.strokeStyle=isRec?'#ffd68a':'#ad8656';ctx.lineWidth=1.5;ctx.strokeRect(d.x-w/2,d.y-22,w,18);
    ctx.fillStyle=isRec?'#ffe7b0':'#e9c68e';ctx.textAlign='center';ctx.fillText(label,d.x,d.y-8);ctx.restore();
  }
}
