import assert from 'node:assert/strict';

/** Verify cache busting without tying releases to historical task names. */
export function assertVersionedImports(html, files) {
  const map = JSON.parse(html.match(/<script\b[^>]*type="importmap"[^>]*>([\s\S]*?)<\/script>/)[1]).imports;
  const base = new URL('https://avegee.test/');
  for (const file of files) {
    const key = `./src/${file}`;
    const imports = Object.entries(map).filter(([alias]) => alias.split('?')[0] === key);
    assert.ok(imports.length, `${file}: importmap entry exists`);
    for (const [alias, target] of imports) {
      const url = new URL(target, base);
      assert.equal(url.pathname, `/src/${file}`, alias);
      assert.ok(url.searchParams.get('v'), `${alias}: nonempty ?v=`);
    }
  }
  const entries = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g)].map(m => new URL(m[1], base));
  const ui = entries.find(url => url.pathname === '/src/ui.js');
  assert.ok(ui, 'UI entry script exists');
  assert.equal(ui.href, new URL(map['./src/ui.js'], base).href, 'UI entry matches importmap');
  for (const entry of entries) {
    const target = map[`.${entry.pathname}`];
    if (target) assert.equal(entry.href, new URL(target, base).href, `${entry.pathname}: entry matches importmap`);
  }
}
