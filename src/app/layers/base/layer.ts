import { Injector, Signal } from '@angular/core';
import { Look } from '../../engine/base/look';
import { TimeWindow } from '../../services/time-service';
import { Bounds } from '../../types/wrap';
import { Control } from '../../utils/controls';

export interface Inputs {
  bbox(): Bounds | null;
  time(): number;
  zoom(): number;
}

export interface LookEntry {
  look: Look<unknown>;
  name: string;
  checked: boolean;
}

export abstract class Layer<D> {
  abstract readonly name: string;
  abstract readonly looks: LookEntry[];
  readonly controls: Control[] = [];
  abstract readonly timeWindow: TimeWindow | null;

  abstract hover(data: D, lon: number, lat: number): string;

  abstract fetch(on: Inputs, injector: Injector): Signal<D | undefined>;
}
