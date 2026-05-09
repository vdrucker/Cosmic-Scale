# Junior Cosmic Engineer Brief

## Prime Directive

Make the atlas more truthful, more legible, and more wondrous without breaking the scale instrument.
Small verified improvements beat sweeping rewrites.

## First Fifteen Minutes

1. Run `npm.cmd run validate:catalog`.
2. Run `npm.cmd run build`.
3. Launch the app on port `5174`.
4. Test one close object, one middle layer, and one far layer before editing.
5. Read `docs/COSMIC_SCALE_HANDOFF.md`.

## Good First Tasks

- Add a small number of catalog objects to `src/cosmicCatalog.js`, then validate.
- Improve one visual family in place, such as one nebula morphology or one galaxy subtype.
- Tune a single interaction threshold and test it live with the camera.
- Add one smoke screenshot for a bug you fixed.
- Move a tiny helper out of `main.js` only if the extraction is behavior-preserving.

## Tasks That Need Care

- Gesture changes. They affect live performance and user trust.
- Entity IDs. Search, parent chains, selection, and traversal all depend on them.
- Layer centers and zoom floors. These determine whether travel feels like a scale instrument.
- Cosmic Web brightness. Bloom and additive materials can look gorgeous in one view and blinding in another.
- Moons. There are two moon states now: system-scale orbiting moons and close-view static anchors.

## Current Bugs To Watch

- Laniakea must read as Great Attractor centered, with Local Group displaced.
- Close-view moons should return to parent Planet staging around scale `0.5`.
- Jupiter and Saturn moon spacing should remain readable after any scale changes.
- Address rail and gesture layer traversal must agree.
- Duplicate host stars should stay folded into their system objects.

## Style Notes

- Avoid thin SVG-like line filaments for cosmic objects. Use pixel clouds, braids, and particle relief.
- Keep UI readable and out of the way. This is an instrument, not a landing page.
- Do not over-brighten glows to imply importance. Use structure, scale, and motion.
- Preserve the pixelated cosmic vocabulary: dense, particulate, alive.
- The user likes ambitious visuals, but only when the controls remain understandable.

## Suggested Next Feature Passes

- Planet and moon realism pass: better surfaces, relative moon sizing, and body-specific close geometry.
- Star-zone flare architecture: stable zones for sunspots, prominences, and coronal loops.
- Persistent gesture marks: lightweight deformation state stored through `cosmicRuntimeState`.
- Sound layer: ambient drones and travel/selection cues, likely in a separate focused pass.
- Catalog expansion: more named systems and structures, but keep each addition nested in the correct layer.

## Done Means

Work is done when:

- The requested behavior is visible in the browser.
- `npm.cmd run validate:catalog` passes with no warnings.
- `npm.cmd run build` passes.
- Any known caveat is documented in the final handoff.

