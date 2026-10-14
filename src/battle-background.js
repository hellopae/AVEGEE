import {themeBackground} from './theme-assets.js';
export const BATTLE_BIOMES=Object.freeze(['volcano','ice','forest']);
export function battleBiomeFor(zone,battle,position={}) {
  if(zone!=='th')return null;
  if(BATTLE_BIOMES.includes(battle?.sceneBiome))return battle.sceneBiome;
  if(battle?.dungeonToken||battle?.kind?.startsWith('frontier'))return 'forest';
  if(battle?.kind!=='mob')return null;
  if(position.x<1250)return 'volcano';
  if(position.x>3000&&position.y<1100)return 'ice';
  if(position.x>2650&&position.y>1450)return 'forest';
  return null;
}
export function battleBackground(zone,battle,position) {
  const biome=battleBiomeFor(zone,battle,position);
  return biome?`img/map-zone1/battle-${biome}-v1.webp`:
    themeBackground(zone,battle?.kind?.startsWith('frontier')?'frontier':'arena');
}
