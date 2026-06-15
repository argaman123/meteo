import { ParticleFrame } from './particle-system';

// Wave look: each particle is a small half-circle wavefront, bulging in the direction of travel.
const ARC_SEGMENTS = 10;
const ARC_MINIMUM_RADIUS_FRACTION = 0.12;
const ARC_MAXIMUM_RADIUS_FRACTION = 0.34;
const ARC_SIZE_PIVOT_METERS_PER_SECOND = 4;
const FADE_IN_FRACTION = 0.2;
const FADE_OUT_FRACTION = 0.3;
const MINIMUM_LATITUDE_COSINE = 0.2;
const COLOR: [number, number, number] = [186, 230, 255];

export function arcAppearance(
  frame: ParticleFrame,
  sources: Float32Array,
  targets: Float32Array,
  colors: Uint8Array,
): number {
  let segment = 0;
  for (let p = 0; p < frame.count; p++) {
    const progress = frame.age[p];
    const birthFade = Math.min(1, progress / FADE_IN_FRACTION);
    const deathFade = Math.min(1, (1 - progress) / FADE_OUT_FRACTION);
    const alpha = Math.round(255 * birthFade * deathFade);
    const headLon = frame.headLon[p];
    const headLat = frame.headLat[p];
    const dirLon = frame.dirLon[p];
    const dirLat = frame.dirLat[p];
    const perpLon = -dirLat;
    const perpLat = dirLon;
    const sizeNorm = Math.min(1, frame.speed[p] / ARC_SIZE_PIVOT_METERS_PER_SECOND);
    const radius =
      frame.span[p] *
      (ARC_MINIMUM_RADIUS_FRACTION +
        (ARC_MAXIMUM_RADIUS_FRACTION - ARC_MINIMUM_RADIUS_FRACTION) * sizeNorm);
    const lonStretch = 1 / Math.max(MINIMUM_LATITUDE_COSINE, Math.cos((headLat * Math.PI) / 180));
    let previousLon = 0;
    let previousLat = 0;
    for (let k = 0; k <= ARC_SEGMENTS; k++) {
      const angle = (Math.PI * k) / ARC_SEGMENTS;
      const offsetLon = Math.cos(angle) * perpLon + Math.sin(angle) * dirLon;
      const offsetLat = Math.cos(angle) * perpLat + Math.sin(angle) * dirLat;
      const lon = headLon + radius * offsetLon * lonStretch;
      const lat = headLat + radius * offsetLat;
      if (k > 0) {
        sources[segment * 2] = previousLon;
        sources[segment * 2 + 1] = previousLat;
        targets[segment * 2] = lon;
        targets[segment * 2 + 1] = lat;
        colors[segment * 4] = COLOR[0];
        colors[segment * 4 + 1] = COLOR[1];
        colors[segment * 4 + 2] = COLOR[2];
        colors[segment * 4 + 3] = alpha;
        segment++;
      }
      previousLon = lon;
      previousLat = lat;
    }
  }
  return segment;
}
