import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWN_PROP_SITES, TOWN_PROP_COLLIDERS, TOWN_HOUSE_SITES, TOWN_HOUSES, TOWN_STATION_SITES,
  TOWN_SPOTS, TOWN_CREW, TOWN_QUEUE, TOWN_WALK_MASK, townFloorAt, townInRect, townInPolygon,
  townContains, townPropBlocks } from '../src/town-layout.js?v=k1d';

// K1d: scenery stands where the owner drew it on the painted map. Roots are tiny, so the foot may sit on
// the edge of a plaza, but never on a door, crew post or queue spot.
test('decorations have unique ids, art or a placeholder height, and a small solid root', () => {
  assert.ok(TOWN_PROP_SITES.length>=60,'owner marks: trees, lava trees, snow trees, rocks, lanterns, torches');
  assert.equal(new Set(TOWN_PROP_SITES.map(p=>p.id)).size,TOWN_PROP_SITES.length);
  assert.equal(TOWN_PROP_COLLIDERS.length,TOWN_PROP_SITES.length);
  const kinds=new Set(TOWN_PROP_SITES.map(p=>p.kind));
  for(const kind of ['tree','rock','palm','lamp','torch'])assert.ok(kinds.has(kind),kind);
  const count=(kind,biome)=>TOWN_PROP_SITES.filter(p=>p.kind===kind&&(!biome||p.biome===biome)).length;
  assert.equal(count('lamp'),10,'ten gold lanterns round the heaven gate');
  assert.equal(count('torch'),24,'fourteen courtyard torches and ten civic/entry fire pillars');
  assert.equal(count('tree','lava'),8,'red trees by the lava');
  assert.equal(count('tree','ice'),2,'snow trees by the ice gate');
  for(const p of TOWN_PROP_SITES){
    assert.ok([p.x,p.y,p.w,p.rx,p.ry].every(Number.isFinite),p.id);
    assert.ok(p.key||p.h>0,p.id+' has art or a placeholder height (see the K1d asset list)');
    assert.ok(p.rx*2<=p.w,p.id+' collision stays narrower than silhouette');
    assert.equal(townPropBlocks(p.x,p.y),true,p.id+' root is solid');
    assert.equal(townContains(p.x,p.y),false,p.id+' cannot be walked through');
    assert.ok(p.y<=1900||(p.id.startsWith('hell-pillar-')&&p.y>=2000&&p.x>=1700&&p.x<=2120),p.id+' stays on land or the entry island');
  }
});

test('placeholders are only the three drawings still to be made', () => {
  const placeholder=new Set(TOWN_PROP_SITES.filter(p=>!p.key).map(p=>p.kind));
  assert.deepEqual([...placeholder].sort(),['lamp','palm','torch']);
});

test('houses: only the ground floor blocks', () => {
  assert.equal(TOWN_HOUSE_SITES.length,11,'waterfall event clearing no longer contains a residence');
  assert.equal(TOWN_HOUSES.length,10);
  const keys=new Set(TOWN_HOUSE_SITES.map(h=>h.key));
  for(const k of ['front-one','left-two','right-one','right-two'])assert.ok(keys.has(k),k);
  for(const [i,h] of TOWN_HOUSE_SITES.filter((_,i)=>i!==3).entries()){
    const [x1,y1,x2,y2]=TOWN_HOUSES[i];
    assert.equal(townContains((x1+x2)/2,(y1+y2)/2),false,'house '+i+' base blocks');
    assert.ok(y2-y1>0&&y2-y1<=h.h*.4,'only the ground floor is solid');
  }
});

test('walk mask covers a sensible share of the world and blocks the soul river and lava', () => {
  const {cols,rows,data}=TOWN_WALK_MASK;
  assert.equal(cols*rows,data.length);
  let on=0;for(const v of data)on+=v;
  const share=on/data.length;
  assert.ok(share>.12&&share<.3,'walkable share '+share.toFixed(3));
  assert.equal(townFloorAt(1300,1860),false,'river');
  assert.equal(townFloorAt(900,840),false,'lava stream beside the west bank');
  assert.equal(townFloorAt(1862,1090),true,'central plaza');
  assert.equal(townFloorAt(NaN,10),false);
});

test('rooted props leave service doors, crew, dais and queue anchors accessible', () => {
  const anchors=[...Object.entries(TOWN_STATION_SITES).map(([k,p])=>['door '+k,p.x,p.y]),
    ...Object.entries(TOWN_CREW).map(([k,p])=>[k,...p]),
    ...Object.entries(TOWN_SPOTS).filter(([,p])=>p.x!=null).map(([k,p])=>[k,p.x,p.y]),
    ...TOWN_QUEUE.map((p,i)=>['queue '+i,...p])];
  for(const [key,x,y] of anchors){
    assert.equal(townPropBlocks(x,y),false,key+' stays outside solid roots');
    assert.equal(townContains(x,y),true,key+' remains on walkable ground');
  }
  assert.equal(townInRect(5,5,[0,0,10,10]),true);
  assert.equal(townInPolygon(5,5,[[0,0],[10,0],[10,10],[0,10]]),true);
});
