# AVEGEE Enhancement Backlog

Requested by owner, 2026-10-20. This adds experiments to the existing repair queue; it does not replace unfinished gameplay/map work.

## Constraints

- Preserve existing game architecture, original 2D pixel-art visuals, and gameplay.
- Use isolated branches or files. No migration, core refactor, or replacement of original assets without owner review.
- Do not assume either tool is installed, accessible, licensed, or controllable through MCP. Verify actual capabilities first.
- Keep only experiments with measurable benefits. Present a comparison for review before production integration.

## Queue

| Priority | Tool / experiment | Scope | Status |
| --- | --- | --- | --- |
| High | Shado Studio — VFX | Lava, fire, smoke, water, clouds, leaves, souls and particles over an existing 2D scene | 2D fire template tested; export asks for account; deferred behind game repairs |
| Medium | Hunyuan 3D — Judgment Platform | Create a comparison model of the existing judgment dais; preserve original artwork | Queued |
| Medium | Shado Studio — 2.5D Scene | Camera, depth and mixing a 3D model with the existing 2D scene | Queued |
| Medium | Shado Studio — Animation | Character and scenery animation while retaining pixel-art style | Queued |
| Experimental | Codex — MCP Integration | Verify actual Shado control through a supported connector/MCP; record supported operations and limitations | Queued |

## Trial result — 2026-10-20

- Opened https://studio.playshado.com/studio.html and tested the Fire template in 2D side mode (flames, embers, smoke).
- Export UI offers a PNG sprite sheet, timing/pivot JSON and animated preview; selecting export opened account creation. No file was exported, no account created, and no production assets replaced.
- No Shado/Hunyuan connector was found in available plugin search. The studio exposes an AI-link option but it was not enabled; MCP control is unverified.
- Owner instructed us to defer complicated/token-heavy trials until the existing repair queue is done. Resume only after game fixes or with an already accessible export path. No runtime or visual-fidelity benefit has been established.

## Evaluation

For each experiment record tool/version, input, output, reproduction steps, and comparison against the current game:

1. Visual fidelity: palette, pixel scale, silhouettes, lighting and fit with original 2D art. Show before/after at gameplay zoom.
2. Runtime: compare frame time and dropped frames on the same browser/device/viewport and scene; record asset size, loading cost and memory where measurable.
3. Production effort: time to create, revise, export and integrate, plus recurring costs and licensing constraints if applicable.
4. Compatibility: verify supported exports/transparency, integration with the existing renderer, camera alignment and low-performance-device fallback.
5. Decision: retain, revise or reject with evidence; owner review required before replacing production assets.

## Work order

Continue the existing map/navigation/ferry/battle fixes. Run a small isolated Shado VFX proof of concept when addressing the outstanding lava/fire/water/cloud/leaf visual work, after verifying tool access. Evaluate one effect before expanding scope. Keep original effects available for comparison and fallback.
