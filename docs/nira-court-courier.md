# Nira dock fallback — NDC24Oct2026

New worker hires unlock after the frontier invasion. Before any worker is hired in the current zone, Nira is the harbour→judgment courier. This is a narrow exception for the reader; Taan is never reassigned to cover harbour arrivals.

Nira must be standing, not resting, already escorting, on a construction/post assignment or travelling between zones. The same collision-aware pickup/lead timeline used by other escorts moves her real coordinates and renders her once. She handles one passenger at a time. Remaining passengers stay docked until she returns or a worker can collect them.

Once any current-zone workers exist, their modes, supplies and availability control new dock pickups; the fallback cannot bypass a stopped or hungry workforce. Hiring a worker while Nira is already escorting preserves her active trip and gives new arrivals to workers.

Arrival completion releases her at the destination; normal crew movement returns her to her home platform. Early-trial cancellation releases her at her visible pickup/lead position. Save/load retains the existing arrival retry-from-dock rule without duplicating souls or leaving Nira busy. Court-closed intake rules and the existing moment at which a case becomes available are unchanged.

Regression tests: nira-court-courier.test.mjs exercises actual geometry in all4zones, initial two-character roster, no food/hiring unlock side effects, single dispatch, unavailable Nira, pickup/lead cancellation, worker takeover, starvation exclusion and saved retry. Existing dock-wait tests explicitly hold Nira busy when testing a passenger waiting for a newly hired worker.
