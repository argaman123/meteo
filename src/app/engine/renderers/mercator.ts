export function mercatorY(latitudeDegrees: number): number {
  const radians = (latitudeDegrees * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

export function inverseMercatorY(y: number): number {
  return ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;
}
