import { signal } from '@angular/core';
import { Layer } from './layer';

export class LayerGroup {
  readonly picked;

  constructor(
    readonly name: string,
    readonly layers: { layer: Layer<unknown>; label: string }[],
  ) {
    this.picked = signal(layers[0].layer);
  }
}
