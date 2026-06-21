import { ParticleFrame } from './particle-system';

const CREST_SEGMENTS = 6;
const CREST_LENGTH_FRACTION = 0.4;
const CREST_BOW_FRACTION = 0.16;
const CREST_MIN_SCALE = 0.4;
const CREST_MAX_SCALE = 1.3;
const HEIGHT_PIVOT_METERS = 2.5;
const FADE_IN_FRACTION = 0.2;
const FADE_OUT_FRACTION = 0.4;
const MINIMUM_LATITUDE_COSINE = 0.2;
const COLOR: [number, number, number] = [200, 236, 255];

export function arcAppearance(
  frame: ParticleFrame,
  sources: Float32Array,
  targets: Float32Array,
  colors: Uint8Array,
  sizeScale: number,
): number {
  let segment = 0;
  const baseLength = frame.cellDegrees * CREST_LENGTH_FRACTION * sizeScale;
  for (let p = 0; p < frame.count; p++) {
    const age = frame.ageFraction[p];
    const birthFade = Math.min(1, age / FADE_IN_FRACTION);
    const deathFade = Math.min(1, (1 - age) / FADE_OUT_FRACTION);
    const alpha = Math.round(255 * birthFade * deathFade);
    const scale =
      CREST_MIN_SCALE +
      (CREST_MAX_SCALE - CREST_MIN_SCALE) * Math.min(1, frame.speed[p] / HEIGHT_PIVOT_METERS);
    const halfLength = (baseLength * scale) / 2;
    const bowDepth = baseLength * scale * CREST_BOW_FRACTION;
    const headLon = frame.headLon[p];
    const headLat = frame.headLat[p];
    const forwardLon = frame.dirLon[p];
    const forwardLat = frame.dirLat[p];
    const crestLon = -forwardLat;
    const crestLat = forwardLon;
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
