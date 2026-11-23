import {
  DestroyRef,
  Directive,
  ElementRef,
  booleanAttribute,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MapService } from '../engine/map-service';

@Directive({ selector: '[appMapPin]' })
export class MapPin {
  private mapService = inject(MapService);
  private element: HTMLElement = inject(ElementRef).nativeElement;
  readonly point = input.required<[number, number]>({ alias: 'appMapPin' });
  readonly movable = input(false, { transform: booleanAttribute });
  readonly moved = output<[number, number]>();

  constructor() {
    effect(() => this.mapService.showMarker(this.element, this.point(), this.movable()));
    inject(DestroyRef).onDestroy(() => this.mapService.hideMarker(this.element));
    this.mapService.markerDrags
      .pipe(
        filter((drag) => drag.element === this.element),
        takeUntilDestroyed(),
      )
      .subscribe((drag) => this.moved.emit(drag.point));
  }
}
