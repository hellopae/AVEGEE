// Anchors measured in the original room image. Background, actor and foreground
// share one image-sized layer so changing the viewport cannot move the pot.
const POTS = {
  th:        { ratio:1, x:0.488, rim:0.535, width:0.095, height:0.16, effect:'fire' },
  asia:      { ratio:1024/549, x:0.50, rim:0.465, width:0.075, height:0.25, effect:'fire' },
  west:      { ratio:1, x:0.50, rim:0.49, width:0.11, height:0.18, effect:'mist' },
  cyberhell: { ratio:1, x:0.635, rim:0.425, width:0.085, height:0.15, effect:'electric' },
};

export function punishmentScene(zone, background) {
  // artUrl can fall back while the manifest loads; match the anchors to that image.
  const key = background === 'img/BG-Krata.webp' ? 'th' : zone;
  return { ...(POTS[key] || POTS.th), background };
}
