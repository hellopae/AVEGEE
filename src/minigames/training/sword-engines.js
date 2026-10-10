// Active-time engines; rendering and input share the same snapshot.
export const SWORD_GOAL = 10;
export const SWORD_MISSES = 10;
export const NOTE_WINDOW = .21;
export function segmentDistance(p, a, b) {
  const dx=b.x-a.x, dy=b.y-a.y, d=dx*dx+dy*dy;
  const f=d ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)) : 0;
  return Math.hypot(p.x-a.x-f*dx,p.y-a.y-f*dy);
}
function random(seed) { let s=seed>>>0; return () => { s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }
export function createRhythm(seed=1) {
  const rand=random(seed), notes=Array.from({length:24},(_,id)=>({id,lane:Math.floor(rand()*5),at:2.8+id*.75,state:'waiting'}));
  let time=0,hits=0,misses=0,feedback='เตรียมพร้อม',lastHit=-10;
  const done=()=>hits>=10||misses>=10||time>=24;
  return {
    step(dt) { if(done()||!Number.isFinite(dt)||dt<=0)return; time+=Math.min(dt,24-time);
      for(const n of notes) if(n.state==='waiting' && time>n.at+NOTE_WINDOW){n.state='miss';misses++;feedback='พลาด';if(done())break;}
    },
    input(a) { if(done()||a?.type!=='note'||!Number.isInteger(a.lane)||a.lane<0||a.lane>4)return;
      const n=notes.find(n=>n.state==='waiting'&&n.lane===a.lane&&Math.abs(n.at-time)<=NOTE_WINDOW);
      if(n){n.state='hit';hits++;lastHit=time;feedback=Math.abs(n.at-time)<.085?'แม่นยำ!':'โดน!';}
      else {misses++;feedback='ยังไม่ตรงจังหวะ';}
    },
    view:()=>({kind:'rhythm',time,hits,misses,feedback,lastHit,notes:notes.map(n=>({...n})),done:done()}),
    completed:()=>hits>=10,
    score:()=>Math.max(0,Math.min(100,hits*10-misses*3)),
  };
}
export function createSlicing(seed=1) {
  const rand=random(seed), logs=Array.from({length:32},(_,id)=>({id,at:1+id*.82,x0:.24+rand()*.53,vx:(rand()-.5)*.16,vy:-.83-rand()*.12,state:'waiting',angle:rand()*2-1,variant:id%2}));
  let time=0,hits=0,misses=0,lastHit=-10,feedback='ลากผ่านท่อนไม้ที่ลอยขึ้นมา';
  const pose=n=>{const age=time-n.at;return {...n,age,x:n.x0+n.vx*age,y:1.14+n.vy*age+.28*age*age,r:.068};};
  const done=()=>hits>=10||misses>=10||time>=30;
  return {
    step(dt){if(done()||!Number.isFinite(dt)||dt<=0)return;time+=Math.min(dt,30-time);
      for(const n of logs){if(n.state!=='waiting')continue;const p=pose(n);if(p.age>1&&p.y>1.17){n.state='miss';misses++;feedback='ท่อนไม้หลุดไป';if(done())break;}}
    },
    input(a){if(done()||a?.type!=='slice'||!a.from||!a.to)return;
      if(![a.from.x,a.from.y,a.to.x,a.to.y].every(Number.isFinite)||Math.hypot(a.from.x-a.to.x,a.from.y-a.to.y)<.006)return;
      for(const n of logs){const p=pose(n);if(n.state==='waiting'&&p.age>=0&&p.y<=1.05&&segmentDistance(p,a.from,a.to)<=p.r){n.state='hit';n.hitAt=time;hits++;lastHit=time;feedback='ฟันโดน!';if(done())break;}}
    },
    view:()=>({kind:'slicing',time,hits,misses,lastHit,feedback,logs:logs.map(pose).filter(n=>n.age>=0&&n.y<1.2&&(n.state==='waiting'||n.state==='hit'&&time-n.hitAt<.4)),done:done()}),
    completed:()=>hits>=10,
    score:()=>Math.max(0,Math.min(100,hits*10-misses*3)),
  };
}
