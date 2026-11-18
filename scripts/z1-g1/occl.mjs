import * as L from '/Users/agapae/agapae-work/.toby-worktrees/z1-v5/src/town-layout.js';
const marks=[];
for(const [k,s] of Object.entries(L.TOWN_STATION_SITES))marks.push(['door '+k,s.x,s.y]);
for(const [k,s] of Object.entries(L.TOWN_SPOTS))if(typeof s.x==='number')marks.push(['spot '+k,s.x,s.y]);
for(const [k,s] of Object.entries(L.TOWN_CREW))marks.push(['crew '+k,s[0],s[1]]);
L.TOWN_QUEUE.forEach((q,i)=>marks.push(['queue'+i,q[0],q[1]]));
marks.push(['merchant',L.TOWN_MERCHANT.x,L.TOWN_MERCHANT.y],['guard',...L.TOWN_GUARD_POST],['challenge',...L.TOWN_CHALLENGE],['frontier',L.TOWN_FRONTIER.x,L.TOWN_FRONTIER.y]);
for(const p of L.TOWN_PROP_SITES){if(!(p.id.startsWith('g1-')||['tree-11','lava-tree-2'].includes(p.id))||p.kind!=='tree')continue;
 const h=p.w*1.09;
 for(const m of marks){const dx=Math.abs(m[1]-p.x),dyUp=p.y-m[2];
   // person sprite ~ 60 tall above its foot m.y: covered if its body x inside crown and its foot above the tree foot (drawn earlier) and within the crown
   if(dx<p.w*0.42&&dyUp>-2&&dyUp<h*0.9)console.log(p.id,'foot',p.x,p.y,'w',p.w,'covers',m[0],m[1],m[2],'dx',Math.round(dx),'dyUp',Math.round(dyUp));}}
