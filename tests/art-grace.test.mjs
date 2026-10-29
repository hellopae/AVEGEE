import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

test('Grace replacement assets retain their original dimensions and transparency', () => {
  execFileSync('python3', ['-c', `
from PIL import Image
pairs = [
 ('img/West/crew-boon-west-profile.png','img/West/crew-boon-west-profile-f.png'),
 ('img/West/crew-boon-west.png','img/West/crew-boon-west-f.png'),
 ('img/West/crew-boon-west-cutscene.jpeg','img/West/crew-boon-west-cutscene-f.jpeg'),
 ('img/crew-combat-v1/west/boon-idle.webp','img/crew-combat-v1/west/boon-idle-f.webp'),
 ('img/tea-rest/crew-boon-west-sit-v1.webp','img/tea-rest/crew-boon-west-sit-v1-f.webp'),
]
for old, new in pairs:
    a, b = Image.open(old), Image.open(new)
    assert a.size == b.size, (new, a.size, b.size)
    if old.endswith('.webp') or old.endswith('west.png'):
        assert b.convert('RGBA').getchannel('A').getextrema()[0] == 0, new
`]);
  const combat = JSON.parse(readFileSync('img/combat-animation-v1/manifest.json', 'utf8')).sprites;
  assert.equal(combat['crew:west:boon:idle'].src, 'img/crew-combat-v1/west/boon-idle-f.webp');
});
