// Bounded decoded bitmap cache; at most two image decodes are in flight.
export function createStreamCache({load,maxBytes=32*1024*1024,concurrency=2,releaseOutside=false,onRelease=()=>{}}={}){
 const entries=new Map(),queue=[];let protectedIds=new Set(),active=0,dead=false,bytes=0,clock=0,peakBytes=0,loads=0,evictions=0;
 const release=e=>{onRelease(e.id,e.image);e.image?.close?.();bytes-=e.bytes||0;entries.delete(e.id);evictions++;};
 function trim(){for(const e of [...entries.values()].filter(e=>e.image&&!protectedIds.has(e.id)).sort((a,b)=>a.used-b.used)){if(bytes<=maxBytes)break;release(e);}}
 function pump(){
  while(!dead&&active<concurrency&&queue.length){const e=queue.shift();if(!entries.has(e.id)||!protectedIds.has(e.id)){entries.delete(e.id);e.resolve(null);continue;}active++;e.state='loading';
   Promise.resolve().then(()=>load(e.src)).then(image=>{if(dead||entries.get(e.id)!==e||!protectedIds.has(e.id)){image?.close?.();if(entries.get(e.id)===e)entries.delete(e.id);e.resolve(null);return;}e.image=image;e.bytes=(image.width||image.naturalWidth)*(image.height||image.naturalHeight)*4;e.state='ready';bytes+=e.bytes;loads++;peakBytes=Math.max(peakBytes,bytes);trim();if(bytes>maxBytes){onRelease(e.id,image);image.close?.();bytes-=e.bytes;e.bytes=0;e.image=null;e.state='error';e.error=Error('Visible image budget exceeded');e.resolve(null);}else e.resolve(image);},error=>{if(!dead&&entries.get(e.id)===e){e.state='error';e.error=error;}e.resolve(null);}).finally(()=>{active--;pump();});
  }
 }
 return {
  want(items){protectedIds=new Set(items.map(i=>i.id));if(releaseOutside)for(const e of [...entries.values()])if(e.image&&!protectedIds.has(e.id))release(e);for(const [order,item] of items.entries()){let e=entries.get(item.id);if(e){e.used=++clock;e.order=order;continue;}let resolve;const promise=new Promise(r=>resolve=r);e={...item,order,state:'queued',promise,resolve,used:++clock};entries.set(e.id,e);queue.push(e);}queue.sort((a,b)=>a.order-b.order);trim();pump();},
  get(id){const e=entries.get(id);if(e?.image)e.used=++clock;return e?.image||null;},
  ready(ids){return ids.every(id=>entries.get(id)?.state==='ready');},
  async settle(ids){await Promise.all(ids.map(id=>entries.get(id)?.promise));},
  get stats(){return {bytes,peakBytes,loaded:loads,evictions,ready:[...entries.values()].filter(e=>e.image).length,pending:queue.length+active,errors:[...entries.values()].filter(e=>e.state==='error').map(e=>({id:e.id,message:String(e.error?.message||e.error)})),maxBytes};},
  destroy(){dead=true;for(const e of entries.values()){onRelease(e.id,e.image);e.image?.close?.();e.resolve(null);}entries.clear();queue.length=0;bytes=0;},
 };
}
