import type { Layer as DeckLayer } from '@deck.gl/core';
import { Provider } from '../../objects/provider';
import { Control } from '../../utils/controls';

export enum LookKind {
  Image,
  Colormap,
  Radar,
  Borders,
  Contours,
  Particles,
  Polygons,
  Icons,
  Text,
}

export enum LegendType {
  Gradient,
  Swatches,
}

export interface LegendStop {
  color: string;
  label: string;
}

export interface GradientLegend {
  type: LegendType.Gradient;
  stops: LegendStop[];
}

export interface SwatchesLegend {
  type: LegendType.Swatches;
  stops: LegendStop[];
}

export type Legend = GradientLegend | SwatchesLegend;

export abstract class Look<I> {
  abstract readonly kind: LookKind;
  readonly controls: Control[] = [];
  readonly legend: Legend | null = null;
  constructor(readonly provider: Provider<I>) {}
  abstract deckLayer(id: string, input: I): DeckLayer | DeckLayer[];
  release(): void {}
}

export interface LabelIcon {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
}
