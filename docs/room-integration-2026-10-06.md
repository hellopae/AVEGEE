# Room integration — 6 October 2026

The nine station interiors in all four zones now use the 36 shipped backgrounds in `img/rooms-wide/`. Tea pavilions retain their separate recovery scenes. The renderer fills the room viewport and transforms actors, interaction markers and pointer input through the same image box.

The courtyard, central entrance and training alcove have connected walk bounds. Service actions and training have separate proximity checks. Training markers identify the alcove; the training button enables there, and Space can open training there. Per-room exits override geometry from older backgrounds.

Map water and lava highlights are stronger, particles are larger, and decorative time continues behind dialogue/pause panels. The system's reduced-motion preference still disables animation.

Regional rulers, frontier bosses, visiting testers and inspectors now have individual names. Zone-one father remains พญายมบาท. Lumen's two testers have distinct 01/02 names. Event IDs, sprite IDs and save keys are unchanged. The preload catalog also includes the four assets introduced by the previous detail update.

Validation: 460 Node tests pass, including actual recording-canvas rendering and pointer/tick travel through all 36 interiors to service, training and exit. This does not replace visual testing on the user's tablet.

Deployment investigation: Pages is configured for `main` at repository root, but the last published build was `961d008`, before the last detail update. Publish the new commit and request a Pages rebuild; confirm the build commit and public file checksums afterward.
