// Display-only crops: remove painted letterboxes without changing shared assets.
// Bounds were measured from the shipped images; keep the full content width.
const CONTENT_ROWS = {
  'story-th-01.png':[270,757], 'story-th-02.png':[258,768],
  'story-th-03.png':[244,787], 'story-th-04.png':[247,779], 'story-th-05.png':[271,753],
  'story-asia-01.png':[123,595], 'story-asia-02.png':[100,615],
  'story-asia-03.png':[99,621], 'story-asia-04.png':[222,802], 'story-asia-05-v2.png':[112,594],
  'story-west-01.png':[118,594], 'story-west-02.png':[102,620],
  'story-cyberhell-01-v2.png':[221,821], 'story-cyberhell-02-v3.png':[104,640],
  'story-cyberhell-03-v4.png':[88,632],
  'story-cyberhell-reinforcements-01.png':[50,890],
  'story-cyberhell-reinforcements-02.png':[52,892],
  'story-ending-01-v4.png':[121,602], 'story-ending-02-v3.png':[89,633],
  'intro-panel-01.webp':[0,617], 'intro-panel-02.webp':[0,708],
  'intro-panel-03.webp':[0,646], 'intro-panel-04.webp':[0,750], 'intro-panel-05.webp':[0,621],
  'Intro-Boss-Zone1.png':[0,628], 'Intro-Boss-Zone2-asia.png':[0,658],
  'Intro-Boss-Zone3-west.png':[0,764], 'Intro-Boss-Zone4-cyberhell.png':[0,780],
  'intro-head-asia-v2.png':[0,758], 'intro-head-west-v2.png':[0,737],
  'intro-head-cyberhell-v2.png':[0,774],
  'intro-zone2-asia.png':[0,778], 'intro-zone4-cyberhell.png':[0,640],
};

const filename = src => src.split(/[?#]/)[0].split('/').pop();

/** The image box extends outside the clipped frame; its content fills the frame. */
export function comicImageLayout(src, width, height) {
  const [top, bottom] = CONTENT_ROWS[filename(src)] || [0, height];
  const contentHeight = bottom - top;
  return { aspect:width / contentHeight, top:top ? -100 * top / contentHeight : 0,
    height:100 * height / contentHeight };
}

/** Apply after each render and load, including fallback images and cached loads. */
export function prepareComicImages(root) {
  for (const image of root.querySelectorAll('.intro-comic-frame > img, .ending-thumbnail > img')) {
    const fit = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const layout = comicImageLayout(image.currentSrc || image.src, image.naturalWidth, image.naturalHeight);
      const frame = image.parentElement;
      if (frame.classList.contains('intro-comic-frame')) frame.style.aspectRatio = String(layout.aspect);
      image.style.top = `${layout.top}%`;
      image.style.height = `${layout.height}%`;
    };
    image.addEventListener('load', fit);
    if (image.complete) fit();
  }
}

/** Zone 1 keeps its resolver; zones 2–4 explicitly use arrival scenes (no profile-closeup race). */
export function bossArrivalScene(zone) {
  return ({ asia:'img/Asia/Intro-Boss-Zone2-asia.png', west:'img/West/Intro-Boss-Zone3-west.png',
    cyberhell:'img/CyberHell/Intro-Boss-Zone4-cyberhell.png' })[zone] || null;
}

// These two source files already face right. The default action animation mirrors them.
export const ACTION_CUTSCENE_PRESENTATION = {
  'img/West/crew-guard-west-cutscene.jpeg':{ flip:false },
  'img/CyberHell/crew-plerng-cyberhell-cutscene.jpeg':{ flip:false },
};
