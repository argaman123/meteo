export function metDirection(u: number, v: number): number {
  return 270 - (Math.atan2(v, u) * 180) / Math.PI;
}

export function windBarbPath(speedKnots: number): string {
  let remaining = Math.round(speedKnots / 5) * 5;
  if (remaining < 5) {
    return 'M -3.5 0 a 3.5 3.5 0 1 0 7 0 a 3.5 3.5 0 1 0 -7 0 Z M -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 Z';
  }
  const parts = ['M 0 0 L 0 -20'];
  let y = -20;
  while (remaining >= 50) {
    parts.push(`M 0 ${y} L 7 ${y - 3.5} L 0 ${y + 3.5} Z`);
    y += 5;
    remaining -= 50;
  }
  while (remaining >= 10) {
    parts.push(`M 0 ${y} L 7 ${y - 3.5}`);
    y += 3;
    remaining -= 10;
  }
  if (remaining >= 5) {
    if (y === -20) y += 3;
    parts.push(`M 0 ${y} L 3.5 ${y - 1.75}`);
  }
  return parts.join(' ');
}
