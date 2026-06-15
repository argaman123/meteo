import { ParticleFrame } from './particle-system';

// Wave look: a short, gently bowed crest line lying across the swell direction. The particle
// drifts forward, so the whole crest slides sideways (perpendicular to its own length) like a
// wavefront. Uniform size — the crest does not grow with wave height.
const CREST_SEGMENTS = 7;
const CREST_LENGTH_FRACTION = 0.46;
const CREST_BOW_FRACTION = 0.14;
const FADE_IN_FRACTION = 0.2;
const FADE_OUT_FRACTION = 0.3;
const MINIMUM_LATITUDE_COSINE = 0.2;
const COLOR: [number, number, number] = [196, 235, 255];

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
    const forwardLon = frame.dirLon[p];
    const forwardLat = frame.dirLat[p];
    const crestLon = -forwardLat;
    const crestLat = forwardLon;
    const halfLength = (frame.span[p] * CREST_LENGTH_FRACTION) / 2;
    const bowDepth = frame.span[p] * CREST_LENGTH_FRACTION * CREST_BOW_FRACTION;
    const lonStretch = 1 / Math.max(MINIMUM_LATITUDE_COSINE, Math.cos((headLat * Math.PI) / 180));
    let previousLon = 0;
    let previousLat = 0;
    for (let k = 0; k <= CREST_SEGMENTS; k++) {
      const along = (k / CREST_SEGMENTS) * 2 - 1;
      const bow = (1 - along * along) * bowDepth;
      const offsetLon = along * halfLength * crestLon + bow * forwardLon;
      const offsetLat = along * halfLength * crestLat + bow * forwardLat;
      const lon = headLon + offsetLon * lonStretch;
      const lat = headLat + offsetLat;
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
