// Owner's annotated map review, 7 October: visual sizes in the 1678 × 937 world.
export const MAP_REVIEW_SIZES = {
  dab:[210,180], ngiw:[195,225], krata:[250,180], tarang:[240,170],
  sala:[230,185], lan:[150,120], krajok:[210,180], sawan:[200,220], frontier:[160,160],
};
const TOWN_FACADE_SIZES = {
  sala:[280,330], tea:[260,270], sawan:[260,300], krajok:[280,340],
};
export function mapReviewArt(key, zone) {
  if (zone === 'th' && key.startsWith('st-') && TOWN_FACADE_SIZES[key.slice(3)])
    return `img/map-v5/${key}-th-v2.webp`;
  return ['th','asia','west','cyberhell'].includes(zone) && MAP_REVIEW_SIZES[key.slice(3)] && key.startsWith('st-')
    ? `img/map-v5/${key}-${zone}.webp` : null;
}
export function reviewStationBox(def, im, zone) {
  // City landmarks share a facade-first scale; the northern sanctuary remains
  // below the world's top edge. Other branches retain their existing bounds.
  const [maxW,maxH] = (zone === 'th' && TOWN_FACADE_SIZES[def.k]) || MAP_REVIEW_SIZES[def.k];
  const scale = Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight) * (def.mapScale || 1);
  const w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  return {im,x:def.bx-w/2,y:def.by-h,w,h,flip:!!def.flip};
}
