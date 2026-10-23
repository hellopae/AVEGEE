import { townSkinOf } from './zone-skin.js';
// Owner's annotated map review, 7 October: visual sizes in the 1678 × 937 world.
export const MAP_REVIEW_SIZES = {
  dab:[210,180], ngiw:[195,225], krata:[250,180], tarang:[240,170],
  sala:[230,185], lan:[150,120], krajok:[210,180], sawan:[200,220], frontier:[160,160],
};
// M2: facade sprites (v2) and their box limits belong to the zone skin (zone-skin.js -> stations); Zone 1 values are unchanged.
export function mapReviewArt(key, zone) {
  const skin = townSkinOf(zone);
  if (skin && key.startsWith('st-') && skin.stations.facade[key.slice(3)])
    return skin.stations.facade[key.slice(3)];
  if (skin && key.startsWith('st-') && MAP_REVIEW_SIZES[key.slice(3)]) return `img/map-v5/${key}-${skin.stations.suffix}.webp`;
  return ['th','asia','west','cyberhell'].includes(zone) && MAP_REVIEW_SIZES[key.slice(3)] && key.startsWith('st-')
    ? `img/map-v5/${key}-${zone}.webp` : null;
}
export function reviewStationBox(def, im, zone) {
  // City landmarks share a facade-first scale; the northern sanctuary remains
  // below the world's top edge. Other branches retain their existing bounds.
  const [maxW,maxH] = townSkinOf(zone)?.stations.facadeSizes[def.k] || MAP_REVIEW_SIZES[def.k];
  const scale = Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight) * (def.mapScale || 1);
  const w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  return {im,x:def.bx-w/2,y:def.by-h,w,h,flip:!!def.flip};
}
