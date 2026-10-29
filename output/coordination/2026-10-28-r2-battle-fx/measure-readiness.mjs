// Node simulation of decode readiness and the production command handler.
// This is not a browser/network measurement.
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {commandHarness,battleGame} from '../../../tests/helpers/r2-battle-runtime.mjs';
import {POWER_VISUALS,recipeFor} from '../../../src/battle-fx-map.js';
import {powerCutsceneImage} from '../../../src/power-cutscene-assets.js';
import {regionalCrewCutscene} from '../../../src/zone-introductions.js';
import {niraHealingCutscene} from '../../../src/nira-combat.js';
const out=new URL('./',import.meta.url),measurements=[];
for(let i=0;i<10;i++) {
  const action=['ice','fire','hypno'][i%3];
  const h=commandHarness(async()=>({decode:()=>i<8?new Promise(r=>setTimeout(r,20+i*5)):new Promise(()=>{})}));
  const reference=battleGame();reference.confirmBattleCommand(action,'you');
  const start=performance.now();await h.execute(action);const waitMs=performance.now()-start;
  const mp=h.g.mp,foeHp=h.g.battle.foes[0].hp,ready=!!h.mounted[0].image;
  h.finish();reference.finishBattleCommand();
  measurements.push({trial:i+1,action,condition:i<8?'simulated decode delay':'decode never resolves',waitMs:+waitMs.toFixed(2),image:ready?'decoded':'title-only',finished:!h.g.battle.commandBusy&&h.phase()===null,mpMatches:mp===reference.mp,damageMatches:foeHp===reference.battle.foes[0].hp,turnMatches:JSON.stringify(h.g.currentBattleTurn())===JSON.stringify(reference.currentBattleTurn()),timings:h.cache.timings()});
}
writeFileSync(new URL('simulated-readiness.json',out),JSON.stringify({kind:'Node readiness simulation; no browser rendering or network throttle',measurements},null,2));
const ui=readFileSync(new URL('../../../src/ui.js',import.meta.url),'utf8');
const a=ui.indexOf('function actionCutsceneSrc('),b=ui.indexOf('\n}\n',a)+2;
const rows=[];
for(const [action,visual] of Object.entries(POWER_VISUALS)) {
  const cutscenes={};
  for(const style of ['th','asia','west','cyberhell']) {
    const g={outfit:style,zone:'th',abilities:{bigFire:false,flameCharge:true,windFan:true,rage:true,valkyrieSpear:true,cooldownClock:true}};
    const resolve=vm.runInNewContext(ui.slice(a,b)+'\nactionCutsceneSrc;',{g,powerCutsceneImage});
    const src=resolve(action);cutscenes[style]={src,exists:!src||existsSync(new URL('../../../'+src,import.meta.url))};
  }
  rows.push({action,recipe:recipeFor(action),...visual,cutscenes});
}
for(const kind of ['taan','guard','plerng','dam','kan','boon','nira']) rows.push({action:kind==='guard'?'guard':`crew:${kind}`,recipe:recipeFor(`crew:${kind}`),cutscenes:Object.fromEntries(['th','asia','west','cyberhell'].map(zone=>{const src=kind==='nira'?niraHealingCutscene(zone):regionalCrewCutscene(kind,zone).src;return [zone,{src,exists:existsSync(new URL('../../../'+src,import.meta.url))}];}))});
writeFileSync(new URL('power-mapping.json',out),JSON.stringify(rows,null,2));
console.log(JSON.stringify({trials:measurements.length,allFinished:measurements.every(x=>x.finished&&x.mpMatches&&x.damageMatches&&x.turnMatches),waitMs:measurements.map(x=>x.waitMs),cutsceneFiles:rows.every(x=>Object.values(x.cutscenes).every(x=>x.exists))},null,2));
