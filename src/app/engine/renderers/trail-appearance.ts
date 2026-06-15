import { ParticleFrame } from './particle-system';

// Wind look: each particle is a fading streak along its streamline.
const TRAIL_POINTS = 14;
const TRAIL_FADE_POWER = 1.3;
const FADE_IN_FRACTION = 0.15;
const FADE_OUT_FRACTION = 0.35;
const FAST_DIMMING_PIVOT_METERS_PER_SECOND = 12;
const FAST_DIMMING_MINIMUM_ALPHA = 0.45;
const COLOR: [number, number, number] = [255, 255, 255];

const trailAlphas = new Float32Array(TRAIL_POINTS - 1);
for (let t = 0; t < TRAIL_POINTS - 1; t++) {
  trailAlphas[t] = (1 - t / (TRAIL_POINTS - 1)) ** TRAIL_FADE_POWER;
}
const point = new Float32Array(2);
const trailLon = new Float32Array(TRAIL_POINTS);
const trailLat = new Float32Array(TRAIL_POINTS);

export function trailAppearance(
  frame: ParticleFrame,
  sources: Float32Array,
  targets: Float32Array,
  colors: Uint8Array,
): number {
  let segment = 0;
  const segmentsPerParticle = TRAIL_POINTS - 1;
  for (let p = 0; p < frame.count; p++) {
    const progress = frame.age[p];
    const headArc = frame.headArc[p];
    const trailLength = frame.footprint[p];
    const birthFade = Math.min(1, progress / FADE_IN_FRACTION);
    const deathFade = Math.min(1, (1 - progress) / FADE_OUT_FRACTION);
    const fastDim = Math.max(
      FAST_DIMMING_MINIMUM_ALPHA,
      Math.min(1, FAST_DIMMING_PIVOT_METERS_PER_SECOND / Math.max(0.001, frame.speed[p])),
    );
    const baseAlpha = birthFade * deathFade * fastDim;
    for (let t = 0; t < TRAIL_POINTS; t++) {
      const arc = headArc - (t / (TRAIL_POINTS - 1)) * trailLength;
      frame.samplePath(p, arc, point);
      trailLon[t] = point[0];
      trailLat[t] = point[1];
    }
    for (let t = 0; t < segmentsPerParticle; t++) {
      sources[segment * 2] = trailLon[t];
      sources[segment * 2 + 1] = trailLat[t];
      targets[segment * 2] = trailLon[t + 1];
      targets[segment * 2 + 1] = trailLat[t + 1];
      colors[segment * 4] = COLOR[0];
      colors[segment * 4 + 1] = COLOR[1];
      colors[segment * 4 + 2] = COLOR[2];
      colors[segment * 4 + 3] = Math.round(255 * trailAlphas[t] * baseAlpha);
      segment++;
    }
  }
  return segment;
}
