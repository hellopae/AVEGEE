# CLEAN-404

- Removed the missing Yama side-image probe and missing cover fallback. Music uses a list of the three shipped MP3 files; unknown tracks fall back without probing absent files. The favicon uses the shipped sword icon.
- On screens at most 700px wide, the battle9 boss HUD uses separate grid rows for portrait and status, with the portrait fixed at 54px. Desktop rules are unchanged.
- `tests/clean-404.test.mjs` scans literal image/audio URLs in JS under `src`, excluding the unimported legacy sword catalog and comments, and verifies the mobile CSS and DOM structure. Dynamic URL combinations are not exhaustively covered by this static scan; browser rendering/network verification was not performed.
- Full test output: `tests-full.log`. Targeted audio and battle layout tests: 22 passed; the new checks: 2 passed.

Full suite did not finish: three attempts stalled after the `combat-sprites` output, including with concurrency 4 and a 30-second test timeout. The final interrupted output is retained in `tests-full.log`; it has no final totals. Thus 0 failures for the full suite is not established.
