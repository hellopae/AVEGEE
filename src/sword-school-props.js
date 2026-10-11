let thornImage;
function loadedThorns() {
  if(typeof Image==='undefined')return null;
  if(!thornImage){thornImage=new Image();thornImage.src=new URL('../img/minigames/thorn-platform-v2.png',import.meta.url).href;}
  return thornImage.complete && thornImage.naturalWidth>0 ? thornImage : null;
}
// Floor props sit around (not through) each spirit. Coordinates follow room anchors.
export function drawSchoolProps(ctx,kind,x,y,u) {
  if(!['dab','ngiw'].includes(kind))return;
  const thorns=kind==='ngiw' ? loadedThorns() : null;
  if(thorns){ctx.drawImage(thorns,x-u*.09,y-u*.115,u*.18,u*.12);return;}
  ctx.save();ctx.translate(x,y);ctx.scale(1.25,1.25);ctx.lineJoin='round';
  if(kind==='ngiw') {
    ctx.fillStyle='#2c151de0';ctx.beginPath();ctx.ellipse(0,u*.002,u*.062,u*.016,0,0,Math.PI*2);ctx.fill();
    for(const side of [-1,1]){
      ctx.save();ctx.scale(side,1);
      const points=[[.021,.004],[.049,-.012],[.057,-.042],[.044,-.066],[.061,-.09]];
      ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a*u,b*u):ctx.moveTo(a*u,b*u));
      ctx.strokeStyle='#291921';ctx.lineWidth=u*.009;ctx.stroke();ctx.strokeStyle='#896047';ctx.lineWidth=u*.004;ctx.stroke();
      for(let j=1;j<points.length;j++){const [a,b]=points[j];ctx.fillStyle=j%2?'#ac825a':'#654237';ctx.beginPath();ctx.moveTo((a-.004)*u,b*u);ctx.lineTo((a+.017)*u,(b-.014)*u);ctx.lineTo((a+.003)*u,(b+.005)*u);ctx.closePath();ctx.fill();}
      ctx.restore();
    }
    ctx.strokeStyle='#714934';ctx.lineWidth=u*.006;ctx.beginPath();ctx.moveTo(-u*.055,-u*.018);ctx.quadraticCurveTo(0,-u*.043,u*.055,-u*.018);ctx.stroke();
    for(let j=-3;j<=3;j++){const x=j*u*.016;ctx.fillStyle='#c19a70';ctx.beginPath();ctx.moveTo(x,-u*.022);ctx.lineTo(x+u*.006,-u*.043);ctx.lineTo(x+u*.009,-u*.021);ctx.fill();}
  } else {
    for(const side of [-1,1]) {
      const thorns=kind==='ngiw' ? loadedThorns() : null;
  if(thorns){ctx.drawImage(thorns,x-u*.09,y-u*.115,u*.18,u*.12);return;}
  ctx.save();ctx.translate(side*u*.052,u*.004);ctx.rotate(side*.22);
      const steel=ctx.createLinearGradient(-u*.008,0,u*.008,0);steel.addColorStop(0,'#4a5963');steel.addColorStop(.5,'#e6e9d6');steel.addColorStop(1,'#737e88');
      ctx.fillStyle=steel;ctx.strokeStyle='#241a23';ctx.lineWidth=u*.0016;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-u*.009,-u*.028);ctx.lineTo(-u*.007,-u*.091);ctx.lineTo(u*.007,-u*.091);ctx.lineTo(u*.009,-u*.028);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#cfa15a';ctx.fillRect(-u*.022,-u*.098,u*.044,u*.009);ctx.fillStyle='#4b2330';ctx.fillRect(-u*.004,-u*.123,u*.008,u*.025);
      ctx.fillStyle='#edc87a';ctx.beginPath();ctx.arc(0,-u*.126,u*.006,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  ctx.restore();
}
