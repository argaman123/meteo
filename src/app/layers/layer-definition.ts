import { FieldGrid, VectorField } from '../types/field-grid';

export interface ColorStop {
  value: number;
  color: string;
}

export interface ColormapLayerCatalogEntry {
  id: string;
  type: 'colormap';
  parameter: string;
  palette: ColorStop[];
  opacity: number;
}

export interface ParticleLayerCatalogEntry {
  id: string;
  type: 'particles';
  speedParameter: string;
  directionParameter: string;
  opacity: number;
}

export type LayerCatalogEntry = ColormapLayerCatalogEntry | ParticleLayerCatalogEntry;

export interface ColormapLayerDefinition extends ColormapLayerCatalogEntry {
  grid: FieldGrid;
}

export interface ParticleLayerDefinition extends ParticleLayerCatalogEntry {
  wind: VectorField;
}

export type LayerDefinition = ColormapLayerDefinition | ParticleLayerDefinition;
