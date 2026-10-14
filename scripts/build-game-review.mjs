import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
let html=readFileSync('index.html','utf8');
html=html.replace(/<head>/,'<head><base href="../../"><script>const reviewMemory=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>reviewMemory.get(k)??null,setItem:(k,v)=>reviewMemory.set(k,String(v)),removeItem:k=>reviewMemory.delete(k),clear:()=>reviewMemory.clear(),key:i=>[...reviewMemory.keys()][i]??null,get length(){return reviewMemory.size}}});</script>');
html=html.replace(/src="src\/ui\.js\?[^\"]*"/,'src="src/ui.js"');
html=html.replace('</head>','<style>#title,#splash,#enter-button{display:none!important}.review-toolbar{position:fixed;top:0;left:0;right:0;z-index:9000;background:#211820;border-bottom:1px solid #ae874f;display:flex;gap:8px;padding:8px;align-items:center}.review-toolbar small{margin-right:auto}.review-toolbar button{padding:7px;font:13px system-ui;min-height:30px}body{padding-top:48px}</style></head>');
html=html.replace('</body>',`<div class="review-toolbar"><small>AVEGEE · ตรวจระบบ · ใช้เซฟในหน่วยความจำ</small><select id="review-biome" aria-label="ฉากต่อสู้"><option value="">เมือง</option><option value="volcano">ภูเขาไฟ</option><option value="ice">น้ำแข็ง</option><option value="forest">ป่า</option></select><button id="review-battle">คิวต่อสู้</button><button id="review-dungeon">ดันเจี้ยน</button><button id="review-port">ท่าเรือ</button><a href="output/zone1-2d/index.html">แผนที่</a></div><script type="module">
import {openBattle,openDungeon,openHarbour} from './src/ui.js';
import {DUNGEON_CHECKPOINTS} from './src/dungeon-view.js';
import {FRONTIER,MOB} from './src/data.js';
const g=window.G;g.save=()=>true;g.coin=10000;
const controls=[...document.querySelectorAll('.review-toolbar button')];
const lock=()=>controls.forEach(b=>b.disabled=!!g.battle);
const seed=()=>{g.over=null;g.pendingRecovery=null;g.pendingReward=null;g.pendingLevel=null;g.storyQueue=[];};
document.querySelector('#review-battle').onclick=()=>{seed();g.hire('taan');g.hire('boon');g.party.members=['taan','boon'];g.hireGuard();g.startBattle({id:999,who:'ทดสอบคิว',deserved:4,resist:true});const b=g.battle;b.sceneBiome=document.querySelector('#review-biome').value;b.foes=[{...b.foes[0],hp:450,maxHp:450,atk:[8,12]}, {...b.foes[0],id:'review-second',who:'ผู้พิทักษ์',sp:MOB.kinds[2].img,hp:180,maxHp:180,atk:[6,10]}];b.selectedFoeId=b.foes[0].id;openBattle();lock();};
document.querySelector('#review-dungeon').onclick=()=>{if(g.battle)return;seed();g.bossCleared.th=true;g.player.x=FRONTIER.x;g.player.y=FRONTIER.y;if(!g.zoneTravel.active)g.beginBorderDungeon('asia');openDungeon();};
document.querySelector('#review-port').onclick=()=>{if(g.battle)return;seed();g.zoneTravel.active=null;g.zoneTravel.visited.asia=true;g.zoneTravel.ports.asia=true;const p=g.harbourPoint();g.player.x=p.x;g.player.y=p.y;openHarbour();};
setInterval(lock,500);
</script></body>`);
mkdirSync('output/game-review',{recursive:true});writeFileSync('output/game-review/index.html',html);
