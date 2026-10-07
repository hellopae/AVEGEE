# Deva intro cutscene artwork

Four new narrative stills drawn from the owner's annotated maps, using the actual deity and Yama sprites as identity/outfit references. Generated with the built-in image_gen tool; full prompts and input references are in `docs/deva-intro-art-prompts-2026-10-07.json`.

These are artwork deliverables. This change does not modify event triggers, case data, rewards, or the cutscene player. Claude can use the files below when implementing the owner's revised event sequence. Existing boss attack images remain separate from these introduction images.

| Zone | New image | Intended story beat | Existing event hook |
| --- | --- | --- | --- |
| 1 / th | `img/deva-intro/deva-intro-th-v1.png` | The innocent monk disguise dissolves, revealing the gold-and-white winged Thai inspector, who invites Yama to a fair test. | `devaTest`; reveal after case 5 judgement |
| 2 / asia | `img/deva-intro/deva-intro-asia-v1.png` | Kuroha, the crow deity, descends and restrains an escaped spirit with wind beside the burning prison. | `asiaPrisonFire` / `devaArrives`, before `asiaDevaTest` |
| 3 / west | `img/deva-intro/deva-intro-west-v1.png` | Eirlin, the valkyrie, arrives through the snowy frontier gate and realizes little Yama has already defeated the vampire. | After `westVampireBreach`, before `westDevaTest` |
| 4 / cyberhell | `img/deva-intro/deva-intro-cyberhell-v1.png` | Lumen-01 challenges Yama, with Taan and the merchant visible behind him in an electrified prison. | Arrival / `cyberRescue` |

All artwork is landscape, with no embedded dialogue, buttons, HUD or annotations. Dialogue and reward delivery belong in the game overlay/event system. Do not show the mirror, fan, spear or cooldown item as already awarded in these pre-battle scenes.

Outfit locks: Thai = gold crown, black/gold robe, red front panel; Asia = black court cap and burgundy cloud-pattern robe; West = bronze horned helmet, olive tunic and fur cloak; Cyber = dark grey/violet cap and coat. The inspectors retain their existing sprite identities: Thai winged deva, black crow humanoid, silver-armored valkyrie with teal cloak, and faceless cyan-lit robotic deva.

The new files have not been added to the runtime loading lists yet because the cutscene integration is a separate system task. Add them to the appropriate zone's preload list when wiring the scenes, and update the loading-list cache version. Avoid regenerating the entire image manifest from untracked reference images; preserve unrelated bounding-box metadata.
