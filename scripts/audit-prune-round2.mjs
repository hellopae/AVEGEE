// Read-only, bounded audit for the final prune. Unclassified files are retained.
// Catalog membership is inventory, not evidence of a gameplay asset selection.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const git = args => execFileSync('git', args, {encoding:'utf8', maxBuffer:64*1024*1024});
const tracked = git(['ls-files','-z']).split('\0').filter(p=>p && fs.existsSync(p));
const zones = ['th','asia','west','cyberhell'];
const manifest = JSON.parse(fs.readFileSync('img/manifest.json'));
globalThis.fetch = async()=>({ok:true,json:async()=>manifest});
globalThis.Image = class {set src(value){this.value=value;}};
globalThis.document = {querySelector:()=>true, documentElement:{}}; // prevent warmZone network side effects
const art = await import('../src/art.js');
await new Promise(r=>setImmediate(r));
const {MAP_REVIEW_SIZES} = await import('../src/map-art-v5.js');
const {wideStationRoom} = await import('../src/room-art-assets.js');
const runtimeSources = tracked.filter(p=>p==='index.html'||p.startsWith('src/')&&p.endsWith('.js'));
const sources = runtimeSources.map(p=>({path:p,text:fs.readFileSync(p,'utf8')}));
const keys = new Set(['hero-yama','hero-boss','crew-guard','boss-tester','zone-boss','scene','BG-Turn-Base','BG-Frontier']);
for (const {text} of sources) for (const m of text.matchAll(/['"]((?:hero-|crew-|spirit|soul-|st-|mob-|fx-|item-|tile-|scene|boss-|intro-|leader-)[\w-]+)['"]/g)) keys.add(m[1]);
for(const k of ['nira','taan','plerng','dam','kan','boon','guard'])
 for(const pose of ['','-profile','-work','-build-work','-walk','-atk','-cry']) keys.add('crew-'+k+pose);
for(const pose of ['','-profile','-side','-atk','-atk-L','-atk-R','-cry','-walk','-walk-4dir','-unconscious','-tea-clean']) keys.add('hero-yama'+pose);
for(const k of Object.keys(MAP_REVIEW_SIZES)) keys.add('st-'+k);
for(let i=1;i<=10;i++) keys.add('spirit'+i);
for(let i=1;i<=4;i++) for(const stem of ['intro-zone','Intro-Boss-Zone','Boss Zone']) keys.add(stem+i);
const selections=[];
for(const z of zones) for(const outfit of zones){
 art.bindZone(()=>z);art.bindHeroStyle(()=>outfit);
 for(const key of keys) for(const ext of ['png','webp']) selections.push({zone:z,outfit,key,ext,path:art.artUrl(key,ext)});
}
const candidates=[];
function add(file,replacement,evidence){
 if(!fs.existsSync(file)) return;
 if(!fs.existsSync(replacement)) throw Error('Missing replacement: '+replacement);
 candidates.push({path:file,bytes:fs.statSync(file).size,replacement,evidence,runtime:'NOT VERIFIED: browser launch failed; static-only exception in brief'});
}
for(const z of zones){
 const folder={th:'',asia:'Asia/',west:'West/',cyberhell:'CyberHell/'}[z];
 art.bindZone(()=>z);art.bindHeroStyle(()=>z);
 for(const k of Object.keys(MAP_REVIEW_SIZES)){
  const key='st-'+k;
  add(`img/${folder}${key}${z==='th'?'':'-'+z}.png`,art.artUrl(key),'src/art.js themeArt runs before ZMAP/fallback; src/map-art-v5.js maps this station in every zone');
 }
 add(`img/rooms-wide/${z}-lokan.webp`,wideStationRoom(z,'lokan').image,'src/room-art-assets.js wideStationRoom selects lokan-ice-v2; src/ui.js stBg uses it before legacy artUrl');
}
for(let i=1;i<=5;i++) for(const ext of ['png','webp'])
 add(`img/intro-panel-0${i}.${ext}`,`img/intro-panel-0${i}-v2.webp`,'src/ui.js showIntro constructs only intro-panel-0${page+1}-v2.webp; old CONTENT_ROWS entries are layout metadata, not image requests');
for(const [file,replacement,evidence] of [
 ['cover-v5.webp','cover-v4.webp','src/ui.js cover probe lists v4, v3, cover.webp, cover.png; v5 absent. All remaining fallback files retained'],
 ['home-intro-v5.mp4','intro-opening-v3.mp4','index.html splash-video uses v3; src/ui.js has no home video layer'],
 ['home-animated.mp4','intro-opening-v3.mp4','No runtime call/path; replaced Home splash is index.html splash-video v3'],
 ['home-embers.mp4','cover-v4.webp','No runtime call/path; Home effects now use src/cover-fx-h5b.js canvas and v4 masks'],
 ['intro-splash.mp4','intro-opening-v3.mp4','No runtime call/path; index.html splash-video selects v3'],
 ['intro-opening-v2.mp4','intro-opening-v3.mp4','index.html splash-video selects v3 without v2 fallback'],
 ['deva-intro/deva-intro-th-v1.png','deva-intro/deva-intro-th-beggar-v2.webp','src/story.js devaIntro ternary selects beggar-v2 for th; other zones retain v1'],
 ['scene-asia.png','scene-asia-v3.png','src/data.js ZONES scene selects asia-v3; zoneImg(scene) reads zone manifest, not root scene-asia'],
 ['scene-west.png','scene-west-v2.png','src/data.js ZONES scene selects west-v2; scene-west-dusk-v3 runtime call retained'],
 ['scene-foreground.png','scene-ground-v1.png','src/view3d.js uses ground-v1, no foreground layer path'],
 ['prop-throne-platform.png','prop-throne-platform-v1.png','src/view3d.js groundDecal explicitly selects v1; assetTier regex only ranks inventory'],
 ['minigames/sala-books.png','minigames/sala-books-v2.png','src/minigames/sala.js bookSvg uses only v2'],
 ['minigames/sala-book-gold.png','minigames/sala-books-v2.png','src/minigames/sala.js bookSvg uses v2 atlas, including gold book'],
]) add('img/'+file,'img/'+replacement,evidence);
// No generic asset-key heuristic can authorize deleting a candidate selected here.
for(const c of candidates){
 if(selections.some(s=>s.path===c.path)) throw Error('Resolver still selects candidate: '+c.path);
 const refs=sources.filter(s=>s.text.includes(c.path));
 // preload ranking is not an asset call. Everything else requires explicit review.
 const unexpected=refs.filter(s=>s.path!=='src/asset-preload.js');
 if(unexpected.length) throw Error('Concrete runtime path reference: '+c.path+' '+unexpected.map(x=>x.path));
 c.inventoryRankingReferences=refs.map(s=>s.path);
}
const oldRef='origin/codex-app/2026-10-04';
const branchFiles=git(['ls-tree','-r','--name-only','-z',oldRef,'img']).split('\0').filter(Boolean);
const mainFiles=new Set(git(['ls-tree','-r','--name-only','-z','HEAD','img']).split('\0'));
const branchOnly=branchFiles.filter(p=>!mainFiles.has(p));
for(const c of candidates) if(branchOnly.includes(c.path)) throw Error('Branch-only new asset: '+c.path);
const moves=tracked.filter(p=>p.startsWith('img/raw/')||p==='img/cover-v4-full.png'||p.startsWith('img/yama-sword-v2/'))
 .map(p=>({from:p,to:p.replace(/^img\//,'art-src/'),bytes:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
const physicalRuntime=tracked.filter(p=>(p==='index.html'||p==='.nojekyll'||/^(src|img|audio)\//.test(p))&&!/\.(md|txt)$/i.test(p));
const size=files=>({files:files.length,bytes:files.reduce((n,p)=>n+fs.statSync(p).size,0)});
console.log(JSON.stringify({head:git(['rev-parse','HEAD']).trim(),branch:git(['branch','--show-current']).trim(),policy:'Bounded reviewed families only; catalogs do not protect assets; all unclassified files and active fallbacks retained',physicalRuntime:size(physicalRuntime),zones,keys:[...keys].sort(),selections,candidates,moves,branchOnly,oldRef},null,2));
