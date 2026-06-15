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
 * How a particle layer's field magnitude drives motion. These are the numbers that look
 * universal but are really per-field (wind in m/s behaves nothing like wave height in metres),
 * so each particle layer carries its own.
 */
export interface ParticleMotion {
  minSpeedMetersPerSecond: number;
  maxSpeedMetersPerSecond: number;
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
