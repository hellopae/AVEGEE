// Pixel mask navigation. No DOM or game state; positions remain normalized {x,y} in saves.
export function createFrontierNavigation({cols,rows,runs},corridor) {
  const cells=new Uint8Array(cols*rows);let offset=0,on=0;
  for(const run of runs){if(on)cells.fill(1,offset,offset+run);offset+=run;on^=1;}
  if(offset!==cells.length)throw new Error('Invalid frontier mask dimensions');
  const index=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[1]>=0&&p[0]<1&&p[1]<1?Math.floor(p[1]*rows)*cols+Math.floor(p[0]*cols):-1;
  const point=i=>[(i%cols+.5)/cols,(Math.floor(i/cols)+.5)/rows];
  const neighbors=(i,fn)=>{const x=i%cols;if(x)fn(i-1);if(x<cols-1)fn(i+1);if(i>=cols)fn(i-cols);if(i<cells.length-cols)fn(i+cols);};
  const cellProgress=new Float64Array(cells.length);cellProgress.fill(Infinity);
  const queue=new Int32Array(cells.length),visited=new Uint8Array(cells.length);let head=0,tail=0;
  const lengths=corridor.slice(1).map((p,i)=>Math.hypot(p[0]-corridor[i][0],p[1]-corridor[i][1])),total=lengths.reduce((a,b)=>a+b,0);
  let distance=0;
  // All centerline cells are sources. Breadth-first expansion assigns branch cells the
  // progress of the nearest centerline source by road distance, never across a cliff.
  for(let k=0;k<lengths.length;k++){
    const a=corridor[k],b=corridor[k+1],steps=Math.ceil(Math.hypot((b[0]-a[0])*cols,(b[1]-a[1])*rows)*2);
    for(let j=0;j<=steps;j++){
      const u=j/steps,i=index([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);
      if(i>=0&&cells[i]&&!visited[i]){visited[i]=1;queue[tail++]=i;cellProgress[i]=(distance+lengths[k]*u)/total;}
    }
    distance+=lengths[k];
  }
  while(head<tail){const i=queue[head++];neighbors(i,j=>{if(cells[j]&&!visited[j]){visited[j]=1;cellProgress[j]=cellProgress[i];queue[tail++]=j;}});}
  const allowed=(i,limit)=>i>=0&&!!cells[i]&&cellProgress[i]<=limit;
  const walkable=(p,limit=1)=>allowed(index(p),limit);
  const progress=p=>cellProgress[index(p)]??Infinity;
  function snap(p,limit=1){
    if(walkable(p,limit))return [...p];
    const target=Array.isArray(p)&&p.every(Number.isFinite)?p:corridor[0];let best=-1,dist=Infinity;
    for(let i=0;i<cells.length;i++)if(allowed(i,limit)){const q=point(i),d=((q[0]-target[0])*cols)**2+((q[1]-target[1])*rows)**2;if(d<dist){dist=d;best=i;}}
    return best<0?null:point(best);
  }
  function clear(a,b,limit=1){
    if(!walkable(a,limit)||!walkable(b,limit))return false;
    let x=Math.floor(a[0]*cols),y=Math.floor(a[1]*rows);
    const endX=Math.floor(b[0]*cols),endY=Math.floor(b[1]*rows),dx=(b[0]-a[0])*cols,dy=(b[1]-a[1])*rows;
    const sx=Math.sign(dx),sy=Math.sign(dy),tx=dx?1/Math.abs(dx):Infinity,ty=dy?1/Math.abs(dy):Infinity;
    let mx=dx?((sx>0?x+1:x)-a[0]*cols)/dx:Infinity,my=dy?((sy>0?y+1:y)-a[1]*rows)/dy:Infinity;
    while(x!==endX||y!==endY){
      if(x===endX)mx=Infinity;if(y===endY)my=Infinity;
      if(Math.abs(mx-my)<1e-12){
        if(!allowed(y*cols+x+sx,limit)||!allowed((y+sy)*cols+x,limit))return false;
        x+=sx;y+=sy;mx+=tx;my+=ty;
      }else if(mx<my){x+=sx;mx+=tx;}else{y+=sy;my+=ty;}
      if(x<0||y<0||x>=cols||y>=rows||!allowed(y*cols+x,limit))return false;
    }
    return true;
  }

  function move(from,to,limit=1){
    if(!Array.isArray(to)||to.length!==2||!to.every(Number.isFinite)||!walkable(from,limit))return from;
    if(clear(from,to,limit))return to;
    // Consume long input in subpixel steps; slide against either bank when blocked.
    const steps=Math.max(1,Math.ceil(Math.max(Math.abs(to[0]-from[0])*cols,Math.abs(to[1]-from[1])*rows)*2));
    const dx=(to[0]-from[0])/steps,dy=(to[1]-from[1])/steps;let p=from;
    for(let i=0;i<steps;i++){
      const next=[p[0]+dx,p[1]+dy];
      if(clear(p,next,limit))p=next;
      else {const x=[p[0]+dx,p[1]],y=[p[0],p[1]+dy];if(clear(p,x,limit))p=x;const slideY=[p[0],y[1]];if(clear(p,slideY,limit))p=slideY;}
    }
    return p;
  }
  function path(from,to,limit=1){
    if(!walkable(from,limit)||!walkable(to,limit))return [];
    if(clear(from,to,limit))return [to];
    const start=index(from),end=index(to),parent=new Int32Array(cells.length);parent.fill(-1);
    let h=0,t=0;queue[t++]=start;parent[start]=start;
    while(h<t&&parent[end]<0){const i=queue[h++];neighbors(i,j=>{if(parent[j]<0&&allowed(j,limit)){parent[j]=i;queue[t++]=j;}});}
    if(parent[end]<0)return [];
    const raw=[to];for(let i=end;i!==start;){i=parent[i];raw.push(point(i));}raw.reverse();
    const result=[];let at=from,k=0;
    while(k<raw.length){let last=k;for(let j=k+1;j<raw.length;j++){if(!clear(at,raw[j],limit))break;last=j;}result.push(raw[last]);at=raw[last];k=last+1;}
    return result;
  }
  return {cols,rows,cells,cellProgress,index,point,walkable,progress,snap,clear,move,path};
}

