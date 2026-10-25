# A5 — Every verdict receives an authority scene

P3 created scenes only for five stars or red scores (<50). Ordinary scores 50–89 and non-red over-punishment therefore fell back to a map speech bubble. applyVerdict now fills these missing grades with a saved review by the current zone authority. Existing five-star praise and escalating red-streak scenes retain their original lines and order.

Ordinary reviews distinguish acceptable/good/critical grades. They report the actual reason and the existing four-star +25 bonus. Five-star scenes report their already granted +60/karma relief/heal. No payout, damage, score calculation or streak rule moved into presentation. Over-punishment remains critical even when its raw score is high.

A verdict carries an explicit scene flag so consuming a scene before showVerdict cannot revive the old map bubble. Opening a scene consumes matching pending feedback and saves before rendering; skipping and reloading do not reapply judgment. Restore discards an old in-memory badge and retains the saved scene. No historical ledger entries are replayed.

Validation: real assign calls at every grade boundary in all four zones; ordinary save/reload, critical over-punishment, red warning persistence, consume/skip/reload and stale timer suppression. Browser fixtures force the score returned by judge for deterministic grades but use real assign/doVerdict, the production scene, regional art and dialog queue. They disable saves to protect the user's game. Owner visual acceptance remains pending; four-zone fixtures do not unlock disabled maps.
