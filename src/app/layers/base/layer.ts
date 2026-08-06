import { Injector, Signal } from '@angular/core';
import { Look } from '../../engine/base/look';
import { TimeRange, TimeWindow } from '../../services/time-service';
import { Bounds } from '../../types/wrap';
import { Control } from '../../utils/controls';

export interface Inputs {
  bbox(): Bounds | null;
  displayTime(): number;
  exactTime(): number;
  window(): TimeRange;
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
  forcedTimes: Signal<number[]> | null = null;

  abstract hover(data: D, lon: number, lat: number): string;

  abstract relevanceOf(data: D): TimeRange | true;

  abstract fetch(on: Inputs, injector: Injector): Signal<D | null | undefined>;
}
