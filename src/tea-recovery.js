// Shared rules for all four tea pavilions and all four wearable outfits.
export const TEA_BED_COST = 180;
export const TEA_SLEEP_MS = 5000;
export const TEA_BLACKOUT_MS = 600;
export const TEA_WAKE_MS = 600;
export const TEA_REST_TOTAL_MS = TEA_SLEEP_MS + TEA_BLACKOUT_MS + TEA_WAKE_MS;
export const teaSleepPhase = elapsed => elapsed < TEA_SLEEP_MS ? 'sleep'
  : elapsed < TEA_SLEEP_MS + TEA_BLACKOUT_MS ? 'blackout'
  : elapsed < TEA_REST_TOTAL_MS ? 'wake' : 'done';
export const DEFEAT_SCENE_MS = 1600;
export const yamaDownImage = outfit => `img/hero-yama-${outfit || 'th'}-unconscious.png`;
export const teaBackground = zone => `img/tea-${zone || 'th'}-recovery.png`;
export function teaRoom(zone = 'th') {
  const seats={th:[0.23,0.53],asia:[0.28,0.54],west:[0.25,0.55],cyberhell:[0.35,0.57]};
  const beds={th:[0.72,0.43],asia:[0.66,0.42],west:[0.66,0.43],cyberhell:[0.66,0.40]};
  return { crop:null, mirror:false, bright:1, light:null, noCup:true,
    souls:[], crew:null, me:[0.50,0.86], act:seats[zone] || seats.th, bed:beds[zone] || beds.th,
    item:[0.40,0.59], actions:[[0.30,0.27],[0.69,0.23]],
    walk:[0.21,0.49,0.83,0.91] };
}
export function roomImageBox(W, H, sw, sh, cover = false) {
  const s = (cover ? Math.max : Math.min)(W / sw, H / sh);
  return { ox:(W-sw*s)/2, oy:(H-sh*s)/2, w:sw*s, h:sh*s };
}
