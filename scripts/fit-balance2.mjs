// Fit each scenario using the requested 200 deterministic trials per state.
// Run groups 0..3 in separate Node processes, then merge their parameter patches.
import {writeFileSync} from 'node:fs';
import {simulate,scenarios,outDir} from './sim-balance2.mjs';
import {ENCOUNTER_BALANCE} from '../src/encounter-balance.js';
const group=Number(process.argv[2]||0),patch={},evidence=[];
const keyOf=s=>`${s.zone}:${s.encounter||s.kind}`;
const normal=s=>s.kind==='frontier'||s.encounter?.startsWith('minion:');
function probe(s,params){
  params=Object.fromEntries(Object.entries(params).map(([k,v])=>[k,+v.toFixed(2)]));
  ENCOUNTER_BALANCE[keyOf(s)][s.size]=params;
  const stats=[false,true].map(moves=>{
    const results=Array.from({length:200},(_,i)=>simulate({...s,moves,seed:30000+i}));
    const wins=results.filter(r=>r.result==='win');
    return {rate:wins.length/200,rounds:wins.length?wins.reduce((sum,r)=>sum+(s.kind==='breach'?r.bossRounds:r.rounds),0)/wins.length:0};
  });
  let loss=stats.reduce((sum,r)=>sum+(r.rate===0||r.rate===1?20:0),0);
  if(normal(s))loss+=stats.reduce((sum,r)=>sum+Math.max(0,.7-r.rate)+Math.max(0,r.rate-.9),0)*100;
  else loss+=stats.reduce((sum,r)=>sum+Math.max(0,4-r.rounds)+Math.max(0,r.rounds-7),0)*10;
  return {params,stats,loss};
}
for(const [index,s]of scenarios().entries()){
  if(index%4!==group)continue;
  const initial=ENCOUNTER_BALANCE[keyOf(s)][s.size];let best=probe(s,initial);
  if(best.loss>0&&normal(s)){
    // Wider ATK endpoints are enemy parameters, never a new damage calculation.
    // Try shorter ordinary fights before allowing the coarse calibration's long HP pool.
    search:for(const hp of [...new Set([2,2.5,3,4,6,initial.hp])])for(const wide of [false,true]){
      let lo=.05,hi=s.kind==='frontier'?9:5;
      for(let step=0;step<8;step++){
        const atk=(lo+hi)/2;
        const params=wide?{hp,atk,atkLow:atk*.15,atkHigh:atk*1.8}:{hp,atk};
        const candidate=probe(s,params);
        if(candidate.loss<best.loss)best=candidate;
        if(best.loss===0)break search;
        if((candidate.stats[0].rate+candidate.stats[1].rate)/2>.8)lo=atk;else hi=atk;
      }
    }
  }else if(best.loss>0){
    search:for(const hp of [initial.hp*.85,initial.hp*1.15,.5,.75,1,1.5,2,3])for(const atk of [initial.atk,initial.atk*.8,initial.atk*1.2,.3,.6,1,2]){
      const candidate=probe(s,{hp,atk});if(candidate.loss<best.loss)best=candidate;
      if(best.loss===0)break search;
    }
  }
  (patch[keyOf(s)]||={})[s.size]=best.params;
  evidence.push({...s,...best});console.log(JSON.stringify({...s,...best}));
  writeFileSync(outDir+`fit-${group}.json`,JSON.stringify({patch,evidence},null,2)+'\n');
}
