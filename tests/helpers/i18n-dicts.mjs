// Reads the TH / EN dictionaries out of src/i18n.js without importing the browser-only module state.
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../../src/i18n.js',import.meta.url),'utf8');
const grab=(name,end)=>{const a=src.indexOf(`const ${name} = {`),b=end?src.indexOf(end,a):src.length;
 const out={};for(const m of src.slice(a,b).matchAll(/^\s*'([^']+)':\s*'((?:[^'\\]|\\.)*)'/gm))out[m[1]]=m[2];return out;};
export const TH_DICT=grab('TH','const EN = {');
export const EN_DICT=grab('EN');
