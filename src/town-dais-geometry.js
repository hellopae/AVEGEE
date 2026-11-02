// Foot-level geometry traced on the four 1536×1024 judgement sprites.
// Roofs/spires are not colliders. Rails follow the floor edge, leaving only front stairs open.
export const DAIS_GEOMETRY = {
  th: {
    rail:[[568,956],[568,676],[95,676],[154,520],[230,360],[330,245],[1206,245],[1306,360],[1382,520],[1441,676],[982,676],[982,956]],
    solids:[[650,160,890,280]],
    floor:[[335,265],[1201,265],[1405,655],[960,655],[960,970],[590,970],[590,655],[131,655]],
  },
  asia: {
    rail:[[558,950],[580,690],[140,690],[295,470],[1240,470],[1396,690],[956,690],[978,950]],
    solids:[[660,430,870,530],[390,480,475,535],[1065,480,1140,535]],
    floor:[[310,490],[1225,490],[1360,670],[935,670],[955,970],[580,970],[600,670],[176,670]],
  },
  west: {
    rail:[[365,795],[270,710],[170,615],[225,540],[400,480],[580,455],[955,455],[1140,480],[1310,540],[1365,615],[1265,710],[1170,795]],
    solids:[[580,410,955,540],[125,520,300,680],[1236,520,1411,680]],
    floor:[[315,570],[420,505],[580,480],[955,480],[1116,505],[1221,570],[1221,680],[1140,785],[1140,885],[396,885],[396,785],[315,680]],
  },
  cyberhell: {
    rail:[[500,860],[500,720],[300,670],[180,580],[160,485],[240,405],[400,350],[600,330],[936,330],[1136,350],[1296,405],[1376,485],[1356,580],[1236,670],[1036,720],[1036,860]],
    solids:[[640,270,896,410],[450,650,540,780],[996,650,1086,780]],
    floor:[[420,375],[600,350],[936,350],[1116,375],[1270,430],[1336,500],[1310,565],[1210,640],[1010,700],[1010,895],[526,895],[526,700],[326,640],[226,565],[200,500],[266,430]],
  },
};
function localPoint(x,y,dais) {
  const scale=1536/dais.w;
  return [(x-dais.x)*scale+768,(y-dais.y)*scale+1024];
}
function polygonContains(x,y,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
function nearSegment(x,y,[ax,ay],[bx,by],radius) {
  const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/len)):0;
  return (x-ax-t*dx)**2+(y-ay-t*dy)**2<=radius*radius;
}
export function daisBlocks(x,y,zone,dais) {
  const shape=DAIS_GEOMETRY[zone];if(!shape)return false;
  const [u,v]=localPoint(x,y,dais);
  if(u<60||u>1476||v<140||v>990)return false;
  if(shape.solids.some(([x1,y1,x2,y2])=>u>=x1&&u<=x2&&v>=y1&&v<=y2))return true;
  // 4 world units on each side also keep an actor's feet clear of thin rail edges.
  const radius=4*1536/dais.w;
  return shape.rail.some((p,i)=>i&&nearSegment(u,v,shape.rail[i-1],p,radius));
}
export function daisFloorAt(x,y,zone,dais) {
  const shape=DAIS_GEOMETRY[zone];if(!shape)return false;
  const [u,v]=localPoint(x,y,dais);
  return polygonContains(u,v,shape.floor)&&!daisBlocks(x,y,zone,dais);
}
export function daisWorldPoint([u,v],dais) {
  return [dais.x+(u-768)*dais.w/1536,dais.y+(v-1024)*dais.w/1536];
}
