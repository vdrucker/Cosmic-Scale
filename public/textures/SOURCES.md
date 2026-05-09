# Solar System Texture Routing

Texture folders are routed by Solar System body id in `src/main.js`.

Current source-map bodies:

- `mercury` - color and bump
- `venus` - fused cloud/color map plus bump
- `earth` - color, bump, specular, lights, cloud color, cloud alpha
- `moon` - Luna color and bump from `textures/luna`
- `mars` - color and topographic bump
- `phobos` - bump map reused as grayscale albedo and relief
- `deimos` - bump map reused as grayscale albedo and relief
- `jupiter` - color map plus close storm-band cloud layer
- `saturn` - color map plus source ring color/transparency
- `uranus` - color map plus source ring color/transparency
- `neptune` - color map plus close atmospheric layer
- `pluto` - color and bump

Bodies without source folders still use the procedural workbench as a fallback.
