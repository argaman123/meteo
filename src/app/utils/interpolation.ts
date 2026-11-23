export function fractionalIndex(axis: number[], value: number): number | null {
  if (value < axis[0] || value > axis[axis.length - 1]) return null;
  const upper = axis.findIndex((entry) => entry >= value);
  if (upper === 0) return 0;
  const lower = upper - 1;
  return lower + (value - axis[lower]) / (axis[upper] - axis[lower]);
}

export function bilinearAt(
  data: Float32Array,
  width: number,
  height: number,
  col: number,
  row: number,
): number {
  if (Number.isNaN(data[Math.round(row) * width + Math.round(col)])) return NaN;
  const c0 = Math.floor(col);
  const r0 = Math.floor(row);
  const c1 = Math.min(c0 + 1, width - 1);
  const r1 = Math.min(r0 + 1, height - 1);
  const fc = col - c0;
  const fr = row - r0;
  const corners = [
    data[r0 * width + c0],
    data[r0 * width + c1],
    data[r1 * width + c0],
    data[r1 * width + c1],
  ];
  const weights = [(1 - fc) * (1 - fr), fc * (1 - fr), (1 - fc) * fr, fc * fr];
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < 4; i++) {
    if (Number.isNaN(corners[i])) continue;
    sum += corners[i] * weights[i];
    weightSum += weights[i];
  }
  return weightSum > 0 ? sum / weightSum : NaN;
}
