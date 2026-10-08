import { Signal, signal } from '@angular/core';
import type { Layer as DeckLayer } from '@deck.gl/core';
import { Provider } from '../../objects/provider';
import { ColorStop } from '../../utils/color-scale';
import { Control } from '../../utils/controls';
import { Quantity, Unit, format } from '../../utils/units';

export enum LookKind {
  Image,
  Colormap,
  Radar,
  Borders,
  Contours,
  Particles,
  Polygons,
  Icons,
  Lines,
  Points,
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

export function gradientLegend(stops: ColorStop[], quantity: Quantity, unit: Unit): Legend {
  return {
    type: LegendType.Gradient,
    stops: stops.map(({ value, color }) => ({ color, label: format(value, quantity, unit) })),
  };
}

export abstract class Look<I> {
  abstract readonly kind: LookKind;
  readonly controls: Control[] = [];
  readonly legend: Signal<Legend | null> = signal(null);
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
