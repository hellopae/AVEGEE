# N4: Boss justice, guides, regional workers and area powers

Implemented on the published-main base, preserving the newer town, camera, lighting, battle and chase work. Main was fetched and fast-forwarded to `b60c9ff` before final validation. No original checkout deletions or unrelated work are included.

## Request coverage

| User request | Implementation and validation |
|---|---|
| Upper bridge stairs and blocked lower approach | Published v5 terrain remains selected; both corridors and landings checked against real sprite silhouettes, initial and fully built town. See `output/boss-expansion-20261016/town-stairs-audit.json`. |
| Zone 1–2 outer border trail, forest/waterfall/ravine/cave, relocated boss, camera and roaming proximity encounters | Existing published route retained; cave victory now suspends the route for sentencing and restores cleared camps afterward. |
| Yama and following Nira only outside; Nira fighting/idle/attack/hurt/heal sprites in all four zones | Retained published duo party and four regional sprite atlases; dedicated Nira combat tests cover party exclusion, healing, targeting and frame geometry. |
| New outside battle backgrounds and victory loot button | Retained biome battle backgrounds and item collection flow. |
| Defeated border bosses brought to regional judgement dais | Persistent court docket, bound boss plus Yama/Nira, interrogation, selectable chamber/keeper/intensity, visible keeper escort and timed punishment, return and standing border post. Includes real event and tenth-wave challenge victories. |
| Zone 4 ending judgement between ending 01 and 02 | Ending capture → mandatory mirror evidence → correct chamber/keeper/MAX intensity → actual escort/punishment → new sentencing art → ending 02/03. Browser verified through ending 02. |
| Regional demon workers hired through Nira | Four animated worker atlases; multiple hires, modes, supervision, physical repair assistance and soul escorts, wages/food/rest, persistence and regional ownership. Browser tested actual hires and work. |
| Bosses 1–3 praise Yama, accompany Yama/Nira to next gate, say farewell | Persisted praise/invitation/follow/farewell state, moving map companion, gate dialogue and safe save migration. |
| Farewell uses zone 1 clothes | All three gate farewell scenes show original Yama/Nira outfits; Asia/West use corrected v2 illustrations. |
| Boss gives money for next land after farewell | One-time 500/800/1200 grants on scene acknowledgment, visible receipt, persistent receipt after reload and no replay farming. All three journeys browser tested. |
| Wind fan, Valkyrie spear, hypnosis and ice hit groups | Wind/ice/hypnosis area behavior retained; spear now targets every living enemy with one MP/cooldown charge. Area-power tests cover multiple kills and single-target controls. |

## Generated artwork

Used the built-in `image_gen` tool. Final files are in `img/boss-guide/`, `img/boss-justice/` and `img/workers/`. Exact prompts, source provenance and final destination paths are recorded in `output/boss-expansion-assets.json`. Worker source alpha is preserved; rendering samples per-frame safe atlas rectangles without cutting characters or tools.

## Review evidence

Browser screenshots and structured reports are under `output/boss-expansion-20261016/`. The review page uses one canonical versioned UI module, preventing duplicate game instances. Browser tests use isolated in-memory saves; normal player saves are untouched.

Cache marker: `20261016-boss-justice-workers-v1`. Import-map aliases, entry URLs and preload catalogue version are synchronized. Publication requires a zero-failure final test run and a fresh fast-forward check; never force-push main.

Final validation: `node --test --test-concurrency=4 tests/*.test.mjs` — **1,053 passed, zero failed**. Browser checks covered court escort/unpause, mandatory final mirror and MAX choice, sentencing art then ending 02, all three farewell receipts with fresh-page reloads, actual guide movement, legacy active-route invitation by E/button, worker hiring and physical jobs, desktop/mobile layouts and all 64 worker frames. Legacy active-route guide interaction and same-instance old-save migration were fixed during audit. Workers escort to prison, heaven gate and returning queue.
