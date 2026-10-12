import test from 'node:test';
import assert from 'node:assert/strict';
import { battleSpriteRect } from '../src/battle-scale.js';

test('menu anchor excludes transparent pixels and follows the displayed mirrored sprite', async () => {
  const pixels = new Uint8ClampedArray(8*8*4);
  for(let y=3;y<6;y++) for(let x=2;x<5;x++) pixels[(y*8+x)*4+3]=255;
  const oldDoc=globalThis.document,oldStyle=globalThis.getComputedStyle;
  let transform='none';
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})})};
  globalThis.getComputedStyle=()=>({objectPosition:'50% 50%',transform});
  const img={src:'anchor-test',naturalWidth:8,naturalHeight:8,complete:true,
    getBoundingClientRect:()=>({left:100,top:200,width:80,height:80})};
  try {
    assert.deepEqual(await battleSpriteRect(img),{l:120,t:230,r:150,b:260});
    transform='matrix(-1, 0, 0, 1, 0, 0)';
    assert.deepEqual(await battleSpriteRect(img),{l:130,t:230,r:160,b:260});
  } finally {globalThis.document=oldDoc;globalThis.getComputedStyle=oldStyle;}
});
