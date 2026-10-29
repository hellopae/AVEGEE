// Node/Skia production-function captures, not a full-game browser acceptance capture.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const {createCanvas,loadImage}=require('/private/tmp/weather-b-tools/node_modules/@napi-rs/canvas');
const out=new URL('./',import.meta.url),root=process.cwd();
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.localStorage={getItem:()=>null,setItem(){}};
const current=await import('../../../src/map-ambient.js');
const frontier=await import('../../../src/frontier-ambient.js');
const flow=await import('../../../src/town-flow.js');
const {applyTownZoneLayout}=await import('../../../src/town-layout.js');
const {ROUTE_GEOMETRY}=await import('../../../src/route-geometry.js');
const baselineCache=new Map();
async function baseline(file){
 if(baselineCache.has(file))return baselineCache.get(file);
 let s=execFileSync('git',['show',`72e074d9b1380fd0a154e3c30d76c0c2caf83ebe:${file}`],{encoding:'utf8'});
 // Keep baseline's changed dependencies at HEAD too; remaining imports use the current unchanged code.
 for(const match of [...s.matchAll(/from\s*['"]([^'"]+)['"]/g)]){
  const spec=match[1],resolved=new URL(spec,pathToFileURL(`${root}/${file}`));resolved.search='';
  const path=resolved.pathname.slice(root.length+1);
  const url=['src/map-ambient.js','src/map-fx-h3.js'].includes(path)?await baseline(path):resolved.href;
  s=s.replaceAll(`'${spec}'`,`'${url}'`);
 }
 const url='data:text/javascript;base64,'+Buffer.from(s).toString('base64');baselineCache.set(file,url);return url;
}
const old=await import(await baseline('src/map-ambient.js'));
const oldFront=await import(await baseline('src/frontier-ambient.js'));
const oldFlow=await import(await baseline('src/town-flow.js'));
function save(cv,file){writeFileSync(new URL(file,out),cv.toBuffer('image/png'));}
function prepare(){return createCanvas(1280,854);}
for(const [zone,img]of [['west','img/map-zone3/v1/zone3-terrain-v1-preview.webp'],['cyberhell','img/theme-v4/map-cyberhell.webp']]){
 const image=await loadImage(img);
 for(const [label,module]of [['before',old],['after',current]]){
  const cv=prepare(),c=cv.getContext('2d');c.drawImage(image,0,0,cv.width,cv.height);
  module.drawMapAmbientSky(c,zone,9050,cv.width,cv.height);
  save(cv,`${zone}-${label}.png`);
 }
}
for(const id of ['asia:west','west:cyberhell']){
 const row=ROUTE_GEOMETRY[id],image=await loadImage(row.background);
 for(const [label,module]of [['before',oldFront],['after',frontier]]){
  const cv=createCanvas(1280,720),c=cv.getContext('2d');c.drawImage(image,0,0,1280,720);
  const ambient={...row.ambient,trees:[]};if(label==='before'&&id==='west:cyberhell'){delete ambient.snowArea;delete ambient.rainArea;}
  module.drawFrontierAmbient(c,{...ambient,w:1280,h:720,time:9050});
  save(cv,`${id.replace(':','-')}-${label}.png`);
 }
}
// Three real painted water points: zone1 river, zone2 east fall, zone3 west cold channel.
for(const [zone,preview,url,view]of [
 ['th','img/map-zone1/v5/zone1-terrain-v5-preview.webp','img/map-zone1/v4/flow-v4.png',{x0:1800,y0:1740,x1:2600,y1:2240}],
 ['asia','img/map-zone2/v2/zone2-terrain-v2-preview.webp','img/map-zone2/v2/flow-v2.png',{x0:2875,y0:1125,x1:3275,y1:1625}],
 ['west','img/map-zone3/v1/zone3-terrain-v1-preview.webp','img/map-zone3/v1/flow-v1.png',{x0:775,y0:500,x1:1175,y1:1100}]
]){
 const image=await loadImage(preview),png=await loadImage(url),tmp=createCanvas(png.width,png.height),tc=tmp.getContext('2d');tc.drawImage(png,0,0);
 const field=flow.decodeFlow(tc.getImageData(0,0,png.width,png.height).data,png.width,png.height);applyTownZoneLayout(zone);
 for(const [label,module]of [['before',oldFlow],['after',flow]]){
  module.seedFlow(7);const e=module.createFlowEngine(field);for(let n=0;n<180;n++)e.update(1/60,view);
  for(const t of [3000,3500]){
   const cv=createCanvas(900,650),c=cv.getContext('2d'),sx=900/(view.x1-view.x0),sy=650/(view.y1-view.y0);
   c.setTransform(sx,0,0,sy,-view.x0*sx,-view.y0*sy);c.drawImage(image,0,0,3840,2560);e.draw(c,sx,t);
   save(cv,`water-${zone}-${label}-${t}.png`);
   for(let n=0;n<30;n++)e.update(1/60,view);
  }
 }
}
// Synchronous CPU Skia render time; deliberately no claims about rAF, CDP x4 or physical phones.
const rows=[];
for(const [id,module,oldModule]of [['asia:west',frontier,oldFront],['west:cyberhell',frontier,oldFront]]){
 const cv=createCanvas(780,1688),c=cv.getContext('2d');globalThis.devicePixelRatio=2;
 for(const [label,m]of [['before',oldModule],['after',module]]){
  const times=[];for(let n=0;n<360;n++){
   const ambient={...ROUTE_GEOMETRY[id].ambient,trees:[]};
   if(label==='before'&&id==='west:cyberhell'){delete ambient.snowArea;delete ambient.rainArea;}
   const start=performance.now();c.clearRect(0,0,780,1688);m.drawFrontierAmbient(c,{...ambient,w:780,h:440,time:9000+n*16.667});
   if(n>=60)times.push(performance.now()-start);
  }
  times.sort((a,b)=>a-b);rows.push({profile:'mobile',zone:id,label,medianMs:times[150],p95Ms:times[285],samples:times.length});
 }
}
for(const zone of ['th','asia','west']){
 applyTownZoneLayout(zone);
 const url={th:'img/map-zone1/v4/flow-v4.png',asia:'img/map-zone2/v2/flow-v2.png',west:'img/map-zone3/v1/flow-v1.png'}[zone];
 const png=await loadImage(url),cv=createCanvas(png.width,png.height),c=cv.getContext('2d');c.drawImage(png,0,0);
 const field=flow.decodeFlow(c.getImageData(0,0,png.width,png.height).data,png.width,png.height);
 const view={x0:0,y0:0,x1:3840,y1:2560};
 for(const [label,m]of [['before',oldFlow],['after',flow]]){
  m.seedFlow(7);const e=m.createFlowEngine(field),times=[];
  for(let n=0;n<360;n++){
   const st=performance.now();e.update(1/60,view,label==='after'?126:420);e.draw(c,.4,n*16.667);
   if(n>=60)times.push(performance.now()-st);
  }
  times.sort((a,b)=>a-b);rows.push({profile:'mobile',zone:'water-'+zone,label,medianMs:times[150],p95Ms:times[285],samples:times.length});
 }
}

for(const [profile,width,height,dpr]of [['desktop',1440,900,1],['mobile',390,844,2]]){
 globalThis.devicePixelRatio=dpr;
 const cv=createCanvas(width*dpr,height*dpr),c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);
 for(const zone of ['west','cyberhell']){
  for(const [label,module]of [['before',old],['after',current]]){
   const a=[];for(let n=0;n<360;n++){
    const st=performance.now();c.clearRect(0,0,width,height);module.drawMapAmbientSky(c,zone,9000+n*16.667,width,height);
    const elapsed=performance.now()-st;if(n>=60)a.push(elapsed);
   }
   a.sort((a,b)=>a-b);rows.push({profile,zone,label,medianMs:a[150],p95Ms:a[285],samples:a.length});
  }
 }
}
writeFileSync(new URL('offscreen-frame-times.json',out),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows,null,2));
