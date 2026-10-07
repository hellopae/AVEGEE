// Owner's annotated map review, 7 October: visual sizes in the 1678 × 937 world.
export const MAP_REVIEW_SIZES = {
  dab:[210,180], ngiw:[195,225], krata:[250,180], tarang:[240,170],
  sala:[230,185], lan:[150,120], krajok:[155,130], sawan:[200,220], frontier:[160,160],
};
export function mapReviewArt(key, zone) {
  return ['th','asia','west','cyberhell'].includes(zone) && MAP_REVIEW_SIZES[key.slice(3)] && key.startsWith('st-')
    ? `img/map-v5/${key}-${zone}.webp` : null;
}
export function reviewStationBox(def, im, zone) {
  const [maxW,maxH] = MAP_REVIEW_SIZES[def.k];
  const scale = Math.min(maxW/im.naturalWidth,maxH/im.naturalHeight);
  const w=im.naturalWidth*scale,h=im.naturalHeight*scale;
  return {im,x:def.bx-w/2,y:def.by-h,w,h,flip:zone === 'west' && def.k === 'tarang'};
}
