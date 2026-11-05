# SCENE-FX (5 Nov 2026) - moving lava / waterfalls / torches, cloud shadows, snow (zone 3), rain + lightning (zone 4) in battle + interrogation

- `scene-inventory.json` + `contact-sheet-backdrops.jpg` - every backdrop picture a battle / interrogation can show, what is in it (lava / water / falls / mist / torches), what was applied, what was left out and why.
- `NN-*.mp4` - 12.5 s clips at 390x844 (zone 1: volcano with a fireball cast in the middle, ice, forest, border, cave, interrogation room; zone 3 battle + interrogation = snow; zone 4 battle + interrogation = rain + lightning).
- `ab-*-off.jpg` / `ab-*-on.jpg` - same picture at 1280 wide with the weather switch OFF and ON (no figures, no HUD).
- Layout / masks: `img/scene-fx/` (made by `scripts/build-scene-fx.py`; `review <dir>` draws the masks over the pictures). Evidence: `scripts/scene-fx-evidence.py`.
