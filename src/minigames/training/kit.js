// B8 shared helpers for the panel-style training games (mirror / breath / documents / targets).
// Pure functions + a tiny DOM builder; nothing here touches game state.
export function rng(seed = 1) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const SVG = 'http://www.w3.org/2000/svg';
/** el('button', { class:'x', text:'Hi', onclick }, child, child) — svg:true builds SVG elements. */
export function el(tag, props = {}, ...kids) {
  const { svg, text, cls, attrs, style, ...rest } = props;
  const node = svg ? document.createElementNS(SVG, tag) : document.createElement(tag);
  if (cls) node.setAttribute('class', cls);
  if (text != null) node.textContent = text;
  for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
  if (style) Object.assign(node.style, style);
  for (const [k, v] of Object.entries(rest)) node[k] = v;
  for (const kid of kids) if (kid) node.append(kid);
  return node;
}
/** Shared header row: title text on the left, clock on the right (aria-live off so it is not read every frame). */
export function clockText(left, seconds, time) { return `${left} · ${Math.max(0, Math.ceil(seconds - time))}s`; }
