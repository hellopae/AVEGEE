// Zone 1 town presentation. Existing world coordinates, collision and save data stay authoritative.
import { SCENE, STATIONS, SPOTS, FRONTIER } from './data.js';
import { TOWN_HOUSES, TOWN_HOUSE_SITES, TOWN_SIZE } from './town-layout.js?v=k1d';
import { drawContactAO, visibleBase } from './town-shade.js?v=l1';

export const isTownZone = zone => zone === 'th';
export const townZoomLevels = zone => isTownZone(zone) ? [1, 3.5, 5, 6.5] : [1, 2.5];
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

/** Construction sites are visible; roads and stairs are supplied by the new town painting.
 *  P1: a site whose unlock level is not reached yet is only a dark footprint ("shadow") with a lock + Lv.N;
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
    ctx.fillStyle=locked?'rgba(24,12,18,.78)':'rgba(33,16,23,.9)';
    const label=locked?`🔒 ขั้น ${g.buildUnlockLv(d.k)}`:isRec?'★ +':'+';
    ctx.font=`600 ${locked||isRec?13:12}px sans-serif`;
    const w=Math.max(20,ctx.measureText(label).width+10);
    ctx.fillRect(d.x-w/2,d.y-22,w,18);
    ctx.strokeStyle=locked?'#7d6a5c':isRec?'#ffd68a':'#ad8656';ctx.lineWidth=1.5;ctx.strokeRect(d.x-w/2,d.y-22,w,18);
    ctx.fillStyle=locked?'#b09a92':isRec?'#ffe7b0':'#e9c68e';ctx.textAlign='center';ctx.fillText(label,d.x,d.y-8);ctx.restore();
  }
}
