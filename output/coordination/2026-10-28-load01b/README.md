# LOAD-01b evidence (Toby, 28 Oct 2026)

Baseline = main 9c93fa0 (detached worktree). After = branch toby/load01b d3e11f5.
All numbers: headless Chrome (Playwright), 390x844 dpr 2 + CDP CPU throttle x4 ("mobile"), and 1440x900 dpr 1 x1 ("desktop").
Frame time = requestAnimationFrame delta over the scene window (town 20 s walk, border 14 s walk, trial 10 s, battle 16 s of attack clicks).
Runs were INTERLEAVED base/new (3 mobile reps + 1 desktop) because the machine had other heavy processes (load avg 4-50).

- summary-ab.json / ab-run-log.txt / runs-before / runs-after : raw per-run numbers (rawFrames stripped)
- scripts/ : the harness (lib.cjs boot+measure, scenes.cjs, run1.cjs, ab.sh, agg2.cjs, compare.cjs+diff.py, bakecheck.cjs)
- visual-before / visual-after : same state, reduced-motion, frozen rAF clock, mobile 390x844 (jpg q88 of the PNG captures)
- bake-bit-exact.txt : original lighting algorithm vs new time-sliced bake, 4 zones x 3 chunks

Known harness caveats: the 404s (audio/*.ogg, img/hero-yama-side.png, favicon, fx/fx-*.webp) exist on main already and are filtered from the "console empty" check;
two ERR_CONNECTION_RESET on Thai/spirit-woman-th-v2.png were the python test server under load.
