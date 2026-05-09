# Cosmic Scale Handoff

## Project Shape

Cosmic Scale is a Vite + Three.js + MediaPipe browser atlas in `C:\AI\Mediapipe\cosmic-scale`.
It is meant to feel like a scale instrument: each layer changes the unit of thought while preserving a shared visual grammar.

The main runtime is still centered in `src/main.js`. Supporting modules carry the stable seams:

- `src/cosmicCatalog.js`: authored astronomy catalog entries.
- `src/catalogSchema.js`: catalog normalization and duplicate/warning checks.
- `src/scaleConfig.js`: layer bands, zoom centers, and parent occlusion bands.
- `src/gestureIntent.js`: MediaPipe gesture interpretation helpers.
- `src/solarSystemData.js`: planet, moon, ring, and home-address data.
- `src/scenePrimitives.js`: reusable material, ring, glow, and point-cloud helpers.
- `src/cosmicRuntimeState.js`: small local-storage persistence seam.

Do not jump to SQLite yet. The browser app is still well served by JS catalog modules; SQLite would add async boot, WASM or worker complexity, storage choices, and migration overhead before the app needs it.

## Run And Verify

From PowerShell in `C:\AI\Mediapipe\cosmic-scale`:

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5174
```

Before calling work complete:

```powershell
npm.cmd run validate:catalog
npm.cmd run build
```

The Vite build currently emits a large chunk warning. That warning is expected unless a task specifically targets bundle splitting.

Useful smoke URLs:

- `http://127.0.0.1:5174/?scale=7.22` for Cosmic Web.
- `http://127.0.0.1:5174/?scale=6.18` for Laniakea Supercluster.
- `http://127.0.0.1:5174/?focus=moon:0.50` for moon-to-parent Planet staging.
- `http://127.0.0.1:5174/?focus=proxima-centauri-system:1.97` for exoplanet-system staging.

## Current Interaction Rules

- One-finger point acts as the aim cursor and can select by dwell.
- Two-finger Victory anchors manipulation.
- Thumbs up/down traverse scale layers.
- Closed fist and open palm perform slower inward/outward zoom.
- Search and address rail are normal UI navigation, but must preserve the same travel/selection semantics as gestures.

Moon behavior is intentionally staged:

- Selecting a system-scale moon first stages its parent planet near the Planet layer.
- Selecting a close-view moon can zoom into the moon.
- Scrolling back out near scale `0.5` returns the view to the parent planet with the moon anchors visible.

Laniakea behavior is intentionally not home-centered:

- The Great Attractor is the central flow reference for the Laniakea layer.
- The Local Group is a displaced home address node and portal into the Local Group layer.
- The app is home-biased for navigation, not Ptolemaic in structure.

## Visual Grammar

- Planets and moons: legible, scalable bodies with paused close-view anchors.
- Stars: plasma-like bodies with coronal texture, but do not let glow overwhelm the body at range.
- Nebulae: pixel-relief sculptures with morphology-specific silhouettes.
- Pulsars and quasars: pixelated opposing streams, not thin line filaments.
- Black holes: pixelated accretion/lensing vocabulary.
- Galaxies: rotating pixel composites, with redshift hints where appropriate.
- Local Group and Laniakea structures: composite galaxy bodies, not simple spheres orbited by dots.
- Cosmic Web: dense, tangled, fluid purple/pink/yellow pixel filaments with dark voids and restrained near-camera brightness.

## Engineering Cautions

- Preserve live behavior first. The user prefers small ratchets over broad rewrites.
- Verify after every behavior pass with both catalog validation and a production build.
- Be careful with IDs. Entity selection, parent links, search, address rail, and gesture navigation all depend on stable IDs.
- `main.js` is still large because layer builders are tightly coupled to scene state. Extract only behavior-preserving seams.
- If MediaPipe tuning becomes choppy again, inspect detection cadence and render-loop cost before changing gesture thresholds.

