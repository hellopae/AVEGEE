import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
// Isolated in-memory QA fixture: only the gate/farewell/receipt/arrival phase.
// Cleared checkpoints are seeded; this does not validate walking the full routes.
let html=readFileSync('index.html','utf8');
html=html.replace('<head>','<head><base href="../../"><script>const reviewMemory=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>reviewMemory.get(k)??null,setItem:(k,v)=>reviewMemory.set(k,String(v)),removeItem:k=>reviewMemory.delete(k),clear:()=>reviewMemory.clear(),key:i=>[...reviewMemory.keys()][i]??null,get length(){return reviewMemory.size}}});</script>');
html=html.replace('</head>','<style>#title,#splash,#enter-gate{display:none!important}.review-toolbar{position:fixed;bottom:0;left:0;right:0;z-index:9000;background:#211820;border-top:1px solid #ae874f;display:flex;gap:8px;padding:8px;align-items:center}.review-toolbar b{font-size:11px;max-width:220px}.review-toolbar button{padding:7px;font:13px system-ui;min-height:30px}.review-toolbar output{font-size:10px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}</style></head>');
const fixture=String.raw`<div class="review-toolbar"><b>QA ปลายเส้นทาง — seed ผ่านด่านแล้ว ไม่ใช่หลักฐานเดินครบ</b><button data-route="th">โซน 1→2</button><button data-route="asia">โซน 2→3</button><button data-route="west">โซน 3→4</button><output id="guide-result"></output></div>
<script type="module">
import {openDungeon} from './src/ui.js';
import {dungeonPoint} from './src/dungeon-view.js';
import {FRONTIER} from './src/data.js';
import {warmZone} from './src/art.js';
import {initializeBossGuides,completeBossGuideStory} from './src/boss-guides.js';
const g=window.G;g.save=()=>true;g.onStory=()=>{};
let from='',baseline=0;
for(const b of document.querySelectorAll('[data-route]'))b.onclick=()=>{
 document.querySelector('dialog[open]')?.close();g.over=null;g.battle=null;g.pendingRecovery=null;g.pendingReward=null;g.pendingLevel=null;g.pendingVerdict=null;g.storyQueue=[];g.discoveryQueue=[];
 for(const id of ['item:food','power:roar'])g.discoverySeen[id]=true;
 for(const z of ['th','asia','west','cyberhell']){g.zoneTravel.visited[z]=true;g.zoneTravel.ports[z]=true;g.zoneIntroSeen[z]=true;}
 g.zoneTravel.active=null;Object.assign(g.player,g.harbourPoint());const zone=b.dataset.route;if(g.zone!==zone)g.moveZone(zone);
 g.pendingZone=null;g.assetsLoading=false;g.storyQueue=[];g.coin=10000;g.food=100;g.courtClosed=true;g.mobs=[];g.nextArrive=g.nextKpi=g.nextEvent=1e9;
 for(const k of Object.keys(g.storySeen))if(k.startsWith('boss-guide-'))delete g.storySeen[k];
 g.bossCleared[zone]=true;g.bossJustice={version:1,active:null,ledger:{}};g.bossGuides=null;initializeBossGuides(g);g.bossGuides.zones[zone]={won:true,praised:true,welcomed:true,following:true,farewell:false,grantPaid:false,grantNotice:false,grantAmount:0,outfitGranted:false};
 const to={th:'asia',asia:'west',west:'cyberhell'}[zone];g.outfitsOwned=['th'];Object.assign(g.player,{x:FRONTIER.x,y:FRONTIER.y});g.beginBorderDungeon(to);
 const a=g.zoneTravel.active;a.checkpoint=3;a.cleared=[0,1,2].map(i=>[zone,to,i].join(':'));a.defeated=[...a.cleared];a.patrolDefeated=Array.from({length:6},(_,i)=>'th:asia:patrol:'+i);const p=dungeonPoint(.97,a.route);a.position={x:p[0],y:p[1]};a.guidePosition={x:p[0]-.02,y:p[1]+.01};
 from=zone;baseline=g.coin;warmZone(zone);openDungeon();
};
setInterval(()=>{document.querySelector('#guide-result').textContent=JSON.stringify({zone:g.zone,coin:g.coin,gift:g.coin-baseline,outfits:g.outfitsOwned,guide:from?g.bossGuides?.zones[from]:null,story:g.storyQueue.map(s=>s.key)});},500);
</script>`;
const version=html.match(/<meta name="avegee-build" content="([^"]+)"/)?.[1];
html=html.replace('</body>',fixture.replace("from './src/ui.js';",`from './src/ui.js?v=${version}';`)+'</body>');
mkdirSync('output/guide-exit-review',{recursive:true});writeFileSync('output/guide-exit-review/index.html',html);
