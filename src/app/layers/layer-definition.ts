import { FieldGrid, VectorField } from '../types/field-grid';

export interface ColorStop {
  value: number;
  color: string;
}

export interface TimeWindow {
  backHours: number;
  forwardHours: number;
  stepHours: number;
}

export interface ValueRange {
  min: number;
  max: number;
}

/**
 * Every behavioural number for a particle layer. The simulation itself holds none of these —
 * it keeps only structural constants (buffer sizes, grid cap, golden-ratio seeding). Wind in
 * m/s behaves nothing like wave height in metres, so each layer carries its own full set.
 */
export interface ParticleMotion {
  baseSpeedScale: number;
  minSpeedMetersPerSecond: number;
  maxSpeedMetersPerSecond: number;
  minimumCrossingSeconds: number;
  gapFraction: number;
  minFootprintFraction: number;
  maxFootprintFraction: number;
  footprintPivotMetersPerSecond: number;
}

export type ParticleAppearanceName = 'trails' | 'arcs';

interface LayerCatalogEntryBase {
  id: string;
  label: string;
  defaultActive: boolean;
  defaultOpacity: number;
  timeWindow: TimeWindow;
  visibleRange?: ValueRange;
}

export interface ColormapLayerCatalogEntry extends LayerCatalogEntryBase {
  type: 'colormap';
  parameter: string;
  palette: ColorStop[];
  paletteStyle: 'smooth' | 'stepped';
}

export interface ParticleLayerCatalogEntry extends LayerCatalogEntryBase {
  type: 'particles';
  speedParameter: string;
  directionParameter: string;
  appearance: ParticleAppearanceName;
  motion: ParticleMotion;
  lineWidthPixels: number;
}

export type LayerCatalogEntry = ColormapLayerCatalogEntry | ParticleLayerCatalogEntry;

export function layerParameters(entry: LayerCatalogEntry): string[] {
  if (entry.type === 'colormap') return [entry.parameter];
  return [entry.speedParameter, entry.directionParameter];
}

export interface ColormapLayerDefinition {
  entry: ColormapLayerCatalogEntry;
  grid: FieldGrid;
  opacity: number;
  order: number;
}

export interface ParticleLayerDefinition {
  entry: ParticleLayerCatalogEntry;
  vectorField: VectorField;
  opacity: number;
  order: number;
}

export type LayerDefinition = ColormapLayerDefinition | ParticleLayerDefinition;
