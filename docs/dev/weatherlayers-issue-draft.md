# Draft GitHub issue for weatherlayers/weatherlayers-gl (lead posts under his account)

Post at: https://github.com/weatherlayers/weatherlayers-gl/issues/new
Attach: two screenshots from `tools/repro/particle-center-circle.html` (globe vs mercator), made by
serving the repo root (`npx http-server . -p 8090`) after building the repro bundle
(`npx esbuild tools/repro/repro-entry.mjs --bundle --format=iife --outfile=tools/repro/repro-bundle.js`).

---

**Title:** ParticleLayer on MapLibre globe projection: permanent particle void ("circle") at the viewport center

**Body:**

ParticleLayer rendered on the MapLibre globe projection develops a visible circular artifact pinned
to the viewport center: after a few seconds of animation, a small disc at the screen center empties
of particles and its rim reads as a circle/rosette. It follows the camera (always screen-centered,
regardless of panning) and appears at every zoom level (larger and more visible at mid zooms).

**Environment:** weatherlayers-gl 2026.5.2, @deck.gl/core + @deck.gl/mapbox 9.3.3, maplibre-gl
5.24.0, Chrome (Windows). Reproduced with `MapboxOverlay` in both `interleaved: true` and
`interleaved: false`.

**Reproduction (minimal, no app code):** a bare MapLibre map with `setProjection({type:'globe'})`,
a `MapboxOverlay`, and one `ParticleLayer` fed a synthetic **uniform** wind texture
(`Float32Array`, u=8, v=0 everywhere, `imageType: 'VECTOR'`, `bounds: [-180,-90,180,90]`,
`numParticles: 20000`). With uniform wind no circular flow can come from data, yet the circle
appears at the viewport center after a few seconds. Switching only the projection to `mercator`
renders perfectly uniformly.

**Suspected cause:** in the particle update shader's globe branch, respawn positions are computed
as `destinationPoint(viewportGlobeCenter, sqrt(rand + 0.0001) * viewportGlobeRadius, rand * 360)`.
The `+ 0.0001` inside the square root puts a floor of `sqrt(0.0001) = 1%` of
`viewportGlobeRadius` on the respawn distance, so particles can never respawn within 1% of the
viewport radius of the screen center. That disc drains within a few seconds (particles advect out,
none spawn in) and becomes visible. Present in every globe-capable release checked (2025.1.0,
2025.5.0, 2025.8.0, 2025.12.0, 2026.2.0, 2026.5.2).

**Suggested fix:** drop or drastically shrink the epsilon (distance 0 is benign for the
destination-point formula), or sample the spherical cap uniformly without a minimum-distance floor.
