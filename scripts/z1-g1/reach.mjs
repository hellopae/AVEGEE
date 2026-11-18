import * as L from '/Users/agapae/agapae-work/.toby-worktrees/z1-v5/src/town-layout.js';
import * as G from '/Users/agapae/agapae-work/.toby-worktrees/z1-v5/src/town-zone1-g1.js';
const C=8,W=Math.ceil(L.TOWN_SIZE.w/C),H=Math.ceil(L.TOWN_SIZE.h/C);
function reach(){
  const seen=new Uint8Array(W*H);const st=[[Math.floor(1862/C),Math.floor(1090/C)]];
  const ok=(x,y)=>L.townContains(x*C+C/2,y*C+C/2);
  let s0=st[0];if(!ok(...s0)){console.log('start blocked');}
  seen[s0[1]*W+s0[0]]=1;
  while(st.length){const [x,y]=st.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const i=ny*W+nx;if(seen[i])continue;if(!ok(nx,ny))continue;seen[i]=1;st.push([nx,ny]);}}
  return seen;
}
const marks=[];
for(const [k,s] of Object.entries(L.TOWN_STATION_SITES))marks.push(['door '+k,s.x,s.y]);
for(const [k,s] of Object.entries(L.TOWN_SPOTS))if(typeof s.x==='number')marks.push(['spot '+k,s.x,s.y]);
for(const [k,s] of Object.entries(L.TOWN_CREW))marks.push(['crew '+k,s[0],s[1]]);
L.TOWN_QUEUE.forEach((q,i)=>marks.push(['queue'+i,q[0],q[1]]));
L.TOWN_STAIRS.forEach(s=>marks.push(['stair '+s.key,...s.point]));
marks.push(['merchant',L.TOWN_MERCHANT.x,L.TOWN_MERCHANT.y],['guard',...L.TOWN_GUARD_POST],['challenge',...L.TOWN_CHALLENGE],['frontier',L.TOWN_FRONTIER.x,L.TOWN_FRONTIER.y]);
const near=(R,x,y)=>{for(let r=0;r<=3;r++)for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){const cx=Math.floor(x/C)+dx,cy=Math.floor(y/C)+dy;if(cx>=0&&cy>=0&&cx<W&&cy<H&&R[cy*W+cx])return true;}return false;};
L.applyTownZoneLayout('th',{th:{}},true);const R0=reach();const m0=marks.map(m=>near(R0,m[1],m[2]));
L.applyTownZoneLayout('th',L.TOWN_ZONE_LAYOUT,true);const R1=reach();const m1=marks.map(m=>near(R1,m[1],m[2]));
let lost=0,gain=0;for(let i=0;i<R0.length;i++){if(R0[i]&&!R1[i])lost++;if(!R0[i]&&R1[i])gain++;}
console.log('reachable cells old',R0.reduce((a,b)=>a+b,0),'new',R1.reduce((a,b)=>a+b,0),'lost',lost,'gain',gain);
marks.forEach((m,i)=>{if(m0[i]!==m1[i]||!m1[i])console.log('LANDMARK',m[0],m[1],m[2],'old',m0[i],'new',m1[i]);});
// per new prop: floor under collider and distance to pads
const pads=marks.filter(m=>/door|spot|crew|queue|merchant|guard|challenge|frontier/.test(m[0]));
for(const p of L.TOWN_PROP_SITES){if(!p.id.startsWith('g1-')&&!['tree-11','lava-tree-2'].includes(p.id))continue;
  let fl=0,n=0;for(let a=0;a<12;a++){for(const f of [.5,1]){const x=p.x+Math.cos(a/12*6.283)*p.rx*f,y=p.y+Math.sin(a/12*6.283)*p.ry*f;n++;if(L.townFloorAt(x,y))fl++;}}
  const nearest=pads.map(m=>[Math.hypot(m[1]-p.x,m[2]-p.y),m[0]]).sort((a,b)=>a[0]-b[0])[0];
  if(fl>0||nearest[0]<90)console.log(p.id,'foot',p.x,p.y,'w',p.w,'floorSamples',fl+'/'+n,'nearest pad',nearest[1],Math.round(nearest[0]));
}
