export function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

export function inverseMercatorY(y: number): number {
  return (Math.atan(Math.sinh(y)) * 180) / Math.PI;
}
