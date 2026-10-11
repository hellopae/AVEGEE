let thornImage;
function loadedThorns() {
  if(typeof Image==='undefined')return null;
  if(!thornImage){thornImage=new Image();thornImage.src=new URL('../img/minigames/thorn-platform-v2.png?v=j2',import.meta.url).href;}
  return thornImage.complete && thornImage.naturalWidth>0 ? thornImage : null;
}
// Props share the room foot anchors; ngiw is raised and sorted in front of souls.
export function drawSchoolProps(ctx,kind,x,y,u) {
  if(!['dab','ngiw'].includes(kind))return;
  const thorns=kind==='ngiw' ? loadedThorns() : null;
  if(thorns){ctx.drawImage(thorns,x-u*.09,y-u*.15,u*.18,u*.12);return;}
  ctx.save();ctx.translate(x,kind==='ngiw' ? y-u*.035 : y);ctx.scale(1.25,1.25);ctx.lineJoin='round';
  if(kind==='ngiw') {
    ctx.fillStyle='#17101fe0';ctx.beginPath();ctx.ellipse(0,u*.002,u*.062,u*.016,0,0,Math.PI*2);ctx.fill();
    for(const side of [-1,1]){
      ctx.save();ctx.scale(side,1);
      const points=[[.021,.004],[.049,-.012],[.057,-.042],[.044,-.066],[.061,-.09]];
      ctx.beginPath();points.forEach(([a,b],i)=>i?ctx.lineTo(a*u,b*u):ctx.moveTo(a*u,b*u));
      ctx.strokeStyle='#211629';ctx.lineWidth=u*.009;ctx.stroke();ctx.strokeStyle='#6f3b92';ctx.lineWidth=u*.004;ctx.stroke();
      for(let j=1;j<points.length;j++){const [a,b]=points[j];ctx.fillStyle=j%2?'#bd75e0':'#30203f';ctx.beginPath();ctx.moveTo((a-.004)*u,b*u);ctx.lineTo((a+.017)*u,(b-.014)*u);ctx.lineTo((a+.003)*u,(b+.005)*u);ctx.closePath();ctx.fill();}
      ctx.restore();
    }
    ctx.strokeStyle='#593078';ctx.lineWidth=u*.006;ctx.beginPath();ctx.moveTo(-u*.055,-u*.018);ctx.quadraticCurveTo(0,-u*.043,u*.055,-u*.018);ctx.stroke();
    for(let j=-3;j<=3;j++){const x=j*u*.016;ctx.fillStyle='#a85cd3';ctx.beginPath();ctx.moveTo(x,-u*.022);ctx.lineTo(x+u*.006,-u*.043);ctx.lineTo(x+u*.009,-u*.021);ctx.fill();}
  } else {
    for(const side of [-1,1]) {
      ctx.save();ctx.translate(side*u*.052,u*.004);ctx.rotate(side*.22);
      const steel=ctx.createLinearGradient(-u*.008,0,u*.008,0);steel.addColorStop(0,'#111019');steel.addColorStop(.45,'#383240');steel.addColorStop(.52,'#665570');steel.addColorStop(1,'#19151f');
      ctx.fillStyle=steel;ctx.strokeStyle='#241a23';ctx.lineWidth=u*.0016;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-u*.009,-u*.028);ctx.lineTo(-u*.007,-u*.091);ctx.lineTo(u*.007,-u*.091);ctx.lineTo(u*.009,-u*.028);ctx.closePath();ctx.fill();ctx.stroke();
      // Black iron, carved guard and wrapped grip match the swords in the room art.
      ctx.strokeStyle='#51415f';ctx.lineWidth=u*.0012;
      ctx.beginPath();ctx.moveTo(0,-u*.087);ctx.lineTo(0,-u*.02);ctx.stroke();
      ctx.fillStyle='#211a2a';ctx.strokeStyle='#554361';ctx.lineWidth=u*.0014;
      ctx.beginPath();ctx.moveTo(-u*.022,-u*.098);ctx.lineTo(-u*.018,-u*.103);
      ctx.lineTo(-u*.012,-u*.096);ctx.lineTo(0,-u*.102);ctx.lineTo(u*.012,-u*.096);
      ctx.lineTo(u*.018,-u*.103);ctx.lineTo(u*.022,-u*.098);ctx.lineTo(u*.017,-u*.089);
      ctx.lineTo(0,-u*.094);ctx.lineTo(-u*.017,-u*.089);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#16111e';ctx.fillRect(-u*.004,-u*.123,u*.008,u*.025);
      for(let j=0;j<5;j++) {
        const gy=(-.12+j*.004)*u;ctx.beginPath();ctx.moveTo(-u*.004,gy);ctx.lineTo(u*.004,gy+u*.002);ctx.stroke();
      }
      ctx.fillStyle='#31263c';ctx.beginPath();ctx.moveTo(0,-u*.132);ctx.lineTo(u*.006,-u*.126);
      ctx.lineTo(0,-u*.12);ctx.lineTo(-u*.006,-u*.126);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
  }
  ctx.restore();
}
