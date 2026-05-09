COSMIC SCALE

<img width="480" height="270" alt="nebula_nav" src="https://github.com/user-attachments/assets/5c58b6e4-7548-4860-8ca2-a3419325c94e" />

Cosmic Scale is a Vite + Three.js + MediaPipe browser atlas, designed wih the intent of placing the cosmos in the palm of your hands.

It is meant to feel like a scale instrument: each layer changes the unit of thought while preserving a shared visual grammar, enabling 
smooth travel to any cosmic object you may see. 

The main runtime is centered in `src/main.js`. Supporting modules carry the stable seams:

- `src/cosmicCatalog.js`: authored astronomy catalog entries.
- `src/catalogSchema.js`: catalog normalization and duplicate/warning checks.
- `src/scaleConfig.js`: layer bands, zoom centers, and parent occlusion bands.
- `src/gestureIntent.js`: MediaPipe gesture interpretation helpers.
- `src/solarSystemData.js`: planet, moon, ring, and home-address data.
- `src/scenePrimitives.js`: reusable material, ring, glow, and point-cloud helpers.
- `src/cosmicRuntimeState.js`: small local-storage persistence seam.

## Run And Verify

From the project root:

npm install
npm run dev

## Layers

- Planet and Moon
- Solar System
- Stellar Neighborhood
- Milky Way Galaxy
- Local Group
- Laniakea Supercluster
- Cosmic Web
  
## Current Interaction Rules

- One-finger point acts as the aim cursor and can select by dwell. Hold for 3 seconds to select object. 
- Two-finger anchors manipulation at selection view, and is used to manipulate the whole scene at layer view
  Hold for 4 seconds to anchor object at selection view. 
- Thumbs up/down traverse scale layers.
- Closed fist and open palm perform slower inward/outward zoom.
- Search and address rail are normal UI navigation, and preserve the same travel/selection semantics as gestures.

Gesture controls require a webcam and browser camera permission. Standard UI navigation remains available as a fallback.

Current build has toggleable buttons for a transparent HUD, fullscreen, and even a WIP constellation view that will bridge 
the Solar System and Stellar Neighborhood layers. 

## Visual Grammar

- Planets and moons: legible, scalable bodies with paused close-view anchors.
  <img width="480" height="270" alt="solar_system" src="https://github.com/user-attachments/assets/184862bd-8670-48af-966c-27d987e0fb8d" />

- Stars: plasma-like bodies with coronal texture, and sunspot cycles tied to HR index.
  <img width="480" height="270" alt="hot_world" src="https://github.com/user-attachments/assets/e927cdcf-42ef-4642-b6ad-c9e737ec3ddf" />

- Nebulae: pixel-relief sculptures with morphology-specific silhouettes.
  <img width="480" height="270" alt="star_catalog" src="https://github.com/user-attachments/assets/c46fe076-21c4-47ab-8ac1-f202a837ae1a" />

- Pulsars, quasars, and x-ray binaries: pixelated opposing streams.
- Black holes: pixelated accretion/lensing vocabulary.
- Galaxies: barycentric rotating pixel composites, with redshift hints where appropriate.
  <img width="640" height="360" alt="spiral_galaxy" src="https://github.com/user-attachments/assets/977c951a-b0b2-4bcf-a464-fee21bdbde51" />

- Local Group and Laniakea structures: composite galaxy bodies with individualized barycenters and selectable clusters.
- Cosmic Web: dense, tangled, fluid purple/pink/ pixel filaments with dark voids and restrained near-camera brightness.

## Development Notes

- Preserve live behavior first. 
- Verify after every behavior pass with both catalog validation and a production build.
- Be careful with IDs. Entity selection, parent links, search, address rail, and gesture navigation all depend on stable IDs.
- `main.js` is still large because layer builders are tightly coupled to scene state. Extract only behavior-preserving seams.
- If MediaPipe tuning becomes choppy again, inspect detection cadence and render-loop cost before changing gesture thresholds.
- Next steps are ambient sound design keyed to each layer, persistent gestural deformations, improved traversal UI, and easter eggs!
