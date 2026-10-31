// Z4-TOWN-A: coordinates measured on the owner's 1536x1024 map, 30 Oct 2026.
// Reserved red holes stay blocked. Doors/NPCs stand on the surrounding pavement.
const point = (x,y) => [x*2.5,y*2.5];
const spot = (x,y) => ({x:x*2.5,y:y*2.5});
// Z4-TOWN-B: owner (30 Oct) found every Zone 4 building too small beside the plazas and characters. All sprites, hit boxes and
// collisions grow by K about their foot (bx,by), so doors/queue points stay where they were.
const K = 1.5;
const site = (bx,by,width,x,y,scale=1) => ({...spot(x,y),bx:bx*2.5,by:by*2.5,
  bw:width*2.5*K,mapScale:scale*K,sx:x*2.5,sy:y*2.5,
  hit:[(bx-width*K/2)*2.5,(by-12*K)*2.5,(bx+width*K/2)*2.5,by*2.5]});
export const CYBERHELL_LAYOUT = {
  patches:false,strictFloor:true,pathCell:8,houses:[],props:[],
  stations:{
    krata:site(187,211,76,200,235,.76), dab:site(188,410,76,195,432,.9),
    ngiw:site(229,590,76,250,611,.9), tarang:site(664,173,76,680,192,.79),
    sawan:site(1015,160,62,1010,180,.70), lokan:site(1414,201,65,1410,224,.65),
    lan:site(1294,360,94,1300,389,1.35), krajok:site(1398,599,62,1395,614,.73),
    tea:site(614,554,56*1.5,620,577,.56*1.5),   // Q4-6: tea pavilion x1.5 about its foot (owner 31 Oct); door and foot stay where they were sala:site(902,550,60,890,565,.54),
    // Q4-8 (owner arrow, 16.08.28): the kitchen moved from beside the upper castle down to the plaza below the stairs (world ~1600,680; floor y 640-715).
    canteen:site(640,268,50,640,278,.5),
  },
  spots:{plaza:spot(740,440),bench:spot(740,440),throne:spot(742,380),
    bossPier:spot(898,713),ferry:{from:point(898,713),to:point(1040,713)}},
  // The central reserved stripe is only 70x6 source pixels; see placement report.
  dais:{...spot(742,425),w:245},   // centre of the big judgement circle
  crew:{nira:point(764,396),taan:point(1280,382),dam:point(210,441),
    plerng:point(235,230),kan:point(850,565),boon:point(1040,190)},
  crewStage:{nira:[758*2.5,390*2.5,772*2.5,402*2.5]},
  merchant:spot(704,636),   // Q4-7 (owner arrow, 16.09.28): from beside the library to the lower-left plaza west of the central stairs (world ~1760,1590)
  guard:point(745,848),challenge:point(810,857),
  frontier:{...site(768,1018,60,768,986,.8),reach:105},
  queue:[[740,452],[742,472],[743,487],[750,510],[760,542],[770,573],[770,606]].map(p=>point(...p)),
  entry:{gate:point(768,890),nira:point(790,885),goal:point(740,440),niraGoal:point(764,396)},
  riverY:1740,
};
