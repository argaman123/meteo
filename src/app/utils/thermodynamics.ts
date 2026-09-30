export function feetAtPressure(pressure: number): number {
  return 145366 * (1 - Math.pow(pressure / 1013.25, 0.1903));
}

export function saturationVaporPressure(temperature: number): number {
  return 6.112 * Math.exp((17.67 * temperature) / (temperature + 243.5));
}

export function relativeHumidity(temperature: number, dewpoint: number): number {
  return (100 * saturationVaporPressure(dewpoint)) / saturationVaporPressure(temperature);
}

export function dewpoint(temperature: number, relativeHumidity: number): number {
  const gamma = Math.log(relativeHumidity / 100) + (17.67 * temperature) / (temperature + 243.5);
  return (243.5 * gamma) / (17.67 - gamma);
}
