# A6 — Neutral pose while adjusting the mirror

The room renderer previously loaded ragePoseSrc while the adjustment panel was open. The Asia attack image includes a painted fireball, so mirror adjustment appeared to cast a combat spell.

Mirror rooms now use the current outfit's ordinary idle renderer. A stationary hero faces the mirror apparatus; a moving hero retains the actual movement heading. If idle animation art is unavailable, the existing standing-art fallback applies. A residual swing timer is ignored by mirror-room presentation without clearing the underlying timer or changing attacks in other rooms.

No mirror geometry, angle calibration, optical beam, charge reward, mana, cooldown or combat asset changes. Existing all-outfit sprite fitting remains in place; outfit size normalization is the separate A7 queue item.

Tests execute the production actor render callback for all four outfits, both sides of the mirror, idle-art fallback, walking, closed panel/residual swing and non-mirror combat strokes. Browser fixtures use the real station room and mirror controls with memory-only game state; native room travel/adjustment evidence and owner visual acceptance are recorded separately.
