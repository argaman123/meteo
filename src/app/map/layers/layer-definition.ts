import { FieldGrid, VectorField } from './field-grid';

export interface ColorStop {
  value: number;
  color: string;
}

export interface ColormapLayerDefinition {
  id: string;
  type: 'colormap';
  grid: FieldGrid;
  palette: ColorStop[];
  opacity: number;
}

export interface ParticleLayerDefinition {
  id: string;
  type: 'particles';
  wind: VectorField;
  opacity: number;
}

export type LayerDefinition = ColormapLayerDefinition | ParticleLayerDefinition;
