import assert from 'node:assert/strict';
import {existsSync,readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=new URL('../../',import.meta.url),base='https://avegee.test/AVEGEE/';
let review;
/** Test the actual review generator against today's index, not a stale generated output. */
export function readReleaseFile(path) {
  if(path!=='output/game-review/index.html')return readFileSync(new URL(path,root),'utf8');
  if(review!==undefined)return review;
  const dir=mkdtempSync(join(tmpdir(),'avegee-release-review-'));
  try {
    writeFileSync(join(dir,'index.html'),readReleaseFile('index.html'));
    execFileSync(process.execPath,[fileURLToPath(new URL('scripts/build-game-review.mjs',root))],{cwd:dir});
    review=readFileSync(join(dir,path),'utf8');
    assert.match(review,/<base href="\.\.\/\.\.\/">/,'review imports resolve from the game root');
    return review;
  } finally {rmSync(dir,{recursive:true,force:true});}
}
export function importMap(html) {
  const json=html.match(/<script\b[^>]*type=["']importmap["'][^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json,'entry page provides its release import map');
  return JSON.parse(json).imports;
}
export function importsOf(source) {
  return [...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]||m[2]);
}
const absolute=(path,from=base)=>new URL(path,from).href;
const scripts=html=>[...html.matchAll(/<script\b([^>]*)>/g)].flatMap(([,attrs])=>{
  if(!/\btype=["']module["']/.test(attrs))return [];
  const src=attrs.match(/\bsrc=["']([^"']+)["']/)?.[1];return src?[absolute(src)]:[];
});
function versionedFile(url,file) {
  const parsed=new URL(url);
  assert.equal(parsed.pathname,new URL(file,base).pathname,`${file} resolves to its own release file`);
  assert.ok(parsed.searchParams.get('v')?.trim(),`${file} has a nonempty release cache version`);
  assert.ok(existsSync(new URL(file,root)),`${file} exists`);
  return url;
}
export function resolvedImport(html,specifier,importer='index.html') {
  const request=absolute(specifier,absolute(importer));
  const match=Object.entries(importMap(html)).find(([key])=>absolute(key)===request);
  return match?absolute(match[1]):request;
}
/** Every alias and actual source import must use one versioned module identity. */
export function assertModuleRelease(file,html=readReleaseFile('index.html'),importer=null,{entry=false}={}) {
  const map=importMap(html),path=absolute(file),moduleScripts=scripts(html).filter(u=>new URL(u).pathname===new URL(path).pathname);
  const sourceImports=importer?importsOf(readReleaseFile(importer)).filter(s=>new URL(absolute(s,absolute(importer))).pathname===new URL(path).pathname):[];
  if(importer)assert.ok(sourceImports.length,`${importer} imports ${file}`);
  const canonical=map['./'+file]?absolute(map['./'+file]):sourceImports.length?resolvedImport(html,sourceImports[0],importer):moduleScripts[0];
  assert.ok(canonical,`${file} has a mapped, imported or entry module URL`);
  versionedFile(canonical,file);
  for(const [key,value] of Object.entries(map))if(new URL(absolute(key)).pathname===new URL(path).pathname)
    assert.equal(absolute(value),canonical,`${key} resolves to the canonical ${file} module`);
  for(const specifier of sourceImports)
    assert.equal(resolvedImport(html,specifier,importer),canonical,`${importer}: ${specifier} shares the release module`);
  if(entry)assert.equal(moduleScripts.length,1,`${file} has exactly one module entry script`);
  for(const script of moduleScripts)assert.equal(script,canonical,`${file} entry script matches its import map`);
  for(const specifier of importsOf(html))if(new URL(absolute(specifier)).pathname===new URL(path).pathname)
    assert.equal(resolvedImport(html,specifier),canonical,`${file} inline review import shares the entry module`);
  return canonical;
}
export function assertStylesheetRelease(file,html=readReleaseFile('index.html')) {
  const links=[...html.matchAll(/<link\b([^>]*)>/g)].flatMap(([,attrs])=>{
    if(!/\brel=["']stylesheet["']/.test(attrs))return [];
    const href=attrs.match(/\bhref=["']([^"']+)["']/)?.[1];return href?[absolute(href)]:[];
  }).filter(u=>new URL(u).pathname===new URL(file,base).pathname);
  assert.equal(links.length,1,`${file} has exactly one stylesheet link`);
  return versionedFile(links[0],file);
}
