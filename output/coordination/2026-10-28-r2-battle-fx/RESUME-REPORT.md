# R2-v2 — continuation report (29 October 2026)

## Scope and recovered work

Applied the supplied previous-run `diff.patch` using `git apply --reject --whitespace=nowarn` in the assigned working directory. Only three hunks in `index.html` rejected. Resolved the module release URLs manually, preserved current R1 module versions and code, and deleted `index.html.rej`. No branch/worktree creation, switch, commit, push, deployment, hooks, status.json or worklog.json changes; no agents used.

Recovered implementation: six production modules, two test mock adjustments, the R2 tests/helper, and previous evidence files. This continuation resolves release URLs, adds a production recipe execution test, prepares a reviewer browser script, reruns current measurements/tests and writes this report and the full mapping table. Old logs without `resume-` are previous-run evidence, not current verification results.

## Findings and implementation

1. `arena()` selected `heroAtk()` for every non-sword attack. The shipped source contact sheet `source-cast-art.png` visibly shows an orange fireball painted into the Asia attack pose. This explains a fireball remaining visible even when the effect at the target is ice. This is source-asset evidence, not a renderer screenshot. Non-fire powers now retain the normal character art and use their elemental hand light. Character dimensions and game balance code are unchanged.
2. Ice/hypno recipes previously rendered target effects without a flying projectile. Their production recipes now emit the existing transparent ice shard/hypno spiral toward each target, with an elemental hand light. Wind and spear already had flight. No new art was needed; no generation jobs or prompts were used. Existing textures and their paths are listed in `power-mapping.json` and `power-mapping.md`.
3. `playActionCutscene` explicitly returned for `rage`, despite an available cutscene source; removed that suppression. It also created its image only when the move started. A per-battle readiness cache now warms and decodes sources for the actors actually fighting, including their unlocked battle powers; it retains the same decoded image element mounted by the renderer. The map/startup preload does not provide this per-team guarantee. Requests track requestedAt/loadedAt/decodedAt/error with a monotonic clock.
4. The command handler locks its presentation phase while waiting, caps the readiness wait at 300 ms, and rejects a stale command if the battle/dialog was left during decode. Timeout/error produces a title-only timed cutscene and continues the existing command completion. Late decode remains usable by later casts. Guard and enemy ultimate paths also wait. Reused image animations restart; a removed older cutscene's timer cannot reset the camera of a newly mounted one.
5. Reduced-motion handling in the inspected battle path changes dash/effect choreography, not the cutscene image eligibility. No separate persistent battle skip flag was found in the inspected `playActionCutscene` path. Image failure previously removed the overlay. Browser evidence is still needed to quantify loading delays and confirm repeated casts visually; no claim is made that these are all possible causes in live play.

## Current validation

- Focused command: `node --test tests/r2-battle-fx.test.mjs tests/guard-cutscene.test.mjs tests/30a.test.mjs tests/m2-battle-fx.test.mjs` → 39 passed, 0 failed. Initial focused attempt found a release-entry URL mismatch after conflict resolution; corrected it and reran this focused set. Latest result: `resume-focused-tests.log`.
- Node simulation: `node output/coordination/2026-10-28-r2-battle-fx/measure-readiness.mjs` → ten cycles completed; MP/damage/turn comparisons matched the real game reference. Eight simulated decode waits were 21.93–55.51 ms; two never-resolving decodes fell back in 299.98/300.42 ms. All mapped cutscene files existed. This is a controlled Node simulation, **not** cold-cache/throttled network evidence. See `resume-simulated-readiness.log` and `simulated-readiness.json`.
- Added a test executing the production ice/hypno recipes: emitted projectiles move from caster toward target, use mapped textures and contain no fire textures. Existing R2 tests cover mapping, decode completion/rejection/hang, deduplication, late readiness, repeated command protection, and leaving the battle during decode.
- Browser script: Python syntax parsed successfully. Browser execution was intentionally not retried: previous run recorded unavailable browser host and Chromium `MachPortRendezvousServer: Permission denied (1100)` in `browser-host-blocker.txt` / `browser-blocker.log`.
- Full test command: `node --test tests/*.test.mjs`, run exactly once → 1,590 tests, 1,586 passed, 4 failed, 0 cancelled; 272,138 ms (4m32s), exit 1. Log: `resume-full-tests.log`. These were R2-related assertions, not the earlier R1 exceptions: cutscene-fit required exactly two spaces before a call; J1 required rage suppression; P9 required the module release token to retain suffix `-p9`; skill-atk required the old unconditional attack-pose selector. Fixed the fit assertion to allow nesting whitespace, kept the J1 damage/three-strike assertions and updated its cutscene expectation, retained `-p9` on the new Nira release token, and replaced the skill selector string check with execution of the production selector across eight powers. No damage, MP, cooldown or turn code was changed.
- After those fixes, ran only affected files: `node --test tests/r2-battle-fx.test.mjs tests/guard-cutscene.test.mjs tests/30a.test.mjs tests/m2-battle-fx.test.mjs tests/cutscene-fit.test.mjs tests/j1-battle.test.mjs tests/p9-art-insert.test.mjs tests/skill-atk.test.mjs` → **70 passed, 0 failed**, exit 0 (`resume-affected-tests.log`). The full suite was not repeated, as requested; a full-suite 0-fail result on the final snapshot is therefore **not established**.
- Final `git diff --check` returned exit 0.

## Browser evidence handoff

Run a local server from the repo root: `python3 -m http.server 8779 --bind 127.0.0.1`. In another terminal run `python3 output/coordination/2026-10-28-r2-battle-fx/capture-browser.py` with installed Playwright/Chromium. Optional `R2_BASE_URL` changes the origin.

The script instruments the served UI in memory, executes real command handlers in ten fresh contexts with HTTP cache disabled and CDP 400 ms latency / 50,000 bytes/s, records load/decode timestamps and errors, captures the cutscene, and waits for command completion. It attempts a same-battle warm replay and a reduced-motion case. It then captures deterministic mid-flight ice/wind/hypno frames using the production canvas renderer and shipped textures in a labelled fixture. Fixture frames are renderer evidence, not full gameplay screenshots. Browser assertions/results remain unverified until a reviewer actually runs it; the warm replay is not a multi-hour play session measurement.

## Acceptance self-check

1. **Pending reviewer:** real-renderer ice plus two other elements mid-flight. Script prepared; no qualifying screenshot produced in this sandbox.
2. **Implemented/documented:** all power mappings in `power-mapping.md` and JSON, including crew, utility/interrogation powers and aliases. Non-fire elemental mappings do not fall back to fire art; production ice/hypno flight covered by a test. Live visual confirmation remains pending.
3. **Pending reviewer:** ten actual cold-cache throttled browser trials and long-play measurements. Ten Node trials are supplied only as simulation evidence; they do not satisfy the browser measurement requirement.
4. **Partially verified:** new mapping/decode/command tests and affected tests passed (70/70) after fixes. The single full run was 1,586/1,590 before the assertion/release fixes; full-suite 0 fail on the final snapshot remains unverified. No QA-pass claim.
5. **Present:** evidence, logs, mapping, source contact sheet, report and reviewer script all reside under `output/coordination/2026-10-28-r2-battle-fx/`.

## Changed files

- Entry versioning: `index.html`.
- Production: `src/asset-preload.js`, `src/battle-fx-map.js`, `src/battle-fx.js`, `src/cutscene-presentation.js`, `src/nira-combat.js`, `src/ui.js`.
- Tests: `tests/30a.test.mjs`, `tests/guard-cutscene.test.mjs`, `tests/cutscene-fit.test.mjs`, `tests/j1-battle.test.mjs`, `tests/skill-atk.test.mjs`, `tests/r2-battle-fx.test.mjs`, `tests/helpers/r2-battle-runtime.mjs`.
- Evidence: files under this report's directory (recovered historical evidence plus current `resume-*` logs, this report, mapping Markdown and `capture-browser.py`).
