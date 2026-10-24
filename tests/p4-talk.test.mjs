import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame} from '../src/game.js';
import {talkTargets,findTalkTarget,pickTalk,fillTalk,crewTalkState,TALK_REACH,TALK_MAX_LINES} from '../src/talk.js';
import {TALK_LINES} from '../src/talk-lines.js';
import {hitActor,afterlifeWalkPosition} from '../src/scene.js';
import {talkInteractions,nearestInteraction,INTERACTION_REACH} from '../src/proximity.js';
import {QUEUE_LINE,BAL} from '../src/data.js';

const game=()=>{const g=createGame();(g.zoneEvents.th||={}).frontierBreach='cleared';g.save=()=>true;g.onChange=()=>{};g.coin=99999;return g;};
const reload=g=>{const h=game();assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))),true);return h;};
const helpers={walkPosition:w=>[w.path[0][0],w.path[0][1]]};
const soul=(id,extra={})=>({id,who:'ชาวบ้าน',name:'สมชาย',sex:'m',sp:1,deeds:[],merits:[],waited:0,said:[],...extra});
const rng0=()=>0;
const leaves=txt=>/\{[a-zA-Z]+\}/.test(txt);

test('who can be talked to: crew (not Nira), guard, workers, queue ranks 2+ and walking souls — not the head of the queue',()=>{
  const g=game();g.hire('plerng');g.hire('kan');g.hireGuard();g.hireWorker();
  g.crew.forEach((c,i)=>{c.x=300+i*40;c.y=500;});g.guard.x=800;g.guard.y=900;
  g.queue=[soul(1),soul(2),soul(3)];
  g.afterlifeWalks=[{soul:soul(9),destination:'prison',zone:g.zone,path:[[700,700]],elapsed:0,duration:5000},{soul:soul(8),destination:'exit',zone:g.zone,path:[[10,10]]}];
  const ids=talkTargets(g,helpers).map(t=>t.id);
  assert.ok(ids.includes('crew:taan')&&ids.includes('crew:plerng')&&ids.includes('crew:kan'));
  assert.ok(!ids.includes('crew:nira'),'Nira keeps opening the team desk');
  assert.ok(ids.includes('guard:0'));assert.ok(ids.some(i=>i.startsWith('worker:')));
  assert.ok(!ids.includes('soul:1'),'the soul being interrogated is not chatty');assert.ok(ids.includes('soul:2')&&ids.includes('soul:3'));
  assert.ok(ids.includes('soul:9'));assert.ok(!ids.includes('soul:8'),'souls leaving to heaven/rebirth are not');
  assert.equal(findTalkTarget(g,'soul:2',helpers).rank,2);
  assert.equal(TALK_REACH,70);assert.ok(TALK_REACH<INTERACTION_REACH,'talk reach is smaller than other interactions so they win');
});

test('crew states: first line once (and saved), then hungry / tired / escort / build / supervise / idle with real values',()=>{
  const g=game();g.hire('boon');const c=g.crewOf('boon');c.x=300;c.y=500;
  const t=findTalkTarget(g,'crew:boon');
  assert.equal(crewTalkState(g,c),'first');
  const a=pickTalk(g,t,{rng:rng0});assert.equal(a.first,true);assert.equal(a.group,'crew.boon.first');assert.ok(a.text.includes(c.name));
  const h=reload(g);assert.equal(h.talk.seen['crew:boon'],true,'first-time flag survives save/load');
  assert.equal(crewTalkState(g,c),'idle');
  c.hunger=10;assert.equal(crewTalkState(g,c),'hungry');c.hunger=100;
  c.morale=20.6;assert.equal(crewTalkState(g,c),'tired');
  assert.doesNotMatch(pickTalk(g,t,{rng:()=>0}).text,/\d+\.\d/,'morale is rounded (N8)');c.morale=100;
  c.escort=5;assert.equal(crewTalkState(g,c),'escort');c.escort=null;
  c.buildK='krata';assert.equal(crewTalkState(g,c),'build');c.buildK=null;
  const st=g.stations.find(s=>s.def.k==='krata');c.at='krata';st.slots=[{soul:soul(5,{name:'ลุงมี'}),intensity:3,progress:30,need:60}];
  assert.equal(crewTalkState(g,c),'supervise');
  const line=pickTalk(g,t,{rng:rng0});assert.equal(line.group,'crew.boon.supervise');assert.ok(!leaves(line.text),line.text);
  assert.match(line.text,/ลุงมี|กระทะ|ปานกลาง|50/);
});

test('workers: group follows the real job/reason, gather lines follow the material (N2), no leftover tokens',()=>{
  const g=game();const w=g.hireWorker();
  const t=()=>findTalkTarget(g,`worker:${w.id}`);
  const pick=()=>pickTalk(g,t(),{rng:()=>.9});
  w.mode='rest';assert.equal(pick().group,'worker.rest');w.mode='auto';
  w.job={kind:'gather',material:'ngiwWood',phase:'collect',worked:0};assert.equal(pick().group,'worker.gather.0');
  w.job.material='dabShards';assert.equal(pick().group,'worker.gather.1');
  w.job.phase='sell';assert.equal(pick().group,'worker.gather.2');
  w.job={kind:'supervise',station:'krata'};const sup=pick();assert.equal(sup.group,'worker.supervise');assert.ok(!leaves(sup.text));
  w.job={kind:'escort',soulId:1};assert.equal(pick().group,'worker.escort');
  w.job=null;w.reason='รอค่าจ้าง';assert.equal(pick().group,'worker.waitingWage');w.reason='รอเสบียง';assert.equal(pick().group,'worker.waitingFood');
  w.reason='';w.stamina=0;assert.equal(pick().group,'worker.exhausted');
});

test('queue + walking souls: group follows wait/back/queue length/destination; pronouns filled; monks skip the "back again" lines (N7)',()=>{
  const g=game();
  g.queue=[soul(1),soul(2,{waited:5}),soul(3,{waited:80}),soul(4,{back:{gave:4}}),soul(5,{back:{gave:2},sex:'monk'})];
  const pick=id=>pickTalk(g,findTalkTarget(g,`soul:${id}`,helpers),{rng:rng0});
  assert.equal(pick(2).group,'queueSoul.waitShort');assert.equal(pick(3).group,'queueSoul.waitLong');
  const back=pick(4);assert.equal(back.group,'queueSoul.returned');assert.ok(back.text.includes('หนัก'),'{back} becomes the tier NAME, not a number');
  const monk=pick(5);assert.notEqual(monk.group,'queueSoul.returned');assert.ok(!leaves(monk.text));
  for(let i=0;i<=BAL.queueMax+1;i++)g.queue.push(soul(100+i));
  assert.equal(pick(2).group,'queueSoul.overflow');
  g.queue=[soul(1),soul(2)];
  const walk=(destination,sex='f',entry=null)=>({soul:soul(50,{sex}),destination,zone:g.zone,path:[[600,600]],entry});
  const w=(dest,sex,entry)=>{g.afterlifeWalks=[walk(dest,sex,entry)];return pickTalk(g,findTalkTarget(g,'soul:50',helpers),{rng:rng0});};
  assert.equal(w('prison').group,'walkingSoul.toTarang');assert.equal(w('gate').group,'walkingSoul.toGate');
  assert.equal(w('queue').group,'walkingSoul.returnQueue');assert.equal(w('arrival').group,'walkingSoul.disembark');
  const st=w('station','f',{station:'krata',name:'กระทะทองแดง',intensity:3});
  assert.equal(st.group,'walkingSoul.toStation');assert.match(st.text,/กระทะทองแดง/);assert.match(st.text,/ปานกลาง/);assert.match(st.text,/ค่ะ|ดิฉัน/);
  assert.equal(w('station','m',{station:'krata'}).group,'walkingSoul.disembark','no station name known → never guess');
  assert.notEqual(w('queue','monk').group,'walkingSoul.returnQueue');
});

test('Nira / merchant greetings come from Rae lines and need real state',()=>{
  const g=game();
  g.queue=[];assert.equal(pickTalk(g,{kind:'nira',name:'นิรา'},{rng:rng0}).group,'nira.queueEmpty');
  g.queue=Array.from({length:BAL.queueMax},(_,i)=>soul(i+1));assert.equal(pickTalk(g,{kind:'nira',name:'นิรา'},{rng:rng0}).group,'nira.queueLong');
  g.queue=[soul(1)];g.karma=60;g.order=90;assert.equal(pickTalk(g,{kind:'nira',name:'นิรา'},{rng:rng0}).group,'nira.karmaHigh');
  g.karma=0;g.order=40;assert.equal(pickTalk(g,{kind:'nira',name:'นิรา'},{rng:rng0}).group,'nira.orderLow');
  g.order=90;assert.equal(pickTalk(g,{kind:'nira',name:'นิรา'},{rng:rng0}),null,'nothing to say = no line');
  assert.equal(pickTalk(g,{kind:'merchant',name:'พ่อค้า'},{rng:rng0,merchant:{poor:true}}).group,'merchant.poor');
});

test('TALK = ATMOSPHERE ONLY (D8): talking never changes any resource, state or the verdict inputs',()=>{
  const g=game();g.hire('plerng');g.hire('kan');g.hireGuard();g.hireWorker();
  g.crew.forEach((c,i)=>{c.x=300+i*40;c.y=500;});g.guard.x=800;g.guard.y=900;
  g.queue=[soul(1),soul(2,{waited:60}),soul(3,{back:{gave:3}})];
  g.afterlifeWalks=[{soul:soul(9),destination:'gate',zone:g.zone,path:[[700,700]],elapsed:0,duration:5000}];
  const strip=x=>{const s=JSON.parse(JSON.stringify(x.snapshot()));delete s.talk;delete s.at;return s;};
  const before=JSON.stringify(strip(g));
  for(let round=0;round<30;round++)for(const t of talkTargets(g,helpers))pickTalk(g,t,{rng:Math.random});
  assert.equal(JSON.stringify(strip(g)),before,'only g.talk (first-line flags) may change');
  const src=readFileSync(new URL('../src/talk.js',import.meta.url),'utf8');
  assert.doesNotMatch(src,/\bg\.(coin|food|karma|order|hp|mp|exp|level|inventory|queue|sentences|party)\s*([+\-*]?=)(?!=)/,'talk.js never assigns game resources');
});

test('lines: every one of Rae\'s 174 lines fills with no leftover token, Thai-only voice words are resolved, and length stays readable',()=>{
  const vars={name:'ทัณฑ์',me:'ยามา',title:'ยมบาทน้อย',zone:'สุวรรณภูมิ',soul:'ลุงมี มั่นคง',station:'กระทะทองแดง',sentence:'ปานกลาง',sentenceN:3,progress:100,queueRank:7,queueLen:12,wait:120,back:'หนัก',hunger:100,morale:100,food:80};
  let n=0;const long=[];
  const walk=(o,path)=>{for(const [k,v] of Object.entries(o)){
    if(Array.isArray(v))v.forEach((text,i)=>{n++;for(const sex of ['m','f','g','monk']){const out=fillTalk(text,vars,sex);assert.ok(!leaves(out),`${path}.${k}[${i}] ${out}`);
      if(sex==='f'&&out.length>60)long.push(`${path}.${k}[${i}] (${out.length}) ${out}`);}});
    else walk(v,`${path}.${k}`);}};
  walk(TALK_LINES,'TALK_LINES');
  assert.equal(n,174);
  console.log(`\nlines over 60 chars after fill (worst case, long names): ${long.length}\n`+long.join('\n'));
  assert.ok(long.every(l=>Number(l.match(/\((\d+)\)/)[1])<=90),'nothing absurdly long');
});

test('proximity: talk interactions sit above the head, use the 70 reach; click hit-test: workers are clickable and the NEAREST figure wins',()=>{
  const targets=[{id:'crew:taan',kind:'crew',key:'taan',x:100,y:200,top:1,name:'ทัณฑ์'},{id:'worker:worker:1',kind:'worker',key:'worker:1',x:140,y:200,top:.8,name:'อสูรผู้ช่วย 1'}];
  const list=talkInteractions(targets,82);
  assert.equal(list[0].kind,'talk');assert.equal(list[0].key,'crew:taan');assert.ok(list[0].by<200);assert.equal(list[0].anchor,'top');
  assert.equal(nearestInteraction({x:130,y:200},list,TALK_REACH).key,'worker:worker:1');
  assert.equal(nearestInteraction({x:400,y:200},list,TALK_REACH),null);
  const g=game();g.hire('plerng');const w=g.hireWorker();
  const c=g.crewOf('plerng');c.x=1400;c.y=900;c.at=null;
  w.x=1000;w.y=900;
  assert.deepEqual(hitActor(g,1000,900),{kind:'worker',key:w.id});
  g.player.x=100;g.player.y=100;
  // crew and worker overlapping: the one nearer the tap wins (not a fixed order)
  c.x=1000;c.y=900;w.x=1020;w.y=900;
  assert.equal(hitActor(g,1018,898).kind,'worker');assert.equal(hitActor(g,1002,898).kind,'crew');
});

test('wiring: ui.js uses 💬 for far taps (walks then opens), cancels on own movement, never pauses the game for talk',()=>{
  const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
  assert.match(ui,/pendingTalk = \{ id, at: Date\.now\(\) \}/);
  assert.match(ui,/pendingTalk = null;\s+\/\/ แตะที่อื่น/);
  assert.match(ui,/pendingTalk = null;\s+\/\/ เดินเอง/);
  const block=ui.slice(ui.indexOf('function closeTalk()'),ui.indexOf('function greetLine('));
  assert.doesNotMatch(block,/pauseForDlg|g\.paused\s*=/,'talk never pauses the game');
  assert.equal(TALK_MAX_LINES,3);
});
