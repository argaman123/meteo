import { LightningObservation } from '../../types/lightning';
import { minutesToMs, msToSeconds, secondsToMs } from '../../utils/time';

const SLOT_MS = 10_000;
const LIFE_MINUTES = 240;

const STORMS: { start: [number, number]; drift: [number, number]; phase: number }[] = [
  { start: [33.6, 32.4], drift: [0.005, 0.002], phase: 0 },
  { start: [34.3, 31.0], drift: [0.004, 0.003], phase: 0.3 },
  { start: [35.0, 33.0], drift: [0.003, -0.002], phase: 0.55 },
  { start: [33.9, 33.7], drift: [0.005, 0.001], phase: 0.8 },
];

export function lightningObservations(
  startSeconds: number,
  endSeconds: number,
): LightningObservation[] {
  const observations: LightningObservation[] = [];
  const last = Math.min(secondsToMs(endSeconds), Date.now());
  for (let slot = Math.ceil(secondsToMs(startSeconds) / SLOT_MS); slot * SLOT_MS < last; slot++) {
    const time = slot * SLOT_MS;
    STORMS.forEach((storm, index) => {
      const life = (time / minutesToMs(LIFE_MINUTES) + storm.phase) % 1;
      const intensity = life < 0.7 ? Math.sin((Math.PI * life) / 0.7) : 0;
      if (noise(slot, index) > intensity * 0.8) return;
      const minutes = life * LIFE_MINUTES;
      const radius = 0.07 * Math.sqrt(-2 * Math.log(1 - noise(slot, index + 10)));
      const angle = 2 * Math.PI * noise(slot, index + 20);
      const positive = noise(slot, index + 30) < 0.15;
      const strength = Math.pow(noise(slot, index + 40), 2);
      observations.push({
        coords: [
          [
            Number(
              (storm.start[0] + storm.drift[0] * minutes + radius * Math.cos(angle)).toFixed(4),
            ),
            Number(
              (storm.start[1] + storm.drift[1] * minutes + radius * Math.sin(angle)).toFixed(4),
            ),
          ],
        ],
        params: [
          {
            name: 'current',
            value: String(Math.round(positive ? 10 + strength * 80 : -(5 + strength * 55))),
          },
        ],
        obsTime: msToSeconds(time + noise(slot, index + 50) * SLOT_MS),
      });
    });
  }
  return observations;
}

function noise(seed: number, salt: number): number {
  const scrambled = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return scrambled - Math.floor(scrambled);
}
