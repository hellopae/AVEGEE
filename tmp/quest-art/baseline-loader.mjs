import { execFileSync } from 'node:child_process';

export async function load(url, context, nextLoad) {
  const path = new URL(url).pathname;
  for (const file of ['src/combat-skill-assets.js', 'src/quest-fights.js']) {
    if (path.endsWith('/' + file)) {
      return {
        format:'module',
        shortCircuit:true,
        source:execFileSync('git', ['show', `HEAD:${file}`], { encoding:'utf8', cwd:new URL('../..', import.meta.url) }),
      };
    }
  }
  return nextLoad(url, context);
}
