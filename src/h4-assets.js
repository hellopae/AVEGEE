import { loadImage } from './asset-preload.js';
// H4 background-only asset. Do not alter the boot queue or its ordering (H1).
export const H4_BACKGROUND_ASSETS = ['img/minigames/sala-book-rainbow-h4-v1.png'];
const warm = () => {
  const idle=globalThis.requestIdleCallback || (fn=>setTimeout(fn,0));
  idle(()=>Promise.allSettled(H4_BACKGROUND_ASSETS.map(url=>loadImage(url))));
};
if(typeof document !== 'undefined') {
  if(document.documentElement.dataset.bootReady === 'true')warm();
  else globalThis.addEventListener?.('avegee:boot-ready',warm,{once:true});
}
