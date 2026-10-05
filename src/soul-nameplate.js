// Fit a complete grapheme at a time, including Thai combining marks.
export function fitSoulName(name, maxWidth, measure) {
  const text = String(name ?? '');
  if (measure(text) <= maxWidth) return text;
  if (measure('…') > maxWidth) return '';
  const parts = [...new Intl.Segmenter('th', { granularity:'grapheme' }).segment(text)].map(x => x.segment);
  while (parts.length && measure(parts.join('') + '…') > maxWidth) parts.pop();
  return parts.join('') + '…';
}

export function soulNameplateWidth(points, index, imageWidth, unit) {
  const x = points[index][0];
  const gaps = points.filter((_, i) => i !== index).map(p => Math.abs(p[0] - x));
  return Math.min(unit * 0.16, ...(gaps.map(gap => gap * imageWidth * 0.82)));
}
