# A4 — Worker escort spacing

Workers collect souls without walking through their waiting feet. Pickup paths must keep a 40-unit gap once clear. Each delivery reserves a walkable handoff point at least 72 units from the soul endpoint and 48 units from queued souls and other worker reservations.

The worker follows its own saved path while the soul retains its original path and travel duration. Where a narrow corridor prevents safe overtaking, the worker collects from behind and follows with clearance. A candidate is rejected if sampled transit clearance is below 40 units. All routing uses existing floor and building blocks; this does not expand walk masks.

Completion releases the matching worker job once and leaves the worker at its reserved handoff point. Cancellation leaves it at its actual current position. Legacy saves without a worker path select valid nearby floor rather than snapping to the soul endpoint. If no safe assignment exists, the existing waiting/fallback rules apply.

Scope: worker escorts only. Crew and Nira escort behavior is unchanged. Zone 4 and border walk-mask approvals remain pending; test fixtures do not unlock them for players.

Validation: `tests/worker-spacing-a4.test.mjs` covers all four zones and arrival/prison/gate/queue routes, dense pickup/transit samples, handoff reservations, cancellation, repeated release, missing floor, legacy saves, restored delivery settlement and frozen west resumption. Browser evidence uses memory-only fixtures with the production map renderer; it settles the real delivery API immediately to inspect its final position, not natural journey timing. Visual acceptance remains with the owner.
