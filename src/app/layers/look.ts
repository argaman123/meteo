export interface ColorStop {
  value: number;
  color: string;
}

export interface ValueRange {
  min: number;
  max: number;
}

export interface CommonMotion {
  speedScale: number;
  minSpeedMetersPerSecond: number;
  maxSpeedMetersPerSecond: number;
  trailPoints: number;
}

export interface FreeMotion extends CommonMotion {
  strategy: 'free';
  lifetimeSeconds: number;
  straightLine: boolean;
  densityFactor: number;
}

export interface GridMotion extends CommonMotion {
  strategy: 'grid';
}

export type ParticleMotion = FreeMotion | GridMotion;

export type ParticleAppearanceName = 'trails' | 'arcs';

export interface ColormapLook {
  kind: 'colormap';
  scalar: (values: number[]) => number;
  palette: ColorStop[];
  paletteStyle: 'smooth' | 'stepped';
  defaultOpacity: number;
  visibleRange?: ValueRange;
}

export interface ParticleLook {
  kind: 'particles';
  vector: (values: number[]) => { u: number; v: number };
  motion: ParticleMotion;
  appearance: ParticleAppearanceName;
  lineWidthPixels: number;
  defaultOpacity: number;
}

export type Look = ColormapLook | ParticleLook;

export function colormap(
  scalar: ColormapLook['scalar'],
  palette: ColorStop[],
  paletteStyle: 'smooth' | 'stepped',
  defaultOpacity: number,
  visibleRange?: ValueRange,
): ColormapLook {
  return { kind: 'colormap', scalar, palette, paletteStyle, defaultOpacity, visibleRange };
}

export function particles(
  vector: ParticleLook['vector'],
  motion: ParticleMotion,
  appearance: ParticleAppearanceName,
  lineWidthPixels: number,
  defaultOpacity: number,
): ParticleLook {
  return { kind: 'particles', vector, motion, appearance, lineWidthPixels, defaultOpacity };
}
