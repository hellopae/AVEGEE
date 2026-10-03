# Zone UI corrections

Changed src/ui.js, index.html, src/game.js; added src/zone-introductions.js and tests/zone-introductions.test.mjs.

- Zone1 thBorderBoss preparation now opens the existing Intro-Boss-Zone1 scene before starting first combat. Existing bossArriveSeen controls retries. A queued close event from the preparation dialog cannot skip the new introduction. Victory scenes and rewards are unchanged.
- Zone2–4 arrival is two pages: existing area artwork with Nira's introduction, then new friendly seated ruler artwork and judicial welcome. Uses authorityOf, distinct from enemy inspectors.
- zoneIntroSeen is saved after completing the final page. Returning skips completed introductions; an interrupted introduction remains available, including older saves with no flag.
- Arrival captions and button sit together within one bottom overlay on the artwork. Desktop band 21%, mobile band 32% with scrollable caption, shortened controls and hidden hint. Other story comics unchanged.
- Crew/Guard cutscenes use g.zone and all 18 exact regional PNG filenames. Selected Yama outfit is unaffected. Missing image fallback uses current zone standee; a second failure removes the overlay.
- Yama and Nira are independently foot anchored, scale with map size and follow the same polyline. Nira lags along the path rather than horizontally into the abyss, then catches up before moveZone. Actual bridge paths remain root-owned src/zone-map.js.

Validation: node --check src/ui.js and src/zone-introductions.js passed. Full existing/new suite passed 218 tests, then added and passed a save/restore test (targeted 4/4; new full total expected 219). Browser validation with final artwork still pending root integration. No commits or push performed.
