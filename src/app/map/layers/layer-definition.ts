import { FieldGrid, VectorField } from './field-grid';

export type ColorStop = { value: number; color: string };

export type ColormapLayerDefinition = {
  id: string;
  type: 'colormap';
  grid: FieldGrid;
  palette: ColorStop[];
  opacity: number;
};

export type ParticleLayerDefinition = {
  id: string;
  type: 'particles';
  wind: VectorField;
  opacity: number;
};

export type LayerDefinition = ColormapLayerDefinition | ParticleLayerDefinition;
