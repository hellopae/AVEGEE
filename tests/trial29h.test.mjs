import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createGame, primarySinOf } from '../src/game.js';
import { ALL_CASES, isPure } from '../src/cases.js';
import { SINS, STATIONS, INTENSITY_NAME as INTENSITY } from '../src/data.js';
import { t } from '../src/i18n.js';

globalThis.Image = class {};
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/command-wheel.css', import.meta.url), 'utf8');
const renderSource = ui.slice(ui.indexOf('    const destinationChoices ='), ui.indexOf('    const crewNow ='));
const renderChoices = (g,s) => vm.runInNewContext(`${renderSource}\n({destinationChoices,crewChoices,forceChoices});`, {
  g,s,dests:g.trialDestinations(),answer:g.trialAnswer(s),available:g.freeCrew(),pick:{},heaven:false,
  t,esc:String,blockText:b=>b?.key || '',stBg:()=>'',orbImg:()=>'',artUrl:()=>'',INTENSITY,
});
function courtSoul(g, sin = 'kong') {
  const s = g.queue[0];
  Object.assign(s, {pure:false, presses:2, deserved:4, said:[], merits:[],
    deeds:[{s:'bian',w:1,known:false,t:'secondary'}, {s:sin,w:5,known:false,t:'primary'}],
    lines:[{i:0,kind:'deny',t:'denial',used:false},{i:1,kind:'boast',t:'boast',used:false},
      {i:2,kind:'plea',t:'plea',used:false}]});
  return s;
}

test('29H: every sin targets the plea that actually reveals the primary deed, rather than the first denial', () => {
  for (const sin of Object.keys(SINS)) {
    const g = createGame(), s = courtSoul(g,sin);
    // Ensure the first hidden deed is a different sin even for bian.
    s.deeds[0].s = sin === 'bian' ? 'kong' : 'bian';
    assert.equal(g.roarTarget(s).i,2, sin);
    const before = g.karma;
    assert.ok(g.usePower('roar',s));
    assert.equal(s.roarHint,2);
    assert.equal(s.deeds[1].known,false,'roar points; it does not confess');
    assert.equal(g.karma,before+0.5);
    assert.ok(g.press(s,s.roarHint));
    assert.equal(s.deeds[1].known,true);
    assert.equal(s.roarHint,undefined);
    g.powerOf('roar').readyAt=0;
    assert.equal(g.usePower('roar',s),null);
    assert.match(g.roarWhy(s),/ไม่มีข้อไหนนำไปสู่บาปหลักแล้ว/);
  }
});

test('29H: all authored targets are proved by pressing the indicated issue', () => {
  let targeted=0;
  const sins=new Set();
  for (const c of ALL_CASES) {
    const g=createGame(), s=g.queue[0];
    Object.assign(s,{pure:isPure(c),presses:2,said:[],merits:(c.merits||[]).map(m=>({...m})),
      deeds:[...c.seen.map(d=>({...d,known:true})),...(c.hidden||[]).map(d=>({...d,known:false}))],
      lines:c.claims.map((l,i)=>({...l,i,used:false}))});
    const target=g.roarTarget(s);
    if (!target) continue;
    targeted++; sins.add(primarySinOf(s));
    const before=s.deeds.map(d=>d.known);
    g.press(s,target.i);
    assert.ok(s.deeds.some((d,i)=>!before[i] && d.known && d.s===primarySinOf(s)),c.k);
  }
  assert.ok(targeted>=10); assert.ok(sins.size>=3);
});

test('29H: used target, no matching issue, pure souls and exhausted attempts do not consume roar', () => {
  for (const setup of [s=>s.lines[2].used=true,s=>s.lines.splice(2,1),s=>s.pure=true,s=>s.presses=0]) {
    const g=createGame(),s=courtSoul(g); setup(s);
    const before={karma:g.karma,mp:g.mp,ammo:g.powerOf('roar').ammo};
    assert.equal(g.roarTarget(s),null); assert.ok(g.roarWhy(s));
    assert.equal(g.usePower('roar',s),null);
    assert.equal(g.powerOf('roar').readyAt||0,0);
    assert.deepEqual({karma:g.karma,mp:g.mp,ammo:g.powerOf('roar').ammo},before);
    if(s.pure) assert.equal(g.roarWhy(s),'ดวงนี้ไม่มีบาปให้จับ');
  }
  const g=createGame(),s=courtSoul(g);
  s.deeds.reverse(); assert.equal(g.roarTarget(s).i,0,'deny is valid when its first hidden deed is primary');
  s.roarHint=0;
  const restored=createGame(); assert.equal(restored.restore(g.snapshot()),true);
  assert.equal(restored.queue[0].roarHint,0,'legacy numeric hint loads');
  assert.equal(restored.roarTarget(restored.queue[0]).i,0);
});

test('29H: hypnosis renders the station on the wheel with no force/keeper reveal, even before construction', () => {
  for (const built of [true,false]) {
    const g=createGame(),s=courtSoul(g);g.level=4;
    if(!built)g.stations=g.stations.filter(st=>st.def.k!=='krata');
    assert.ok(g.usePower('hypno',s));
    const rendered=renderChoices(g,s);
    assert.match(rendered.destinationChoices,built?/is-revealed.*data-k="krata"/s:/trial-revealed-destination/);
    if(!built)assert.ok(rendered.destinationChoices.includes(STATIONS.find(st=>st.k==='krata').name));
    assert.doesNotMatch(rendered.crewChoices,/is-revealed/);
    assert.doesNotMatch(rendered.forceChoices,/is-revealed/);
    assert.equal(g.trialAnswer(s).intensity,null);assert.equal(g.trialAnswer(s).crew,null);
  }
});

test('29H: mirror renders station, force and keeper, and marks the primary issue before construction too', () => {
  for(const built of [true,false]) {
    const g=createGame(),s=courtSoul(g);g.level=2;
    if(!built)g.stations=g.stations.filter(st=>st.def.k!=='krata');
    assert.ok(g.usePower('mirror',s));
    const answer=g.trialAnswer(s),rendered=renderChoices(g,s);
    assert.equal(answer.station.k,'krata');assert.equal(answer.intensity,4);assert.ok(answer.crew);
    assert.match(rendered.destinationChoices,built?/is-revealed.*data-k="krata"/s:/trial-revealed-destination/);
    assert.match(rendered.crewChoices,new RegExp(`is-revealed.*data-k="${answer.crew.k}"`,'s'));
    assert.match(rendered.forceChoices,/is-revealed.*data-v="4"/s);
    assert.equal(s.roarHint,2);assert.ok(s.said.some(x=>x.text.includes('ข้อ 3')));
    if(!built)assert.equal(answer.unavailable.key,'stationMissing');
    g.press(s,2);assert.equal(s.deeds[1].known,true);
  }
});

test('29H: desktop advice bounds stay in the stage and viewport at both required sizes (CSS geometry)', () => {
  // These assertions bind the arithmetic to the production layout; browser measurement procedure is in the report.
  assert.match(css,/grid-template-columns:minmax\(0,58%\) minmax\(0,42%\)/);
  assert.match(css,/padding:74px 2\.3% 18px/);
  assert.match(css,/\.trial-hud \.court-wheel\{left:31%;bottom:24%;width:clamp\(205px,21vw,270px\)\}/);
  assert.match(css,/\.options-1:has\(\.trial-empty-hint\)\{left:0;top:auto;bottom:calc\(100% \+ 12px\);width:min\(340px,100%\);max-width:100%;max-height:26vh;overflow-y:auto/);
  assert.match(css,/aspect-ratio:9\/11/);
  for(const [width,height] of [[1280,800],[1440,900]]) {
    const stageWidth=width*.954*.58, stageHeight=height-74-18;
    const wheelWidth=Math.min(270,Math.max(205,width*.21));
    const left=width*.023+stageWidth*.31;
    const right=left+wheelWidth;
    const rightPanelLeft=width*.023+stageWidth;
    const bottom=74+stageHeight*.76-wheelWidth*11/9-12;
    const top=bottom-height*.26;
    assert.ok(left>=0 && right<=rightPanelLeft && right<=width);
    assert.ok(top>=0 && bottom<=height);
  }
});
