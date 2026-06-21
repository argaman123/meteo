import { ParticleFrame } from './particle-system';

const TRAIL_FADE_POWER = 1.3;
const LENGTH_FADE_BAND_FRACTION = 0.4;
const COLOR: [number, number, number] = [255, 255, 255];

export function trailAppearance(
  frame: ParticleFrame,
  sources: Float32Array,
  targets: Float32Array,
  colors: Uint8Array,
): number {
  let segment = 0;
  const tp = frame.trailPoints;
  for (let p = 0; p < frame.count; p++) {
    const alpha = frame.headAlpha[p];
    const visibleLength = frame.trailLengthDegrees[p];
    const lengthFadeBand = visibleLength * LENGTH_FADE_BAND_FRACTION;
    let trailDistance = 0;
    for (let t = 0; t < tp - 1; t++) {
      const sourceLon = frame.trailLon[p * tp + t];
      const sourceLat = frame.trailLat[p * tp + t];
      const targetLon = frame.trailLon[p * tp + t + 1];
      const targetLat = frame.trailLat[p * tp + t + 1];
      trailDistance += Math.hypot(targetLon - sourceLon, targetLat - sourceLat);
      const lengthMask = Math.max(0, Math.min(1, (visibleLength - trailDistance) / lengthFadeBand));
      const headFade = (1 - t / (tp - 1)) ** TRAIL_FADE_POWER;
      sources[segment * 2] = sourceLon;
      sources[segment * 2 + 1] = sourceLat;
      targets[segment * 2] = targetLon;
      targets[segment * 2 + 1] = targetLat;
      colors[segment * 4] = COLOR[0];
      colors[segment * 4 + 1] = COLOR[1];
      colors[segment * 4 + 2] = COLOR[2];
      colors[segment * 4 + 3] = Math.round(255 * headFade * alpha * lengthMask);
      segment++;
    }
  }
  return segment;
}
