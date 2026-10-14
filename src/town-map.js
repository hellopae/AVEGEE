// Zone 1 town presentation. Existing world coordinates, collision and save data stay authoritative.
import { SCENE, STATIONS, SPOTS, FRONTIER } from './data.js';
import { TOWN_HOUSES, TOWN_SIZE } from './town-layout.js';

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
// Tall facades share the occupied residential lots. Their bases stay inside
// existing non-walkable geometry; roof height affects only presentation.
export const townHouseLots = () => TOWN_HOUSES;
export function drawTownHouse(ctx, house, lot = TOWN_HOUSES[0]) {
  if (!house) return;
  const [left,,right,bottom] = lot;
  const w = right-left, h = w * house.naturalHeight/house.naturalWidth;
  ctx.save(); ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.fillStyle='rgba(9,5,13,.28)';ctx.beginPath();
  ctx.ellipse((left+right)/2,bottom-4,w*.44,w*.075,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(house,left,bottom-h,w,h);ctx.restore();
}
export const townHouseDepth = (lot = TOWN_HOUSES[0]) => lot[3];
// Three compositing passes from the aligned painting: distant roofs, walking floor,
// then edge walls/foliage over actors. World anchors do not drift with decoration.
export function drawTownBackdrop(ctx, painting) {
  ctx.drawImage(painting,0,0,SCENE.w,120,0,0,SCENE.w,120);
}
export function drawTownFloor(ctx, painting) { ctx.drawImage(painting,0,0); }
export function drawTownForeground(ctx, painting) {
  // The painted mountains remain behind actors; separate sprites own occlusion.
}
export const townHouseKey = index => ['town-residence-front-one',
  'town-residence-right-two','town-residence-left-two','town-residence-right-one'][index % 4];
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

/** Construction sites are visible; roads and stairs are supplied by the new town painting. */
export function drawTownGround(ctx,g) {
  if (!isTownZone(g.zone)) return;
  // Vacant construction pads help the player discover destinations before approaching.
  for(const site of townSites(g)) {
    if(site.state!=='plot' || site.def.cost<=0) continue;
    const d=site.def;
    ctx.save(); ctx.strokeStyle='rgba(212,170,104,.55)'; ctx.lineWidth=2;
    ctx.setLineDash([6,5]); ctx.beginPath(); ctx.ellipse(d.bx,d.by-14,Math.min(62,d.bw*.32),20,0,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);ctx.fillStyle='rgba(33,16,23,.9)';ctx.fillRect(d.x-10,d.y-20,20,16);
    ctx.strokeStyle='#ad8656';ctx.strokeRect(d.x-10,d.y-20,20,16);
    ctx.fillStyle='#e9c68e';ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.fillText('+',d.x,d.y-7);ctx.restore();
  }
}
