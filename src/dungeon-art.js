import {themeBackground} from './theme-assets.js';
export const DUNGEON_ART=Object.freeze({
  'th:asia':Object.freeze(['th-asia-forest-edge','th-asia-gorge-bridge','th-asia-eastern-gate']),
  'asia:west':Object.freeze(['asia-west-chain-pass','asia-west-ruined-fort','asia-west-western-gate']),
  'west:cyberhell':Object.freeze(['west-cyber-mist-forest','west-cyber-machine-road','west-cyber-cyber-gate']),
});
export function dungeonBackground(zone,routeId,checkpoint=0) {
  if(routeId==='th:asia')return 'img/frontier-route/zone1-2-v1.webp';
  const places=DUNGEON_ART[routeId];
  if(!places)return themeBackground(zone,'frontier');
  const index=Math.max(0,Math.min(places.length-1,Number.isInteger(checkpoint)?checkpoint:0));
  return `img/map-zone1/dungeon-${places[index]}-v1.webp`;
}
