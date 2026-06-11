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
  wind: VectorField;
  opacity: number;
  order: number;
}

export type LayerDefinition = ColormapLayerDefinition | ParticleLayerDefinition;
