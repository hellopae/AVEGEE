// L4a: zone-lit raster swords; tip coordinates match the previous planted props.
const ZONES = ['th', 'asia', 'west', 'cyberhell'];
const cache = new Map();
export function plantedSwordSources(zone = 'th') {
  const z = ZONES.includes(zone) ? zone : 'th';
  return [1, 2].map(n => `img/asipatta-l4a/${z}-sword-${n}-l4a.png`);
}
export function drawPlantedSwords(ctx, x, y, u, zone = 'th') {
  plantedSwordSources(zone).forEach((src, i) => {
    if (typeof Image === 'undefined') return;
    let image = cache.get(src);
    if (!image) {
      image = new Image();
      image.src = new URL(`../${src}`, import.meta.url).href;
      cache.set(src, image);
    }
    if (!image.complete || !image.naturalWidth) return;
    const side = i === 0 ? -1 : 1;
    const h = u * .165, w = h * image.naturalWidth / image.naturalHeight;
    ctx.save();
    ctx.translate(x + side * u * .065, y + u * .005);
    ctx.rotate(side * .22);
    ctx.drawImage(image, -w / 2, -h, w, h);
    ctx.restore();
  });
}
