import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createGame} from '../../src/game.js';
import {FX_OF,ITEMS,CREW_POWER,CREW} from '../../src/data.js';
import {createCutsceneReadiness} from '../../src/cutscene-presentation.js';
import {isMeleeAction} from '../../src/battle-dash.js';
import {COMBAT_SKILLS} from '../../src/combat-skills.js';
const ui=readFileSync(new URL('../../src/ui.js',import.meta.url),'utf8');
const command=ui.slice(ui.indexOf('    const executeCommand = async '),ui.indexOf("    dlg.querySelectorAll('[data-execute]')"));
const cutStart=ui.indexOf('function playActionCutscene(');
const cut=ui.slice(cutStart,ui.indexOf('\n}\n',cutStart)+2);
export function battleGame() {
  const g=createGame();g.save=()=>true;g.onChange=()=>{};g.level=10;
  Object.assign(g.abilities,{ice:true,hypno:true,windFan:true});g.mp=g.mpMax=1000;
  g.startBattle({id:999,who:'pret',sp:'mob-pret',deserved:4,resist:true});
  g.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[1,1];});g.beginBattleTurns();return g;
}
export function commandHarness(loader) {
  const g=battleGame(),timers=new Map(),mounted=[];let id=0;
  const cache=createCutsceneReadiness(loader);
  const dlg={open:true,querySelector:()=>null,appendChild:node=>{node.isConnected=true;mounted.push(node);}};
  const ctx=vm.createContext({g,dlg,battleCutscenes:cache,Date,ITEMS,FX_OF,CREW_POWER,CREW,isMeleeAction,COMBAT_SKILLS,
    ACTION_CUT_MS:1300,COUNTER_WAIT_MS:2000,DEFEND_STANCE_MS:700,ACTION_CUTSCENE_PRESENTATION:{},
    esc:String,crewCutsceneSrc:()=>null,actionCutsceneSrc:k=>`img/${k}.png`,cutsceneSource:k=>`img/${k}.png`,
    actionCutsceneLabel:k=>k,fitCutsceneImage(){},vitalsOf:()=>({}),showHeals(){},powerSound(){},refresh(){},paint(){},
    startActionCue(){},startMoveFx(){},finishWave(){},sfx(){},camera:{cue(){}},
    document:{createElement:()=>({dataset:{},classList:{add(){}},prepend(image){this.image=image;},remove(){this.isConnected=false;}})},
    setTimeout(fn,ms){const key=++id;timers.set(key,{fn,ms});return key;},clearTimeout(key){timers.delete(key);}});
  vm.runInContext(`let phase=null,phaseAt=0,phaseTimer=0,fxNow=null,fxHandled=false,commandMenuOpen=true;\n${cut}\n${command}\nglobalThis.execute=executeCommand;globalThis.phaseNow=()=>phase;`,ctx);
  return {g,cache,ctx,mounted,execute:action=>ctx.execute(action),phase:()=>ctx.phaseNow(),
    finish(){for(const [key,timer] of [...timers].sort((a,b)=>a[1].ms-b[1].ms)){timers.delete(key);timer.fn();}}};
}
