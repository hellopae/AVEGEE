// Stable back-to-front slots. Portraits use the same squad order, then Yama.
// Eight-member parties use two staggered diagonal files, without changing turn order.
export function planBattleFormation(count, width, height) {
  if(!Number.isInteger(count)||count<1||!(width>0&&height>0))return [];
  const columns=count>4?Math.ceil(count/2):count;
  return Array.from({length:count},(_,i)=>{
    const row=Math.floor(i/columns),column=i%columns;
    const t=columns===1?1:column/(columns-1);
    return {x:width*(.145+.172*t+(count>4&&row===1?.025:0)),
      y:height*(.615+.097*t+(count>4?(row===0?-.09:.065):0)),
      scale:.94+.06*t,depth:5+row*columns+column,
      stepX:width*.065,stepY:-height*.025};
  });
}
