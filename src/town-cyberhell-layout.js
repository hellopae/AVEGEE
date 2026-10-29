// Z4-TOWN-A: coordinates measured on the owner's 1536x1024 map, 30 Oct 2026.
// Reserved red holes stay blocked. Doors/NPCs stand on the surrounding pavement.
const point = (x,y) => [x*2.5,y*2.5];
const spot = (x,y) => ({x:x*2.5,y:y*2.5});
const site = (bx,by,width,x,y,scale=1) => ({...spot(x,y),bx:bx*2.5,by:by*2.5,
  bw:width*2.5,mapScale:scale,sx:x*2.5,sy:y*2.5,
  hit:[(bx-width/2)*2.5,(by-12)*2.5,(bx+width/2)*2.5,by*2.5]});
export const CYBERHELL_LAYOUT = {
  patches:false,strictFloor:true,pathCell:8,houses:[],props:[],
  stations:{
    krata:site(187,211,76,200,235,.76), dab:site(188,410,76,195,432,.9),
    ngiw:site(229,590,76,250,611,.9), tarang:site(664,173,76,680,192,.79),
    sawan:site(1015,160,62,1010,180,.70), lokan:site(1414,201,65,1410,224,.65),
    lan:site(1294,360,94,1300,389,1.35), krajok:site(1398,599,62,1395,614,.73),
    tea:site(614,554,56,620,577,.56), sala:site(902,550,60,890,565,.54),
    canteen:site(786,326,50,795,345,.5),
  },
  spots:{plaza:spot(740,386),bench:spot(740,386),throne:spot(745,346),
    bossPier:spot(898,713),ferry:{from:point(898,713),to:point(1040,713)}},
  // The central reserved stripe is only 70x6 source pixels; see placement report.
  dais:{...spot(745,361),w:175},
  crew:{nira:point(805,383),taan:point(1280,382),dam:point(210,441),
    plerng:point(235,230),kan:point(850,565),boon:point(1040,190)},
  crewStage:{nira:[800*2.5,376*2.5,818*2.5,389*2.5]},
  merchant:spot(846,529),guard:point(745,848),challenge:point(810,857),
  frontier:{...site(768,1018,60,768,986,.8),reach:105},
  queue:[[740,422],[741,457],[743,487],[750,510],[760,542],[770,573],[770,606]].map(p=>point(...p)),
  entry:{gate:point(768,890),nira:point(790,885),goal:point(740,386),niraGoal:point(805,383)},
  riverY:1740,
};
